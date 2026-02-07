# Contact 360 Command Center - Part 1 Backend Handover

> **Session Date**: February 2025
> **Status**: Analysis Complete - Ready for Implementation
> **Next Step**: Start new session, answer questions, then code

---

## Overview

Building a **Contact 360 Command Center** - a comprehensive view of a contact's relationship with the business. Implementation is in 3 parts:

| Part | Layer | Status |
|------|-------|--------|
| **Part 1** | Backend (Edge + RPC) | Ready for implementation |
| Part 2 | UI - Header + Contracts Column | Pending Part 1 |
| Part 3 | UI - Events + Insights + ActionIsland | Pending Part 1 |

**After all 3 parts**: Clean up orphan code/files

---

## Part 1 Scope

### Goal
Make complete data available for Contact 360 UI via enhanced API.

### Deliverables
1. Add `cockpit_summary` action handler to Contracts Edge Function
2. Enhance RPC `get_contact_cockpit_summary` with new fields
3. Update TypeScript types in UI

---

## Current State Analysis

### What EXISTS:

| Component | Location | Status |
|-----------|----------|--------|
| RPC `get_contact_cockpit_summary` | `contractnest-edge/supabase/migrations/contracts/015_contact_cockpit_summary_rpc.sql` | Exists but incomplete |
| API Controller `getContactCockpit` | `contractnest-api/src/controllers/contactController.ts:514-589` | Exists |
| Hook `useContactCockpit` | `contractnest-ui/src/hooks/queries/useContactCockpit.ts` | Exists |
| Types `ContactCockpitData` | `contractnest-ui/src/types/contactCockpit.ts` | Exists but needs enhancement |
| Invoice Table `t_invoices` | `contractnest-edge/supabase/migrations/contracts/005_invoices_receipts.sql` | Exists |
| Contracts Edge Function | `contractnest-edge/supabase/functions/contracts/index.ts` | Exists |

### What's BROKEN:

| Issue | Details |
|-------|---------|
| **Edge Function Missing Handler** | API calls `/contracts` with `action: 'cockpit_summary'` but Edge Function doesn't handle this action! It falls through to `handleCreate` which tries to create a contract |
| **Only buyer contracts** | RPC only fetches `WHERE buyer_id = contact_id` - misses vendor/partner roles |
| **Outstanding hardcoded** | Line 239 in RPC: `outstanding := 0;` - never calculates actual value |

### What's MISSING:

| Field | Purpose |
|-------|---------|
| `urgency_score` | 0-100 score based on overdue items |
| `urgency_level` | 'low' / 'medium' / 'high' / 'critical' |
| `cnak_status` per contract | 'not_configured' / 'pending' / 'connected' |
| `payment_pattern` | Invoice payment behavior metrics |
| `invoices[]` | Recent invoices for Financials column |
| `contact_role` per contract | 'client' / 'vendor' / 'partner' |

---

## Files to Modify

### 1. Contracts Edge Function
**File**: `contractnest-edge/supabase/functions/contracts/index.ts`

**Change**: Add action handler for `cockpit_summary`

```typescript
// In the POST handler, add before the default create handler:

if (action === 'cockpit_summary') {
  return await handleCockpitSummary(req, supabaseClient, tenantId);
}
```

**New Handler Function**:
```typescript
async function handleCockpitSummary(
  req: Request,
  supabaseClient: SupabaseClient,
  tenantId: string
): Promise<Response> {
  const { contact_id, days_ahead = 7, is_live = true } = await req.json();

  if (!contact_id) {
    return errorResponse('contact_id is required', 400);
  }

  const { data, error } = await supabaseClient.rpc('get_contact_cockpit_summary', {
    p_contact_id: contact_id,
    p_tenant_id: tenantId,
    p_days_ahead: days_ahead,
    p_is_live: is_live
  });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return successResponse(data);
}
```

---

### 2. Enhanced RPC Function
**File**: `contractnest-edge/supabase/migrations/contracts/015_contact_cockpit_summary_rpc.sql`

**Action**: Replace entire RPC with enhanced version

**Key Enhancements**:

#### A. Multi-role Contract Fetch
```sql
-- Fetch contracts where contact is buyer OR seller
SELECT * FROM t_contracts
WHERE tenant_id = p_tenant_id
  AND is_active = true
  AND is_live = p_is_live
  AND (
    buyer_id = p_contact_id           -- Contact as client (buying)
    OR seller_id = p_contact_id       -- Contact as vendor (selling) - rare
    OR seller_contact_id = p_contact_id  -- Contact person on seller side
  )
```

#### B. CNAK Status per Contract
```sql
-- For each contract, determine CNAK status
CASE
  WHEN c.global_access_id IS NULL THEN 'not_configured'
  WHEN EXISTS (
    SELECT 1 FROM t_contract_access ca
    WHERE ca.contract_id = c.id AND ca.claimed_at IS NOT NULL
  ) THEN 'connected'
  ELSE 'pending'
END AS cnak_status
```

#### C. Contact Role per Contract
```sql
CASE
  WHEN c.buyer_id = p_contact_id THEN 'client'
  WHEN c.seller_id = p_contact_id OR c.seller_contact_id = p_contact_id THEN 'vendor'
  ELSE 'partner'
END AS contact_role
```

#### D. Outstanding Amount (Actual Calculation)
```sql
-- Sum unpaid invoice balances for this contact's contracts
SELECT COALESCE(SUM(i.balance), 0)
FROM t_invoices i
JOIN t_contracts c ON i.contract_id = c.id
WHERE c.tenant_id = p_tenant_id
  AND (c.buyer_id = p_contact_id OR c.seller_id = p_contact_id)
  AND i.status IN ('unpaid', 'partially_paid', 'overdue')
  AND i.is_active = true
INTO v_outstanding;
```

#### E. Urgency Score Calculation
```sql
-- Calculate urgency based on overdue items
v_overdue_events := (SELECT COUNT(*) FROM overdue events);
v_overdue_invoices := (SELECT COUNT(*) FROM t_invoices WHERE status = 'overdue' AND contract in contact's contracts);
v_events_today := (SELECT COUNT(*) FROM events due today);
v_events_3_days := (SELECT COUNT(*) FROM events due in 3 days);

v_urgency_score := LEAST(100,
  (v_overdue_events * 15) +
  (v_overdue_invoices * 20) +
  (v_events_today * 10) +
  (v_events_3_days * 5)
);

v_urgency_level := CASE
  WHEN v_urgency_score >= 76 THEN 'critical'
  WHEN v_urgency_score >= 51 THEN 'high'
  WHEN v_urgency_score >= 26 THEN 'medium'
  ELSE 'low'
END;
```

#### F. Payment Pattern
```sql
-- Calculate payment metrics
SELECT
  COUNT(*) as total_invoices,
  COUNT(*) FILTER (WHERE paid_at <= due_date) as paid_on_time,
  AVG(EXTRACT(DAY FROM (paid_at - due_date))) as avg_days_to_pay
FROM t_invoices
WHERE contract_id IN (contact's contracts)
  AND status = 'paid'
INTO v_payment_pattern;

v_on_time_rate := (v_paid_on_time::numeric / NULLIF(v_total_invoices, 0)) * 100;
```

#### G. Recent Invoices (for Financials column)
```sql
-- Get 10 most recent invoices
SELECT
  i.id,
  i.invoice_number,
  i.total_amount,
  i.balance,
  i.status,
  i.due_date,
  i.contract_id,
  c.contract_number
FROM t_invoices i
JOIN t_contracts c ON i.contract_id = c.id
WHERE c.tenant_id = p_tenant_id
  AND (c.buyer_id = p_contact_id OR c.seller_id = p_contact_id)
  AND i.is_active = true
ORDER BY i.created_at DESC
LIMIT 10;
```

---

### 3. TypeScript Types
**File**: `contractnest-ui/src/types/contactCockpit.ts`

**Enhanced Interface**:
```typescript
export interface ContactCockpitData {
  contact_id: string;

  contracts: {
    total: number;
    by_status: Record<string, number>;
    by_role: {
      as_client: number;
      as_vendor: number;
      as_partner: number;
    };
    contracts: CockpitContract[];
  };

  events: {
    total: number;
    completed: number;
    overdue: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
  };

  overdue_events: CockpitEvent[];
  upcoming_events: CockpitEvent[];

  ltv: number;
  outstanding: number;  // Now actually calculated
  health_score: number;

  // NEW FIELDS
  urgency_score: number;        // 0-100
  urgency_level: 'low' | 'medium' | 'high' | 'critical';

  payment_pattern: {
    total_invoices: number;
    paid_on_time: number;
    on_time_rate: number;       // percentage
    avg_days_to_pay: number;
  };

  invoices: CockpitInvoice[];   // Recent invoices for Financials

  days_ahead: number;
}

export interface CockpitContract {
  id: string;
  contract_number: string;
  name: string;
  status: string;
  grand_total: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;

  // NEW FIELDS
  contact_role: 'client' | 'vendor' | 'partner';
  cnak: string | null;          // global_access_id
  cnak_status: 'not_configured' | 'pending' | 'connected';
  claimed_at: string | null;
}

export interface CockpitInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  balance: number;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  contract_id: string;
  contract_number: string;
}
```

---

## Questions to Answer Before Coding

### Q1: Multi-role Contract Fetch
Should I fetch contracts where contact is:
- `buyer_id = contact_id` (as client - they buy from us)
- `seller_id = contact_id` OR `seller_contact_id = contact_id` (as vendor - they sell to us)
- Both?

**Suggested Answer**: Both - show complete relationship

### Q2: CNAK Status Logic
Is this correct?
- `not_configured`: No `global_access_id` on contract
- `pending`: Has `global_access_id` but no `claimed_at` in `t_contract_access`
- `connected`: Has `claimed_at` in `t_contract_access`

**Needs Confirmation**: Yes/No

### Q3: Invoice Limit
How many recent invoices for Financials column?

**Suggested**: 10 most recent (all statuses)

---

## Data Flow After Implementation

```
┌──────────────────┐     ┌─────────────────────────┐     ┌──────────────────────────────┐
│ UI Component     │     │ API Controller          │     │ Edge Function                │
│ useContactCockpit│ ──► │ getContactCockpit       │ ──► │ contracts/index.ts           │
│                  │     │ contactController.ts    │     │ action: 'cockpit_summary'    │
└──────────────────┘     └─────────────────────────┘     └──────────────────────────────┘
                                                                      │
                                                                      ▼
                                                         ┌──────────────────────────────┐
                                                         │ Supabase RPC                 │
                                                         │ get_contact_cockpit_summary  │
                                                         │ (enhanced)                   │
                                                         └──────────────────────────────┘
                                                                      │
                                                                      ▼
                                                         ┌──────────────────────────────┐
                                                         │ Returns:                     │
                                                         │ - contracts + CNAK status    │
                                                         │ - events + urgency           │
                                                         │ - invoices                   │
                                                         │ - payment pattern            │
                                                         │ - actual outstanding         │
                                                         └──────────────────────────────┘
```

---

## Implementation Checklist

When starting new session:

- [ ] Answer the 3 questions above
- [ ] Read current `015_contact_cockpit_summary_rpc.sql`
- [ ] Read current `contracts/index.ts` Edge Function
- [ ] Read current `contactCockpit.ts` types
- [ ] Implement Edge Function handler
- [ ] Implement enhanced RPC
- [ ] Update TypeScript types
- [ ] Test via API call
- [ ] Provide Phase 1 copy commands

---

## Key File Paths

```
contractnest-edge/supabase/functions/contracts/index.ts
contractnest-edge/supabase/migrations/contracts/015_contact_cockpit_summary_rpc.sql
contractnest-ui/src/types/contactCockpit.ts
contractnest-ui/src/hooks/queries/useContactCockpit.ts
contractnest-api/src/controllers/contactController.ts
```

---

## Communication Options (Part 3 Reference)

For ActionIsland Email/WhatsApp buttons:
- **Option A selected**: Use native app links (`mailto:` / `wa.me`)
- Hide on Desktop, show on Mobile (responsive CSS)
- No mobile app until post-MVP

---

## After All 3 Parts Complete

Run orphan code/file cleanup:
1. Check MANUAL_COPY_FILES for unused feature branches
2. Check for deprecated components
3. Remove unused types/interfaces
4. Clean up old migration files if any

---

**End of Handover Document**
