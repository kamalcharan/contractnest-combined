# Git Commands - Phase 2 Only

## ⚠️ IMPORTANT
These commands are for **PHASE 2 ONLY** - after user confirms "tested, working"
**NEVER** provide these commands in Phase 1

---

## 📋 Standard Commit Flow

### Step 1: Commit UI Changes (if modified)
```powershell
cd "D:\projects\core projects\ContractNest\contractnest-combined"
cd contractnest-ui
git status
git add .
git commit -m "feat: [descriptive message]"
git push origin main
cd ..
```

### Step 2: Commit API Changes (if modified)
```powershell
cd contractnest-api
git status
git add .
git commit -m "feat: [descriptive message]"
git push origin main
cd ..
```

### Step 3: Commit Edge Changes (if modified)
```powershell
cd contractnest-edge
git status
git add .
git commit -m "feat: [descriptive message]"
git push origin main
cd ..
```

### Step 4: Commit Documentation (if modified)
```powershell
cd ClaudeDocumentation
git status
git add .
git commit -m "docs: [descriptive message]"
git push origin master
cd ..
```

### Step 5: Commit Mobile Changes (if modified)
```powershell
cd ContractNest-Mobile
git status
git add .
git commit -m "feat: [descriptive message]"
git push origin main
cd ..
```

### Step 6: Commit FamilyKnows Changes (if modified)
```powershell
cd FamilyKnows
git status
git add .
git commit -m "feat: [descriptive message]"
git push origin main
cd ..
```

### Step 7: Update Parent Repo References
```powershell
cd "D:\projects\core projects\ContractNest\contractnest-combined"
git add contractnest-ui contractnest-api contractnest-edge ClaudeDocumentation ContractNest-Mobile FamilyKnows
git commit -m "chore: update submodules - [feature description]"
git push origin master
```

### Step 8: Verify Clean State
```powershell
git status
git submodule status
Write-Host "✅ All changes committed!" -ForegroundColor Green
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
- `feat: add contact list pagination`
- `fix: resolve N+1 query in dashboard`
- `docs: update API documentation`
- `chore: update submodules with auth fix`

---

## 🔄 Pull Everything (Fresh Start)
```powershell
cd "D:\projects\core projects\ContractNest\contractnest-combined"

# Pull parent
git checkout master
git pull origin master

# Update all submodules
git submodule update --init --recursive --remote

# Pull each submodule explicitly
cd contractnest-api && git checkout main && git pull origin main && cd ..
cd contractnest-ui && git checkout main && git pull origin main && cd ..
cd contractnest-edge && git checkout main && git pull origin main && cd ..
cd ClaudeDocumentation && git checkout master && git pull origin master && cd ..
cd ContractNest-Mobile && git checkout main && git pull origin main && cd ..
cd FamilyKnows && git checkout main && git pull origin main && cd ..

Write-Host "✅ All repos synced!" -ForegroundColor Green
```

---

## 🛠️ Troubleshooting

### Submodule Not Initialized
```powershell
git submodule update --init --recursive --force
```

### Detached HEAD in Submodule
```powershell
cd [submodule-name]
git checkout main  # or master for ClaudeDocumentation
git pull origin main
cd ..
```

### Reset Submodule to Remote
```powershell
cd [submodule-name]
git fetch origin
git reset --hard origin/main
cd ..
```

### Check All Submodule Status
```powershell
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
| ClaudeDocumentation | `master` |
| ContractNest-Mobile | `main` |
| FamilyKnows | `main` |
