// src/routes/publicRoutes.ts
// Unauthenticated endpoints mounted at /api/public. These replace direct
// browser -> Supabase Data API calls so the anon/authenticated Postgres grants
// can be revoked (closing the PostgREST backdoor).
import express from 'express';
import { createLead, updateLead, getAuthMethods } from '../controllers/publicController';

const router = express.Router();

// Lead capture (public)
router.post('/leads', createLead);
router.patch('/leads/:id', updateLead);

// Auth-method detection (public by ?identifier=, or by Bearer token)
router.get('/auth-methods', getAuthMethods);

export default router;
