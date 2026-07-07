# Stage 0 — The Runtime Loop (contract-event scanner)

**Date:** 2026-07-07 · **Status:** BUILT — awaiting owner apply + test
**POA:** POA-OPERATIONS-READINESS-2026-07-07.md §1 (Stage 0)
**Batch:** `MANUAL_COPY_FILES/stage0-runtime-loop/`
**Submodules touched:** contractnest-edge (SQL migrations only), ClaudeDocumentation (this doc). **No API/UI code — backend only, per POA.**

---

## 1. What it does

One Postgres function, `run_contract_event_scanner()`, run by pg_cron every 15 minutes, animates the whole pipeline:

| # | Sweep | Effect |
|---|-------|--------|
| 1 | past `scheduled_date`, status `scheduled`/`due` | → **`overdue`** (+ audit row, version bump) |
| 2 | `scheduled` inside lead window (7 days service / 7 days billing, today included) | → **`due`** (+ audit row, version bump) |
| 3 | **service** events at `due`, never dispatched | enqueue **`service_reminder`** JTD to the buyer (email → SMS fallback). Inserting into `n_jtd` IS the dispatch — `trg_jtd_enqueue` → PGMQ → jtd-worker → provider. |
| 4 | **billing** events at `due`/`overdue`, no invoice | **link** to an existing matching contract invoice, or create a **`draft`** invoice (manual mode — seller approves/sends in Stage 1) |
| 5 | open invoices (`unpaid`/`partially_paid`) with `due_date` ≤ today+3 | enqueue **one** `payment_due` JTD to the buyer (email). One-shot; the dunning ladder is VaNi-stage. |

Everything is scoped to `is_active` rows on **active** contracts. Draft invoices never enter reminder flows. The historical event backlog (Mar–Jul 2026) flips to `overdue` for visibility but is deliberately **not** spammed with reminders — reminders fire only for events *entering* `due`.

## 2. Design decisions (and why)

- **Pure SQL + pg_cron, no edge function.** Matches the existing ops pattern (`invoke_jtd_worker`, `auto-expire-contracts`) minus the HTTP hop. Transactional, testable with one statement, zero deploy steps.
- **New `due` status, seeded properly.** `m_event_status_config` had no `due` — added for `service` + `billing` at both system scope and tenant scope (via existing `seed_event_status_defaults`), with transitions, display_order re-slotted after `scheduled`. The hardcoded transition CASE in `update_contract_event` (contracts/013) was extended so the UI can move a `due` event to `in_progress`/`cancelled` — otherwise Stage 2's Service Schedule rewiring would hit `INVALID_TRANSITION`.
- **Link-or-draft for billing events.** ⚠️ **Audit correction:** invoices are NOT all manual. `generate_contract_invoices` (contracts/006) auto-creates ONE lump-sum invoice per contract at activation (called from `create_contract_transaction`, `respond_to_contract`, `update_contract_status`). All 8 events-bearing contracts already have one. So the scanner first tries to **link** the billing event to an existing contract-level invoice with the **same total_amount** (upfront case — the lump invoice IS that event's invoice), and only **drafts** a new invoice when nothing matches (EMI/recurring installments, or contracts without an activation invoice).
  **Open item for Stage 1:** for EMI/recurring contracts, the activation lump-sum AND per-event drafts will coexist (drafts are proposals — status `draft`, `issued_at` NULL, excluded from reminder/AR flows until approved). Stage 1 must decide: suppress lump generation for emi/recurring payment modes, or keep it and have the seller cancel one side. Flagged, not changed — activation flow untouched.
- **Recipient resolution.** Live data: `buyer_email`/`buyer_phone` are NULL on every contract. Fallback chain: contract denormalized fields → buyer contact's `t_contact_channels` (`email` first; then `mobile`, then `whatsapp` number used as SMS). No contact ⇒ marked processed (`reminder_dispatched_at` set, `reminder_jtd_id` NULL) + counted `skipped_no_contact` — never rescanned, never silently retried.
- **Templates:** only seeded system templates are used — `service_reminder_email_v1`, `service_reminder_sms_v1`, `payment_due_email_v1`. There is **no** payment_due SMS / service_reminder WhatsApp template yet (known seed gap; add templates before enabling those channels).
- **Idempotency & races:** `pg_try_advisory_xact_lock` (overlapping runs no-op) · `FOR UPDATE OF … SKIP LOCKED` (never blocks user edits) · dispatch-tracking columns (`reminder_dispatched_at`, `invoice_id`, `last_reminder_at`) · partial **unique** index `uq_invoices_contract_event` (double-invoicing impossible even if guards fail) · invoice numbers via the atomic `get_next_formatted_sequence('INVOICE', …)` · `version = version + 1` on every event update (consistent with optimistic concurrency in `update_contract_event`).
- **Error handling:** per-row `BEGIN/EXCEPTION` sub-transactions — one bad row can't kill a sweep; counts + first 5 error samples returned in the JSONB summary (also visible in `cron.job_run_details`).
- **Cron de-dupe:** live jobids 1 & 3 both ran `invoke_jtd_worker()` every minute (audit P5/P6). 005 keeps the lowest jobid, unschedules the rest — converges no matter what the jobs are named.

## 3. Schema changes (001)

`t_contract_events`: `+ reminder_jtd_id UUID → n_jtd`, `+ reminder_dispatched_at TIMESTAMPTZ`, `+ invoice_id UUID → t_invoices`
`t_invoices`: `+ contract_event_id UUID → t_contract_events`, `+ last_reminder_jtd_id UUID → n_jtd`, `+ last_reminder_at TIMESTAMPTZ`
New invoice `status` value in use: **`draft`** (no CHECK constraint exists on status; enforced in code as before).
Indexes: `uq_invoices_contract_event` (unique, partial), `idx_events_scanner_sweep`, `idx_invoices_reminder_scan`.

## 4. Apply order (owner, Supabase SQL editor, project uwyqhzotluikawcboldr)

Run 001 → 002 → 003 → 004 → 005, in order. Each is safe to re-run. 006 is ROLLBACK — do **not** run it unless undoing Stage 0.

## 5. Acceptance tests (POA §1)

> **Pre-verified 2026-07-07:** the entire migration set (001→004) plus a live
> scanner pass was executed against the real DB inside a rolled-back
> transaction. Result: `errors: 0`, `events_marked_due: 6`,
> `events_marked_overdue: 20`, `service_reminders_enqueued: 5`,
> `events_linked_to_existing_invoice: 5`, `draft_invoices_created: 0`,
> `payment_reminders_enqueued: 1`, `skipped_no_contact: 1`. Nothing was
> committed (verified post-rollback). Expect these numbers (±drift) on your
> first real scan.

```sql
-- A. Dry run before cron picks it up (also the smoke test):
SELECT run_contract_event_scanner();
-- expect JSON: events_marked_due / events_marked_overdue > 0 on first run,
-- service_reminders_enqueued / draft or linked invoices, errors = 0

-- B. "An event due tomorrow produces a reminder with zero human action":
--    pick an active contract's service event and move it to tomorrow, then rescan
UPDATE t_contract_events SET scheduled_date = now() + interval '1 day',
       status='scheduled', reminder_jtd_id=NULL, reminder_dispatched_at=NULL,
       version=version+1
WHERE id = '<event-id>';
SELECT run_contract_event_scanner();
SELECT id, status_code, channel_code, recipient_contact, template_key
FROM n_jtd WHERE source_type_code='service_reminder' ORDER BY created_at DESC LIMIT 5;
-- expect: a row, status pending→processing→sent (worker runs every minute);
-- also visible in JTD Admin queue UI

-- C. Billing event → invoice:
SELECT e.id, e.status, e.amount, e.invoice_id, i.invoice_number, i.status AS invoice_status
FROM t_contract_events e LEFT JOIN t_invoices i ON i.id = e.invoice_id
WHERE e.event_type='billing' AND e.is_active ORDER BY e.scheduled_date;
-- expect: due/overdue billing events on active contracts have invoice_id set
-- (linked to the activation invoice where amounts match; 'draft' rows otherwise)

-- D. Idempotency: run it twice —
SELECT run_contract_event_scanner();
-- second run: all counters 0 (or only newly-eligible rows), no duplicates

-- E. Cron health:
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobid;
-- expect ONE invoke_jtd_worker job + contract-event-scanner (*/15)
SELECT status, return_message, start_time FROM cron.job_run_details
WHERE jobid=(SELECT jobid FROM cron.job WHERE jobname='contract-event-scanner')
ORDER BY start_time DESC LIMIT 3;
```

## 6. Ops notes / gotchas

- **Real messages will go out.** Buyer contacts on the test contracts include real-looking emails (`vtech9682@gmail.com`, `info@vikuna.io`) and phones. The 4 unpaid + 2 partially-paid invoices are ALL due (due_date = creation date) → **one payment_due email each** on first scan. If that's unwanted, set `last_reminder_at = now()` on them before applying 005 (cron), or test with `SELECT run_contract_event_scanner()` first and inspect `n_jtd` before the worker sends (rows go `pending` → sent within a minute — to preview without sending, temporarily unschedule the jtd-worker cron).
- **Credits:** JTDs park at `no_credits` if the tenant has no interaction credits; they auto-release on top-up (`release_waiting_jtds`) and expire after 7 days. If nothing sends, check `status_code` in `n_jtd` first.
- **Timezone:** day boundaries use the DB clock (UTC). "Due tomorrow" = UTC-tomorrow. Fine for Stage 0; revisit if tenant-local cutoffs matter.
- Scanner leaves billing events at `due`/`overdue` after invoicing (the richer billing statuses — `invoice_generated`, `sent`, `payment_pending`, `paid` — become meaningful in Stage 1 when approval/send exists).
- Contract detail's invoice list (`get_contract_invoices`) will show `draft` rows with an unknown-status badge and include them in its summary totals until Stage 1 — accepted for Stage 0 (backend-only), noted as a Stage 1 UI task.

## 7. What Stage 1 builds on this

Tenant-level AR/AP aggregation endpoints over `t_invoices` (excluding `draft`), draft **approve/send** action (draft → unpaid + `issued_at`), manual **send reminder** per invoice (reuses `last_reminder_*` columns + `payment_due` JTD), AccountsReceivablePage rewired to real data, and the lump-sum-vs-per-event invoice decision (see §2).
