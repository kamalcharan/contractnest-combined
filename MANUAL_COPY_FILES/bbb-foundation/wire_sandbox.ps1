# ============================================================================
# wire_sandbox.ps1 — registers the Sandbox reset route in your local index.ts.
# Idempotent + non-destructive (inserts a line tagged [sandbox-route] only if
# missing). The UI card needs no wiring — it drops into the Storage page.
# ============================================================================
$ErrorActionPreference = 'Stop'
$root = "D:\projects\core projects\ContractNest\contractnest-combined"
$idx  = Join-Path $root "contractnest-api\src\index.ts"
$i = Get-Content -Raw $idx

if ($i -match 'sandbox-route') {
  Write-Host "index.ts already has the sandbox route - skipping." -ForegroundColor Yellow
} else {
  $impAnchor = "import { authenticate } from './middleware/auth';"
  $useAnchor = "app.use('/api', systemRoutes);"
  if (-not ($i.Contains($impAnchor) -and $i.Contains($useAnchor))) {
    Write-Warning "Anchors not found - add manually:"
    Write-Warning "  import sandboxRoutes from './routes/sandboxRoutes';"
    Write-Warning "  app.use('/api/sandbox', sandboxRoutes);"
  } else {
    $i = $i.Replace($impAnchor, $impAnchor + "`r`nimport sandboxRoutes from './routes/sandboxRoutes'; // [sandbox-route]")
    $i = $i.Replace($useAnchor, $useAnchor + "`r`napp.use('/api/sandbox', sandboxRoutes); // [sandbox-route] tenant-scoped reset")
    Set-Content -Path $idx -Value $i -NoNewline
    Write-Host "index.ts sandbox route wired." -ForegroundColor Green
  }
}
Write-Host "Restart the API dev server." -ForegroundColor Cyan
