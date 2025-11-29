# RLS QA Test Cases

**Version:** 1.0
**Date:** 2025-11-29
**Purpose:** Validate RLS policies are working correctly

---

## How to Identify RLS Errors

### Error Messages to Watch For

When RLS blocks access, you'll see these errors:

| Error Type | Message | Meaning |
|------------|---------|---------|
| **RLS Violation (Read)** | `"new row violates row-level security policy for table"` | User tried to read data they don't have access to |
| **RLS Violation (Write)** | `"new row violates row-level security policy"` | User tried to insert/update data for wrong tenant |
| **Empty Result** | `data: []` with no error | RLS filtered out all rows (user has no matching data) |
| **Permission Denied** | `"permission denied for table"` | User doesn't have table-level permission |

### How RLS Errors Appear in the UI

1. **API Response (Network Tab):**
```json
{
  "code": "42501",
  "details": null,
  "hint": null,
  "message": "new row violates row-level security policy for table \"t_catalog_items\""
}
```

2. **Console Error:**
```
PostgrestError: new row violates row-level security policy
```

3. **Empty Data (Silent Filtering):**
```json
{
  "data": [],
  "error": null
}
```

---

## Test Environment Setup

### Prerequisites

1. **Two test tenants:**
   - Tenant A: `tenant_a_id`
   - Tenant B: `tenant_b_id`

2. **Test users:**
   - User 1: Belongs to Tenant A only
   - User 2: Belongs to Tenant B only
   - User 3: Super Admin (if applicable)

3. **Test data:**
   - Create records in each tenant for testing

---

## Test Cases by Category

### Category 1: Tenant Isolation (SELECT)

#### TC-1.1: User sees only their tenant's data

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as User 1 (Tenant A) | Login successful |
| 2 | Navigate to Catalog > Services | See list of services |
| 3 | Verify all displayed services | All services have Tenant A's tenant_id |
| 4 | Check network response | No services from Tenant B visible |

**SQL Verification:**
```sql
-- Run as User 1's session
SELECT id, service_name, tenant_id
FROM t_catalog_items
LIMIT 10;

-- All results should have tenant_id = 'tenant_a_id'
```

---

#### TC-1.2: User cannot see other tenant's data

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as User 1 (Tenant A) | Login successful |
| 2 | Try direct API query for Tenant B's record | Empty result or error |
| 3 | Check network response | No data returned |

**API Test:**
```javascript
// In browser console while logged in as User 1
const { data, error } = await supabase
  .from('t_catalog_items')
  .select('*')
  .eq('tenant_id', 'tenant_b_id');  // Trying to access Tenant B

console.log(data);  // Should be [] empty array
console.log(error); // Should be null (RLS just filters, doesn't error)
```

---

### Category 2: Tenant Isolation (INSERT)

#### TC-2.1: User can insert into their tenant

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as User 1 (Tenant A) | Login successful |
| 2 | Create new service in Catalog | Service created successfully |
| 3 | Verify tenant_id in database | tenant_id = Tenant A's ID |

---

#### TC-2.2: User cannot insert into other tenant

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as User 1 (Tenant A) | Login successful |
| 2 | Try to insert with Tenant B's tenant_id | **RLS ERROR** |
| 3 | Check error message | "new row violates row-level security policy" |

**API Test:**
```javascript
// In browser console while logged in as User 1
const { data, error } = await supabase
  .from('t_catalog_items')
  .insert({
    tenant_id: 'tenant_b_id',  // Wrong tenant!
    service_name: 'Malicious Service',
    description: 'Test'
  });

console.log(error);
// Expected: {code: "42501", message: "new row violates row-level security policy..."}
```

---

### Category 3: Tenant Isolation (UPDATE)

#### TC-3.1: User can update their tenant's records

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as User 1 (Tenant A) | Login successful |
| 2 | Edit existing service | Update successful |
| 3 | Verify changes saved | Data updated in database |

---

#### TC-3.2: User cannot update other tenant's records

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as User 1 (Tenant A) | Login successful |
| 2 | Try to update Tenant B's record | **No rows affected** or **RLS ERROR** |

**API Test:**
```javascript
// Try to update Tenant B's record while logged in as User 1
const { data, error, count } = await supabase
  .from('t_catalog_items')
  .update({ service_name: 'Hacked!' })
  .eq('id', 'tenant_b_service_id')  // Tenant B's record
  .select();

console.log(data);  // Should be [] empty - no rows matched
console.log(count); // Should be 0
```

---

### Category 4: Tenant Isolation (DELETE)

#### TC-4.1: User can delete their tenant's records

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as User 1 (Tenant A) | Login successful |
| 2 | Delete a service | Delete successful |
| 3 | Verify record removed | Record no longer in database |

---

#### TC-4.2: User cannot delete other tenant's records

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as User 1 (Tenant A) | Login successful |
| 2 | Try to delete Tenant B's record | **No rows affected** |

---

### Category 5: Edge Function Access

#### TC-5.1: Edge function can access any tenant (service role)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call edge function with x-tenant-id: Tenant A | Returns Tenant A data |
| 2 | Call edge function with x-tenant-id: Tenant B | Returns Tenant B data |
| 3 | Edge function creates record | Record has correct tenant_id |

**cURL Test:**
```bash
# Test for Tenant A
curl -X GET "https://your-project.supabase.co/functions/v1/service-catalog/services" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "x-tenant-id: tenant_a_id"

# Test for Tenant B
curl -X GET "https://your-project.supabase.co/functions/v1/service-catalog/services" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "x-tenant-id: tenant_b_id"
```

---

### Category 6: Environment Switching (Live/Test)

#### TC-6.1: Live mode shows only live data

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login and switch to LIVE mode | Environment indicator shows "Live" |
| 2 | View services | Only live services visible |
| 3 | Check x-environment header | Header = "live" |

---

#### TC-6.2: Test mode shows only test data

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Switch to TEST mode | Environment indicator shows "Test" |
| 2 | View services | Only test services visible |
| 3 | Check x-environment header | Header = "test" |

---

## Quick Validation Queries

Run these in Supabase SQL Editor to verify RLS:

### 1. Check RLS is enabled on all tenant tables
```sql
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  CASE
    WHEN t.rowsecurity THEN 'OK'
    ELSE 'MISSING RLS!'
  END AS status
FROM pg_tables t
JOIN information_schema.columns c
  ON c.table_name = t.tablename
WHERE t.schemaname = 'public'
  AND c.column_name = 'tenant_id'
  AND t.tablename LIKE 't_%'
ORDER BY t.rowsecurity, t.tablename;
```

### 2. Check policy count per table
```sql
SELECT
  tablename,
  COUNT(*) AS policy_count,
  CASE
    WHEN COUNT(*) = 2 THEN 'OK'
    WHEN COUNT(*) < 2 THEN 'MISSING POLICIES'
    WHEN COUNT(*) > 2 THEN 'TOO MANY POLICIES'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 't_catalog%'
GROUP BY tablename
ORDER BY tablename;
```

### 3. Verify standard policy naming
```sql
SELECT
  tablename,
  policyname,
  CASE
    WHEN policyname LIKE 'service_role_access_%' THEN 'SERVICE_ROLE'
    WHEN policyname LIKE 'tenant_isolation_%' THEN 'TENANT_ISOLATION'
    ELSE 'NON-STANDARD'
  END AS policy_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 't_catalog%'
ORDER BY tablename, policyname;
```

---

## RLS Error Quick Reference

| Symptom | Likely Cause | How to Fix |
|---------|--------------|------------|
| Empty data, no error | RLS filtering working correctly | User doesn't have access to any matching rows |
| "row-level security policy" error | RLS blocking INSERT/UPDATE | Check tenant_id matches JWT claim |
| Data from wrong tenant visible | RLS policy missing or incorrect | Check policy USING clause |
| Edge function returns empty | Service role not being used | Verify SUPABASE_SERVICE_ROLE_KEY |
| All data visible to everyone | RLS disabled or policy too permissive | Enable RLS, check policy |

---

## Test Execution Checklist

### Pre-Migration Testing
- [ ] Run all SELECT tests (TC-1.x)
- [ ] Run all INSERT tests (TC-2.x)
- [ ] Run all UPDATE tests (TC-3.x)
- [ ] Run all DELETE tests (TC-4.x)
- [ ] Run edge function tests (TC-5.x)

### Post-Migration Testing
- [ ] Re-run all tests above
- [ ] Verify no functionality broken
- [ ] Check error logs for RLS violations
- [ ] Validate with 2+ tenants

---

*Document Version: 1.0 | Last Updated: 2025-11-29*
