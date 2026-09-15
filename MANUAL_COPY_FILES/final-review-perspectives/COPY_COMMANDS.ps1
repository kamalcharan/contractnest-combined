$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ui=Join-Path $root 'contractnest-ui';$payload=Join-Path $PSScriptRoot 'contractnest-ui';$backup=Join-Path $PSScriptRoot ('LOCAL_BACKUP\'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
$files=@(
 @{Path='src\components\contracts\ContractWizard\steps\ReviewSendStep.tsx';Old='586749B24F920F9F6663A868C4B97845F6E52C0F530E5742E64E65CF46ED3EEA';New='BE7570A15320610C638F1ED2B8CC67D24FB9FF72BF28816067ADA94CB4D030D6'},
 @{Path='src\components\contracts\ContractWizard\experience\ReviewPage.tsx';Old='68788FA4260A387AC02EAEE69DEA57E9A102B034CDE4669A15A7560CAC3AF16B';New='40C169A60E432DD988FCEFDA9B6C6D451178576E2E64AA66BAE4FFE59ECCF1BD'},
 @{Path='src\components\contracts\ContractWizard\experience\review.css';Old='5265C36AC6347C452DA8FBB5325FA74B0CB2A17A76D6EF57E28F7C08974D966B';New='339D9D0ACEA82022B3DAA8A4C82CF1DCA3DDBB5B9F0C629359F577DACC6976D3'}
)
foreach($f in $files){$target=Join-Path $ui $f.Path;$hash=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash;if($hash -ne $f.Old -and $hash -ne $f.New){throw "Local edits differ in contractnest-ui\$($f.Path). Nothing copied. Request a refreshed patch."}}
foreach($f in $files){$target=Join-Path $ui $f.Path;$saved=Join-Path $backup $f.Path;New-Item -ItemType Directory -Force -Path (Split-Path $saved)|Out-Null;Copy-Item -LiteralPath $target -Destination $saved -Force;Copy-Item -LiteralPath (Join-Path $payload $f.Path) -Destination $target -Force}
Write-Host 'Copied 3 UI files. Restart UI and Ctrl+F5.' -ForegroundColor Green
Write-Host 'Final Review now uses the product-led frame with Seller and Customer/Partner document views.' -ForegroundColor Cyan
