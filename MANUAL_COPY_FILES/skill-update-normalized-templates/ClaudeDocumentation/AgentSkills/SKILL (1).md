---
name: contractnest-master-data-agent
description: >
  Seeds industry-specific master data for ContractNest tenants during onboarding. Use this skill
  whenever a tenant selects their industry/target industries and needs pre-populated service categories,
  SLA templates, equipment types, compliance checklists, pricing models, contract terms, and resource
  templates. Also use when adding a new industry vertical to an existing tenant, resetting seed data,
  or generating sample catalog items for demo environments. Triggers on: tenant onboarding, industry
  setup, seed data generation, master data population, catalog seeding, demo data creation,
  ContractNest setup, or any mention of populating a new tenant workspace with domain-specific data.
---

# ContractNest Master Data Agent

## Purpose

This agent is the **foundation layer** (Skill #1) in the ContractNest 5-skill AI pipeline:

```
1. MASTER DATA AGENT (this skill) → Seeds domain data
2. Contract Template Skill         → Generates templates from seed data
3. VaNi Contract Agent             → Operates on live tenant data
4. VaNi Marketing Agent            → Demos with real industry data
5. GeM Marketplace Skill           → Government marketplace integration
```

When a tenant onboards and selects their industry + target industries, this agent:
- Seeds **service categories & sub-categories** into tenant tables
- Creates **SLA templates** (response/resolution times, uptime %)
- Populates **equipment/asset type** definitions with specs
- Sets up **compliance checklists** & regulatory requirements
- Configures **standard pricing models** & rate cards
- Inserts **common contract terms & clauses** (nomenclature-specific)
- Generates **resource templates** (staff roles, equipment, consumables)
- Prepares **catalog items** for the service catalog

## How It Works

### Step 1: Read References

Before generating any data, ALWAYS read:
1. `references/schema-reference.md` — Full database schema with table relationships
2. `references/industry-seed-patterns.md` — Industry-specific seed data patterns
3. `references/api-spec.md` — Supabase integration patterns & SQL templates

### Step 2: Identify Tenant Context

Gather from the user or from the database:
- **tenant_id** (UUID) — The tenant being seeded
- **Tenant's own industry** — What the tenant does (e.g., "facility_management")
- **Target industries served** — Who the tenant's customers are (e.g., "healthcare", "real_estate")
- **Contract nomenclatures used** — AMC, CMC, FMC, etc.
- **Onboarding stage** — Fresh setup vs. adding new industry

### Step 3: Generate Seed Data

The agent generates INSERT statements for these tables **in dependency order**:

#### Layer 1: Categories (Foundation)
| Table | Purpose | Source |
|-------|---------|--------|
| `t_category_master` | Category groups (copied from `m_category_master`) | System master |
| `t_category_details` | Sub-categories per group | System master + industry-specific |
| `t_category_resources_master` | Resource definitions per tenant | Industry patterns |

#### Layer 2: Catalog (Service Definitions)
| Table | Purpose | Source |
|-------|---------|--------|
| `t_catalog_industries` | Tenant's served industries | `m_catalog_industries` filtered |
| `t_catalog_categories` | Service categories for each industry | `m_catalog_categories` filtered |
| `t_catalog_items` | Actual service items with pricing | Generated from patterns |
| `t_catalog_resources` | Resources (staff, equipment) | `v_resource_templates_by_industry` view |
| `t_catalog_resource_pricing` | Resource rate cards | Industry pricing guidance |
| `t_catalog_service_resources` | Service ↔ resource mappings | Generated |

#### Layer 3: Contract Infrastructure
| Table | Purpose | Source |
|-------|---------|--------|
| `cat_blocks` | Reusable contract blocks | Generated per nomenclature |
| `cat_templates` | Contract templates | Assembled from blocks |
| `m_event_status_config` | Status workflows per event type | System defaults |
| `m_event_status_transitions` | Allowed status transitions | System defaults |

#### Layer 4: Assets & Compliance
| Table | Purpose | Source |
|-------|---------|--------|
| `t_tenant_served_industries` | Industry selections | User input |
| `t_tenant_industry_segments` | Sub-segment selections | User input |
| `t_client_asset_registry` | Sample asset types | Industry patterns |

### Step 4: Execute or Output

Two modes:
1. **Claude Skill Mode** — Generate SQL and execute via Supabase tools
2. **Edge Function Mode** — See `scripts/seed-edge-function.ts` for automated onboarding

## Critical Rules

### Data Integrity
- Always use `gen_random_uuid()` or `uuid_generate_v4()` for IDs — never hardcode UUIDs
- Always set `tenant_id` on every tenant-scoped record
- Set `is_live = true` and `is_active = true` for all seed records
- Set `is_seed = true` on `cat_blocks` to distinguish from user-created
- Respect the `m_` (master/system) vs `t_` (tenant) vs `c_` (config) prefix convention:
  - **Never write to `m_*` tables** — these are system-wide masters
  - **Always write to `t_*` tables** — these are tenant-scoped
  - Exception: `m_event_status_config` and `m_event_status_transitions` ARE tenant-scoped (they have `tenant_id`)

### Industry Mapping
- Read from `m_catalog_industries` for the official industry hierarchy
- Use `m_catalog_categories` for service categories per industry
- Use `m_catalog_category_industry_map` for cross-industry category sharing
- **Use `v_resource_templates_by_industry` view** for resource type suggestions (NOT `m_catalog_resource_templates` directly)
  - The view auto-includes universal (19) + cross-industry (6) + industry-specific templates
  - Example: `SELECT * FROM v_resource_templates_by_industry WHERE linked_industry_id = 'healthcare'` → 39 rows
- `m_catalog_resource_templates` has a `scope` column: `'universal'` | `'cross_industry'` | `'industry_specific'`
- `m_catalog_resource_template_industries` is the many-to-many junction table linking templates to industries

### Nomenclature Awareness
ContractNest contracts use **nomenclatures** (AMC, CMC, FMC, etc.) stored in `m_category_details` under `cat_contract_nomenclature`. Each nomenclature implies different:
- Block structures (what blocks a contract needs)
- Pricing models (subscription vs per-call vs retainer)
- Event types (scheduled visits, breakdown calls, inspections)
- SLA requirements

### Idempotency
- Before inserting, check if seed data already exists for the tenant
- Use `ON CONFLICT DO NOTHING` where possible
- Never duplicate categories or resources

## SQL Execution Pattern

```sql
-- Always wrap in a transaction
BEGIN;

-- 1. Insert category master (if not exists)
INSERT INTO t_category_master (id, tenant_id, category_name, display_name, ...)
SELECT uuid_generate_v4(), $tenant_id, category_name, display_name, ...
FROM m_category_master
WHERE NOT EXISTS (
  SELECT 1 FROM t_category_master 
  WHERE tenant_id = $tenant_id AND category_name = m_category_master.category_name
);

-- 2. Insert category details
-- ... (see schema-reference.md for full patterns)

COMMIT;
```

## Edge Function Deployment

For automated onboarding, deploy the edge function from `scripts/seed-edge-function.ts`. 
Read `references/api-spec.md` for deployment instructions and the function signature.

## Testing

After seeding, verify:
```sql
-- Check category counts
SELECT cm.category_name, COUNT(cd.id) as detail_count
FROM t_category_master cm
LEFT JOIN t_category_details cd ON cd.category_id = cm.id
WHERE cm.tenant_id = $tenant_id
GROUP BY cm.category_name;

-- Check catalog items
SELECT COUNT(*) as items, 
       COUNT(DISTINCT category_id) as categories,
       COUNT(DISTINCT industry_id) as industries
FROM t_catalog_items WHERE tenant_id = $tenant_id;

-- Check contract blocks
SELECT block_type_id, COUNT(*) 
FROM cat_blocks WHERE tenant_id = $tenant_id
GROUP BY block_type_id;
```
