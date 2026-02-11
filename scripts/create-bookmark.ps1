# ═══════════════════════════════════════════════════
# CREATE BOOKMARK - Tag stable state across all repos
# ═══════════════════════════════════════════════════
# Usage: .\scripts\create-bookmark.ps1
# Usage: .\scripts\create-bookmark.ps1 -Name "my-custom-name"

param(
    [string]$Name = "",
    [string]$Message = ""
)

$ROOT_DIR = "D:\projects\core projects\ContractNest\contractnest-combined"

if (-not (Test-Path $ROOT_DIR)) {
    Write-Host "ERROR: Root directory not found: $ROOT_DIR" -ForegroundColor Red
    exit 1
}

Set-Location $ROOT_DIR

$tagName = if ($Name) { $Name } else { "stable-$(Get-Date -Format 'yyyyMMdd-HHmm')" }
$tagMessage = if ($Message) { $Message } else { "Bookmark: stable state at $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }

$submodules = @(
    @{ Name = "contractnest-api"; Branch = "main" },
    @{ Name = "contractnest-ui"; Branch = "main" },
    @{ Name = "contractnest-edge"; Branch = "main" },
    @{ Name = "ClaudeDocumentation"; Branch = "master" },
    @{ Name = "ContractNest-Mobile"; Branch = "main" },
    @{ Name = "FamilyKnows"; Branch = "main" }
)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  CREATE BOOKMARK: $tagName" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$tagged = @()
$errors = @()

foreach ($sub in $submodules) {
    $subPath = Join-Path $ROOT_DIR $sub.Name
    if (-not (Test-Path $subPath)) {
        Write-Host "  [SKIP] $($sub.Name) — directory not found" -ForegroundColor Gray
        continue
    }

    Push-Location $subPath

    # Check for uncommitted changes
    $status = git status --porcelain
    if ($status) {
        Write-Host "  [WARN] $($sub.Name) has uncommitted changes:" -ForegroundColor Yellow
        Write-Host "         $status" -ForegroundColor Gray
        Write-Host "         Tagging current HEAD anyway." -ForegroundColor Yellow
    }

    git tag -a $tagName -m $tagMessage 2>$null
    if ($LASTEXITCODE -eq 0) {
        git push origin $tagName 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] $($sub.Name) tagged" -ForegroundColor Green
            $tagged += $sub.Name
        } else {
            Write-Host "  [OK] $($sub.Name) tagged locally (push failed — push manually later)" -ForegroundColor Yellow
            $tagged += "$($sub.Name) (local only)"
        }
    } else {
        Write-Host "  [ERROR] $($sub.Name) — tag may already exist" -ForegroundColor Red
        $errors += $sub.Name
    }

    Pop-Location
}

# Tag parent repo
git tag -a $tagName -m $tagMessage 2>$null
if ($LASTEXITCODE -eq 0) {
    git push origin $tagName 2>$null
    Write-Host "  [OK] contractnest-combined tagged" -ForegroundColor Green
    $tagged += "contractnest-combined"
} else {
    Write-Host "  [ERROR] contractnest-combined — tag may already exist" -ForegroundColor Red
    $errors += "contractnest-combined"
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  BOOKMARK CREATED: $tagName" -ForegroundColor Green
Write-Host "  Tagged: $($tagged.Count) repos" -ForegroundColor White
if ($errors.Count -gt 0) {
    Write-Host "  Errors: $($errors.Count) repos" -ForegroundColor Red
}
Write-Host "" -ForegroundColor White
Write-Host "  To rollback to this point:" -ForegroundColor Yellow
Write-Host "  .\scripts\rollback-to-tag.ps1 -TagName `"$tagName`"" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to continue" 