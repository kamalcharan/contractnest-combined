# Resource Templates — Handover & Status

> **Last Updated:** 2026-03-04
> **Status:** IN PROGRESS — Blocked on DB schema verification
> **Priority:** High (503 errors on production /settings/configure/resources page)

---

## 1. Problem Statement

The `/settings/configure/resources` page in ContractNest was returning a **503 error** (maintenance page) because the `resources` edge function was querying `m_catalog_resource_templates` directly with a `sort_order` column that **does not exist** on the `v_resource_templates_by_industry` view.

### Root Cause
The `handleGetResourceTemplates()` function in `contractnest-edge/supabase/functions/resources/index.ts` was:
1. Querying `m_catalog_resource_templates` table directly instead of the canonical view
2. Ordering by `sort_order ASC` — a column that doesn't exist on the view
3. Filtering by `industry_id` instead of `linked_industry_id` (the view's column)
4. Missing universal (19) and cross-industry (6) templates — only returning industry-specific ones

---

## 2. What Was Done

### 2a. Database Normalization (Completed — already in Supabase)

The resource templates schema was normalized with:

| Change | Details |
|--------|---------|
| **`scope` column added** | `m_catalog_resource_templates.scope` — values: `'universal'`, `'cross_industry'`, `'industry_specific'` |
| **`industry_id` made NULLABLE** | Universal/cross-industry templates have `NULL` industry_id |
| **Junction table created** | `m_catalog_resource_template_industries` (296 rows) — many-to-many link between templates and industries |
| **View created** | `v_resource_templates_by_industry` — UNION of junction links + universal templates (CROSS JOIN with level-0 industries) |
| **Row counts** | 239 templates total: 19 universal + 6 cross-industry + 214 industry-specific |

### 2b. Edge Function Fix (Coded — NOT YET DEPLOYED)

File: `contractnest-edge/supabase/functions/resources/index.ts`
Function: `handleGetResourceTemplates()` (~lines 1177–1290)

**Changes made:**

| # | What | Before | After |
|---|------|--------|-------|
| 1 | **Count query table** | `m_catalog_resource_templates` | `v_resource_templates_by_industry` |
| 2 | **Count query filter** | `.in('industry_id', ...)` | `.in('linked_industry_id', ...)` |
| 3 | **Fetch query table** | `m_catalog_resource_templates` | `v_resource_templates_by_industry` |
| 4 | **Fetch query select** | Basic columns | Added `linked_industry_id`, `relevance_score`, `scope`, `is_primary` |
| 5 | **Fetch query filter** | `.in('industry_id', ...)` | `.in('linked_industry_id', ...)` |
| 6 | **Fetch query order** | `popularity_score DESC, sort_order ASC` | `relevance_score DESC, popularity_score DESC` |
| 7 | **Deduplication (NEW)** | None | Step 3b: deduplicate by template `id` using a Set (cross-industry templates may appear for multiple matching industries) |
| 8 | **Enrichment remap** | Direct `industry_id` | `linked_industry_id → industry_id` for frontend compatibility |

### 2c. MDA Skill Docs Updated (Committed)

Updated files in `ClaudeDocumentation/AgentSkills/`:
- `SKILL (1).md` — references view, mentions scope column
- `schema-reference.md` — full schema with junction table, view definition, updated row counts
- `api-spec.md` — rewritten Template 6 (uses view with DISTINCT ON), new Template 9 (adding master templates + junction rows)

### 2d. Seed Data Enrichment Scripts (Created — NOT YET EXECUTED)

SQL scripts in `MANUAL_COPY_FILES/seed-enrichment/phase-0/`:

| Script | Purpose | Status |
|--------|---------|--------|
| `0a_create_service_equipment_map.sql` | Create `m_service_equipment_map` table for Service × Equipment matrix | **Not executed** |
| `0b_audit_orphan_industries.sql` | Audit: find orphan `industry_id` values in `t_tenant_profiles` that don't exist in `m_catalog_industries` | **Not executed** |
| `0b_fix_orphan_industries_PROPOSED.sql` | Fix: INSERT 8 missing industry sub-segments (networking_solutions, technology_general, wellness_general, healthcare_general, polymers, ups_battery_inverters, life_insurance, training_consulting) | **Not executed — needs review** |
| `0c_audit_empty_category_details.sql` | Audit: find `m_category_master` entries with zero active `m_category_details` rows | **Not executed** |

---

## 3. What's Pending / Blocked

### BLOCKER: DB Schema Verification

Before deploying the edge function fix, we need to confirm the actual columns on `v_resource_templates_by_industry`. Run this in Supabase SQL Editor:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'v_resource_templates_by_industry'
ORDER BY ordinal_position;
```

**Why this matters:** The edge function code assumes specific column names (`linked_industry_id`, `relevance_score`, `scope`, `is_primary`). If the view doesn't have these columns, the fix will fail the same way.

### Pending Actions (in order)

| # | Action | Depends On | Where |
|---|--------|------------|-------|
| 1 | **Verify view columns** | DB access | Supabase SQL Editor |
| 2 | **Deploy edge function fix** | #1 confirmed | `supabase functions deploy resources` |
| 3 | **Test /settings/configure/resources page** | #2 deployed | Browser |
| 4 | **Run orphan industries audit** (0b_audit) | Independent | Supabase SQL Editor |
| 5 | **Review & run orphan industries fix** (0b_fix) | #4 results reviewed | Supabase SQL Editor |
| 6 | **Run empty categories audit** (0c) | Independent | Supabase SQL Editor |
| 7 | **Create service-equipment map table** (0a) | Independent | Supabase SQL Editor |

---

## 4. File Locations

### Modified/Created Files

| File | Location | Status |
|------|----------|--------|
| Edge function (fixed) | `MANUAL_COPY_FILES/fix-resource-templates-view/contractnest-edge/supabase/functions/resources/index.ts` | Ready to copy → deploy |
| MDA Skill doc | `ClaudeDocumentation/AgentSkills/SKILL (1).md` | Committed |
| Schema reference | `ClaudeDocumentation/AgentSkills/schema-reference.md` | Committed |
| API spec | `ClaudeDocumentation/AgentSkills/api-spec.md` | Committed |
| Seed SQL scripts | `MANUAL_COPY_FILES/seed-enrichment/phase-0/` | Not executed |

### Key Source Files (for reference)

| File | Purpose |
|------|---------|
| `contractnest-edge/supabase/functions/resources/index.ts` | The resources edge function (all CRUD for resources) |
| `contractnest-ui/src/pages/settings/configure/resources/` | UI page that calls this edge function |

---

## 5. Schema Quick Reference

### v_resource_templates_by_industry (view)

**Canonical query interface** — always use this instead of `m_catalog_resource_templates` directly.

```sql
SELECT * FROM v_resource_templates_by_industry
WHERE linked_industry_id = 'healthcare';
-- Returns: ~39 rows (14 specific + 6 cross-industry + 19 universal)
```

Expected columns:
| Column | Type | Source |
|--------|------|--------|
| id, name, description, resource_type_id, sub_category | various | m_catalog_resource_templates |
| default_attributes, pricing_guidance | jsonb | m_catalog_resource_templates |
| popularity_score, is_recommended, is_active, scope | various | m_catalog_resource_templates |
| linked_industry_id | varchar | junction or CROSS JOIN |
| is_primary | boolean | junction (false for universal) |
| relevance_score | integer | junction (50 default for universal) |
| industry_specific_attributes | jsonb | junction ({} for universal) |

### m_catalog_resource_templates (239 rows)

| Scope | Count | Description |
|-------|-------|-------------|
| universal | 19 | Available to ALL industries (e.g., "Office Printer", "Company Vehicle") |
| cross_industry | 6 | Shared across 2+ industries via junction table |
| industry_specific | 214 | Belong to exactly one industry |

### m_catalog_resource_template_industries (296 rows)

Junction table: `(template_id, industry_id)` PK with `is_primary`, `relevance_score`, `industry_specific_attributes`.

---

## 6. Resume Instructions

When continuing this work:

1. **Ask for the view column query results** (Section 3 above)
2. **Compare columns** with what the edge function expects (Section 2b, change #4)
3. If columns match → proceed with deployment
4. If columns differ → adjust the edge function select/filter accordingly
5. After resources page is working → move to seed enrichment scripts (Section 2d)

---

*Maintained by: Claude Code Sessions*
*Related commits: `c1bb182`, `ac4f469`, `3337612`*
