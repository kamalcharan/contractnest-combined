# Sprint 1.3 — local review

## Main journey

- [ ] In an active workspace, recent agreements are visible immediately. The previous large introductory banner is gone.
- [ ] Click **Start something new**. The outcome chooser opens above the agreements. Close returns keyboard focus to that button.
- [ ] In an empty perspective/environment, the chooser is already open; there is no forced multi-step onboarding or extra persona question.
- [ ] Revenue: create agreement is first; respond to customer requests is available. No buyer RFQ-creation action appears.
- [ ] Expense: request quotations is first; vendor-agreement creation and shared-contract claim are available.
- [ ] Create agreement opens the existing wizard directly. Check Client on Revenue and Vendor on Expense. Existing catalogue names/prices and template options are used.
- [ ] On a Test workspace, save a draft, close, and confirm the updated recent agreements. Resume using Contracts. Complete/send only if you intend the normal existing workflow's effects.
- [ ] Record existing agreement opens a manual-entry explanation. Enter agreed terms opens the wizard; access-key option opens the existing claim screen. No upload, extraction, imported signatures, or historical event status is implied.
- [ ] Buyer request opens `/contracts/rfq/new`; Seller response opens `/requests`; claim opens `/contracts/claim`.
- [ ] Revenue/Expense and Live/Test changes clear the chooser's local state and use the current context. Existing activation/readiness restrictions still apply.

## Presentation and regression

- [ ] Check desktop, tablet, and 320–390px phones. No horizontal scroll or clipped cards; all choices remain reachable.
- [ ] Switch themes and light/dark mode. Check cards, text, primary button, and loading state while opening the wizard.
- [ ] Keyboard can open/close the chooser and expand/back out of existing-agreement options with correct focus restoration.
- [ ] Existing cockpit, wizard, Money In/Out, lite dashboards, and normal post-login route remain unchanged.
- [ ] Analytics consent denied: new entry tracking does not send. Consent enabled with analytics configured: entry clicks carry only action, perspective, environment, and source labels. These are intent events, not completed-contract conversions.

## Checked here

- Production Vite build passed, with existing repository warnings.
- All five experience TypeScript source files checked: zero diagnostics.
- Focused checks passed for context isolation, response validation, totals, draft links, and Buyer/Seller action ordering.
- Actual new page rendered in headless Edge using isolated fixtures: active/empty chooser visibility, action destinations, client/vendor props passed to a stand-in wizard, manual disclosure, focus restoration, 24 light/dark theme variants, and no overflow down to 320px.
- The shared wizard's live save/send behaviour and actual backend permissions require your local tests. No live transactions were performed here.
- No measured conversion lift is claimed. This release reduces navigation steps and adds consent-gated entry measurement; conversion outcomes need real usage data.

## Prerequisite / rollback

Apply after the original Sprint 1 package. The pre-copy guard compares the four changed files to that package or this exact update; differing local edits stop the copy.

The two new files are additive. To back out before committing, restore the four changed files from the original `ux-journey-s1` package after checking for unrelated edits; unused new files do not affect the old page. After committing, use your usual reviewed revert workflow. No database rollback is needed.
