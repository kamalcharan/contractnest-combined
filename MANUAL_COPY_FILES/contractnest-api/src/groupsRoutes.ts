// src/groupsRoutes.ts
// Express routes for Groups/BBB functionality
// Add these routes to your existing Express app or merge into your router file

import { Router } from 'express';
import {
  // Group management
  getGroups,
  getGroup,
  verifyGroupAccess,
  // Memberships
  createMembership,
  getMembership,
  updateMembership,
  deleteMembership,
  getGroupMemberships,
  // Profiles (AI)
  enhanceProfile,
  scrapeWebsite,
  generateClusters,
  saveClusters,
  getClusters,
  deleteClusters,
  saveProfile,
  // Search
  searchMembers,
  // Admin
  getAdminStats,
  updateMembershipStatus,
  getActivityLogs
} from './groupsController';

const router = Router();

// ============================================
// GROUP MANAGEMENT
// ============================================
router.get('/groups', getGroups);
router.get('/groups/:groupId', getGroup);
router.post('/groups/verify-access', verifyGroupAccess);

// ============================================
// MEMBERSHIPS
// ============================================
router.post('/groups/memberships', createMembership);
router.get('/groups/memberships/:membershipId', getMembership);
router.put('/groups/memberships/:membershipId', updateMembership);
router.delete('/groups/memberships/:membershipId', deleteMembership);
router.get('/groups/memberships/group/:groupId', getGroupMemberships);

// ============================================
// PROFILES (AI Operations)
// ============================================
router.post('/groups/profiles/enhance', enhanceProfile);
router.post('/groups/profiles/scrape-website', scrapeWebsite);
router.post('/groups/profiles/generate-clusters', generateClusters);
router.post('/groups/profiles/clusters', saveClusters);
router.get('/groups/profiles/clusters/:membershipId', getClusters);
router.delete('/groups/profiles/clusters/:membershipId', deleteClusters);
router.post('/groups/profiles/save', saveProfile);

// ============================================
// SEARCH
// ============================================
router.post('/groups/search', searchMembers);

// ============================================
// ADMIN
// ============================================
router.get('/groups/admin/stats/:groupId', getAdminStats);
router.put('/groups/admin/memberships/:membershipId/status', updateMembershipStatus);
router.get('/groups/admin/activity-logs/:groupId', getActivityLogs);

export default router;
