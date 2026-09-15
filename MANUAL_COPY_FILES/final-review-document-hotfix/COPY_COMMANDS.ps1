$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path;$ui=Join-Path $root 'contractnest-ui';$payload=Join-Path $PSScriptRoot 'contractnest-ui';$backup=Join-Path $PSScriptRoot ('LOCAL_BACKUP\'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
$files=@(
 @{Path='src\components\contracts\ContractWizard\steps\ReviewSendStep.tsx';Old='F55A47501184AA4BE85F29F5AE773AC41D7505DB17C5C8BB74AFEB0D0F86BEAA';New='CBF1CE5B574D36C121BC8F5296096C0A21C9FDA3E413513D40B625C3F4D5B70E'},
 @{Path='src\components\contracts\ContractWizard\experience\ReviewPage.tsx';Old='45300CB8C0F5CD3F778235691826D46DA521CF4F70F71D89ED04624AC6B2F839';New='631C8E508DA8F42118D68876091C5972F8A6A9773A267B0006A264A332E6A738'}
)
foreach($f in $files){$target=Join-Path $ui $f.Path;$hash=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash;if($hash -ne $f.Old -and $hash -ne $f.New){throw "Local edits differ in contractnest-ui\$($f.Path). Nothing copied. Request a refreshed patch."}}
foreach($f in $files){$target=Join-Path $ui $f.Path;$saved=Join-Path $backup $f.Path;New-Item -ItemType Directory -Force -Path (Split-Path $saved)|Out-Null;Copy-Item -LiteralPath $target -Destination $saved -Force;Copy-Item -LiteralPath (Join-Path $payload $f.Path) -Destination $target -Force}
Write-Host 'Corrected Final Review: document restored and legacy side panel removed.' -ForegroundColor Green
