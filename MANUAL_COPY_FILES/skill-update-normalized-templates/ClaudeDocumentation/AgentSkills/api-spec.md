# ContractNest API & Integration Spec

## Table of Contents
1. [Supabase Project Details](#supabase-project)
2. [SQL Seeding Templates](#sql-templates)
3. [Edge Function API](#edge-function-api)
4. [Seeding Workflow](#seeding-workflow)
5. [Validation Queries](#validation)

---

## Supabase Project

- **Project ID:** `uwyqhzotluikawcboldr`
- **Region:** ap-south-1 (Mumbai)
- **Database:** PostgreSQL 15
- **RLS:** Enabled on most tenant tables

---

## SQL Seeding Templates

### Template 1: Copy Category Master to Tenant

```sql
-- Copies m_category_master → t_category_master for a tenant
-- Only copies categories not already present
INSERT INTO t_category_master (
  id, tenant_id, category_name, display_name, 
  description, icon_name, order_sequence, is_active, is_live, created_at
)
SELECT 
  uuid_generate_v4(),
  $1::uuid,  -- tenant_id
  m.category_name,
  m.display_name,
  m.description,
  m.icon_name,
  m.sequence_no,
  true,
  true,
  now()
FROM m_category_master m
WHERE m.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM t_category_master t 
  WHERE t.tenant_id = $1::uuid 
  AND t.category_name = m.category_name
);
```

### Template 2: Copy Category Details to Tenant

```sql
-- Copies m_category_details → t_category_details
-- Maps category_id from tenant's t_category_master
INSERT INTO t_category_details (
  id, tenant_id, category_id, sub_cat_name, display_name,
  description, hexcolor, icon_name, tags, tool_tip,
  sequence_no, form_settings, is_active, is_deletable, is_live, created_at
)
SELECT 
  uuid_generate_v4(),
  $1::uuid,
  tcm.id,  -- tenant's category_master id
  md.sub_cat_name,
  md.display_name,
  md.description,
  md.hexcolor,
  md.icon_name,
  md.tags,
  md.tool_tip,
  md.sequence_no,
  md.form_settings,
  true,
  md.is_deletable,
  true,
  now()
FROM m_category_details md
JOIN m_category_master mcm ON md.category_id = mcm.id
JOIN t_category_master tcm ON tcm.category_name = mcm.category_name AND tcm.tenant_id = $1::uuid
WHERE md.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM t_category_details td 
  WHERE td.tenant_id = $1::uuid 
  AND td.sub_cat_name = md.sub_cat_name
  AND td.category_id = tcm.id
);
```

### Template 3: Seed Served Industries

```sql
-- Records which industries the tenant serves
INSERT INTO t_tenant_served_industries (id, tenant_id, industry_id, added_by, created_at)
VALUES 
  (uuid_generate_v4(), $1::uuid, $2::varchar, $3::uuid, now())
ON CONFLICT DO NOTHING;
```

### Template 4: Seed Catalog Industries for Tenant

```sql
-- Creates tenant-scoped industry records
INSERT INTO t_catalog_industries (
  id, tenant_id, industry_code, name, description, icon,
  common_pricing_rules, compliance_requirements,
  master_industry_id, is_custom, is_active, created_at
)
SELECT
  gen_random_uuid(),
  $1::uuid,
  mi.id,
  mi.name,
  mi.description,
  mi.icon,
  mi.common_pricing_rules,
  mi.compliance_requirements,
  mi.id,
  false,
  true,
  now()
FROM m_catalog_industries mi
WHERE mi.id = ANY($2::varchar[])  -- array of selected industry_ids
AND NOT EXISTS (
  SELECT 1 FROM t_catalog_industries ti 
  WHERE ti.tenant_id = $1::uuid AND ti.industry_code = mi.id
);
```

### Template 5: Seed Catalog Categories for Tenant

```sql
-- Creates tenant-scoped category records from master
-- Filtered by tenant's selected industries
INSERT INTO t_catalog_categories (
  id, tenant_id, industry_id, category_code, name, description, icon,
  default_pricing_model, suggested_duration, common_variants,
  pricing_rule_templates, master_category_id, is_custom, is_active, created_at
)
SELECT
  gen_random_uuid(),
  $1::uuid,
  tci.id,  -- tenant's catalog_industry id
  mc.id,
  COALESCE(mcim.display_name, mc.name),
  mc.description,
  mc.icon,
  mc.default_pricing_model,
  mc.suggested_duration,
  mc.common_variants,
  mc.pricing_rule_templates,
  mc.id,
  false,
  true,
  now()
FROM m_catalog_category_industry_map mcim
JOIN m_catalog_categories mc ON mcim.category_id = mc.id
JOIN t_catalog_industries tci ON tci.industry_code = mcim.industry_id AND tci.tenant_id = $1::uuid
WHERE mcim.is_active = true
AND mc.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM t_catalog_categories tc 
  WHERE tc.tenant_id = $1::uuid AND tc.category_code = mc.id AND tc.industry_id = tci.id
);
```

### Template 6: Seed Resource Templates as Tenant Resources

```sql
-- Creates resource definitions using the normalized view
-- Automatically includes universal + cross-industry + industry-specific templates
-- DISTINCT ON prevents duplicates when a template appears in multiple selected industries
INSERT INTO t_category_resources_master (
  id, tenant_id, resource_type_id, name, display_name,
  description, sub_category, tags, is_active, is_live, created_at
)
SELECT DISTINCT ON (v.name, v.resource_type_id)
  uuid_generate_v4(),
  $1::uuid,
  v.resource_type_id,
  v.name,
  v.name,  -- display_name = name initially
  v.description,
  v.sub_category,
  jsonb_build_object(
    'default_attributes', v.default_attributes,
    'scope', v.scope,
    'source', 'seed'
  ),
  true,
  true,
  now()
FROM v_resource_templates_by_industry v
WHERE v.linked_industry_id = ANY($2::varchar[])  -- array of tenant's industry_ids
AND NOT EXISTS (
  SELECT 1 FROM t_category_resources_master tr
  WHERE tr.tenant_id = $1::uuid AND tr.name = v.name AND tr.resource_type_id = v.resource_type_id
)
ORDER BY v.name, v.resource_type_id, v.relevance_score DESC;
```

> **Note:** Always query `v_resource_templates_by_industry` — never `m_catalog_resource_templates` directly.
> The view auto-includes 19 universal items (Fire Extinguisher, Laptop, Printer, etc.) for every industry.

### Template 7: Seed Contract Blocks

```sql
-- Creates reusable contract blocks for a specific nomenclature
-- Example: Service block for AMC preventive visits
INSERT INTO cat_blocks (
  id, tenant_id, block_type_id, name, display_name,
  description, category, config,
  pricing_mode_id, base_price, price_type_id,
  tax_rate, is_seed, is_live, is_active, created_at
)
VALUES (
  gen_random_uuid(),
  $1::uuid,
  (SELECT id FROM t_category_details WHERE tenant_id = $1::uuid AND sub_cat_name = 'service'),
  $2::varchar,     -- block name
  $3::varchar,     -- display name
  $4::text,        -- description
  $5::varchar,     -- category grouping
  $6::jsonb,       -- config object
  (SELECT id FROM t_category_details WHERE tenant_id = $1::uuid AND sub_cat_name = $7::varchar),  -- pricing mode
  $8::numeric,     -- base price
  (SELECT id FROM t_category_details WHERE tenant_id = $1::uuid AND sub_cat_name = $9::varchar),  -- price type
  18.00,           -- default GST rate
  true,            -- is_seed
  true,
  true,
  now()
);
```

### Template 8: Seed Event Status Config

```sql
-- Seeds status workflow for a specific event type
INSERT INTO m_event_status_config (
  id, tenant_id, event_type, status_code, display_name,
  description, hex_color, icon_name, display_order,
  is_initial, is_terminal, is_active, source, created_at
)
VALUES 
  (gen_random_uuid(), $1, 'service_visit', 'scheduled', 'Scheduled', 'Visit is scheduled', '#3B82F6', 'Calendar', 1, true, false, true, 'seed', now()),
  (gen_random_uuid(), $1, 'service_visit', 'assigned', 'Assigned', 'Engineer assigned', '#8B5CF6', 'UserCheck', 2, false, false, true, 'seed', now()),
  (gen_random_uuid(), $1, 'service_visit', 'in_progress', 'In Progress', 'Work in progress', '#F59E0B', 'Wrench', 3, false, false, true, 'seed', now()),
  (gen_random_uuid(), $1, 'service_visit', 'completed', 'Completed', 'Work done', '#10B981', 'CheckCircle', 4, false, true, true, 'seed', now()),
  (gen_random_uuid(), $1, 'service_visit', 'cancelled', 'Cancelled', 'Visit cancelled', '#EF4444', 'XCircle', 5, false, true, true, 'seed', now())
ON CONFLICT DO NOTHING;
```

### Template 9: Add New Master Resource Template

```sql
-- Step 1: Insert the template (industry_id is nullable for universal/cross-industry)
INSERT INTO m_catalog_resource_templates (
  id, name, description, resource_type_id, sub_category,
  scope, default_attributes, pricing_guidance,
  popularity_score, is_recommended, is_active, sort_order
)
VALUES (
  gen_random_uuid(),
  $1::varchar,          -- name
  $2::text,             -- description
  $3::varchar,          -- resource_type_id: 'equipment', 'asset', 'team_staff', etc.
  $4::varchar,          -- sub_category: 'Diagnostic Imaging', etc.
  $5::varchar,          -- scope: 'universal' | 'cross_industry' | 'industry_specific'
  $6::jsonb,            -- default_attributes
  $7::jsonb,            -- pricing_guidance
  $8::integer,          -- popularity_score (1-100)
  true,                 -- is_recommended
  true,                 -- is_active
  $9::integer           -- sort_order
)
RETURNING id;

-- Step 2: Add junction rows (skip for universal — auto-included via view)
-- Only needed for 'cross_industry' and 'industry_specific' scope
INSERT INTO m_catalog_resource_template_industries (
  template_id, industry_id, is_primary, relevance_score
)
VALUES
  ($returned_id, 'healthcare', true, 90),
  ($returned_id, 'hospitality', false, 75);
```

> **Universal items** need no junction rows — the `v_resource_templates_by_industry` view auto-includes them via CROSS JOIN to all level-0 industries.
> **Cross-industry items** need explicit junction rows for each applicable industry.
> **Industry-specific items** need one junction row with `is_primary = true`.

---

## Edge Function API

### Endpoint
`POST /functions/v1/seed-master-data`

### Request Body
```typescript
interface SeedRequest {
  tenant_id: string;           // UUID
  own_industry: string;        // e.g., "facility_management"
  target_industries: string[]; // e.g., ["healthcare", "real_estate"]
  nomenclatures: string[];     // e.g., ["amc", "cmc", "fmc"]
  user_id: string;             // UUID of admin user triggering seed
  options?: {
    skip_categories?: boolean;
    skip_catalog?: boolean;
    skip_blocks?: boolean;
    skip_events?: boolean;
    dry_run?: boolean;         // Returns SQL without executing
  };
}
```

### Response
```typescript
interface SeedResponse {
  success: boolean;
  tenant_id: string;
  seeded: {
    category_masters: number;
    category_details: number;
    catalog_industries: number;
    catalog_categories: number;
    catalog_items: number;
    resource_templates: number;
    contract_blocks: number;
    event_statuses: number;
  };
  errors?: string[];
}
```

### Deployment
```bash
# Deploy via Supabase MCP tool:
# Name: seed-master-data
# Entrypoint: index.ts
# JWT verification: ENABLED (admin users only)
```

---

## Seeding Workflow

### Complete Onboarding Sequence

```
1. Tenant created (t_tenants row exists)
2. Tenant profile saved (t_tenant_profiles with industry_id)
3. Target industries selected (user chooses from m_catalog_industries)
4. Nomenclatures selected (user chooses from contract nomenclature list)

→ TRIGGER SEED:

Step A: Foundation
  ├── Copy m_category_master → t_category_master
  ├── Copy m_category_details → t_category_details
  └── Add industry-specific asset types to t_category_details

Step B: Catalog
  ├── Create t_catalog_industries from selections
  ├── Create t_catalog_categories from master (filtered)
  ├── Seed t_category_resources_master from templates
  └── (Optional) Create sample t_catalog_items

Step C: Contract Infrastructure  
  ├── Create cat_blocks for each selected nomenclature
  ├── Assemble cat_templates from blocks
  └── Seed m_event_status_config + transitions

Step D: Verification
  ├── Run validation queries
  └── Return seed report
```

### Incremental Addition

When a tenant adds a new industry later:
1. Only seed NEW industries (check `t_tenant_served_industries`)
2. Only add NEW categories (check `t_catalog_categories`)
3. Only add NEW resources (check `t_category_resources_master`)
4. Preserve all existing data

---

## Validation Queries

### Post-Seed Verification Suite

```sql
-- 1. Category completeness
SELECT 
  'categories' as check_type,
  (SELECT COUNT(*) FROM t_category_master WHERE tenant_id = $1) as master_count,
  (SELECT COUNT(*) FROM t_category_details WHERE tenant_id = $1) as detail_count;

-- 2. Industry setup
SELECT 
  'industries' as check_type,
  (SELECT COUNT(*) FROM t_tenant_served_industries WHERE tenant_id = $1) as served_count,
  (SELECT COUNT(*) FROM t_catalog_industries WHERE tenant_id = $1) as catalog_count;

-- 3. Service categories per industry
SELECT 
  tci.name as industry,
  COUNT(tcc.id) as category_count
FROM t_catalog_industries tci
LEFT JOIN t_catalog_categories tcc ON tcc.industry_id = tci.id
WHERE tci.tenant_id = $1
GROUP BY tci.name;

-- 4. Resources seeded
SELECT 
  resource_type_id,
  COUNT(*) as count
FROM t_category_resources_master 
WHERE tenant_id = $1
GROUP BY resource_type_id;

-- 5. Contract blocks
SELECT 
  td.display_name as block_type,
  COUNT(cb.id) as block_count
FROM cat_blocks cb
JOIN t_category_details td ON cb.block_type_id = td.id
WHERE cb.tenant_id = $1 AND cb.is_seed = true
GROUP BY td.display_name;

-- 6. Event status config
SELECT 
  event_type,
  COUNT(*) as status_count,
  COUNT(*) FILTER (WHERE is_initial) as initial_count,
  COUNT(*) FILTER (WHERE is_terminal) as terminal_count
FROM m_event_status_config 
WHERE tenant_id = $1 AND source = 'seed'
GROUP BY event_type;
```

### Data Integrity Checks

```sql
-- Orphaned category details (no matching master)
SELECT td.id, td.sub_cat_name 
FROM t_category_details td
LEFT JOIN t_category_master tm ON td.category_id = tm.id
WHERE td.tenant_id = $1 AND tm.id IS NULL;

-- Duplicate sub_cat_names within same category
SELECT category_id, sub_cat_name, COUNT(*)
FROM t_category_details 
WHERE tenant_id = $1
GROUP BY category_id, sub_cat_name
HAVING COUNT(*) > 1;

-- Blocks missing block_type_id reference
SELECT id, name FROM cat_blocks 
WHERE tenant_id = $1 AND block_type_id NOT IN (
  SELECT id FROM t_category_details WHERE tenant_id = $1
);
```
