-- ============================================================================
-- bbb-foundation/024_mark_due_paid.sql
-- Phase F: let the chair mark a due COLLECTED directly (cash/offline), beyond
-- confirming a member-declared UPI payment at check-in. Flips the billing
-- event's status to 'paid' (or back to 'scheduled' to undo). Tenant-scoped via
-- the owning contract. SECURITY DEFINER; RLS-on-no-policies. Idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION gs_mark_due_paid(p_tenant uuid, p_billing_event uuid, p_paid boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_new text := CASE WHEN p_paid THEN 'paid' ELSE 'scheduled' END; v_id uuid;
BEGIN
  UPDATE t_contract_events e
     SET status = v_new, updated_at = now()
   WHERE e.id = p_billing_event AND e.event_type = 'billing'
     AND e.contract_id IN (SELECT id FROM t_contracts WHERE tenant_id = p_tenant)
  RETURNING e.id INTO v_id;
  IF v_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  RETURN jsonb_build_object('ok', true, 'billing_event_id', v_id, 'status', v_new);
END $$;

GRANT EXECUTE ON FUNCTION gs_mark_due_paid(uuid,uuid,boolean) TO authenticated, service_role;
