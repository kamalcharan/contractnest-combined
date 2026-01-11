# Phase 1 Kickoff Prompt

> **Copy everything below the line and paste into a new Claude Code session**

---

## BUSINESS MODEL AGENT - PHASE 1: Schema & Product Configs

### Context Documents (READ FIRST)

1. **PRD Document**: `ClaudeDocumentation/BusinessModel/BUSINESS_MODEL_AGENT_PRD.md`
   - Read Sections 1-3 for Vision, Use Cases, and Key Decisions
   - Read Section 8 for Database Schema details
   - Read Section 17 for Phase breakdown

2. **Delivery Tracker**: `ClaudeDocumentation/BusinessModel/BM_delivery.md`
   - Update Phase 1 status as you work
   - Track completed deliverables

### Phase 1 Objective

Create database schema evolution and ContractNest product configuration.

### Deliverables

Create these files in `MANUAL_COPY_FILES/phase-1-schema/`:

```
MANUAL_COPY_FILES/phase-1-schema/
├── contractnest-edge/
│   └── supabase/
│       ├── migrations/
│       │   └── business-model-v2/
│       │       ├── 001_schema_evolution.sql
│       │       ├── 002_new_tables.sql
│       │       ├── 003_functions.sql
│       │       └── 004_seed_product_configs.sql
│       └── functions/
│           └── utils/
│               └── business-model.ts (updated)
└── COPY_INSTRUCTIONS.txt
```

### Specific Tasks

1. **001_schema_evolution.sql**
   - Add `billing_config JSONB` to `t_bm_plan_version`
   - Add columns to `t_bm_tenant_subscription`: product_code, billing_cycle, trial/grace dates, razorpay_subscription_id
   - Add indexes to `t_bm_subscription_usage`
   - Add columns to `t_bm_invoice`: invoice_type, razorpay fields, line_items JSONB

2. **002_new_tables.sql**
   - `t_bm_product_config` - Product billing configurations
   - `t_bm_credit_balance` - Tenant credit balances with unique constraint
   - `t_bm_credit_transaction` - Credit transaction history
   - `t_bm_topup_pack` - Available topup packages
   - `t_contract_invoice` - Contract billing (tenant→customer)
   - `t_bm_billing_event` - Billing event log

3. **003_functions.sql**
   - `deduct_credits(tenant_id, credit_type, channel, quantity, reference_type, reference_id)` - With FOR UPDATE locking
   - `aggregate_usage(tenant_id, period_start, period_end)` - Returns JSONB

4. **004_seed_product_configs.sql**
   - ContractNest composite billing config (see PRD Section 6.1)
   - Include: base_fee tiers, contract charges, storage, credits, addons, trial/grace

5. **Update business-model.ts**
   - Add validators for new billing_config structure
   - Update transformPlanForEdit() for new schema

### Key Requirements

- **Backwards Compatible**: Don't break existing plan data
- **Race Condition Safe**: Credit deduction must use FOR UPDATE
- **Proper Indexing**: For usage aggregation queries
- **JSONB Structure**: Match PRD Section 8 exactly

### ContractNest Billing Config Reference (from PRD)

```json
{
  "product_code": "contractnest",
  "billing_model": "composite",
  "billing_cycles": ["quarterly", "annual"],
  "base_fee": {
    "included_users": 2,
    "tiers": [
      { "users_from": 1, "users_to": 2, "monthly_amount": 500 },
      { "users_from": 3, "users_to": 5, "monthly_amount": 750 },
      { "users_from": 6, "users_to": 10, "monthly_amount": 1200 }
    ]
  },
  "contracts": {
    "base_price": 150,
    "standalone_price": 250,
    "tiers": [
      { "from": 1, "to": 50, "price": 150 },
      { "from": 51, "to": 200, "price": 120 },
      { "from": 201, "to": null, "price": 100 }
    ]
  },
  "storage": { "included_mb": 40, "overage_per_mb": 0.50 },
  "credits": {
    "notifications": {
      "included_per_contract": 10,
      "channels": ["whatsapp", "sms", "email"],
      "topup_packs": [
        { "quantity": 50, "price": 200 },
        { "quantity": 200, "price": 700 }
      ]
    }
  },
  "addons": {
    "vani_ai": { "name": "VaNi AI Agent", "monthly_price": 5000, "trial_days": 7 }
  },
  "trial": { "days": 14 },
  "grace_period": { "days": 7, "access_level": "full" }
}
```

### After Completion

1. Update `BM_delivery.md` Phase 1 section with:
   - Completed deliverables
   - Any issues encountered
   - Testing checklist

2. Provide COPY_INSTRUCTIONS.txt with copy commands

3. Commit to branch with message: `feat(billing): Phase 1 - Schema evolution and ContractNest product config`

---

**START BY**: Reading the PRD sections 1-3, 8 to understand context before writing any code.
