param(
    [string]$ParentRepo = (Join-Path $PSScriptRoot '..\..'),
    [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
$releaseRoot = $PSScriptRoot
$parentPath = (Resolve-Path -LiteralPath $ParentRepo).Path
$uiPath = Join-Path $parentPath 'contractnest-ui'
$appPath = Join-Path $uiPath 'src\App.tsx'
$routePatch = Join-Path $releaseRoot 'APP_ROUTE.patch'
$destination = Join-Path $uiPath 'src\pages\contracts\experience'
$source = Join-Path $releaseRoot 'contractnest-ui\src\pages\contracts\experience'
if (!(Test-Path -LiteralPath $appPath)) { throw "UI checkout not found: $appPath" }
if (!(Test-Path -LiteralPath (Join-Path $uiPath 'src\pages\experience\model.ts'))) { throw 'Apply the previously delivered Home/experience release first. Its shared theme text utility is required.' }
$releaseFiles = @('index.tsx', 'model.ts', 'useContractList.ts', 'contracts-list.css')
foreach ($file in $releaseFiles) {
    $incoming = Join-Path $source $file
    $existing = Join-Path $destination $file
    if (!(Test-Path -LiteralPath $incoming)) { throw "Release file missing: $incoming" }
    if ((Test-Path -LiteralPath $existing) -and ((Get-FileHash -LiteralPath $existing).Hash -ne (Get-FileHash -LiteralPath $incoming).Hash)) {
        throw "A different version already exists: $existing. Stop and review it; this release will not overwrite it."
    }
}
$appText = Get-Content -LiteralPath $appPath -Raw
$hasImport = $appText.Contains("import ContractsExperiencePage from './pages/contracts/experience';")
$hasRoute = $appText.Contains('<Route path="experience" element={<ContractsExperiencePage />} />')
if ($hasImport -ne $hasRoute) { throw 'Only part of the route registration exists. Stop and review App.tsx.' }
if (!$hasRoute) {
    git -C $uiPath apply --check --ignore-space-change $routePatch
    if ($LASTEXITCODE -ne 0) { throw 'Route patch does not match App.tsx. No files were copied. Share this output for a refreshed patch.' }
}
if ($CheckOnly) { Write-Host 'Preflight passed. No files changed.' -ForegroundColor Green; exit 0 }

# Keep a recoverable App.tsx snapshot; the patch changes only two lines.
if (!$hasRoute) {
    $releaseBackup = Join-Path $parentPath ('MANUAL_COPY_FILES\contracts-list-v1\LOCAL_BACKUP\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
    New-Item -ItemType Directory -Path $releaseBackup -Force | Out-Null
    Copy-Item -LiteralPath $appPath -Destination (Join-Path $releaseBackup 'App.tsx') -Force
}
New-Item -ItemType Directory -Path $destination -Force | Out-Null
Copy-Item -LiteralPath "$source\index.tsx" -Destination "$destination\index.tsx" -Force
Copy-Item -LiteralPath "$source\model.ts" -Destination "$destination\model.ts" -Force
Copy-Item -LiteralPath "$source\useContractList.ts" -Destination "$destination\useContractList.ts" -Force
Copy-Item -LiteralPath "$source\contracts-list.css" -Destination "$destination\contracts-list.css" -Force
if (!$hasRoute) {
    git -C $uiPath apply --ignore-space-change $routePatch
    if ($LASTEXITCODE -ne 0) { throw 'Page files copied, but route registration failed. No existing page was replaced; inspect App.tsx before retrying.' }
}
foreach ($file in $releaseFiles) {
    if ((Get-FileHash -LiteralPath (Join-Path $source $file)).Hash -ne (Get-FileHash -LiteralPath (Join-Path $destination $file)).Hash) { throw "Copy verification failed: $file" }
}
Write-Host 'Copied and verified. Existing /contracts is unchanged.' -ForegroundColor Green
Write-Host 'Restart the UI, then open http://localhost:5173/contracts/experience' -ForegroundColor Green
Write-Host 'Use your actual UI port. No API restart or DB migration is required.'
