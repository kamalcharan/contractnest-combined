# ContractNest — Session Handover: Cycle 4 Onward

> **Date:** 2026-02-02
> **Branch:** `claude/init-submodules-docs-ie8vH`
> **Last Commit:** `8fe56f7` — feat: Cycle 3b — pre-creation payment dialog for auto-accept contracts

---

## 1. WHAT WAS DONE (Cycles 1–3 Complete)

### Cycle 1: Review & Send — 2-Column Layout (UI Only)
- Restructured `ReviewSendStep.tsx` to 65/35 two-column layout
- Left: paper canvas with contract summary
- Right: acceptance-specific panel with workflow visuals, notification preview, pre-checks
- "Create Contract" button in right panel

### Cycle 2: CNAK Generation + Success Screen
- DB: `global_access_id` column on contracts table
- Edge function: CNAK generated on contract creation (`CNAK-XXXXXX`)
- Success screen per acceptance type:
  - **Payment:** Contract ID, CNAK, customer details, "invoice will be sent" note
  - **Signoff:** 2-path workflow visual (accept/reject), CNAK, "awaiting sign-off" status
  - **Auto:** immediate active, CNAK, payment recording

### Cycle 3a: Invoice Generation
- SQL migration `005_invoices_receipts.sql` — invoice + receipt tables
- SQL migration `006_invoice_rpc_functions.sql` — `generate_contract_invoices` RPC
  - **Key decision:** Always 1 invoice per contract for `grand_total` regardless of payment_mode
  - EMI tracking via `emi_total` on invoice and `emi_sequence` on receipts
- Defensive `BEGIN/EXCEPTION` wrapping for sequence generation
- Fixed `sequence_code NOT NULL` bug (was passing wrong variable name)
- Financial Health UI stub (stats cards)

### Cycle 3b: Payment Recording (Full Stack)
- SQL migration `007_invoice_payment_rpc.sql` — `record_invoice_payment` RPC
- Edge function routes: `GET invoices`, `POST record-payment` in `contracts/index.ts`
- Express API: `contractService.ts` (`getContractInvoices`, `recordPayment`), controller, routes
- UI types: `RecordPaymentPayload`, `RecordPaymentResponse`, `PaymentMethod`
- UI hook: `useRecordPayment` mutation in `useInvoiceQueries.ts`
- `RecordPaymentDialog.tsx` — self-contained component (fetches invoice internally)

### Cycle 3b Final: Pre-Creation Payment Dialog (Redesign)
**This was a user-requested flow change.** Original flow showed a "Record Payment" button on the success screen; user wanted payment collected BEFORE contract creation.

**New flow (current implementation):**
1. User clicks "Create Contract" on Review step with auto-accept
2. Pre-payment dialog appears with form fields (amount, method, date, reference, notes, EMI selector)
3. Three options:
   - **"Record Payment & Create Contract"** → sequential: create contract → fetch invoice → record payment → success with receipt
   - **"Skip — Create Without Payment"** → create contract → success without receipt
   - **"Go back to review"** → dismiss dialog, return to review step
4. Processing overlay shows step-by-step progress
5. Graceful fallback: if contract created but payment fails, success screen still shows + warning toast

---

## 2. WHAT IS PENDING (Planned Cycles)

### Cycle 4: Sign-off — Public Contract View Page
- New public route: `/contract/review?cnak=CNAK-XXXXXX&secret=XXXXX`
- Code generation (`access_code` + `secret_code`) following existing invite pattern
- Edge function for public contract validation
- Read-only contract view (unauthenticated)
- Accept/reject UI
- New user registration flow (same as invite)

### Cycle 5: Payment Flow — Invoice Trigger + Status Transitions
- **Partially done:** Invoice generation + payment recording already built
- **Remaining:** Email/WhatsApp notification delivery (MSG91 + JTD)
- Status transition automation: pending → active on payment confirmation
- Payment gateway integration (online) + offline recording

### Cycle 6: Sign-off Rejection → Edit → Resend Loop
- Client rejects → status back to editable
- Seller edits contract → resends
- Version tracking
- Rejection reason capture

---

## 3. KEY ARCHITECTURE & TECHNICAL DECISIONS

### Invoice/Receipt Accounting Model
- **1 contract = 1 invoice** (always, regardless of payment_mode)
- Invoice represents the **accounts receivable claim** for `grand_total`
- **Multiple receipts** per invoice = collection events
- EMI: `emi_total` on invoice, `emi_sequence` on each receipt
- Invoice statuses: `unpaid` → `partially_paid` → `paid`

### Data Flow: Create Contract
```
UI (ContractWizard) → createContract mutation
  → Express API POST /api/contracts
    → Edge function handleCreate()
      → Supabase RPC create_full_contract(p_payload)
        → Returns { id, contract_number, global_access_id, grand_total, ... }
      → Also auto-calls generate_contract_invoices internally
    → Returns jsonResponse(data, ...) — NO re-wrapping
  → Express passes through
→ UI unwraps: response.data?.data || response.data
→ Gets { id, contract_number, global_access_id, grand_total, ... }
```

### Data Flow: Pre-Creation Payment
```
1. handleCreateWithPayment() in ContractWizard
2. createContract(request) → gets contractResult with id
3. api.get(API_ENDPOINTS.CONTRACTS.INVOICES(contractId)) → gets invoice[0]
4. api.post(API_ENDPOINTS.CONTRACTS.RECORD_PAYMENT(contractId), payload) → gets receipt
5. Success screen with receipt data
```

### Acceptance Method Mapping
| Wizard Value | API Value | DB Value |
|-------------|-----------|----------|
| `payment` | `manual` | `manual` |
| `signoff` | `digital_signature` | `digital_signature` |
| `auto` | `auto` | `auto` |

### Edge Function Passthrough
`handleCreate` at line ~305 in `contracts/index.ts`:
```typescript
return jsonResponse(data, data?.success ? 201 : 400);
```
Passes RPC result directly — no re-wrapping. UI mutation correctly unwraps with `response.data?.data || response.data`.

---

## 4. FILE REFERENCE MAP

### Edge Functions & Migrations
| File | Purpose |
|------|---------|
| `contractnest-edge/supabase/migrations/contracts/002_contract_rpc_functions.sql` | Core contract RPCs (create, update, list) |
| `contractnest-edge/supabase/migrations/contracts/003_contract_rpc_functions_batch2.sql` | Additional RPCs (status, stats) |
| `contractnest-edge/supabase/migrations/contracts/004_contract_access_table.sql` | Access control table |
| `contractnest-edge/supabase/migrations/contracts/005_invoices_receipts.sql` | Invoice + receipt tables |
| `contractnest-edge/supabase/migrations/contracts/006_invoice_rpc_functions.sql` | `generate_contract_invoices` RPC |
| `contractnest-edge/supabase/migrations/contracts/007_invoice_payment_rpc.sql` | `record_invoice_payment` RPC |
| `contractnest-edge/supabase/functions/contracts/index.ts` | Edge function router (all contract routes) |

### Express API (contractnest-api)
| File | Purpose |
|------|---------|
| `src/routes/contractRoutes.ts` | Route definitions: `GET /:id/invoices`, `POST /:id/invoices/record-payment` |
| `src/controllers/contractController.ts` | Handler methods |
| `src/services/contractService.ts` | `getContractInvoices()`, `recordPayment()` |
| `src/types/contractTypes.ts` | Backend TypeScript types |
| `src/validators/contractValidators.ts` | Input validation |

### UI (contractnest-ui)
| File | Purpose |
|------|---------|
| `src/components/contracts/ContractWizard/index.tsx` | **Main wizard** — 1265 lines, includes pre-payment dialog, success screen |
| `src/components/contracts/ContractWizard/FloatingActionIsland.tsx` | Bottom nav bar with Back/Next/Create |
| `src/components/contracts/ContractWizard/steps/ReviewSendStep.tsx` | 2-column review layout |
| `src/components/contracts/ContractWizard/steps/AcceptanceMethodStep.tsx` | Payment/Signoff/Auto selection |
| `src/components/contracts/ContractWizard/steps/BillingViewStep.tsx` | Tax, payment mode, EMI config |
| `src/components/contracts/RecordPaymentDialog.tsx` | **Standalone** payment dialog (still used for contract detail page) |
| `src/hooks/queries/useContractQueries.ts` | `useContractOperations` → `createContract` mutation |
| `src/hooks/queries/useInvoiceQueries.ts` | `useContractInvoices` query + `useRecordPayment` mutation |
| `src/types/contracts.ts` | All TS types: `PaymentMethod`, `Invoice`, `RecordPaymentPayload`, `RecordPaymentResponse` |
| `src/services/serviceURLs.ts` | `API_ENDPOINTS.CONTRACTS.*` (INVOICES, RECORD_PAYMENT, etc.) |
| `src/services/api.ts` | Axios instance with auth interceptors |

---

## 5. LESSONS LEARNED & GOTCHAS

### Bug: "Payment recording not triggered"
- **Root cause:** Original `RecordPaymentDialog` was rendered on success screen with `disabled={!invoice}`. The button depended on `useContractInvoices` pre-fetching invoice data. If the RPC wasn't deployed or API failed, the button stayed permanently disabled.
- **Fix 1:** Made `RecordPaymentDialog` self-contained (fetches invoice internally).
- **Fix 2 (final):** Redesigned to pre-creation flow — user was confused by post-creation button. The pre-creation dialog is more intuitive.

### Bug: sequence_code NOT NULL
- Invoice generation RPC was passing wrong variable name to sequence generator.
- Fixed by ensuring `p_sequence_code` matches the parameter name in the function signature.

### Hook Limitation for Sequential Flows
- React Query hooks (`useRecordPayment`) need a `contractId` at hook call time.
- For the pre-creation flow, contractId doesn't exist yet when the dialog renders.
- **Solution:** Use `api.get()` and `api.post()` directly inside `handleCreateWithPayment` for the sequential create → fetch invoice → record payment flow.

### Edge Function Data Passthrough
- `handleCreate` does `return jsonResponse(data, ...)` — passes RPC result directly.
- UI correctly unwraps with `response.data?.data || response.data`.
- Don't re-wrap in the edge function or you'll get double-nested responses.

### Acceptance Method Value
- The wizard uses `'auto'` (exact string) for auto-accept.
- The condition `wizardState.acceptanceMethod === 'auto'` must match exactly.
- AcceptanceMethodStep sets this value correctly.

### Toast & Loader Patterns
- **Toast:** `useVaNiToast()` → `addToast({ type: 'success'|'error'|'warning', title, message })`
- **Theme:** `useTheme()` → `isDarkMode`, `currentTheme`, `colors` object with `utility.*`, `brand.*`, `semantic.*`
- **Inline styles only** — the wizard uses ThemeContext inline styles, not Tailwind color classes

### MANUAL_COPY_FILES Workflow
- All code changes go into `MANUAL_COPY_FILES/[feature-name]/` mirroring submodule structure
- Include `COPY_INSTRUCTIONS.txt` with PowerShell copy commands
- User tests locally, confirms working, then gets Phase 2 (commit/merge) commands
- **Never provide merge commands until user confirms testing passed**

---

## 6. EXISTING PATTERNS TO REUSE (for Cycle 4)

### Invite Pattern (for public contract link)
The invite system already has:
- Code generation (access_code + secret_code)
- Public validation endpoint
- Token-based unauthenticated access
- User registration flow
Look in: `contractnest-api/src/` for invite-related files, and `contractnest-ui/src/` for invite acceptance pages.

### API Endpoint Registration
1. Add endpoint to `serviceURLs.ts` under `API_ENDPOINTS.CONTRACTS`
2. Add Express route in `contractRoutes.ts`
3. Add controller method in `contractController.ts`
4. Add service method in `contractService.ts`
5. Add edge function handler in `contracts/index.ts`
6. Add SQL migration if DB changes needed

---

## 7. COMMIT HISTORY (this branch)

```
8fe56f7 feat: Cycle 3b — pre-creation payment dialog for auto-accept contracts
3eaf0d8 chore: update submodule refs — RecordPaymentDialog fix
b0eaf7b fix: make RecordPaymentDialog self-contained — fetch invoice internally
8903ec0 chore: update submodule refs — Cycle 3b payment recording
1a90c16 feat: Cycle 3b — payment recording + RecordPaymentDialog + MANUAL_COPY_FILES
8ef0759 fix: sequence_code NOT NULL root cause + MANUAL_COPY_FILES
5285659 fix: defensive invoice generation + v_tenant_id fix + MANUAL_COPY_FILES
988c13a fix: v_tenant_id → p_tenant_id in get_contracts_list + MANUAL_COPY_FILES
584823c feat: Cycle 3a — invoice generation + Financial Health UI + MANUAL_COPY_FILES
15418e7 feat: Cycle 2 — CNAK generation + per-acceptance success screen + MANUAL_COPY_FILES
f0ea877 feat: review & send 2-column acceptance panel + MANUAL_COPY_FILES
```

---

## 8. NEXT SESSION START CHECKLIST

```bash
# 1. Read this handover
# 2. Initialize submodules
cd /path/to/contractnest-combined
git submodule update --init --recursive

# 3. Verify branch
git branch  # Should be on claude/init-submodules-docs-ie8vH or create new

# 4. Read CLAUDE.md for workflow rules
# 5. Read the cycle plan (user will provide or see Section 2 above)
# 6. Ask user: "Ready to start Cycle 4?"
```

---

**Maintained By:** Claude Code Session
**Next Cycle:** Cycle 4 — Sign-off Public Contract View Page
