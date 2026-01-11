# Business Model Agent - Delivery Tracker

> **Purpose**: Track planned vs completed work for each phase
> **PRD Reference**: `ClaudeDocumentation/BusinessModel/BUSINESS_MODEL_AGENT_PRD.md`
> **Last Updated**: January 2025

---

## Quick Status

| Phase | Status | Planned | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 1 | 🔵 Not Started | Schema & Configs | - | - |
| Phase 2 | ⚪ Pending | Billing Service | - | Depends on Phase 1 |
| Phase 3 | ⚪ Pending | JTD Notifications | - | Depends on Phase 2 |
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

**Status**: 🔵 Not Started
**Target**: Foundation for all billing operations

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Schema evolution migration | `contractnest-edge/supabase/migrations/business-model-v2/001_schema_evolution.sql` | ⚪ |
| 2 | New tables migration | `contractnest-edge/supabase/migrations/business-model-v2/002_new_tables.sql` | ⚪ |
| 3 | Database functions | `contractnest-edge/supabase/migrations/business-model-v2/003_functions.sql` | ⚪ |
| 4 | Product configs seed | `contractnest-edge/supabase/migrations/business-model-v2/004_seed_product_configs.sql` | ⚪ |
| 5 | Update Edge utils | `contractnest-edge/supabase/functions/utils/business-model.ts` | ⚪ |

### Planned Schema Changes

**Tables to Modify:**
- [ ] `t_bm_plan_version` - Add `billing_config JSONB`
- [ ] `t_bm_tenant_subscription` - Add product_code, billing_cycle, trial/grace dates
- [ ] `t_bm_subscription_usage` - Add indexes for aggregation
- [ ] `t_bm_invoice` - Add invoice_type, razorpay fields, line_items JSONB

**New Tables:**
- [ ] `t_bm_product_config` - Product billing configurations
- [ ] `t_bm_credit_balance` - Tenant credit balances
- [ ] `t_bm_credit_transaction` - Credit transaction history
- [ ] `t_bm_topup_pack` - Available topup packages
- [ ] `t_contract_invoice` - Contract billing (tenant→customer)
- [ ] `t_bm_billing_event` - Billing event log

**Database Functions:**
- [ ] `deduct_credits()` - Atomic credit deduction with locking
- [ ] `aggregate_usage()` - Usage aggregation for billing

### Completed Work

*(To be filled after phase completion)*

| # | What Was Done | Files Created/Modified | Commit |
|---|---------------|----------------------|--------|
| - | - | - | - |

### Issues Encountered

*(To be filled during/after phase)*

| Issue | Resolution | Notes |
|-------|------------|-------|
| - | - | - |

### Testing Results

*(To be filled after phase)*

- [ ] Migrations run successfully
- [ ] Existing data preserved
- [ ] Product configs queryable
- [ ] Credit functions work with locking

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

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Billing source types | `migrations/business-model-v2/005_jtd_billing_source_types.sql` | ⚪ |
| 2 | Billing templates | JTD templates in database | ⚪ |
| 3 | Notification service | `contractnest-api/src/services/billing/billingNotificationService.ts` | ⚪ |

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

**Status**: ⚪ Pending
**Depends On**: Phase 1

### Planned Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | FamilyKnows config | Product config in database | ⚪ |
| 2 | Kaladristi config | Product config in database | ⚪ |
| 3 | Custom client template | Product config template | ⚪ |

### Completed Work

*(To be filled after phase completion)*

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
| - | Phase 1 | - | - | - |

---

**End of Delivery Tracker**
