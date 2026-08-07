# Business Model V4 — Plan of Action

**Status**: Phases A–C applied 2026-08-07; Phases D–E open
**Supersedes**: the `t_bm_*` layer described in `BUSINESS_MODEL_V3_POA.md` / `BUSINESS_MODEL_V3_SPEC.md`
**Written**: 2026-08-07
**Rule for this document**: every "already built" claim below was verified against the live
database or by grep across all five submodules on the date above. Nothing is assumed.
If you are picking this up cold, read Part 0 first — it exists specifically so nobody
rebuilds something that is already running.

---

## The one-line decision

> A commercial agreement is a **contract**. A running balance is **`t_tenant_context`**.
> Everything that was done is a **JTD**. There is no fourth thing.

Eleven `t_bm_*` tables collapse to zero. Plans, top-ups and upgrades all become
`t_contracts` rows authored in catalog-studio. Balances live on the tenant context row
that already holds `credits_whatsapp`, `credits_sms`, `credits_email`, `credits_inapp`,
`credits_pooled`. Every send is already an `n_jtd` row with cost, provider ID, retry
count and full status history.

---

## Part 0 — Ground truth (verified 2026-08-07)

### 0.1 Live data

| Fact | Value |
|---|---|
| Plan contracts under the platform tenant | 1 |
| Tenants with `billing_mode = 'plan'` | 1 (Trinity) |
| Signed-off catalog templates | 17 |
| Blocks carrying a `config.metering` object | 4 |
| JTDs parked in `no_credits` | **0** |
| Credit ledger rows | 37 — 35 `topup/contract`, 2 `deduction` with `reference_type = NULL` |

The two deduction rows are manual test artefacts. **Nothing in the product has ever
spent a credit through code.**

### 0.2 Built, applied, and working — DO NOT REBUILD

**Database (all applied to `uwyqhzotluikawcboldr`)**

| Migration | What it does |
|---|---|
| `017_subscribe_tenant_to_plan.sql` | 3-arg RPC. Creates the corporate contact (stamps `source_tenant_id`), calls `create_contract_transaction`, writes metering into `t_tenant_context`. Guards: `SELF_SUBSCRIPTION`, `ALREADY_SUBSCRIBED`, `PLAN_NOT_AVAILABLE`. |
| `018_tenant_context_plan_aware.sql` | `get_tenant_context` now returns rfqs/contacts/templates limits + usage, `credits.inapp`, `billing_mode`, `credit_grant_rates`, and resolves `subscription{}` from the plan **contract** (via `buyer_id → t_contacts.source_tenant_id`) instead of the dead `t_bm_subscription` columns. |
| `019_consumption_orchestrator.sql` | `trg_contract_consumption` (AFTER INSERT on `t_contracts`) moves `usage_contracts` / `usage_rfqs` and grants credits at the plan rate; `fn_platform_creation_rates()` reads the rate from the `per_creation` metering block so it is never a constant; backfilled `t_bm_topup_pack.channel`; patched `trg_fn_update_context_on_credit_change` which was bailing out on the empty `t_bm_tenant_subscription`. |

**Edge**

- `cat-templates` **v22 deployed** — cross-tenant leak fix (`all_tenants=true` now gated on `ctx.isAdmin`).
- `cat-templates` **v23 NOT deployed** — carries `handleGetPlanTemplates` (`is_public` + `signed_off` + `is_live` filter, derives price/term/limits/grants from the blocks snapshot, returns `current_plan_id` via two lookups because there is no FK on `t_contracts.buyer_id`) and `handleSubscribeToPlan`. **This is the first thing to deploy in Phase A.**

**UI**

- `hooks/queries/usePlanTemplates.ts`, `hooks/mutations/useSubscribeToPlan.ts`, `hooks/queries/useTenantContext.ts`
- `/businessmodel/tenants/pricing-plans` — self-service subscribe, 409 handled
- `/settings/businessmodel/tenants/Subscription` — rewritten around runway ("3 contracts left"), not utilisation bars
- catalog-studio metering block type: `utils/catalog-studio/wizard-data.ts` (the map the wizard *actually* reads), `BlockWizard/steps/metering/MeteringStep.tsx` (modes `limit` / `per_creation` / `one_time` / `flag`), `ServiceBlocksStep.tsx` admin-only metering section

**API**

- `tenantContextController.ts` — `extractAuth` accepts `x-product` as well as `x-product-code`

**JTD credit machinery (`jtd-framework/003_jtd_credit_integration.sql`) — built long ago, still valid**

- `no_credits` status + status-flow edges (`created → no_credits`, `no_credits → pending`, `no_credits → expired`)
- two partial indexes on `n_jtd` for the `no_credits` queries
- `release_waiting_jtds(tenant, channel, max)` — FIFO drain, per channel
- `trg_credit_topup_release_jtds` on `t_bm_credit_balance` — fires on any balance increase
- `expire_no_credits_jtds(days)` + pg_cron daily at 02:00
- `get_waiting_jtd_count()` → `/api/tenant-context/waiting-jtds`
- admin dashboards already render the waiting count (`QueueMonitorPage.tsx`, `TenantOperationsPage.tsx`)

**Ledger RPCs (exist, tested):** `add_credits`, `deduct_credits`, `reserve_credits`
(`FOR UPDATE NOWAIT`), `release_reserved_credits`, `check_credit_availability`,
`get_credit_balance`, `process_credit_expiry`, `fn_recalc_credit_flags`.

### 0.3 NOT built — verified by grep, zero call sites

| Gap | Evidence |
|---|---|
| **Limit enforcement** | `limit_contracts` / `limit_rfqs` appear in **zero** application files. Only in `006_tenant_context.sql` and two docs. Trinity is at 17 contracts against a limit of 3 and nothing stops him. |
| **The credit gate on send** | `jtd-worker/` contains **zero** occurrences of "credit". Nothing anywhere *writes* `status_code = 'no_credits'` — it is only ever read by admin dashboards. The release machinery in 0.2 is complete and has never had anything to release. |
| **Deduct on send** | The worker sends and never calls `deduct_credits`. Balances only ever go up. |
| **Top-up purchase** | No flow. `t_bm_topup_pack` is a price list with no checkout. |
| **Plan switch / upgrade** | "Switch" button deliberately disabled on the pricing page. |
| **Invoice for a plan contract** | ₹0 Free plan produces no billing event; untested for a paid plan. |

**This is the headline.** The half everyone assumes exists — *spending* a credit — does
not. Grants work; the meter only turns one way.

### 0.4 Dead tables — verified row counts

| Table | Rows | Disposition |
|---|---|---|
| `t_bm_tenant_subscription` | 0 | drop — already caused one live bug (the 019 sync-trigger bailout) |
| `t_bm_subscription_usage` | 0 | drop |
| `t_bm_invoice` | 0 | drop |
| `t_bm_billing_event` | 0 | drop |
| `t_bm_feature_reference` | 0 | drop |
| `t_bm_notification_reference` | 0 | drop |
| `t_bm_topup_pack` | 19 | migrate to templates, then drop (Phase D) |
| `t_bm_credit_balance` | 6 | collapse into `t_tenant_context` (Phase A) |
| `t_bm_credit_transaction` | 37 | keep as journal, or derive — decision D1 |
| `t_bm_pricing_plan` / `t_bm_plan_version` | 8 / 9 | **leave alone.** `/settings/businessmodel/admin/pricing-plans` still reads them and is documented as deprecating once `/contracts` stabilises. Do not touch in V4. |
| `t_bm_product_config` (+ history) | 3 / 3 | **leave alone** — product config, unrelated to billing. |

---

## Part 1 — Target architecture

```
  AGREEMENT            ENTITLEMENT + BALANCE           WORK DONE
  ─────────            ─────────────────────           ─────────
  t_contracts          t_tenant_context                n_jtd
  t_contract_blocks    · limit_* / usage_*             · one row per send
  t_contract_events    · credits_<channel>             · cost, provider id
                       · credits_reserved (NEW)        · retry, status history
   plan                · credit_grant_rates            n_jtd_status_history
   top-up purchase     · billing_mode
   upgrade
        │                       ▲                            │
        └──── trg_contract_consumption ────┘                 │
                     grants                                  │
                                ▲──────── deduct on send ────┘
```

Reads: `get_tenant_context` (one row, one RPC) — unchanged shape, already deployed.

**Why the balance cannot be a contract**: a contract states what was agreed on a date.
A balance is a hot mutable counter that has to be locked, decremented and re-read at
send rate. `t_contracts` was never built for that and should not be bent into it.

**Why the journal is not a contract either**: see decision D1.

---

## Part 2 — Phases

Sequencing is deliberate. **Phase A must land before Phase B**, because Phase B wires
the spend path against whatever table holds the balance — do it in the wrong order and
the spend path gets written twice. That is exactly the repeat work this document exists
to prevent.

### Phase A — Collapse the balance into `t_tenant_context`

*DB + edge only. No UI. One migration.*

| # | Deliverable |
|---|---|
| A1 | Deploy `cat-templates` **v23** (already written — see 0.2). Nothing below depends on it, but it is finished work sitting undeployed. |
| A2 | Add to `t_tenant_context`: `credits_reserved JSONB NOT NULL DEFAULT '{}'` (keyed by channel). One column, not five, so a new channel needs no DDL. |
| A3 | Rewrite `reserve_credits` / `release_reserved_credits` / `deduct_credits` / `add_credits` / `check_credit_availability` / `get_credit_balance` to read and write `t_tenant_context` instead of `t_bm_credit_balance`. **Keep the signatures identical** — every caller keeps working. |
| A4 | Move `trg_credit_topup_release_jtds` from `t_bm_credit_balance` to `t_tenant_context` (fire when any `credits_*` column increases). Guard against recursion: the trigger must not re-enter on its own writes. |
| A5 | Backfill: copy the 6 `t_bm_credit_balance` rows into the matching context columns, assert the sums match, then leave the table in place (dropped in Phase E). |
| A6 | Delete `t_bm_tenant_subscription` from `trg_fn_update_context_on_credit_change` entirely — 019 patched around it, A6 removes it. |

**Done when**: `add_credits(...)` writes `t_tenant_context.credits_whatsapp` directly and
`get_tenant_context` returns the same number, with `t_bm_credit_balance` no longer read
by anything.

**Known cost, accepted**: reservations now take a row lock on the tenant context row —
the same row that carries usage counters. Postgres readers don't block on row locks, so
`get_tenant_context` is unaffected; what contends is *write* against *write* (a send
reserving while a contract insert bumps `usage_contracts`). At current volumes this is
noise. Revisit only if a single tenant sustains high-concurrency sends.

### Phase B — Close the spend loop

*This is the actual product hole. Nothing above matters without it.*

| # | Deliverable |
|---|---|
| B1 | On JTD creation: call `check_credit_availability`. Insufficient → insert with `status_code = 'no_credits'` instead of `pending`. This is the missing writer; the entire release/expire path in 0.2 activates the moment it exists. |
| B2 | In `jtd-worker`: `reserve_credits` before dispatch, `deduct_credits` on provider success, `release_reserved_credits` on failure/retry. Idempotent on retry — a JTD must never be charged twice. |
| B3 | Stamp `reference_type = 'jtd'`, `reference_id = n_jtd.id` on every deduction (today: `NULL`). This is what makes the chain contract → grant → balance → JTD → provider message ID traceable end to end. |
| B4 | Surface it: the Subscription page already renders pools; add "N waiting for credits" from the existing `get_waiting_jtd_count`. Existing toast/loader components only. |

**Done when**: a tenant at zero WhatsApp credits sees the notification park in
`no_credits`, a top-up releases it automatically, and the ledger shows the deduction
pointing at the JTD that spent it.

### Phase C — Enforcement

| # | Deliverable |
|---|---|
| C1 | Decide the posture — **hard block** or **soft warn** (decision D3). |
| C2 | Enforce in `create_contract_transaction` (the RPC every path funnels through), not in a controller — a controller check is bypassable, a trigger/RPC check is not. Same reasoning as `trg_contract_consumption`. |
| C3 | UI: pre-flight the limit in the contract wizard so the user is warned before filling six steps, not after submit. Existing toast component. |
| C4 | Reset Trinity's `usage_contracts` — it currently reads 17, which includes a one-off backfill over pre-existing contracts. Agree the true starting number before enforcement goes live or the first real tenant is instantly blocked. |

### Phase D — Top-ups as templates; retire `t_bm_topup_pack`

Verified column-by-column: everything in `t_bm_topup_pack` already exists in a
template + metering block except `expiry_days` and six merchandising fields
(`is_popular`, `sort_order`, `original_price`, `discount_percentage`, `promotion_text`,
`promotion_ends_at`) — all of which belong in the `settings` jsonb that already carries
`lifecycle` and `is_public`.

| # | Deliverable |
|---|---|
| D1 | Author the 19 packs as catalog templates: one metering block (`one_time`, grants keyed by channel) + one priced service block. Same authoring surface as the Free plan — no new UI. |
| D2 | Extend `MeteringStep` with `expiry_days`, and template `settings` with the merchandising fields. |
| D3 | Buy = subscribe: reuse `subscribe_tenant_to_plan` (or a sibling that skips the plan-swap semantics). The purchase raises a contract; `trg_contract_consumption` already grants the credits. **No new grant code.** |
| D4 | Migrate the 4 live call sites off `t_bm_topup_pack`: `contractnest-edge/supabase/functions/billing/index.ts`, `contractnest-api/src/routes/billingRoutes.ts`, `contractnest-ui/src/hooks/queries/useBusinessModelQueries.ts`, `contractnest-ui/src/pages/settings/businessmodel/tenants/Subscription/index.tsx`. |

### Phase E — Drop

Only after A–D are live and observed for one billing period.

```sql
DROP TABLE t_bm_tenant_subscription, t_bm_subscription_usage, t_bm_invoice,
           t_bm_billing_event, t_bm_feature_reference, t_bm_notification_reference,
           t_bm_topup_pack, t_bm_credit_balance;
```

`t_bm_pricing_plan`, `t_bm_plan_version`, `t_bm_product_config*` stay. Write the
DOWN migration in the same commit as each DROP.

---

## Part 3 — Explicitly NOT in scope

Listed so they are not silently re-litigated:

- `/settings/businessmodel/admin/pricing-plans` and its `t_bm_pricing_plan` /
  `t_bm_plan_version` backing — deprecating on its own schedule. Untouched.
- Wallet / prepay mode (`billing_mode = 'wallet'`, `wallet_balance_paise`). Column
  exists, no tenant uses it. Out of V4.
- Freemium counters (`freemium_contracts_used`, `freemium_rfqs_used`). Out of V4.
- Sprint 3 per-asset event proof and the RFQ→vendor-contract handover — separate
  tracks, already documented in `CLAUDE.md`.
- Multi-product. `t_tenant_context` is PK'd on `(product_code, tenant_id)` and stays
  that way; V4 only ever writes `'contractnest'`.

---

## Part 4 — Decisions (answered 2026-08-07)

**D1 — Does the credit journal stay a table?** → **Table.** Renamed
`t_bm_credit_transaction` → `t_credit_journal` in Phase A. It carries
`balance_before`/`balance_after`, which is what lets a balance be proven rather
than recomputed.

**D2 — Do credits expire?** → **No.** A *contract* expires; the credits that
contract granted stay with the tenant. `process_credit_expiry()` and all
`expires_at` handling were dropped in Phase A, and `expiry_days` comes off the
top-up pack model in Phase D. This also creates a standing rule for Phase C:
when a plan contract expires, limits lapse but `credits_*` are left alone.

**D3 — Hard block or soft warn at the limit?** → **Soft.** No enforcement in
`create_contract_transaction`; limits are advisory. Phase C is surfacing only —
an over-limit flag, a banner, a toast, an upgrade CTA.

**D4 — Trinity's `usage_contracts`?** → **Moot.** Trinity is the demo tenant.
No reset, no backfill correction.

---

## Phase A — DONE (2026-08-07)

Applied live in seven parts (`v4_phase_a_1` … `v4_phase_a_7`). File of record:
`contractnest-edge/supabase/migrations/business-model-v2/020_balance_on_context.sql`.

| | |
|---|---|
| `t_tenant_context.credits_<channel>` | **is** the balance — nothing copies it |
| `credits_reserved` (jsonb, NEW) | in-flight holds, keyed `<credit_type>:<channel\|_>` |
| `credits_other` (jsonb, NEW) | credit types with no typed column (ai_report) |
| `t_credit_journal` | renamed from `t_bm_credit_transaction` |
| `t_bm_credit_balance` | no longer read or written — dropped in Phase E |
| dropped | the sync trigger, its function, the old JTD-release trigger, `process_credit_expiry` |
| new on `t_tenant_context` | `trg_context_credit_flags` (BEFORE), `trg_context_release_jtds` (AFTER) |

All six RPC signatures unchanged, so `billing/index.ts`,
`_shared/businessModel/index.ts` and `trg_fn_contract_consumption` needed no edit.

Smoke-tested live end to end: add → reserve → check → deduct, with the hold
consumed correctly and the journal chain unbroken (270→275→273). Four orphan
balances belonging to a tenant absent from `t_tenants` were reported and skipped.

One trap worth recording: `fn_credit_state` returns a table with a
`product_code` column, which shadows `t_tenant_context.product_code` inside the
body. Postgres accepts the function at CREATE time and raises 42702 only on the
first call. Every table reference in that function is aliased.

**Phase B — DONE (2026-08-07).** `021_close_the_spend_loop.sql`.
`trg_jtd_credit_gate` parks unpayable messages at INSERT (named to sort ahead
of `trg_jtd_enqueue`); the worker reserves before dispatch, charges on provider
success, releases on failure; every deduction carries `reference_type='jtd'`.
Identity messages, the test environment and unmetered tenants are never
charged; every path fails open. Database applied and tested live; the worker
redeploy is the owner's step.

**Phase C — DONE (2026-08-07).** `022_soft_limits.sql`. `flag_over_limit` added
and both limit flags now recompute on the context row itself — the old writer
fired on `t_bm_subscription_usage`, a table with zero rows, so `flag_near_limit`
had never been true for anybody either. A limit of 0 with zero usage reads as
"not in this plan", not "over", so seller plans are not nagged forever about
RFQs they never wanted. Plan-contract expiry zeroes the two metered allowances
and leaves credits alone (D2). Nothing blocks: no constraint, no RAISE, no
disabled button (D3) — the tenant is warned on wizard open and on the
Subscription page, upgrade one click away.

**Remaining: Phases D–E as specified above.**

---

## Appendix — verification queries

```sql
-- dead table census
select 't_bm_tenant_subscription' t, count(*) from t_bm_tenant_subscription
union all select 't_bm_credit_balance', count(*) from t_bm_credit_balance
union all select 't_bm_credit_transaction', count(*) from t_bm_credit_transaction
union all select 't_bm_topup_pack', count(*) from t_bm_topup_pack;

-- the spend loop is closed when this returns rows
select transaction_type, reference_type, count(*)
from t_bm_credit_transaction group by 1,2;   -- expect deduction/jtd

-- enforcement is live when this can no longer happen
select tenant_id, usage_contracts, limit_contracts
from t_tenant_context where usage_contracts > limit_contracts;
```
