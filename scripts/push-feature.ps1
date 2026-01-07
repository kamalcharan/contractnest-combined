# ═══════════════════════════════════════════════════════════════════
# PUSH FEATURE - Push changes while staying on current branches
# ═══════════════════════════════════════════════════════════════════
# Usage: .\push-feature.ps1
# Usage: .\push-feature.ps1 -Message "feat: add user dashboard"
# 
# This script:
# - Keeps you on your current branch (doesn't switch to main)
# - Pushes submodules to their respective main branches
# - Pushes parent repo to your current feature branch
# ═══════════════════════════════════════════════════════════════════

param(
    [string]$Message = "",
    [switch]$DryRun = $false
)

$ROOT_DIR = "D:\projects\core projects\ContractNest\contractnest-combined"

$submodules = @(
    @{ Name = "contractnest-api"; Branch = "main" },
    @{ Name = "contractnest-ui"; Branch = "main" },
    @{ Name = "contractnest-edge"; Branch = "main" },
    @{ Name = "ClaudeDocumentation"; Branch = "master" },
    @{ Name = "ContractNest-Mobile"; Branch = "main" },
    @{ Name = "FamilyKnows"; Branch = "main" }
)

$pushed = @()
$skipped = @()
$errors = @()

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

function Write-Skip($text) {
    Write-Host " ⏭️  $text" -ForegroundColor Gray
}

function Write-Error($text) {
    Write-Host " ❌ $text" -ForegroundColor Red
    $script:errors += $text
}

function Write-DryRun($text) {
    Write-Host " 🔍 [DRY-RUN] $text" -ForegroundColor Magenta
}

function Push-Submodule($path, $name, $targetBranch) {
    Push-Location $path
    
    $currentBranch = git branch --show-current
    
    # Check for changes
    $status = git status --porcelain
    if (-not $status) {
        Write-Skip "$name : No changes (on $currentBranch)"
        $script:skipped += $name
        Pop-Location
        return $true
    }
    
    # If on feature branch in submodule, need to handle differently
    if ($currentBranch -ne $targetBranch) {
        Write-Host "    ⚠️  Currently on '$currentBranch', switching to '$targetBranch'..." -ForegroundColor Yellow
        
        # Stash changes
        git stash push -m "temp-stash-for-feature-push"
        
        # Switch and pull
        git checkout $targetBranch
        git pull origin $targetBranch
        
        # Apply stash
        git stash pop
    } else {
        git pull origin $targetBranch 2>$null
    }
    
    if ($DryRun) {
        Write-DryRun "$name : Would commit and push to $targetBranch"
        Write-Host "    Changes:" -ForegroundColor Gray
        $status | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
        Pop-Location
        return $true
    }
    
    # Stage and commit
    git add .
    $commitMsg = if ($Message) { $Message } else { "chore: update $name" }
    git commit -m $commitMsg
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "$name : Failed to commit"
        Pop-Location
        return $false
    }
    
    # Push
    git push origin $targetBranch
    if ($LASTEXITCODE -ne 0) {
        Write-Error "$name : Failed to push to $targetBranch"
        Pop-Location
        return $false
    }
    
    Write-Success "$name : Pushed to $targetBranch"
    $script:pushed += $name
    Pop-Location
    return $true
}

# ═══════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════

Set-Location $ROOT_DIR

# Get current branch of parent repo
$parentBranch = git branch --show-current

Write-Header "PUSH FEATURE - Stay on Current Branch"
Write-Host " Root: $ROOT_DIR" -ForegroundColor Gray
Write-Host " Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host " Parent Branch: $parentBranch" -ForegroundColor Cyan
if ($Message) {
    Write-Host " Commit Message: $Message" -ForegroundColor Gray
}
if ($DryRun) {
    Write-Host " Mode: DRY-RUN (no actual changes)" -ForegroundColor Magenta
}

# Show what will happen
Write-Host ""
Write-Host " 📋 Plan:" -ForegroundColor White
Write-Host "    - Submodules → Push to their main/master branches" -ForegroundColor Gray
Write-Host "    - Parent repo → Push to '$parentBranch'" -ForegroundColor Gray

# Step 1: Push each submodule
Write-Step 1 "Pushing submodules to main branches"

foreach ($sub in $submodules) {
    $subPath = Join-Path $ROOT_DIR $sub.Name
    
    if (-not (Test-Path $subPath)) {
        Write-Error "$($sub.Name): Directory not found"
        continue
    }
    
    Write-Host ""
    Write-Host " 📦 $($sub.Name)" -ForegroundColor White
    Push-Submodule $subPath $sub.Name $sub.Branch
}

# Step 2: Update parent repo (stay on current branch)
Write-Step 2 "Updating parent repo (branch: $parentBranch)"

Set-Location $ROOT_DIR

# Add all submodule references
foreach ($sub in $submodules) {
    git add $sub.Name 2>$null
}

# Add any other changes in parent
git add .

$status = git status --porcelain
if ($status) {
    if ($DryRun) {
        Write-DryRun "Parent repo: Would commit and push to $parentBranch"
        Write-Host "    Changes:" -ForegroundColor Gray
        $status | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
    } else {
        $parentMsg = if ($Message) { $Message } else { "chore: update submodule references" }
        git commit -m $parentMsg
        
        # Create remote branch if it doesn't exist
        git push -u origin $parentBranch
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Parent repo: Failed to push to $parentBranch"
        } else {
            Write-Success "Parent repo: Pushed to $parentBranch"
            $pushed += "contractnest-combined"
        }
    }
} else {
    Write-Skip "Parent repo: No changes to commit"
    $skipped += "contractnest-combined"
}

# Summary
Write-Header "PUSH COMPLETE"

if ($DryRun) {
    Write-Host " 🔍 This was a DRY-RUN. No changes were made." -ForegroundColor Magenta
    Write-Host "    Run without -DryRun to execute." -ForegroundColor Gray
}

if ($pushed.Count -gt 0) {
    Write-Host " ✅ Pushed ($($pushed.Count)):" -ForegroundColor Green
    foreach ($p in $pushed) {
        Write-Host "    - $p" -ForegroundColor White
    }
}

if ($skipped.Count -gt 0) {
    Write-Host " ⏭️  Skipped ($($skipped.Count)):" -ForegroundColor Gray
    foreach ($s in $skipped) {
        Write-Host "    - $s" -ForegroundColor DarkGray
    }
}

if ($errors.Count -gt 0) {
    Write-Host " ❌ Errors ($($errors.Count)):" -ForegroundColor Red
    foreach ($e in $errors) {
        Write-Host "    - $e" -ForegroundColor Red
    }
}

# Next steps
if (-not $DryRun -and $parentBranch -ne "master") {
    Write-Host ""
    Write-Host " 📌 Next Steps:" -ForegroundColor Yellow
    Write-Host "    1. Test your changes locally" -ForegroundColor Gray
    Write-Host "    2. When ready to release, merge to master:" -ForegroundColor Gray
    Write-Host "       git checkout master" -ForegroundColor DarkGray
    Write-Host "       git merge $parentBranch" -ForegroundColor DarkGray
    Write-Host "       git push origin master" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
