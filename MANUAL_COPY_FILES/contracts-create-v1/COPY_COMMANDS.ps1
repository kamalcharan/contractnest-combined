param([string]$ParentRepo = (Join-Path $PSScriptRoot '..\..'), [switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$parentPath = (Resolve-Path -LiteralPath $ParentRepo).Path
$uiPath = Join-Path $parentPath 'contractnest-ui'
if (!(Test-Path -LiteralPath "$uiPath\src\App.tsx")) { throw 'Expected contractnest-combined parent containing contractnest-ui.' }
$files = @(
  'src\App.tsx',
  'src\components\contracts\ContractWizard\index.tsx',
  'src\components\contracts\ContractWizard\experience\chapters.ts',
  'src\components\contracts\ContractWizard\experience\CreationShell.tsx',
  'src\components\contracts\ContractWizard\experience\creation.css',
  'src\pages\contracts\experience\create.tsx',
  'src\pages\contracts\experience\index.tsx'
)
function Read-Normalized([string]$path) { return ((Get-Content -LiteralPath $path -Raw) -replace "`r", '') }
# Check EVERY target before copying ANY target. Do not overwrite divergent local work.
foreach ($file in $files) {
  $source = Join-Path "$PSScriptRoot\contractnest-ui" $file
  $target = Join-Path $uiPath $file
  $baseline = Join-Path "$PSScriptRoot\BASELINE\contractnest-ui" $file
  if (!(Test-Path -LiteralPath $source)) { throw "Release file missing: $file" }
  if (Test-Path -LiteralPath $target) {
    $current = Read-Normalized $target
    $alreadyApplied = $current -ceq (Read-Normalized $source)
    $matchesBaseline = (Test-Path -LiteralPath $baseline) -and ($current -ceq (Read-Normalized $baseline))
    if (!$alreadyApplied -and !$matchesBaseline) { throw "Local edits differ in $file. Nothing copied. Request a refreshed patch." }
  } elseif (Test-Path -LiteralPath $baseline) { throw "Existing required file is missing: $file" }
}
if ($CheckOnly) { Write-Host 'Preflight passed. No files changed.' -ForegroundColor Green; exit 0 }
$backup = Join-Path $parentPath ('MANUAL_COPY_FILES\contracts-create-v1\LOCAL_BACKUP\' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
foreach ($file in $files) {
  $source = Join-Path "$PSScriptRoot\contractnest-ui" $file
  $target = Join-Path $uiPath $file
  if (Test-Path -LiteralPath $target) {
    $backupFile = Join-Path $backup $file
    New-Item -ItemType Directory -Force (Split-Path -Parent $backupFile) | Out-Null
    Copy-Item -LiteralPath $target -Destination $backupFile -Force
  }
  New-Item -ItemType Directory -Force (Split-Path -Parent $target) | Out-Null
  Copy-Item -LiteralPath $source -Destination $target -Force
  if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $target).Hash) { throw "Copy verification failed: $file. Backups: $backup" }
}
Write-Host 'Copied and verified 7 UI files. No API, Edge or DB changes.' -ForegroundColor Green
Write-Host 'Ctrl+F5. In TEST environment: /contracts/experience -> New contract; or /contracts/experience/create'
Write-Host "Previous files backed up at: $backup"
