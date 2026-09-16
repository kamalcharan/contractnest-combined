# Ops on JTD — Tools, Ladder and Cockpit Specification

**Status:** agreed design, not yet built (2026-09-16). Item 1 (collections ladder) is the first implementation.
**Authority:** owner decisions recorded in this session; `ClaudeDocumentation/JTD/JTD-Framework.md` (JTD as the job spine); `ClaudeDocumentation/jtd-cutover-package.md` (spine cutover plan, paper only); `ClaudeDocumentation/ContractNest Agent/ux/*.html` (the agentic UX: next-best-action cockpit, dunning ladder, appointment chase, autonomy & credits).
**Who must read this:** anyone — human or agent — building Operations, VaNi actions, collections/reminders, or anything that touches `n_jtd`. `CLAUDE.md` points here.

---

## 1. Principles (owner decisions)

1. **Every action is a tool.** A tool is an RPC with an explicit actor. Today a **human** invokes it from the cockpit; later **VaNi** invokes the *same* tool. There is never a second code path for the agent.
2. **Nothing is automatic until VaNi owns automation.** All triggers are manual now. When VaNi exists it builds and manages the AUTO triggers, within the tenant's autonomy dial. Do not ship crons that act on money without that framework.
3. **Money In is the ledger; the cockpit is where to focus.** The cockpit never restates balances, totals or ageing — it lists decisions and upcoming commitments. Anything about "how much am I owed" belongs to Money In / To Pay.
4. **JTD (`n_jtd`) is the single spine for jobs.** The cockpit reads `n_jtd` only. Payment jobs, service visits, appointments, reminders, tasks are all rows of one table; a lane is a filter on `event_type_code`, not a new layout. This is what keeps more lanes from becoming "messy".
5. **Steady transition, item by item.** Collections first; then sessions, services, appointments; each lane retires an old page only when it is in. Final home of the cockpit is `/ops/cockpit`; anything else is staging.
6. **Frontend-only unless there is a bug or the framework needs it.** The ladder tools and their storage are framework work and are in scope; no other backend changes ride along.
7. **Tenant-specific configuration.** There is no "BBB default". Ladders, channels and templates are per tenant.
8. **No RBAC yet.** Any authenticated tenant user may invoke a tool; the row always records who.

## 2. Vocabulary

| Term | Meaning |
|---|---|
| **Job** | One row in `n_jtd`. Has `event_type_code` (payment · service_visit · appointment · reminder · notification · task · document), `source_type_code` (what created it), `status_code`, `scheduled_at`, `assigned_to`, actor fields, `payload`. |
| **Commitment** | A job with a due date that the business promised: a payment instalment, a service visit, a session occurrence, an appointment slot. |
| **Lane** | The *what*: Collections (payment jobs), Services (service_visit), Appointments, Sessions. Mapped 1:1 to `event_type_code` (Sessions additionally to the group-session schedule until those become jobs). |
| **Horizon** | The *when*: overdue · today · next 3 days · coming weeks (≤30 d) · later. Computed from `scheduled_at` in the tenant's timezone (IST today — see CLAUDE.md migration 048 note). |
| **Who** | `assigned_to` on the job: Team · Mine · Unassigned. |
| **Confirmed / To confirm** | Every commitment is one or the other. Confirmed = nothing needed from a human; To confirm = a decision or action is pending (a declaration to confirm, a slot to accept, a rung due, a failed send). |
| **Tool** | An RPC `jtd_*` that changes job state, always with `p_actor_type` + `p_actor_id`. |
| **Actor** | `user` (a tenant user, `performed_by_id` = user id) · `vani` (well-known id `00000000-0000-0000-0000-000000000001`, seeded in `n_system_actors`) · `system` · `webhook`. |
| **Ladder / rung** | The tenant's collections escalation: an ordered list of rungs, each *after N days* with a channel (email · whatsapp · call). Also called dunning. |
| **Needs-you card** | The cockpit's unit: what happened, what is proposed, the evidence, the buttons, who prepared it. |

## 3. Data model

### 3.1 The spine today (facts, verified 2026-09-16)
- `n_jtd` already carries the contract-event columns (`contract_id, block_id, block_name, billing_sub_type, billing_cycle_label, sequence_number, total_occurrences, original_date, amount, amount_settled, currency, invoice_id, assigned_to, assigned_to_name, task_id, audience, is_live`), actor columns (`performed_by_type/_id/_name`), history tables (`n_jtd_history`, `n_jtd_status_history`), catalogues (`n_jtd_event_types`, `n_jtd_source_types`, `n_jtd_statuses`, `n_jtd_status_flows`), templates (`n_jtd_templates`), per-tenant config (`n_jtd_tenant_config`, `n_jtd_tenant_source_config`).
- For BBB the payment spine is **complete and id-preserving**: 477 payment jobs = 477 legacy `t_contract_events` rows (same ids), every status bucket equal to the rupee. Legacy and JTD coexist until the cutover package is executed; readers may use `n_jtd`, writers that reverse money still target legacy (see cutover doc). **Until cutover, any tool that sends money-related communication re-checks the legacy row (same id) for `status`/`amount_settled` before acting.**
- Existing reminder reality: `payment_due` email template exists (`payment_due_email_v1`); one batch of 20 emails ever sent (21 Jul 2026); `payment_overdue` never fired; **no WhatsApp template for payment reminders**; no reminder jobs are ever pre-scheduled.
- Index hygiene: `n_jtd` historically had no unique index beyond its PK (the phantom-queue incident, CLAUDE.md 2026-08-05). Every new write path here needs an idempotency index.

### 3.2 Additions for the collections ladder (one additive migration)

**Columns on `n_jtd` (meaningful for `event_type_code = 'payment'`):**

| Column | Type | Meaning |
|---|---|---|
| `dunning_step` | int default 0 | rung reached (0 = none) |
| `next_dunning_at` | timestamptz | when the next rung falls due; NULL when paused/finished/paid |
| `nudge_count` | int default 0 | reminders actually sent (any channel) |
| `last_nudge_at` | timestamptz | |
| `dunning_paused_reason` | text | `declaration_pending` · `promise` · `dispute` · `manual` · NULL |
| `promise_date` | date | promise-to-pay captured on a call |

**History = more JTD rows, no new table.** Every nudge, call or escalation is an `n_jtd` row whose `source_id` = the payment job id (and `contract_id`, `recipient_*` copied for filtering). Counts and the feed derive from these rows plus `n_jtd_history`.

**New `n_jtd_source_types`:**

| code | event_type | purpose |
|---|---|---|
| `payment_nudge_email` | reminder | rung sent by email |
| `payment_nudge_whatsapp` | reminder | rung sent by WhatsApp |
| `payment_call_due` | task | rung of type *call*: an **open task assigned to a named user** (owner decision: real assigned task, not just a card) |
| `payment_call_logged` | task | a human's call record: `called_at`, outcome, notes, promise date; created already completed; closes the matching `payment_call_due` |

Statuses reuse the existing `reminder` and `task` lifecycles in `n_jtd_statuses` (add `open → done / cancelled` for task if absent).

**Per-tenant ladder config:** persisted in `n_jtd_tenant_source_config` for `source_type_code = 'payment_scheduled'`, in a `rules jsonb` column (added) using the **Process Rules shape** the hidden `/vani/rules` page already defines (`src/vani/pages/ProcessRulesPage.tsx`, `ProcessRule`): steps with type · channels · template · delay, timing as `beforeDays / onDay / afterDays`, escalation with `noResponseDays / escalateTo`. Presets: **0/3/7**, **monthly**, **custom** (owner: "0/3/7/custom/month"). The page is wired to the real get/set tool and stops using mock data. No global default; a tenant with no ladder has no rungs computed.

**Idempotency:** partial unique index on `(source_id, dunning_step, source_type_code)` for the nudge/escalation rows — a rung can never fire twice for the same job, whoever invokes it.

**Indexes (also serve the cockpit reader):**
`(tenant_id, event_type_code, status_code, scheduled_at)` · `(source_id)` · partial `(tenant_id, next_dunning_at) WHERE next_dunning_at IS NOT NULL` · `(tenant_id, assigned_to, status_code) WHERE event_type_code = 'task'`.

### 3.3 Volume (heads-up from the owner)
Estimate: 100 tenants × 8,000 contracts/year × ~12 payment jobs ≈ **1M payment jobs/year**, plus ~3 ladder rows each ≈ **3–4M `n_jtd` rows/year**, plus notifications. Fine for Postgres with the indexes above; keep `payload` / `template_variables` small. **Threshold, not a task:** when `n_jtd` approaches ~10M rows, introduce monthly partitioning and archive terminal notification rows (sent/delivered/read older than 12 months) to `n_jtd_archive`. Record the row count in CLAUDE.md when checked.

## 4. Tools (RPCs)

All tools: `SECURITY DEFINER`, tenant-scoped by `p_tenant_id`, take `p_actor_type text, p_actor_id uuid, p_actor_name text`, write `performed_by_*` on every row they create, append `n_jtd_history`, and return `jsonb {success, ...}` with a machine-readable `reason` on refusal. Run inside one transaction; no partial writes.

| Tool | Parameters | Behaviour | Guards / refusals |
|---|---|---|---|
| `jtd_nudge_payment` | `p_job_id, p_channel ('email'\|'whatsapp'), p_note?` | Creates the reminder row for the **current** rung (or an ad-hoc nudge when no rung is due), enqueues it through the existing `trg_jtd_enqueue` path, increments `nudge_count`, sets `last_nudge_at`, advances `dunning_step`, recomputes `next_dunning_at` from the tenant ladder. | Job not `overdue`/`scheduled`; legacy row paid or settled; no template for channel; recipient has no number/email; paused (returns `paused_reason`); duplicate rung (index). |
| `jtd_log_payment_call` | `p_job_id, p_called_at, p_outcome ('reached'\|'no_answer'\|'promised'\|'disputed'\|'other'), p_notes, p_promise_date?` | Inserts a completed `payment_call_logged` task; closes any open `payment_call_due` for the job; `promised` sets `promise_date` and pauses (`promise`) until that date; `disputed` pauses (`dispute`). | Job not found in tenant. |
| `jtd_escalate_payment_call` | `p_job_id, p_assign_to uuid` | Creates the open `payment_call_due` task assigned to a user (the *call* rung), advances the step. Invoked by a human today; the rung-due card offers it. | Duplicate rung. |
| `jtd_pause_dunning` / `jtd_resume_dunning` | `p_job_id, p_reason` | Manual holds; resume recomputes `next_dunning_at`. Read-time rule: a job with a **pending declaration** is shown paused (`declaration_pending`) without a write. | |
| `jtd_get_dunning_ladder` / `jtd_set_dunning_ladder` | `p_preset ('0_3_7'\|'monthly'\|'custom'), p_rules jsonb?` | Reads/writes the tenant's rules; on write, recomputes `next_dunning_at` for every open job of the tenant. | Invalid shape (validated against the ProcessRule schema). |
| `jtd_collections_worklist` | `p_horizon_days int default 30` | **The cockpit reader.** Returns: `needs_you` (rung-due jobs with step, days overdue, nudge count, last nudge, next rung, pause reason; pending declarations; contracts awaiting acceptance whose `payment_mode` is pay-before-activate; failed sends), `coming_up` (payment jobs due today / within horizon; armed reminders), `happened` (last N nudges, calls, escalations with actor), all as flat rows with `contract_id`, `buyer_id`, `invoice_id` for drill-down. Uses IST. Never returns totals. | |

**Actor rule:** a human call passes the user's id; VaNi passes its well-known id. Autonomy is *not* enforced inside the tools today (everything is manual); when VaNi arrives, the autonomy check lives in VaNi's dispatcher, in front of the same tools.

## 5. Cockpit (`/ops/cockpit`, staged at `/ops/cockpit/next`)

Three sections, in this order, all read from `jtd_collections_worklist` (and its siblings per lane later):

1. **Needs you** — one card per decision. Card anatomy (from `ux/01-cockpit.html` and `04-ar-ap-collections.html`): title (who · what · amount), evidence line (days overdue · rung · reminded N× · last reminder channel/date · link clicks when known), badge for who prepared it (a person now, "VaNi" later), buttons for the tools: **Nudge on WhatsApp** · **Nudge by email** · **Log a call** · **Assign call** · **Pause**. Other card types in the Collections lane: **Confirm** a declaration; **Awaiting payment to activate** (contract); **Retry** a failed send.
2. **What happened** — the feed of tool invocations (nudges, calls, confirmations) with actor and time. Later this is "What VaNi did".
3. **Coming up** — money due today / this week, reminders armed, next rungs falling due. Forward visibility, no totals.

Controls: lane toggle (appears with the second lane) · Who (Team · Mine · Unassigned; appears with assignable rows) · search · lens chips on the sentence. Horizons as section headers. Design language: Money In's (situation sentence with tappable numbers, signal bullets, story rows, theme tokens, 44px targets). **The cockpit never shows balances, totals or ageing.**

Drill targets: contract page; Money In (buyer); Group Sessions (session/declarations); the visit card / Visit screen (services lane, later).

## 6. Ladder semantics

- A rung = `{after_days, channel}` relative to the job's due date; `next_dunning_at` = due date + `after_days` of the next rung, computed in the tenant timezone, **and never before the tenant's dispatch hour** (reuse the `dispatchHour` lesson from group-session reminders: no midnight sends, upper bound so an outage doesn't "catch up" at 23:00).
- Channels: **email** (template exists), **whatsapp** (tenant must have an approved MSG91 template; positional parameters for anything registered after Aug 2026 — see CLAUDE.md trap), **call** (creates the assigned task). Humans may also log a call at any time regardless of rung.
- Pauses: `declaration_pending` (read-time, automatic), `promise` (until `promise_date`), `dispute`, `manual`. A paid/settled job ends the ladder (`next_dunning_at = NULL`).
- History: everything is rows; "how many times reminded" = `nudge_count` with the rows as proof.

## 7. VaNi integration contract (future, designed now)

- **Whether VaNi is on for a tenant is a tenant-table truth** (owner, 2026-09-16: "VaNi enabled or not should be part of tenant table; VaNi is part of subscriptions"): `t_tenants.vani_enabled / vani_enabled_until / vani_enabled_source`, read ONLY through **`vani_is_enabled(tenant_id)`** (admin tenant always true, computed from `is_admin`; otherwise the column, expiry evaluated at read time). Live since migration `vani-agent/003_tenant_vani_enabled.sql`; exposed by `get_tenant_context` as `flags.vani_enabled` + `vani {enabled, until, source}` and therefore by the tenant-context API and `useTenantContext`. Writers: `start_vani_trial` (trial, until `trial_ends`), plan entitlement functions where they set `addon_vani_ai` (to be stitched), admin. `t_tenant_context.addon_vani_ai` is a plan INPUT, not the truth; `n_jtd_tenant_config.vani_enabled` is dead and to be retired; `VANI_ENTITLEMENT_MODE` (API env) is to be removed once `vaniEntitlementService` reads `vani_is_enabled()`.
- **Automation runs only when VaNi is on.** Stitch order (each its own batch): Automation Rules page status line → VaNi landing → entitlement service → plan writers → engines: `vani_rule_enabled()` gains `AND vani_is_enabled()` (gates the scanner's acting steps, every `fn_enqueue_*`, and the jtd-worker in one change), the group-session cron checks per tenant, the worker blocks **system-originated** jobs only — human-invoked tools keep working (that is the manual product). Status bookkeeping (scheduled → due → overdue) keeps running for everyone; it is truth, not automation.
- VaNi invokes the same tools with `p_actor_type = 'vani'`, `p_actor_id = 00000000-0000-0000-0000-000000000001`.
- Autonomy dial per domain (Off · Propose · Auto) and the money cap: add `autonomy jsonb` + `money_cap` (location TBD — `n_jtd_tenant_config` minus its dead `vani_enabled`, or `t_tenants`) when built. *Propose* = VaNi creates the Needs-you card and stops; *Auto* = VaNi invokes the tool and the card appears under *What happened*.
- Credits: every VaNi invocation is attributed in `t_bm_credit_transaction`; humans are free.
- Hard rules (from `ux/07-autonomy-credits.html`): never move money out without approval; never delete; agent power ≤ the invoking user's role; stop all autopilot at 0 credits.

## 8. API surface (contractnest-api → edge → RPC)

Under the existing `/api/jtd` router: `POST /jtd/payments/:jobId/nudge` · `POST /jtd/payments/:jobId/call` · `POST /jtd/payments/:jobId/escalate` · `POST /jtd/payments/:jobId/pause` · `POST /jtd/payments/:jobId/resume` · `GET/PUT /jtd/collections/ladder` · `GET /jtd/collections/worklist?horizon=30`. Actor derived from the authenticated user (or VaNi's service identity later). Edge function forwards with the same names.

## 9. Out of scope (now)

Auto-triggers and crons that act on money · RBAC · WhatsApp template registration (owner action) · guest-fee declarations (blocked on contract-less invoices) · per-asset proof backend (Sprint 3) · the JTD cutover itself · Payments (To Pay) lane — To Pay stays its own page.

## 10. Build sequence and verification

1. Migration (§3.2) — additive; source-of-record SQL staged under `MANUAL_COPY_FILES/<batch>/contractnest-edge/supabase/migrations/…`, applied live only after review.
2. RPCs (§4) — each verified live with the **guarded-transaction pattern** (create probe rows → assert → `RAISE` to roll back → confirm zero residue), including the duplicate-rung and paid-job refusals.
3. API routes + edge forwarding.
4. Cockpit Collections lane (Needs you / What happened / Coming up) + *Log a call* sheet; Process Rules page wired to `jtd_get/set_dunning_ladder`.
5. WhatsApp nudge template once approved.
Every UI batch: `tsc` count identical to pristine main, `vite build` passes, submodules left pristine, Phase 1 copy instructions, owner tests, then Phase 2.

## 11. Extension pattern for the next lanes

Same recipe per lane: (a) identify the job rows (`event_type_code`), (b) define the lane's tools with actors, (c) add the lane's card types to the worklist reader, (d) retire the old page. Sessions: occurrences + reminder runs (`gs_dash_occurrences`, `gs_run_session_notifications`). Services: `service_visit` jobs + tickets; Who/Assign; the contract visit card and Visit screen replace `ServiceExecutionDrawer`. Appointments: the chase loop as JTD jobs (request → remind → read reply → escalate), last column human.

## 12. Open questions

- Process Rules shape vs simple rungs: keep the full `ProcessRule` (before/on/after days + escalation) or simplify to rungs with a channel each? (Owner reviewing `/vani/rules`.)
- Recipient resolution for nudges: contact's WhatsApp/email vs contract-level channel preference — reuse `gs_member_whatsapp_phone()` and the contact channel tables; define precedence.
- Whether `payment_call_due` should also notify the assignee (in-app/email) — probably a `task` notification job, once in-app exists.
