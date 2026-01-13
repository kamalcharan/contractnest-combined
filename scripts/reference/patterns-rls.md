# RLS Patterns - Row Level Security

## 🎯 Core Principle
**RLS = Safety net for writes and low-volume reads**
**RLS ≠ Performance tool for hot paths**

---

## When to Use RLS vs Bypass

| Scenario | Use RLS | Bypass with SECURITY DEFINER |
|----------|---------|------------------------------|
| List endpoints (contacts, contracts) | ❌ | ✅ |
| Dashboard queries | ❌ | ✅ |
| Single record fetch (by ID) | ⚠️ Maybe | ✅ Preferred |
| INSERT operations | ✅ | ⚠️ Optional |
| UPDATE operations | ✅ | ⚠️ Optional |
| DELETE operations | ✅ | ❌ Keep RLS |
| Admin tooling | ✅ | ❌ |
| AI batch processing | ❌ | ✅ |
| Background workers | ❌ | ✅ |

---

## ✅ CORRECT: Simple RLS Policy (Copy This)
```sql
-- migrations/policies/contacts_rls.sql

-- Enable RLS on table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Simple policy - no joins, no subqueries
CREATE POLICY "tenant_isolation_select" ON contacts
  FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "tenant_isolation_insert" ON contacts
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "tenant_isolation_update" ON contacts
  FOR UPDATE
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "tenant_isolation_delete" ON contacts
  FOR DELETE
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

---

## ✅ CORRECT: Setting Tenant Context (Copy This)
```typescript
// Edge layer - set tenant before direct table access
async function setTenantContext(tenantId: string) {
  await supabase.rpc('set_tenant_context', { p_tenant_id: tenantId });
}

// DB function to set context
/*
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::text, true);
END;
$$;
*/
```

---

## ✅ CORRECT: Bypass RLS for Hot Reads (Copy This)
```sql
-- For list endpoints - ALWAYS bypass RLS

CREATE OR REPLACE FUNCTION get_contacts_list(
  p_tenant_id UUID,  -- Explicit tenant, not from RLS
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  -- ← This bypasses RLS
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT c.id, c.name, c.email
      FROM contacts c
      WHERE c.tenant_id = p_tenant_id  -- ← Explicit filter, no RLS overhead
      ORDER BY c.created_at DESC
      LIMIT p_limit OFFSET p_offset
    ) t
  );
END;
$$;
```

---

## ❌ WRONG: Join Inside RLS Policy (NEVER DO THIS)
```sql
-- FORBIDDEN - Joins in RLS destroy performance
CREATE POLICY "bad_policy" ON contacts
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT ut.tenant_id 
      FROM user_tenants ut  -- ❌ JOIN
      WHERE ut.user_id = auth.uid()
    )
  );
```

---

## ❌ WRONG: Subquery Inside RLS (NEVER DO THIS)
```sql
-- FORBIDDEN - Subqueries in RLS destroy performance
CREATE POLICY "bad_policy" ON contacts
  FOR SELECT
  USING (
    EXISTS (  -- ❌ SUBQUERY
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = contacts.team_id
      AND tm.user_id = auth.uid()
    )
  );
```

---

## ❌ WRONG: Function Call Inside RLS (NEVER DO THIS)
```sql
-- FORBIDDEN - Function calls in RLS are slow
CREATE POLICY "bad_policy" ON contacts
  FOR SELECT
  USING (
    check_user_access(tenant_id, auth.uid())  -- ❌ FUNCTION CALL
  );
```

---

## ❌ WRONG: auth.uid() Chain in RLS (NEVER DO THIS)
```sql
-- FORBIDDEN - Complex auth chains
CREATE POLICY "bad_policy" ON contacts
  FOR SELECT
  USING (
    tenant_id = (
      SELECT u.tenant_id 
      FROM users u 
      WHERE u.id = auth.uid()  -- ❌ LOOKUP PER ROW
    )
  );
```

---

## ✅ CORRECT: RLS for Writes Only (Recommended Pattern)
```sql
-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Writes use RLS (acceptable performance)
CREATE POLICY "tenant_write" ON contracts
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "tenant_update" ON contracts
  FOR UPDATE
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "tenant_delete" ON contracts
  FOR DELETE
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- NO SELECT POLICY - reads go through SECURITY DEFINER functions
-- This is intentional for performance
```

---

## ⚠️ Security Checklist for SECURITY DEFINER
When bypassing RLS:
- [ ] Always pass tenant_id explicitly as parameter
- [ ] Always SET search_path = public
- [ ] Never trust user input - validate tenant_id ownership at Edge
- [ ] Never expose function to anonymous users
- [ ] Log access if audit trail required

---

## 🎯 RLS Decision Tree
```
Is this a read operation?
├── Yes: Is it a hot path (list, dashboard, frequent)?
│   ├── Yes → Use SECURITY DEFINER, bypass RLS
│   └── No → RLS acceptable, but SECURITY DEFINER still preferred
└── No (Write operation):
    ├── INSERT → RLS WITH CHECK is fine
    ├── UPDATE → RLS USING + WITH CHECK is fine
    └── DELETE → Always use RLS for safety
```
