# Add to your Express app.ts

Add these lines to your existing Express `app.ts` or `index.ts`:

## 1. Add import (near top with other route imports):

```typescript
import groupsRoutes from './routes/groupsRoutes';
```

## 2. Add route mounting (after other app.use routes):

```typescript
// Groups & BBB Directory routes
app.use('/api', groupsRoutes);
```

## Full Example

If your app.ts looks like this:

```typescript
import express from 'express';
import catalogRoutes from './routes/catalogRoutes';
// ... other imports

const app = express();

app.use('/api', catalogRoutes);
// ... other routes
```

It should become:

```typescript
import express from 'express';
import catalogRoutes from './routes/catalogRoutes';
import groupsRoutes from './routes/groupsRoutes';  // ADD THIS
// ... other imports

const app = express();

app.use('/api', catalogRoutes);
app.use('/api', groupsRoutes);  // ADD THIS
// ... other routes
```
