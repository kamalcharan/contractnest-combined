-- 077: BBB's negotiated allowance is 60 contracts, not the 50 carried by the
-- shared "Quarterly" plan template. There is no 60-contract template, so the
-- grant is set directly (owner instruction, 2026-09-14).
--
-- Written in BOTH places on purpose:
--   * t_contract_blocks  -- the source fn_apply_contract_entitlements reads,
--                           so a renewal/switch/re-apply cannot snap it to 50
--   * t_tenant_context   -- the value actually served to the app today
-- Scoped to BBB's own live plan contract; no other tenant is touched.

DO $bbb$
DECLARE
  v_tenant   UUID := 'dd194710-92b4-4110-80eb-0b492a0d2c1f';
  v_contract UUID;
  v_blocks   INT;
  v_limit    INT;
BEGIN
  SELECT c.id INTO v_contract
  FROM t_contracts c
  JOIN t_contacts ct ON ct.id = c.buyer_id
  WHERE ct.source_tenant_id = v_tenant
    AND c.metadata->>'source' = 'plan_subscription'
    AND c.status = 'active' AND c.is_live = TRUE
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'no active live plan contract found for BBB';
  END IF;

  UPDATE t_contract_blocks
  SET custom_fields = jsonb_set(custom_fields,
                                '{config,metering,limits,contracts}', to_jsonb(60), TRUE)
  WHERE contract_id = v_contract
    AND custom_fields->'config'->'metering'->>'mode' = 'limit';
  GET DIAGNOSTICS v_blocks = ROW_COUNT;

  IF v_blocks <> 1 THEN
    RAISE EXCEPTION 'expected exactly 1 limit block on BBB plan, updated %', v_blocks;
  END IF;

  UPDATE t_tenant_context
  SET limit_contracts = 60, updated_at = now()
  WHERE tenant_id = v_tenant AND product_code = 'contractnest';

  SELECT limit_contracts INTO v_limit FROM t_tenant_context
   WHERE tenant_id = v_tenant AND product_code = 'contractnest';

  IF v_limit <> 60 THEN
    RAISE EXCEPTION 'BBB limit_contracts did not land: %', v_limit;
  END IF;

  RAISE NOTICE 'BBB allowance set to 60 on contract % (% block)', v_contract, v_blocks;
END $bbb$;
