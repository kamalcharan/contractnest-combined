-- ============================================================
-- Migration: 003_rpc_user_invite
-- Description: RPC functions for FamilyKnows user invitations
-- Author: Claude
-- Date: 2025-01-07
-- ============================================================

-- ============================================================
-- 1. RPC: Create User Invitation
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_fk_user_invitation(
    p_tenant_id UUID,
    p_email VARCHAR DEFAULT NULL,
    p_mobile_number VARCHAR DEFAULT NULL,
    p_relationship_id UUID DEFAULT NULL,
    p_invitation_method VARCHAR DEFAULT 'email',
    p_expires_hours INTEGER DEFAULT 48,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (invitation_id UUID, user_code VARCHAR, secret_code VARCHAR, status VARCHAR, expires_at TIMESTAMPTZ) AS $$
DECLARE
    v_user_id UUID;
    v_invitation_id UUID;
    v_user_code VARCHAR;
    v_secret_code VARCHAR;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'User not authenticated'; END IF;
    IF p_email IS NULL AND p_mobile_number IS NULL THEN RAISE EXCEPTION 'Either email or mobile number is required'; END IF;

    IF NOT EXISTS (SELECT 1 FROM public.t_user_tenants WHERE tenant_id = p_tenant_id AND user_id = v_user_id AND is_active = true) THEN
        RAISE EXCEPTION 'User does not have permission to invite to this family space';
    END IF;

    IF p_email IS NOT NULL AND EXISTS (SELECT 1 FROM public.t_user_invitations WHERE tenant_id = p_tenant_id AND email = p_email AND status IN ('pending', 'sent') AND x_product = 'familyknows') THEN
        RAISE EXCEPTION 'An invitation is already pending for this email';
    END IF;

    v_user_code := public.generate_invite_user_code('familyknows');
    v_secret_code := encode(gen_random_bytes(32), 'hex');
    v_expires_at := NOW() + (p_expires_hours || ' hours')::INTERVAL;

    INSERT INTO public.t_user_invitations (tenant_id, user_code, secret_code, email, mobile_number, invitation_method, role_id, status, invited_by, expires_at, metadata, x_product)
    VALUES (p_tenant_id, v_user_code, v_secret_code, p_email, p_mobile_number, p_invitation_method, p_relationship_id, 'pending', v_user_id, v_expires_at, p_metadata, 'familyknows')
    RETURNING id INTO v_invitation_id;

    INSERT INTO public.t_invitation_audit_log (invitation_id, action, actor_id, new_status, metadata)
    VALUES (v_invitation_id, 'created', v_user_id, 'pending', jsonb_build_object('email', p_email, 'mobile_number', p_mobile_number, 'relationship_id', p_relationship_id));

    RETURN QUERY SELECT v_invitation_id, v_user_code, v_secret_code, 'pending'::VARCHAR, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. RPC: Validate Invitation
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_fk_invitation(p_user_code VARCHAR, p_secret_code VARCHAR DEFAULT NULL)
RETURNS TABLE (is_valid BOOLEAN, invitation_id UUID, tenant_id UUID, tenant_name VARCHAR, relationship_name VARCHAR, inviter_name VARCHAR, email VARCHAR, status VARCHAR, expires_at TIMESTAMPTZ, error_message VARCHAR) AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    SELECT i.*, t.name as tenant_name, cd.display_name as relationship_name, up.full_name as inviter_name
    INTO v_invitation
    FROM public.t_user_invitations i
    JOIN public.t_tenants t ON i.tenant_id = t.id
    LEFT JOIN public.t_category_details cd ON i.role_id = cd.id
    LEFT JOIN public.t_user_profiles up ON i.invited_by = up.id
    WHERE i.user_code = p_user_code AND i.x_product = 'familyknows';

    IF v_invitation.id IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::TIMESTAMPTZ, 'Invitation not found'::VARCHAR;
        RETURN;
    END IF;

    IF p_secret_code IS NOT NULL AND v_invitation.secret_code != p_secret_code THEN
        RETURN QUERY SELECT false, v_invitation.id, v_invitation.tenant_id, v_invitation.tenant_name::VARCHAR, v_invitation.relationship_name::VARCHAR, v_invitation.inviter_name::VARCHAR, v_invitation.email::VARCHAR, v_invitation.status::VARCHAR, v_invitation.expires_at, 'Invalid invitation code'::VARCHAR;
        RETURN;
    END IF;

    IF v_invitation.status = 'accepted' THEN
        RETURN QUERY SELECT false, v_invitation.id, v_invitation.tenant_id, v_invitation.tenant_name::VARCHAR, v_invitation.relationship_name::VARCHAR, v_invitation.inviter_name::VARCHAR, v_invitation.email::VARCHAR, v_invitation.status::VARCHAR, v_invitation.expires_at, 'Invitation already accepted'::VARCHAR;
        RETURN;
    END IF;

    IF v_invitation.status IN ('cancelled', 'revoked') THEN
        RETURN QUERY SELECT false, v_invitation.id, v_invitation.tenant_id, v_invitation.tenant_name::VARCHAR, v_invitation.relationship_name::VARCHAR, v_invitation.inviter_name::VARCHAR, v_invitation.email::VARCHAR, v_invitation.status::VARCHAR, v_invitation.expires_at, 'Invitation has been cancelled'::VARCHAR;
        RETURN;
    END IF;

    IF v_invitation.expires_at < NOW() THEN
        UPDATE public.t_user_invitations SET status = 'expired' WHERE id = v_invitation.id;
        RETURN QUERY SELECT false, v_invitation.id, v_invitation.tenant_id, v_invitation.tenant_name::VARCHAR, v_invitation.relationship_name::VARCHAR, v_invitation.inviter_name::VARCHAR, v_invitation.email::VARCHAR, 'expired'::VARCHAR, v_invitation.expires_at, 'Invitation has expired'::VARCHAR;
        RETURN;
    END IF;

    IF v_invitation.viewed_at IS NULL THEN
        UPDATE public.t_user_invitations SET viewed_at = NOW(), status = 'viewed' WHERE id = v_invitation.id AND viewed_at IS NULL;
    END IF;

    RETURN QUERY SELECT true, v_invitation.id, v_invitation.tenant_id, v_invitation.tenant_name::VARCHAR, v_invitation.relationship_name::VARCHAR, v_invitation.inviter_name::VARCHAR, v_invitation.email::VARCHAR, v_invitation.status::VARCHAR, v_invitation.expires_at, NULL::VARCHAR;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. RPC: Accept Invitation
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_fk_invitation(p_user_code VARCHAR, p_secret_code VARCHAR, p_user_id UUID DEFAULT NULL)
RETURNS TABLE (success BOOLEAN, user_tenant_id UUID, tenant_id UUID, error_message VARCHAR) AS $$
DECLARE
    v_invitation RECORD;
    v_user_id UUID;
    v_user_tenant_id UUID;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());
    IF v_user_id IS NULL THEN RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'User not authenticated'::VARCHAR; RETURN; END IF;

    SELECT * INTO v_invitation FROM public.t_user_invitations WHERE user_code = p_user_code AND secret_code = p_secret_code AND x_product = 'familyknows';

    IF v_invitation.id IS NULL THEN RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Invalid invitation'::VARCHAR; RETURN; END IF;
    IF v_invitation.status = 'accepted' THEN RETURN QUERY SELECT false, NULL::UUID, v_invitation.tenant_id, 'Invitation already accepted'::VARCHAR; RETURN; END IF;
    IF v_invitation.expires_at < NOW() THEN
        UPDATE public.t_user_invitations SET status = 'expired' WHERE id = v_invitation.id;
        RETURN QUERY SELECT false, NULL::UUID, v_invitation.tenant_id, 'Invitation has expired'::VARCHAR; RETURN;
    END IF;

    SELECT id INTO v_user_tenant_id FROM public.t_user_tenants WHERE tenant_id = v_invitation.tenant_id AND user_id = v_user_id;

    IF v_user_tenant_id IS NOT NULL THEN
        UPDATE public.t_user_invitations SET status = 'accepted', accepted_by = v_user_id, accepted_at = NOW() WHERE id = v_invitation.id;
        RETURN QUERY SELECT true, v_user_tenant_id, v_invitation.tenant_id, 'User already a member'::VARCHAR; RETURN;
    END IF;

    INSERT INTO public.t_user_tenants (tenant_id, user_id, is_active, joined_via) VALUES (v_invitation.tenant_id, v_user_id, true, 'invitation') RETURNING id INTO v_user_tenant_id;

    IF v_invitation.role_id IS NOT NULL THEN
        INSERT INTO public.t_user_tenant_roles (user_tenant_id, role_id) VALUES (v_user_tenant_id, v_invitation.role_id) ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.t_user_invitations SET status = 'accepted', accepted_by = v_user_id, accepted_at = NOW() WHERE id = v_invitation.id;

    INSERT INTO public.t_invitation_audit_log (invitation_id, action, actor_id, old_status, new_status) VALUES (v_invitation.id, 'accepted', v_user_id, v_invitation.status, 'accepted');

    RETURN QUERY SELECT true, v_user_tenant_id, v_invitation.tenant_id, NULL::VARCHAR;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. RPC: Cancel Invitation
-- ============================================================

CREATE OR REPLACE FUNCTION public.cancel_fk_invitation(p_invitation_id UUID)
RETURNS TABLE (success BOOLEAN, error_message VARCHAR) AS $$
DECLARE
    v_user_id UUID;
    v_invitation RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN QUERY SELECT false, 'User not authenticated'::VARCHAR; RETURN; END IF;

    SELECT * INTO v_invitation FROM public.t_user_invitations WHERE id = p_invitation_id AND x_product = 'familyknows';

    IF v_invitation.id IS NULL THEN RETURN QUERY SELECT false, 'Invitation not found'::VARCHAR; RETURN; END IF;
    IF v_invitation.invited_by != v_user_id AND NOT EXISTS (SELECT 1 FROM public.t_user_tenants ut JOIN public.t_user_tenant_roles utr ON ut.id = utr.user_tenant_id JOIN public.t_category_details cd ON utr.role_id = cd.id WHERE ut.tenant_id = v_invitation.tenant_id AND ut.user_id = v_user_id AND cd.sub_cat_name = 'OWNER') THEN
        RETURN QUERY SELECT false, 'Permission denied'::VARCHAR; RETURN;
    END IF;
    IF v_invitation.status NOT IN ('pending', 'sent', 'viewed') THEN RETURN QUERY SELECT false, 'Cannot cancel in current status'::VARCHAR; RETURN; END IF;

    UPDATE public.t_user_invitations SET status = 'cancelled', cancelled_at = NOW() WHERE id = p_invitation_id;
    INSERT INTO public.t_invitation_audit_log (invitation_id, action, actor_id, old_status, new_status) VALUES (p_invitation_id, 'cancelled', v_user_id, v_invitation.status, 'cancelled');

    RETURN QUERY SELECT true, NULL::VARCHAR;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. RPC: List Invitations
-- ============================================================

CREATE OR REPLACE FUNCTION public.list_fk_invitations(p_tenant_id UUID, p_status VARCHAR DEFAULT NULL, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (id UUID, user_code VARCHAR, email VARCHAR, mobile_number VARCHAR, invitation_method VARCHAR, relationship_name VARCHAR, status VARCHAR, inviter_name VARCHAR, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ, accepted_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT i.id, i.user_code::VARCHAR, i.email::VARCHAR, i.mobile_number::VARCHAR, i.invitation_method::VARCHAR, cd.display_name::VARCHAR, i.status::VARCHAR, up.full_name::VARCHAR, i.expires_at, i.created_at, i.accepted_at
    FROM public.t_user_invitations i
    LEFT JOIN public.t_category_details cd ON i.role_id = cd.id
    LEFT JOIN public.t_user_profiles up ON i.invited_by = up.id
    WHERE i.tenant_id = p_tenant_id AND i.x_product = 'familyknows' AND (p_status IS NULL OR i.status = p_status)
    ORDER BY i.created_at DESC LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. RPC: Resend Invitation
-- ============================================================

CREATE OR REPLACE FUNCTION public.resend_fk_invitation(p_invitation_id UUID, p_extend_hours INTEGER DEFAULT 48)
RETURNS TABLE (success BOOLEAN, new_expires_at TIMESTAMPTZ, error_message VARCHAR) AS $$
DECLARE
    v_user_id UUID;
    v_invitation RECORD;
    v_new_expires TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 'User not authenticated'::VARCHAR; RETURN; END IF;

    SELECT * INTO v_invitation FROM public.t_user_invitations WHERE id = p_invitation_id AND x_product = 'familyknows';
    IF v_invitation.id IS NULL THEN RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 'Invitation not found'::VARCHAR; RETURN; END IF;
    IF v_invitation.status NOT IN ('pending', 'sent', 'expired') THEN RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 'Cannot resend in current status'::VARCHAR; RETURN; END IF;

    v_new_expires := NOW() + (p_extend_hours || ' hours')::INTERVAL;
    UPDATE public.t_user_invitations SET expires_at = v_new_expires, status = 'pending', sent_at = NULL WHERE id = p_invitation_id;
    INSERT INTO public.t_invitation_audit_log (invitation_id, action, actor_id, old_status, new_status, metadata) VALUES (p_invitation_id, 'resent', v_user_id, v_invitation.status, 'pending', jsonb_build_object('new_expires_at', v_new_expires));

    RETURN QUERY SELECT true, v_new_expires, NULL::VARCHAR;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
