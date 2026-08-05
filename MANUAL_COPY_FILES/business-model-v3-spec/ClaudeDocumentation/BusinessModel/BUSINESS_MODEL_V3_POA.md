---
title: Business Model v3 — Plan of Action (4 Sprints)
project: ContractNest
status: Draft v0.1 — for discussion, not yet approved
date: 2026-08-05
companion: BUSINESS_MODEL_V3_SPEC.md
---

## 0. How this POA relates to the owner's sprint outline

Owner's proposed shape (2026-08-05):

1. Create contracts in vikunatech — upgrade blocks as needed — review
2. Create tenant plans page — assign current tenants to a plan (all orphans today)
3. Test — plan working methodology
4. Sort out any issues from the previous sprints

**The shape is right** — seller side, then buyer side, then validate, then buffer.
This POA keeps that order and adds three things the outline does not currently
carry:

- **Ledger correctness moves into Sprint 1.** Sprint 2 assigns the 21 real tenants
  and starts granting credits for real. Both defects in spec §5.1/§5.2 must be
  fixed *before* that, not after. Fixing them now is nearly free (0 subscription
  rows, 0 tenant-context rows); fixing them after assignment means repairing live
  balances.
- **Metering/enforcement is named explicitly.** Sprints 1–2 as outlined deliver
  "tenants can see and subscribe to a plan" — but nothing yet *charges* ₹200 per
  contract or *enforces* a quota. Sprint 3 becomes enforcement + validation
  rather than validation alone.
- **Mode A (wallet) is consciously deferred.** See §1.

---

## 1. Scope decision — plans first, wallet later

**Recommendation: Sprints 1–4 ship Mode B (plans) only. Mode A (per-contract
wallet) follows in a later phase.**

Rationale:
- There are **21 real orphan tenants** (plus 112 test) and no revenue mechanism
  at all today. Plans monetise all of them immediately; the wallet serves a
  narrower segment.
- The wallet needs the most new machinery (money-in-paise ledger, top-up flow,
  wallet-empty UX, 1-year expiry).
- Plans reuse `limit_contracts` / `usage_contracts` / `record_usage`, which
  already exist.

**FIFO-lot work IS also deferred** — superseding an earlier draft of this
section. Two findings changed it: the owner decided credits never expire, and the
Step 1 baseline showed `purchase_topup` computes an expiry then discards it
(`add_credits` has no expiry parameter), so **no credit has ever carried an
`expires_at`**. Lots only make expiry correct, so they buy nothing here.

Guard: Step 5 must set `expiry_days = NULL` on every surviving top-up pack.
Leaving a `365` pack active would re-arm the defect.

Freemium (3 contracts + 1 RFQ) and POC (₹1,500) are both plan-shaped and ship
within this scope. Only the wallet is deferred.

---

## 2. Current state (verified live, 2026-08-05)

| Fact | Value |
|---|---|
| Tenants (all) | 134 |
| — `is_test = true` | **112** (67 active, 45 closed) |
| — real, active | **21** |
| — real, closed | 1 |
| Tenants with a subscription | **0** — all orphans |
| Live contracts | 179 |
| Live RFQs | 8 |
| Test contracts / RFQs | 29 / 1 |
| `t_tenant_context` rows | 0 |
| `t_bm_credit_balance` rows | 4 (one seed tenant) |
| `t_bm_credit_transaction` rows | 2 |
| Vikuna platform tenant | **exists** — `70f8eb69-9ccf-4a0c-8177-cb6131934344`, `is_admin = true`, workspace `vi4203` |
| Storage | measured on `t_tenants.storage_consumed`; quota 40, provider `firebase` |
| Razorpay | Wired to contract engine only; none on the plan side |

> **CORRECTION 2026-08-05.** An earlier draft said "134 orphan tenants" throughout.
> That is the raw row count. **112 of them are `is_test = true`**, so the Sprint 2
> backfill is **21 real active tenants**, not 134 — materially smaller and lower
> risk than first stated. Every "134" elsewhere in this document should be read
> as 21 real + 112 test.
>
> A decision follows from this: do test tenants get a subscription row at all?
> Recommendation — **yes, `billing_mode = 'freemium'` with test caps**, so no code
> path has to handle a tenant with no context row.

Nothing in production depends on current metering behaviour.

---

## 3. Sprint 1 — Seller side + ledger correctness

**Goal:** Vikuna can sell, and the ledger underneath is trustworthy.

### 3.1 Deliverables

Step numbering matches the agreed execution order. Status as of 2026-08-05.

| Step | Item | Spec ref | Status |
|---|---|---|---|
| 0 | Lock the credit-model decisions | §3.3, §3.4 | ✅ done |
| 1 | **Baseline snapshot** — data + all 10 function definitions | `SPRINT1_STEP1_BASELINE.md` | ✅ done |
| 2 | **Additive schema** (mig 010) + **Channels LOV** (mig 011) | §5.4, §5.5, §3.3 | ✅ applied & verified |
| 3 | **RPC rework** — D1 journal writes, D3 trigger column, D4/D5 top-up path (mig 012, 013, 014) | §5.2, §5.2b | ✅ applied |
| 4 | **Regression tests** for Step 3 — found D7 and the D4 second layer | `SPRINT1_STEP3_4_RESULTS.md` | ✅ 13/13 pass |
| 5 | **Top-up pack cleanup** — drop the duplicate generation, set `channel`, set `expiry_days = NULL`, delete orphaned seed balances | §10.6 | ⏳ next |
| 6 | **Vikuna platform tenant** — `limit_* = NULL`, `billing_mode = 'exempt'`, init context (tenant row already exists) | §2.7 | ⏳ |
| 7 | **Metering block category** — `sub_cat_name='metering'`, "Credit Pack", platform tenant only | §5.7 | ⏳ |
| 8 | **Settlement hook** — billing event on a `config.metering` block → `add_credits` / set limits / write `credit_grant_rates`; idempotent on billing-event id | §5.7 | ⏳ |
| 9 | **Platform contract templates** — Freemium, POC ₹1,500, Quarterly ₹5,999, Yearly ₹19,999, VaNi ₹4,999/mo, Implementation ₹10,000 | §2 | ⏳ |
| 10 | **End-to-end proof** — sell one platform contract to a test tenant | §3.2 | ⏳ |

> **FIFO credit lots are no longer in this sprint.** Credits never expire, and the
> baseline showed nothing has ever written `expires_at`. Deferred to whenever
> Mode A (the 1-year wallet) ships. See spec §5.1. This removed the largest and
> riskiest item from Sprint 1.

### 3.2 Exit criteria

- A platform contract can be created in Vikuna, signed, paid via Razorpay, and
  its settlement grants credits/limits to the buying tenant — end to end, on one
  test tenant.
- Every credit movement produces a `t_bm_credit_transaction` row carrying
  `reference_type` / `reference_id`, so a grant can be traced to the contract
  that caused it.
- A credit change on a tenant **that has an active subscription** completes
  without error *(this is the D3 regression test — it throws today)*.
- `purchase_topup` completes and credits the **correct per-channel pool**
  *(D4 + D5)*.
- `t_bm_topup_pack` has exactly one active SKU per product, each with a
  `channel` and `expiry_days = NULL`.

### 3.3 Risks

- **Step 3 is the only risky step.** It rewrites three functions that move
  money. Everything else is additive schema or configuration.
- D3 is latent today and only surfaces once subscriptions exist — so it will not
  show up in any test run until a subscription row is created. **Test it
  explicitly** by creating one subscription and then changing a credit balance.
- Step 8 is the only genuinely new logic in the sprint.

### 3.4 Decisions needed before continuing

All Step 0 decisions are closed (spec §10). The only remaining Sprint 1 input is
**§10.6 — final top-up SKU prices, channels, and expiry**, which blocks Step 5
but not Step 3.

---

## 4. Sprint 2 — Buyer side + assign the orphans (21 real, 112 test)

**Goal:** every tenant is on a plan and can see it.

### 4.1 Deliverables

| # | Item | Notes |
|---|---|---|
| 1 | **Tenant plans page** — current plan, usage vs limits, available plans, upgrade CTA | Replaces the mock `tenants/pricing-plans` + `tenants/Subscription` |
| 2 | **Subscribe flow** — pick plan → platform contract raised → CNAK review/accept → Razorpay → settlement grants entitlement | Reuses `contracts/review`, `contracts/claim`, `useRazorpayCheckout` |
| 3 | **Backfill: assign the 21 real active tenants** (+ test tenants on freemium) — write `t_bm_tenant_subscription` + `init_tenant_context` for each | §5.6 — always one subscription row |
| 4 | **Fix `API_ENDPOINTS.BUSINESS_MODEL` → `BUSINESSMODEL`** or rewrite the hooks | Currently throws at runtime |
| 5 | **Cutover rule for 179 existing contracts** | See §4.3 |

### 4.2 Exit criteria

- `orphan_tenants` query returns **0** (21 real + 112 test all carry a row).
- A tenant can view their plan and complete a self-service upgrade end to end.
- No page in the subscription surface reads from `utils/fakejson/*`.

### 4.3 Decision required — the backfill is a commercial act, not a migration

Assigning 21 real live tenants sets what they are entitled to and what they will be
billed. Three sub-decisions:

1. **Which plan does a backfilled tenant land on?** Freemium (and they upgrade
   when they hit the wall), or a grandfathered free tier?
2. **Do the 179 existing contracts count against quota?** Recommendation:
   **no** — quota counting starts at assignment date, history is grandfathered.
   Otherwise a tenant with 60 contracts is instantly over a 50-contract plan.
3. **Is anyone notified?** Silent backfill, or an email announcing their plan?
   Recommendation: silent for freemium; announce before any first charge.

> This is the highest-consequence step in the whole POA. It is the moment
> billing becomes real for real customers.

---

## 5. Sprint 3 — Enforcement + validation

**Goal:** the plan actually does something. Limits bite, credits are consumed,
test mode is bounded.

### 5.1 Deliverables

| # | Item | Spec ref |
|---|---|---|
| 1 | **Metering hooks** — contract/RFQ creation → quota/freemium check → `record_usage` → grant credits to pool | §5.8 |
| 2 | **`is_live = true` guard on every hook** | §4.3 — mandatory |
| 3 | **Test-environment caps** — 20 contacts, 2 templates, 6 contracts, 3 RFQs; static config, counted from source tables, never touches the ledger | §4.2 |
| 4 | **Notification spend** — `check_credit_availability` → send → `deduct_credits`; waiting-JTD path when empty | §5.8 |
| 5 | **OPS Tenant Context widget** — wallet/pool balance, oldest-lot expiry, usage vs quota, recent ledger activity | §6 |
| 6 | **Grant toast** — "15 credits added to your notification pool" | §6 |
| 7 | **End-to-end validation of the plan methodology** | §5.2 below |

### 5.2 Validation scenarios (owner's "test — plan working methodology")

- New tenant → 3 free contracts + 1 free RFQ → 4th contract blocked → upgrade →
  unblocked.
- Contract creation grants credits to the tenant pool, attributed to that
  contract in the journal.
- Notification send decrements the pool; at zero, jobs queue as `no_credits` and
  release FIFO after top-up.
- Test-mode tenant hits 6 contracts / 20 contacts / 2 templates / 3 RFQs and is
  blocked, with **no ledger entry and no invoice line**.
- Quarterly plan tenant reaching 50 contracts is blocked and prompted to upgrade.
- Credit lot expiry removes only the expired lot.

### 5.3 Exit criteria

- No path exists that charges or grants against `is_live = false` data.
- Every scenario in §5.2 passes on a real test tenant.

---

## 6. Sprint 4 — Stabilisation + cleanup

**Goal:** fix what Sprints 1–3 surfaced, and remove the dead weight.

### 6.1 Deliverables

| # | Item | Spec ref |
|---|---|---|
| 1 | **Issues raised in Sprints 1–3** — the buffer the owner asked for | — |
| 2 | **Keep/delete list** — remove plan-authoring UI, mock pages, `useBusinessModelQueries`, `fakejson`, edge `plans`/`plan-versions`, `businessModelRoutes`/controllers/service | §8 |
| 3 | **Dunning / grace handling** — what happens at `grace_end_date` | §2.1 |
| 4 | **Invoice + GST presentation** — verify a platform invoice renders correctly with GST | §2.6 |
| 5 | **POC expiry → reassignment** flow | §2.1 |

### 6.2 Deliberately NOT in scope

| Item | Blocked on | Spec ref |
|---|---|---|
| Storage metering (₹250/100 MB/yr) | Drive methodology revision | §5.3 |
| RFQ-derived-contract waiver | Sprint 3 `source_rfq_id` linkage | §7 |
| VaNi entitlement switch | VaNi launch | §5.8 |
| Mode A — per-contract wallet | This POA's scope decision | §1 |

Deleting the plan catalog (item 2) is deliberately **last** — it stays available
as reference until the replacement is proven in Sprint 3.

---

## 7. Cross-cutting risks

| # | Risk | Mitigation |
|---|---|---|
| 1 | Ledger defects reach real tenants | Sprint 1 fixes them before Sprint 2 assigns anyone |
| 2 | Test data billed as real | `is_live` guard, Sprint 3 item 2; 29 test contracts already exist |
| 3 | Backfill mis-entitles the 21 real tenants | §4.3 decided explicitly before running; dry-run first |
| 3b | D3 (context trigger, spec §5.2b) throws on every credit change once subscriptions exist | Fixed in Step 3, **before** the Sprint 2 backfill |
| 4 | Duplicate top-up SKUs visible to customers | Sprint 1 item 6, before any tenant-facing page |
| 5 | Flat credit pool erodes margin (WhatsApp 3–15× email) | §10.1 decided in Sprint 1 |
| 6 | Wallet expiry wipes recent top-ups | Sprint 1 item 3; regression test in §3.2 |
| 7 | Existing 179 contracts blow through new quotas | §4.3 sub-decision 2 |

---

## 8. Open decisions, by sprint

| Sprint | Must be decided before start |
|---|---|
| 1 | Pooled-with-weights vs per-channel (§10.1); in-app metered? (§10.2); channel debit weights (§10.3); final top-up SKUs (§10.6) |
| 2 | Backfill plan choice; historical-contract grandfathering; tenant notification (§4.3) |
| 3 | Do the 3 freemium contracts each grant credits? *(answered: yes)*; does an RFQ consume a freemium slot? *(answered: 1 free RFQ)* |
| 4 | Hard-delete vs archive branch for the plan catalog (§8) |
| Later | Vendor charging on RFQ-derived contracts (§10.4); PAYG storage ownership (§10.5); VaNi flip (§10.7) |

---

## 9. Summary view

```
SPRINT 1   Seller side + ledger correctness
           Vikuna tenant, journal writes, FIFO lots, billing_mode,
           metering block, settlement hook, platform templates
           EXIT: one platform contract sold end-to-end; two lots expire
                 independently

SPRINT 2   Buyer side + backfill
           Plans page, subscribe flow, assign all orphans (21 real + 112 test)
           EXIT: orphan_tenants = 0; no fakejson in the surface
           ⚠ highest-consequence sprint — billing becomes real

SPRINT 3   Enforcement + validation
           Metering hooks, is_live guard, test caps, notification spend,
           OPS widget
           EXIT: freemium wall works; test mode never bills

SPRINT 4   Stabilisation + cleanup
           Sprint 1-3 issues, delete plan catalog, dunning, GST invoice,
           POC reassignment
           EXIT: dead code gone, replacement proven
```
