// frontend/src/services/serviceURLs.ts
// Centralized URL configuration for API endpoints

// Base API URL from environment
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Helper to build URLs with query params
const buildUrl = (base: string, params?: Record<string, any>): string => {
  if (!params) return base;
  const queryString = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return queryString ? `${base}?${queryString}` : base;
};

export const API_ENDPOINTS = {
  // Groups & Directory (BBB)
  GROUPS: {
    // Group management
    LIST: `${API_BASE}/groups`,
    LIST_WITH_FILTERS: (filters: { group_type?: string }) =>
      buildUrl(`${API_BASE}/groups`, filters),
    GET: (groupId: string) => `${API_BASE}/groups/${groupId}`,
    VERIFY_ACCESS: `${API_BASE}/groups/verify-access`,

    // Memberships
    MEMBERSHIPS: {
      CREATE: `${API_BASE}/groups/memberships`,
      GET: (membershipId: string) => `${API_BASE}/groups/memberships/${membershipId}`,
      UPDATE: (membershipId: string) => `${API_BASE}/groups/memberships/${membershipId}`,
      DELETE: (membershipId: string) => `${API_BASE}/groups/memberships/${membershipId}`,
      LIST_BY_GROUP: (groupId: string) => `${API_BASE}/groups/memberships/group/${groupId}`,
      LIST_BY_GROUP_WITH_FILTERS: (groupId: string, filters: { status?: string; limit?: number; offset?: number }) =>
        buildUrl(`${API_BASE}/groups/memberships/group/${groupId}`, filters),
    },

    // Profile operations (AI)
    PROFILES: {
      ENHANCE: `${API_BASE}/groups/profiles/enhance`,
      SCRAPE_WEBSITE: `${API_BASE}/groups/profiles/scrape-website`,
      GENERATE_CLUSTERS: `${API_BASE}/groups/profiles/generate-clusters`,
      SAVE_CLUSTERS: `${API_BASE}/groups/profiles/clusters`,
      GET_CLUSTERS: (membershipId: string) => `${API_BASE}/groups/profiles/clusters/${membershipId}`,
      DELETE_CLUSTERS: (membershipId: string) => `${API_BASE}/groups/profiles/clusters/${membershipId}`,
      SAVE: `${API_BASE}/groups/profiles/save`,
    },

    // Search
    SEARCH: `${API_BASE}/groups/search`,

    // Admin
    ADMIN: {
      STATS: (groupId: string) => `${API_BASE}/groups/admin/stats/${groupId}`,
      UPDATE_MEMBERSHIP_STATUS: (membershipId: string) =>
        `${API_BASE}/groups/admin/memberships/${membershipId}/status`,
      ACTIVITY_LOGS: (groupId: string) => `${API_BASE}/groups/admin/activity-logs/${groupId}`,
      ACTIVITY_LOGS_WITH_FILTERS: (groupId: string, filters: { activity_type?: string; limit?: number; offset?: number }) =>
        buildUrl(`${API_BASE}/groups/admin/activity-logs/${groupId}`, filters),
    },
  },

  // Other existing endpoints would go here...
};

export default API_ENDPOINTS;
