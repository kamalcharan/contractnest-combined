# HANDOVER — Operations POA execution, Stages 0–3 (session 2026-07-07)

> Continues POA-OPERATIONS-READINESS-2026-07-07.md. This session BUILT stages
> 0–3 of the 6-stage plan. Read this + the four STAGE*.md docs before any
> follow-up work. Combined-repo branch: `claude/contractnest-operations-poa-n931lf`
> (commits e289c03 … 120aaa0 — all MANUAL_COPY_FILES batches).

---

## 0. Status at a glance

| Stage | What | Status |
|---|---|---|
| 0 | Runtime loop (scanner, due/overdue, reminders, draft invoices, cron de-dupe) | ✅ APPLIED + **VERIFIED IN PRODUCTION** (scanner live */15; payment_due email delivered to info@vikuna.io via MSG91) |
| 1 | Finance AR/AP (/ops/finance, RPCs, edge fn `finance`, /api/finance) | 🔶 APPLIED, testing — 3 feedback rounds done (perspective binding, table pattern) |
| 2 | Services (/ops/services, ticket↔event propagation, evidence+forms wiring, forms glue, cockpit chips) | 🔶 APPLIED, testing — 2 feedback rounds done (buckets fix, customer columns 011, grouping) |
| 3 | Appointments (t_appointments, scanner v2, /api/appointments + edge fn, kanban) | 🔶 APPLIED, testing — feedback round done (clip-safe status chips, 014 appointment fields, EventCard chip, Book actions) |
| 1b | Razorpay pay-link in reminders | ⏸ ON HOLD (assessed; see STAGE1 doc §5b — rail already exists, wiring job) |
| 3b | Appointment-request EMAILS | ⏸ QUEUED (owner-agreed; see STAGE3 doc §4) |
| 4 | Tenant JTD visibility + consumption | ⛔ NOT STARTED — next build |
| 5 | VaNi mode | ⛔ NOT STARTED |

**Owner has NOT yet said "tested, working" for stages 1–3** → Phase 2 submodule
commits are PENDING. All code sits in the owner's working tree via
MANUAL_COPY_FILES; nothing committed to submodules yet.

## 1. Batches on the branch (apply order = 1 → 2 → 3; later batches SUPERSEDE shared files)

- `MANUAL_COPY_FILES/stage0-runtime-loop/` — SQL 001–005 (+006 rollback), MSG91 email template HTML (msg91-email-templates/), STAGE0 doc. ALL APPLIED.
- `MANUAL_COPY_FILES/stage1-finance-ar-ap/` — SQL 007, edge fn `finance` (deployed), /api/finance, /ops/finance page, STAGE1 doc.
- `MANUAL_COPY_FILES/stage2-services/` — SQL 008–011, /ops/services page (superseded by stage3's v3), TicketEvidencePanel, FinanceActionChips, ServiceTicketDetail/OperationsTab/cockpit modified, STAGE2 doc.
- `MANUAL_COPY_FILES/stage3-appointments/` — SQL 012–014, edge fn `appointments` (deployed), /api/appointments, kanban board, services page v3, EventCard (appointment chip), STAGE3 doc.
- Shared-file supersession chain: `App.tsx`/`industryMenus.ts` → stage3's copies include 1+2+3; API `index.ts` → stage3's copy includes 1+3 (stage2 didn't touch API).

## 2. Verified facts (do NOT re-derive)

- DB project `uwyqhzotluikawcboldr`. Scanner = `run_contract_event_scanner(p_service_lead, p_billing_lead, p_payment_reminder_lead, p_appointment_lead, p_max_rows)` — 5-arg version live (old 4-arg dropped), cron `contract-event-scanner` */15, jtd-worker cron de-duped (1 job).
- MSG91 email templates LIVE + wired: `payment_due_email_v1`, `service_reminder_email_v1` (provider_template_id = same values). NO appointment/WhatsApp/SMS templates; `MSG91_SENDER_ID` not configured (SMS parked).
- `generate_contract_invoices` auto-creates ONE lump-sum invoice per contract at activation (audit correction — invoices were NOT all manual). Scanner links billing events to matching invoices (5 linked) or drafts. **Open decision (Stage 1 window): suppress lump generation for emi/recurring, or keep + manual cancel.**
- `create_contract_transaction` DROPS evidence_policy_type/evidence_selected_forms (only `update_contract` persists) → forms glue no-ops on VaNi auto-accept path. Fix queued (VaNi stage or earlier).
- All contracts' `buyer_email/phone` are NULL — recipient resolution everywhere falls back to `t_contact_channels` (email → mobile → whatsapp). `t_contract_evidence_forms` does NOT exist live (repo-only reference). `m_cat_blocks.form_template_id` all NULL today; no contract has evidence forms configured → forms-glue testing requires configuring a policy first.
- Ticket↔event propagation live: create ticket → service events in_progress; complete → completed. Accept appointment → event scheduled_date syncs. Ticket-completion does NOT close the linked appointment (optional follow-up).
- tsc baselines: UI 23 (tsconfig.app.json), API 0. Both hold with all batches composed.
- ⚠️ **Message-testing constraint: +91 9885164233 is the ONLY number allowed.** Email is unrestricted (test inboxes: info@vikuna.io, vtech9682@gmail.com).

## 3. Conventions this session established (keep them)

1. **Dry-run-with-abort**: every migration executed against the live DB inside a transaction ended by `RAISE EXCEPTION` carrying the JSON result — full semantic verification, zero commits. Do this for all future SQL.
2. **Anchored generation**: shared files (App.tsx, index.ts, menus, EventCard…) are generated programmatically from the correct base (main or the previous batch) with unique-anchor asserts — never hand-copied. Watch for identifier collisions (AppointmentsPage lesson: legacy stub at `./pages/appointments` — cleanup candidate).
3. **UI pattern**: product table lists (grid header + rows, grouped-by-customer toggle), inline expanding transition chips (NEVER absolute menus inside scroll containers), `vaniToast`, `useTheme` colors, perspective-aware pages (Revenue→AR-ish, Expense→AP-ish).
4. tsc-verify with ALL batches composed into the submodule, then `git checkout -- src && git clean -fd src`.

## 4. Next session — start here

1. If owner confirms "tested, working" → produce consolidated **Phase 2 commit commands** (edge/api/ui/docs submodules + parent repo), per CLAUDE.md.
2. **Stage 4 — Tenant JTD visibility + consumption** (POA §5): tenant-scoped RPC variants (`get_tenant_jtd_events`, `get_tenant_jtd_consumption` — channel counts for top-ups), JWT-derived tenant scoping (no x-is-admin trust), tenant "Activity" page under Operations reusing EventExplorer patterns. Admin surfaces untouched.
3. Queued small items, owner-priority order: Stage 3b (appointment emails — owner creates MSG91 template first), Stage 1b (Razorpay pay-link), buyer-desk "Upcoming visits", ticket-completion→appointment-close, Service Schedule perspective filter, legacy appointments stub cleanup.
4. MSG91 template HTML generator: reuse `stage0-runtime-loop/msg91-email-templates/*.html` style (indigo #4F46E5 card, Handlebars {{vars}}).
