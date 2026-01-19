# Business Model Implementation - Handover Context

> **Purpose**: Quick onboarding for continuing Business Model implementation
> **Last Session**: January 2026
> **Completed**: Phase 1 (Schema), Phase 2 (Billing Edge + API), Phase 3 (TenantContext + JTD Credit Integration), Phase 4 (Plan UI Evolution)
> **Next Phase**: Phase 5 - Razorpay Integration OR Phase 8 - Billing Cycle Worker

---

## ✅ Phase 1 Completed

### Deliverables Applied to Supabase

| # | File | Status | Notes |
|---|------|--------|-------|
| 1 | `001_schema_evolution.sql` | ✅ Applied | Modified existing tables |
| 2 | `002_new_tables.sql` | ✅ Applied | Created 6 new tables |
| 3a | `003a_rpc_functions.sql` | ✅ Applied | 12 RPC functions |
| 3b | `003b_rls_and_helpers.sql` | ✅ Applied | RLS policies + helpers |
| 3c | `003c_is_tenant_admin_fix.sql` | ✅ Applied | Fixed function dependency |
| 4 | `004_seed_product_configs.sql` | ✅ Applied | 3 products + 10 topup packs |

### RPC Functions from Phase 1

| Function | Purpose |
|----------|---------|
| `deduct_credits()` | Atomic credit deduction with FOR UPDATE NOWAIT |
| `add_credits()` | Atomic credit addition |
| `reserve_credits()` | Reserve credits for pending operations |
| `release_reserved_credits()` | Release reserved credits |
| `aggregate_usage()` | Usage aggregation for billing period |
| `record_usage()` | Record usage events atomically |
| `get_credit_balance()` | Get credit balances |
| `check_credit_availability()` | Check without deducting |
| `get_billing_status()` | Comprehensive billing status (bot-friendly JSON) |
| `get_billing_alerts()` | Billing alerts for tenant |
| `calculate_tiered_price()` | Tiered pricing calculation |
| `process_credit_expiry()` | Expire old credits (SKIP LOCKED) |

---

## ✅ Phase 2 Completed

### Architecture Correction Applied

> **CRITICAL**: Original PRD proposed API services with business logic calling RPC directly.
> This was corrected to follow ContractNest patterns:
> ```
> UI → API (validate, DTO) → Edge (single RPC) → RPC Functions → DB
> ```
> See `PRD_ADDENDUM_ARCHITECTURE.md` for details.

### Files Created

| # | File | Location | Purpose |
|---|------|----------|---------|
| 1 | `005_phase2_rpc_functions.sql` | `contractnest-edge/supabase/migrations/business-model-v2/` | 5 new RPC functions |
| 2 | `billing/index.ts` | `contractnest-edge/supabase/functions/` | Billing Edge function |
| 3 | `billing.dto.ts` | `contractnest-api/src/types/` | Request/Response DTOs |
| 4 | `billingValidators.ts` | `contractnest-api/src/validators/` | Validation rules |
| 5 | `billingService.ts` | `contractnest-api/src/services/` | HTTP client to Edge |
| 6 | `billingController.ts` | `contractnest-api/src/controllers/` | Controller |
| 7 | `billingRoutes.ts` | `contractnest-api/src/routes/` | Route definitions |

### API Endpoints Created (Phase 2)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/billing/status/:tenantId` | Comprehensive billing status |
| GET | `/api/billing/subscription/:tenantId` | Subscription details |
| GET | `/api/billing/credits/:tenantId` | Credit balances |
| GET | `/api/billing/usage/:tenantId` | Usage summary |
| GET | `/api/billing/invoice-estimate/:tenantId` | Invoice estimate |
| GET | `/api/billing/alerts/:tenantId` | Billing alerts |
| GET | `/api/billing/topup-packs` | Available topup packs |
| POST | `/api/billing/usage` | Record usage event |
| POST | `/api/billing/credits/deduct` | Deduct credits |
| POST | `/api/billing/credits/add` | Add credits |
| POST | `/api/billing/credits/topup` | Purchase topup |
| POST | `/api/billing/credits/check` | Check availability |

---

## ✅ Phase 3 Completed

### TenantContext Architecture

> **NEW APPROACH**: Instead of modifying jtd-worker directly, we created a centralized `TenantContext` system:
> - `t_tenant_context` table with triggers for real-time updates
> - Credit-gating BEFORE JTD creation (not at worker level)
> - `no_credits` status for blocked notifications
> - FIFO release mechanism when credits are topped up
> - 7-day expiry for blocked JTDs

### Files Created (Phase 3)

| # | File | Location | Purpose |
|---|------|----------|---------|
| 1 | `006_tenant_context.sql` | `contractnest-edge/supabase/migrations/business-model-v2/` | TenantContext table + triggers |
| 2 | `003_jtd_credit_integration.sql` | `contractnest-edge/supabase/migrations/jtd-framework/` | no_credits status + release functions |
| 3 | `tenant-context/index.ts` | `contractnest-edge/supabase/functions/` | TenantContext Edge function |
| 4 | `tenantContextService.ts` | `contractnest-api/src/services/` | API service with caching |
| 5 | `tenantContextController.ts` | `contractnest-api/src/controllers/` | API controller |
| 6 | `tenantContextRoutes.ts` | `contractnest-api/src/routes/` | Route definitions |
| 7 | `index.ts` (updated) | `contractnest-api/src/` | Routes registered |

### RPC Functions from Phase 3

| Function | Purpose |
|----------|---------|
| `get_tenant_context(p_product_code, p_tenant_id)` | Get cached tenant context |
| `init_tenant_context(p_product_code, p_tenant_id, p_business_name)` | Initialize context on signup |
| `release_waiting_jtds(p_tenant_id, p_channel, p_max_release)` | FIFO release blocked JTDs |
| `expire_no_credits_jtds(p_expiry_days)` | Expire JTDs after 7 days |
| `get_waiting_jtd_count(p_tenant_id, p_channel)` | Count blocked JTDs |

### API Endpoints Created (Phase 3)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/tenant-context` | Get tenant context (credits, subscription, limits) |
| GET | `/api/tenant-context/can-send/:channel` | Check if can send via channel |
| GET | `/api/tenant-context/waiting-jtds` | Get count of blocked JTDs |
| POST | `/api/tenant-context/init` | Initialize tenant context |
| POST | `/api/tenant-context/invalidate-cache` | Invalidate cached context |
| GET | `/api/tenant-context/health` | Health check |

### TenantContext Table Schema

```sql
t_tenant_context (
    product_code TEXT,           -- 'contractnest', 'familyknows'
    tenant_id UUID,
    -- Profile
    business_name, logo_url, primary_color, secondary_color,
    -- Subscription
    subscription_id, subscription_status, plan_name, billing_cycle,
    period_start, period_end, trial_end_date, grace_end_date,
    -- Credits (per channel)
    credits_whatsapp, credits_sms, credits_email, credits_pooled,
    -- Limits & Usage
    limit_users, limit_contracts, limit_storage_mb,
    usage_users, usage_contracts,
    -- Flags (computed)
    flag_can_access, flag_can_send_whatsapp, flag_can_send_sms,
    flag_can_send_email, flag_credits_low,
    PRIMARY KEY (product_code, tenant_id)
)
```

### Triggers Created

| Trigger | Source Table | Purpose |
|---------|--------------|---------|
| `trg_update_tenant_context_subscription` | `t_bm_subscriptions` | Sync subscription changes |
| `trg_update_tenant_context_credits` | `t_bm_credit_balance` | Sync credit changes |
| `trg_update_tenant_context_usage` | `t_bm_usage` | Sync usage changes |
| `trg_update_tenant_context_profile` | `t_tenant_profiles` | Sync profile changes |
| `trg_credit_topup_release_jtds` | `t_bm_credit_balance` | Auto-release JTDs on topup |

### JTD Credit Integration

New JTD statuses added:
- `no_credits` - Notification blocked due to insufficient credits
- `expired` - Notification expired after 7 days without credits

Status flows added:
- `created` → `no_credits` (when no credits at creation)
- `no_credits` → `pending` (when credits topped up)
- `no_credits` → `expired` (after 7 days)

### Documentation Created (Phase 3)

| File | Purpose |
|------|---------|
| `PRD_ADDENDUM_ARCHITECTURE.md` (Section 10) | TenantContext architecture |
| `JTD-Addendum-CreditIntegration.md` | JTD credit integration details |

---

## ✅ Phase 4 Completed

### Unified Subscription Dashboard

> **DESIGN DECISION**: Instead of separate components, Phase 4 implemented:
> - Settings menu integration with Subscription section
> - React Query hooks for real API data
> - 5-step plan creation wizard with ReviewStep
> - Unified Subscription Dashboard (merged Credits into Subscription)
> - Glassmorphic design matching admin pages

### Files Created (Phase 4)

| # | File | Location | Purpose |
|---|------|----------|---------|
| 1 | Settings menus | `contractnest-ui/src/utils/constants/settingsMenus.ts` | Subscription menu items |
| 2 | Routes | `contractnest-ui/src/App.tsx` | Subscription routes |
| 3 | React Query Hooks | `contractnest-ui/src/hooks/queries/useBusinessModelQueries.ts` | Usage, Credits, Topup hooks |
| 4 | ReviewStep | `contractnest-ui/src/components/businessmodel/planform/ReviewStep.tsx` | 5th wizard step |
| 5 | Create wizard | `contractnest-ui/src/pages/settings/businessmodel/admin/pricing-plans/create.tsx` | Updated 5-step wizard |
| 6 | Subscription Dashboard | `contractnest-ui/src/pages/settings/businessmodel/tenants/Subscription/index.tsx` | Unified glassmorphic UI |

### React Query Hooks (Phase 4)

| Hook | API Endpoint | Purpose |
|------|--------------|---------|
| `useUsageSummary()` | `/api/billing/usage/:tenantId` | Contracts, users, storage usage |
| `useCreditBalance()` | `/api/billing/credits/:tenantId` | Per-channel credit balances |
| `useTopupPacks()` | `/api/billing/topup-packs` | Available topup packs |

### Unified Subscription Dashboard Features

- **Glassmorphic Design**: `backdrop-filter: blur(12px)`, semi-transparent cards
- **Summary Cards**: Plan info, Usage %, Notification Credits
- **Consumption Breakdown**: Users, Contracts, Storage with color-coded progress bars
- **Credit Balances**: Per-channel (WhatsApp, SMS, Email) with low balance indicators
- **Quick Topup**: Inline topup pack buttons
- **Tab Navigation**: Overview / Credits tabs
- **Dark Mode**: Full theme support

### Plan Creation Wizard (5 Steps)

| Step | Component | Purpose |
|------|-----------|---------|
| 1 | BasicInfoStep | Product, name, description, trial days |
| 2 | PricingStep | Currency, tiers, pricing model |
| 3 | FeaturesStep | Feature toggles, limits |
| 4 | NotificationsStep | Credit allocations per channel |
| 5 | ReviewStep | Complete summary before creation |

### Files Removed (Orphan Code Cleanup)

| File | Reason |
|------|--------|
| `Credits.tsx` | Merged into unified Subscription dashboard |
| Credits route | Single page handles both subscription + credits |
| Credits menu item | Simplified navigation |

---

## 📁 File Locations

### Phase 3 Files (in MANUAL_COPY_FILES)

```
MANUAL_COPY_FILES/phase3-tenant-context-impl/
├── contractnest-edge/
│   └── supabase/
│       ├── migrations/
│       │   ├── business-model-v2/006_tenant_context.sql
│       │   └── jtd-framework/003_jtd_credit_integration.sql
│       └── functions/tenant-context/index.ts
├── contractnest-api/
│   └── src/
│       ├── services/tenantContextService.ts
│       ├── controllers/tenantContextController.ts
│       ├── routes/tenantContextRoutes.ts
│       └── index.ts (complete with routes)
└── COPY_INSTRUCTIONS.txt
```

### Phase 4 Files (in MANUAL_COPY_FILES)

```
MANUAL_COPY_FILES/step1-foundation/          # Settings menus, routes
MANUAL_COPY_FILES/step2-usage-dashboard/     # useUsageSummary hook
MANUAL_COPY_FILES/step3-credit-manager/      # useCreditBalance, useTopupPacks hooks
MANUAL_COPY_FILES/step4-composite-billing/   # ReviewStep, 5-step wizard
MANUAL_COPY_FILES/unified-subscription-dashboard/  # Final unified dashboard
    ├── contractnest-ui/
    │   └── src/
    │       ├── App.tsx (Credits route removed)
    │       ├── utils/constants/settingsMenus.ts (Credits menu removed)
    │       └── pages/settings/businessmodel/tenants/Subscription/
    │           └── index.tsx (Glassmorphic unified dashboard)
    └── COPY_INSTRUCTIONS.txt
```

### Documentation

```
ClaudeDocumentation/BusinessModel/
├── BUSINESS_MODEL_AGENT_PRD.md        # Full PRD (original)
├── PRD_ADDENDUM_ARCHITECTURE.md       # Architecture + TenantContext
├── BM_delivery.md                      # Delivery tracker
└── HANDOVER_CONTEXT.md                 # This file

ClaudeDocumentation/JTD/
└── JTD-Addendum-CreditIntegration.md  # JTD credit integration
```

---

## 🔮 Next Phases

### Phase 5: Razorpay Integration
- Razorpay operations Edge function
- Razorpay webhook handler
- Payment processing RPC functions

### Phase 8: Billing Cycle Worker (depends on Phase 3)
- Uses TenantContext for billing cycle processing
- Integrates with JTD for billing notifications

---

## 🚨 Important Notes

### 1. Architecture Pattern (MUST FOLLOW)

```
CORRECT:
UI → API (validate, DTO) → Edge (single RPC, <30ms) → RPC → DB

WRONG:
UI → API (business logic) → RPC → DB
```

### 2. Multi-Product Isolation

TenantContext uses `product_code + tenant_id` as primary key:
- Different products have isolated contexts
- `x-product-code` header required for all tenant-context calls
- Products: `contractnest`, `familyknows`, `kaladristi`

### 3. Credit-Gating Flow

```
JTD Creation → Check canSendChannel() →
  ├─ Has credits → status: 'pending' → Worker sends → Deduct credits
  └─ No credits → status: 'no_credits' → Wait for topup → Auto-release (FIFO)
```

### 4. Pending Implementation

- JTD creation point modification to call `canSendChannel()`
- Webhook trigger for `release_waiting_jtds()` on payment success
- Razorpay payment integration (Phase 5)

---

## 📋 Quick Start for Next Session

```bash
# 1. Read the PRD Addendum for architecture
Read: ClaudeDocumentation/BusinessModel/PRD_ADDENDUM_ARCHITECTURE.md

# 2. Read the delivery tracker
Read: ClaudeDocumentation/BusinessModel/BM_delivery.md

# 3. If starting Phase 5 (Razorpay):
Read: contractnest-edge/supabase/functions/integrations/index.ts
# Understand credential encryption/decryption pattern

# 4. If starting Phase 8 (Billing Cycle Worker):
Read: Phase 3 TenantContext files
# Worker will use TenantContext for billing cycle processing
```

---

## 🔗 Key PRD Reference

**Full PRD**: `ClaudeDocumentation/BusinessModel/BUSINESS_MODEL_AGENT_PRD.md`
**Architecture Addendum**: `ClaudeDocumentation/BusinessModel/PRD_ADDENDUM_ARCHITECTURE.md`
**JTD Credit Integration**: `ClaudeDocumentation/JTD/JTD-Addendum-CreditIntegration.md`

---

**End of Handover Context**
