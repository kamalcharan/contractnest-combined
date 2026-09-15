$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$files = @('src\components\contracts\ContractWizard\index.tsx','src\components\contracts\ContractWizard\experience\ReviewPage.tsx','src\components\contracts\ContractWizard\experience\review.css','src\components\contracts\ContractWizard\experience\CompletionPage.tsx')
function Read-Normalized([string]$path) { return [IO.File]::ReadAllText($path).Replace("`r`n","`n").TrimEnd() }
foreach ($file in $files) {
 $target = Join-Path "$root\contractnest-ui" $file
 $baseline = Join-Path "$PSScriptRoot\BASELINE\contractnest-ui" $file
 $source = Join-Path "$PSScriptRoot\contractnest-ui" $file
 if (!(Test-Path -LiteralPath $source)) { throw "Missing package file $source. Nothing copied." }
 if (Test-Path -LiteralPath $target) {
  $current = Read-Normalized $target
  $matches = $current -ceq (Read-Normalized $source)
  if (Test-Path -LiteralPath $baseline) { $matches = $matches -or ($current -ceq (Read-Normalized $baseline)) }
  if (!$matches) { throw "Local changes in $target. Nothing copied. Request a refreshed package." }
 } elseif (Test-Path -LiteralPath $baseline) { throw "Missing existing file $target. Nothing copied." }
}
$backup = Join-Path $PSScriptRoot ('LOCAL_BACKUP\' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
foreach ($file in $files) {
 $target = Join-Path "$root\contractnest-ui" $file
 if (Test-Path -LiteralPath $target) {
  $saved = Join-Path $backup $file
  New-Item -ItemType Directory -Force -Path (Split-Path $saved) | Out-Null
  Copy-Item -LiteralPath $target -Destination $saved -Force
 }
 New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
 Copy-Item -LiteralPath (Join-Path "$PSScriptRoot\contractnest-ui" $file) -Destination $target -Force
}
Write-Host 'Copied 4 UI files. Restart UI and Ctrl+F5.' -ForegroundColor Green
Write-Host "Backup: $backup"
