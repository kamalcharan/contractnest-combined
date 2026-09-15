$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$files = @('src\components\contracts\ContractWizard\index.tsx','src\components\contracts\ContractWizard\experience\ReviewPage.tsx','src\components\contracts\ContractWizard\experience\review.css')
function Read-Normalized([string]$path) { return [IO.File]::ReadAllText($path).Replace("`r`n","`n").TrimEnd() }
foreach ($file in $files) {
 $target = Join-Path "$root\contractnest-ui" $file
 $baseline = Join-Path "$PSScriptRoot\BASELINE\contractnest-ui" $file
 $source = Join-Path "$PSScriptRoot\contractnest-ui" $file
 if (!(Test-Path -LiteralPath $target)) { throw "Missing $target. Nothing copied." }
 $current = Read-Normalized $target
 if ($current -cne (Read-Normalized $baseline) -and $current -cne (Read-Normalized $source)) { throw "Local changes in $target. Nothing copied. Request a refreshed package." }
}
$backup = Join-Path $PSScriptRoot ('LOCAL_BACKUP\' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
foreach ($file in $files) {
 $target = Join-Path "$root\contractnest-ui" $file
 $saved = Join-Path $backup $file
 New-Item -ItemType Directory -Force -Path (Split-Path $saved) | Out-Null
 Copy-Item -LiteralPath $target -Destination $saved -Force
 Copy-Item -LiteralPath (Join-Path "$PSScriptRoot\contractnest-ui" $file) -Destination $target -Force
}
Write-Host 'Copied 3 UI files. Restart UI and Ctrl+F5.' -ForegroundColor Green
Write-Host "Backup: $backup"
