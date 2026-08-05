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

- **Ledger correctness moves into Sprint 1.** Sprint 2 assigns 134 real tenants
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
- There are **134 orphan tenants** and no revenue mechanism at all today. Plans
  monetise all of them immediately; the wallet serves a narrower segment.
- The wallet needs the most new machinery (money-in-paise ledger, top-up flow,
  wallet-empty UX, 1-year expiry).
- Plans reuse `limit_contracts` / `usage_contracts` / `record_usage`, which
  already exist.

**This does not defer the FIFO-lot work.** Live top-up packs already carry
`expiry_days = 365`, so the expiry defect is armed in plans-only mode too.

Freemium (3 contracts + 1 RFQ) and POC (₹1,500) are both plan-shaped and ship
within this scope. Only the wallet is deferred.

---

## 2. Current state (verified live, 2026-08-05)

| Fact | Value |
|---|---|
| Tenants | 134 |
| Tenants with a subscription | **0** — all orphans |
| Live contracts | 179 |
| Live RFQs | 8 |
| Test contracts / RFQs | 29 / 1 |
| `t_tenant_context` rows | 0 |
| `t_bm_credit_balance` rows | 4 |
| `t_bm_credit_transaction` rows | 2 |
| Razorpay | Wired to contract engine only; none on the plan side |

Nothing in production depends on current metering behaviour.

---

## 3. Sprint 1 — Seller side + ledger correctness

**Goal:** Vikuna can sell, and the ledger underneath is trustworthy.

### 3.1 Deliverables

| # | Item | Spec ref |
|---|---|---|
| 1 | Seed the **Vikuna platform tenant** — `limit_* = NULL`, `billing_mode='exempt'` | §2.7 |
| 2 | **Ledger journal writes** — `add_credits` / `deduct_credits` insert `t_bm_credit_transaction` in the same transaction | §5.2 |
| 3 | **FIFO credit lots** — drop `unique_tenant_credit_channel`; lot-per-top-up with own `expires_at`; oldest-unexpired-first consumption; per-lot expiry | §5.1 |
| 4 | **`billing_mode` + `wallet_balance_paise`** on `t_tenant_context` | §5.4 |
| 5 | **New limit columns** — `limit_contacts`, `limit_templates`, `limit_rfqs` + `usage_*` | §5.5 |
| 6 | **Top-up pack cleanup** — deactivate the duplicate generation, settle final SKUs | §10.6 |
| 7 | **Metering block category** — `sub_cat_name='metering'`, "Credit Pack", visible to platform tenant only | §5.7 |
| 8 | **Settlement hook** — billing event on a `config.metering` block → `add_credits` / set limits; idempotent on billing-event id | §5.7 |
| 9 | **Platform contract templates** — Freemium, POC ₹1,500, Quarterly ₹5,999, Yearly ₹19,999, VaNi ₹4,999/mo, Implementation ₹10,000 | §2 |

### 3.2 Exit criteria

- A platform contract can be created in Vikuna, signed, paid via Razorpay, and
  its settlement grants credits/limits to the buying tenant — end to end, on one
  test tenant.
- Two top-ups a month apart produce **two lots**; expiring the first leaves the
  second intact. *(This is the regression test that proves §5.1.)*
- Every credit movement produces a `t_bm_credit_transaction` row carrying
  `reference_type`/`reference_id`.
- `t_bm_topup_pack` has exactly one active SKU per product.

### 3.3 Risks

- **Items 2–3 are schema-changing on tables with live rows** (4 balances,
  2 transactions). Small, but back them up first.
- Item 8 is the only genuinely new logic in the sprint; the rest is repair and
  configuration.

### 3.4 Decisions needed before starting

- §10.1 pooled-with-weights vs per-channel buckets — **shapes items 2, 3, 9**
- §10.2 are in-app notifications metered
- §10.6 final top-up SKU prices

---

## 4. Sprint 2 — Buyer side + assign the 134 orphans

**Goal:** every tenant is on a plan and can see it.

### 4.1 Deliverables

| # | Item | Notes |
|---|---|---|
| 1 | **Tenant plans page** — current plan, usage vs limits, available plans, upgrade CTA | Replaces the mock `tenants/pricing-plans` + `tenants/Subscription` |
| 2 | **Subscribe flow** — pick plan → platform contract raised → CNAK review/accept → Razorpay → settlement grants entitlement | Reuses `contracts/review`, `contracts/claim`, `useRazorpayCheckout` |
| 3 | **Backfill: assign all 134 tenants** — write `t_bm_tenant_subscription` + `init_tenant_context` for each | §5.6 — always one subscription row |
| 4 | **Fix `API_ENDPOINTS.BUSINESS_MODEL` → `BUSINESSMODEL`** or rewrite the hooks | Currently throws at runtime |
| 5 | **Cutover rule for 179 existing contracts** | See §4.3 |

### 4.2 Exit criteria

- `orphan_tenants` query returns **0**.
- A tenant can view their plan and complete a self-service upgrade end to end.
- No page in the subscription surface reads from `utils/fakejson/*`.

### 4.3 Decision required — the backfill is a commercial act, not a migration

Assigning 134 live tenants sets what they are entitled to and what they will be
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
| 3 | Backfill mis-entitles 134 live tenants | §4.3 decided explicitly before running; dry-run first |
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
           Plans page, subscribe flow, assign all 134 orphans
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
