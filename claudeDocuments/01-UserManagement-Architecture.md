# UserManagement Architecture - Complete Documentation

**Date:** 2025-11-08
**Branch:** claude/Taskset-1-011CUvf7Ehm4N3BSjgFJEEGZ

---

## 🏗️ Architecture Overview: UI → API → Edge Layer

### **Layer 1: UI (contractnest-ui)**

#### **Location**: `/contractnest-ui/src/pages/settings/users/`

**Main Components:**
1. **`index.tsx`** (Users List Page - Line 1-568)
   - Manages team member listing with tabs (All, Active, Pending)
   - Features: User invitations, filtering, search, pagination
   - Shows quick stats (Total Team, Active, Pending Invites, Team Limit)

2. **`userView.tsx`** (User Detail Page - Line 1-883)
   - Individual user profile view with tabs (Overview, Activity, Permissions)
   - Actions: Edit, Suspend, Activate, Reset Password, Export Data
   - Displays user statistics, activity logs, and role assignments

#### **Data Management** (`/contractnest-ui/src/hooks/useUsers.ts`)

**Key Functions:**
- `fetchUsers()` - List users with filters (line 104-138)
- `getUser()` - Get single user details (line 141-153)
- `updateUser()` - Update user profile (line 156-176)
- `suspendUser()` - Suspend user access (line 179-203)
- `activateUser()` - Activate suspended user (line 206-230)
- `resetUserPassword()` - Send password reset email (line 233-249)
- `assignRole()` - Assign role to user (line 252-272)
- `removeRole()` - Remove role from user (line 275-295)
- `getUserActivity()` - Get activity logs (line 298-309)

**API Endpoints Called:**
```typescript
GET    /api/users              // List users
GET    /api/users/:id          // Get user details
PATCH  /api/users/:id          // Update user
POST   /api/users/:id/suspend  // Suspend user
POST   /api/users/:id/activate // Activate user
POST   /api/users/:id/reset-password // Reset password
GET    /api/users/:id/activity // Activity log
POST   /api/users/:id/roles    // Assign role
DELETE /api/users/:id/roles/:roleId // Remove role
```

#### **API Service** (`/contractnest-ui/src/services/api.ts`)

**Features:**
- Axios-based HTTP client (line 30-36)
- Base URL: `import.meta.env.VITE_API_URL`
- Request interceptor adds: Authorization token, x-tenant-id, x-session-id, x-environment (line 109-167)
- Response interceptor handles: Maintenance mode, session conflicts, API down detection (line 178-336)

---

### **Layer 2: API (contractnest-api)**

#### **Routes** (`/contractnest-api/src/routes/userRoutes.ts`)

All routes use `authenticate` middleware for security:

```typescript
GET    /me                      → getCurrentUserProfile
PATCH  /me                      → updateCurrentUserProfile
GET    /                        → listUsers
GET    /:id                     → getUser
PATCH  /:id                     → updateUser
POST   /:id/suspend             → suspendUser
POST   /:id/activate            → activateUser
POST   /:id/reset-password      → resetUserPassword
GET    /:id/activity            → getUserActivity
POST   /:id/roles               → assignUserRole
DELETE /:id/roles/:roleId       → removeUserRole
```

#### **Controller** (`/contractnest-api/src/controllers/userController.ts`)

**Pattern:** Simple proxy/forwarding layer
- Validates request (auth header, tenant-id, params)
- Forwards to Edge Layer using axios
- Returns response from Edge Layer

**Example Flow** (suspendUser - Line 274-327):
```typescript
1. Validate: authHeader, tenantId, userId
2. Forward to: ${SUPABASE_URL}/functions/v1/user-management/${userId}/suspend
3. Headers: Authorization, x-tenant-id, Content-Type
4. Return: Edge Layer response
5. Error handling with Sentry logging
```

---

### **Layer 3: Edge Layer (contractnest-edge)**

#### **Edge Function** (`/contractnest-edge/supabase/functions/user-management/index.ts`)

**Runtime:** Deno (Supabase Edge Functions)

**Authentication Flow** (Line 19-49):
1. Extract JWT from Authorization header
2. Validate with `supabase.auth.getUser(token)`
3. Extract currentUserId for operations

**Routing System** (Line 50-161):
URL path parsing with method-based routing

**Key Functions:**

1. **List Users** (Line 173-362)
   ```
   - Query: t_user_tenants → filter by tenant
   - Join: t_user_profiles → get user data
   - Get roles from: t_user_tenant_roles + t_category_details
   - Apply filters: status, role, search
   - Pagination support
   - Returns: users with roles, status, metadata
   ```

2. **Get User** (Line 365-504)
   ```
   - Fetch: t_user_profiles (user data)
   - Fetch: t_user_tenants (tenant relationship)
   - Fetch: t_user_tenant_roles → t_category_details (roles)
   - Get: User stats from t_user_activity_logs
   - Get: Recent activity (last 30 days)
   - Returns: Complete user profile with stats
   ```

3. **Update User** (Line 507-575)
   ```
   - Permission check: checkUserPermission()
   - Allowed fields: first_name, last_name, mobile_number, country_code, etc.
   - Update: t_user_profiles
   - Log: t_user_activity_logs
   ```

4. **Suspend User** (Line 578-636)
   ```
   - Permission check (users.suspend)
   - Update: t_user_tenants.status = 'suspended'
   - Update: t_user_profiles.is_active = false
   - Log activity
   - Cannot suspend self
   ```

5. **Activate User** (Line 639-689)
   ```
   - Permission check (users.activate)
   - Update: t_user_tenants.status = 'active'
   - Update: t_user_profiles.is_active = true
   - Log activity
   ```

6. **Reset Password** (Line 692-737)
   ```
   - Permission check
   - Get email from auth.admin.getUserById()
   - Call: supabase.auth.resetPasswordForEmail()
   - Redirect to: FRONTEND_URL/reset-password
   - Log activity
   ```

7. **Assign Role** (Line 772-852)
   ```
   - Permission check (users.manage_roles)
   - Verify: role exists in t_category_details
   - Insert: t_user_tenant_roles
   - Handle duplicate (23505 error code)
   - Log activity
   ```

8. **User Activity** (Line 740-769)
   ```
   - Query: t_user_activity_logs
   - Filter: user_id, date range
   - Order: created_at DESC
   - Limit configurable
   ```

---

## 🗄️ Database Schema

**Tables Used:**

1. **`t_user_profiles`** - User profile data
   - user_id, email, first_name, last_name, user_code
   - mobile_number, country_code, timezone
   - department, employee_id, avatar_url
   - is_active, is_dark_mode

2. **`t_user_tenants`** - User-Tenant relationships
   - user_id, tenant_id
   - status (active/suspended)
   - is_default, is_admin

3. **`t_user_tenant_roles`** - Role assignments
   - user_tenant_id, role_id
   - assigned_by, assigned_at

4. **`t_category_details`** - Role definitions
   - category_id, display_name, sub_cat_name
   - description, tenant_id

5. **`t_user_activity_logs`** - Activity tracking
   - user_id, action, metadata
   - created_at, ip_address

---

## 🔐 Security & Permissions

**Permission Checking** (Line 1465-1519):
```typescript
checkUserPermission(userId, tenantId, permission)
  → Check: is_admin flag
  → Verify: Admin/Owner role in t_user_tenant_roles
```

**Required Permissions:**
- `users.update` - Update user profiles
- `users.suspend` - Suspend users
- `users.activate` - Activate users
- `users.reset_password` - Reset passwords
- `users.manage_roles` - Assign/remove roles

---

## 📊 Data Flow Example: Suspend User

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UI Layer (React)                                         │
│    src/pages/settings/users/index.tsx:210                   │
│    handleSuspendUser() → suspendUser(userId)                │
└─────────────────┬───────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. UI Hook                                                  │
│    src/hooks/useUsers.ts:179                                │
│    POST /api/users/${userId}/suspend                        │
│    Headers: Authorization, x-tenant-id                      │
└─────────────────┬───────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. API Layer (Express)                                      │
│    src/controllers/userController.ts:274                    │
│    Validate → Forward to Edge                               │
│    POST ${SUPABASE_URL}/functions/v1/user-management/       │
│         ${userId}/suspend                                   │
└─────────────────┬───────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Edge Layer (Deno/Supabase)                               │
│    supabase/functions/user-management/index.ts:578          │
│    suspendUser():                                           │
│      → checkUserPermission()                                │
│      → UPDATE t_user_tenants SET status='suspended'         │
│      → UPDATE t_user_profiles SET is_active=false           │
│      → INSERT INTO t_user_activity_logs                     │
└─────────────────┬───────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Database (Supabase PostgreSQL)                           │
│    Tables: t_user_tenants, t_user_profiles,                │
│            t_user_activity_logs                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 File References

**UI Layer:**
- `contractnest-ui/src/pages/settings/users/index.tsx:1-568`
- `contractnest-ui/src/pages/settings/users/userView.tsx:1-883`
- `contractnest-ui/src/hooks/useUsers.ts:1-543`
- `contractnest-ui/src/services/api.ts:1-409`

**API Layer:**
- `contractnest-api/src/routes/userRoutes.ts:1-450`
- `contractnest-api/src/controllers/userController.ts:1-630`

**Edge Layer:**
- `contractnest-edge/supabase/functions/user-management/index.ts:1-1590`

---

## 🎯 Summary

The UserManagement feature follows a clean three-tier architecture:

1. **UI Layer** handles presentation and user interaction
2. **API Layer** validates and forwards requests
3. **Edge Layer** contains business logic and database operations

This separation provides:
- ✅ Clear separation of concerns
- ✅ Scalability via serverless Edge Functions
- ✅ Security through multi-layer validation
- ✅ Comprehensive audit logging
- ✅ Role-based access control
