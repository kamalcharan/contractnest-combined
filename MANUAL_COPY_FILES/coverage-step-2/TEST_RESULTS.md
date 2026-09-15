# Coverage review release

Design reference: `contractnest-contracts-final-playground.html`, final `coverageSection` override, `attachmentChoice`, `assetsDialog` and `registrationDialog`.

The implemented section retains selectable coverage cards, inline unit counters, three attachment choices and covered/attached/remaining counts. Tenant-backed recommendations, categorized browsing and search replace the playground's small hardcoded sample list. Registration opens the existing full product form, as the reference specifies.

## Working-path audit

- Live controller `ContractWizard/index.tsx` renders `AssetSelectionStep` for `assetSelection`.
- Existing data representation: `coverageTypes`, `equipmentDetails`, `allowBuyerToAdd`. Unidentified units retain `specifications.placeholder` and `coverage_resource_id`.
- Equipment types use resource type `equipment`; facilities use `asset`, represented as `entity` in equipment details.
- Registry reads use `/api/client-asset-registry`; creation uses the existing `useCreateClientAsset` and `EquipmentFormDialog`.
- Explicit `is_live` is included in registry reads and creation; query keys also include tenant/contact/environment. Mismatched registry records fail visibly.
- Existing Agreement draft marker remains `experience_chapter: agreement`, with `experience_step: coverage` added for continuation. The existing new list therefore recognizes the draft without another route/list change.
- Save remains draft-only. No activation/acceptance/notification operations are added.
- Classic wizard, templates, RFP and VaNi entry screens are unchanged. Their broader UX remains outside this slice.

## Automated checks

- Agreement regression: passed, including required fields, tagged INR default, modal/tag selection, failed-save retention, saved currency/term/label and same-ID editing.
- Coverage browser checks: passed with mocked catalogue/registry/mutations. ICP priority, grouped catalogue, multiple types, counters, all three attachment paths, registration payload, scope-removal guard, same-draft save, back/forward preservation, Coverage resume on page reload, registry failure/retry, modal Escape and context-change guard.
- Mobile: no horizontal document overflow in 24 theme/mode variants. Desktop/mobile captures reviewed against the approved HTML coverage section.
- Pure model: stable placeholder IDs, partial attachment, multiple resource types, buyer role, facility mapping, missing type/count errors, orphan prevention and overattachment prevention passed.
- Scoped TypeScript check: zero new diagnostics. This is not a claim that the entire legacy repository is diagnostic-free.
- Production build: passed. Existing duplicate buyer_id warning in contract detail, lottie eval warning, mixed dynamic/static import and large-bundle warnings remain outside this change.
- Copy preflight: passed against the current D: checkout without modifying it.

## Must be checked with your real data

The UI interaction tests mocked the registry form's submission boundary; the production build includes the unchanged full form. Verify real asset/facility registration, permissions, catalogue ranking and registry response shape locally. No real customer/registry writes were performed during QA.

## Next release

Services from Catalog Studio plus FlyBy entries, within the approved Coverage & services chapter. This release intentionally ends at Coverage saved.
