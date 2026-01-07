-- ============================================================
-- Migration: 002_user_invitations_triggers_functions
-- Description: Triggers and functions for user invitations
-- Date: 2025-01-08
-- 
-- Functions:
--   - check_invitation_expiry() - EXISTING, auto-expire trigger
--   - cleanup_expired_invitations() - EXISTING, batch cleanup
--   - update_invitation_updated_at() - NEW, auto-update timestamp
-- ============================================================

-- ============================================================
-- 1. TRIGGER FUNCTION: Auto-expire on INSERT/UPDATE (EXISTING)
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_invitation_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-update status to expired if past expiry date
    IF NEW.expires_at < NOW() AND NEW.status IN ('pending', 'sent', 'resent') THEN
        NEW.status = 'expired';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trigger_check_invitation_expiry ON public.t_user_invitations;
CREATE TRIGGER trigger_check_invitation_expiry
    BEFORE INSERT OR UPDATE ON public.t_user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.check_invitation_expiry();

-- ============================================================
-- 2. BATCH FUNCTION: Cleanup expired invitations (EXISTING)
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE public.t_user_invitations
    SET status = 'expired'
    WHERE status IN ('pending', 'sent', 'resent')
      AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. TRIGGER FUNCTION: Auto-update updated_at (NEW)
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_invitation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invitation_updated_at ON public.t_user_invitations;
CREATE TRIGGER trigger_update_invitation_updated_at
    BEFORE UPDATE ON public.t_user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_invitation_updated_at();

-- ============================================================
-- 4. GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.check_invitation_expiry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_invitation_updated_at() TO authenticated;

-- ============================================================
-- END OF MIGRATION
-- ============================================================