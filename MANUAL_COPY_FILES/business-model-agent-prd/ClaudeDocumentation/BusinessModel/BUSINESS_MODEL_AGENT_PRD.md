# Business Model Agent - Technical PRD

> **Document Version**: 1.0
> **Created**: January 2025
> **Last Updated**: January 2025
> **Status**: Draft - Pending Review
> **Author**: Claude Code Session

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Vision & Goals](#3-vision--goals)
4. [Product Billing Models](#4-product-billing-models)
5. [Architecture Design](#5-architecture-design)
6. [Database Schema](#6-database-schema)
7. [API Design](#7-api-design)
8. [Edge Functions](#8-edge-functions)
9. [UI Design](#9-ui-design)
10. [JTD Integration](#10-jtd-integration)
11. [Razorpay Integration](#11-razorpay-integration)
12. [Concurrency & Race Conditions](#12-concurrency--race-conditions)
13. [Error Handling Strategy](#13-error-handling-strategy)
14. [Bot-Friendly Architecture](#14-bot-friendly-architecture)
15. [Implementation Phases](#15-implementation-phases)
16. [Testing Strategy](#16-testing-strategy)
17. [Rollback Plan](#17-rollback-plan)
18. [Phase Completion Log](#18-phase-completion-log)

---

## 1. Executive Summary

### 1.1 What is Business Model Agent?

The Business Model Agent is a **dual-purpose billing infrastructure** that handles:

1. **Platform Billing (Level 1)**: ContractNest/FamilyKnows/Kaladristi billing their tenants
2. **Contract Billing (Level 2)**: Tenants billing their customers through the platform

### 1.2 Key Objectives

| Objective | Description |
|-----------|-------------|
| **Multi-Product Support** | Single billing engine serving ContractNest, FamilyKnows, Kaladristi, and future products |
| **Composite Billing** | Support complex models: base fees + usage + tiers + credits + add-ons |
| **Automated Operations** | Billing cycles, invoice generation, payment collection, dunning |
| **Tenant Empowerment** | Enable tenants to bill their own customers |
| **Scalability** | Support 500+ concurrent users with proper concurrency handling |
| **Bot-Friendly** | AI/chatbot queryable for billing status, recommendations |

### 1.3 Design Principles

1. **No Redis Dependency** - Use PostgreSQL + PGMQ for all operations
2. **JTD-First Notifications** - All billing communications flow through JTD
3. **Existing Infrastructure** - Leverage existing Docker setup, n8n, Supabase
4. **Razorpay via Integrations** - Use existing integrations module for payment credentials
5. **Product-Agnostic Core** - Billing engine configured via JSONB product configs

---

## 2. Current State Analysis

### 2.1 Existing Code Inventory

#### UI Layer (`contractnest-ui`)

| Category | Files | Status |
|----------|-------|--------|
| **Pages** | `pages/settings/businessmodel/admin/pricing-plans/*` | Built, needs evolution |
| **Pages** | `pages/settings/businessmodel/admin/billing/*` | Built, needs evolution |
| **Pages** | `pages/settings/businessmodel/tenants/*` | Built, needs evolution |
| **Pages** | `pages/catalog-studio/configure.tsx` | Built |
| **Components** | `components/businessModel/*` (~25 files) | Built, needs evolution |
| **Types** | `types/businessModel.ts`, `types/billing.ts` | Built, needs extension |
| **Hooks** | `hooks/useBusinessModel.ts`, `hooks/useVersionControl.ts` | Built |

#### API Layer (`contractnest-api`)

| Category | Files | Status |
|----------|-------|--------|
| **Controllers** | `planController.ts`, `planVersionController.ts` | Built |
| **Routes** | `businessModelRoutes.ts` (11 endpoints) | Built |
| **Services** | `businessModelService.ts` | Built, needs extension |
| **Types** | `types/businessModel.ts` | Built, needs extension |
| **Validators** | `validators/businessModel.ts` | Built |

#### Edge Layer (`contractnest-edge`)

| Category | Files | Status |
|----------|-------|--------|
| **Functions** | `plans/index.ts` (18.3 KB) | Built |
| **Functions** | `plan-versions/index.ts` (5.9 KB) | Built |
| **Utils** | `utils/business-model.ts` (10.5 KB) | Built, needs evolution |
| **Types** | `_shared/serviceCatalog/serviceCatalogTypes.ts` | Built |

#### Database Schema

| Table | Status | Notes |
|-------|--------|-------|
| `t_bm_pricing_plan` | Exists | Core plan table |
| `t_bm_plan_version` | Exists | Version with JSONB tiers/features |
| `t_bm_tenant_subscription` | Exists | Needs enhancement |
| `t_bm_subscription_usage` | Exists | Needs multi-metric support |
| `t_bm_invoice` | Exists | Needs enhancement |
| `t_bm_feature_reference` | Exists | Reference data |
| `t_bm_notification_reference` | Exists | Reference data |

### 2.2 Existing Integrations Module

The integrations module already handles payment provider configuration:

```
Tables:
├── t_integration_types        # Categories (payment_gateway, email, sms, etc.)
├── t_integration_providers    # Providers (razorpay, stripe, msg91, etc.)
└── t_tenant_integrations      # Per-tenant encrypted credentials
```

**Key Points:**
- Razorpay credentials stored encrypted in `t_tenant_integrations`
- `is_live` flag distinguishes test vs production mode
- Connection testing functionality exists
- Platform billing uses credentials from tenant where `t_tenant.admin = true`

### 2.3 JTD Framework

JTD (Jobs To Do) provides production-ready infrastructure:

```
├── PGMQ-based queue          # Async message processing
├── pg_cron                   # Scheduled tasks (every minute)
├── Multi-channel delivery    # Email, SMS, WhatsApp, Push, In-App
├── Status tracking           # Full audit trail
├── Tenant configuration      # Per-tenant limits, quiet hours
└── VaNi integration          # AI actor support
```

**Billing-relevant source types to add:**
- `invoice_generated`, `payment_reminder`, `payment_received`
- `payment_failed`, `payment_overdue`, `subscription_renewing`
- `trial_expiring`, `grace_period_started`, `account_suspended`

### 2.4 n8n Workflows

Available for complex multi-step workflows:
- Dunning sequences (Day 0 → Day 3 → Day 7 → Day 14 → Day 21)
- Subscription lifecycle automation
- Custom notification sequences

---

## 3. Vision & Goals

### 3.1 Multi-Product Billing Platform

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BUSINESS MODEL AGENT                              │
│                                                                      │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│   │ ContractNest│  │ FamilyKnows │  │ Kaladristi  │  │  Custom   │  │
│   │   Config    │  │   Config    │  │   Config    │  │  Clients  │  │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │
│          │                │                │               │        │
│          └────────────────┼────────────────┴───────────────┘        │
│                           │                                          │
│                           ▼                                          │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                  PRICING ENGINE                              │   │
│   │                                                              │   │
│   │  • Base Fee Calculator    • Usage Aggregator                │   │
│   │  • Tiered Pricing         • Credit Manager                  │   │
│   │  • Add-on Handler         • Trial/Grace Manager             │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                           │                                          │
│          ┌────────────────┼────────────────┐                        │
│          ▼                ▼                ▼                        │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│   │  Razorpay   │  │    JTD      │  │   n8n       │                 │
│   │  Payments   │  │  Notifs     │  │  Workflows  │                 │
│   └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Dual-Level Billing

```
LEVEL 1: PLATFORM BILLING
──────────────────────────
ContractNest → Tenants
FamilyKnows → Tenants
Kaladristi → Tenants

Payment flows to: Platform's Razorpay account
                  (t_tenant WHERE admin = true)


LEVEL 2: CONTRACT BILLING
──────────────────────────
Tenants → Their Customers

Payment flows to: Tenant's Razorpay account
                  (via Razorpay Route/Transfer)
                  Platform takes 2-3% fee
```

### 3.3 Success Metrics

| Metric | Target |
|--------|--------|
| Concurrent users | 500+ without degradation |
| Invoice generation time | < 5 seconds per invoice |
| Payment webhook processing | < 2 seconds |
| Query response time (bot) | < 500ms |
| System availability | 99.9% uptime |

---

## 4. Product Billing Models

### 4.1 ContractNest Billing Model

```json
{
  "product_code": "contractnest",
  "billing_model": "composite",
  "billing_cycles": ["quarterly", "annual"],

  "base_fee": {
    "description": "Platform access fee",
    "included_users": 2,
    "tiers": [
      { "users_from": 1, "users_to": 2, "monthly_amount": 500 },
      { "users_from": 3, "users_to": 5, "monthly_amount": 750 },
      { "users_from": 6, "users_to": 10, "monthly_amount": 1200 },
      { "users_from": 11, "users_to": null, "per_user_amount": 100 }
    ]
  },

  "storage": {
    "included_mb": 40,
    "overage_per_mb": 0.50
  },

  "contracts": {
    "description": "Per contract charge",
    "base_price": 150,
    "standalone_price": 250,
    "with_rfp_price": 250,
    "tiers": [
      { "from": 1, "to": 50, "price": 150 },
      { "from": 51, "to": 200, "price": 120 },
      { "from": 201, "to": null, "price": 100 }
    ]
  },

  "credits": {
    "notifications": {
      "included_per_contract": 10,
      "channels": ["whatsapp", "sms", "email"],
      "topup_packs": [
        { "quantity": 50, "price": 200, "expiry_days": null },
        { "quantity": 200, "price": 700, "expiry_days": null }
      ],
      "configurable_expiry": true
    }
  },

  "addons": {
    "vani_ai": {
      "name": "VaNi AI Agent",
      "description": "AI-powered workflow automation",
      "monthly_price": 5000,
      "trial_days": 7
    }
  },

  "trial": {
    "days": 14,
    "features_included": "all"
  },

  "grace_period": {
    "days": 7,
    "access_level": "full"
  }
}
```

### 4.2 FamilyKnows Billing Model

```json
{
  "product_code": "familyknows",
  "billing_model": "tiered_family",
  "billing_cycles": ["quarterly"],

  "free_tier": {
    "users": 1,
    "assets_limit": 25,
    "price": 0
  },

  "paid_tiers": [
    {
      "name": "Individual",
      "users": 1,
      "assets_limit": "unlimited",
      "quarterly_price": 75
    },
    {
      "name": "Family of 4",
      "users": 4,
      "assets_limit": "unlimited",
      "monthly_price": 200
    },
    {
      "name": "Extended Family",
      "users": 10,
      "assets_limit": "unlimited",
      "monthly_price": 400
    }
  ],

  "addons": {
    "ai_assistant": {
      "name": "AI Family Assistant",
      "monthly_price": 100
    }
  },

  "trial": {
    "days": 14,
    "features_included": "all"
  }
}
```

### 4.3 Kaladristi Billing Model

```json
{
  "product_code": "kaladristi",
  "billing_model": "subscription_plus_usage",
  "billing_cycles": ["monthly"],

  "base_subscription": {
    "monthly_price": 100,
    "includes": ["dashboard", "basic_reports", "alerts"]
  },

  "usage_charges": {
    "ai_research_report": {
      "description": "Per AI-generated stock research report",
      "price": 50
    }
  },

  "trial": {
    "days": 7,
    "includes_reports": 2
  }
}
```

### 4.4 Custom Client Model

```json
{
  "product_code": "custom",
  "billing_model": "manual",
  "billing_cycles": ["monthly", "custom"],

  "line_items": [
    {
      "description": "Custom development retainer",
      "monthly_amount": "variable"
    }
  ],

  "invoicing": "manual",
  "dunning": "standard"
}
```

---

## 5. Architecture Design

### 5.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTRY POINTS                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│   │  Product     │  │  pg_cron     │  │  Razorpay    │  │  Admin UI    │    │
│   │  Events      │  │  Scheduler   │  │  Webhooks    │  │  Actions     │    │
│   │              │  │              │  │              │  │              │    │
│   │ • Contract   │  │ • Billing    │  │ • payment.*  │  │ • Generate   │    │
│   │   created    │  │   cycle      │  │ • invoice.*  │  │   invoice    │    │
│   │ • User added │  │ • Trial      │  │ • subscr.*   │  │ • Adjust     │    │
│   │ • Notif sent │  │   expiry     │  │              │  │   credits    │    │
│   │ • Storage    │  │ • Grace end  │  │              │  │              │    │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│          │                 │                 │                 │             │
└──────────┼─────────────────┼─────────────────┼─────────────────┼─────────────┘
           │                 │                 │                 │
           ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         contractnest-api                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     BILLING SERVICE LAYER                            │   │
│   │                                                                      │   │
│   │   billingService.ts                                                  │   │
│   │   ├── recordUsage(tenant, metric, quantity)                         │   │
│   │   ├── calculatePrice(tenant, period)                                │   │
│   │   ├── generateInvoice(tenant, period)                               │   │
│   │   ├── checkLimits(tenant, feature)                                  │   │
│   │   ├── deductCredits(tenant, channel, quantity)                      │   │
│   │   ├── getSubscriptionStatus(tenant)                                 │   │
│   │   ├── handleTrialExpiry(tenant)                                     │   │
│   │   ├── startGracePeriod(tenant)                                      │   │
│   │   ├── suspendAccount(tenant)                                        │   │
│   │   └── restoreAccount(tenant)                                        │   │
│   │                                                                      │   │
│   │   pricingEngine.ts                                                   │   │
│   │   ├── loadProductConfig(productCode)                                │   │
│   │   ├── calculateBaseFee(subscription, usage)                         │   │
│   │   ├── calculateUsageCharges(subscription, usage)                    │   │
│   │   ├── calculateTieredPrice(tiers, quantity)                         │   │
│   │   ├── calculateCreditsNeeded(subscription)                          │   │
│   │   └── applyDiscounts(amount, discounts)                             │   │
│   │                                                                      │   │
│   │   contractBillingService.ts                                          │   │
│   │   ├── createContractInvoice(tenant, contract, items)                │   │
│   │   ├── sendInvoiceToCustomer(invoiceId)                              │   │
│   │   ├── processCustomerPayment(invoiceId, paymentData)                │   │
│   │   ├── settleToTenant(invoiceId)                                     │   │
│   │   └── getPlatformFee(amount)                                        │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                 ┌──────────────────┼──────────────────┐                     │
│                 ▼                  ▼                  ▼                     │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│   │  JTD Service    │  │  Razorpay       │  │  Edge Function  │            │
│   │  (Notifications)│  │  Service        │  │  Calls          │            │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (Edge + DB)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Edge Functions:                          Database:                         │
│   ┌─────────────────────────┐              ┌─────────────────────────┐      │
│   │ • plans/                │              │ • t_bm_pricing_plan     │      │
│   │ • plan-versions/        │              │ • t_bm_plan_version     │      │
│   │ • billing-cycle-worker/ │              │ • t_bm_tenant_subscr    │      │
│   │ • usage-aggregator/     │              │ • t_bm_subscription_use │      │
│   │ • razorpay-webhook/     │              │ • t_bm_invoice          │      │
│   │ • jtd-worker/           │              │ • t_bm_credit_balance   │      │
│   └─────────────────────────┘              │ • t_bm_product_config   │      │
│                                            │ • t_contract_invoice    │      │
│   pg_cron Jobs:                            │ • n_jtd (notifications) │      │
│   ┌─────────────────────────┐              │ • PGMQ queues           │      │
│   │ • billing_cycle (1st)   │              └─────────────────────────┘      │
│   │ • trial_expiry_check    │                                                │
│   │ • grace_period_check    │                                                │
│   │ • jtd_worker (every min)│                                                │
│   └─────────────────────────┘                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│   │    Razorpay     │  │     MSG91       │  │      n8n        │             │
│   │                 │  │   (via JTD)     │  │                 │             │
│   │ • Payments      │  │ • Email         │  │ • Dunning       │             │
│   │ • Subscriptions │  │ • SMS           │  │   workflows     │             │
│   │ • Invoices      │  │ • WhatsApp      │  │ • Complex       │             │
│   │ • Routes        │  │                 │  │   sequences     │             │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Data Flow: Platform Billing

```
1. USAGE RECORDING (Real-time)
   ─────────────────────────────
   Contract Created
        │
        ▼
   contractController.createContract()
        │
        ├──► billingService.recordUsage(tenant, 'contract', 1)
        │         │
        │         └──► INSERT t_bm_subscription_usage
        │               (tenant_id, metric='contract', qty=1, recorded_at)
        │
        └──► jtdService.createJTD('contract_created', ...)  // existing


2. BILLING CYCLE (Monthly/Quarterly via pg_cron)
   ──────────────────────────────────────────────
   pg_cron: 1st of period at 00:00
        │
        ▼
   invoke_billing_cycle_worker()
        │
        ▼
   Edge Function: billing-cycle-worker
        │
        ├──► For each tenant with active subscription:
        │         │
        │         ├──► SELECT SUM from t_bm_subscription_usage
        │         │      WHERE recorded_at BETWEEN period_start AND period_end
        │         │
        │         ├──► pricingEngine.calculatePrice(productConfig, usage)
        │         │
        │         ├──► INSERT t_bm_invoice (amount, line_items, due_date)
        │         │
        │         ├──► razorpayService.createInvoice(invoice)
        │         │
        │         └──► jtdService.createJTD('invoice_generated', {
        │                  recipient: tenant.billing_email,
        │                  invoice_url: razorpay_short_url
        │              })
        │
        └──► Queue failed ones for retry


3. PAYMENT PROCESSING
   ───────────────────
   Razorpay Webhook: payment.captured
        │
        ▼
   Edge Function: razorpay-webhook
        │
        ├──► Verify webhook signature
        │
        ├──► UPDATE t_bm_invoice SET status = 'paid'
        │
        ├──► UPDATE t_bm_tenant_subscription SET status = 'active'
        │
        └──► jtdService.createJTD('payment_received', {...})


4. DUNNING (Payment Failed)
   ─────────────────────────
   Razorpay Webhook: payment.failed
        │
        ▼
   Edge Function: razorpay-webhook
        │
        ├──► UPDATE t_bm_invoice SET status = 'payment_failed'
        │
        └──► Trigger n8n workflow: dunning_sequence
                  │
                  ▼
             n8n Workflow:
             ┌────────────────────────────────────────────┐
             │  Day 0: JTD → payment_failed email         │
             │  Day 3: JTD → payment_reminder email+SMS   │
             │  Day 7: JTD → payment_overdue all channels │
             │  Day 14: API → startGracePeriod(tenant)    │
             │  Day 21: API → suspendAccount(tenant)      │
             └────────────────────────────────────────────┘
```

### 5.3 Data Flow: Contract Billing (Tenant → Customer)

```
1. INVOICE CREATION
   ─────────────────
   Tenant creates invoice for customer
        │
        ▼
   POST /api/contract-billing/invoice
        │
        ▼
   contractBillingService.createContractInvoice()
        │
        ├──► INSERT t_contract_invoice
        │      (tenant_id, contract_id, customer_*, amount, line_items)
        │
        ├──► razorpayService.createPaymentLink({
        │         amount,
        │         customer_email,
        │         description,
        │         callback_url  // for webhook
        │    })
        │    // Uses TENANT's Razorpay credentials from t_tenant_integrations
        │
        └──► jtdService.createJTD('contract_invoice_generated', {
                 recipient: customer_email,
                 invoice_url: razorpay_short_url,
                 template: tenant's branded template
             })
             // DEDUCTS from tenant's notification credits


2. CUSTOMER PAYMENT
   ─────────────────
   Customer pays via Razorpay link
        │
        ▼
   Razorpay Webhook → razorpay-webhook edge function
        │
        ├──► Identify invoice type (contract vs platform)
        │
        ├──► UPDATE t_contract_invoice SET payment_status = 'paid'
        │
        ├──► Calculate platform fee (2-3%)
        │
        ├──► Record settlement pending
        │
        └──► jtdService.createJTD('contract_payment_received', {
                 recipient: tenant.email,  // Notify tenant
                 customer_name,
                 amount
             })


3. SETTLEMENT TO TENANT
   ─────────────────────
   pg_cron: Daily settlement job
        │
        ▼
   For each tenant with pending settlements:
        │
        ├──► razorpayService.createTransfer({
        │         account_id: tenant's linked account,
        │         amount: total - platform_fee
        │    })
        │
        └──► UPDATE t_contract_invoice SET settlement_status = 'settled'
```

---

## 6. Database Schema

### 6.1 Schema Evolution Strategy

**Principle**: Evolve existing tables, add new tables. No breaking changes.

### 6.2 Existing Tables - Modifications

#### `t_bm_plan_version` - Enhanced tiers JSONB

```sql
-- Current structure (keep backwards compatible)
ALTER TABLE t_bm_plan_version
  ADD COLUMN IF NOT EXISTS billing_config JSONB DEFAULT '{}';

-- billing_config structure:
{
  "billing_model": "composite",  -- composite, tiered, usage, flat
  "product_code": "contractnest",

  "base_fee": {
    "amount": 500,
    "cycle": "monthly",
    "included_users": 2,
    "user_tiers": [...]
  },

  "unit_charges": {
    "contract": { "base_price": 150, "tiers": [...] }
  },

  "storage": {
    "included_mb": 40,
    "overage_per_mb": 0.50
  },

  "credits": {
    "notifications": {
      "included": 10,
      "topup_packs": [...],
      "expiry_days": null
    }
  },

  "addons": {
    "vani_ai": { "price": 5000, "cycle": "monthly" }
  },

  "trial": { "days": 14, "grace_days": 7 },

  "grace_period": { "days": 7, "access_level": "full" }
}
```

#### `t_bm_tenant_subscription` - Enhanced

```sql
ALTER TABLE t_bm_tenant_subscription
  ADD COLUMN IF NOT EXISTS product_code TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_billing_date DATE,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add status enum
-- 'trial', 'active', 'grace_period', 'suspended', 'cancelled', 'expired'
```

#### `t_bm_subscription_usage` - Multi-metric

```sql
-- Add indexes for efficient aggregation
CREATE INDEX IF NOT EXISTS idx_usage_tenant_period
  ON t_bm_subscription_usage (tenant_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_usage_metric_period
  ON t_bm_subscription_usage (tenant_id, metric_type, recorded_at);

-- Ensure metric_type supports all types
-- 'contract', 'user', 'storage_mb', 'notification_email',
-- 'notification_sms', 'notification_whatsapp', 'ai_report', 'api_call'
```

#### `t_bm_invoice` - Enhanced

```sql
ALTER TABLE t_bm_invoice
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'platform',  -- platform, contract
  ADD COLUMN IF NOT EXISTS billing_period_start DATE,
  ADD COLUMN IF NOT EXISTS billing_period_end DATE,
  ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS razorpay_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_short_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_attempt TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;
```

### 6.3 New Tables

#### `t_bm_product_config`

```sql
CREATE TABLE t_bm_product_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code TEXT UNIQUE NOT NULL,  -- 'contractnest', 'familyknows', 'kaladristi', 'custom'
    product_name TEXT NOT NULL,
    billing_config JSONB NOT NULL,      -- Full product billing model (see section 4)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_product_config_code ON t_bm_product_config (product_code);
```

#### `t_bm_credit_balance`

```sql
CREATE TABLE t_bm_credit_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    credit_type TEXT NOT NULL,          -- 'notification', 'ai_report', etc.
    channel TEXT,                        -- 'email', 'sms', 'whatsapp' (for notifications)
    balance INTEGER NOT NULL DEFAULT 0,
    last_topup_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,              -- null = never expires
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_tenant_credit_channel UNIQUE (tenant_id, credit_type, channel)
);

-- Indexes
CREATE INDEX idx_credit_balance_tenant ON t_bm_credit_balance (tenant_id);
CREATE INDEX idx_credit_balance_expiry ON t_bm_credit_balance (expires_at)
  WHERE expires_at IS NOT NULL;
```

#### `t_bm_credit_transaction`

```sql
CREATE TABLE t_bm_credit_transaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    credit_type TEXT NOT NULL,
    channel TEXT,
    transaction_type TEXT NOT NULL,     -- 'topup', 'deduction', 'expiry', 'adjustment'
    quantity INTEGER NOT NULL,          -- positive for topup, negative for deduction
    balance_after INTEGER NOT NULL,
    reference_type TEXT,                -- 'invoice', 'jtd', 'manual', 'subscription'
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Indexes
CREATE INDEX idx_credit_tx_tenant ON t_bm_credit_transaction (tenant_id, created_at);
CREATE INDEX idx_credit_tx_reference ON t_bm_credit_transaction (reference_type, reference_id);
```

#### `t_bm_topup_pack`

```sql
CREATE TABLE t_bm_topup_pack (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code TEXT NOT NULL,
    credit_type TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    currency_code TEXT DEFAULT 'INR',
    expiry_days INTEGER,                -- null = never expires
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_topup_pack_product ON t_bm_topup_pack (product_code, credit_type)
  WHERE is_active = true;
```

#### `t_contract_invoice` (Contract Billing - Level 2)

```sql
CREATE TABLE t_contract_invoice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenant (who is billing)
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    contract_id UUID REFERENCES contracts(id),

    -- Customer (who is being billed - external)
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    customer_address JSONB,
    customer_gstin TEXT,

    -- Invoice details
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,

    -- Amount
    currency_code TEXT DEFAULT 'INR',
    subtotal NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL,

    -- Line items
    line_items JSONB NOT NULL,
    -- [{ description, hsn_code, quantity, unit_price, tax_rate, amount }]

    -- Payment
    payment_status TEXT DEFAULT 'pending',
    -- 'pending', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'refunded'
    razorpay_payment_link_id TEXT,
    razorpay_payment_id TEXT,
    paid_at TIMESTAMPTZ,
    paid_amount NUMERIC(12, 2),

    -- Settlement to tenant
    settlement_status TEXT DEFAULT 'pending',
    -- 'pending', 'processing', 'settled', 'failed'
    settlement_amount NUMERIC(12, 2),
    platform_fee NUMERIC(12, 2),
    platform_fee_percentage NUMERIC(5, 2) DEFAULT 2.5,
    razorpay_transfer_id TEXT,
    settled_at TIMESTAMPTZ,

    -- Notifications sent
    notifications_sent JSONB DEFAULT '[]',
    -- [{ type: 'invoice_sent', sent_at, channel, jtd_id }]

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    -- Constraints
    CONSTRAINT unique_tenant_invoice_number UNIQUE (tenant_id, invoice_number)
);

-- Indexes
CREATE INDEX idx_contract_invoice_tenant ON t_contract_invoice (tenant_id, invoice_date);
CREATE INDEX idx_contract_invoice_contract ON t_contract_invoice (contract_id);
CREATE INDEX idx_contract_invoice_payment ON t_contract_invoice (payment_status, due_date);
CREATE INDEX idx_contract_invoice_settlement ON t_contract_invoice (settlement_status)
  WHERE settlement_status = 'pending';
```

#### `t_bm_billing_event`

```sql
CREATE TABLE t_bm_billing_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    -- 'subscription_created', 'subscription_renewed', 'subscription_cancelled',
    -- 'trial_started', 'trial_expired', 'grace_started', 'grace_ended',
    -- 'account_suspended', 'account_restored', 'invoice_generated',
    -- 'payment_received', 'payment_failed', 'credits_purchased',
    -- 'credits_deducted', 'credits_expired'
    event_data JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_billing_event_tenant ON t_bm_billing_event (tenant_id, created_at);
CREATE INDEX idx_billing_event_unprocessed ON t_bm_billing_event (event_type, processed)
  WHERE processed = false;
```

### 6.4 Database Functions

#### Credit Deduction with Locking

```sql
CREATE OR REPLACE FUNCTION deduct_credits(
    p_tenant_id UUID,
    p_credit_type TEXT,
    p_channel TEXT,
    p_quantity INTEGER,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    balance_after INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_balance_id UUID;
BEGIN
    -- Lock the row for update (prevents race conditions)
    SELECT id, balance INTO v_balance_id, v_current_balance
    FROM t_bm_credit_balance
    WHERE tenant_id = p_tenant_id
      AND credit_type = p_credit_type
      AND (channel = p_channel OR (channel IS NULL AND p_channel IS NULL))
      AND (expires_at IS NULL OR expires_at > NOW())
    FOR UPDATE;

    -- Check if balance exists and sufficient
    IF v_balance_id IS NULL THEN
        RETURN QUERY SELECT false, 0, 'No credit balance found';
        RETURN;
    END IF;

    IF v_current_balance < p_quantity THEN
        RETURN QUERY SELECT false, v_current_balance,
            'Insufficient credits. Available: ' || v_current_balance;
        RETURN;
    END IF;

    -- Deduct credits
    v_new_balance := v_current_balance - p_quantity;

    UPDATE t_bm_credit_balance
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = v_balance_id;

    -- Record transaction
    INSERT INTO t_bm_credit_transaction (
        tenant_id, credit_type, channel, transaction_type,
        quantity, balance_after, reference_type, reference_id
    ) VALUES (
        p_tenant_id, p_credit_type, p_channel, 'deduction',
        -p_quantity, v_new_balance, p_reference_type, p_reference_id
    );

    RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;
```

#### Usage Aggregation

```sql
CREATE OR REPLACE FUNCTION aggregate_usage(
    p_tenant_id UUID,
    p_period_start TIMESTAMPTZ,
    p_period_end TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_object_agg(metric_type, total_quantity)
    INTO v_result
    FROM (
        SELECT metric_type, SUM(quantity) as total_quantity
        FROM t_bm_subscription_usage
        WHERE tenant_id = p_tenant_id
          AND recorded_at >= p_period_start
          AND recorded_at < p_period_end
        GROUP BY metric_type
    ) aggregated;

    RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;
```

---

## 7. API Design

### 7.1 New Endpoints

#### Billing Service Endpoints

```
POST   /api/billing/usage                    # Record usage event
GET    /api/billing/usage/:tenantId          # Get usage summary
GET    /api/billing/subscription/:tenantId   # Get subscription status
POST   /api/billing/invoice/generate         # Manual invoice generation
GET    /api/billing/invoice/:tenantId        # List invoices
GET    /api/billing/invoice/:id/download     # Download invoice PDF
POST   /api/billing/credits/topup            # Purchase credit pack
GET    /api/billing/credits/:tenantId        # Get credit balances
POST   /api/billing/credits/deduct           # Manual credit deduction
GET    /api/billing/limits/:tenantId         # Check feature limits
```

#### Contract Billing Endpoints

```
POST   /api/contract-billing/invoice              # Create customer invoice
GET    /api/contract-billing/invoice/:tenantId    # List customer invoices
GET    /api/contract-billing/invoice/:id          # Get invoice details
POST   /api/contract-billing/invoice/:id/send     # Send/resend invoice
POST   /api/contract-billing/invoice/:id/cancel   # Cancel invoice
GET    /api/contract-billing/settlements          # Settlement history
```

#### Bot Query Endpoints

```
GET    /api/billing/status/:tenantId         # Quick status for bot
GET    /api/billing/summary/:tenantId        # Detailed summary for bot
GET    /api/billing/recommendations/:tenantId # AI recommendations
```

### 7.2 Request/Response Examples

#### Record Usage

```typescript
// POST /api/billing/usage
// Request
{
  "tenant_id": "uuid",
  "metric_type": "contract",
  "quantity": 1,
  "metadata": {
    "contract_id": "uuid",
    "contract_type": "standard"
  }
}

// Response
{
  "success": true,
  "usage_id": "uuid",
  "current_period_total": 45,
  "limit": 50,
  "warning": "Approaching limit (90%)"
}
```

#### Get Billing Status (Bot-Friendly)

```typescript
// GET /api/billing/status/:tenantId
// Response
{
  "tenant_id": "uuid",
  "product": "contractnest",
  "status": "active",  // active, trial, grace_period, suspended
  "plan": "Professional",
  "billing_cycle": "quarterly",

  "current_period": {
    "start": "2025-01-01",
    "end": "2025-03-31",
    "days_remaining": 45
  },

  "usage": {
    "contracts": { "used": 45, "limit": 50, "percentage": 90 },
    "users": { "used": 4, "included": 2, "extra": 2 },
    "storage_mb": { "used": 35, "included": 40, "overage": 0 }
  },

  "credits": {
    "notifications": { "balance": 120, "low_threshold": 50, "warning": false }
  },

  "next_invoice": {
    "date": "2025-04-01",
    "estimated_amount": 4500,
    "currency": "INR"
  },

  "alerts": [
    { "type": "warning", "message": "Contract usage at 90% of limit" }
  ],

  "quick_actions": [
    { "action": "upgrade_plan", "label": "Upgrade to Enterprise" },
    { "action": "buy_credits", "label": "Buy notification credits" }
  ]
}
```

### 7.3 API Service Layer Structure

```
contractnest-api/src/services/billing/
├── index.ts                    # Exports all billing services
├── billingService.ts           # Main billing operations
├── pricingEngine.ts            # Price calculations
├── usageService.ts             # Usage recording & aggregation
├── creditService.ts            # Credit management
├── invoiceService.ts           # Invoice generation
├── subscriptionService.ts      # Subscription lifecycle
├── contractBillingService.ts   # Contract-level billing
├── razorpayService.ts          # Razorpay API integration
└── billingQueryService.ts      # Bot-friendly queries
```

---

## 8. Edge Functions

### 8.1 New Edge Functions

#### `billing-cycle-worker`

```typescript
// supabase/functions/billing-cycle-worker/index.ts

/**
 * Triggered by pg_cron on 1st of each billing period
 * Processes all tenants due for billing
 */

interface BillingJob {
  tenant_id: string;
  subscription_id: string;
  product_code: string;
  billing_cycle: 'monthly' | 'quarterly' | 'annual';
  period_start: string;
  period_end: string;
}

// Main flow:
// 1. Get all subscriptions due for billing
// 2. For each subscription:
//    a. Aggregate usage from t_bm_subscription_usage
//    b. Load product config
//    c. Calculate price using pricing engine
//    d. Generate invoice record
//    e. Create Razorpay invoice
//    f. Queue JTD notification
// 3. Handle failures with retry queue
```

#### `razorpay-webhook`

```typescript
// supabase/functions/razorpay-webhook/index.ts

/**
 * Handles all Razorpay webhook events
 * - payment.captured
 * - payment.failed
 * - invoice.paid
 * - subscription.charged
 * - etc.
 */

// Security:
// 1. Verify webhook signature
// 2. Identify invoice type (platform vs contract)
// 3. Route to appropriate handler
// 4. Idempotency check (prevent duplicate processing)
```

#### `usage-aggregator`

```typescript
// supabase/functions/usage-aggregator/index.ts

/**
 * Triggered before billing cycle
 * Pre-aggregates usage data for faster invoice generation
 */
```

### 8.2 pg_cron Jobs

```sql
-- Billing cycle (1st of month at 00:05)
SELECT cron.schedule(
    'billing-cycle-monthly',
    '5 0 1 * *',
    $$SELECT invoke_edge_function('billing-cycle-worker', '{"cycle": "monthly"}')$$
);

-- Billing cycle quarterly (1st of Jan, Apr, Jul, Oct)
SELECT cron.schedule(
    'billing-cycle-quarterly',
    '10 0 1 1,4,7,10 *',
    $$SELECT invoke_edge_function('billing-cycle-worker', '{"cycle": "quarterly"}')$$
);

-- Trial expiry check (daily at 00:00)
SELECT cron.schedule(
    'trial-expiry-check',
    '0 0 * * *',
    $$SELECT invoke_edge_function('subscription-lifecycle', '{"action": "check_trial_expiry"}')$$
);

-- Grace period check (daily at 00:15)
SELECT cron.schedule(
    'grace-period-check',
    '15 0 * * *',
    $$SELECT invoke_edge_function('subscription-lifecycle', '{"action": "check_grace_period"}')$$
);

-- Credit expiry check (daily at 01:00)
SELECT cron.schedule(
    'credit-expiry-check',
    '0 1 * * *',
    $$SELECT invoke_edge_function('credit-lifecycle', '{"action": "expire_credits"}')$$
);
```

---

## 9. UI Design

### 9.1 Pages to Evolve

| Current Page | Evolution |
|--------------|-----------|
| `pricing-plans/create.tsx` | Add product selector, composite billing builder |
| `pricing-plans/edit.tsx` | Support new billing_config structure |
| `pricing-plans/detail.tsx` | Show all billing components (base, usage, credits) |
| `tenants/pricing-plans/index.tsx` | Show current usage, credits, next invoice |
| `tenants/Subscription/index.tsx` | Full subscription details + payment history |
| `billing/index.tsx` | Enhanced dashboard with all billing metrics |

### 9.2 New Components

```
components/businessModel/
├── ProductSelector.tsx           # Select product for plan
├── CompositeBillingBuilder/
│   ├── index.tsx
│   ├── BaseFeeStep.tsx           # Configure base fee + user tiers
│   ├── UsageChargesStep.tsx      # Configure per-unit charges
│   ├── StorageStep.tsx           # Configure storage limits
│   ├── CreditsStep.tsx           # Configure notification credits
│   ├── AddonsStep.tsx            # Configure add-ons (VaNi, etc.)
│   └── TrialGraceStep.tsx        # Configure trial & grace periods
├── UsageDashboard/
│   ├── index.tsx
│   ├── UsageMetricCard.tsx       # Show usage with progress bar
│   ├── UsageChart.tsx            # Historical usage chart
│   └── UsageAlerts.tsx           # Approaching limit warnings
├── CreditManager/
│   ├── index.tsx
│   ├── CreditBalance.tsx         # Current balance display
│   ├── TopupModal.tsx            # Buy credit packs
│   └── CreditHistory.tsx         # Transaction history
├── ContractBilling/
│   ├── CreateInvoiceModal.tsx    # Create invoice for customer
│   ├── InvoiceList.tsx           # List customer invoices
│   ├── InvoiceDetail.tsx         # Invoice detail with actions
│   └── SettlementHistory.tsx     # Payment settlements
└── BillingBot/
    └── BillingStatusWidget.tsx   # Widget for chatbot integration
```

---

## 10. JTD Integration

### 10.1 New Source Types

```sql
INSERT INTO n_jtd_source_types (code, name, description, default_channels) VALUES
-- Platform Billing
('invoice_generated', 'Invoice Generated', 'New invoice created', '["email"]'),
('invoice_reminder', 'Invoice Reminder', 'Invoice payment reminder', '["email", "sms"]'),
('payment_received', 'Payment Received', 'Payment confirmation', '["email"]'),
('payment_failed', 'Payment Failed', 'Payment attempt failed', '["email", "sms"]'),
('payment_overdue', 'Payment Overdue', 'Payment significantly overdue', '["email", "sms", "whatsapp"]'),

-- Subscription Lifecycle
('subscription_created', 'Subscription Created', 'New subscription activated', '["email"]'),
('subscription_renewing', 'Subscription Renewing', 'Renewal reminder', '["email"]'),
('subscription_renewed', 'Subscription Renewed', 'Renewal confirmation', '["email"]'),
('subscription_cancelled', 'Subscription Cancelled', 'Subscription terminated', '["email"]'),

-- Trial & Grace
('trial_started', 'Trial Started', 'Trial period began', '["email"]'),
('trial_expiring', 'Trial Expiring', 'Trial ending soon', '["email", "inapp"]'),
('trial_expired', 'Trial Expired', 'Trial period ended', '["email"]'),
('grace_period_started', 'Grace Period Started', 'Grace period notification', '["email", "sms"]'),
('grace_period_ending', 'Grace Period Ending', 'Grace ending soon', '["email", "sms", "whatsapp"]'),
('account_suspended', 'Account Suspended', 'Account suspended', '["email", "sms"]'),
('account_restored', 'Account Restored', 'Account restored', '["email"]'),

-- Credits
('credits_low', 'Credits Low', 'Credits running low', '["email", "inapp"]'),
('credits_exhausted', 'Credits Exhausted', 'No credits remaining', '["email", "inapp"]'),
('credits_purchased', 'Credits Purchased', 'Credit topup confirmation', '["email"]'),

-- Contract Billing (Tenant → Customer)
('contract_invoice_generated', 'Contract Invoice Generated', 'Invoice sent to customer', '["email"]'),
('contract_invoice_reminder', 'Contract Invoice Reminder', 'Payment reminder to customer', '["email", "sms"]'),
('contract_payment_received', 'Contract Payment Received', 'Customer payment received', '["email"]'),
('contract_settlement_completed', 'Settlement Completed', 'Funds settled to tenant', '["email"]');
```

### 10.2 Template Variables

```typescript
// For invoice_generated
{
  tenant_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  currency: string;
  line_items: Array<{ description: string; amount: number }>;
  payment_link: string;
  invoice_pdf_url: string;
}

// For trial_expiring
{
  tenant_name: string;
  trial_end_date: string;
  days_remaining: number;
  plan_name: string;
  upgrade_url: string;
}

// For credits_low
{
  tenant_name: string;
  credit_type: string;
  current_balance: number;
  low_threshold: number;
  topup_url: string;
}
```

---

## 11. Razorpay Integration

### 11.1 Platform Billing Flow

```typescript
// Get platform Razorpay credentials
async function getPlatformRazorpayCredentials(): Promise<RazorpayCredentials> {
  // Get admin tenant (platform owner)
  const adminTenant = await db.query(`
    SELECT id FROM tenants WHERE admin = true LIMIT 1
  `);

  // Get Razorpay integration
  const integration = await db.query(`
    SELECT ti.credentials
    FROM t_tenant_integrations ti
    JOIN t_integration_providers ip ON ti.master_integration_id = ip.id
    WHERE ti.tenant_id = $1
      AND ip.name = 'razorpay'
      AND ti.is_active = true
  `, [adminTenant.id]);

  // Decrypt and return
  return decryptCredentials(integration.credentials);
}
```

### 11.2 Tenant Billing Flow (Contract Level)

```typescript
// Get tenant's Razorpay credentials
async function getTenantRazorpayCredentials(tenantId: string): Promise<RazorpayCredentials | null> {
  const integration = await db.query(`
    SELECT ti.credentials, ti.is_live
    FROM t_tenant_integrations ti
    JOIN t_integration_providers ip ON ti.master_integration_id = ip.id
    WHERE ti.tenant_id = $1
      AND ip.name = 'razorpay'
      AND ti.is_active = true
  `, [tenantId]);

  if (!integration) return null;

  return {
    ...decryptCredentials(integration.credentials),
    is_live: integration.is_live
  };
}
```

### 11.3 Razorpay API Operations

```typescript
// razorpayService.ts

export class RazorpayService {
  // Platform billing
  async createInvoice(invoice: InvoiceData): Promise<RazorpayInvoice>;
  async getInvoice(invoiceId: string): Promise<RazorpayInvoice>;
  async cancelInvoice(invoiceId: string): Promise<void>;

  // Contract billing (uses tenant's credentials)
  async createPaymentLink(tenantId: string, data: PaymentLinkData): Promise<RazorpayPaymentLink>;
  async getPaymentLink(tenantId: string, linkId: string): Promise<RazorpayPaymentLink>;

  // Settlements
  async createTransfer(tenantId: string, amount: number): Promise<RazorpayTransfer>;

  // Webhooks
  verifyWebhookSignature(body: string, signature: string, secret: string): boolean;
}
```

### 11.4 Webhook Events to Handle

| Event | Action |
|-------|--------|
| `payment.captured` | Mark invoice paid, update subscription |
| `payment.failed` | Increment attempt, trigger dunning |
| `invoice.paid` | Confirm invoice payment |
| `subscription.charged` | Record renewal |
| `subscription.cancelled` | Update subscription status |
| `payment_link.paid` | Contract invoice paid, queue settlement |
| `transfer.processed` | Mark settlement complete |

---

## 12. Concurrency & Race Conditions

### 12.1 Critical Sections

| Operation | Risk | Mitigation |
|-----------|------|------------|
| Credit deduction | Double deduction | Row-level lock with `FOR UPDATE` |
| Usage recording | Lost updates | Atomic `INSERT` (no update needed) |
| Invoice generation | Duplicate invoices | Unique constraint on (tenant, period) |
| Payment processing | Double processing | Idempotency key + status check |
| Subscription update | Race between webhook and UI | Optimistic locking with version |

### 12.2 Credit Deduction (Detailed)

```sql
-- CORRECT: Using FOR UPDATE
BEGIN;
  SELECT balance FROM t_bm_credit_balance
  WHERE tenant_id = $1 AND credit_type = $2
  FOR UPDATE;  -- Locks row until commit

  -- Check balance >= required
  -- Update balance
  -- Insert transaction
COMMIT;

-- WRONG: No locking
SELECT balance FROM t_bm_credit_balance WHERE ...;
-- Another request could deduct between SELECT and UPDATE!
UPDATE t_bm_credit_balance SET balance = balance - $1 WHERE ...;
```

### 12.3 Webhook Idempotency

```typescript
async function processWebhook(event: RazorpayEvent) {
  const eventId = event.id;

  // Check if already processed
  const existing = await db.query(`
    SELECT id FROM t_bm_billing_event
    WHERE event_type = $1 AND event_data->>'razorpay_event_id' = $2
  `, [event.event, eventId]);

  if (existing) {
    console.log('Duplicate webhook, skipping');
    return { status: 'already_processed' };
  }

  // Process with transaction
  await db.transaction(async (tx) => {
    // Insert event record first (idempotency marker)
    await tx.insert('t_bm_billing_event', {
      event_type: event.event,
      event_data: { razorpay_event_id: eventId, ...event.payload }
    });

    // Process the event
    await handleEvent(tx, event);
  });
}
```

### 12.4 Optimistic Locking for Subscriptions

```sql
-- Add version column
ALTER TABLE t_bm_tenant_subscription ADD COLUMN version INTEGER DEFAULT 1;

-- Update with version check
UPDATE t_bm_tenant_subscription
SET status = $2, version = version + 1, updated_at = NOW()
WHERE id = $1 AND version = $3
RETURNING version;

-- If no rows returned, someone else updated it - retry or fail
```

### 12.5 Parallel User Support (500+)

| Layer | Strategy |
|-------|----------|
| **Database** | Connection pooling (PgBouncer), proper indexing |
| **API** | Stateless design, horizontal scaling ready |
| **Queues** | PGMQ with visibility timeout prevents duplicate processing |
| **Caching** | Cache product configs (rarely change) |
| **Rate Limiting** | Per-tenant API rate limits |

---

## 13. Error Handling Strategy

### 13.1 Error Categories

| Category | Examples | Handling |
|----------|----------|----------|
| **Validation** | Invalid plan config, missing fields | 400 response, clear message |
| **Business Logic** | Insufficient credits, limit exceeded | 422 response, actionable message |
| **External Service** | Razorpay timeout, MSG91 failure | Retry with backoff, fallback |
| **Database** | Connection lost, constraint violation | Retry, alert on repeated failure |
| **Authorization** | Invalid token, tenant mismatch | 401/403 response |

### 13.2 Retry Strategy

```typescript
// For external API calls (Razorpay, MSG91)
const retryConfig = {
  maxRetries: 3,
  backoff: 'exponential',
  initialDelay: 1000,  // 1s, 2s, 4s
  maxDelay: 10000,
  retryableErrors: ['TIMEOUT', 'RATE_LIMITED', 'SERVICE_UNAVAILABLE']
};

// For billing cycle failures
// 1. Log failure with full context
// 2. Queue for retry (PGMQ with delay)
// 3. After 3 failures, move to DLQ
// 4. Alert operations team
```

### 13.3 Error Response Format

```typescript
// Standard error response
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Not enough notification credits",
    "details": {
      "required": 5,
      "available": 3,
      "credit_type": "notification",
      "channel": "whatsapp"
    },
    "action": {
      "type": "topup",
      "url": "/billing/credits/topup"
    }
  }
}
```

### 13.4 Logging & Monitoring

```typescript
// All billing operations logged
await logBillingEvent({
  tenant_id: tenantId,
  operation: 'invoice_generated',
  status: 'success',
  duration_ms: 1234,
  metadata: { invoice_id: invoiceId, amount: 4500 }
});

// Alerts for:
// - Invoice generation failure rate > 5%
// - Payment webhook processing time > 5s
// - Credit deduction failures
// - Razorpay API errors
```

---

## 14. Bot-Friendly Architecture

### 14.1 Design Principles

1. **Structured Responses**: All responses in consistent JSON format
2. **Natural Language Ready**: Include human-readable summaries
3. **Action Suggestions**: Provide actionable next steps
4. **Quick Status**: Single endpoint for overall status

### 14.2 Bot Query Endpoints

```typescript
// GET /api/billing/bot/status/:tenantId
{
  "summary": "Your ContractNest subscription is active. You've used 45 of 50 contracts this quarter.",

  "status": {
    "subscription": "active",
    "plan": "Professional",
    "days_until_renewal": 45
  },

  "alerts": [
    {
      "severity": "warning",
      "message": "Contract usage at 90%. Consider upgrading.",
      "action": "upgrade_plan"
    }
  ],

  "quick_stats": {
    "contracts_used": "45/50",
    "notification_credits": 120,
    "storage_used": "35/40 MB",
    "pending_invoices": 0
  },

  "suggested_queries": [
    "Show my invoice history",
    "How much will my next bill be?",
    "Buy more notification credits"
  ]
}
```

### 14.3 Natural Language Queries

```typescript
// POST /api/billing/bot/query
{
  "query": "How much will my next bill be?",
  "tenant_id": "uuid"
}

// Response
{
  "answer": "Based on your current usage, your next quarterly bill (due April 1st) is estimated at ₹4,500. This includes platform fees (₹1,500), 45 contracts (₹6,750 at tiered rates), minus your included allowance.",

  "breakdown": {
    "platform_fee": 1500,
    "contract_charges": 4250,
    "storage_overage": 0,
    "total": 5750,
    "currency": "INR",
    "due_date": "2025-04-01"
  },

  "follow_up": [
    "Would you like to see a detailed breakdown?",
    "Want to pre-pay and get a 5% discount?"
  ]
}
```

### 14.4 VaNi Integration Points

```typescript
// VaNi can:
// 1. Query billing status on behalf of user
// 2. Suggest upgrades based on usage patterns
// 3. Alert about approaching limits
// 4. Help with invoice disputes
// 5. Process simple billing requests (topup credits)

// VaNi actions
const vaniActions = {
  'check_billing_status': async (tenantId) => {
    return billingQueryService.getStatus(tenantId);
  },

  'suggest_plan': async (tenantId) => {
    const usage = await usageService.getUsage(tenantId);
    return pricingEngine.suggestOptimalPlan(usage);
  },

  'topup_credits': async (tenantId, packId) => {
    return creditService.purchaseTopup(tenantId, packId);
  }
};
```

---

## 15. Implementation Phases

### Phase 1: Schema & Product Configs (Foundation)

**Duration**: 1 sprint

**Deliverables**:
- [ ] Database migrations (new tables, column additions)
- [ ] `t_bm_product_config` with ContractNest config
- [ ] Database functions (deduct_credits, aggregate_usage)
- [ ] Update Edge function utils for new schema

**Files Modified**:
```
contractnest-edge/
├── supabase/migrations/
│   └── business-model-v2/
│       ├── 001_schema_evolution.sql
│       ├── 002_new_tables.sql
│       ├── 003_functions.sql
│       └── 004_seed_product_configs.sql
└── supabase/functions/
    └── utils/business-model.ts (update validators)
```

**Success Criteria**:
- All migrations run successfully
- Existing plan data preserved
- Product configs queryable

---

### Phase 2: Billing Service Layer

**Duration**: 1 sprint

**Deliverables**:
- [ ] `billingService.ts` - Core billing operations
- [ ] `pricingEngine.ts` - Price calculations
- [ ] `usageService.ts` - Usage recording
- [ ] `creditService.ts` - Credit management
- [ ] API endpoints for billing operations

**Files Created**:
```
contractnest-api/src/services/billing/
├── index.ts
├── billingService.ts
├── pricingEngine.ts
├── usageService.ts
├── creditService.ts
├── invoiceService.ts
└── subscriptionService.ts

contractnest-api/src/routes/
└── billingRoutes.ts

contractnest-api/src/controllers/
└── billingController.ts
```

**Success Criteria**:
- Usage recording works from product events
- Price calculation matches product config
- Credit deduction with proper locking
- All API endpoints responding

---

### Phase 3: JTD Billing Notifications

**Duration**: 0.5 sprint

**Deliverables**:
- [ ] New source types in n_jtd_source_types
- [ ] Billing notification templates
- [ ] Integration with billing service

**Files Modified**:
```
contractnest-edge/
└── supabase/migrations/
    └── business-model-v2/
        └── 005_jtd_billing_source_types.sql

contractnest-api/src/services/billing/
└── billingNotificationService.ts
```

**Success Criteria**:
- All billing events trigger JTD notifications
- Templates render correctly
- Notifications delivered via configured channels

---

### Phase 4: Plan UI Evolution

**Duration**: 1.5 sprints

**Deliverables**:
- [ ] Product selector in plan creation
- [ ] Composite billing builder (multi-step wizard)
- [ ] Usage dashboard components
- [ ] Credit manager UI
- [ ] Updated plan detail views

**Files Modified/Created**:
```
contractnest-ui/src/
├── pages/settings/businessmodel/admin/pricing-plans/
│   ├── create.tsx (evolve)
│   └── edit.tsx (evolve)
├── components/businessModel/
│   ├── ProductSelector.tsx
│   ├── CompositeBillingBuilder/
│   │   ├── index.tsx
│   │   ├── BaseFeeStep.tsx
│   │   ├── UsageChargesStep.tsx
│   │   └── ...
│   ├── UsageDashboard/
│   └── CreditManager/
└── types/businessModel.ts (extend)
```

**Success Criteria**:
- Can create plans for any product
- Composite billing config saved correctly
- Usage displays accurately
- Credits can be managed

---

### Phase 5: Razorpay Integration

**Duration**: 1 sprint

**Deliverables**:
- [ ] `razorpayService.ts` in API
- [ ] `razorpay-webhook` Edge function
- [ ] Invoice creation with Razorpay
- [ ] Payment status sync

**Files Created**:
```
contractnest-api/src/services/billing/
└── razorpayService.ts

contractnest-edge/supabase/functions/
└── razorpay-webhook/
    └── index.ts
```

**Success Criteria**:
- Invoices created in Razorpay
- Webhooks processed correctly
- Payment status reflected in DB
- Idempotency working

---

### Phase 6: Contract Billing (Level 2)

**Duration**: 1 sprint

**Deliverables**:
- [ ] `contractBillingService.ts`
- [ ] Contract invoice UI
- [ ] Customer payment links
- [ ] Settlement tracking

**Files Created**:
```
contractnest-api/src/services/billing/
└── contractBillingService.ts

contractnest-api/src/routes/
└── contractBillingRoutes.ts

contractnest-ui/src/
├── pages/contracts/billing/
│   ├── index.tsx
│   └── create-invoice.tsx
└── components/businessModel/ContractBilling/
    ├── CreateInvoiceModal.tsx
    └── ...
```

**Success Criteria**:
- Tenants can create invoices for customers
- Customers receive payment links
- Payments tracked and settled
- Platform fee calculated correctly

---

### Phase 7: n8n Dunning Workflows

**Duration**: 0.5 sprint

**Deliverables**:
- [ ] n8n workflow: Platform dunning sequence
- [ ] n8n workflow: Contract billing reminders
- [ ] Webhook triggers from billing events

**Files Created**:
```
(n8n workflow exports)
n8n-workflows/
├── platform-dunning.json
└── contract-billing-reminders.json
```

**Success Criteria**:
- Payment failure triggers dunning
- Reminders sent on schedule
- Grace period and suspension automated

---

### Phase 8: Billing Cycle Automation

**Duration**: 0.5 sprint

**Deliverables**:
- [ ] `billing-cycle-worker` Edge function
- [ ] pg_cron job configuration
- [ ] Subscription lifecycle automation

**Files Created**:
```
contractnest-edge/supabase/functions/
├── billing-cycle-worker/
│   └── index.ts
└── subscription-lifecycle/
    └── index.ts

contractnest-edge/supabase/migrations/
└── business-model-v2/
    └── 006_cron_jobs.sql
```

**Success Criteria**:
- Billing cycle runs on schedule
- Invoices generated for all active subscriptions
- Trial/grace period transitions automated

---

### Phase 9: Multi-Product Configs

**Duration**: 0.5 sprint

**Deliverables**:
- [ ] FamilyKnows product config
- [ ] Kaladristi product config
- [ ] Custom client config template

**Files Modified**:
```
contractnest-edge/supabase/migrations/
└── business-model-v2/
    └── 007_additional_product_configs.sql
```

**Success Criteria**:
- All products configurable
- Billing works for each product type

---

### Phase 10: Bot Integration & Polish

**Duration**: 0.5 sprint

**Deliverables**:
- [ ] Bot query endpoints
- [ ] VaNi billing actions
- [ ] Documentation
- [ ] Performance optimization

**Files Created**:
```
contractnest-api/src/services/billing/
└── billingQueryService.ts

contractnest-api/src/routes/
└── billingBotRoutes.ts
```

**Success Criteria**:
- Bot can query billing status
- Natural language responses
- Performance meets targets

---

## 16. Testing Strategy

### 16.1 Unit Tests

```typescript
// pricingEngine.test.ts
describe('PricingEngine', () => {
  describe('calculateTieredPrice', () => {
    it('should calculate correct price for first tier', () => {
      const tiers = [
        { from: 1, to: 50, price: 150 },
        { from: 51, to: 200, price: 120 }
      ];
      expect(calculateTieredPrice(tiers, 30)).toBe(4500); // 30 * 150
    });

    it('should calculate correct price across tiers', () => {
      const tiers = [...];
      expect(calculateTieredPrice(tiers, 75)).toBe(10500); // 50*150 + 25*120
    });
  });

  describe('calculateBaseFee', () => {
    it('should return base fee for included users', () => {...});
    it('should add extra user charges', () => {...});
  });
});
```

### 16.2 Integration Tests

```typescript
// billingService.integration.test.ts
describe('BillingService Integration', () => {
  it('should record usage and update aggregates', async () => {
    await billingService.recordUsage(tenantId, 'contract', 1);
    const usage = await billingService.getUsageSummary(tenantId);
    expect(usage.contracts).toBe(1);
  });

  it('should deduct credits atomically', async () => {
    // Run 10 concurrent deductions of 1 credit each
    // Starting balance: 5
    // Expected: 5 succeed, 5 fail with insufficient credits
  });
});
```

### 16.3 Load Tests

```yaml
# k6 load test config
scenarios:
  billing_status:
    executor: constant-vus
    vus: 100
    duration: 5m
    exec: getBillingStatus

  record_usage:
    executor: ramping-vus
    startVUs: 10
    stages:
      - duration: 2m, target: 500
      - duration: 5m, target: 500
      - duration: 2m, target: 0
    exec: recordUsage
```

---

## 17. Rollback Plan

### 17.1 Database Rollback

```sql
-- Each migration has a corresponding down migration
-- Example: 001_schema_evolution_down.sql

ALTER TABLE t_bm_plan_version DROP COLUMN IF EXISTS billing_config;
ALTER TABLE t_bm_tenant_subscription DROP COLUMN IF EXISTS product_code;
-- etc.
```

### 17.2 Feature Flags

```typescript
// Feature flags for gradual rollout
const billingFeatures = {
  'billing.composite_pricing': false,      // Phase 1-2
  'billing.razorpay_integration': false,   // Phase 5
  'billing.contract_billing': false,       // Phase 6
  'billing.automated_cycles': false        // Phase 8
};

// Usage
if (featureEnabled('billing.composite_pricing')) {
  return pricingEngine.calculateComposite(subscription, usage);
} else {
  return pricingEngine.calculateLegacy(subscription);
}
```

### 17.3 Rollback Triggers

| Condition | Action |
|-----------|--------|
| Error rate > 10% | Alert, disable feature flag |
| Invoice generation fails > 3 times | Pause billing cycle, alert |
| Razorpay webhook failures > 5/min | Switch to polling, alert |
| Credit deduction deadlocks | Revert to legacy, investigate |

---

## 18. Phase Completion Log

### Template for Each Phase

```markdown
## Phase X: [Name] - COMPLETED

**Completed Date**: YYYY-MM-DD

**Changes Made**:
- [File path]: [Change description]
- [File path]: [Change description]

**Database Changes**:
- Migration: [migration name]
- Tables added/modified: [list]

**API Changes**:
- Endpoints added: [list]
- Endpoints modified: [list]

**UI Changes**:
- Pages added: [list]
- Components added: [list]

**Issues Encountered**:
- [Issue]: [Resolution]

**Testing Results**:
- Unit tests: X passed, Y failed
- Integration tests: X passed
- Load test: [results]

**Performance Metrics**:
- [Metric]: [Value]

**Next Phase Dependencies**:
- [What Phase X+1 needs from this phase]
```

---

### Phase 1: Schema & Product Configs - PENDING

**Status**: Not Started

---

### Phase 2: Billing Service Layer - PENDING

**Status**: Not Started

---

*(Continue for all phases)*

---

## Appendix A: File Reference

### Complete File Tree (After All Phases)

```
contractnest-combined/
├── contractnest-api/
│   └── src/
│       ├── controllers/
│       │   ├── billingController.ts
│       │   └── contractBillingController.ts
│       ├── routes/
│       │   ├── billingRoutes.ts
│       │   ├── contractBillingRoutes.ts
│       │   └── billingBotRoutes.ts
│       ├── services/
│       │   └── billing/
│       │       ├── index.ts
│       │       ├── billingService.ts
│       │       ├── pricingEngine.ts
│       │       ├── usageService.ts
│       │       ├── creditService.ts
│       │       ├── invoiceService.ts
│       │       ├── subscriptionService.ts
│       │       ├── contractBillingService.ts
│       │       ├── razorpayService.ts
│       │       ├── billingNotificationService.ts
│       │       └── billingQueryService.ts
│       ├── types/
│       │   └── billing.ts
│       └── validators/
│           └── billingValidators.ts
│
├── contractnest-edge/
│   └── supabase/
│       ├── functions/
│       │   ├── plans/ (existing)
│       │   ├── plan-versions/ (existing)
│       │   ├── billing-cycle-worker/
│       │   │   └── index.ts
│       │   ├── razorpay-webhook/
│       │   │   └── index.ts
│       │   ├── subscription-lifecycle/
│       │   │   └── index.ts
│       │   ├── usage-aggregator/
│       │   │   └── index.ts
│       │   └── utils/
│       │       └── business-model.ts (evolved)
│       └── migrations/
│           └── business-model-v2/
│               ├── 001_schema_evolution.sql
│               ├── 002_new_tables.sql
│               ├── 003_functions.sql
│               ├── 004_seed_product_configs.sql
│               ├── 005_jtd_billing_source_types.sql
│               ├── 006_cron_jobs.sql
│               └── 007_additional_product_configs.sql
│
├── contractnest-ui/
│   └── src/
│       ├── pages/
│       │   ├── settings/businessmodel/admin/pricing-plans/
│       │   │   ├── create.tsx (evolved)
│       │   │   └── edit.tsx (evolved)
│       │   └── contracts/billing/
│       │       ├── index.tsx
│       │       └── create-invoice.tsx
│       ├── components/
│       │   └── businessModel/
│       │       ├── ProductSelector.tsx
│       │       ├── CompositeBillingBuilder/
│       │       ├── UsageDashboard/
│       │       ├── CreditManager/
│       │       ├── ContractBilling/
│       │       └── BillingBot/
│       ├── hooks/
│       │   └── useBilling.ts
│       └── types/
│           └── businessModel.ts (extended)
│
├── ClaudeDocumentation/
│   └── BusinessModel/
│       └── BUSINESS_MODEL_AGENT_PRD.md (this file)
│
└── n8n-workflows/
    ├── platform-dunning.json
    └── contract-billing-reminders.json
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Platform Billing** | ContractNest billing tenants for subscription/usage |
| **Contract Billing** | Tenants billing their customers through the platform |
| **Composite Billing** | Billing model combining base fee + usage + credits + add-ons |
| **Tiered Pricing** | Volume-based pricing where price per unit decreases at thresholds |
| **Credit Balance** | Prepaid units (notifications) that can be consumed |
| **Topup Pack** | Purchasable bundle of credits |
| **Grace Period** | Time after payment failure before account suspension |
| **Dunning** | Process of following up on failed payments |
| **Settlement** | Transfer of collected funds to tenant (Contract Billing) |
| **JTD** | Jobs To Do - notification infrastructure |
| **PGMQ** | PostgreSQL Message Queue - async processing |

---

## Appendix C: API Quick Reference

```
BILLING SERVICE
───────────────
POST   /api/billing/usage                    Record usage event
GET    /api/billing/usage/:tenantId          Get usage summary
GET    /api/billing/subscription/:tenantId   Get subscription status
POST   /api/billing/invoice/generate         Generate invoice
GET    /api/billing/invoice/:tenantId        List invoices
GET    /api/billing/invoice/:id/download     Download PDF
POST   /api/billing/credits/topup            Buy credits
GET    /api/billing/credits/:tenantId        Get balances
POST   /api/billing/credits/deduct           Deduct credits
GET    /api/billing/limits/:tenantId         Check limits

CONTRACT BILLING
────────────────
POST   /api/contract-billing/invoice         Create customer invoice
GET    /api/contract-billing/invoice/:tenant List invoices
GET    /api/contract-billing/invoice/:id     Get invoice
POST   /api/contract-billing/invoice/:id/send Send invoice
POST   /api/contract-billing/invoice/:id/cancel Cancel
GET    /api/contract-billing/settlements     Settlement history

BOT QUERIES
───────────
GET    /api/billing/bot/status/:tenantId     Quick status
GET    /api/billing/bot/summary/:tenantId    Detailed summary
POST   /api/billing/bot/query                Natural language query
GET    /api/billing/bot/recommendations      AI suggestions
```

---

**End of Document**

*This document serves as the single source of truth for the Business Model Agent implementation. Update the Phase Completion Log after each phase is completed.*
