# Services step 3 — verification

## Passed
- Production UI build; existing warnings remain (duplicate buyer_id elsewhere, bundle size, lottie eval and mixed imports).
- Scoped TypeScript comparison: no new diagnostics in changed creation files.
- Real Services renderer, catalogue adapter, pricing handlers and expanded editor tested against mocked API responses.
- Seven catalogue rows across three pages; currency mismatch blocks Add.
- Same service selected independently for two coverage types.
- INR 100 + 18% tax = 118; quantity two = 236; catalogue billing fee displayed as 236.
- FlyBy name/price validation, explicit complimentary, changing to a positive price clears that flag.
- Same draft updated without another create; Services metadata restores the chapter and selections.
- Save failure retains state; retry works. Catalogue failure is explicit and retains saved selections.
- Mobile overflow checks across 12 themes in light/dark modes (24 variants).
- Agreement regression checks and Coverage/attachment-tag regression checks passed.
- Automated checks make no real tenant writes or external service calls.

## UX and existing logic
Approved HTML catalogue card structure maps to ServicesCatalog: coverage tabs, search,
category filters, selected rows, line summaries and Adjust this commitment. The full
live editor is embedded on expansion to preserve tax, service cycles, cadence,
weekday/anchor controls, content, session settings and per-unit splitting.
Live FlyBy menu retained: service/spare/text/document/session. Fees/checklists remain
catalogue selections. No VaNi UI or calls in this chapter.

Existing calculation functions and draft API/controller remain the source of truth.
Classic rendering is the default; experience-only flag selects this new layout.
The strict catalogue query has a separate tenant/environment-aware cache key.
No schema or backend changes.

## Local acceptance still required
Real tenant catalogue payloads, actual draft save/reopen, entitlement restrictions,
all cadence/discount/tax combinations, group scheduling and per-unit split behavior.
No claim of real API end-to-end validation or complete contract lifecycle delivery.

## Release boundary
Stops at Services saved. Money, Delivery, Events preview and final Review follow later.
