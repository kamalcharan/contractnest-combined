# Business Model PRD - Architecture Addendum

> **Document Version**: 1.0
> **Created**: January 2025
> **Status**: Approved
> **Purpose**: Correct architectural decisions in original PRD to align with ContractNest patterns

---

## 1. Executive Summary

The original PRD proposed an architecture where **API services call RPC directly**, bypassing the Edge layer. This violates ContractNest's established patterns:

```
ORIGINAL PRD (INCORRECT):
UI → API (billingService, creditService, etc.) → RPC/DB

CORRECTED:
UI → API (validate, DTO) → Edge (single RPC, <30ms) → RPC/DB
```

This addendum documents the corrections and their impact on implementation phases.

---

## 2. Architectural Corrections

### 2.1 Layer Responsibilities (Corrected)

| Layer | Original PRD | Corrected | Notes |
|-------|--------------|-----------|-------|
| **API** | Business logic in services | Validation + DTOs only | No RPC calls from API |
| **Edge** | Only for pg_cron workers | All billing operations | Single RPC per request |
| **RPC** | Called by API directly | Called by Edge only | Phase 1 functions remain valid |

### 2.2 Removed Deliverables

The following "services" from original PRD are **NOT needed** as separate files:

| Original PRD File | Why Removed | Replacement |
|-------------------|-------------|-------------|
| `billingService.ts` | Business logic belongs in RPC | `billing/index.ts` Edge function |
| `pricingEngine.ts` | Already exists as RPC | `calculate_tiered_price()` RPC |
| `creditService.ts` | Already exists as RPC | `deduct_credits()`, `add_credits()` RPC |
| `usageService.ts` | Already exists as RPC | `record_usage()`, `aggregate_usage()` RPC |
| `subscriptionService.ts` | Should be RPC | New RPC functions needed |
| `invoiceService.ts` | Should be RPC + Edge | New RPC + Edge function |

### 2.3 Integration Module Discovery

The original PRD mentioned using `t_tenant_integrations` for Razorpay credentials. Investigation confirmed a **complete Integrations module already exists**:

```
Existing Infrastructure:
├── t_integration_types          # Categories (payment_gateway, etc.)
├── t_integration_providers      # Providers with config_schema
├── t_tenant_integrations        # Per-tenant encrypted credentials
├── integrations/index.ts        # Edge function with AES-256-GCM encryption
├── integrationService.ts        # API service layer
└── UI components                # Dynamic forms, connection testing
```

**Impact**: Phase 5 (Razorpay Integration) can leverage existing encryption/decryption infrastructure.

---

## 3. Corrected Architecture

### 3.1 Sync Path (User Requests)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER REQUEST FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   UI (React)                                                         │
│    │                                                                 │
│    ▼                                                                 │
│   API Layer (contractnest-api)                                      │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │ billingRoutes.ts       → Route definitions                    │ │
│   │ billingController.ts   → Validation, call Edge                │ │
│   │ billing.dto.ts         → Request/Response DTOs                │ │
│   │ billing.validation.ts  → Zod schemas                          │ │
│   │                                                               │ │
│   │ NO business logic | NO RPC calls | NO Razorpay API calls      │ │
│   └───────────────────────────────────────────────────────────────┘ │
│    │                                                                 │
│    ▼                                                                 │
│   Edge Layer (contractnest-edge)                                    │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │ billing/index.ts                                              │ │
│   │                                                               │ │
│   │ GET  /billing/status/:tenantId  → rpc('get_billing_status')  │ │
│   │ GET  /billing/credits/:tenantId → rpc('get_credit_balance')  │ │
│   │ POST /billing/usage             → rpc('record_usage')        │ │
│   │ POST /billing/credits/deduct    → rpc('deduct_credits')      │ │
│   │ POST /billing/credits/topup     → rpc('add_credits')         │ │
│   │ GET  /billing/invoice/estimate  → rpc('get_invoice_estimate')│ │
│   │                                                               │ │
│   │ Single RPC call | <30ms | No loops                           │ │
│   └───────────────────────────────────────────────────────────────┘ │
│    │                                                                 │
│    ▼                                                                 │
│   RPC Functions (PostgreSQL)                                        │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │ Phase 1 (Done):                                               │ │
│   │   deduct_credits, add_credits, record_usage, aggregate_usage │ │
│   │   get_billing_status, get_credit_balance, calculate_tiered_* │ │
│   │                                                               │ │
│   │ Phase 2 (New):                                                │ │
│   │   get_invoice_estimate, get_usage_summary                    │ │
│   └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Async Path (Background Jobs)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKGROUND JOB FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   TRIGGER                    EDGE FUNCTION              ACTION       │
│   ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│   pg_cron (1st of month)                                            │
│    │                                                                 │
│    └──► billing-cycle-worker/index.ts                               │
│              │                                                       │
│              ├── Loop subscriptions (OK for background)             │
│              ├── rpc('generate_invoice') per subscription           │
│              ├── Call Razorpay API (create invoice)                 │
│              └── pgmq_send('invoice_created') for JTD               │
│                                                                      │
│   ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│   Razorpay Webhook POST                                             │
│    │                                                                 │
│    └──► razorpay-webhook/index.ts                                   │
│              │                                                       │
│              ├── Verify webhook signature                           │
│              ├── rpc('process_payment_webhook')                     │
│              └── pgmq_send('payment_received') for JTD              │
│                                                                      │
│   ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│   pg_cron (daily)                                                   │
│    │                                                                 │
│    └──► subscription-lifecycle/index.ts                             │
│              │                                                       │
│              ├── rpc('check_trial_expiry')                          │
│              ├── rpc('check_grace_period')                          │
│              └── pgmq_send() for notifications                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Razorpay Integration (Using Existing Integrations Module)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RAZORPAY CREDENTIAL FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   PLATFORM BILLING (Us → Tenant)                                    │
│   ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│   billing-cycle-worker                                              │
│    │                                                                 │
│    ├── Get admin tenant: SELECT id FROM t_tenants WHERE is_admin=true│
│    │                                                                 │
│    ├── Get credentials: SELECT credentials FROM t_tenant_integrations│
│    │                    WHERE tenant_id = admin_id                  │
│    │                    AND provider = 'razorpay'                   │
│    │                                                                 │
│    ├── Decrypt: decryptData(credentials, INTEGRATION_ENCRYPTION_KEY)│
│    │                                                                 │
│    └── Call Razorpay API with decrypted key_id + key_secret         │
│                                                                      │
│   ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│   CONTRACT BILLING (Tenant → Customer)                              │
│   ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│   contract-billing/index.ts                                         │
│    │                                                                 │
│    ├── Get tenant's credentials from t_tenant_integrations          │
│    │                                                                 │
│    ├── Decrypt server-side                                          │
│    │                                                                 │
│    ├── Create payment link via Razorpay API                         │
│    │                                                                 │
│    └── Customer pays → money to tenant's Razorpay account           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Impact on Implementation Phases

### 4.1 Phase 1: Schema & Configs ✅ COMPLETED (No Change)

All RPC functions and tables created. No impact.

### 4.2 Phase 2: Billing Edge Function (REVISED)

**Original PRD Deliverables** (8 files in API):
```
contractnest-api/src/services/billing/
├── billingService.ts      ❌ REMOVED
├── pricingEngine.ts       ❌ REMOVED
├── usageService.ts        ❌ REMOVED
├── creditService.ts       ❌ REMOVED
├── invoiceService.ts      ❌ REMOVED
├── subscriptionService.ts ❌ REMOVED
├── billingRoutes.ts       ✓ KEEP (validation only)
└── billingController.ts   ✓ KEEP (calls Edge)
```

**Corrected Deliverables**:

| Layer | File | Purpose |
|-------|------|---------|
| **API** | `routes/billingRoutes.ts` | Route definitions |
| **API** | `controllers/billingController.ts` | Validation → call Edge |
| **API** | `types/billing.dto.ts` | Request/Response DTOs |
| **API** | `validators/billing.validation.ts` | Zod schemas |
| **Edge** | `billing/index.ts` | Single RPC calls |
| **DB** | 2 new RPC functions | `get_invoice_estimate`, `get_usage_summary` |

### 4.3 Phase 3: JTD Credit Integration (No Change)

Modify jtd-worker to check/deduct credits. Same as original.

### 4.4 Phase 4: Plan UI Evolution (No Change)

UI changes remain the same.

### 4.5 Phase 5: Razorpay Integration (REVISED)

**Original PRD**:
```
contractnest-api/src/services/billing/razorpayService.ts  ❌ WRONG LAYER
```

**Corrected Deliverables**:

| Layer | File | Purpose |
|-------|------|---------|
| **Edge** | `razorpay-webhook/index.ts` | Handle Razorpay webhooks |
| **Edge** | `razorpay-operations/index.ts` | Create invoices, payment links |
| **DB** | `get_razorpay_credentials()` | Decrypt credentials for tenant |
| **DB** | `process_payment_webhook()` | Update invoice on payment |

**Key**: Uses existing `integrations/index.ts` decryption pattern.

### 4.6 Phase 6-10 (Minor Adjustments)

All Edge functions, no API service layer changes needed.

---

## 5. New RPC Functions Required

### 5.1 Phase 2 Additions

```sql
-- Get invoice estimate for upcoming billing period
CREATE OR REPLACE FUNCTION get_invoice_estimate(
    p_tenant_id UUID
) RETURNS JSONB AS $$
-- Aggregates usage, applies pricing, returns estimate
$$;

-- Get usage summary with limits
CREATE OR REPLACE FUNCTION get_usage_summary(
    p_tenant_id UUID,
    p_period_start TIMESTAMPTZ DEFAULT NULL,
    p_period_end TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB AS $$
-- Returns usage by metric with limit comparisons
$$;
```

### 5.2 Phase 5 Additions

```sql
-- Get decrypted Razorpay credentials for a tenant
CREATE OR REPLACE FUNCTION get_razorpay_credentials(
    p_tenant_id UUID
) RETURNS JSONB AS $$
-- Returns decrypted credentials (server-side only)
-- Uses pgcrypto or calls Edge function for decryption
$$;

-- Process incoming payment webhook
CREATE OR REPLACE FUNCTION process_payment_webhook(
    p_razorpay_payment_id TEXT,
    p_razorpay_invoice_id TEXT,
    p_amount NUMERIC,
    p_status TEXT
) RETURNS JSONB AS $$
-- Updates invoice status, records payment
$$;
```

### 5.3 Phase 8 Additions

```sql
-- Generate invoice for a subscription period
CREATE OR REPLACE FUNCTION generate_invoice(
    p_subscription_id UUID,
    p_period_start DATE,
    p_period_end DATE
) RETURNS JSONB AS $$
-- Aggregates usage, calculates total, creates invoice record
$$;

-- Check and process trial expirations
CREATE OR REPLACE FUNCTION process_trial_expirations()
RETURNS TABLE (tenant_id UUID, action TEXT) AS $$
-- Finds expired trials, updates status, returns affected tenants
$$;

-- Check and process grace period endings
CREATE OR REPLACE FUNCTION process_grace_period_endings()
RETURNS TABLE (tenant_id UUID, action TEXT) AS $$
-- Finds ended grace periods, suspends accounts
$$;
```

---

## 6. Edge Function Specifications

### 6.1 billing/index.ts (Phase 2)

```typescript
// Target: <30ms per request
// Pattern: Single RPC call per endpoint

const routes = {
  'GET /billing/status/:tenantId': async (req, tenantId) => {
    const { data, error } = await supabase.rpc('get_billing_status', {
      p_tenant_id: tenantId
    });
    return Response.json(data);
  },

  'GET /billing/credits/:tenantId': async (req, tenantId) => {
    const { data, error } = await supabase.rpc('get_credit_balance', {
      p_tenant_id: tenantId
    });
    return Response.json(data);
  },

  'POST /billing/usage': async (req, tenantId) => {
    const body = await req.json();
    const { data, error } = await supabase.rpc('record_usage', {
      p_tenant_id: tenantId,
      p_metric_type: body.metric_type,
      p_quantity: body.quantity,
      p_metadata: body.metadata || {}
    });
    return Response.json(data);
  },

  'POST /billing/credits/deduct': async (req, tenantId) => {
    const body = await req.json();
    const { data, error } = await supabase.rpc('deduct_credits', {
      p_tenant_id: tenantId,
      p_credit_type: body.credit_type,
      p_quantity: body.quantity,
      p_channel: body.channel,
      p_reference_type: body.reference_type,
      p_reference_id: body.reference_id
    });
    return Response.json(data);
  },

  'POST /billing/credits/topup': async (req, tenantId) => {
    const body = await req.json();
    const { data, error } = await supabase.rpc('add_credits', {
      p_tenant_id: tenantId,
      p_credit_type: body.credit_type,
      p_quantity: body.quantity,
      p_channel: body.channel,
      p_source: 'topup',
      p_reference_id: body.pack_id
    });
    return Response.json(data);
  },

  'GET /billing/invoice/estimate/:tenantId': async (req, tenantId) => {
    const { data, error } = await supabase.rpc('get_invoice_estimate', {
      p_tenant_id: tenantId
    });
    return Response.json(data);
  }
};
```

### 6.2 razorpay-webhook/index.ts (Phase 5)

```typescript
// Webhook handler - verify signature, process payment, emit event

export async function handler(req: Request): Promise<Response> {
  // 1. Verify Razorpay webhook signature
  const signature = req.headers.get('x-razorpay-signature');
  const body = await req.text();

  if (!verifyWebhookSignature(body, signature, webhookSecret)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);

  // 2. Process based on event type
  switch (event.event) {
    case 'payment.captured':
      await supabase.rpc('process_payment_webhook', {
        p_razorpay_payment_id: event.payload.payment.entity.id,
        p_razorpay_invoice_id: event.payload.payment.entity.invoice_id,
        p_amount: event.payload.payment.entity.amount / 100,
        p_status: 'paid'
      });

      // 3. Emit to PGMQ for JTD notification
      await supabase.rpc('pgmq_send', {
        queue_name: 'jtd_queue',
        message: JSON.stringify({
          source_type: 'payment_received',
          tenant_id: extractTenantId(event),
          data: { amount: event.payload.payment.entity.amount / 100 }
        })
      });
      break;

    case 'payment.failed':
      // Handle failure, trigger dunning
      break;
  }

  return Response.json({ received: true });
}
```

---

## 7. Migration Path

### 7.1 Immediate Actions

1. **Create this addendum** in `ClaudeDocumentation/BusinessModel/`
2. **Update HANDOVER_CONTEXT.md** with corrected Phase 2 deliverables
3. **Update BM_delivery.md** with revised file list

### 7.2 Phase 2 Implementation Order

1. Create new RPC functions (`get_invoice_estimate`, `get_usage_summary`)
2. Create `billing/index.ts` Edge function
3. Create API layer (routes, controller, DTOs, validators)
4. Test end-to-end flow

### 7.3 No Breaking Changes

- Phase 1 RPC functions remain valid
- No database schema changes needed
- Edge utils in `_shared/businessModel/` can still be used

---

## 8. Checklist Compliance

### API Layer Checklist
- [x] Request DTO defined with types
- [x] Response DTO defined with types
- [x] Zod validation schema created
- [x] Error responses use standard format
- [x] No business logic in API layer
- [x] API docs/comments included
- [x] Versioned route (/api/v1/billing/*)

### Edge Layer Checklist
- [x] Single DB call (RPC preferred)
- [x] No loops with await inside
- [x] No AI calls (use PGMQ)
- [x] No data transformation (DB does this)
- [x] Error handling with proper status codes
- [x] <30ms expected execution

### Scale Checklist
- [x] Using existing connection pool (Supabase client)
- [x] LIMIT + OFFSET on all lists
- [x] Indexes exist for query columns (Phase 1)
- [x] Heavy processing via PGMQ

---

## 9. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2025 | Claude Code | Initial addendum correcting architecture |

---

**End of Addendum**
