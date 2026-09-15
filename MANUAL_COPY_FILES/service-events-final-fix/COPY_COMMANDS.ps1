param([string]$ParentRepo=(Join-Path $PSScriptRoot '..\..'),[switch]$CheckOnly)
$ErrorActionPreference='Stop'
$parentPath=(Resolve-Path -LiteralPath $ParentRepo).Path
$file='contractnest-ui\src\utils\service-contracts\contractEvents.ts'
$source=Join-Path $PSScriptRoot $file
$target=Join-Path $parentPath $file
$baseline=Join-Path "$PSScriptRoot\BASELINE" $file
function Read-Normalized([string]$path){return((Get-Content -LiteralPath $path -Raw)-replace "`r",'')}
if(!(Test-Path -LiteralPath $source)){throw "Release file missing. Nothing copied."}
if(!(Test-Path -LiteralPath $target)){throw "Target file missing. Nothing copied."}
$current=Read-Normalized $target
$applied=$current -ceq (Read-Normalized $source)
$original=$current -ceq (Read-Normalized $baseline)
if(!$applied-and!$original){throw "Local contractEvents.ts changed after this package was prepared. Nothing copied."}
if($CheckOnly){Write-Host 'Preflight passed for contractEvents.ts. No files changed.' -ForegroundColor Green;exit 0}
$backup=Join-Path $PSScriptRoot ('LOCAL_BACKUP\'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff')+'\'+$file)
New-Item -ItemType Directory -Force (Split-Path -Parent $backup)|Out-Null
Copy-Item -LiteralPath $target -Destination $backup -Force
Copy-Item -LiteralPath $source -Destination $target -Force
if((Get-FileHash $source).Hash-ne(Get-FileHash $target).Hash){throw "Copy verification failed. Backup: $backup"}
Write-Host 'Copied and verified contractEvents.ts. Restart UI, then Ctrl+F5.' -ForegroundColor Green
Write-Host 'Previous file backed up at:' $backup
