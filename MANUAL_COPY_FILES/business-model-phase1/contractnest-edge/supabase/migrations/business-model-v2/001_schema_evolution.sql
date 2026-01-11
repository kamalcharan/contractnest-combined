-- ============================================================
-- Migration: 001_schema_evolution
-- Description: Evolve existing Business Model tables for composite billing
-- Author: Claude Code Session
-- Date: 2025-01-11
-- Phase: 1 - Schema & Product Configs (Deliverable 1)
-- ============================================================

-- ============================================================
-- OVERVIEW
-- ============================================================
-- This migration evolves existing Business Model tables to support:
--   1. Composite billing (base fee + usage + credits + add-ons)
--   2. Multi-product support (ContractNest, FamilyKnows, Kaladristi)
--   3. Trial and grace period management
--   4. Razorpay integration fields
--   5. Enhanced usage tracking for billing calculations
--
-- Design Principles:
--   - Non-breaking changes only (ADD COLUMN IF NOT EXISTS)
--   - All new columns have defaults or allow NULL
--   - Existing data preserved
--   - Constraints updated safely (DROP + ADD pattern)
--
-- Tables Modified:
--   1. t_bm_plan_version         - Add billing_config JSONB
--   2. t_bm_tenant_subscription  - Add product/trial/grace/razorpay fields
--   3. t_bm_subscription_usage   - Add tenant_id, metric_type, recording fields
--   4. t_bm_invoice              - Add invoice_type, razorpay fields, line_items
-- ============================================================

-- ============================================================
-- 1. t_bm_plan_version - Add billing_config
-- ============================================================
-- Purpose: Store complete billing configuration as JSONB
-- This replaces the need for multiple columns and allows flexible
-- product-specific billing models

ALTER TABLE public.t_bm_plan_version
    ADD COLUMN IF NOT EXISTS billing_config JSONB DEFAULT '{}';

COMMENT ON COLUMN public.t_bm_plan_version.billing_config IS
'Complete billing configuration for this plan version. Structure:
{
  "billing_model": "composite|tiered|usage|flat",
  "product_code": "contractnest|familyknows|kaladristi|custom",
  "base_fee": { "amount": 500, "cycle": "monthly", "included_users": 2, "user_tiers": [...] },
  "unit_charges": { "contract": { "base_price": 150, "tiers": [...] } },
  "storage": { "included_mb": 40, "overage_per_mb": 0.50 },
  "credits": { "notifications": { "included": 10, "topup_packs": [...] } },
  "addons": { "vani_ai": { "price": 5000, "cycle": "monthly" } },
  "trial": { "days": 14, "features_included": "all" },
  "grace_period": { "days": 7, "access_level": "full" }
}';

-- Add index for querying by product_code within billing_config
CREATE INDEX IF NOT EXISTS idx_bm_plan_version_product_code
    ON public.t_bm_plan_version ((billing_config->>'product_code'))
    WHERE billing_config->>'product_code' IS NOT NULL;


-- ============================================================
-- 2. t_bm_tenant_subscription - Add subscription lifecycle fields
-- ============================================================
-- Purpose: Track full subscription lifecycle including trial, grace period,
-- suspension, and Razorpay integration

-- Add product code for multi-product support
ALTER TABLE public.t_bm_tenant_subscription
    ADD COLUMN IF NOT EXISTS product_code TEXT;

COMMENT ON COLUMN public.t_bm_tenant_subscription.product_code IS
'Product identifier: contractnest, familyknows, kaladristi, custom';

-- Add explicit trial tracking (trial_ends exists but we need start)
ALTER TABLE public.t_bm_tenant_subscription
    ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;

COMMENT ON COLUMN public.t_bm_tenant_subscription.trial_start_date IS
'When the trial period started (trial_ends already exists)';

-- Add grace period tracking
ALTER TABLE public.t_bm_tenant_subscription
    ADD COLUMN IF NOT EXISTS grace_start_date TIMESTAMPTZ;

ALTER TABLE public.t_bm_tenant_subscription
    ADD COLUMN IF NOT EXISTS grace_end_date TIMESTAMPTZ;

COMMENT ON COLUMN public.t_bm_tenant_subscription.grace_start_date IS
'When grace period started after payment failure';

COMMENT ON COLUMN public.t_bm_tenant_subscription.grace_end_date IS
'When grace period ends (account will be suspended if not paid)';

-- Add suspension tracking
ALTER TABLE public.t_bm_tenant_subscription
    ADD COLUMN IF NOT EXISTS suspension_date TIMESTAMPTZ;

COMMENT ON COLUMN public.t_bm_tenant_subscription.suspension_date IS
'When account was suspended due to non-payment';

-- Add next billing date for easier scheduling
ALTER TABLE public.t_bm_tenant_subscription
    ADD COLUMN IF NOT EXISTS next_billing_date DATE;

COMMENT ON COLUMN public.t_bm_tenant_subscription.next_billing_date IS
'Next billing cycle date for this subscription';

-- Add Razorpay subscription reference
ALTER TABLE public.t_bm_tenant_subscription
    ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;

COMMENT ON COLUMN public.t_bm_tenant_subscription.razorpay_subscription_id IS
'Razorpay subscription ID for recurring payments';

-- Add metadata for flexible storage
ALTER TABLE public.t_bm_tenant_subscription
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN public.t_bm_tenant_subscription.metadata IS
'Flexible metadata storage for subscription-specific data';

-- Add version column for optimistic locking (prevents race conditions)
ALTER TABLE public.t_bm_tenant_subscription
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

COMMENT ON COLUMN public.t_bm_tenant_subscription.version IS
'Version number for optimistic locking on concurrent updates';

-- Update status constraint to include grace_period and suspended
-- First, drop the existing constraint
ALTER TABLE public.t_bm_tenant_subscription
    DROP CONSTRAINT IF EXISTS t_bm_tenant_subscription_status_check;

-- Add new constraint with additional statuses
ALTER TABLE public.t_bm_tenant_subscription
    ADD CONSTRAINT t_bm_tenant_subscription_status_check
    CHECK (status IN ('active', 'trial', 'canceled', 'expired', 'grace_period', 'suspended', 'pending'));

COMMENT ON CONSTRAINT t_bm_tenant_subscription_status_check ON public.t_bm_tenant_subscription IS
'Valid statuses: active, trial, grace_period, suspended, canceled, expired, pending';

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bm_subscription_product_code
    ON public.t_bm_tenant_subscription (product_code)
    WHERE product_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bm_subscription_status
    ON public.t_bm_tenant_subscription (status);

CREATE INDEX IF NOT EXISTS idx_bm_subscription_next_billing
    ON public.t_bm_tenant_subscription (next_billing_date)
    WHERE next_billing_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bm_subscription_grace_end
    ON public.t_bm_tenant_subscription (grace_end_date)
    WHERE grace_end_date IS NOT NULL;


-- ============================================================
-- 3. t_bm_subscription_usage - Enhanced usage tracking
-- ============================================================
-- Purpose: Support multi-metric usage recording for billing calculations
-- Current table tracks used_amount vs limit_amount
-- We need to add time-series recording for aggregation

-- Add tenant_id for direct tenant reference (faster queries)
ALTER TABLE public.t_bm_subscription_usage
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

COMMENT ON COLUMN public.t_bm_subscription_usage.tenant_id IS
'Direct tenant reference for faster queries (denormalized from subscription)';

-- Add metric_type for broader categorization
ALTER TABLE public.t_bm_subscription_usage
    ADD COLUMN IF NOT EXISTS metric_type TEXT;

COMMENT ON COLUMN public.t_bm_subscription_usage.metric_type IS
'Usage metric type: contract, user, storage_mb, notification_email, notification_sms, notification_whatsapp, ai_report, api_call';

-- Add quantity for incremental recording
ALTER TABLE public.t_bm_subscription_usage
    ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

COMMENT ON COLUMN public.t_bm_subscription_usage.quantity IS
'Quantity of usage recorded in this entry';

-- Add recorded_at for time-series tracking
ALTER TABLE public.t_bm_subscription_usage
    ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.t_bm_subscription_usage.recorded_at IS
'When this usage was recorded (for time-series aggregation)';

-- Add reference fields for audit trail
ALTER TABLE public.t_bm_subscription_usage
    ADD COLUMN IF NOT EXISTS reference_type TEXT;

ALTER TABLE public.t_bm_subscription_usage
    ADD COLUMN IF NOT EXISTS reference_id UUID;

COMMENT ON COLUMN public.t_bm_subscription_usage.reference_type IS
'What triggered this usage: contract, jtd, api_call, storage, manual';

COMMENT ON COLUMN public.t_bm_subscription_usage.reference_id IS
'ID of the source record that triggered this usage';

-- Add billing_period for easier aggregation
ALTER TABLE public.t_bm_subscription_usage
    ADD COLUMN IF NOT EXISTS billing_period TEXT;

COMMENT ON COLUMN public.t_bm_subscription_usage.billing_period IS
'Billing period identifier (e.g., 2025-Q1, 2025-01) for efficient aggregation';

-- Update type constraint to include more metric types
ALTER TABLE public.t_bm_subscription_usage
    DROP CONSTRAINT IF EXISTS t_bm_subscription_usage_type_check;

ALTER TABLE public.t_bm_subscription_usage
    ADD CONSTRAINT t_bm_subscription_usage_type_check
    CHECK (type IN ('feature', 'notification', 'contract', 'storage', 'ai_report', 'api_call', 'addon'));

-- Add indexes for efficient aggregation
CREATE INDEX IF NOT EXISTS idx_bm_usage_tenant_period
    ON public.t_bm_subscription_usage (tenant_id, recorded_at)
    WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bm_usage_metric_period
    ON public.t_bm_subscription_usage (tenant_id, metric_type, recorded_at)
    WHERE tenant_id IS NOT NULL AND metric_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bm_usage_billing_period
    ON public.t_bm_subscription_usage (tenant_id, billing_period)
    WHERE tenant_id IS NOT NULL AND billing_period IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bm_usage_reference
    ON public.t_bm_subscription_usage (reference_type, reference_id)
    WHERE reference_type IS NOT NULL;


-- ============================================================
-- 4. t_bm_invoice - Enhanced invoice tracking
-- ============================================================
-- Purpose: Support platform billing and contract billing (tenant→customer)
-- with Razorpay integration and detailed line items

-- Add invoice type (platform vs contract billing)
ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'platform';

COMMENT ON COLUMN public.t_bm_invoice.invoice_type IS
'Invoice type: platform (us→tenant) or contract (tenant→their customer)';

-- Add human-readable invoice number
ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS invoice_number TEXT;

COMMENT ON COLUMN public.t_bm_invoice.invoice_number IS
'Human-readable invoice number (e.g., INV-2025-Q1-00123)';

-- Add tenant_id for direct reference
ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

COMMENT ON COLUMN public.t_bm_invoice.tenant_id IS
'Direct tenant reference for faster queries';

-- Add billing period dates
ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS billing_period_start DATE;

ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS billing_period_end DATE;

COMMENT ON COLUMN public.t_bm_invoice.billing_period_start IS
'Start date of the billing period covered by this invoice';

COMMENT ON COLUMN public.t_bm_invoice.billing_period_end IS
'End date of the billing period covered by this invoice';

-- Add detailed line items (separate from items for structured data)
ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]';

COMMENT ON COLUMN public.t_bm_invoice.line_items IS
'Detailed line items with structure:
[{
  "description": "Platform Fee (4 users)",
  "quantity": 1,
  "unit_price": 750,
  "amount": 750,
  "category": "base_fee",
  "metadata": {}
}]';

-- Add Razorpay integration fields
ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS razorpay_invoice_id TEXT;

ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS razorpay_short_url TEXT;

ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

COMMENT ON COLUMN public.t_bm_invoice.razorpay_invoice_id IS
'Razorpay invoice ID for payment tracking';

COMMENT ON COLUMN public.t_bm_invoice.razorpay_short_url IS
'Razorpay payment link URL sent to customer';

COMMENT ON COLUMN public.t_bm_invoice.razorpay_payment_id IS
'Razorpay payment ID after successful payment';

-- Add payment attempt tracking
ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS payment_attempts INTEGER DEFAULT 0;

ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS last_payment_attempt TIMESTAMPTZ;

COMMENT ON COLUMN public.t_bm_invoice.payment_attempts IS
'Number of payment attempts made';

COMMENT ON COLUMN public.t_bm_invoice.last_payment_attempt IS
'Timestamp of last payment attempt';

-- Add paid_at (more precise than paid_date)
ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

COMMENT ON COLUMN public.t_bm_invoice.paid_at IS
'Exact timestamp when payment was received';

-- Add PDF URL for generated invoices
ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS pdf_url TEXT;

COMMENT ON COLUMN public.t_bm_invoice.pdf_url IS
'URL to generated PDF invoice';

-- Add subtotal, tax, discount for detailed calculations
ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2);

ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0;

COMMENT ON COLUMN public.t_bm_invoice.subtotal IS
'Subtotal before tax and discounts';

COMMENT ON COLUMN public.t_bm_invoice.tax_amount IS
'Total tax amount (GST, etc.)';

COMMENT ON COLUMN public.t_bm_invoice.discount_amount IS
'Total discount applied';

-- Add notes field
ALTER TABLE public.t_bm_invoice
    ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.t_bm_invoice.notes IS
'Additional notes or terms for this invoice';

-- Update status constraint to include more statuses
ALTER TABLE public.t_bm_invoice
    DROP CONSTRAINT IF EXISTS t_bm_invoice_status_check;

ALTER TABLE public.t_bm_invoice
    ADD CONSTRAINT t_bm_invoice_status_check
    CHECK (status IN ('draft', 'pending', 'sent', 'paid', 'overdue', 'payment_failed', 'cancelled', 'refunded', 'partially_paid'));

COMMENT ON CONSTRAINT t_bm_invoice_status_check ON public.t_bm_invoice IS
'Valid statuses: draft, pending, sent, paid, overdue, payment_failed, cancelled, refunded, partially_paid';

-- Add unique constraint for invoice_number per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_bm_invoice_number_unique
    ON public.t_bm_invoice (tenant_id, invoice_number)
    WHERE tenant_id IS NOT NULL AND invoice_number IS NOT NULL;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bm_invoice_tenant
    ON public.t_bm_invoice (tenant_id)
    WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bm_invoice_status
    ON public.t_bm_invoice (status);

CREATE INDEX IF NOT EXISTS idx_bm_invoice_type
    ON public.t_bm_invoice (invoice_type)
    WHERE invoice_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bm_invoice_due_date
    ON public.t_bm_invoice (due_date, status)
    WHERE status IN ('pending', 'sent', 'overdue');

CREATE INDEX IF NOT EXISTS idx_bm_invoice_razorpay
    ON public.t_bm_invoice (razorpay_invoice_id)
    WHERE razorpay_invoice_id IS NOT NULL;


-- ============================================================
-- 5. Backfill tenant_id in existing tables (if needed)
-- ============================================================
-- This updates existing records to populate tenant_id from subscription

-- Backfill tenant_id in t_bm_subscription_usage
UPDATE public.t_bm_subscription_usage u
SET tenant_id = s.tenant_id
FROM public.t_bm_tenant_subscription s
WHERE u.subscription_id = s.subscription_id
  AND u.tenant_id IS NULL;

-- Backfill tenant_id in t_bm_invoice
UPDATE public.t_bm_invoice i
SET tenant_id = s.tenant_id
FROM public.t_bm_tenant_subscription s
WHERE i.subscription_id = s.subscription_id
  AND i.tenant_id IS NULL;


-- ============================================================
-- 6. Add triggers for updated_at
-- ============================================================
-- Ensure updated_at is automatically maintained

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to t_bm_plan_version if not exists
DROP TRIGGER IF EXISTS update_t_bm_plan_version_updated_at ON public.t_bm_plan_version;
CREATE TRIGGER update_t_bm_plan_version_updated_at
    BEFORE UPDATE ON public.t_bm_plan_version
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger to t_bm_tenant_subscription if not exists
DROP TRIGGER IF EXISTS update_t_bm_tenant_subscription_updated_at ON public.t_bm_tenant_subscription;
CREATE TRIGGER update_t_bm_tenant_subscription_updated_at
    BEFORE UPDATE ON public.t_bm_tenant_subscription
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger to t_bm_invoice if not exists
DROP TRIGGER IF EXISTS update_t_bm_invoice_updated_at ON public.t_bm_invoice;
CREATE TRIGGER update_t_bm_invoice_updated_at
    BEFORE UPDATE ON public.t_bm_invoice
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Summary of changes:
--   t_bm_plan_version:
--     + billing_config JSONB
--     + Index on billing_config->>'product_code'
--
--   t_bm_tenant_subscription:
--     + product_code TEXT
--     + trial_start_date TIMESTAMPTZ
--     + grace_start_date TIMESTAMPTZ
--     + grace_end_date TIMESTAMPTZ
--     + suspension_date TIMESTAMPTZ
--     + next_billing_date DATE
--     + razorpay_subscription_id TEXT
--     + metadata JSONB
--     + version INTEGER (optimistic locking)
--     + Updated status constraint (added: grace_period, suspended, pending)
--     + Multiple indexes for common queries
--
--   t_bm_subscription_usage:
--     + tenant_id UUID (denormalized)
--     + metric_type TEXT
--     + quantity INTEGER
--     + recorded_at TIMESTAMPTZ
--     + reference_type TEXT
--     + reference_id UUID
--     + billing_period TEXT
--     + Updated type constraint (added: contract, storage, ai_report, api_call, addon)
--     + Multiple indexes for aggregation
--
--   t_bm_invoice:
--     + invoice_type TEXT
--     + invoice_number TEXT
--     + tenant_id UUID (denormalized)
--     + billing_period_start DATE
--     + billing_period_end DATE
--     + line_items JSONB
--     + razorpay_invoice_id TEXT
--     + razorpay_short_url TEXT
--     + razorpay_payment_id TEXT
--     + payment_attempts INTEGER
--     + last_payment_attempt TIMESTAMPTZ
--     + paid_at TIMESTAMPTZ
--     + pdf_url TEXT
--     + subtotal NUMERIC(12,2)
--     + tax_amount NUMERIC(12,2)
--     + discount_amount NUMERIC(12,2)
--     + notes TEXT
--     + Updated status constraint (added: draft, sent, payment_failed, cancelled, refunded, partially_paid)
--     + Multiple indexes
--
--   General:
--     + update_updated_at_column() function
--     + Triggers for automatic updated_at maintenance
--     + Backfill queries for tenant_id
-- ============================================================
