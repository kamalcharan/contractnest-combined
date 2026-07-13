# fix_contacts_import_route.ps1
# Restores the /contacts/import route removed from contractnest-ui/src/App.tsx
# during the Sandbox wiring hand-merge (commit b1113d8).
#
# Symptom fixed: clicking "Import" on the Contacts page opened a contact
# view/edit page instead of the import wizard, because /contacts/import fell
# through to the /contacts/:id route (":id" = "import").
#
# ASCII-only, idempotent. Safe to run more than once. Only inserts the two
# missing lines if absent. Does NOT touch Sandbox or any other lines.
#
# Run from the contractnest-combined\ root:
#   powershell -ExecutionPolicy Bypass -File .\fix_contacts_import_route.ps1

$ErrorActionPreference = 'Stop'

$appTsx = Join-Path (Get-Location) 'contractnest-ui\src\App.tsx'

if (-not (Test-Path $appTsx)) {
    Write-Host "ERROR: Could not find $appTsx" -ForegroundColor Red
    Write-Host "Run this script from the contractnest-combined root folder." -ForegroundColor Yellow
    exit 1
}

$content = Get-Content $appTsx -Raw
$changed = $false

# 1. Restore the import statement (after the ContactCreateForm import)
if ($content -notmatch "import\s+ContactsImportPage\s+from\s+'\./pages/contacts/import'") {
    $importAnchor = "import ContactCreateForm from './pages/contacts/create';"
    if ($content.Contains($importAnchor)) {
        $content = $content.Replace($importAnchor, $importAnchor + "`r`nimport ContactsImportPage from './pages/contacts/import';")
        $changed = $true
        Write-Host "[+] Added import for ContactsImportPage" -ForegroundColor Green
    } else {
        Write-Host "[!] Could not find the ContactCreateForm import anchor - import NOT added." -ForegroundColor Yellow
    }
} else {
    Write-Host "[=] ContactsImportPage import already present - skipped" -ForegroundColor DarkGray
}

# 2. Restore the route (after /contacts/create, before /contacts/:id)
if ($content -notmatch '<Route\s+path="import"\s+element=\{<ContactsImportPage\s*/>\}') {
    $routeAnchor = '<Route path="create" element={<ContactCreateForm />} />'
    if ($content.Contains($routeAnchor)) {
        $content = $content.Replace($routeAnchor, $routeAnchor + "`r`n            <Route path=`"import`" element={<ContactsImportPage />} />")
        $changed = $true
        Write-Host "[+] Added the import Route before the :id route" -ForegroundColor Green
    } else {
        Write-Host "[!] Could not find the /contacts/create route anchor - route NOT added." -ForegroundColor Yellow
    }
} else {
    Write-Host "[=] /contacts/import route already present - skipped" -ForegroundColor DarkGray
}

if ($changed) {
    Set-Content -Path $appTsx -Value $content -NoNewline -Encoding UTF8
    Write-Host ""
    Write-Host "DONE: App.tsx patched. Restart the UI dev server and hard-refresh (Ctrl+F5)." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "No changes needed - App.tsx already has the import route." -ForegroundColor Cyan
}
