# R0: Schema Discovery — ContractNest (BaseProduct)

> **Source**: Live Supabase DB `uwyqhzotluikawcboldr` (BaseProduct, ap-south-1)
> **Generated**: 2026-03-31
> **Purpose**: Feed into R1 migration handoff for Smart Forms / Knowledge Tree

---

## Task 1 Output: Project Structure

### 1a. Top-Level Folder Tree (2 levels)

```
.
├── ClaudeDocumentation/        # Docs (submodule, branch: master)
├── ContractNest-Mobile/        # React Native mobile (submodule)
├── FamilyKnows/                # Separate SaaS (Expo + React website)
├── MANUAL_COPY_FILES/          # Claude output folder for code changes
│   ├── cycle1-migrations/      # SmartForms migration files
│   ├── cycle1-edge/            # SmartForms RPC functions
│   ├── cycle1-ui/              # SmartForms UI cycle 1
│   ├── cycle2-ui/              # SmartForms UI cycle 2
│   ├── cycle3-api/             # SmartForms API DTOs
│   ├── cycle3-edge/            # SmartForms edge function (full)
│   ├── cycle3-ui/              # SmartForms UI types + renderer
│   ├── cycle3-polish/          # SmartForms admin editor + polish
│   └── ... (50+ feature branches)
├── Manual_Copy/
│   └── Catalog-Studio/         # Catalog block type seeds
├── contractnest-api/           # Backend API (Node.js/Express/TS, submodule)
├── contractnest-edge/          # Edge Functions (Deno, submodule)
├── contractnest-ui/            # Frontend (React/TS/Vite, submodule)
├── manual_copy_familyknows/    # FamilyKnows feature branches
├── scripts/
│   └── reference/
├── supabase/
│   ├── .temp/
│   └── migrations/
│       └── 20251229170144_remote_schema.sql  (708 KB — Dec 2025 dump)
├── node_modules/
├── index.ts                    # Main edge function entry point
├── package.json
└── CLAUDE.md
```

### 1b. Package Stack (root)

```json
{
  "dependencies": {
    "lottie-react": "^2.4.1"
  }
}
```

> Note: The real package stacks are inside the submodules (`contractnest-api`, `contractnest-ui`, `contractnest-edge`). The root is a monorepo shell.

### 1c. Supabase CLI

- `supabase/` directory exists
- `supabase/migrations/` has one dump file: `20251229170144_remote_schema.sql` (Dec 2025 snapshot)
- Newer migrations (SmartForms, contracts, etc.) live in `MANUAL_COPY_FILES/*/contractnest-edge/supabase/migrations/`

### 1d. Environment Variables

No `.env.example` or `.env.local` found in root. Environment is managed via Supabase project settings + edge function env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

---

## Task 2 Output: Table Schemas (LIVE DB)

### 2.1 `m_form_templates` — Global Form Definitions

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | uuid | NO | `gen_random_uuid()` |
| 2 | `name` | varchar | NO | — |
| 3 | `description` | text | YES | — |
| 4 | `category` | varchar | NO | — |
| 5 | `form_type` | varchar | NO | — |
| 6 | `tags` | text[] | YES | `'{}'::text[]` |
| 7 | `schema` | jsonb | NO | — |
| 8 | `version` | integer | NO | `1` |
| 9 | `parent_template_id` | uuid | YES | — |
| 10 | `status` | varchar | NO | `'draft'` |
| 11 | `thumbnail_url` | text | YES | — |
| 12 | `created_by` | uuid | NO | — |
| 13 | `approved_by` | uuid | YES | — |
| 14 | `approved_at` | timestamptz | YES | — |
| 15 | `review_notes` | text | YES | — |
| 16 | `created_at` | timestamptz | YES | `now()` |
| 17 | `updated_at` | timestamptz | YES | `now()` |

**Status lifecycle**: `draft` → `in_review` → `approved` → `past`
**Categories**: calibration, inspection, audit, maintenance, clinical, pharma, compliance, onboarding, general
**Form types**: pre_service, post_service, during_service, standalone
**No tenant_id** — this is a global/admin-only table.
**No RLS** on `m_form_templates` itself (admin-managed via service_role).

---

### 2.2 `m_cat_blocks` — Catalog Blocks (Tenant-Scoped)

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | uuid | NO | `uuid_generate_v4()` |
| 2 | `block_type_id` | uuid | NO | — |
| 3 | `name` | varchar | NO | — |
| 4 | `display_name` | varchar | YES | — |
| 5 | `icon` | varchar | YES | `'📦'` |
| 6 | `description` | text | YES | — |
| 7 | `tags` | jsonb | YES | `'[]'::jsonb` |
| 8 | `category` | varchar | YES | — |
| 9 | `config` | jsonb | NO | `'{}'::jsonb` |
| 10 | `pricing_mode_id` | uuid | YES | — |
| 11 | `base_price` | numeric | YES | — |
| 12 | `currency` | varchar | YES | `'INR'` |
| 13 | `price_type_id` | uuid | YES | — |
| 14 | `tax_rate` | numeric | YES | `18.00` |
| 15 | `hsn_sac_code` | varchar | YES | — |
| 16 | `resource_pricing` | jsonb | YES | — |
| 17 | `variant_pricing` | jsonb | YES | — |
| 18 | `is_admin` | boolean | NO | `false` |
| 19 | `visible` | boolean | NO | `true` |
| 20 | `status_id` | uuid | YES | — |
| 21 | `is_active` | boolean | NO | `true` |
| 22 | `version` | integer | NO | `1` |
| 23 | `sequence_no` | integer | YES | `0` |
| 24 | `is_deletable` | boolean | NO | `true` |
| 25 | `created_at` | timestamptz | NO | `now()` |
| 26 | `updated_at` | timestamptz | NO | `now()` |
| 27 | `created_by` | uuid | YES | — |
| 28 | `updated_by` | uuid | YES | — |
| 29 | `tenant_id` | uuid | YES | — |
| 30 | `is_seed` | boolean | NO | `false` |
| 31 | `is_live` | boolean | NO | `true` |

**Note**: Uses `uuid_generate_v4()` (not `gen_random_uuid()`).
**Sample rows**: config is `{}` in sample data. `block_type_id` references a UUID from `m_category_details` (cat_block_type).

---

### 2.3 `t_equipment` — DOES NOT EXIST

**No `t_equipment` table exists in the live DB.** The equipment/asset equivalents are:

- **`t_client_asset_registry`** — Client-owned assets (equipment, facilities, etc.)
- **`t_tenant_asset_registry`** — Tenant-owned assets
- **`t_contract_assets`** — Assets linked to contracts

See section 2.5 below for their schemas.

---

### 2.4 `m_catalog_resource_templates` — Resource Templates

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | uuid | NO | `gen_random_uuid()` |
| 2 | `industry_id` | varchar(50) | YES | — |
| 3 | `resource_type_id` | varchar(50) | NO | — |
| 4 | `name` | varchar(255) | NO | — |
| 5 | `description` | text | YES | — |
| 6 | `default_attributes` | jsonb | YES | `'{}'::jsonb` |
| 7 | `pricing_guidance` | jsonb | YES | `'{}'::jsonb` |
| 8 | `popularity_score` | integer | YES | `0` |
| 9 | `is_recommended` | boolean | YES | `false` |
| 10 | `is_active` | boolean | YES | `true` |
| 11 | `sort_order` | integer | YES | `0` |
| 12 | `created_at` | timestamptz | YES | `now()` |
| 13 | `updated_at` | timestamptz | YES | `now()` |
| 14 | `sub_category` | varchar | YES | — |
| 15 | `scope` | varchar | YES | `'industry_specific'` |

**PK**: `id` (uuid, `gen_random_uuid()`)
**No RLS** on this table (master/admin data).

---

### 2.5 Asset Registry Tables (Equipment Equivalent)

#### `t_client_asset_registry` (34 columns)

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | uuid | NO | `gen_random_uuid()` |
| 2 | `tenant_id` | uuid | NO | — |
| 3 | `owner_contact_id` | uuid | YES | — |
| 4 | `resource_type_id` | varchar | NO | — |
| 5 | `asset_type_id` | uuid | YES | — |
| 6 | `parent_asset_id` | uuid | YES | — |
| 7 | `template_id` | uuid | YES | — |
| 8 | `industry_id` | uuid | YES | — |
| 9 | `name` | varchar | NO | — |
| 10 | `code` | varchar | YES | — |
| 11 | `description` | text | YES | — |
| 12 | `status` | varchar | NO | `'active'` |
| 13 | `condition` | varchar | NO | `'good'` |
| 14 | `criticality` | varchar | NO | `'medium'` |
| 15 | `location` | text | YES | — |
| 16 | `make` | varchar | YES | — |
| 17 | `model` | varchar | YES | — |
| 18 | `serial_number` | varchar | YES | — |
| 19 | `purchase_date` | date | YES | — |
| 20 | `warranty_expiry` | date | YES | — |
| 21 | `last_service_date` | date | YES | — |
| 22 | `area_sqft` | numeric | YES | — |
| 23 | `dimensions` | jsonb | YES | — |
| 24 | `capacity` | integer | YES | — |
| 25 | `specifications` | jsonb | YES | `'{}'::jsonb` |
| 26 | `tags` | jsonb | YES | `'[]'::jsonb` |
| 27 | `image_url` | text | YES | — |
| 28 | `is_active` | boolean | NO | `true` |
| 29 | `is_live` | boolean | NO | `true` |
| 30 | `created_at` | timestamptz | NO | `now()` |
| 31 | `updated_at` | timestamptz | NO | `now()` |
| 32 | `created_by` | uuid | YES | — |
| 33 | `updated_by` | uuid | YES | — |
| 34 | `ownership_type` | text | NO | `'client'` |

#### `t_tenant_asset_registry` — Same structure as above, minus `owner_contact_id` and `ownership_type`.

#### `t_contract_assets` — Links assets to contracts

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | uuid | NO | `gen_random_uuid()` |
| 2 | `contract_id` | uuid | NO | — |
| 3 | `asset_id` | uuid | NO | — |
| 4 | `tenant_id` | uuid | NO | — |
| 5 | `coverage_type` | varchar | YES | — |
| 6 | `service_terms` | jsonb | YES | `'{}'::jsonb` |
| 7 | `pricing_override` | jsonb | YES | — |
| 8 | `notes` | text | YES | — |
| 9 | `is_active` | boolean | NO | `true` |
| 10 | `is_live` | boolean | NO | `true` |
| 11 | `created_at` | timestamptz | NO | `now()` |
| 12 | `updated_at` | timestamptz | NO | `now()` |

---

## Task 3 Output: RLS Policies

### 3.1 `m_form_templates` — NO RLS

No RLS policies exist on `m_form_templates`. It's admin-managed via service_role key.

### 3.2 `m_form_*` Tenant Tables — JWT Claim Isolation

All 4 tenant-scoped SmartForms tables use the **same pattern**:

```sql
-- m_form_tenant_selections, m_form_template_mappings,
-- m_form_submissions, m_form_attachments
CREATE POLICY "<table>_tenant_isolation"
  ON public.<table>
  FOR ALL
  USING (
    tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );
```

**Pattern**: `tenant_id` matched against JWT claim `tenant_id`.

### 3.3 `m_cat_blocks` — Header-Based + Admin Override

```sql
-- SELECT: Public seed/visible OR tenant's own OR admin
CREATE POLICY "read_cat_blocks"
  ON public.m_cat_blocks
  FOR SELECT
  USING (
    (tenant_id IS NULL AND is_active = true AND visible = true)
    OR (is_seed = true AND is_active = true)
    OR (tenant_id::text = (current_setting('request.headers', true)::json->>'x-tenant-id'))
    OR ((auth.jwt()->>'is_admin')::boolean = true)
  );

-- WRITE: Tenant's own OR admin for seed/global
CREATE POLICY "write_cat_blocks"
  ON public.m_cat_blocks
  FOR ALL
  USING (
    (tenant_id::text = (current_setting('request.headers', true)::json->>'x-tenant-id'))
    OR (((auth.jwt()->>'is_admin')::boolean = true) AND (tenant_id IS NULL OR is_seed = true))
  );
```

**Key difference**: `m_cat_blocks` uses **`request.headers` → `x-tenant-id`** (set by edge function), while `m_form_*` tables use **`request.jwt.claims` → `tenant_id`** (from JWT). Two different RLS patterns in the same codebase.

### 3.4 `m_catalog_resource_templates` — NO RLS

No policies. Master/admin data.

### 3.5 `t_*` Table RLS Examples

```sql
-- t_audit_log: tenant isolation via user_tenants join
CREATE POLICY "Tenant members can view audit log"
  ON t_audit_log FOR SELECT
  USING (tenant_id IN (
    SELECT ut.tenant_id FROM t_user_tenants ut WHERE ut.user_id = auth.uid()
  ));

-- t_bm_credit_balance: helper function
CREATE POLICY "credit_balance_tenant_select"
  ON t_bm_credit_balance FOR SELECT
  USING (user_belongs_to_tenant(tenant_id) OR is_platform_admin());
```

**Three RLS patterns in use**:
1. `JWT claims → tenant_id` (SmartForms m_form_* tables)
2. `request.headers → x-tenant-id` (m_cat_blocks)
3. `auth.uid() + t_user_tenants join` or `helper functions` (t_* tables)

---

## Task 4 Output: Form Schema JSONB

### 4.1 Live Sample from `m_form_templates`

```json
{
  "id": "blank_form",
  "title": "Untitled Form",
  "description": "",
  "sections": [
    {
      "id": "section_1",
      "title": "Section 1",
      "description": "",
      "fields": [
        {
          "id": "field_1770667219601_0",
          "type": "textarea",
          "label": "New Text Area",
          "rows": 3,
          "required": false,
          "max_length": null,
          "placeholder": ""
        },
        {
          "id": "field_1770667220544_1",
          "type": "number",
          "label": "New Number",
          "min": null,
          "max": null,
          "step": null,
          "required": false,
          "placeholder": ""
        },
        {
          "id": "field_1770667221196_2",
          "type": "date",
          "label": "New Date",
          "min_date": null,
          "max_date": null,
          "required": false
        },
        {
          "id": "field_1770667223414_3",
          "type": "radio",
          "label": "New Radio Group",
          "required": false,
          "options": [
            { "label": "Option 1", "value": "option_1" }
          ]
        },
        {
          "id": "field_1770667223959_4",
          "type": "checkbox",
          "label": "New Checkbox",
          "required": false,
          "default_checked": false
        }
      ]
    }
  ]
}
```

### 4.2 TypeScript Interface (from `cycle3-ui/types.ts`)

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
  type: string;      // text, number, date, textarea, select, radio,
                      // checkbox, multi_select, file, email,
                      // heading, paragraph, divider
  label: string;
  placeholder?: string;
  help_text?: string;
  default_value?: unknown;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  computed?: {
    formula: string;        // SUM, AVG, COUNT, or JS expression
    depends_on: string[];   // field IDs
  };
  conditional?: {
    field_id: string;
    operator: string;       // equals, not_equals, contains, not_empty, empty
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

### 4.3 Live vs TypeScript Schema Differences

| Aspect | Live JSONB (DB) | TypeScript Interface |
|--------|-----------------|---------------------|
| Validation | Flat: `required`, `max_length`, `min`, `max` on field | Nested: `validation: { required, min, max, ... }` |
| Date fields | `min_date`, `max_date` | Uses `validation.min`, `validation.max` |
| Textarea | `rows` property | Not in interface |
| Checkbox | `default_checked` | Uses `default_value` |
| Settings | Not in live sample | `settings` object defined |

**The live DB schema is slightly flatter than the TypeScript interface.** The form editor saves fields with inline properties while the renderer expects the nested `validation` object. This mismatch should be resolved in R1.

### 4.4 Supported Field Types (from FormRenderer)

`text`, `number`, `date`, `textarea`, `select`, `radio`, `checkbox`, `multi_select`, `file`, `email`, `heading`, `paragraph`, `divider`

---

## Task 5 Output: Conventions

### 5.1 UUID Generation

Mixed usage:
- **`gen_random_uuid()`** — Used in newer tables (`m_form_templates`, `m_catalog_resource_templates`, asset registries)
- **`uuid_generate_v4()`** — Used in older tables (`m_cat_blocks`, `m_category_details`, `m_category_master`)
- **`crypto.randomUUID()`** — Used in Edge Functions (Deno runtime)

### 5.2 Timestamps

```sql
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

Consistent across all tables. Some tables also have `created_by` / `updated_by` UUID columns.

### 5.3 Soft Delete Pattern

- **`is_active`** — Boolean flag, used universally (NOT `deleted_at` or `is_deleted`)
- **`is_live`** — Additional boolean on newer tables (`m_cat_blocks`, asset registries, `t_contract_assets`)
- **`status`** column — Used for workflow states (draft/active/past)
- **No `deleted_at` pattern** — Soft delete is via `is_active = false`

### 5.4 Auth Pattern

Three patterns coexist:

```sql
-- 1. JWT claims (SmartForms)
current_setting('request.jwt.claims', true)::json->>'tenant_id'

-- 2. Request headers (Catalog/Blocks — set by edge function)
current_setting('request.headers', true)::json->>'x-tenant-id'

-- 3. Auth UID + join (t_* tables)
auth.uid() → t_user_tenants → tenant_id
```

Helper functions:
```sql
get_current_tenant_id()  -- Extracts from JWT claims
is_platform_admin()      -- Checks admin status
user_belongs_to_tenant() -- Checks t_user_tenants membership
```

### 5.5 Edge Function Pattern

- **Deno runtime** with `https://deno.land/std` and `https://esm.sh/@supabase/supabase-js`
- **Service role key** for DB access (bypasses RLS)
- **Tenant ID** from `x-tenant-id` header
- **Admin check** from `x-is-admin` header
- **User ID** from auth token via `db.auth.getUser()`
- **CORS** via shared `corsHeaders`
- **URL-based routing** (path segments parsed manually)

---

## Task 6 Output: Complete Table List (Live DB)

### Master Tables (`m_*`) — 22 tables

| Table | Purpose |
|-------|---------|
| `m_block_categories` | Block category hierarchy |
| `m_block_masters` | Block master definitions |
| `m_block_variants` | Block variant options |
| `m_cat_blocks` | **Catalog blocks (tenant-scoped)** |
| `m_catalog_categories` | Industry catalog categories |
| `m_catalog_category_industry_map` | Category-to-industry mapping |
| `m_catalog_industries` | Industry master list |
| `m_catalog_pricing_templates` | Pricing rule templates |
| `m_catalog_resource_template_industries` | Resource template industry links |
| `m_catalog_resource_templates` | **Resource templates** |
| `m_catalog_resource_types` | Resource type definitions |
| `m_category_details` | Generic category details |
| `m_category_master` | Generic category master |
| `m_event_status_config` | Event status configuration |
| `m_event_status_transitions` | Event status transition rules |
| `m_form_attachments` | Form file uploads |
| `m_form_submissions` | Completed form responses |
| `m_form_template_mappings` | Form-to-contract mappings |
| `m_form_templates` | **Global form definitions** |
| `m_form_tenant_selections` | Tenant form selections |
| `m_permissions` | Permission definitions |
| `m_products` | Product catalog |

### Tenant Tables (`t_*`) — 80+ tables

Key tables relevant to Smart Forms:

| Table | Relevance |
|-------|-----------|
| `t_contracts` | Forms are mapped to contracts |
| `t_contract_events` | Service events trigger form submissions |
| `t_contract_assets` | Assets linked to contracts |
| `t_contract_blocks` | Blocks within contracts |
| `t_client_asset_registry` | **Client equipment/assets (= t_equipment)** |
| `t_tenant_asset_registry` | Tenant-owned assets |
| `t_cat_templates` | Catalog templates |
| `t_catalog_items` | Tenant catalog items |
| `t_catalog_resources` | Tenant resources |
| `t_service_tickets` | Service tickets |
| `t_service_ticket_events` | Ticket event log |
| `t_service_evidence` | Evidence attachments |
| `t_tenants` | Tenant master |
| `t_user_tenants` | User-tenant memberships |
| `t_user_profiles` | User profiles |
| `t_tenant_profiles` | Tenant profiles |

### SmartForms Table Family (all exist in live DB)

```
m_form_templates            — Global form definitions (admin)
m_form_tenant_selections    — Tenant activates forms
m_form_template_mappings    — Tenant maps forms to contracts
m_form_submissions          — Completed responses
m_form_attachments          — File uploads
```

---

## Summary: Key Findings for R1

1. **`t_equipment` does not exist** — The equivalent is `t_client_asset_registry` (client-owned) and `t_tenant_asset_registry` (tenant-owned). Both have `make`, `model`, `serial_number`, `condition`, `criticality`, `specifications` JSONB, etc.

2. **`m_cat_blocks` exists** — 31 columns, tenant-scoped with `is_seed`/`is_admin` flags for shared global blocks. Uses `uuid_generate_v4()`.

3. **Form schema JSONB mismatch** — Live DB stores flat field properties (`required`, `max_length` on field), TypeScript interface expects nested `validation: {}` object. Needs alignment.

4. **Three different RLS patterns** — JWT claims, request headers, and auth.uid() joins. SmartForms uses JWT claims. Catalog blocks use request headers. Need to decide which pattern for new tables.

5. **All 5 SmartForms tables exist in production** — Migrations have been applied.

6. **UUID convention is mixed** — `gen_random_uuid()` vs `uuid_generate_v4()`. Newer tables use `gen_random_uuid()`.

7. **Soft delete** = `is_active: false` (not `deleted_at`). Newer tables add `is_live` boolean.
