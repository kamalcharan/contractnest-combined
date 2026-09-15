# Sprint 1.5 - release acceptance

## Entry and onboarding

- [ ] Normal password login, completed full workspace: opens `/experience`.
- [ ] Google sign-in: same result. Unlock returns to its valid previous route.
- [ ] Authenticated visit to `/` or `/login`: correct Home/Lite destination, no loop.
- [ ] New/incomplete owner: existing VaNi onboarding. Non-owner: onboarding-pending.
- [ ] Complete VaNi/express onboarding: Home opens without a return-to-onboarding loop.
- [ ] CNAK and RFQ Lite logins retain their existing Lite cockpit and menus.
- [ ] Multi-tenant selection waits for onboarding/ICP resolution; no flash of another workspace's content.
- [ ] Switch between completed, incomplete, and Lite tenants: correct destination and menus.

## Direct links

- [ ] While signed out, open a known permitted contract detail URL including query/hash; sign in and confirm it resumes that route.
- [ ] Repeat through Google sign-in and through tenant selection, choosing the correct tenant.
- [ ] Existing public contract-review sign-in handoff still works.
- [ ] Finish required onboarding before resuming a saved direct link.
- [ ] A normal later login does not replay the old destination. Pending new handoffs expire after 30 minutes.
- [ ] External/malformed return URLs cannot redirect outside the app. Backend authorization is unchanged.

## Navigation and context

- [ ] Home appears in the full menu and opens `/experience` from an existing screen.
- [ ] Exactly one header, with the existing tenant, perspective, environment, and theme controls.
- [ ] Desktop Home begins with a compact sidebar; expanding it reveals existing menu labels.
- [ ] Mobile has no persistent sidebar stealing content width. Menu opens a drawer.
- [ ] Drawer: keyboard focus enters it, Tab stays inside, Escape/Close returns focus to the menu trigger.
- [ ] Expanding Operations, Contracts, VaNi, Catalogue, or Settings does not close the drawer; choosing a destination does.
- [ ] Check drawer on existing contract/cockpit screens as well as Home.
- [ ] Revenue/Expense keeps existing finance menu visibility and industry-specific labels.
- [ ] Tenant, theme, and environment context remain correct after navigation. Environment switch reloads to Home (or Lite), clearing operational caches.
- [ ] Test your preferred light/dark themes at desktop, tablet, and narrow mobile widths.
- [ ] Existing Home actions, account notices, wizard handoff, and contract links still work.

## Verification boundary

Automated browser checks use actual shared navigation/Home components with fixture auth/data. They do not exercise real password/Google sessions, live tenant APIs, onboarding completion, or real transactions. The login and tenant tests above need local acceptance before merge. Do not pay or send live agreements merely to test navigation.

The repository already has unrelated build/type warnings; this release does not fix them.
