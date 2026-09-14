param([string]$ParentRepo = (Join-Path $PSScriptRoot '..\..'), [switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$parentPath = (Resolve-Path -LiteralPath $ParentRepo).Path
$files = @(
 'contractnest-ui\src\components\contracts\ContractWizard\index.tsx',
 'contractnest-ui\src\components\contracts\ContractWizard\experience\ServicesPage.tsx',
 'contractnest-ui\src\components\contracts\ContractWizard\experience\MoneyPage.tsx',
 'contractnest-ui\src\components\contracts\ContractWizard\experience\moneyModel.ts',
 'contractnest-ui\src\components\contracts\ContractWizard\experience\money.css',
 'contractnest-ui\src\components\contracts\ContractWizard\steps\BillingViewStep.tsx',
 'contractnest-ui\src\components\contracts\ContractWizard\logic\mapper.ts',
 'contractnest-ui\src\utils\service-contracts\contractEvents.ts',
 'contractnest-api\src\services\contractEventsDerivationService.ts'
)
function Read-Normalized([string]$path) { return ((Get-Content -LiteralPath $path -Raw) -replace "`r", '') }
# Validate ALL UI/API targets before copying any file. Reapplying is safe.
foreach ($file in $files) {
 $source = Join-Path $PSScriptRoot $file
 $target = Join-Path $parentPath $file
 $baseline = Join-Path "$PSScriptRoot\BASELINE" $file
 if (!(Test-Path -LiteralPath $source)) { throw "Release file missing: $file. Nothing copied." }
 if (Test-Path -LiteralPath $target) {
  $current = Read-Normalized $target
  $alreadyApplied = $current -ceq (Read-Normalized $source)
  $matchesBaseline = (Test-Path -LiteralPath $baseline) -and ($current -ceq (Read-Normalized $baseline))
  if (!$alreadyApplied -and !$matchesBaseline) { throw "Local edits differ in $file. Nothing copied. Request a refreshed patch; do not force overwrite." }
 } elseif (Test-Path -LiteralPath $baseline) { throw "Required existing file missing: $file. Nothing copied." }
}
if ($CheckOnly) { Write-Host 'Preflight passed for all 9 UI/API files. No files changed.' -ForegroundColor Green; exit 0 }
$backup = Join-Path $PSScriptRoot ('LOCAL_BACKUP\' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
foreach ($file in $files) {
 $source = Join-Path $PSScriptRoot $file
 $target = Join-Path $parentPath $file
 if (Test-Path -LiteralPath $target) {
  $backupFile = Join-Path $backup $file
  New-Item -ItemType Directory -Force (Split-Path -Parent $backupFile) | Out-Null
  Copy-Item -LiteralPath $target -Destination $backupFile -Force
 }
 New-Item -ItemType Directory -Force (Split-Path -Parent $target) | Out-Null
 Copy-Item -LiteralPath $source -Destination $target -Force
 if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $target).Hash) { throw "Copy verification failed: $file. Backup: $backup" }
}
Write-Host 'Copied and verified 8 UI files + 1 API file. Restart BOTH UI and API, then Ctrl+F5.' -ForegroundColor Green
Write-Host 'Open /contracts/experience/create?relationship=partner. Services > Save services > Continue to Money.'
Write-Host "Previous files backed up at: $backup"
