# Business Model Agent - Technical PRD

> **Document Version**: 1.1
> **Created**: January 2025
> **Last Updated**: January 2025
> **Status**: Draft - Pending Review
> **Author**: Claude Code Session
> **Owner**: Charan Kamal Bommakanti - Vikuna Technologies

---

## Table of Contents

1. [Vision & Business Context](#1-vision--business-context) ⭐ START HERE
2. [Use Cases & User Stories](#2-use-cases--user-stories)
3. [Key Decisions & Rationale](#3-key-decisions--rationale)
4. [Executive Summary](#4-executive-summary)
5. [Current State Analysis](#5-current-state-analysis)
6. [Product Billing Models](#6-product-billing-models)
7. [Architecture Design](#7-architecture-design)
8. [Database Schema](#8-database-schema)
9. [API Design](#9-api-design)
10. [Edge Functions](#10-edge-functions)
11. [UI Design](#11-ui-design)
12. [JTD Integration](#12-jtd-integration)
13. [Razorpay Integration](#13-razorpay-integration)
14. [Concurrency & Race Conditions](#14-concurrency--race-conditions)
15. [Error Handling Strategy](#15-error-handling-strategy)
16. [Bot-Friendly Architecture](#16-bot-friendly-architecture)
17. [Implementation Phases](#17-implementation-phases)
18. [Testing Strategy](#18-testing-strategy)
19. [Rollback Plan](#19-rollback-plan)
20. [Phase Completion Log](#20-phase-completion-log)

---

# ⭐ CONTEXT FOR NEW SESSIONS - READ THIS FIRST

> **If you're starting a new Claude Code session**, read sections 1-3 first. They contain the business context, vision, use cases, and architectural decisions that inform all technical choices. The technical sections (4+) will make much more sense with this context.

---

## 1. Vision & Business Context

### 1.1 The Problem We're Solving

**Vikuna Technologies** is building multiple SaaS products:

| Product | Purpose | Target Users |
|---------|---------|--------------|
| **ContractNest** | Contract lifecycle management platform | SMBs, enterprises managing vendor/customer contracts |
| **FamilyKnows** | Family asset & document management | Families wanting to organize important information |
| **Kaladristi** | AI-powered stock research | Individual investors seeking research insights |
| **Custom Solutions** | Bespoke development for specific clients | Individual businesses with unique needs |

**The Challenge**: Each product has a fundamentally different billing model, but we need:
1. A unified billing infrastructure (not 4 separate systems)
2. The ability to add new products without rebuilding billing
3. Automated revenue collection (no more manual invoicing/chasing)
4. Tenants should be able to bill their own customers (B2B2C capability)

### 1.2 The Vision

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   "One billing engine, infinite business models"                            │
│                                                                              │
│   The Business Model Agent is not just a billing system—it's a              │
│   configurable revenue engine that can adapt to ANY pricing model           │
│   through JSONB configuration, without code changes.                        │
│                                                                              │
│   It also empowers our TENANTS to bill THEIR customers, creating            │
│   a revenue stream for the platform (transaction fees) while solving        │
│   a real pain point for tenants (payment collection).                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Real-World Trigger

**The immediate trigger for this project**: A custom client who was paying monthly suddenly stopped paying. Without automated billing:
- No automatic invoices were sent
- No payment reminders went out
- No escalation happened
- Revenue was lost due to manual process failure

**This system will ensure**: Every subscription, every invoice, every payment (or non-payment) is automatically tracked, notified, and escalated.

### 1.4 Why This is NOT a Standard SaaS Billing System

Most billing systems assume: **"Per user per month"**

Our products require **composite billing**:

```
ContractNest Revenue =
    Platform Fee (tiered by users: 2 users = ₹500, 5 users = ₹750, etc.)
  + Per Contract Charge (tiered: first 50 = ₹150 each, next 150 = ₹120 each)
  + Storage Overage (₹0.50 per MB above 40 MB included)
  + Notification Credits (prepaid packs, deducted per use)
  + Add-ons (VaNi AI = ₹5,000/month optional)
  + RFP Feature (₹250 per contract if used)

FamilyKnows Revenue =
    Free tier (1 user, 25 assets) → ₹0
    OR Family tier (4 users) → ₹200/month
  + AI Add-on → ₹100/month optional

Kaladristi Revenue =
    Base subscription → ₹100/month
  + Per AI Report → ₹50 each (usage-based)
```

**No off-the-shelf billing system handles this complexity elegantly.**

### 1.5 The Two-Level Billing Model

```
LEVEL 1: PLATFORM BILLING (Us → Tenants)
════════════════════════════════════════
We bill tenants for using our products.
- ContractNest tenant pays us for contracts, users, storage
- FamilyKnows tenant pays us for family plan
- Kaladristi tenant pays us for reports

Payment goes to: OUR Razorpay account
                 (configured in t_tenant WHERE admin=true)


LEVEL 2: CONTRACT BILLING (Tenants → Their Customers)
═════════════════════════════════════════════════════
Tenants bill their own customers through our platform.
- A ContractNest tenant creates a contract with their customer
- They generate an invoice for milestone payment
- Customer receives payment link
- Payment is collected
- We take 2-3% platform fee
- Rest is settled to tenant

Payment goes to: TENANT'S Razorpay account
                 (configured in Settings → Integrations)

THIS IS A KEY DIFFERENTIATOR - tenants get billing infrastructure for free!
```

### 1.6 Business Goals

| Goal | Metric | Target |
|------|--------|--------|
| **Automate Revenue** | Manual invoicing effort | Zero manual invoices |
| **Reduce Churn** | Payment failure → cancellation | < 5% (with dunning) |
| **Enable Tenants** | Tenants using contract billing | 30% within 6 months |
| **Platform Revenue** | Transaction fee income | Additional revenue stream |
| **Scale Operations** | Tenants supported | 500+ without ops overhead |

---

## 2. Use Cases & User Stories

### 2.1 ContractNest Use Cases

#### UC-1: New Tenant Signup & Trial

```
ACTOR: New business signing up for ContractNest

FLOW:
1. Business signs up, selects "Professional" plan
2. System creates subscription with 14-day trial
3. Tenant gets full access to all features during trial
4. Day 10: System sends "trial expiring" notification (JTD)
5. Day 14: Trial ends
   - If payment method added → First invoice generated
   - If no payment method → Grace period starts
6. Day 21 (grace end): Account suspended if no payment

BILLING EVENTS:
- trial_started (Day 0)
- trial_expiring (Day 10)
- trial_expired OR invoice_generated (Day 14)
- grace_period_started (Day 14 if no payment)
- account_suspended (Day 21 if still no payment)
```

#### UC-2: Monthly Usage & Billing

```
ACTOR: Active ContractNest tenant

SCENARIO: Tenant has Professional plan, 4 users, creates 60 contracts in quarter

MONTHLY ACTIVITY:
- Creates 20 contracts (each triggers usage recording)
- Sends 150 WhatsApp notifications (deducts from credits)
- Uses 50 MB storage (10 MB overage)
- Uses VaNi AI add-on

END OF QUARTER BILLING:
┌─────────────────────────────────────────────────┐
│ INVOICE #INV-2025-Q1-00123                      │
├─────────────────────────────────────────────────┤
│ Platform Fee (4 users)          ₹2,250.00       │
│   (₹750/month × 3 months)                       │
│                                                 │
│ Contract Charges                ₹8,700.00       │
│   First 50 @ ₹150              ₹7,500.00       │
│   Next 10 @ ₹120               ₹1,200.00       │
│                                                 │
│ Storage Overage                   ₹150.00       │
│   30 MB × ₹0.50 × 3 months                     │
│                                                 │
│ VaNi AI Add-on                ₹15,000.00       │
│   ₹5,000/month × 3 months                      │
│                                                 │
│ ─────────────────────────────────────────────── │
│ TOTAL                         ₹26,100.00       │
└─────────────────────────────────────────────────┘

FLOW:
1. pg_cron triggers billing-cycle-worker on April 1st
2. Worker aggregates Q1 usage from t_bm_subscription_usage
3. Pricing engine calculates using product config
4. Invoice created in DB + Razorpay
5. JTD sends invoice email with payment link
6. Tenant pays via Razorpay
7. Webhook updates invoice status
8. JTD sends payment confirmation
```

#### UC-3: Tenant Bills Their Customer (Contract Billing)

```
ACTOR: ContractNest tenant (a construction company)

SCENARIO: Tenant has contract with a customer for ₹5,00,000 project
          Payment terms: 30% advance, 40% mid-project, 30% completion

FLOW - MILESTONE 1 (Advance):
1. Tenant opens contract in ContractNest
2. Clicks "Generate Invoice" for Milestone 1
3. Enters: Amount ₹1,50,000, Due date, Customer email
4. System creates t_contract_invoice record
5. System creates Razorpay payment link (using TENANT's Razorpay)
6. JTD sends invoice to customer (deducts tenant's notification credit)
7. Customer clicks link, pays ₹1,50,000
8. Razorpay webhook received
9. Platform fee calculated: ₹1,50,000 × 2.5% = ₹3,750
10. Settlement queued: ₹1,46,250 to tenant
11. JTD notifies tenant: "Payment received for [Contract]"
12. Daily settlement job transfers ₹1,46,250 to tenant's account

TENANT VALUE:
- No manual invoicing
- Automatic payment tracking
- Professional payment experience for their customers

PLATFORM VALUE:
- ₹3,750 transaction fee
- Increased tenant stickiness
- Usage of notification credits (additional revenue)
```

#### UC-4: Payment Failure & Dunning

```
ACTOR: System (automated dunning)

SCENARIO: Tenant's quarterly payment of ₹26,100 fails

DAY 0 - Payment Attempt:
1. Razorpay attempts charge → FAILED (insufficient funds)
2. Webhook received: payment.failed
3. System updates invoice status
4. JTD sends: "Payment failed" email to tenant
5. n8n workflow triggered: dunning_sequence

DAY 3:
- n8n triggers JTD: "Payment reminder" email

DAY 7:
- n8n triggers JTD: "Payment reminder" email + SMS
- Invoice marked "overdue"

DAY 14:
- n8n triggers JTD: "Urgent - payment overdue" email + SMS + WhatsApp
- System starts grace period
- Tenant still has FULL access (grace_access: "full")
- JTD sends: "Grace period started" notification

DAY 18:
- n8n triggers JTD: "Grace period ending in 3 days" all channels

DAY 21:
- Grace period ends
- System calls suspendAccount(tenant)
- Subscription status → "suspended"
- Tenant sees "Account suspended" on login
- JTD sends: "Account suspended" notification
- Tenant can still log in but can't access features

DAY 22+:
- Tenant pays outstanding amount
- System calls restoreAccount(tenant)
- Full access restored
- JTD sends: "Account restored" notification
```

### 2.2 FamilyKnows Use Cases

#### UC-5: Free to Paid Upgrade

```
ACTOR: FamilyKnows user on free tier

SCENARIO: User has 1 user, 20 assets. Wants to add family members.

FLOW:
1. User tries to add family member
2. System shows: "Free tier limited to 1 user. Upgrade to Family plan?"
3. User clicks upgrade
4. Selects "Family of 4" plan @ ₹200/month
5. System creates subscription
6. Razorpay subscription created (recurring)
7. First payment collected
8. User can now add 3 more family members
9. Asset limit removed
```

### 2.3 Kaladristi Use Cases

#### UC-6: Usage-Based Billing

```
ACTOR: Kaladristi subscriber

SCENARIO: User on ₹100/month base plan, wants AI reports

FLOW:
1. User requests AI research report for "RELIANCE"
2. System checks: subscription active? ✓
3. System generates report
4. Usage recorded: metric='ai_report', quantity=1
5. User requests 5 more reports during month

END OF MONTH:
┌─────────────────────────────────────────────────┐
│ INVOICE                                          │
├─────────────────────────────────────────────────┤
│ Base Subscription               ₹100.00         │
│ AI Research Reports (6)         ₹300.00         │
│   6 reports × ₹50                               │
│ ─────────────────────────────────────────────── │
│ TOTAL                           ₹400.00         │
└─────────────────────────────────────────────────┘
```

### 2.4 User Stories

#### Platform Admin (Vikuna)

```
As a PLATFORM ADMIN, I want to:

US-1: Create a new pricing plan for ContractNest with composite billing
      so that I can configure base fees, per-contract charges, and add-ons

US-2: View billing dashboard across all products
      so that I can see MRR, ARR, churn, and payment failures

US-3: Configure dunning sequences per product
      so that payment recovery is automated

US-4: Add a new product (e.g., Kaladristi) to the billing system
      so that it can have its own billing model without code changes

US-5: View and manage failed payments across all tenants
      so that I can manually intervene if needed

US-6: Generate billing reports for accounting
      so that I can reconcile payments and file taxes
```

#### Tenant Admin (ContractNest Customer)

```
As a TENANT ADMIN, I want to:

US-7: View my current subscription and usage
      so that I know what I'm paying for

US-8: See upcoming invoice estimate
      so that I can budget for the payment

US-9: Buy notification credit topups
      so that I don't run out mid-month

US-10: Generate invoices for MY customers
       so that I can collect payments professionally

US-11: Track which customers have paid
       so that I know who to follow up with

US-12: View my settlement history
       so that I know when platform transferred my money

US-13: Update my Razorpay credentials
       so that customer payments come to my account
```

#### VaNi (AI Assistant)

```
As VANI (AI Assistant), I want to:

US-14: Query tenant's billing status
       so that I can answer "What's my current bill?"

US-15: Suggest plan upgrades based on usage
       so that I can say "You're at 90% contract limit, consider upgrading"

US-16: Alert about low notification credits
       so that I can say "You have 10 credits left, want to buy more?"

US-17: Help with invoice disputes
       so that I can pull up billing details when tenant asks

US-18: Process simple billing requests
       so that tenant can say "Buy 50 notification credits" and I execute it
```

#### External Customer (Tenant's Customer)

```
As an EXTERNAL CUSTOMER (being billed by a tenant), I want to:

US-19: Receive professional invoices via email/WhatsApp
       so that I know what I'm paying for

US-20: Pay securely via payment link
       so that I don't have to do bank transfers

US-21: Get payment confirmation
       so that I have proof of payment

US-22: See payment history for a contract
       so that I can track my payments
```

---

## 3. Key Decisions & Rationale

### 3.1 Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Redis for caching** | NO - Use PostgreSQL only | JTD already uses PGMQ. Adding Redis adds operational complexity. For 500 users, PostgreSQL with proper indexing is sufficient. Can add Redis later if needed. |
| **Separate MCP Server** | NO - Service layer in API | Simpler deployment, no new container needed. The "agent" is a service class, not a separate process. Can extract to MCP later if AI integration deepens. |
| **Razorpay credentials storage** | Use existing Integrations module | Already built! `t_tenant_integrations` stores encrypted credentials. Platform uses `admin=true` tenant's credentials. |
| **Notification delivery** | Use JTD Framework | Already built! Production-ready with PGMQ, multi-channel, templates, status tracking. Don't reinvent. |
| **Complex workflows (dunning)** | Use n8n | Already in Docker setup. n8n excels at multi-step, time-delayed workflows. Don't build custom workflow engine. |
| **Billing cycle scheduling** | pg_cron | Already used for JTD worker. Consistent approach. No external scheduler needed. |
| **Multi-product support** | JSONB product configs | One table `t_bm_product_config` with full billing model as JSON. Add product = add row, not code. |

### 3.2 Why NOT Off-the-Shelf Billing (Stripe Billing, Chargebee, etc.)

| Concern | Our Situation |
|---------|---------------|
| **Pricing Model Complexity** | Our composite model (base + usage + tiers + credits) is too complex for most platforms |
| **Multi-Product** | We have 4+ products with different models. Most platforms assume one product. |
| **Contract Billing (B2B2C)** | Tenants billing their customers is not supported by standard billing platforms |
| **Razorpay India** | We need Razorpay for India payments. Most billing platforms don't integrate well. |
| **Cost** | Billing platforms charge 0.5-1% of revenue. At scale, this is significant. |
| **Control** | We want full control over billing logic, dunning, and customer experience |

### 3.3 Database Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Store billing config** | JSONB in `t_bm_plan_version.billing_config` | Flexible schema, can evolve without migrations. Easy to query specific fields. |
| **Credit balance tracking** | Separate table with row-level locking | Prevents race conditions on concurrent deductions. `FOR UPDATE` ensures atomicity. |
| **Usage recording** | Append-only inserts | No update contention. Aggregate at billing time. Simple and fast. |
| **Invoice line items** | JSONB array | Flexible, can have any number of line items. Easy to render in PDF. |

### 3.4 Integration Decisions

| Integration | Approach | Notes |
|-------------|----------|-------|
| **Razorpay** | REST API via service class | Standard API integration. Webhooks for async events. |
| **Razorpay Credentials** | From `t_tenant_integrations` | Already encrypted, already has test/live flag, already has connection testing |
| **Platform Razorpay** | From tenant where `admin=true` | Platform owner is a special tenant. Uses same integration flow. |
| **Notifications** | Via JTD | Create JTD record → automatic delivery via existing worker |
| **Dunning** | Via n8n | Webhook triggers n8n → n8n schedules delays → n8n calls API/JTD |

### 3.5 Things We Explicitly Decided NOT To Build

| Feature | Reason |
|---------|--------|
| **Real-time usage dashboard** | Not needed for billing. Aggregate monthly is fine. |
| **Complex discount engine** | Start simple. Add coupons/discounts in v2 if needed. |
| **Multi-currency dynamic conversion** | Store in INR. Handle multi-currency display only. |
| **Proration for mid-cycle changes** | Complex. Handle manually for now. Add in v2. |
| **Refund automation** | Manual refunds via Razorpay dashboard. Add automation in v2. |

### 3.6 Important Context for Future Sessions

```
KEY POINTS TO REMEMBER:

1. EXISTING CODE: There's already ~70% of billing UI/API built, but it's
   standalone and not integrated into the product. We're EVOLVING, not
   rebuilding.

2. JTD IS THE NOTIFICATION BACKBONE: Never send emails/SMS directly.
   Always create JTD records. The JTD worker handles delivery.

3. INTEGRATIONS MODULE EXISTS: Don't build new payment credential storage.
   Use Settings → Integrations → Razorpay.

4. ADMIN TENANT: The platform itself is a tenant with admin=true.
   Platform billing uses this tenant's Razorpay credentials.

5. CONTRACT BILLING IS LEVEL 2: This is tenant→customer billing, separate
   from platform→tenant billing. Both use the same infrastructure.

6. n8n FOR WORKFLOWS: Complex multi-step processes (dunning) go in n8n,
   not in code. n8n is already in Docker setup.

7. NO REDIS NEEDED: We discussed this. PostgreSQL + PGMQ is sufficient
   for our scale. Don't add Redis complexity.

8. PRODUCT CONFIGS ARE JSONB: Adding a new product = inserting a row
   with billing config JSON. No code changes needed.

9. BILLING CYCLES: Quarterly and Annual only for ContractNest.
   No monthly plans. Configured per product.

10. GRACE PERIOD = FULL ACCESS: During grace period, tenants still have
    full access. Only suspended accounts lose access.
```

---

## 4. Executive Summary

### 4.1 What is Business Model Agent?

The Business Model Agent is a **dual-purpose billing infrastructure** that handles:

1. **Platform Billing (Level 1)**: ContractNest/FamilyKnows/Kaladristi billing their tenants
2. **Contract Billing (Level 2)**: Tenants billing their customers through the platform

### 4.2 Key Objectives

| Objective | Description |
|-----------|-------------|
| **Multi-Product Support** | Single billing engine serving ContractNest, FamilyKnows, Kaladristi, and future products |
| **Composite Billing** | Support complex models: base fees + usage + tiers + credits + add-ons |
| **Automated Operations** | Billing cycles, invoice generation, payment collection, dunning |
| **Tenant Empowerment** | Enable tenants to bill their own customers |
| **Scalability** | Support 500+ concurrent users with proper concurrency handling |
| **Bot-Friendly** | AI/chatbot queryable for billing status, recommendations |

### 4.3 Design Principles

1. **No Redis Dependency** - Use PostgreSQL + PGMQ for all operations
2. **JTD-First Notifications** - All billing communications flow through JTD
3. **Existing Infrastructure** - Leverage existing Docker setup, n8n, Supabase
4. **Razorpay via Integrations** - Use existing integrations module for payment credentials
5. **Product-Agnostic Core** - Billing engine configured via JSONB product configs

---

## 5. Current State Analysis

### 15.1 Existing Code Inventory

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

### 15.2 Existing Integrations Module

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

### 9.3 JTD Framework

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

### 5.4 n8n Workflows

Available for complex multi-step workflows:
- Dunning sequences (Day 0 → Day 3 → Day 7 → Day 14 → Day 21)
- Subscription lifecycle automation
- Custom notification sequences

---

## 6. Product Billing Models

### 18.1 ContractNest Billing Model

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

### 18.2 FamilyKnows Billing Model

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

### 8.3 Kaladristi Billing Model

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

### 8.4 Custom Client Model

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

## 7. Architecture Design

### 15.1 System Architecture

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

### 15.2 Data Flow: Platform Billing

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

### 9.3 Data Flow: Contract Billing (Tenant → Customer)

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

## 8. Database Schema

### 18.1 Schema Evolution Strategy

**Principle**: Evolve existing tables, add new tables. No breaking changes.

### 18.2 Existing Tables - Modifications

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

### 8.3 New Tables

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

### 8.4 Database Functions

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

## 9. API Design

### 15.1 New Endpoints

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

### 15.2 Request/Response Examples

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

### 9.3 API Service Layer Structure

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

## 10. Edge Functions

### 18.1 New Edge Functions

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

### 18.2 pg_cron Jobs

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

## 11. UI Design

### 15.1 Pages to Evolve

| Current Page | Evolution |
|--------------|-----------|
| `pricing-plans/create.tsx` | Add product selector, composite billing builder |
| `pricing-plans/edit.tsx` | Support new billing_config structure |
| `pricing-plans/detail.tsx` | Show all billing components (base, usage, credits) |
| `tenants/pricing-plans/index.tsx` | Show current usage, credits, next invoice |
| `tenants/Subscription/index.tsx` | Full subscription details + payment history |
| `billing/index.tsx` | Enhanced dashboard with all billing metrics |

### 15.2 New Components

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

## 12. JTD Integration

### 18.1 New Source Types

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

### 18.2 Template Variables

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

## 13. Razorpay Integration

### 15.1 Platform Billing Flow

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

### 15.2 Tenant Billing Flow (Contract Level)

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

### 15.3 Razorpay API Operations

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

### 15.4 Webhook Events to Handle

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

## 14. Concurrency & Race Conditions

### 18.1 Critical Sections

| Operation | Risk | Mitigation |
|-----------|------|------------|
| Credit deduction | Double deduction | Row-level lock with `FOR UPDATE` |
| Usage recording | Lost updates | Atomic `INSERT` (no update needed) |
| Invoice generation | Duplicate invoices | Unique constraint on (tenant, period) |
| Payment processing | Double processing | Idempotency key + status check |
| Subscription update | Race between webhook and UI | Optimistic locking with version |

### 18.2 Credit Deduction (Detailed)

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

### 18.3 Webhook Idempotency

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

### 16.4 Optimistic Locking for Subscriptions

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

### 14.5 Parallel User Support (500+)

| Layer | Strategy |
|-------|----------|
| **Database** | Connection pooling (PgBouncer), proper indexing |
| **API** | Stateless design, horizontal scaling ready |
| **Queues** | PGMQ with visibility timeout prevents duplicate processing |
| **Caching** | Cache product configs (rarely change) |
| **Rate Limiting** | Per-tenant API rate limits |

---

## 15. Error Handling Strategy

### 15.1 Error Categories

| Category | Examples | Handling |
|----------|----------|----------|
| **Validation** | Invalid plan config, missing fields | 400 response, clear message |
| **Business Logic** | Insufficient credits, limit exceeded | 422 response, actionable message |
| **External Service** | Razorpay timeout, MSG91 failure | Retry with backoff, fallback |
| **Database** | Connection lost, constraint violation | Retry, alert on repeated failure |
| **Authorization** | Invalid token, tenant mismatch | 401/403 response |

### 15.2 Retry Strategy

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

### 15.3 Error Response Format

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

### 15.4 Logging & Monitoring

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

## 16. Bot-Friendly Architecture

### 18.1 Design Principles

1. **Structured Responses**: All responses in consistent JSON format
2. **Natural Language Ready**: Include human-readable summaries
3. **Action Suggestions**: Provide actionable next steps
4. **Quick Status**: Single endpoint for overall status

### 18.2 Bot Query Endpoints

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

### 18.3 Natural Language Queries

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

### 16.4 VaNi Integration Points

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

## 17. Implementation Phases

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

## 18. Testing Strategy

### 18.1 Unit Tests

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

### 18.2 Integration Tests

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

### 18.3 Load Tests

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

## 19. Rollback Plan

### 19.1 Database Rollback

```sql
-- Each migration has a corresponding down migration
-- Example: 001_schema_evolution_down.sql

ALTER TABLE t_bm_plan_version DROP COLUMN IF EXISTS billing_config;
ALTER TABLE t_bm_tenant_subscription DROP COLUMN IF EXISTS product_code;
-- etc.
```

### 19.2 Feature Flags

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

### 19.3 Rollback Triggers

| Condition | Action |
|-----------|--------|
| Error rate > 10% | Alert, disable feature flag |
| Invoice generation fails > 3 times | Pause billing cycle, alert |
| Razorpay webhook failures > 5/min | Switch to polling, alert |
| Credit deduction deadlocks | Revert to legacy, investigate |

---

## 20. Phase Completion Log

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
