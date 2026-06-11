# ContractNest — SaaS → Service-as-Software Transformation Plan

> **Date:** 2026-06-11
> **Basis:** Every claim below traces to `AUDIT.md` (cited as finding #N, gap G#, journey J#, or file path). No invented endpoints, tables, or features.
> **Prime directive:** Reuse over rebuild. ContractNest's queue rails, RPC core, state machines, KT, and VaNi identity scaffolding are kept and driven; nothing proposed here is a rewrite.

---

## 2.1 The Reframe

**Today** a facility-management or med-tech service company *uses ContractNest*: a coordinator builds contracts in a 12-step wizard (J4), remembers service dates, manually opens tickets (J7), chases payments (J8), and notices expiring contracts too late (J9 — there is literally no renewal feature; the system's only expiry behavior is flipping `active→expired` the night after the contract lapses, `contracts/054`).

**After the transformation**, the customer subscribes to **outcomes**, not screens:

| The customer buys… | …delivered by | …on top of existing substrate |
|---|---|---|
| "Every service visit happens on time, evidenced, and closed" | Service Cycle Agent | `t_contract_events` ledger + PGMQ + JTD channels + tickets/evidence RPCs (findings #1, #2) |
| "No invoice goes unchased" | Service Cycle Agent (billing events) | seeded `payment_due/payment_overdue` JTD types, invoice RPCs |
| "No contract lapses unnoticed; renewals arrive pre-packaged with performance evidence" | Renewal Agent | `t_contracts.end_date/prolongation_date`, contract history, evidence tables (G7 greenfield) |
| "A new tenant is operational in minutes, catalog pre-priced from industry intelligence" | Onboarding Agent | KT with agent-ready pricing fields (finding #6), 13-step VaNi onboarding shell already shipped (finding #9) |
| "Contracts drafted, not assembled" | Contract Drafting Agent | `m_cat_blocks`/templates + `create_contract_transaction` |
| "SLA breaches caught and documented before the customer calls" | SLA Sentinel | evidence/event audit trails (G9 greenfield) |
| "RFPs generated and bids scored" | RFP Agent | RFQ record type + vendor flow (J5) |

**Unit-of-value shift.** Today the business model meters seats/features/credits (`t_bm_pricing_plan`, `t_bm_subscription_usage`, `t_bm_credit_*` — the JSONB-configurable billing engine in `ClaudeDocumentation/BusinessModel/BUSINESS_MODEL_AGENT_PRD.md` is already built for "any pricing model without code changes"). The transformation re-points that same engine at **agent-delivered outcomes**: service events closed on time, breaches caught, renewal revenue protected, contracts executed. The software stops being the product; it becomes the substrate the agents operate — and the UI becomes the supervision console.

**What does NOT change:** the RPC transactional core, the JTD delivery rails, multi-tenancy model, the catalog/KT data model, and the human's ownership of judgment calls (persona, pricing, legal terms, evidence approval — the "judgment" column of the J-table in audit §1.4).

---

## 2.2 Agent Portfolio

Roster validated against the J-table (audit §1.4). Autonomy ladder used throughout: **L0** suggest · **L1** draft-for-approval · **L2** act-and-report · **L3** fully autonomous. Every agent runs under the VaNi identity model (finding #4) and writes only through the tool layer (§2.3) — never raw table access (G1, rule 3).

### A1 — Service Cycle Agent ("the loop-closer") — **build first** (see 2.5)
- **Replaces mechanical work in:** J7 (ticket creation on due date, technician matching, reminders) + J8 (payment chasing). Zero judgment calls in the happy path — the highest (mechanical ÷ effort) ratio in the J-table, and P5's verdict: "closing the loop is essentially 2–3 pg_cron jobs + form-dispatch wiring on infrastructure already 80% built."
- **Trigger:** schedule — new pg_cron job scanning `t_contract_events WHERE scheduled_date <= now() + horizon AND status='scheduled'` (the scanner that finding #1 proves absent), enqueueing agent tasks to PGMQ.
- **Tools:** `event.update` (`update_contract_event` RPC, transition-validated against `m_event_status_transitions`), `ticket.create` (`create_service_ticket`), `notify.send` (insert `n_jtd` → auto-enqueue trigger), `forms.dispatch` (new — wire the dead `m_form_template_mappings`, G8), `invoice.get/record_payment` for billing events. All exist except `forms.dispatch`.
- **SKILL.md outline** (`skills/service-cycle/SKILL.md`): inputs (due event + contract context + KT cycle metadata), decision table (service vs billing vs spare_part event → action), escalation rules (no technician available, evidence overdue), output schema (proposed actions list).
- **Autonomy:** reminders/notifications **L2** from day one (JTD already has retry/DLQ semantics); ticket creation **L1→L2** per tenant via the existing `vani_auto_execute_types` config column; status transitions L2 (machine-validated); anything touching money (penalty, write-off) L0/L1 forever.
- **Approval gates:** agent inbox approval for ticket creation while L1; evidence review remains human (J7 judgment column).

### A2 — Onboarding Agent ("VaNi sets up your shop")
- **Replaces:** J1 mechanical steps + J2/J3 catalog seeding. The UI shell (vani-intro → vani-consent → **vani-working** → pricing-review → equipment-confirm) already ships (finding #9) — `vani-working` is today a loading screen with seeding RPCs behind it; this agent is what the screen pretends to be.
- **Trigger:** conversation/event — tenant completes `vani-consent` step (`onboardingRoutes.ts /step/complete`).
- **Tools:** `kt.query` (read KT for selected industry/resources), `catalog.block.create/bulk` (idempotency-keyed `cat-blocks` edge), pricing seed from `m_service_cycles.price_median` / `m_equipment_spare_parts.price_median` (the exact fields added for this in `20260510000000_kt_catalog_agent_fields.sql`), `onboarding.step.complete`, optional website-scrape enrichment (`groupsRoutes.ts /profiles/scrape-website` exists).
- **SKILL.md:** industry→resource-template mapping rules (the KT→Catalog conceptual mapping is already specified in `ClaudeDocumentation/onboarding/GAP_ANALYSIS.md` §2: cycles→service blocks, parts→spare blocks, median→base_price); interview questions for gaps; tenant-pricing-review handoff.
- **Autonomy:** **L1** — agent drafts the whole catalog into the test environment (`is_live=false`), tenant approves in `pricing-review`/`equipment-confirm` steps, promotion uses the existing `promote_catalog_test_to_live` gate (the one HITL pattern already in production, finding §1.5). No new approval machinery needed.
- **Gates:** pricing acceptance + persona remain human (J1 judgment column).
- **Gap named:** only 2/240 KT verticals seeded (finding #6) — the agent's usefulness scales with KT seeding (a content task using the existing `kt-research-equipment.md` skill, parallelizable).

### A3 — Renewal Agent ("revenue protection")
- **Replaces:** J9 — greenfield; no manual path exists to preserve (G7).
- **Trigger:** schedule — sibling cron watching `t_contracts.end_date - N days` (dates already computed by `trg_compute_contract_dates`).
- **Tools:** `contract.get/list`, evidence/event read tools (performance packet: completed events from `t_contract_events`, evidence from `t_service_evidence`, payment history from `t_invoices`), **new** `renewal.draft` = `create_contract_transaction` invoked with source-contract terms + server-side event computation (depends on G4 fix), `notify.send` for the renewal conversation (CNAK public-link flow already exists for counterparty access, `t_contract_access`).
- **SKILL.md:** renewal-packet composition (usage/performance evidence), price-adjustment suggestion rules (KT pricing + history), conversation cadence (T-60/T-30/T-7).
- **Autonomy:** alerts **L2**; renewal-draft contracts **L1** (draft status exists in the contract state machine); price changes **L0/L1**. Sending to counterparty: human click while L1.

### A4 — Contract Drafting Agent
- **Replaces:** J4 mechanical steps (counterparty lookup, block selection, billing arithmetic, calendar). Judgment steps (acceptance method, nomenclature, scope, send) stay human.
- **Trigger:** conversation (via Concierge A7) or template instantiation (J6 templates).
- **Tools:** `contacts.search` (`check_contact_duplicates`, contact RPCs), `catalog.blocks.list`, `templates.get` (`t_cat_templates`), `contract.create` (idempotency-keyed `create_contract_transaction`), `events.compute` (**new server-side calendar tool — the G4 fix is a prerequisite**, otherwise agent-created contracts silently get no events, finding #7), tax RPCs (`t_tax_rates`).
- **SKILL.md:** intake→draft mapping; redline conventions (draft lands in `status='draft'`, diff view in UI §2.4); block-composition rules from KT.
- **Autonomy:** **L1 permanently for send**; L2 for draft creation. Legal text is judgment by definition.

### A5 — SLA Sentinel
- **Replaces:** J10 — greenfield (G9). Requires modeling SLA terms first: today "SLA" is only a template-designer default (`PoliciesStep.tsx`), with no runtime table.
- **Trigger:** event — listens to event/ticket/evidence status changes (the `t_contract_event_audit` trail is the perception layer) + scheduled sweeps for response-time terms.
- **Tools:** event/ticket/evidence read tools, `notify.send`, **new** `sla.breach.open` (new `t_sla_terms` + `t_sla_breaches` tables, `t_` prefixed per convention), penalty-notice drafting via doc generation.
- **Autonomy:** detection+documentation **L2**; penalty/remediation notices **L1** (money + counterparty-facing).
- **Sequencing note:** depends on A1 running first (no point monitoring SLAs while service events aren't even driven).

### A6 — RFP Agent
- **Replaces:** J5 mechanical steps; adds the evaluation side that doesn't exist (no response-scoring model, audit §1.2 "missing state machines").
- **Trigger:** conversation (buyer persona).
- **Tools:** `catalog.blocks.list`, `contract.create` with `record_type='rfq'` (exists, `types/contracts.ts` RFQ flow), vendor search (`groupsRoutes.ts /tenants/search`, pgvector member search — the one place the n8n embedding path gets reused), **new** `rfp.responses.score` (needs a response/criteria model — new tables).
- **Autonomy:** generation **L1**; scoring **L0 → L1** (recommendation with rationale; award is judgment).
- **Sequencing:** last — most new schema, least built substrate.

### A7 — VaNi Concierge (the front door)
- **Role:** conversational intent router to A1–A6 + status Q&A ("what's due this week?", "show breaches"). Not itself an outcome-deliverer.
- **Build on:** `t_chat_sessions` state machine + intent routing already shipped in `group-discovery` (audit §1.5) and the `/vani/chat` UI (today sample data, J11) — replace the n8n black-box reasoning with the in-repo provider layer (§2.3), and repurpose `t_intent_definitions` (unused scaffolding, finding §1.5) as the live intent registry.
- **Autonomy:** read/query L3; any write routes through the owning agent's gates.

---

## 2.3 Agent Runtime Architecture

### Where the loop runs

**Decision: a worker process in `contractnest-api` (same repo, separate entrypoint/container), consuming PGMQ.** Not edge functions, not a new service.

- Edge functions are request/response Deno handlers with execution-time limits; the one async worker that exists (`jtd-worker`) is invoked per-minute by cron and drains a queue — fine for notification dispatch, wrong for multi-step LLM loops (long-running, needs retries across minutes, streaming, large context assembly).
- The API tier already has: the Anthropic client + skill loader (`knowledgeTreeGeneratorService.ts`), all service wrappers for every tool target, audit middleware, Sentry. The Dockerfile already runs multiple processes under supervisord (G18) — adding `node dist/agent-worker.js` is deployment-trivial now, and cleanly separable into its own Railway service later.
- Rejected: new microservice (premature; violates reuse), n8n as the runtime (G10 — off-repo, unversioned, the audit's biggest reproducibility complaint; n8n stays for what it does today until embeddings are pulled in-repo).

### Event backbone

**Decision: PGMQ + pg_cron, exactly as already deployed. No Kafka, no Redis queues, no new broker.**

- New queues (PGMQ supports many): `agent_tasks` (work items for the agent worker), `agent_dlq`. Pattern copied verbatim from `jtd-framework/003_setup_pgmq.sql` (read with visibility timeout, max-3 retry, DLQ archive, metrics RPC — all proven live).
- Producers: new pg_cron jobs (`scan_due_contract_events` every 15 min; `scan_expiring_contracts` daily — the two scanners P5 identified as the entire missing nervous system), DB triggers on watched status changes (pattern: existing `jtd_enqueue_on_insert`), API endpoints (Concierge intents), and webhook receipts.
- Justification: queue infra is **verified live** (audit, `pgmq.list_queues()`), the JTD worker proves the consume pattern, and current volume (147 tenants, 58 contract events) is orders of magnitude below Postgres-queue limits.

### Tool layer

**Decision: wrap existing API services/RPCs as typed, tenant-scoped, idempotent tools; register them in code with a DB execution ledger. Convention: VaNi Agent → Skill → Tool (no competing framework, rule 4).**

- **Definition:** one TypeScript module per tool in `contractnest-api/src/vani/tools/` exporting `{ name, description, inputSchema (zod — already a dependency in the workspace), execute(ctx, input) }`. `ctx` carries `tenant_id`, `agent_run_id`, `idempotency_key` (auto-derived as `agent_run_id:tool_call_seq` so retries are safe — the `get/set_idempotency_response` RPCs already exist, G11).
- **Naming:** `domain.verb` (`contract.create`, `event.update`, `notify.send`, `ticket.create`, `forms.dispatch`, `kt.query`, `catalog.block.bulk_create`, `renewal.draft`) — matching the inventory in audit §1.5.
- **Registry:** static code registry (typed, reviewable) + every invocation written to the revived **`t_tool_results`** table (currently unused scaffolding — turn it into the tool-call ledger it was evidently meant to be; enable RLS on it, it's flagged sensitive in P2).
- **Hard rule:** tools call the **service layer / RPCs**, never `supabase.from(...)` directly. The RPCs are where transactions, sequence numbers, history rows, and JTD enqueues already live (`create_contract_transaction` does all four) — bypassing them is how you get the JSONB-ID-bag corruption hazards in G-register.

### Memory

Per-tenant, `t_`-prefixed, RLS'd from day one (proposed migrations, new):

```sql
t_vani_agent_runs        -- id, tenant_id, agent_code, trigger_type, trigger_ref, status
                         -- (queued→planning→awaiting_approval→executing→done/failed/killed),
                         -- model_used, input_tokens, output_tokens, cost_estimate, created_at
t_vani_proposed_actions  -- id, run_id, tenant_id, tool_name, input_jsonb, rationale,
                         -- status (proposed→approved→rejected→executed→reversed),
                         -- approved_by, executed_tool_result_id, reversal_ref
t_vani_agent_memory      -- id, tenant_id, agent_code, scope_key, memory_jsonb, embedding vector,
                         -- updated_at  (pgvector already installed — finding §1.5)
```

- `t_vani_proposed_actions` **is** the approval-gate mechanism (G6) and the UX backbone (§2.4): L1 = actions stop at `proposed`; L2 = auto-`approved` with report; reversal pointers make agent writes attributable + undoable.
- Conversation state: reuse `t_chat_sessions` (state machine already there) keyed to Concierge sessions.
- Long-term shared knowledge: the **Knowledge Tree is the shared memory** — agents read it (cycles, parts, pricing, overlays) and may *propose* contributions back through the existing test→live promotion gate, never write masters directly.

### LLM routing

- Introduce the **`ACTIVE_AI_PROVIDER`** abstraction the spec already promised (G17a): `contractnest-api/src/vani/llm/provider.ts` with Anthropic (port the existing axios client from `knowledgeTreeGeneratorService.ts`, keeping its prompt-caching and token logging) + OpenAI + Gemini adapters; add what the audit found missing — retry with backoff, cross-provider fallback, streaming, and **tool-use schema support** (nothing in the codebase sends function/tool definitions today, finding §1.5).
- **Per-skill routing table** (extends, not replaces, the env var): `m_vani_skill_routing(skill_code, task_class, provider, model, max_tokens, temperature)` — cheap model for classification/intent (Concierge), strong model for drafting (A4/A3 packets), with `ACTIVE_AI_PROVIDER` as global default/override. Precedent: `KT_LLM_MODEL` is already env-driven; this generalizes it.
- Refactor the 3 KT services onto the provider layer (mechanical change — same prompts in `src/skills/*.md`).

### Safety rails (default-deny, rule 3)

1. **RLS-respecting agent identity — no blanket service-role.** Create a dedicated Postgres role/JWT identity `vani_agent` whose connections set the tenant context per task. Concretely, the agent worker connects with a non-service-role key and calls a `SECURITY DEFINER` context-setter that validates the agent's task→tenant binding and sets the **single, unified** GUC. Prerequisite: Phase-0 RLS unification (G1) — until policies converge on one mechanism and the GUC is actually set, *no* L2 write autonomy is enabled anywhere. The DB already has `is_vani_user()` (audit §1.1) and the VaNi actor row (finding #4) — extend, don't invent.
2. **Action audit:** every write = a `t_vani_proposed_actions` row + `t_tool_results` row + the existing domain audit (`t_audit_log` immutable trail; `n_jtd.performed_by_type='vani'` for notifications — the enum already exists). Attribution and reversibility by construction.
3. **Spend/rate budgets per tenant:** meter tokens/cost per run into `t_vani_agent_runs`, debit the **existing credit engine** (`t_bm_credit_balance` / `t_bm_credit_transaction` — built, live, race-condition-handled per the BM PRD). An exhausted balance pauses agents exactly the way `expire-no-credits-jtds` already pauses notifications — same pattern, same tables.
4. **Kill switch:** per-tenant per-agent autonomy level in `n_jtd_tenant_config`-style config (`t_vani_agent_config(tenant_id, agent_code, autonomy_level, enabled)`), honored at task-claim time; plus a global `m_products`-level flag. The `vani_enabled` + `vani_auto_execute_types` columns prove the pattern is already designed.
5. **Rate limits:** apply the existing edge rate-limiter configs (`_shared/rateLimiter.ts` "expensive" tier) to agent-triggering endpoints; cap per-tenant queue depth.

---

## 2.4 UX Shift

From **forms-first** to **approval-and-oversight-first**. The UI stack needs no new framework — React Query + the VaNi toast/loader system + Radix components cover all of this.

| New surface | What it is | Built on |
|---|---|---|
| **Agent Inbox** (`/vani/inbox`) | The new home screen for operators: pending `t_vani_proposed_actions` grouped by agent, one-click approve/reject with rationale shown | `/ops/cockpit` page + the JTD admin pages (`QueueMonitorPage`, `EventExplorerPage`) are the direct design ancestors |
| **Proposed-action diff/redline views** | For A4/A3: draft contract vs template/previous contract; block-level diff | `ContractPreviewPage` + `ContractReviewPage` already render contracts read-only |
| **Autonomy sliders** | Per agent × per tenant L0–L3 control writing `t_vani_agent_config` | Settings pattern: `/settings/configure/*` pages; the event-status config UI (`/settings/configure/event-statuses`) is the same shape (tenant overrides of system defaults) |
| **Run timeline** | Per-run trace: trigger → plan → tool calls → outcome, token/cost | `WorkerHealthPage` + `t_vani_agent_runs` |
| **Concierge chat** | `/vani/chat` graduated from sample data (J11) to the real front door | existing ChatPage + `t_chat_sessions` |

**Survive as fallback manual paths (unchanged):** Contract wizard (J4), catalog forms (J2/J3), ticket creation (J7) — agents propose; humans can always do it by hand. CLAUDE.md's production rules (toasts/loaders/transactions) apply to the new screens using the existing `VaNiToast` + `UnifiedLoader` components (audit §1.4 confirms they exist).

**Demoted:** the 13-step onboarding collapses to ~5 human moments (persona, consent, pricing-review, equipment-confirm, done) once A2 fills `vani-working` with real work; EventsPreviewStep becomes a server-computed read-only preview (G4); the "Coming Soon" stubs (`/vani/rules`, `/vani/webhooks` CRUD) are superseded by agent config rather than completed as-is.

---

## 2.5 Phased Roadmap

Sprint = one focused Claude Code sprint (~a working session-week of the current cadence). Estimates are honest (rule 6); ranges mean real uncertainty.

### Phase 0 — Foundation: make agent writes safe (4–6 sprints)
*Closes the H-severity blockers G1, G2-prep, G4, G5, G6, G11, G12; nothing user-visible yet.*

| # | Work | Files/modules | Exit criteria |
|---|---|---|---|
| 0.1 | **RLS unification** (G1): converge all policies on one mechanism (recommend JWT-claims + unified GUC for worker paths); set context in `tenantContext.ts` middleware + `_shared/edgeUtils.ts`; enable RLS on the 7 dormant tables; fix `contracts/037` divergence; kill always-true policies; create `vani_agent` role | new migration set; `contractnest-api/src/middleware/tenantContext.ts`; `contractnest-edge/supabase/functions/_shared/edgeUtils.ts` | cross-tenant read/write **fails** under the agent role in tests; app still green |
| 0.2 | **Test + CI harness** (G5): Jest (API) + Vitest (UI); the RLS isolation suite is the first test; `create_contract_transaction` integration test; GitHub Actions per submodule | `.github/workflows/ci.yml` ×3 | CI red on cross-tenant leak |
| 0.3 | **Server-side calendar** (G4): port `contractnest-ui/src/utils/service-contracts/contractEvents.ts` logic into an RPC/service (`events.compute`); wizard calls it for preview; `create_contract_transaction` computes when `computed_events` absent | new RPC migration; `EventsPreviewStep.tsx` reads instead of computes | API-created contract gets a full event calendar with no UI involved |
| 0.4 | **Agent schema + ledger** (G6): migrations for `t_vani_agent_runs`, `t_vani_proposed_actions`, `t_vani_agent_config`, `t_vani_agent_memory`; revive `t_tool_results` (enable RLS); `agent_tasks`/`agent_dlq` PGMQ queues | new `vani-framework/` migration dir (mirrors `jtd-framework/`) | tables live, RLS'd, queue metrics visible |
| 0.5 | **Tool layer v1** (G11): `src/vani/tools/` with the 8 already-clean tools from audit §1.5; idempotency enforced in the tool wrapper; unify response envelope (G15) at the tool boundary | `contractnest-api/src/vani/tools/*` | each tool callable from a test with replay-safety proven |
| 0.6 | **Provider layer**: `ACTIVE_AI_PROVIDER` router with Anthropic adapter (port existing client), retry/fallback/streaming/tool-use; refactor 3 KT services onto it; per-tenant token metering into credit engine (G12) | `src/vani/llm/*`; 3 KT services | KT generation works unchanged through the router; tokens debit `t_bm_credit_transaction` |
| 0.7 | Hygiene bundle (G13/G14, small): drop duplicate cron jobid, fix lead-table targets, remove stray backup table, refresh schema dump | misc | live `cron.job` has one jtd worker; leads persist |

**Demo script:** none for prospects — for the founder: a test proving an agent identity *cannot* read another tenant's contracts, and a contract created by curl that gets a real service calendar.

### Phase 1 — First outcome: Service Cycle Agent at L1/L2 (3–4 sprints)
*The pick per the J-table ratio (audit §1.4): zero judgment calls in the happy path, 80% infra pre-built, and it converts the product from event-recording to event-driving — the audit's single sharpest finding (#1).*

| # | Work | Files/modules |
|---|---|---|
| 1.1 | `scan_due_contract_events` pg_cron job → `agent_tasks`; agent worker process (claim → plan → tools → ledger) with the minimal loop (no free-form planning yet — decision-table skill) | migration; `src/vani/worker.ts`, `src/vani/agents/service-cycle/` + `SKILL.md` |
| 1.2 | Actions: enqueue `service_reminder`/`payment_due`/`appointment_reminder` JTDs (types already seeded, finally used); transition events `scheduled→overdue`; **propose** ticket creation (L1) | tools from 0.5 |
| 1.3 | Wire `forms.dispatch` (G8): due service event + `m_form_template_mappings` → form attached to proposed ticket | new tool; `smart-forms` edge fn |
| 1.4 | **Agent Inbox v1** in UI: proposed-actions list, approve/reject, run timeline; autonomy toggle (L1↔L2) per tenant for this agent | `contractnest-ui/src/pages/vani/inbox/` |

**Exit criteria:** for a pilot tenant, every due event within the horizon produces (a) the right notification, (b) an overdue transition, (c) a proposed ticket with the mapped smart form — all attributable in the ledger, reversible, kill-switchable. **Demo:** founder creates a contract dated yesterday → within 15 minutes VaNi has flagged it, drafted the ticket with the inspection form attached, and the WhatsApp reminder is in the JTD queue; approve from the inbox on a phone.

### Phase 2 — Portfolio: Onboarding + Renewal + Concierge (5–7 sprints)
- **A2 Onboarding Agent** (2–3 sprints): real work behind `vani-working`; KT→catalog bulk seed into test env; promotion gate. Needs concurrent **KT seeding content sprints** for the chosen beachhead vertical (founder decision, see Questions).
- **A3 Renewal Agent** (2 sprints): `scan_expiring_contracts` cron; renewal packet (evidence + payment history); L1 renewal-draft via `contract.create`; replaces nothing (greenfield G7).
- **A7 Concierge v1** (1–2 sprints): intent routing on `t_intent_definitions` through the provider layer (cheap model); status Q&A read-tools; routes "renew X" / "what's due" to A1/A3. n8n untouched for BBB embeddings.

**Exit criteria:** new tenant → working priced catalog in <10 minutes with human review only at pricing/equipment (the GAP_ANALYSIS vision, now real); zero contracts reach expiry without a packet 30 days prior. **Demo:** sign up a fresh tenant live on stage; ask the Concierge "what's expiring this quarter?"

### Phase 3 — Autonomy & pricing (4–6 sprints)
- **L2/L3 graduation criteria (codified, per agent per tenant):** N consecutive approvals with zero reversals over T days → eligible for next level; auto-demotion on any reversal or budget breach; all transitions logged in `t_vani_agent_config` history. (L3 only for: notifications, status transitions, ticket creation. Never for: money, legal send, master-data writes.)
- **Outcome metering:** `t_bm_subscription_usage` gains outcome counters (events closed on-time by agent, renewals initiated→won, breaches caught); pricing-plan JSONB (already model-agnostic by design) gets outcome-based plan variants; founder-facing margin dashboard (token cost vs outcome revenue per tenant).
- **A5 SLA Sentinel** (needs `t_sla_terms` modeling + A1 mature) and **A6 RFP Agent** (most new schema) enter here, 2–3 sprints each, sequenced by go-to-market need.

**Demo:** the pricing page sells "contracts kept, renewals protected" with live counters; a tenant's invoice shows outcomes delivered, not seats.

**Total honest sizing: 16–23 sprints across the four phases.** Phase 0 is non-negotiable and front-loaded; if it gets squeezed, agents must stay read-only/L0 (rule: no L2 writes before G1 closes).

---

## 2.6 Decision Log

| # | Decision | Alternatives considered | Why rejected |
|---|---|---|---|
| D1 | Agent worker lives in `contractnest-api` as a second process | (a) edge functions; (b) new microservice; (c) n8n | (a) Deno request/response + time limits unfit for long LLM loops — the existing `jtd-worker` works only because each job is a single send; (b) new repo/deploy surface for zero current scale benefit, violates reuse; (c) audit G10 — off-repo, unversioned, the opposite of attributable autonomy |
| D2 | PGMQ + pg_cron as the entire event backbone | Kafka/Redpanda; Redis Streams; Supabase Realtime | Volume is tiny (147 tenants); PGMQ is live, proven by JTD, transactional with the data it queues about; brokers add ops burden with no current win. Revisit at >10⁵ events/day |
| D3 | Tools wrap services/RPCs, never raw tables | PostgREST-direct agent access | RPCs already hold the transactions/sequences/audit/JTD side-effects (`create_contract_transaction`); raw access re-opens the JSONB-ID-bag hazards (audit §1.2) and dodges idempotency |
| D4 | RLS unification on JWT-claims (+ GUC for worker) **before** any write autonomy | Keep service-role + app-layer guards (status quo) | The audit's core risk (G1): app-layer-only isolation means one agent bug = cross-tenant write. Default-deny is rule 3; defense-in-depth is the whole point of having Postgres |
| D5 | Reuse VaNi identity + JTD config patterns (`n_system_actors`, `vani_enabled`, `performed_by_type`) | New `vn_`-prefixed framework tables for identity | The scaffolding exists and is seeded (finding #4); inventing a parallel identity scheme violates rule 4. New tables only where nothing exists (runs/proposals/memory) |
| D6 | First agent = Service Cycle (A1), not Onboarding (A2) | A2 first (flashier demo); A4 first (core product) | A1 has the best mechanical÷effort ratio (audit §1.4), zero judgment in happy path, 80% pre-built rails (P5), and it fixes the product's deepest gap (finding #1). A2 depends on KT seeding breadth (2/240) and shines more once the loop behind it runs; A4 touches legal judgment everywhere |
| D7 | Approval gate = `t_vani_proposed_actions` rows surfaced in an inbox | Inline confirm dialogs per feature; email approvals | One uniform, auditable, reversible mechanism for every agent beats N bespoke ones; mirrors the proven test→live promotion gate |
| D8 | Extend `t_bm_credit_*` for agent budgets & outcome metering | New metering subsystem | The BM engine was explicitly designed as "one billing engine, infinite models" (`BUSINESS_MODEL_AGENT_PRD.md`) and already handles races/credits; building parallel metering is rebuild-over-reuse |
| D9 | `ACTIVE_AI_PROVIDER` + per-skill routing table | Hard-pin Anthropic (status quo); LangChain/LlamaIndex adoption | Spec already promises provider-agnosticism (G17a); frameworks would import a competing abstraction (rule 4) for little gain over a ~300-line router; the existing axios client + skill files port cleanly |
| D10 | Server-side calendar as a Phase-0 item | Leave computation in UI, have agents drive a headless browser / replicate logic | Replication = guaranteed drift (UI audit §4 risk); headless browser is absurd; G4 blocks A3/A4 outright, so it pays for itself twice |
| D11 | Keep n8n for BBB embeddings short-term; pull embedding generation in-repo in Phase 2/3 | Rip out n8n in Phase 0 | BBB/FamilyKnows path works today and is off the critical path for A1–A3; replacing it early is scope creep. Pinning the embedding model in-repo stays on the register (G10) |
| D12 | UI evolves to inbox-first; wizards retained as fallback | Deprecate wizards | Manual paths are the L0 safety floor and the trust-building comparison surface; deletion buys nothing |

---

## Questions for Charan

1. **Beachhead vertical for the agent launch?** KT has only HVAC + Ventilator seeded (finding #6). A2's magic and A1's KT-informed scheduling are only as good as the vertical's seed depth. **Recommended default: facility management / HVAC AMC** — deepest seed, clearest recurring service cycles, Indian SMB AMC market fits the JTD/WhatsApp rails already built.
2. **Autonomy ceiling policy?** Plan assumes: L3 allowed only for notifications/status-transitions/ticket-creation; money and legal-send capped at L1 forever. Confirm or tighten. **Default: as stated.**
3. **Pricing model for outcomes?** Options: (a) keep subscription + meter outcomes as overage credits (lowest disruption — reuses `t_bm_*` as-is), (b) per-outcome pricing tiers, (c) hybrid base+outcomes. **Default: (a) for the pilot cohort, decide (b)/(c) with Phase-3 data.**
4. **RLS unification mechanism:** JWT-claims everywhere (cleaner for PostgREST/agents, bigger one-time migration) vs unified GUC (smaller diff, needs disciplined `set_config` everywhere)? **Default: JWT-claims primary + GUC for the worker, per D4.** This is a one-way door — needs your sign-off before sprint 0.1.
5. **n8n's future:** keep as the BBB/FamilyKnows engine indefinitely, or schedule full in-repo replacement in Phase 3? **Default: keep until Phase 3, then decide with usage data.**
6. **Pilot tenants:** which 2–3 real tenants (of the 147) get the Phase-1 Service Cycle Agent at L1? Need ones with active contracts carrying future `t_contract_events` (only 58 events exist platform-wide today — the pilot may need seeded/realistic contracts first).
7. **Phase-0 budget reality check:** 4–6 sprints of pure foundation with no demo-able feature. Confirm appetite, or accept the documented risk of running agents on app-layer-only isolation (not recommended; see D4).
