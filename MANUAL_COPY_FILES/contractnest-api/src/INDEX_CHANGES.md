# index.ts Changes for Multi-Product Architecture

Apply these changes to `contractnest-api/src/index.ts`:

---

## CHANGE 1: Add Import (around line 18-19)

**FIND:**
```typescript
import { setTenantContext } from './middleware/tenantContext';
```

**ADD AFTER:**
```typescript
import { setProductContext } from './middleware/productContext';
import { logProductStatus } from './config/products';
```

---

## CHANGE 2: Add x-product to CORS allowedHeaders (around line 298-313)

**FIND:**
```typescript
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-tenant-id',
```

**REPLACE WITH:**
```typescript
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-product',        // <-- ADD THIS LINE
    'x-tenant-id',
```

---

## CHANGE 3: Add Product Context Middleware (around line 336-337)

**FIND:**
```typescript
// 4. Tenant context - only reads headers, doesn't touch body
app.use(setTenantContext);
```

**REPLACE WITH:**
```typescript
// 4. Product context - determines which Supabase to use
app.use(setProductContext);

// 5. Tenant context - only reads headers, doesn't touch body
app.use(setTenantContext);
```

**NOTE:** Update the comment numbers that follow (5 becomes 6, 6 becomes 7, etc.)

---

## CHANGE 4: Add Product Status Logging at Startup (around line 96-97)

**FIND:**
```typescript
// Initialize Sentry
initSentry();
```

**ADD AFTER:**
```typescript

// Log product configuration status
logProductStatus();
```

---

## CHANGE 5: Add FamilyKnows origins to CORS (around line 272-281)

**FIND:**
```typescript
    : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'https://contractnest.com',
      'https://www.contractnest.com',
      'https://contractnest-ui-production.up.railway.app',
      'https://contractnest-api-production.up.railway.app'
    ];
```

**REPLACE WITH:**
```typescript
    : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'https://contractnest.com',
      'https://www.contractnest.com',
      'https://contractnest-ui-production.up.railway.app',
      'https://contractnest-api-production.up.railway.app',
      // FamilyKnows origins
      'https://familyknows.com',
      'https://www.familyknows.com',
      'https://admin.familyknows.com'
    ];
```

---

## Expected Console Output at Startup

After these changes, you should see:
```
📦 Product Configuration Status:
──────────────────────────────────────────────────
  ✅ contractnest (default)
     ENV Prefix: (none)
     Configured: true
  ✅ familyknows
     ENV Prefix: FK_
     Configured: true
──────────────────────────────────────────────────
```

If FamilyKnows is not configured:
```
  ❌ familyknows
     ENV Prefix: FK_
     Configured: false
     Missing: FK_SUPABASE_URL or FK_SUPABASE_KEY
```
