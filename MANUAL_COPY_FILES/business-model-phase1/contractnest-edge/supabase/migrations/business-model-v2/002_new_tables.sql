-- ============================================================
-- Migration: 002_new_tables
-- Description: Create new Business Model tables for composite billing
-- Author: Claude Code Session
-- Date: 2025-01-11
-- Phase: 1 - Schema & Product Configs (Deliverable 2)
-- ============================================================

-- ============================================================
-- OVERVIEW
-- ============================================================
-- This migration creates new tables required for the Business Model Agent:
--
--   1. t_bm_product_config      - Product billing configurations (JSONB)
--   2. t_bm_credit_balance      - Tenant credit balances per type/channel
--   3. t_bm_credit_transaction  - Credit transaction history (audit trail)
--   4. t_bm_topup_pack          - Available credit topup packages
--   5. t_contract_invoice       - Contract billing (tenant → their customer)
--   6. t_bm_billing_event       - Billing event log for processing/audit
--
-- Design Principles:
--   - UUID primary keys with gen_random_uuid()
--   - Audit fields: created_at, updated_at, created_by
--   - Soft delete where appropriate (is_active)
--   - JSONB for flexible configurations
--   - Proper indexes for query performance
--   - Foreign key constraints where applicable
-- ============================================================


-- ============================================================
-- 1. t_bm_product_config
-- ============================================================
-- Purpose: Store complete billing configuration for each product
-- Each product (contractnest, familyknows, kaladristi, custom) has
-- its own billing model stored as JSONB

CREATE TABLE IF NOT EXISTS public.t_bm_product_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Product identification
    product_code TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    description TEXT,

    -- Complete billing configuration as JSONB
    billing_config JSONB NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Comments
COMMENT ON TABLE public.t_bm_product_config IS
'Product billing configurations. Each product has a unique billing model stored as JSONB.';

COMMENT ON COLUMN public.t_bm_product_config.product_code IS
'Unique product identifier: contractnest, familyknows, kaladristi, custom';

COMMENT ON COLUMN public.t_bm_product_config.billing_config IS
'Complete billing configuration. Structure varies by billing_model type:
{
  "billing_model": "composite|tiered|usage|flat|manual",
  "billing_cycles": ["monthly", "quarterly", "annual"],
  "base_fee": { ... },
  "unit_charges": { ... },
  "storage": { ... },
  "credits": { ... },
  "addons": { ... },
  "trial": { "days": 14, "features_included": "all" },
  "grace_period": { "days": 7, "access_level": "full" }
}';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bm_product_config_code
    ON public.t_bm_product_config (product_code);

CREATE INDEX IF NOT EXISTS idx_bm_product_config_active
    ON public.t_bm_product_config (is_active)
    WHERE is_active = true;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_t_bm_product_config_updated_at ON public.t_bm_product_config;
CREATE TRIGGER update_t_bm_product_config_updated_at
    BEFORE UPDATE ON public.t_bm_product_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 2. t_bm_credit_balance
-- ============================================================
-- Purpose: Track tenant credit balances per credit type and channel
-- Supports notification credits, AI report credits, etc.
-- Uses row-level locking for atomic deductions (race condition prevention)

CREATE TABLE IF NOT EXISTS public.t_bm_credit_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenant reference
    tenant_id UUID NOT NULL,

    -- Credit identification
    credit_type TEXT NOT NULL,
    channel TEXT,

    -- Balance tracking
    balance INTEGER NOT NULL DEFAULT 0,
    reserved_balance INTEGER DEFAULT 0,

    -- Topup tracking
    last_topup_at TIMESTAMPTZ,
    last_topup_amount INTEGER,

    -- Expiry (null = never expires)
    expires_at TIMESTAMPTZ,

    -- Low balance threshold for alerts
    low_balance_threshold INTEGER DEFAULT 10,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint per tenant/type/channel
    CONSTRAINT unique_tenant_credit_channel
        UNIQUE (tenant_id, credit_type, channel)
);

-- Comments
COMMENT ON TABLE public.t_bm_credit_balance IS
'Tenant credit balances per type and channel. Uses row-level locking for atomic operations.';

COMMENT ON COLUMN public.t_bm_credit_balance.credit_type IS
'Type of credit: notification, ai_report, api_call, etc.';

COMMENT ON COLUMN public.t_bm_credit_balance.channel IS
'Channel for notifications: email, sms, whatsapp. NULL for non-notification credits.';

COMMENT ON COLUMN public.t_bm_credit_balance.balance IS
'Current available balance. Use deduct_credits() function for atomic deductions.';

COMMENT ON COLUMN public.t_bm_credit_balance.reserved_balance IS
'Credits reserved for pending operations (not yet deducted).';

COMMENT ON COLUMN public.t_bm_credit_balance.expires_at IS
'When credits expire. NULL means never expires.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bm_credit_balance_tenant
    ON public.t_bm_credit_balance (tenant_id);

CREATE INDEX IF NOT EXISTS idx_bm_credit_balance_type
    ON public.t_bm_credit_balance (tenant_id, credit_type);

CREATE INDEX IF NOT EXISTS idx_bm_credit_balance_expiry
    ON public.t_bm_credit_balance (expires_at)
    WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bm_credit_balance_low
    ON public.t_bm_credit_balance (tenant_id, credit_type)
    WHERE balance <= low_balance_threshold;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_t_bm_credit_balance_updated_at ON public.t_bm_credit_balance;
CREATE TRIGGER update_t_bm_credit_balance_updated_at
    BEFORE UPDATE ON public.t_bm_credit_balance
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 3. t_bm_credit_transaction
-- ============================================================
-- Purpose: Complete audit trail for all credit operations
-- Append-only table - never update or delete records

CREATE TABLE IF NOT EXISTS public.t_bm_credit_transaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenant and credit identification
    tenant_id UUID NOT NULL,
    credit_type TEXT NOT NULL,
    channel TEXT,

    -- Transaction details
    transaction_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,

    -- Reference to source of transaction
    reference_type TEXT,
    reference_id UUID,

    -- Additional context
    description TEXT,
    metadata JSONB DEFAULT '{}',

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    -- Constraints
    CONSTRAINT valid_transaction_type CHECK (
        transaction_type IN ('topup', 'deduction', 'expiry', 'adjustment', 'refund', 'transfer', 'initial')
    )
);

-- Comments
COMMENT ON TABLE public.t_bm_credit_transaction IS
'Append-only audit trail for all credit operations. Never update or delete.';

COMMENT ON COLUMN public.t_bm_credit_transaction.transaction_type IS
'Type: topup, deduction, expiry, adjustment, refund, transfer, initial';

COMMENT ON COLUMN public.t_bm_credit_transaction.quantity IS
'Amount changed. Positive for topup/refund, negative for deduction/expiry.';

COMMENT ON COLUMN public.t_bm_credit_transaction.reference_type IS
'Source of transaction: invoice, jtd, manual, subscription, topup_pack';

COMMENT ON COLUMN public.t_bm_credit_transaction.reference_id IS
'ID of the source record (invoice_id, jtd_id, etc.)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bm_credit_tx_tenant
    ON public.t_bm_credit_transaction (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bm_credit_tx_type
    ON public.t_bm_credit_transaction (tenant_id, credit_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bm_credit_tx_reference
    ON public.t_bm_credit_transaction (reference_type, reference_id)
    WHERE reference_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bm_credit_tx_date
    ON public.t_bm_credit_transaction (created_at DESC);


-- ============================================================
-- 4. t_bm_topup_pack
-- ============================================================
-- Purpose: Define available credit topup packages for purchase
-- Configurable per product with quantity, price, and optional expiry

CREATE TABLE IF NOT EXISTS public.t_bm_topup_pack (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Product association
    product_code TEXT NOT NULL,

    -- Pack identification
    credit_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,

    -- Pack details
    quantity INTEGER NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    currency_code TEXT DEFAULT 'INR',

    -- Expiry configuration
    expiry_days INTEGER,

    -- Display settings
    is_popular BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,

    -- Discount/promotion
    original_price NUMERIC(12, 2),
    discount_percentage NUMERIC(5, 2),
    promotion_text TEXT,
    promotion_ends_at TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Comments
COMMENT ON TABLE public.t_bm_topup_pack IS
'Available credit topup packages for purchase.';

COMMENT ON COLUMN public.t_bm_topup_pack.product_code IS
'Product this pack belongs to: contractnest, familyknows, kaladristi';

COMMENT ON COLUMN public.t_bm_topup_pack.credit_type IS
'Type of credits in this pack: notification, ai_report, etc.';

COMMENT ON COLUMN public.t_bm_topup_pack.expiry_days IS
'Days until credits expire after purchase. NULL = never expires.';

COMMENT ON COLUMN public.t_bm_topup_pack.is_popular IS
'Flag to highlight popular/recommended pack in UI.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bm_topup_pack_product
    ON public.t_bm_topup_pack (product_code, credit_type)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_bm_topup_pack_active
    ON public.t_bm_topup_pack (is_active, sort_order);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_t_bm_topup_pack_updated_at ON public.t_bm_topup_pack;
CREATE TRIGGER update_t_bm_topup_pack_updated_at
    BEFORE UPDATE ON public.t_bm_topup_pack
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 5. t_contract_invoice
-- ============================================================
-- Purpose: Contract billing - tenants invoice their own customers
-- This is Level 2 billing (Tenant → Their Customer)
-- Payments go to tenant's Razorpay, platform takes fee

CREATE TABLE IF NOT EXISTS public.t_contract_invoice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenant (who is billing)
    tenant_id UUID NOT NULL,
    contract_id UUID,

    -- Customer (who is being billed - external)
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    customer_address JSONB,
    customer_gstin TEXT,
    customer_pan TEXT,

    -- Invoice identification
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,

    -- Amount breakdown
    currency_code TEXT DEFAULT 'INR',
    subtotal NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    tax_details JSONB DEFAULT '{}',
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    discount_details JSONB DEFAULT '{}',
    total_amount NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) DEFAULT 0,
    balance_due NUMERIC(12, 2),

    -- Line items
    line_items JSONB NOT NULL,

    -- Payment status
    payment_status TEXT DEFAULT 'draft',
    razorpay_payment_link_id TEXT,
    razorpay_payment_link_url TEXT,
    razorpay_payment_id TEXT,
    payment_method TEXT,
    paid_at TIMESTAMPTZ,

    -- Settlement to tenant
    settlement_status TEXT DEFAULT 'pending',
    settlement_amount NUMERIC(12, 2),
    platform_fee NUMERIC(12, 2),
    platform_fee_percentage NUMERIC(5, 2) DEFAULT 2.5,
    razorpay_transfer_id TEXT,
    settled_at TIMESTAMPTZ,

    -- Notifications tracking
    notifications_sent JSONB DEFAULT '[]',
    last_reminder_sent_at TIMESTAMPTZ,
    reminder_count INTEGER DEFAULT 0,

    -- PDF and documents
    pdf_url TEXT,

    -- Notes and terms
    notes TEXT,
    terms_and_conditions TEXT,

    -- Cancellation/Refund
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    refunded_at TIMESTAMPTZ,
    refund_amount NUMERIC(12, 2),

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    -- Constraints
    CONSTRAINT unique_tenant_invoice_number
        UNIQUE (tenant_id, invoice_number),

    CONSTRAINT valid_payment_status CHECK (
        payment_status IN ('draft', 'pending', 'sent', 'viewed', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded')
    ),

    CONSTRAINT valid_settlement_status CHECK (
        settlement_status IN ('pending', 'processing', 'settled', 'failed', 'not_applicable')
    )
);

-- Comments
COMMENT ON TABLE public.t_contract_invoice IS
'Contract billing invoices - tenants billing their own customers (Level 2 billing).';

COMMENT ON COLUMN public.t_contract_invoice.tenant_id IS
'Tenant who is issuing this invoice to their customer.';

COMMENT ON COLUMN public.t_contract_invoice.contract_id IS
'Optional reference to contract in t_contracts.';

COMMENT ON COLUMN public.t_contract_invoice.line_items IS
'Invoice line items:
[{
  "description": "Milestone 1 - Design Phase",
  "hsn_code": "998314",
  "quantity": 1,
  "unit_price": 50000,
  "tax_rate": 18,
  "tax_amount": 9000,
  "amount": 59000
}]';

COMMENT ON COLUMN public.t_contract_invoice.platform_fee_percentage IS
'Platform fee percentage (default 2.5%). Platform keeps this from payment.';

COMMENT ON COLUMN public.t_contract_invoice.settlement_amount IS
'Amount to be settled to tenant (total - platform_fee).';

COMMENT ON COLUMN public.t_contract_invoice.notifications_sent IS
'Tracking of notifications sent:
[{ "type": "invoice_sent", "sent_at": "...", "channel": "email", "jtd_id": "..." }]';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contract_invoice_tenant
    ON public.t_contract_invoice (tenant_id, invoice_date DESC);

CREATE INDEX IF NOT EXISTS idx_contract_invoice_contract
    ON public.t_contract_invoice (contract_id)
    WHERE contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contract_invoice_customer_email
    ON public.t_contract_invoice (tenant_id, customer_email)
    WHERE customer_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contract_invoice_payment_status
    ON public.t_contract_invoice (payment_status, due_date);

CREATE INDEX IF NOT EXISTS idx_contract_invoice_overdue
    ON public.t_contract_invoice (due_date, payment_status)
    WHERE payment_status IN ('pending', 'sent', 'viewed');

CREATE INDEX IF NOT EXISTS idx_contract_invoice_settlement
    ON public.t_contract_invoice (settlement_status)
    WHERE settlement_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_contract_invoice_razorpay
    ON public.t_contract_invoice (razorpay_payment_link_id)
    WHERE razorpay_payment_link_id IS NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_t_contract_invoice_updated_at ON public.t_contract_invoice;
CREATE TRIGGER update_t_contract_invoice_updated_at
    BEFORE UPDATE ON public.t_contract_invoice
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-calculate balance_due
CREATE OR REPLACE FUNCTION public.calculate_balance_due()
RETURNS TRIGGER AS $$
BEGIN
    NEW.balance_due := NEW.total_amount - COALESCE(NEW.amount_paid, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_contract_invoice_balance ON public.t_contract_invoice;
CREATE TRIGGER calculate_contract_invoice_balance
    BEFORE INSERT OR UPDATE OF total_amount, amount_paid ON public.t_contract_invoice
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_balance_due();


-- ============================================================
-- 6. t_bm_billing_event
-- ============================================================
-- Purpose: Log all billing-related events for processing and audit
-- Used for webhook handling, async processing, and debugging

CREATE TABLE IF NOT EXISTS public.t_bm_billing_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Event identification
    tenant_id UUID,
    event_type TEXT NOT NULL,
    event_source TEXT NOT NULL,

    -- Event data
    event_data JSONB DEFAULT '{}',

    -- Processing status
    status TEXT DEFAULT 'pending',
    processed_at TIMESTAMPTZ,
    process_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,

    -- Error tracking
    error_message TEXT,
    error_details JSONB,

    -- Idempotency
    idempotency_key TEXT,

    -- Related entities
    subscription_id UUID,
    invoice_id UUID,
    contract_invoice_id UUID,

    -- External references
    razorpay_event_id TEXT,
    razorpay_payment_id TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_event_status CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'skipped', 'dead_letter')
    )
);

-- Comments
COMMENT ON TABLE public.t_bm_billing_event IS
'Billing event log for async processing and audit trail.';

COMMENT ON COLUMN public.t_bm_billing_event.event_type IS
'Event type: subscription_created, trial_expired, grace_started, invoice_generated,
payment_received, payment_failed, credits_purchased, credits_deducted, credits_expired,
webhook_received, etc.';

COMMENT ON COLUMN public.t_bm_billing_event.event_source IS
'Source: api, webhook, scheduler, manual, system';

COMMENT ON COLUMN public.t_bm_billing_event.status IS
'Processing status: pending, processing, completed, failed, skipped, dead_letter';

COMMENT ON COLUMN public.t_bm_billing_event.idempotency_key IS
'Unique key for idempotent processing (e.g., razorpay_event_id for webhooks).';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bm_billing_event_tenant
    ON public.t_bm_billing_event (tenant_id, created_at DESC)
    WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bm_billing_event_type
    ON public.t_bm_billing_event (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bm_billing_event_pending
    ON public.t_bm_billing_event (status, next_retry_at)
    WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_bm_billing_event_idempotency
    ON public.t_bm_billing_event (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bm_billing_event_razorpay
    ON public.t_bm_billing_event (razorpay_event_id)
    WHERE razorpay_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bm_billing_event_subscription
    ON public.t_bm_billing_event (subscription_id)
    WHERE subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bm_billing_event_invoice
    ON public.t_bm_billing_event (invoice_id)
    WHERE invoice_id IS NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_t_bm_billing_event_updated_at ON public.t_bm_billing_event;
CREATE TRIGGER update_t_bm_billing_event_updated_at
    BEFORE UPDATE ON public.t_bm_billing_event
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- ENABLE RLS (Row Level Security) - Optional
-- ============================================================
-- Uncomment if you want to enable RLS on these tables

-- ALTER TABLE public.t_bm_product_config ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.t_bm_credit_balance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.t_bm_credit_transaction ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.t_bm_topup_pack ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.t_contract_invoice ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.t_bm_billing_event ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Summary of tables created:
--
--   t_bm_product_config:
--     - Product billing configurations
--     - JSONB billing_config for flexible models
--     - Indexed by product_code
--
--   t_bm_credit_balance:
--     - Tenant credit balances per type/channel
--     - Supports expiry and low balance alerts
--     - Unique constraint on tenant/type/channel
--
--   t_bm_credit_transaction:
--     - Append-only audit trail
--     - Full transaction history
--     - Reference tracking to source
--
--   t_bm_topup_pack:
--     - Available topup packages per product
--     - Pricing, quantity, optional expiry
--     - Promotion support
--
--   t_contract_invoice:
--     - Tenant → Customer invoicing
--     - Full payment lifecycle tracking
--     - Settlement and platform fee tracking
--     - Notification history
--
--   t_bm_billing_event:
--     - Event log for async processing
--     - Webhook handling
--     - Retry and dead letter support
--     - Idempotency for duplicate prevention
-- ============================================================
