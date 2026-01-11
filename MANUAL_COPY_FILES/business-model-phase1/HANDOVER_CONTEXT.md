# Business Model Implementation - Handover Context

> **Purpose**: Quick onboarding for continuing Business Model implementation
> **Last Session**: January 2025
> **Next Phase**: Phase 2 - Billing Service Layer

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

### Edge Utils Created (Ready to Copy)

| File | Location | Purpose |
|------|----------|---------|
| `index.ts` | `contractnest-edge/supabase/functions/_shared/businessModel/` | Helper functions for RPC calls |
| `types.ts` | `contractnest-edge/supabase/functions/_shared/businessModel/` | TypeScript type definitions |

---

## 📊 Database Schema Summary

### Tables Modified (001_schema_evolution.sql)
- `t_bm_plan_version` - Added `billing_config JSONB`
- `t_bm_tenant_subscription` - Added product_code, billing_cycle, trial/grace dates
- `t_bm_subscription_usage` - Added tenant_id, metric_type, quantity, billing_period
- `t_bm_invoice` - Added invoice_type, razorpay fields, line_items JSONB

### New Tables Created (002_new_tables.sql)
| Table | Purpose |
|-------|---------|
| `t_bm_product_config` | Product billing configurations (JSONB billing_config) |
| `t_bm_credit_balance` | Tenant credit balances per type/channel |
| `t_bm_credit_transaction` | Credit transaction history (audit trail) |
| `t_bm_topup_pack` | Available topup packages |
| `t_contract_invoice` | Contract billing (tenant→customer) |
| `t_bm_billing_event` | Billing event log |

### RPC Functions Created (003a_rpc_functions.sql)
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

### Product Configs Seeded (004_seed_product_configs.sql)
- **ContractNest**: Composite billing (base fee + usage + credits + addons)
- **FamilyKnows**: Tiered family billing with free tier
- **Kaladristi**: Subscription + usage billing
- **Topup Packs**: 7 ContractNest (WhatsApp/SMS/Email), 3 Kaladristi (AI Reports)

---

## 🚨 Important Notes & Gotchas

### 1. Table Schema References
When writing SQL, always verify column names against `002_new_tables.sql`:
- `t_bm_product_config`: Uses `billing_config` JSONB (NOT separate `billing_model` column)
- `t_bm_topup_pack`: Uses `name` (NOT `pack_name`), `currency_code` (NOT `currency`), `expiry_days` (NOT `validity_days`)

### 2. Function Dependencies
- `is_tenant_admin()` function has dependency from `v_audit_logs_detailed` view
- Must use `DROP FUNCTION ... CASCADE` when modifying
- Split into separate migration file (003c) to handle gracefully

### 3. Tenant Table Reference
- Actual table is `t_tenants` with `is_admin` column
- NOT `t_tenant` - this was corrected during Phase 1

### 4. Currency Compatibility
- All seed data uses 'INR' which matches `contractnest-ui/src/utils/constants/currencies.ts`

---

## 🔮 Phase 2: Billing Service Layer

### Location
`contractnest-api/src/services/billing/`

### Planned Deliverables
| # | File | Purpose |
|---|------|---------|
| 1 | `billingService.ts` | Main billing service |
| 2 | `pricingEngine.ts` | Pricing calculations |
| 3 | `usageService.ts` | Usage tracking |
| 4 | `creditService.ts` | Credit operations |
| 5 | `invoiceService.ts` | Invoice generation |
| 6 | `subscriptionService.ts` | Subscription management |
| 7 | `billingRoutes.ts` | API routes |
| 8 | `billingController.ts` | Route handlers |

### Key Integration Points
- Services should call the RPC functions created in Phase 1
- Use `@supabase/supabase-js` client
- Follow existing service patterns in `contractnest-api`

---

## ⚠️ Phase 3: JTD Credit Integration (Future)

### CRITICAL: Must integrate credit check/deduction into jtd-worker

**File**: `contractnest-edge/supabase/functions/jtd-worker/index.ts`

**Integration Points**:

```typescript
// At top of file - add import
import { checkCreditAvailability, deductCredits } from '../_shared/businessModel/index.ts';

// Line ~303: AFTER "await updateJTDStatus(jtd_id, 'processing')" - Add credit check
if (['whatsapp', 'sms', 'email'].includes(channel_code)) {
  const creditCheck = await checkCreditAvailability(supabase, tenant_id, 'notification', 1, channel_code);
  if (!creditCheck.isAvailable) {
    await updateJTDStatus(jtd_id, 'failed', undefined, 'Insufficient notification credits');
    await deleteMessage(msg.msg_id);
    return;
  }
}

// Line ~372: Inside "if (result.success)" block - Add credit deduction
if (['whatsapp', 'sms', 'email'].includes(channel_code)) {
  await deductCredits(supabase, tenant_id, 'notification', 1, {
    channel: channel_code,
    referenceType: 'jtd',
    referenceId: jtd_id,
    description: `${channel_code} notification sent`,
  });
}
```

---

## 📁 File Locations

### Migration Files (Applied)
```
contractnest-edge/supabase/migrations/business-model-v2/
├── 001_schema_evolution.sql
├── 002_new_tables.sql
├── 003a_rpc_functions.sql
├── 003b_rls_and_helpers.sql
├── 003c_is_tenant_admin_fix.sql
└── 004_seed_product_configs.sql
```

### Edge Utils (To Copy)
```
MANUAL_COPY_FILES/business-model-phase1/contractnest-edge/supabase/functions/_shared/businessModel/
├── index.ts
└── types.ts
```

### Documentation
```
ClaudeDocumentation/BusinessModel/
├── BUSINESS_MODEL_AGENT_PRD.md   # Full PRD
└── BM_delivery.md                 # Delivery tracker (updated)
```

---

## 🔗 Key PRD Reference

**Full PRD**: `ClaudeDocumentation/BusinessModel/BUSINESS_MODEL_AGENT_PRD.md`

### Billing Models Supported
1. **Composite** (ContractNest): Base fee + usage + credits + add-ons
2. **Tiered Family** (FamilyKnows): User-count tiers with free tier
3. **Subscription + Usage** (Kaladristi): Base subscription + per-use charges

### Architecture Decisions
- No Redis - use PostgreSQL row-level locking
- JTD framework for notifications (not separate notification service)
- JSONB for flexible billing configurations
- Multi-tenant with RLS policies

---

## 📋 Quick Start for Next Session

```bash
# 1. Read the PRD
Read: ClaudeDocumentation/BusinessModel/BUSINESS_MODEL_AGENT_PRD.md

# 2. Read the delivery tracker
Read: ClaudeDocumentation/BusinessModel/BM_delivery.md

# 3. Check existing API service patterns
Read: contractnest-api/src/services/ (any existing service for patterns)

# 4. Start Phase 2 implementation
Create: contractnest-api/src/services/billing/billingService.ts
```

---

**End of Handover Context**
