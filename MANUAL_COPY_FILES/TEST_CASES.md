# Catalog Studio - Test Cases

## Pre-requisites
- [ ] All migrations run in Supabase
- [ ] Edge functions deployed
- [ ] API server running
- [ ] UI dev server running

---

## 1. API Health Check

### TC-1.1: Health Endpoint
```bash
curl http://localhost:3001/api/catalog-studio/health
```
**Expected:** `{ "success": true, "service": "catalog-studio", ... }`

---

## 2. Blocks API Tests

### TC-2.1: List All Blocks
```bash
curl http://localhost:3001/api/catalog-studio/blocks \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected:** `{ "success": true, "data": { "blocks": [...] } }`

### TC-2.2: Get Single Block
```bash
curl http://localhost:3001/api/catalog-studio/blocks/{BLOCK_ID} \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected:** `{ "success": true, "data": { "id": "...", "name": "...", ... } }`

### TC-2.3: Create Block (Admin Only)
```bash
curl -X POST http://localhost:3001/api/catalog-studio/blocks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-is-admin: true" \
  -d '{
    "name": "Test Block",
    "description": "Test description",
    "block_type_id": "UUID_FROM_MASTER_DATA",
    "pricing_mode_id": "UUID_FROM_MASTER_DATA"
  }'
```
**Expected:** `{ "success": true, "data": { "id": "NEW_UUID", ... } }`

### TC-2.4: Update Block (Admin Only)
```bash
curl -X PATCH http://localhost:3001/api/catalog-studio/blocks/{BLOCK_ID} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-is-admin: true" \
  -d '{ "name": "Updated Block Name" }'
```
**Expected:** `{ "success": true, "data": { "name": "Updated Block Name", ... } }`

### TC-2.5: Delete Block (Admin Only)
```bash
curl -X DELETE http://localhost:3001/api/catalog-studio/blocks/{BLOCK_ID} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-is-admin: true"
```
**Expected:** `{ "success": true, "data": { "deleted": true } }`

---

## 3. Templates API Tests

### TC-3.1: List Tenant Templates
```bash
curl http://localhost:3001/api/catalog-studio/templates \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected:** `{ "success": true, "data": { "templates": [...] } }`

### TC-3.2: List System Templates
```bash
curl http://localhost:3001/api/catalog-studio/templates/system \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected:** `{ "success": true, "data": { "templates": [...] } }`

### TC-3.3: List Public Templates
```bash
curl http://localhost:3001/api/catalog-studio/templates/public \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected:** `{ "success": true, "data": { "templates": [...] } }`

### TC-3.4: Create Template
```bash
curl -X POST http://localhost:3001/api/catalog-studio/templates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Template",
    "description": "Test description",
    "blocks": [
      { "block_id": "BLOCK_UUID", "order": 0, "config": { "visible": true } }
    ]
  }'
```
**Expected:** `{ "success": true, "data": { "id": "NEW_UUID", ... } }`

### TC-3.5: Copy System Template
```bash
curl -X POST http://localhost:3001/api/catalog-studio/templates/{TEMPLATE_ID}/copy \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "My Copy of Template" }'
```
**Expected:** `{ "success": true, "data": { "id": "NEW_UUID", ... } }`

### TC-3.6: Update Template
```bash
curl -X PATCH http://localhost:3001/api/catalog-studio/templates/{TEMPLATE_ID} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Updated Template Name" }'
```
**Expected:** `{ "success": true, "data": { "name": "Updated Template Name", ... } }`

### TC-3.7: Delete Template
```bash
curl -X DELETE http://localhost:3001/api/catalog-studio/templates/{TEMPLATE_ID} \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected:** `{ "success": true, "data": { "deleted": true } }`

---

## 4. UI Tests - Blocks Page

### TC-4.1: Page Loads with API Data
1. Navigate to: Menu → Catalog Studio → Configure (Blocks)
2. **Expected:** Page shows loading spinner, then displays blocks from API
3. **Verify:** No "getAllBlocks" mock data visible
4. **Check Console:** No errors, should see API calls to `/api/catalog-studio/blocks`

### TC-4.2: Refresh Button Works
1. Click refresh button (RefreshCw icon)
2. **Expected:** Data refetches from API

### TC-4.3: Create Block
1. Click "Create Block" or "+" button
2. Fill in block details
3. Click Save
4. **Expected:** Block appears in list, toast shows success

### TC-4.4: Edit Block
1. Click edit button on existing block
2. Modify details
3. Click Save
4. **Expected:** Block updates, toast shows success

### TC-4.5: Delete Block
1. Click delete button on block
2. Confirm deletion
3. **Expected:** Block removed from list, toast shows success

### TC-4.6: Error State
1. Stop API server
2. Refresh page
3. **Expected:** Error message with retry button displayed

---

## 5. UI Tests - Templates List Page

### TC-5.1: Page Loads with API Data
1. Navigate to: Menu → Catalog Studio → Templates
2. **Expected:** Shows tenant templates, system templates tab available
3. **Check Console:** API calls to `/api/catalog-studio/templates`

### TC-5.2: Tab Switching
1. Click "System Templates" tab
2. **Expected:** Shows system/global templates
3. Click "Public Templates" tab
4. **Expected:** Shows public templates

### TC-5.3: Copy System Template
1. Go to System Templates tab
2. Click copy button on a template
3. Enter new name
4. **Expected:** Template copied to "My Templates" tab

### TC-5.4: Delete Template
1. Select a tenant template
2. Click delete
3. Confirm
4. **Expected:** Template removed, toast shows success

---

## 6. UI Tests - Template Builder Page

### TC-6.1: New Template Mode
1. Click "Create Template" from templates list
2. **Expected:** Empty canvas, blocks library loads from API

### TC-6.2: Edit Template Mode
1. Click edit on existing template
2. **Expected:** URL shows `?templateId=xxx&edit=true`
3. **Expected:** Template name, description, and blocks load

### TC-6.3: Add Blocks
1. Double-click block in library
2. **Expected:** Block added to canvas with animation

### TC-6.4: Reorder Blocks
1. Drag block to new position
2. **Expected:** Order updates

### TC-6.5: Save Template (Cmd+S)
1. Make changes
2. Press Cmd+S (or Ctrl+S)
3. **Expected:** Template saves, "Unsaved" indicator disappears

### TC-6.6: Save Button
1. Make changes
2. Click "Save Template" button
3. **Expected:** Template saves, toast shows success

---

## 7. Console Verification

Open browser DevTools → Console and verify:

### No Errors:
- [ ] No "getAllBlocks is not defined" errors
- [ ] No "ICON_OPTIONS is not defined" errors
- [ ] No 404 errors for API endpoints
- [ ] No CORS errors

### API Calls Made:
- [ ] `GET /api/catalog-studio/blocks` on blocks page
- [ ] `GET /api/catalog-studio/templates` on templates page
- [ ] `POST/PATCH/DELETE` on mutations

---

## 8. Network Tab Verification

Open browser DevTools → Network and verify:

### Blocks Page:
- [ ] Request to `/api/catalog-studio/blocks` returns 200
- [ ] Response contains `{ success: true, data: { blocks: [...] } }`

### Templates Page:
- [ ] Request to `/api/catalog-studio/templates` returns 200
- [ ] Request to `/api/catalog-studio/templates/system` returns 200

---

## Quick Debug Commands

### Check if page uses API hooks:
```bash
grep -n "useCatBlocks" contractnest-ui/src/pages/catalog-studio/blocks.tsx
```
Should return line number with import.

### Check if page still uses mock data:
```bash
grep -n "getAllBlocks" contractnest-ui/src/pages/catalog-studio/blocks.tsx
```
Should return nothing (no matches).

### Check API is running:
```bash
curl http://localhost:3001/api/catalog-studio/health
```

### Check Edge Function logs:
```bash
supabase functions logs cat-blocks
supabase functions logs cat-templates
```
