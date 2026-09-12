# Sprint 2-5-7 — Plan of Action (POA)

**Created**: 2026-09-03 · **Owner directive**: BBB untouched until ~5 Sep+; full focus on
Sprint 2-5-7 leftovers. Execution follows this POA step by step; each step ends at an
owner gate (test / approve) before the next starts.
**Spec of record**: `Service-Execution-V3-Decisions.md` (D1–D11) + `Service-Execution-V3-Handoff.html` (7 screens).
**Delivery model**: DB/edge applied live by assistant (files = source-of-record);
API/UI via MANUAL_COPY_FILES → owner copies, tests, merges. Never pushed to submodules.

---

## Status board (updated 2026-09-12)

| Step | Scope | Status |
|---|---|---|
| B1 | Per-asset foundation (fan-out V2 + read route) | ✅ **DONE — owner-verified 2026-09-03** on CN-1005: Equipment tab "0/48 visits proven", 3 locked placeholders w/ Attach asset; Tasks tab "0/3 assets proven" chips |
| B3.2 | Attach-asset unlock on V2 (pulled forward from B3) | ✅ **DONE — owner-verified** via the attach-flow fix batch (see log below): placeholder → real asset replacement works end-to-end on CN-1005, coverage cap enforced, proof rows unlock |
| R | **Registry hardening R1–R7** (owner-inserted 2026-09-07, all approved) | ✅ **DONE — owner-verified 2026-09-11** ("equipment registry cards is now good"); facility registry same path by construction, no test data yet |
| B2 | Sprint 2 — forms bind (resolver + picker + gating) | 🔶 **B2.1+B2.2 done 2026-09-12** (seed owner-approved; mapping columns live) · **B2.3 done 2026-09-12** (resolver + activation trigger live, harness-proven on all 4 rungs + opt-out + idempotency; T5 caught a real edge — all 6 wizard-selected forms on the one smart_form contract are DRAFT → resolver now falls through to platform default instead of writing zero rows). **B2.4 DONE — owner-verified 2026-09-12** ("its working"; Evidence step wired into the service wizard for the first time — it was never reachable; real approved-forms picker via new GET /api/forms/templates; choice saved as config.evidence; resolver patched so upload-only blocks skip form mappings; + zero-is-a-valid-price fix owner-requested and confirmed). **Backfill done 2026-09-12**: resolver run over signia's 50 active pre-resolver contracts → 50 platform_default mappings (005). **B2.5 DELIVERED 2026-09-12**: (a) DB gate live — `m_form_submissions.event_asset_id` + BEFORE INSERT `trg_zz_submission_asset_gate` (REQUIRED / MISMATCH / PLACEHOLDER), negative-test harness 5/5 in rolled-back txn; (b) smart-forms edge v7 deployed (rebuilt from DEPLOYED v6 — repo copy had drifted): + GET /mappings, friendly 422 pre-checks, event_asset_id passthrough; (c) API GET /api/forms/mappings + event_asset_id on POST /submissions (was silently stripped by the route's whitelist — caught and fixed); (d) OperationsTab + SellerTasksTab now fall back to RESOLVED mappings when the wizard fields aren't smart_form-with-forms → fixes owner's "general form is not visible" on old contracts. **B2.5 owner-verified 2026-09-12** (screenshot: drawer shows Smart Form badge + "General Service Completion, Form #1 of 1" on CN-1005). Same day: equipment-coverage addendum delivered ("Covers: …" names on event cards + per-asset chips in drawer event rows — owner-raised "which equipment is this task for?"). ⚠️ "Open Form" is still a DEAD BUTTON by design — form-fill UI is B3.4, sequencing decision pending (pull forward vs POA order). **REMAINING IN B2: B2.6 only** |
| B3 | Sprint 7 — execution loop remainder (ticket, prove, mobile UI, invoice, report) | 🔶 **B3.1/B3.3/B3.4/B3.5/B3.6 + B2.6 ALL DELIVERED 2026-09-12** in one continuous build (owner: "until sprint 2 and 7 are completed - it will be difficult to test"). Live: migrations 007–011, edge service-execution v5 / contracts-v2 v7 / service-report v1. **B3.7 E2E harness ALL GREEN** (rolled-back txn, CN-1005): ticket in_progress w/ jtd link · gate refusals · 3 gated submissions → proofs · mid-flow attach · visit+ticket completion cascade · beyond-scope invoice · complete report. The harness caught and fixed 3 real bugs (jtd event lookup in mark-proven, composite n_jtd.block_id cast, t_service_ticket_events FK blocking jtd links → FK swap 011, a Phase-6 item pulled forward). Also fixed: TKT numbers duplicating (signia had no sequence row), drawer's assigned_to silently dropped. **Owner tested 2026-09-12: "form worked, data filled"** — the evidence capture loop works end-to-end functionally; **"UX is bad, we will review UX later"** → a dedicated UX-review pass over the execution surface (drawer, form modal, asset chips) is PARKED as its own item, owner-scheduled. Remaining full-loop checks (cascade to 3/3 → ticket completes, beyond-scope invoice, View Report, wizard chips) ride the same build — verify as encountered. Deferred within scope: real file-upload UI inside FormFillModal (require_upload is enforced server-side; no signia mapping requires upload today), D10 mobile-first sequential-card polish (form-fill works on mobile via the responsive modal) |
| B4 | Extend — WhatsApp/email touchpoints (T1→T2→T3) | ⬜ |
| C  | Sprint 5 — repair sweep (report-first) | ✅ **DONE 2026-09-12** — C.1 report delivered (Sprint-5-Repair-Report.md); owner: "we should not touch vikunatech and BBB — rest can be cancelled". C.2 applied live (migration 012): **163 of 164** stuck 'requested' appointments cancelled with audit rows, BBB's 1 kept, vikuna/vikunatechnologies/bbb2025 protected; guard `expire_stale_appointment_requests()` live on pg_cron nightly 03:00 IST (auto-expires requests 7+ days past their visit date, protected tenants excluded) — the pile cannot regrow. Date-stale events: item found empty (already swept to overdue). CN-1028–1044: annotate-only per original decision |
| A  | Cutover remainder (BBB copy → soak → flip → retire) | ✅ **BBB COPY DONE 2026-09-11** (owner go; physical backup 10 Sep 22:14 UTC as disaster net). 490 rows / 70 contracts id-preserving, 0 twins missing, ₹3,79,500 settled identical both sides; 141 allocations jtd-stamped; bridge harness-proven on BBB both directions; drift 0 across all 93 migrated contracts (Signia 23 + BBB 70); money-in surface unchanged (live settled ₹3,42,000 / 132 paid / receipts ₹3,53,100). **Soaking until 19 Sep meeting** (daily audit_dual_read_check). Note: 005 re-run needed a verification-predicate fix — 002's check also flagged V2-born allocations (jtd_id set, contract_event_id legitimately NULL); now only both-set-and-different counts as mismatch. OPEN: 4 stale pending declarations (₹15,000, dead billing_event_ids from the Aug restatement) — reject/keep is an owner call, independent of the copy |

### Progress log 4–11 Sep (between B1 and B2)

- **Attach flow made bug-free** (owner: "go ahead and make it bug free"): `replaces_item_id`
  was dropped at API + edge before RPCs that already had replacement branches — fixed in
  all four layers (UI → API → edge `contracts` v55 → RPCs); coverage cap added
  (`SLOTS_OPEN` refusal while same-category placeholder slots open);
  `unlock_placeholder_event_assets` re-issued (also refreshes asset name).
- **Attach UX polish**: slider prefill (category/type/client), direct-slider on empty
  picker, stale-picker strip, instant card refresh (`contract-details-v2` invalidation
  added to all four equipment mutations).
- **Registry hardening R1–R7** (owner approved all 7):
  R1 product ConfirmationDialog + "Deactivate" language (window.confirm removed) ·
  R2 Active/Inactive filter + Reactivate ·
  R3 server guard `ASSET_IN_CONTRACT` (409, fails closed) + UI pre-block ·
  R4 clickable CN-#### contract chips ·
  R5 client filter dropdown ·
  R6 picker three-way category matching (template-linked units no longer hidden →
  duplicate-creation trap closed) ·
  R7→**single card**: registry renders the contract view's `MachineCard` itself
  (additive optional props; contract view pixel-unchanged), with REAL aggregated
  visits state via edge `client-asset-registry` v13 (`with_contracts=true` returns
  `contracts[]` + `service_state` from `t_contract_event_assets` × events, with
  n_jtd fallback for V2-native contracts). Verified: slide 1/2/3 = 16/0 proven/
  2 overdue/due 17 Aug — identical numbers both surfaces.
- Edge deploys live: `contracts` v55, `client-asset-registry` v11→v13. No new DB migrations
  beyond the already-logged service-execution/001+002.

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
| B3.2 | ~~Attach-asset unlock on V2~~ | DB (live) | ✅ done early (2026-09-08 attach-flow batch) — owner-verified on CN-1005 |
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

## A — Cutover remainder (⚠️ window open — owner go needed)

BBB copy + bridge (same survived migrations, BBB tenant id `dd194710-…2c1f`) in the
**6–18 Sep window — open now, 19 Sep meeting is the soak deadline**. Copy early in the
window = longer soak with daily `audit_dual_read_check` before the meeting →
19 Sep meeting on V2 = retirement gate → Phase 5 flip (readers/UI) →
Phase 6 archive (30-day hold). Signia soak continues daily meanwhile (23/23 ok since 5 Sep).

---

## Standing rules for this POA
1. One step at a time; owner gate closes a step before the next opens.
2. DB/edge: applied live by assistant, file = source-of-record. API/UI: MANUAL_COPY_FILES + copy commands, owner tests before any merge commands are issued.
3. Every DB step carries a forced-rollback harness or in-transaction verification; a silent no-op is the failure mode.
4. BBB: zero contact until the owner reopens Track A.
