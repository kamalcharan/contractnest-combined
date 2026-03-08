# ═══════════════════════════════════════════════════════════════════
# RELEASE-NOTES.ps1 — ContractNest Release Notes Generator
# ═══════════════════════════════════════════════════════════════════
# Usage:
#   .\release-notes.ps1                        → latest tag vs previous tag
#   .\release-notes.ps1 -To "v1.2.0"           → up to a specific tag
#   .\release-notes.ps1 -From "v1.0.0" -To "v1.2.0"  → between two tags
#   .\release-notes.ps1 -List                  → list all tags with dates
# ═══════════════════════════════════════════════════════════════════

param(
    [string]$From = "",
    [string]$To   = "",
    [switch]$List
)

$ROOT_DIR = "D:\projects\core projects\ContractNest\contractnest-combined"
Set-Location $ROOT_DIR

# ── Helpers ────────────────────────────────────────────────────────
function Write-Header($text) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
}

# ── List all tags ──────────────────────────────────────────────────
if ($List) {
    Write-Header "All ContractNest Releases"
    $tags = @(git tag --sort=-version:refname)
    if ($tags.Count -eq 0) {
        Write-Host "  No tags found." -ForegroundColor Gray
        exit 0
    }
    foreach ($t in $tags) {
        $date    = git log -1 --format="%ad" --date=short $t 2>$null
        $commits = git log -1 --format="%s" $t 2>$null
        Write-Host "  $t   $date" -ForegroundColor White
    }
    Write-Host ""
    exit 0
}

# ── Resolve From / To ──────────────────────────────────────────────
$allTags = @(git tag --sort=version:refname)

if ($allTags.Count -eq 0) {
    Write-Host "  ❌ No tags found. Create your first tag with create-tag.ps1" -ForegroundColor Red
    exit 1
}

# Resolve -To
if (-not $To) {
    $To = $allTags[-1]  # latest tag
}

# Resolve -From
if (-not $From) {
    $toIndex = [Array]::IndexOf($allTags, $To)
    if ($toIndex -gt 0) {
        $From = $allTags[$toIndex - 1]
    } else {
        $From = ""  # first ever tag — go from beginning
    }
}

# Validate tags exist
if ($To -and -not (git tag -l $To)) {
    Write-Host "  ❌ Tag '$To' not found." -ForegroundColor Red
    Write-Host "  Available tags: $($allTags -join ', ')" -ForegroundColor Gray
    exit 1
}
if ($From -and -not (git tag -l $From)) {
    Write-Host "  ❌ Tag '$From' not found." -ForegroundColor Red
    Write-Host "  Available tags: $($allTags -join ', ')" -ForegroundColor Gray
    exit 1
}

# ── Fetch commits ──────────────────────────────────────────────────
$commitRange = if ($From) { "$From..$To" } else { $To }
$rangeLabel  = if ($From) { "$From  →  $To" } else { "initial commit  →  $To" }

$commits = @(git log $commitRange --pretty=format:"%h|%s|%an|%ad" --date=short 2>$null)

# ── Categorize ─────────────────────────────────────────────────────
$features = @()
$fixes     = @()
$chores    = @()
$other     = @()

foreach ($line in $commits) {
    $parts  = $line -split '\|', 4
    $hash   = $parts[0]
    $msg    = $parts[1]
    $author = $parts[2]
    $date   = $parts[3]
    $clean  = $msg -replace '^[a-z]+(\(.+?\))?:\s*', ''

    $entry = "  • $clean  [$hash] $date"
    if     ($msg -match '^feat')  { $features += $entry }
    elseif ($msg -match '^fix')   { $fixes    += $entry }
    elseif ($msg -match '^chore') { $chores   += $entry }
    else                          { $other    += "  • $msg  [$hash] $date" }
}

# ── Tag metadata ───────────────────────────────────────────────────
$toDate   = git log -1 --format="%ad" --date=short $To 2>$null
$fromDate = if ($From) { git log -1 --format="%ad" --date=short $From 2>$null } else { "—" }

# ── Print ──────────────────────────────────────────────────────────
Write-Header "Release Notes: $rangeLabel"

Write-Host ""
Write-Host "  Version  : $To" -ForegroundColor White
Write-Host "  Released : $toDate" -ForegroundColor White
if ($From) {
Write-Host "  Previous : $From ($fromDate)" -ForegroundColor DarkGray
}
Write-Host "  Commits  : $($commits.Count)" -ForegroundColor DarkGray

if ($features.Count -gt 0) {
    Write-Host "`n  🚀 Features ($($features.Count)):" -ForegroundColor Green
    $features | ForEach-Object { Write-Host $_ -ForegroundColor White }
}
if ($fixes.Count -gt 0) {
    Write-Host "`n  🐛 Bug Fixes ($($fixes.Count)):" -ForegroundColor Yellow
    $fixes | ForEach-Object { Write-Host $_ -ForegroundColor White }
}
if ($chores.Count -gt 0) {
    Write-Host "`n  🔧 Maintenance ($($chores.Count)):" -ForegroundColor Gray
    $chores | ForEach-Object { Write-Host $_ -ForegroundColor White }
}
if ($other.Count -gt 0) {
    Write-Host "`n  📌 Other ($($other.Count)):" -ForegroundColor DarkCyan
    $other | ForEach-Object { Write-Host $_ -ForegroundColor White }
}

if ($commits.Count -eq 0) {
    Write-Host "`n  No commits found in this range." -ForegroundColor Gray
}

Write-Host ""