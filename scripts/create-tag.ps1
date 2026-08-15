# ===================================================================
# CREATE-TAG.ps1 - ContractNest Smart Release Tagger
# ===================================================================
# Usage:
#   .\create-tag.ps1
#   .\create-tag.ps1 -Notes "Extra context"
#
# If the window closes before you can read an error, run it as:
#   powershell -NoExit -File .\create-tag.ps1
# (every failure path below also pauses, so this should not be needed)
# ===================================================================

param(
    [string]$Notes = ""
)

$ROOT_DIR    = "D:\projects\core projects\ContractNest\contractnest-combined"
$PREVIEW_MAX = 12   # FIX: console preview cap. The TAG still gets every commit.

function Write-Header($text) {
    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "=======================================================" -ForegroundColor Cyan
}
function Write-Ok($text)   { Write-Host "  [OK]  $text" -ForegroundColor Green }
function Write-Err($text)  { Write-Host "  [ERR] $text" -ForegroundColor Red   }
function Write-Info($text) { Write-Host "  [..]  $text" -ForegroundColor Cyan  }

# FIX: the original called `exit 1` directly, which closes the window when the
# script is launched by right-click -> Run with PowerShell. That is why the
# real error was never readable. Every failure now pauses first.
function Stop-Fail($text) {
    Write-Err $text
    Write-Host ""
    Read-Host "  Press Enter to close"
    exit 1
}

# ===================================================================
# PRE-FLIGHT
# ===================================================================
Write-Header "ContractNest Smart Release Tagger"

if (-not (Test-Path $ROOT_DIR)) { Stop-Fail "Root not found: $ROOT_DIR" }
Set-Location $ROOT_DIR

# Must be on master
$branch = git branch --show-current
if ($branch -ne "master") {
    Write-Err "Must be on master branch. Currently on: $branch"
    Stop-Fail "Run: git checkout master"
}

# Must be clean
$status = git status --porcelain
if ($status) {
    Write-Err "Uncommitted changes detected. Commit or stash first."
    git status --short
    Write-Info "Note: a ' M <submodule>' line means a dirty SUBMODULE, not a file here."
    Stop-Fail "Working tree not clean."
}

# Pull latest
Write-Info "Pulling latest master..."
git pull origin master
if ($LASTEXITCODE -ne 0) { Stop-Fail "Failed to pull from origin master." }

# FIX: fetch tags explicitly. Without this a clone that never pulled tags
# computes the next version off an empty tag list and silently proposes v1.0.0.
Write-Info "Fetching tags..."
git fetch --tags --quiet origin
if ($LASTEXITCODE -ne 0) { Write-Info "Tag fetch reported a problem - continuing with local tags." }

# FIX: warn if any branch is merged into origin but not into local master yet.
$unmerged = @(git branch -r --no-merged master 2>$null |
              Where-Object { $_ -notmatch 'origin/HEAD' -and $_ -notmatch 'origin/master' })
if ($unmerged.Count -gt 0) {
    Write-Host ""
    Write-Host "  WARNING - these remote branches are NOT in master and will be excluded:" -ForegroundColor Yellow
    $unmerged | Select-Object -First 10 | ForEach-Object { Write-Host "     $($_.Trim())" -ForegroundColor Yellow }
    if ($unmerged.Count -gt 10) { Write-Host "     ... and $($unmerged.Count - 10) more" -ForegroundColor Yellow }
    Write-Host ""
    $goOn = Read-Host "  Continue anyway? (y/n)"
    if ($goOn -ne 'y') { Write-Host "  Cancelled." -ForegroundColor Gray; exit 0 }
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
    "1" { $Version = "v$major.$minor.$($patch + 1)";  $releaseType = "Patch" }
    "2" { $Version = "v$major.$($minor + 1).0";       $releaseType = "Minor" }
    "3" { $Version = "v$($major + 1).0.0";            $releaseType = "Major" }
    default { Stop-Fail "Invalid choice. Enter 1, 2, or 3." }
}

# FIX: fail early if the tag already exists, instead of after building everything.
if (git tag --list $Version) { Stop-Fail "Tag $Version already exists. Delete it first: git tag -d $Version" }

# ===================================================================
# COLLECT COMMITS SINCE LAST SEMVER TAG
# ===================================================================
$commitRange = if ($lastSemver) { "$lastSemver..HEAD" } else { "HEAD" }
$rangeLabel  = if ($lastSemver) { "$lastSemver  ->  $Version" } else { "initial commit  ->  $Version" }

# FIX: --no-merges. 'Merge branch claude/xxx of https://github.com/...' lines
# carry no release information and made up ~20% of the message.
$commits = @(git log $commitRange --no-merges --pretty=format:"%s" 2>$null)

if ($commits.Count -eq 0) { Stop-Fail "No new commits in $commitRange. Nothing to release." }

# ===================================================================
# CATEGORIZE COMMITS
# ===================================================================
# FIX: docs/refactor/style/perf/test used to fall through to "Other" and get
# printed with their raw prefix still attached.
$features = @()
$fixes    = @()
$docs     = @()
$chores   = @()
$other    = @()

foreach ($line in $commits) {
    $clean = $line -replace '^[a-z]+(\(.+?\))?:\s*', ''
    switch -Regex ($line) {
        '^feat'                            { $features += "  - $clean"; break }
        '^fix'                             { $fixes    += "  - $clean"; break }
        '^docs'                            { $docs     += "  - $clean"; break }
        '^(chore|refactor|style|perf|test)' { $chores   += "  - $clean"; break }
        default                            { $other    += "  - $line"       }
    }
}

# ===================================================================
# PREVIEW
# ===================================================================
function Show-Section($title, $items, $colour) {
    if ($items.Count -eq 0) { return }
    Write-Host "`n  $title ($($items.Count)):" -ForegroundColor $colour
    $items | Select-Object -First $PREVIEW_MAX | ForEach-Object { Write-Host $_ -ForegroundColor White }
    if ($items.Count -gt $PREVIEW_MAX) {
        Write-Host "     ... and $($items.Count - $PREVIEW_MAX) more (all included in the tag)" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "  -------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host "  Generating $releaseType release: $rangeLabel" -ForegroundColor DarkCyan
Write-Host "  -------------------------------------------------------" -ForegroundColor DarkCyan

Show-Section "Features"      $features "Green"
Show-Section "Bug Fixes"     $fixes    "Yellow"
Show-Section "Documentation" $docs     "Cyan"
Show-Section "Maintenance"   $chores   "Gray"
Show-Section "Other"         $other    "DarkCyan"

if ($Notes) { Write-Host "`n  Notes: $Notes" -ForegroundColor Magenta }

# ===================================================================
# BUILD TAG MESSAGE
# ===================================================================
$tagLines = @("Release $Version ($releaseType)")
if ($features.Count -gt 0) { $tagLines += ""; $tagLines += "Features:";      $tagLines += $features }
if ($fixes.Count    -gt 0) { $tagLines += ""; $tagLines += "Bug Fixes:";     $tagLines += $fixes    }
if ($docs.Count     -gt 0) { $tagLines += ""; $tagLines += "Documentation:"; $tagLines += $docs     }
if ($chores.Count   -gt 0) { $tagLines += ""; $tagLines += "Maintenance:";   $tagLines += $chores   }
if ($other.Count    -gt 0) { $tagLines += ""; $tagLines += "Other:";         $tagLines += $other    }
if ($Notes)                { $tagLines += ""; $tagLines += "Notes: $Notes" }

$tagMessage = $tagLines -join "`n"

Write-Host ""
Write-Host "  Total commits : $($commits.Count) (merges excluded)" -ForegroundColor DarkGray
Write-Host "  Release type  : $releaseType" -ForegroundColor DarkGray
Write-Host "  Tag           : $Version" -ForegroundColor DarkGray
Write-Host "  Message size  : $($tagMessage.Length) chars / $($tagLines.Count) lines" -ForegroundColor DarkGray
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
# CREATE AND PUSH
# ===================================================================
# FIX: THE BUG THAT KILLED THE RUN.
# `git tag -a $Version -m $tagMessage` passes the whole message as ONE argument.
# Windows caps a command line at 32,767 chars; the v1.1.1..HEAD message is
# ~51,700, so CreateProcess rejected it before git ever ran. -F reads the
# message from a file and has no length limit.
#
# UTF8Encoding($false) = UTF-8 WITHOUT BOM. This also fixes the em-dashes that
# rendered as "ΓÇö" - PowerShell 5.1 hands native commands ANSI-codepage bytes.
# Do NOT use Out-File -Encoding utf8 here; on 5.1 it writes a BOM and git would
# embed it in the message.
$msgFile = Join-Path $env:TEMP "cn-tag-$Version.txt"
[System.IO.File]::WriteAllText($msgFile, $tagMessage, (New-Object System.Text.UTF8Encoding $false))

git tag -a $Version -F $msgFile
$tagExit = $LASTEXITCODE
Remove-Item $msgFile -Force -ErrorAction SilentlyContinue

if ($tagExit -ne 0) { Stop-Fail "Failed to create tag." }

git push origin $Version
if ($LASTEXITCODE -ne 0) {
    Write-Err "Failed to push tag to origin."
    Stop-Fail "Tag created locally. Push manually: git push origin $Version"
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