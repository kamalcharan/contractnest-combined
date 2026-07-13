# ============================================================================
# unwire_sandbox.ps1 — removes the retired Sandbox wiring from your local files.
# Deletes every line tagged [sandbox-route] from App.tsx and index.ts (the
# dangling SandboxPage import + /settings/storage/sandbox route + /api/sandbox
# registration). Leaves the [batch3-checkin] check-in routes untouched.
# Safe to run more than once.
# ============================================================================
$ErrorActionPreference = 'Stop'
$root = "D:\projects\core projects\ContractNest\contractnest-combined"

foreach ($rel in @("contractnest-ui\src\App.tsx", "contractnest-api\src\index.ts")) {
  $path = Join-Path $root $rel
  if (-not (Test-Path $path)) { Write-Warning "not found: $rel"; continue }
  $before = Get-Content $path
  $after  = $before | Where-Object { $_ -notmatch '\[sandbox-route\]' }
  if ($after.Count -ne $before.Count) {
    Set-Content -Path $path -Value $after
    Write-Host ("{0}: removed {1} sandbox line(s)." -f $rel, ($before.Count - $after.Count)) -ForegroundColor Green
  } else {
    Write-Host ("{0}: nothing to remove." -f $rel) -ForegroundColor Yellow
  }
}
Write-Host "`nDone. The dev server should recover on save/restart." -ForegroundColor Cyan
