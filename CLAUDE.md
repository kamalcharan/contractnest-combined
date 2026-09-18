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

## 📐 Specs that govern new work

- **`specs/OPS-JTD-TOOLS-SPEC.md`** — Operations on JTD: the tools-with-actors framework, the collections ladder (item 1), the cockpit (Needs you / What happened / Coming up), the VaNi integration contract and the per-lane extension pattern. **Any agent or human building Operations, VaNi actions, collections/reminders, or anything that touches `n_jtd` must read it first and build to it.** Owner decisions are recorded there; update the spec when a decision changes, not just the code.

## 🔮 Future Review Items

### IN PROGRESS — VaNi enablement is a tenant-table truth; step 1 live (2026-09-16, batch `vani-tenant-flag`)
Owner model: **automation runs only when VaNi is on; VaNi is part of subscriptions.** Before this there were three half-built VaNi switches, none read by any engine: `t_tenant_context.addon_vani_ai` (plan flag, false for all 25 tenants), the `product_code='vani'` row in `t_bm_tenant_subscription` written by the landing-page trial (zero rows ever), and `n_jtd_tenant_config.vani_enabled` (read only by an admin stats page; BBB false while receiving ~260 automated messages/30d). The API's `vaniEntitlementService` decides entitlement from env `VANI_ENTITLEMENT_MODE`, default `open` = everyone entitled — production is in `open` mode (BBB edited rules on 3 Sep with no subscription). The scanner, group-session cron, `fn_enqueue_*` and the jtd-worker never ask.

**Step 1 (live, migration `vani-agent/003_tenant_vani_enabled.sql`)**: `t_tenants.vani_enabled / vani_enabled_until / vani_enabled_source`; **`vani_is_enabled(tenant_id)` is THE truth** (admin tenant always true — computed from `is_admin`, cannot lapse; else the column, expiry evaluated at read time so no cron); `get_tenant_context` emits `flags.vani_enabled` + `vani {enabled, until, source}`; `start_vani_trial` is the first writer (on until `trial_ends`, never downgrades open-ended). Data: **BBB and signia ON** (source `admin`), vikuna ON by computation, bbb2025 (test) OFF. API/UI tenant-context types updated (staged). **Nothing is gated yet** — zero behaviour change.

**Step 2 (staged, batch `vani-automation-rules`; migration `vani-agent/004` live)**: `/settings/configure/automation-rules` rewritten — tacit status line from `flags.vani_enabled` (on → green line + "VaNi →"; off → card + "Open VaNi" → `/vani/landing`; no toggle, rules editable either way), real field kinds (number / integer-array chip editor / read-only string), and **the collections ladder now lives in `t_vani_rules` under `payment_reminder`** — `lead_days` (before-due email, unchanged, still what the scanner reads) + `email_days_after_due` / `whatsapp_days_after_due` / `call_days_after_due` (defaults `[0,3,7]` / `[7]` / `[14]`, bounded 0–365, ≤12 entries; presets 0/3/7 · Monthly · None are UI sugar). Zero RPC change — `update_vani_rule` already validated integer arrays, `vani_rule_int_array()` reads them. Fixed on the way: template constraints spelled `minLength/maxLength` while the RPC checks `min_items/max_items` (array bounds had never been enforced); array fields rendered as "21" and could not be saved; group-session rule text/defaults now say what the engine really does (3d+1d, absentee 3d, no-show +2h) and that only the on/off switch is honoured — `gs_run_session_notifications` still does not read them. Rows that were verbatim old defaults were collapsed to `{}` so they don't read "customized". **Owner decisions taken without explicit answer (flagged in the batch)**: ladder folded into the existing card; three per-channel arrays; group-session copy corrected.

**Steps 3+4 (staged, batch `vani-landing-tenant-flag`)**: `/vani/landing` badge + CTAs and `/vani/briefing`'s gate read `flags.vani_enabled`; `vaniEntitlementService` rewritten to read `vani_is_enabled()` (+ tenant detail + the `vani` subscription row for trial copy only), 60s cache cleared on trial start, failures fail closed and are not cached; **`VANI_ENTITLEMENT_MODE` is gone**. ⚠️ **Deploying this API is the business-model switch**: production was `open` (everyone entitled); afterwards only flagged tenants (BBB, signia, vikuna today) get the Briefing and the **LLM composer** (`/api/vani/composer/*` sits behind the same `isEntitled`, and the contracts hub / create-contract / catalog-templates entry points hide on `entitled:false`). Automation engines still ungated. Trial start now invalidates both the entitlement cache and the tenant-context cache (API) and both React Query keys (UI). `useVaniDeskQueries.ts` and `vaniDeskService.ts` are **supersets** shared by batches 2 and 3 (identical copies in both) so copy order does not matter. **DEFERRED by owner (2026-09-16, "plan integration can do later")**: the plan-entitlement writers (`fn_apply_contract_entitlements`, `subscribe_tenant_to_plan_v2`, `fn_apply_topup_grants`) do **not** yet set `t_tenants.vani_enabled` when a plan grants `addon_vani_ai` — a paid VaNi add-on today switches on `t_tenant_context.addon_vani_ai` only, which nothing reads for enablement. Until this is stitched, enable such tenants by hand (`vani_enabled=true, source='admin'`). One extra `UPDATE t_tenants` line in each of the three functions, next to where they set `addon_vani_ai`. **Remaining stitches**: plan writers (deferred, above); engines: `vani_rule_enabled() AND vani_is_enabled()`, group-session cron check, jtd-worker blocks **system-originated** jobs only (human-invoked tools keep working); retire `n_jtd_tenant_config.vani_enabled`. Ten tenants receive automation today with no subscription (BBB, signia, Hygene Services, Trinity Tecnitions, Freedom Services, Value Elevators, hubb, flow1, stw, vikuna) — before the engine stitch, decide who else gets the flag or their reminders stop. Spec: `specs/OPS-JTD-TOOLS-SPEC.md` §7.

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

### RESOLVED 2026-09-16 (root cause proven with real ₹1 payments) — GPay refuses a `upi://` *intent* to a merchant VPA but pays the identical payload as a *QR*; check-in now shows a per-member QR (batch `checkin-upi-qr-flow`)

Read this box first; the section below it is the long trail that led here and is kept for the record. **The payload was correct once `orgid/mc` were added** (the earlier merchant-fields fix). What was — and always had been — failing is the **delivery mechanism**: `SessionCheckinPage.tsx` did `window.location.href = 'upi://…'`, i.e. handed GPay an **intent**, and for BBB's merchant-registered VPA (`9849502193@kbl`, mc 4722) GPay opens, shows the amount, then refuses at payment. The **same bytes read by GPay's own scanner as a QR pay fine.** Isolated live, same phone/account/minute: physical bank sticker inside GPay → ₹1 paid; same sticker via a QR-reader app → link → GPay → fails; our exact generated payload (amount + `CN…` reference + orgid/mc) rendered as a QR and scanned inside GPay → **₹1 paid**; same payload as our tap link → fails. Two months of "Payments to this receiver are not allowed by UPI network" were this, not the payload.

Two things ruled out along the way, so nobody re-chases them: `encodeURIComponent` turning `@` into `%40` in `pa` (no effect either way), and a supposed signed-QR / truncated-sticker theory (dead — the plain payload pays when scanned).

**Personal VPAs are different.** The intent path *does* work for `kamalcharan@okicici` (GPay accepted the link); GPay then applied its own **₹1,000-per-transaction cap** for that payee type — the payer app's rule, not ours, but relevant to any future tenant collecting >₹1,000 instalments on a personal VPA. Whether that cap also applies to the QR path for personal VPAs was not tested.

**Fix (`MANUAL_COPY_FILES/checkin-upi-qr-flow/`, UI only, staged — not yet merged)**: in `renderPayBlock`, when the payment config carries merchant fields (`org_id` AND `mcc`), the intent button and its come-back alert are not rendered; in their place one card — "Scan the chapter QR at the desk", the member's exact due large, and a line to open GPay/PhonePe/Paytm, scan the **printed** payment QR, check it shows the payee, enter the amount and pay — then "I've paid — enter my UPI reference" into the **unchanged** reference/duplicate/declaration flow (`paymentAttempted` set only by that explicit tap, per the 2026-08-06 fabricated-declaration fix). **Transaction capture is preserved** (member → amount → reference → declaration); what's lost, for this VPA only, is the one-tap amount-pre-filled launch, which never worked here. An intermediate design that rendered a per-member dynamic QR on the page (proven payable when scanned) with a "Save QR → GPay → gallery" flow was built, verified, and then **rejected by the owner as friction** — a member can't scan their own screen, and the printed desk QR is the natural gesture. The link code stays correct, so if Karnataka Bank enables intent/dynamic-QR payments on the merchant VPA (or BBB moves to a VPA that accepts intents) the button is simply re-enabled — nothing to rebuild. **Personal-VPA configs (BBB test) are byte-for-byte unchanged.** Verified: tsc error count identical to pristine main, vite build passes. No API/edge/RPC/DB change, no new dependency.

**Still open**: (a) one-tap for the merchant VPA is a *bank* conversation (enable intent on the merchant account), not code; (b) Pay-to-UPI-ID inside GPay was never tested for the merchant VPA, so the "Copy UPI ID" box is left as-is — hide it on the merchant path if it proves refused too; (c) **uploading a QR on `/settings/integrations` → Offline UPI wiped `upi_id`/`payee_name`/`org_id`/`mcc` down to just `qr_image_url` twice today (test row, then the LIVE row)** — both repaired by hand via `jsonb_set`; the v66 edge merge is deployed and correct, so the loss is upstream of it (most likely the frontend submitting only the changed field on the upload path) — **root cause not yet found; do not re-upload the live QR until it is.**

### SUPERSEDED (see RESOLVED box above) — check-in UPI pay link fails on real GPay (raised 2026-07-25, "mc=0000" fix didn't resolve it)
Member-facing check-in page (`contractnest-ui/src/pages/checkin/SessionCheckinPage.tsx` → `upiPayment.ts`'s `buildUpiPaymentIntent()`) built `upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>&tr=<ref>`. Live BBB VPA is `9849502193@kbl` (payee name on file: "U S R Travels"). Tapping "Pay now" opened GPay but the transaction was rejected with **"Payments to this receiver are not allowed by UPI network"**. Scanning that same VPA's own bank-issued QR directly worked fine.

**Root cause found**: the `mc=0000` fix from 2026-07-25 was live but had actually been quietly reverted by a later session (the deployed `upiPayment.ts` had a comment: "do not fabricate merchant category... not supplied by a PSP" — so the built link carried no `mc` at all by the time this was picked back up). The real fix needed the bank's own authoritative values, not a guess. The owner scanned the physical Karnataka Bank QR sticker with a plain QR reader (not GPay) and shared the raw decoded payload:
```
upi://pay?ver=01&orgid=159052&mode=01&pa=9849502193@kbl&pn=U%20S%20R%20TRAVELS&mc=4722&cu=INR
```
Three fields were missing from our link entirely (`ver`, `orgid`, `mode`), and the earlier `mc=0000` attempt was wrong in the opposite direction: `0000` declares "personal/P2P transfer", but this VPA is registered on the UPI network as an actual **merchant** account with a real category code — `4722` (Travel Agencies and Tour Operators, the correct ISO 18245 code for a travel agency). Declaring the wrong transaction type against a merchant-registered VPA is exactly the kind of mismatch that produces the observed network rejection.

**Fix (migration `083_checkin_payment_config_merchant_fields.sql`, applied live)**: `gs_checkin_payment_config` now additively returns `org_id`/`mcc` from the tenant's `offline_upi` integration credentials (JSONB, no schema change); BBB's live config updated with `org_id="159052"`, `mcc="4722"`. `buildUpiPaymentIntent()` only adds `ver`/`orgid`/`mode`/`mc` when both are present — BBB's separate **test**-environment config (a genuinely personal VPA, `kamalcharan@okicici`) correctly has neither and keeps building a plain P2P-style link, unaffected. Staged in `MANUAL_COPY_FILES/checkin-upi-merchant-qr/`.
**Current state**: code + DB fix is live/staged; verified the constructed URL now matches the bank's own working payload field-for-field (differing only in the legitimate per-checkin additions `tr`/`tn`/`am`, which a static printed QR can't carry). **Not yet confirmed on a real phone against real GPay** — that test is the actual proof, not the string match.
**When to revisit**: after the owner tests a real payment through the check-in page. If it still fails, the next things to check per the original analysis: whether GPay treats a browser-triggered deep link differently from a camera-scanned QR regardless of payload (a known real-world Android/GPay inconsistency), and the exact hosting context the link opens from (in-app browser vs. default browser).

**Generalized to all tenants, same day**: the above was a one-off manual patch for BBB's specific values. Owner asked "will it work for all tenants?" — no, and there was no self-service way for another tenant with a merchant VPA to configure this themselves. `/settings/integrations` turned out to be fully schema-driven (Offline UPI's fields come from a `config_schema` on the provider row, not hardcoded React), and its existing `qr_image_url` upload field was already there for exactly this purpose but only ever *displayed* the uploaded QR, never decoded it. Now the upload also decodes the image server-side (new `jimp`+`jsqr` dependencies in `contractnest-api`, both pure-JS) and silently carries `org_id`/`mcc` into the same credentials being saved, with zero new visible field and zero jargon — any tenant with a merchant VPA self-configures correctly just by uploading the QR they already have.

**Second bug found while tracing this — also fixed, deployed live (`integrations` edge function, version 66)**: the edge function's save path did a **full replace** of the credentials JSON on every save (confirmed no merge at the SQL layer either — `save_tenant_integration` does a hard `SET`). Since `org_id`/`mcc` are deliberately undeclared, invisible form fields (never loaded into the edit modal's state), any later edit to something else entirely — e.g. just changing the payee name — would have silently wiped them the next time the tenant saved anything. Fixed by fetching and merging the existing `public` credentials before writing, scoped narrowly to that plaintext, non-secret blob only. **Deliberately not touched**: the separate `encrypted` blob (API keys for Razorpay/Stripe/SendGrid/Twilio/OneSignal) has the exact same full-replace pattern and could have the same class of bug (e.g. a sensitive field left blank on an edit — the UI's own copy says "leave blank to keep existing value" — being wiped rather than preserved), but fixing that is a bigger, security-sensitive change to other tenants' live credentials for unrelated providers, out of scope for this session and flagged here for a dedicated look.
**When to revisit**: the `encrypted`-blob full-replace risk above, whenever someone is auditing the integrations save path generally.

### GST card on Money In / To Pay was invisible for no-tax tenants; /taxes had a dead "Tax settings" link (2026-09-16, staged in `MANUAL_COPY_FILES/money-in-gst-card/`)
Owner reported `/money-in` "not showing GST." The card (`components/finance/GstMonthCard.tsx`, rendered by both `pages/money-in` and `pages/to-pay`, opens `/taxes`) was there all along but returned `null` whenever `t_tax_settings.display_mode = 'no_tax'` — by design, per its own comment. BBB is `no_tax` (set 14 Aug; all 53 invoices carry ₹0 GST; no GSTIN in `t_tax_info`; CGST/SGST 9% rates exist but neither is default), and `get_tenant_tax_summary_v2` returns cleanly, so nothing was broken — it was hidden. Owner decision: show it anyway, marked **"GST · Tax not configured"** (muted, body "Tax Settings are set to 'No tax'. Set up GST to start tracking it here.", action "Tax settings →" to `/settings/tax-settings`), so users aren't left wondering. Loading/error still render nothing. Found in the same pass: `pages/taxes/index.tsx`'s "Tax settings" button navigated to `/tax-settings`, which is not a route (the only one is `/settings/tax-settings`, nested under `/settings`) — fixed. `/taxes` itself already handled no-tax well (`TaxSummarySection` shows an explanatory message instead of a zero table). UI only, two files, no API/DB change.

### IN PROGRESS — Operations is being collapsed into ONE commitments list; final home `/ops/cockpit`, staged at `/ops/cockpit/next` (2026-09-16, batch `ops-commitments-phase1`)
A UX review of Ops Cockpit, Event Schedule and Appointments (research in-session) found all three are different windows onto the same `contract_events` table, disagreeing with each other (cockpit buckets computed client-side vs Event Schedule's `/dates` RPC; Event Schedule's Appointment column mirrors the whole board; cockpit's Action Queue re-lists Event Schedule rows), plus real debt: a 10-column table pinned at `min-w-[1300px]`, a rupee amount printed as an event count (`services/index.tsx:661-665`), raw enums via `.replace(/_/g,' ')`, a hardcoded fake "VaNi coming soon" sidebar and a permanent-empty RFQ tracker on the cockpit, a dead `/appointments` stub page, and no error states on the cockpit at all. The contract page's "raise service" flow was reviewed too: `ServiceExecutionDrawer` (1,509 lines) is a 900px drawer with three competing status-chip surfaces, a decorative upload dropzone with no handler, a modal-inside-a-drawer per Smart Form, and no completeness check or result screen — while the data model underneath already cascades form submission → `mark_event_asset_proven` → event → ticket.

**Owner's model (confirmed 2026-09-16)**: Ops = every commitment across every contract, grouped by WHEN (overdue · today · next 3 days · coming weeks · later), typed by WHAT (lanes: Services · Collections · Appointments · Sessions — **no payments lane, To Pay stays separate**), filtered by WHO (Team · Mine · Unassigned), every row **confirmed / to be confirmed**, drilling to the item (contract page, Money In, Group Sessions). A clickable playground of the whole journey (Ops → contract visit card → Visit → customer report) was built and published as a Claude Artifact (`scratchpad/ops-journey-playground.html`; URL not durable across sessions — re-publish from the file if needed). **Steady transition, billing first; frontend only; no backend unless a bug.**

**SUPERSEDED 2026-09-16 by batch `ops-collections-tools` (spec item 1 BUILT)**: the owner saw phase 1 repeat Money In and redirected — "focus on TODO, use the JTD nucleus, item by item". Live now (migration `jtd-nucleus/009`, applied as 009a/b/c): six bookkeeping columns on `n_jtd` (`dunning_step`, `next_dunning_at`, `nudge_count`, `last_nudge_at`, `dunning_paused_reason`, `promise_date`), four source types (`payment_nudge_email/whatsapp`, `payment_call_due` = open task assigned to a user, `payment_call_logged`), two global template rows pointing at the already-approved provider templates (`payment_due_email_v1`, `payment_request_v2` — the worker resolves templates by **source type + channel**, tenant then global, so a new source type needs its own row), the rung idempotency index, helpers (`jtd_ladder_rungs` from the `payment_reminder` arrays **regardless of the rule's on/off** — the switch governs automation, a human tool must always work; `jtd_rung_due_at` = 10:00 IST; `jtd_recompute_dunning`), five tools (`jtd_nudge_payment`, `jtd_log_payment_call`, `jtd_escalate_payment_call`, `jtd_pause_dunning`, `jtd_resume_dunning`, all with `p_actor_type/id/name`, legacy `t_contract_events` re-check before sending, machine-readable refusals) and the reader `jtd_collections_worklist` (never returns totals; computes rung due-ness live so never-nudged jobs surface). A nudge is an ordinary reminder row inserted `created` → existing trigger queues → existing worker sends. Guarded probe against real BBB jobs exercised every tool and refusal (see the batch's COPY_INSTRUCTIONS). API `/api/jtd/collections/*` (new router, mounted before the legacy `/api/jtd`), UI hook `useCollectionsQueries.ts`, and `Commitments.tsx` REWRITTEN on the worklist (Needs you / What happened / Coming up; Log-a-call sheet; Assign; Pause; Confirm via the existing declaration hooks). **Gotchas found**: `n_jtd` has `chk_performer` (performer type/id must be consistent — every insert sets them); tasks are inserted with status `assigned`/`completed`, never `created`, or the insert trigger would queue them as messages; `pgmq` rows roll back with the transaction so a guarded probe leaves no phantom queue messages; `fn_enqueue_invoice_notification` already existed as a per-invoice send tool (its recipient/amount/pay-line pattern was reused). Still open: Who filter (arrives with Services lane), a dedicated WhatsApp reminder template (owner, MSG91, positional), gateway short links for reminders, and the engine gate (stitch 6).

**DONE 2026-09-17 — steps 1–4 shipped together as ONE BOARD (batch `ops-cockpit-board`, supersedes `ops-cockpit-views`; migration `jtd-nucleus/010` LIVE)**. After seeing step 1 the owner redirected: "make swimlanes apply to all · give filters · list and swimlane cards must be the same code with 100% reuse (coming-up cards had no actions)". So: new reader `jtd_collections_board` = **one row per open payment job** (kind + anchor + bucket overdue/today/b1/b2/b3/parked; bands follow the horizon), filters + facet counts + per-bucket paging server-side; `components/ops/JobCard.tsx` renders every row in both views (`compact` = density only, `actionsFor(kind)` = the one place buttons come from; an early nudge on a not-yet-due payment is an off-ladder heads-up, rung 0); `components/ops/LogCallSheet.tsx`; `Commitments.tsx` rewritten on the board (VaNi chip, horizon 7/14/30/90 + custom dates, List/Lanes for everything, kind chips, channel/age/cycle/who filters, "Show 20 more" per bucket, ladder line → rung-pill tooltip). Probed live on BBB: 78 rows in 30 d (29 rung_due · 49 payment_ahead), every filter/paging/garbage case correct; API tsc 0, UI tsc 1170 = pristine, vite build passes with the route wired. Spec §5 rewritten. **Step 5 (Follow up) added to the same batch, migration `jtd-nucleus/011` LIVE**: `jtd_escalate_payment_call` gains `p_due_at` (task `scheduled_at`; `business_context.task_kind` = `follow_up` when the actor assigns themself; past dates refused `due_in_past`; **the 7-arg overload was dropped** so the call stays unambiguous), the board anchors an open call on its due date (so a follow-up sits in the right column and turns overdue), `call_task` carries `due_at`/`kind`, the feed carries `task_kind`/`due_at`; API `due_at` (date → 10:00 IST); UI "Follow up" button + date on every card that can assign a call, optional "Due by" on Assign call. Probed live, rolled back. **Step 6 added too, migration `jtd-nucleus/012` LIVE (012 + 012b)**: `jtd_contract_activity(tenant, contract, is_live, sources[], limit, offset)` = one timeline per contract unioning `t_audit_log` (service), `t_contract_event_audit` (billing) and every JTD communication/task/declaration about it (matched by `contract_id`, by the contract's payment-job ids, **or by `business_context.contract_id` — the scanner's `payment_due`/`payment_received` rows carry only that; their `source_id` is an invoice id that dangles since the 6 Aug re-issue**), ladder paused/resumed history, declarations as declared + confirmed/rejected rows; API `GET /api/jtd/collections/contracts/:id/activity`; UI `components/ops/HistoryDrawer.tsx` opened from a "History" link on every card, and `components/contracts/AuditTab.tsx` gains "Collections" + "Billing events" categories from that reader (old five categories untouched; All = union). **All six review steps are now built and staged in `ops-cockpit-board`.** **Plus (owner ask, same day, migration `jtd-nucleus/013` LIVE)**: `jtd_render_message(tenant, source_type, channel, vars)` renders our `n_jtd_templates` copy with a row's stored `template_variables` (provider formats the final bytes — preview is faithful only while our copy matches the registered template); `jtd_nudge_payment` returns `message`; activity rows carry `message`; "Show message" under every communication row in the History drawer and the Audit tab. Toast "View message" link deliberately not built (out of the asked scope). **Gotcha**: the `bands` are relative to TODAY even in custom-date mode, so a future range lands mostly in the last band — label is honest ("15–23 days") but a date-labelled band set is the obvious follow-up. Steps 5 and 6 remain as below. Original agreed order kept for the record: (1) Coming up List/Lanes switch + 30/60/90 horizon — done in `ops-cockpit-views`; (2+3) paging + filters as ONE batch on the reader; (4) VaNi chip replaces the "automation off" text (VaNi on/off is `flags.vani_enabled`; the rule on/off is separate — say "VaNi could send these N reminders, turn on Payment reminders" when VaNi is on but the rule is off) and the ladder line moves into a tooltip on the "Rung N due" pill; (5) **Follow up** = a self-assigned JTD task via the existing escalate tool (not a bookmark; distinct from an appointment, which involves the customer and a slot); (6) the contract page **Audit tab** (`AuditTab.tsx` → `/service-execution/audit` → `get_audit_log`, the service-execution audit table) becomes a timeline unioning that table + `t_contract_event_audit` + the contract's `n_jtd` rows — today it shows none of the collections/JTD activity, and for CN-1001 the tenant-wide `t_audit_logs` holds 0 rows about the contract at all (781 rows, all contact/tax/storage/onboarding). Per-card History drawer on the cockpit reads the same JTD rows.

**Phase 1 (batch `ops-commitments-phase1`, superseded, kept for the record)**: `pages/ops/cockpit/Commitments.tsx` — the future cockpit body — mounted at a **temporary** route `/ops/cockpit/next` with a **temporary** "Ops (preview)" submenu entry. Collections lane only: instalments from `useReceivables` (same `get_tenant_receivables` payload as Money In, so figures agree), overdue rows one-per-buyer, not-yet-due group-session fees aggregated per due date + cycle, other contracts one-per-instalment; declared payments from `gs_pending_declarations` (Confirm → existing `useConfirmDeclaration`; guest fees without an adhoc invoice can't be confirmed and say so) and `/api/payments/declarations` (Confirm → existing `useConfirmPaymentDeclaration`). Lane and Who toggles deliberately absent until later lanes. Existing pages untouched.
**DONE 2026-09-17 — Services lane on the SAME board (batch `ops-services-lane`, staged; migration `jtd-nucleus/014` LIVE)**. Owner: "ops we have covered only billing — we still have services / appointments right" → "signia is fine … go ahead — with schedule". Decisions taken with the owner: lanes are chips on one board (All · Collections · Services), buckets stay WHEN; **an appointment is the visit's agreed slot, not a lane** (`slot_state` confirmed / proposed / none is a filter); unassigned visits are a signal line + the Who count, never in the headline; grammar "1 payment fall due" → one verb agreeing with the whole subject. New reader **`jtd_ops_board`** (replaces `jtd_collections_board` for the API; the old function stays) adds every open service visit as a row with `lane`, visit kinds (`visit_in_progress · visit_overdue · visit_today · visit_scheduled`), `owner_id` = technician, `slot_state`, `visit {block, n/m, technician, slot, ticket}`; facets gain `lanes`, `slots`, `who.unassigned_visits` (ignores lane+kind filters). **Truth is `t_contract_events`, not the JTD mirror** — 299 open live visits had no `n_jtd` row (185/339 share ids), so the lane reads events directly and the tools mirror to `n_jtd`/`n_jtd_history` only when a job exists. Five tools wrap the existing RPCs unchanged: `jtd_assign_visit`, `jtd_schedule_visit` (proposed or agreed; `create_appointment` + `update_appointment`, which notifies the customer on accept; a proposed slot also moves the event date), `jtd_confirm_visit_slot`, `jtd_start_visit` (`create_service_ticket` with `p_start_now` or `update_service_ticket`, event `in_progress`), `jtd_complete_visit` (ticket + event + appointment completed) — each loads the event `FOR UPDATE`, refuses with a machine-readable reason, and turns a downstream `RAISE` into `downstream_refused` with the message. `jtd_contract_activity` now titles service-event audit rows "Service visit …". API `POST /api/jtd/collections/visits/:eventId/{assign,schedule,confirm-slot,start,complete}`; UI: `JobCard` gets the visit kinds + `actionsFor` (in progress → Mark done · Assign; else Start visit · Schedule · Confirm slot when proposed · Assign · Mark done) with inline panels; `Commitments.tsx` gets lane chips, visit kind groups, the slot select, the headline clauses, the signal line and the merged feed. Probed live on signia (rolled back): 69 rows / 90 d (41 visits, 28 payments, all 41 unassigned), the whole chain assign → propose → confirm → start (TKT-10003) → complete and every refusal. **Gotchas**: PL/pgSQL forbids a record variable in a multi-item `INTO` (use load + a refusal helper); `r->>'x' || …` needs parentheses; a record can't be reset with `:= NULL` (use scalars). **Same day, after the first screenshot — the FOCUS STRIP**: owner: "collections and services are mixed up into the filters — segregate; All / Collections / Services should come first, a strip like 'here is where you need to focus'; header and data change with it"; "need you" preferred over row totals because VaNi may hand tasks back as "needs intervention"; filters stay on top, not an e-commerce left rail (agreed — revisit when a third lane makes the chip rows wrap, then move lane-specific filters into a slim collapsible rail). So the strip is now the first thing on the page (three cards, "N need you" each, from the reader's new `facets.needs_by_lane` = window only, never moved by filters, applied live by anchor rewrite); the lane is a **focus** (persisted, survives "clear"), not a filter; headline, board, filters (one labelled row per lane on All, only its row on a lane, shared age/Who row underneath), VaNi chip (All + Collections only) and the feed all follow it. **Still open**: the JTD mirror gap (events without jobs get no `n_jtd_history` rows, so their tool actions show only in the event audit); Event Schedule retirement; the Sessions lane; a per-visit technician page.

**DONE 2026-09-17 — Appointments closed WITH THE CUSTOMER (batch `ops-appointments-loop`, staged; migration `jtd-nucleus/015` LIVE)**. Owner: "appointments?" → analysis found **164 appointments ever, 163 auto-cancelled by the nightly expiry cron, 0 accepted** — the scanner auto-requests six days ahead, nobody chases by hand, and the customer never had a way to answer (the kanban at `/ops/appointments` was pure manual data entry). Built: `t_appointments.slot_token` (public grant) + `asked_at/ask_count/customer_response`; tool **`jtd_ask_visit_slot(channel share|email|whatsapp)`** — one tap proposes 10:00 IST on the planned day when no timed slot exists, then `share` returns the message + `/slot/:token` link (+ phone) for **wa.me / copy from the user's own number, no registration needed**, while `email`/`whatsapp` insert a `visit_slot_request` communication row (new source type + global template rows; **provider ids NULL until the owner registers a MSG91 positional WhatsApp template and an email template — until then those buttons are hidden via `ask_channels`**); public RPCs `visit_slot_resolve/respond` behind a no-auth, no-cache `/api/visit-slot` router and the page `/slot/:token` (check-in pattern, dependency-light): Accept → `update_appointment` accepted (moves the visit, existing confirmation WhatsApp) · Suggest another time → `rescheduled` and **never self-confirms** (new board kind `slot_to_confirm`, in needs-you, Confirm slot primary) · Not needed → declined, and a change of mind re-opens a fresh appointment on the same link (declined is terminal in the state machine). `/ops/appointments` and `/appointments` redirect to `/ops/cockpit/next?focus=services`, menu entry removed, both page files deleted (`useAppointmentQueries` stays — EventCard/Event Schedule/VaNi desk import it). **Loader** (owner ask): the board now shows a pulsing bar and dims while any refetch is in flight. Probed live on signia and rolled back: share → propose → team confirm → decline → accept-after-decline, refusals, exactly one active appointment left. **Design choices taken without an explicit answer**: Share-first because every send channel needs provider registration; counter-proposals always wait for the team; the auto-proposed slot is normalised to 10:00 IST because event rows carry their creation clock time (a first probe proposed "09:27 PM"). **Still open**: template registration (owner); the seven-day expiry cron is now redundant once the loop is used but left in place; a `visit_slot` ladder (ask → remind → escalate) on Automation Rules behind the VaNi gate, exactly like payment reminders; Event Schedule retirement.

**DONE 2026-09-17 — the swap (batch `ops-cockpit-swap`, staged, UI only)**. Owner: "swap to original OPS and then hide menu — VaNi (old)". `/ops/cockpit` (the post-login landing for everyone, lite flavours included) now renders the board for the **revenue** perspective through a 20-line picker `pages/ops/cockpit/Home.tsx`; the **expense** perspective keeps the original cockpit (`index.tsx`: awaiting acceptance, RFQ tracker) because the board is revenue-only by owner decision — my recommendation, accepted; when To Pay covers the expense side, `Home.tsx` collapses to one line and `index.tsx` is deleted. `/ops/cockpit/next` redirects to `/ops/cockpit`, the "Ops (preview)" menu entry is gone, the appointment redirects point at `/ops/cockpit?focus=services`. The **VaNi (old)** menu block is commented out again (un-hidden 16 Sep for the spec review; routes/pages untouched for the later cleanup pass). The two lite "Appointments" grow entries were removed (dead route). Event Schedule deliberately NOT retired — the owner named two things.

**DONE 2026-09-17 — Event Schedule became the COMMITMENTS REGISTER (batch `commitments-register`, staged; migration `jtd-nucleus/016` LIVE)**. Owner model settled in this exchange: **Ops = what needs you now (open commitments, never a raw status — the bucket says when, the pill says the state, the buttons say what you can do); the Register = everything that was and is committed (the record)**. Owner rejected "Events" (reads as a table), "Cadence" (already means the group-session rhythm), and "in/out" (that is the perspective) → **"Commitments Register"**. Status facts established (live): contract events are `service` and `billing` (a `spare_part` type is configured for all 194 tenants and has never had a row); the service machine is **hard-coded in `update_contract_event`** (scheduled/due → in_progress/cancelled; in_progress → completed/cancelled/overdue; overdue → in_progress/completed/cancelled) while the tenant config also lists `assigned`, `on_hold`, `reopened` — **dead: the RPC refuses them** (Event Schedule offered them anyway); billing transitions are config-driven per tenant (`m_event_status_transitions`, identical for all 194) and `paid`/`partial_payment` are set only by the payment RPCs. The board's "open" sets are hard-coded and match Finance/check-in by construction; parameterise via an `is_open` flag on the status config only when a tenant needs a custom status. Built: **`jtd_activity(tenant, is_live, filters)`** = the contract timeline made tenant-wide, grouped `appointments · followups · calls · reminders · visits · payments · other`, filters from/to (IST days, default last 30), groups, who (actor or assignee), q, contract_id, paging; counts ignore the group filter; returns `team`. `GET /api/jtd/collections/activity`. New page `pages/ops/register/index.tsx` at the **same route `/ops/services`** (lite menus + Briefing link hold): Events tab (the old table in the board's idiom, seven columns, closed shown by default, dead statuses removed, Who, status pill = the register's one action, read-only Slot column → board `?focus=services&q=<contract>`; Book button gone) + Activity tab (History-drawer rows reused, group chips with counts, Who, dates, search, message toggle). Menu labels renamed; `pages/operations/services/index.tsx` deleted. Probed live: signia 90 d = 306 rows (160 visits · 89 appointments · 57 payments), BBB 30 d = 77. **Owner's "Ops setup" question answered, not built**: a per-tenant defaults page (default focus, horizon, view, lanes, what counts as needs-you, working hours) fits MVP because the reader already takes them as parameters; statuses/kind precedence must stay product-owned; build when a second tenant asks.

**DONE 2026-09-17 — a Collections row is A PAYMENT DUE in any shape; invoices reused, register lanes completed (batch `collections-invoice-aware`, staged; migration `jtd-nucleus/017` LIVE)**. Owner: "collection might not be an installment — it might be an installment under an invoice or the whole invoice completely"; "billing lanes → show invoice number and ability to view invoice … follow-up / appointments are not factored"; "everything is not a visit — service is a service"; "we already have /invoices functionality — reuse". Measured live: 58 invoices cover several instalments, 74 are one instalment, 800 billing events have no invoice yet (all already on the board via payment jobs) — but an invoice with **no billing schedule under it** never reached Ops or the register (both read events/jobs, never `t_invoices`) while Money In showed it: eight live invoices, ₹13.6 L (renown-wspace ₹6.3 L, stw ₹4.42 L, signia ₹2.67 L ×4, vikuna ₹18 k), six with no payment job at all. (An earlier count of 79 included paid/cancelled/test rows — BBB's partially-paid invoices sit over real schedules and were never affected.) Built: `jtd_ops_board` unions **invoice rows** by Money In's own rule (`get_tenant_receivables`' `ev` union: open receivable invoice, balance > 0, contract with no live billing event; skipped when an open payment job points at the invoice) — kinds `invoice_overdue` (needs you) / `invoice_ahead`, anchored on the due date, amount = balance, no ladder; their tools are the **existing** per-invoice send (`POST /api/invoices/:id/send` → `fn_enqueue_invoice_notification`, source type `payment_request`, which had never fired live) and View invoice (the `/invoices/:id` viewer is contract-optional, so one viewer serves both routes); `nudge_count`/`last_*` on those rows count the sends; the feed shows `payment_request`. Every collections card that carries an invoice shows its number next to History/Open and the number opens the document. New reader **`jtd_tasks`** = every call task open or closed (follow_up vs escalation, due, assignee, the payment, how it closed) for the register's Follow-ups lane; `GET /api/jtd/collections/tasks`. Register lanes are now **All · Collections · Services · Appointments · Follow-ups**: instalment rows carry the invoice number from the receivables payload (no new backend), OPEN whole-invoice dues appear as rows, Appointments reads `get_appointments_list` as a record, Follow-ups reads `jtd_tasks`; Activity chips stay visible at zero (a missing chip had read as "no appointments") with a 90-day default; "Custom Cycle 1/13 1/13" fixed. **Vocabulary**: "service" replaces "visit" in every label (kinds keep their `visit_*` names in code). **Deliberate limits**: paid whole invoices are documents and live in `/invoices`, not the register; a whole-invoice row gets no ladder until a payment job exists for it (the scanner creates jobs from billing events only) — if the owner wants VaNi to chase these, mirror them into `n_jtd` next. Applied via the anchor-rewrite technique with post-check RAISE; the staged 014 text was patched to match live. Probed live on signia (4 rows, filters, search) and BBB (unchanged 78) and rolled back before applying.

**DONE 2026-09-17 — the "Operations" menu group is gone (batch `ops-menu-flatten`, staged, UI only)**. Owner: "remove menu 'Operations' and make all 'submenus' as main menus". `industryMenus.ts` now lists Ops Cockpit · Commitments Register · Group Sessions · Contacts · Equipment Registry · Facility Registry as main entries in the same place and order (between Getting Started and Contracts); ids unchanged, hidden entries kept as comments, lite flavours and industry overrides untouched, `Sidebar.tsx` keyed on nothing group-specific.

**Plan**: 2 Sessions lane → ~~3 Services lane (+ Who, Assign)~~ done above → ~~retire Event Schedule~~ became the Commitments Register (above) → ~~4 Appointments~~ done above (the chase *ladder* remains) → ~~5 swap~~ done above (expense side still on the old cockpit) → then `/ops/cockpit` to render `Commitments`, delete `/next` + the preview entry → then the contract visit card + Visit screen (replacing `ServiceExecutionDrawer`) as its own batch. A public technician page (`/visit/:token`, check-in pattern) is the natural step after that and needs a new token grant.

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

### FIXED 2026-09-16 — contact duplicate detection was entirely non-functional; merge action deferred as its own future item

Raised by the owner asking about "merge duplicates" for `/contacts`. Investigating turned up three independent, unrelated bugs stacked on the same feature, all found by direct live-data tracing and fixed live (migrations `079`–`082`, `bbb-foundation`):

1. **The whole feature was silently dead.** `t_contacts.potential_duplicate` — what the stats count and the "Possible duplicates" filter both depended on — was `0` of 460 populated. The function meant to compute it, `update_duplicate_flags()`, is called from nowhere in the app or a cron. `079` replaces it with a **live** computation at query time (`get_tenant_duplicate_contact_ids()` — mobile normalized to last-10-digits per the 076 convention, or email; scoped per tenant + environment; excludes archived and child contacts). `080`/`081` wire the list RPC and `get_contact_stats` to it — both had accepted `p_show_duplicates`/read the dead column without the fix ever landing.
2. **Frontend list cache masked the fix once shipped.** `generateCacheKey()` in `contractnest-ui/src/hooks/useContacts.ts` never included `show_duplicates`, `tags`, or `user_status` in its key, so toggling any of them replayed a stale cached response instead of re-querying. Fixed by adding all three to the key — this was silently also affecting tag-chip and "App user" filtering.
3. **Create-time duplicate check was unconditionally broken server-side.** `check_contact_duplicates` (4-arg) threw `column "tenant_id" does not exist` on *every* call, even with a valid tenant passed explicitly — a dead `COALESCE` fallback referenced `t_user_profiles.tenant_id`, a column that table has never had; Postgres validates column references at parse time regardless of whether the branch would run. The RPC's own exception handler swallowed the error into `{success:false}`, read by the caller as "no duplicates." `082` removes the dead branch and drops a stale 3-arg overload of the same function with **zero tenant filtering** (a real cross-tenant leak risk, zero live callers, same "stale overload beside the current one" pattern as 076's guest dedupe fix). Separately, `QuickAddContactDrawer.tsx` also read the result as `has_duplicates` (snake_case) when the API returns `hasDuplicates` — both bugs had to be fixed together before the create-time warning could ever fire; the full `/contacts/create` page was never affected (reads `.hasDuplicates` correctly).

Verified end to end with a real duplicate live-created by the owner ("mr cherry", `+919885164233`, matching two existing contacts) — filter now shows exactly the true set, create-time warning now fires.

**Current state**: detection (list filter, stats count, create/edit-time warning) is live and correct. **The actual merge action does not exist yet** — explicitly scoped as a separate follow-up, not built this session. Design agreed with the owner: a `merge_contacts(survivor_id, loser_id)` RPC repointing every table that can reference a contact (mapped live against the schema: `t_contracts.buyer_id`/`seller_id`, `t_invoices.contact_id`, `t_contract_access.accessor_contact_id`, `t_checkin_devices.contact_id`/`last_member_id`, `t_session_attendance.member_contact_id`/`referred_by_contact_id`, `t_session_payment_declarations.member_contact_id`, `t_client_asset_registry`/`t_tenant_asset_registry.owner_contact_id`, `t_contacts.parent_contact_id`/`parent_contact_ids`, `n_jtd.recipient_id`) to the chosen survivor, unioning channels/tags/addresses, and **archiving** the loser — never deleting, consistent with every other detach/remove pattern in this product — with a preview step before commit and a small audit-log table. UI placement agreed: inline on `/contacts` under the existing "Possible duplicates" filter, reusing the bulk-select already built (a "Merge" action appearing when exactly two are selected), not a separate dedicated page.

**Also flagged, not fixed (out of scope this session)**: `pages/contacts/index.tsx`'s bulk **"Delete"** button (visible in the same selection toolbar as the duplicates filter) is a pure UI stub — `handleBulkDelete` shows a success toast without ever calling a delete API. Clicking it does nothing to the database. Unrelated to merging; flagged so it isn't mistaken for either a working bulk-delete or the not-yet-built merge action.

**When to revisit**: whenever the merge action itself is picked up — the design above plus the full schema audit is ready to build from; no further research needed first.

### DONE 2026-09-17 — first signia → buyer-tenant contract (CN-1010) verified end to end; four defects found and fixed on the way (batches `wizard-company-recipient`, `claim-forward-verification`, `contacts-type-and-links`, `jtd-jobs-from-legacy-events`)
Owner created tenant `buyer` (buyer@b.com, persona buyer) and sent CN-1010 from signia to it. Cross-tenant model as built: seller sends → buyer accepts on `/contract-review?cnak&secret` → buyer **claims** (`/contracts/claim`, `claim_contract_by_cnak`) → `buyer_tenant_id` set, grant `accessor_tenant_id/claimed_at`, a vendor contact for the seller created in the buyer tenant, list flips the perspective. Verified live: accepted 15:16:59, claimed 15:17:40, vendor contact "signia" in the buyer tenant, 1 billing + 7 service events, INV-10053. Found and fixed:
1. **Wizard blocked a corporate buyer with no contact person** at Delivery ("selected contact person is missing"); owner: the company's own mobile/email are enough, alert belongs in Agreement. UI only (`BuyerSelectionStep` auto-selects the company contact when there are no persons; Agreement caption says so; Delivery requires a person to exist only if one was CHOSEN). Staged.
2. **`/api/contracts/claim` dropped `secret` and `mobile`** in the controller, so every manual claim since CNAK-lite v2 failed `VERIFICATION_REQUIRED`. One-line API fix. Staged. (Claims also force environment `live` in the service — a Test contract can't be claimed via the API; noted, not changed.)
3. **Every V1 activation left ZERO n_jtd jobs** (public accept, payment auto-activation, anything not going through `update_contract_status_v2`), and both cutover mirrors are UPDATE-only — so the Ops board's Collections lane (payment jobs) could not see them while Money In (events) could: 68 contracts / 955 events / ~₹1.04 crore across 9 tenants. **Migration `jtd-nucleus/018` LIVE**: `jtd_mirror_jobs_from_events` (id-preserving, cutover/001 mapping, refuses contracts holding non-twin jobs), called from the V1 activation trigger, backfill verified per contract. Gap is 0.
4. **The seller was never told the buyer accepted**: `respond_to_contract` queued a bare pgmq message with no `jtd_id` (the worker logs `invalid input syntax for type uuid: "undefined"` and drops it). **Migration `jtd-nucleus/019` LIVE**: `jtd_notify_contract_accepted` (recipient business_email → creator profile email → default user; template only with a provider id) replaces the bare send. **OWNER ACTION**: register the MSG91 email template (variables `seller_name, buyer_name, contract_title, contract_number, contract_value, accepted_on, contract_link`) and set `provider_template_id` on the global `contract_accepted_email` row — until then the helper skips with `no_provider_template` and nothing is sent. The existing `contract_signoff` pair is the acceptance *request* to the buyer, a different message.
Also: contacts list now says Company / Individual and "Linked to <company>" (migration `bbb-foundation/084` adds `parent_links` to the list RPC). **Open**: `https://contractnest.com/contract-review?…` returned "contract not found" / would not open while the same link worked on localhost — the database saw NO request from production (no edge-function call, no RPC) so the deployed API or UI is stale relative to the repo; the production API also lacks fix 2. Confirm with the Network-tab response of `/api/contracts/public/validate`. Buyer-side "Contact link missing" / "Provider details in contract" was `get_contracts_list` emitting no seller fields — **migration `contracts/079` LIVE** adds `seller_company/seller_name/seller_contact_id` to flat rows (batch `buyer-side-seller-fields`); the vikuna plan row still had no contact because a plan subscription never created a vendor contact / claimed the grant — **FIXED, migration `contracts/081` LIVE (batch `plan-contracts-vendor-link`)**: `fn_link_platform_contract_to_subscriber(contract)` gives the subscriber a vendor contact for the platform (source `platform_subscription`, `source_cnak`, the shape claim creates), sets `buyer_tenant_id`, and marks the grant accepted + claimed (subscribing is the acceptance; payment on a priced plan stays the invoice's gate, and such a plan no longer shows as "To accept" on the expense board); called from `subscribe_tenant_to_plan`, its unused v2 and `purchase_topup_template`; back-filled 37/37 platform contracts, 26 vendor contacts across 26 tenants. **Review link from WhatsApp opened a 404**: the registered MSG91 button URL is `contract-review{{1}}` with no `?`, while the edge sent `cnak=…&secret=…` as the suffix — batch `review-link-already-responded`: suffix now carries the `?` (edge `contracts` redeployed), the SPA normalises `/contract-review<junk>` and `??cnak=` before its 404 page, the page tolerates a `?fbclid=` tail on the secret, and **migration `contracts/080` LIVE** makes `validate_contract_access` answer an already accepted / rejected / expired grant with facts (`already_responded, status, responded_at, claimed, contract, tenant`) so the page shows "Already accepted · add to your ContractHub / log in" instead of "Access Error". **Board double count fixed (migration `jtd-nucleus/020` LIVE, batch `ops-board-invoice-double-count`)**: V2-path contracts (jobs, no legacy events) showed a whole-invoice row AND instalment rows for the same money because their jobs carry no `invoice_id`; the invoice row now appears only when the contract has no open payment job at all (signia 21 → 17 need you; every hidden balance == its open instalments). Follow-ups: stamp `invoice_id` on jobs in `generate_contract_invoices`; rename the "Invoices overdue" chip to "Whole invoices". **EXPENSE SIDE OPS BOARD built (batch `ops-expense-board`, migration `jtd-nucleus/021` + 021b LIVE)**: `jtd_ops_board_expense` (same shape as the revenue reader; lanes payables · services · acceptance; kinds bill_overdue/bill_due/bill_declared · slot_offered/service_in_progress/service_awaited/service_today/service_scheduled · to_accept) and `jtd_buyer_respond_slot` (the in-app twin of `/slot/:token`); API `?perspective=expense` + `POST /slots/:appointmentId/respond`; UI: `Home.tsx` renders the board for both sides (old cockpit `index.tsx` unrouted, delete later), `JobCard` gets the buyer verbs, new `components/ops/PaySheet.tsx` reuses the review page's `PublicPaymentSection` via `my-access` (board · contract page buyer view · To Pay), and the buyer's contract page no longer offers "Record payment" (it wrote the seller's ledger). **Still owner-scoped on expense**: the Commitments Register lanes + Activity, `jtd_contract_activity` (History hidden on expense cards). **to_accept** matches the grant to the buyer tenant's users by accessor tenant / accessor email / the seller-side contact's email or mobile — the buyer login must carry one of them. No buyer sign-off tool for a completed service yet. **Pre-existing, found on the way**: `get_contracts_list(... p_group_by='buyer')` fails with `missing FROM-clause entry for table "c"` (ORDER BY alias inside the grouped aggregate); untouched.

### DONE 2026-09-17 — appointments and follow-ups are ITEMS ON THE COMMITMENT; `t_appointments` is a view (batch `ops-items-on-jtd`, staged; migrations `jtd-nucleus/022a · 022b · 022c` LIVE)
Owner, after seeing how appointments were structured across the contract view, the Ops board and the register ("how is 'Asked' coming — why so many 'cancelled' if they are not triggered"): **"appointments and followups should share same infra — both have status, assigned to, what time, reschedule, assigned by, service to (buyer)"**, then **"t_appointments will not be needed — n_jtd events like billing, services might have followups json records, they might have appointment jsons against them"**; costs accepted (mirror via migration; transactions handle concurrency); "go ahead". Facts that drove it: 164 appointments ever, 163 auto-cancelled by the nightly expiry cron, 0 accepted; every "Asked" row on the register was the scanner's silent six-day auto-request that no customer ever saw; follow-ups were `payment_call_due` task rows with a one-open-per-job refusal. Built (spec §3.4, §4): two jsonb columns on `n_jtd`, `followups[]` (any number) and `appointments[]` (one open per commitment), one item spine for both (status · scheduled_at/original_at · assigned_to · set_by · note · rescheduled[] · outcome · closed_at), **one writer** `jtd_item_write` (job `FOR UPDATE`, version bump with optional `version_conflict`, one `n_jtd_history` row per change with `details.item_id`) and four generic tools `jtd_item_add/assign/reschedule/close`; `jtd_ensure_visit_job` creates the visit job for an event that never had one. Every entry point rewired with the same signatures and result shapes: `create_appointment`/`update_appointment` (legacy wrappers; accept moves the event and calls `fn_enqueue_service_visit_scheduled(item id)` in place of the dropped trigger), `jtd_schedule_visit`, `jtd_confirm_visit_slot`, `jtd_ask_visit_slot`, `visit_slot_resolve/respond` (token lookup via containment, actor `customer`), `jtd_buyer_respond_slot`, `jtd_complete_visit`, `gs_schedule_assign`, `jtd_escalate_payment_call` (a follow-up is now an item; `call_already_open`/`duplicate_rung` gone), `jtd_log_payment_call` (still writes the call record row; closes every open follow-up), `jtd_tasks`, both boards, `jtd_activity`, `jtd_contract_activity`, `get_appointments_list` (+`asked_at/ask_count/customer_response`), `reset_tenant_session_and_forms`; **scanner STEP 2b (auto-request) cut; cron `appointment-auto-expire` unscheduled and `expire_stale_appointment_requests` dropped**. 022c back-filled 165 appointment rows → items (ids preserved, row-for-row post-check) and the open call tasks → follow-up items (rows retired, `business_context.migrated_to_item`), renamed the table `t_appointments_legacy_022` (read-only; drop later) and created **`t_appointments` as a VIEW** over the items (legacy status mapping `proposed·asked→requested`, `confirmed→accepted`, `customer_proposed→rescheduled`) with INSTEAD OF triggers, so the ~20 legacy readers/writers are untouched. API unchanged. UI (three files): register Appointments lane reads "Slot proposed", and "Asked ×N" only when `asked_at` is set; `Appointment` type gains the three fields; EventCard "Book appointment" → "Propose slot". Probed whole in one rolled-back transaction, then applied; verified live: 165 items = 165 jobs = view 165, signia board 63 / buyer 4 / BBB 78 unchanged, tsc 1170 = pristine, vite build passes. **Gotchas**: an unqualified column inside `EXISTS (SELECT 1 FROM n_jtd j WHERE j.id = source_id)` binds to the inner alias — alias the outer table; CN-1010's live appointment reads "cancelled" because the legacy 03:00 IST cron ran once more before 022c removed it. **Still open**: drop `t_appointments_legacy_022`; a generic `jtd_items` reader for the register's Appointments lane (it still reads `get_appointments_list` through the view); Schedule/Ask verbs on the contract page's EventCard; the visit-slot ladder; MSG91 templates (owner); production redeploy of API/UI (owner).

### DONE 2026-09-18 — the PLAN VIEW: every day ahead with its commitments lined up; VaNi's leverage gated, manual never withheld (batch `ops-plan-view`, staged; migration `jtd-nucleus/023` LIVE)
Owner, after the Timeboard playground (`MANUAL_COPY_FILES/playground/timeboard-playground.html`, artifact republishable from the file): "as per JTD, Wed 16 Sep has a few events — can't those be shown as commitments lined up, and the user reviews (tooltip/popup) and confirms or proposes?" plus the cross-selling worry: "VaNi is the cream — a great manual feature might degrade the VaNi push." Resolution agreed: **the plan is for everyone; the leverage is VaNi's** (a weak manual UX loses the tenant before the upsell; the visible counterfactual on every day is the pitch). Built: `jtd_plan(tenant, is_live, {from, to ≤120 d, lanes, who, q}, user)` = `jtd_ops_board` regrouped by IST anchor day (every day of the window, empty ones included; `carried` = anchored before the window, `parked` = no anchor; per-day counts via `jtd__plan_counts`; `vani_enabled`, `ask_channels`, `team`, `ladder` passed through); two batch tools that loop the existing single-item tools and are **gated on `vani_is_enabled()` → `vani_off`**: `jtd_plan_day` ("Plan this day": 10:00 IST, then +2 h per service already placed for the same technician, unassigned share one sequence, nobody guessed a technician, `jtd_schedule_visit` proposed never confirmed, today's passed hours skip to the next full hour) and `jtd_ask_day` ("Ask everyone": every proposed-not-asked slot on email/whatsapp through `jtd_ask_visit_slot`, so `no_template` until the provider templates are registered). API `GET /api/jtd/collections/plan`, `POST /plan/:day/place`, `POST /plan/:day/ask {channel}` (`vani_off` → 403). UI: **Plan** tab on the Commitments Register (`components/ops/PlanView.tsx`; revenue side only) — window presets, lane, Who, search; per day a counts sentence, needs-you and unassigned pills, the VaNi line (buttons when on; greyed "VaNi would place N, ask M and send R reminders · Open VaNi" when off), the board's `JobCard` with the same actions wiring as Ops (first 6, "Show all"), Log-a-call sheet and History drawer; "Carried over" collapsed at the top, "Parked" at the bottom; the page header's Refresh and progress bar follow the plan query. Probed whole in one rolled-back transaction on signia (14 days, cards under the right day, future window has no carried, garbage filters never raise, 120-day clamp, Plan this day placed 1 at 10:00 IST and was idempotent, Ask everyone refused `no_template`, gate refused on a VaNi-off tenant), then applied; live: signia 53 in window + 50 carried, BBB 78 (all payments, 29 reminders due), buyer 0 with `vani_enabled:false`. UI tsc 1170 = pristine, vite build passes, API tsc 0. **Decisions taken without an explicit answer**: Plan tab lives on the register (not the cockpit); the free-slot rule above. **Copy order**: this batch's `register/index.tsx` is a superset of batch `ops-items-on-jtd`'s copy (and carries its `useAppointmentQueries.ts`), so either order works. **Next per the POA**: batch 2 (duration, working hours, leave), batch 3 (Timeboard grids), batch 4 (VaNi suggestions + the visit-slot ladder; needs M1 templates and M2 delivery reports — owner chose n8n forwarding, option 2, to be done when reached), batch 5 (buyer side + Request a visit).

### DONE 2026-09-18 — AVAILABILITY: working hours, leave, visit duration and clashes as warnings (batch `ops-availability`, staged; migration `jtd-nucleus/024` LIVE) — POA batch 2
Owner: "this is good … go to batch 2" (after the plan view + a Status filter on it, also shipped in `ops-plan-view`). Facts first: no block carries a duration (0 of 5,425 catalog and 0 of 1,038 contract blocks, though `catBlockAdapter` reads `config.duration {value, unit}`); tenant-level days off already existed (`t_tenant_cadence_settings.weekly_holidays` + `t_tenant_holiday_dates`, edited on `/settings/configure/cadence`); teams are tiny (most tenants 1 user, largest 5); the users API goes through the `user-management` edge function. Built: hours on the EXISTING cadence settings (`work_start 09:00`, `work_end 18:00`, `default_visit_minutes 60`; getter extended by anchor rewrite; `upsert_tenant_working_hours`), per-user `t_user_availability` (NULL = inherit) and `t_user_leave` (full/am/pm + label) with `get/set_user_availability`, `add/remove_user_leave`, `get_team_availability`, `jtd_effective_hours`; `jtd_visit_minutes(event)`; **`jtd_slot_check(tenant, user, start, minutes, exclude)` → `[]` or `[{kind, detail, event_id?}]`** (`weekly_off · holiday · leave · outside_hours · overlap`; overlaps only against services with a timed slot, because event rows carry their creation clock time). **A clash is a warning, never a refusal**: `jtd_schedule_visit`, `jtd_confirm_visit_slot`, `jtd_assign_visit` return `warnings` (anchor rewrites via `jtd__rewrite_fn`); board visit rows carry `visit.duration_minutes` + `visit.clashes`; `jtd__plan_counts` counts `clashes`; `jtd_plan_day` starts from `work_start`, steps by `default_visit_minutes`, refuses a tenant day off (`day_off`), returns `warned_count`; appointment items carry `duration_minutes` (168 back-filled). API: `PUT /api/settings/cadence/hours`; new `/api/availability` router (`users/:id`, `users/:id/leave`, `team`) calling the RPCs with the service key. UI: "Working hours" card on the cadence page; `hooks/queries/useAvailabilityQueries.ts` (a "Working hours & leave" card on `/settings/users/:id` was built and then **removed on owner instruction the same day — "review post MVP"**; tables, RPCs and `/api/availability` stay, everyone inherits the organisation's hours until then); JobCard red "⚠ outside hours / on leave / overlaps +N" pill (reasons on hover); Schedule/Confirm/Assign toasts append the warnings; Plan tab "N clashes" + Status "Clashes". Probed whole on signia in one rolled-back transaction (defaults, save + bad hours, user 10–16 Sat/Sun off + a morning's leave, Sunday → weekly_off, 09:00 → leave + outside_hours, 14:00 clean, two services for one user at 14:00/15:00 → overlap on schedule and confirm, board rows with clashes, plan counted 2, Plan this day refused Sunday and stepped 90 min from 08:30, all 168 items carry a duration), then applied. Verified: API tsc 0, UI tsc 1170 on the assembled local state (expense-board + plan-view + this), vite build passes. **Supersets**: `JobCard.tsx` ⊃ ops-expense-board; `useCollectionsQueries.ts`, `PlanView.tsx` ⊃ ops-plan-view ⊃ ops-expense-board — copy this batch last. **Defaults taken without an explicit answer**: 09:00–18:00 IST, Sunday off, 60-minute visits, 13:00 as the am/pm boundary. **Still open**: `visit_slot_respond` (the customer's own counter-proposal) is not warned to the customer — the team sees the clash on the `slot_to_confirm` card; a per-block duration field in the Block Wizard (the adapter already reads it); leave for a person in several tenants is per tenant by design.


### DONE 2026-09-18 — the TIMEBOARD: every hour, every person, every commitment; drag to propose or confirm (batch `ops-timeboard`, staged, UI only) — POA batch 3
Owner: "remove availability from settings/users (review post MVP) · start batch 3 · then give me what is done and what is pending". Built on the two readers that already exist — `jtd_plan` (023) for the rows, `get_team_availability` (024) for the hours/off/leave/holidays — so no migration and no API change. `/ops/timeboard` (menu "Timeboard" after Commitments Register; `industryMenus.ts` is a superset of `ops-menu-flatten`'s copy; `App.tsx` built on pristine main): **Week** (column per day) · **Day** (column per person + Unassigned + VaNi) · **Agenda** (phone default), Earlier/Today/Later, date, lane, Who, Person, search (`?day=&q=` in the URL). Columns: header with the hours that apply, a top strip for everything without a real time (unslotted services as draggable chips; payments/reminders/follow-ups/declared rolled into chips that open a list — the strips are one flex row so every column's hours line up), hatched off-hours/day off/holiday/leave, a now rule. Blocks = services with a slot sized by `duration_minutes`, side by side on overlap, ⚠ from `visit.clashes`; Day view also places a person's follow-ups at their due time and the ladder's reminders in the VaNi column (greyed + "Open VaNi" when off). **The gesture**: drag a service onto a time (Day view: onto a person) → a confirm bar names the move, shows the client-side clash preview (`components/ops/timeboard/model.ts` mirrors `jtd_slot_check`), and offers Propose to customer (`useScheduleVisit` unconfirmed) · Confirm slot / Keep confirmed · Cancel; a drop on another person runs `useAssignVisit` first. **Find a slot** in the side panel (next free times, 14 days, technician or everyone). Side panel = the full `JobCard` with the same actions wiring as Ops/Plan (duplicated a third time — a shared `useJobCardActions` hook is the obvious refactor, not done: no unsolicited refactoring). Day view carries "Plan this day · N" (023, VaNi-gated) / the counterfactual. Verified: tsc 1170 = pristine on the assembled state, vite build passes, and the three views rendered in a throwaway harness with mocked rows (screenshots checked: alignment, hatching, overlap lanes, follow-up/reminder placement); the live drag → schedule chain was not exercised from here (no auth) — it calls the same hooks the Plan tab's Schedule panel uses. **Decisions taken without an explicit answer**: only services drag (follow-ups need an item-reschedule API route first); one free slot per person per day in Find a slot; the browser clock is IST (the same assumption as every `datetime-local` in the app). **Still open**: item reschedule route (`jtd_item_reschedule` exists) so follow-ups can move; the visit-slot ladder + VaNi suggestions (POA batch 4, needs M1 templates + M2 n8n forwarding); buyer-side timeboard + Request a visit (batch 5); per-block duration in the Block Wizard; drop `t_appointments_legacy_022`; production redeploy of API/UI.
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
