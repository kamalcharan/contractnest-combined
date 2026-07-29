# RFQ cycle — gap analysis (corrected)

**Date:** 29 Jul 2026 — supersedes the version of the same name issued earlier today.
**Scope:** buyer initiates a request → vendors respond → buyer picks one → the rest are rejected.

---

## Correction first

The earlier version of this document said:

> **THE GAP — nothing persists it.** A repo-wide search for `t_contract_vendors`,
> `response_status` and `quoted_amount` across `contractnest-api/src` and
> `contractnest-edge/supabase/functions` returns **zero hits**.

The search was accurate. The conclusion drawn from it was wrong.

The entire RFQ implementation lives in **Postgres functions**, which are not in the
repo source tree. `contractnest-edge/.../contracts/index.ts` is a thin pass-through:
`handleCreate` at line 577 forwards the whole payload to `create_contract_transaction`
and returns whatever it gets. So a grep of the repo cannot see the contract logic at
all — for RFQs or anything else.

It also claimed stages 4–6 "do not exist". They are half-built, and the halves that
exist are the ones that are expensive to design.

Everything below was re-derived from `pg_get_functiondef` and
`information_schema`, not from the repo.

---

## What is actually live today

| Piece | State | Where |
|---|---|---|
| `vendors[]` built by the wizard | **works** | `mapper.ts:117` |
| `vendors[]` persisted on create | **works** | `create_contract_transaction` STEP 6 |
| `vendors[]` replaced on update | **works, destructively** | `update_contract_transaction` STEP 6 |
| Vendors returned on read | **works** | `get_contract_by_id` STEP 4 |
| Vendors rendered with quote + status | **works** | `detail/index.tsx` `VendorsCard` |
| RFQ state machine | **works** | `update_contract_status` STEP 2 |
| CNAK minted when an RFQ is sent | **works** | `update_contract_status` STEP 2.5 |
| Wizard fires `draft → sent` for RFQs | **works** | `ContractWizard/index.tsx:783` |
| `rfq_sent` queued to JTD | **works** | `update_contract_status` STEP 5 |

The state machine, in full, already validated in the database:

```
draft ──▶ sent ──▶ quotes_received ──▶ awarded ──▶ converted_to_contract
  └────────┴────────────┴──────────────┴──▶ cancelled
```

and per vendor: `pending | quoted | declined | accepted`, enforced by
`t_contract_vendors_response_status_check`.

None of that needed designing. It was designed, shipped, and never wired to a surface.

Production is consistent with that: `t_contracts` has never held a `record_type = 'rfq'`
row, and `t_contract_vendors` has 0 rows. The machine has never been switched on.

---

## The four things that are actually broken

### BREAK 1 — vendors have no address

`mapper.ts:117` sends `vendor_id`, `contact_id`, `contact_classification`, `vendor_name`.
It does **not** send `vendor_email` or `vendor_company`, and the RPC inserts exactly what
it is given. So every vendor row is created with `vendor_email = NULL`.

`BuyerSelectionStep`'s multi-select carries only `(ids, names)` —
`onVendorsChange?: (ids: string[], names: string[])` at line 154 — so the email is not
even in wizard state to send.

Fixed server-side rather than by threading two more arrays through the wizard: a
`BEFORE INSERT OR UPDATE` trigger fills name / company / email from `t_contacts` and
`t_contact_channels` whenever they arrive NULL. Note `t_contacts` has **no email column** —
email is a row in `t_contact_channels` with `channel_type = 'email'`, preferring
`is_primary`. Any future writer of the table inherits the enrichment.

### BREAK 2 — only one vendor can ever be granted access

This is the real blocker, and it is a schema fact rather than a missing feature.

```
CREATE UNIQUE INDEX idx_contract_access_unique_grant ON t_contract_access
  (contract_id, accessor_role, COALESCE(accessor_tenant_id, '0000…'::uuid))
```

Every vendor on an RFQ has `accessor_role = 'vendor'` and `accessor_tenant_id = NULL`.
The second vendor's grant collides with the first. Five invited vendors, one usable link.

Compounding it: `update_contract_status` STEP 2.5 mints the CNAK for an RFQ, then creates
the access row **only `IF v_current.buyer_id IS NOT NULL`**. An RFQ has no buyer_id — the
counterparty step fills `vendorIds`, not `buyerId`. So today an RFQ gets a CNAK that
nobody at all can use.

Fixed by adding `accessor_contact_id` to the unique key — which only *loosens* the
constraint, so no currently-valid row can be invalidated — plus a trigger on
`t_contracts` that mints one grant per vendor on the `rfq → sent` transition, each with
its own `secret_code`. The CNAK is shared; the secret is what says *which* vendor is
answering.

### BREAK 3 — nothing can write a quote

The columns exist and the detail page already renders them. There was no way to fill them,
and no route a vendor could use: a vendor is a **contact**, not a tenant, so the
authenticated contract routes are closed to them.

Two new functions, both anon-reachable over the same public path the check-in page uses:

- `rfq_resolve_for_vendor(cnak, secret)` — returns the RFQ, its blocks and *this vendor's
  own row*. Never another vendor's quote, never the invitee list, and **never the buyer's
  own prices** — the vendor is quoting, not matching a number.
- `rfq_submit_quote(cnak, secret, amount, notes, breakdown, valid_until, decline, reason)`

### BREAK 4 — editing an RFQ destroys quotes

`update_contract_transaction` STEP 6 does `DELETE FROM t_contract_vendors WHERE
contract_id = …` and re-inserts every vendor with `response_status = 'pending'`.

Harmless today only because no quote has ever existed. It becomes data loss the moment
BREAK 3 is closed — a buyer adding a sixth vendor would silently wipe the five quotes
already in hand. **This has to be fixed before the first quote is written, not after.**

Now non-destructive: a vendor who has responded is never removed, a vendor still on the
list keeps their quote, and only *pending* vendors dropped from the list are deleted.

---

## The question you answered, and how it landed

> *Does a vendor quote a single figure or per-block prices?*
> — "usually single, however it is left to users"

`quoted_amount` stays the headline and remains the only thing a comparison sorts on.
`quote_breakdown` (new, jsonb) carries optional per-block detail. If a vendor prices the
blocks and gives no headline, the headline is computed as the sum — so a set of responses
where some vendors answered one way and some the other still compares on one axis.

No new table. `quoted_amount` keeps its meaning for every response.

---

## The question still open — and why the migration stops short of it

> *Who authors the contract that results from an award?*

Your model is **the vendor initiates the contract**. So `rfq_award` marks the winner
`accepted`, marks the rest `declined`, and moves the RFQ to `awarded`. It deliberately
does **not** create a contract, because doing so would make the buyer the author, which
contradicts that model.

`converted_to_contract` already exists in the state machine as the landing place for
whatever that next act turns out to be. Two candidate shapes:

- **the winning vendor issues a contract from the awarded RFQ** — matches your model,
  needs a `source_rfq_id` link column and a vendor-side "issue contract" surface; or
- **flip the RFQ row itself to `record_type = 'contract'`** — no new column, but the RFQ
  stops existing as a record of what was compared, which procurement buyers need.

I would not decide this one for you. It is the only remaining design choice in the cycle.

---

## Where that leaves the work

| # | Item | State |
|---|---|---|
| 1 | Persist `vendors[]` | **already worked** — was never a gap |
| 2 | Vendor addresses | **done** — trigger (BREAK 1) |
| 3 | Per-vendor access grants | **done** — index + trigger (BREAK 2) |
| 4 | Vendor read + quote write | **done** — 2 RPCs (BREAK 3) |
| 5 | Non-destructive RFQ edit | **done** — in-place patch (BREAK 4) |
| 6 | Award / reject | **done** — `rfq_award` |
| 7 | Vendor-facing quote page | **next** — UI, public route, no auth |
| 8 | Buyer comparison + award button | **next** — UI; `VendorsCard` is most of the read |
| 9 | Delivery (WhatsApp / link) | **next** — reuses the contract delivery path |
| 10 | Award → contract | **open decision above** |
| 11 | Buyer onboarding copy | **next** — `/start/serve` still says "What do you service?" |

Items 7–9 are one UI batch. Item 10 needs your answer first.

---

## Two things worth knowing that are not RFQ items

- **`update_contract_transaction` STEP 6 is not the only delete-and-replace in that
  function** — STEP 5 does the same for blocks. That one is correct, because a block has
  no state of its own. Worth remembering the distinction if more child tables are added.
- **`t_contacts` has no email column.** Anything that assumes `contact.email` is reading a
  field that does not exist; email is always a `t_contact_channels` lookup. The buyer_email
  on `t_contracts` is a denormalised snapshot, not a join.
