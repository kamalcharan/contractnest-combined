# Business Model Agent - Delivery Tracker

> **Purpose**: Track planned vs completed work for each phase
> **PRD Reference**: `ClaudeDocumentation/BusinessModel/BUSINESS_MODEL_AGENT_PRD.md`
> **Architecture Addendum**: `ClaudeDocumentation/BusinessModel/PRD_ADDENDUM_ARCHITECTURE.md`
> **Last Updated**: January 2026

---

## Quick Status

| Phase | Status | Planned | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 1 | ✅ Completed | Schema & Configs | All deliverables | Jan 2025 |
| Phase 2 | ✅ Completed | Billing Edge + API | All deliverables | Jan 2025 - Architecture corrected |
| Phase 3 | ✅ Completed | TenantContext + JTD Credit Integration | All deliverables | Jan 2026 - New architecture |
| **Phase 4** | ✅ **Completed** | Plan UI Evolution | All deliverables | Jan 2026 - Unified Subscription Dashboard |
| Phase 5 | ⚪ Pending | Razorpay Integration | - | Depends on Phase 2 |
| Phase 6 | ⚪ Pending | Contract Billing | - | Depends on Phase 5 |
| Phase 7 | ⚪ Pending | n8n Dunning | - | Depends on Phase 5 |
| Phase 8 | ⚪ Pending | Billing Cycle Worker | - | Depends on Phase 3 ✅ |
| Phase 9 | ✅ Completed | Multi-Product Configs | With Phase 1 | - |
| Phase 10 | ⚪ Pending | Bot Integration | - | Depends on Phase 2 |

**Legend**: 🔵 In Progress | ✅ Completed | ⚪ Pending | 🔴 Blocked

---

## Phase 1: Schema & Product Configs

**Status**: ✅ Completed
**Target**: Foundation for all billing operations
**Completed**: January 2025

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Schema evolution migration | `contractnest-edge/supabase/migrations/business-model-v2/001_schema_evolution.sql` | ✅ |
| 2 | New tables migration | `contractnest-edge/supabase/migrations/business-model-v2/002_new_tables.sql` | ✅ |
| 3 | Database functions & RLS | `003a_rpc_functions.sql`, `003b_rls_and_helpers.sql`, `003c_is_tenant_admin_fix.sql` | ✅ |
| 4 | Product configs seed | `contractnest-edge/supabase/migrations/business-model-v2/004_seed_product_configs.sql` | ✅ |
| 5 | Update Edge utils | `contractnest-edge/supabase/functions/_shared/businessModel/` | ✅ |

### Completed Work

| # | What Was Done | Files Created/Modified | Commit |
|---|---------------|----------------------|--------|
| 1 | Schema evolution | `001_schema_evolution.sql` | Applied to Supabase |
| 2 | New tables (6 tables) | `002_new_tables.sql` | Applied to Supabase |
| 3 | RPC functions (12 functions) | `003a_rpc_functions.sql` | Applied to Supabase |
| 4 | RLS policies + helpers | `003b_rls_and_helpers.sql` | Applied to Supabase |
| 5 | is_tenant_admin fix | `003c_is_tenant_admin_fix.sql` | Applied to Supabase |
| 6 | Product configs seed | `004_seed_product_configs.sql` | Applied to Supabase |
| 7 | Edge utils | `_shared/businessModel/index.ts`, `types.ts` | Ready to copy |

---

## Phase 2: Billing Edge Function & API Layer

**Status**: ✅ Completed
**Depends On**: Phase 1
**Completed**: January 2025

### Architecture Correction

> **IMPORTANT**: Original PRD proposed API services calling RPC directly. This was corrected to follow ContractNest patterns:
> ```
> UI → API (validate) → Edge (single RPC) → DB
> ```
> See `PRD_ADDENDUM_ARCHITECTURE.md` for details.

### Planned Deliverables (Corrected Architecture)

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Phase 2 RPC functions | `contractnest-edge/supabase/migrations/business-model-v2/005_phase2_rpc_functions.sql` | ✅ |
| 2 | Billing Edge function | `contractnest-edge/supabase/functions/billing/index.ts` | ✅ |
| 3 | Billing DTOs | `contractnest-api/src/types/billing.dto.ts` | ✅ |
| 4 | Billing validators | `contractnest-api/src/validators/billingValidators.ts` | ✅ |
| 5 | Billing service | `contractnest-api/src/services/billingService.ts` | ✅ |
| 6 | Billing controller | `contractnest-api/src/controllers/billingController.ts` | ✅ |
| 7 | Billing routes | `contractnest-api/src/routes/billingRoutes.ts` | ✅ |

### RPC Functions Created (Phase 2)

| Function | Purpose |
|----------|---------|
| `get_invoice_estimate(p_tenant_id)` | Calculate upcoming bill with line items |
| `get_usage_summary(p_tenant_id, p_period_start, p_period_end)` | Usage metrics with limits |
| `get_topup_packs(p_product_code, p_credit_type)` | Available topup packs |
| `get_subscription_details(p_tenant_id)` | Comprehensive subscription info |
| `purchase_topup(p_tenant_id, p_pack_id, p_payment_reference)` | Process topup purchase |

### API Endpoints Created

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

## Phase 3: TenantContext & JTD Credit Integration

**Status**: ✅ Completed
**Depends On**: Phase 2
**Completed**: January 2026

### Architecture Change

> **NEW APPROACH**: Original plan was to modify jtd-worker directly. This was changed to a centralized TenantContext system:
> - Check credits BEFORE JTD creation (not at worker level)
> - `no_credits` status for blocked notifications with FIFO release
> - Triggers keep context in sync with source tables
> - Multi-product isolation via `product_code + tenant_id`

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | TenantContext table + triggers | `migrations/business-model-v2/006_tenant_context.sql` | ✅ |
| 2 | JTD Credit Integration | `migrations/jtd-framework/003_jtd_credit_integration.sql` | ✅ |
| 3 | TenantContext Edge function | `functions/tenant-context/index.ts` | ✅ |
| 4 | TenantContext API service | `services/tenantContextService.ts` | ✅ |
| 5 | TenantContext API controller | `controllers/tenantContextController.ts` | ✅ |
| 6 | TenantContext API routes | `routes/tenantContextRoutes.ts` | ✅ |
| 7 | API index.ts update | `src/index.ts` | ✅ |
| 8 | PRD Addendum (Section 10) | `PRD_ADDENDUM_ARCHITECTURE.md` | ✅ |
| 9 | JTD Credit Addendum | `JTD-Addendum-CreditIntegration.md` | ✅ |

### RPC Functions Created (Phase 3)

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
| GET | `/api/tenant-context` | Get tenant context |
| GET | `/api/tenant-context/can-send/:channel` | Check if can send via channel |
| GET | `/api/tenant-context/waiting-jtds` | Get blocked JTD count |
| POST | `/api/tenant-context/init` | Initialize context |
| POST | `/api/tenant-context/invalidate-cache` | Invalidate cache |
| GET | `/api/tenant-context/health` | Health check |

### JTD Statuses Added

| Status | Type | Purpose |
|--------|------|---------|
| `no_credits` | waiting | Blocked due to insufficient credits |
| `expired` | terminal | Expired after 7 days without credits |

### Triggers Created

| Trigger | Source Table | Purpose |
|---------|--------------|---------|
| `trg_update_tenant_context_subscription` | `t_bm_subscriptions` | Sync subscription |
| `trg_update_tenant_context_credits` | `t_bm_credit_balance` | Sync credits |
| `trg_update_tenant_context_usage` | `t_bm_usage` | Sync usage |
| `trg_update_tenant_context_profile` | `t_tenant_profiles` | Sync profile |
| `trg_credit_topup_release_jtds` | `t_bm_credit_balance` | Auto-release JTDs |

### Completed Work

| # | What Was Done | Files Created | Notes |
|---|---------------|---------------|-------|
| 1 | TenantContext table | `006_tenant_context.sql` | Table + triggers + RPC |
| 2 | JTD Credit Integration | `003_jtd_credit_integration.sql` | Statuses + release functions |
| 3 | Edge function | `tenant-context/index.ts` | GET/POST endpoints |
| 4 | API Service | `tenantContextService.ts` | 30s in-memory cache |
| 5 | API Controller | `tenantContextController.ts` | Validation + routing |
| 6 | API Routes | `tenantContextRoutes.ts` | 6 endpoints |
| 7 | index.ts update | `index.ts` | Full file with routes |
| 8 | PRD Addendum | Section 10 added | TenantContext architecture |
| 9 | JTD Addendum | `JTD-Addendum-CreditIntegration.md` | Credit integration details |

---

## Phase 4: Plan UI Evolution

**Status**: ✅ Completed
**Depends On**: Phase 1
**Completed**: January 2026

### Implementation Approach

> **DESIGN DECISION**: Instead of separate components, Phase 4 was implemented as:
> 1. Settings menu integration (Foundation & Navigation)
> 2. Real API-connected hooks for usage/credits
> 3. 5-step plan creation wizard with ReviewStep
> 4. Unified Subscription Dashboard (merged Credits into Subscription)
> 5. Glassmorphic design matching admin pages

### Completed Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Settings menus for Subscription | `contractnest-ui/src/utils/constants/settingsMenus.ts` | ✅ |
| 2 | Subscription routes | `contractnest-ui/src/App.tsx` | ✅ |
| 3 | Usage Summary Hook | `contractnest-ui/src/hooks/queries/useBusinessModelQueries.ts` | ✅ |
| 4 | Credit Balance Hook | `contractnest-ui/src/hooks/queries/useBusinessModelQueries.ts` | ✅ |
| 5 | Topup Packs Hook | `contractnest-ui/src/hooks/queries/useBusinessModelQueries.ts` | ✅ |
| 6 | ReviewStep (5-step wizard) | `contractnest-ui/src/components/businessmodel/planform/ReviewStep.tsx` | ✅ |
| 7 | Updated create page | `contractnest-ui/src/pages/settings/businessmodel/admin/pricing-plans/create.tsx` | ✅ |
| 8 | Unified Subscription Dashboard | `contractnest-ui/src/pages/settings/businessmodel/tenants/Subscription/index.tsx` | ✅ |

### React Query Hooks Created

| Hook | Purpose |
|------|---------|
| `useUsageSummary()` | Fetch usage metrics from /api/billing/usage |
| `useCreditBalance()` | Fetch credit balances from /api/billing/credits |
| `useTopupPacks()` | Fetch available topup packs from /api/billing/topup-packs |
| `formatStorageSize()` | Utility for formatting storage (MB/GB) |
| `getUsageStatus()` | Compute usage status (ok/warning/critical) |

### Plan Creation Wizard Steps

| Step | Component | Purpose |
|------|-----------|---------|
| 1 | BasicInfoStep | Product, name, description, trial days |
| 2 | PricingStep | Currency, tiers, pricing model |
| 3 | FeaturesStep | Feature toggles, limits |
| 4 | NotificationsStep | Credit allocations per channel |
| 5 | ReviewStep | Complete summary before creation |

### Unified Subscription Dashboard Features

| Feature | Description |
|---------|-------------|
| Glassmorphic Design | `backdrop-filter: blur(12px)`, semi-transparent cards |
| Summary Cards | Plan info, Usage %, Notification Credits |
| Consumption Breakdown | Users, Contracts, Storage with progress bars |
| Credit Balances | Per-channel (WhatsApp, SMS, Email) with low indicators |
| Quick Topup | Inline topup pack buttons |
| Tab Navigation | Overview / Credits tabs |
| Dark Mode Support | Full theme adaptation |

### Files Removed (Orphan Code)

| File | Reason |
|------|--------|
| `Credits.tsx` | Merged into unified Subscription dashboard |
| Credits route in App.tsx | Single page now handles both |
| Credits menu item | Menu simplified |

### Commits

| Commit | Description |
|--------|-------------|
| Step 1 | Foundation & Navigation (settings menus, routes) |
| Step 2 | Usage Dashboard with real API data |
| Step 3 | Credit Manager hooks |
| Step 4 | Composite Billing Builder (ReviewStep) |
| Step 5 | Unified Subscription Dashboard |

---

## Phase 5: Razorpay Integration

**Status**: ⚪ Pending
**Depends On**: Phase 2

### Architecture Note

> Razorpay credentials are already stored in `t_tenant_integrations` via the existing Integrations module.
> Phase 5 will USE these credentials, not create new storage.

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Razorpay operations Edge | `contractnest-edge/supabase/functions/razorpay-operations/index.ts` | ⚪ |
| 2 | Razorpay webhook Edge | `contractnest-edge/supabase/functions/razorpay-webhook/index.ts` | ⚪ |
| 3 | get_razorpay_credentials RPC | `migrations/business-model-v2/007_razorpay_rpc.sql` | ⚪ |
| 4 | process_payment_webhook RPC | `migrations/business-model-v2/007_razorpay_rpc.sql` | ⚪ |

---

## Phase 6-10: Remaining Phases

See original PRD for detailed deliverables. Architecture follows same pattern:
- Business logic in RPC functions
- Edge functions call RPC (single call per request)
- API layer validates and routes to Edge

---

## Appendix: Session Log

| Date | Session | Phases Worked | Key Decisions | Notes |
|------|---------|---------------|---------------|-------|
| Jan 2025 | Initial | PRD Creation | Architecture decisions, no Redis, use JTD | PRD v1.1 created |
| Jan 2025 | Phase 1 | Phase 1 Complete | Split 003 into 3 files due to dependencies | All migrations applied |
| Jan 2025 | Phase 2 | Phase 2 Complete | Architecture corrected: UI→API→Edge→RPC | PRD Addendum created |
| Jan 2026 | Phase 2 Testing | All 9 endpoints tested | Column name fixes, RPC function fixes | Consolidated migration created |
| Jan 2026 | Phase 3 | Phase 3 Complete | TenantContext instead of jtd-worker modification | New architecture for credit-gating |
| Jan 2026 | Phase 4 | Phase 4 Complete | Unified dashboard, glassmorphic design | 5 steps delivered |

---

## Appendix: Architecture Pattern

```
CORRECT (ContractNest Standard):
UI → API (validate, DTO) → Edge (single RPC) → RPC Functions → DB

WRONG (Original PRD):
UI → API (business logic) → RPC Functions → DB
```

All phases must follow the correct pattern. See `PRD_ADDENDUM_ARCHITECTURE.md` for details.

---

## Appendix: File Locations

### Phase 3 Files

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
│       └── index.ts
└── COPY_INSTRUCTIONS.txt
```

### Phase 4 Files

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

---

**End of Delivery Tracker**
