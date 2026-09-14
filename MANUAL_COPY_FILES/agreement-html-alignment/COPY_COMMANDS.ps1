param([string]$ParentRepo = (Join-Path $PSScriptRoot '..\..'), [switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$parentPath = (Resolve-Path -LiteralPath $ParentRepo).Path
$uiPath = Join-Path $parentPath 'contractnest-ui'
$files = @(
 'src\components\contracts\ContractWizard\experience\AgreementPage.tsx',
 'src\components\contracts\ContractWizard\experience\agreement.css',
 'src\components\contracts\ContractWizard\experience\AgreementLabels.tsx'
)
function Read-Normalized([string]$path) { return ((Get-Content -LiteralPath $path -Raw) -replace "`r", '') }
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
 } elseif (Test-Path -LiteralPath $baseline) { throw "Required existing file missing: $file" }
}
if ($CheckOnly) { Write-Host 'Preflight passed. No files changed.' -ForegroundColor Green; exit 0 }
$backup = Join-Path $PSScriptRoot ('LOCAL_BACKUP\' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
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
 if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $target).Hash) { throw "Copy failed: $file. Backup: $backup" }
}
Write-Host 'Copied 3 UI files. Restart UI and Ctrl+F5. Test /contracts/experience/create?relationship=partner' -ForegroundColor Green
Write-Host "Previous files backed up at: $backup"
