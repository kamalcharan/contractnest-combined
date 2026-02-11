# ═══════════════════════════════════════════════════
# ROLLBACK TO TAG - Return all repos to a tagged state
# ═══════════════════════════════════════════════════
# Usage: .\scripts\rollback-to-tag.ps1 -TagName "stable-20260211-1430"

param(
    [Parameter(Mandatory=$true)]
    [string]$TagName,
    [switch]$DryRun = $false
)

$ROOT_DIR = "D:\projects\core projects\ContractNest\contractnest-combined"

if (-not (Test-Path $ROOT_DIR)) {
    Write-Host "ERROR: Root directory not found: $ROOT_DIR" -ForegroundColor Red
    exit 1
}

Set-Location $ROOT_DIR

$submodules = @(
    @{ Name = "contractnest-api"; Branch = "main" },
    @{ Name = "contractnest-ui"; Branch = "main" },
    @{ Name = "contractnest-edge"; Branch = "main" },
    @{ Name = "ClaudeDocumentation"; Branch = "master" },
    @{ Name = "ContractNest-Mobile"; Branch = "main" },
    @{ Name = "FamilyKnows"; Branch = "main" }
)

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Red
Write-Host "  ROLLBACK TO: $TagName" -ForegroundColor Red
if ($DryRun) {
    Write-Host "  MODE: DRY RUN (no changes will be made)" -ForegroundColor Yellow
}
Write-Host "=======================================================" -ForegroundColor Red
Write-Host ""

# First, check which repos have this tag
Write-Host "  Checking tag availability..." -ForegroundColor Cyan
$available = @()
$missing = @()

foreach ($sub in $submodules) {
    $subPath = Join-Path $ROOT_DIR $sub.Name
    if (-not (Test-Path $subPath)) { continue }
    Push-Location $subPath
    $tagExists = git tag -l $TagName
    if ($tagExists) {
        $available += $sub.Name
        Write-Host "    [FOUND] $($sub.Name)" -ForegroundColor Green
    } else {
        $missing += $sub.Name
        Write-Host "    [MISSING] $($sub.Name) - tag not found" -ForegroundColor Yellow
    }
    Pop-Location
}

# Check parent
$parentTagExists = git tag -l $TagName
if ($parentTagExists) {
    $available += "contractnest-combined"
    Write-Host "    [FOUND] contractnest-combined" -ForegroundColor Green
} else {
    $missing += "contractnest-combined"
    Write-Host "    [MISSING] contractnest-combined - tag not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Will rollback: $($available.Count) repos" -ForegroundColor White
if ($missing.Count -gt 0) {
    Write-Host "  Will skip: $($missing.Count) repos (tag not found)" -ForegroundColor Yellow
}
Write-Host ""

if (-not $DryRun) {
    Write-Host "  +=============================================+" -ForegroundColor Red
    Write-Host "  |  WARNING: This will FORCE PUSH to remote!   |" -ForegroundColor Red
    Write-Host "  |  All commits after $TagName will be LOST.   |" -ForegroundColor Red
    Write-Host "  |                                             |" -ForegroundColor Red
    Write-Host "  |  Database migrations CANNOT be auto-rolled. |" -ForegroundColor Red
    Write-Host "  |  Run DOWN migration SQL manually if needed. |" -ForegroundColor Red
    Write-Host "  +=============================================+" -ForegroundColor Red
    Write-Host ""
    $confirm = Read-Host "  Type 'ROLLBACK' to confirm (anything else to abort)"
    if ($confirm -ne "ROLLBACK") {
        Write-Host "  Aborted." -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 0
    }
}

$rolled = @()
$errors = @()

foreach ($sub in $submodules) {
    $subPath = Join-Path $ROOT_DIR $sub.Name
    if (-not (Test-Path $subPath)) { continue }

    Push-Location $subPath
    $tagExists = git tag -l $TagName
    if (-not $tagExists) {
        Pop-Location
        continue
    }

    Write-Host ""
    Write-Host "  Rolling back $($sub.Name)..." -ForegroundColor Yellow

    if ($DryRun) {
        $currentHash = git rev-parse HEAD
        $tagHash = git rev-parse $TagName
        $diffCount = git rev-list --count "$TagName..HEAD"
        Write-Host "    Current: $($currentHash.Substring(0,8))" -ForegroundColor Gray
        Write-Host "    Target:  $($tagHash.Substring(0,8))" -ForegroundColor Gray
        $diffColor = if ([int]$diffCount -gt 0) { "Yellow" } else { "Green" }
        Write-Host "    Commits to undo: $diffCount" -ForegroundColor $diffColor
        $rolled += $sub.Name
    } else {
        git checkout $sub.Branch 2>$null
        git reset --hard $TagName
        git push origin $sub.Branch --force 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    [OK] Rolled back and force pushed" -ForegroundColor Green
            $rolled += $sub.Name
        } else {
            Write-Host "    [ERROR] Force push failed - push manually" -ForegroundColor Red
            Write-Host "    Run: git push origin $($sub.Branch) --force" -ForegroundColor Gray
            $errors += $sub.Name
        }
    }

    Pop-Location
}

# Rollback parent
if ($parentTagExists) {
    Write-Host ""
    Write-Host "  Rolling back contractnest-combined..." -ForegroundColor Yellow
    if ($DryRun) {
        $diffCount = git rev-list --count "$TagName..HEAD"
        $diffColor = if ([int]$diffCount -gt 0) { "Yellow" } else { "Green" }
        Write-Host "    Commits to undo: $diffCount" -ForegroundColor $diffColor
    } else {
        git checkout master
        git reset --hard $TagName
        git push origin master --force 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    [OK] Rolled back and force pushed" -ForegroundColor Green
        } else {
            Write-Host "    [ERROR] Force push failed" -ForegroundColor Red
        }
    }
}

Write-Host ""
$summaryColor = if ($DryRun) { "Yellow" } else { "Green" }
Write-Host "=======================================================" -ForegroundColor $summaryColor
if ($DryRun) {
    Write-Host "  DRY RUN COMPLETE - No changes made" -ForegroundColor Yellow
    Write-Host "  Run without -DryRun to execute rollback" -ForegroundColor Yellow
} else {
    Write-Host "  ROLLBACK COMPLETE" -ForegroundColor Green
    Write-Host "  All repos are now at: $TagName" -ForegroundColor Green
    if ($errors.Count -gt 0) {
        Write-Host "  Errors in: $($errors -join ', ')" -ForegroundColor Red
    }
}
Write-Host "" -ForegroundColor White
Write-Host "  REMINDER: Database migrations need manual rollback." -ForegroundColor Yellow
Write-Host "  Check for DOWN migration SQL files in:" -ForegroundColor Yellow
Write-Host "  contractnest-edge/supabase/migrations/*_DOWN.sql" -ForegroundColor Gray
Write-Host "=======================================================" -ForegroundColor $summaryColor
Write-Host ""
Read-Host "Press Enter to exit"