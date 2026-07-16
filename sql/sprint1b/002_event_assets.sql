-- ============================================================================
-- Sprint 1(b) · 002 — t_contract_event_assets: per-asset grain for service work
-- One row per service event × covered asset. Generated at activation.
-- Consumed by Sprints 3 (contract view), 6 (appointments), 7 (execution).
-- ============================================================================

CREATE TABLE IF NOT EXISTS t_contract_event_assets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  contract_id         uuid NOT NULL REFERENCES t_contracts(id),
  event_id            uuid NOT NULL REFERENCES t_contract_events(id),
  -- equipment_details entry id (wizard-generated) or asset_registry_id;
  -- kept loose (text) until assets are normalized into t_contract_assets
  asset_ref           text NOT NULL,
  asset_name          text,
  status              varchar(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','assigned','in_progress','proven','blocked_placeholder')),
  assignee            uuid,
  form_submission_id  uuid,
  evidence_id         uuid,
  proven_at           timestamptz,
  is_live             boolean NOT NULL DEFAULT true,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cea_event    ON t_contract_event_assets(event_id);
CREATE INDEX IF NOT EXISTS idx_cea_contract ON t_contract_event_assets(contract_id);
CREATE INDEX IF NOT EXISTS idx_cea_tenant_status ON t_contract_event_assets(tenant_id, status) WHERE is_active;
-- Idempotency: one row per event × asset
CREATE UNIQUE INDEX IF NOT EXISTS uq_cea_event_asset ON t_contract_event_assets(event_id, asset_ref);

-- ----------------------------------------------------------------------------
-- Generator: one row per SERVICE event × covered asset of the contract.
-- Assets read from metadata->wizard_state->equipmentDetails (current storage);
-- entries without asset_registry_id (or marked placeholder) start
-- blocked_placeholder. Idempotent via ON CONFLICT DO NOTHING.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_contract_event_assets(p_contract_id uuid, p_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE v_inserted integer := 0;
BEGIN
  WITH assets AS (
    SELECT
      coalesce(a->>'asset_registry_id', a->>'id') AS asset_ref,
      coalesce(a->>'item_name', a->>'name', 'Asset') AS asset_name,
      (a->>'asset_registry_id' IS NULL
        OR coalesce(a->'specifications'->>'placeholder', 'false') = 'true') AS is_placeholder
    FROM t_contracts c,
         jsonb_array_elements(coalesce(c.metadata->'wizard_state'->'equipmentDetails', '[]'::jsonb)) a
    WHERE c.id = p_contract_id AND c.tenant_id = p_tenant_id
  ), ins AS (
    INSERT INTO t_contract_event_assets
      (tenant_id, contract_id, event_id, asset_ref, asset_name, status, is_live)
    SELECT e.tenant_id, e.contract_id, e.id, a.asset_ref, a.asset_name,
           CASE WHEN a.is_placeholder THEN 'blocked_placeholder' ELSE 'open' END,
           e.is_live
    FROM t_contract_events e CROSS JOIN assets a
    WHERE e.contract_id = p_contract_id AND e.tenant_id = p_tenant_id
      AND e.event_type = 'service' AND e.is_active
    ON CONFLICT (event_id, asset_ref) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM ins;
  RETURN v_inserted;
END $fn$;

-- ----------------------------------------------------------------------------
-- Activation wiring: fires on the same status flip that materializes events.
-- Name 'trg_zz_…' sorts AFTER trg_queue_contract_events (PG fires same-event
-- triggers alphabetically) so the service events exist when this runs.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_generate_event_assets()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $fn$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM generate_contract_event_assets(NEW.id, NEW.tenant_id);
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_zz_generate_event_assets ON t_contracts;
CREATE TRIGGER trg_zz_generate_event_assets
  AFTER UPDATE OF status ON t_contracts
  FOR EACH ROW EXECUTE FUNCTION trg_fn_generate_event_assets();

-- ----------------------------------------------------------------------------
-- Placeholder flip: called when a real asset is attached to a placeholder
-- entry (step (c) wires the attach flow to this).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION unlock_placeholder_event_assets(
  p_contract_id uuid, p_tenant_id uuid, p_old_ref text, p_new_ref text
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE v_count integer;
BEGIN
  UPDATE t_contract_event_assets
  SET asset_ref = coalesce(p_new_ref, asset_ref),
      status = 'open', updated_at = now()
  WHERE contract_id = p_contract_id AND tenant_id = p_tenant_id
    AND asset_ref = p_old_ref AND status = 'blocked_placeholder' AND is_active;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $fn$;
