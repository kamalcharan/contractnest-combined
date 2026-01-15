# Business Model Implementation - Handover Context

> **Purpose**: Quick onboarding for continuing Business Model implementation
> **Last Session**: January 2025
> **Completed**: Phase 1 (Schema), Phase 2 (Billing Edge + API)
> **Next Phase**: Phase 3 - JTD Credit Integration

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

### Files Created (To Apply)

| # | File | Location | Purpose |
|---|------|----------|---------|
| 1 | `005_phase2_rpc_functions.sql` | `contractnest-edge/supabase/migrations/business-model-v2/` | 5 new RPC functions |
| 2 | `billing/index.ts` | `contractnest-edge/supabase/functions/` | Billing Edge function |
| 3 | `billing.dto.ts` | `contractnest-api/src/types/` | Request/Response DTOs |
| 4 | `billingValidators.ts` | `contractnest-api/src/validators/` | Validation rules |
| 5 | `billingService.ts` | `contractnest-api/src/services/` | HTTP client to Edge |
| 6 | `billingController.ts` | `contractnest-api/src/controllers/` | Controller |
| 7 | `billingRoutes.ts` | `contractnest-api/src/routes/` | Route definitions |

### RPC Functions from Phase 2

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

## 🔮 Phase 3: JTD Credit Integration (NEXT)

### 🚨 CRITICAL: Modify jtd-worker to check/deduct credits

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

### Phase 3 Deliverables

| # | File | Purpose |
|---|------|---------|
| 1 | `006_jtd_billing_source_types.sql` | Add billing notification source types to JTD |
| 2 | Modify `jtd-worker/index.ts` | Integrate credit check/deduction |
| 3 | JTD templates | Billing notification templates |

---

## 📁 File Locations

### Phase 2 Files (To Copy)

```
MANUAL_COPY_FILES/business-model-phase2/
├── contractnest-edge/
│   └── supabase/
│       ├── migrations/business-model-v2/
│       │   └── 005_phase2_rpc_functions.sql
│       └── functions/billing/
│           └── index.ts
├── contractnest-api/
│   └── src/
│       ├── types/billing.dto.ts
│       ├── validators/billingValidators.ts
│       ├── services/billingService.ts
│       ├── controllers/billingController.ts
│       └── routes/billingRoutes.ts
└── ClaudeDocumentation/BusinessModel/
    ├── PRD_ADDENDUM_ARCHITECTURE.md
    ├── BM_delivery.md (updated)
    └── HANDOVER_CONTEXT.md (this file)
```

### Documentation

```
ClaudeDocumentation/BusinessModel/
├── BUSINESS_MODEL_AGENT_PRD.md        # Full PRD (original)
├── PRD_ADDENDUM_ARCHITECTURE.md       # Architecture corrections (NEW)
├── BM_delivery.md                      # Delivery tracker (updated)
└── HANDOVER_CONTEXT.md                 # This file
```

---

## 🚨 Important Notes

### 1. Architecture Pattern (MUST FOLLOW)

```
CORRECT:
UI → API (validate, DTO) → Edge (single RPC, <30ms) → RPC → DB

WRONG:
UI → API (business logic) → RPC → DB
```

### 2. Existing Integrations Module

Razorpay credentials are stored in `t_tenant_integrations` via existing Integrations module:
- Admin tenant's Razorpay = Platform payment account
- Regular tenant's Razorpay = Their own account for Contract Billing

**DO NOT** create new credential storage - use existing module.

### 3. Table References

- Tenant table is `t_tenants` with `is_admin` column (NOT `t_tenant`)
- Credit balance table is `t_bm_credit_balance`
- Topup pack table uses `name`, `currency_code`, `expiry_days`

### 4. API Router Registration

After copying Phase 2 files, register the billing routes in the API:

```typescript
// In contractnest-api/src/index.ts or routes/index.ts
import billingRoutes from './routes/billingRoutes';

// Add to router
app.use('/api', billingRoutes);
```

---

## 📋 Quick Start for Next Session

```bash
# 1. Read the PRD Addendum for architecture
Read: ClaudeDocumentation/BusinessModel/PRD_ADDENDUM_ARCHITECTURE.md

# 2. Read the delivery tracker
Read: ClaudeDocumentation/BusinessModel/BM_delivery.md

# 3. If starting Phase 3, modify jtd-worker:
Read: contractnest-edge/supabase/functions/jtd-worker/index.ts
# Apply credit check/deduction at lines ~303 and ~372

# 4. If doing Phase 5 (Razorpay), check integrations:
Read: contractnest-edge/supabase/functions/integrations/index.ts
# Understand credential encryption/decryption pattern
```

---

## 🔗 Key PRD Reference

**Full PRD**: `ClaudeDocumentation/BusinessModel/BUSINESS_MODEL_AGENT_PRD.md`
**Architecture Addendum**: `ClaudeDocumentation/BusinessModel/PRD_ADDENDUM_ARCHITECTURE.md`

### Billing Models Supported

1. **Composite** (ContractNest): Base fee + usage + credits + add-ons
2. **Tiered Family** (FamilyKnows): User-count tiers with free tier
3. **Subscription + Usage** (Kaladristi): Base subscription + per-use charges

### Architecture Decisions

- No Redis - use PostgreSQL row-level locking
- JTD framework for notifications
- JSONB for flexible billing configurations
- Multi-tenant with RLS policies
- **Edge functions call RPC** - NOT API services

---

**End of Handover Context**
