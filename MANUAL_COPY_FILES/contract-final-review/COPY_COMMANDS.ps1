$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ui = Join-Path $root 'contractnest-ui'
$payload = Join-Path $PSScriptRoot 'contractnest-ui'
$backup = Join-Path $PSScriptRoot ('LOCAL_BACKUP\' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))

$files = @(
  @{ Path='src\components\contracts\ContractWizard\index.tsx'; Baseline='F14FA684DBFF8E0930FB295A697F6DD1D425BACA52F71F8EF58D10A4B1707E40'; Final='2AC5A2F7579E05E9C26514570991FB5F477B20C6F3F0BB4F33C84B910AB33BC7'; New=$false },
  @{ Path='src\components\contracts\ContractWizard\experience\EventsPage.tsx'; Baseline='CEE360D543C701654D6F4EAE014208E8ABAA7E64546B129EF07C56DE2221477A'; Final='A8A637EFD40A69C2CE12699F199EFF30BD2C85140A00C43E657357E9BAAEAC38'; New=$false },
  @{ Path='src\components\contracts\ContractWizard\experience\ReviewPage.tsx'; Final='0B93DA04387818054FE5B083D5D845F6F6439C4CD6A44ACF05EC6F5FD0B0F637'; New=$true },
  @{ Path='src\components\contracts\ContractWizard\experience\review.css'; Final='614F0694CD5B2119D29549F95E7D7233EFB1BE0CF5AF8CEB5085CA73A637EBAC'; New=$true }
)

foreach ($file in $files) {
  $target = Join-Path $ui $file.Path
  if (Test-Path -LiteralPath $target) {
    $hash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
    $allowed = $hash -eq $file.Final -or (!$file.New -and $hash -eq $file.Baseline)
    if (!$allowed) { throw "Local edits differ in contractnest-ui\$($file.Path). Nothing copied. Request a refreshed patch." }
  } elseif (!$file.New) {
    throw "Required existing file is missing: contractnest-ui\$($file.Path). Nothing copied."
  }
}

foreach ($file in $files) {
  $target = Join-Path $ui $file.Path
  if (Test-Path -LiteralPath $target) {
    $backupFile = Join-Path $backup $file.Path
    New-Item -ItemType Directory -Force -Path (Split-Path $backupFile) | Out-Null
    Copy-Item -LiteralPath $target -Destination $backupFile -Force
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
  Copy-Item -LiteralPath (Join-Path $payload $file.Path) -Destination $target -Force
}

Write-Host 'Copied 4 UI files. Restart UI and Ctrl+F5.' -ForegroundColor Green
Write-Host 'Test /contracts/experience/create, continue through Events Preview, then complete Final review.' -ForegroundColor Cyan
Write-Host "Previous files backed up at: $backup" -ForegroundColor DarkGray
