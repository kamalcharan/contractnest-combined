# ContractNest - Claude Code Session Instructions

> **CRITICAL**: Read this entire file at the start of every session. This ensures all submodules are properly initialized and code changes are tracked correctly.

---

## 🛑 GOLDEN RULES - READ FIRST

### 1. ANALYSIS FIRST, CODE LATER
- **NEVER start coding immediately**
- First: Understand the requirement, analyze existing code, propose approach
- Wait for explicit confirmation: "Yes, proceed with coding" or "Go ahead"
- Only then write code

### 2. TWO-PHASE DELIVERY
| Phase | When | What I Provide |
|-------|------|----------------|
| **Phase 1: Local Testing** | After coding | MANUAL_COPY_FILES + Copy commands ONLY |
| **Phase 2: Merge/Commit** | After user confirms "tested & working" | Full commit/merge commands |

**❌ NEVER include merge/commit commands in Phase 1**
**✅ ALWAYS wait for user confirmation before providing Phase 2**

### 3. NO UNSOLICITED REFACTORING
- **NEVER refactor existing code** unless explicitly asked
- If refactoring seems beneficial, ASK first: "I noticed X could be improved. Should I refactor?"
- Focus only on the requested feature/fix

### 4. PRODUCTION-READY CODE STANDARDS
ALL code must include these 5 elements:

| # | Requirement | Description |
|---|-------------|-------------|
| 1 | **Transaction Management** | Database operations wrapped in transactions, rollback on failure |
| 2 | **Race Condition Handling** | Proper locking, optimistic concurrency, debouncing where needed |
| 3 | **Error Handling** | Try-catch blocks, proper error propagation, user-friendly messages |
| 4 | **Toasts** | Success/error/warning notifications using EXISTING toast components |
| 5 | **Loaders** | Loading states for async operations using EXISTING loader components |

⚠️ **Before implementing toasts/loaders**: Check if components exist. If not, ASK:
> "I don't see an existing toast/loader component. Should I create one or is there an existing one I should use?"

---

---

## 🔍 Task Workflow: Analysis Before Code

### When User Requests a Feature/Fix:

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: UNDERSTAND                                         │
│  - What exactly is being requested?                         │
│  - What's the expected behavior?                            │
│  - What are the edge cases?                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: ANALYZE EXISTING CODE                              │
│  - Check relevant files in affected submodules              │
│  - Identify existing patterns (toast, loader, error         │
│    handling components)                                     │
│  - Note any dependencies                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: PROPOSE APPROACH                                   │
│  - Files to be modified/created                             │
│  - Technical approach                                       │
│  - Components to be reused                                  │
│  - Any questions or clarifications needed                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: WAIT FOR CONFIRMATION                              │
│  ⏸️ "Does this approach look good? Should I proceed?"       │
└─────────────────────────────────────────────────────────────┘
                            ↓
              User confirms: "Yes, proceed"
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: CODE                                               │
│  - Implement with production standards                      │
│  - Provide PHASE 1 output (copy commands only)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
              User confirms: "Tested, working"
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: PROVIDE PHASE 2                                    │
│  - Commit/merge commands                                    │
└─────────────────────────────────────────────────────────────┘
```

### Questions I Should Ask Before Coding:

1. **Missing Components**: "I don't see an existing [toast/loader/modal] component. Which one should I use?"
2. **Unclear Requirements**: "Should this [feature] also handle [edge case]?"
3. **Multiple Approaches**: "I can implement this using [A] or [B]. Which do you prefer?"
4. **Potential Impact**: "This change might affect [other feature]. Should I check that too?"

---

## 📁 Project Structure

```
D:\projects\core projects\ContractNest\contractnest-combined\
├── contractnest-api/          # Backend API (Node.js/Express) - branch: main
├── contractnest-ui/           # Frontend UI (React/TypeScript) - branch: main
├── contractnest-edge/         # Edge Functions/Serverless - branch: main
├── ClaudeDocumentation/       # Documentation - branch: master
├── ContractNest-Mobile/       # Mobile App (React Native) - branch: main
├── MANUAL_COPY_FILES/         # Claude's output folder for code changes
└── CLAUDE.md                  # THIS FILE
```

---

## 🚨 MANDATORY: Session Initialization

**EVERY SESSION MUST START WITH THESE COMMANDS:**

```bash
# Navigate to parent repo
cd "D:\projects\core projects\ContractNest\contractnest-combined"

# Ensure all submodules are initialized and updated
git submodule update --init --recursive

# Verify ALL 5 submodules are present and accessible
ls -la contractnest-api/
ls -la contractnest-ui/
ls -la contractnest-edge/
ls -la ClaudeDocumentation/
ls -la ContractNest-Mobile/

# Check submodule status
git submodule status
```

**Expected Output from `git submodule status`:**
```
 [commit-hash] contractnest-api (heads/main)
 [commit-hash] contractnest-ui (heads/main)
 [commit-hash] contractnest-edge (heads/main)
 [commit-hash] ClaudeDocumentation (heads/master)
 [commit-hash] ContractNest-Mobile (heads/main)
```

⚠️ **If any submodule shows as empty or missing, run:**
```bash
git submodule update --init --recursive --force
```

---

## 📋 Submodule Quick Reference

| Submodule | Purpose | Branch | Tech Stack |
|-----------|---------|--------|------------|
| `contractnest-api` | Backend API | `main` | Node.js, Express, TypeScript |
| `contractnest-ui` | Frontend Web App | `main` | React, TypeScript, Vite |
| `contractnest-edge` | Edge/Serverless Functions | `main` | Cloudflare Workers / Edge |
| `ClaudeDocumentation` | Project Documentation | `master` | Markdown |
| `ContractNest-Mobile` | Mobile Application | `main` | React Native |

---

## 🔴 CRITICAL: Code Output Rules

### I CANNOT push to GitHub directly due to authentication limitations.

### Instead, I MUST follow this exact structure:

```
MANUAL_COPY_FILES/
└── [feature-branch-name]/
    ├── contractnest-api/
    │   └── [files mirroring exact repo structure]
    ├── contractnest-ui/
    │   └── [files mirroring exact repo structure]
    ├── contractnest-edge/
    │   └── [files mirroring exact repo structure]
    ├── ClaudeDocumentation/
    │   └── [files]
    ├── ContractNest-Mobile/
    │   └── [files]
    └── COPY_INSTRUCTIONS.txt
```

### ❌ NEVER DO:
- Place files randomly in MANUAL_COPY_FILES/ root
- Mix files from different feature branches
- Forget to create COPY_INSTRUCTIONS.txt
- Use incorrect folder names

### ✅ ALWAYS DO:
- Create feature branch folder first
- Mirror exact submodule folder structure inside
- Include complete file paths in COPY_INSTRUCTIONS.txt
- Specify which submodules were modified

---

## 📤 Required Output Format After Making Changes

### PHASE 1: LOCAL TESTING (Provide immediately after coding)

```
═══════════════════════════════════════════════════
📦 CHANGES SUMMARY
═══════════════════════════════════════════════════
Branch: [feature-branch-name]
Files Changed:
  - [submodule]/[path/to/file] - [purpose]
  - [submodule]/[path/to/file] - [purpose]

Submodules Affected: [list affected submodules]

Production Checklist:
  ✅ Transaction Management: [Yes/No - where applied]
  ✅ Race Condition Handling: [Yes/No - where applied]
  ✅ Error Handling: [Yes/No - where applied]
  ✅ Toasts: [Yes/No - component used]
  ✅ Loaders: [Yes/No - component used]

═══════════════════════════════════════════════════
💻 PHASE 1: COPY FILES FOR LOCAL TESTING
═══════════════════════════════════════════════════

STEP 1: Navigate to Project
─────────────────────────────────
cd "D:\projects\core projects\ContractNest\contractnest-combined"

STEP 2: Copy Files from MANUAL_COPY_FILES
─────────────────────────────────
Copy-Item "MANUAL_COPY_FILES\[feature-branch-name]\contractnest-ui\*" -Destination "contractnest-ui\" -Recurse -Force
Copy-Item "MANUAL_COPY_FILES\[feature-branch-name]\contractnest-api\*" -Destination "contractnest-api\" -Recurse -Force
# ... etc for each affected submodule

Write-Host "✅ All files copied!" -ForegroundColor Green

STEP 3: Start Dev Server & Test
─────────────────────────────────
# ContractNest UI
cd contractnest-ui && npm run dev

# API (if modified)
cd ../contractnest-api && npm run dev

# Hard refresh browser: Ctrl+F5

═══════════════════════════════════════════════════
🧪 TESTING CHECKLIST
═══════════════════════════════════════════════════
- [ ] [Test item 1]
- [ ] [Test item 2]
- [ ] [Test item 3]

═══════════════════════════════════════════════════
⏸️ WAITING FOR CONFIRMATION
═══════════════════════════════════════════════════
Test locally and confirm:
  → "Tested, working - proceed with merge"
  → "Issue found: [describe problem]"
═══════════════════════════════════════════════════
```

---

### PHASE 2: COMMIT & MERGE (Provide ONLY after user confirms testing passed)

```
═══════════════════════════════════════════════════
🚀 PHASE 2: COMMIT & MERGE TO MAIN
═══════════════════════════════════════════════════

STEP 1: Commit UI Changes (if applicable)
─────────────────────────────────
cd contractnest-ui
git status
git add .
git commit -m "feat: [descriptive message]"
git push origin main
cd ..

STEP 2: Commit API Changes (if applicable)
─────────────────────────────────
cd contractnest-api
git status
git add .
git commit -m "feat: [descriptive message]"
git push origin main
cd ..

STEP 3: Commit Edge Changes (if applicable)
─────────────────────────────────
cd contractnest-edge
git status
git add .
git commit -m "feat: [descriptive message]"
git push origin main
cd ..

STEP 4: Commit Mobile Changes (if applicable)
─────────────────────────────────
cd ContractNest-Mobile
git status
git add .
git commit -m "feat: [descriptive message]"
git push origin main
cd ..

STEP 5: Commit Documentation Changes (if applicable)
─────────────────────────────────
cd ClaudeDocumentation
git status
git add .
git commit -m "docs: [descriptive message]"
git push origin master
cd ..

STEP 6: Update Parent Repo Submodule References
─────────────────────────────────
cd "D:\projects\core projects\ContractNest\contractnest-combined"
git add contractnest-ui contractnest-api contractnest-edge ClaudeDocumentation ContractNest-Mobile
git commit -m "chore: update submodules - [feature description]"
git push origin master

STEP 7: Verify Clean State
─────────────────────────────────
git status
git submodule status
# Should show: "nothing to commit, working tree clean"

Write-Host "✅ All changes committed and merged!" -ForegroundColor Green
═══════════════════════════════════════════════════
```

---

## 🔄 Pull Everything Script (Fresh Start)

```powershell
cd "D:\projects\core projects\ContractNest\contractnest-combined"

# Pull parent repo
git checkout master
git pull origin master

# Initialize and update ALL submodules
git submodule update --init --recursive --remote

# Explicitly pull each submodule to correct branch
cd contractnest-api
git checkout main
git pull origin main
cd ..

cd contractnest-ui
git checkout main
git pull origin main
cd ..

cd contractnest-edge
git checkout main
git pull origin main
cd ..

cd ClaudeDocumentation
git checkout master
git pull origin master
cd ..

cd ContractNest-Mobile
git checkout main
git pull origin main
cd ..

cd "D:\projects\core projects\ContractNest\contractnest-combined"
Write-Host "✅ All repos pulled and synced!" -ForegroundColor Green
```

---

## 📤 Push Everything Script

```powershell
cd "D:\projects\core projects\ContractNest\contractnest-combined"

# Push API
cd contractnest-api
git checkout main
git pull origin main
git add .
git commit -m "Update API" --allow-empty
git push origin main
cd ..

# Push UI
cd contractnest-ui
git checkout main
git pull origin main
git add .
git commit -m "Update UI" --allow-empty
git push origin main
cd ..

# Push Edge
cd contractnest-edge
git checkout main
git pull origin main
git add .
git commit -m "Update Edge" --allow-empty
git push origin main
cd ..

# Push ClaudeDocumentation
cd ClaudeDocumentation
git checkout master
git pull origin master
git add .
git commit -m "Update Documentation" --allow-empty
git push origin master
cd ..

# Push ContractNest-Mobile
cd ContractNest-Mobile
git checkout main
git pull origin main
git add .
git commit -m "Update Mobile" --allow-empty
git push origin main
cd ..

# Update parent repo
git checkout master
git pull origin master
git add .
git commit -m "Update submodule references" --allow-empty
git push origin master

Write-Host "✅ Everything pushed to GitHub!" -ForegroundColor Green
```

---

## 🛠️ Troubleshooting

### Submodule Not Initialized
```bash
git submodule update --init --recursive --force
```

### Detached HEAD in Submodule
```bash
cd [submodule-name]
git checkout main  # or master for ClaudeDocumentation
git pull origin main
cd ..
```

### Submodule Conflicts During Merge
```bash
cd [conflicted-submodule]
git checkout main
git pull origin main
cd ..
git add [conflicted-submodule]
git commit -m "Resolve submodule conflict"
```

### Reset Submodule to Remote State
```bash
cd [submodule-name]
git fetch origin
git reset --hard origin/main  # or origin/master
cd ..
```

---

## 📌 Commit Message Conventions

Use these prefixes for clear commit history:

| Prefix | Usage |
|--------|-------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `style:` | Formatting, no code change |
| `refactor:` | Code restructuring |
| `test:` | Adding tests |
| `chore:` | Maintenance tasks |

**Examples:**
- `feat: add NAV tracking dashboard`
- `fix: resolve TypeScript compilation errors`
- `docs: update API endpoint documentation`
- `chore: update submodules with auth fixes`

---

## 🔮 Future Review Items

### Service KT (Knowledge Tree) — Stream 1 architectural decision
Services (`resource_type_id = 'service'`) currently seed as **shell cat-blocks** (price = 0, no variants, `pricingMode = independent`). This is intentional for Stream 1.

Equipment has admin-curated KT master data:
`m_equipment_checkpoints` → `m_service_cycles` → `m_equipment_variants` → prices + cadence

Services do NOT have KT equivalent yet. Future work if needed:
- `m_service_packages` (analogous to checkpoints) — defines deliverables per service type
- `m_service_pricing` — market-reference pricing per package
- Extend `ktCatBlockMapperService` to handle `resource_type_id = 'service'`

**Current state**: tenant sets price manually in pricing-review step or catalog-studio editor after onboarding.
**When to revisit**: when platform needs pre-filled market-reference pricing for consulting/wellness/legal service types.

### Per-block discount — deliberately deferred (Sprint 1 spec deviation)
`CONTRACTNEST_SPRINT_SPEC.md` Sprint 1 step (b) calls for `t_contract_blocks.custom_fields.list_price` / `loaded_discount` (a discount settable per pricing block, in addition to the contract-level discount). Owner decision: discount stays **contract-level only** for now — mutually exclusive block-vs-contract discount was designed and mocked, but not built, to avoid adding a control to the already-cramped "Add Service Blocks" step.

**Current state**: only the contract-level discount (Billing View step, `discount_type`/`discount_value`/`discount_total`) exists and is fully stitched end-to-end (mapper, billing event derivation, backend parity, Events Preview, contract document).
**When to revisit**: owner's call — flagged here so it isn't mistaken for a missed Sprint 1 item. If picked back up, an interactive mock already exists from the design discussion (single-page "Add Service Blocks" with a compact discount-mode toggle + collapsed-by-default per-block discount row) to start from.

### Contact detail — Overview tab staged to be hidden (2026-07-24)
`/contacts/:id` (`contractnest-ui/src/pages/contacts/view.tsx`) has a Profile | Overview | Contracts | Assets | Financials | Timeline tab layout. Per explicit owner request (no reason given), the **Overview** tab is being hidden — commented out in the `TABS` array (and its now-unused `LayoutDashboard` icon import removed). Staged in `MANUAL_COPY_FILES/hide-contact-overview-tab/` — not yet copied into the local checkout or merged to `main`; owner will copy, test, and merge per usual flow.

**Current state**: `OverviewTab` component (`components/contacts/dashboard/OverviewTab.tsx`) and its import are untouched, just unwired — nothing deleted. Once merged, tab bar will show Profile | Contracts | Assets | Financials | Timeline.
**When to revisit**: owner's call — pending review next session. Un-hide by uncommenting the `{ key: 'overview', ... }` entry and restoring the `LayoutDashboard` import.

### Billing cadence dates drift off calendar-month/quarter boundaries (found 2026-07-24)
The billing-event derivation engine (`contractnest-api/src/services/contractEventsDerivationService.ts`'s `cycleToPeriodDays` — `monthly: 30, quarterly: 90, halfyearly: 182, annual: 365` — mirrored in the UI (`contractnest-ui/src/utils/service-contracts/contractEvents.ts`) and the edge cadence-acceptance module (`contractnest-edge/supabase/functions/contracts/cadence-acceptance.ts`)) generates every recurring cadence as a **fixed day-count interval** from the contract start date, not calendar-aligned. Since months aren't a uniform 30 days, this drifts: e.g. a Monthly schedule starting 1 Apr lands on 1 Apr → 1 May → **31 May** → 30 Jun → 30 Jul... — two events land within the same calendar month (May) whenever a 31-day month is crossed. Quarterly has the same root cause (Apr 1 → Jun 30 → Sep 28 → Dec 27, not the 1st of each quarter-month) — less visually jarring than Monthly but the same bug.

**Current state**: BBB's 18 Monthly-cadence contracts were corrected as a live data fix (`t_contract_events.scheduled_date`/`original_date` recomputed to the same day-of-month each calendar month, including already-paid events, so Payment History reads 1 Apr / 1 May / 1 Jun / 1 Jul cleanly). This was a **data-only fix for BBB**, not an engine change — the derivation engine itself is untouched and will keep producing drifted dates for every new Monthly/Quarterly/Half-yearly/Annual cadence contract on every tenant.
**When to revisit**: needs a real engineering pass (day-count math → calendar-month arithmetic) across all three mirrored copies (API, UI, edge) plus regression testing against proration/invoice generation, which assume day-count periods today. Deliberately not touched the night of BBB's go-live — too wide a blast radius to rush.

### Public check-in page — no-cache headers added (2026-07-24)
`contractnest-api/src/routes/sessionCheckinPublicRoutes.ts` (serves `/checkin/:token`, no auth) had no `Cache-Control` headers at all on any route — a real risk since the same QR/link is scanned repeatedly by many different members on many different phones, and mobile browsers or carrier proxies (aggressive GET caching is common on Indian telecom networks) will cache a `resolve`/`history` response with no explicit directive, potentially showing one member a stale or another member's attendance/dues state. Added a router-level middleware setting `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` + `Pragma: no-cache` + `Expires: 0` on every response from this router.
**Current state**: fix applied to the router; the SPA shell itself (`contractnest-ui`) was already safe — nginx serves `index.html` with `no-cache, no-store, must-revalidate` and hashed JS/CSS assets with `immutable` caching, the standard safe pattern, so this closed the one real gap (API responses).
**When to revisit**: no further action expected; noted here for the record since it was a live-traffic risk fixed same-day as go-live.

### CRITICAL — check-in "today" was computed in UTC, not IST (found + fixed live, 2026-07-25)
Every group-session check-in/attendance/dashboard RPC (`gs_resolve_checkin`, `gs_submit_checkin`, `gs_checkin_guest`, `gs_checkin_substitute`, `gs_checkin_form`, `gs_dash_occurrences`, `gs_dash_sessions`, `gs_member_block`, `gs_dash_roster`, `gs_occurrence_attendance`, `gs_generate_schedule`, `gs_schedule_assign_default`, `gs_confirm_declaration`) used bare `current_date` — the **database's** timezone (UTC) — to decide "is there a session today." Discovered live at 00:28 IST on 25 Jul 2026 (BBB's actual go-live morning): `current_date` was still `'2026-07-24'` (UTC doesn't roll to the 25th until 05:30 IST), so the check-in page said "No session today — next session 25 Jul 2026" even though it already *was* 25 Jul in India and today's real Saturday Cadence occurrence existed and was checkin-able. Every IST day has this ~5.5-hour blind window (00:00–05:30 IST) where the whole check-in surface silently thinks it's still yesterday.

**Fix (live, migration `bbb-foundation/048_checkin_ist_today.sql`)**: all 13 functions above now compute "today" as `(now() at time zone 'Asia/Kolkata')::date` instead of `current_date`. Applied by pulling each function's live definition and substituting the expression in place (not retyped by hand) — verified live against a real BBB token: `gs_resolve_checkin` now correctly returns `today: 2026-07-25` and matches today's actual occurrence.
**Current state**: `'Asia/Kolkata'` is hardcoded — there is no per-tenant timezone column (`t_tenants`/`t_tenant_profiles` checked, neither has one). Correct today since every observed tenant is India-based.
**When to revisit**: before the platform serves tenants outside India, this needs to become tenant-configurable (add a timezone column, thread it through these functions) rather than hardcoded. Until then, every "today"-based date comparison anywhere in the platform should be treated with suspicion — this fix only covered the check-in/group-session surface; other RPCs using bare `current_date`/`now()` elsewhere may have the same latent bug and haven't been audited.

### OPEN — check-in UPI pay link still fails on real GPay, "mc=0000" fix didn't resolve it (2026-07-25)
Member-facing check-in page (`contractnest-ui/src/pages/checkin/SessionCheckinPage.tsx`, `upiPayUrl()`) builds `upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>`. Live BBB VPA is `9849502193@kbl` (payee name on file: "U S R Travels" — confirmed by the tenant to be the correct, intentional receiving account, not a misconfiguration). Tapping "Pay now" opens GPay but the transaction is rejected with **"Payments to this receiver are not allowed by UPI network"**, money not debited. Scanning that same VPA's own GPay-generated QR code directly (outside the app) **works fine** — so the VPA itself can receive payments; something about our constructed intent link specifically is being rejected.

**Tried and deployed, did NOT fix it**: added `mc=0000` (merchant category code — mandatory per NPCI UPI Linking Spec, present on every real QR but missing from the hand-built link) to `upiPayUrl()`. Shipped to `contractnest-ui` main (commit range `5b4c65e..30656d9`) and confirmed deployed to prod. Retested against the same VPA — **error still reproduces**. So the `mc` theory was either wrong or incomplete.

**Current state**: root cause still unknown. The `mc=0000` change is live but harmless either way (correct per spec regardless), left in place. Next things to check: whether GPay treats a *browser-triggered* `upi://` deep link differently from a native QR scan (known real-world inconsistency, independent of any URL parameters — some Android/GPay versions restrict intent-based pay links opened from a mobile browser vs. the camera/QR flow); whether the check-in page's hosting context (in-app browser vs. default browser, HTTP vs HTTPS, or however the QR/link is actually opened by members) affects intent resolution; whether additional NPCI-recommended params (`tr` transaction reference, `mode`) matter even for personal accounts; and getting the *exact* GPay error screenshot/timestamp again to correlate with server-side logs if any exist.
**When to revisit**: next session — user said "we will resolve tomorrow." Until fixed, check-in page payments are effectively broken end-to-end for real members trying to pay via GPay through the app; members can still pay by scanning the seller's own QR directly outside the app and entering the UPI reference manually (existing fallback UI already supports this).

### Sprint 3 — per-asset event proof is scaffolded client-side but has NO backend route (found 2026-07-31)
Raised while closing the RFQ/Group-Session work: if a coverage item has more than one unit (e.g. "DG Set ×2") and a service block has a recurring Service Cycle, does "N visits" mean N visits per unit, or N visits covering all units together? Traced `contractnest-api/src/services/contractEventsDerivationService.ts` — `quantity` is the block's total visit count, spaced `serviceCycleDays` apart; it has no per-unit concept at all. One shared block covering a 2-unit coverage group produces N visits **total**, each visit implicitly covering both units together — not N visits per unit.

Went looking for whether a real per-asset audit trail already exists before building anything new, since `AssetSelectionStep.tsx`'s `CoverageTypeItem` comment says unit_count "at activation these drive the per-asset event fan-out," and a `EventAssetProgress.tsx` component already exists (Sprint 3 — collapsed "n/m assets proven" chip, expands to a per-asset list with status: open/assigned/in_progress/proven/blocked_placeholder, via `useContractEventAssets`/`ContractEventAssetRow` in `useContractEventQueries.ts`, calling `GET /api/contracts/:id/event-assets`). **That backend route does not exist anywhere in `contractnest-api`** — confirmed by grep across the whole API source, zero matches. So Sprint 3's real fix (one shared visit, proof tracked per attached asset within it) is UI scaffolding only, never wired end-to-end.

**Decision (explicit, this session)**: ship a UX-only fix now, defer the real Sprint 3 backend work. Batch `mvp-rfq-19` (branch `claude/rfq-handover-facilities-i4w7mt`) adds, in both the Contract wizard (`ServiceBlocksStep.tsx` + `ChecklistRow.tsx`) and the RFQ builder (`RfqBuilderPage.tsx`):
  - An explicit disambiguation banner on any block with `coverageUnitCount > 1` and a Service Cycle set: "N visits cover all M units of X together, per visit — not N visits for each unit."
  - A "Split into M independent schedules instead" action (FlyBy blocks only, not catalog blocks) that clones the block into M separate per-unit blocks, each with its own independently-editable Visits/Cycle.
  - RFQ's `services` (FlyBy blocks) previously had NO link at all to `coverage` lines (two fully separate arrays) — added an "Applies to" picker so a block can reference which coverage line it's for, persisted into `custom_fields.config.coverageTypeId/coverageTypeName` (same JSONB blob already used for `flyby_type`/`serviceCycleDays`).

No DB schema, RPC, or backend change in mvp-rfq-19 — this is the escape-hatch, not the real fix.

**Current state**: the escape hatch (split into independent per-unit blocks) is the only way today to get an actual distinct schedule per physical unit — there is still no per-asset PROOF (check-off, audit trail) within a single shared visit, because the backend for that was never built.
**When to revisit**: whenever Sprint 3 is picked up. Needs: the actual `GET /api/contracts/:id/event-assets` route (and whatever write-side confirm/proof endpoint pairs with it), a table linking each derived event to its covered assets with a status, population of that table at event-derivation time from `equipment_details`/coverage (the "per-asset fan-out" `AssetSelectionStep.tsx` already anticipates in its comments), and wiring the already-built `EventAssetProgress.tsx` check-off UI to real data instead of a non-existent endpoint.

#### Sprint 3 scope addition — RFQ Award must hand off to a real vendor-authored contract, not a status flip (found 2026-07-31)
Live-diagnosed while closing the RFQ handover work (branch `claude/rfq-handover-facilities-i4w7mt`): today, awarding an RFQ and moving it to `converted_to_contract` produces **nothing usable**. Traced end to end —

- `rfq_award` RPC only flips the winning `t_contract_vendors` row to `response_status='accepted'`, declines the rest, and calls `update_contract_status(..., 'awarded', ...)`. It never creates a `t_contracts` row.
- `update_contract_status`'s `awarded → converted_to_contract` branch (the one generic state-machine function shared by both `record_type='contract'` and `record_type='rfq'` rows) is a **bare status flip** — sets `status`, `completed_at`, inserts one `status_changed` history row. No conversion logic exists.
- No linkage column exists anywhere: `information_schema.columns` search for `column_name ilike '%rfq%'` across `t_contracts` only matches `rfq_number`. There is no `source_rfq_id`/`rfq_id` on `t_contracts`, and no `contract_id` on the RFQ's own row.
- A pre-existing component, `contractnest-ui/src/components/contracts/RfqQuotesPanel.tsx` (not written this session — already in the codebase), already encodes the intended product model in its own comments: *"AWARDING DOES NOT CREATE A CONTRACT. The product's model is that the vendor initiates the contract... awarding marks the winner, declines the rest and moves the RFQ to 'awarded'."* Its confirm-dialog copy tells the buyer exactly that: *"This does not create a contract. The vendor raises the contract from their side..."* So the "vendor builds the real contract" model was decided in an earlier session — only the vendor's half of it was never built, and even the Award action's own backend route (`contractnest-api/src/routes/rfqRoutes.ts`, `/api/rfq/:contractId/award`) is not registered in `index.ts`.

**Owner decision (2026-07-31), explicit 5-point spec, not yet designed or built**:
1. A contract must be created in ContractNest's specific/proper format — a real, properly-structured `t_contracts` row (`record_type='contract'`), built through the same structure normal contracts use, not a bare status flip.
2. The RFQ record must never itself be converted into/mutated into a contract — it stays a genuinely separate record.
3. Send a public link to the awarded vendor (presumably a new CNAK+secret-style grant, same pattern as the existing `/quote/:cnak/:secret` link, but scoped to contract-creation rather than quote-response).
4. The awarded vendor goes through ContractNest's own contract-creation steps to build the contract themselves — implying some vendor-facing reuse/adaptation of the Contract Wizard's structured, block-based creation flow, not a simple amount+notes form (this is also why the plain amount+notes vendor quote page was flagged as likely wrong for the *quoting* step itself — the owner's stated reasoning was "vendor has to create a contract because they will see structure and it will work properly into our system").
5. Bidirectional DB linkage: the new contract row stores the originating RFQ's id; the RFQ row stores the resulting contract's id.

**Current state**: pure specification — no research, schema design, migration, route, or UI work has started. Explicitly parked by owner ("we will not do this" this session) and folded into Sprint 3 scope alongside the per-asset event-proof gap above, since both are "the real backend work behind UI/flows that already assume it exists."
**When to revisit**: next session this is picked up, before writing any code: (a) confirm exact shape of the two new linkage columns (`t_contracts.source_rfq_id`? RFQ-side `contract_id`?) and whether they live on `t_contracts` itself or a join table; (b) read `create_contract_transaction` (or whatever RPC actually creates a normal contract today) to see how much of it a vendor-facing flow can reuse as-is vs. needs a parallel path; (c) decide whether "vendor goes through contractnest steps" means the vendor literally uses (a public-context variant of) the Contract Wizard React components, or a new lighter parallel flow that produces the same `t_contracts` shape; (d) design the new public-link/access-grant type for contract-creation (vs. the existing quote-response grant) — including how the vendor's created contract gets attributed to the buyer's tenant; (e) only then implement, per this repo's usual analysis-first workflow.

### BBB Group Session notifications — all five live (2026-08-04)

All five group-session WhatsApp triggers are built, deployed and **verified arriving on a real handset**. Applied directly to production this session (owner instruction "you can run the migrations" / "make things work / live"), so the migration files under `MANUAL_COPY_FILES/group-session-scheduled-notifications/` are a source-of-record copy of what is already live — **do not re-run them**.

| Trigger | Fires | Style |
|---|---|---|
| `group_session_attendance_ack` | on check-in (rides `gs_submit_checkin`) | NAMED |
| `group_session_payment_thankyou` | on chair confirm (rides `gs_confirm_declaration`) | NAMED |
| `group_session_looking_forward` | 3 days out **and** 1 day out | POSITIONAL |
| `group_session_noshow_regret` | session end + 2h | POSITIONAL |
| `group_session_absentee_reminder` | 3 days out, to members who missed the last two | POSITIONAL |

Infrastructure added: `gs_run_session_notifications()` (IST-aware, cron `group-session-notifications` every 15 min), `gs_roster_members()`, `gs_member_whatsapp_phone()`, and `ux_n_jtd_group_session_reminder` (partial unique index — `n_jtd` previously had **no** unique index beyond its PK, so a cron would have re-sent every 15 minutes forever).

**⚠️ THE TRAP — WhatsApp parameter styles are MIXED in this MSG91 account.** Templates registered **before Aug 2026** (`attendance_ack`, `payment_thankyou`) use Meta's **named** parameters (`body_<name>` + `parameter_name`). Everything registered **from Aug 2026 onward** is **positional** (`body_1`, `body_2`), because MSG91's editor now refuses named placeholders ("Variables parameters must be whole numbers with two sets of curly brackets"). There is **no account-wide rule** — each branch in `jtd-worker/handlers/whatsapp.ts` must match how its own template was registered. This cost a full cycle of wrong diagnoses in both directions. Getting it wrong fails **silently**: MSG91 accepts the request and returns a request_id (row reads `status='sent'`), then WhatsApp rejects on delivery with *"Parameter name is missing or empty"*. Two templates failed this way from 1–4 Aug and were only caught by checking a handset.

**`status='sent'` has never meant delivered.** It means MSG91 accepted the request. A new `msg91-webhook` edge function (v1, `verify_jwt=false`) now receives delivery reports and moves rows to delivered/read/failed — statuses are ranked and move forward only, so out-of-order callbacks can't walk a row backwards.
**Not yet wired**: MSG91 already posts delivery reports (webhook "BBB", event *On Inbound Report Received*) to **n8n** at `https://n8n.srv1096269.hstgr.cloud/webhook/whatsapp-msg91` — they simply never reached ContractNest. Recommended: add an HTTP Request node in that n8n workflow forwarding the payload to `https://uwyqhzotluikawcboldr.supabase.co/functions/v1/msg91-webhook`, leaving MSG91 config untouched. n8n's execution history holds real MSG91 report payloads — capture one and tighten the deliberately shape-agnostic extractor to exact paths.

Also fixed this session: `gs_confirm_declaration`'s payment thank-you had three defects that would have hit on its first-ever fire — blank session name (read `cat_block_id`, NULL on all 33 declarations), an amount that collapsed to **0** when no open invoice existed, and a fragile `country_code`-concatenating phone lookup. It now refuses to enqueue unless name, session and a non-zero amount all resolve.
**When to revisit**: only if a template is re-registered (re-check its parameter style), or to wire the n8n forwarding.

### BBB notifications — first live batch, four defects found and fixed (2026-08-05)

The first real batch (3-days-out for the 8 Aug occurrence) went out and exposed four things. All fixed in production; migrations 056–059 and jtd-worker v34 are source-of-record copies under `MANUAL_COPY_FILES/group-session-scheduled-notifications/` — **do not re-run**.

**1. It dispatched at 00:00 IST.** The date window opens the moment the IST date rolls over, so 46 members were messaged in the middle of the night. Fixed with a per-block dispatch hour: `config.groupSession.notifications.dispatchHour` (IST, default 10), gating the two forward-looking reminders to 10:00–21:00. The **upper bound is deliberate** — without it a day-long outage would "catch up" at 23:00 and recreate the problem. No-show regret is not gated; it is already anchored to session end + 2h.

**2. Three members got nothing — line breaks in their names.** MSG91 rejects `"next line(\n) is not supported for body value"`. Three BBB contacts have embedded CRLFs (`"JAGANNADHA SHASTRY SOMANCHI\r\n (BHUSHANA MEMBER)"`). Unfixed, this would have blocked **every** future message to them, not just reminders. `cleanParam()` in whatsapp.ts now collapses whitespace on every parameter of every template — applied centrally rather than cleaning three names, because names are free text pasted from imports.

**3. ⚠️ `ON CONFLICT DO NOTHING` + a BEFORE INSERT trigger = phantom queue messages.** `trg_jtd_enqueue` is BEFORE INSERT and calls `pgmq.send()`. On a conflicting row the trigger had already enqueued before the conflict was detected; the row was discarded but the transaction committed, leaving a queue message pointing at an `n_jtd` row that never existed. With a 15-minute cron and day-long windows this injected ~49 junk messages per tick. Harmless to members (the worker deletes unmatched messages) but it burned worker capacity, delayed real sends behind a backlog that regenerated each tick, and made queue depth useless as a health signal. Fixed by a `NOT EXISTS` guard mirroring the unique index on every INSERT, so the trigger never fires for a row that would conflict; `ON CONFLICT` stays only as a race backstop.
**General lesson: anywhere a BEFORE INSERT trigger has side effects outside the row, `ON CONFLICT DO NOTHING` is not a safe dedupe on its own — guard the SELECT.**

**4. The session time was wrong, and duplicated.** `config.groupSession.timing` held 07:30 while the block description said "8.00 AM to 10.00 AM" — two copies of one fact, drifted. 46 members received a reminder contradicting their own contract. Timing corrected to 08:00/120; the time removed from the description (catalog block + all 49 contract snapshots) so `config.groupSession.timing` is the single source, read live at send time.
**Structural follow-up NOT done**: the Block Wizard still lets a time be typed into the description, so the duplication can be reintroduced. Durable fix is to compose that sentence from the structured cadence and timing. UI work, scoped separately.

**Also done**: tenant name in messages via `gs_session_display_name(block, tenant, with_tenant)` → "Saturday Network Meeting, BBB Bhagyanagar". Reads `t_tenant_profiles.business_name` (the Business Profile field), **never** `t_tenants.name` — that is a separate shorter value ("BBB") and would silently produce the wrong text. Applied to four templates; `absentee_reminder` deliberately keeps the plain block name because its template reads "the last couple of {{2}} sessions" and a comma inside the name breaks the grammar. No MSG91 re-approval — this changes a variable's value, not the template.

**Method note**: 056–059 modify long live functions by substituting expressions into `prosrc` rather than retyping them (the migration 048 approach). 058's literal matches **silently no-opped** on two of four functions because whitespace differed; 059 redid them with verified anchors plus a post-check that RAISEs if the expected number of call sites is not present. **A silent no-op is the failure mode of this technique — always verify the rewrite landed.**

**Block renamed** Saturday Cadence → Saturday Network Meeting across 6 live locations (95 values). `n_jtd.template_variables` and `t_idempotency_keys` deliberately left on the old name — history and transient cache.

### Group Sessions → Dues tab, and Finance now agrees with it (2026-08-06)
New **Dues** tab on Operations → Group Sessions: every active contract carrying the block × every month of the April–March year, amount + paid/in-arrears/not-yet-due, with CSV. Backed by `gs_dues_matrix` (migration 060).

Three things worth knowing before touching it:
- **One row per CONTRACT, not per contact.** `gs_dash_roster` collapses with `DISTINCT ON (buyer_id)` — right for "who is in the room", wrong for money, because across a renewal a contact holds both the outgoing and incoming contract. `in_window` flags a contract with nothing billing inside the displayed year so the caller can list it separately instead of padding the grid.
- **Instalments outside the window** are returned as `beyond_total`/`beyond_count`, never dropped.
- **"Today" is IST**, per the migration 048 correction.

**Migration 064 confirmed the 048 warning was right.** `get_tenant_receivables`, `get_tenant_payables`, `get_contact_cockpit_summary` and `get_vani_briefing` were all still deciding overdue-ness with bare `CURRENT_DATE` — **42 occurrences across the four** — so for 5½ hours every IST day Finance believed it was yesterday. All now IST. 064 also gave Finance and the Dues grid **one shared definition of "open"** (they previously disagreed: FIFO-allocated invoice cash vs event status).

Migration 065 adds `is_group_session` to receivables events so `/ops/finance` can filter group-session fees from the rest. It tests the **contract** (any block with `config.audience='group'`), deliberately **not** `block_name` — billing events hang off the FEE block, so on BBB every event reads "BBB Yearly Cadance workout" and the group block never appears.

### DONE 2026-08-06 — BBB restated to ₹19,500 gross with plan discounts (raised 2026-08-04, superseded below)
Everything in the section that follows described the pre-restatement state. It has been **carried out** — migrations 061–065, all applied live and merged to `main`. Read this box first; the original analysis is kept underneath because the two open arithmetic questions it raised are still open.

| | |
|---|---|
| Contracts | 49 · gross **₹9,33,000** − discounts **₹13,500** = net **₹9,19,500** |
| Discounts | quarterly 375 ×10 · half-yearly 750 ×7 · yearly 1,500 ×3 · monthly nil. `discount_type='amount'` (the product's enum is `'percent' \| 'amount'` — **not** `'fixed'`) |
| Billing events | rebuilt to sum ₹9,19,500; **every receipted rupee left untouched** — paid still ₹3,13,500 |
| Invoices | restated in step; all 49 verified individually, zero mismatches (invoice total = grand_total = Σ events, balance recomputes) |
| End dates | all 49 now **31 Mar 2027**. Nothing bills past that date |
| Mid-year joiners | CN-1045 Ajay, CN-1046 Dr Ramanathan, CN-1049 Pavan → **₹13,500** pro-rata each (Pavan was ₹12,000) |
| Deliberately untouched | CN-1024 Patron, CN-1026 Nishikant, CN-1047 Bhushana — left at ₹18,000 on owner instruction ("leave alone right now") |
| `billing_cycle_type` | left as `'mixed'` on owner instruction. It means unified-vs-per-block billing, **not** a payment frequency — do not read it as one |

Plan frequency is now stored in `t_contracts.metadata.billing_plan`; `gs_dues_matrix` prefers it and falls back to inferring from instalment spacing, reporting which via `plan_source`.

**STILL OPEN — the two arithmetic questions below were never resolved, and the restatement made the first one sharper**: every contract now says ₹19,500, but the schedule still holds **25** meetings (11 Apr 2026 → 20 Mar 2027). ₹19,500 ÷ 25 = **₹780**, not the circular's ₹750. Either a 26th meeting is added (the 21-day gap 23 May → 13 Jun is the obvious slot) or ₹750 is the wrong rate. This also feeds the joiners' ₹13,500, which was computed at ₹750.

### OPEN — guest session payments have nowhere to post (raised 2026-08-06)
A guest can declare a payment at check-in, and `gs_pending_declarations` does surface it to the chair (it emits `is_guest_fee` = `billing_event_id IS NULL`). But **`gs_confirm_declaration` has no branch for a null billing event** — it posts to `t_invoices` and `amount_settled`, both of which require one. So a confirmed guest fee lands nowhere and never reaches "total collected".

The obvious fix — a standalone receivable — is blocked by the schema: **`t_invoices.contract_id` is NOT NULL**, and `get_tenant_receivables` is built on `t_invoices JOIN t_contracts`. Every invoice in the system today is tied to a real contract; there is no ad-hoc receivable concept anywhere.

**Owner decision (2026-08-06): deferred.** The product is due to gain contract-less invoice generation, and this should stabilise on that rather than grow a parallel mechanism first. Until then guest payments stay **orphaned** — declarable, confirmable by the chair, but not reconciled into receivables.

**Current state**: zero guest declarations exist on BBB, so this has never fired live. Also found: a **stale 10-argument `gs_checkin_guest` overload** still exists alongside the current 12-argument one (the old one has no payment support at all). The API sends all 12 args so resolution is correct today, but the old overload should be dropped before it resolves by accident.
**When to revisit**: when contract-less invoices ship. Then decide whether a guest fee becomes one of those, and add the null-billing-event branch to `gs_confirm_declaration`.

### Check-in was fabricating payment declarations from a button tap (found + fixed 2026-08-06)
`hasMemberPaymentIntent` was `!!payEventId && (paymentAttempted || !!upiRef)`. Tapping **"Open UPI app"** set `paymentAttempted`, and that alone counted as intent to pay — while **"Skip for now — continue to check-in"** set `paymentStepDone` without ever clearing it. So leaving for the UPI app and then skipping, or simply returning empty-handed, recorded a declaration for money that never moved.

**Live damage**: **29 of the first 33 declarations carry no UPI reference at all** — 19 rejected by the chair by hand, 4 still pending, **6 confirmed (₹12,000)**. Only 4 declarations in total have a reference.

**Fix**: intent is now a reference actually being entered. `paymentAttempted` still drives the come-back nudge but no longer fabricates a payment. Added a "Did you pay?" gate on continuing after leaving for the UPI app with nothing entered — *No* clears the attempt, attendance still records.

**Also found, not yet fixed — same-day duplicate declarations.** Migration 052 added partial unique indexes, but they are scoped to `status = 'pending'`, so once a declaration is confirmed or rejected nothing stops another for the same due; and `ON CONFLICT DO NOTHING` discards the second **silently**, so the member believes it recorded. Live: Bharat Kumar Mangipudi has two with the *identical* reference `074747724582` (chair caught it); **Dr Srinivas Medepalli has two both CONFIRMED at ₹1,500 on 25 Jul** — possibly ₹1,500 credited twice. Treasurer has been asked to confirm. Owner wants an alert telling the member to speak to the chair, keyed on same member + same billing event in **any** status, plus a louder warning on a duplicate UPI reference (the only definitive proof).

### OPEN — BBB meeting-fee structure: contracts hold net ₹18,000, circular says list ₹19,500 (raised 2026-08-04 — SUPERSEDED, see the DONE box above)
BBB's *Meeting Fee Information FY 2026-27* circular prices **26 meetings at ₹750 each = ₹19,500 list**, with a discount that normalises every payment frequency to **₹18,000 net**:

| Frequency | Actual | Discount | Payable | ×periods = net/yr |
|---|---|---|---|---|
| Monthly (2 meetings) | ₹1,500 | ₹0 | ₹1,500 | ×12 = 18,000 |
| Quarterly | ₹4,875 | ₹375 | ₹4,500 | ×4 = 18,000 |
| Half-yearly | ₹9,750 | ₹750 | ₹9,000 | ×2 = 18,000 |
| Yearly | ₹19,500 | ₹1,500 | ₹18,000 | = 18,000 |

**Current live state**: all 48 active Saturday contracts carry `total_value = grand_total = 18,000` with `discount_type`, `discount_value`, `discount_total` all **NULL** — the net is booked as if it were the list price, so the ₹19,500 gross and the ₹1,500 concession are invisible in the system. (One further contract sits at ₹12,000 / quantity 17 — a mid-year joiner.) Billing events already spread correctly: 18 contracts × 12 × ₹1,500 monthly, 31 contracts × 4 × ₹4,500 quarterly. **Cash collected is correct; only the gross/discount representation is missing.**

**Second discrepancy, same circular**: it states **26 meetings**, but `t_group_session_schedule` holds **25** occurrences (11 Apr 2026 → 20 Mar 2027) and contract `quantity` is likewise 25. The arithmetic points at 26 being right — 19,500 ÷ 26 = **₹750 exactly**, whereas 18,000 ÷ 25 = ₹720 and 19,500 ÷ 25 = ₹780. The schedule also contains one irregular **21-day gap** (23 May → 13 Jun 2026) where every other interval is 14 days, which both loses a meeting and shifts the fortnightly phase by a week.
**When to revisit**: (a) is **done** — contracts were restated to ₹19,500 gross with plan discounts (see the DONE box above). (b) and (c) remain open: whether the missing 26th meeting is added to the schedule (and if so, where — 4 Apr 2026 at the start, or closing the 23 May → 13 Jun gap), and whether contract `quantity` moves 25 → 26. Note any schedule change ripples into the notification cohorts and the "missed the last two" absentee logic.

---

### HANDOVER — standalone Create Invoice page: design settled, six architecture gaps found, nothing built yet (2026-08-09)

Two things converged this session: (1) a design-playground exploration of a standalone, contact-first "Create Invoice" page, and (2) a finding that the adhoc-invoice batch referenced below (`MANUAL_COPY_FILES/adhoc-invoice-no-contract/`) is **still entirely unmerged** — only its SQL was ever applied live; the API/UI pieces don't exist outside the staging folder. Next session should read this box in full before writing any code.

**1. Design playground** — `MANUAL_COPY_FILES/../scratchpad` artifact (session-local file `invoice-composer-playground.html`, published as a Claude Artifact, URL not durable across sessions — re-publish from the saved HTML if needed, or rebuild from the description below). Settled decisions, in order:
- Reuse the real invoice-VIEW page's chrome for the CREATE page, not the Contract Wizard's chrome (block-library side-rail was explicitly rejected — a single ad-hoc invoice is 1–3 lines, a persistent catalog browser is heavier than the job needs).
- Adding a line is **inline in the items table**, not a side panel: a "+ Add line" row that becomes a typeahead — type and matching catalog items drop down grouped by category (colored icon + price, same as picking a block card), values (rate/tax) prefill but stay editable, exactly like FlyBy already behaves in the contract wizard. A "Browse catalog" button next to the typeahead opens a modal with the full category-accordion picker for when the user wants to browse instead of type. Confirmed by the user (2026-08-09).
- Bill To / contact-picker card stays in the right-hand sidecard slot (mirroring the real page's "Invoice Details" card position) — user explicitly confirmed **not** to move it into the document's own header row.
- **Outstanding, not yet fixed in the artifact**: the last round of feedback ("you have removed the headers of invoice / user selection") flagged that the v2 rebuild dropped the real page's own branded document header — business logo/name/address block, "INVOICE" title, Invoice #/Date Issued/Due Date meta row, and the "Invoice To"/"Bill To" two-column strip below the divider (all visible in the real `/contracts/:id/invoice/:invoiceId` page, confirmed via user screenshot of `INV-10010`). This edit was in progress (file was Read, restructure planned: move the app-level Back/title/status bar OUTSIDE the white document card onto the grey page background, put the orange accent bar + branded header + Invoice-To/Bill-To strip back INSIDE the card above the items table) when the user redirected to the architecture questions below. **The artifact as last published does not yet have this fix applied.**

**2. Architecture research (six questions, full findings in-session)** — headline correction first: **the entire `create_adhoc_invoice` feature (RPC, both migrations, `invoiceService.ts`/`invoiceController.ts`/`invoiceRoutes.ts`, `useCreateAdhocInvoice`, `AdHocInvoiceDialog.tsx`, both entry-point wirings) exists only under `MANUAL_COPY_FILES/adhoc-invoice-no-contract/`.** None of it is in the real `contractnest-ui`/`contractnest-api`/`contractnest-edge` trees — confirmed via `git log --all` (zero adhoc commits in any submodule) and a direct diff showing the real on-disk `AdHocServiceCard.tsx` button still has no `onClick`. Only the SQL was applied live to production (per that batch's own `COPY_INSTRUCTIONS.txt`, "already applied... do not re-run"); the API/UI layer was never copied in or tested. Treat every finding below as describing the *staged design*, not live behavior, until it's actually copied in.

Findings, condensed (ask for the full per-question detail if it wasn't carried into the new session's context):
- **Triggers**: invoices come from contract activation (`generate_contract_invoices()`) or the 15-min scanner cron drafting from unlinked billing events (`run_contract_event_scanner`) — nothing else, no renewal/amendment path creates new invoice rows.
- **Lists**: contract detail page has a real per-invoice list; `/ops/finance` Receivables tab is a worklist built from `events` (not the raw invoice array) plus a Payables table; `/vani/finance/receivables` (`AccountsReceivablePage.tsx`) is **100% mock data**, disconnected from any real API — don't mistake it for a second live view.
- **Receipts**: real schema (`t_invoice_receipts`), but the only UI showing them is an expandable section inside the single-invoice viewer page — no standalone receipts list anywhere. The "Receipts: 2" count in the Invoice Details sidecard is **plain text, not a link** to that section.
- **Reusability**: `create_adhoc_invoice` (staged) mirrors `record_invoice_payment`'s number-generation and receipt-insert shape almost line for line, per its own code comment — but nothing is factored into a shared helper; both are independent function bodies. `create_adhoc_invoice` added a 1000-attempt self-healing retry loop around sequence generation that `record_invoice_payment` doesn't have — a real, un-taken reuse opportunity (extract one retrying `get_next_formatted_sequence` helper both could call).
- **Collections totals**: `/ops/finance`'s "Collected this month / all-time" KPI cards read straight from `get_tenant_receivables`'s summary; the staged migration deliberately switches that CTE's join to `LEFT JOIN t_contracts` so adhoc receipts land in the total correctly.
- **AR/AP — the important gap**: no synthetic contract is created; the staged migration just drops `t_invoices.contract_id NOT NULL` and adds a `contact_id` column + a check constraint. But an adhoc invoice's money, while correctly counted in the tenant-wide totals, is **invisible everywhere else on `/ops/finance`** — the Receivables worklist is built from `events`, and adhoc invoices generate no billing event, so they can never appear as a row; the raw invoice array does carry a staged `is_adhoc` flag but the frontend never renders it or uses that array for display, only for filtering drafts. The **only** place an adhoc invoice becomes individually visible today (even in the staged design) is the Contacts → Financials cockpit for that one contact. And since the existing invoice viewer is hard-routed to `/contracts/:id/invoice/:invoiceId`, **a contact-less invoice has no page of its own to be viewed on at all**.

**Current state**: nothing built yet on top of these findings — pure research + design exploration, both paused for a fresh session per user request.
**When to revisit**: next session, before writing code, resolve: (a) finish the playground fix (restore the document's own branded header + Invoice-To/Bill-To strip inside the card, app chrome outside it); (b) decide whether the new standalone page becomes the **view** destination for adhoc invoices too (not just create), since none exists today; (c) decide whether `/ops/finance` needs a real row/marker for adhoc invoices so the money in its totals is traceable, or whether the Contact Cockpit is deemed sufficient; (d) decide modal-vs-full-page for the two existing staged entry points (Group Sessions guest-fee "Invoice" button, Contacts "Create Adhoc Service" card) — keep the fast modal for those two contexts and add the new page as the general-purpose entry, or retire the modal and route everything through the new page for one uniform pattern (leaning toward keeping both, per the assistant's earlier note, but not yet decided by the user); (e) worth folding in while touching this code: extract the shared retrying sequence-number helper noted above, and make the sidecard's "Receipts" count clickable/scroll-to the receipts section rather than static text.

---

### FIXED 2026-08-15 — member payments at check-in had been failing since 27 Jul, silently, taking attendance with them

A member paying a due at check-in **on a meeting day** hit `23502 null value in column "session_contract_id"`, and because a PL/pgSQL function is one transaction, the exception also discarded the attendance row and the `status='held'` flip written earlier in the same call.

**Cause — a regression from migration 052**, the duplicate-declaration dedup. Adding `ON CONFLICT` rewrote the whole `gs_submit_checkin` body and, in the block-token session-day branch, changed what is written into `session_contract_id`:

| Migration | Session-day branch writes | |
|---|---|---|
| 022, 039 | `v_mc` | ✅ |
| **052 → 053** | **`v_tok.contract_id`** | ❌ NULL for every block token |

`v_tok.contract_id` is NULL for block-scoped tokens (the block lives in `source_block_id`; all three BBB tokens have `contract_id = null`) and the column is NOT NULL.

| Live meeting | Attendance | Member declarations |
|---|---|---|
| 25 Jul (pre-052) | 35 | **30** |
| 8 Aug (post-052) | 13 | **0** — the one row was a guest fee |

Zero declarations carrying a `billing_event_id` existed between 27 Jul and 15 Aug.

**⚠️ THE REAL LESSON — a full debug session on 8 Aug pronounced check-in healthy while this was live.** Reaching the broken statement needs three things at once: a **member** (not a guest), on an **actual meeting day**, who **types a UPI reference**. Miss any one and control lands on a sibling statement that still works — no meeting that day → `v_mc` ✅; guest → `gs_checkin_guest`, a *different function* ✅; legacy contract token → `v_tok.contract_id`, non-null there ✅. On 8 Aug the tests were a member paying on 7 Aug (**not** a meeting day) and a guest fee — both genuinely green, neither touching the line. And the failure conceals itself: the member sees a generic "Check-in failed", retries without a reference, succeeds — so attendance fills in normally and the only symptom is money that never arrives, which reads as *"nobody paid this week"*. Only 2 of the 13 present on 8 Aug had anything outstanding, so it stayed below notice. **Testing an adjacent branch is not testing the branch.**

**Fix (migration `074_checkin_declaration_notnull.sql`, applied live 15 Aug)** — `coalesce(v_tok.contract_id, v_mc, v_tok.source_block_id)`. Three fallbacks, not two: `v_mc` is itself NULL when the member has no *active* contract on the block (lapsed, mid-renewal, or arrived via device recognition, which does not enforce the membership check phone lookup does). The same latent NULL was hardened on the no-session branch. The declaration insert is now wrapped so **attendance can never again die with a payment** — captured into `v_pay_error` and returned to the caller, deliberately **not** a silent `WHEN others THEN NULL`, since silence is how this hid.

Verified by forcing all three conditions together (1 row, correct `session_contract_id`, attendance intact) and by forcing the payment to fail (0 rows, **attendance survives**, `occurrence_status='held'`, error surfaced) — both probes ending in RAISE so nothing persisted.

**Confirmed in the real UI** the same afternoon by the owner: Yashwanth ₹4,500 (14:52 IST) and Manjunath ₹7,500 (14:54) both checked in through the actual page and produced attendance **and** a declaration with a non-null `session_contract_id`. Both would have thrown 23502 an hour earlier.

**Still open**: `session_contract_id` is NOT NULL yet now legitimately holds a contract id *or* a block id (the guest path already did this) — a modelling wart. **Not checked**: whether the chair holds UPI receipts from 8 Aug with no matching declaration — those members may have paid with nothing recorded.

### FIXED 2026-08-15 — duplicate declarations (migration 075, closes the 2026-08-06 item)

052's partial unique index was scoped to `status='pending'`, so the instant the chair confirmed the first declaration the row **left the index** and a second for the same instalment inserted cleanly. The guard only covered the window *before* the chair acted — the least likely time for a duplicate, since members re-declare precisely because they are unsure the first registered. `ON CONFLICT DO NOTHING` also discarded blocked rows **silently**, so the page showed success.

Index widened to `status IN ('pending','confirmed')`. **`rejected` stays out deliberately** — the chair rejects so the member *can* re-submit a corrected reference. Blocked duplicates now return `payment_error='duplicate_declaration'` instead of vanishing.

**⚠️ The trap in this change**: a partial-index arbiter is inferred by matching the `ON CONFLICT` WHERE clause against the index predicate. Changing the index without changing all three clauses in the *same* transaction fails with `42P10` and breaks check-in outright. New index created first → function repointed → old index dropped.

What it was costing: money was safe (`gs_confirm_declaration`'s `v_remaining := GREATEST(amount - settled, 0)` clamp means a second confirm posts ₹0 — Medepalli's event reads `amount_settled=1500` on a ₹1,500 event, not 3,000), but the duplicate still reads CONFIRMED to the chair, makes declaration-derived totals disagree with the ledger, and since 053 would fire a **second "payment received" WhatsApp** (the message amount is the *declared* figure, not the ₹0 posted).

Verified: new → 1 row · re-declare after CONFIRM → 0 rows + reported · re-declare after REJECT → 1 row.

**Still open**: the **guest** index (`uq_payment_decl_guest_catblock_pending`) carries the identical `status='pending'` hole and was deliberately left alone — different index, different function, needs its own lockstep change. And the UI's duplicate-reference warning is still an **exact string match**, which would not have caught Bharat Mangipudi's real pair, `074747724582` vs `074747724582 - 4500`.

---

## ⚠️ Session Reminders

1. **ALWAYS initialize all submodules at session start**
2. **ALWAYS use feature-branch folders in MANUAL_COPY_FILES**
3. **ALWAYS provide COPY_INSTRUCTIONS.txt**
4. **ALWAYS specify affected submodules**
5. **NEVER place files randomly**
6. **NEVER forget to update parent repo references**
7. **NEVER provide merge commands until user confirms testing passed**
8. **NEVER start coding without explicit confirmation**
9. **NEVER refactor existing code unless explicitly asked**

---

## 📊 Session & Token Management

### Token Visibility Limitation
⚠️ **I cannot directly see remaining tokens in the claude.ai interface.**

### Workarounds for Session Management:

**Option 1: Ask me after each task**
> "How much of the conversation have we used? Should we start a new session?"

I can estimate based on:
- Number of messages exchanged
- Size of code files generated
- Complexity of the conversation

**Option 2: Watch for these warning signs**
- My responses start getting truncated
- I begin forgetting earlier context
- I ask about things we already discussed

**Option 3: Proactive session breaks**
After completing 3-4 major tasks, consider starting a fresh session to ensure full context capacity.

**Recommended Prompt at Task End:**
> "Task complete. Give me a session health check - should we continue or start fresh?"

I'll respond with my assessment based on conversation length and complexity.

---

## 📞 Quick Commands Reference

```bash
# Check all submodule status
git submodule status

# See what's changed in all submodules
git submodule foreach 'git status'

# Pull latest in all submodules
git submodule foreach 'git pull origin $(git rev-parse --abbrev-ref HEAD)'

# Check current branch in each submodule
git submodule foreach 'echo "$(basename $(pwd)): $(git branch --show-current)"'
```

---

**Last Updated**: January 2025
**Maintained By**: Charan Kamal Bommakanti - Vikuna Technologies
