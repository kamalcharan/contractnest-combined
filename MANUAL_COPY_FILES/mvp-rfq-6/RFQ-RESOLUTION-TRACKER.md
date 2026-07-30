# RFQ + onboarding — consolidated resolution tracker

**Date:** 30 Jul 2026
Every item you raised across the last two messages, each with its **verified
root cause** and status. Nothing here is guessed — all confirmed against the
`setup` tenant (59f3f4bc…) and the code.

---

## A. Onboarding / registry

| # | Issue | Root cause (verified) | Status |
|---|---|---|---|
| A1 | Facilities requested but "not seeded" | **They ARE seeded** — all 4 (Hospital Ward, Parking Area, Power Plant/Substation, Operation Theatre) are in `t_category_resources_master`, same timestamp as equipment. The **facility registry page** (`entity-registry`) reads only `t_tenant_asset_registry` (empty) and never the catalog, while the **equipment registry** reads the catalog (`useResources`). Asymmetry — facilities are there, the facility page just doesn't look where they live. | **root found, fix pending** |
| A2 | Served industries not seeding (old `sell` tenant) | `sell` had 0 served industries; `setup` has **6** — onboarding now seeds them. The catalog got 6 equipment + 4 facilities for `setup`. | **resolved by re-onboarding** |
| A3 | Revenue/Expense toggle gone | `<RevealGate id="perspective">` (sprint-2e) hid the switcher for any tenant with no non-client contract — every fresh seller. | **FIXED — mvp-rfq-6 Header** |

**A1 fix approach:** make the facility/entity registry surface the catalog the
same way equipment does (read `useResources` for the seeded types), OR seed
facility *instances* at onboarding. The first is the smaller, consistent fix and
matches how equipment already behaves.

---

## B. RFQ builder (the dedicated flow)

| # | Issue | Root cause (verified) | Status |
|---|---|---|---|
| B1 | No equipment types in the builder | Builder read `/api/resources` = tenant catalog; empty for a tenant with no served industries. `setup` has them now, so **equipment reflects**. Facilities will too once the builder's Facility path is exercised (4 asset types exist). | **resolved by A2**; verify facility path |
| B2 | "Service line" should be FLYBY | The payload **is** flyby (`source_type: flyby`, 3 blocks saved). Only the UX label is bespoke. Align the surface to the flyby concept. | fix pending |
| B3 | CNAK created, no last date captured | `response_deadline` is null on PRJ-1004 — the field exists but sits in step 3 and was left blank. Needs to be prominent and confirmed to flow. | fix pending |
| B4 | Currency gone | Saved fine (`INR`) but the builder never shows/lets you change it. | fix pending |
| B5 | No multiples of equipment/facility | The quantity stepper works; it only appears once types load (B1). | resolved by A2 |
| B6 | No nomenclature capture | 21 types exist; it's an optional chip in step 2, easy to miss. Promote to a real captured step. | fix pending |
| B7 | No RFQ report / RFQVIEW; opens contract view | No dedicated RFQ document/detail; it reuses the contract detail. | build pending |

---

## Resolution order (proposed)

1. **A3 toggle** — DONE (mvp-rfq-6). Unblocks reaching Requests.
2. **A1 facility registry** — surface the catalog on the entity registry, so
   seeded facilities show (parity with equipment).
3. **Builder polish in one batch** — B2 (flyby), B3 (deadline prominent),
   B4 (currency shown), B6 (nomenclature as a real step).
4. **B7 RFQ view** — a dedicated RFQ document/detail, replacing the contract-view
   redirect.
5. Re-test the whole buyer path end to end on `setup`.

---

## What is NOT the problem (so we stop chasing it)

- The catalog seed. Both equipment and facilities land in
  `t_category_resources_master` correctly.
- Served industries. `setup` has 6.
- Currency, vendors, flyby blocks persistence. All saved on PRJ-1004.
- The API. Every field the builder sends is accepted and stored; the gaps are
  UX (what's shown/captured) and one registry-surface asymmetry.
