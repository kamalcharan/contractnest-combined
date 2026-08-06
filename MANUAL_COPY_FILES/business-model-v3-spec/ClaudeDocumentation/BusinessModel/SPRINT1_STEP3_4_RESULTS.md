---
title: Sprint 1 / Steps 3–4 — Ledger RPC Rework + Regression Results
project: ContractNest
date: 2026-08-05
status: Applied to production and verified
---

## 1. What was applied

| Migration | Purpose |
|---|---|
| `012_bm_v3_ledger_rpcs` | D1 journal writes, D3 context-trigger column, D4/D5 topup path, inapp channel threaded through the flag helper and both context triggers |
| `013_fix_release_waiting_jtds` | **D7** — same wrong-column bug in `release_waiting_jtds` |
| `014_purchase_topup_event_source` | **D4 second layer** — `event_source` is also NOT NULL |

Six functions touched: `fn_recalc_credit_flags`, `trg_fn_update_context_on_credit_change`,
`trg_fn_update_context_on_subscription`, `add_credits`, `deduct_credits`,
`purchase_topup`, plus `release_waiting_jtds`.

---

## 2. Two defects the regression step found

Steps 3 and 4 were planned as "apply, then verify". Verification found two more
defects that static reading had missed. Both were invisible until the functions
actually ran.

### D7 — `release_waiting_jtds` — production was already broken

The very first regression call failed:

```
ERROR: column "reserved" does not exist
CONTEXT: PL/pgSQL function release_waiting_jtds(uuid,text,integer) line 33
         SQL statement "SELECT release_waiting_jtds(NEW.tenant_id, v_channel, 50)"
         PL/pgSQL function trg_fn_release_jtds_on_credit_topup() line 11
```

Same defect as D3 — `COALESCE(reserved, 0)` where the column is
`reserved_balance` — but in a function reached by a **different** trigger.

**This is more severe than D3.** `trg_fn_update_context_on_credit_change` returns
early when the tenant has no active subscription, which is why D3 was latent.
`trg_credit_topup_release_jtds` has **no early return** and fires on every
balance increase.

> **`add_credits` was throwing for every tenant in production.** No credit could
> be added to anyone. Not a Sprint 2 risk — already broken, and it would have
> blocked Step 6 (seeding Vikuna) and every grant in Sprint 3.

Fixed in migration 013.

### D4 second layer — `event_source` NOT NULL

Migration 012 fixed `purchase_topup`'s `processed` → `status` column error.
Running it then hit a second NOT NULL column in the same INSERT —
`t_bm_billing_event.event_source` — which the original never reached because it
failed on `processed` first.

Two defects were stacked in one statement. Only executing the function exposed
the second. Fixed in migration 014.

---

## 3. Regression results

All tests run against the live database. Subscription-dependent tests ran inside
`BEGIN … ROLLBACK`; rollback was confirmed afterwards.

| # | Test | Result |
|---|---|---|
| 1 | `add_credits` succeeds | ✅ 42 → 57 |
| 2 | Cumulative accrual (owner's "9 + 15 = 24" model) | ✅ 42 + 15 = 57, no reset |
| 3 | `add_credits` journals with contract attribution | ✅ `topup / contract / <contract uuid>` |
| 4 | `deduct_credits` succeeds and journals | ✅ 57 → 54, `deduction / contract`, quantity −3 |
| 5 | Journal reconciles to balance | ✅ whatsapp live 54 = journal `balance_after` 54 |
| 6 | **D3** — credit change with an ACTIVE subscription | ✅ no error (threw before 012) |
| 7 | Per-channel pools populate correctly | ✅ whatsapp 15, email 15, sms 0, inapp 0 |
| 8 | Wallet cached in paise | ✅ `wallet_balance_paise` = 100000 (₹1,000) |
| 9 | Flags computed incl. in-app | ✅ whatsapp/email true, inapp false (0 credits), `credits_low` false, `can_access` true |
| 10 | **D4** — `purchase_topup` completes | ✅ `success: true` (always failed before) |
| 11 | **D5** — pack credits the right pool | ✅ 500 landed on `channel = 'whatsapp'`, not pooled |
| 12 | Topup journals | ✅ `topup / topup_pack`, quantity 500 |
| 13 | Billing event written | ✅ `status = completed`, `event_source = purchase_topup` |

### Database restored

The D1 tests ran outside a transaction, so they were reverted by hand. Final
state matches the Step 1 baseline exactly:

```
t_bm_credit_transaction        2   (the two original hand-inserted rows)
whatsapp balance              42   (restored from 54)
t_bm_tenant_subscription       0
t_tenant_context               0
t_bm_billing_event             0
t_bm_topup_pack with channel   0
```

---

## 4. Findings for later steps

### 4.1 The plan catalog cannot simply be deleted ⚠ affects spec §8

Creating a subscription for the D3 test failed three times on NOT NULL columns:

```
t_bm_tenant_subscription.version_id      NOT NULL  -> FK to t_bm_plan_version
t_bm_plan_version.created_by             NOT NULL
t_bm_tenant_subscription.currency_code   NOT NULL
t_bm_tenant_subscription.current_tier    NOT NULL  (jsonb)
```

**`t_bm_tenant_subscription.version_id` is NOT NULL and references
`t_bm_plan_version`.** Spec §8 lists the plan catalog for deletion — but no
subscription can exist without a plan version row.

Options, to decide before Sprint 4:
1. Keep a minimal `t_bm_pricing_plan` + `t_bm_plan_version` row behind each
   platform contract template (delete only the authoring **UI**, keep the tables).
2. Make `version_id` nullable and let the contract be the source of truth.

Option 1 is smaller and keeps the existing triggers working —
`trg_fn_update_context_on_subscription` reads `plan_name` through that join.

### 4.2 Orphaned seed data

The 4 `t_bm_credit_balance` rows belong to tenant
`a58ca91a-7832-4b4c-b67c-a210032f26b8`, which **does not exist in `t_tenants`**
(the FK failure proved it). `t_bm_credit_balance` has no FK to `t_tenants`, so
the rows survive. Worth deleting during Step 5 cleanup.

### 4.3 Pre-existing journal drift is not repaired

The email pool still shows live balance **535** against a journal
`balance_after` of **440**. That gap predates the fix and cannot be
reconstructed. From now on every movement is journalled; the historical
discrepancy stays. If a clean ledger start matters, post one `adjustment` row
for the 95-credit difference during Step 5.

---

## 5. Defect register

| # | Defect | Found | Status |
|---|---|---|---|
| D1 | `add_credits` / `deduct_credits` write no journal row | Spec analysis | ✅ fixed (012) |
| D2 | Expiry zeroes the whole balance | Spec analysis | ⏸ unreachable — nothing expires; deferred with FIFO lots |
| D3 | Context trigger: `reserved` vs `reserved_balance` | Step 1 baseline | ✅ fixed (012) |
| D4 | `purchase_topup`: `processed` column, then `event_source` NOT NULL | Step 1 baseline + Step 4 run | ✅ fixed (012, 014) |
| D5 | `purchase_topup` credits pooled instead of per-channel | Step 1 baseline | ✅ fixed (010 column, 014 pass-through) |
| D6 | `purchase_topup` computes expiry then discards it | Step 1 baseline | ⏸ intentional — credits never expire |
| D7 | `release_waiting_jtds`: `reserved` vs `reserved_balance` | **Step 4 regression** | ✅ fixed (013) |

---

## 6. Next

Step 5 — top-up pack cleanup. Needs owner input on final SKUs, and should also:
- set `channel` on every surviving notification pack (D5 depends on it)
- set `expiry_days = NULL` on every surviving pack (keeps D2 unreachable)
- deactivate the duplicate generation (Email 500 exists at both ₹100 and ₹499)
- delete the orphaned seed balances (§4.2)
