# Sprint 1 local acceptance

Log in normally. Then visit http://localhost:5173/experience. Normal login still opens the existing cockpit. Use a completed-onboarding workspace for the new experience.

- [ ] Seller default starts in Revenue; Buyer default starts in Expense. Both follows the existing configured default. Do not select a new ICP on this page.
- [ ] Revenue lists the same client/partner contracts as Contracts; Expense lists the same vendor contracts. Compare the total and the six most recently updated records. Counts include all contract statuses, not just active.
- [ ] Switch Revenue/Expense using the header. The existing readiness/activation modal still applies. After a successful switch, labels, links, and records change together; no previous-side records remain.
- [ ] Switch Live/Test through the existing confirmation. The new page reloads at /experience with the correct environment and fresh data. The switch is shown only when VITE_SHOW_ENVIRONMENT_SWITCH=true, as in the existing product.
- [ ] Change workspace with the existing tenant picker, then reopen /experience if the existing picker navigates away. Confirm no records from the previous tenant are shown.
- [ ] An empty side/environment says no agreements in that context. It must not claim the entire tenant has no contracts or fabricate records.
- [ ] Active agreement opens its existing Contract View. Draft opens Contracts; select that draft there to resume the existing wizard. Sprint 1 does not automatically open the draft wizard.
- [ ] Open contracts, requests, shared-contract claim (Buyer), business profile, catalogue (Seller), Money In/Out, and return-to-cockpit links. Existing screens behave as before. Browser Back returns to the experience and refreshes its list.
- [ ] In a workspace with no business profile, see the profile action. A failed request shows retry, not an empty success state. Try browser offline mode, reload, reconnect, and retry.
- [ ] Try different services already in your data (equipment, facilities, wellness/group work). Names come from contracts; no Lift-only labels or fabricated prices.
- [ ] Change each available theme and light/dark mode. Check button text, headings, focus outlines, cards, menus, and statuses. Theme selection still persists through existing preferences.
- [ ] At 390px and tablet widths: no horizontal scrolling, header controls remain accessible, buttons and agreement titles fit. Also check one workspace with a long name and long contract names.
- [ ] Keyboard: use Tab, activate links/buttons with keyboard, and use the skip-to-workspace link. Reduced-motion preference suppresses new animations.
- [ ] An unauthenticated visitor goes to login. Incomplete owner onboarding goes to onboarding; incomplete team member goes to onboarding-pending. CNAK/RFQ-lite accounts retain their existing LiteDashboard, without full-workspace queries.
- [ ] Regression: normal login, /ops/cockpit, existing Revenue/Expense switching, existing Live/Test switching outside /experience, Contracts wizard, and Money In/Out behave as before.

## Verification already performed

- Production Vite build passed (existing bundle-size, duplicate-key, and dynamic-import warnings remain).
- New TypeScript source files: zero diagnostics under the project's compiler configuration.
- Full repository TypeScript check is not clean: it reports errors in existing modules. It is not claimed as passed.
- Focused executable checks passed: perspective filters, eight context cache keys, valid empty/populated/malformed response handling, authoritative server total, draft routing, status copy, and brand-button contrast.
- Headless Edge with isolated fixtures rendered the actual new page and existing Header: desktop, mobile Buyer/Test/empty, error recovery, and 24 theme/light-dark combinations passed without horizontal overflow or browser exceptions.
- Browser fixtures used only for QA, outside the product and outside this package. Authenticated backend behaviour, account permissions, and real user switch modals require the local tests above.

## Scope boundary

Sprint 1.1 + 1.2: isolated route and data-driven empty/active entry. No action queue, SLA prioritisation, new appointment management, automation, WhatsApp sending, or financial calculations. Those belong to later sprints. No DB/API/Edge changes, secrets, seed data, or dependency changes.
