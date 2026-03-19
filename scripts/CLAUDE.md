# ContractNest & FamilyKnows — Claude Code Instructions

> ⚠️ **THIS IS A PRODUCTION SYSTEM with real tenants and real data.**
> **Treat every file edit as if it's going live immediately.**
>
> **Read this entire file AND `LESSONS_LEARNED.md` at the start of every session. No exceptions.**

---

## 🛑 NON-NEGOTIABLE RULES

### Rule 0: READ LESSONS LEARNED FIRST
- At the **start of every session**, read `LESSONS_LEARNED.md` before doing anything.
- It contains past mistakes and hard-won knowledge. Do not repeat them.
- Follow relevant lessons without being reminded.

### Rule 1: ANALYSIS FIRST — NO CODE WITHOUT CONFIRMATION
- **NEVER start coding immediately.**
- First: Understand → Read actual files with subagents → Propose approach.
- Present:
  1. What you understand the problem to be
  2. Which files you plan to change and why
  3. Technical approach and any risks
- **Wait for explicit "go ahead" / "proceed" / "approved"** before writing any code.
- Even for "simple" fixes — still confirm. No exceptions.

### Rule 2: NO UNSOLICITED CHANGES
- **No refactoring** unless explicitly asked.
- **No new libraries, packages, utilities, helper functions, or patterns** unless explicitly asked.
- **No new database tables, columns, functions, RPCs, triggers, or views** without explicit approval.
- **No renaming** files, variables, functions, or components unless asked.
- Change ONLY what is needed to solve the stated problem. Nothing more.
- If you see something worth improving, present it as a suggestion and wait.

### Rule 3: NO ASSUMPTIONS — ASK
- If something is unclear, **ask**. Do not fill gaps with assumptions.
- Do not assume column names, function signatures, UI behavior, or architecture.
- Do not invent new patterns or abstractions.
- If you think something SHOULD be done differently, present it as a suggestion and wait.

### Rule 4: USE SUBAGENTS FOR KNOWLEDGE
- Before making changes, **always use subagents** (Read tool / search) to:
  - Read the actual current state of files you plan to modify
  - Understand existing patterns, naming conventions, and code structure
  - Check database schema before writing any SQL
  - Review related files for the full picture
- **Never rely on memory or assumptions about file contents.**

### Rule 5: ZERO HALLUCINATION — IF YOU HAVEN'T SEEN IT, DON'T USE IT
- **NEVER reference a column, table, function, RPC, component, prop, variable, import, or file path unless you have VERIFIED it exists by reading the actual code/schema.**
- If you are not 100% sure something exists: **STOP and verify with subagents, or ASK.**
- Do NOT:
  - Use column names you "think" exist — READ the table schema first
  - Import components you "think" are available — READ the codebase first
  - Call functions with parameters you "think" they accept — READ the function signature first
  - Reference file paths you "think" are correct — LIST the directory first
  - Assume API response shapes — READ the API code or types first
- **When in doubt, say "I need to verify X before proceeding" — do NOT guess.**
- This rule exists because hallucinated code has caused production 502 errors multiple times.

### Rule 6: PRODUCTION SAFETY
- Every SQL migration must use `IF EXISTS`, `IF NOT EXISTS`, etc.
- Never drop data or columns without explicit instruction.
- Always consider: What happens to existing data? What happens to active users?
- Test your logic mentally before presenting the plan.

### Rule 7: PRODUCTION-READY CODE STANDARDS
ALL code must include where applicable:

| # | Requirement | Description |
|---|-------------|-------------|
| 1 | **Transaction Management** | DB operations in transactions, rollback on failure |
| 2 | **Race Condition Handling** | Locking, optimistic concurrency, debouncing |
| 3 | **Error Handling** | Try-catch, proper propagation, user-friendly messages |
| 4 | **Toasts** | Using EXISTING toast components (ask if unsure which) |
| 5 | **Loaders** | Using EXISTING loader components (ask if unsure which) |

⚠️ Before implementing toasts/loaders: Check if components exist. If not, ASK:
> "I don't see an existing toast/loader component. Should I create one or is there an existing one I should use?"

### Rule 8: FILE DELIVERY — NO MANUAL_COPY_FILES
- **NEVER create MANUAL_COPY_FILES/ folders or commit files to branches.**
- **ALWAYS paste complete file contents directly in the chat response.**
- This is the ONLY delivery method that works. See "FILE DELIVERY" section below for details.

---

## 🔍 TASK WORKFLOW

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: UNDERSTAND                                         │
│  - What exactly is being requested?                         │
│  - What's the expected behavior?                            │
│  - What are the edge cases?                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: ANALYZE EXISTING CODE (use subagents)              │
│  - Read actual files in affected submodules                 │
│  - Check DB schema if SQL is involved                       │
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
│  STEP 5: CODE & DELIVER                                     │
│  - Implement with production standards                      │
│  - Provide PHASE 1 output (file contents in chat)           │
└─────────────────────────────────────────────────────────────┘
                            ↓
              User confirms: "Tested, working"
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: PROVIDE PHASE 2                                    │
│  - Commit/merge commands (only when asked)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 7: UPDATE LESSONS LEARNED                             │
│  - Append new lessons if any bugs/mistakes/patterns found   │
└─────────────────────────────────────────────────────────────┘
```

### Questions to ask BEFORE coding:
1. **Missing Components**: _"I don't see an existing [toast/loader/modal]. Which one should I use?"_
2. **Unclear Requirements**: _"Should this also handle [edge case]?"_
3. **Multiple Approaches**: _"I can do this via [A] or [B]. Which do you prefer?"_
4. **Potential Impact**: _"This change might affect [X]. Should I check?"_
5. **Schema Changes**: _"This needs a new column [X] on [table]. Should I proceed?"_

---

## 📁 PROJECT STRUCTURE

```
D:\projects\core projects\ContractNest\contractnest-combined\
├── contractnest-api/          # Backend API — branch: main
├── contractnest-ui/           # Frontend UI — branch: main
├── contractnest-edge/         # Supabase Edge Functions & Migrations — branch: main
├── ClaudeDocumentation/       # Documentation — branch: master ⚠️
├── ContractNest-Mobile/       # Mobile App — branch: main
├── FamilyKnows/               # Separate Product — branch: main
│   ├── app/                   # Expo mobile app
│   └── website/               # React/TypeScript website
├── CLAUDE.md                  # THIS FILE
└── LESSONS_LEARNED.md         # Persistent lessons across sessions
```

| Submodule | Branch | Tech Stack |
|-----------|--------|------------|
| `contractnest-api` | `main` | Node.js, Express, TypeScript |
| `contractnest-ui` | `main` | React, TypeScript, Vite |
| `contractnest-edge` | `main` | Supabase Edge Functions & Migrations |
| `ClaudeDocumentation` | `master` | Markdown |
| `ContractNest-Mobile` | `main` | React Native |
| `FamilyKnows` | `main` | Expo (app/) + React/TypeScript (website/) |

---

## 🚨 MANDATORY: Session Initialization

**EVERY SESSION MUST START WITH:**

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

⚠️ If any submodule shows as empty or missing:
```bash
git submodule update --init --recursive --force
```

---

## 🔴🔴🔴 FILE DELIVERY — READ THIS CAREFULLY 🔴🔴🔴

### 🚫 MANUAL_COPY_FILES IS BANNED. DO NOT USE IT. EVER.

**DO NOT create a MANUAL_COPY_FILES/ folder.**
**DO NOT commit files to a branch for the user to pull.**
**DO NOT say "copy from MANUAL_COPY_FILES" — the folder will be EMPTY when pulled.**
**DO NOT use git commit, git push, or branch-based file delivery.**

Why: The sandbox cannot push to GitHub submodule remotes. All commits happen in detached
HEAD state. When the user pulls the branch, submodule references point to commits that
don't exist. The files NEVER arrive. This has failed EVERY SINGLE TIME.

### ✅ THE ONLY WAY TO DELIVER FILES: Paste complete contents in the chat response

For EVERY changed file, in your chat response:
1. **Label it** with the exact destination path
2. **Paste the COMPLETE file contents** in a fenced code block (not a diff — the FULL file)
3. **Number them** if multiple files: File 1 of 3, File 2 of 3, etc.

For large files (500+ lines): Provide as a **downloadable file attachment** with the
destination path clearly labeled.

**THIS IS THE ONLY FILE DELIVERY METHOD THAT WORKS. There is no alternative.**

### ❌ SELF-CHECK before responding — if your response contains ANY of these, STOP and FIX IT:
- Any mention of `MANUAL_COPY_FILES/` → REMOVE IT
- `Copy-Item` commands referencing MANUAL_COPY_FILES → REMOVE THEM
- "Pull the branch to get the files" → WRONG, paste files in chat instead
- "I've placed the files in..." → WRONG, paste the actual contents
- A diff or partial file → WRONG, paste the COMPLETE file

---

## 📤 OUTPUT FORMAT — TWO PHASES

### PHASE 1: LOCAL TESTING (Provide immediately after coding)

```
═══════════════════════════════════════════════════
📦 CHANGES SUMMARY
═══════════════════════════════════════════════════
Files Changed (X files):
  - [submodule]/[path/to/file] — [what changed and why]

Submodules Affected: [list]

Production Checklist:
  ✅ Transaction Management: [Yes/No/N/A — where applied]
  ✅ Race Condition Handling: [Yes/No/N/A — where applied]
  ✅ Error Handling: [Yes/No/N/A — where applied]
  ✅ Toasts: [Yes/No/N/A — component used]
  ✅ Loaders: [Yes/No/N/A — component used]

⚠️ SPECIAL INSTRUCTIONS (if any):
  - [SQL to run in Supabase SQL Editor — paste the SQL]
  - [Environment variable to add]
  - [npm install needed]

═══════════════════════════════════════════════════
📄 FILE 1 of X: [submodule]/[exact/path/to/file.ext]
═══════════════════════════════════════════════════
```[language]
[COMPLETE file contents — not a diff, the FULL file]
```

═══════════════════════════════════════════════════
📄 FILE 2 of X: [submodule]/[exact/path/to/file.ext]
═══════════════════════════════════════════════════
```[language]
[COMPLETE file contents]
```

[...repeat for all changed files...]

═══════════════════════════════════════════════════
🧪 TESTING CHECKLIST
═══════════════════════════════════════════════════
- [ ] [Specific test 1]
- [ ] [Specific test 2]
- [ ] [Specific test 3]

═══════════════════════════════════════════════════
⏸️ WAITING FOR CONFIRMATION
═══════════════════════════════════════════════════
Test locally and confirm:
  → "Tested, working — proceed with Phase 2"
  → "Issue found: [describe problem]"
═══════════════════════════════════════════════════
```

**❌ NEVER include commit/merge/push commands in Phase 1**

---

### PHASE 2: COMMIT & MERGE (Provide ONLY after user confirms "tested, working")

```
═══════════════════════════════════════════════════
🚀 PHASE 2: COMMIT & MERGE
═══════════════════════════════════════════════════

# Commit UI Changes (if applicable)
cd contractnest-ui
git add .
git commit -m "[type]: [descriptive message]"
git push origin main
cd ..

# Commit Edge Changes (if applicable)
cd contractnest-edge
git add .
git commit -m "[type]: [descriptive message]"
git push origin main
cd ..

# Commit API Changes (if applicable)
cd contractnest-api
git add .
git commit -m "[type]: [descriptive message]"
git push origin main
cd ..

# Commit FamilyKnows Changes (if applicable)
cd FamilyKnows
git add .
git commit -m "[type]: [descriptive message]"
git push origin main
cd ..

# Commit Mobile Changes (if applicable)
cd ContractNest-Mobile
git add .
git commit -m "[type]: [descriptive message]"
git push origin main
cd ..

# Commit Documentation Changes (if applicable)
cd ClaudeDocumentation
git add .
git commit -m "docs: [descriptive message]"
git push origin master
cd ..

# Update Parent Repo
cd "D:\projects\core projects\ContractNest\contractnest-combined"
git add contractnest-ui contractnest-edge contractnest-api ClaudeDocumentation ContractNest-Mobile FamilyKnows
git commit -m "chore: update submodules — [feature description]"
git push origin master

# Verify
git status
git submodule status
═══════════════════════════════════════════════════
```

---

## 📝 LESSONS LEARNED — Maintenance

- **File:** `LESSONS_LEARNED.md` in project root (same level as CLAUDE.md)
- **Read:** Start of every session
- **Append:** After any bug fix, wrong assumption, production issue, or new pattern
- **Format:**
  ```
  ### [YYYY-MM-DD] [CATEGORY] — Short Title
  **Context:** What was being done
  **Problem:** What went wrong
  **Root Cause:** Why it happened
  **Lesson:** What to do / not do going forward
  ```
- **Categories:** DATABASE, UI, API, EDGE, WORKFLOW, PROCESS, CODE, DEPLOYMENT, SECURITY
- **Never delete** old lessons — they are historical record

---

## ⛔ COMMON MISTAKES — DO NOT REPEAT

- **HALLUCINATING code: using columns, functions, imports, props that don't actually exist**
- **Using MANUAL_COPY_FILES/ for file delivery — IT DOES NOT WORK, NEVER HAS, NEVER WILL**
- Referencing DB columns in SQL that don't exist in the schema (causes 502)
- Creating new DB objects (tables, columns, RPCs) without approval
- Creating utility functions when existing patterns already handle the case
- Refactoring working code while fixing a bug
- Introducing TypeScript type changes across multiple files for a single fix
- Assuming file contents without reading them first
- Starting to code before getting explicit approval
- Providing commit/push/merge commands in Phase 1

---

## 🔄 Utility Scripts

### Pull Everything (Fresh Start)
```powershell
cd "D:\projects\core projects\ContractNest\contractnest-combined"
git checkout master
git pull origin master
git submodule update --init --recursive --remote

cd contractnest-api && git checkout main && git pull origin main && cd ..
cd contractnest-ui && git checkout main && git pull origin main && cd ..
cd contractnest-edge && git checkout main && git pull origin main && cd ..
cd ClaudeDocumentation && git checkout master && git pull origin master && cd ..
cd ContractNest-Mobile && git checkout main && git pull origin main && cd ..
cd FamilyKnows && git checkout main && git pull origin main && cd ..

Write-Host "✅ All repos pulled and synced!" -ForegroundColor Green
```

### Push Everything
```powershell
cd "D:\projects\core projects\ContractNest\contractnest-combined"

cd contractnest-api && git checkout main && git pull origin main && git add . && git commit -m "Update API" --allow-empty && git push origin main && cd ..
cd contractnest-ui && git checkout main && git pull origin main && git add . && git commit -m "Update UI" --allow-empty && git push origin main && cd ..
cd contractnest-edge && git checkout main && git pull origin main && git add . && git commit -m "Update Edge" --allow-empty && git push origin main && cd ..
cd ClaudeDocumentation && git checkout master && git pull origin master && git add . && git commit -m "Update Docs" --allow-empty && git push origin master && cd ..
cd ContractNest-Mobile && git checkout main && git pull origin main && git add . && git commit -m "Update Mobile" --allow-empty && git push origin main && cd ..
cd FamilyKnows && git checkout main && git pull origin main && git add . && git commit -m "Update FamilyKnows" --allow-empty && git push origin main && cd ..

git checkout master && git pull origin master && git add . && git commit -m "Update submodule references" --allow-empty && git push origin master

Write-Host "✅ Everything pushed!" -ForegroundColor Green
```

### Quick Status Check
```bash
git submodule status
git submodule foreach 'git status'
git submodule foreach 'echo "$(basename $(pwd)): $(git branch --show-current)"'
```

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---------|-----|
| Submodule not initialized | `git submodule update --init --recursive --force` |
| Detached HEAD in submodule | `cd [submodule] && git checkout main && git pull origin main && cd ..` |
| Submodule conflicts during merge | `cd [submodule] && git checkout main && git pull origin main && cd .. && git add [submodule]` |
| Reset submodule to remote | `cd [submodule] && git fetch origin && git reset --hard origin/main && cd ..` |

---

## 📌 Commit Message Conventions

| Prefix | Usage | Example |
|--------|-------|---------|
| `feat:` | New feature | `feat: add NAV tracking dashboard` |
| `fix:` | Bug fix | `fix: resolve 502 on contract creation` |
| `docs:` | Documentation | `docs: update API endpoint docs` |
| `style:` | Formatting only | `style: fix indentation in wizard` |
| `refactor:` | Code restructuring | `refactor: extract contract utils` |
| `test:` | Adding tests | `test: add contract creation tests` |
| `chore:` | Maintenance | `chore: update submodules` |

---

## 📊 Session & Token Management

**Watch for these warning signs:**
- Responses start getting truncated
- Claude begins forgetting earlier context
- Claude asks about things already discussed

**After 3-4 major tasks**, consider starting a fresh session.

**Prompt at task end:**
> "Task complete. Give me a session health check — should we continue or start fresh?"

---

**Last Updated**: March 2026
**Maintained By**: Charan Kamal Bommakanti — Vikuna Technologies