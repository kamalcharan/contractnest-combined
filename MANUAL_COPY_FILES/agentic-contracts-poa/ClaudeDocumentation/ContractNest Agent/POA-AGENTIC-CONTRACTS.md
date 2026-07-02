# POA — Agentic Contracts & Templates ("Service as a Software")

**Date:** 2026-07-02
**Status:** PLAN — approved for discussion, no code yet
**Supersedes:** the reverted "recipe/slot" and "recommender" attempts (see `agenticAI audit/AGENT_BUILD_RETRO_AND_HANDOFF.md`)
**Companion docs:** `ContractNest Agent/ARCHITECTURE.md` · `agenticAI audit/P5` · Vikuna LLM Strategy v1.0 · Vikuna Infrastructure v3.0

---

## 0. Decisions locked (from discussion)

| Decision | Call |
|---|---|
| Scope | **Composer + Runtime Loop together** — drafting intelligence AND contracts that execute themselves |
| Review surface | **Pre-fill the existing ContractWizard** first; dedicated copilot page (prototype 03) only after the brain is proven real |
| Intent entry (v1) | **In-app intent box** → **renewal auto-draft** (same composer, proactive) → WhatsApp later |
| LLM placement | **`contractnest-api` services** — follows the KG-builder precedent (`knowledgeTreeGeneratorService.ts` already calls its LLM from here) |
| Model | **Qwen3 on the Vikuna LLM VPS** (OpenAI-compatible endpoint), swappable via env to 8B / Vikuna-LLM-1.0 after the KVM4 upgrade (due end-July) |
| Data flywheel | **`vn_interaction_log` wired from the first call**, not retrofitted (LLM Strategy v1.0 §3–4) |

## 1. Non-negotiables (from the retro)

1. **No UX shells with mocked brains.** Every visible "VaNi did X" is backed by a real model call or real deterministic logic. No `setTimeout` theater.
2. **Nothing is global.** All catalog artifacts are tenant-scoped. A recipe is the act of *picking* tenant blocks — never a new entity.
3. **Filtering ≠ agent.** The agent answers "*what should this contract have, and what's missing?*" — not "which blocks match a dropdown."
4. **Deterministic core, agentic edge.** The engine computes calendars, prices, gates; the LLM handles language, resolution, ranking, gap explanation. The agent proposes; the engine enforces.
5. **No prod DB changes without explicit owner go.** Nothing is "zero risk."

## 2. Division of labor

| Deterministic engine (SQL/RPC/api — ms, correct, free) | Qwen (small schema-validated JSON calls, `/no_think`, temp 0.3) |
|---|---|
| Shortlist candidate blocks from `m_cat_blocks` by asset / activity / coverage / nomenclature | Parse intent: "1-yr AMC for Kamal, quarterly billing" → structured intent JSON |
| Derive the forward event calendar server-side | Disambiguate entities ("kamal" → which contact) in natural language |
| Price from `config.pricingRecords`, escalation, tax | Select from the shortlist + **explain gaps** vs template / last year's contract |
| Enforce RBAC, risk tiers, credit reserve/commit/release | Draft human-facing words: summaries, renewal emails, WhatsApp replies |
| Scan due events, spawn tickets, enqueue JTDs | Classify inbound messages → intent (later phase) |

The LLM never free-generates a contract. It makes small decisions inside a deterministic assembly line — correct for the model size, fast on CPU, and exactly the prompt→JSON shape that fine-tunes into ContractNest-LLM.

## 3. Phases

### Phase 0 — Foundations (everything else reuses this)

**0.1 `vaniLLMClient` service** (`contractnest-api/src/services/`)
- OpenAI-compatible client: `VANI_LLM_URL`, `VANI_LLM_KEY`, `VANI_LLM_MODEL` from env. Key never in repo, never in browser — all calls server-side.
- JSON-schema-constrained outputs, timeouts, retry, graceful degradation (LLM down → composer still drafts deterministically, minus language niceties).

**0.2 `vn_interaction_log` + logging middleware** (LLM Strategy §3.1, §4.3)
- Migration in the ContractNest DB; `interactionLogger` wraps **every** `vaniLLMClient` call: system_prompt, user_input, context_payload, response, tokens, latency.
- Quality signals: `was_edited` / `edited_response` (user changed the draft before sending — gold), `was_accepted` (approve & send), `user_rating` (thumbs widget, Phase 3).

**0.3 Server-side calendar derivation — the single biggest unlock (P5)**
- Port the forward-calendar computation out of the React wizard (`EventsPreviewStep.tsx`, `BillingViewStep.tsx`, `types/contractEvents.ts`) into a backend `deriveContractEvents(terms, blocks)` (api service or Postgres RPC — decide at build time by where `create_contract_transaction` needs it).
- **Parity test:** for existing contracts, backend output must match what the UI computed. Until this exists, no agent can create a contract.

**Acceptance (Phase 0):** a contract can be fully drafted via API — correct blocks, prices, event calendar — with zero UI involvement; every LLM call appears in `vn_interaction_log`.

### Phase 1 — The Contract Composer (intent → reviewable draft)

**Pipeline** (`contractComposerService` in `contractnest-api`):
```
intent text ("1-year AMC for Kamal Industries, quarterly billing")
  1. PARSE      LLM → {contract_type, term, billing_cycle, buyer_ref, special_asks}
  2. RESOLVE    deterministic match on t_contacts; ambiguity → LLM-phrased disambiguation question
  3. SHORTLIST  SQL over tenant's m_cat_blocks (+ t_cat_templates + buyer's prior contracts)
  4. REASON     LLM over shortlist: select blocks, flag gaps
                ("no emergency call-out block — last year's Kamal contract had one")
  5. ASSEMBLE   deterministic: prices, escalation, tax, deriveContractEvents()
  6. DRAFT      t_contracts (status=draft) + blocks + computed events, via existing
                contracts edge function / create_contract_transaction path
  7. PRESENT    draft opens in the existing ContractWizard, every step pre-filled;
                user reviews / edits (→ was_edited) / sends (→ was_accepted)
```
- Entry: an intent box on the Contracts surface. Async by design — drafting takes seconds; the draft lands, no blocking spinner.
- Templates' role: raw material the composer drafts *from* (template = saved pick). No template-authoring agent.

**Acceptance (the "real brain" test):** from one sentence, a resolved buyer, correctly selected blocks, a priced 12-visit calendar, **and at least one genuine gap flag** that pure filtering could not produce. Reviewer edits are captured as training gold.

### Phase 2 — The Runtime Loop (the "Service as a Software" half)

Per P5: perception (`t_contract_events`) and actuation (PGMQ + `jtd-worker` + seeded JTD types) exist; the connecting nervous system doesn't. Build the scanners:

- **2.1 Due-event scanner** (pg_cron, hourly/daily): `t_contract_events WHERE scheduled_date <= now()+window AND status='scheduled'` → transition status · enqueue `service_reminder` / `payment_due` / `appointment_reminder` JTDs · spawn service ticket for service events · dispatch mapped SmartForm.
- **2.2 Overdue transitions:** events past date → `overdue` (today it's only computed at read time).
- **2.3 Renewal watcher:** `t_contracts` approaching `end_date`/`prolongation_date` → **calls the Phase-1 composer** to draft the renewal (last year + escalation) → lands as a proposed action awaiting approval. First genuinely *proactive* VaNi act; "one engine, two initiators" made real.
- **2.4 Ops cleanup:** de-duplicate the double `jtd-worker` cron (jobid 1 & 3).

All DB/cron changes ship as migrations reviewed and applied by owner — **never auto-applied to prod**.

**Acceptance:** an accepted contract with an event due tomorrow produces a reminder + service ticket with zero human action; a contract expiring in 30 days produces a drafted renewal in the approval queue.

### Phase 3 — Approval envelope & trust hardening

- Proposed-action record (intent, diff/preview, gates, expiry, audit ref) + approve/reject flow; risk gate: **sending is always human-approved**; credit reserve→commit→release on VaNi-initiated jobs.
- Feedback widget (thumbs up/down, edit capture) on drafts — completes the flywheel signals.
- Audit: every agent step `actor=VaNi` in `t_audit_log`.

### Phase 4 — Channels & surface upgrades (after the brain is proven)

- WhatsApp inbound → intent → **same composer** (ARCHITECTURE §6 flagship trace).
- Dedicated copilot review page (prototype 03) with Human⇄VaNi switch.
- VaNi Inbox, Autonomy & Credits page. A2A much later.

## 4. Explicitly OUT of scope

- Anything "global" (global templates, global designer revival — fate of that page is a separate decision)
- Template-authoring agent · Contacts/AR/Service agent domains (later, per ARCHITECTURE §12)
- RLS/grants changes (separate, owner-executed task — see retro §2 guardrail)

## 5. Infra prerequisites & risks

| Item | Note |
|---|---|
| KVM4 upgrade (end July) | Until then: keep calls compact; raise `--ctx-size` to 16384 (it is shared across the 4 slots — 4096 total ≈ 1K/slot today), KV cache q8_0 |
| Model quality risk | 4B may be weak at nuanced gap reasoning — **measured** via `was_edited` rate in the log, not guessed; upgrade path 8B → Vikuna-LLM-1.0 is an env swap |
| LLM VPS is a single point | Composer degrades gracefully to deterministic-only drafting if LLM is down |
| Secrets | Qwen key/env only in backend env vars; infra doc credentials must never enter the repo |

## 6. Why this is benchmark material (the value stack)

1. **Autonomy loop** — contracts that run themselves. Pure value, no LLM required, absent in the field-service competitor set.
2. **Knowledge asset** — 513 checkpoints, cycles, compliance defaults, KT price bands make drafts *correct*, not just fluent. Generic-LLM competitors can't replicate the data.
3. **Data flywheel** — every draft, edit, and approval logged from day one → ContractNest-LLM (Strategy v1.0: 300+ interactions by M9; licensable at 18–24 mo). The moat compounds as a byproduct of normal usage.

## 7. Build order & delivery

Phases ship in order; each is independently demoable. Delivery per CLAUDE.md: full-file copies under `MANUAL_COPY_FILES/<batch>/` + `COPY_INSTRUCTIONS.txt`; Phase-2-style merge commands only after owner confirms local testing. DB migrations always owner-applied.

Suggested batches: `agentic-p0-foundations` → `agentic-p1-composer` → `agentic-p2-runtime-loop` → `agentic-p3-envelope`.
