param([string]$ParentRepo = (Join-Path $PSScriptRoot '..\..'), [switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$parentPath = (Resolve-Path -LiteralPath $ParentRepo).Path
$destination = Join-Path $parentPath 'contractnest-ui\src\pages\contracts\experience'
$source = Join-Path $PSScriptRoot 'contractnest-ui\src\pages\contracts\experience'
$baseline = Join-Path $PSScriptRoot '..\contracts-list-v1\contractnest-ui\src\pages\contracts\experience\index.tsx'
function Read-Normalized([string]$path) { return ((Get-Content -LiteralPath $path -Raw) -replace "`r", '') }
if (!(Test-Path -LiteralPath "$destination\index.tsx")) { throw 'Apply contracts-list-v1 first.' }
$current = Read-Normalized "$destination\index.tsx"
if (($current -cne (Read-Normalized $baseline)) -and ($current -cne (Read-Normalized "$source\index.tsx"))) { throw 'The list page has other changes. Stop and request a refreshed patch; nothing copied.' }
if ((Test-Path -LiteralPath "$destination\ContactClassificationBadge.tsx") -and ((Read-Normalized "$destination\ContactClassificationBadge.tsx") -cne (Read-Normalized "$source\ContactClassificationBadge.tsx"))) { throw 'A different contact badge already exists. Nothing copied.' }
if ($CheckOnly) { Write-Host 'Preflight passed. No files changed.' -ForegroundColor Green; exit 0 }
$backupPath = Join-Path $parentPath ('MANUAL_COPY_FILES\contracts-list-v2\LOCAL_BACKUP\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force $backupPath | Out-Null
Copy-Item -LiteralPath "$destination\index.tsx" -Destination "$backupPath\index.tsx" -Force
Copy-Item -LiteralPath "$source\ContactClassificationBadge.tsx" -Destination "$destination\ContactClassificationBadge.tsx" -Force
Copy-Item -LiteralPath "$source\index.tsx" -Destination "$destination\index.tsx" -Force
foreach ($file in @('index.tsx','ContactClassificationBadge.tsx')) {
    if ((Get-FileHash -LiteralPath "$source\$file").Hash -ne (Get-FileHash -LiteralPath "$destination\$file").Hash) { throw "Copy verification failed: $file" }
}
Write-Host 'Copied. Ctrl+F5 on /contracts/experience. No API restart or migration.' -ForegroundColor Green
