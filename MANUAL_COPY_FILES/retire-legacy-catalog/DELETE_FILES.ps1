# =============================================================================
# retire-legacy-catalog — STEP A: delete retired files
# =============================================================================
# Run from:  D:\projects\core projects\ContractNest\contractnest-combined
# Deletes the legacy service-catalog stack from contractnest-ui / -api / -edge.
# Uses `git rm` so the deletions are staged for you; falls back to Remove-Item
# if a path is untracked. Safe to re-run (missing paths are skipped).
# =============================================================================

$ErrorActionPreference = 'Stop'
$root = Get-Location
Write-Host "Retiring legacy service-catalog files..." -ForegroundColor Cyan

$targets = @{
  'contractnest-ui' = @(
    'src/pages/catalog',
    'src/components/catalog',
    'src/utils/catalog',
    'src/hooks/queries/useServiceCatalogQueries.ts',
    'src/hooks/queries/useServiceCatalogQueries1.ts',
    'src/hooks/queries/useServices.ts',
    'src/hooks/mutations/useServiceCatalogMutations.ts',
    'src/hooks/mutations/useBulkServiceCatalogMutations.ts',
    'src/services/graphql/serviceCatalogGraphQLUrls.ts'
  )
  'contractnest-api' = @(
    'src/routes/serviceCatalogRoutes.ts',
    'src/controllers/serviceCatalogController.ts',
    'src/middleware/serviceCatalogAuth.ts',
    'src/services/serviceCatalogService.ts',
    'src/services/serviceCatalogGraphQLService.ts',
    'src/services/resourceService.ts',
    'src/services/catalogValidationService.ts',
    'src/types/serviceCatalogTypes.ts',
    'src/types/serviceCatalogGraphQL.ts',
    'src/validators/serviceCatalogValidator.ts'
  )
  'contractnest-edge' = @(
    'supabase/functions/service-catalog'
  )
}

foreach ($repo in $targets.Keys) {
  Write-Host "`n--- $repo ---" -ForegroundColor Yellow
  Push-Location (Join-Path $root $repo)
  foreach ($p in $targets[$repo]) {
    if (Test-Path $p) {
      & git rm -r -q -- $p 2>$null
      if ($LASTEXITCODE -ne 0) { Remove-Item -Recurse -Force $p }
      Write-Host "  deleted  $p" -ForegroundColor Green
    } else {
      Write-Host "  skipped (absent)  $p" -ForegroundColor DarkGray
    }
  }
  Pop-Location
}

Write-Host "`nDone. 22 paths processed." -ForegroundColor Green
Write-Host "Next: STEP B — copy the modified files (see COPY_INSTRUCTIONS.txt)." -ForegroundColor Cyan
