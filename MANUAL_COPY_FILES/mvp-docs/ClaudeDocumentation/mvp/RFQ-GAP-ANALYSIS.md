# RFQ cycle — gap analysis

**Date:** 29 Jul 2026
**Scope:** buyer initiates a request → vendors respond → buyer picks one → the rest are rejected.
**Method:** every claim below was checked against the code and the production database. Nothing here is inferred from naming.

---

## The cycle, and what exists at each stage

| # | Stage | Status | Where it is |
|---|---|---|---|
| 1 | Buyer picks equipment / facilities | **Exists, wrong words** | `/start/serve` picker; registries via `equipment-confirm` |
| 2 | Nomenclature — AMC, CMC, … | **Exists, complete** | `m_category_details` / `cat_contract_nomenclature` |
| 3 | Select 1+ vendors and send | **UI exists, nothing persists** | `RFQ_STEPS`, `t_contract_vendors` |
| 4 | Vendor responds with a quote | **Missing entirely** | — |
| 5 | Buyer compares responses | **Missing entirely** | — |
| 6 | Accept one, reject the rest | **Missing entirely** | — |

**The headline:** stages 1–3 are ~90% built and have never been run. Stages 4–6 do not exist. And the single most surprising finding is that the response data model is *already designed and shipped* — it has simply never been written to.

---

## Stage 1 — Buyer picks equipment / facilities

**Exists.** The `/start/serve` equipment picker works for any persona; the equipment-first
direction is right for a buyer too (a buyer typically owns across industries — lifts, HVAC
and a DG set — and industry-first would hit the `lifts_elevators` / `hvac` link-table hole
that has no linked templates at all).

**Gap: copy only.** It says *"What do you service?"* and promises to *"pre-build your catalog
with market-reference prices"*. A buyer services nothing and gets no sellable catalog — their
picks belong in the **equipment and facility registries**.

**Effort:** copy change on one screen.

---

## Stage 2 — Nomenclature

**Exists, and is richer than the RFQ needs.** `m_category_details` under
`cat_contract_nomenclature` carries six types with full metadata:

| code | name | typical_billing | typical_duration |
|---|---|---|---|
| AMC | Annual Maintenance Contract | quarterly | 12 months |
| CMC | Comprehensive Maintenance Contract | quarterly | 12 months |
| CAMC | Comprehensive Annual Maintenance Contract | annually | 12 months |
| PMC | Preventive Maintenance Contract | quarterly | 12 months |
| BMC | Breakdown Maintenance Contract | per visit | ongoing |
| Warranty Ext | Extended Warranty | annually | 12 months |

Each carries `scope_includes` / `scope_excludes` (e.g. CMC includes parts and consumables,
PMC excludes breakdown support), plus applicable industries. `useNomenclatureTypes` reads it,
and `RFQ_STEPS` already has a **Request Type** step.

**Gap: none.** This can also pre-fill the buyer's term and billing from
`typical_duration` / `typical_billing`, which nothing currently does.

---

## Stage 3 — Select vendors and send

**The UI flow exists.** `stepConfig.ts:45`:

```
path → nomenclature → Select Vendors ("one or more") → details
     → Define Required Services → Review & Send RFQ
```

`record_type: 'rfq'` is set from `wizardState.wizardMode`, and RFQs deliberately strip T&C
(`ContractWizard/index.tsx:448-450`) — terms come back *with* the quote, which is correct.

**The data model exists.** `t_contract_vendors`:

```
id · contract_id · tenant_id · vendor_id · vendor_name · vendor_company
vendor_email · response_status · responded_at · quoted_amount · quote_notes · created_at
```

That is the whole fan-out and response model, already shipped.

**The payload field exists.** `CreateContractRequest.vendors?: Array<Record<string, any>>`
(`types/contracts.ts:514`).

**THE GAP — nothing persists it.** A repo-wide search for `t_contract_vendors`,
`response_status` and `quoted_amount` across `contractnest-api/src` and
`contractnest-edge/supabase/functions` returns **zero hits**. The client can send a `vendors`
array; no server code reads it.

Production confirms the cycle has never run:

```
distinct record_type in t_contracts   →  'contract'   (no 'rfq', ever)
rows in t_contracts where rfq         →  0
rows in t_contract_vendors            →  0
```

**Effort:** persist `request.vendors[]` into `t_contract_vendors` on create when
`record_type = 'rfq'`. One insert in the contracts edge function. This is the smallest,
highest-value item in the whole analysis — it is what makes an RFQ a real object.

---

## Stage 4 — Vendor responds

**Missing entirely, and this is the real work.**

The columns are there (`response_status`, `responded_at`, `quoted_amount`, `quote_notes`).
What does not exist:

1. **A way for the vendor to see the request.** A vendor is a *contact*, not necessarily a
   tenant. The existing mechanism for reaching a non-tenant is CNAK —
   `claim_contract_by_cnak` already filters on `is_live`, and the public claim route
   (`/contracts/claim`, `App.tsx:682`) exists. An RFQ sent to a vendor is the mirror image
   of a contract sent to a buyer, so the same channel should carry it.
2. **A response surface** — quote amount, notes, optionally per-block pricing.
3. **An endpoint** to write the response back.
4. **Delivery.** WhatsApp via MSG91 is already wired for contract delivery; the same path
   sends the RFQ link.

**Design question to settle before building:** does a vendor quote a *single number*
(`quoted_amount`, which is what the column implies) or *per-block prices*? Per-block is
truer to the product — the buyer defined service blocks, so the vendor should price them —
but the current column only holds one figure. Per-block would need either a
`t_contract_vendor_blocks` table or a jsonb column. **This is the one schema decision in
the whole cycle**, and everything downstream (comparison, conversion) depends on it.

---

## Stage 5 — Buyer compares

**Missing.** Nothing renders `t_contract_vendors` rows.

Once stage 4 writes data, this is a table: vendor · quoted amount · notes · responded date,
with the RFQ's own block list as the row header if per-block pricing is chosen.

**Effort:** one read-only screen. Small *if* stage 4's shape is settled first.

---

## Stage 6 — Accept one, reject the rest

**Missing.** Two decisions, neither made:

**a) What does "accept" produce?** `record_type` lives on `t_contracts`, so an RFQ and a
contract are rows in the same table. Either:
- flip the RFQ row to `record_type = 'contract'` with the winning vendor as counterparty
  (simple, but loses the RFQ as a historical record); or
- create a new contract linked back to the RFQ (keeps the audit trail, needs a link column).

The second is right for procurement — buyers need to show what they compared — but it needs
a `source_rfq_id` or equivalent.

**b) Who authors the resulting contract?** Your stated model is *the vendor initiates the
contract*. If the buyer accepts a quote and that itself creates the contract, the buyer has
authored it, which contradicts that. The cleaner reading: accepting a quote **invites the
winning vendor to issue the contract**, and the vendor's contract carries the agreed figure.
That keeps the buyer as requester throughout and needs no new authoring surface for buyers.

**Rejecting the rest** is the easy half: set `response_status` on the losing rows and notify.

---

## What I would do, in order

| Order | Item | Size | Why first |
|---|---|---|---|
| 1 | Persist `vendors[]` on rfq create | **XS** | Makes the RFQ real; unblocks everything else |
| 2 | Buyer copy on `/start/serve` + registries framing | **XS** | Wrong words are live today |
| 3 | Decide: single quote vs per-block | **decision** | Stage 5 and 6 both depend on it |
| 4 | Vendor response surface + endpoint (CNAK channel) | **L** | The actual missing product |
| 5 | Comparison screen | **S** | Trivial once 4 lands |
| 6 | Accept → invite vendor to issue; reject others | **M** | Needs decision (b) above |

Steps 1 and 2 are worth doing immediately and are independent of every open question.
Steps 4–6 should not start until 3 and 6(b) are answered, or they will be rebuilt.

---

## Two things this analysis found that are not RFQ bugs

- **The buyer had no Revenue/Expense switcher** until sprint 3d, because a reveal rule
  unlocked it on having a non-client contract — circular for a buyer, since the switcher is
  how you reach the vendor side. Fixed.
- **`VaniDoneStep` points every persona at `/start/contract`.** A buyer cannot author a
  contract. Still open.
