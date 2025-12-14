-- ============================================
-- USER LOOKUP RPC
-- Finds user by phone number from t_user_profiles
-- Supports flexible phone matching
-- ============================================

-- ============================================
-- 1. MAIN FUNCTION: get_user_by_phone
-- ============================================

CREATE OR REPLACE FUNCTION get_user_by_phone(p_phone VARCHAR)
RETURNS TABLE (
    user_id UUID,
    name VARCHAR,
    email VARCHAR,
    mobile_number VARCHAR,
    country_code VARCHAR,
    preferred_language VARCHAR,
    is_admin BOOLEAN
) AS $$
DECLARE
    v_phone_digits VARCHAR;
BEGIN
    -- Normalize phone: remove all non-digits
    v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');

    -- Try multiple matching strategies for flexibility
    RETURN QUERY
    SELECT
        up.user_id,
        (up.first_name || ' ' || up.last_name)::VARCHAR AS name,
        up.email::VARCHAR,
        up.mobile_number::VARCHAR,
        up.country_code::VARCHAR,
        up.preferred_language::VARCHAR,
        up.is_admin
    FROM public.t_user_profiles up
    WHERE
        -- Strategy 1: Exact match with country_code + mobile_number
        (COALESCE(up.country_code, '') || up.mobile_number) = v_phone_digits
        -- Strategy 2: Match mobile_number only (same country assumed)
        OR up.mobile_number = v_phone_digits
        -- Strategy 3: Match last 10 digits (India mobile numbers)
        OR up.mobile_number = RIGHT(v_phone_digits, 10)
        -- Strategy 4: Match without leading country code
        OR (up.country_code || up.mobile_number) = v_phone_digits
    ORDER BY
        -- Prefer exact matches
        CASE
            WHEN (COALESCE(up.country_code, '') || up.mobile_number) = v_phone_digits THEN 1
            WHEN up.mobile_number = v_phone_digits THEN 2
            ELSE 3
        END
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. HELPER FUNCTION: Normalize Phone
-- Utility to normalize phone numbers
-- ============================================

CREATE OR REPLACE FUNCTION normalize_phone(p_phone VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
    -- Remove all non-digits
    RETURN regexp_replace(p_phone, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 3. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION get_user_by_phone TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_phone TO service_role;

GRANT EXECUTE ON FUNCTION normalize_phone TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_phone TO service_role;

-- ============================================
-- 4. COMMENTS
-- ============================================

COMMENT ON FUNCTION get_user_by_phone IS 'Looks up user from t_user_profiles by phone number. Supports flexible matching: full E.164, mobile only, or last 10 digits.';
COMMENT ON FUNCTION normalize_phone IS 'Normalizes phone number by removing all non-digit characters';

-- ============================================
-- 5. VERIFICATION QUERY
-- ============================================

/*
-- Test the function:

SELECT * FROM get_user_by_phone('+919876543210');
SELECT * FROM get_user_by_phone('919876543210');
SELECT * FROM get_user_by_phone('9876543210');

-- Should all return the same user if they have mobile_number = '9876543210'
*/
