# How to Fix the 404 Error for `/api/groups/profiles/generate-clusters`

## Problem
The frontend is calling `http://localhost:5000/api/groups/profiles/generate-clusters` but the Express backend doesn't have this route registered, resulting in a 404 error.

## Solution

### Step 1: Copy Files to Your API
Copy these files to your `contractnest-api` project:

```
groupsController.ts → contractnest-api/src/controllers/groupsController.ts
groupsService.ts    → contractnest-api/src/services/groupsService.ts
groupsRoutes.ts     → contractnest-api/src/routes/groupsRoutes.ts
VaNiN8NConfig.ts    → contractnest-api/src/config/VaNiN8NConfig.ts
```

### Step 2: Register Routes in Your Express App

In your `contractnest-api/src/index.ts` or `app.ts`, add:

```typescript
import express from 'express';
import groupsRoutes from './routes/groupsRoutes';

const app = express();

// ... your existing middleware ...

// Register the groups routes
app.use('/api/groups', groupsRoutes);

// ... rest of your app ...
```

### Step 3: Verify Required Dependencies

Make sure `package.json` has:
```json
{
  "dependencies": {
    "express": "^4.18.x",
    "axios": "^1.x.x"
  }
}
```

### Step 4: Restart Your Server

```bash
npm run dev
# or
yarn dev
```

## Routes That Will Be Available

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/groups` | List all groups |
| GET | `/api/groups/:groupId` | Get specific group |
| POST | `/api/groups/verify-access` | Verify password |
| POST | `/api/groups/memberships` | Create membership |
| GET | `/api/groups/memberships/:id` | Get membership |
| PUT | `/api/groups/memberships/:id` | Update membership |
| GET | `/api/groups/memberships/group/:groupId` | List group members |
| DELETE | `/api/groups/memberships/:id` | Delete membership |
| POST | `/api/groups/profiles/enhance` | AI enhance profile |
| POST | `/api/groups/profiles/scrape-website` | Scrape website |
| **POST** | **`/api/groups/profiles/generate-clusters`** | **Generate clusters** |
| POST | `/api/groups/profiles/save` | Save profile |
| POST | `/api/groups/search` | Search members |
| GET | `/api/groups/admin/stats/:groupId` | Admin stats |
| PUT | `/api/groups/admin/memberships/:id/status` | Update status |
| GET | `/api/groups/admin/activity-logs/:groupId` | Activity logs |
