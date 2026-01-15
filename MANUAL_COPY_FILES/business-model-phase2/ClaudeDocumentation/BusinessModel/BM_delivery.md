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
| **Phase 2** | ✅ **Completed** | Billing Edge + API | All deliverables | Jan 2025 - Architecture corrected |
| Phase 3 | ⚪ Pending | JTD Notifications | - | Depends on Phase 2, **includes JTD credit integration** |
| Phase 4 | ⚪ Pending | Plan UI Evolution | - | Depends on Phase 1 |
| Phase 5 | ⚪ Pending | Razorpay Integration | - | Depends on Phase 2 |
| Phase 6 | ⚪ Pending | Contract Billing | - | Depends on Phase 5 |
| Phase 7 | ⚪ Pending | n8n Dunning | - | Depends on Phase 5 |
| Phase 8 | ⚪ Pending | Billing Cycle Worker | - | Depends on Phase 2,3 |
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

### Completed Work

| # | What Was Done | Files Created | Notes |
|---|---------------|---------------|-------|
| 1 | RPC functions (5) | `005_phase2_rpc_functions.sql` | To apply to Supabase |
| 2 | Edge function | `billing/index.ts` | Single RPC per endpoint |
| 3 | DTOs | `billing.dto.ts` | Request/Response types |
| 4 | Validators | `billingValidators.ts` | express-validator rules |
| 5 | Service | `billingService.ts` | HTTP client to Edge |
| 6 | Controller | `billingController.ts` | Validate → call service |
| 7 | Routes | `billingRoutes.ts` | 12 endpoints |
| 8 | PRD Addendum | `PRD_ADDENDUM_ARCHITECTURE.md` | Architecture corrections |

### Removed Items (Architecture Correction)

The following were planned in original PRD but removed as they violate architecture patterns:

| Original File | Why Removed | Replacement |
|---------------|-------------|-------------|
| `pricingEngine.ts` in API | Business logic belongs in RPC | `calculate_tiered_price()` RPC (Phase 1) |
| `creditService.ts` in API | Business logic belongs in RPC | `deduct_credits()` RPC (Phase 1) |
| `usageService.ts` in API | Business logic belongs in RPC | `record_usage()` RPC (Phase 1) |
| `invoiceService.ts` in API | Business logic belongs in RPC | `get_invoice_estimate()` RPC (Phase 2) |
| `subscriptionService.ts` in API | Business logic belongs in RPC | `get_subscription_details()` RPC (Phase 2) |

---

## Phase 3: JTD Billing Notifications

**Status**: ⚪ Pending
**Depends On**: Phase 2

### 🚨 IMPORTANT: JTD Credit Integration Required

**The jtd-worker must be updated to integrate credit check/deduction.**

The `businessModel` utils created in Phase 1 need to be integrated into `jtd-worker/index.ts`:

```typescript
// In jtd-worker/index.ts - around line 303 (processMessage function)
import { checkCreditAvailability, deductCredits } from '../_shared/businessModel/index.ts';

// BEFORE sending (after line 303 "Update status to 'processing'"):
if (['whatsapp', 'sms', 'email'].includes(channel_code)) {
  const creditCheck = await checkCreditAvailability(supabase, tenant_id, 'notification', 1, channel_code);
  if (!creditCheck.isAvailable) {
    await updateJTDStatus(jtd_id, 'failed', undefined, 'Insufficient notification credits');
    await deleteMessage(msg.msg_id);
    return;
  }
}

// AFTER successful send (around line 372, inside "if (result.success)"):
if (['whatsapp', 'sms', 'email'].includes(channel_code)) {
  await deductCredits(supabase, tenant_id, 'notification', 1, {
    channel: channel_code,
    referenceType: 'jtd',
    referenceId: jtd_id,
    description: `${channel_code} notification sent`,
  });
}
```

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Billing source types | `migrations/business-model-v2/006_jtd_billing_source_types.sql` | ⚪ |
| 2 | Billing templates | JTD templates in database | ⚪ |
| 3 | **JTD Credit Integration** | `jtd-worker/index.ts` modification | ⚪ |

---

## Phase 4: Plan UI Evolution

**Status**: ⚪ Pending
**Depends On**: Phase 1

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Product selector | `contractnest-ui/src/components/businessModel/ProductSelector.tsx` | ⚪ |
| 2 | Composite billing builder | `contractnest-ui/src/components/businessModel/CompositeBillingBuilder/` | ⚪ |
| 3 | Updated create page | `contractnest-ui/src/pages/settings/businessmodel/admin/pricing-plans/create.tsx` | ⚪ |
| 4 | Updated edit page | `contractnest-ui/src/pages/settings/businessmodel/admin/pricing-plans/edit.tsx` | ⚪ |
| 5 | Usage dashboard | `contractnest-ui/src/components/businessModel/UsageDashboard/` | ⚪ |
| 6 | Credit manager | `contractnest-ui/src/components/businessModel/CreditManager/` | ⚪ |

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

**End of Delivery Tracker**
