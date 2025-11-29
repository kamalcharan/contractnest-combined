# RLS Master Migration Plan

**Date:** 2025-11-29
**Total Tables Requiring Action:** 28

---

## Migration Phases Overview

| Phase | Description | Tables | Priority | Risk |
|-------|-------------|--------|----------|------|
| **Phase 0** | Critical - RLS Disabled | 3 | P0 | HIGH |
| **Phase 1** | Fix Over-Permissive | 2 | P1 | HIGH |
| **Phase 2** | Standardize Custom Functions | 10 | P2 | MEDIUM |
| **Phase 3** | Standardize Subquery Pattern | 12 | P3 | MEDIUM |
| **Phase 4** | Fix Deprecated Pattern | 1 | P2 | LOW |

---

## Phase 0: Critical - Enable RLS (3 tables)

These tables have `tenant_id` but RLS is DISABLED:

| Table | tenant_id Type | Current RLS | Action |
|-------|---------------|-------------|--------|
| t_catalog_categories | uuid NOT NULL | DISABLED | Enable + Standard policies |
| t_catalog_industries | uuid NOT NULL | DISABLED | Enable + Standard policies |
| t_idempotency_keys | uuid NOT NULL | DISABLED | Enable + Service role only |

**Risk:** HIGH - Data from all tenants currently accessible

---

## Phase 1: Fix Over-Permissive Policies (2 tables)

| Table | Issue | Current Policies | Action |
|-------|-------|------------------|--------|
| t_tax_rates | `USING (auth.role() = 'authenticated')` bypasses tenant check | 5 policies | Drop bad policy, consolidate to 2 |
| t_tax_settings | 8 redundant policies, one with `USING (true)` on public | 8 policies | Consolidate to 2 |

**Risk:** HIGH - Currently allows cross-tenant access

---

## Phase 2: Standardize Custom Functions Pattern (10 tables)

These use `get_current_tenant_id()` and `has_tenant_access()`:

| Table | Current Policies | Action |
|-------|------------------|--------|
| t_category_details | 4 | Migrate to JWT pattern |
| t_category_master | 4 | Migrate to JWT pattern |
| t_role_permissions | 4 | Migrate to JWT pattern |
| t_tax_info | 4 | Migrate to JWT pattern |
| t_tenant_files | 4 | Migrate to JWT pattern |
| t_tenant_profiles | 4 | Migrate to JWT pattern |
| t_user_profiles | 5 | Migrate to JWT pattern |
| t_user_tenant_roles | 4 | Migrate to JWT pattern |
| t_user_tenants | 4 | Migrate to JWT pattern |
| t_tenant_integrations | 4 | Migrate to JWT pattern (also fix TEXT→UUID) |

**Risk:** MEDIUM - Currently working but non-standard

---

## Phase 3: Standardize Subquery Pattern (12 tables)

These use `tenant_id IN (SELECT ... FROM t_user_tenants ...)`:

| Table | Current Policies | Action |
|-------|------------------|--------|
| t_tenant_onboarding | 3 | Migrate to JWT pattern |
| t_onboarding_step_status | 3 | Migrate to JWT pattern |
| t_bm_tenant_subscription | 2 | Migrate to JWT pattern |
| t_bm_subscription_usage | 2 | Migrate to JWT pattern |
| t_bm_invoice | 2 | Migrate to JWT pattern |
| t_tenant_domains | 2 | Migrate to JWT pattern |
| t_tenant_regions | 2 | Migrate to JWT pattern |
| t_invitation_audit_log | 2 | Migrate to JWT pattern |
| t_user_invitations | 4 | Migrate to JWT pattern |
| t_contacts | 1 | Migrate to JWT pattern |
| t_contact_addresses | 1 | Migrate to JWT pattern |
| t_contact_channels | 1 | Migrate to JWT pattern |

**Risk:** MEDIUM - Currently working but adds query overhead

---

## Phase 4: Fix Deprecated Pattern (1 table)

| Table | Issue | Action |
|-------|-------|--------|
| t_category_resources_master | Uses `auth.jwt()->'app_metadata'->>'tenant_id'` | Migrate to JWT claims |

**Risk:** LOW - Deprecated but functional

---

## Tables That Are OK (No Migration Needed)

| Table | Pattern | Status |
|-------|---------|--------|
| t_catalog_items | JWT Claims | ✅ Standard |
| t_catalog_resources | JWT Claims | ✅ Standard |
| t_catalog_resource_pricing | JWT Claims | ✅ Standard |
| t_catalog_service_resources | JWT Claims | ✅ Standard |
| t_audit_logs | Role-based | ✅ OK (special case) |
| t_tenants | Ownership-based | ✅ OK (special case) |
| t_user_auth_methods | User-owned | ✅ OK (special case) |
| t_domain_mappings | Service role only | ✅ OK |
| t_search_query_cache | Service role only | ✅ OK |
| t_semantic_clusters | Service role only | ✅ OK |
| t_group_activity_logs | Service role only | ✅ OK |
| t_group_memberships | Service role only | ✅ OK |
| t_business_groups | Service role only | ✅ OK |

---

## Tables Excluded (No Tenant Isolation Needed)

| Table | Reason |
|-------|--------|
| t_campaigns | Shared across tenants (per user decision) |
| t_campaign_leads | Shared across tenants (per user decision) |
| t_bm_feature_reference | Master data |
| t_bm_notification_reference | Master data |
| t_bm_pricing_plan | Master data |
| t_bm_plan_version | Master data |
| t_integration_providers | Master data |
| t_integration_types | Master data |

---

## Execution Order

### Weekend Sprint (Today/Tomorrow)

1. **Phase 0** - Enable RLS on 3 tables
2. **Phase 1** - Fix over-permissive policies on 2 tables

### Week 1 (After QA Validation)

3. **Phase 2** - Migrate custom function tables (10 tables)

### Week 2

4. **Phase 3** - Migrate subquery pattern tables (12 tables)
5. **Phase 4** - Fix deprecated pattern (1 table)

---

## Migration Strategy Per Table

### Safe Migration Process

For EACH table:

```
1. ADD new standard policies (old policies still active)
   ↓
2. TEST with both old and new active
   ↓
3. VERIFY no functionality broken
   ↓
4. DROP old policies
   ↓
5. VERIFY again
```

This ensures zero-downtime and easy rollback.

---

*See individual SQL files in migrations/ folder for execution scripts*
