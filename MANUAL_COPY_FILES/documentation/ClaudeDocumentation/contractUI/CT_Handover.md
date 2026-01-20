# Catalog Studio - Handover Context

> **Purpose**: Quick onboarding for continuing Catalog Studio implementation
> **Last Session**: January 2026
> **Current Sprint**: Sprint 1 (Foundation) - In Progress
> **Next Priority**: Complete Sprint 1 (Buyers, Resources UI) → Sprint 2 (Contracts)

---

## Quick Status Summary

| Component | Status | Details |
|-----------|--------|---------|
| **Database** | ✅ Partial | `cat_blocks`, `cat_templates`, `cat_asset_types`, `t_idempotency_cache` exist |
| **Edge Functions** | ✅ v2.0 | `cat-blocks`, `cat-templates` with idempotency + optimistic locking |
| **Edge Shared Utils** | ✅ v2.0 | `_shared/edgeUtils.ts` - signature, pagination, idempotency |
| **API Layer** | ✅ v2.0 | Validation + `requireIdempotencyKey` middleware |
| **UI - BlockWizard** | ✅ Complete | All 8 block types with full step wizards |
| **UI - Template Builder** | ✅ Done | 101KB template.tsx with builder |
| **UI - Configure** | ✅ v2.0 | Version conflict modal, refresh button, idempotency |
| **UI - Buyers** | ⚪ Pending | Not started |
| **UI - Contracts** | ⚪ Pending | Sprint 2 |

---

## ✅ What's Built

### Edge Functions (contractnest-edge)

| Function | File | Lines | Features |
|----------|------|-------|----------|
| `cat-blocks` | `supabase/functions/cat-blocks/index.ts` | 716 | Full CRUD, global/seed/tenant, HMAC auth, admin view |
| `cat-templates` | `supabase/functions/cat-templates/index.ts` | 787 | Full CRUD, system/public, copy to tenant |

### API Routes (contractnest-api)

**File**: `src/routes/catalogStudioRoutes.ts`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/catalog-studio/blocks` | List blocks |
| GET | `/catalog-studio/blocks/:id` | Get single block |
| POST | `/catalog-studio/blocks` | Create block |
| PATCH | `/catalog-studio/blocks/:id` | Update block |
| DELETE | `/catalog-studio/blocks/:id` | Soft delete block |
| GET | `/catalog-studio/templates` | List templates |
| GET | `/catalog-studio/templates/system` | System templates |
| GET | `/catalog-studio/templates/public` | Public templates |
| GET | `/catalog-studio/templates/:id` | Get single template |
| POST | `/catalog-studio/templates` | Create template |
| POST | `/catalog-studio/templates/:id/copy` | Copy system template |
| PATCH | `/catalog-studio/templates/:id` | Update template |
| DELETE | `/catalog-studio/templates/:id` | Delete template |

### UI Components (contractnest-ui)

#### BlockWizard System

```
components/catalog-studio/BlockWizard/
├── index.tsx                    # Main wizard container
├── BlockWizardContent.tsx       # Step renderer
├── WizardHeader.tsx             # Header with title
├── WizardFooter.tsx             # Navigation buttons
├── WizardProgress.tsx           # Step progress indicator
└── steps/
    ├── TypeSelectionStep.tsx    # Block type selection (8 types)
    ├── BasicInfoStep.tsx        # Name, icon, description, category
    ├── ResourceDependencyStep.tsx # Resource pricing config
    ├── service/
    │   ├── PricingStep.tsx      # 45KB - All pricing modes
    │   ├── DeliveryStep.tsx     # Duration, location, assignment
    │   ├── EvidenceStep.tsx     # Photo, GPS, signature requirements
    │   ├── BusinessRulesStep.tsx # SLA, automation rules
    │   └── RulesStep.tsx        # Additional rules
    ├── billing/
    │   ├── StructureStep.tsx    # EMI structure
    │   ├── ScheduleStep.tsx     # Payment schedule
    │   └── AutomationStep.tsx   # Auto-invoice, reminders
    ├── spare/
    │   ├── InventoryStep.tsx    # SKU, HSN, stock
    │   └── FulfillmentStep.tsx  # Shipping, warranty
    ├── checklist/
    │   ├── ItemsStep.tsx        # Checklist items
    │   └── ChecklistSettingsStep.tsx
    ├── content/
    │   ├── ContentStep.tsx      # Text/markdown content
    │   └── ContentSettingsStep.tsx
    ├── media/
    │   ├── MediaStep.tsx        # Video embed
    │   ├── ImageUploadStep.tsx  # Image upload
    │   └── DisplaySettingsStep.tsx
    └── document/
        └── FileSettingsStep.tsx # Document upload settings
```

#### Pages

| Page | File | Size | Purpose |
|------|------|------|---------|
| Blocks list | `pages/catalog-studio/blocks.tsx` | 46KB | Block management |
| Create block | `pages/catalog-studio/blocks/new.tsx` | 6KB | New block wizard |
| Edit block | `pages/catalog-studio/blocks/[id]/edit.tsx` | 12KB | Edit existing |
| Template builder | `pages/catalog-studio/template.tsx` | 101KB | Drag-drop builder |
| Templates list | `pages/catalog-studio/templates-list.tsx` | 88KB | Template management |
| Configure | `pages/catalog-studio/configure.tsx` | 8KB | Settings |

---

## Database Schema

### Tables Created (cat_ prefix)

#### `cat_blocks`

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| tenant_id | UUID | NULL for global blocks |
| is_live | BOOLEAN | Environment flag |
| block_type_id | TEXT | service, spare, billing, text, etc. |
| name | VARCHAR(255) | Block name |
| display_name | VARCHAR(255) | UI display name |
| icon | VARCHAR(50) | Emoji/icon |
| description | TEXT | Description |
| category | TEXT | Custom grouping |
| tags | TEXT[] | Searchable tags |
| config | JSONB | Type-specific configuration |
| pricing_mode_id | TEXT | independent, resource_based, variant_based |
| base_price | DECIMAL(12,2) | Base price |
| currency | VARCHAR(3) | Currency code |
| price_type_id | TEXT | per_session, per_hour, per_day, etc. |
| tax_rate | DECIMAL(5,2) | Tax percentage |
| hsn_sac_code | VARCHAR(20) | HSN/SAC code |
| resource_pricing | JSONB | Resource-based pricing config |
| variant_pricing | JSONB | Variant-based pricing config |
| is_admin | BOOLEAN | Admin-only block |
| is_seed | BOOLEAN | Seed data block |
| visible | BOOLEAN | Visibility flag |
| is_active | BOOLEAN | Active status |
| is_deletable | BOOLEAN | Can be deleted |
| sequence_no | INTEGER | Display order |
| version | INTEGER | Version number |

#### `cat_templates`

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| tenant_id | UUID | NULL for system templates |
| is_live | BOOLEAN | Environment flag |
| name | VARCHAR(255) | Template name |
| display_name | VARCHAR(255) | UI display name |
| description | TEXT | Description |
| category | TEXT | Category |
| tags | TEXT[] | Tags |
| cover_image | TEXT | Cover image URL |
| blocks | JSONB | Block assembly array |
| currency | VARCHAR(3) | Currency |
| tax_rate | DECIMAL(5,2) | Tax rate |
| discount_config | JSONB | Discount settings |
| subtotal | DECIMAL(12,2) | Calculated subtotal |
| total | DECIMAL(12,2) | Calculated total |
| settings | JSONB | Template settings |
| is_system | BOOLEAN | System template flag |
| copied_from_id | UUID | Source template (if copied) |
| industry_tags | TEXT[] | Industry categorization |
| is_public | BOOLEAN | Public visibility |
| is_active | BOOLEAN | Active status |
| is_deletable | BOOLEAN | Can be deleted |
| sequence_no | INTEGER | Display order |
| version | INTEGER | Version number |

#### `cat_asset_types`

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant ID |
| category | VARCHAR(50) | residential, commercial, appliance |
| subcategory | VARCHAR(50) | air_conditioner, washing_machine |
| name | VARCHAR(255) | Display name (1BHK, Split AC 1.5T) |
| icon | VARCHAR(50) | Emoji/icon |
| attributes | JSONB | Custom attributes |
| sequence_no | INTEGER | Display order |
| is_active | BOOLEAN | Active status |

---

## 📁 File Locations

### Documentation

```
ClaudeDocumentation/contractUI/
├── CatalogStudio-SprintPlan-v1.0.md      # Full sprint plan
├── CatalogStudio-Database-Schema-v1.0.md # Database schema
├── CT_delivery.md                         # Delivery tracker
├── CT_Handover.md                         # Handover context (THIS)
├── idempotency.md                         # ✅ NEW - Idempotency framework guide
├── 12-catalog-studio.html                 # UI mockups
├── 12b-catalog-studio-complete.html       # Complete mockups
└── samples/                               # Sample HTML files
```

### Edge Functions

```
contractnest-edge/supabase/functions/
├── cat-blocks/index.ts           # ✅ v2.0 - CRUD + idempotency + optimistic locking
├── cat-templates/index.ts        # ✅ v2.0 - CRUD + idempotency + optimistic locking
├── contracts/                    # ⚪ Pending (Sprint 2)
├── tasks/                        # ⚪ Pending (Sprint 3)
└── _shared/
    └── edgeUtils.ts              # ✅ v2.0 - Signature, pagination, idempotency helpers
```

### API

```
contractnest-api/src/
├── routes/catalogStudioRoutes.ts          # ✅ v2.0 - Routes with validation
├── controllers/catalogStudioController.ts # ✅ Controller
├── services/catalogStudioService.ts       # ✅ Service
├── middleware/requestContext.ts           # ✅ v2.0 - requireIdempotencyKey
├── validators/catalogStudio.validators.ts # ✅ v2.0 - express-validator schemas
├── utils/apiResponseHelpers.ts            # ✅ v2.0 - Response helpers
└── types/
    └── catalogStudio/                     # ⚪ Type definitions needed
```

### UI

```
contractnest-ui/src/
├── services/api.ts                        # ✅ v2.0 - patchWithIdempotency, version helpers
├── components/catalog-studio/             # ✅ Complete wizard system
├── pages/catalog-studio/
│   └── configure.tsx                      # ✅ v2.0 - Version conflict modal
├── hooks/
│   ├── queries/useCatBlocksTest.ts        # ✅ v2.0 - getBlockVersion helper
│   └── mutations/useCatBlocksMutations.ts # ✅ v2.0 - Idempotency support
└── utils/catalog-studio/
    └── catBlockAdapter.ts                 # ✅ v2.0 - Fixed category field mapping
```

---

## 🔮 Next Steps (Priority Order)

### Sprint 1 Completion

1. **Create useBlocks hook** - Connect BlockWizard to real API
2. **Create cat_buyers edge function** - Buyer management
3. **Create buyers API routes** - Add to catalogStudioRoutes
4. **Build BuyerList UI** - List, search, add buyers
5. **Connect Resources** - Use existing resources API

### Sprint 2 Start

1. **Create cat_contracts table** - Contract schema
2. **Create contracts edge function** - Contract CRUD
3. **Create contracts-public edge function** - Public buyer view
4. **Build ContractWizard** - 6-step contract creation
5. **Build BuyerContractView** - Mobile-friendly public page

---

## 🚨 Important Notes

### 1. Block Visibility Model

```
Global blocks:     tenant_id IS NULL + is_active + visible
Seed blocks:       is_seed = true + is_active
Tenant blocks:     tenant_id = request_tenant_id
Admin sees all:    x-is-admin = 'true' header
```

### 2. HMAC Signature Required

All edge functions require API-signed requests:
```
x-internal-signature: HMAC-SHA256 signature
x-timestamp: Unix timestamp (within 5 minutes)
```

### 3. Pricing Mode Config Structures

**Resource-based** (`resource_pricing` JSONB):
```json
{
  "resource_type_id": "team_staff",
  "label": "Select Doctor",
  "allow_any": true,
  "any_price": 500,
  "options": [
    {"resource_id": "uuid", "name": "Dr. Bhavana", "price": 800}
  ]
}
```

**Variant-based** (`variant_pricing` JSONB):
```json
{
  "asset_category": "residential",
  "label": "Select Property Type",
  "options": [
    {"asset_type_id": "uuid", "name": "1BHK Flat", "price": 2000}
  ]
}
```

### 4. Existing Resources Tables

DO NOT create new resources tables. Use existing:
- `m_catalog_resource_types` - Resource type master
- `t_category_resources_master` - Actual resources

### 5. Idempotency Framework (v2.0)

All POST/PATCH operations require `x-idempotency-key` header:

```
UI: generateIdempotencyKey() → postWithIdempotency() / patchWithIdempotency()
API: requireIdempotencyKey middleware → buildEdgeHeaders()
Edge: checkIdempotency() → storeIdempotency() (uses t_idempotency_cache)
```

**Documentation**: `ClaudeDocumentation/contractUI/idempotency.md`

### 6. Optimistic Locking (v2.0)

Updates include `expected_version` to prevent concurrent modification:

```typescript
// UI sends expected_version
await updateBlock(id, data, expectedVersion);

// Edge checks version
.eq('version', expected_version)

// Returns 409 VERSION_CONFLICT if mismatch
```

### 7. Category Field Mapping Fix

The adapter uses `category` field (not UUID `block_type_id`) for block type:

```typescript
// catBlockAdapter.ts line 78
const blockType = catBlock.block_type_name || catBlock.type || (catBlock as any).category || 'service';
```

---

## 📋 Quick Start for Next Session

```bash
# 1. Read the delivery tracker
Read: ClaudeDocumentation/contractUI/CT_delivery.md

# 2. Check current Sprint 1 status
See: "Sprint 1 Remaining Work" section

# 3. If creating hooks:
Check: contractnest-ui/src/hooks/queries/ for patterns
Check: contractnest-api/src/routes/catalogStudioRoutes.ts for endpoints

# 4. If creating edge functions:
Check: contractnest-edge/supabase/functions/cat-blocks/index.ts for patterns

# 5. If creating contracts (Sprint 2):
Read: CatalogStudio-SprintPlan-v1.0.md Section 2.1-2.4
```

---

## 🔗 Key References

| Document | Purpose |
|----------|---------|
| `CatalogStudio-SprintPlan-v1.0.md` | Full implementation plan |
| `CatalogStudio-Database-Schema-v1.0.md` | Database design |
| `CT_delivery.md` | Sprint delivery tracker |
| `idempotency.md` | **NEW** Idempotency framework guide |
| `12-catalog-studio.html` | UI mockups |
| `12b-catalog-studio-complete.html` | Complete UI reference |

---

**End of Handover Context**
