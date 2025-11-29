# RLS Policy Specification - Production Standard

**Version:** 1.0
**Date:** 2025-11-29
**Status:** APPROVED

---

## Overview

This document defines the standard RLS (Row-Level Security) patterns for ContractNest. All new tables MUST follow these patterns.

---

## When to Apply RLS

### Standard Tenant Isolation (Pattern A)

Apply to ANY table that:
- Has `tenant_id UUID NOT NULL` column
- Stores tenant-specific business data
- Is accessed by both edge functions and client apps

**Examples:** t_catalog_items, t_orders, t_invoices, etc.

### Read-Only Master Data (Pattern B)

Apply to tables that:
- Contain shared reference/lookup data
- Are read-only for authenticated users
- Are managed only by service role

**Examples:** m_currencies, m_countries, m_permissions

### Service Role Only (Pattern C)

Apply to tables that:
- Are internal/system tables
- Should never be accessed directly by clients

**Examples:** t_search_query_cache, t_idempotency_keys

---

## Standard Patterns

### Pattern A: Tenant Isolation (PRIMARY PATTERN)

```sql
-- ============================================
-- STEP 1: Enable RLS
-- ============================================
ALTER TABLE public.{TABLE_NAME} ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Service Role Policy (Edge Functions)
-- ============================================
CREATE POLICY "service_role_access_{TABLE_NAME}"
ON public.{TABLE_NAME}
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- STEP 3: Tenant Isolation Policy (Client Apps)
-- ============================================
CREATE POLICY "tenant_isolation_{TABLE_NAME}"
ON public.{TABLE_NAME}
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
)
WITH CHECK (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
);
```

**Naming Convention:**
| Element | Pattern | Example |
|---------|---------|---------|
| Service Role Policy | `service_role_access_{table}` | `service_role_access_t_orders` |
| Tenant Isolation Policy | `tenant_isolation_{table}` | `tenant_isolation_t_orders` |

---

### Pattern B: Read-Only Master Data

```sql
-- Enable RLS
ALTER TABLE public.{TABLE_NAME} ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY "authenticated_read_{TABLE_NAME}"
ON public.{TABLE_NAME}
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

-- Full access for service role only
CREATE POLICY "service_role_manage_{TABLE_NAME}"
ON public.{TABLE_NAME}
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

### Pattern C: Service Role Only

```sql
-- Enable RLS
ALTER TABLE public.{TABLE_NAME} ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "service_role_only_{TABLE_NAME}"
ON public.{TABLE_NAME}
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

## Special Cases

### Super Admin Cross-Tenant Access

When super admins need to access all tenants' data:

```sql
CREATE POLICY "tenant_isolation_{TABLE_NAME}"
ON public.{TABLE_NAME}
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  -- Normal users: tenant isolation
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  OR
  -- Super admins: all tenants
  EXISTS (
    SELECT 1 FROM t_user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  OR
  EXISTS (
    SELECT 1 FROM t_user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
);
```

### Role-Based Access Within Tenant

When certain operations require specific roles:

```sql
-- SELECT: All tenant users
CREATE POLICY "tenant_read_{TABLE_NAME}"
ON public.{TABLE_NAME}
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
);

-- INSERT/UPDATE/DELETE: Only Owner/Admin
CREATE POLICY "tenant_admin_write_{TABLE_NAME}"
ON public.{TABLE_NAME}
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  AND EXISTS (
    SELECT 1 FROM t_user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = {TABLE_NAME}.tenant_id
      AND ut.is_admin = true
      AND ut.status = 'active'
  )
)
WITH CHECK (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
);
```

---

## Database Schema Standards

### Required Columns for Tenant Tables

All tenant-scoped tables (`t_*`) MUST have:

```sql
CREATE TABLE public.t_example (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation (REQUIRED)
  tenant_id UUID NOT NULL,

  -- Business columns here...

  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID,

  -- Foreign keys
  CONSTRAINT fk_tenant
    FOREIGN KEY (tenant_id) REFERENCES t_tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_created_by
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_updated_by
    FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Required indexes
CREATE INDEX idx_example_tenant_id ON public.t_example(tenant_id);
CREATE INDEX idx_example_created_at ON public.t_example(created_at);

-- Updated timestamp trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.t_example
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Edge Function Requirements

### Service Role Usage

Edge functions MUST:

1. **Use service_role key** from environment:
```typescript
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
```

2. **Extract tenant_id from header**:
```typescript
const tenantId = req.headers.get('x-tenant-id');
if (!tenantId) {
  return new Response(JSON.stringify({ error: 'Missing tenant ID' }), {
    status: 400
  });
}
```

3. **Include tenant_id in all operations**:
```typescript
// INSERT
const { data, error } = await supabaseAdmin
  .from('t_orders')
  .insert({
    tenant_id: tenantId,  // ALWAYS include
    ...orderData
  });

// SELECT with filter
const { data, error } = await supabaseAdmin
  .from('t_orders')
  .select('*')
  .eq('tenant_id', tenantId);  // ALWAYS filter
```

---

## Verification Checklist

Before deploying any new table:

- [ ] Table has `tenant_id UUID NOT NULL` column (for tenant data)
- [ ] Foreign key to `t_tenants` exists
- [ ] RLS is enabled on table
- [ ] Service role policy created
- [ ] Tenant isolation policy created
- [ ] Index on tenant_id exists
- [ ] Edge function uses service_role key
- [ ] Edge function reads x-tenant-id header
- [ ] Edge function includes tenant_id in all writes

---

## Verification Queries

### Check RLS is enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = '{TABLE_NAME}';
```

### Check policies exist
```sql
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = '{TABLE_NAME}';
```

### Expected result
Each table should have exactly 2 policies:
1. `service_role_access_{table}` - FOR ALL TO service_role
2. `tenant_isolation_{table}` - FOR ALL TO authenticated

---

## Migration Template

When adding RLS to existing tables:

```sql
-- ============================================
-- Migration: Add RLS to {TABLE_NAME}
-- Date: YYYY-MM-DD
-- Author: {name}
-- ============================================

-- Step 1: Drop any existing policies
DROP POLICY IF EXISTS "old_policy_name" ON public.{TABLE_NAME};

-- Step 2: Enable RLS (if not already)
ALTER TABLE public.{TABLE_NAME} ENABLE ROW LEVEL SECURITY;

-- Step 3: Create standard policies
CREATE POLICY "service_role_access_{TABLE_NAME}"
ON public.{TABLE_NAME}
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "tenant_isolation_{TABLE_NAME}"
ON public.{TABLE_NAME}
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
)
WITH CHECK (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
);

-- Step 4: Verify
SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = '{TABLE_NAME}';
```

---

## Reference Implementation

See the catalog tables for a working example:
- `t_catalog_items`
- `t_catalog_resources`
- `t_catalog_resource_pricing`
- `t_catalog_service_resources`

---

*Document Version: 1.0 | Last Updated: 2025-11-29*
