# Catalog Studio - Test Cases

## Pre-requisites
- [ ] All migrations run in Supabase
- [ ] Edge functions deployed
- [ ] API server running
- [ ] UI dev server running

---

## 1. API Health Check

TC-1.1: Health Endpoint
curl http://localhost:3001/api/catalog-studio/health
Expected: { "success": true, "service": "catalog-studio" }

---

## 2. Blocks API Tests

TC-2.1: List All Blocks
curl http://localhost:3001/api/catalog-studio/blocks -H "Authorization: Bearer TOKEN"
Expected: { "success": true, "data": { "blocks": [...] } }

TC-2.2: Create Block (Admin Only)
curl -X POST http://localhost:3001/api/catalog-studio/blocks -H "x-is-admin: true" -d '{...}'

TC-2.3: Update Block (Admin Only)
curl -X PATCH http://localhost:3001/api/catalog-studio/blocks/{id} -H "x-is-admin: true"

TC-2.4: Delete Block (Admin Only)
curl -X DELETE http://localhost:3001/api/catalog-studio/blocks/{id} -H "x-is-admin: true"

---

## 3. Templates API Tests

TC-3.1: List Tenant Templates
curl http://localhost:3001/api/catalog-studio/templates

TC-3.2: List System Templates
curl http://localhost:3001/api/catalog-studio/templates/system

TC-3.3: Create Template
curl -X POST http://localhost:3001/api/catalog-studio/templates

TC-3.4: Copy System Template
curl -X POST http://localhost:3001/api/catalog-studio/templates/{id}/copy

---

## 4. UI Tests - Blocks Pagexxxx`

TC-4.1: Page Loads with API Data
1. Navigate to: Menu > Catalog Studio > Configure (Blocks)
2. Expected: Loading spinner, then API data displayed
3. Check Console: No errors, API calls to /api/catalog-studio/blocks

TC-4.2: Create Block
1. Click Create Block button
2. Fill form, save
3. Expected: Block appears in list

TC-4.3: Edit Block
1. Click edit on block
2. Modify, save
3. Expected: Changes reflected

TC-4.4: Delete Block
1. Click delete on block
2. Confirm
3. Expected: Block removed

---

## 5. UI Tests - Templates Page

TC-5.1: Page Loads
1. Navigate to Templates
2. Expected: Shows tenant templates

TC-5.2: Tab Switching
1. Click System Templates tab
2. Expected: Shows global templates

TC-5.3: Copy Template
1. Click copy on system template
2. Expected: Copied to My Templates

---

## 6. UI Tests - Template Builder

TC-6.1: Create New Template
1. Click Create Template
2. Expected: Empty canvas, blocks library loads

TC-6.2: Edit Existing
1. Click edit on template
2. Expected: URL has ?templateId=xxx&edit=true
3. Expected: Template loads with blocks

TC-6.3: Save with Cmd+S
1. Make changes
2. Press Cmd+S
3. Expected: Saves, unsaved indicator gone

---

## 7. Console Verification

No Errors:
- [ ] No "getAllBlocks is not defined"
- [ ] No "ICON_OPTIONS is not defined"
- [ ] No 404 for API endpoints
- [ ] No CORS errors

API Calls Made:
- [ ] GET /api/catalog-studio/blocks
- [ ] GET /api/catalog-studio/templates
