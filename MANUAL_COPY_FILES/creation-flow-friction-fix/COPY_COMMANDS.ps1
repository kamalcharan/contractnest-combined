$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ui=Join-Path $root 'contractnest-ui'
$payload=Join-Path $PSScriptRoot 'contractnest-ui'
$backup=Join-Path $PSScriptRoot ('LOCAL_BACKUP\'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
$files=@(
 @{Path='src\components\contracts\ContractWizard\experience\AgreementPage.tsx';Old='87AECBAF93249A24BE9A715215CFC9CE0B456F351C9475C2B9749B1CC9A24DCA';New='255CD06E7D74A89115031FD0EE0B273785356A827C4630D6D8F1ADBC8194700D'},
 @{Path='src\components\contracts\ContractWizard\experience\CoveragePage.tsx';Old='18C07F3BF2D399861C6ABD8DC1566E3309AC953F0FD3A85C3FB41D39F4C1826C';New='1A5CFCE06D773E7ED8440CAE6E892E7FDCD74ABEB1204DF1137DC29FBDF48013'},
 @{Path='src\components\contracts\ContractWizard\experience\ServicesPage.tsx';Old='417B712DE9E02105A014B4EF7AC8C1B2F5391EE1D4F1952A14886D959CD5D738';New='AF08337E6ED0C819887F770FC790DA1C95FC62B14F4DEE943315217320FCD80F'},
 @{Path='src\components\contracts\ContractWizard\experience\MoneyPage.tsx';Old='08B66647AFD000E4363155DE24256E077D62DEDA2621C5B211CE8964D1C00F29';New='50081C526328D68080DDB04391E27199D4DB40ACC578E4B76790F42C126659BC'},
 @{Path='src\components\contracts\ContractWizard\experience\DeliveryPage.tsx';Old='226712B925553D86ED40E2F4DC6B893E631D07E5D00EEFDB05DDDA3534BFB170';New='4971FBB13BAC940069E49FA77F58FD2F3FFD27A0A4855E953E651812EE7DD64F'},
 @{Path='src\components\contracts\ContractWizard\experience\EventsPage.tsx';Old='035E7AFE6AF79E9ECFA7B60F0E8ED6271DFD44CEF584448BE1A20784DCA505C2';New='06C609991254DF62585ACADC1F20C94D015AAA637A6FEB48B873DCD948A190E4'}
)
foreach($f in $files){$target=Join-Path $ui $f.Path;if(!(Test-Path -LiteralPath $target)){throw "Missing contractnest-ui\$($f.Path). Nothing copied."};$hash=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash;if($hash -ne $f.Old -and $hash -ne $f.New){throw "Local edits differ in contractnest-ui\$($f.Path). Nothing copied. Request a refreshed patch."}}
foreach($f in $files){$target=Join-Path $ui $f.Path;$saved=Join-Path $backup $f.Path;New-Item -ItemType Directory -Force -Path (Split-Path $saved)|Out-Null;Copy-Item -LiteralPath $target -Destination $saved -Force;Copy-Item -LiteralPath (Join-Path $payload $f.Path) -Destination $target -Force}
Write-Host 'Copied 6 UI files. Restart UI and Ctrl+F5.' -ForegroundColor Green
Write-Host 'Primary Continue now saves and advances. Holiday dates are advisory.' -ForegroundColor Cyan
Write-Host "Previous files backed up at: $backup" -ForegroundColor DarkGray
