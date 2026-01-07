# API Routes Integration Guide

## Issue: 404 on /api/chat/* endpoints

The UI is calling `/api/chat/session` but getting 404 because the routes are not registered in your Express app.

## Solution: Register groupsRoutes in your Express server

### Step 1: Locate your main Express file
Your API server's entry point (usually `src/index.ts` or `src/app.ts`)

### Step 2: Add the import
```typescript
// Add this import at the top with other route imports
import groupsRoutes from './routes/groupsRoutes';
```

### Step 3: Register the routes
```typescript
// Add this where other routes are registered (look for app.use('/api', ...))
app.use('/api', groupsRoutes);
```

## Full Example

If your index.ts looks something like this:
```typescript
import express from 'express';
import authRoutes from './routes/authRoutes';
import contactRoutes from './routes/contactRoutes';
// ... other imports

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api', authRoutes);
app.use('/api', contactRoutes);
// ... other routes

app.listen(5000);
```

Add groupsRoutes:
```typescript
import express from 'express';
import authRoutes from './routes/authRoutes';
import contactRoutes from './routes/contactRoutes';
import groupsRoutes from './routes/groupsRoutes';  // <-- ADD THIS
// ... other imports

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api', authRoutes);
app.use('/api', contactRoutes);
app.use('/api', groupsRoutes);  // <-- ADD THIS
// ... other routes

app.listen(5000);
```

## Routes provided by groupsRoutes.ts

After registration, these endpoints will be available:

### CHAT Routes (VaNi AI Assistant)
- `POST /api/chat/init` - Get VaNi intro message
- `POST /api/chat/session` - Get or create chat session
- `GET /api/chat/session/:sessionId` - Get session by ID
- `POST /api/chat/activate` - Activate group in session
- `POST /api/chat/intent` - Set user intent
- `POST /api/chat/search` - AI-powered search
- `POST /api/chat/end` - End chat session

### Groups Routes
- `GET /api/groups` - List all groups
- `GET /api/groups/:groupId` - Get specific group
- `POST /api/groups/verify-access` - Verify group password

### Memberships Routes
- `POST /api/memberships` - Create membership
- `GET /api/memberships/:membershipId` - Get membership
- `PUT /api/memberships/:membershipId` - Update membership
- `GET /api/memberships/group/:groupId` - List group memberships
- `DELETE /api/memberships/:membershipId` - Delete membership

### Profiles Routes (AI)
- `POST /api/profiles/enhance` - AI enhance profile
- `POST /api/profiles/scrape-website` - Scrape website
- `POST /api/profiles/generate-clusters` - Generate clusters
- `POST /api/profiles/save` - Save profile
- `POST /api/profiles/clusters` - Save clusters
- `GET /api/profiles/clusters/:membershipId` - Get clusters
- `DELETE /api/profiles/clusters/:membershipId` - Delete clusters

### Search Route
- `POST /api/search` - Search group directory

### Admin Routes
- `GET /api/admin/stats/:groupId` - Admin stats
- `PUT /api/admin/memberships/:membershipId/status` - Update status
- `GET /api/admin/activity-logs/:groupId` - Activity logs

## Restart Required

After adding the route registration, restart your API server:
```bash
npm run dev
# or
yarn dev
```

## Verification

Test the endpoint:
```bash
curl -X POST http://localhost:5000/api/chat/session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"channel": "web"}'
```

If successful, you should get a session response instead of 404.
