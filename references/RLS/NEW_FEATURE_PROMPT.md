# New Feature Development - RLS Compliance Prompt

**Purpose:** Copy-paste this prompt when starting new feature development to ensure RLS compliance.

---

## Copy This Prompt When Starting New Work

```
## CONTEXT

I'm building a new feature: [FEATURE_NAME]

## DATABASE REQUIREMENTS

This feature requires the following tables:
1. t_[table_name_1] - [description]
2. t_[table_name_2] - [description]

## RLS REQUIREMENTS (MANDATORY)

All new tables MUST follow the ContractNest RLS standard.

### Standard Pattern to Apply:

For EACH table with tenant_id column:

```sql
-- Step 1: Enable RLS
ALTER TABLE public.t_[TABLE_NAME] ENABLE ROW LEVEL SECURITY;

-- Step 2: Service Role Policy (for Edge Functions)
CREATE POLICY "service_role_access_t_[TABLE_NAME]"
ON public.t_[TABLE_NAME]
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 3: Tenant Isolation Policy (for Client Apps)
CREATE POLICY "tenant_isolation_t_[TABLE_NAME]"
ON public.t_[TABLE_NAME]
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

### Edge Function Requirements:

- Use `service_role` key from `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`
- Extract `tenant_id` from `req.headers.get('x-tenant-id')`
- Include `tenant_id` explicitly in all INSERT/UPDATE operations

### Reference Implementation:

See: `supabase/functions/service-catalog/` for RLS-compliant edge function example
See: `t_catalog_items` for properly configured table example

## CHECKLIST (Verify Before Completion)

- [ ] Table has `tenant_id UUID NOT NULL` column
- [ ] Foreign key to `t_tenants(id)` exists with `ON DELETE CASCADE`
- [ ] RLS is enabled on table
- [ ] `service_role_access_{table}` policy created
- [ ] `tenant_isolation_{table}` policy created
- [ ] Index on `tenant_id` exists
- [ ] Edge function uses service_role key
- [ ] Edge function reads x-tenant-id header
- [ ] Edge function includes tenant_id in all writes
- [ ] Client queries tested (only sees own tenant data)
- [ ] Cross-tenant prevention tested

## OUTPUT NEEDED

1. SQL migration file with table + RLS policies
2. Edge function code (if applicable)
3. Test validation confirming RLS works
```

---

## Quick Reference

### Table Template

```sql
CREATE TABLE public.t_feature_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Your business columns
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID,

  -- Foreign keys
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id)
    REFERENCES t_tenants(id) ON DELETE CASCADE
);

-- Index
CREATE INDEX idx_feature_data_tenant ON public.t_feature_data(tenant_id);

-- RLS
ALTER TABLE public.t_feature_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_access_t_feature_data"
ON public.t_feature_data FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_feature_data"
ON public.t_feature_data FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
```

### Edge Function Template

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // Use service_role
);

Deno.serve(async (req) => {
  // Get tenant from header
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return new Response(
      JSON.stringify({ error: 'Missing x-tenant-id header' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Always include tenant_id in operations
  const { data, error } = await supabaseAdmin
    .from('t_feature_data')
    .insert({
      tenant_id: tenantId,  // ALWAYS include
      name: 'Example',
    })
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ data }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
```

---

## Special Cases

### Super Admin Access Needed?

Add OR condition for super admins:

```sql
CREATE POLICY "tenant_isolation_t_[TABLE_NAME]"
ON public.t_[TABLE_NAME]
FOR ALL TO authenticated
USING (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  OR EXISTS (
    SELECT 1 FROM t_user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
);
```

### Read-Only for Regular Users?

Split into separate policies:

```sql
-- All users can SELECT
CREATE POLICY "tenant_read_t_[TABLE_NAME]"
ON public.t_[TABLE_NAME]
FOR SELECT TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Only admins can INSERT/UPDATE/DELETE
CREATE POLICY "tenant_admin_write_t_[TABLE_NAME]"
ON public.t_[TABLE_NAME]
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  AND EXISTS (
    SELECT 1 FROM t_user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = t_[TABLE_NAME].tenant_id
      AND ut.is_admin = true
  )
);
```

---

*Use this prompt for every new feature to ensure RLS compliance!*
