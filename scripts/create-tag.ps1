# ===================================================================
# CREATE-TAG.ps1 - ContractNest Release Tagger
# ===================================================================
# Usage:
#   .\create-tag.ps1 -Version "v1.1.0"
#   .\create-tag.ps1 -Version "v1.1.0" -Notes "Extra context here"
# ===================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
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
function Write-Info($text) { Write-Host "  [..] $text"  -ForegroundColor Cyan  }

# -- Pre-flight checks -----------------------------------------------
Write-Header "ContractNest Release Tagger"

Set-Location $ROOT_DIR

# 1. Version format
if ($Version -notmatch '^v\d+\.\d+\.\d+$') {
    Write-Err "Invalid version format. Use: v1.1.0"
    exit 1
}

# 2. Must be on master
$branch = git branch --show-current
if ($branch -ne "master") {
    Write-Err "Must be on master branch to tag. Currently on: $branch"
    Write-Info "Run: git checkout master"
    exit 1
}

# 3. Must be clean
$status = git status --porcelain
if ($status) {
    Write-Err "Uncommitted changes detected. Commit or stash first."
    git status --short
    exit 1
}

# 4. Pull latest
Write-Info "Pulling latest main..."
git pull origin master
if ($LASTEXITCODE -ne 0) {
    Write-Err "Failed to pull from origin master."
    exit 1
}

# 5. Tag must not exist
if (git tag -l $Version) {
    Write-Err "Tag $Version already exists."
    Write-Info "Existing tags:"
    git tag --sort=-version:refname | Select-Object -First 10
    exit 1
}

# -- Collect commits since last tag ----------------------------------
$prevTag     = git describe --tags --abbrev=0 2>$null
$commitRange = if ($prevTag) { "$prevTag..HEAD" } else { "HEAD" }
$rangeLabel  = if ($prevTag) { "$prevTag  ->  $Version" } else { "initial commit  ->  $Version" }

$commits = @(git log $commitRange --pretty=format:"%s" 2>$null)

if ($commits.Count -eq 0) {
    Write-Err "No new commits since last tag ($prevTag). Nothing to release."
    exit 1
}

# -- Categorize commits ----------------------------------------------
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

# -- Preview ---------------------------------------------------------
Write-Host ""
Write-Host "  RELEASE NOTES PREVIEW: $rangeLabel" -ForegroundColor DarkCyan
Write-Host "  -------------------------------------------------------" -ForegroundColor DarkCyan

if ($features.Count -gt 0) {
    Write-Host "`n  Features:" -ForegroundColor Green
    $features | ForEach-Object { Write-Host $_ -ForegroundColor White }
}
if ($fixes.Count -gt 0) {
    Write-Host "`n  Bug Fixes:" -ForegroundColor Yellow
    $fixes | ForEach-Object { Write-Host $_ -ForegroundColor White }
}
if ($chores.Count -gt 0) {
    Write-Host "`n  Maintenance:" -ForegroundColor Gray
    $chores | ForEach-Object { Write-Host $_ -ForegroundColor White }
}
if ($other.Count -gt 0) {
    Write-Host "`n  Other:" -ForegroundColor DarkCyan
    $other | ForEach-Object { Write-Host $_ -ForegroundColor White }
}
if ($Notes) {
    Write-Host "`n  Notes: $Notes" -ForegroundColor Magenta
}

Write-Host ""
Write-Host "  Total commits: $($commits.Count)" -ForegroundColor DarkGray
Write-Host ""

# -- Confirm ---------------------------------------------------------
$confirm = Read-Host "  Create and push tag $Version ? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "  Cancelled. No tag created." -ForegroundColor Gray
    exit 0
}

# -- Build annotated tag message -------------------------------------
$tagLines = @("Release $Version")

if ($features.Count -gt 0)  { $tagLines += ""; $tagLines += "Features:";    $tagLines += $features }
if ($fixes.Count -gt 0)     { $tagLines += ""; $tagLines += "Bug Fixes:";   $tagLines += $fixes    }
if ($chores.Count -gt 0)    { $tagLines += ""; $tagLines += "Maintenance:"; $tagLines += $chores   }
if ($other.Count -gt 0)     { $tagLines += ""; $tagLines += "Other:";       $tagLines += $other    }
if ($Notes)                  { $tagLines += ""; $tagLines += "Notes: $Notes" }

$tagMessage = $tagLines -join "`n"

# -- Create and push tag ---------------------------------------------
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

# -- Success summary -------------------------------------------------
Write-Host ""
Write-Ok "Tag $Version created and pushed!"
Write-Host ""
Write-Host "  All releases:" -ForegroundColor Cyan
git tag --sort=-version:refname | ForEach-Object {
    $t    = $_
    $date = git log -1 --format="%ad" --date=short $t 2>$null
    Write-Host "     $t   $date" -ForegroundColor White
}
Write-Host ""