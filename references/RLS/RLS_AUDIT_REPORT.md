# RLS Audit Report - ContractNest

**Date:** 2025-11-29
**Status:** QA Mode (Pre-Production)
**Auditor:** Claude AI Assistant

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total `t_` tables | 49 |
| Tables with RLS enabled | 43 |
| Tables with RLS disabled | 6 |
| Tables with `tenant_id` column | 29 |
| **Distinct RLS patterns found** | **8** |
| **Critical security issues** | **5** |

---

## Critical Issues (Requires Immediate Attention)

### Issue #1: Tables with `tenant_id` but NO RLS

| Table | tenant_id Type | RLS Enabled | Risk |
|-------|---------------|-------------|------|
| `t_catalog_categories` | uuid NOT NULL | **NO** | HIGH |
| `t_catalog_industries` | uuid NOT NULL | **NO** | HIGH |
| `t_idempotency_keys` | uuid NOT NULL | **NO** | MEDIUM |

**Impact:** Any authenticated user can potentially access all tenants' data in these tables.

---

### Issue #2: Tables with NO `tenant_id` Column (Missing Tenant Isolation)

| Table | RLS Enabled | Current Policies | Risk |
|-------|-------------|------------------|------|
| `t_campaigns` | Yes | `USING (true)` - ALL authenticated | **CRITICAL** |
| `t_campaign_leads` | Yes | `USING (true)` - ALL authenticated | **CRITICAL** |

**Impact:** These tables have NO tenant isolation mechanism. All users can see/modify all data.

**Recommendation:** Add `tenant_id` column and apply standard RLS.

---

### Issue #3: Data Type Mismatch

| Table | Column | Expected Type | Actual Type |
|-------|--------|---------------|-------------|
| `t_tenant_integrations` | tenant_id | uuid | **text** |

**Impact:** Type casting required in policies, potential performance issues.

---

### Issue #4: Over-Permissive Policies

#### t_tax_rates
```sql
-- This policy allows ANY authenticated user full access!
tax_rates_policy: USING (auth.role() = 'authenticated')
```

#### t_tax_settings - 8 REDUNDANT POLICIES
```
service_role_bypass_rls_tax_settings  -- USING (true) on PUBLIC role!
service_role_full_access_tax_settings
tax_settings_all_for_super_admins
tax_settings_select_for_super_admins   -- Duplicate!
tax_settings_select_for_tenant_users
tax_settings_insert_for_tenant_admins
tax_settings_update_for_tenant_admins
```

---

### Issue #5: Nullable tenant_id (Design Issue)

| Table | Allows NULL tenant_id |
|-------|----------------------|
| t_audit_logs | YES |
| t_category_details | YES |
| t_category_master | YES |
| t_group_activity_logs | YES |
| t_role_permissions | YES |
| t_tax_info | YES |
| t_tenant_domains | YES |
| t_tenant_profiles | YES |
| t_user_tenants | YES |

**Risk:** NULL values can bypass RLS policies that check `tenant_id = X`.

---

## RLS Pattern Inventory

### Pattern 1: JWT Claims (STANDARD - TARGET PATTERN)

**Status:** RECOMMENDED FOR ALL NEW TABLES

```sql
-- Service Role Policy
CREATE POLICY "service_role_access_{table}"
ON public.{table}
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Tenant Isolation Policy
CREATE POLICY "tenant_isolation_{table}"
ON public.{table}
FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
```

**Tables using this pattern (4):**
- t_catalog_items
- t_catalog_resource_pricing
- t_catalog_resources
- t_catalog_service_resources

---

### Pattern 2: Custom Functions (get_current_tenant_id + has_tenant_access)

```sql
USING (tenant_id = get_current_tenant_id() AND has_tenant_access(tenant_id))
```

**Tables using this pattern (10+):**
- t_category_details
- t_category_master
- t_role_permissions
- t_tax_info
- t_tenant_files
- t_tenant_profiles
- t_user_profiles
- t_user_tenant_roles
- t_user_tenants
- t_tenant_integrations

**Risk:** Dependency on custom functions. If functions fail, RLS may break.

---

### Pattern 3: Subquery via t_user_tenants

```sql
USING (tenant_id IN (
  SELECT tenant_id FROM t_user_tenants
  WHERE user_id = auth.uid() AND status = 'active'
))
```

**Tables using this pattern (12+):**
- t_tenant_onboarding
- t_onboarding_step_status
- t_invitation_audit_log
- t_bm_tenant_subscription
- t_bm_subscription_usage
- t_bm_invoice
- t_tenant_domains
- t_tenant_regions
- t_user_invitations
- t_contacts
- t_contact_addresses
- t_contact_channels

**Risk:** Performance impact on large tenant counts. More complex to maintain.

---

### Pattern 4: app_metadata (DEPRECATED)

```sql
USING (tenant_id = (auth.jwt()->'app_metadata'->>'tenant_id')::uuid)
```

**Tables using this pattern (1):**
- t_category_resources_master

**Risk:** Uses deprecated Supabase pattern. Should migrate to JWT claims.

---

### Pattern 5: Service Role Only

```sql
USING (auth.role() = 'service_role')
```

**Tables using this pattern (6):**
- t_domain_mappings
- t_search_query_cache
- t_semantic_clusters
- t_group_activity_logs (partial)
- t_group_memberships (partial)
- t_business_groups (partial)

**Status:** OK for system/internal tables.

---

### Pattern 6: Master Data (Read-Only for Authenticated)

```sql
-- SELECT for authenticated
USING (true)
-- ALL for service_role
```

**Tables using this pattern (8+):**
- m_block_categories
- m_block_masters
- m_block_variants
- m_permissions
- t_bm_feature_reference
- t_bm_notification_reference
- t_bm_pricing_plan
- t_bm_plan_version
- t_integration_providers
- t_integration_types

**Status:** OK for read-only master data.

---

### Pattern 7: Complex/Special Cases

**t_audit_logs** - Role-based access:
- Super admin: sees all
- Tenant admin: sees tenant's logs
- User: sees own tenant's logs

**t_tenants** - Ownership-based:
- created_by check for insert
- Membership OR creator for select/update

**t_user_auth_methods** - User-owned:
- user_id = auth.uid()

---

### Pattern 8: NO ISOLATION (DANGEROUS)

```sql
USING (true)  -- Anyone can access!
```

**Tables with this issue:**
- t_campaigns
- t_campaign_leads

---

## Table-by-Table Status

### Properly Configured (Standard Pattern)

| Table | Pattern | Policies | Status |
|-------|---------|----------|--------|
| t_catalog_items | JWT Claims | 2 | OK |
| t_catalog_resource_pricing | JWT Claims | 2 | OK |
| t_catalog_resources | JWT Claims | 2 | OK |
| t_catalog_service_resources | JWT Claims | 2 | OK |

### Needs Migration (Working but Non-Standard)

| Table | Current Pattern | Policies | Priority |
|-------|-----------------|----------|----------|
| t_category_details | Custom Functions | 4 | P2 |
| t_category_master | Custom Functions | 4 | P2 |
| t_role_permissions | Custom Functions | 4 | P2 |
| t_tax_info | Custom Functions | 4 | P2 |
| t_tenant_files | Custom Functions | 4 | P2 |
| t_tenant_profiles | Custom Functions | 4 | P2 |
| t_user_profiles | Custom Functions | 5 | P2 |
| t_user_tenant_roles | Custom Functions | 4 | P2 |
| t_user_tenants | Custom Functions | 4 | P2 |
| t_tenant_integrations | Custom Functions | 4 | P2 |
| t_contacts | Subquery | 1 | P3 |
| t_contact_addresses | Subquery | 1 | P3 |
| t_contact_channels | Subquery | 1 | P3 |

### Needs Immediate Fix

| Table | Issue | Priority |
|-------|-------|----------|
| t_catalog_categories | RLS disabled, has tenant_id | **P0** |
| t_catalog_industries | RLS disabled, has tenant_id | **P0** |
| t_campaigns | No tenant_id column | **P0** |
| t_campaign_leads | No tenant_id column | **P0** |
| t_tax_rates | Over-permissive policy | **P1** |
| t_tax_settings | 8 redundant policies | **P1** |
| t_category_resources_master | Deprecated pattern | **P1** |

---

## Recommendations

### Phase 0: Critical Fixes (This Weekend)

1. **Add RLS to t_catalog_categories and t_catalog_industries**
2. **Evaluate t_campaigns and t_campaign_leads** - Do they need tenant_id?
3. **Fix t_tax_rates** - Remove over-permissive policy
4. **Clean up t_tax_settings** - Reduce from 8 to 2 policies

### Phase 1: Standardization (Week 1-2)

1. Create standard RLS template
2. Document all patterns
3. Create QA test cases

### Phase 2: Migration (Month 1)

1. Migrate custom function pattern tables
2. Migrate subquery pattern tables
3. Test thoroughly

### Phase 3: Cleanup (Month 2)

1. Remove deprecated patterns
2. Fix nullable tenant_id issues
3. Standardize naming conventions

---

## Appendix: Custom Functions Used

Need to verify these functions exist and work correctly:

```sql
-- Function 1
get_current_tenant_id()

-- Function 2
has_tenant_access(tenant_id)

-- Function 3
has_tenant_role(tenant_id, roles_array)
```

**Action Required:** Please run this query and share results:

```sql
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_current_tenant_id', 'has_tenant_access', 'has_tenant_role');
```

---

*Report generated: 2025-11-29*
