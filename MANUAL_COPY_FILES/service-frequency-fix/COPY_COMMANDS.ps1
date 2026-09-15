param([string]$ParentRepo=(Join-Path $PSScriptRoot '..\..'),[switch]$CheckOnly)
$ErrorActionPreference='Stop'
$parentPath=(Resolve-Path -LiteralPath $ParentRepo).Path
$files=@(
 'contractnest-ui\src\components\contracts\ContractWizard\index.tsx',
 'contractnest-ui\src\components\contracts\ContractWizard\experience\CommitmentEditor.tsx',
 'contractnest-ui\src\components\contracts\ContractWizard\experience\ServicesCatalog.tsx',
 'contractnest-ui\src\components\contracts\ContractWizard\experience\EventsPage.tsx',
 'contractnest-ui\src\components\contracts\ContractWizard\experience\eventsModel.ts',
 'contractnest-ui\src\components\contracts\ContractWizard\experience\serviceScheduleRules.ts',
 'contractnest-ui\src\utils\service-contracts\contractEvents.ts'
)
function Read-Normalized([string]$path){return((Get-Content -LiteralPath $path -Raw)-replace "`r",'')}
foreach($file in $files){
 $source=Join-Path $PSScriptRoot $file;$target=Join-Path $parentPath $file;$baseline=Join-Path "$PSScriptRoot\BASELINE" $file
 if(!(Test-Path -LiteralPath $source)){throw "Release file missing: $file. Nothing copied."}
 if(Test-Path -LiteralPath $target){$current=Read-Normalized $target;$applied=$current -ceq (Read-Normalized $source);$original=(Test-Path -LiteralPath $baseline)-and($current -ceq (Read-Normalized $baseline));if(!$applied-and!$original){throw "Local edits differ in $file. Nothing copied. Request a refreshed patch."}}
 elseif(Test-Path -LiteralPath $baseline){throw "Required existing file missing: $file. Nothing copied."}
}
if($CheckOnly){Write-Host 'Preflight passed for all 7 UI files. No files changed.' -ForegroundColor Green;exit 0}
$backup=Join-Path $PSScriptRoot ('LOCAL_BACKUP\'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
foreach($file in $files){$source=Join-Path $PSScriptRoot $file;$target=Join-Path $parentPath $file;if(Test-Path -LiteralPath $target){$backupFile=Join-Path $backup $file;New-Item -ItemType Directory -Force (Split-Path -Parent $backupFile)|Out-Null;Copy-Item -LiteralPath $target -Destination $backupFile -Force};New-Item -ItemType Directory -Force (Split-Path -Parent $target)|Out-Null;Copy-Item -LiteralPath $source -Destination $target -Force;if((Get-FileHash $source).Hash-ne(Get-FileHash $target).Hash){throw "Copy verification failed: $file. Backup: $backup"}}
Write-Host 'Copied and verified 7 UI files. Restart UI, then Ctrl+F5.' -ForegroundColor Green
Write-Host 'Previous files backed up at:' $backup
