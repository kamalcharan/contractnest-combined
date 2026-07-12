# ============================================================================
# wire_sandbox.ps1 — wires the Sandbox feature into your local files:
#   • index.ts (API): registers /api/sandbox
#   • App.tsx  (UI):  adds the /settings/storage/sandbox page route
# Idempotent + non-destructive (tagged [sandbox-route], inserts only if missing).
# The Storage-Space card itself comes from settingsMenus.ts (copied), no wiring.
# ============================================================================
$ErrorActionPreference = 'Stop'
$root = "D:\projects\core projects\ContractNest\contractnest-combined"

function Ins([string]$content, [string]$anchor, [string]$insert, [string]$label) {
  if (-not $content.Contains($anchor)) { Write-Warning "  Anchor NOT found ($label). Add manually."; return $content }
  return $content.Replace($anchor, $anchor + $insert)
}

# ---------------------------------------------------------------- API index.ts
$idx = Join-Path $root "contractnest-api\src\index.ts"
$i = Get-Content -Raw $idx
if ($i -match 'sandbox-route') {
  Write-Host "index.ts already wired - skipping." -ForegroundColor Yellow
} else {
  $i = Ins $i "import { authenticate } from './middleware/auth';" "`r`nimport sandboxRoutes from './routes/sandboxRoutes'; // [sandbox-route]" "index.ts import"
  $i = Ins $i "app.use('/api', systemRoutes);" "`r`napp.use('/api/sandbox', sandboxRoutes); // [sandbox-route] tenant-scoped reset" "index.ts route"
  Set-Content -Path $idx -Value $i -NoNewline
  Write-Host "index.ts sandbox route wired." -ForegroundColor Green
}

# ---------------------------------------------------------------- UI App.tsx
$app = Join-Path $root "contractnest-ui\src\App.tsx"
$a = Get-Content -Raw $app
if ($a -match 'sandbox-route') {
  Write-Host "App.tsx already wired - skipping." -ForegroundColor Yellow
} else {
  $a = Ins $a "import StorageManagementPage from './pages/settings/storage/storagemanagement';" "`r`nimport SandboxPage from './pages/settings/storage/sandbox'; // [sandbox-route]" "App.tsx import"
  $a = Ins $a '<Route path="storage/storagemanagement" element={<StorageManagementPage />} />' "`r`n            <Route path=`"storage/sandbox`" element={<SandboxPage />} /> {/* [sandbox-route] */}" "App.tsx route"
  Set-Content -Path $app -Value $a -NoNewline
  Write-Host "App.tsx sandbox route wired." -ForegroundColor Green
}

Write-Host "`nDone. Restart both dev servers." -ForegroundColor Cyan
