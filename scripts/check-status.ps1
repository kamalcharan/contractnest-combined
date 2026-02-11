# ═══════════════════════════════════════════════════
# CHECK STATUS - Quick overview of all repos
# ═══════════════════════════════════════════════════
# Usage: .\scripts\check-status.ps1

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
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  REPO STATUS CHECK - $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Table header
$fmt = "  {0,-25} {1,-30} {2,-10} {3,-15}"
Write-Host ($fmt -f "REPO", "BRANCH", "CLEAN?", "TAGS") -ForegroundColor White
Write-Host "  $('-' * 80)" -ForegroundColor DarkGray

foreach ($sub in $submodules) {
    $subPath = Join-Path $ROOT_DIR $sub.Name
    if (-not (Test-Path $subPath)) {
        Write-Host ($fmt -f $sub.Name, "(not found)", "-", "-") -ForegroundColor DarkGray
        continue
    }

    Push-Location $subPath

    $branch = git branch --show-current 2>$null
    $status = git status --porcelain 2>$null
    $isClean = if ($status) { "DIRTY" } else { "clean" }
    $cleanColor = if ($status) { "Red" } else { "Green" }

    # Check if on expected branch
    $branchColor = if ($branch -eq $sub.Branch) { "Green" } elseif ($branch -like "feature/*") { "Yellow" } else { "Red" }

    # Get latest stable tag
    $latestTag = git tag -l "stable-*" --sort=-creatordate 2>$null | Select-Object -First 1
    if (-not $latestTag) { $latestTag = "(none)" }

    Write-Host ("  {0,-25} " -f $sub.Name) -NoNewline -ForegroundColor White
    Write-Host ("{0,-30} " -f $branch) -NoNewline -ForegroundColor $branchColor
    Write-Host ("{0,-10} " -f $isClean) -NoNewline -ForegroundColor $cleanColor
    Write-Host ("{0,-15}" -f $latestTag) -ForegroundColor Gray

    if ($status) {
        $changeCount = ($status -split "`n").Count
        Write-Host "    +-- $changeCount file(s) changed" -ForegroundColor DarkGray
    }

    Pop-Location
}

# Parent repo
$parentBranch = git branch --show-current 2>$null
$parentStatus = git status --porcelain 2>$null
$parentClean = if ($parentStatus) { "DIRTY" } else { "clean" }
$parentCleanColor = if ($parentStatus) { "Red" } else { "Green" }
$parentTag = git tag -l "stable-*" --sort=-creatordate 2>$null | Select-Object -First 1
if (-not $parentTag) { $parentTag = "(none)" }

Write-Host "  $('-' * 80)" -ForegroundColor DarkGray
$parentBranchColor = if ($parentBranch -eq "master") { "Green" } else { "Yellow" }
Write-Host ("  {0,-25} " -f "contractnest-combined") -NoNewline -ForegroundColor Cyan
Write-Host ("{0,-30} " -f $parentBranch) -NoNewline -ForegroundColor $parentBranchColor
Write-Host ("{0,-10} " -f $parentClean) -NoNewline -ForegroundColor $parentCleanColor
Write-Host ("{0,-15}" -f $parentTag) -ForegroundColor Gray

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"