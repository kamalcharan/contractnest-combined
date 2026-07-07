# Stage 1 — Finance AR/AP (Operations → Finance)

**Date:** 2026-07-07 · **Status:** BUILT — awaiting owner apply + test
**POA:** POA-OPERATIONS-READINESS-2026-07-07.md §2 (Stage 1) · builds on Stage 0 (STAGE0-RUNTIME-LOOP.md)
**Batch:** `MANUAL_COPY_FILES/stage1-finance-ar-ap/`
**Submodules touched:** contractnest-edge (1 migration + 1 NEW edge function `finance` — needs deploy), contractnest-api (4 new files + index.ts), contractnest-ui (3 new files + App.tsx + industryMenus.ts), ClaudeDocumentation.

---

## 1. What it delivers

**Operations → Finance (AR/AP)** — a new sidebar entry at `/ops/finance`, fed by real `t_invoices` data (the vani AccountsReceivable mock page stays parked as reference):

- **Receivables** (seller lens): KPI cards (total outstanding / overdue / due-in-30 / collected this month), **ageing buckets** (1-7 / 8-15 / 16-30 / 30+ days overdue), **who-owes** by buyer, and the invoice worklist with search + status filters.
- **Manual actions** (manual-first per POA):
  - **Approve draft** — scanner-created drafts (Stage 0) become live AR (`draft → unpaid`, `issued_at` set, linked billing event → `invoice_generated`).
  - **Cancel draft** — reuses the existing `cancel_or_writeoff_invoice` RPC.
  - **Send reminder** — enqueues a `payment_due` JTD (email) on demand; repeat sends allowed (the scanner remains one-shot); shows `last reminder <date>` on the row.
  - **Record payment** — unchanged, lives on the contract page (row has an open-contract shortcut).
- **Payables** (buyer lens, read-only): own vendor-contract invoices (`invoice_type='payable'`) + invoices on claimed contracts (`buyer_tenant_id` = me OR active `t_contract_access` grant) — per owner decision #2. Buyers never see sellers' unapproved drafts.
- **Money convention:** every aggregate uses `balance` of `is_active` invoices; `draft` is excluded from all totals/buckets — drafts are proposals, not AR.

## 2. Architecture (mirrors contract-events exactly)

```
UI (react-query hooks) → /api/finance/* (authenticate + x-tenant-id + rate limit)
  → HMAC-signed call → edge function `finance` (x-environment → p_is_live)
    → RPCs: get_tenant_receivables · get_tenant_payables ·
            approve_draft_invoice · send_invoice_reminder ·
            cancel_or_writeoff_invoice (reused)
```

New files:
| Layer | File |
|---|---|
| DB | `contractnest-edge/supabase/migrations/operations-loop/007_stage1_finance_rpcs.sql` |
| Edge | `contractnest-edge/supabase/functions/finance/index.ts` (**deploy required**) |
| API | `src/routes/financeRoutes.ts`, `src/controllers/financeController.ts`, `src/services/financeService.ts`, `src/validators/financeValidators.ts` + registration in `src/index.ts` |
| UI | `src/hooks/queries/useFinanceQueries.ts`, `src/pages/operations/finance/index.tsx` + route in `App.tsx` + menu item in `industryMenus.ts` |

The three registration files (`index.ts`, `App.tsx`, `industryMenus.ts`) are shipped as **full modified copies generated from current main** — pure copy-paste, no hand edits.

## 3. Production checklist

- **Transactions:** each action RPC is a single transaction; `FOR UPDATE` row locks in approve/remind.
- **Race conditions:** approve is guarded by `status='draft'` check under row lock (double-click safe → `INVALID_STATUS` 409); UI disables buttons while a mutation is in flight.
- **Error handling:** RPC-level exception envelopes; edge/API error-code → HTTP status map (`NOT_FOUND`→404, `INVALID_STATUS`→409, `NO_EMAIL_CONTACT`→422…); UI error state with retry.
- **Toasts:** `vaniToast` (the app convention) on every mutation success/failure.
- **Loaders:** `LoadingSpinner` page state, `Loader2` spinners on in-flight action buttons, disabled controls during fetch.
- **tsc verified in this session:** UI = 23 errors (exact baseline), API = 0, and none of the 23 are in new files.

## 4. Apply order (owner)

1. **SQL** (Supabase SQL editor): run `007_stage1_finance_rpcs.sql`.
2. **Edge deploy**: copy `functions/finance/` into contractnest-edge, then
   `supabase functions deploy finance` (same project; uses existing secrets
   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / INTERNAL_SIGNING_SECRET — no new
   secrets, no config.toml entry needed).
3. **API + UI files**: copy per COPY_INSTRUCTIONS, restart API, hard-refresh UI.

## 5. Testing notes / constraints

- ⚠️ **Message-testing constraint (owner, 2026-07-07): +91 9885164233 is the ONLY number allowed to receive test messages.** Stage 1 reminders are **email-only** (no SMS path), so this is naturally satisfied; keep it in mind for Stages 2/3.
- "Send reminder" requires the buyer contact to have an **email** channel (else 422 with a clear message) and the **MSG91 `payment_due` template to be approved** + `provider_template_id` set (Stage 0 follow-up). Until then the JTD will show `failed` in JTD Admin — the queueing itself still proves the flow.
- Payables view will be empty unless a contract has been claimed by another tenant (or you own vendor-type contracts).

## 6. Open item carried from Stage 0 (decision needed later)

Lump-sum activation invoice vs per-event drafts for EMI/recurring contracts (see STAGE0-RUNTIME-LOOP.md §2). The Finance page makes both visible, so the duplication (if any) is now easy to spot and cancel manually. Recommend deciding in Stage 2 window: likely "skip lump generation when `payment_mode` = emi/recurring".

## 7. What Stage 2 builds on this

Service Schedule + Business Events rewired to real contract events, ticket creation + evidence, smart-forms creation-time glue, and the two-lens contract detail (Service | Finance) — the Finance lens reuses this stage's per-contract data.
