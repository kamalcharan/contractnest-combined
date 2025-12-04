// backend/src/routes/groupsRoutes.ts
// Express routes for all group operations
// Copy this file to: contractnest-api/src/routes/groupsRoutes.ts

import { Router } from 'express';
import {
  // Groups
  getGroups,
  getGroup,
  verifyGroupAccess,
  // Memberships
  createMembership,
  getMembership,
  updateMembership,
  getGroupMemberships,
  deleteMembership,
  // Profiles (AI Operations)
  enhanceProfile,
  scrapeWebsite,
  generateClusters,
  saveProfile,
  // Search
  search,
  // Admin
  getAdminStats,
  updateMembershipStatus,
  getActivityLogs
} from '../controllers/groupsController';

const router = Router();

// ============================================
// GROUPS ROUTES
// ============================================
// GET /api/groups - Get all business groups
router.get('/', getGroups);

// GET /api/groups/:groupId - Get specific group by ID
router.get('/:groupId', getGroup);

// POST /api/groups/verify-access - Verify group access password
router.post('/verify-access', verifyGroupAccess);

// ============================================
// MEMBERSHIP ROUTES
// ============================================
// POST /api/groups/memberships - Create new membership
router.post('/memberships', createMembership);

// GET /api/groups/memberships/:membershipId - Get membership with profile
router.get('/memberships/:membershipId', getMembership);

// PUT /api/groups/memberships/:membershipId - Update membership profile
router.put('/memberships/:membershipId', updateMembership);

// GET /api/groups/memberships/group/:groupId - List group memberships
router.get('/memberships/group/:groupId', getGroupMemberships);

// DELETE /api/groups/memberships/:membershipId - Delete membership (soft)
router.delete('/memberships/:membershipId', deleteMembership);

// ============================================
// PROFILE ROUTES (AI Operations)
// ============================================
// POST /api/groups/profiles/enhance - AI enhance profile
router.post('/profiles/enhance', enhanceProfile);

// POST /api/groups/profiles/scrape-website - Website scraping
router.post('/profiles/scrape-website', scrapeWebsite);

// POST /api/groups/profiles/generate-clusters - Generate semantic clusters
router.post('/profiles/generate-clusters', generateClusters);

// POST /api/groups/profiles/save - Save profile with optional embedding
router.post('/profiles/save', saveProfile);

// ============================================
// SEARCH ROUTES
// ============================================
// POST /api/groups/search - Search group directory
router.post('/search', search);

// ============================================
// ADMIN ROUTES
// ============================================
// GET /api/groups/admin/stats/:groupId - Admin dashboard stats
router.get('/admin/stats/:groupId', getAdminStats);

// PUT /api/groups/admin/memberships/:membershipId/status - Update member status
router.put('/admin/memberships/:membershipId/status', updateMembershipStatus);

// GET /api/groups/admin/activity-logs/:groupId - Activity logs
router.get('/admin/activity-logs/:groupId', getActivityLogs);

export default router;
