-- Sprint 1 acceptance (spec: sprint1.sql) — run after (b)+(c) ship
-- 1) Discounts persisted on a wizard-created contract
SELECT contract_number, discount_type, discount_value, discount_total
FROM t_contracts WHERE discount_type IS NOT NULL ORDER BY created_at DESC LIMIT 5;
-- 2) Every block row carries custom_fields.list_price (step c)
SELECT count(*) AS blocks_missing_list_price
FROM t_contract_blocks b JOIN t_contracts c ON c.id=b.contract_id
WHERE c.created_at > now() - interval '1 day' AND NOT (b.custom_fields ? 'list_price');
-- 3) Activation generated per-asset rows = service events × covered assets
SELECT c.contract_number,
  (SELECT count(*) FROM t_contract_events e WHERE e.contract_id=c.id AND e.event_type='service' AND e.is_active) AS service_events,
  jsonb_array_length(coalesce(c.metadata->'wizard_state'->'equipmentDetails','[]'::jsonb)) AS covered_assets,
  (SELECT count(*) FROM t_contract_event_assets a WHERE a.contract_id=c.id AND a.is_active) AS asset_rows
FROM t_contracts c WHERE c.status='active' ORDER BY c.updated_at DESC LIMIT 5;
-- 4) Placeholders blocked until attached
SELECT status, count(*) FROM t_contract_event_assets GROUP BY status;
