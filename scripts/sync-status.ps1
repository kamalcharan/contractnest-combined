# ═══════════════════════════════════════════════════════════════════
# SYNC STATUS - Check status of all repos before pushing/pulling
# ═══════════════════════════════════════════════════════════════════
# Usage: .\sync-status.ps1
# Run this BEFORE push or pull to see what's changed
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

function Write-Header($text) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host " $text" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
}

function Write-SubHeader($text) {
    Write-Host ""
    Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host " $text" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
}

function Get-RepoStatus($path, $expectedBranch) {
    Push-Location $path
    
    $currentBranch = git branch --show-current 2>$null
    $status = git status --porcelain 2>$null
    $ahead = git rev-list --count "@{u}..HEAD" 2>$null
    $behind = git rev-list --count "HEAD..@{u}" 2>$null
    
    $hasChanges = $status.Length -gt 0
    $isAhead = [int]$ahead -gt 0
    $isBehind = [int]$behind -gt 0
    $wrongBranch = $currentBranch -ne $expectedBranch
    
    Pop-Location
    
    return @{
        CurrentBranch = $currentBranch
        ExpectedBranch = $expectedBranch
        HasChanges = $hasChanges
        ChangeCount = ($status | Measure-Object).Count
        Ahead = [int]$ahead
        Behind = [int]$behind
        WrongBranch = $wrongBranch
        Status = $status
    }
}

# ═══════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════

Set-Location $ROOT_DIR

Write-Header "REPOSITORY STATUS CHECK"
Write-Host " Root: $ROOT_DIR" -ForegroundColor Gray
Write-Host " Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

# Check parent repo
Write-SubHeader "PARENT REPO (contractnest-combined)"
$parentStatus = Get-RepoStatus $ROOT_DIR "master"

Write-Host " Branch: " -NoNewline
if ($parentStatus.WrongBranch) {
    Write-Host "$($parentStatus.CurrentBranch)" -ForegroundColor Red -NoNewline
    Write-Host " (expected: $($parentStatus.ExpectedBranch))" -ForegroundColor DarkGray
} else {
    Write-Host "$($parentStatus.CurrentBranch)" -ForegroundColor Green
}

Write-Host " Local Changes: " -NoNewline
if ($parentStatus.HasChanges) {
    Write-Host "$($parentStatus.ChangeCount) file(s)" -ForegroundColor Yellow
} else {
    Write-Host "Clean" -ForegroundColor Green
}

Write-Host " Commits Ahead: " -NoNewline
if ($parentStatus.Ahead -gt 0) {
    Write-Host "$($parentStatus.Ahead) (need to push)" -ForegroundColor Yellow
} else {
    Write-Host "0" -ForegroundColor Green
}

Write-Host " Commits Behind: " -NoNewline
if ($parentStatus.Behind -gt 0) {
    Write-Host "$($parentStatus.Behind) (need to pull)" -ForegroundColor Yellow
} else {
    Write-Host "0" -ForegroundColor Green
}

# Check each submodule
Write-SubHeader "SUBMODULES"

$summary = @{
    Clean = @()
    NeedsPush = @()
    NeedsPull = @()
    HasChanges = @()
    WrongBranch = @()
}

foreach ($sub in $submodules) {
    $subPath = Join-Path $ROOT_DIR $sub.Name
    
    if (-not (Test-Path $subPath)) {
        Write-Host " ❌ $($sub.Name): " -NoNewline
        Write-Host "NOT FOUND" -ForegroundColor Red
        continue
    }
    
    $status = Get-RepoStatus $subPath $sub.Branch
    
    # Determine status icon and color
    $icon = "✅"
    $color = "Green"
    
    if ($status.WrongBranch) {
        $icon = "⚠️"
        $color = "Red"
        $summary.WrongBranch += $sub.Name
    } elseif ($status.HasChanges) {
        $icon = "📝"
        $color = "Yellow"
        $summary.HasChanges += $sub.Name
    } elseif ($status.Ahead -gt 0) {
        $icon = "⬆️"
        $color = "Cyan"
        $summary.NeedsPush += $sub.Name
    } elseif ($status.Behind -gt 0) {
        $icon = "⬇️"
        $color = "Magenta"
        $summary.NeedsPull += $sub.Name
    } else {
        $summary.Clean += $sub.Name
    }
    
    Write-Host " $icon $($sub.Name): " -NoNewline
    Write-Host "$($status.CurrentBranch)" -ForegroundColor $color -NoNewline
    
    $details = @()
    if ($status.HasChanges) { $details += "$($status.ChangeCount) changes" }
    if ($status.Ahead -gt 0) { $details += "$($status.Ahead) ahead" }
    if ($status.Behind -gt 0) { $details += "$($status.Behind) behind" }
    if ($status.WrongBranch) { $details += "expected: $($status.ExpectedBranch)" }
    
    if ($details.Count -gt 0) {
        Write-Host " ($($details -join ', '))" -ForegroundColor DarkGray
    } else {
        Write-Host " (clean)" -ForegroundColor DarkGray
    }
}

# Summary and recommendations
Write-Header "SUMMARY & RECOMMENDATIONS"

if ($summary.WrongBranch.Count -gt 0) {
    Write-Host " ⚠️  WRONG BRANCH: " -NoNewline -ForegroundColor Red
    Write-Host ($summary.WrongBranch -join ", ") -ForegroundColor White
    Write-Host "    → Run: .\switch-to-main.ps1" -ForegroundColor DarkGray
}

if ($summary.HasChanges.Count -gt 0) {
    Write-Host " 📝 UNCOMMITTED CHANGES: " -NoNewline -ForegroundColor Yellow
    Write-Host ($summary.HasChanges -join ", ") -ForegroundColor White
    Write-Host "    → Commit changes or run: .\push-feature.ps1" -ForegroundColor DarkGray
}

if ($summary.NeedsPush.Count -gt 0) {
    Write-Host " ⬆️  NEED TO PUSH: " -NoNewline -ForegroundColor Cyan
    Write-Host ($summary.NeedsPush -join ", ") -ForegroundColor White
    Write-Host "    → Run: .\push-main.ps1 or .\push-feature.ps1" -ForegroundColor DarkGray
}

if ($summary.NeedsPull.Count -gt 0) {
    Write-Host " ⬇️  NEED TO PULL: " -NoNewline -ForegroundColor Magenta
    Write-Host ($summary.NeedsPull -join ", ") -ForegroundColor White
    Write-Host "    → Run: .\pull-safe.ps1" -ForegroundColor DarkGray
}

if ($summary.Clean.Count -eq $submodules.Count -and -not $parentStatus.HasChanges) {
    Write-Host " ✅ ALL REPOS ARE CLEAN AND IN SYNC!" -ForegroundColor Green
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
