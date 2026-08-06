---
title: Business Model v3 — Commercial Spec & Implementation Plan
project: ContractNest
status: Draft v0.1 — decisions captured, not yet built
date: 2026-08-05
supersedes: HANDOVER_CONTEXT.md, BM_delivery.md, BUSINESS_MODEL_AGENT_PRD.md (all Jan 2026)
---

## 0. Status of prior documents

The Jan-2026 documents in this folder describe a **plan-catalog** business model
(admin authors pricing plans, tenants self-subscribe) with Phases 1–4 marked
complete and Phase 5 = Razorpay.

**That direction is superseded.** The 2026-07-12 session
(`MANUAL_COPY_FILES/ux-metering-handover/HANDOVER_BUSINESS_MODEL_METERING.md`)
decided that a tenant's subscription **is a contract**, and this document records
the commercial model agreed on 2026-08-05 plus the implementation consequences.

Read this document first. Treat the Jan-2026 files as history.

---

## 1. The core distinction

Everything in this spec depends on separating two different kinds of contract.
They live in the same table (`t_contracts`) and use the same engine, but they
mean opposite things commercially.

| | **Platform contract** | **Tenant contract** |
|---|---|---|
| Seller | Vikuna (platform tenant) | The tenant |
| Buyer | The tenant | The tenant's own customer |
| Examples | POC ₹1,500, Quarterly plan, VaNi, implementation, wallet top-up | Lift AMC, pest control contract, an RFQ |
| Money flows | Tenant → Vikuna, via Razorpay on `vikunatech@gmail.com`'s gateway | Tenant's customer → tenant |
| Metered? | **No** — this *is* the billing | **Yes** — ₹200 / ₹400 each |

A platform contract is never charged ₹200. A tenant contract never bills Vikuna.

### Why contracts and not the plan catalog

The Razorpay integration already exists and is wired **entirely to the contract
engine** — `payment-gateway` + `payment-webhook` edge functions with
`providers/razorpay.ts`, `paymentGatewayService.ts`, `useRazorpayCheckout.ts`,
`RecordPaymentDialog.tsx`, and RPCs `create_payment_request`,
`verify_gateway_payment`, `process_payment_webhook`.

The plan-catalog side has **no Razorpay code at all** — a single comment in
`billing.dto.ts:54`. Phase 5 was never built.

Critically, `get_tenant_gateway_credentials(p_tenant_id)` means gateway
credentials are **per-tenant and encrypted**. Vikuna holds the vikunatech
credentials; every tenant is a counterparty on a platform contract; Vikuna's
gateway collects. This is exactly how contract payments already work — **zero
new payment code**. Going the plan-catalog route would mean building a second,
parallel Razorpay integration.

Billing cycles, invoicing, tax, EMI, renewals and the public CNAK
review/claim/accept flow (`contracts/review`, `contracts/claim`, `welcome`) all
come free from the contract engine. Dogfooding is a bonus: every gap we feel
billing ourselves is a tenant-facing gap too.

---

## 1A. The billing rule — the creator pays

> Added 2026-08-05 after working through the seller / buyer / both question.
> This supersedes any role-based framing elsewhere in this document.

**One rule covers every case: the party who CREATES a record pays for it.
Viewing is always free.**

| Act | Who does it | Charge |
|---|---|---|
| Create a contract | seller | ₹200 (or 1 from plan quota) |
| Create an RFQ | buyer | ₹400 — covers the RFQ **and** the contract derived from it, upfront |
| Contract derived from an RFQ | whoever authors it | **₹0** — already paid by the RFQ |
| **View a contract via CNAK** | anyone | **₹0, read-only** |

### The gate

**An active plan or wallet is required to CREATE. It is never required to view.**

A buyer who only receives contracts is a **contact**, not a tenant. They open the
contract through a CNAK public link, read-only. They pay nothing and need no
tenant record. If they want to create anything of their own — an RFQ, their own
contracts — they activate a plan, and from then on they are billed like any other
tenant for what they create.

### Seller / buyer / both

Role is **per contract, not per tenant** — `useContractRole.ts` already resolves
`seller | buyer | viewer` from the contract, and the same tenant is a seller on
one and a buyer on another.

Because the rule keys on the *act*, not the role, all three cases fall out with
no special handling:

| Tenant shape | What they pay |
|---|---|
| Pure seller | ₹200 per contract they create |
| Pure buyer | ₹400 per RFQ they raise; ₹0 for contracts they receive |
| **Both** | Exactly the above, added together — no special case, no `tenant_type` column |

Live example: **Pulse Hospital** already sells 1 contract and buys 4.

### Consequences for implementation

1. **`flag_can_access` gates creation, not viewing.** A CNAK visitor has no
   tenant context and does not need one.
2. **CNAK / public routes must never touch the ledger** — no credit check, no
   deduction, no `record_usage` on `contracts/review`, `contracts/claim`,
   `/quote/:cnak/:secret` or any other public path. Treat this with the same
   discipline as the `is_live` guard (§4.3): a whole class of paths that stays
   outside metering.
3. **Notification credits come from the contract owner's pool.** A seller's
   reminder to a CNAK buyer debits the seller. The creator owns the record, so
   the creator pays for its notifications.
4. **Nothing is charged at acceptance.** A buyer can never be blocked from
   accepting, and a seller's deal can never be held up by the buyer's balance.
   No arrears path is needed.
5. **`usage_contracts` counts what the tenant CREATES** — keyed on
   `t_contracts.tenant_id`. It is not "contracts you are party to".
6. **Drafts are not charged.** 50 of 179 live contracts are drafts. The billable
   moment is a lifecycle transition (draft → sent), never an `INSERT`. Billing on
   row creation would charge tenants for scratch work and abandoned drafts.
7. **Contact → tenant conversion is ordinary signup.** They activate a plan and
   start being billed for what they create. No conversion-specific billing.

---

## 2. Commercial model

All prices **exclude GST**. GST is applied once, at invoice time (§2.6).

### 2.1 Tenant lifecycle

```
  Signup
    │
    ▼
  FREEMIUM        3 contracts + 1 RFQ, free. Notification credits granted
    │             normally. "Let them play."
    ▼
  POC (optional)  ₹1,500 — a real platform contract with a 1–2 month term.
    │             Offered after freemium is used up, for customers who ask.
    ▼
  PAID            Per-contract (wallet) or Plan. Tenant chooses.
```

On POC expiry, a new platform contract is assigned. `grace_end_date` already
exists on `t_bm_tenant_subscription` and covers the gap so the tenant is not
locked out the moment it lapses.

### 2.2 Mode A — Per-contract (wallet)

| Item | Value |
|---|---|
| Contract | ₹200 |
| RFQ | ₹400 — covers the RFQ **and** the contract derived from it, charged upfront |
| Minimum top-up | ₹1,000 |
| Wallet validity | **1 year from top-up** |
| Notification credits | 15 per contract, granted to the tenant-level pool |

### 2.3 Mode B — Plans

| Plan | Price | Contracts | Credits per contract |
|---|---|---|---|
| Quarterly | ₹5,999 | 50 | 20 |
| Yearly | ₹19,999 | 200 | 20 |

Effective per-contract cost: ₹200 → ₹120 → ₹100. Consistent ladder.

### 2.4 Add-ons

| Item | Price | Notes |
|---|---|---|
| VaNi | ₹4,999 / month | Maps to existing `t_tenant_context.addon_vani_ai` |
| Implementation (virtual support) | ₹10,000 one-time | Plain one-off block, no metering |
| Notification top-ups | Per `t_bm_topup_pack` | Above the included pool |
| Storage | 100 MB free, then ₹250 per 100 MB per year | **Blocked — see §5.3** |

### 2.5 Discount campaigns

Two mechanisms, both already present:
- `t_bm_topup_pack` has `original_price`, `discount_percentage`, `promotion_text`,
  `promotion_ends_at` — built for exactly this.
- Contract templates carry the contract-level discount
  (`discount_type` / `discount_value` / `discount_total`).

Either amend the existing template's discount or publish a new campaign template.

### 2.6 GST

One invoice at the point of sale, GST as applicable, done. **No per-consumption
GST** — issuing a tax invoice per ₹200 deduction is not practical.

A ₹1,000 top-up is invoiced as ₹1,000 + GST; the wallet holds ₹1,000 of usable
value. `t_bm_invoice` already has `subtotal`, `tax_amount`, `discount_amount`.

### 2.7 Vikuna (platform tenant)

No limits, no wallet, no metering. Implement as `limit_* = NULL` — the schema
already documents `NULL = unlimited` — **not** a large sentinel number. NULL
avoids "99% used" warnings, arithmetic edge cases and eventual exhaustion.
Set `billing_mode = 'exempt'` so wallet checks are bypassed entirely.

---

## 3. Notification credits

### 3.1 Channels

Four channels exist: **SMS, email, WhatsApp, in-app**. Only **email and WhatsApp**
are currently activated.

### 3.2 Pooling — tenant level, not contract level

Credits granted on contract creation go to the **tenant-level pool**. There is no
per-contract credit bucket. A tenant creating 10 contracts holds 150 pooled
credits; any of their contracts may draw on them.

Consequence to accept knowingly: a chatty contract can consume another
contract's allowance. Commercially this reads as generous and is the simpler
design. Per-contract sub-ledgers would require a `contract_id` dimension on
`t_bm_credit_balance`, which does not exist.

The **grant is still attributed** to the contract that caused it, via
`t_bm_credit_transaction.reference_type = 'contract'` / `reference_id` — this is
what powers "where did my credits come from" in the OPS widget (§6). See §5.2:
that journal write does not currently happen.

### 3.3 RESOLVED — four per-channel pools

**Owner decision 2026-08-05: four separate per-channel pools**, one each for
whatsapp / email / sms / inapp. Not a shared bucket.

- Each pool starts at **0**.
- On contract creation, credits are added to **each** pool.
- Accrual is **cumulative**: a WhatsApp pool at 9 plus a new contract's 15
  becomes 24. Creating a contract never resets or reduces a pool.
- Any of the tenant's contracts may draw on any pool.

This maps directly onto `t_bm_credit_balance`, already keyed
`(tenant_id, credit_type, channel)` — four rows per tenant.

Because each channel has its own pool, **no per-channel debit weighting is
needed** — that question is closed. In-app is metered like the others (it has a
pool), though it costs nothing to send.

Schema consequence, applied in migration 010: `t_tenant_context` had
`credits_whatsapp` / `credits_sms` / `credits_email` / `credits_pooled` but no
in-app column. `credits_inapp` and `flag_can_send_inapp` were added.

### 3.4 The grant rate is configuration, not code

**Owner decision 2026-08-05: the "15 per contract" must NOT be hardcoded.** It is
authored by a human in catalog-studio, as a metering block on the platform
contract template (§5.7), and differs per plan (15 on per-contract, 20 on plans).

Resolved rates are cached on `t_tenant_context.credit_grant_rates` (JSONB, added
in migration 010) so the contract-creation hook does not walk back to the plan's
blocks on every contract:

```json
{ "whatsapp": 15, "email": 15, "sms": 0, "inapp": 0 }
```

JSONB rather than columns, so activating a new channel needs no migration. The
settlement hook writes it; an empty object means "grant nothing".

### 3.5 Margin note

At ContractNest's own top-up sell prices (WhatsApp ≈ ₹3/msg, email ≈ ₹1/msg from
the gen-2 packs), granting per-channel means each contract hands out roughly ₹60
of credits on the per-contract plan and ₹80 on plans:

| Mode | Revenue/contract | Credits bundled (at sell price) | % |
|---|---|---|---|
| Per-contract | ₹200 | ₹60 | 30% |
| Quarterly | ₹120 | ₹80 | 67% |
| Yearly | ₹100 | ₹80 | 80% |

At actual MSG91 **cost** these figures are far smaller and healthy — the top-up
packs evidently carry a large margin. **Worth verifying against real MSG91 rates
once**: if WhatsApp cost is anywhere near ₹3, the Yearly plan loses money on
notifications alone.

---

## 4. Test environment (`is_live = false`)

### 4.1 Limits

| Resource | Test cap |
|---|---|
| Contacts | 20 |
| Templates | 2 |
| Contracts | 6 |
| RFQs / RFPs | 3 |
| Notifications | None (already restricted) |

### 4.2 Design decision — test mode never touches the ledger

`is_live BOOLEAN DEFAULT true` exists on **32 tables** (including `t_contracts`,
`t_contacts`, `t_cat_templates`) but on **zero** `t_bm_*` tables and not on
`t_tenant_context`, whose PK is `(product_code, tenant_id)`.

Rather than adding an environment dimension to the whole metering layer:

- Test limits are **identical for every tenant**, so they are **static config**,
  not per-tenant rows.
- Test usage is **counted directly from source tables** (`t_contracts`,
  `t_contacts`, `t_cat_templates` where `is_live = false`). At these volumes
  (max 6, 20, 2) a live count is trivially cheap.
- Test activity **never** deducts the wallet, **never** grants credits, and
  **never** appears in the ledger or on an invoice.

This keeps the metering layer live-only and adds no `t_bm_*` schema.

### 4.3 Mandatory guard

**Test records must never count toward freemium, plan quota, or the wallet.**
Every metering hook must filter `is_live = true` before recording usage or
deducting. There are already 29 test contracts and 1 test RFQ in the database —
without this filter, real tenants would be billed for practice data on day one.

---

## 5. What must be built

Live state check (2026-08-05): **0** rows in `t_bm_tenant_subscription`, **0** in
`t_tenant_context`, 4 credit-balance rows, 2 transaction rows. Nothing in
production depends on current behaviour — this is a clean slate, not a migration.

### 5.1 FIFO credit lots — DEFERRED (was: required by 1-year wallet validity)

> **STATUS 2026-08-05: deferred out of Sprint 1.**
>
> Owner decision: **credits never expire** — they are consumed, and have no end
> date. And the Step 1 baseline found that `purchase_topup` computes an expiry
> then **discards** it (`add_credits` has no expiry parameter), so **every
> `expires_at` in the database is NULL and nothing has ever expired**.
>
> Lots exist only to make expiry correct. With nothing expiring in the
> plans-only scope, they buy nothing today. Deferred until Mode A (the 1-year
> wallet) ships.
>
> **Guard:** the Step 5 top-up SKU cleanup must set `expiry_days = NULL` on every
> surviving pack. Leaving a pack with `expiry_days = 365` active would re-arm the
> defect below.
>
> The defect description is retained because it becomes live again the moment
> anything expires.

**Defect.** The current design silently destroys money:

```
unique_tenant_credit_channel  UNIQUE (tenant_id, credit_type, channel)
    → exactly ONE balance row per credit type, with ONE expires_at

add_credits()            → balance = balance + qty; never touches expires_at
process_credit_expiry()  → zeroes the ENTIRE balance when expires_at <= NOW()
```

Worked example: top up ₹1,000 on 1 Jan 2026 (`expires_at` = 1 Jan 2027). Top up
₹5,000 on 1 Dec 2026 → balance ₹6,000, `expires_at` **still** 1 Jan 2027. On
1 Jan 2027 the expiry job wipes all ₹6,000 — including the ₹5,000 bought four
weeks earlier.

**Required work:**
- Drop `unique_tenant_credit_channel`; allow multiple lots per
  `(tenant_id, credit_type, channel)`, each with its own `expires_at`.
- `add_credits` — insert a **new lot** rather than incrementing.
- `deduct_credits` — consume **oldest-unexpired-first**, spanning lots, under
  `FOR UPDATE`.
- `process_credit_expiry` — expire **per lot**, not per balance row.
- Balance reads become a sum over unexpired lots; `t_tenant_context` caches the
  total so gates still read one row.

This is the largest single piece of work the commercial model implies.

### 5.2 Ledger journal writes — currently missing entirely

**Defect.** Neither `add_credits` nor `deduct_credits` writes a
`t_bm_credit_transaction` row. Verified: both accept `p_reference_id`, echo it
back in the JSON response, and **discard it**. Only `process_credit_expiry`
writes to the journal.

Consequence: there is no audit trail for any money movement, and the
contract-attribution requirement in §3.2 is impossible until this is fixed.

**Required:** both RPCs insert a journal row with `transaction_type`,
`quantity`, `balance_before`, `balance_after`, `reference_type`, `reference_id`,
`description`, inside the same transaction as the balance change.

Live evidence: the journal's last `balance_after` is **440**, while the actual
email balance is **535**. The intervening movements were made by `add_credits`
and left no trace.

### 5.2b Three further defects found in the Step 1 baseline

Full detail in `SPRINT1_STEP1_BASELINE.md` §5.

**D3 — the context trigger references a column that does not exist.**
⚠ **Sprint 2 blocker.** `trg_fn_update_context_on_credit_change` aggregates
`balance - COALESCE(reserved, 0)`, but the column is **`reserved_balance`**.
This raises `column "reserved" does not exist`.

It has never fired because the function returns early when the tenant has no
active subscription, and there are **0 subscription rows**. **The moment Sprint 2
assigns subscriptions, every credit balance change starts throwing.** Must be
fixed before the backfill.

**D4 — `purchase_topup` always fails.** It inserts
`t_bm_billing_event (… processed, processed_at)`; the column is **`status`**.
The top-up purchase path is broken end to end.

**D5 — `purchase_topup` credits the wrong pool.** It passes `channel = NULL` with
a comment claiming channel is "determined by credit_type" — it is not.
`t_bm_topup_pack` had no channel column, so channel existed only in the pack
*name*. Buying a WhatsApp pack credited the **pooled** bucket, invisible to the
WhatsApp gate — directly at odds with the four-pool model in §3.3.

The data half is fixed: `t_bm_topup_pack.channel` was added in migration 010.
Passing it through is Step 3, and each surviving pack needs its channel set
during the Step 5 SKU cleanup.

### 5.3 Storage metering — blocked on the Drive decision only

> **CORRECTION 2026-08-05.** An earlier draft of this section said storage is
> never measured. That was wrong. **Storage IS measured**, on `t_tenants`:
> `storage_quota` (currently 40), `storage_consumed`, `storage_provider`
> (`firebase`), `storage_setup_complete`. Seven tenants carry real consumption
> (Vikuna 395,488 — units look like bytes).
>
> What is unfed is the **metering layer's copy** —
> `t_tenant_context.usage_storage_mb` and `t_bm_subscription_usage` rows with
> `metric_type = 'storage_mb'`. `storage_mb` is declared in
> `billingValidators.ts` and `billing.dto.ts` and read in
> `005_phase2_rpc_functions.sql`, but nothing writes those.
>
> So storage billing needs a **sync from `t_tenants.storage_consumed` into the
> metering layer**, not new measurement. Confirm the unit (bytes vs KB) before
> converting to MB.

It remains blocked on an unresolved contradiction in
`ContractNest_Evidence_AuditTrail_Spec.md`:

- §2.1 says PAYG storage is the **tenant's own** Google Drive — costs ContractNest
  nothing, so PAYG tenants should not be charged for it.
- The accompanying architecture diagram shows a **ContractNest-owned** Workspace
  with 1–3 Shared Drives serving all tenants — ContractNest carries the cost, so
  everyone should be charged.

The ₹250 / 100 MB / year rule cannot be written until that is settled. Drive
methodology is being revised in a following session; storage billing parks with it.

Also note when it resumes: `limit_storage_mb` currently defaults to **40**, and
needs to be **100**. And sanity-check the margin — ₹250 per 100 MB is
₹2,500/GB/year, which is far above pooled Workspace storage cost. That is fine as
a deterrent price, but it is not cost-recovery and should be a deliberate choice.

### 5.4 `billing_mode` discriminator

`t_tenant_context` has no field indicating how a tenant is billed. Every gate
needs it to know whether to check *wallet balance* or *quota remaining*.

Add `billing_mode`: `'freemium' | 'poc' | 'per_contract' | 'plan' | 'exempt'`,
plus a cached `wallet_balance_paise` column so the OPS widget and gates read one
row without touching the ledger.

**Store money in paise.** `balance` is `INTEGER`; ₹1,000 = 100000 paise. Integer
money is correct practice and avoids float error.

`credit_type` on `t_bm_credit_balance` has **no CHECK constraint** (verified), so
`credit_type = 'wallet'` needs no schema change, and
`deduct_credits(tenant, 'wallet', 20000, NULL, 'contract', contract_id, …)` works
with the existing signature.

### 5.5 New limit columns

`t_tenant_context` has only `limit_users`, `limit_contracts`, `limit_storage_mb`.
Plans and freemium also need contacts, templates and RFQ counts — add
`limit_contacts`, `limit_templates`, `limit_rfqs` and their `usage_*`
counterparts. (Test-mode caps do **not** use these — see §4.2.)

### 5.6 Always write a subscription row

`flag_can_access` defaults FALSE until a subscription is assigned
(`006_tenant_context.sql:545`). In wallet mode there may be no natural
subscription row.

**Decision: always write one `t_bm_tenant_subscription` row**, carrying the mode.
Every existing trigger and flag path then keeps working unchanged, with no
parallel code path.

### 5.7 Settlement hook

The one genuinely new piece of logic: when a billing event settles for a platform
contract block carrying `config.metering`, call `add_credits` / `purchase_topup`
/ set limits. **Idempotent on billing-event id.**

Metering blocks follow the Group Session precedent — a new `m_category_details`
row (`sub_cat_name='metering'`, display "Credit Pack") stored as `type='service'`,
`category='metering'`, so pricing and the cadence engine come free. Seed it
visible to the platform tenant only.

### 5.8 Metering hooks

| Hook | Action |
|---|---|
| Contract leaves draft (**sent**), `is_live=true`, not RFQ-derived | Freemium/quota check → `deduct_credits('wallet', 20000, …)` unless free → grant credits per `credit_grant_rates` → `record_usage` |
| RFQ leaves draft (**sent**), `is_live=true` | Same, ₹400 (40000 paise) |
| Contract derived from an RFQ | **Waived for everyone**, including the vendor who authors it — see §7 |
| Any CNAK / public route | **No hook at all** — see §1A |
| Contract accepted by buyer | **No charge** — see §1A |
| Notification send | `check_credit_availability` → send → `deduct_credits` → waiting-JTD path when empty |
| VaNi access | Read `t_tenant_context.addon_vani_ai` (replaces the `VANI_ENTITLEMENT_MODE` env check) |

### 5.9 Wallet-empty UX

When the wallet empties mid-period, contract creation blocks. Mirror the existing
waiting-JTD pattern (`get_waiting_jtd_count`, `release_waiting_jtds`, FIFO release
on top-up) rather than throwing a hard error.

---

## 6. OPS dashboard — Tenant Context widget

A widget on the OPS dashboard tracking the pool:

- Wallet balance (₹) and expiry date of the **oldest** lot
- Notification pool balance, per channel or pooled per §3.3
- Contracts used vs quota (or "freemium 3 remaining")
- Recent ledger activity from `t_bm_credit_transaction`, attributed to the
  contract that caused each movement (§3.2, requires §5.2)
- Low-balance state driven by existing `flag_credits_low` / `flag_near_limit`

Also: a toast on contract creation — *"15 credits added to your notification
pool"* — using the existing toast component.

Note only one component currently consumes tenant context
(`catalog/ServiceForm/ServiceConfigStep.tsx`); this widget is effectively the
first real consumer.

---

## 7. RFQ pricing and the derived contract

₹400 is charged **upfront when the RFQ leaves draft**, and covers the RFQ plus
the contract that will be derived from it. The derived contract is **not charged
again — to anyone**.

### The vendor is not charged either — RESOLVED 2026-08-05

An earlier draft of this section asked whether the awarded **vendor**, who
authors the contract under the Sprint 3 model, should pay ₹200 as its creator.

**They do not.** The ₹400 already covered that contract. The waiver attaches to
the contract, not to a party — whoever authors it, it is free. This is consistent
with §1A: the creator pays, except where the record has already been paid for.

### Blocker — the waiver needs a linkage column

Implementing the waiver requires knowing a contract came from an RFQ. Verified
live: `t_contracts.rfq_number` is populated on **9 of 9** `record_type='rfq'`
rows and **0 of 208** `record_type='contract'` rows — it is the RFQ's *own*
number, not a back-reference on a derived contract. There is no `source_rfq_id`.

That linkage is point 5 of the Sprint 3 RFQ-Award spec in `CLAUDE.md`
(bidirectional `t_contracts.source_rfq_id` ↔ RFQ-side `contract_id`). **The
waiver cannot ship before that column does.**

Until it exists, an RFQ-derived contract has no way to identify itself, and the
metering hook would charge its author ₹200 on top of the buyer's ₹400.

---

## 8. Keep / deprecate

> **CORRECTED 2026-08-05 (owner).** An earlier draft of this section said to
> **delete** the plan catalog during Sprint 4. That is wrong on timing and on
> method.
>
> Owner's position: **the whole of `/settings/businessmodel/admin/pricing-plans`
> will be deprecated once `/contracts` has stabilised into the product.** It is
> not removed as part of this work. Until then it is left completely alone — not
> extended, not repriced, not cleaned up, not deleted.
>
> This also retires the earlier "we cannot delete the plan catalog because
> `t_bm_tenant_subscription.version_id` is NOT NULL" finding. That was solving
> the wrong problem: the constraint is real, but it only matters if the plan
> catalog is the subscription record — and it is not. The **contract** is.

### The business model IS a contract

Vikuna authors **contract templates** in `/contracts/create/templates/` — the
template designer that already exists (`template-designer`, `my-templates`,
`preview`, `template-analytics`). A tenant buys a template and it becomes their
contract, with Vikuna as seller.

```
Vikuna authors template in /contracts/create/templates/
        │   (metering blocks inside carry grant rates + credit-pack pricing,
        │    authored in catalog-studio by a human)
        ▼
Tenant buys the template
        ▼
A real contract is created  (Vikuna seller, tenant buyer)
        ▼
Payment via Razorpay on the existing contract payment-gateway path
        ▼
Settlement hook grants credits / sets limits / writes credit_grant_rates
        ▼
t_tenant_context updated — gates read one row
```

Templates to author: Freemium, POC ₹1,500, Quarterly ₹5,999, Yearly ₹19,999,
VaNi ₹4,999/mo, Implementation ₹10,000, Credit Pack.

### Leave alone (deprecated later, on the owner's timing)

`/settings/businessmodel/admin/**`, `components/businessmodel/*`, the mock
tenant pages, `useBusinessModelQueries.ts`, `utils/fakejson/*`, edge functions
`plans` / `plan-versions`, `businessModelRoutes` / `planController` /
`planVersionController` / `businessModelService`, and their tables
`t_bm_pricing_plan`, `t_bm_plan_version`, `t_bm_topup_pack`, plus the
`purchase_topup` RPC.

**No pricing, SKU or cleanup decisions are needed for any of this.** It is a
dead surface awaiting deprecation, not an input to the new model.

### Keep — the ledger

`t_bm_credit_balance`, `t_bm_credit_transaction`, `t_bm_billing_event`,
`t_bm_subscription_usage`, `t_bm_invoice`, `t_tenant_context` + triggers, the
`billing` edge function and the credit/usage RPCs, `/api/billing/*`,
`/api/tenant-context/*`.

A contract block records the *price* of a credit pack; it cannot hold a
*balance*. That is why the ledger stays.

### Open — where the subscription record lives

`t_tenant_context` is populated by triggers on `t_bm_tenant_subscription`. If the
contract is the subscription, that source is wrong. Two options, **not yet
decided**:

- **(a)** On platform-contract activation, write a `t_bm_tenant_subscription` row
  as a *projection*. Contract stays source of truth; every existing trigger,
  flag and the VaNi gate keep working unchanged. Small change, and compatible
  with the table surviving until deprecation.
- **(b)** Repoint the context triggers at `t_contracts` and retire
  `t_bm_tenant_subscription`. Cleaner end state, more work, touches the VaNi gate.

(a) is the lower-risk fit given the deprecate-later timing.

---

## 9. Suggested build order

1. **Ledger correctness** — §5.1 FIFO lots + §5.2 journal writes. Everything else
   sits on these, and they are cheapest now while the tables are empty.
2. **`billing_mode` + wallet column + new limits** (§5.4, §5.5, §5.6).
3. **Metering hooks** (§5.8) with the `is_live` guard (§4.3) — contract/RFQ
   deduction, credit grant, notification spend.
4. **Metering block category + settlement hook** (§5.7).
5. **Platform contract templates** — freemium, POC, Quarterly, Yearly, VaNi,
   implementation, top-ups. Seed the Vikuna platform tenant.
6. **OPS widget** (§6).
7. **Keep/delete list** (§8).
8. **Deferred** — storage metering (§5.3, on Drive); RFQ waiver (§7, on Sprint 3
   linkage); VaNi entitlement switch (§5.8, on VaNi launch).

---

## 10. Open decisions

### Closed 2026-08-05

| # | Decision | Outcome |
|---|---|---|
| 1 | Pooled vs per-channel buckets | **Four per-channel pools**, cumulative (§3.3) |
| 2 | Are in-app notifications metered? | **Yes** — it has its own pool |
| 3 | Channel debit weights | **Moot** — separate pools need no weighting |
| — | Credit expiry | **Never expire**; consumed only (§5.1) |
| — | Is the grant rate hardcoded? | **No** — catalog-studio config (§3.4) |
| — | Where is the channel list maintained? | **LOV** `notification_channels`, Vikuna tenant only |
| — | RFQ-derived contract charging | **₹400 upfront covers both**; derived contract free (§7) |
| — | POC sequencing | **After** the 3 freemium contracts |
| — | Who pays? | **The creator.** Viewing via CNAK is free and read-only (§1A) |
| — | Seller / buyer / both | No special case; role is per-contract, bill the act (§1A) |
| — | Does the vendor pay for an RFQ-derived contract? | **No** — the ₹400 covered it, waiver attaches to the contract (§7) |
| — | Is a passive buyer free? | **Yes to view, always.** They pay only when they create (§1A) |

### Still open

| # | Decision | Blocks |
|---|---|---|
| 5 | PAYG storage — tenant-owned Drive or ContractNest-owned? (§5.3) | Storage billing |
| 6 | Credit-pack SKU pricing — final prices, channels, and `expiry_days = NULL` | Step 5 cleanup |
| 7 | When does `VANI_ENTITLEMENT_MODE` flip `open` → `subscription`? | VaNi gating |
| 8 | Verify real MSG91 per-message cost against the bundle (§3.5) | Plan margin |
| 9 | Backfill: which plan, quota grandfathering, tenant notification (POA §4.3) | Sprint 2 |

---

## 11. Implementation log

| Date | Step | What landed |
|---|---|---|
| 2026-08-05 | Sprint 1 / Step 1 | Baseline snapshot captured (read-only). Found D3, D4, D5. |
| 2026-08-05 | Sprint 1 / Step 2 | Migrations **010** (additive schema) and **011** (channels LOV) applied to production and verified. No behaviour change — nothing reads the new columns until Step 3. |
| 2026-08-05 | Sprint 1 / Steps 3–4 | Migrations **012**, **013**, **014** applied and verified — 13/13 regression tests pass. See `SPRINT1_STEP3_4_RESULTS.md`. Regression found **D7** (`release_waiting_jtds` had the same wrong-column bug, and it fires with no early return — `add_credits` was throwing for **every** tenant in production) and a second NOT NULL column stacked behind D4. Also found that `t_bm_tenant_subscription.version_id` is NOT NULL and references `t_bm_plan_version`, so the plan catalog **tables** cannot be deleted as §8 assumes — only the authoring UI. |
