# ═══════════════════════════════════════════════════════════════════
# PUSH MAIN - Push all changes to main branches (Release workflow)
# ═══════════════════════════════════════════════════════════════════

param(
    [string]$Message = "",
    [switch]$Force = $false
)

$ErrorActionPreference = "Continue"

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

$pushed = @()
$skipped = @()
$errors = @()

function Write-Header($text) {
    Write-Host ""
    Write-Host "=======================================================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "=======================================================================" -ForegroundColor Cyan
}

function Write-Step($step, $text) {
    Write-Host ""
    Write-Host "  STEP $step : $text" -ForegroundColor Yellow
    Write-Host "  -----------------------------------------------------------------------" -ForegroundColor DarkGray
}

function Write-Success($text) {
    Write-Host "    [OK] $text" -ForegroundColor Green
}

function Write-Skip($text) {
    Write-Host "    [SKIP] $text" -ForegroundColor Gray
}

function Write-Err($text) {
    Write-Host "    [ERROR] $text" -ForegroundColor Red
    $script:errors += $text
}

function Get-CommitMessage($repoName) {
    if ($Message) {
        return $Message
    }
    return "chore: update $repoName"
}

function Push-Repo($path, $name, $branch) {
    Push-Location $path
    
    $currentBranch = git branch --show-current
    
    if ($currentBranch -ne $branch) {
        Write-Host "    Switching from $currentBranch to $branch..." -ForegroundColor Gray
        git checkout $branch 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Err "$name : Failed to checkout $branch"
            Pop-Location
            return $false
        }
    }
    
    git pull origin $branch 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "$name : Failed to pull from $branch"
        Pop-Location
        return $false
    }
    
    $status = git status --porcelain
    if (-not $status) {
        Write-Skip "$name : No changes to commit"
        $script:skipped += $name
        Pop-Location
        return $true
    }
    
    git add .
    $commitMsg = Get-CommitMessage $name
    git commit -m $commitMsg
    if ($LASTEXITCODE -ne 0) {
        Write-Err "$name : Failed to commit"
        Pop-Location
        return $false
    }
    
    git push origin $branch
    if ($LASTEXITCODE -ne 0) {
        Write-Err "$name : Failed to push to $branch"
        Pop-Location
        return $false
    }
    
    Write-Success "$name : Pushed to $branch"
    $script:pushed += $name
    Pop-Location
    return $true
}

# ═══════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════

if (-not (Test-Path $ROOT_DIR)) {
    Write-Host "ERROR: Root directory not found: $ROOT_DIR" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Set-Location $ROOT_DIR

Write-Header "PUSH TO MAIN - Release Workflow"

Write-Host "  Root: $ROOT_DIR" -ForegroundColor Gray
Write-Host "  Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
if ($Message) {
    Write-Host "  Commit Message: $Message" -ForegroundColor Gray
}

Write-Host ""
Write-Host "  Running safety checks..." -ForegroundColor Cyan

$localChanges = git status --porcelain
$hasLocalChanges = $localChanges.Length -gt 0

git fetch origin master 2>$null
$behind = git rev-list --count "HEAD..origin/master" 2>$null
$isRemoteAhead = [int]$behind -gt 0

if ($hasLocalChanges -and $isRemoteAhead) {
    Write-Host ""
    Write-Host "  =======================================================================" -ForegroundColor Red
    Write-Host "  STOP - CONFLICT RISK DETECTED!" -ForegroundColor Red
    Write-Host "  =======================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  You have:" -ForegroundColor Yellow
    Write-Host "    - Uncommitted local changes" -ForegroundColor White
    Write-Host "    - Remote is $behind commit(s) ahead" -ForegroundColor White
    Write-Host ""
    Write-Host "  If you pull now, you may get merge conflicts or lose changes." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Option 1: Commit first (SAFEST)" -ForegroundColor Green
    Write-Host "    git add ." -ForegroundColor Gray
    Write-Host "    git commit -m 'your message'" -ForegroundColor Gray
    Write-Host "    git pull origin master" -ForegroundColor Gray
    Write-Host "    .\scripts\push-main.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Option 2: Force continue (RISKY)" -ForegroundColor Red
    Write-Host "    .\scripts\push-main.ps1 -Force" -ForegroundColor Gray
    Write-Host ""
    
    if (-not $Force) {
        Write-Host "  Aborted for safety. Use -Force to override." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    } else {
        Write-Host "  -Force flag detected. Proceeding with caution..." -ForegroundColor Yellow
    }
} elseif ($hasLocalChanges) {
    Write-Host "  Local changes detected (remote is up to date) - Safe to proceed" -ForegroundColor Green
} elseif ($isRemoteAhead) {
    Write-Host "  Remote is $behind commit(s) ahead - will pull first" -ForegroundColor Yellow
} else {
    Write-Host "  All clear - no conflicts detected" -ForegroundColor Green
}

# Check submodules for conflicts
$submoduleConflicts = @()

foreach ($sub in $submodules) {
    $subPath = Join-Path $ROOT_DIR $sub.Name
    if (Test-Path $subPath) {
        Push-Location $subPath
        
        $subLocalChanges = git status --porcelain
        $subHasChanges = $subLocalChanges.Length -gt 0
        
        git fetch origin $sub.Branch 2>$null
        $subBehind = git rev-list --count "HEAD..origin/$($sub.Branch)" 2>$null
        $subIsAhead = [int]$subBehind -gt 0
        
        if ($subHasChanges -and $subIsAhead) {
            $submoduleConflicts += $sub.Name
        }
        
        Pop-Location
    }
}

if ($submoduleConflicts.Count -gt 0) {
    Write-Host ""
    Write-Host "  Submodules with potential conflicts:" -ForegroundColor Yellow
    foreach ($conflict in $submoduleConflicts) {
        Write-Host "    - $conflict (has local changes + remote is ahead)" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "  Consider committing changes in these submodules first." -ForegroundColor Yellow
    
    if (-not $Force) {
        $subConfirm = Read-Host "  Continue anyway? (y/N)"
        if ($subConfirm -ne "y" -and $subConfirm -ne "Y") {
            Write-Host "  Aborted." -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 0
        }
    }
}

# Confirmation prompt
Write-Host ""
Write-Host "  WARNING: This will push directly to main/master branches!" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "  Are you sure? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "  Aborted." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 0
}

# Step 1: Push each submodule
Write-Step 1 "Pushing submodules"

foreach ($sub in $submodules) {
    $subPath = Join-Path $ROOT_DIR $sub.Name
    
    if (-not (Test-Path $subPath)) {
        Write-Err "$($sub.Name): Directory not found"
        continue
    }
    
    Write-Host ""
    Write-Host "  [$($sub.Name)]" -ForegroundColor White
    Push-Repo $subPath $sub.Name $sub.Branch
}

# Step 2: Update and push parent repo
Write-Step 2 "Updating parent repo"

Set-Location $ROOT_DIR

$currentBranch = git branch --show-current
if ($currentBranch -ne "master") {
    Write-Host "    Switching from $currentBranch to master..." -ForegroundColor Gray
    git checkout master
}

git pull origin master

# Add all submodule references
foreach ($sub in $submodules) {
    git add $sub.Name 2>$null
}

# Add any other changes
git add .

$status = git status --porcelain
if ($status) {
    $parentMsg = if ($Message) { $Message } else { "chore: update submodule references" }
    git commit -m $parentMsg
    git push origin master
    
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Parent repo: Failed to push"
    } else {
        Write-Success "Parent repo: Pushed to master"
        $pushed += "contractnest-combined"
    }
} else {
    Write-Skip "Parent repo: No changes to commit"
    $skipped += "contractnest-combined"
}

# Summary
Write-Header "PUSH COMPLETE"

if ($pushed.Count -gt 0) {
    Write-Host "  Pushed ($($pushed.Count)):" -ForegroundColor Green
    foreach ($p in $pushed) {
        Write-Host "    - $p" -ForegroundColor White
    }
}

if ($skipped.Count -gt 0) {
    Write-Host "  Skipped - No changes ($($skipped.Count)):" -ForegroundColor Gray
    foreach ($s in $skipped) {
        Write-Host "    - $s" -ForegroundColor DarkGray
    }
}

if ($errors.Count -gt 0) {
    Write-Host "  Errors ($($errors.Count)):" -ForegroundColor Red
    foreach ($e in $errors) {
        Write-Host "    - $e" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"