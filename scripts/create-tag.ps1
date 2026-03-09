# ===================================================================
# CREATE-TAG.ps1 - ContractNest Smart Release Tagger
# ===================================================================
# Usage:
#   .\create-tag.ps1
#   .\create-tag.ps1 -Notes "Extra context"
# ===================================================================

param(
    [string]$Notes = ""
)

$ROOT_DIR = "D:\projects\core projects\ContractNest\contractnest-combined"

function Write-Header($text) {
    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "=======================================================" -ForegroundColor Cyan
}
function Write-Ok($text)   { Write-Host "  [OK]  $text" -ForegroundColor Green }
function Write-Err($text)  { Write-Host "  [ERR] $text" -ForegroundColor Red   }
function Write-Info($text) { Write-Host "  [..]  $text" -ForegroundColor Cyan  }

# ===================================================================
# PRE-FLIGHT
# ===================================================================
Write-Header "ContractNest Smart Release Tagger"

Set-Location $ROOT_DIR

# Must be on master
$branch = git branch --show-current
if ($branch -ne "master") {
    Write-Err "Must be on master branch. Currently on: $branch"
    Write-Info "Run: git checkout master"
    exit 1
}

# Must be clean
$status = git status --porcelain
if ($status) {
    Write-Err "Uncommitted changes detected. Commit or stash first."
    git status --short
    exit 1
}

# Pull latest
Write-Info "Pulling latest master..."
git pull origin master
if ($LASTEXITCODE -ne 0) {
    Write-Err "Failed to pull from origin master."
    exit 1
}

# ===================================================================
# FIND LAST SEMVER TAG
# ===================================================================
$lastSemver = git tag --sort=-version:refname 2>$null |
    Where-Object { $_ -match '^v\d+\.\d+\.\d+$' } |
    Select-Object -First 1

if ($lastSemver) {
    Write-Info "Last release tag : $lastSemver"
    $parts = $lastSemver -replace '^v', '' -split '\.'
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]$parts[2]
} else {
    Write-Info "No previous semver tag found. Starting from v0.0.0"
    $major = 0
    $minor = 0
    $patch = 0
}

# ===================================================================
# ASK RELEASE TYPE
# ===================================================================
Write-Host ""
Write-Host "  What type of release is this?" -ForegroundColor Yellow
Write-Host ""
Write-Host "    [1] patch  - Bug fixes, small tweaks       -> v$major.$minor.$($patch + 1)" -ForegroundColor White
Write-Host "    [2] minor  - New features, backward compat -> v$major.$($minor + 1).0" -ForegroundColor White
Write-Host "    [3] major  - Breaking changes, big release -> v$($major + 1).0.0" -ForegroundColor White
Write-Host ""

$choice = Read-Host "  Enter choice (1/2/3)"

switch ($choice) {
    "1" {
        $Version     = "v$major.$minor.$($patch + 1)"
        $releaseType = "Patch"
    }
    "2" {
        $Version     = "v$major.$($minor + 1).0"
        $releaseType = "Minor"
    }
    "3" {
        $Version     = "v$($major + 1).0.0"
        $releaseType = "Major"
    }
    default {
        Write-Err "Invalid choice. Enter 1, 2, or 3."
        exit 1
    }
}

# ===================================================================
# COLLECT COMMITS SINCE LAST SEMVER TAG
# ===================================================================
$commitRange = if ($lastSemver) { "$lastSemver..HEAD" } else { "HEAD" }
$rangeLabel  = if ($lastSemver) { "$lastSemver  ->  $Version" } else { "initial commit  ->  $Version" }

$commits = @(git log $commitRange --pretty=format:"%s" 2>$null)

if ($commits.Count -eq 0) {
    Write-Err "No new commits since $lastSemver. Nothing to release."
    exit 1
}

# ===================================================================
# CATEGORIZE COMMITS
# ===================================================================
$features = @()
$fixes     = @()
$chores    = @()
$other     = @()

foreach ($line in $commits) {
    $clean = $line -replace '^[a-z]+(\(.+?\))?:\s*', ''
    if     ($line -match '^feat')  { $features += "  - $clean" }
    elseif ($line -match '^fix')   { $fixes    += "  - $clean" }
    elseif ($line -match '^chore') { $chores   += "  - $clean" }
    else                           { $other    += "  - $line"  }
}

# ===================================================================
# PREVIEW
# ===================================================================
Write-Host ""
Write-Host "  -------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host "  Generating $releaseType release: $rangeLabel" -ForegroundColor DarkCyan
Write-Host "  -------------------------------------------------------" -ForegroundColor DarkCyan

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
if ($Notes) {
    Write-Host "`n  Notes: $Notes" -ForegroundColor Magenta
}

Write-Host ""
Write-Host "  Total commits : $($commits.Count)" -ForegroundColor DarkGray
Write-Host "  Release type  : $releaseType" -ForegroundColor DarkGray
Write-Host "  Tag           : $Version" -ForegroundColor DarkGray
Write-Host ""

# ===================================================================
# CONFIRM
# ===================================================================
$confirm = Read-Host "  Create and push tag $Version ? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "  Cancelled. No tag created." -ForegroundColor Gray
    exit 0
}

# ===================================================================
# BUILD TAG MESSAGE
# ===================================================================
$tagLines = @("Release $Version ($releaseType)")

if ($features.Count -gt 0)  { $tagLines += ""; $tagLines += "Features:";    $tagLines += $features }
if ($fixes.Count -gt 0)     { $tagLines += ""; $tagLines += "Bug Fixes:";   $tagLines += $fixes    }
if ($chores.Count -gt 0)    { $tagLines += ""; $tagLines += "Maintenance:"; $tagLines += $chores   }
if ($other.Count -gt 0)     { $tagLines += ""; $tagLines += "Other:";       $tagLines += $other    }
if ($Notes)                  { $tagLines += ""; $tagLines += "Notes: $Notes" }

$tagMessage = $tagLines -join "`n"

# ===================================================================
# CREATE AND PUSH
# ===================================================================
git tag -a $Version -m $tagMessage
if ($LASTEXITCODE -ne 0) {
    Write-Err "Failed to create tag."
    exit 1
}

git push origin $Version
if ($LASTEXITCODE -ne 0) {
    Write-Err "Failed to push tag to origin."
    Write-Info "Tag created locally. Push manually: git push origin $Version"
    exit 1
}

# ===================================================================
# SUCCESS
# ===================================================================
Write-Host ""
Write-Ok "Tag $Version created and pushed!"
Write-Host ""
Write-Host "  All releases:" -ForegroundColor Cyan
git tag --sort=-version:refname | Where-Object { $_ -match '^v\d+\.\d+\.\d+$' } | ForEach-Object {
    $t    = $_
    $date = git log -1 --format="%ad" --date=short $t 2>$null
    Write-Host "     $t   $date" -ForegroundColor White
}
Write-Host ""