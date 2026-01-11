# Business Model Agent - Delivery Tracker

> **Purpose**: Track planned vs completed work for each phase
> **PRD Reference**: `ClaudeDocumentation/BusinessModel/BUSINESS_MODEL_AGENT_PRD.md`
> **Last Updated**: January 2025

---

## Quick Status

| Phase | Status | Planned | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 1 | ✅ Completed | Schema & Configs | All 5 deliverables | Jan 2025 |
| Phase 2 | ⚪ Pending | Billing Service | - | Depends on Phase 1 |
| Phase 3 | ⚪ Pending | JTD Notifications | - | Depends on Phase 2, **includes JTD credit integration** |
| Phase 4 | ⚪ Pending | Plan UI Evolution | - | Depends on Phase 1 |
| Phase 5 | ⚪ Pending | Razorpay Integration | - | Depends on Phase 2 |
| Phase 6 | ⚪ Pending | Contract Billing | - | Depends on Phase 5 |
| Phase 7 | ⚪ Pending | n8n Dunning | - | Depends on Phase 5 |
| Phase 8 | ⚪ Pending | Billing Cycle Worker | - | Depends on Phase 2,3 |
| Phase 9 | ⚪ Pending | Multi-Product Configs | - | Depends on Phase 1 |
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

### Planned Schema Changes

**Tables Modified:**
- [x] `t_bm_plan_version` - Added `billing_config JSONB`
- [x] `t_bm_tenant_subscription` - Added product_code, billing_cycle, trial/grace dates
- [x] `t_bm_subscription_usage` - Added tenant_id, metric_type, quantity, billing_period
- [x] `t_bm_invoice` - Added invoice_type, razorpay fields, line_items JSONB

**New Tables Created:**
- [x] `t_bm_product_config` - Product billing configurations (JSONB billing_config)
- [x] `t_bm_credit_balance` - Tenant credit balances per type/channel
- [x] `t_bm_credit_transaction` - Credit transaction history (audit trail)
- [x] `t_bm_topup_pack` - Available topup packages
- [x] `t_contract_invoice` - Contract billing (tenant→customer)
- [x] `t_bm_billing_event` - Billing event log

**Database Functions Created:**
- [x] `deduct_credits()` - Atomic credit deduction with FOR UPDATE NOWAIT
- [x] `add_credits()` - Atomic credit addition
- [x] `reserve_credits()` - Reserve credits for pending operations
- [x] `release_reserved_credits()` - Release reserved credits
- [x] `aggregate_usage()` - Usage aggregation for billing period
- [x] `record_usage()` - Record usage events atomically
- [x] `get_credit_balance()` - Get credit balances
- [x] `check_credit_availability()` - Check without deducting
- [x] `get_billing_status()` - Comprehensive billing status (bot-friendly JSON)
- [x] `get_billing_alerts()` - Billing alerts for tenant
- [x] `calculate_tiered_price()` - Tiered pricing calculation
- [x] `process_credit_expiry()` - Expire old credits (SKIP LOCKED)

**RLS Policies Created:**
- [x] All 6 new tables have RLS enabled
- [x] Helper functions: `is_platform_admin()`, `is_tenant_admin()`, `get_user_tenant_id()`, `user_belongs_to_tenant()`

**Product Configs Seeded:**
- [x] ContractNest (composite billing)
- [x] FamilyKnows (tiered family billing)
- [x] Kaladristi (subscription + usage)
- [x] 10 topup packs (7 ContractNest, 3 Kaladristi)

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

### Issues Encountered

| Issue | Resolution | Notes |
|-------|------------|-------|
| Wrong table name `t_tenant` | Changed to `t_tenants` with `is_admin` column | Checked actual schema in database scripts |
| `is_tenant_admin` parameter conflict | Added DROP FUNCTION before CREATE OR REPLACE | Existing function had different param name |
| `is_tenant_admin` has view dependency | Split into 3 files, used DROP CASCADE in 003c | `v_audit_logs_detailed` view was dependent |
| Wrong column names in seed | Fixed: `name`, `currency_code`, `expiry_days` | Checked 002_new_tables.sql for actual schema |

### Testing Results

- [x] Migrations run successfully
- [x] Existing data preserved
- [x] Product configs queryable
- [x] Credit functions work with locking

---

## Phase 2: Billing Service Layer

**Status**: ⚪ Pending
**Depends On**: Phase 1

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Billing service | `contractnest-api/src/services/billing/billingService.ts` | ⚪ |
| 2 | Pricing engine | `contractnest-api/src/services/billing/pricingEngine.ts` | ⚪ |
| 3 | Usage service | `contractnest-api/src/services/billing/usageService.ts` | ⚪ |
| 4 | Credit service | `contractnest-api/src/services/billing/creditService.ts` | ⚪ |
| 5 | Invoice service | `contractnest-api/src/services/billing/invoiceService.ts` | ⚪ |
| 6 | Subscription service | `contractnest-api/src/services/billing/subscriptionService.ts` | ⚪ |
| 7 | Billing routes | `contractnest-api/src/routes/billingRoutes.ts` | ⚪ |
| 8 | Billing controller | `contractnest-api/src/controllers/billingController.ts` | ⚪ |

### Completed Work

*(To be filled after phase completion)*

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

**Key Integration Points in jtd-worker/index.ts:**
- Line ~303: After `await updateJTDStatus(jtd_id, 'processing')` - Add credit check
- Line ~372: Inside `if (result.success)` - Add credit deduction

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Billing source types | `migrations/business-model-v2/005_jtd_billing_source_types.sql` | ⚪ |
| 2 | Billing templates | JTD templates in database | ⚪ |
| 3 | Notification service | `contractnest-api/src/services/billing/billingNotificationService.ts` | ⚪ |
| 4 | **JTD Credit Integration** | `jtd-worker/index.ts` modification | ⚪ |

### Completed Work

*(To be filled after phase completion)*

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

### Completed Work

*(To be filled after phase completion)*

---

## Phase 5: Razorpay Integration

**Status**: ⚪ Pending
**Depends On**: Phase 2

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Razorpay service | `contractnest-api/src/services/billing/razorpayService.ts` | ⚪ |
| 2 | Razorpay webhook | `contractnest-edge/supabase/functions/razorpay-webhook/index.ts` | ⚪ |
| 3 | Payment processing | Invoice payment flow | ⚪ |

### Completed Work

*(To be filled after phase completion)*

---

## Phase 6: Contract Billing (Level 2)

**Status**: ⚪ Pending
**Depends On**: Phase 5

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Contract billing service | `contractnest-api/src/services/billing/contractBillingService.ts` | ⚪ |
| 2 | Contract billing routes | `contractnest-api/src/routes/contractBillingRoutes.ts` | ⚪ |
| 3 | Create invoice UI | `contractnest-ui/src/components/businessModel/ContractBilling/` | ⚪ |
| 4 | Settlement tracking | Settlement job and UI | ⚪ |

### Completed Work

*(To be filled after phase completion)*

---

## Phase 7: n8n Dunning Workflows

**Status**: ⚪ Pending
**Depends On**: Phase 5

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Platform dunning workflow | n8n workflow export | ⚪ |
| 2 | Contract billing reminders | n8n workflow export | ⚪ |
| 3 | Webhook triggers | API endpoints for n8n | ⚪ |

### Completed Work

*(To be filled after phase completion)*

---

## Phase 8: Billing Cycle Automation

**Status**: ⚪ Pending
**Depends On**: Phase 2, Phase 3

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Billing cycle worker | `contractnest-edge/supabase/functions/billing-cycle-worker/index.ts` | ⚪ |
| 2 | Subscription lifecycle | `contractnest-edge/supabase/functions/subscription-lifecycle/index.ts` | ⚪ |
| 3 | pg_cron jobs | `migrations/business-model-v2/006_cron_jobs.sql` | ⚪ |

### Completed Work

*(To be filled after phase completion)*

---

## Phase 9: Multi-Product Configs

**Status**: ✅ Completed (with Phase 1)
**Depends On**: Phase 1

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | FamilyKnows config | Product config in database | ✅ |
| 2 | Kaladristi config | Product config in database | ✅ |
| 3 | Custom client template | Product config template | ⚪ |

### Completed Work

| # | What Was Done | Files Created/Modified | Notes |
|---|---------------|----------------------|-------|
| 1 | FamilyKnows config | `004_seed_product_configs.sql` | Tiered family billing with free tier |
| 2 | Kaladristi config | `004_seed_product_configs.sql` | Subscription + usage billing |
| 3 | Topup packs | `004_seed_product_configs.sql` | 3 AI report packs for Kaladristi |

---

## Phase 10: Bot Integration & Polish

**Status**: ⚪ Pending
**Depends On**: Phase 2

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Billing query service | `contractnest-api/src/services/billing/billingQueryService.ts` | ⚪ |
| 2 | Bot routes | `contractnest-api/src/routes/billingBotRoutes.ts` | ⚪ |
| 3 | VaNi billing actions | Integration with VaNi | ⚪ |
| 4 | Documentation | Updated PRD, API docs | ⚪ |

### Completed Work

*(To be filled after phase completion)*

---

## Appendix: Session Log

| Date | Session | Phases Worked | Key Decisions | Notes |
|------|---------|---------------|---------------|-------|
| Jan 2025 | Initial | PRD Creation | Architecture decisions, no Redis, use JTD | PRD v1.1 created |
| Jan 2025 | Phase 1 | Phase 1 Complete | Split 003 into 3 files due to dependencies | All migrations applied |

---

## Appendix: Key Integration Notes

### JTD Framework Integration (Phase 3)

The existing JTD (Jobs To Do) framework handles notification delivery. In Phase 3, we need to:

1. **Import businessModel utils** into `jtd-worker/index.ts`
2. **Check credits BEFORE** sending notifications
3. **Deduct credits AFTER** successful send
4. **Handle insufficient credits** gracefully (mark as failed)

See Phase 3 section for exact code integration points.

### Edge Utils Location

All businessModel utilities are in:
```
contractnest-edge/supabase/functions/_shared/businessModel/
├── index.ts   # Helper functions (deductCredits, getBillingStatus, etc.)
└── types.ts   # TypeScript type definitions
```

These are imported by other Edge functions, NOT called directly by users.

---

**End of Delivery Tracker**
