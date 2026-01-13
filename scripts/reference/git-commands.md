# Git Commands & Workflow Reference

## 📤 PHASE 1: LOCAL TESTING FORMAT

**Provide immediately after coding:**

```
═══════════════════════════════════════════════════
📦 CHANGES SUMMARY
═══════════════════════════════════════════════════
Branch: [feature-branch-name]
Files Changed:
  - [submodule]/[path/to/file] - [purpose]
  - [submodule]/[path/to/file] - [purpose]

Submodules Affected: [list affected submodules]

═══════════════════════════════════════════════════
💻 PHASE 1: COPY FILES FOR LOCAL TESTING
═══════════════════════════════════════════════════

STEP 1: Navigate to Project
─────────────────────────────────
cd "D:\projects\core projects\ContractNest\contractnest-combined"

STEP 2: Copy Files from MANUAL_COPY_FILES
─────────────────────────────────
Copy-Item "MANUAL_COPY_FILES\[feature-name]\contractnest-ui\*" -Destination "contractnest-ui\" -Recurse -Force
Copy-Item "MANUAL_COPY_FILES\[feature-name]\contractnest-api\*" -Destination "contractnest-api\" -Recurse -Force
# ... etc for each affected submodule

Write-Host "✅ All files copied!" -ForegroundColor Green

STEP 3: Start Dev Server & Test
─────────────────────────────────
# UI
cd contractnest-ui && npm run dev

# API (if modified)
cd ../contractnest-api && npm run dev

# Hard refresh: Ctrl+F5

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

## 🚀 PHASE 2: COMMIT & MERGE FORMAT

**Provide ONLY after user confirms "tested, working":**

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
git push origin master  ⚠️ NOTE: master, not main
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
Write-Host "✅ All changes committed!" -ForegroundColor Green
═══════════════════════════════════════════════════
```

---

## 📝 Commit Message Prefixes

| Prefix | When to Use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `style:` | Formatting, no logic change |
| `refactor:` | Code restructure, no feature change |
| `test:` | Adding/updating tests |
| `chore:` | Maintenance, dependencies |

**Examples:**
- `feat: add contacts list pagination`
- `fix: resolve N+1 query in dashboard`
- `docs: update API documentation`
- `chore: update submodules with auth fix`

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
git checkout master  # ⚠️ master, not main
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
git checkout master  # ⚠️ master, not main
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

### Check All Submodule Status
```bash
git submodule status
git submodule foreach 'git status'
git submodule foreach 'echo "$(basename $(pwd)): $(git branch --show-current)"'
```

---

## 📁 Branch Reference

| Repo | Branch |
|------|--------|
| contractnest-combined (parent) | `master` |
| contractnest-api | `main` |
| contractnest-ui | `main` |
| contractnest-edge | `main` |
| ClaudeDocumentation | `master` ⚠️ |
| ContractNest-Mobile | `main` |
| FamilyKnows | `main` |

---

## 📊 Session & Token Management

### Token Visibility Limitation
⚠️ **Claude cannot directly see remaining tokens in claude.ai interface.**

### Workarounds:

**Option 1: Ask after each task**
> "How much of the conversation have we used? Should we start a new session?"

**Option 2: Watch for warning signs**
- Responses getting truncated
- Forgetting earlier context
- Asking about things already discussed

**Option 3: Proactive session breaks**
After 3-4 major tasks, consider fresh session.

**Recommended prompt:**
> "Task complete. Give me a session health check - should we continue or start fresh?"

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
