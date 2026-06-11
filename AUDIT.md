# ContractNest — SaaS → Service-as-Software Audit

> **Date:** 2026-06-11
> **Auditor:** Claude Code (Principal Platform Architect session)
> **Scope:** `contractnest-api` (HEAD 31b0b1d), `contractnest-ui` (HEAD 6555c3d), `contractnest-edge` (HEAD c3dbf9e), `ClaudeDocumentation` (HEAD a6d2c59), workspace-root `supabase/` + `index.ts`
> **Method:** Static code inspection of all four submodules at current HEAD, cross-checked against the **live Supabase database** (read-only: `cron.job`, `pgmq.list_queues()`, `pg_tables`, `pg_policies`, row counts) and against the prior audit series in `ClaudeDocumentation/agenticAI audit/` (P1–P6, dated 2026-05-29), which was treated as stated intent and re-verified, not trusted. Where documentation and code diverge, code wins and the divergence is logged in §1.6.

---

## Executive Summary

ContractNest is a real, live multi-tenant service-contract platform: **153 public tables** (live count, up from 137 at the May audit), 147 tenants, a working 12-step contract wizard, a commitment ledger (`t_contract_events`), an invoicing pipeline, a queue-and-worker notification framework (PGMQ + pg_cron + `jtd-worker` edge function, verified live), a seeded Knowledge Tree for 2 of ~240 equipment types, and a genuinely operational Claude-powered generation pipeline for that Knowledge Tree.

**What it is today:** software that *records* commitments. When a contract activates, the system materializes every future service visit and billing milestone into `t_contract_events` with exact dates — and then nothing watches the calendar. Verified live on 2026-06-11: `cron.job` contains exactly 5 jobs (JTD queue drain ×2 — a duplicate, `cleanup-tool-results`, `expire-no-credits-jtds`, `auto-expire-contracts-nightly`). There is **no job that scans `t_contract_events.scheduled_date`**. No reminder fires, no service ticket spawns, no renewal alert exists. The platform builds the calendar, then stops watching it (`ClaudeDocumentation/agenticAI audit/P5`, re-verified against live `cron.job` this session).

**What it is not yet:** an agent platform. The AI footprint is three single-shot Anthropic services in the API (`contractnest-api/src/services/knowledgeTreeGeneratorService.ts`, `overlaysGeneratorService.ts`, `complianceTaggerService.ts`) plus an opaque external n8n instance for embeddings/chat. There is no `ACTIVE_AI_PROVIDER` switch (grep: 0 hits in code, 7 in docs), no tool/function-calling registry, no plan→act→observe loop, no streaming, no cost budgeting. `t_tool_results` and `t_intent_definitions` exist as unused scaffolding.

**The paradox that shapes the whole plan:** the *hard* infrastructure for autonomy is mostly built — PGMQ, pg_cron, a minute-cadence worker, channel handlers (email/SMS/WhatsApp), an immutable audit log, an idempotency framework, an event-status state machine with tenant overrides, a credit/billing engine, and even a **registered agent identity** (`n_system_actors` seeds VaNi as user `00000000-0000-0000-0000-000000000001`, `n_jtd.performed_by_type` accepts `'vani'`, `n_jtd_tenant_config` has `vani_enabled` + `vani_auto_execute_types`, and `m_event_status_config.source` accepts `'vani'`). What's missing is the *connecting* logic — and one dangerous foundation flaw: **tenant isolation is not database-enforced**. All 44 edge functions run on `SUPABASE_SERVICE_ROLE_KEY` (RLS bypassed), the RLS policies that do exist use three incompatible mechanisms, and the GUC they reference is never set (grep `set_config('app.` : 0 hits in API/edge, re-verified this session). An autonomous agent writing through today's data path would have **no database-level tenant guardrail**.

**Bottom line:** ContractNest is ~75% of a Service-as-Software substrate. The transformation is not a rewrite; it is (1) closing the tenant-isolation hole, (2) closing the commitment→action loop, (3) wrapping the existing API/RPC surface as typed agent tools, and (4) putting a small, auditable agent runtime on the queue rails that already exist.

### Top 10 Findings That Shape the Transformation

| # | Finding | Evidence |
|---|---------|----------|
| 1 | **The commitment ledger exists; the scanner doesn't.** `t_contract_events` stores every future service/billing event with `scheduled_date` and status `scheduled→in_progress→completed/cancelled/overdue`, but no cron scans it. "Overdue" is computed only at read time for dashboards. | `contractnest-edge/supabase/migrations/contracts/012_contract_events_tables.sql`; live `cron.job` (5 jobs, none scan events); `get_contract_events_date_summary` |
| 2 | **The async rails are real and live.** PGMQ queues `jtd_queue`/`jtd_dlq` (verified live), minute-cadence `jtd-worker` with batch read, visibility timeout, max-3 retries and DLQ archiving, plus channel handlers for email/SMS/WhatsApp/in-app. The JTD catalog already seeds `service_reminder`, `payment_due`, `payment_overdue`, `appointment_reminder` event types — nothing enqueues them. | `contractnest-edge/supabase/functions/jtd-worker/`; `contractnest-edge/supabase/migrations/jtd-framework/003_setup_pgmq.sql`, `002_seed_jtd_master_data.sql` |
| 3 | **RLS is decorative.** All 44 edge functions create clients with `SUPABASE_SERVICE_ROLE_KEY` (`contractnest-edge/supabase/functions/_shared/edgeUtils.ts`), bypassing every policy. Policies that exist split across 3 mechanisms (`app.current_tenant_id` GUC, divergent `app.tenant_id` GUC in `contracts/037_asset_registry_tables.sql`, `request.jwt.claims`), and `set_config('app.*')` appears **zero** times in API/edge code. 7 tables have policies with RLS disabled. Isolation lives entirely in app/RPC code. | P2 audit re-verified; grep this session: only hit is `scripts/reference/patterns-rls.md` (a reference doc) |
| 4 | **VaNi already has a database identity — but no brain.** `n_system_actors` seeds VaNi (UUID `…0001`); `n_jtd.performed_by_type ∈ {user, vani, system, webhook}`; per-tenant `vani_enabled` + `vani_auto_execute_types` config exists. This is exactly the agent-identity + kill-switch scaffolding an agent runtime needs, lying unused. | `contractnest-edge/supabase/migrations/jtd-framework/001_create_jtd_master_tables.sql` |
| 5 | **No agent runtime, no provider abstraction.** Three API services hardcode Anthropic (`claude-sonnet-4-6` via `KT_LLM_MODEL`, prompt-caching beta, token logging — but no retry, no fallback, no streaming, no tool-use schema). VaNi chat reasoning lives in an external n8n instance (`n8n.srv1096269.hstgr.cloud`) whose workflows and embedding model are outside source control. `ACTIVE_AI_PROVIDER` exists only in docs. | `contractnest-api/src/services/knowledgeTreeGeneratorService.ts:50-110`; `contractnest-api/src/config/VaNiN8NConfig.ts`; `contractnest-edge/supabase/functions/group-discovery/handlers/search.ts` |
| 6 | **The Knowledge Tree is real and was deliberately made agent-ready.** HVAC (11 variants/40 parts/18 checkpoints/10 cycles) and Ventilator (6/32/19/10) are seeded; 238 items remain. Migration `20260510000000_kt_catalog_agent_fields.sql` added `service_name`, `catalog_name`, and geo-aware `price_min/median/max` to KT tables explicitly so an Onboarding/Template agent can auto-populate tenant catalogs. The intent is on record in `ClaudeDocumentation/onboarding/GAP_ANALYSIS.md` ("Onboarding Agent runs at signup … < 5 minutes, zero manual entry"). | `ClaudeDocumentation/KnowledgeTree/README.md`; `contractnest-edge/supabase/migrations/20260510000000_kt_catalog_agent_fields.sql` |
| 7 | **The calendar intelligence is trapped in the browser.** The forward calendar (service visits + billing cycles) is computed client-side in the React wizard (`contractnest-ui/src/utils/service-contracts/contractEvents.ts`, `EventsPreviewStep.tsx`, `BillingViewStep.tsx`) and passed to `create_contract_transaction` as a `computed_events` JSONB payload. An agent (or any API caller) that creates a contract without the UI gets **no events**. Billing/tax math is similarly computed client-side. | `contractnest-edge/supabase/migrations/contracts/014_add_computed_events_to_create_rpc.sql`; UI files cited |
| 8 | **Renewals and SLA monitoring don't exist.** No renewal wizard, RPC, endpoint, or cron (the only expiry logic is the nightly `auto_expire_contracts` flipping `active→expired` *after* lapse). SLA defaults are configurable in the template designer (`PoliciesStep.tsx`) but nothing monitors or escalates at runtime. These are greenfield agent territory with no legacy path to preserve. | `contractnest-edge/supabase/migrations/contracts/054_end_date_prolongation_auto_expire.sql`; UI audit: renewal journey NOT FOUND in `contractnest-ui/src/App.tsx` routes |
| 9 | **Onboarding has already pivoted toward the agent model.** The UI now ships a 13-step VaNi-branded onboarding (`vani-intro → user-profile → business-details → persona-selection → theme-selection → industry-selection → resource-pick → vani-consent → vani-working → pricing-review → equipment-confirm → done`) replacing the legacy 9-step flow — including an explicit AI-consent step and a "VaNi working" seeding step. The narrative shift to agent-led onboarding is already in production UI; the agent behind it is what's missing. | `contractnest-ui/src/pages/onboarding/index.tsx`, `src/pages/onboarding/steps/*` (13 files), `src/components/onboarding/OnboardingLayout.tsx` |
| 10 | **Zero tests, no CI, stale schema dump.** No `*.test.*`/`*.spec.*` anywhere (verified this session: 0 files), no `.github/workflows` in any submodule, `contractnest-api/package.json` test script is `exit 1`, and the committed `contractnest_schema.sql` reflects ~73 tables vs 153 live. Enforcement-critical changes (RLS, transactions, agent writes) are currently unverifiable. | `contractnest-api/package.json:19`; find/grep this session |

---

## 1.1 Architecture Map

### Runtime topology

```
Browser (React 19 / Vite / React Router 7)
   │  Axios, base URL VITE_API_URL
   │  Headers: Authorization Bearer, x-tenant-id, x-session-id, x-environment (live|test),
   │           x-product (contractnest|familyknows), x-idempotency-key (UUID v4)
   ▼
Express API (contractnest-api, port 5000)            ← Dockerfile bundles nginx+redis+n8n via supervisord
   │  44 route files → controllers → services
   │  Proxies most operations to edge functions (HMAC-signed via INTERNAL_SIGNING_SECRET)
   │  Direct Anthropic calls for KT generation; n8n webhooks for VaNi/BBB
   ▼
Supabase Edge Functions (contractnest-edge, 44 Deno functions, functions/v1)
   │  ALL initialize a service-role client (_shared/edgeUtils.ts) → RLS bypassed
   │  Call Postgres RPCs (create_contract_transaction, etc.) or tables directly
   ▼
Postgres 15 (Supabase, ap-south-1) — 153 public tables, pgmq, pg_cron, pg_net, pgvector, pg_trgm
   ▲
   └─ pg_cron (5 jobs) → invoke_jtd_worker() → jtd-worker edge fn → MSG91/Gupshup/SendGrid

External: n8n (n8n.srv1096269.hstgr.cloud) — embeddings, intent detection, chat agent (opaque, off-repo)
          Razorpay → /payment-webhook edge fn (public)
```

- **API entry:** `contractnest-api/src/index.ts` (port `process.env.PORT || 5000`; middleware order: CORS → helmet → compression → productContext → tenantContext → storage routes → morgan → body parsers → routers).
- **UI API client:** `contractnest-ui/src/services/api.ts` (569 lines) — interceptors add auth/tenant/product headers, idempotency helpers (`postWithIdempotency` et al.), 409 `VERSION_CONFLICT` optimistic-lock detection, maintenance/session-conflict handling.
- **Three UI paths bypass the API**: Supabase auth directly (`components/auth/LockScreen.tsx`, acceptable), public lead capture inserting into `leads_contractnest` from the browser (`components/playground/LeadCaptureForm.tsx`, `components/CRO/UrgencyElements.tsx`), and Knowledge Tree hooks calling edge functions directly (`hooks/queries/useKnowledgeTree.ts`).

### Auth flow end-to-end

1. **Issuance:** Supabase Auth issues JWTs; the API never mints contract-of-record tokens itself. Login/refresh proxied through `contractnest-api/src/routes/auth.ts` → `auth` edge function.
2. **Validation:** `contractnest-api/src/middleware/auth.ts:60-161` — Bearer token → `supabaseClient.auth.getUser(token)`, fallback to edge-function verification; `requireRole` calls a `/tenant-roles/check` edge function.
3. **Tenant resolution:** `contractnest-api/src/middleware/tenantContext.ts` — `x-tenant-id` header (fallback: path param), copied onto the request and into Sentry context. **It is never pushed into Postgres** (`set_config` absent), so it is an app-layer convention, not a DB-enforced context.
4. **RLS enforcement point:** nominally Postgres policies; **actually nowhere** for the write path, because edge functions use the service-role key (finding #3). The DB helper functions for a JWT-claims model exist (`has_tenant_access`, `is_tenant_admin`, `get_current_tenant_id`, and notably `is_vani_user` — `contractnest-api/contractnest_schema.sql`) but the data path doesn't exercise them.
5. **Public surfaces:** CNAK contract access (`/api/contracts/public/validate|respond`, secret-code gated; `contractnest-api/src/routes/contractRoutes.ts:28-46`), Razorpay webhook (tenant resolved from payload notes; `contractnest-edge/supabase/functions/payment-webhook/`), public vCards (`cardProxyRoutes.ts`).

### Deployment artifacts

| Artifact | Location | Notes |
|---|---|---|
| API Dockerfile | `contractnest-api/Dockerfile` | node:18-alpine + **redis + nginx + n8n main + n8n worker under supervisord in one container** — a monolith container |
| API compose | `contractnest-api/docker-compose.yml` | splits api/redis/n8n-main/n8n-worker (Bull/Redis queue mode); no healthchecks |
| Railway | `contractnest-api/railway.toml` | NIXPACKS, points at compose |
| UI | `contractnest-ui/Dockerfile`, `nginx.conf`, `Docker-compose.yml` | static Vite build behind nginx |
| Edge | `contractnest-edge/supabase/` | Supabase-hosted; migrations under `supabase/migrations/{contracts,jtd-framework,catalog-studio,smart-forms,onboarding,sequence-numbers,p05a-industry-hierarchy,…}` |
| CI | **none** | no `.github/workflows` in any submodule |

---

## 1.2 Data Model Inventory

Live DB: **153 public tables, 119 with RLS enabled, 328 policies** (queried 2026-06-11). The committed dump `contractnest-api/contractnest_schema.sql` is stale (~73 tables) — treat migrations + live DB as truth.

### Grouping by prefix (live table list, this session)

| Group | Count | Examples | Notes |
|---|---|---|---|
| `m_*` master/global | 41 | `m_cat_blocks`, `m_catalog_resource_templates` (240 rows), `m_equipment_variants/_spare_parts/_checkpoints`, `m_checkpoint_values/_variant_map`, `m_spare_part_variant_map`, `m_service_cycles`, `m_context_overlays`, `m_knowledge_tree_snapshots`, `m_form_templates`, `m_event_status_config/_transitions`, `m_products`, `m_permissions` | ⚠️ Convention drift: `m_cat_blocks` has `tenant_id` FK (tenant data in an `m_` table) while `t_cat_templates` holds global template designs; `m_event_status_config/_transitions` hold per-tenant rows (1,976/2,888) with RLS off |
| `t_*` tenant | 88 | `t_contracts`, `t_contract_blocks/_events/_event_audit/_history/_access/_assets`, `t_invoices`, `t_service_tickets/_ticket_events`, `t_service_evidence`, `t_client_asset_registry`, `t_equipment`, `t_catalog_*`, `t_tax_*`, `t_bm_*` (billing model), `t_user_*`, `t_tenant_*`, `t_idempotency_keys`, `t_audit_logs` | The operational core; ~170 FK constraints (P2) |
| `n_*` notification/JTD framework | 17 | `n_jtd`, `n_jtd_templates/_statuses/_status_flows/_channels/_event_types/_tenant_config`, `n_system_actors` | The closest thing to a `vn_` framework prefix; **VaNi actor + per-tenant `vani_enabled` live here**. RLS largely off (app-filtered) |
| `c_*` legacy categories | 2 | `c_category_master/details` | one of **three** parallel category systems (`c_`, `m_`, `t_`) |
| `kt_*` | 2 | `kt_compliance_defaults`, `kt_equipment_meta` | RLS enabled with **zero policies** = deny-all to non-service-role |
| unprefixed / cross-product | 5 | `leads`, `leads_contractnest`, `familyknows_*`, `api_idempotency`, `t_contacts_classification_backup_20260128` | stray backup table has no PK |

**Verdict on the stated `m_`/`t_` convention:** holds in spirit, violated in detail (`m_cat_blocks` tenant-scoped; `t_cat_templates` global; `m_event_status_*` tenant rows). No `vn_` prefix exists anywhere; `n_*` is the de-facto framework prefix.

### Knowledge Tree: implemented vs PRD

Implemented exactly as the PRD's table list (`ClaudeDocumentation/KnowledgeTree/README.md`): `m_equipment_variants`, `m_equipment_spare_parts`, `m_spare_part_variant_map`, `m_equipment_checkpoints`, `m_checkpoint_values`, `m_checkpoint_variant_map`, `m_service_cycles`, `m_context_overlays`, plus `m_knowledge_tree_snapshots` and tenant overrides (`t_custom_checkpoints/_values`, `t_custom_spare_parts`, `t_custom_variants`, `t_cycle_overrides`, `t_equipment`).

- **Junctions present:** spare-part↔variant, checkpoint↔variant (with threshold overrides), category↔industry, resource-template↔industry (`m_catalog_resource_template_industries`, 296 rows).
- **Seeded verticals:** HVAC System and Ventilator only (per `ClaudeDocumentation/KnowledgeTree/README.md` seed-status table); **238 of ~240 resource templates unseeded**.
- **Agent-readiness fields (post-PRD addition):** `m_equipment_checkpoints.service_name`, `m_service_cycles.catalog_name` + `price_min/median/max/currency/geo`, `m_equipment_spare_parts.price_*` — added by `contractnest-edge/supabase/migrations/20260510000000_kt_catalog_agent_fields.sql` for the planned Onboarding/Template agents.
- **Human gate already in place:** AI output lands in a test environment (`is_live` flag) and requires explicit promotion via `promote_catalog_test_to_live` / `copy_catalog_live_to_test` RPCs (`contractnest-edge/supabase/migrations/catalog-studio/006_add_is_live_column.sql`). This is the platform's one real human-in-the-loop approval pattern — the template for every future agent gate.

### State-machine candidates (future agent work surfaces)

| Entity | Table.column | Values | Enforcement | Audit |
|---|---|---|---|---|
| Contract | `t_contracts.status` | draft, sent, accepted, confirmed, active, completed, cancelled, expired | RPC logic (`create_contract_transaction`, `respond_to_contract`); ⚠️ case-inconsistent comparisons in some RPCs ('Cancelled' vs 'cancelled', P3) | `t_contract_history` |
| Contract event | `t_contract_events.status` | scheduled → in_progress → completed / cancelled / overdue | `update_contract_event` RPC + **configurable transitions in `m_event_status_transitions`** (tenant-overridable, `requires_reason`/`requires_evidence` flags, `source` enum includes `'vani'`) | `t_contract_event_audit` (per-field) |
| Service ticket | `t_service_tickets.status` | created → assigned → in_progress → evidence_uploaded → completed / cancelled | RPCs (`create_service_ticket` etc.) | `t_audit_log` (immutable) |
| Service evidence | `t_service_evidence.status` | draft, submitted, verified, rejected | RPCs (`contracts/027_service_evidence_rpcs.sql`) | `t_audit_log` |
| Invoice | `t_invoices.status` | unpaid, partially_paid, paid, overdue, cancelled (+ writeoff path) | payment RPCs (`contracts/006`, `007`, `045`) | receipts + audit |
| JTD job | `n_jtd.status_code` | created → pending → queued → executing → sent → delivered / failed | trigger `jtd_enqueue_on_insert` + `n_jtd_status_flows` | `n_jtd_status_history` |
| Form template | `m_form_templates.status` | draft → in_review → approved → past | admin API | columns |
| Form submission | `m_form_submissions.status` | draft → submitted → reviewed → approved/rejected | RPCs (`smart-forms/003`) | columns |
| Invitation | `t_user_invitations.status` | pending, sent, resent, expired (+accepted/rejected) | trigger `check_invitation_expiry` | `t_invitation_audit_log` |
| Subscription | `t_bm_tenant_subscription.status` | active, suspended, cancelled | BM RPCs | `t_bm_billing_event` |

**Missing state machines (no table/column at all):** renewal lifecycle, SLA/breach lifecycle, RFP evaluation lifecycle (RFQ exists only as `t_contracts.record_type='rfq'` with a status flow; no response-scoring model).

### RLS coverage summary (live: 119/153 enabled, 328 policies)

- **Three isolation mechanisms in force:** `current_setting('app.current_tenant_id')` (contracts core, ~25 policies), `current_setting('app.tenant_id')` (asset-registry trio — divergent, from `contracts/037_asset_registry_tables.sql`), `request.jwt.claims->>'tenant_id'` (catalog/equipment/forms), plus EXISTS-subqueries on `t_user_tenants` (~120 policies). Neither GUC is ever set by any caller.
- **Dormant:** policies defined but RLS disabled on `t_business_groups`, `t_group_memberships`, `t_category_master/details/resources_master`, `leads`, `leads_contractnest`.
- **Deny-all:** RLS on, zero policies: `kt_compliance_defaults`, `kt_equipment_meta`, `t_seed_logs`.
- **Always-true policies:** 15 (incl. `t_contract_payment_events`, `t_tax_settings` service bypass, `m_products`).
- **Tenant data with RLS off:** `m_event_status_config` (1,976 rows), `m_event_status_transitions` (2,888), `t_idempotency_keys`, JTD tables.
- **JSONB ID-bags without FKs (agent-write hazards):** `t_contracts.selected_tax_rate_ids`, `t_invoices.block_ids`, `t_contracts.evidence_selected_forms`, `t_contacts.parent_contact_ids`, `m_cat_blocks.knowledge_tree_ref` (P2, structure unchanged).

### Queue / audit / idempotency infrastructure

- **PGMQ:** `jtd_queue` + `jtd_dlq` (verified live). Helpers `jtd_read_queue`, `jtd_delete_message`, `jtd_archive_to_dlq`, `jtd_queue_metrics`. Used **only** for notifications today.
- **Audit:** `t_audit_logs` (~5.3k rows, API middleware writes via RPC with sanitization — `contractnest-api/src/middleware/auditMiddleware.ts`) **and** a second `t_audit_log` (immutable, append-only, used by service-ticket/evidence/billing RPCs — `contracts/025_audit_log_table.sql`). Duplicate systems; neither captures "proposed vs executed" agent semantics.
- **Idempotency:** `t_idempotency_keys` (+ duplicate `api_idempotency`), RPCs `get/set_idempotency_response`, 15-min TTL, UI generates UUID keys (`ClaudeDocumentation/contractUI/idempotency.md`; `contractnest-ui/src/services/api.ts:374-448`). Coverage is partial — contracts/catalog-studio/service-execution honor it; tenants, contacts bulk, seeds, KT generation do not.

---

## 1.3 API Surface

**44 route files**, ~400 endpoints (`contractnest-api/src/routes/`). Pattern: route → controller → service; most services **proxy to edge functions** with HMAC signing (46 files per P3; e.g. `contractService.ts`), a few call `.rpc()` directly. Hand-written SQL in routes: essentially none — SQL lives in migrations/RPCs (externalized ✅). The real business logic lives in **Postgres RPC functions** (~100+, e.g. `create_contract_transaction`, `process_contract_events_from_computed`, `generate_contract_invoices`, `record_invoice_payment`, `respond_to_contract`, `promote_catalog_test_to_live`) — which is good news for agents: the transactional core is already callable, atomic, and idempotency-aware.

### Classification (representative; full list in agent-tool inventory §1.5)

| Family | Routes file | Class | Logic location |
|---|---|---|---|
| Contracts | `contractRoutes.ts` (~20 eps incl. public CNAK) | workflow | RPC (`create_contract_transaction`) via edge `contracts` |
| Contract events | `contractEventRoutes.ts` | workflow | RPC (`update_contract_event`) |
| Service execution / tickets / evidence | `serviceExecutionRoutes.ts` | workflow | edge `service-tickets`, `service-execution`, `service-evidence` → RPCs |
| Invoices/payments | within contracts + `paymentGatewayRoutes.ts` | workflow | RPCs + edge `payment-gateway` (Razorpay) |
| Catalog Studio | `catalogStudioRoutes.ts`, `blockRoutes.ts` | CRUD (idempotency-keyed) | edge `cat-blocks`, `cat-templates` |
| Knowledge Tree | `knowledgeTreeRoutes.ts` (`/generate`, `/generate-variants`, `/generate-checkpoints`, `/generate-spare-parts`, `/generate-service-cycles`, `/generate-service-names`, `/generate-pricing`, overlays, compliance) | **AI-touched** | direct Anthropic in API services |
| Onboarding | `onboardingRoutes.ts` (`/initialize`, `/step/complete`, `/step/skip`, `/progress`, `/complete`) | workflow | edge `onboarding` → seeding RPCs (`initialize_tenant_onboarding`, `seed_onboarding_facility_nodes`) |
| Groups / VaNi chat | `groupsRoutes.ts` (~40 eps: `/ai-search`, `/ai-agent/message`, `/chat/*`, smartprofiles) | **AI-touched** | n8n webhooks via `groupsService.ts` |
| JTD | `jtd.ts` (+ webhooks gupshup/sendgrid), `adminJtdRoutes.ts` (queue metrics, DLQ ops, worker health) | orchestration/admin | edge `jtd-worker`, `admin-jtd-management`, PGMQ RPCs |
| Contacts / resources / tax / sequences / forms / assets / users / tenants | respective files | CRUD | transaction RPCs (`create_contact_transaction` etc.) |
| Audit | `auditRoutes.ts` | reporting | RPC batch insert/query |
| Business model | `businessModelRoutes.ts`, billing pages | CRUD | `t_bm_*` + credit RPCs |

### Notable risks in the surface

- **Rate limiting exists** on contracts/contacts but **not on the LLM endpoints** (`knowledgeTreeRoutes.ts`) — an unthrottled cost surface (~112K tokens per full KT run).
- **Two response envelopes** (`{success,error,code}` vs `{status,message}`) — agents need one.
- `INTERNAL_SIGNING_SECRET` HMAC falls back to empty string when unset (`contractService.ts:46-50`).
- Broken table references: `contractnest-ui/src/services/public-leads.service.ts` posts to `t_lead_capture`/`t_resource_usage`/`t_leads_contractnest`, none of which exist live (silent data loss; P6 finding, tables still absent in live list this session).

---

## 1.4 UI Workflow Inventory

Router: `contractnest-ui/src/App.tsx` (882 lines, ~120 routes). The table below is the raw material for the agent portfolio: **decisions/journey, split mechanical (agent-automatable) vs judgment (human gate)**.

| # | Journey | Steps/Screens | Human decisions | Mechanical (automatable) | Judgment (keep human) | Evidence |
|---|---|---|---|---|---|---|
| J1 | **Onboarding (VaNi flow)** | 13 screens | ~10–12 | profile/business data entry (scrapeable/askable), industry selection, resource pick, theme, equipment entry, catalog seeding (the entire `vani-working` step *is* the agent's job) | persona (buyer/seller/dual), AI consent, pricing-tier acceptance | `src/pages/onboarding/steps/*` (13 files), `src/pages/onboarding/index.tsx` |
| J2 | **Catalog setup (per service)** | 2–3 screens | 5–8 per item | name/description/spec entry, default pricing from KT medians (`price_median` exists for exactly this), tax-rate defaults | final price acceptance, service classification | `src/pages/catalog/catalogService-form.tsx`; KT pricing fields in migration `20260510` |
| J3 | **Catalog Studio block creation** | 6–12 screens per block (21 wizard step files; type-specific sub-flows) | 8–12 per block | type inference from KT (service←cycles, spare←parts mapping is documented), basic info, checklist items from checkpoints, schedule fields | pricing model (prepaid/postpaid), evidence policy, delivery rules | `src/components/catalog-studio/BlockWizard/steps/*`; mapping table in `ClaudeDocumentation/onboarding/GAP_ANALYSIS.md` §2 |
| J4 | **Contract creation** | 12 wizard steps | 15–20 | counterparty lookup, details/dates entry, block selection from catalog, billing-cycle arithmetic, tax application, **events calendar computation** (today 100% manual-preview), evidence-form suggestion | acceptance method (legal), nomenclature, asset coverage scope, date overrides, final send | `src/components/contracts/ContractWizard/index.tsx` (CONTRACT_STEPS), `steps/*.tsx` (19 files) |
| J5 | **RFQ creation** | 6 wizard steps | 6–8 | vendor shortlisting from contacts/groups, service-block specs from catalog | requirements definition, award decision (no evaluation UI exists at all) | `ContractWizard/index.tsx:132-140` (RFQ_STEPS); `types/contracts.ts` (RFQ_STATUS_FLOW) |
| J6 | **Template design (global designer)** | 8 steps | 8–12 | block assembly from KT, industry targeting suggestions, billing defaults from KT pricing | policy defaults (SLA/evidence/acceptance), publish | `src/pages/service-contracts/templates/admin/global-designer/steps/*` (9 files) |
| J7 | **Service execution (jobs)** | 5–8 screens | 5–8 per visit | **ticket creation on due date (today a human must remember)**, technician matching, reminder comms, evidence checklist prep | evidence approval/rejection, exception handling | `src/vani/pages/Job{sList,Create,Details}Page.tsx`; `create_service_ticket` RPC |
| J8 | **Invoice/payment follow-up** | 3–5 screens | 3–5 per invoice | payment_due/overdue chasing (JTD types already seeded, never enqueued), receipt matching | write-off/cancel decisions | `t_invoices` RPCs; `jtd-framework/002_seed_jtd_master_data.sql` |
| J9 | **Renewals** | **0 — does not exist** | n/a | entire journey is greenfield | renewal pricing, terms changes | UI audit: no route/component; no RPC |
| J10 | **SLA monitoring/breach** | **0 — does not exist** (defaults only in J6) | n/a | greenfield | penalty/remediation decisions | `PoliciesStep.tsx` defaults only |
| J11 | **VaNi chat** | 2–3 screens | low | intent routing (n8n), search | — | `src/vani/pages/ChatPage.tsx` (**sample data**, backend partially wired) |
| J12 | **Smart-forms admin** | 1 page, 3 panels | 5–8 | field scaffolding from KT checkpoints | validation/conditional logic, approval | `src/pages/admin/smart-forms/FormEditorPage.tsx` |
| J13 | **Subscription/billing (tenant)** | 3–5 screens | 1–3 | usage summaries | plan choice | `src/pages/settings/businessmodel/tenants/*` |

**Highest mechanical-decision density:** J4 (contract creation) and J3+J2 (catalog), but they have judgment gates interleaved. **Highest automation-per-effort:** J7+J8 — the due-event → ticket/reminder loop has *zero* judgment calls in its happy path and 80% of its infrastructure already built (finding #1/#2). J1 is the strategic showcase (the UI shell for it already exists). J9/J10 are greenfield outcomes with no manual path to fall back on.

**Client-side logic that must move server-side before agents can act** (UI audit §4): event-calendar computation (`utils/service-contracts/contractEvents.ts`), billing/tax totals (`BillingViewStep.tsx`), status-flow validation (`types/contracts.ts:54-71`).

---

## 1.5 Existing AI/Agent Footprint

### LLM touchpoints (complete inventory)

| Touchpoint | Provider | Pattern | File |
|---|---|---|---|
| KT generation (variants, parts, checkpoints, cycles, service names, pricing) | Anthropic, `KT_LLM_MODEL` default `claude-sonnet-4-6`, prompt-caching beta | single-shot, JSON out (+`jsonrepair`), 5-min timeout, token logging, **no retry/fallback/stream** | `contractnest-api/src/services/knowledgeTreeGeneratorService.ts` |
| Context overlays | Anthropic (same) | single-shot | `contractnest-api/src/services/overlaysGeneratorService.ts` |
| Compliance tagging | Anthropic (same) | single-shot classification | `contractnest-api/src/services/complianceTaggerService.ts` |
| Embeddings, profile enrichment, clustering, AI search, chat agent | **n8n webhooks** (model opaque, off-repo) | webhook POST, 30s timeout, graceful degradation | `contractnest-api/src/services/groupsService.ts`, `src/config/VaNiN8NConfig.ts` |
| Semantic retrieval | pgvector (embedding passed in from n8n) | RPCs `vector_search_members`, `smartprofile_vector_search`, `cached_vector_search` + `t_query_cache` | `contractnest-edge/supabase/functions/group-discovery/handlers/search.ts` |
| Intent routing + conversation state | n8n detects intent; edge routes 11 intents; sessions in `t_chat_sessions` (30-min sliding window, `intent_state`: IDLE→ACTIVATED→AWAITING_INPUT→SEARCHING) | state machine, not agent loop | `contractnest-edge/supabase/functions/group-discovery/index.ts` |

### Prompt/skill registry

13 prompt-template files at `contractnest-api/src/skills/*.md` (`kt-equipment-generator`, `kt-variants-generator`, `kt-checkpoints-generator`, `kt-spare-parts-generator`, `kt-service-cycles-generator`, `kt-service-names-generator`, `kt-pricing-generator`, `kt-overlays-generator`, `kt-compliance-tagger`, `kt-activity-generator`, `kt-facility-*`), loaded by `loadSkill(fileName, replacements)` with `{{TOKEN}}` substitution. **This is the SKILL.md convention in embryo** — a prompt registry, not a tool registry. No model is ever given a tool/function-calling schema anywhere in the codebase.

### Is there an agent runtime? **No.**

- No planner/executor/observer loop in-repo (KT generation is UI-sequenced endpoint chains; VaNi reasoning is an n8n black box).
- No executable tool registry (`t_tool_results`, `t_intent_definitions` exist, near-unreferenced).
- No memory read-back loop (sessions stored; history-into-prompt happens in n8n).
- One real HITL gate exists (catalog test→live promotion) — the pattern to generalize.
- **One real autonomous executor exists:** the JTD worker (poll → claim → execute handler → update status → retry/DLQ). It is a *mechanical* agent without an LLM — and the proof the runtime shape works in this stack.

### Tool-ready surface (operations an agent could call today with minimal wrapping)

Clean, parameterized, transactional, mostly idempotent:

| Candidate tool | Backing operation | Idempotent? | Tenant-scoped? |
|---|---|---|---|
| `contract.create` | `create_contract_transaction` RPC | ✅ key honored | app-layer |
| `contract.update_status` / `respond` | `respond_to_contract`, `updateContractStatus` | partial | app-layer |
| `contract.get/list` | `get_contract_by_id`, `get_contracts_list` | n/a (read) | app-layer |
| `event.update` | `update_contract_event` RPC (+ transition validation vs `m_event_status_transitions`) | ✅ versioned | app-layer |
| `ticket.create/update` | `create_service_ticket` + ticket RPCs | ✅ key honored | app-layer |
| `evidence.review` | evidence RPCs | ✅ | app-layer |
| `invoice.generate/record_payment` | `generate_contract_invoices`, `record_invoice_payment` | ✅ | app-layer |
| `notify.send` | insert `n_jtd` (trigger auto-enqueues to PGMQ, channels resolve per tenant config) | ✅ (queue semantics) | ✅ config-scoped |
| `catalog.block.create/bulk` | `cat-blocks` edge (idempotency-keyed) | ✅ | app-layer |
| `kt.query` | KT read endpoints / `m_*` selects | n/a | global |
| `catalog.promote_test_to_live` | `promote_catalog_test_to_live` RPC | ✅ | ✅ |
| `forms.dispatch` | ❌ missing — `m_form_template_mappings` schema exists (timing, `is_mandatory`, effective dates) but **zero code references** | — | — |
| `renewal.*` | ❌ missing entirely | — | — |

---

## 1.6 Gaps & Risks Register

Severity (H/M/L impact on agentic operation) × Effort (S/M/L to fix).

| ID | Gap | Detail / evidence | Sev | Effort |
|----|-----|-------------------|-----|--------|
| G1 | **Tenant isolation not DB-enforced** | Service-role everywhere in edge (`_shared/edgeUtils.ts`); 3 RLS mechanisms; GUC never set; 7 dormant-policy tables; 15 always-true policies | **H** | M–L |
| G2 | **No due-event scanner** (open S-a-S loop) | Live `cron.job` has no `t_contract_events` scan; seeded reminder JTD types never enqueued | **H** | **S** |
| G3 | **No LLM provider abstraction / agent loop / tool registry** | Hardcoded Anthropic ×3; n8n black box; no function-calling anywhere | **H** | L |
| G4 | **Calendar/billing intelligence client-side only** | `computed_events` JSONB from React; agents creating contracts get no events; tax math in `BillingViewStep.tsx` | **H** | M |
| G5 | **Zero tests + no CI** | 0 test files (verified); no workflows; RLS/transactions unverifiable | **H** | M |
| G6 | **No agent action ledger ("proposed → approved → executed → reversed")** | Two audit tables exist but record post-hoc facts, not approvable proposals | **H** | M |
| G7 | **Renewal workflow absent** | No RPC/route/UI; only post-lapse auto-expire (`contracts/054`) | M | M |
| G8 | **SmartForm dispatch dead** | `m_form_template_mappings` referenced nowhere in code | M | S |
| G9 | **SLA monitoring absent** | Defaults in designer only; no runtime checks | M | M |
| G10 | **Embedding model off-repo (n8n lock-in)** | Model/version not in source control; reproducibility risk | M | M |
| G11 | **Idempotency partial + duplicated** | `t_idempotency_keys` vs `api_idempotency`; tenants/contacts-bulk/KT-gen unprotected | M | S |
| G12 | **No LLM cost/rate budgets** | KT endpoints unthrottled; token logging only; though `t_bm_credit_*` engine exists to build on | M | S |
| G13 | **Duplicate infra & dead code** | 2 audit tables, 2 idempotency tables, 3 category systems, 3 lead stores, duplicate jtd cron (jobid 1 & 3 — still live this session), stray backup table, `index copy.ts` files, root `index.ts` is a stale copy of the groups function | L | S |
| G14 | **Broken lead capture** | `public-leads.service.ts` targets non-existent tables; UI also inserts `leads_contractnest` directly from browser | L | S |
| G15 | **Inconsistent status casing & response envelopes** | 'Cancelled' vs 'cancelled' in RPCs; two error formats | M | S |
| G16 | **Naming-convention drift** | `m_cat_blocks` tenant-scoped, `t_cat_templates` global, `m_event_status_*` tenant rows | L | S–M |
| G17 | **Doc-vs-code contradictions (logged per rules)** | (a) Spec claims `ACTIVE_AI_PROVIDER` exists — it doesn't; (b) VaNi-framework doc describes Celonis/process-mining methodology not present in product; (c) `ClaudeDocumentation/VANI_OPPORTUNITY_AUDIT.md` claims "RLS enforced at database level" — false in practice (G1); (d) README claims onboarding is 6 steps — UI now has 13-step VaNi flow; (e) committed schema dump 5 months stale | M | S (doc fixes) |
| G18 | **Single-container monolith deploy** | API Dockerfile bundles nginx+redis+n8n+API under supervisord; no healthchecks | M | M |

**Phase-0 blockers for any agent that writes data:** G1, G2, G4, G6 (+ G5 as the verification harness). Everything else can be sequenced.

---

*End of Phase 1. Every Phase 2 recommendation in `TRANSFORMATION_PLAN.md` cites findings above by ID (G#, J#, finding #).*
