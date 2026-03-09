# ===================================================================
# RELEASE-NOTES.ps1 - ContractNest Smart Release Notes
# ===================================================================
# Usage:
#   .\release-notes.ps1                              -> last 2 semver tags (default)
#   .\release-notes.ps1 -From "v1.0.0" -To "v1.2.0" -> between two specific tags
#   .\release-notes.ps1 -List                        -> list all semver tags
# ===================================================================

param(
    [string]$From = "",
    [string]$To   = "",
    [switch]$List
)

$ROOT_DIR = "D:\projects\core projects\ContractNest\contractnest-combined"
Set-Location $ROOT_DIR

function Write-Header($text) {
    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "=======================================================" -ForegroundColor Cyan
}

# ===================================================================
# GET ALL SEMVER TAGS ONLY
# ===================================================================
$allTags = @(git tag --sort=version:refname 2>$null | Where-Object { $_ -match '^v\d+\.\d+\.\d+$' })

# -- List ------------------------------------------------------------
if ($List) {
    Write-Header "All ContractNest Releases"
    if ($allTags.Count -eq 0) {
        Write-Host "  No semver tags found." -ForegroundColor Gray
        exit 0
    }
    for ($i = $allTags.Count - 1; $i -ge 0; $i--) {
        $t    = $allTags[$i]
        $date = git log -1 --format="%ad" --date=short $t 2>$null
        $marker = if ($i -eq $allTags.Count - 1) { " <- latest" } else { "" }
        Write-Host "  $t   $date$marker" -ForegroundColor White
    }
    Write-Host ""
    exit 0
}

if ($allTags.Count -eq 0) {
    Write-Host "  [ERR] No semver tags found. Create your first tag with create-tag.ps1" -ForegroundColor Red
    exit 1
}

# ===================================================================
# SMART DEFAULTS: last 2 semver tags
# ===================================================================
if (-not $To) {
    $To = $allTags[-1]
}

if (-not $From) {
    $toIndex = [Array]::IndexOf($allTags, $To)
    if ($toIndex -gt 0) {
        $From = $allTags[$toIndex - 1]
    } else {
        $From = ""
    }
}

# Validate
if ($To -and -not (git tag -l $To)) {
    Write-Host "  [ERR] Tag '$To' not found. Available: $($allTags -join ', ')" -ForegroundColor Red
    exit 1
}
if ($From -and -not (git tag -l $From)) {
    Write-Host "  [ERR] Tag '$From' not found. Available: $($allTags -join ', ')" -ForegroundColor Red
    exit 1
}

# ===================================================================
# FETCH AND CATEGORIZE COMMITS
# ===================================================================
$commitRange = if ($From) { "$From..$To" } else { $To }
$rangeLabel  = if ($From) { "$From  ->  $To" } else { "initial commit  ->  $To" }

$commits = @(git log $commitRange --pretty=format:"%h|%s|%ad" --date=short 2>$null)

$features = @()
$fixes     = @()
$chores    = @()
$other     = @()

foreach ($line in $commits) {
    $parts = $line -split '\|', 3
    $hash  = $parts[0]
    $msg   = $parts[1]
    $date  = $parts[2]
    $clean = $msg -replace '^[a-z]+(\(.+?\))?:\s*', ''
    $entry = "  - $clean  [$hash] $date"

    if     ($msg -match '^feat')  { $features += $entry }
    elseif ($msg -match '^fix')   { $fixes    += $entry }
    elseif ($msg -match '^chore') { $chores   += $entry }
    else                          { $other    += "  - $msg  [$hash] $date" }
}

# ===================================================================
# PRINT
# ===================================================================
$toDate   = git log -1 --format="%ad" --date=short $To 2>$null
$fromDate = if ($From) { git log -1 --format="%ad" --date=short $From 2>$null } else { "--" }

Write-Header "Release Notes: $rangeLabel"

Write-Host ""
Write-Host "  Version  : $To" -ForegroundColor White
Write-Host "  Released : $toDate" -ForegroundColor White
if ($From) {
    Write-Host "  Previous : $From ($fromDate)" -ForegroundColor DarkGray
}
Write-Host "  Commits  : $($commits.Count)" -ForegroundColor DarkGray

if ($commits.Count -eq 0) {
    Write-Host "`n  No commits found in this range." -ForegroundColor Gray
    Write-Host ""
    exit 0
}

if ($features.Count -gt 0) {
    Write-Host "`n  Features ($($features.Count)):" -ForegroundColor Green
    $features | ForEach-Object { Write-Host $_ -ForegroundColor White }
}
if ($fixes.Count -gt 0) {
    Write-Host "`n  Bug Fixes ($($fixes.Count)):" -ForegroundColor Yellow
    $fixes | ForEach-Object { Write-Host $_ -ForegroundColor White }
}
if ($chores.Count -gt 0) {
    Write-Host "`n  Maintenance ($($chores.Count)):" -ForegroundColor Gray
    $chores | ForEach-Object { Write-Host $_ -ForegroundColor White }
}
if ($other.Count -gt 0) {
    Write-Host "`n  Other ($($other.Count)):" -ForegroundColor DarkCyan
    $other | ForEach-Object { Write-Host $_ -ForegroundColor White }
}

Write-Host ""