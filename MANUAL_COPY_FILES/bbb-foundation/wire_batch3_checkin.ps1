# ============================================================================
# wire_batch3_checkin.ps1 — wires the Batch 3 check-in routes into your local
# App.tsx (UI) and index.ts (API). Idempotent + non-destructive: it only
# INSERTS lines (tagged [batch3-checkin]) and skips if already present. Safe to
# run more than once. It edits YOUR files in place — no other content changes.
# ============================================================================
$ErrorActionPreference = 'Stop'
$root = "D:\projects\core projects\ContractNest\contractnest-combined"

function Insert-After([string]$content, [string]$anchor, [string]$insert, [string]$label) {
  if (-not $content.Contains($anchor)) {
    Write-Warning "  Anchor NOT found ($label): add manually. Anchor was: $anchor"
    return $content
  }
  return $content.Replace($anchor, $anchor + $insert)
}

# ---------------------------------------------------------------- UI: App.tsx
$app = Join-Path $root "contractnest-ui\src\App.tsx"
$c = Get-Content -Raw $app
if ($c -match 'batch3-checkin') {
  Write-Host "App.tsx already wired - skipping." -ForegroundColor Yellow
} else {
  $impAnchor = "import MainLayout from './components/layout/MainLayout';"
  $impIns = "`r`nimport SessionCheckinPage from './pages/checkin/SessionCheckinPage'; // [batch3-checkin]" +
            "`r`nimport ChairCheckinPage from './pages/session-checkin/ChairCheckinPage'; // [batch3-checkin]"
  $c = Insert-After $c $impAnchor $impIns "App.tsx imports"

  # Insert both routes as the first entries inside <Routes>. React Router v6
  # matches by path regardless of order, so position is safe. The public route
  # has no guard; the chair route sits inside ProtectedRoute + MainLayout.
  $routesIns = "`r`n          {/* [batch3-checkin] Group Session check-in */}" +
               "`r`n          <Route path=`"/checkin/:token`" element={<SessionCheckinPage />} />" +
               "`r`n          <Route path=`"/session-checkin`" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>" +
               "`r`n            <Route index element={<ChairCheckinPage />} />" +
               "`r`n          </Route>"
  $c = Insert-After $c "<Routes>" $routesIns "App.tsx routes"

  Set-Content -Path $app -Value $c -NoNewline
  Write-Host "App.tsx wired." -ForegroundColor Green
}

# --------------------------------------------------------------- API: index.ts
$idx = Join-Path $root "contractnest-api\src\index.ts"
$i = Get-Content -Raw $idx
if ($i -match 'batch3-checkin') {
  Write-Host "index.ts already wired - skipping." -ForegroundColor Yellow
} else {
  $impAnchor = "import { authenticate } from './middleware/auth';"
  $impIns = "`r`nimport sessionCheckinPublicRoutes from './routes/sessionCheckinPublicRoutes'; // [batch3-checkin]" +
            "`r`nimport sessionCheckinRoutes from './routes/sessionCheckinRoutes'; // [batch3-checkin]"
  $i = Insert-After $i $impAnchor $impIns "index.ts imports"

  $useAnchor = "app.use('/api', systemRoutes);"
  $useIns = "`r`napp.use('/api/checkin', sessionCheckinPublicRoutes); // [batch3-checkin] PUBLIC (no auth)" +
            "`r`napp.use('/api/session-checkin', sessionCheckinRoutes); // [batch3-checkin] chair (auth)"
  $i = Insert-After $i $useAnchor $useIns "index.ts routes"

  Set-Content -Path $idx -Value $i -NoNewline
  Write-Host "index.ts wired." -ForegroundColor Green
}

Write-Host "`nDone. Restart both dev servers (API + UI)." -ForegroundColor Cyan
