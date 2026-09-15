# Manual creation experience V1

## What is delivered

A separate `/contracts/experience/create` page, linked from New Contract on the new list. Manual creation starts directly, without the path-selection screen. The current editors are arranged into five navigable chapters: Agreement, Coverage & services, Money, Delivery plan, Review. There is a live agreement summary, explicit save status and responsive navigation.

This is the first integrated presentation release, not a rewrite of all nested editors. It deliberately retains the proven editor components, calculations, validation, step ordering, persisted draft numbers and final payment workflow. The HTML playground's sample data and calculators are NOT used in production.

- Revenue accepts explicit Client or Partner entry; Expense accepts Vendor. Invalid relationships require correction instead of becoming Client silently.
- Existing `/contracts`, template authoring, template-composer assignment, bulk creation, RFP/RFQ and VaNi routes remain unchanged.
- Existing draft resume remains on the classic wizard for this release. New drafts use its existing compatible metadata.
- Events Preview is still penultimate. Services, catalogue/FlyBy, coverage/registry/deferred attachment, billing/taxes/discounts, evidence and document perspectives use the active editors.
- No API, Edge, DB, WhatsApp or billing-model deployment is included.

## Explicit shared-source changes

`ContractWizard/index.tsx` gains an opt-in `presentation` prop. Existing callers default to classic. The new route adds:

- Failed save blocks Continue and preserves entries; failed Save & Close does not dismiss the form.
- Save & Close requires an agreement name, instead of inventing Untitled Draft.
- Uncertain draft creation (network/5xx/missing ID) stops further creation until the user reconciles the outcome, avoiding blind retries.
- A non-draft editing failure retains identity rather than clearing it and creating again.
- Completion uses the returned status and does not claim payment or notification delivery.
- Numeric draft progress correctly accounts for the skipped asset step.

One fix applies to the shared handler: import the existing `ASSET_STEP_GROUPS` constant. The active nomenclature callback referenced it without an import, producing a runtime error during testing. Existing screen layouts are unchanged.

## Verification and boundaries

- Targeted TypeScript check compares changed files against their pre-change baselines; no added diagnostics in the checked run.
- Full production build completed. Existing large-bundle, dependency and duplicate-key warnings remain outside this release.
- Mock-only browser tests use the real controller, routing, mapper and shell: full non-asset manual progression, partner/vendor handoff, asset/deferred-unit persistence, save/close failure, uncertain response, correct skipped-step draft progress, Events Preview and partial completion.
- 72 shell theme/mode/viewport combinations checked; actual nomenclature and acceptance editors also inspected on desktop/mobile with mock master data.
- Live tenant integration, every nested catalogue editor, evidence upload, gateway callbacks, real notification delivery and end-to-end backend persistence still require acceptance testing. No real contracts or payments were created by these tests.
- Earlier golden tests are stale; they were not regenerated to manufacture passing tests. The previously noted UI/API override-key discrepancy is not changed here; verify the deployed backend's handling of edited dates during acceptance testing.
- Browser refresh uses the existing unsaved-work warning. Use Save draft / the in-app Close control before leaving. This release does not add a router-wide browser Back navigation blocker.

## Test before merging

Use the product's TEST environment before opening the new route. This is a real integrated creation page, not a demo: Create can persist contracts and trigger configured workflows.

1. New list -> Client contract and Partner contract; contacts must filter correctly. Switch to Expense before opening -> Vendor.
2. Enter directly with no relationship; choose explicitly. Invalid relationship URLs must not silently choose Client.
3. Complete an equipment contract with multiple units, facility contract, and a non-asset service/wellness contract. No Lift-specific assumptions.
4. Exercise all three asset paths: deferred, registry selection and register now; verify real versus placeholder coverage after saving.
5. Include catalogue and FlyBy lines, sessions, text/documents, genuine zero prices, taxes, discounts, unified/mixed cycles, prepaid/EMI/per-line payment plans.
6. Save; close; resume from Drafts in the classic wizard. Verify name, relationship, selected contact person, coverage, amounts and current decision survive.
7. In a safe test setup, fail a draft update: Continue and Save & Close must preserve entries. Unknown create outcome must stop duplicate retries.
8. Verify smart forms/evidence, date overrides, service/payment event counts, penultimate Events Preview and buyer/seller document views.
9. Review-edit-return must preserve changes and enforce validation. Complete payment, sign-off and auto-accept examples; check actual stored status, amounts and delivered notifications independently.
10. Test each theme in light/dark mode, phone keyboard, long names, drawer scrolling, final button access and browser refresh.
11. Confirm original `/contracts` creation, template assignment, bulk, RFP/RFQ and VaNi entry points still work.

Rollback: the copy script backs up existing files under LOCAL_BACKUP. Restore those three existing files; the new unreferenced files can remain until reviewed for removal. Do not reset unrelated work.
