# Changes Required for Implementation Toolkit

## 1. New File to Copy
Copy `src/pages/VaNi/toolkit/TenantProfilesPage.tsx` to your project.

## 2. Add Import in App.tsx (around line 85)

Add this import after the BBB imports:

```typescript
// ✅ Implementation Toolkit
import TenantProfilesPage from './pages/VaNi/toolkit/TenantProfilesPage';
```

## 3. Add Route in App.tsx (after BBB routes, around line 503)

Add this route after the BBB directory routes:

```typescript
{/* ✅ Implementation Toolkit Routes */}
<Route path="toolkit/tenant-profiles" element={<TenantProfilesPage />} />
```

## 4. Add Menu Item in industryMenus.ts

Find the `vani-analytics` submenu item (around line 221-226) and add this after it:

```typescript
      {
        id: 'vani-analytics',
        label: 'Cross-Module Analytics',
        icon: 'BarChart3',
        path: '/vani/analytics'
      },

      // Implementation Toolkit (Admin)
      {
        id: 'vani-toolkit',
        label: 'Implementation Toolkit',
        icon: 'Wrench',
        path: '/vani/toolkit/tenant-profiles',
        hasSubmenu: true,
        submenuItems: [
          {
            id: 'vani-toolkit-profiles',
            label: 'Tenant Profiles',
            icon: 'Users',
            path: '/vani/toolkit/tenant-profiles'
          },
          {
            id: 'vani-toolkit-bbb-admin',
            label: 'BBB Admin',
            icon: 'Shield',
            path: '/vani/channels/bbb/admin'
          }
        ]
      }
```

Note: Make sure to add a comma after the `vani-analytics` closing brace `}` before adding the new item.
