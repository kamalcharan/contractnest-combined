# ContractNest - Smart Forms & Seed Agent Audit

**Date:** 2026-03-29
**Database:** BaseProduct (uwyqhzotluikawcboldr) - Supabase

---

## 1. Is There Any Existing Connection Between `m_form_templates` and Blocks or Templates?

### Short Answer: NO direct FK connection.

**`m_form_templates` has zero foreign keys** to `m_cat_blocks`, `t_cat_templates`, or any block/template table.

### Full Form Tables in the System

| Table | Records | Purpose |
|-------|---------|---------|
| `m_form_templates` | **2** | Global form definitions (admin-managed) |
| `m_form_template_mappings` | **0** | Maps forms to contracts (unused) |
| `m_form_tenant_selections` | ? | Tenant bookmarks of approved forms |
| `m_form_submissions` | ? | Completed form data linked to service events |
| `m_form_attachments` | ? | File uploads per form field |

### `m_form_templates` Schema

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | uuid | NO | `gen_random_uuid()` |
| 2 | `name` | varchar | NO | - |
| 3 | `description` | text | YES | null |
| 4 | `category` | varchar | NO | - |
| 5 | `form_type` | varchar | NO | - |
| 6 | `tags` | text[] | YES | `'{}'` |
| 7 | `schema` | jsonb | NO | - |
| 8 | `version` | integer | NO | `1` |
| 9 | `parent_template_id` | uuid | YES | null |
| 10 | `status` | varchar | NO | `'draft'` |
| 11 | `thumbnail_url` | text | YES | null |
| 12 | `created_by` | uuid | NO | - |
| 13 | `approved_by` | uuid | YES | null |
| 14 | `approved_at` | timestamptz | YES | null |
| 15 | `review_notes` | text | YES | null |
| 16 | `created_at` | timestamptz | YES | `now()` |
| 17 | `updated_at` | timestamptz | YES | `now()` |

**No FKs to blocks or templates. Self-referencing only via `parent_template_id` for versioning.**

### Actual Form Template Records (2 total)

**Record 1: "Untitled Form"**
```
id:        d1ee10ac-5541-4aa3-bf94-4f61a55e002d
form_type: standalone
category:  general
status:    approved
version:   1
```
Schema: 1 section with 10 fields (textarea, number, date, radio, 6x checkbox) — test data.

**Record 2: "Calibration Report"**
```
id:        a7c5602c-943f-40ad-a391-a3a24f72de06
form_type: standalone
category:  general
status:    approved
version:   1
```
Schema: 3 sections — real form:
- **Equipment Information:** equipment_name (text, required), serial_number, manufacturer, model_number, calibration_date, next_due_date
- **Measurement Results:** test_point_1 (number), result_1 (number), tolerance_1 (select: pass/fail), notes (textarea)
- **Sign Off:** technician_name, certificate_number, pass_overall (radio: pass/fail/conditional)

---

## 2. Where Do Smart Forms Currently Attach?

### Answer: CONTRACT LEVEL — via `t_contracts` columns, NOT blocks or templates.

### The Connection Chain

```
m_form_templates (admin creates)
    ↓ status: draft → in_review → approved
m_form_tenant_selections (tenant bookmarks approved forms)
    ↓ tenant_id + form_template_id
t_contracts (contract references selected forms)
    ├── evidence_policy_type: 'none' | 'upload' | 'smart_form'
    └── evidence_selected_forms: JSONB array
            [{form_template_id, name, version, category, sort_order}]
    ↓ (during service execution)
m_form_submissions (filled form data)
    ├── form_template_id + form_template_version
    ├── service_event_id
    ├── contract_id
    ├── responses: JSONB (keyed by field ID)
    └── status: draft → submitted → reviewed → approved/rejected
    ↓
m_form_attachments (file uploads per field)
```

### Columns Added to `t_contracts`

Source: `contractnest-edge/supabase/migrations/contracts/029_add_evidence_policy_columns.sql`

```sql
ALTER TABLE t_contracts ADD COLUMN evidence_policy_type varchar(20) DEFAULT 'none';
ALTER TABLE t_contracts ADD COLUMN evidence_selected_forms jsonb DEFAULT '[]'::jsonb;
```

### How the UI Maps It

Source: `contractnest-ui/src/components/contracts/ContractWizard/index.tsx` (lines 324-333)

```typescript
evidence_policy_type: state.evidencePolicyType,
evidence_selected_forms: state.evidencePolicyType === 'smart_form'
  ? state.evidenceSelectedForms.map((f) => ({
      form_template_id: f.form_template_id,
      name: f.name,
      version: f.version,
      category: f.category,
      sort_order: f.sort_order,
    }))
  : [],
```

### `m_form_template_mappings` Schema (designed but UNUSED — 0 records)

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | uuid | NO | `gen_random_uuid()` |
| 2 | `tenant_id` | uuid | NO | - |
| 3 | `contract_id` | uuid | NO | - |
| 4 | `form_template_id` | uuid | NO | - |
| 5 | `service_type` | varchar | YES | null |
| 6 | `timing` | varchar | NO | `'pre_service'` |
| 7 | `is_mandatory` | boolean | YES | `true` |
| 8 | `effective_from` | date | NO | `CURRENT_DATE` |
| 9 | `effective_to` | date | YES | null |
| 10 | `status` | varchar | YES | `'active'` |
| 11 | `created_by` | uuid | NO | - |
| 12 | `created_at` | timestamptz | YES | `now()` |
| 13 | `updated_at` | timestamptz | YES | `now()` |

**This table was designed for per-event form mapping with timing (pre_service/post_service/during_service) but is not used in the current flow.** The primary connection is the denormalized `evidence_selected_forms` JSONB on `t_contracts`.

### Key Files

| Layer | File | Purpose |
|-------|------|---------|
| DB | `contractnest-edge/supabase/migrations/smart-forms/001_create_smart_forms_tables.sql` | All 5 form tables + RLS |
| DB | `contractnest-edge/supabase/migrations/contracts/029_add_evidence_policy_columns.sql` | Contract evidence columns |
| Edge | `contractnest-edge/supabase/functions/smart-forms/index.ts` | CRUD + approval workflow |
| API | `contractnest-api/src/routes/tenantFormsRoutes.ts` | REST endpoints |
| UI | `contractnest-ui/src/pages/admin/smart-forms/` | Admin form editor |
| UI | `contractnest-ui/src/pages/settings/smart-forms/SmartFormsSelectionPage.tsx` | Tenant selection |
| UI | `contractnest-ui/src/components/contracts/ContractWizard/steps/EvidencePolicyStep.tsx` | Contract wizard step |

---

## 3. How the Master Data Agent Seeds Blocks for a Tenant

### Architecture

Source: `ClaudeDocumentation/AgentSkills/contractnest mda spec v2`

The Master Data Agent (MDA) runs as a **Supabase Edge Function** (`seed-master-data`). It's triggered during tenant onboarding after industry + persona selection.

**Three inputs drive everything:**

| Field | Source Table | Purpose |
|-------|-------------|---------|
| `profile_type` | `t_tenant_profiles` | `seller` or `buyer` — the branching flag |
| `industry_id` | `t_tenant_profiles` | Who am I — determines ecosystem |
| `served_industries` | `t_tenant_served_industries` | Who I serve / buy from |

### Seed Execution Order

```
POST /functions/v1/seed-master-data
Body: { tenant_id, target_industries, nomenclatures?, user_id, options? }

STEP A: Foundation — Copy Categories
    m_category_master → t_category_master  (is_seed = true)
    m_category_details → t_category_details (is_seed = true)

STEP B: Industry Records
    Record served industries → t_tenant_served_industries
    Copy to tenant scope → t_catalog_industries

STEP C: Blocks (nomenclature-based OR matrix-based)
    Option 1: generateBlocksForNomenclature() → m_cat_blocks
    Option 2: seed_seller_blocks() → m_cat_blocks (via m_service_equipment_map)

STEP D: Event Status Config
    Seed service_visit / payment / inspection statuses → m_event_status_config

All seed data inserted with is_live = false, is_seed = true
```

### Edge Function Entry Point

Source: `ClaudeDocumentation/AgentSkills/seed-edge-function.ts` (lines 47-68)

```typescript
Deno.serve(async (req: Request) => {
  const body: SeedRequest = await req.json();
  const { tenant_id, target_industries, nomenclatures, user_id, options } = body;

  // Validates: tenant_id, target_industries, user_id required
  // Creates Supabase client with service role
  // Verifies tenant exists in t_tenants
  // Executes Steps A through D sequentially
  // Returns: { success, tenant_id, tenant_name, seeded: SeedResult, errors? }
});
```

### API Seeds (contractnest-api layer)

Source: `contractnest-api/src/seeds/SeedRegistry.ts`

The API layer has a **separate, lighter seed system** for basic onboarding data:

```typescript
export const SeedRegistry: Record<string, SeedDefinition> = {
  sequences: sequencesSeedDefinition,    // Unique ID generators
  relationships: relationshipsSeedDefinition, // Contact relationship types
  eventStatuses: eventStatusesSeedDefinition, // Status workflows
  // Future: roles, tags, notifications
};
```

Routes at `contractnest-api/src/routes/seedRoutes.ts`:
- `GET /defaults` — Preview all seed categories
- `POST /tenant` — Seed all required data for a tenant
- `POST /tenant/:category` — Seed specific category
- `GET /status` — Check seed status

---

## 4. What `seed_seller_blocks` Produces — Full Logic

Source: `ClaudeDocumentation/AgentSkills/contractnest mda spec v2` (lines 302-355)

### The Function

```sql
CREATE OR REPLACE FUNCTION seed_seller_blocks(
  p_tenant_id uuid,
  p_served_industries varchar[]
) RETURNS integer AS $$
DECLARE
  v_map_row RECORD;
  v_equip_type text;
  v_equip_label text;
  v_block_type_id uuid;
  v_count integer := 0;
BEGIN
  -- Iterate through the Service x Equipment matrix
  FOR v_map_row IN
    SELECT sem.*
    FROM m_service_equipment_map sem
    WHERE sem.industry_id = ANY(p_served_industries)
    AND sem.is_active = true
    ORDER BY sem.industry_id, sem.equipment_category, sem.sort_order
  LOOP
    -- Resolve block type ID from tenant's category details
    SELECT td.id INTO v_block_type_id
    FROM t_category_details td
    JOIN t_category_master tm ON td.category_id = tm.id
    WHERE tm.tenant_id = p_tenant_id
    AND tm.category_name = 'cat_block_type'
    AND td.code = v_map_row.block_type
    LIMIT 1;

    -- For each equipment type in the map row's array
    FOR v_equip_type IN
      SELECT jsonb_array_elements_text(v_map_row.equipment_types)
    LOOP
      v_equip_label := initcap(replace(v_equip_type, '_', ' '));

      INSERT INTO cat_blocks (
        tenant_id, block_type_id,
        name, display_name, description,
        category, config, hsn_sac_code,
        tags, is_active, is_live, is_seed, sequence_no
      ) VALUES (
        p_tenant_id, v_block_type_id,
        v_equip_type || '_' || v_map_row.service_code,
            -- e.g., "split_ac_pm"
        v_equip_label || ' - ' || v_map_row.service_name,
            -- e.g., "Split Ac - Preventive Maintenance"
        v_map_row.service_name || ' for ' || v_equip_label,
            -- e.g., "Preventive Maintenance for Split Ac"
        v_map_row.equipment_category,
            -- e.g., "HVAC Systems"
        v_map_row.config_template,
            -- e.g., {"frequency":"quarterly","visits_per_year":4,...}
        v_map_row.hsn_sac_code,
            -- e.g., "998714"
        jsonb_build_array(
          v_map_row.industry_id,
          v_map_row.equipment_category,
          v_map_row.service_code,
          v_equip_type
        ),
            -- e.g., ["facility_management","HVAC Systems","pm","split_ac"]
        true, false, true, v_map_row.sort_order
            -- is_active=true, is_live=false (test), is_seed=true
      ) ON CONFLICT DO NOTHING;

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

### What It Produces — Example Output

For a Facility Management seller serving `['facility_management']`, given just the HVAC Systems rows in `m_service_equipment_map`:

| name | display_name | category | config |
|------|-------------|----------|--------|
| `split_ac_pm` | Split Ac - Preventive Maintenance | HVAC Systems | `{frequency: "quarterly", visits_per_year: 4, scope: [...]}` |
| `cassette_ac_pm` | Cassette Ac - Preventive Maintenance | HVAC Systems | (same) |
| `vrf_vrv_pm` | Vrf Vrv - Preventive Maintenance | HVAC Systems | (same) |
| `split_ac_breakdown` | Split Ac - Breakdown Repair | HVAC Systems | `{response_time_hours: 4, resolution_time_hours: 24}` |
| `cassette_ac_breakdown` | Cassette Ac - Breakdown Repair | HVAC Systems | (same) |
| `split_ac_deep_cleaning` | Split Ac - Deep Cleaning | HVAC Systems | `{frequency: "biannual", includes: [...]}` |
| `split_ac_gas_charging` | Split Ac - Gas Charging/Refilling | HVAC Systems | `{unit: "per_kg", refrigerant_types: [...]}` |
| `split_ac_calibration` | Split Ac - Calibration | HVAC Systems | `{frequency: "annual", parameters: [...]}` |
| `split_ac_installation` | Split Ac - Installation & Commissioning | HVAC Systems | `{includes: ["mounting","copper_piping",...]}` |
| `split_ac_compressor_replace` | Split Ac - Compressor Replacement | HVAC Systems | `{warranty_months: 12}` |

**This repeats across all equipment categories:** Vertical Transport, Power & Electrical, Fire & Safety, Water Treatment, Security & Surveillance — producing **hundreds of blocks** for a single FM seller.

---

## 5. How the Block Matrix Decides Which Blocks to Create

### Two Separate Mechanisms

#### Mechanism A: Nomenclature-Based (`generateBlocksForNomenclature`)

Source: `ClaudeDocumentation/AgentSkills/seed-edge-function.ts` (lines 348-719)

This generates **contract-type-specific blocks** based on the nomenclature selected (AMC, CMC, FMC, etc.). It's a **hardcoded switch statement** — no matrix table needed.

| Nomenclature | Blocks Generated | Block Types |
|:-------------|:----------------:|-------------|
| **AMC** | **7** | Preventive Maintenance (service), Breakdown Support (service), Spare Parts (spare), AMC Billing (billing), AMC Scope (text), AMC Exclusions (text), Equipment Checklist (checklist) |
| **CMC** | **6** | Comprehensive Maintenance (service), Unlimited Breakdown (service), All Parts Included (spare), CMC Billing (billing), CMC Scope (text), Equipment Checklist (checklist) |
| **FMC** | **9** | Housekeeping (service), Technical Maintenance (service), Security (service), Landscaping (service), Pest Control (service), FMC Billing (billing), Deployment Plan (text), SLA Matrix (text), Daily Inspection (checklist) |
| **Manpower** | **5** | Staff Deployment (service), Replacement Provision (service), Manpower Billing (billing), Compliance Terms (text), Monthly Compliance (checklist) |
| **SLA** | **3** | Primary Service (service), SLA Billing (billing), SLA Definitions (text) |
| **Default** | **3** | Generic Service (service), Generic Billing (billing), Generic Scope (text) |

**Key config differences between nomenclatures:**

```
AMC:       spare.coverage = "excluded" (parts at discount)
           service.frequency = "quarterly"
           billing.cycle = "quarterly_advance"

CMC:       spare.coverage = "full" (all parts included)
           service.response_sla_hours = 2 (faster than AMC's 4)
           billing.cycle = "monthly_fixed"

FMC:       Multiple service blocks (housekeeping, technical, security, etc.)
           pricing_mode = "resource_based" (per-head)
           billing.cycle = "monthly_fixed_plus_variable"

Manpower:  pricing_mode = "resource_based"
           billing.basis = "per_head_per_month"
           deduction_policy = "pro_rata"

SLA:       service.priority_levels = 4 (P1-P4)
           billing.credit_mechanism = "penalty_deduction"
```

#### Mechanism B: Service x Equipment Matrix (`seed_seller_blocks`)

Source: `ClaudeDocumentation/AgentSkills/contractnest mda spec v2` (lines 96-168)

This uses the **`m_service_equipment_map` table** (proposed, not yet created in production) which cross-references:

```
industry_id  x  service_code  x  equipment_category  →  Block Definition
```

**The matrix for Facility Management alone has 30+ rows across 6 equipment categories:**

| equipment_category | Services Mapped | Equipment Types |
|-------------------|:-:|---|
| **HVAC Systems** | 7 | split_ac, cassette_ac, vrf_vrv, ductable_ac, chiller, ahu |
| **Vertical Transport** | 6 | passenger_lift, goods_lift, escalator |
| **Power & Electrical** | 5 | dg_set, ups, transformer |
| **Fire & Safety** | 4 | fire_alarm, sprinkler, hydrant, fire_pump, fire_extinguisher |
| **Water Treatment** | 4 | stp, wtp, ro_plant |
| **Security & Surveillance** | 4 | cctv, access_control, boom_barrier |

**Each row maps:**

```sql
-- m_service_equipment_map columns:
industry_id         -- e.g., 'facility_management'
service_name        -- e.g., 'Preventive Maintenance'
service_code        -- e.g., 'pm'
equipment_category  -- e.g., 'HVAC Systems' (maps to m_catalog_resource_templates.sub_category)
equipment_types     -- e.g., '["split_ac","cassette_ac","vrf_vrv"]'
block_type          -- e.g., 'service' (maps to cat_block_type detail code)
config_template     -- e.g., {"frequency":"quarterly","visits_per_year":4,...}
hsn_sac_code        -- e.g., '998714' (GST SAC code)
pricing_guidance    -- e.g., suggested pricing ranges
```

**The formula for total blocks generated:**

```
Total Blocks = SUM(
  for each row in m_service_equipment_map WHERE industry = served_industries:
    count(equipment_types array)
)
```

For a single FM seller: ~30 map rows x ~3-6 equipment types each = **~100-150 blocks**.

### Key Difference Between the Two Mechanisms

| | Nomenclature-Based | Matrix-Based |
|---|---|---|
| **Source** | Hardcoded switch in edge function | `m_service_equipment_map` table |
| **Granularity** | Per contract type (AMC/CMC/FMC) | Per service x equipment type |
| **Output** | 3-9 generic blocks | 100+ equipment-specific blocks |
| **When Used** | When creating a contract of a specific type | During tenant onboarding |
| **Data** | Blocks have generic names ("Preventive Maintenance") | Blocks have specific names ("Split Ac - Preventive Maintenance") |
| **Status** | Implemented in edge function code | Spec complete, `m_service_equipment_map` table not yet created |

---

## Summary of Key Findings

1. **Smart Forms have ZERO connection to blocks or templates** — they attach at the contract level via `evidence_policy_type` + `evidence_selected_forms` JSONB columns.

2. **`m_form_template_mappings` exists but is unused** (0 records) — it was designed for per-event form mapping with timing (pre/post/during service) but the current flow uses the simpler denormalized JSONB on `t_contracts`.

3. **Two block seeding mechanisms exist:**
   - **Nomenclature-based** (implemented): Hardcoded switch generating 3-9 blocks per contract type
   - **Matrix-based** (spec only): `m_service_equipment_map` table generating 100+ equipment-specific blocks per seller

4. **The matrix table `m_service_equipment_map` does not yet exist in production** — it's fully specified in the MDA spec v2 with 30+ rows for FM industry alone, but hasn't been migrated.

5. **All seed data is inserted with `is_live = false` and `is_seed = true`** — tenants review in test mode before publishing.

6. **The API seed layer (`contractnest-api/src/seeds/`) is a lighter, separate system** from the edge function. It seeds sequences, relationships, and event statuses — not blocks or templates.
