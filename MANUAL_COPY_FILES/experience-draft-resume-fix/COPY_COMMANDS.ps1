param([string]$ParentRepo=(Join-Path $PSScriptRoot '..\..'),[switch]$CheckOnly)
$ErrorActionPreference='Stop'
$parentPath=(Resolve-Path -LiteralPath $ParentRepo).Path
$files=@(
 'contractnest-ui\src\pages\contracts\experience\index.tsx',
 'contractnest-ui\src\components\contracts\ContractWizard\index.tsx'
)
function Read-Normalized([string]$path){return((Get-Content -LiteralPath $path -Raw)-replace "`r",'')}
foreach($file in $files){
 $source=Join-Path $PSScriptRoot $file;$target=Join-Path $parentPath $file;$baseline=Join-Path "$PSScriptRoot\BASELINE" $file
 if(!(Test-Path -LiteralPath $source)){throw "Release file missing: $file. Nothing copied."}
 if(!(Test-Path -LiteralPath $target)){throw "Required existing file missing: $file. Nothing copied."}
 $current=Read-Normalized $target;$applied=$current -ceq (Read-Normalized $source);$original=(Test-Path -LiteralPath $baseline)-and($current -ceq (Read-Normalized $baseline))
 if(!$applied-and!$original){throw "Local edits differ in $file. Nothing copied. Request a refreshed patch."}
}
if($CheckOnly){Write-Host 'Preflight passed for both UI files. No files changed.' -ForegroundColor Green;exit 0}
$backup=Join-Path $PSScriptRoot ('LOCAL_BACKUP\'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
foreach($file in $files){$source=Join-Path $PSScriptRoot $file;$target=Join-Path $parentPath $file;$backupFile=Join-Path $backup $file;New-Item -ItemType Directory -Force (Split-Path -Parent $backupFile)|Out-Null;Copy-Item -LiteralPath $target -Destination $backupFile -Force;Copy-Item -LiteralPath $source -Destination $target -Force;if((Get-FileHash $source).Hash-ne(Get-FileHash $target).Hash){throw "Copy verification failed: $file. Backup: $backup"}}
Write-Host 'Copied and verified 2 UI files. Restart UI, then Ctrl+F5.' -ForegroundColor Green
Write-Host 'Previous files backed up at:' $backup
