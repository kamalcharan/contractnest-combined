# POA — Operations Readiness ("make the product usable by customers")

**Date:** 2026-07-07 · **Status:** PLAN — approved audit, staged execution below
**Companion:** the founding vision deck (uploaded PDF: Giver/Receiver, events+SLA,
receivables/payables, reminders, digital service records) · POA-AGENTIC-CONTRACTS.md
(Phase 2/3 definitions) · ux refs in `ContractNest Agent/ux/` (01 cockpit, 04 AR/AP,
05 service lifecycle, 08 appointments)

---

## 0. Audit verdict (evidence-checked, 2026-07-07)

The product is two disconnected halves:

- **Backend engine — REAL and mostly complete.** Contract→events materialization
  works (70 live `t_contract_events`); JTD framework complete and running
  (n_jtd + PGMQ + worker + email/SMS/WhatsApp/in-app handlers); `t_invoices` is a
  real populated AR model (invoice_type='receivable', balance, due_date,
  paid/partial/unpaid) with per-contract APIs (list / record-payment / cancel);
  full service-tickets + evidence API exists (`serviceExecutionRoutes`, 0 usage);
  smart-forms CRUD complete (templates/selections/mappings/submissions +
  block.form_template_id + contract evidence columns).
- **Frontend surfaces — polished but 100% MOCK.** Every `/vani` module page
  (AccountsReceivable, ServiceSchedule, BusinessEvents, Dashboard, Jobs,
  Analytics, Webhooks, ProcessRules, Chat, Channels) is fed by one
  `src/vani/utils/fakeData.ts` (1,218 lines); zero API calls in the module.
  Appointments page is a stub. Ops Cockpit is REAL except the VaNi sidebar
  ("Coming Soon") and RFQ tracker. JTD Admin (4 pages) is REAL but cross-tenant
  (3 of 4 RPCs have no tenant param; admin gate is UI-only + hardcoded
  x-is-admin header).
- **The missing organ:** an event-lifecycle scanner. All 70 events sit frozen at
  `scheduled` forever; seeded JTD source types (service_reminder, payment_due,
  appointment_reminder) have never fired; nothing spawns tickets or dispatches
  forms. Everything upstream and downstream of the scanner already exists.
- **Genuinely greenfield:** appointments (no table, no API) and tenant-level
  AR/AP aggregation endpoints. Everything else is CONNECT, not BUILD.

## 0.1 Owner decisions (locked 2026-07-07)

1. The 12 existing invoices were created **manually during testing** → billing-
   event→invoice generation is a real gap; build manual-approval-first.
2. **AP = buyer tenants (Expense side)** via the common access table
   `t_contract_access` (contacts → contracts → claim contracts) +
   `buyer_tenant_id` on claimed contracts.
3. **Manual mode first** — stabilise functionality/UX/JTD; VaNi mode after.
4. **JTD gets tenant access** (not only admin): (a) VaNi will read from this
   layer anyway; (b) interaction counts (WhatsApp/SMS/email) are top-ups —
   tenants need a consolidated consumption view.
5. **Reuse the `/vani` mock pages as the real surfaces** — rewire fakeData →
   real services, re-home them **under Operations**.
6. **Appointments: in-product board only** — no external calendar sync.

---

## 1. Stage 0 — The Runtime Loop (the scanner) 🔴 FOUNDATION

Everything else animates the moment this exists. Per agentic-POA Phase 2.1/2.2.

**Build (backend only, no UI):**
- Scanner job (pg_cron, or extend jtd-worker's scheduled drain — decide at build
  by ops simplicity) that walks `t_contract_events`:
  - transitions: `scheduled → due` (window approaching) and `→ overdue`
    (past date) — statuses per `event-status-config`;
  - enqueues `n_jtd` rows: `service_reminder` / `payment_due` /
    `appointment_reminder` (masters + templates already seeded; insert-trigger
    auto-enqueues to PGMQ — inserting the row IS the dispatch);
  - **idempotency**: dispatch-tracking column/junction on `t_contract_events`
    (e.g. `reminder_jtd_id` / `dispatched_at`) so re-runs never double-send;
  - billing events: on due, auto-create a **draft invoice** in `t_invoices`
    (manual mode: seller approves/sends; automation later in VaNi stage).
- Ops hygiene from the earlier audit: de-dupe the double jtd-worker cron.

**Reuses:** entire JTD framework, event tables, invoice table.
**Migrations:** owner-applied (dispatch tracking column; cron).
**Acceptance:** a contract with an event due tomorrow produces a reminder JTD
(visible in JTD Admin queue) with zero human action; overdue events show as
overdue everywhere; a billing event on due date yields a draft invoice.

## 2. Stage 1 — Finance: AR / AP (Operations → Finance)

**Build:**
- API `GET /api/finance/receivables` (tenant-level aggregation over
  `t_invoices`): ageing buckets (0-7 / 8-15 / 16-30 / 30+ overdue), upcoming
  (next 7/15/30 days), grouped by buyer, totals + who-owes list. Record-payment
  and cancel APIs already exist per-contract — reuse.
- API `GET /api/finance/payables` — the buyer mirror: invoices on contracts
  where the tenant is the buyer (`buyer_tenant_id` = me OR active
  `t_contract_access` grant).
- Manual reminder action: "send reminder" on an invoice → enqueue `payment_due`
  JTD on demand (reuses worker + templates).
- UI: rewire **AccountsReceivablePage** (keep the polished UX; swap fakeData →
  real service). Add the Receivables/Payables toggle per ux-04 (dunning ladder
  visual comes with VaNi stage; manual actions now). Re-home under
  Operations → Finance.

**Acceptance:** seller sees real outstanding/upcoming/ageing from `t_invoices`;
records a payment and the view updates; buyer tenant sees payables on claimed
contracts; manual reminder lands on the buyer's channel via JTD.

## 3. Stage 2 — Services (Operations → Service Schedule) + smart-forms glue

**Build:**
- UI: rewire **ServiceSchedulePage** + **BusinessEventsPage** to the real
  contract-events API (windowing/type/status filters; extend
  `contractEventRoutes` only if a filter is missing).
- Service tickets: "create ticket" from due service events (API exists —
  `create_service_ticket` RPC + serviceExecutionRoutes); ticket detail with
  evidence upload (API exists).
- **Smart-forms integration (the creation-time glue):** when a contract is
  created (wizard AND VaNi), write `m_form_template_mappings` rows from
  `evidence_selected_forms` + each block's `form_template_id`; ticket/event
  completion surfaces the mapped form (submission CRUD exists).
- Contract detail two-lens upgrade (ux-05: Service | Finance lenses on
  /contracts/:id) — folded here as 2b, using the same events+invoices data.

**Acceptance:** tenant sees this week's promised service events (real), opens a
ticket, technician uploads evidence + fills the mapped smart form, completion
transitions the event; contract detail shows the lifecycle + finance lenses.

## 4. Stage 3 — Appointments (in-product board)

The one greenfield backend piece.

**Build:**
- DB: `t_appointments` (tenant_id, contract_id, event_id, status:
  requested/accepted/declined/rescheduled/completed/no_response, proposed_slots
  jsonb, scheduled_at, assigned_to, notes, is_live) — linked 1:1 to service
  events that need an appointment.
- API: CRUD + transitions; scanner (Stage 0) requests appointments ~5-6 days
  ahead for flagged events → `appointment_reminder` JTD.
- UI: replace the stub appointments page with the ux-08 kanban board
  (Requested / Accepted / Reschedule / Your-follow-up + "no appointment needed"
  tracked list). Manual mode: owner moves cards; replies captured manually.
  (WhatsApp auto-read of replies = VaNi stage.)

**Acceptance:** service events flagged needs-appointment appear as Requested
~6 days ahead; owner records accept/reschedule; accepted appointments show on
Service Schedule; no-shows escalate to "Your follow-up".

## 5. Stage 4 — Tenant JTD visibility + consumption

**Build:**
- Tenant-scoped RPC variants (new functions, do NOT touch admin ones):
  `get_tenant_jtd_events` (Event Explorer already takes p_tenant_id — enforce
  it server-side from JWT), `get_tenant_jtd_consumption` (channel counts —
  WhatsApp/SMS/email per period, for top-up visibility), tenant queue health.
- **Security hardening:** tenant endpoints derive tenant from the authenticated
  JWT — no x-is-admin trust, no client-supplied tenant filter.
- UI: tenant "Activity" page under Operations — reuse EventExplorer's UI
  tenant-scoped + a consumption card (channel counts, period filter).
  JTD Admin stays admin-only as-is.

**Acceptance:** a tenant sees only their own JTD events + their consolidated
channel consumption; admin surfaces unchanged.

## 6. Stage 5 — VaNi mode (after manual stabilises)

Not detailed here — activates on the stabilised manual pipeline:
- Cockpit VaNi sidebar → real "What VaNi did / Needs you" feed (n_jtd activity
  + proposed actions) per ux-01.
- Renewal watcher → composer drafts (agentic-POA 2.3); dunning ladder
  automation (ux-04); appointment auto-chasing with reply-reading (ux-08);
  billing-event auto-invoice send; autonomy toggles + human gates + credits
  (agentic-POA Phase 3).

## 7. Cross-cutting rules

- Delivery: MANUAL_COPY_FILES batches + COPY_INSTRUCTIONS per stage; Phase-2
  submodule commits owner-run after "tested, working". DB migrations owner-
  applied (or MCP with explicit go). UI tsc baseline stays 23; API 0.
- Menu: new surfaces live under **Operations** (Finance, Service Schedule,
  Appointments, Activity). The remaining mock /vani pages (Jobs, Webhooks,
  ProcessRules, Analytics, Chat, Channels) stay parked as reference until a
  cleanup pass — they are NOT part of this POA.
- Honesty rule stands: no mocked "VaNi did X" — manual mode shows real states;
  agent claims appear only in Stage 5 when backed by real actions.

## 8. Build order & why

**0 → 1 → 2 → 3 → 4 → 5.** Stage 0 first because 1-4 all get livelier with it
(Stage 1 can technically start in parallel — AR reads invoices directly).
Each stage independently demoable/testable per the manual-first decision.
