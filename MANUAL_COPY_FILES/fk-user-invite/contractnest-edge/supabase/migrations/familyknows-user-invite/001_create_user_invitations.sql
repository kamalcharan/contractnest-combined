-- ============================================================
-- Migration: 001_create_user_invitations
-- Description: Create user invitations table for FamilyKnows
-- Author: Claude
-- Date: 2025-01-07
-- ============================================================

-- ============================================================
-- 1. USER INVITATIONS TABLE
-- This table stores all user invitations for both ContractNest and FamilyKnows
-- The x_product column differentiates between products
-- ============================================================

CREATE TABLE IF NOT EXISTS public.t_user_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.t_tenants(id) ON DELETE CASCADE,

    -- Invitation identification
    user_code VARCHAR(20) NOT NULL,           -- Short code for invite (e.g., FK-ABC123)
    secret_code VARCHAR(100) NOT NULL,         -- Secret validation code

    -- Invitee contact info (at least one required)
    email VARCHAR(255),
    mobile_number VARCHAR(20),

    -- Invitation method
    invitation_method VARCHAR(20) NOT NULL DEFAULT 'email'
        CHECK (invitation_method IN ('email', 'sms', 'whatsapp', 'link')),

    -- Role/Relationship assignment (FK to t_category_details)
    role_id UUID REFERENCES public.t_category_details(id),

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'viewed', 'accepted', 'expired', 'cancelled', 'revoked')),

    -- Who invited and who accepted
    invited_by UUID NOT NULL REFERENCES public.t_user_profiles(id),
    accepted_by UUID REFERENCES public.t_user_profiles(id),

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

-- ============================================================
-- 3. INVITATION AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS public.t_invitation_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invitation_id UUID NOT NULL REFERENCES public.t_user_invitations(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES public.t_user_profiles(id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_invitation_id ON public.t_invitation_audit_log(invitation_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.t_invitation_audit_log(created_at);

-- ============================================================
-- 4. UPDATED_AT TRIGGER
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
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.t_user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_invitation_audit_log ENABLE ROW LEVEL SECURITY;

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
-- END OF MIGRATION
-- ============================================================
