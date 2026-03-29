# ContractNest - Template, Contract & Catalog System Audit

**Date:** 2026-03-29
**Database:** BaseProduct (uwyqhzotluikawcboldr) - Supabase

---

## 1. Complete Schema of `t_cat_templates`

> The catalog template table. Stores reusable service/contract templates with embedded block references.

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | uuid | NO | `uuid_generate_v4()` |
| 2 | `tenant_id` | uuid | YES | null |
| 3 | `is_live` | boolean | NO | `false` |
| 4 | `name` | varchar(255) | NO | - |
| 5 | `display_name` | varchar(255) | YES | null |
| 6 | `description` | text | YES | null |
| 7 | `category` | varchar(100) | YES | null |
| 8 | `tags` | jsonb | YES | `'[]'::jsonb` |
| 9 | `cover_image` | text | YES | null |
| 10 | `blocks` | jsonb | NO | `'[]'::jsonb` |
| 11 | `currency` | varchar(3) | YES | `'INR'` |
| 12 | `tax_rate` | numeric | YES | `18.00` |
| 13 | `discount_config` | jsonb | YES | `'{"allowed": true, "max_percent": 20}'` |
| 14 | `subtotal` | numeric | YES | null |
| 15 | `total` | numeric | YES | null |
| 16 | `settings` | jsonb | YES | `'{}'::jsonb` |
| 17 | `is_system` | boolean | NO | `false` |
| 18 | `copied_from_id` | uuid | YES | null (FK -> t_cat_templates.id) |
| 19 | `industry_tags` | jsonb | YES | `'[]'::jsonb` |
| 20 | `is_public` | boolean | NO | `false` |
| 21 | `is_active` | boolean | NO | `true` |
| 22 | `status_id` | uuid | YES | null |
| 23 | `version` | integer | NO | `1` |
| 24 | `sequence_no` | integer | YES | `0` |
| 25 | `is_deletable` | boolean | NO | `true` |
| 26 | `created_at` | timestamptz | NO | `now()` |
| 27 | `updated_at` | timestamptz | NO | `now()` |
| 28 | `created_by` | uuid | YES | null |
| 29 | `updated_by` | uuid | YES | null |
| 30 | `is_latest` | boolean | NO | `true` |
| 31 | `parent_template_id` | uuid | YES | null |

**Constraints:**
- PK: `cat_templates_pkey` on `id`
- FK: `cat_templates_copied_from_id_fkey` -> `t_cat_templates(id)`

---

## 2. How the `blocks` JSONB Array Works

The `blocks` column is a **JSONB array of block references**. Each element is NOT a full block definition -- it is a **pointer** to an `m_cat_blocks` record with optional config overrides.

### Block Entry Structure

```jsonc
{
  "order": <integer>,          // Position/sort order in the template
  "block_id": "<uuid>",        // FK reference to m_cat_blocks.id
  "config": {                  // OPTIONAL - inline config (used in some templates)
    "price": 666,
    "visible": true,
    "evidenceRequired": {
      "gps": false,
      "otp": false,
      "photo": true,
      "signature": false
    }
  },
  "config_overrides": {        // OPTIONAL - overrides on top of the block's own config
    "quantity": 1
  }
}
```

### Actual Template Record #1: "Untitled Template"

```
id:                  e2b6a357-1353-4286-92cf-c3d64b9e8953
tenant_id:           70f8eb69-9ccf-4a0c-8177-cb6131934344
name:                Untitled Template
display_name:        Untitled Template
category:            null
is_live:             true
is_system:           false
is_public:           false
version:             1
is_latest:           true
parent_template_id:  e2b6a357-1353-4286-92cf-c3d64b9e8953  (self-referencing)
currency:            INR
tax_rate:            18.00
```

**blocks:**
```json
[
    {
        "order": 0,
        "config": {
            "price": 666,
            "visible": true,
            "evidenceRequired": {
                "gps": false,
                "otp": false,
                "photo": true,
                "signature": false
            }
        },
        "block_id": "5188e7a2-e5c0-4630-aca1-29f66ff25e25"
    }
]
```

**settings:** `{}`
**discount_config:** `{"allowed": true, "max_percent": 20}`

### Actual Template Record #2: "asdds" (version 2, equipment_maintenance)

```
id:       26810ac5-ef5d-4a50-b497-fab9161ee8b5
name:     asdds
category: equipment_maintenance
version:  2
```

**blocks:**
```json
[
    {
        "order": 1,
        "block_id": "f6a3161d-0b66-42bd-a65c-5b41513c1268",
        "config_overrides": {
            "quantity": 1
        }
    }
]
```

### All 3 Templates in System

| id | name | category | is_live | version |
|----|------|----------|---------|---------|
| e2b6a357-... | Untitled Template | null | true | 1 |
| 26810ac5-... | asdds | equipment_maintenance | true | 2 |
| cc89f559-... | asddsd | equipment_maintenance | true | 1 |

---

## 3. Complete Schema of `t_contracts` and `t_contract_blocks`

### `t_contracts` (18 records)

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | uuid | NO | `gen_random_uuid()` |
| 2 | `tenant_id` | uuid | NO | - |
| 3 | `contract_number` | varchar(30) | YES | null |
| 4 | `rfq_number` | varchar(30) | YES | null |
| 5 | `record_type` | varchar(10) | NO | `'contract'` |
| 6 | `contract_type` | varchar(20) | NO | `'client'` |
| 7 | `path` | varchar(20) | YES | null |
| 8 | `template_id` | uuid | YES | null |
| 9 | `name` | varchar(255) | NO | - |
| 10 | `description` | text | YES | null |
| 11 | `status` | varchar(30) | NO | `'draft'` |
| 12 | `buyer_id` | uuid | YES | null |
| 13 | `buyer_name` | varchar(255) | YES | null |
| 14 | `buyer_company` | varchar(255) | YES | null |
| 15 | `buyer_email` | varchar(255) | YES | null |
| 16 | `buyer_phone` | varchar(100) | YES | null |
| 17 | `buyer_contact_person_id` | uuid | YES | null |
| 18 | `buyer_contact_person_name` | varchar(255) | YES | null |
| 19 | `acceptance_method` | varchar(20) | YES | null |
| 20 | `duration_value` | integer | YES | null |
| 21 | `duration_unit` | varchar(10) | YES | null |
| 22 | `grace_period_value` | integer | YES | `0` |
| 23 | `grace_period_unit` | varchar(10) | YES | null |
| 24 | `currency` | varchar(3) | YES | `'INR'` |
| 25 | `billing_cycle_type` | varchar(20) | YES | null |
| 26 | `payment_mode` | varchar(20) | YES | null |
| 27 | `emi_months` | integer | YES | null |
| 28 | `per_block_payment_type` | varchar(20) | YES | null |
| 29 | `total_value` | numeric | YES | `0` |
| 30 | `tax_total` | numeric | YES | `0` |
| 31 | `grand_total` | numeric | YES | `0` |
| 32 | `selected_tax_rate_ids` | jsonb | YES | `'[]'::jsonb` |
| 33 | `sent_at` | timestamptz | YES | null |
| 34 | `accepted_at` | timestamptz | YES | null |
| 35 | `completed_at` | timestamptz | YES | null |
| 36 | `version` | integer | NO | `1` |
| 37 | `is_live` | boolean | NO | `true` |
| 38 | `is_active` | boolean | NO | `true` |
| 39 | `created_by` | uuid | YES | null |
| 40 | `updated_by` | uuid | YES | null |
| 41 | `created_at` | timestamptz | YES | `now()` |
| 42 | `updated_at` | timestamptz | YES | `now()` |
| 43 | `global_access_id` | varchar(12) | YES | null |
| 44 | `tax_breakdown` | jsonb | YES | `'[]'::jsonb` |
| 45 | `computed_events` | jsonb | YES | null |
| 46 | `evidence_policy_type` | varchar(20) | YES | `'none'` |
| 47 | `evidence_selected_forms` | jsonb | YES | `'[]'::jsonb` |
| 48 | `nomenclature_id` | uuid | YES | null (FK -> m_category_details.id) |
| 49 | `nomenclature_code` | text | YES | null |
| 50 | `nomenclature_name` | text | YES | null |
| 51 | `asset_count` | integer | YES | `0` |
| 52 | `asset_summary` | jsonb | YES | `'[]'::jsonb` |
| 53 | `equipment_details` | jsonb | YES | `'[]'::jsonb` |
| 54 | `seller_id` | uuid | NO | - |
| 55 | `buyer_tenant_id` | uuid | YES | null |
| 56 | `start_date` | timestamptz | NO | `now()` |
| 57 | `allow_buyer_to_add_equipment` | boolean | NO | `false` |
| 58 | `metadata` | jsonb | YES | `'{}'::jsonb` |
| 59 | `coverage_types` | jsonb | YES | `'[]'::jsonb` |
| 60 | `end_date` | timestamptz | YES | null |
| 61 | `prolongation_value` | integer | YES | `0` |
| 62 | `prolongation_unit` | varchar(20) | YES | `'days'` |
| 63 | `prolongation_date` | timestamptz | YES | null |

**Constraints:**
- PK: `t_contracts_pkey` on `id`
- FK: `t_contracts_nomenclature_id_fkey` -> `m_category_details(id)`

---

### `t_contract_blocks` (13 records)

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | uuid | NO | `gen_random_uuid()` |
| 2 | `contract_id` | uuid | NO | - (FK -> t_contracts.id ON DELETE CASCADE) |
| 3 | `tenant_id` | uuid | NO | - |
| 4 | `position` | integer | NO | `0` |
| 5 | `source_type` | varchar(10) | NO | `'flyby'` |
| 6 | `source_block_id` | uuid | YES | null |
| 7 | `block_name` | varchar(255) | NO | - |
| 8 | `block_description` | text | YES | null |
| 9 | `category_id` | varchar(50) | YES | null |
| 10 | `category_name` | varchar(100) | YES | null |
| 11 | `unit_price` | numeric | YES | null |
| 12 | `quantity` | integer | YES | null |
| 13 | `billing_cycle` | varchar(20) | YES | null |
| 14 | `total_price` | numeric | YES | null |
| 15 | `flyby_type` | varchar(20) | YES | null |
| 16 | `custom_fields` | jsonb | YES | `'{}'::jsonb` |
| 17 | `created_at` | timestamptz | YES | `now()` |

**Constraints:**
- PK: `t_contract_blocks_pkey` on `id`
- FK: `t_contract_blocks_contract_id_fkey` -> `t_contracts(id) ON DELETE CASCADE`

---

## 4. How a Template Becomes a Contract (Copy vs Reference)

### Current Reality: Templates are NOT being used for contracts

**Key Finding:** Every single contract in the system has `template_id = NULL`. All 13 contract blocks have `source_type = 'flyby'` with `source_block_id = NULL`.

This means **contracts are currently created ad-hoc ("flyby")**, not from templates.

### The Designed Architecture (not yet active in production data)

The system was *designed* for this flow:

```
t_cat_templates                    t_contracts
  ├─ blocks: JSONB array   ──>      ├─ template_id: uuid (reference back to template)
  │   [{block_id, config}]          │
  │                                  │
  └─ m_cat_blocks (master)  ──>    t_contract_blocks
      (full block defs)              ├─ source_type: 'catalog' | 'flyby'
                                     ├─ source_block_id: uuid (ref to m_cat_blocks.id)
                                     ├─ block_name: COPIED (denormalized)
                                     ├─ unit_price: COPIED (snapshot at creation)
                                     ├─ quantity: COPIED
                                     └─ total_price: COPIED
```

**What gets COPIED (denormalized into t_contract_blocks):**
- block_name, block_description
- category_id, category_name
- unit_price, quantity, billing_cycle, total_price
- custom_fields

**What gets REFERENCED:**
- `t_contracts.template_id` -> points back to `t_cat_templates.id`
- `t_contract_blocks.source_block_id` -> points back to `m_cat_blocks.id`
- `t_contract_blocks.source_type` -> indicates origin ('catalog' vs 'flyby')

**Design intent:** Block data is snapshot-copied so contracts are immune to future template/block changes. The references are kept for audit trail only.

### Current "Flyby" Pattern (all 13 blocks)

| contract_name | block_name | unit_price | qty | total | source_type |
|---------------|------------|------------|-----|-------|-------------|
| testin auto accept | test | 4,000 | 5 | 20,000 | flyby |
| Testing all contract | monthly service | 17,877 | 12 | 214,524 | flyby |
| sddsd | HVAC | 121,212 | 5 | 606,060 | flyby |
| autoaccept | asdddd | 3,000 | 12 | 36,000 | flyby |

---

## 5. How `m_catalog_resource_templates` Connects to Blocks/Templates

### Schema

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | uuid | NO | `gen_random_uuid()` |
| 2 | `industry_id` | varchar(50) | YES | null (FK -> m_catalog_industries.id) |
| 3 | `resource_type_id` | varchar(50) | NO | - (FK -> m_catalog_resource_types.id) |
| 4 | `name` | varchar(255) | NO | - |
| 5 | `description` | text | YES | null |
| 6 | `default_attributes` | jsonb | YES | `'{}'` |
| 7 | `pricing_guidance` | jsonb | YES | `'{}'` |
| 8 | `popularity_score` | integer | YES | `0` |
| 9 | `is_recommended` | boolean | YES | `false` |
| 10 | `is_active` | boolean | YES | `true` |
| 11 | `sort_order` | integer | YES | `0` |
| 12 | `created_at` | timestamptz | YES | `now()` |
| 13 | `updated_at` | timestamptz | YES | `now()` |
| 14 | `sub_category` | varchar(100) | YES | null |
| 15 | `scope` | varchar(20) | YES | `'industry_specific'` |

**Constraints:**
- PK on `id`
- FK: `industry_id` -> `m_catalog_industries(id)`
- FK: `resource_type_id` -> `m_catalog_resource_types(id)`
- UNIQUE: `(industry_id, resource_type_id, name)`

### Connection to Blocks/Templates

**`m_catalog_resource_templates` is a SEPARATE system from blocks/templates.** It is a **master reference catalog** of resource types per industry (240 records). It does NOT directly FK into `m_cat_blocks` or `t_cat_templates`.

**Its role:** Provide industry-specific resource suggestions (staff, equipment, services) with pricing guidance and default attributes. When a user creates a block in `m_cat_blocks`, they may *manually pick* from these resource templates to pre-fill data, but there is **no enforced FK relationship**.

**Sample records (healthcare industry):**

| name | resource_type_id | pricing_guidance | default_attributes |
|------|-----------------|------------------|-------------------|
| Medical Doctor | team_staff | `{suggested_hourly_rate: 150, market_range: {min: 100, max: 250}}` | `{certifications: ["medical_license"], experience_level: "expert"}` |
| Registered Nurse | team_staff | `{suggested_hourly_rate: 75, market_range: {min: 50, max: 100}}` | `{certifications: ["nursing_license"], experience_level: "intermediate"}` |
| Medical Diagnostic Equipment | equipment | `{suggested_hourly_rate: 50, per_use_rate: 25}` | `{calibration_required: true, maintenance_schedule: "monthly"}` |

---

## 6. All Routes for Catalog, Blocks, Templates, Contracts

Source: `contractnest-ui/src/App.tsx`

### `/settings/configure/` Routes

| Route | Component |
|-------|-----------|
| `/settings` | SettingsPage |
| `/settings/configure` | SettingsPage |
| `/settings/configure/lovs` | ListOfValuesPage |
| `/settings/configure/resources` | ResourcesPage |
| `/settings/configure/smart-forms` | SmartFormsSelectionPage |
| `/settings/configure/storage` | StorageSettingsPage |
| `/settings/configure/customer-channels/groups` | GroupsListPage |
| `/settings/configure/customer-channels/groups/:groupId` | GroupProfileDashboard |

### `/admin/` Routes

| Route | Component |
|-------|-----------|
| `/admin/subscription-management` | SubscriptionManagementPage |
| `/admin/jtd` | QueueMonitorPage |
| `/admin/jtd/queue` | QueueMonitorPage |
| `/admin/jtd/tenants` | TenantOperationsPage |
| `/admin/jtd/events` | EventExplorerPage |
| `/admin/jtd/worker` | WorkerHealthPage |
| `/admin/smart-forms` | SmartFormsAdminPage |
| `/admin/smart-forms/editor/:id` | FormEditorPage |

### Catalog Routes

| Route | Component |
|-------|-----------|
| `/catalog` | CatalogPage |
| `/catalog/view/:id` | ServiceViewPage |
| `/catalog/catalogService-form` | CatalogServiceFormPage |

### Catalog Studio Routes (Blocks & Templates)

| Route | Component |
|-------|-----------|
| `/catalog-studio` | CatalogStudioConfigurePage |
| `/catalog-studio/configure` | CatalogStudioConfigurePage |
| `/catalog-studio/blocks` | CatalogStudioBlocksPage |
| `/catalog-studio/blocks/new` | CatalogStudioNewBlockPage |
| `/catalog-studio/blocks/:id/edit` | CatalogStudioEditBlockPage |
| `/catalog-studio/template` | CatalogStudioTemplatePage |
| `/catalog-studio/templates-list` | CatalogStudioTemplatesListPage |

### Service Contract Template Routes

| Route | Component |
|-------|-----------|
| `/service-contracts/templates` | MyTemplatesPage |
| `/service-contracts/templates/designer` | TemplateDesignerPage |
| `/service-contracts/templates/preview` | TemplatePreviewPage |
| `/service-contracts/templates/admin/global-templates` | GlobalTemplatesPage |
| `/service-contracts/templates/admin/global-designer` | GlobalDesignerPage |
| `/service-contracts/templates/admin/analytics` | Coming Soon |

### VANI Template Routes

| Route | Component |
|-------|-----------|
| `/vani/templates` | TemplatesLibraryPage |
| `/vani/templates/create` | TemplateEditorPage |
| `/vani/templates/:id` | TemplateEditorPage |
| `/vani/templates/:id/edit` | TemplateEditorPage |

### Contract Routes

| Route | Component |
|-------|-----------|
| `/contracts` | ContractsHubPage |
| `/contracts/:id` | ContractDetailPage |
| `/contracts/claim` | ClaimContractPage |
| `/contracts/:id/invoice/:invoiceId` | InvoiceViewPage |
| `/contracts/create/:contractType` | ContractCreatePage |
| `/contracts/preview` | ContractPreviewPage |
| `/contracts/preview/:id` | ContractPreviewPage |
| `/contracts/pdf` | PDFViewPage |
| `/contracts/pdf/:id` | PDFViewPage |
| `/contracts/invite` | InviteSellersPage |
| `/contract-review` | ContractReviewPage |
| `/contracts/review` | ContractReviewPage |
| `/service-contracts/contracts` | ContractsPage |

---

## 7. Record Counts

| Table | Count | Purpose |
|-------|-------|---------|
| `t_cat_templates` | **3** | Catalog templates (only 3 exist, test data) |
| `t_contracts` | **18** | Contracts |
| `t_contract_blocks` | **13** | Line items within contracts |
| `m_cat_blocks` | **43** | Master block definitions (catalog studio) |
| `m_block_masters` | **11** | Block type masters (visual/config building blocks) |
| `m_block_variants` | **12** | Block variants |
| `m_block_categories` | **4** | Block categories |
| `m_catalog_resource_templates` | **240** | Industry resource templates (reference data) |

---

## Supporting Table Schemas

### `m_cat_blocks` (43 records) - Master Block Definitions

| # | Column | Type | Default |
|---|--------|------|---------|
| 1 | `id` | uuid | `uuid_generate_v4()` |
| 2 | `block_type_id` | uuid | - |
| 3 | `name` | varchar | - |
| 4 | `display_name` | varchar | null |
| 5 | `icon` | varchar | `'📦'` |
| 6 | `description` | text | null |
| 7 | `tags` | jsonb | `'[]'` |
| 8 | `category` | varchar | null |
| 9 | `config` | jsonb | `'{}'` |
| 10 | `pricing_mode_id` | uuid | null |
| 11 | `base_price` | numeric | null |
| 12 | `currency` | varchar | `'INR'` |
| 13 | `price_type_id` | uuid | null |
| 14 | `tax_rate` | numeric | `18.00` |
| 15 | `hsn_sac_code` | varchar | null |
| 16 | `resource_pricing` | jsonb | null |
| 17 | `variant_pricing` | jsonb | null |
| 18 | `is_admin` | boolean | `false` |
| 19 | `visible` | boolean | `true` |
| 20 | `status_id` | uuid | null |
| 21 | `is_active` | boolean | `true` |
| 22 | `version` | integer | `1` |
| 23 | `sequence_no` | integer | `0` |
| 24 | `is_deletable` | boolean | `true` |
| 25 | `created_at` | timestamptz | `now()` |
| 26 | `updated_at` | timestamptz | `now()` |
| 27 | `created_by` | uuid | null |
| 28 | `updated_by` | uuid | null |
| 29 | `tenant_id` | uuid | null |
| 30 | `is_seed` | boolean | `false` |
| 31 | `is_live` | boolean | `true` |

**FK:** `tenant_id` -> `t_tenants(id) ON DELETE CASCADE`

### `m_block_masters` (11 records)

| Column | Type |
|--------|------|
| id | uuid |
| parent_id | uuid |
| version | integer |
| category_id | uuid |
| name | varchar |
| description | text |
| icon | varchar |
| node_type | varchar |
| config | jsonb |
| theme_styles | jsonb |
| can_rotate | boolean |
| can_resize | boolean |
| is_bidirectional | boolean |
| icon_names | text[] |
| hex_color | varchar |
| border_style | varchar |
| active | boolean |

### `m_block_variants` (12 records)

| Column | Type |
|--------|------|
| id | uuid |
| parent_id | uuid |
| version | integer |
| block_id | uuid (FK -> m_block_masters?) |
| name | varchar |
| description | text |
| node_type | varchar |
| default_config | jsonb |
| active | boolean |

### `m_block_categories` (4 records)

| Column | Type |
|--------|------|
| id | uuid |
| parent_id | uuid |
| version | integer |
| name | varchar |
| description | text |
| icon | varchar |
| sort_order | smallint |
| active | boolean |

---

## Entity Relationship Summary

```
m_block_categories (4)
    └── m_block_masters (11)        -- block type definitions
         └── m_block_variants (12)  -- variants per block type
              │
m_cat_blocks (43)                   -- tenant-level block instances
    │   (references block_type_id -> m_block_masters)
    │
    ├──> t_cat_templates.blocks[]   -- JSONB array references m_cat_blocks.id
    │         (3 templates)
    │
    └──> t_contract_blocks          -- source_block_id -> m_cat_blocks.id
              (13 blocks)                (currently all NULL / flyby)
              │
              └── t_contracts (18)  -- template_id -> t_cat_templates.id
                                         (currently all NULL)

m_catalog_resource_templates (240)  -- SEPARATE reference catalog
    ├── FK -> m_catalog_industries
    └── FK -> m_catalog_resource_types
    (No direct FK to blocks or templates -- advisory data only)
```

---

## Key Observations

1. **Template-to-Contract pipeline is not yet active.** All 18 contracts were created via flyby (ad-hoc), none reference a template.
2. **Only 3 templates exist**, all appear to be test data.
3. **The blocks JSONB in templates is a lightweight reference array** -- it stores `block_id` + optional config overrides, not full block data.
4. **`m_catalog_resource_templates` is completely decoupled** from the block/template system. It's a suggestion/reference catalog for pricing guidance.
5. **Contract blocks denormalize everything** (name, price, category) for immutability -- good design for contract integrity.
6. **There are 3 separate "template" systems** in the UI routes: Catalog Studio templates, Service Contract templates, and VANI templates. They may serve different purposes or represent UI iterations.
