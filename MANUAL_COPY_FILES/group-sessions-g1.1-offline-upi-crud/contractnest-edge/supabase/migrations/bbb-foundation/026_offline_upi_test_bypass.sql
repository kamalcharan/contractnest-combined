-- 026_offline_upi_test_bypass.sql
-- Config-only providers (e.g. Offline UPI) have nothing to connect to. Two changes:
--   1) get_integration_provider now returns metadata so the edge test handler can
--      see metadata.config_only and short-circuit the connection test to success.
--   2) delete_tenant_integration RPC to back the DELETE (Remove) endpoint.
-- ALREADY APPLIED LIVE to project uwyqhzotluikawcboldr. Safe to re-run.
-- The edge function (functions/integrations/index.ts) was also redeployed (v64):
--   - returns { success:true } for config_only / offline_upi in /test
--   - adds DELETE .../tenant-integrations?id= -> delete_tenant_integration

CREATE OR REPLACE FUNCTION public.get_integration_provider(p_provider_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'display_name', display_name,
    'config_schema', config_schema,
    'metadata', metadata
  )
  INTO result
  FROM t_integration_providers
  WHERE id = p_provider_id;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_tenant_integration(p_tenant_id text, p_integration_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM t_tenant_integrations
  WHERE id = p_integration_id
    AND tenant_id = p_tenant_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Integration not found or not authorized');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;
