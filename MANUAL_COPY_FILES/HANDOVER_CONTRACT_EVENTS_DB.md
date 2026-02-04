# Contract Events — DB Layer & API Handover

**Previous branch:** `claude/init-submodules-setup-VMewK`
**Current branch:** `claude/init-submodules-setup-Tff3Y`
**Date:** February 2025

---

## WHAT EXISTS (Built in VMewK)

### Frontend — Events Preview (contractnest-ui)

The contract wizard already has a working **Events Preview Step** that:

1. **Computes events client-side** from contract service blocks — both `service` and `billing` events
2. **Displays a vertical timeline** with split layout (left/right alternating cards)
3. **User can adjust dates** (drag or edit scheduled dates before submitting)
4. **White card styling**, secondary dates, VaNi branding at top, unlimited cards

**Key files on VMewK branch (contractnest-ui):**

| File | Purpose |
|------|---------|
| `src/components/contracts/ContractWizard/index.tsx` | Main wizard — includes EventsPreviewStep |
| `src/components/contracts/ContractWizard/steps/EventsPreviewStep.tsx` | ~812 lines — computes + renders timeline |
| `src/utils/service-contracts/contractEvents.ts` | ~395 lines — pure computation: generates event objects from block config |
| `src/pages/contracts/detail/index.tsx` | Contract detail page — has Document tab, will get Timeline tab |

### Other Features Built in VMewK

- Service cycle interval (per-block recurring schedule)
- Service block drawer (card-per-wizard-step layout)
- Document tab on contract detail
- Professional Invoice view with PDF download/print
- Contract wizard fixes (tax breakup, payment dialog, button styles)

---

## WHAT NEEDS TO BE BUILT

### Goal

Persist the frontend-computed events to the database so they survive page refresh, power the Timeline tab from real data, and support status tracking + assignment.

### Architecture Note (CRITICAL)

The contractnest-api does **NOT** query the database directly. The flow is:

```
Frontend → contractnest-api (Express) → contractnest-edge (Supabase Edge Functions) → PostgreSQL
```

- **contractnest-api**: Routes, controllers, services (HTTP client to Edge via Axios + HMAC signing)
- **contractnest-edge**: Supabase Edge Functions that make actual DB queries (RPC calls, direct SQL)
- **RLS policies** enforce tenant isolation at the DB layer
- **HMAC-SHA256 signing** authenticates API → Edge communication (`x-internal-signature` header)

So building the "API layer" actually means work across **both** contractnest-api AND contractnest-edge.

---

## PHASE A: Database Migration (SQL)

### Table 1: `contract_events`

```sql
CREATE TABLE IF NOT EXISTS "public"."contract_events" (
    "id"                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "tenant_id"           UUID NOT NULL,
    "contract_id"         UUID NOT NULL,
    "block_id"            TEXT,
    "block_name"          TEXT,
    "category_id"         TEXT,
    "event_type"          TEXT NOT NULL,           -- Use constants (see below)
    "billing_sub_type"    TEXT,                     -- 'upfront' | 'emi' | 'on_completion' | 'recurring' | null
    "billing_cycle_label" TEXT,                     -- "EMI 2/5", "Monthly 3/6", etc.
    "sequence_number"     INT,                      -- 1-based
    "total_occurrences"   INT,                      -- Total in series
    "scheduled_date"      TIMESTAMPTZ NOT NULL,     -- User-adjusted date (from preview)
    "original_date"       TIMESTAMPTZ NOT NULL,     -- System-computed (immutable)
    "amount"              DECIMAL(12,2),            -- Billing events only
    "currency"            TEXT,                      -- Currency code
    "status"              TEXT NOT NULL DEFAULT 'scheduled',  -- Use constants (see below)
    "assigned_to"         UUID,                     -- FK to user/team member
    "assigned_to_name"    TEXT,                     -- Denormalized for display
    "notes"               TEXT,
    "created_at"          TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at"          TIMESTAMPTZ DEFAULT now() NOT NULL,
    "created_by"          UUID
);

-- Indexes
CREATE INDEX idx_contract_events_contract ON public.contract_events(contract_id);
CREATE INDEX idx_contract_events_contract_type ON public.contract_events(contract_id, event_type);
CREATE INDEX idx_contract_events_contract_date ON public.contract_events(contract_id, scheduled_date);
CREATE INDEX idx_contract_events_tenant_status ON public.contract_events(tenant_id, status);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_contract_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contract_events_updated_at
    BEFORE UPDATE ON public.contract_events
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_events_updated_at();
```

### Table 2: `contract_event_audit`

```sql
CREATE TABLE IF NOT EXISTS "public"."contract_event_audit" (
    "id"              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "event_id"        UUID NOT NULL REFERENCES public.contract_events(id) ON DELETE CASCADE,
    "field_changed"   TEXT NOT NULL,     -- 'status', 'scheduled_date', 'assigned_to', etc.
    "old_value"       TEXT,
    "new_value"       TEXT,
    "changed_by"      UUID,
    "changed_by_name" TEXT,              -- Denormalized
    "changed_at"      TIMESTAMPTZ DEFAULT now() NOT NULL,
    "reason"          TEXT               -- Optional note
);

CREATE INDEX idx_contract_event_audit_event ON public.contract_event_audit(event_id);
CREATE INDEX idx_contract_event_audit_event_date ON public.contract_event_audit(event_id, changed_at);
```

### RLS Policies (follow existing pattern)

```sql
-- Enable RLS
ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_event_audit ENABLE ROW LEVEL SECURITY;

-- Tenant isolation for contract_events
CREATE POLICY "tenant_isolation_contract_events" ON public.contract_events
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.t_user_profiles WHERE user_id = auth.uid()
        UNION
        SELECT tenant_id FROM public.t_user_tenants WHERE user_id = auth.uid()
    )
);

-- Service role full access (for Edge Functions)
CREATE POLICY "service_role_contract_events" ON public.contract_events
FOR ALL
USING (auth.role() = 'service_role');

-- Audit: access through parent event
CREATE POLICY "tenant_isolation_contract_event_audit" ON public.contract_event_audit
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.contract_events ce
        WHERE ce.id = contract_event_audit.event_id
        AND ce.tenant_id IN (
            SELECT tenant_id FROM public.t_user_profiles WHERE user_id = auth.uid()
            UNION
            SELECT tenant_id FROM public.t_user_tenants WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "service_role_contract_event_audit" ON public.contract_event_audit
FOR ALL
USING (auth.role() = 'service_role');
```

---

## STATUS CONSTANTS (Important — user requested this)

Statuses must live in a **constants file**, not hardcoded strings. This is because VaNi AI will add its own statuses in the future.

### Planned constants structure:

```typescript
// src/constants/contractEventConstants.ts (or similar)

// --- Event Types ---
export const EVENT_TYPES = {
  SERVICE: 'service',
  BILLING: 'billing',
} as const;

// --- Billing Sub-Types ---
export const BILLING_SUB_TYPES = {
  UPFRONT: 'upfront',
  EMI: 'emi',
  ON_COMPLETION: 'on_completion',
  RECURRING: 'recurring',
} as const;

// --- Event Statuses (base) ---
export const EVENT_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  OVERDUE: 'overdue',
} as const;

// --- VaNi AI Statuses (future — placeholder) ---
// These will be added when VaNi AI is activated:
// SCHEDULED_BY_VANI: 'scheduled_by_vani'
// ESCALATED: 'escalated'
// VANI_REVIEW: 'vani_review'
// AUTO_COMPLETED: 'auto_completed'
// ... more TBD in VaNi session

// --- Status Transitions (for validation) ---
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  [EVENT_STATUS.SCHEDULED]: [EVENT_STATUS.IN_PROGRESS, EVENT_STATUS.CANCELLED],
  [EVENT_STATUS.IN_PROGRESS]: [EVENT_STATUS.COMPLETED, EVENT_STATUS.CANCELLED, EVENT_STATUS.OVERDUE],
  [EVENT_STATUS.OVERDUE]: [EVENT_STATUS.IN_PROGRESS, EVENT_STATUS.COMPLETED, EVENT_STATUS.CANCELLED],
  [EVENT_STATUS.COMPLETED]: [],     // terminal
  [EVENT_STATUS.CANCELLED]: [],     // terminal
};
```

This constants file should exist in **both** contractnest-api and contractnest-ui (or a shared package if one exists). The DB column stays `TEXT` so new VaNi statuses can be added without migrations.

---

## PHASE B: API Routes (contractnest-api + contractnest-edge)

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/contracts/:id/events` | Bulk-insert events on contract creation |
| `GET` | `/contracts/:id/events` | Fetch all events (powers Timeline tab) |
| `PATCH` | `/contracts/:id/events/:eventId` | Update status, date, or assignment |
| `GET` | `/contracts/:id/events/summary` | Summary stats for dashboard |

### What needs to be created per endpoint:

**contractnest-api (Express layer):**
- `src/routes/contractEventRoutes.ts` — route definitions
- `src/controllers/contractEventController.ts` — request handling
- `src/services/contractEventService.ts` — HTTP client to Edge Function (Axios + HMAC)
- `src/validators/contractEventValidators.ts` — express-validator rules
- `src/types/contractEvent.dto.ts` — TypeScript types/interfaces
- `src/constants/contractEventConstants.ts` — status/type constants
- Wire routes into `src/index.ts`

**contractnest-edge (Supabase Edge Functions):**
- `supabase/functions/contract-events/index.ts` — Edge Function handler
- Handles: bulk insert (with transaction), list with filters, single update (with audit log), summary aggregation
- Uses service_role client for DB operations
- Validates HMAC signature from API layer

### Flow on contract creation:

```
Wizard Submit
    │
    ├──► POST /contracts (existing — creates contract row)
    │
    └──► POST /contracts/:id/events
              │
              ├── API validates request
              ├── API signs + forwards to Edge Function
              ├── Edge Function bulk-inserts into contract_events (transaction)
              ├── Edge Function creates initial audit rows (status='scheduled')
              └── Returns success + event IDs
```

---

## PHASE C: Wire Wizard Submit (contractnest-ui)

- After contract creation succeeds, POST computed events to `/contracts/:id/events`
- Events come from `EventsPreviewStep` (already computed on frontend)
- Include any user date adjustments (scheduled_date vs original_date)
- Handle loading state + error toast on failure

---

## PHASE D: Timeline Tab (contractnest-ui)

- Contract detail page gets a "Timeline" tab
- Reads from `GET /contracts/:id/events` instead of mock/empty
- Groups events by date, same visual as Events Preview but read-only + status badges
- Status update via PATCH (dropdown or button)
- Assignment via PATCH

---

## EXISTING CODEBASE PATTERNS TO FOLLOW

### Route registration (src/index.ts):
```typescript
import contractEventRoutes from './routes/contractEventRoutes';
app.use('/api/contracts', contractEventRoutes);
```

### Controller pattern:
- Class-based, instantiates service in constructor
- Uses `validationResult(req)` from express-validator
- Extracts `tenantId` from `req.headers['x-tenant-id']`
- Extracts `environment` from `req.headers['x-environment']`
- Extracts JWT from `req.headers.authorization`

### Service pattern:
- Constructs Edge Function URL from `process.env.SUPABASE_URL + '/functions/v1/contract-events'`
- HMAC signs request body with `process.env.INTERNAL_SIGNING_SECRET`
- Passes headers: Authorization, x-tenant-id, x-environment, x-internal-signature
- Axios with 30s timeout

### Error responses:
```typescript
// Success
res.status(200).json({ success: true, data: result });

// Error
res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '...' } });
```

### RLS pattern:
- Tenant isolation via `t_user_profiles.user_id = auth.uid()` lookup
- Service role bypass for Edge Functions
- Audit tables accessed through parent FK

---

## FILES REFERENCE (from VMewK branch)

To see the frontend events computation logic:
```bash
git show origin/claude/init-submodules-setup-VMewK:MANUAL_COPY_FILES/contract-events-preview/contractnest-ui/src/utils/service-contracts/contractEvents.ts
git show origin/claude/init-submodules-setup-VMewK:MANUAL_COPY_FILES/contract-events-preview/contractnest-ui/src/components/contracts/ContractWizard/steps/EventsPreviewStep.tsx
```

---

## IMPLEMENTATION ORDER FOR NEXT SESSION

```
1. Create constants file (contractEventConstants.ts) — both API and UI
2. Phase A — Run migration SQL in Supabase (create tables + indexes + RLS)
3. Phase B — Build API layer:
   a. Types/DTOs
   b. Validators
   c. Edge Function (contract-events)
   d. Service (HTTP client)
   e. Controller
   f. Routes
   g. Wire into index.ts
4. Phase C — Wire wizard submit to POST endpoint
5. Phase D — Timeline tab reads from GET endpoint
```

---

## QUESTIONS TO RESOLVE IN NEXT SESSION

1. **Edge Function naming**: `contract-events` or nest under existing `contracts` function?
2. **Bulk insert limit**: Max events per contract? (suggest 500)
3. **VaNi AI statuses**: Exact list when VaNi is activated (deferred — separate session)
4. **Summary endpoint shape**: What stats does the dashboard need? (total, by status, by type, overdue count?)
