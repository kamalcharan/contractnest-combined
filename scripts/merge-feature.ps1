# ═══════════════════════════════════════════════════════════════════
# MERGE FEATURE - Merge feature branch to master after testing
# ═══════════════════════════════════════════════════════════════════
# Usage: .\merge-feature.ps1
# Usage: .\merge-feature.ps1 -Branch "feature/nav-tracking"
# Usage: .\merge-feature.ps1 -DeleteBranch
# 
# Use this AFTER testing is complete to merge your feature to master
# ═══════════════════════════════════════════════════════════════════

param(
    [string]$Branch = "",
    [switch]$DeleteBranch = $false
)

$ROOT_DIR = "D:\projects\core projects\ContractNest\contractnest-combined"

$submodules = @(
    @{ Name = "contractnest-api"; Branch = "main" },
    @{ Name = "contractnest-ui"; Branch = "main" },
    @{ Name = "contractnest-edge"; Branch = "main" },
    @{ Name = "ClaudeDocumentation"; Branch = "master" },
    @{ Name = "ContractNest-Mobile"; Branch = "main" },
    @{ Name = "FamilyKnows"; Branch = "main" },
    @{ Name = "FK-New"; Branch = "main" }
)

function Write-Header($text) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host " $text" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
}

function Write-Step($step, $text) {
    Write-Host ""
    Write-Host " STEP $step : $text" -ForegroundColor Yellow
    Write-Host " ─────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
}

function Write-Success($text) {
    Write-Host " ✅ $text" -ForegroundColor Green
}

function Write-Error($text) {
    Write-Host " ❌ $text" -ForegroundColor Red
}

function Write-Info($text) {
    Write-Host " ℹ️  $text" -ForegroundColor Gray
}

function Write-Warning($text) {
    Write-Host " ⚠️  $text" -ForegroundColor Yellow
}

# ═══════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════

Set-Location $ROOT_DIR

# Determine feature branch
$featureBranch = $Branch
if (-not $featureBranch) {
    $featureBranch = git branch --show-current
}

Write-Header "MERGE FEATURE TO MASTER"
Write-Host " Root: $ROOT_DIR" -ForegroundColor Gray
Write-Host " Feature Branch: $featureBranch" -ForegroundColor Cyan
Write-Host " Target Branch: master" -ForegroundColor Green

# Validate
if ($featureBranch -eq "master") {
    Write-Error "Already on master. Nothing to merge."
    exit 1
}

# Confirmation
Write-Host ""
Write-Host " ⚠️  This will merge '$featureBranch' into 'master'" -ForegroundColor Yellow
$confirm = Read-Host " Have you tested everything? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host " Aborted. Test your changes first!" -ForegroundColor Red
    exit 0
}

# Step 1: Ensure everything is committed (parent repo)
Write-Step 1 "Checking for uncommitted changes in parent repo"

$status = git status --porcelain
if ($status) {
    Write-Error "You have uncommitted changes in parent repo. Commit or stash them first."
    Write-Host ""
    Write-Host " Uncommitted files:" -ForegroundColor Yellow
    $status | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkGray }
    exit 1
}
Write-Success "Parent repo working directory clean"

# Step 2: Check all submodules for uncommitted changes
Write-Step 2 "Checking submodules for uncommitted changes"

$submoduleIssues = @()

foreach ($sub in $submodules) {
    $subPath = Join-Path $ROOT_DIR $sub.Name
    
    if (-not (Test-Path $subPath)) {
        Write-Warning "$($sub.Name): Directory not found (skipping)"
        continue
    }
    
    Push-Location $subPath
    
    $subStatus = git status --porcelain
    if ($subStatus) {
        $submoduleIssues += $sub.Name
        Write-Error "$($sub.Name) has uncommitted changes"
    } else {
        Write-Success "$($sub.Name): Clean"
    }
    
    Pop-Location
}

if ($submoduleIssues.Count -gt 0) {
    Write-Host ""
    Write-Error "Cannot merge with uncommitted submodule changes!"
    Write-Host ""
    Write-Host " Submodules with issues:" -ForegroundColor Yellow
    foreach ($issue in $submoduleIssues) {
        Write-Host "   - $issue" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host " Options:" -ForegroundColor Yellow
    Write-Host "   1. Run .\push-feature.ps1 to commit and push all changes" -ForegroundColor Gray
    Write-Host "   2. Manually commit changes in each submodule" -ForegroundColor Gray
    exit 1
}

Write-Success "All submodules clean"

# Step 3: Pull latest from feature branch
Write-Step 3 "Pulling latest from $featureBranch"

git checkout $featureBranch
git pull origin $featureBranch

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to pull $featureBranch"
    exit 1
}
Write-Success "Feature branch updated"

# Step 4: Switch to master and pull
Write-Step 4 "Switching to master and pulling latest"

git checkout master
git pull origin master

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to pull master"
    exit 1
}
Write-Success "Master branch updated"

# Step 5: Merge feature branch
Write-Step 5 "Merging $featureBranch into master"

git merge $featureBranch --no-ff -m "Merge branch '$featureBranch' into master"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Error "Merge conflict detected!"
    Write-Host ""
    Write-Host " To resolve:" -ForegroundColor Yellow
    Write-Host "   1. Fix conflicts in the listed files" -ForegroundColor Gray
    Write-Host "   2. git add <resolved-files>" -ForegroundColor Gray
    Write-Host "   3. git commit" -ForegroundColor Gray
    Write-Host ""
    Write-Host " Or to abort the merge:" -ForegroundColor Yellow
    Write-Host "   git merge --abort" -ForegroundColor Gray
    exit 1
}
Write-Success "Merged successfully"

# Step 6: Push to master
Write-Step 6 "Pushing to master"

git push origin master

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to push to master"
    exit 1
}
Write-Success "Pushed to master"

# Step 7: Optionally delete feature branch
if ($DeleteBranch) {
    Write-Step 7 "Deleting feature branch"
    
    git branch -d $featureBranch
    Write-Info "Deleted local branch: $featureBranch"
    
    git push origin --delete $featureBranch 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Info "Deleted remote branch: $featureBranch"
    }
    
    Write-Success "Feature branch cleaned up"
} else {
    Write-Step 7 "Keeping feature branch"
    Write-Info "To delete later: .\merge-feature.ps1 -Branch $featureBranch -DeleteBranch"
}

# Summary
Write-Header "MERGE COMPLETE"

Write-Host " ✅ '$featureBranch' has been merged into 'master'" -ForegroundColor Green
Write-Host ""
Write-Host " Current state:" -ForegroundColor White
Write-Host "   - Branch: master" -ForegroundColor Gray
Write-Host "   - All changes pushed to remote" -ForegroundColor Gray
Write-Host "   - All submodules verified clean" -ForegroundColor Gray

if (-not $DeleteBranch) {
    Write-Host ""
    Write-Host " 📌 Optional cleanup:" -ForegroundColor Yellow
    Write-Host "    .\merge-feature.ps1 -Branch $featureBranch -DeleteBranch" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan