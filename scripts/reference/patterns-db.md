# Database Patterns

## 🎯 Database Purpose
Postgres is **faster than Edge + JS** for data work.
If it's filtering, joining, aggregating, shaping JSON → **it belongs in Postgres**

---

## ✅ CORRECT: List Function with SECURITY DEFINER (Copy This)
```sql
-- migrations/functions/get_contacts_list.sql

CREATE OR REPLACE FUNCTION get_contacts_list(
  p_tenant_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  -- Bypasses RLS for performance
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_total INT;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM contacts c
  WHERE c.tenant_id = p_tenant_id
    AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR c.status = p_status);

  -- Get paginated data with joins
  SELECT json_build_object(
    'data', COALESCE(json_agg(row_to_json(t)), '[]'::json),
    'pagination', json_build_object(
      'total', v_total,
      'limit', p_limit,
      'offset', p_offset,
      'has_more', (p_offset + p_limit) < v_total
    )
  ) INTO v_result
  FROM (
    SELECT 
      c.id,
      c.name,
      c.email,
      c.phone,
      c.status,
      c.created_at,
      comp.name as company_name  -- Join happens HERE
    FROM contacts c
    LEFT JOIN companies comp ON c.company_id = comp.id
    WHERE c.tenant_id = p_tenant_id
      AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR c.status = p_status)
    ORDER BY c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) t;

  RETURN v_result;
END;
$$;
```

---

## ✅ CORRECT: Single Record Function (Copy This)
```sql
-- migrations/functions/get_contact_by_id.sql

CREATE OR REPLACE FUNCTION get_contact_by_id(
  p_tenant_id UUID,
  p_contact_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT row_to_json(t) INTO v_result
  FROM (
    SELECT 
      c.id,
      c.name,
      c.email,
      c.phone,
      c.status,
      c.created_at,
      c.updated_at,
      comp.name as company_name,
      comp.id as company_id
    FROM contacts c
    LEFT JOIN companies comp ON c.company_id = comp.id
    WHERE c.tenant_id = p_tenant_id
      AND c.id = p_contact_id
  ) t;

  RETURN v_result;  -- Returns NULL if not found
END;
$$;
```

---

## ✅ CORRECT: Insert with Returning (Copy This)
```sql
-- migrations/functions/create_contact.sql

CREATE OR REPLACE FUNCTION create_contact(
  p_tenant_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id UUID;
  v_result JSON;
BEGIN
  -- Insert with conflict handling
  INSERT INTO contacts (tenant_id, name, email, phone, company_id)
  VALUES (p_tenant_id, p_name, p_email, p_phone, p_company_id)
  RETURNING id INTO v_contact_id;

  -- Return created record with joins
  SELECT row_to_json(t) INTO v_result
  FROM (
    SELECT 
      c.id,
      c.name,
      c.email,
      c.phone,
      c.status,
      c.created_at,
      comp.name as company_name
    FROM contacts c
    LEFT JOIN companies comp ON c.company_id = comp.id
    WHERE c.id = v_contact_id
  ) t;

  RETURN v_result;
END;
$$;
```

---

## ✅ CORRECT: Aggregation Function (Copy This)
```sql
-- migrations/functions/get_contact_stats.sql

CREATE OR REPLACE FUNCTION get_contact_stats(
  p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total', COUNT(*),
      'active', COUNT(*) FILTER (WHERE status = 'active'),
      'inactive', COUNT(*) FILTER (WHERE status = 'inactive'),
      'created_this_month', COUNT(*) FILTER (
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
      )
    )
    FROM contacts
    WHERE tenant_id = p_tenant_id
  );
END;
$$;
```

---

## ✅ CORRECT: PGMQ Send Helper (Copy This)
```sql
-- migrations/functions/pgmq_send.sql

CREATE OR REPLACE FUNCTION pgmq_send(
  queue_name TEXT,
  message JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg_id BIGINT;
BEGIN
  SELECT pgmq.send(queue_name, message) INTO v_msg_id;
  RETURN v_msg_id;
END;
$$;
```

---

## ❌ WRONG: No Pagination (NEVER DO THIS)
```sql
-- FORBIDDEN - Unbounded query
CREATE FUNCTION get_all_contacts(p_tenant_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(c))
    FROM contacts c
    WHERE c.tenant_id = p_tenant_id
    -- ❌ NO LIMIT - Could return 100K+ rows
  );
END;
$$ LANGUAGE plpgsql;
```

---

## ❌ WRONG: Missing SECURITY DEFINER on Hot Path
```sql
-- FORBIDDEN for list endpoints - RLS overhead
CREATE FUNCTION get_contacts_list(p_tenant_id UUID)
RETURNS JSON AS $$
  -- ❌ No SECURITY DEFINER = RLS evaluated per row
  -- ❌ Will be slow at scale
$$ LANGUAGE plpgsql;  
```

---

## ✅ Database Checklist
Before submitting DB code:
- [ ] SECURITY DEFINER on hot read paths
- [ ] SET search_path = public
- [ ] Explicit tenant_id parameter (never rely on RLS alone)
- [ ] LIMIT + OFFSET for all lists
- [ ] Joins done in Postgres, not Edge
- [ ] Aggregations done in Postgres, not Edge
- [ ] JSON shaping done in Postgres
- [ ] Index exists for WHERE/ORDER BY columns
