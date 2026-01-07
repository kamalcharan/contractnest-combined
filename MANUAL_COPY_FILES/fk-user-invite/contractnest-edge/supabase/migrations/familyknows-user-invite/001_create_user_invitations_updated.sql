-- ============================================================
-- Migration: 001_create_user_invitations_v2
-- Description: Create/Update user invitations table for FamilyKnows
-- Author: Claude
-- Date: 2025-01-08
-- 
-- CHANGES FROM ORIGINAL:
-- 1. Added missing columns: country_code, phone_code, resent_count, 
--    last_resent_at, last_resent_by, created_by, cancelled_by
-- 2. Fixed audit log columns: actor_id -> performed_by, added performed_at
-- 3. Fixed trigger: removed check_invitation_expiry, added updated_at trigger
-- ============================================================

-- ============================================================
-- 1. USER INVITATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.t_user_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.t_tenants(id) ON DELETE CASCADE,

    -- Invitation identification
    user_code VARCHAR(20) NOT NULL,
    secret_code VARCHAR(100) NOT NULL,

    -- Invitee contact info (at least one required)
    email VARCHAR(255),
    mobile_number VARCHAR(20),
    country_code VARCHAR(5),                   -- NEW: Country code (e.g., 'IN', 'US')
    phone_code VARCHAR(5),                     -- NEW: Phone dialing code (e.g., '91', '1')

    -- Invitation method
    invitation_method VARCHAR(20) NOT NULL DEFAULT 'email'
        CHECK (invitation_method IN ('email', 'sms', 'whatsapp', 'link')),

    -- Role/Relationship assignment (FK to t_category_details)
    role_id UUID REFERENCES public.t_category_details(id),

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'resent', 'viewed', 'accepted', 'expired', 'cancelled', 'revoked')),

    -- Who invited and who accepted
    invited_by UUID NOT NULL REFERENCES public.t_user_profiles(id),
    accepted_by UUID REFERENCES public.t_user_profiles(id),
    created_by UUID REFERENCES public.t_user_profiles(id),      -- NEW: Who created the invitation
    cancelled_by UUID REFERENCES public.t_user_profiles(id),    -- NEW: Who cancelled the invitation

    -- Resend tracking
    resent_count INTEGER DEFAULT 0,                              -- NEW: Number of times resent
    last_resent_at TIMESTAMP WITH TIME ZONE,                     -- NEW: Last resend timestamp
    last_resent_by UUID REFERENCES public.t_user_profiles(id),   -- NEW: Who last resent

    -- Timestamps
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,

    -- Metadata (flexible JSON for additional info)
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Product differentiation
    x_product VARCHAR(50) NOT NULL DEFAULT 'contractnest'
        CHECK (x_product IN ('contractnest', 'familyknows')),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_contact_info CHECK (email IS NOT NULL OR mobile_number IS NOT NULL),
    CONSTRAINT unique_user_code UNIQUE (user_code)
);

-- ============================================================
-- 1.1 ADD MISSING COLUMNS (for existing tables)
-- ============================================================

DO $$
BEGIN
    -- Add country_code if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 't_user_invitations' 
                   AND column_name = 'country_code') THEN
        ALTER TABLE public.t_user_invitations ADD COLUMN country_code VARCHAR(5);
    END IF;

    -- Add phone_code if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 't_user_invitations' 
                   AND column_name = 'phone_code') THEN
        ALTER TABLE public.t_user_invitations ADD COLUMN phone_code VARCHAR(5);
    END IF;

    -- Add resent_count if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 't_user_invitations' 
                   AND column_name = 'resent_count') THEN
        ALTER TABLE public.t_user_invitations ADD COLUMN resent_count INTEGER DEFAULT 0;
    END IF;

    -- Add last_resent_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 't_user_invitations' 
                   AND column_name = 'last_resent_at') THEN
        ALTER TABLE public.t_user_invitations ADD COLUMN last_resent_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add last_resent_by if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 't_user_invitations' 
                   AND column_name = 'last_resent_by') THEN
        ALTER TABLE public.t_user_invitations ADD COLUMN last_resent_by UUID REFERENCES public.t_user_profiles(id);
    END IF;

    -- Add created_by if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 't_user_invitations' 
                   AND column_name = 'created_by') THEN
        ALTER TABLE public.t_user_invitations ADD COLUMN created_by UUID REFERENCES public.t_user_profiles(id);
    END IF;

    -- Add cancelled_by if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 't_user_invitations' 
                   AND column_name = 'cancelled_by') THEN
        ALTER TABLE public.t_user_invitations ADD COLUMN cancelled_by UUID REFERENCES public.t_user_profiles(id);
    END IF;

    -- Update status check constraint to include 'resent'
    ALTER TABLE public.t_user_invitations DROP CONSTRAINT IF EXISTS t_user_invitations_status_check;
    ALTER TABLE public.t_user_invitations ADD CONSTRAINT t_user_invitations_status_check 
        CHECK (status IN ('pending', 'sent', 'resent', 'viewed', 'accepted', 'expired', 'cancelled', 'revoked'));

END $$;

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON public.t_user_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.t_user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_mobile ON public.t_user_invitations(mobile_number);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.t_user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_user_code ON public.t_user_invitations(user_code);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON public.t_user_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.t_user_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_x_product ON public.t_user_invitations(x_product);
CREATE INDEX IF NOT EXISTS idx_invitations_role_id ON public.t_user_invitations(role_id);
CREATE INDEX IF NOT EXISTS idx_invitations_created_by ON public.t_user_invitations(created_by);

-- ============================================================
-- 3. INVITATION AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS public.t_invitation_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invitation_id UUID NOT NULL REFERENCES public.t_user_invitations(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    performed_by UUID REFERENCES public.t_user_profiles(id),    -- Changed from actor_id
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),        -- Added for edge function compatibility
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.1 FIX AUDIT LOG COLUMNS (for existing tables)
-- ============================================================

DO $$
BEGIN
    -- Rename actor_id to performed_by if actor_id exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 't_invitation_audit_log' 
               AND column_name = 'actor_id') THEN
        ALTER TABLE public.t_invitation_audit_log RENAME COLUMN actor_id TO performed_by;
    END IF;

    -- Add performed_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 't_invitation_audit_log' 
                   AND column_name = 'performed_at') THEN
        ALTER TABLE public.t_invitation_audit_log 
            ADD COLUMN performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Backfill performed_at from created_at for existing records
        UPDATE public.t_invitation_audit_log 
        SET performed_at = created_at 
        WHERE performed_at IS NULL;
    END IF;
END $$;

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_invitation_id ON public.t_invitation_audit_log(invitation_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.t_invitation_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON public.t_invitation_audit_log(performed_at);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON public.t_invitation_audit_log(performed_by);

-- ============================================================
-- 4. TRIGGERS - FIX DISCREPANCY
-- ============================================================

-- 4.1 Remove the incorrect trigger (check_invitation_expiry)
DROP TRIGGER IF EXISTS trigger_check_invitation_expiry ON public.t_user_invitations;
DROP FUNCTION IF EXISTS public.check_invitation_expiry();

-- 4.2 Create the updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_invitation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.3 Create the updated_at trigger
DROP TRIGGER IF EXISTS trigger_update_invitation_updated_at ON public.t_user_invitations;
CREATE TRIGGER trigger_update_invitation_updated_at
    BEFORE UPDATE ON public.t_user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_invitation_updated_at();

-- 4.4 OPTIONAL: Create auto-expire trigger (if you want automatic expiry checking)
-- This replaces the old check_invitation_expiry with a better implementation
CREATE OR REPLACE FUNCTION public.auto_expire_invitations()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check on SELECT/UPDATE operations for pending/sent/resent status
    IF NEW.status IN ('pending', 'sent', 'resent') AND NEW.expires_at < NOW() THEN
        NEW.status = 'expired';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_expire_invitations ON public.t_user_invitations;
CREATE TRIGGER trigger_auto_expire_invitations
    BEFORE UPDATE ON public.t_user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_expire_invitations();

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.t_user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_invitation_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "tenant_invitations_select" ON public.t_user_invitations;
DROP POLICY IF EXISTS "tenant_invitations_insert" ON public.t_user_invitations;
DROP POLICY IF EXISTS "tenant_invitations_update" ON public.t_user_invitations;
DROP POLICY IF EXISTS "tenant_audit_select" ON public.t_invitation_audit_log;
DROP POLICY IF EXISTS "tenant_audit_insert" ON public.t_invitation_audit_log;

-- Policy: Users can view invitations for their tenant
CREATE POLICY "tenant_invitations_select" ON public.t_user_invitations
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.t_user_tenants
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Policy: Users can insert invitations for their tenant
CREATE POLICY "tenant_invitations_insert" ON public.t_user_invitations
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.t_user_tenants
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Policy: Users can update invitations they created or for their tenant
CREATE POLICY "tenant_invitations_update" ON public.t_user_invitations
    FOR UPDATE
    USING (
        invited_by = auth.uid() OR
        tenant_id IN (
            SELECT tenant_id FROM public.t_user_tenants
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Policy: Audit log readable by tenant members
CREATE POLICY "tenant_audit_select" ON public.t_invitation_audit_log
    FOR SELECT
    USING (
        invitation_id IN (
            SELECT id FROM public.t_user_invitations
            WHERE tenant_id IN (
                SELECT tenant_id FROM public.t_user_tenants
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

-- Policy: Audit log insertable by tenant members
CREATE POLICY "tenant_audit_insert" ON public.t_invitation_audit_log
    FOR INSERT
    WITH CHECK (
        invitation_id IN (
            SELECT id FROM public.t_user_invitations
            WHERE tenant_id IN (
                SELECT tenant_id FROM public.t_user_tenants
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

-- ============================================================
-- 6. HELPER FUNCTION: Generate Unique User Code
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_invite_user_code(product VARCHAR DEFAULT 'familyknows')
RETURNS VARCHAR AS $$
DECLARE
    prefix VARCHAR(3);
    code VARCHAR(20);
    exists_check BOOLEAN;
BEGIN
    -- Set prefix based on product
    IF product = 'familyknows' THEN
        prefix := 'FK-';
    ELSE
        prefix := 'CN-';
    END IF;

    -- Generate unique code
    LOOP
        code := prefix || upper(substring(md5(random()::text) from 1 for 6));
        SELECT EXISTS(SELECT 1 FROM public.t_user_invitations WHERE user_code = code) INTO exists_check;
        EXIT WHEN NOT exists_check;
    END LOOP;

    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. HELPER VIEW: Invitations with computed expiry status
-- ============================================================

CREATE OR REPLACE VIEW public.v_user_invitations_with_status AS
SELECT 
    i.*,
    CASE 
        WHEN i.status IN ('pending', 'sent', 'resent') AND i.expires_at < NOW() THEN true
        ELSE false
    END AS is_expired,
    CASE 
        WHEN i.status IN ('pending', 'sent', 'resent') AND i.expires_at >= NOW() THEN
            i.expires_at - NOW()
        ELSE NULL
    END AS time_remaining,
    up_inviter.first_name || ' ' || up_inviter.last_name AS inviter_name,
    up_inviter.email AS inviter_email
FROM public.t_user_invitations i
LEFT JOIN public.t_user_profiles up_inviter ON i.invited_by = up_inviter.user_id;

-- ============================================================
-- END OF MIGRATION
-- ============================================================