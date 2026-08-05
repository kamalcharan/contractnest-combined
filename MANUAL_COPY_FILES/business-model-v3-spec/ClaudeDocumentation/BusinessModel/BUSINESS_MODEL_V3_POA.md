---
title: Business Model v3 — Plan of Action
project: ContractNest
version: 2.0 — clean rewrite
date: 2026-08-05
companion: BUSINESS_MODEL_V3_SPEC.md
status: Sprint 1 in progress (steps 0–4 applied to production)
---

## 0. What this is

The build plan for ContractNest's own monetisation. Version 2 is a clean rewrite
of the 2026-08-05 draft, which had accumulated corrections in place and become
hard to read. Nothing here is new since that draft — it is the same plan, stated
once, correctly.

### What changed from v1

| v1 said | Correct position |
|---|---|
| Delete the plan catalog in Sprint 4 | **Leave it alone.** `/settings/businessmodel/admin/pricing-plans` is deprecated by the owner once `/contracts` stabilises into the product. Not this work. |
| Step 5: clean up top-up SKUs, pick prices | **Dropped.** `t_bm_topup_pack` belongs to that same surface. No pricing decision needed. |
| FIFO credit lots are mandatory | **Deferred.** Credits never expire, and nothing has ever written `expires_at`. |
| 134 orphan tenants to backfill | **21.** 112 of the 134 are `is_test = true`. |
| Storage is never measured | **It is** — `t_tenants.storage_consumed`. The metering layer's copy is what's unfed. |
| Buyers charged for contracts they receive | **No.** The creator pays; viewing via CNAK is free. |
| The vendor pays for an RFQ-derived contract | **No.** The ₹400 covered it. |

---

## 1. The model in one page

### The business model is a contract

Vikuna authors **contract templates** in `/contracts/create/templates/`. A tenant
buys a template and it becomes their contract, with Vikuna as seller. Metering
blocks inside the template carry the grant rates and credit-pack pricing,
authored in catalog-studio by a human — never hardcoded.

```
Vikuna authors template  →  tenant buys it  →  real contract (Vikuna = seller)
       →  Razorpay, via the existing contract payment-gateway path
       →  settlement hook grants credits / sets limits / writes credit_grant_rates
       →  t_tenant_context updated — gates read one row
```

Nothing in `/settings/businessmodel/**` is used, extended or priced.

### The billing rule: the creator pays

| Act | Who | Charge |
|---|---|---|
| Create a contract | seller | ₹200 |
| Create an RFQ | buyer | ₹400 — covers the RFQ **and** its derived contract |
| Contract derived from an RFQ | whoever authors it | ₹0 |
| View via CNAK | anyone | ₹0, read-only |

An active plan or wallet is required to **create**. It is never required to view.
Because the rule keys on the act rather than the role, seller-only, buyer-only
and both-at-once need no special handling and no `tenant_type` column.

**Two invariants the hooks must respect:**
- **Drafts are never charged.** The billable moment is `draft → sent`, not an
  `INSERT`. 50 of 179 live contracts are drafts.
- **Public routes never touch the ledger.** No check, deduction or usage
  recording on any CNAK path.

### Commercial terms

| | |
|---|---|
| Freemium | 3 contracts + 1 RFQ, credits granted normally |
| POC | ₹1,500, 1–2 month contract, offered **after** freemium |
| Quarterly | ₹5,999 — 50 contracts, 20 credits per channel per contract |
| Yearly | ₹19,999 — 200 contracts, 20 credits per channel per contract |
| Wallet (Mode A) | ₹200/contract, ₹400/RFQ, ₹1,000 minimum, 1-year validity |
| VaNi | ₹4,999/month |
| Implementation | ₹10,000 one-time |
| Notification credits | Four per-channel pools, cumulative, never expire |
| GST | Once, at invoice. Never per consumption. |
| Vikuna | `limit_* = NULL`, `billing_mode = 'exempt'` |

### Scope: plans first, wallet later

Sprints 1–4 ship **Mode B (plans) only**. Mode A (the wallet) follows. Plans
monetise all 21 orphan tenants and reuse `limit_contracts` / `usage_contracts` /
`record_usage`, which exist. The wallet needs a paise ledger, top-up flow and
empty-wallet UX. Freemium and POC are plan-shaped and ship in scope.

---

## 2. Current state (verified live, 2026-08-05)

| Fact | Value |
|---|---|
| Tenants | 134 total — **112 `is_test`**, **21 real active**, 1 real closed |
| Tenants with a subscription | **0** — all orphans |
| Live contracts / RFQs | 179 / 8 · of which **50 drafts**, 114 active |
| Contracts with `buyer_tenant_id` | 15 — the rest have contact buyers |
| Tenants that both sell and buy | **1** (Pulse Hospital) |
| Test contracts / RFQs | 29 / 1 |
| `t_tenant_context` rows | 0 |
| `t_bm_credit_balance` | 4 — all belong to a tenant **no longer in `t_tenants`** |
| Vikuna platform tenant | exists — `70f8eb69-9ccf-4a0c-8177-cb6131934344`, `is_admin = true` |
| Vikuna catalog-studio + templates | **cleared 2026-08-05**, backup committed |
| Storage | measured on `t_tenants.storage_consumed`; quota 40, provider `firebase` |
| Razorpay | wired to the contract engine only |

---

## 3. Sprint 1 — Seller side + ledger correctness

**Goal:** Vikuna can sell, and the ledger underneath is trustworthy.

| Step | Item | Status |
|---|---|---|
| 0 | Lock the credit-model decisions | ✅ |
| 1 | Baseline snapshot — data + 10 function definitions | ✅ `SPRINT1_STEP1_BASELINE.md` |
| 2 | Additive schema (mig 010) + Channels LOV (mig 011) | ✅ applied & verified |
| 3 | Ledger RPC rework (mig 012, 013, 014) | ✅ applied |
| 4 | Regression tests — found D7 and the D4 second layer | ✅ 13/13 pass |
| — | ~~Top-up pack cleanup~~ | ❌ dropped — deprecated surface |
| 5 | **Vikuna platform tenant** — `limit_* = NULL`, `billing_mode='exempt'`, init context | ⏳ **next** |
| 6 | **Metering block category** in catalog-studio | ⏳ |
| 7 | **Settlement hook** | ⏳ |
| 8 | **Platform contract templates** in `/contracts/create/templates/` | ⏳ |
| 9 | **End-to-end proof** — Vikuna sells one template to a test tenant | ⏳ |

### 3.1 Step 6 — the metering block, in detail

A metering block is a **service block** with `category='metering'` — following
the Group Session precedent (`config.audience='group'`), so it inherits pricing
and cadence for free. All configuration lives in `config.metering`, with four
modes and nothing else:

| Mode | Meaning | Writes to |
|---|---|---|
| `limit` | A cap for the period | `t_tenant_context.limit_*` |
| `per_contract` | Grant rate each time the tenant creates a contract | `credit_grant_rates` |
| `one_time` | Immediate grant on settlement | `add_credits()` |
| `flag` | Turns a feature on | `addon_vani_ai` |

`per_contract` carries a **per-channel map in one block**, not one block per
channel:

```json
{ "mode": "per_contract",
  "grants": { "whatsapp": 20, "email": 20, "sms": 0, "inapp": 0 } }
```

This maps 1:1 onto `t_tenant_context.credit_grant_rates`. A human edits one row
to change the 20, and activating SMS later needs no new block and no migration.

Seed the category visible to the platform tenant only.

### 3.2 Step 8 — the templates

| Template | Price | Blocks |
|---|---|---|
| Freemium | ₹0 | `limit`: 3 contracts / 1 RFQ · `per_contract`: 15/15 |
| POC | ₹1,500 | billing (1–2 month term) · `limit` · `per_contract` |
| Quarterly | ₹5,999 | billing (quarterly) · `limit` 50 · `per_contract` 20/20 |
| Yearly | ₹19,999 | billing (annual) · `limit` 200 · `per_contract` 20/20 |
| VaNi | ₹4,999/mo | billing (monthly) · `flag: addon_vani_ai` |
| Implementation | ₹10,000 | billing one-off — **no metering block** |
| Credit Pack | TBD | `one_time`, e.g. `{whatsapp: 500}` |

Not everything Vikuna sells is metered — Implementation is a plain priced block.

### 3.3 Exit criteria

- A platform contract is created in Vikuna, accepted, paid via Razorpay, and its
  settlement grants credits and limits to the buying tenant — end to end.
- Every credit movement writes a `t_bm_credit_transaction` row carrying
  `reference_type` / `reference_id`.
- A credit change on a tenant **with an active subscription** completes without
  error (the D3 regression — it threw before mig 012).
- `credit_grant_rates` is populated from the template's metering block, not from
  any constant in code.

### 3.4 Risks

- Step 7 (settlement hook) is the only genuinely new logic. Must be **idempotent
  on billing-event id** so a webhook retry cannot double-grant.
- D3 and D7 were both latent — invisible until a subscription existed, or until a
  function actually ran. Assume more of the same and **test by executing**, not by
  reading.

---

## 4. Sprint 2 — Buyer side + assign the orphans

**Goal:** every tenant is on a plan and can see it.

| # | Item |
|---|---|
| 1 | **Tenant plans page** — current plan, usage vs limits, available templates, upgrade CTA |
| 2 | **Subscribe flow** — pick template → platform contract raised → CNAK review/accept → Razorpay → settlement grants entitlement |
| 3 | **Backfill** — write `t_bm_tenant_subscription` + `init_tenant_context` for 21 real tenants (+ test tenants on freemium) |
| 4 | **Cutover rule** for the 179 existing contracts |

### 4.1 The backfill is a commercial act, not a migration

It sets what 21 live tenants are entitled to and what they will be billed. Three
sub-decisions, needed **before** it runs:

1. **Which plan do they land on** — Freemium, or a grandfathered tier?
2. **Do the 179 existing contracts count against quota?** Recommendation: **no**
   — counting starts at assignment date. Otherwise a tenant with 60 contracts is
   instantly over a 50-contract plan.
3. **Is anyone notified?** Silent for freemium; announce before any first charge.

Test tenants should also get a row (`billing_mode = 'freemium'`), so no code path
has to handle a tenant with no context.

### 4.2 Exit criteria

- Orphan count is 0.
- A tenant can view their plan and complete a self-service upgrade end to end.
- **D3 must be fixed first** — otherwise every credit change throws the moment a
  subscription exists. (Done in Sprint 1, mig 012.)

---

## 5. Sprint 3 — Enforcement + validation

**Goal:** the plan actually does something. Limits bite, credits are consumed.

| # | Item |
|---|---|
| 1 | **Metering hooks** — fire on `draft → sent`, never on `INSERT` |
| 2 | **`is_live = true` guard** on every hook — mandatory |
| 3 | **CNAK / public-route guard** — no ledger activity on any public path — mandatory |
| 4 | **Test-environment caps** — 20 contacts, 2 templates, 6 contracts, 3 RFQs; static config, counted from source tables, never touches the ledger |
| 5 | **Notification spend** — `check_credit_availability` → send → `deduct_credits`; waiting-JTD path when empty |
| 6 | **OPS Tenant Context widget** — pool balances, usage vs quota, recent ledger activity |
| 7 | **Grant toast** — "15 credits added to your notification pool" |

### 5.1 Validation scenarios

- New tenant → 3 free contracts + 1 free RFQ → 4th contract blocked → upgrade →
  unblocked.
- Contract creation grants credits to each channel pool, attributed to that
  contract in the journal.
- Notification send decrements the pool; at zero, jobs queue as `no_credits` and
  release FIFO after top-up.
- A contract sitting in **draft** is never charged; the charge lands on send.
- A **CNAK visitor** views a contract end to end with **zero ledger activity**.
- A tenant that both sells and buys is charged for what it creates on each side,
  with no special-case code.
- Test-mode tenant hits its caps and is blocked, with **no ledger entry and no
  invoice line**.

---

## 6. Sprint 4 — Stabilisation

| # | Item |
|---|---|
| 1 | Issues raised in Sprints 1–3 — the buffer |
| 2 | Dunning / grace handling at `grace_end_date` |
| 3 | Invoice + GST presentation on a platform invoice |
| 4 | POC expiry → reassignment |
| 5 | Delete the 4 orphaned credit balances whose tenant no longer exists |

### Explicitly out of scope

| Item | Blocked on |
|---|---|
| Storage metering (₹250/100 MB/yr) | Drive methodology revision + the PAYG ownership contradiction |
| RFQ-derived-contract waiver | Sprint 3's `source_rfq_id` linkage |
| VaNi entitlement switch | VaNi launch |
| Mode A — the wallet | Scope decision (§1) |
| Deprecating `/settings/businessmodel/**` | Owner's timing, after `/contracts` stabilises |

---

## 7. Defect register

| # | Defect | Found | Status |
|---|---|---|---|
| D1 | `add_credits` / `deduct_credits` write no journal row; `reference_id` discarded | Spec analysis | ✅ fixed (012) |
| D2 | Expiry zeroes the whole balance | Spec analysis | ⏸ unreachable — nothing expires |
| D3 | Context trigger: `reserved` vs `reserved_balance` | Step 1 baseline | ✅ fixed (012) |
| D4 | `purchase_topup`: `processed` column, then `event_source` NOT NULL | Baseline + Step 4 run | ✅ fixed (012, 014) |
| D5 | `purchase_topup` credits pooled instead of per-channel | Step 1 baseline | ✅ fixed (010, 014) |
| D6 | `purchase_topup` computes expiry then discards it | Step 1 baseline | ⏸ intentional |
| D7 | `release_waiting_jtds`: `reserved` vs `reserved_balance` — **`add_credits` was throwing for every tenant in production** | Step 4 regression | ✅ fixed (013) |

---

## 8. Open decisions

| # | Decision | Blocks |
|---|---|---|
| 1 | Credit-pack price on the metering block, and real MSG91 per-message cost | Step 6/8 — plan margin |
| 2 | Where the subscription record lives: projection row on contract activation, or repoint context triggers at `t_contracts` | Steps 5–8 |
| 3 | Backfill: which plan, quota grandfathering, notification | Sprint 2 |
| 4 | PAYG storage — tenant-owned Drive or ContractNest-owned? | Storage billing |
| 5 | When `VANI_ENTITLEMENT_MODE` flips `open` → `subscription` | VaNi gating |

### On decision 2

`t_tenant_context` is populated by triggers on `t_bm_tenant_subscription`. If the
contract is the subscription, that source is wrong.

- **(a)** Write a subscription row as a *projection* when a platform contract
  activates. Contract stays source of truth; every existing trigger, flag and the
  VaNi gate keep working. Small change, compatible with the table surviving until
  deprecation. **Recommended.**
- **(b)** Repoint the context triggers at `t_contracts` and retire the table.
  Cleaner end state, more work, touches the VaNi gate.

### On decision 1 — the margin question

At ContractNest's own top-up prices, the bundled credits are worth a large share
of plan revenue — on the Yearly plan, potentially more than the per-contract
revenue itself. The number that matters is the **real MSG91 cost**, not the
top-up sell price. Worth verifying once before the templates are seeded, because
it is cheap to change now and expensive after 21 tenants are on a plan.

---

## 9. Summary

```
SPRINT 1   Seller side + ledger correctness
           [done] baseline, schema, LOV, ledger RPCs, regression
           [next] Vikuna tenant → metering block → settlement hook
                  → templates → end-to-end sale

SPRINT 2   Buyer side + backfill
           Plans page, subscribe flow, assign 21 real tenants
           ⚠ highest-consequence sprint — billing becomes real

SPRINT 3   Enforcement + validation
           Metering hooks on draft→sent, is_live guard, CNAK guard,
           test caps, notification spend, OPS widget

SPRINT 4   Stabilisation
           Buffer, dunning, GST invoice, POC reassignment, cleanup
```
