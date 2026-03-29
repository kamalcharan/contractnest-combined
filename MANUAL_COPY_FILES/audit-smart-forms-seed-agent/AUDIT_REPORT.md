# ContractNest Audit: Smart Forms & Seed Agent
**Date**: 2026-03-29
**Scope**: m_form_templates, cat_blocks, seed agent, block matrix

---

## 1. Is there any existing connection between m_form_templates and blocks (cat_blocks) or templates?

### Answer: NO DIRECT DATABASE CONNECTION EXISTS

There is **zero foreign key relationship** between `m_form_templates` and `cat_blocks`. They are completely independent systems:

| System | Table | Purpose |
|--------|-------|---------|
| **Smart Forms** | `m_form_templates` | Global form definitions (schema, fields, validation) |
| **Catalog Studio** | `cat_blocks` | Service/spare/billing blocks for contract building |

**What does exist** is an **indirect UI-level connection** via the Contract Wizard:
- The `EvidencePolicyStep.tsx` wizard step lets users attach smart forms to a contract
- But this stores the link in `m_form_template_mappings.contract_id` (contract level), NOT at the block level

### Code Evidence:

**m_form_templates schema** — no block references:
```
File: MANUAL_COPY_FILES/cycle1-migrations/contractnest-edge/supabase/migrations/smart-forms/001_create_smart_forms_tables.sql
Lines 25-63

CREATE TABLE IF NOT EXISTS public.m_form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  form_type VARCHAR(50) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  schema JSONB NOT NULL,
  version INT NOT NULL DEFAULT 1,
  parent_template_id UUID REFERENCES public.m_form_templates(id),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  ...
);
```
-- No block_id, no block_type_id, no reference to cat_blocks anywhere.

**cat_blocks schema** — no form references:
```
File: Manual_Copy/Catalog-Studio/contractnest-edge/supabase/migrations/catalog-studio/004_add_tenant_fields.sql
Lines 14-19

ALTER TABLE cat_blocks
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE cat_blocks
ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false;
```
-- No form_template_id, no smart form reference.

**Grep confirmation**: `m_form_template.*block|block.*m_form|form_template.*block_id` returns **ZERO matches** across the entire codebase.

---

## 2. Where do smart forms currently attach — block level? template level? contract level?

### Answer: CONTRACT LEVEL ONLY (via m_form_template_mappings)

Smart forms attach at the **contract + timing** level, NOT at the block level.

### Attachment Chain:

```
m_form_templates (GLOBAL - no tenant_id)
       |
       | FK: form_template_id
       v
m_form_tenant_selections (tenant bookmarks a form)
       |
       | (user selects in Contract Wizard)
       v
m_form_template_mappings ← THIS IS THE ATTACHMENT POINT
  - contract_id (UUID NOT NULL)     ← ATTACHES TO CONTRACT
  - form_template_id (FK)           ← WHICH FORM
  - timing (pre_service|post_service|during_service) ← WHEN
  - service_type (calibration, maintenance, etc.)
  - is_mandatory (boolean)
  - effective_from / effective_to (date range)
       |
       | FK: mapping_id
       v
m_form_submissions
  - contract_id (UUID NOT NULL)
  - service_event_id (UUID NOT NULL)
  - responses (JSONB)
  - status (draft|submitted|reviewed|approved|rejected)
```

### Code Evidence:

**m_form_template_mappings** — Contract-level attachment:
```
File: MANUAL_COPY_FILES/cycle1-migrations/.../001_create_smart_forms_tables.sql
Lines 133-160

CREATE TABLE IF NOT EXISTS public.m_form_template_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  contract_id UUID NOT NULL,                              ← CONTRACT LEVEL
  form_template_id UUID NOT NULL REFERENCES public.m_form_templates(id),
  service_type VARCHAR(100),                               ← e.g. 'calibration'
  timing VARCHAR(30) NOT NULL DEFAULT 'pre_service',       ← WHEN in lifecycle
  is_mandatory BOOLEAN DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  status VARCHAR(20) DEFAULT 'active',
  ...
  UNIQUE(tenant_id, contract_id, form_template_id, timing, effective_from)
);
```

**EvidencePolicyStep.tsx** — Contract Wizard UI where attachment happens:
```
File: MANUAL_COPY_FILES/evidence-policy-wizard-step/.../EvidencePolicyStep.tsx
Lines 27-42

export type EvidencePolicyType = 'none' | 'upload' | 'smart_form';

export interface SelectedForm {
  form_template_id: string;
  name: string;
  version: number;
  category: string;
  sort_order: number;
}

export interface EvidencePolicyStepProps {
  policyType: EvidencePolicyType;
  selectedForms: SelectedForm[];
  onPolicyTypeChange: (type: EvidencePolicyType) => void;
  onSelectedFormsChange: (forms: SelectedForm[]) => void;
}
```

**Contract Wizard index.tsx** maps this to request payload:
```
File: MANUAL_COPY_FILES/evidence-policy-wizard-step/.../ContractWizard/index.tsx

// Maps to API request:
evidence_policy_type + evidence_selected_forms → saved at contract level
```

### What's MISSING (Gap):
- **No block-level form attachment** — you cannot say "this specific Service Block requires Form X"
- **No template-level form attachment** — contract templates don't carry form assignments
- Forms are only assigned when creating a contract, not when defining blocks in Catalog Studio

---

## 3. How does the contractnest-master-data-agent skill seed blocks for a tenant?

### Answer: NO SUCH AGENT EXISTS IN THE CODEBASE

A thorough search of the entire codebase found **zero references** to:
- `contractnest-master-data-agent`
- `seed_seller_blocks`
- `master-data-agent`
- `master_data_agent`

### What DOES exist for block seeding:

#### A. Block TYPES are seeded via SQL migration (not an agent):

```
File: Manual_Copy/Catalog-Studio/contractnest-edge/supabase/migrations/catalog-studio/005_seed_block_types.sql
Lines 1-231

-- Seeds 8 block types into m_category_master + m_category_details:
-- 1. service  (Briefcase, #4F46E5) - Deliverable work items with SLA
-- 2. spare    (Package, #059669)   - Physical products with inventory
-- 3. billing  (CreditCard, #D97706) - Payment structures
-- 4. text     (FileText, #6B7280)  - Terms, conditions, policies
-- 5. video    (Video, #DC2626)     - Embedded video content
-- 6. image    (Image, #7C3AED)     - Photos and diagrams
-- 7. checklist(CheckSquare, #0891B2)- Task verification lists
-- 8. document (Paperclip, #64748B) - File attachments
```

#### B. Blocks have an `is_seed` flag for tenant copy mechanism:

```
File: Manual_Copy/Catalog-Studio/.../004_add_tenant_fields.sql
Lines 17-19

ALTER TABLE cat_blocks
ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false;
-- "Seed blocks are available to all tenants as a copy"
```

#### C. Edge function handles seed block visibility:

```
File: Manual_Copy/Catalog-Studio/.../cat-blocks/index.ts
Lines 201-208

// Non-admin: See global blocks (active+visible) OR seed blocks (active) OR own tenant's blocks
query = query.or(
  `and(tenant_id.is.null,is_active.eq.true,visible.eq.true),` +
  `and(is_seed.eq.true,is_active.eq.true),` +
  `tenant_id.eq.${tenantId}`
);
```

### Current State: The `is_seed` mechanism is **designed but not automated**:
1. An admin creates a block and marks `is_seed = true`
2. All tenants can SEE seed blocks (via RLS policy)
3. But there is **NO agent/function that COPIES seed blocks INTO tenant-specific blocks**
4. There is **NO industry-based seeding logic** anywhere

---

## 4. What does the seed_seller_blocks function produce — show the logic

### Answer: THIS FUNCTION DOES NOT EXIST

`seed_seller_blocks` is not defined anywhere in the codebase. Zero matches across all files including:
- contractnest-api/
- contractnest-edge/
- supabase/
- MANUAL_COPY_FILES/
- Manual_Copy/
- scripts/
- index.ts

### What exists instead:

#### The closest equivalent is the **SQL seed migration** for block TYPES (not blocks themselves):

```sql
File: Manual_Copy/Catalog-Studio/.../005_seed_block_types.sql

-- Step 1: Create category master entry
INSERT INTO m_category_master (
    id, category_name, display_name, description, icon_name, sequence_no, is_active
) VALUES (
    uuid_generate_v4(), 'cat_block_type', 'Block Types',
    'Types of blocks available in Catalog Studio', 'Blocks', 100, true
) ON CONFLICT (category_name) DO UPDATE SET ...;

-- Step 2: Create 8 block type detail entries
-- Example (Service Block):
INSERT INTO m_category_details (
    id, category_id, sub_cat_name, display_name, description,
    icon_name, hexcolor, sequence_no, is_active, is_deletable
) VALUES (
    uuid_generate_v4(), v_category_id, 'service', 'Service',
    'Deliverable work items with SLA, duration, and evidence requirements',
    'Briefcase', '#4F46E5', 1, true, false
) ON CONFLICT (category_id, sub_cat_name) DO UPDATE SET ...;
```

This seeds the **block type definitions** (service, spare, billing, etc.) — not actual blocks with pricing/config.

#### The playground has hardcoded dummy blocks (for demo only):

```typescript
File: MANUAL_COPY_FILES/playground/.../dummyBlocks.ts

export const EQUIPMENT_AMC_BLOCKS: PlaygroundBlock[] = [
  {
    id: 'svc-preventive',
    categoryId: 'service',
    name: 'Quarterly Preventive Maintenance',
    icon: 'Wrench',
    price: 4500,
    currency: 'INR',
    duration: 4,
    durationUnit: 'hours',
    tags: ['preventive', 'quarterly', 'inspection'],
    meta: { deliveryMode: 'on-site', requiresScheduling: true },
  },
  // ... more hardcoded blocks for Equipment AMC demo
];
```

These are UI-only constants, NOT seeded into the database.

---

## 5. How does the block matrix decide which blocks to create for which industry?

### Answer: NO BLOCK MATRIX EXISTS

There is **no industry-to-block mapping logic** anywhere in the codebase.

### Search Results:
- `block_matrix` / `blockMatrix` / `BLOCK_MATRIX` — **ZERO matches**
- `industry.*block` / `block.*industry` — **1 match** (playground dummy data only)
- No mapping table, no configuration file, no algorithm

### What exists for block categorization:

#### Block TYPES (categories) are universal — not per-industry:

```
8 Block Types (from 005_seed_block_types.sql):
┌──────────┬─────────────┬──────────────────────────────────────┐
│ sub_cat   │ display     │ description                          │
├──────────┼─────────────┼──────────────────────────────────────┤
│ service  │ Service     │ Deliverable work items with SLA      │
│ spare    │ Spare Part  │ Physical products with inventory     │
│ billing  │ Billing     │ Payment structures                   │
│ text     │ Text        │ Terms, conditions, policies          │
│ video    │ Video       │ Embedded video content               │
│ image    │ Image       │ Photos and diagrams                  │
│ checklist│ Checklist   │ Task verification lists              │
│ document │ Document    │ File attachments                     │
└──────────┴─────────────┴──────────────────────────────────────┘
```

These are the same for ALL industries. Every tenant sees all 8 block types.

#### CATEGORY_METADATA provides wizard behavior per block type (UI only):

```
File: Manual_Copy/Catalog-Studio/contractnest-ui/src/utils/catalog-studio/categories.ts

CATEGORY_METADATA = {
  service: {
    wizardSteps: ['type', 'basicInfo', 'resources', 'delivery', 'pricing', 'evidence', 'rules'],
    defaultPricingMode: 'independent',
    supportsResources: true,
    supportsVariants: false,
  },
  spare: {
    wizardSteps: ['type', 'basicInfo', 'pricing'],
    defaultPricingMode: 'independent',
    supportsResources: false,
    supportsVariants: true,
  },
  // ... etc
};
```

This controls which wizard steps show for each block type — but it's **not industry-specific**.

---

## Summary of Gaps Found

| # | Gap | Current State | Impact |
|---|-----|---------------|--------|
| 1 | **No form-to-block link** | Forms attach at contract level only | Cannot define "this block type always needs Form X" |
| 2 | **No seed agent** | `is_seed` flag exists but no automation | Admin must manually create & mark seed blocks |
| 3 | **No seed_seller_blocks** | Function doesn't exist | No automated block provisioning per tenant |
| 4 | **No block matrix** | All 8 block types available to all tenants | No industry-specific block recommendations |
| 5 | **No tenant block copy** | Seed blocks visible but not copied | Tenants see seed blocks but can't customize them independently |

---

## Architecture Diagram: Current State

```
                    ┌─────────────────────────────┐
                    │   m_category_master          │
                    │   (cat_block_type)           │
                    └──────────┬──────────────────┘
                               │ 1:N
                    ┌──────────▼──────────────────┐
                    │   m_category_details         │
                    │   (8 block types)            │
                    │   service, spare, billing... │
                    └──────────┬──────────────────┘
                               │ referenced by
                    ┌──────────▼──────────────────┐
                    │       cat_blocks             │
                    │   tenant_id (nullable)       │
                    │   is_seed (boolean)          │
                    │   block_type_id              │◄── NO LINK TO FORMS
                    │   config (JSONB)             │
                    └─────────────────────────────┘

    ════════════════════ SEPARATE SYSTEM ════════════════════

                    ┌─────────────────────────────┐
                    │   m_form_templates           │
                    │   (GLOBAL - no tenant_id)    │◄── NO LINK TO BLOCKS
                    │   schema (JSONB)             │
                    │   category, form_type        │
                    └──────────┬──────────────────┘
                               │ FK
                    ┌──────────▼──────────────────┐
                    │ m_form_tenant_selections     │
                    │   tenant bookmarks forms     │
                    └──────────┬──────────────────┘
                               │ (UI selection)
                    ┌──────────▼──────────────────┐
                    │ m_form_template_mappings     │
                    │   contract_id (NOT NULL)     │◄── ATTACHES TO CONTRACT
                    │   timing (pre/post/during)   │
                    │   is_mandatory               │
                    └──────────┬──────────────────┘
                               │ FK
                    ┌──────────▼──────────────────┐
                    │   m_form_submissions         │
                    │   contract_id + event_id     │
                    │   responses (JSONB)          │
                    └─────────────────────────────┘
```

---

## File References Index

| File | Location | Relevant Lines |
|------|----------|----------------|
| Smart Forms Schema | `MANUAL_COPY_FILES/cycle1-migrations/.../001_create_smart_forms_tables.sql` | 25-285 |
| Table Rename Migration | `MANUAL_COPY_FILES/cycle1-migrations/.../002_rename_tables_m_form_prefix.sql` | 22-26 |
| RPC Functions | `MANUAL_COPY_FILES/cycle1-edge/.../003_create_rpc_functions.sql` | 16-120 |
| Smart Forms Edge (Cycle 3) | `MANUAL_COPY_FILES/cycle3-edge/.../smart-forms/index.ts` | 1-521 |
| Tenant Forms Routes | `MANUAL_COPY_FILES/cycle3-api/.../tenantFormsRoutes.ts` | 1-166 |
| Tenant Forms Service | `MANUAL_COPY_FILES/cycle3-api/.../tenantFormsService.ts` | all |
| Tenant Forms DTO | `MANUAL_COPY_FILES/cycle3-api/.../tenantForms.dto.ts` | 1-85 |
| Smart Forms UI Types | `MANUAL_COPY_FILES/cycle3-ui/.../smart-forms/types.ts` | 1-130 |
| Form Renderer | `MANUAL_COPY_FILES/cycle3-ui/.../FormRenderer.tsx` | 1-651 |
| Smart Forms Selection Page | `MANUAL_COPY_FILES/cycle3-ui/.../SmartFormsSelectionPage.tsx` | 1-427 |
| Evidence Policy Step | `MANUAL_COPY_FILES/evidence-policy-wizard-step/.../EvidencePolicyStep.tsx` | 1-450+ |
| Cat Blocks Tenant Fields | `Manual_Copy/Catalog-Studio/.../004_add_tenant_fields.sql` | 1-101 |
| Seed Block Types | `Manual_Copy/Catalog-Studio/.../005_seed_block_types.sql` | 1-231 |
| Cat Blocks Edge Function | `Manual_Copy/Catalog-Studio/.../cat-blocks/index.ts` | 1-715 |
| Cat Blocks API Service | `Manual_Copy/Catalog-Studio/.../catBlocksService.ts` | 1-272 |
| Dummy Blocks (Playground) | `MANUAL_COPY_FILES/playground/.../dummyBlocks.ts` | 1-50+ |
| Service URLs | `MANUAL_COPY_FILES/cycle3-ui/.../serviceURLs.ts` | 1174-1202 |
