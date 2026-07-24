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
├── FamilyKnows/               # Separate Product (Expo + React Website) - branch: main
│   ├── app/                   # Expo mobile app
│   └── website/               # React/TypeScript website
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

# Verify ALL 6 submodules are present and accessible
ls -la contractnest-api/
ls -la contractnest-ui/
ls -la contractnest-edge/
ls -la ClaudeDocumentation/
ls -la ContractNest-Mobile/
ls -la FamilyKnows/

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
 [commit-hash] FamilyKnows (heads/main)
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
| `FamilyKnows` | Separate SaaS Product | `main` | Expo (app/) + React (website/) |

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
    ├── FamilyKnows/
    │   ├── app/
    │   │   └── [Expo app files]
    │   └── website/
    │       └── [React website files]
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

STEP 4: Commit FamilyKnows Changes (if applicable)
─────────────────────────────────
cd FamilyKnows
git status
git add .
git commit -m "feat: [descriptive message]"
git push origin main
cd ..

STEP 5: Commit Mobile Changes (if applicable)
─────────────────────────────────
cd ContractNest-Mobile
git status
git add .
git commit -m "feat: [descriptive message]"
git push origin main
cd ..

STEP 6: Commit Documentation Changes (if applicable)
─────────────────────────────────
cd ClaudeDocumentation
git status
git add .
git commit -m "docs: [descriptive message]"
git push origin master
cd ..

STEP 7: Update Parent Repo Submodule References
─────────────────────────────────
cd "D:\projects\core projects\ContractNest\contractnest-combined"
git add contractnest-ui contractnest-api contractnest-edge ClaudeDocumentation ContractNest-Mobile FamilyKnows
git commit -m "chore: update submodules - [feature description]"
git push origin master

STEP 8: Verify Clean State
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

cd FamilyKnows
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

# Push FamilyKnows
cd FamilyKnows
git checkout main
git pull origin main
git add .
git commit -m "Update FamilyKnows" --allow-empty
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
