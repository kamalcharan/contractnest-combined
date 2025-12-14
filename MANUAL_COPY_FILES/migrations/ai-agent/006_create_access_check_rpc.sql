-- ============================================
-- ACCESS CHECK RPC
-- Uses existing t_group_memberships for RBAC
-- If user has active membership in group → has access
-- ============================================

-- ============================================
-- 1. MAIN FUNCTION: check_user_group_access
-- Checks if user has access to a group via membership
-- ============================================

CREATE OR REPLACE FUNCTION check_user_group_access(
    p_user_id UUID,
    p_group_id UUID
)
RETURNS TABLE (
    has_access BOOLEAN,
    scope VARCHAR,
    access_level VARCHAR,
    membership_id UUID,
    membership_status VARCHAR
) AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_membership RECORD;
BEGIN
    -- ============================================
    -- Check 1: Is user a product admin?
    -- ============================================
    SELECT is_admin INTO v_is_admin
    FROM public.t_user_profiles
    WHERE user_id = p_user_id;

    IF v_is_admin = true THEN
        RETURN QUERY SELECT
            true AS has_access,
            'product'::VARCHAR AS scope,
            'admin'::VARCHAR AS access_level,
            NULL::UUID AS membership_id,
            NULL::VARCHAR AS membership_status;
        RETURN;
    END IF;

    -- ============================================
    -- Check 2: Does user have active membership in group?
    -- User → t_user_tenants → t_group_memberships
    -- ============================================
    SELECT
        gm.id AS membership_id,
        gm.status AS membership_status
    INTO v_membership
    FROM public.t_group_memberships gm
    INNER JOIN public.t_user_tenants ut ON ut.tenant_id = gm.tenant_id
    WHERE ut.user_id = p_user_id
      AND gm.group_id = p_group_id
      AND gm.status = 'active'
      AND gm.is_active = true
      AND ut.status = 'active'
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT
            true AS has_access,
            'group'::VARCHAR AS scope,
            'member'::VARCHAR AS access_level,
            v_membership.membership_id,
            v_membership.membership_status::VARCHAR;
        RETURN;
    END IF;

    -- ============================================
    -- Check 3: Check for any membership (even non-active)
    -- Return info for debugging
    -- ============================================
    SELECT
        gm.id AS membership_id,
        gm.status AS membership_status
    INTO v_membership
    FROM public.t_group_memberships gm
    INNER JOIN public.t_user_tenants ut ON ut.tenant_id = gm.tenant_id
    WHERE ut.user_id = p_user_id
      AND gm.group_id = p_group_id
    LIMIT 1;

    IF FOUND THEN
        -- Has membership but not active
        RETURN QUERY SELECT
            false AS has_access,
            'group'::VARCHAR AS scope,
            'inactive_member'::VARCHAR AS access_level,
            v_membership.membership_id,
            v_membership.membership_status::VARCHAR;
        RETURN;
    END IF;

    -- ============================================
    -- No access
    -- ============================================
    RETURN QUERY SELECT
        false AS has_access,
        NULL::VARCHAR AS scope,
        NULL::VARCHAR AS access_level,
        NULL::UUID AS membership_id,
        NULL::VARCHAR AS membership_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. HELPER: Check Access by Phone
-- Combines user lookup + access check
-- ============================================

CREATE OR REPLACE FUNCTION check_phone_group_access(
    p_phone VARCHAR,
    p_group_id UUID
)
RETURNS TABLE (
    user_id UUID,
    user_name VARCHAR,
    has_access BOOLEAN,
    scope VARCHAR,
    access_level VARCHAR,
    membership_id UUID
) AS $$
DECLARE
    v_user RECORD;
    v_access RECORD;
BEGIN
    -- Get user by phone
    SELECT * INTO v_user FROM get_user_by_phone(p_phone);

    IF v_user.user_id IS NULL THEN
        -- User not found
        RETURN QUERY SELECT
            NULL::UUID AS user_id,
            NULL::VARCHAR AS user_name,
            false AS has_access,
            NULL::VARCHAR AS scope,
            'unknown_user'::VARCHAR AS access_level,
            NULL::UUID AS membership_id;
        RETURN;
    END IF;

    -- Check access
    SELECT * INTO v_access
    FROM check_user_group_access(v_user.user_id, p_group_id);

    RETURN QUERY SELECT
        v_user.user_id,
        v_user.name::VARCHAR AS user_name,
        v_access.has_access,
        v_access.scope::VARCHAR,
        v_access.access_level::VARCHAR,
        v_access.membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. HELPER: Get User's Accessible Groups
-- Returns all groups user has membership in
-- ============================================

CREATE OR REPLACE FUNCTION get_user_accessible_groups(p_user_id UUID)
RETURNS TABLE (
    group_id UUID,
    group_name VARCHAR,
    group_type VARCHAR,
    membership_id UUID,
    membership_status VARCHAR,
    ai_enabled BOOLEAN
) AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if product admin
    SELECT is_admin INTO v_is_admin
    FROM public.t_user_profiles
    WHERE user_id = p_user_id;

    IF v_is_admin = true THEN
        -- Admin can access all AI-enabled groups
        RETURN QUERY
        SELECT
            bg.id AS group_id,
            bg.group_name::VARCHAR,
            bg.group_type::VARCHAR,
            NULL::UUID AS membership_id,
            'admin'::VARCHAR AS membership_status,
            COALESCE((bg.settings->'ai_agent'->>'enabled')::BOOLEAN, false) AS ai_enabled
        FROM public.t_business_groups bg
        WHERE bg.is_active = true
        ORDER BY bg.group_name;
        RETURN;
    END IF;

    -- Return groups where user has membership
    RETURN QUERY
    SELECT
        bg.id AS group_id,
        bg.group_name::VARCHAR,
        bg.group_type::VARCHAR,
        gm.id AS membership_id,
        gm.status::VARCHAR AS membership_status,
        COALESCE((bg.settings->'ai_agent'->>'enabled')::BOOLEAN, false) AS ai_enabled
    FROM public.t_group_memberships gm
    INNER JOIN public.t_user_tenants ut ON ut.tenant_id = gm.tenant_id
    INNER JOIN public.t_business_groups bg ON bg.id = gm.group_id
    WHERE ut.user_id = p_user_id
      AND gm.status = 'active'
      AND gm.is_active = true
      AND ut.status = 'active'
      AND bg.is_active = true
    ORDER BY bg.group_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION check_user_group_access TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_group_access TO service_role;

GRANT EXECUTE ON FUNCTION check_phone_group_access TO authenticated;
GRANT EXECUTE ON FUNCTION check_phone_group_access TO service_role;

GRANT EXECUTE ON FUNCTION get_user_accessible_groups TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_groups TO service_role;

-- ============================================
-- 5. COMMENTS
-- ============================================

COMMENT ON FUNCTION check_user_group_access IS 'Checks if user has access to a group. Product admins have full access. Regular users need active membership.';
COMMENT ON FUNCTION check_phone_group_access IS 'Convenience function: looks up user by phone and checks group access in one call.';
COMMENT ON FUNCTION get_user_accessible_groups IS 'Returns all groups a user can access (via membership or admin status).';

-- ============================================
-- 6. VERIFICATION QUERIES
-- ============================================

/*
-- Test access check:

-- By user_id:
SELECT * FROM check_user_group_access(
    'user-uuid'::UUID,
    'group-uuid'::UUID
);

-- By phone:
SELECT * FROM check_phone_group_access(
    '+919876543210',
    'group-uuid'::UUID
);

-- Get all accessible groups for a user:
SELECT * FROM get_user_accessible_groups('user-uuid'::UUID);
*/
