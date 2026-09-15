# Sprint 1.4 review

- [ ] Log in normally; manually open `/experience`. Login still opens the existing cockpit.
- [ ] No duplicate Live environment badge in the page. Shared header controls still work.
- [ ] Existing workspace shows four actions immediately; no Start button needs opening.
- [ ] Empty view shows the fuller outcome guidance without an extra click.
- [ ] Revenue starts with create agreement; Expense starts with request quotation.
- [ ] In Test, create agreement opens the existing wizard with the correct buyer/seller relationship. Close/save returns to the workspace.
- [ ] Record agreement reveals manual-entry guidance. Back returns keyboard focus to the action. No upload/extraction is promised.
- [ ] On mobile, actions fit the width, text is readable, and all controls remain tappable.
- [ ] Check your preferred themes in light and dark mode, including the shared header.
- [ ] Workspace Account agrees with the existing subscription and billing pages for the same tenant.
- [ ] Where real data warrants it: payment approaching/overdue, term approaching/ended, low credits, or allowance notices appear. No near dates/flags means no warning list.
- [ ] A quarterly payment on an annual plan is labelled a payment, not plan expiry.
- [ ] No invented credit-expiry date or forced upgrade. Only two notices display initially; account link remains available.
- [ ] Revenue/Expense and Live/Test do not change the tenant's real commercial plan. Tenant switch must show the selected tenant's account, never the previous one.
- [ ] If account loading fails, agreements/actions still work and account details are marked unavailable.
- [ ] Account links go to existing subscription/billing screens. Do not make a real payment merely to test them.
- [ ] Existing cockpit, Money In/Out, contract hub, appointments, and group sessions remain unchanged.

## Verification boundary

Automated checks use isolated fixture data and the actual experience components; they do not authenticate to your backend or make real contracts/payments. Confirm actual tenant data and wizard completion locally before merging.

## Deferred

Bring accurate, perspective/environment-scoped operational attention into the experience in the next operational sprint. Do not remove the cockpit until overdue events, due work, acceptance, and execution are supported and validated. Credit-expiry notices need an authoritative expiry field first. CRO uplift requires measured activation/completion data, not a visual claim.
