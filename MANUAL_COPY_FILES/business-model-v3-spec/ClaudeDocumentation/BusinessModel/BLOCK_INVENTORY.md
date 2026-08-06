---
title: Platform block inventory — what Vikuna authors in catalog-studio
project: ContractNest
updated: 2026-08-06
scope: seller side (buyer side deferred)
---

## The two settled rules everything derives from

1. **Only the creator pays.** Whoever creates a contract or an RFQ is billed.
   The counterparty views and uses it for free, via CNAK. So only *creation*
   is capped and only *creation* is charged.
2. **Every creation event grants notification credits.** Contract or RFQ, the
   tenant's pools get **WhatsApp +15, Email +15**. Pools are tenant-level and
   accumulate: 9 + 15 = 24. Any contract may draw from the pool. Credits
   expire only on consumption.

## Why more than one block per plan

A metering block has exactly **one mode**. "Cap the tenant at 3 contracts" and
"grant 15+15 on each creation" are different modes, so they are different
blocks. That is not overhead — it is what makes the grant block reusable
across every plan instead of being re-entered per plan.

## The blocks

### Shared — authored once, used by every seller template

| Block | Mode | Config | Price |
|---|---|---|---|
| **Creation Notification Grant** | Per Creation | WhatsApp **15**, Email **15** | ₹0 |

One block. Every seller template includes it. If the rate ever changes from
15, it changes here once and every plan follows — which is the entire reason
the rate is config and not a constant in code.

SMS and In-App are inactive in the LOV, so they do not appear on the form and
grant nothing. Switching one on in `/settings/lov` makes it appear here with
no code change.

### Per plan — one allowance block each, because the numbers differ

| Block | Mode | Contracts | RFQs | Price |
|---|---|---|---|---|
| **Freemium Allowance** | Limit | 3 | 0 | ₹0 |
| **POC Allowance** | Limit | *tbc* | 0 | ₹1,500 |
| **Quarterly Allowance** | Limit | 50 | 0 | ₹5,999 |
| **Yearly Allowance** | Limit | 200 | 0 | ₹19,999 |

RFQs is 0 on every seller plan — only a buyer raises an RFQ. Blank writes 0,
so this is explicit rather than accidental.

The plan price sits on the **allowance block**, because a template's total is
the sum of its blocks and the grant block is ₹0.

### Add-ons — separate templates, bought on top of a plan

| Block | Mode | Config | Price |
|---|---|---|---|
| **VaNi AI** | Feature Flag | `addon_vani_ai` | ₹4,999 / month |
| **Credit Top-up** | One Time | WhatsApp *n*, Email *n* | *tbc* |
| **Implementation** | *not metering* | one-off service block | ₹10,000 |

Implementation grants nothing and caps nothing, so it is an ordinary priced
block, not a Credit Pack.

## Templates = allowance block + grant block

| Template | Blocks | Total | Term |
|---|---|---|---|
| **Free** | Freemium Allowance + Creation Notification Grant | ₹0 | 12 months |
| **POC** | POC Allowance + Creation Notification Grant | ₹1,500 | 1–2 months |
| **Quarterly** | Quarterly Allowance + Creation Notification Grant | ₹5,999 | 3 months |
| **Yearly** | Yearly Allowance + Creation Notification Grant | ₹19,999 | 12 months |

Start and end dates come from the contract wizard's own term handling, driven
from the activation/payment date. The metering blocks carry no dates.

## Count

**5 blocks** to author now for the seller side
(1 shared grant + 4 allowances), **4 templates** built from them.
Add-ons add 3 more blocks and 3 more templates when you get to them.

## Build order

1. Creation Notification Grant  ← author first, every template needs it
2. Freemium Allowance
3. Template: **Free**
4. Then POC / Quarterly / Yearly, which reuse block 1

## Open, genuinely not yet stated

- POC contract count (price ₹1,500 is known; the allowance is not)
- Credit Top-up pack sizes and prices
- Whether the wallet / pay-as-you-go model (₹200 per contract, ₹1,000 minimum,
  valid 1 year) is a template at all or a separate billing mode — it caps
  nothing and grants per creation like the others, so it may just be an
  allowance block whose count is derived from wallet balance rather than fixed

## Known gap — nothing consumes this yet

The settlement hook that reads `config.metering` on payment and writes
`t_tenant_context` does not exist (Sprint 1 step 7, parked). These blocks and
templates are authored correctly but inert until it is built.
