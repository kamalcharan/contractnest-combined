-- =====================================================================
-- DEMO TENANT SETUP — Script 06: CNAK access + claims into buyer tenants
-- 1. Tag buyer-side vendor contacts with source_tenant_id so the claim
--    RPC reuses them instead of creating duplicates.
-- 2. Create t_contract_access rows: anchors (nn 01-03) accepted,
--    'sent' contracts (nn 16) pending.
-- 3. Call claim_contract_by_cnak for the 12 anchor contracts so
--    Pulse/Complex/Gold see their vendor contracts in ContractHub.
-- Idempotent: access rows guarded by NOT EXISTS; claim RPC tolerates
-- already-claimed (same-tenant) repeats.
-- =====================================================================

-- 1. vendor contacts in buyer tenants ← source_tenant_id of the seller
UPDATE t_contacts c SET source_tenant_id = ('c0000000-0000-4000-8000-00000000000' || right(c.id::text, 1))::uuid
WHERE c.id::text LIKE 'ee000000-0_00-4000-8000-00000000000_'
  AND c.tenant_id::text IN ('c0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000006','c0000000-0000-4000-8000-000000000007')
  AND c.source_tenant_id IS NULL;

-- 2. access rows
DO $$
DECLARE
  s int; b int; nn text; v_contract uuid; v_seller uuid; v_cnak text; v_status text;
BEGIN
  FOR s IN 1..4 LOOP
    v_seller := ('c0000000-0000-4000-8000-00000000000' || s)::uuid;
    -- anchors: nn 01..03 → buyers 5..7 (accepted)
    FOR b IN 5..7 LOOP
      nn := lpad((b - 4)::text, 2, '0');
      v_contract := ('f' || s || '000000-0000-4000-8000-0000000000' || nn)::uuid;
      v_cnak := 'CNAK-D' || s || nn || 'A' || s;
      INSERT INTO t_contract_access (id, contract_id, global_access_id, tenant_id, creator_tenant_id,
        accessor_role, accessor_email, accessor_name, is_active, created_by, secret_code, status, responded_at)
      SELECT gen_random_uuid(), v_contract, v_cnak, v_seller, v_seller,
        'buyer', NULL, (SELECT company_name FROM t_contacts WHERE id = ('ee000000-0' || s || '00-4000-8000-00000000000' || b)::uuid),
        true, ('a0000000-0000-4000-8000-00000000000' || s)::uuid, 'DEMO' || s || nn, 'accepted', now()
      WHERE NOT EXISTS (SELECT 1 FROM t_contract_access e WHERE e.global_access_id = v_cnak);
    END LOOP;
    -- sent contract nn 16 (pending)
    v_contract := ('f' || s || '000000-0000-4000-8000-000000000016')::uuid;
    v_cnak := 'CNAK-D' || s || '16A' || s;
    INSERT INTO t_contract_access (id, contract_id, global_access_id, tenant_id, creator_tenant_id,
      accessor_role, is_active, created_by, secret_code, status)
    SELECT gen_random_uuid(), v_contract, v_cnak, v_seller, v_seller,
      'buyer', true, ('a0000000-0000-4000-8000-00000000000' || s)::uuid, 'DEMO' || s || '16', 'pending'
    WHERE NOT EXISTS (SELECT 1 FROM t_contract_access e WHERE e.global_access_id = v_cnak);
  END LOOP;
END $$;

-- 3. claims (anchor contracts → buyer tenants)
DO $$
DECLARE
  s int; b int; nn text; v_cnak text; v_res jsonb;
BEGIN
  FOR s IN 1..4 LOOP
    FOR b IN 5..7 LOOP
      nn := lpad((b - 4)::text, 2, '0');
      v_cnak := 'CNAK-D' || s || nn || 'A' || s;
      v_res := claim_contract_by_cnak(
        v_cnak,
        ('c0000000-0000-4000-8000-00000000000' || b)::uuid,
        ('a0000000-0000-4000-8000-00000000000' || b)::uuid,
        true);
      IF NOT (v_res->>'success')::boolean THEN
        RAISE NOTICE 'Claim failed for %: %', v_cnak, v_res->>'error';
      END IF;
    END LOOP;
  END LOOP;
END $$;
