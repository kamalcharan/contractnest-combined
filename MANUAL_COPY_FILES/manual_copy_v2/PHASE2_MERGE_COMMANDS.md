# PHASE 2 — Merge Debt: commit & merge to main (2026-09-12)

Covers everything accumulated in `manual_copy_v2` (116 files): registry
hardening R1–R7, Sprint 2 (B2.1–B2.6), Sprint 7 (B3.1–B3.7), the B2.5
equipment-coverage + form-fill fixes, B4 records, cutover + Sprint 5
migration records, and the POA/report docs.

**Run only after you're satisfied with local testing.** DB/edge are already
live — these commits are the source-of-record catching up.

## STEP 0 — Final copy sweep (idempotent; ensures local = staged)
```powershell
cd "D:\projects\core projects\ContractNest\contractnest-combined"
git pull origin claude/tenant-bbb-data-issues-buwxqm
Copy-Item "MANUAL_COPY_FILES\manual_copy_v2\contractnest-api\src\*"  -Destination "contractnest-api\src\"  -Recurse -Force
Copy-Item "MANUAL_COPY_FILES\manual_copy_v2\contractnest-ui\src\*"   -Destination "contractnest-ui\src\"   -Recurse -Force
Copy-Item "MANUAL_COPY_FILES\manual_copy_v2\contractnest-edge\supabase\*" -Destination "contractnest-edge\supabase\" -Recurse -Force
Copy-Item "MANUAL_COPY_FILES\manual_copy_v2\ClaudeDocumentation\productled\*" -Destination "ClaudeDocumentation\productled\" -Recurse -Force
```

**Older staged batches — decision needed:**
- `hide-contact-overview-tab` (owner-requested, pending review): include by
  also running its Copy-Item from that folder's COPY_INSTRUCTIONS, then it
  rides the UI commit below. Recommended: include.
- `adhoc-invoice-no-contract` (SQL live, API/UI **never copied or tested
  locally**): recommended **DEFER** — merge untested UI breaks the flow.
  Keep it staged; test it as its own batch later.

## STEP 1 — Commit UI
```powershell
cd contractnest-ui
git checkout main
git pull origin main
git status
git add .
git commit -m "feat: sprint 2+7 execution loop + registry hardening (R1-R7, B2, B3, B4 UI)

Registry renders the contract MachineCard with real service state; service
wizard Evidence step + zero-price fix; drawer reads resolved form mappings;
FormFillModal (submission bound per asset, mark-proven cascade); beyond-scope
amounts -> on-the-fly invoice; public service report page + route; equipment
coverage visibility (Covers chips); evidence chips in contract wizard."
git push -u origin main
cd ..
```

## STEP 2 — Commit API
```powershell
cd contractnest-api
git checkout main
git pull origin main
git status
git add .
git commit -m "feat: sprint 2+7 API — forms templates/mappings, event-asset prove, beyond-scope invoice

GET /api/forms/templates(+/:id) + /mappings; event_asset_id through
submissions; POST /api/v2/contracts/:id/event-assets/:assetId/prove;
POST /api/service-execution/:ticketId/invoice; registry include_inactive/
with_contracts passthrough; start_now on ticket create."
git push -u origin main
cd ..
```

## STEP 3 — Commit Edge (records of already-deployed functions + migrations)
```powershell
cd contractnest-edge
git checkout main
git pull origin main
git status
git add .
git commit -m "feat: sprint 2+5+7 + B4 edge records — deployed functions + live migration records

smart-forms v7, service-execution v5, contracts-v2 v7, client-asset-registry
v13, service-report v1 (all DEPLOYED; files are source-of-record). Live
migration records: service-execution 003-013 (forms bind, ticket start,
mark-proven cascade, beyond-scope invoice, report token, STE FK swap,
appointment sweep+guard, B4 notifications) + jtd-cutover 004-005 (BBB)."
git push -u origin main
cd ..
```

## STEP 4 — Commit Documentation
```powershell
cd ClaudeDocumentation
git checkout master
git pull origin master
git add .
git commit -m "docs: Sprint 2-5-7 POA final status + Sprint 5 repair report + B4 MSG91 registration"
git push origin master
cd ..
```

## STEP 5 — Parent repo submodule refs
```powershell
cd "D:\projects\core projects\ContractNest\contractnest-combined"
git add contractnest-ui contractnest-api contractnest-edge ClaudeDocumentation
git commit -m "chore: update submodules - sprint 2+5+7 execution loop, registry hardening, B4 notifications"
git push origin master
```

## STEP 6 — Verify clean
```powershell
git status
git submodule status
# expect: working tree clean; submodules on new main/master commits
```
