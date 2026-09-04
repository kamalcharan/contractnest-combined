# Sprint 2-5-7 — Plan of Action (POA)

**Created**: 2026-09-03 · **Owner directive**: BBB untouched until ~5 Sep+; full focus on
Sprint 2-5-7 leftovers. Execution follows this POA step by step; each step ends at an
owner gate (test / approve) before the next starts.
**Spec of record**: `Service-Execution-V3-Decisions.md` (D1–D11) + `Service-Execution-V3-Handoff.html` (7 screens).
**Delivery model**: DB/edge applied live by assistant (files = source-of-record);
API/UI via MANUAL_COPY_FILES → owner copies, tests, merges. Never pushed to submodules.

---

## Status board

| Step | Scope | Status |
|---|---|---|
| B1 | Per-asset foundation (fan-out V2 + read route) | ✅ **DONE — owner-verified 2026-09-03** on CN-1005: Equipment tab "0/48 visits proven", 3 locked placeholders w/ Attach asset; Tasks tab "0/3 assets proven" chips |
| B2 | Sprint 2 — forms bind (resolver + picker + gating) | ⬜ next |
| B3 | Sprint 7 — execution loop (prove → complete → report → invoice) | ⬜ |
| B4 | Extend — WhatsApp/email touchpoints (T1→T2→T3) | ⬜ |
| C  | Sprint 5 — repair sweep (report-first) | ⬜ can run parallel any time |
| A  | Cutover remainder (BBB copy → soak → flip → retire) | ⏸ parked until owner reopens (~6 Sep+) |

---

## B2 — Sprint 2: smart forms bind (decisions D4, D9)

| # | Item | Layer | Gate |
|---|---|---|---|
| B2.1 | Seed platform default form **"General Service Completion"** (work status / asset condition / optional note; versioned `m_form_templates` row) | DB (live) | owner reviews seed content |
| B2.2 | `m_form_template_mappings` additive columns: `contract_block_id`, `resource_template_id`, `require_upload` + unique index (contract, block, form) | DB (live) | — |
| B2.3 | **Activation resolver** on the V2 path: block form → KT form → contract fallback → platform default; writes mapping rows; policy `none` ⇒ no rows | DB (live) | harness proof on signia test contract |
| B2.4 | **Block picker real**: catalog-studio Evidence step reads approved `m_form_templates` via API (mocks removed); choice persisted in block `config` (snapshots into contracts for free) | UI + API | owner tests in catalog-studio |
| B2.5 | **Submission gating**: submission links to exactly one `t_contract_event_assets` row; placeholder `asset_ref` rejected server-side | DB/edge (smart-forms) | negative test proof |
| B2.6 | Wizard **"requires: form X"** chips (resolver in preview mode — display only) | UI | owner visual check |

Exit: activating a signia test contract writes correct mapping rows for every ladder rung;
submission against a placeholder is rejected; block picker shows real forms.
(Seed scale-up for the 117 uncovered KT types = separate content batch, owner-reviewed, not a B2 blocker.)

## B3 — Sprint 7: the execution loop (decisions D1–D3, D5–D8, D10)

| # | Item | Layer | Gate |
|---|---|---|---|
| B3.1 | **TKT- sequence** + ticket born at Start Service (`in_progress`, `started_at`; events attach via `t_service_ticket_events`) | DB + API | — |
| B3.2 | **Attach-asset unlock on V2**: port/verify `unlock_placeholder_event_assets` for jtd-keyed rows (Equipment tab's "Attach asset" button must unlock V2 rows) | DB (live) | owner attaches a real asset on CN-1005 |
| B3.3 | **Mark-asset-proven endpoint** (+ `require_upload` enforcement) + **completion cascade**: all proven → job → completed (legal transitions) → ticket completed | DB + edge + API | harness |
| B3.4 | **Mobile-first execution UI** per D10 (sequential cards, auto-advance, camera-first, prefill-statics-never-proof; desktop drawer = same engine) | UI | owner tests on phone |
| B3.5 | **Beyond-scope persistence → on-the-fly invoice** (D5: own lines, contract+ticket provenance, NO billing event, tax from settings) | DB + edge + API + UI | owner reviews invoice |
| B3.6 | **Report renderer** (D6: output over completed ticket) + public token link | edge/API + UI | owner views report |
| B3.7 | **E2E acceptance** on fresh signia contract: 3 assets, 1 placeholder attached mid-flow → tickets/evidence/submissions non-zero, all cross-linked, zero gaps | harness | owner sign-off = **Sprint 7 exit** |

## B4 — Extend: WhatsApp/email touchpoints (decision D11 + MSG91 answers 2026-09-02)

| # | Item | Gate |
|---|---|---|
| B4.1 | Five **Utility** templates (positional params): visit_scheduled / started / completed / report_ready / beyond_scope_invoice — Meta review → MSG91 sync | owner registers |
| B4.2 | Lifecycle enqueue as `n_jtd` message rows + dispatch-window config + domain-lexicon copy | harness |
| B4.3 | **T2**: register `msg91-webhook` as second MSG91 destination (inbound); tighten extractor against first captured payloads in `n_webhook_inbound_raw` | owner panel config |
| B4.4 | **T3**: complete the Flow POC capture (resubmit `cn_poc__service_proof` once inbound webhook live) → media-decrypt path → form-template→Flow-JSON compiler v1 (manual publish) | POC payload proof |

## C — Sprint 5: repair sweep (independent; report-first per spec)

| # | Item | Gate |
|---|---|---|
| C.1 | Report: 154 stuck `requested` appointments (89 signia test debris / 65 real) with per-row proposed disposition; 21 date-stale events; orphan test events (CN-1028–1044 annotate-only) | **owner approves dispositions** |
| C.2 | Apply approved dispositions + scanner guard (skip test-flagged contracts so the pile stops regrowing) | post-apply verification |

Group-session half of Sprint 5: **done-as-built** (BBB production pipeline) — no action.

## A — Cutover remainder (parked until owner reopens)

BBB copy + bridge (same survived migrations, BBB tenant id) in the 6–18 Sep window →
soak with daily `audit_dual_read_check` → 19 Sep meeting on V2 = retirement gate →
Phase 5 flip (readers/UI) → Phase 6 archive (30-day hold). Signia soak continues daily meanwhile.

---

## Standing rules for this POA
1. One step at a time; owner gate closes a step before the next opens.
2. DB/edge: applied live by assistant, file = source-of-record. API/UI: MANUAL_COPY_FILES + copy commands, owner tests before any merge commands are issued.
3. Every DB step carries a forced-rollback harness or in-transaction verification; a silent no-op is the failure mode.
4. BBB: zero contact until the owner reopens Track A.
