# ═══════════════════════════════════════════════════════════════════
# PULL SAFE - Pull all repos safely without unexpected updates
# ═══════════════════════════════════════════════════════════════════
# Usage: .\pull-safe.ps1
# This pulls the tracked commit for each submodule, not latest remote
# ═══════════════════════════════════════════════════════════════════

$ROOT_DIR = "D:\projects\core projects\ContractNest\contractnest-combined"

$submodules = @(
    @{ Name = "contractnest-api"; Branch = "main" },
    @{ Name = "contractnest-ui"; Branch = "main" },
    @{ Name = "contractnest-edge"; Branch = "main" },
    @{ Name = "ClaudeDocumentation"; Branch = "master" },
    @{ Name = "ContractNest-Mobile"; Branch = "main" },
    @{ Name = "FamilyKnows"; Branch = "main" }
)

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

function Write-Error($text) {
    Write-Host " ❌ $text" -ForegroundColor Red
    $script:errors += $text
}

function Write-Info($text) {
    Write-Host " ℹ️  $text" -ForegroundColor Gray
}

# ═══════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════

Write-Header "SAFE PULL - All Repositories"
Write-Host " Root: $ROOT_DIR" -ForegroundColor Gray
Write-Host " Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

Set-Location $ROOT_DIR

# Step 1: Check for uncommitted changes
Write-Step 1 "Checking for uncommitted changes"

$hasLocalChanges = $false
$status = git status --porcelain
if ($status) {
    Write-Error "Parent repo has uncommitted changes. Commit or stash them first."
    $hasLocalChanges = $true
}

foreach ($sub in $submodules) {
    $subPath = Join-Path $ROOT_DIR $sub.Name
    if (Test-Path $subPath) {
        Push-Location $subPath
        $subStatus = git status --porcelain
        if ($subStatus) {
            Write-Error "$($sub.Name) has uncommitted changes"
            $hasLocalChanges = $true
        }
        Pop-Location
    }
}

if ($hasLocalChanges) {
    Write-Host ""
    Write-Host " ⚠️  Cannot pull with uncommitted changes!" -ForegroundColor Red
    Write-Host " Options:" -ForegroundColor Yellow
    Write-Host "   1. Commit your changes: git add . && git commit -m 'WIP'" -ForegroundColor Gray
    Write-Host "   2. Stash your changes: git stash" -ForegroundColor Gray
    Write-Host "   3. Discard changes: git checkout -- ." -ForegroundColor Gray
    exit 1
}

Write-Success "No uncommitted changes found"

# Step 2: Pull parent repo
Write-Step 2 "Pulling parent repo (contractnest-combined)"

$currentBranch = git branch --show-current
Write-Info "Current branch: $currentBranch"

git fetch origin
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to fetch parent repo"
} else {
    git pull origin $currentBranch
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to pull parent repo"
    } else {
        Write-Success "Parent repo pulled"
    }
}

# Step 3: Initialize submodules (if not already)
Write-Step 3 "Initializing submodules"

git submodule update --init --recursive
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to initialize submodules"
} else {
    Write-Success "Submodules initialized"
}

# Step 4: Update each submodule to tracked commit AND pull latest
Write-Step 4 "Updating submodules"

foreach ($sub in $submodules) {
    $subPath = Join-Path $ROOT_DIR $sub.Name
    
    if (-not (Test-Path $subPath)) {
        Write-Error "$($sub.Name): Directory not found"
        continue
    }
    
    Write-Host ""
    Write-Host " 📦 $($sub.Name)" -ForegroundColor White
    
    Push-Location $subPath
    
    # Checkout correct branch
    $currentBranch = git branch --show-current
    if ($currentBranch -ne $sub.Branch) {
        Write-Info "Switching from $currentBranch to $($sub.Branch)"
        git checkout $sub.Branch 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Error "$($sub.Name): Failed to checkout $($sub.Branch)"
            Pop-Location
            continue
        }
    }
    
    # Fetch and pull
    git fetch origin
    $pullResult = git pull origin $sub.Branch 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "$($sub.Name): Failed to pull"
    } elseif ($pullResult -match "Already up to date") {
        Write-Success "$($sub.Name): Already up to date"
    } else {
        Write-Success "$($sub.Name): Updated"
    }
    
    Pop-Location
}

# Step 5: Verify final state
Write-Step 5 "Verifying final state"

Set-Location $ROOT_DIR
$submoduleStatus = git submodule status

Write-Host ""
Write-Host " Submodule Status:" -ForegroundColor White
foreach ($line in $submoduleStatus -split "`n") {
    if ($line.Trim()) {
        if ($line.StartsWith("+")) {
            Write-Host "   ⚠️  $line" -ForegroundColor Yellow
        } elseif ($line.StartsWith("-")) {
            Write-Host "   ❌ $line" -ForegroundColor Red
        } else {
            Write-Host "   ✅ $line" -ForegroundColor Green
        }
    }
}

# Summary
Write-Header "PULL COMPLETE"

if ($errors.Count -gt 0) {
    Write-Host " ⚠️  Completed with $($errors.Count) error(s):" -ForegroundColor Yellow
    foreach ($err in $errors) {
        Write-Host "    - $err" -ForegroundColor Red
    }
} else {
    Write-Host " ✅ All repositories pulled successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
