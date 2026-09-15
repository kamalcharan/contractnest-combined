# Workspace journey — Sprint 1.1 + 1.2

Branch: codex/ux-journey-sprint-1 (local only; not published to GitHub)

Affected submodule: contractnest-ui only.

Baseline parent: f40a722024b10fe453a87adf4e09063eaaa3d45d
Baseline UI: 3f8715db8bb490bc2dad1d3259d636e64d1516d1

## What changes

- Adds /experience behind existing authentication and tenant selection. Normal post-login routing is unchanged.
- Reuses existing persona initialization, perspective switching, readiness gates, Live/Test, user menu, workspace picker, and theme controls.
- Adds responsive, theme-driven workspace landing, recent agreements, genuine empty state, profile-missing state, loading and retry states.
- Loads up to six recent contracts using the existing contracts API and the same client/partner versus vendor filters as the Contracts Hub. Uses server total_count. Separate cache keys include tenant, environment, and active perspective; cancelled/changed requests cannot supply another context's result.
- Provides links into existing Contracts, Requests, Catalogue, Business Profile, Finance and cockpit. Draft links open the existing hub where the user resumes the wizard.
- Keeps CNAK/RFQ-lite on the existing LiteDashboard and respects incomplete-onboarding redirects.
- Existing screen components are not edited. App.tsx adds one import and route. AuthContext.tsx has one isolated exception: Live/Test switching from /experience returns to /experience after the same full reload; all other routes retain the original /ops/cockpit destination.

## Files (8)

1. src/App.tsx — additive route registration.
2. src/context/AuthContext.tsx — scoped environment-return destination.
3. src/pages/experience/index.tsx — page, access branches, existing header, and contextual navigation.
4. src/pages/experience/experience.css — scoped responsive theme styling.
5. src/pages/experience/useExperience.ts — read-only, context-scoped contract query.
6. src/pages/experience/model.ts — relationship filters, response validation, links, contrast.
7. src/pages/experience/verify.mjs — focused repeatable checks.
8. src/pages/experience/README.md — entry route note.

## Delivery and rollback

This is a manual-copy release; no remote branch has been created. The package is committed on the local parent branch codex/ux-journey-sprint-1. Pull it directly from C:/Users/kamal/Documents/New project/contractnest-combined into your D: checkout, then copy the files. No ZIP extraction is required. Existing manual-copy packages and their root instructions are preserved.

Run CHECK_BEFORE_COPY.ps1 before copying. It checks package integrity and normalizes CRLF/LF differences while comparing existing files against the tested baseline. A mismatch means this release must be rebased onto your current source; do not force-copy over newer work.

Test locally before committing/pushing/merging. The new entry is optional, so users can continue at /ops/cockpit during review. To remove the release after committing, revert its UI commit and update the parent UI reference using your normal workflow. No database rollback is needed.
