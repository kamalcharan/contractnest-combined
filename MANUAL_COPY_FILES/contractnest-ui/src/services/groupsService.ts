// frontend/src/services/groupsService.ts
// Thin wrapper around Express API calls for Groups & Directory operations
// Pattern: Similar to catalogService.ts - axios wrapper for API calls

import api from './api';
import { API_ENDPOINTS } from './serviceURLs';
import type {
  BusinessGroup,
  GroupMembership,
  MembershipWithProfile,
  CreateMembershipRequest,
  UpdateMembershipRequest,
  SearchRequest,
  SearchResponse,
  AIEnhancementRequest,
  AIEnhancementResponse,
  WebsiteScrapingRequest,
  WebsiteScrapingResponse,
  GenerateClustersRequest,
  GenerateClustersResponse,
  SaveProfileRequest,
  SaveProfileResponse,
  VerifyAccessRequest,
  VerifyAccessResponse,
  AdminStats,
  ActivityLog,
  UpdateMembershipStatusRequest,
  PaginationResponse
} from '../types/groupsTypes';

/**
 * UI Groups Service - Thin HTTP wrapper for Express API
 * 
 * This service ONLY:
 * 1. Makes HTTP calls to Express API endpoints (defined in serviceURLs)
 * 2. Handles basic response extraction
 * 3. Provides clean interface for hooks
 * 
 * All business logic happens in Express API layer.
 */
class GroupsService {
  
  // ============================================
  // GROUPS OPERATIONS
  // ============================================
  
  /**
   * Get all business groups (with optional type filter)
   * Calls: GET /api/groups?group_type=bbb_chapter
   */
  async getGroups(groupType?: 'bbb_chapter' | 'tech_forum' | 'network' | 'all'): Promise<BusinessGroup[]> {
    try {
      console.log('🔍 UI Service: Getting groups...', { groupType });
      
      // Use serviceURLs helper to build URL with filters
      const url = groupType 
        ? API_ENDPOINTS.GROUPS.LIST_WITH_FILTERS({ group_type: groupType })
        : API_ENDPOINTS.GROUPS.LIST;
      
      const response = await api.get(url);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load groups');
      }
      
      return response.data.groups || [];
      
    } catch (error: any) {
      console.error('UI Service error in getGroups:', error);
      throw new Error(error.message || 'Failed to load groups');
    }
  }

  /**
   * Get specific group by ID
   * Calls: GET /api/groups/:groupId
   */
  async getGroup(groupId: string): Promise<BusinessGroup> {
    try {
      console.log('🔍 UI Service: Getting group...', { groupId });
      
      const response = await api.get(API_ENDPOINTS.GROUPS.GET(groupId));
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load group');
      }
      
      return response.data.group;
      
    } catch (error: any) {
      console.error('UI Service error in getGroup:', error);
      throw new Error(error.message || 'Failed to load group');
    }
  }

  /**
   * Verify group access password
   * Calls: POST /api/groups/verify-access
   */
  async verifyGroupAccess(
    groupId: string, 
    password: string, 
    accessType: 'user' | 'admin'
  ): Promise<VerifyAccessResponse> {
    try {
      console.log('🔍 UI Service: Verifying group access...', { groupId, accessType });
      
      const requestData: VerifyAccessRequest = {
        group_id: groupId,
        password,
        access_type: accessType
      };
      
      const response = await api.post(
        API_ENDPOINTS.GROUPS.VERIFY_ACCESS,
        requestData
      );
      
      // Note: API returns success=true even if access_granted=false
      // We return the full response for the hook to handle
      return response.data;
      
    } catch (error: any) {
      console.error('UI Service error in verifyGroupAccess:', error);
      
      // Return structured error response
      return {
        success: false,
        access_granted: false,
        error: error.message || 'Failed to verify access'
      };
    }
  }

  // ============================================
  // MEMBERSHIP OPERATIONS
  // ============================================

  /**
   * Create new membership (join group)
   * Calls: POST /api/memberships
   * Requires: x-tenant-id header (handled by api client)
   */
  async createMembership(request: CreateMembershipRequest): Promise<GroupMembership> {
    try {
      console.log('🔍 UI Service: Creating membership...', { groupId: request.group_id });
      
      const response = await api.post(
        API_ENDPOINTS.GROUPS.MEMBERSHIPS.CREATE,
        request
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create membership');
      }
      
      // Response includes membership data directly
      return response.data as unknown as GroupMembership;
      
    } catch (error: any) {
      console.error('UI Service error in createMembership:', error);

      // Handle duplicate membership (409) - extract membership_id for reuse
      if (error.response?.status === 409) {
        const membershipId = error.response?.data?.membership_id;
        console.log('🔍 UI Service: 409 detected, membership_id:', membershipId);

        // Store in sessionStorage as backup (TanStack Query strips custom error properties)
        if (membershipId) {
          sessionStorage.setItem('bbb_existing_membership_id', membershipId);
          console.log('🔍 UI Service: Stored membership_id in sessionStorage');
        }

        // Create error with membership_id attached in multiple ways for robustness
        const customError = new Error('Membership already exists', {
          cause: { membership_id: membershipId }
        }) as Error & { membership_id?: string; cause?: { membership_id?: string } };
        customError.membership_id = membershipId;

        throw customError;
      }

      throw new Error(error.message || 'Failed to create membership');
    }
  }

  /**
   * Get membership with tenant profile
   * Calls: GET /api/memberships/:membershipId
   */
  async getMembership(membershipId: string): Promise<MembershipWithProfile> {
    try {
      console.log('🔍 UI Service: Getting membership...', { membershipId });
      
      const response = await api.get(
        API_ENDPOINTS.GROUPS.MEMBERSHIPS.GET(membershipId)
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load membership');
      }
      
      return response.data.membership;
      
    } catch (error: any) {
      console.error('UI Service error in getMembership:', error);
      throw new Error(error.message || 'Failed to load membership');
    }
  }

  /**
   * Update membership profile data
   * Calls: PUT /api/memberships/:membershipId
   */
  async updateMembership(
    membershipId: string, 
    updates: UpdateMembershipRequest
  ): Promise<{ membership_id: string; updated_fields: string[]; profile_data: any }> {
    try {
      console.log('🔍 UI Service: Updating membership...', { membershipId });
      
      const response = await api.put(
        API_ENDPOINTS.GROUPS.MEMBERSHIPS.UPDATE(membershipId),
        updates
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update membership');
      }
      
      return response.data;
      
    } catch (error: any) {
      console.error('UI Service error in updateMembership:', error);
      throw new Error(error.message || 'Failed to update membership');
    }
  }

  /**
   * Get all memberships for a group (with filters)
   * Calls: GET /api/memberships/group/:groupId?status=all&limit=50
   */
  async getGroupMemberships(
    groupId: string,
    filters?: {
      status?: 'all' | 'active' | 'pending' | 'inactive' | 'suspended';
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    memberships: any[];
    pagination: PaginationResponse;
  }> {
    try {
      console.log('🔍 UI Service: Getting group memberships...', { groupId, filters });
      
      // Use serviceURLs helper to build URL with filters
      const url = filters
        ? API_ENDPOINTS.GROUPS.MEMBERSHIPS.LIST_BY_GROUP_WITH_FILTERS(groupId, filters)
        : API_ENDPOINTS.GROUPS.MEMBERSHIPS.LIST_BY_GROUP(groupId);
      
      const response = await api.get(url);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load memberships');
      }
      
      return {
        memberships: response.data.memberships || [],
        pagination: response.data.pagination || {
          total_count: 0,
          limit: filters?.limit || 50,
          offset: filters?.offset || 0,
          has_more: false
        }
      };
      
    } catch (error: any) {
      console.error('UI Service error in getGroupMemberships:', error);
      throw new Error(error.message || 'Failed to load memberships');
    }
  }

  /**
   * Delete membership (soft delete)
   * Calls: DELETE /api/memberships/:membershipId
   */
  async deleteMembership(membershipId: string): Promise<void> {
    try {
      console.log('🔍 UI Service: Deleting membership...', { membershipId });
      
      const response = await api.delete(
        API_ENDPOINTS.GROUPS.MEMBERSHIPS.DELETE(membershipId)
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete membership');
      }
      
    } catch (error: any) {
      console.error('UI Service error in deleteMembership:', error);
      throw new Error(error.message || 'Failed to delete membership');
    }
  }

  // ============================================
  // PROFILE OPERATIONS (AI)
  // ============================================

  /**
   * Enhance profile description with AI
   * Calls: POST /api/profiles/enhance
   */
  async enhanceProfile(request: AIEnhancementRequest): Promise<AIEnhancementResponse> {
    try {
      console.log('🔍 UI Service: Enhancing profile...', { membershipId: request.membership_id });
      
      const response = await api.post(
        API_ENDPOINTS.GROUPS.PROFILES.ENHANCE,
        request
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to enhance profile');
      }
      
      return response.data;
      
    } catch (error: any) {
      console.error('UI Service error in enhanceProfile:', error);
      throw new Error(error.message || 'AI enhancement failed. Please try again.');
    }
  }

  /**
   * Scrape website and generate profile
   * Calls: POST /api/profiles/scrape-website
   */
  async scrapeWebsite(request: WebsiteScrapingRequest): Promise<WebsiteScrapingResponse> {
    try {
      console.log('🔍 UI Service: Scraping website...', { websiteUrl: request.website_url });
      
      const response = await api.post(
        API_ENDPOINTS.GROUPS.PROFILES.SCRAPE_WEBSITE,
        request
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to scrape website');
      }
      
      return response.data;
      
    } catch (error: any) {
      console.error('UI Service error in scrapeWebsite:', error);
      throw new Error(error.message || 'Website scraping failed. Please check the URL.');
    }
  }

  /**
   * Generate semantic clusters
   * Calls: POST /api/profiles/generate-clusters
   */
  async generateClusters(request: GenerateClustersRequest): Promise<GenerateClustersResponse> {
    try {
      console.log('🔍 UI Service: Generating clusters...', { membershipId: request.membership_id });
      
      const response = await api.post(
        API_ENDPOINTS.GROUPS.PROFILES.GENERATE_CLUSTERS,
        request
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to generate clusters');
      }
      
      return response.data;
      
    } catch (error: any) {
      console.error('UI Service error in generateClusters:', error);
      throw new Error(error.message || 'Cluster generation failed');
    }
  }

  /**
   * Save semantic clusters to database
   * Calls: POST /api/profiles/clusters
   */
  async saveClusters(
    membershipId: string,
    clusters: Array<{
      primary_term: string;
      related_terms: string[];
      category: string;
      confidence_score?: number;
    }>
  ): Promise<{ success: boolean; clusters_saved: number; cluster_ids: string[] }> {
    try {
      console.log('🔍 UI Service: Saving clusters...', { membershipId, clusterCount: clusters.length });

      const response = await api.post(
        API_ENDPOINTS.GROUPS.PROFILES.SAVE_CLUSTERS,
        {
          membership_id: membershipId,
          clusters
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to save clusters');
      }

      return response.data;

    } catch (error: any) {
      console.error('UI Service error in saveClusters:', error);
      throw new Error(error.message || 'Failed to save clusters');
    }
  }

  /**
   * Get semantic clusters for a membership
   * Calls: GET /api/profiles/clusters/:membershipId
   */
  async getClusters(membershipId: string): Promise<{
    success: boolean;
    clusters: Array<{
      id: string;
      membership_id: string;
      primary_term: string;
      related_terms: string[];
      category: string;
      confidence_score: number;
      is_active: boolean;
      created_at: string;
    }>;
  }> {
    try {
      console.log('🔍 UI Service: Getting clusters...', { membershipId });

      const response = await api.get(
        API_ENDPOINTS.GROUPS.PROFILES.GET_CLUSTERS(membershipId)
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load clusters');
      }

      return response.data;

    } catch (error: any) {
      console.error('UI Service error in getClusters:', error);
      throw new Error(error.message || 'Failed to load clusters');
    }
  }

  /**
   * Delete all clusters for a membership (before re-saving)
   * Calls: DELETE /api/profiles/clusters/:membershipId
   */
  async deleteClusters(membershipId: string): Promise<{ success: boolean; deleted_count: number }> {
    try {
      console.log('🔍 UI Service: Deleting clusters...', { membershipId });

      const response = await api.delete(
        API_ENDPOINTS.GROUPS.PROFILES.DELETE_CLUSTERS(membershipId)
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete clusters');
      }

      return response.data;

    } catch (error: any) {
      console.error('UI Service error in deleteClusters:', error);
      throw new Error(error.message || 'Failed to delete clusters');
    }
  }

  /**
   * Save profile with embedding
   * Calls: POST /api/profiles/save
   */
  async saveProfile(request: SaveProfileRequest): Promise<SaveProfileResponse> {
    try {
      console.log('🔍 UI Service: Saving profile...', { membershipId: request.membership_id });
      
      const response = await api.post(
        API_ENDPOINTS.GROUPS.PROFILES.SAVE,
        request
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to save profile');
      }
      
      return response.data;
      
    } catch (error: any) {
      console.error('UI Service error in saveProfile:', error);
      throw new Error(error.message || 'Failed to save profile');
    }
  }

  // ============================================
  // SEARCH
  // ============================================

  /**
   * Search group directory
   * Calls: POST /api/search
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    try {
      console.log('🔍 UI Service: Searching directory...', { 
        groupId: request.group_id, 
        query: request.query 
      });
      
      const response = await api.post(
        API_ENDPOINTS.GROUPS.SEARCH,
        request
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Search failed');
      }
      
      return response.data;
      
    } catch (error: any) {
      console.error('UI Service error in search:', error);
      throw new Error(error.message || 'Search failed');
    }
  }

  // ============================================
  // ADMIN
  // ============================================

  /**
   * Get admin dashboard stats
   * Calls: GET /api/admin/stats/:groupId
   */
  async getAdminStats(groupId: string): Promise<{ 
    stats: AdminStats; 
    recent_activity: ActivityLog[] 
  }> {
    try {
      console.log('🔍 UI Service: Getting admin stats...', { groupId });
      
      const response = await api.get(
        API_ENDPOINTS.GROUPS.ADMIN.STATS(groupId)
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load stats');
      }
      
      return {
        stats: response.data.stats,
        recent_activity: response.data.recent_activity || []
      };
      
    } catch (error: any) {
      console.error('UI Service error in getAdminStats:', error);
      throw new Error(error.message || 'Failed to load admin stats');
    }
  }

  /**
   * Update membership status (admin)
   * Calls: PUT /api/admin/memberships/:membershipId/status
   */
  async updateMembershipStatus(
    membershipId: string,
    request: UpdateMembershipStatusRequest
  ): Promise<{ 
    success: boolean; 
    membership_id: string; 
    old_status: string; 
    new_status: string 
  }> {
    try {
      console.log('🔍 UI Service: Updating membership status...', { 
        membershipId, 
        status: request.status 
      });
      
      const response = await api.put(
        API_ENDPOINTS.GROUPS.ADMIN.UPDATE_MEMBERSHIP_STATUS(membershipId),
        request
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update status');
      }
      
      return response.data;
      
    } catch (error: any) {
      console.error('UI Service error in updateMembershipStatus:', error);
      throw new Error(error.message || 'Failed to update membership status');
    }
  }

  /**
   * Get activity logs (admin)
   * Calls: GET /api/admin/activity-logs/:groupId?activity_type=...
   */
  async getActivityLogs(
    groupId: string,
    filters?: {
      activity_type?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ logs: ActivityLog[]; pagination: any }> {
    try {
      console.log('🔍 UI Service: Getting activity logs...', { groupId, filters });

      // Use serviceURLs helper to build URL with filters
      const url = filters
        ? API_ENDPOINTS.GROUPS.ADMIN.ACTIVITY_LOGS_WITH_FILTERS(groupId, filters)
        : API_ENDPOINTS.GROUPS.ADMIN.ACTIVITY_LOGS(groupId);

      const response = await api.get(url);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load activity logs');
      }

      return {
        logs: response.data.logs || [],
        pagination: response.data.pagination || {
          total_count: 0,
          limit: filters?.limit || 50,
          offset: filters?.offset || 0
        }
      };

    } catch (error: any) {
      console.error('UI Service error in getActivityLogs:', error);
      throw new Error(error.message || 'Failed to load activity logs');
    }
  }

  // ============================================
  // SMARTPROFILE OPERATIONS (Tenant-level AI Profiles)
  // ============================================

  /**
   * Get SmartProfile for a tenant
   * Calls: GET /api/smartprofiles/:tenantId
   */
  async getSmartProfile(tenantId: string): Promise<{
    profile: SmartProfileData | null;
    clusters: SmartProfileCluster[];
  }> {
    try {
      console.log('🔍 UI Service: Getting SmartProfile...', { tenantId });

      const response = await api.get(
        API_ENDPOINTS.GROUPS.SMARTPROFILES.GET(tenantId)
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load SmartProfile');
      }

      return {
        profile: response.data.data?.profile || null,
        clusters: response.data.data?.clusters || []
      };

    } catch (error: any) {
      // 404 means no profile yet - return empty
      if (error.response?.status === 404) {
        return { profile: null, clusters: [] };
      }
      console.error('UI Service error in getSmartProfile:', error);
      throw new Error(error.message || 'Failed to load SmartProfile');
    }
  }

  /**
   * Save SmartProfile (basic save without AI)
   * Calls: POST /api/smartprofiles
   */
  async saveSmartProfile(data: {
    tenant_id: string;
    short_description?: string;
    ai_enhanced_description?: string;
    approved_keywords?: string[];
    profile_type?: string;
    website_url?: string;
    generation_method?: 'manual' | 'website';
  }): Promise<{ success: boolean; profile_id: string }> {
    try {
      console.log('🔍 UI Service: Saving SmartProfile...', {
        tenantId: data.tenant_id,
        hasEnhancedDesc: !!data.ai_enhanced_description,
        enhancedDescLength: data.ai_enhanced_description?.length || 0,
        shortDescLength: data.short_description?.length || 0,
        keywordsCount: data.approved_keywords?.length || 0,
        generationMethod: data.generation_method
      });

      const response = await api.post(
        API_ENDPOINTS.GROUPS.SMARTPROFILES.SAVE,
        data
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to save SmartProfile');
      }

      return response.data;

    } catch (error: any) {
      console.error('UI Service error in saveSmartProfile:', error);
      throw new Error(error.message || 'Failed to save SmartProfile');
    }
  }

  /**
   * Enhance SmartProfile description with AI
   * Calls: POST /api/smartprofiles/enhance
   * (Uses same n8n workflow as membership profiles)
   */
  async enhanceSmartProfile(request: {
    tenant_id: string;
    short_description: string;
  }): Promise<{
    success: boolean;
    ai_enhanced_description: string;
    suggested_keywords: string[];
  }> {
    try {
      console.log('🔍 UI Service: Enhancing SmartProfile...', { tenantId: request.tenant_id });

      const response = await api.post(
        `${API_ENDPOINTS.GROUPS.SMARTPROFILES.SAVE}/enhance`,
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to enhance SmartProfile');
      }

      return response.data;

    } catch (error: any) {
      console.error('UI Service error in enhanceSmartProfile:', error);
      throw new Error(error.message || 'AI enhancement failed. Please try again.');
    }
  }

  /**
   * Scrape website for SmartProfile
   * Calls: POST /api/smartprofiles/scrape-website
   */
  async scrapeWebsiteForSmartProfile(request: {
    tenant_id: string;
    website_url: string;
  }): Promise<{
    success: boolean;
    ai_enhanced_description: string;
    suggested_keywords: string[];
    scraped_data?: any;
  }> {
    try {
      console.log('🔍 UI Service: Scraping website for SmartProfile...', {
        tenantId: request.tenant_id,
        websiteUrl: request.website_url
      });

      const response = await api.post(
        `${API_ENDPOINTS.GROUPS.SMARTPROFILES.SAVE}/scrape-website`,
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to scrape website');
      }

      return response.data;

    } catch (error: any) {
      console.error('UI Service error in scrapeWebsiteForSmartProfile:', error);
      throw new Error(error.message || 'Website scraping failed. Please check the URL.');
    }
  }

  /**
   * Generate semantic clusters for SmartProfile
   * Calls: POST /api/smartprofiles/generate-clusters
   */
  async generateSmartProfileClusters(request: {
    tenant_id: string;
    profile_text: string;
    keywords: string[];
  }): Promise<{
    success: boolean;
    clusters_generated: number;
    clusters: SmartProfileCluster[];
  }> {
    try {
      console.log('🔍 UI Service: Generating SmartProfile clusters...', { tenantId: request.tenant_id });

      const response = await api.post(
        `${API_ENDPOINTS.GROUPS.SMARTPROFILES.SAVE}/generate-clusters`,
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to generate clusters');
      }

      return response.data;

    } catch (error: any) {
      console.error('UI Service error in generateSmartProfileClusters:', error);
      throw new Error(error.message || 'Cluster generation failed');
    }
  }

  /**
   * Save SmartProfile clusters to database
   * Calls: POST /api/smartprofiles/clusters
   */
  async saveSmartProfileClusters(
    tenantId: string,
    clusters: Array<{
      primary_term: string;
      related_terms: string[];
      category: string;
      confidence_score?: number;
    }>
  ): Promise<{ success: boolean; clusters_saved: number; cluster_ids: string[] }> {
    try {
      console.log('🔍 UI Service: Saving SmartProfile clusters...', { tenantId, clusterCount: clusters.length });

      const response = await api.post(
        `${API_ENDPOINTS.GROUPS.SMARTPROFILES.SAVE}/clusters`,
        {
          tenant_id: tenantId,
          clusters
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to save clusters');
      }

      return response.data;

    } catch (error: any) {
      console.error('UI Service error in saveSmartProfileClusters:', error);
      throw new Error(error.message || 'Failed to save clusters');
    }
  }

  /**
   * Get SmartProfile clusters
   * Calls: GET /api/smartprofiles/:tenantId/clusters
   */
  async getSmartProfileClusters(tenantId: string): Promise<{
    success: boolean;
    clusters: SmartProfileCluster[];
  }> {
    try {
      console.log('🔍 UI Service: Getting SmartProfile clusters...', { tenantId });

      const response = await api.get(
        `${API_ENDPOINTS.GROUPS.SMARTPROFILES.GET(tenantId)}/clusters`
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load clusters');
      }

      return response.data;

    } catch (error: any) {
      // 404 means no clusters yet
      if (error.response?.status === 404) {
        return { success: true, clusters: [] };
      }
      console.error('UI Service error in getSmartProfileClusters:', error);
      throw new Error(error.message || 'Failed to load clusters');
    }
  }

  /**
   * Search SmartProfiles
   * Calls: POST /api/smartprofiles/search
   */
  async searchSmartProfiles(request: {
    query: string;
    scope?: 'group' | 'tenant' | 'product';
    group_id?: string;
    tenant_id?: string;
    limit?: number;
    use_cache?: boolean;
  }): Promise<{
    success: boolean;
    results: any[];
    results_count: number;
  }> {
    try {
      console.log('🔍 UI Service: Searching SmartProfiles...', { query: request.query });

      const response = await api.post(
        API_ENDPOINTS.GROUPS.SMARTPROFILES.SEARCH,
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Search failed');
      }

      return response.data;

    } catch (error: any) {
      console.error('UI Service error in searchSmartProfiles:', error);
      throw new Error(error.message || 'SmartProfile search failed');
    }
  }
}

// SmartProfile type definitions
export interface SmartProfileData {
  id?: string;
  tenant_id: string;
  profile_type: string;
  short_description: string | null;
  ai_enhanced_description: string | null;
  approved_keywords: string[] | null;
  website_url?: string | null;
  generation_method?: 'manual' | 'website';
  embedding?: boolean;
  status: string;
  is_active: boolean;
  last_embedding_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmartProfileCluster {
  id?: string;
  tenant_id?: string;
  primary_term: string;
  related_terms: string[];
  category: string;
  confidence_score: number;
  is_active?: boolean;
  isNew?: boolean;
  isEditing?: boolean;
}

// Export singleton instance
const groupsService = new GroupsService();
export default groupsService;