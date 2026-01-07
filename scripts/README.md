# ContractNest Git Scripts - Usage Guide

> **Location**: Place all `.ps1` files in `D:\projects\core projects\ContractNest\contractnest-combined\scripts\`

---

## 📋 Quick Reference

| Script | When to Use | Command |
|--------|-------------|---------|
| `sync-status.ps1` | Check status before any operation | `.\scripts\sync-status.ps1` |
| `pull-safe.ps1` | Pull latest from all repos | `.\scripts\pull-safe.ps1` |
| `push-feature.ps1` | Push while on feature branch | `.\scripts\push-feature.ps1` |
| `push-main.ps1` | Push directly to main (releases) | `.\scripts\push-main.ps1` |
| `merge-feature.ps1` | Merge feature to master after testing | `.\scripts\merge-feature.ps1` |

---

## 🔄 Typical Workflow

### Starting a New Feature

```powershell
cd "D:\projects\core projects\ContractNest\contractnest-combined"

# 1. Check current status
.\scripts\sync-status.ps1

# 2. Pull latest code
.\scripts\pull-safe.ps1

# 3. Create feature branch
git checkout -b feature/my-new-feature

# 4. Make your changes...
```

### While Working on Feature

```powershell
# Check what's changed
.\scripts\sync-status.ps1

# Push changes (stays on feature branch)
.\scripts\push-feature.ps1 -Message "feat: add user dashboard"

# Or dry-run first to see what will happen
.\scripts\push-feature.ps1 -DryRun
```

### After Testing is Complete

```powershell
# Merge to master
.\scripts\merge-feature.ps1

# Or merge and delete feature branch
.\scripts\merge-feature.ps1 -DeleteBranch
```

---

## 📖 Detailed Script Usage

### 1. sync-status.ps1

**Purpose**: Shows the status of all repos at a glance.

```powershell
.\scripts\sync-status.ps1
```

**Output shows**:
- ✅ Clean repos
- 📝 Repos with uncommitted changes
- ⬆️ Repos that need to push
- ⬇️ Repos that need to pull
- ⚠️ Repos on wrong branch

**Use before**: Any push or pull operation

---

### 2. pull-safe.ps1

**Purpose**: Safely pull all repos without unexpected updates.

```powershell
.\scripts\pull-safe.ps1
```

**What it does**:
1. Checks for uncommitted changes (blocks if found)
2. Pulls parent repo
3. Initializes all submodules
4. Pulls each submodule to correct branch

**Use when**: Starting work, syncing with team

---

### 3. push-feature.ps1

**Purpose**: Push changes while staying on your current branch.

```powershell
# Basic usage
.\scripts\push-feature.ps1

# With custom commit message
.\scripts\push-feature.ps1 -Message "feat: add nav tracking"

# Dry run (see what would happen)
.\scripts\push-feature.ps1 -DryRun
```

**What it does**:
- Submodules → Pushes to their main branches
- Parent repo → Pushes to YOUR current branch (feature branch)

**Use when**: Working on a feature, not ready to release

---

### 4. push-main.ps1

**Purpose**: Push everything directly to main/master branches.

```powershell
# Basic usage (prompts for confirmation)
.\scripts\push-main.ps1

# With custom commit message
.\scripts\push-main.ps1 -Message "feat: release v2.0"
```

**What it does**:
- Switches all repos to main/master
- Commits and pushes all changes

⚠️ **Use when**: Ready to release to production

---

### 5. merge-feature.ps1

**Purpose**: Merge feature branch to master after testing.

```powershell
# Merge current branch to master
.\scripts\merge-feature.ps1

# Merge specific branch
.\scripts\merge-feature.ps1 -Branch "feature/nav-tracking"

# Merge and delete feature branch
.\scripts\merge-feature.ps1 -DeleteBranch
```

**What it does**:
1. Pulls latest from feature and master
2. Merges feature into master (with --no-ff)
3. Pushes master
4. Optionally deletes feature branch

**Use when**: Testing complete, ready to merge

---

## 🎯 Workflow Scenarios

### Scenario 1: Daily Development

```powershell
# Morning - start fresh
.\scripts\pull-safe.ps1

# Check status before pushing
.\scripts\sync-status.ps1

# Push your work
.\scripts\push-feature.ps1 -Message "feat: add dashboard"
```

### Scenario 2: Claude Code Session

```powershell
# After Claude creates files in MANUAL_COPY_FILES

# 1. Copy files to repos
Copy-Item "MANUAL_COPY_FILES\feature-xyz\contractnest-ui\*" -Destination "contractnest-ui\" -Recurse -Force

# 2. Test locally
cd contractnest-ui && npm run dev

# 3. If testing passes, push
.\scripts\push-feature.ps1 -Message "feat: xyz feature"

# 4. After more testing, merge to master
.\scripts\merge-feature.ps1
```

### Scenario 3: Hotfix to Production

```powershell
# Pull latest
.\scripts\pull-safe.ps1

# Make fix directly on master
git checkout master

# Push directly to main
.\scripts\push-main.ps1 -Message "fix: critical bug"
```

---

## ⚠️ Troubleshooting

### "You have uncommitted changes"

```powershell
# Option 1: Commit them
git add .
git commit -m "WIP: save changes"

# Option 2: Stash them
git stash push -m "temp stash"
# Later: git stash pop

# Option 3: Discard them
git checkout -- .
```

### Submodule on detached HEAD

```powershell
cd [submodule-name]
git checkout main
git pull origin main
cd ..
```

### Merge conflict

```powershell
# See conflicting files
git status

# Fix conflicts in editor, then:
git add [fixed-files]
git commit

# Or abort merge
git merge --abort
```

---

## 📁 Installation

1. Create scripts folder:
```powershell
mkdir "D:\projects\core projects\ContractNest\contractnest-combined\scripts"
```

2. Copy all `.ps1` files to that folder

3. (Optional) Add to .gitignore or commit them:
```powershell
git add scripts/
git commit -m "chore: add git helper scripts"
```

4. Allow PowerShell scripts (run as Admin once):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🔑 Key Points

1. **Always run `sync-status.ps1` first** - Know before you act
2. **Use `push-feature.ps1` during development** - Keeps you on feature branch
3. **Use `push-main.ps1` only for releases** - Goes directly to production
4. **Test before `merge-feature.ps1`** - No undo button
5. **Commit messages matter** - Use `-Message` parameter

---

**Created for ContractNest by Vikuna Technologies**
