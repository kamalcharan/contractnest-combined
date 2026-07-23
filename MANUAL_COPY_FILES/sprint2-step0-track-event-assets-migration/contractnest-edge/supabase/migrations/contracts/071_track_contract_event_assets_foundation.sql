-- 071_track_contract_event_assets_foundation.sql
-- Sprint 2/7 pilot, Step 0 (housekeeping, no behavior change).
--
-- t_contract_event_assets and the three functions/trigger that generate and
-- unlock its rows (generate_contract_event_assets, trg_fn_generate_event_assets
-- + its trigger trg_zz_generate_event_assets, unlock_placeholder_event_assets)
-- have been live in Supabase since Sprint 1 but were never captured in any
-- tracked migration file -- the only prior reference to this table anywhere
-- in migrations/ was a comment in 058_equipment_placeholder_attach.sql, not
-- actual DDL. Same "live but untracked" risk pattern that caused the
-- tax-settings RPC bug earlier -- closing it before building Sprint 2/7 work
-- on top of this foundation.
--
-- Everything below is written to exactly match what's already live (pulled
-- via pg_get_functiondef/pg_get_triggerdef/information_schema against project
-- uwyqhzotluikawcboldr before writing this file). CREATE TABLE IF NOT EXISTS,
-- CREATE OR REPLACE FUNCTION, and CREATE INDEX IF NOT EXISTS make this a safe
-- no-op re-apply -- it changes nothing, it just gives this foundation a git
-- history for the first time. Confirmed no rows/behavior affected.

CREATE TABLE IF NOT EXISTS t_contract_event_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  contract_id uuid NOT NULL REFERENCES t_contracts(id),
  event_id uuid NOT NULL REFERENCES t_contract_events(id),
  asset_ref text NOT NULL,
  asset_name text,
  status character varying NOT NULL DEFAULT 'open'
    CHECK (status::text = ANY (ARRAY['open','assigned','in_progress','proven','blocked_placeholder']::text[])),
  assignee uuid,
  form_submission_id uuid,
  evidence_id uuid,
  proven_at timestamp with time zone,
  is_live boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cea_event_asset
  ON t_contract_event_assets USING btree (event_id, asset_ref);

CREATE INDEX IF NOT EXISTS idx_cea_contract
  ON t_contract_event_assets USING btree (contract_id);

CREATE INDEX IF NOT EXISTS idx_cea_tenant_status
  ON t_contract_event_assets USING btree (tenant_id, status) WHERE is_active;

-- Generates one t_contract_event_assets row per (service event x covered
-- asset) from the contract's equipment_details. Placeholders (no
-- asset_registry_id, or specifications.placeholder='true') start
-- 'blocked_placeholder'; real assets start 'open'. Idempotent via the
-- uq_cea_event_asset unique index (ON CONFLICT DO NOTHING).
CREATE OR REPLACE FUNCTION public.generate_contract_event_assets(p_contract_id uuid, p_tenant_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_inserted integer := 0;
BEGIN
  WITH assets AS (
    SELECT
      coalesce(a->>'asset_registry_id', a->>'id') AS asset_ref,
      coalesce(a->>'item_name', a->>'name', 'Asset') AS asset_name,
      (a->>'asset_registry_id' IS NULL
        OR coalesce(a->'specifications'->>'placeholder', 'false') = 'true') AS is_placeholder
    FROM t_contracts c,
         jsonb_array_elements(coalesce(c.equipment_details, '[]'::jsonb)) a
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
END $function$;

-- Fires generate_contract_event_assets() the moment a contract's status
-- flips to 'active'.
CREATE OR REPLACE FUNCTION public.trg_fn_generate_event_assets()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM generate_contract_event_assets(NEW.id, NEW.tenant_id);
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_zz_generate_event_assets ON t_contracts;
CREATE TRIGGER trg_zz_generate_event_assets
  AFTER UPDATE OF status ON public.t_contracts
  FOR EACH ROW EXECUTE FUNCTION trg_fn_generate_event_assets();

-- Sprint 3's "attach real asset to a placeholder" action: flips the matching
-- blocked_placeholder row(s) to 'open' once client lists a real asset.
CREATE OR REPLACE FUNCTION public.unlock_placeholder_event_assets(p_contract_id uuid, p_tenant_id uuid, p_old_ref text, p_new_ref text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count integer;
BEGIN
  UPDATE t_contract_event_assets
  SET asset_ref = coalesce(p_new_ref, asset_ref),
      status = 'open', updated_at = now()
  WHERE contract_id = p_contract_id AND tenant_id = p_tenant_id
    AND asset_ref = p_old_ref AND status = 'blocked_placeholder' AND is_active;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $function$;

-- ============================================================================
-- CONFIRMED STATE AT TIME OF WRITING (not part of the schema, for context):
-- 12 live rows, all status='open'. No code anywhere yet sets 'assigned',
-- 'in_progress', or 'proven' -- that's exactly the Sprint 6 (appointment
-- assigns a technician) and Sprint 7 (proving) work this pilot builds toward.
-- Not a bug; there's simply been no execution UI to move them until now.
-- ============================================================================
