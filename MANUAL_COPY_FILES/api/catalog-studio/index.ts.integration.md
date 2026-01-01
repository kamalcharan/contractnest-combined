# Integration Guide: Catalog Studio in index.ts

## File: contractnest-api/src/index.ts

---

## STEP 1: Add Route Loading (after seedRoutes loading, ~line 270)

```typescript
// Load Catalog Studio routes with error handling
let catalogStudioRoutes;
try {
  catalogStudioRoutes = require('./routes/catalogStudioRoutes').default;
  console.log('✅ Catalog Studio routes loaded');
} catch (error) {
  console.error('❌ Failed to load catalog studio routes:', error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    console.warn('⚠️  Continuing without catalog studio routes...');
    catalogStudioRoutes = null;
  }
}
```

---

## STEP 2: Add Route Registration (after seedRoutes registration, ~line 560)

```typescript
// Register Catalog Studio routes with error handling
try {
  if (catalogStudioRoutes) {
    app.use('/api/catalog-studio', catalogStudioRoutes);
    console.log('✅ Catalog Studio routes registered at /api/catalog-studio');
  } else {
    console.log('⚠️  Catalog Studio routes skipped (not loaded)');
  }
} catch (error) {
  console.error('❌ Failed to register catalog studio routes:', error);
  captureException(error instanceof Error ? error : new Error(String(error)), {
    tags: { source: 'route_registration', route_type: 'catalog_studio' }
  });
}
```

---

## STEP 3: Update Health Check - services object (~line 600)

Add to `services` object:
```typescript
catalogStudio: catalogStudioRoutes ? 'loaded' : 'not_loaded',
```

---

## STEP 4: Update Health Check - features object (~line 612)

Add to `features` object:
```typescript
catalog_studio: catalogStudioRoutes !== null,
```

---

## STEP 5: Update Health Check - try block (~line 698)

Add after other service health checks:
```typescript
// Check catalog studio service health if available
if (catalogStudioRoutes) {
  try {
    healthData.services.catalogStudio = 'healthy';
  } catch (error) {
    healthData.services.catalogStudio = 'error';
  }
}
```

---

## STEP 6: Update Root Endpoint - services object (~line 732)

Add to `services` object:
```typescript
catalogStudio: catalogStudioRoutes ? 'available' : 'not_available',
```

---

## STEP 7: Update Root Endpoint - endpoints object (~line 741)

Add to `endpoints` object:
```typescript
catalogStudio: '/api/catalog-studio',
```

---

## STEP 8: Add Console Logging (after seed routes logging, ~line 1071)

```typescript
// Log catalog studio routes if available
if (catalogStudioRoutes) {
  console.log('📍 Catalog Studio routes:');
  console.log('- GET    /api/catalog-studio/health                           # Service health check');
  console.log('- GET    /api/catalog-studio/blocks                           # List blocks (filtered by admin)');
  console.log('- GET    /api/catalog-studio/blocks/:id                       # Get block by ID');
  console.log('- POST   /api/catalog-studio/blocks                           # Create block (admin only)');
  console.log('- PATCH  /api/catalog-studio/blocks/:id                       # Update block (admin only)');
  console.log('- DELETE /api/catalog-studio/blocks/:id                       # Delete block (admin only)');
  console.log('- GET    /api/catalog-studio/templates                        # List tenant templates');
  console.log('- GET    /api/catalog-studio/templates/system                 # List system templates');
  console.log('- GET    /api/catalog-studio/templates/public                 # List public templates');
  console.log('- GET    /api/catalog-studio/templates/:id                    # Get template by ID');
  console.log('- POST   /api/catalog-studio/templates                        # Create template');
  console.log('- POST   /api/catalog-studio/templates/:id/copy               # Copy system template');
  console.log('- PATCH  /api/catalog-studio/templates/:id                    # Update template');
  console.log('- DELETE /api/catalog-studio/templates/:id                    # Delete template');
  console.log('📋 Catalog Studio features:');
  console.log('  ✅ Global blocks library (service, spare, billing, text, video, image, checklist, document)');
  console.log('  ✅ Admin-only block creation and management');
  console.log('  ✅ Template builder with block composition');
  console.log('  ✅ System templates for quick start');
  console.log('  ✅ Template copying from system to tenant');
  console.log('  ✅ Multi-tenant template isolation');
  console.log('  ✅ Environment segregation (live/test)');
  console.log('  ✅ HMAC-secured edge function communication');
  console.log('  ✅ Flexible pricing modes (independent, resource_based, variant_based, multi_resource)');
} else {
  console.log('⚠️  Catalog Studio routes not available');
}
```

---

## STEP 9: Update 404 Handler - availableEndpoints (~line 778)

Add to `availableEndpoints` object:
```typescript
catalogStudio: '/api/catalog-studio',
```

---

## Summary of Changes

| Location | What to Add |
|----------|-------------|
| ~line 270 | Route loading with try/catch |
| ~line 560 | Route registration with try/catch |
| ~line 600 | Health check services object |
| ~line 612 | Health check features object |
| ~line 698 | Health check try block |
| ~line 732 | Root endpoint services |
| ~line 741 | Root endpoint endpoints |
| ~line 1071 | Console logging |
| ~line 778 | 404 handler endpoints |
