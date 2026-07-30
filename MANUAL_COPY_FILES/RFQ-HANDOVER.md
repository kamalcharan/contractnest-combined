# RFQ initiative — full session handover

**Date:** 30 Jul 2026
**Branch:** `claude/contractnest-launch-strategy-aad14f` (all work pushed here)
**Supabase project:** `uwyqhzotluikawcboldr`
**Purpose:** hand a fresh session everything needed to continue the RFQ work
without re-discovering anything. Read this top to bottom first.

---

## 0. The one-paragraph state

An RFQ (buyer → vendors request-for-quote) cycle was built end to end. The
**server layer is applied to production** (3 migrations). The **UI is staged in
`MANUAL_COPY_FILES/mvp-rfq-1..6`** and the owner copies files locally, tests,
and the batches are committed to the feature branch. A **dedicated, product-led
RFQ builder** (new full-page flow, `/contracts/rfq/new`) is the current
front-end direction ("Path 2"), replacing bolting RFQ onto the shared contract
wizard. Several polish items and one dedicated "RFQ view" remain. Onboarding
seeding and a registry-surface asymmetry were found and mostly fixed.

---

## 1. How this project ships (CRITICAL WORKFLOW — read before touching code)

- The owner develops on Windows at
  `D:\projects\core projects\ContractNest\contractnest-combined`.
- **We never push to their working tree.** We stage full files under
  `MANUAL_COPY_FILES/<batch>/<submodule>/<path>`, write a `COPY_INSTRUCTIONS.txt`,
  commit to the feature branch, and the owner copies the files locally with the
  PowerShell `Copy-Item` commands, tests, then merges.
- Submodules: `contractnest-ui` (React+Vite+TS), `contractnest-api` (Node proxy),
  `contractnest-edge` (Supabase edge functions + SQL migrations),
  `ClaudeDocumentation`.
- **tsc discipline:** app-wide check is `npx tsc -p tsconfig.check.json --noEmit`
  from `contractnest-ui`. **Baseline = 50 errors** (pre-existing, unrelated). Any
  change must keep it at **50/50 (zero added)**. Always restore the checkout
  pristine after checking (copy file in → tsc → copy backup back).
- **`src/lite/` does NOT exist in the committed repo checkout** — the express
  onboarding lives only in staged batches. So a full `tsc` on a repo-based
  `App.tsx` fails on missing `./lite/...` imports. That's expected, not a new error.

### 1a. App.tsx — THE landmine (caused a live break this session)
- The committed **repo `App.tsx` LACKS the `/start` express-onboarding routes**
  (and `/quote`, etc.). Those routes exist only in **`mvp-sprint-3`'s staged
  App.tsx** (9 `/start` routes) — the last full App.tsx shipped.
- **NEVER derive App.tsx from the repo.** Always base it on
  `MANUAL_COPY_FILES/mvp-sprint-3/contractnest-ui/src/App.tsx` and **`diff`** to
  prove only intended lines changed. I shipped a repo-based App.tsx mid-session
  and it wiped the owner's `/start` onboarding (404). Recovered by rebasing on
  sprint-3.
- The **current correct App.tsx** is `MANUAL_COPY_FILES/mvp-rfq-5/.../App.tsx`.
  `diff` vs sprint-3 shows exactly **3 intentional changes**:
  1. `import RfqBuilderPage from './pages/contracts/rfq/RfqBuilderPage';`
  2. `<Route path="rfq/new" element={<RfqBuilderPage />} />` (in `/contracts` block)
  3. `/facility-registry` route: `<EntityRegistryPage />` →
     `<EquipmentPage registryMode="entity" />`
- Prefer **surgical hand-edits or diff-proven single files** for App.tsx. The
  owner explicitly warned: "if you are not cautious, it will break system."

---

## 2. What is APPLIED TO PRODUCTION (do not re-apply)

Three migrations, applied live to `uwyqhzotluikawcboldr`:

- **072_rfq_cycle** (mvp-rfq-1) — the whole server cycle. Applied in 6 chunks.
  - `t_contract_vendors` gains: `quote_breakdown, quote_currency,
    quote_valid_until, decline_reason, access_secret, viewed_at, updated_at`.
  - Unique index `uq_contract_vendors_contract_vendor (contract_id, vendor_id)`.
  - **BREAK 2 fix:** `idx_contract_access_unique_grant` now includes
    `accessor_contact_id` → multiple vendors can hold a grant on one RFQ. All 63
    existing access rows survived.
  - Trigger `enrich_contract_vendor` (fills vendor name/company/email from
    `t_contacts` + `t_contact_channels`; `t_contacts` has NO email column).
  - Trigger `rfq_grant_vendor_access` (mints one `t_contract_access` row per
    vendor, each with its own `secret_code`, on `rfq → sent`).
  - `update_contract_transaction` STEP 6 made **non-destructive** (RFQ edits no
    longer wipe quotes).
  - New anon RPCs: `rfq_resolve_for_vendor(cnak, secret)`,
    `rfq_submit_quote(cnak, secret, …)`; authed `rfq_award(contract, tenant, vendor,…)`.
  - **DO NOT re-run the single .sql** — part 3 aborts by design (guard).
- **073_rfq_list_fields** (mvp-rfq-3) — adds `t_contracts.response_deadline DATE`
  and returns `start_date` + `response_deadline` from both builds of
  `get_contracts_list` (flat already returned `vendors_count`). Applied.
- **074_rfq_persist_response_deadline** (mvp-rfq-4) — in-place patch of
  `create_contract_transaction` to persist `response_deadline` (column list +
  VALUES). Applied. `update_contract_transaction` NOT patched (RFQ draft-edit
  deadline is a follow-up).

The RFQ state machine already existed in `update_contract_status`:
`draft → sent → quotes_received → awarded → converted_to_contract` (+ cancelled).
Vendor `response_status`: `pending | quoted | declined | accepted`.

---

## 3. Batches staged (all committed to the branch)

| Batch | What | Notes |
|---|---|---|
| `mvp-rfq-1` | 072 migration + corrected gap analysis | applied to prod |
| `mvp-rfq-2` | Vendor quote page `/quote/:cnak/:secret` (public, no auth), buyer `RfqQuotesPanel`, buyer-onboarding copy | **needs `/quote` route hand-edit in App.tsx — may NOT be applied by owner.** VendorQuotePage.tsx, useVendorQuote.ts, RfqQuotesPanel.tsx |
| `mvp-rfq-3` | RFQ home in hub (Contracts\|Requests toggle) + RFQ-specific row (ID, start, vendors, deadline + aging chip) | hub/index.tsx, ContractPortfolioRow.tsx, types/contracts.ts |
| `mvp-rfq-4` | RFQ deadline input (slice A) + equipment-from-registry step `RfqAssetStep` + flyby name gate (slice B) | wizard files. NOTE: `RfqAssetStep` is now SUPERSEDED by the dedicated builder for RFQ; harmless |
| `mvp-rfq-5` | **Dedicated RFQ builder** `RfqBuilderPage.tsx` + App.tsx (route) + hub (New Request → navigate) | THE current RFQ flow. App.tsx here is the correct one |
| `mvp-rfq-6` | Header ungate (Revenue/Expense toggle) + `RFQ-RESOLUTION-TRACKER.md` | Header.tsx |

Earlier relevant batches: `mvp-sprint-3` (has the good App.tsx base),
`mvp-sprint-2e` (introduced the RevealGate on the toggle — the thing rfq-6 undoes).

---

## 4. Key decisions locked (do not relitigate)

- **Path 2 chosen:** the RFQ is a **dedicated, single-column, self-explaining
  product-led flow** (`RfqBuilderPage`), NOT bolted onto the shared contract
  wizard. Reason: a buyer's request is **loose** — he gives "a flavour" (e.g.
  "2 DG sets, ~500kVA"), not registry-grade detail. Also intended as the
  **reference pattern** contracts/templates graduate onto LATER (build clean
  first, extract the shell after it's proven — do NOT abstract prematurely).
- **Buyer blocks: NO.** A buyer never prices, so no buyer catalog. The buyer's
  world = **registry (equipment/facility, from the catalog) + flyby service
  lines + save-as-RFQ-template**. Equipment/facility come from the resource
  catalog; pure services are flyby; repeatability is a template (`t_cat_templates`).
- **Same API, only UX changes.** The builder writes the exact payload
  `create_contract_transaction` already accepts: `coverage_types` +
  `equipment_details` (flavour, placeholder-flagged, `added_by_role: 'buyer'`),
  `blocks` (flyby with `billing_cycle`), `vendors[]`, `response_deadline`,
  `nomenclature_id`, `start_date`, `duration`. No backend change for the builder.
- **Award model (decided, NOT built):** awarding → the **winning vendor issues a
  DRAFT contract** (they're a seller-tenant); that draft has its own CNAK; the
  buyer sees multiple draft proposals against the one RFQ, accepts one (modal
  warns the rest are rejected), it becomes a real contract in the hub. Needs a
  **`source_rfq_id` link column** on `t_contracts` (only `rfq_number` exists).
  `rfq_award` currently just marks winner/losers + `awarded`.
- **RFQ CNAK series:** owner OK with a separate prefix (RFQ CNAK vs draft-contract
  CNAK). Not yet implemented.
- **Never force onboarding to view/act on a CNAK item** (owner directive,
  post-RFQ). A "CNAK persona" (lightweight identity, cross-sell to onboard) fixes
  BOTH: Seller→Buyer contract claim (`/contracts/claim` is behind
  ProtectedRoute+tenant — forces onboarding) AND Buyer→Vendor RFQ (the vendor
  quote page is already public — the right precedent). Recorded in
  `mvp-rfq-1/ClaudeDocumentation/mvp/RFQ-GAP-ANALYSIS.md`.

---

## 5. The dedicated RFQ builder (RfqBuilderPage.tsx) — current state

Route: `/contracts/rfq/new` (full page, inside `/contracts` ProtectedRoute).
Launched from hub → Expense → Requests → "New Request".
Steps (dynamic; a pure Service skips "what it covers"):
`kind (Equipment/Facility/Service) → basics (name + nomenclature) → timing
(start, term, last date to apply) → covers (type + qty + flavour) → services
(flyby lines + cadence) → vendors → review (+ save-as-template, DISABLED) → send`.
On send: `createContract(payload)` then `updateStatus('sent')`, success screen
with rfq_number + CNAK.

Data sources it reads: `useResources()` (catalog types), `useNomenclatureTypes()`
(21 exist), `useContactList({classifications:['vendor']})`, `useContractOperations()`.

---

## 6. OPEN ITEMS (the resolution tracker + new observations)

Full detail in `MANUAL_COPY_FILES/mvp-rfq-6/RFQ-RESOLUTION-TRACKER.md`. Status:

**Done:**
- Revenue/Expense toggle restored (mvp-rfq-6 Header — was hidden by RevealGate on
  every fresh seller; core nav must never be reveal-gated).
- Served industries now seed at onboarding (new tenant `setup` has 6; old `sell`
  had 0 — that was why its RFQ showed no equipment).
- `/facility-registry` fixed to use `EquipmentPage registryMode="entity"` (was
  `EntityRegistryPage`, which read only the empty instance table). Facilities now
  reflect there.

**OPEN — builder polish (do as ONE batch, contained to RfqBuilderPage.tsx, no App.tsx churn):**
- **Currency** — saves (`INR`) but is never shown/selectable. Add it.
- **Deadline** — `response_deadline` field exists but is buried in the timing step
  and was left null on real runs (PRJ-1004). Make it prominent; confirm it flows.
- **Nomenclature** — 21 exist; currently an optional chip in "basics", easy to
  miss (PRJ-1004 has null nomenclature). Promote to a real captured step (owner's
  sequence step 2).
- **"Service line" → FLYBY** — the payload IS flyby already; the UX label is
  bespoke. Align the surface to the flyby concept (owner asked; can push back but
  agree it should read as flyby).

**OPEN — bigger:**
- **Dedicated RFQ view / report** — opening an RFQ currently reuses the CONTRACT
  detail view. Build a proper RFQ document + detail (owner wants a formatted RFQ
  report like contracts have). Replaces the contract-view redirect.
- **Award → vendor issues draft contract** — needs `source_rfq_id` column, a
  "proposals on this RFQ" grouping view, and accept-one/reject-rest. See §4.
- **Save-as-template for RFQs** — the Review-step control is shown DISABLED
  ("coming soon"); needs a real template write path.

**OPEN — the last thing the owner said (investigate first in new session):**
- **"Facilities reflecting but not correctly."** After the `/facility-registry`
  fix, facilities now appear but something is wrong with HOW they display. Details
  unknown — the owner deferred to the new session. **First task: reproduce on
  `/facility-registry` for tenant `setup` and pin exactly what's incorrect**
  (wrong grouping? wrong names? Expense-only? tree/hierarchy missing because
  EquipmentPage's entity mode lacks the campus→room hierarchy that the old
  EntityRegistryPage had?). The likely culprit: `EquipmentPage` in entity mode is
  a flat catalog list and may not replicate `EntityRegistryPage`'s facility
  hierarchy/ownership UX. May need to instead FIX `EntityRegistryPage` to also
  read the catalog, rather than swap the component. Re-evaluate.

---

## 7. Data facts (verified this session)

- **Tenant `sell`** = `477540a7-0e52-4c35-8df4-6581fed3ca85`. 0 served industries.
  Has RFQs `PRJ-1001` (CNAK-741BFB, 2 vendors, break-2 fix proven — 2 distinct
  vendor grants), and `PRJ-1004` (CNAK-4091B1, from the builder: 3 flyby blocks,
  2 vendors, currency INR, but null deadline + null nomenclature + 0 equipment).
- **Tenant `setup`** = `59f3f4bc-f815-4ade-acfd-d10a71132c54`. **6 served
  industries.** Catalog `t_category_resources_master`: **6 equipment + 4 facilities**
  (Hospital Ward, Parking Area, Power Plant/Substation, Operation Theatre) — both
  seeded correctly. `t_tenant_asset_registry` (owned INSTANCES) = 0 for both types.
- **Resource catalog tables:** `/api/resources` (base LIST → `handleGetAllResources`)
  reads `t_category_resources_master` **scoped by tenant_id**. `resource-templates`
  endpoint reads global `m_catalog_resource_templates` scoped by the tenant's
  **served industries** (`t_tenant_served_industries`). `t_catalog_resources` is
  empty. Equipment type id = `'equipment'`, facility/entity = `'asset'`.
- **Registry pages:** `equipment-registry` = `EquipmentPage` (mode-aware: Expense
  reads catalog templates, Revenue reads tenant resources). `entity-registry` =
  separate `EntityRegistryPage` (reads only instance registry — the bug).
- **Nomenclature:** 21 types under `cat_contract_nomenclature`
  (`m_category_details` + `m_category_master`). `useNomenclatureTypes` hits
  `/api/product-masterdata/global?category_name=cat_contract_nomenclature`.
- **t_contracts** has NO `source_rfq_id`, only `rfq_number`. No `response_deadline`
  input persisted from the shared wizard's update path (only create).

---

## 8. Recommended order for the new session

1. **Investigate "facilities reflecting but not correctly"** on `/facility-registry`
   (tenant `setup`). Decide: keep `EquipmentPage entity` and fix its display, or
   revert to `EntityRegistryPage` and make IT read the catalog. (§6 last item.)
2. **Builder polish batch** (currency, deadline prominence, nomenclature step,
   flyby label) — one file, `RfqBuilderPage.tsx`, diff-safe.
3. **Dedicated RFQ view/report.**
4. **Award → draft contract** (`source_rfq_id` + proposals view + accept/reject).
5. Full buyer-path retest on a fresh tenant.

## 9. Gotchas that already bit us (don't repeat)
- App.tsx from repo wiped `/start` — always base on sprint-3 + diff (§1a).
- The Revenue/Expense toggle was reveal-gated → invisible on fresh sellers.
- `RfqAssetStep` (mvp-rfq-4) was pick-only against an EMPTY instance registry —
  wrong; the dedicated builder + catalog source superseded it.
- Facilities looked "not seeded" but were in the catalog; the facility PAGE just
  read the wrong table.
- tsc baseline is 50; `src/lite` absent in repo makes full App.tsx tsc noisy.

## 10. Unrelated but live (from CLAUDE.md, for awareness)
- Billing cadence dates drift off calendar months (day-count intervals) — engine
  bug across api/ui/edge, not fixed.
- Check-in "today" was UTC — fixed live (`Asia/Kolkata` hardcoded).
- Check-in UPI GPay pay-link still fails — open.
