# ═══════════════════════════════════════════════════
# CREATE FEATURE BRANCH - Across all submodules
# ═══════════════════════════════════════════════════
# Usage: .\scripts\create-feature-branch.ps1 -BranchName "feature/p0-nomenclature"

param(
    [Parameter(Mandatory=$true)]
    [string]$BranchName
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
    @{ Name = "ClaudeDocumentation"; Branch = "master" }
)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  CREATE FEATURE BRANCH: $BranchName" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Safety: check all repos are clean
$dirty = @()
foreach ($sub in $submodules) {
    $subPath = Join-Path $ROOT_DIR $sub.Name
    if (-not (Test-Path $subPath)) { continue }
    Push-Location $subPath
    $status = git status --porcelain
    if ($status) { $dirty += $sub.Name }
    Pop-Location
}

$parentStatus = git status --porcelain
if ($parentStatus) { $dirty += "contractnest-combined" }

if ($dirty.Count -gt 0) {
    Write-Host "  WARNING: These repos have uncommitted changes:" -ForegroundColor Yellow
    foreach ($d in $dirty) {
        Write-Host "    - $d" -ForegroundColor Red
    }
    Write-Host ""
    $confirm = Read-Host "  Continue anyway? Changes will carry to the new branch. (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "  Aborted. Commit or stash changes first." -ForegroundColor Red
        exit 0
    }
}

$created = @()
$errors = @()

foreach ($sub in $submodules) {
    $subPath = Join-Path $ROOT_DIR $sub.Name
    if (-not (Test-Path $subPath)) {
        Write-Host "  [SKIP] $($sub.Name) — not found" -ForegroundColor Gray
        continue
    }

    Push-Location $subPath

    # Ensure we're on the latest main/master
    git checkout $sub.Branch 2>$null
    git pull origin $sub.Branch 2>$null

    # Create branch
    git checkout -b $BranchName 2>$null
    if ($LASTEXITCODE -eq 0) {
        git push -u origin $BranchName 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] $($sub.Name) → $BranchName (pushed)" -ForegroundColor Green
        } else {
            Write-Host "  [OK] $($sub.Name) → $BranchName (local only — push manually)" -ForegroundColor Yellow
        }
        $created += $sub.Name
    } else {
        Write-Host "  [ERROR] $($sub.Name) — branch may already exist" -ForegroundColor Red
        # Try switching to existing branch
        git checkout $BranchName 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "         Switched to existing branch $BranchName" -ForegroundColor Yellow
            $created += "$($sub.Name) (existing)"
        } else {
            $errors += $sub.Name
        }
    }

    Pop-Location
}

# Create branch in parent repo
git checkout -b $BranchName 2>$null
if ($LASTEXITCODE -eq 0) {
    git push -u origin $BranchName 2>$null
    Write-Host "  [OK] contractnest-combined → $BranchName" -ForegroundColor Green
    $created += "contractnest-combined"
} else {
    git checkout $BranchName 2>$null
    Write-Host "  [OK] contractnest-combined → $BranchName (existing)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  BRANCH CREATED: $BranchName" -ForegroundColor Green
Write-Host "  Repos: $($created.Count) ready" -ForegroundColor White
if ($errors.Count -gt 0) {
    Write-Host "  Errors: $($errors -join ', ')" -ForegroundColor Red
}
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "  1. Start Claude Code session" -ForegroundColor White
Write-Host "  2. Make changes on this branch" -ForegroundColor White
Write-Host "  3. Test thoroughly" -ForegroundColor White
Write-Host "  4. Merge: edge → api → ui → docs → parent" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to continue"