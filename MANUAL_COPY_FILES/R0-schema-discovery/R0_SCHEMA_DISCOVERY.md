# R0: Schema Discovery Output

> **Generated**: 2026-03-31
> **Purpose**: Read-only discovery for Smart Forms / Knowledge Tree (Release 1)
> **Repo**: contractnest-combined

---

## Task 1 Output: Project Structure

### 1a. Top-level Folder Tree (2 levels deep)

```
.
./ClaudeDocumentation/         # Docs submodule (empty/uninit in this env)
./ContractNest-Mobile/         # Mobile submodule (empty/uninit)
./FamilyKnows/                 # Separate SaaS product submodule
./MANUAL_COPY_FILES/           # Claude's output folder (51 feature branches)
./Manual_Copy/                 # Older manual copy folder
./contractnest-api/            # Backend API submodule (empty/uninit)
./contractnest-edge/           # Edge Functions submodule (empty/uninit)
./contractnest-ui/             # Frontend UI submodule (empty/uninit)
./manual_copy_familknows/      # Legacy copy folder
./manual_copy_familyknows/     # Legacy copy folder
./node_modules/                # lottie-react only
./scripts/
./scripts/reference/
./supabase/
./supabase/.temp/
./supabase/migrations/         # Single consolidated remote schema dump
```

### 1b. Package Stack (root)

```json
{
  "dependencies": {
    "lottie-react": "^2.4.1"
  }
}
```

> **Note**: The root `package.json` is minimal. The real stacks live in the submodules:
> - **contractnest-api**: Node.js, Express, TypeScript
> - **contractnest-ui**: React, TypeScript, Vite
> - **contractnest-edge**: Deno/Supabase Edge Functions

### 1c. Supabase CLI

Supabase directory exists with one migration:

```
supabase/
├── .temp/
└── migrations/
    └── 20251229170144_remote_schema.sql   (707KB — full DB dump)
```

The migration files for individual features live in `MANUAL_COPY_FILES/*/contractnest-edge/supabase/migrations/`.

### 1d. Environment Variables

No `.env.example` or `.env.local` found in the combined repo root.

From Edge Function code, the following env vars are used:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Task 2 Output: Table Schemas

### 2.1 `m_form_templates` — Global Form Definitions

**Source**: `MANUAL_COPY_FILES/cycle1-migrations/.../001_create_smart_forms_tables.sql`

```sql
CREATE TABLE IF NOT EXISTS public.m_form_templates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(255) NOT NULL,
  description          TEXT,
  category             VARCHAR(100) NOT NULL,
    -- 'calibration', 'inspection', 'audit', 'maintenance',
    -- 'clinical', 'pharma', 'compliance', 'onboarding', 'general'
  form_type            VARCHAR(50) NOT NULL,
    -- 'pre_service', 'post_service', 'during_service', 'standalone'
  tags                 TEXT[] DEFAULT '{}',
  schema               JSONB NOT NULL,           -- *** Full form definition ***
  version              INT NOT NULL DEFAULT 1,
  parent_template_id   UUID REFERENCES public.m_form_templates(id),
  status               VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- Lifecycle: draft → in_review → approved → past
  thumbnail_url        TEXT,
  created_by           UUID NOT NULL,
  approved_by          UUID,
  approved_at          TIMESTAMPTZ,
  review_notes         TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);
```

**Indexes**: status, category, parent_template_id, GIN(tags), GIN(schema)

**RLS**: None directly on this table (it's global/admin-managed). No `tenant_id` column.

**Key Notes**:
- No `tenant_id` — managed exclusively by support/admin team
- `schema` column (JSONB) contains the full form definition (see Task 4)
- `parent_template_id` links versioned templates (v2 → v1)
- Status lifecycle: `draft` → `in_review` → `approved` → `past`

---

### 2.2 `m_cat_blocks` — **DOES NOT EXIST**

There is no table named `m_cat_blocks`. The closest equivalent is the **block system** using three tables:

#### `m_block_categories`
```sql
CREATE TABLE IF NOT EXISTS "public"."m_block_categories" (
  id          UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  parent_id   UUID,
  version     INTEGER DEFAULT 1,
  name        VARCHAR(255),
  description TEXT,
  icon        VARCHAR(100),
  sort_order  SMALLINT,
  active      BOOLEAN DEFAULT true
);
```

#### `m_block_masters`
```sql
CREATE TABLE IF NOT EXISTS "public"."m_block_masters" (
  id               UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  parent_id        UUID,
  version          INTEGER DEFAULT 1,
  category_id      UUID,
  name             VARCHAR(255),
  description      TEXT,
  icon             VARCHAR(100),
  node_type        VARCHAR(100),
  config           JSONB,            -- *** Block configuration ***
  theme_styles     JSONB,
  can_rotate       BOOLEAN DEFAULT false,
  can_resize       BOOLEAN DEFAULT false,
  is_bidirectional BOOLEAN DEFAULT false,
  icon_names       TEXT[],
  hex_color        VARCHAR(7),
  border_style     VARCHAR(50),
  active           BOOLEAN DEFAULT true
);
```

#### `m_block_variants`
```sql
CREATE TABLE IF NOT EXISTS "public"."m_block_variants" (
  id             UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  parent_id      UUID,
  version        INTEGER DEFAULT 1,
  block_id       UUID,
  name           VARCHAR(255),
  description    TEXT,
  node_type      VARCHAR(100),
  default_config JSONB,
  active         BOOLEAN DEFAULT true
);
```

**RLS Policies on block tables**:
```sql
-- m_ tables: read-only for authenticated, full for service_role
CREATE POLICY "Allow read access to block categories for authenticated users"
  ON "public"."m_block_categories" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Allow service role to manage block categories"
  ON "public"."m_block_categories" TO "service_role" USING (true);

-- Same pattern for m_block_masters and m_block_variants
```

**Block types are seeded** via `m_category_master` + `m_category_details` with category `cat_block_type`:
- service, spare, billing, text, video, image, checklist, document

---

### 2.3 `t_equipment` — **DOES NOT EXIST**

There is **no** `t_equipment` table in the database. No references found in any SQL files or TypeScript code.

The closest related tables for equipment/resource management are:
- `t_catalog_items` — tenant catalog items (services/products)
- `t_catalog_resources` — tenant resources
- `t_catalog_service_resources` — links services to resources
- `m_catalog_resource_templates` — master resource templates

---

### 2.4 `m_catalog_resource_templates`

```sql
CREATE TABLE IF NOT EXISTS "public"."m_catalog_resource_templates" (
  id                UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  industry_id       VARCHAR(50) NOT NULL,
  resource_type_id  VARCHAR(50) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  description       TEXT,
  default_attributes JSONB DEFAULT '{}',
  pricing_guidance  JSONB DEFAULT '{}',
  popularity_score  INTEGER DEFAULT 0,
  is_recommended    BOOLEAN DEFAULT false,
  is_active         BOOLEAN DEFAULT true,
  sort_order        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
```

**PK**: `id` (UUID, gen_random_uuid())

**Foreign Keys**:
- `industry_id` → `m_catalog_industries(id)`
- `resource_type_id` → `m_catalog_resource_types(id)`

**Indexes**:
- `(industry_id, is_active)`
- `(is_recommended, popularity_score DESC)`
- `(resource_type_id, is_active)`

---

## Task 3 Output: RLS Policies

### Pattern 1: Master (`m_`) Tables — Public Read, Service Role Write

```sql
-- Authenticated users can read
CREATE POLICY "Allow read access to block masters for authenticated users"
  ON "public"."m_block_masters"
  FOR SELECT TO "authenticated"
  USING (true);

-- Service role has full access
CREATE POLICY "Allow service role to manage block masters"
  ON "public"."m_block_masters"
  TO "service_role"
  USING (true);
```

**Pattern**: `m_` tables are global/shared data. All authenticated users can SELECT. Only `service_role` can INSERT/UPDATE/DELETE.

### Pattern 2: Tenant (`t_`) Tables — JWT Tenant Isolation

**SmartForms tenant tables** (from migration files):

```sql
-- Tenant isolation via JWT claims
CREATE POLICY "m_form_tenant_selections_tenant_isolation"
  ON public.m_form_tenant_selections
  FOR ALL
  USING (
    tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );

-- Same pattern for:
--   m_form_template_mappings
--   m_form_submissions
--   m_form_attachments
```

**Other tenant tables use `auth.uid()` directly**:

```sql
-- SmartProfiles: tenant_id matched to auth.uid()
CREATE POLICY "Tenants can manage their own smartprofile"
  ON "public"."t_tenant_smartprofiles"
  USING (tenant_id::text = auth.uid()::text);
```

**Invitation system: Complex join-based RLS**:
```sql
CREATE POLICY "Authorized users can create invitations"
  ON "public"."t_user_invitations"
  FOR INSERT
  WITH CHECK ((
    tenant_id IN (
      SELECT ut.tenant_id
      FROM t_user_tenants ut
      JOIN t_user_tenant_roles utr ON ut.id = utr.user_tenant_id
      JOIN t_category_details cd ON utr.role_id = cd.id
      WHERE ut.user_id = auth.uid()
        AND ut.status::text = 'active'
        AND cd.sub_cat_name::text = ANY(ARRAY['Owner','Admin','HR Manager'])
    )
  ) AND invited_by = auth.uid() AND created_by = auth.uid());
```

### Helper Function for Tenant ID Extraction

```sql
CREATE OR REPLACE FUNCTION "public"."get_current_tenant_id"()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN NULLIF(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      ''
    )::UUID;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$;
```

### Auth Pattern Summary

| Context | How tenant_id is resolved |
|---------|--------------------------|
| RLS on SmartForms tables | `current_setting('request.jwt.claims', true)::json->>'tenant_id'` |
| RLS on SmartProfiles | `auth.uid()::text` (tenant_id = user's auth UUID) |
| Edge Functions | `req.headers.get('x-tenant-id')` header (set by API layer) |
| RPC functions | `auth.uid()` for user, JWT claims for tenant |
| Helper function | `get_current_tenant_id()` — wraps JWT claim extraction |

---

## Task 4 Output: Form Schema JSONB

### TypeScript Interfaces (Definitive)

**Source**: `MANUAL_COPY_FILES/cycle3-ui/contractnest-ui/src/pages/settings/smart-forms/types.ts`

```typescript
export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom_message?: string;
}

export interface FormField {
  id: string;
  type: string;
    // Supported types: 'text', 'email', 'number', 'textarea', 'select',
    //   'radio', 'checkbox', 'multi_select', 'date', 'file',
    //   'heading', 'paragraph', 'divider' (layout-only fields)
  label: string;
  placeholder?: string;
  help_text?: string;
  default_value?: unknown;
  options?: FormFieldOption[];       // For select, radio, multi_select
  validation?: FormFieldValidation;
  computed?: {
    formula: string;                 // 'SUM', 'AVG', 'COUNT', or JS expression
    depends_on: string[];            // field IDs
  };
  conditional?: {
    field_id: string;                // Show/hide based on another field
    operator: string;                // 'equals', 'not_equals', 'contains', 'not_empty', 'empty'
    value: unknown;
  };
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  repeatable?: boolean;
}

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  version: number;
  sections: FormSection[];
  settings?: {
    allow_draft?: boolean;
    require_all_sections?: boolean;
    show_progress?: boolean;
    theme?: string;
  };
}
```

### How the FormRenderer Reads `form_schema`

**Source**: `MANUAL_COPY_FILES/cycle3-polish/.../FormRenderer.tsx`

The renderer:
1. Iterates `schema.sections` → renders each as a card with title/description
2. Within each section, iterates `section.fields` → renders by `field.type`
3. Supports **conditional visibility**: checks `field.conditional` against current values
4. Supports **computed fields**: evaluates `field.computed.formula` using `depends_on` values
5. Runs **validation** on submit using `field.validation` rules
6. Shows **progress bar** if `schema.settings.show_progress !== false`
7. Shows **Save Draft** button if `schema.settings.allow_draft !== false`

### Sample `form_schema` JSONB Structure

Based on the migration comments and TypeScript types:

```json
{
  "id": "calibration-checklist-v1",
  "title": "Equipment Calibration Checklist",
  "description": "Standard calibration form for biomedical equipment",
  "version": 1,
  "sections": [
    {
      "id": "equipment-info",
      "title": "Equipment Information",
      "description": "Identify the equipment being calibrated",
      "fields": [
        {
          "id": "equipment_name",
          "type": "text",
          "label": "Equipment Name",
          "placeholder": "e.g., Drager V500",
          "validation": { "required": true, "maxLength": 255 }
        },
        {
          "id": "serial_number",
          "type": "text",
          "label": "Serial Number",
          "validation": { "required": true }
        },
        {
          "id": "calibration_type",
          "type": "select",
          "label": "Calibration Type",
          "options": [
            { "label": "Electrical Safety", "value": "electrical" },
            { "label": "Performance", "value": "performance" },
            { "label": "Full Calibration", "value": "full" }
          ],
          "validation": { "required": true }
        }
      ]
    },
    {
      "id": "measurements",
      "title": "Measurements",
      "fields": [
        {
          "id": "reading_1",
          "type": "number",
          "label": "Reading 1",
          "validation": { "required": true, "min": 0, "max": 1000 }
        },
        {
          "id": "reading_2",
          "type": "number",
          "label": "Reading 2",
          "validation": { "required": true, "min": 0, "max": 1000 }
        },
        {
          "id": "average_reading",
          "type": "number",
          "label": "Average Reading",
          "computed": {
            "formula": "AVG",
            "depends_on": ["reading_1", "reading_2"]
          }
        },
        {
          "id": "pass_fail",
          "type": "radio",
          "label": "Result",
          "options": [
            { "label": "Pass", "value": "pass" },
            { "label": "Fail", "value": "fail" }
          ],
          "validation": { "required": true }
        },
        {
          "id": "failure_notes",
          "type": "textarea",
          "label": "Failure Notes",
          "help_text": "Describe the failure reason",
          "conditional": {
            "field_id": "pass_fail",
            "operator": "equals",
            "value": "fail"
          },
          "validation": { "required": true }
        }
      ]
    }
  ],
  "settings": {
    "allow_draft": true,
    "show_progress": true,
    "require_all_sections": true
  }
}
```

### Submission `responses` Structure

```json
{
  "equipment_name": "Drager V500",
  "serial_number": "SN-12345",
  "calibration_type": "full",
  "reading_1": 42,
  "reading_2": 44,
  "pass_fail": "pass"
}
```

Key: `field.id` → Value: user input (string, number, boolean, string[])

### Submission `computed_values` Structure

```json
{
  "average_reading": 43,
  "overall_score": 85,
  "pass_count": 12,
  "fail_count": 2
}
```

---

## Task 5 Output: Conventions

### 5a. UUID Generation

| Context | Function |
|---------|----------|
| New tables (2025+) | `gen_random_uuid()` |
| Legacy tables | `extensions.uuid_generate_v4()` |
| Edge Functions (Deno) | `crypto.randomUUID()` |

**Convention for new tables**: Use `gen_random_uuid()`.

### 5b. Timestamps

```sql
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now()
```

- All tables use `TIMESTAMPTZ` (not `TIMESTAMP`)
- Default: `now()`
- `updated_at` is NOT auto-updated via trigger in most tables (updated manually in application code)

### 5c. Soft Delete Pattern

- **Primary pattern**: `is_active BOOLEAN DEFAULT true` (on m_ master tables)
- **Alternative**: `active BOOLEAN DEFAULT true` (on m_block_* tables)
- **Some tables**: `deactivated_at TIMESTAMPTZ` (e.g., m_form_tenant_selections)
- **No `deleted_at` or `is_deleted`** pattern found — the project uses `is_active` flags

### 5d. Auth & Tenant Identification

| Layer | Method |
|-------|--------|
| **Edge Functions** | `x-tenant-id` header + `x-is-admin` header + Bearer token for `auth.getUser()` |
| **RLS Policies** | `current_setting('request.jwt.claims', true)::json->>'tenant_id'` |
| **RPC Functions** | `auth.uid()` for user ID, JWT claims for tenant |
| **Helper** | `get_current_tenant_id()` function wraps JWT extraction |

### 5e. API Route Pattern

The project uses **Supabase Edge Functions** (Deno), not Express routes. Each function is a single `serve()` handler with URL path parsing.

**Pattern** (from `smart-forms/index.ts`):
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  // Parse path segments
  const { segments, params } = parsePath(req.url);

  // Auth: x-is-admin header, x-tenant-id header, Bearer token
  const isAdmin = req.headers.get('x-is-admin') === 'true';
  const tenantId = req.headers.get('x-tenant-id') || '';

  // Route by segments + HTTP method
  if (seg0 === 'selections' && req.method === 'GET') { ... }
  if (seg0 === 'submissions' && req.method === 'POST') { ... }
  // etc.
});
```

**There is also a `contractnest-api`** (Node.js/Express) but it's in a submodule not initialized in this environment.

---

## Task 6 Output: Related Tables

### 6a. All `m_` (Master) Tables in Database

| Table | PK Type | Purpose |
|-------|---------|---------|
| `m_block_categories` | UUID | Block type categories |
| `m_block_masters` | UUID | Block definitions (config JSONB) |
| `m_block_variants` | UUID | Block variant configurations |
| `m_catalog_categories` | VARCHAR(100) | Industry catalog categories |
| `m_catalog_category_industry_map` | composite | Category ↔ Industry mapping |
| `m_catalog_industries` | VARCHAR(50) | Industry definitions |
| `m_catalog_pricing_templates` | UUID | Pricing rule templates |
| `m_catalog_resource_templates` | UUID | Resource templates per industry |
| `m_catalog_resource_types` | VARCHAR(50) | Resource type definitions |
| `m_category_details` | UUID | Generic sub-categories (roles, block types, etc.) |
| `m_category_master` | UUID | Generic category groups |
| `m_permissions` | UUID | Permission definitions |
| `m_products` | UUID | Product master data |
| **m_form_templates** | UUID | **SmartForms — form definitions** |

### 6b. All `t_` (Tenant) Tables in Database (60 tables)

Key tenant tables:

| Table | Purpose |
|-------|---------|
| `t_tenants` | Tenant records |
| `t_tenant_profiles` | Tenant business profiles |
| `t_user_profiles` | User profiles |
| `t_user_tenants` | User ↔ Tenant associations |
| `t_user_tenant_roles` | User roles within tenants |
| `t_contacts` | Tenant contacts |
| `t_catalog_items` | Tenant catalog items (services) |
| `t_catalog_resources` | Tenant resources |
| `t_catalog_service_resources` | Service ↔ Resource links |
| `t_business_groups` | Business groups (seller/buyer) |
| `t_group_memberships` | Group membership records |
| `t_campaigns` | Marketing campaigns |
| `t_audit_logs` | Audit trail |
| `t_chat_sessions` | Chat/AI sessions |
| `t_user_invitations` | User invitation system |

### 6c. SmartForms-specific Tables

| Table | RLS | tenant_id? | Purpose |
|-------|-----|-----------|---------|
| `m_form_templates` | No | No | Global form definitions (admin only) |
| `m_form_tenant_selections` | Yes | Yes | Tenant activates/deactivates forms |
| `m_form_template_mappings` | Yes | Yes | Tenant maps forms to contracts/events |
| `m_form_submissions` | Yes | Yes | Completed form responses |
| `m_form_attachments` | Yes | Yes | File uploads linked to submissions |

### 6d. `n_` (Notification/System) Tables

| Table | Purpose |
|-------|---------|
| `n_jtd_event_types` | JTD event type definitions |
| `n_jtd_tenant_config` | JTD tenant configuration |
| `n_jtd_tenant_source_config` | JTD source configuration |
| `n_platform_providers` | Platform provider definitions |
| `n_system_actors` | System actor definitions |
| `n_tenant_preferences` | Tenant notification preferences |

### 6e. `m_form_template_mappings` and `m_form_submissions` Detail

Both exist and are fully defined in Task 2 migration files. Key relationships:

```
m_form_templates (global, no tenant_id)
    ↓ FK: form_template_id
m_form_tenant_selections (tenant_id scoped)
    ↓ (logical link)
m_form_template_mappings (tenant_id + contract_id + timing)
    ↓ FK: mapping_id
m_form_submissions (tenant_id + service_event_id + contract_id)
    ↓ FK: form_submission_id
m_form_attachments (tenant_id + field_id)
```

---

## Summary: Key Findings for R1 Migration

1. **`m_cat_blocks` does not exist** — the block system uses `m_block_categories` / `m_block_masters` / `m_block_variants`
2. **`t_equipment` does not exist** — may need to be created for Release 1
3. **RLS pattern**: JWT `tenant_id` claim for tenant tables; authenticated read + service_role write for master tables
4. **UUID generation**: Use `gen_random_uuid()` for new tables
5. **Soft delete**: Use `is_active BOOLEAN DEFAULT true`
6. **Timestamps**: `TIMESTAMPTZ DEFAULT now()` for both `created_at` and `updated_at`
7. **FormSchema JSONB** is well-defined with sections → fields → validation/computed/conditional
8. **Edge Functions** follow the Deno/serve pattern with x-tenant-id header
9. **No ORM** — direct Supabase client queries
10. **RPC functions** used for multi-step operations (clone, new-version)
