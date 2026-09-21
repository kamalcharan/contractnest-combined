CREATE OR REPLACE FUNCTION public.evidence_confirm(p_evidence_id uuid, p_tenant_id uuid, p_size_bytes bigint, p_checksum text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_row t_contract_evidence%ROWTYPE; v_superseded int := 0;
BEGIN
    SELECT * INTO v_row FROM t_contract_evidence WHERE id = p_evidence_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'reason','evidence_not_found'); END IF;
    IF v_row.owner_tenant_id <> p_tenant_id THEN RETURN jsonb_build_object('success',false,'reason','not_owner'); END IF;
    IF v_row.status = 'active' THEN
        RETURN jsonb_build_object('success',true,'evidence_id',p_evidence_id,'already_confirmed',true,'usage',evidence_usage(p_tenant_id)); END IF;
    IF v_row.status <> 'pending' THEN RETURN jsonb_build_object('success',false,'reason','not_pending'); END IF;
    IF COALESCE(p_size_bytes,0) <= 0 THEN RETURN jsonb_build_object('success',false,'reason','size_required'); END IF;

    UPDATE t_contract_evidence SET size_bytes = p_size_bytes, checksum = COALESCE(p_checksum, checksum),
           status = 'active', confirmed_at = now() WHERE id = p_evidence_id;

    -- ── supersede the one it replaces ───────────────────────────────────────
    -- A singular identity asset has exactly one current value, so the previous
    -- object is dead the moment this one is confirmed. Marked (never deleted
    -- inline) so the StorageCleanup sweeper reclaims the bytes — and marked
    -- only AFTER the new object is confirmed, so a failed upload can never
    -- destroy the picture still on screen.
    --
    -- Which kinds are singular:
    --   avatar          one per USER  → scoped by uploaded_by as well
    --   logo            one per TENANT
    --   integration_qr  NOT superseded: a tenant can hold several integrations,
    --                   each with its own QR, and this row does not say which.
    --   block_icon      NOT superseded: one per catalog block, many per tenant.
    -- Both exclusions leave orphans the admin screen (batch G) can list and
    -- clear by hand; guessing here would delete a live image.
    IF v_row.scope = 'tenant' AND v_row.asset_kind IN ('avatar', 'logo') THEN
        UPDATE t_contract_evidence
           SET status = 'deleted', deleted_at = now()
         WHERE scope = 'tenant'
           AND status = 'active'
           AND id <> p_evidence_id
           AND owner_tenant_id = v_row.owner_tenant_id
           AND asset_kind      = v_row.asset_kind
           AND (v_row.asset_kind <> 'avatar'
                OR uploaded_by IS NOT DISTINCT FROM v_row.uploaded_by);
        GET DIAGNOSTICS v_superseded = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object('success',true,'evidence_id',p_evidence_id,'size_bytes',p_size_bytes,
                              'superseded',v_superseded,'usage',evidence_usage(p_tenant_id));
END; $fn$;

COMMENT ON FUNCTION public.evidence_confirm IS
  'Marks a pending registry row active with the size read back from Firebase. Idempotent. For a singular identity asset (avatar per user, logo per tenant) it also marks the previous object deleted so the sweeper reclaims it - after this one is confirmed, never before.';
