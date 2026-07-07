# Stage 3 — Appointments (Operations → Appointments)

**Date:** 2026-07-07 · **Status:** BUILT — awaiting owner apply + test
**POA:** POA-OPERATIONS-READINESS-2026-07-07.md §4 (Stage 3) · ux-08 kanban · owner decisions: in-product only, no external calendar; manual mode; +91 9885164233 message constraint
**Batch:** `MANUAL_COPY_FILES/stage3-appointments/`
**Submodules touched:** contractnest-edge (2 SQL + NEW edge fn `appointments` — deploy required), contractnest-api (4 new + index.ts), contractnest-ui (2 new + App.tsx + industryMenus.ts), ClaudeDocumentation.

---

## 1. What it delivers

1. **`t_appointments`** — the scheduling layer on service events. One active appointment per event (unique index = hard idempotency). Statuses: `requested → accepted/declined/rescheduled/no_response`, `accepted → completed/…`; `completed`/`declined` terminal ("declined" = no appointment needed).
2. **Scanner v2** — STEP 2b: service events at due/overdue within **6 days** (param) with no appointment → auto-`requested` row. **No JTD dispatch** (manual mode: `appointment_reminder` has no configured provider template; owner works the board; VaNi stage adds auto-chasing). ⚠️ Signature change: old 4-arg function is DROPPED (cron call unchanged).
3. **Accept syncs the event**: accepting with a slot updates the service event's `scheduled_date` (audit + version bump) — the Service Schedule shows the agreed slot.
4. **Kanban board** (`/ops/appointments`, ux-08): Requested · Accepted · Reschedule · **Your follow-up** (no_response, with days-since-activity ageing) + collapsible **Closed** (completed / no-appointment-needed). Card actions: Accept (inline slot picker) / Reschedule / No response / Re-request / Completed / Not needed. Cards carry customer name, phone, email, contract link.
5. **API**: `/api/appointments` (GET list, POST manual request, PATCH transitions) → edge fn `appointments` → the 3 RPCs. Mirrors the finance pattern (HMAC, x-environment, error-code map).
6. **Cross-surface integration (feedback round, migration 014)**: the events-list RPC returns `appointment_id/status/scheduled_at`; the **Service Schedule** gets an Appointment column (status chip → board, or **Book** action) and its status menu became inline expanding chips (the old absolute menu was clipped by the scroll container); the shared **EventCard** (contract Tasks tab, Operations tab, cockpit) shows an "Appointment:" chip + Book button on service events.

**Dry-run verified on live DB (aborted):** scanner v2 requested **21 appointments** (everything else 0 — prior-stage idempotency intact), accept transition worked, `event_date_synced = true`, 0 errors.

## 2. Apply order (owner)

1. **SQL** (in order): `012_stage3_appointments.sql` → `013_stage3_scanner_v2.sql` → `014_stage3_events_list_appointment_fields.sql`.
   013 replaces the running scanner — the cron keeps working (same zero-arg call, one new defaulted param). 014 adds appointment fields to the events list (feeds Service Schedule + EventCard).
2. **Edge deploy**: copy `functions/appointments/` → `supabase functions deploy appointments` (no new secrets).
3. **API**: copy files (index.ts FULL REPLACE — includes stage1's finance registration), restart; boot log shows "✅ Appointment routes registered at /api/appointments".
4. **UI**: copy files (App.tsx + industryMenus.ts FULL REPLACE — include stages 1+2), hard refresh → Operations → Appointments.

## 3. Testing checklist

- [ ] After 013 + next scanner tick (≤15 min, or `SELECT run_contract_event_scanner();`): ~21 requested appointments appear (`SELECT status, count(*) FROM t_appointments GROUP BY 1;`)
- [ ] Board shows them under **Requested** with customer name/phone/email
- [ ] Accept one with a slot → moves to **Accepted**, and the event's date on Service Schedule = the slot (audit row on the event)
- [ ] Reschedule / No response / Re-request cycles work; "Not needed" (decline) moves to Closed and the scanner does NOT re-create it
- [ ] Complete an accepted appointment → Closed section
- [ ] Version conflict: open the board in two tabs, act on the same card in both → second gets a 409 toast
- [ ] Scanner idempotency: run twice → `appointments_requested: 0` on the second pass
- [ ] **No messages sent** (manual mode — verify `n_jtd` gained no appointment rows); +91 9885164233 constraint trivially satisfied

## 4. Design positions (owner Q&A, 2026-07-07) + known limits

**Buyer-desk visibility — NOT in this stage (by design).** Appointments are
seller-tenant scoped; the "requested" card is a work item for the SELLER
(call/WhatsApp the customer contact, agree a slot, record it). The buyer who
claimed the contract sees the contract + invoices but no appointment surface.
Two future increments:
- *Cheap:* read-only "Upcoming visits" on the buyer's contract view, resolved
  via `t_contract_access` (same access pattern as payables).
- *VaNi stage:* the buyer needs no desk — they receive the message and reply;
  acceptance flows back into the board.

**Slot/time management — record-keeping, NOT a calendar engine (owner
decision #6: in-product only, no external calendar sync).**
`proposed_slots` jsonb holds offered options (seeded with the event date);
`scheduled_at` is the agreed slot set on Accept (syncs the event date);
`assigned_to` exists for technician allocation. There is deliberately no
availability model, conflict detection, or slot inventory. `proposed_slots`
is future-ready for VaNi offering 2–3 slots over WhatsApp. Technician-level
conflict checks = a separate feature to scope explicitly if ever wanted.

**Messaging — deliberately OFF in this stage.** No email/SMS/WhatsApp is sent
when an appointment is requested. Three stacked reasons: manual-first POA;
the +91 9885164233-only test constraint; and a hard blocker — the seeded
`appointment_reminder` source has only an SMS template, and neither SMS
(`MSG91_SENDER_ID`) nor WhatsApp (BSP template approval) is configured.

### Stage 3b — QUEUED (owner-agreed 2026-07-07): appointment request emails
Small, next-session increment once stages 1–3 pass testing:
1. Owner creates an `appointment_request` EMAIL template in MSG91
   (vars: `customer_name`, `service_type`, `service_date`, `tenant_name`;
   Claude supplies the HTML, same style as payment_due/service_reminder).
2. Seed `n_jtd_templates` row (+ `provider_template_id`), add the JTD enqueue
   at appointment creation — recipient via the buyer-contact chain (email
   first), idempotent like the other scanner dispatches.
3. WhatsApp + reply-reading (auto-moving cards) = VaNi stage, after BSP
   template approval.
Email-only respects the test-number constraint by definition.

**Other known limits:**
- Board is button-driven (no drag-and-drop) — deliberate for manual-mode
  reliability.
- Completing a ticket does not auto-complete the linked appointment (and vice
  versa) — owner may want ticket-completion to close the appointment; small
  addition to the Stage 2 propagation if requested.

## 5. Stage 4 preview

Tenant JTD visibility + consumption (tenant-scoped RPC variants, JWT-derived scoping, consumption card for top-ups) — after stages 1–3 are confirmed tested.
