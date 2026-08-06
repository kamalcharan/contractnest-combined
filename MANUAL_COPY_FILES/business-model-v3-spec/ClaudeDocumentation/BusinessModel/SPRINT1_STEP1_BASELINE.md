---
title: Sprint 1 / Step 1 — Pre-change Baseline Snapshot
project: ContractNest
date: 2026-08-05
purpose: Rollback reference and before/after diff for the Sprint 1 ledger work
---

## 1. Why this exists

Steps 2–3 change `t_bm_credit_balance` and the RPCs around it. This file records
the exact prior state so any change can be reverted or diffed.

**It also turned up three defects not visible in the migration files.** See §5 —
two of them are Sprint 2 blockers.

---

## 2. Data snapshot (2026-08-05)

### 2.1 `t_bm_credit_balance` — 4 rows, all one tenant

All rows belong to `a58ca91a-7832-4b4c-b67c-a210032f26b8` and are seed/test data
(ids of the form `cb000001-0000-...`).

| id (suffix) | credit_type | channel | balance | reserved | expires_at | low_threshold |
|---|---|---|---|---|---|---|
| ...0001 | notification | email | 535 | 0 | **NULL** | 50 |
| ...0002 | notification | sms | 85 | 0 | **NULL** | 20 |
| ...0003 | notification | whatsapp | 42 | 0 | **NULL** | 10 |
| ...0004 | ai_report | NULL | 8 | 0 | **NULL** | 5 |

`last_topup_at` = 2025-12-21 on rows 2–4, 2026-01-15 on row 1.

**Note: every `expires_at` is NULL.** Nothing in the system has ever expired.

### 2.2 `t_bm_credit_transaction` — 2 rows

| transaction_type | channel | quantity | balance_before | balance_after | reference | description |
|---|---|---|---|---|---|---|
| deduction | email | -5 | 450 | 445 | NULL | Test deduction |
| deduction | email | -5 | 445 | 440 | NULL | Test deduction |

**Evidence of the journal defect:** the journal's last `balance_after` is **440**,
but the live email balance is **535**. The intervening movements were made by
`add_credits`, which writes no journal row. The two rows above were inserted by
hand during testing.

### 2.3 Other counts

| Table | Rows |
|---|---|
| `t_bm_tenant_subscription` | 0 |
| `t_tenant_context` | 0 |
| `t_tenants` | 134 total, all orphaned — but **112 are `is_test = true`**; 21 real active, 1 real closed |
| `t_contracts` (contract, live) | 179 |
| `t_contracts` (rfq, live) | 8 |
| `t_contracts` (test) | 30 |

---

## 3. Functions captured

Full `pg_get_functiondef` output for the following was captured at snapshot time
and is reproduced in §6:

`add_credits`, `deduct_credits`, `check_credit_availability`,
`get_credit_balance`, `process_credit_expiry`, `purchase_topup`,
`reserve_credits`, `release_reserved_credits`,
`trg_fn_update_context_on_credit_change`, `trg_fn_release_jtds_on_credit_topup`

To regenerate at any point:

```sql
select p.proname, pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and pg_get_functiondef(p.oid) ilike '%t_bm_credit_balance%'
order by p.proname;
```

### Triggers on `t_bm_credit_balance`

| Trigger | Function |
|---|---|
| `trg_credit_balance_update_context` | `trg_fn_update_context_on_credit_change` |
| `trg_credit_topup_release_jtds` | `trg_fn_release_jtds_on_credit_topup` |
| `update_t_bm_credit_balance_updated_at` | `update_updated_at_column` |

### Indexes on `t_bm_credit_balance`

```
t_bm_credit_balance_pkey        UNIQUE (id)
unique_tenant_credit_channel    UNIQUE (tenant_id, credit_type, channel)
idx_bm_credit_balance_tenant    (tenant_id)
idx_bm_credit_balance_type      (tenant_id, credit_type)
idx_bm_credit_balance_expiry    (expires_at) WHERE expires_at IS NOT NULL
idx_bm_credit_balance_low       (tenant_id, credit_type) WHERE balance <= low_balance_threshold
```

---

## 4. Previously known defects (from spec §5)

| # | Defect | Status |
|---|---|---|
| D1 | Neither `add_credits` nor `deduct_credits` writes `t_bm_credit_transaction`; `p_reference_id` is accepted and discarded | Confirmed — see §2.2 |
| D2 | Single balance row per credit type with one `expires_at`; expiry zeroes the whole balance | Confirmed, but see D6 — currently unreachable |

---

## 5. NEW defects found while capturing the baseline

### D3 — Context trigger references a column that does not exist ⚠ **Sprint 2 blocker**

`trg_fn_update_context_on_credit_change` computes:

```sql
COALESCE(SUM(CASE WHEN channel = 'whatsapp' THEN balance - COALESCE(reserved, 0) END), 0)
```

There is no `reserved` column on `t_bm_credit_balance` — it is **`reserved_balance`**.
This SQL raises `column "reserved" does not exist`.

It has never fired because the function returns early when the tenant has no
active subscription:

```sql
IF v_product_code IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
```

With **0 subscription rows**, that early return always wins.

> **The moment Sprint 2 assigns subscriptions to any tenant, every single
> credit balance change starts throwing.** This must be fixed in Sprint 1,
> before the backfill.

### D4 — `purchase_topup` inserts a non-existent column ⚠ **always throws**

```sql
INSERT INTO t_bm_billing_event (tenant_id, event_type, event_data, processed, processed_at)
```

`t_bm_billing_event` has **`status`**, not `processed`. Every call to
`purchase_topup` fails on this insert. The top-up purchase path is broken
end to end.

### D5 — `purchase_topup` credits the wrong pool ⚠ **breaks per-channel design**

```sql
v_result := add_credits(
    p_tenant_id, v_pack.credit_type, v_pack.quantity,
    NULL, -- channel - determined by credit_type
    ...
```

The channel is passed as `NULL` with a comment claiming it is derived from
`credit_type` — it is not. `t_bm_topup_pack` has no channel column; channel is
only implied by the pack **name** ("WhatsApp 500 Pack").

Result: buying a WhatsApp pack credits the **pooled** bucket (`channel IS NULL`),
not the WhatsApp bucket. Under the agreed per-channel pool model (four pools:
whatsapp / email / sms / inapp) this is simply wrong — the purchased credits
would be invisible to the WhatsApp gate.

Fix requires a `channel` column on `t_bm_topup_pack`, plus passing it through.

### D6 — `purchase_topup` computes expiry and then discards it

```sql
IF v_pack.expiry_days IS NOT NULL THEN
    v_expiry := NOW() + (v_pack.expiry_days || ' days')::INTERVAL;
END IF;
```

`v_expiry` is returned in the response JSON but **never written to the balance
row** — `add_credits` has no expiry parameter. So despite gen-2 packs carrying
`expiry_days = 365`, no credit has ever been given an expiry date. This is
consistent with §2.1, where every `expires_at` is NULL.

**Consequence:** D2 (the expiry-wipe defect) is currently unreachable, because
nothing ever sets `expires_at`.

---

## 6. Impact on the Sprint 1 plan

The owner has since decided that **credits never expire — they are consumed, and
have no end date**. Combined with D6 (nothing writes `expires_at` today), this
means:

- **FIFO credit lots are not needed in Sprint 1.** They exist only to make expiry
  correct, and nothing in the plans-only scope expires. The lot table should be
  deferred to whenever Mode A (the 1-year wallet) ships.
- Sprint 1's ledger work reduces to: **D1** (journal writes), **D3** (trigger
  column), **D4/D5** (top-up path), plus the additive `t_tenant_context` columns.
- Any top-up pack left active with a non-null `expiry_days` would re-arm D2. The
  Step 5 SKU cleanup should therefore **set `expiry_days = NULL` on every
  surviving pack**, matching the never-expire decision.

This is a meaningful reduction in Sprint 1 scope and risk.

---

## 7. Rollback reference

The captured function definitions are the rollback target. To restore any
function, re-apply its `CREATE OR REPLACE FUNCTION` body as captured on
2026-08-05 via the query in §3.

No schema was altered during Step 1. This step was read-only.
