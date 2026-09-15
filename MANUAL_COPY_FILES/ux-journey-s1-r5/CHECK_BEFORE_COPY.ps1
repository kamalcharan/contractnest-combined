$ErrorActionPreference = 'Stop'
$releaseRoot = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $releaseRoot '..\..')).Path
$manifest = Get-Content -Raw -LiteralPath (Join-Path $releaseRoot 'MANIFEST.json') | ConvertFrom-Json
function Get-NormalizedHash([string]$filePath) {
    $content = [System.IO.File]::ReadAllText($filePath).Replace("`r`n", "`n")
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($content)))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
}
foreach ($file in $manifest.files) {
    $source = Join-Path $releaseRoot $file.path
    $target = Join-Path $repoRoot $file.path
    if (!(Test-Path -LiteralPath $source) -or (Get-NormalizedHash $source) -ne $file.releaseHash) { throw "Package file missing or changed: $($file.path)" }
    if (Test-Path -LiteralPath $target) {
        $actual = Get-NormalizedHash $target
        if ($actual -ne $file.releaseHash -and $actual -ne $file.baseHash) {
            throw "STOP: $($file.path) differs from the tested baseline. Do not overwrite it. Request a refreshed package for your current code."
        }
    } elseif ($file.baseHash) { throw "Expected existing file is missing: $($file.path)" }
}
Write-Host 'PASS: all release files verified; existing target files match the baseline or this release.' -ForegroundColor Green
