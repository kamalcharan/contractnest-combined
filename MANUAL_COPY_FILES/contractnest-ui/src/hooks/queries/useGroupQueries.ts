// frontend/src/hooks/queries/useGroupQueries.ts
// TanStack Query hooks for BBB Groups & Directory operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import groupsService from '@/services/groupsService';
import type {
  BusinessGroup,
  GroupMembership,
  MembershipWithProfile,
  CreateMembershipRequest,
  UpdateMembershipRequest,
  AIEnhancementRequest,
  AIEnhancementResponse,
  WebsiteScrapingRequest,
  WebsiteScrapingResponse,
  GenerateClustersRequest,
  GenerateClustersResponse,
  SaveProfileRequest,
  SaveProfileResponse,
  SearchRequest,
  SearchResponse,
  AdminStats,
  ActivityLog,
  UpdateMembershipStatusRequest
} from '@/types/groupsTypes';

// ================================================================
// QUERY KEYS
// ================================================================

export const groupQueryKeys = {
  all: ['groups'] as const,
  lists: () => [...groupQueryKeys.all, 'list'] as const,
  list: (filters?: any) => [...groupQueryKeys.lists(), filters] as const,
  details: () => [...groupQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...groupQueryKeys.details(), id] as const,
  
  // Memberships
  memberships: () => [...groupQueryKeys.all, 'memberships'] as const,
  membership: (id: string) => [...groupQueryKeys.memberships(), id] as const,
  groupMemberships: (groupId: string, filters?: any) => 
    [...groupQueryKeys.memberships(), 'group', groupId, filters] as const,
  
  // Admin
  admin: () => [...groupQueryKeys.all, 'admin'] as const,
  adminStats: (groupId: string) => [...groupQueryKeys.admin(), 'stats', groupId] as const,
  activityLogs: (groupId: string, filters?: any) => 
    [...groupQueryKeys.admin(), 'logs', groupId, filters] as const,
};

// ================================================================
// QUERY HOOKS (Read Operations)
// ================================================================

/**
 * Get all groups (with optional type filter)
 */
export const useGroups = (groupType?: 'bbb_chapter' | 'tech_forum' | 'network' | 'all') => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: groupQueryKeys.list(groupType),
    queryFn: () => groupsService.getGroups(groupType),
    enabled: !!currentTenant,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
};

/**
 * Get specific group by ID
 */
export const useGroup = (groupId: string) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: groupQueryKeys.detail(groupId),
    queryFn: () => groupsService.getGroup(groupId),
    enabled: !!currentTenant && !!groupId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Get membership by ID (with tenant profile)
 */
export const useMembership = (membershipId: string) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: groupQueryKeys.membership(membershipId),
    queryFn: () => groupsService.getMembership(membershipId),
    enabled: !!currentTenant && !!membershipId,
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Get all memberships for a group (with filters)
 */
export const useGroupMemberships = (
  groupId: string,
  filters?: {
    status?: 'all' | 'active' | 'pending' | 'inactive' | 'suspended';
    limit?: number;
    offset?: number;
  }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: groupQueryKeys.groupMemberships(groupId, filters),
    queryFn: () => groupsService.getGroupMemberships(groupId, filters),
    enabled: !!currentTenant && !!groupId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Get admin stats for a group
 */
export const useAdminStats = (groupId: string) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: groupQueryKeys.adminStats(groupId),
    queryFn: () => groupsService.getAdminStats(groupId),
    enabled: !!currentTenant && !!groupId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Get activity logs for a group
 */
export const useActivityLogs = (
  groupId: string,
  filters?: {
    activity_type?: string;
    limit?: number;
    offset?: number;
  }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: groupQueryKeys.activityLogs(groupId, filters),
    queryFn: () => groupsService.getActivityLogs(groupId, filters),
    enabled: !!currentTenant && !!groupId,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// ================================================================
// MUTATION HOOKS (Write Operations)
// ================================================================

/**
 * Verify group access password
 */
export const useVerifyGroupAccess = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ 
      groupId, 
      password, 
      accessType 
    }: { 
      groupId: string; 
      password: string; 
      accessType: 'user' | 'admin' 
    }) => groupsService.verifyGroupAccess(groupId, password, accessType),
    
    onSuccess: (data) => {
      if (data.access_granted) {
        toast({
          title: "Access Granted",
          description: `Welcome to ${data.group_name || 'the group'}!`
        });
        console.log('✅ Access granted:', data);
      } else {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: data.error || "Invalid password"
        });
        console.log('❌ Access denied');
      }
    },
    
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to verify access"
      });
      console.error('❌ Error verifying access:', error);
    }
  });
};

/**
 * Create new membership (join group)
 * Note: Does not show error toast for "already exists" (409) - this is expected
 * when checking membership status on page load
 */
export const useCreateMembership = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: CreateMembershipRequest) =>
      groupsService.createMembership(request),

    onSuccess: (newMembership) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.memberships() });
      queryClient.invalidateQueries({
        queryKey: groupQueryKeys.groupMemberships(newMembership.group_id)
      });
      queryClient.invalidateQueries({
        queryKey: groupQueryKeys.adminStats(newMembership.group_id)
      });

      // Don't show toast here - let the caller handle it
      console.log('✅ Membership created:', newMembership);
    },

    onError: (error: Error & { membership_id?: string }) => {
      // Don't show toast for "already exists" - this is expected behavior
      // when checking membership status on page load
      if (!error.message?.includes('already exists')) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to create membership"
        });
      }
      console.error('❌ Error creating membership:', error);
    }
  });
};

/**
 * Update membership
 */
export const useUpdateMembership = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ 
      membershipId, 
      updates 
    }: { 
      membershipId: string; 
      updates: UpdateMembershipRequest 
    }) => groupsService.updateMembership(membershipId, updates),
    
    onSuccess: (data, variables) => {
      // Update specific membership in cache
      queryClient.setQueryData(
        groupQueryKeys.membership(variables.membershipId),
        (old: any) => old ? { ...old, profile_data: data.profile_data } : old
      );
      
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.memberships() });
      
      toast({
        title: "Success",
        description: "Membership updated successfully"
      });
      
      console.log('✅ Membership updated:', data);
    },
    
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update membership"
      });
      console.error('❌ Error updating membership:', error);
    }
  });
};

/**
 * Delete membership
 */
export const useDeleteMembership = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (membershipId: string) => 
      groupsService.deleteMembership(membershipId),
    
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: groupQueryKeys.membership(deletedId) });
      
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.memberships() });
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.admin() });
      
      toast({
        title: "Success",
        description: "Membership deleted successfully"
      });
      
      console.log('✅ Membership deleted:', deletedId);
    },
    
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete membership"
      });
      console.error('❌ Error deleting membership:', error);
    }
  });
};

/**
 * AI enhance profile
 */
export const useEnhanceProfile = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: AIEnhancementRequest) => 
      groupsService.enhanceProfile(request),
    
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Profile enhanced successfully"
      });
      console.log('✅ Profile enhanced:', data);
    },
    
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to enhance profile"
      });
      console.error('❌ Error enhancing profile:', error);
    }
  });
};

/**
 * Scrape website
 */
export const useScrapeWebsite = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: WebsiteScrapingRequest) => 
      groupsService.scrapeWebsite(request),
    
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Website analyzed successfully"
      });
      console.log('✅ Website scraped:', data);
    },
    
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to scrape website"
      });
      console.error('❌ Error scraping website:', error);
    }
  });
};

/**
 * Generate semantic clusters
 */
export const useGenerateClusters = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: GenerateClustersRequest) => 
      groupsService.generateClusters(request),
    
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `${data.clusters_generated} semantic clusters generated`
      });
      console.log('✅ Clusters generated:', data);
    },
    
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate clusters"
      });
      console.error('❌ Error generating clusters:', error);
    }
  });
};

/**
 * Save profile
 */
export const useSaveProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: SaveProfileRequest) => 
      groupsService.saveProfile(request),
    
    onSuccess: (data, variables) => {
      // Invalidate membership query
      queryClient.invalidateQueries({ 
        queryKey: groupQueryKeys.membership(variables.membership_id) 
      });
      
      toast({
        title: "Success",
        description: "Profile saved successfully"
      });
      
      console.log('✅ Profile saved:', data);
    },
    
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save profile"
      });
      console.error('❌ Error saving profile:', error);
    }
  });
};

/**
 * Search directory
 */
export const useSearch = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: SearchRequest) => 
      groupsService.search(request),
    
    onSuccess: (data) => {
      console.log('✅ Search completed:', data.results_count, 'results');
    },
    
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: error.message || "Failed to search directory"
      });
      console.error('❌ Error searching:', error);
    }
  });
};

/**
 * Update membership status (admin)
 */
export const useUpdateMembershipStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ 
      membershipId, 
      request 
    }: { 
      membershipId: string; 
      request: UpdateMembershipStatusRequest 
    }) => groupsService.updateMembershipStatus(membershipId, request),
    
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: groupQueryKeys.membership(data.membership_id) 
      });
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.memberships() });
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.admin() });
      
      toast({
        title: "Success",
        description: `Status updated to ${data.new_status}`
      });
      
      console.log('✅ Status updated:', data);
    },
    
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update status"
      });
      console.error('❌ Error updating status:', error);
    }
  });
};

// ================================================================
// COMBINED MANAGER HOOK
// ================================================================

/**
 * Combined hook for group management
 * Provides all queries and mutations in one hook
 */
export const useGroupsManager = (groupId?: string) => {
  // Queries
  const groupsQuery = useGroups('bbb_chapter');
  const groupQuery = useGroup(groupId || '');
  const membershipsQuery = useGroupMemberships(groupId || '', { status: 'all' });
  const adminStatsQuery = useAdminStats(groupId || '');
  
  // Mutations
  const verifyAccessMutation = useVerifyGroupAccess();
  const createMembershipMutation = useCreateMembership();
  const updateMembershipMutation = useUpdateMembership();
  const deleteMembershipMutation = useDeleteMembership();
  const enhanceProfileMutation = useEnhanceProfile();
  const scrapeWebsiteMutation = useScrapeWebsite();
  const generateClustersMutation = useGenerateClusters();
  const saveProfileMutation = useSaveProfile();
  const searchMutation = useSearch();
  const updateStatusMutation = useUpdateMembershipStatus();

  return {
    // Data
    groups: groupsQuery.data || [],
    group: groupQuery.data,
    memberships: membershipsQuery.data?.memberships || [],
    pagination: membershipsQuery.data?.pagination,
    adminStats: adminStatsQuery.data?.stats,
    recentActivity: adminStatsQuery.data?.recent_activity || [],
    
    // Loading states
    isLoadingGroups: groupsQuery.isLoading,
    isLoadingGroup: groupQuery.isLoading,
    isLoadingMemberships: membershipsQuery.isLoading,
    isLoadingStats: adminStatsQuery.isLoading,
    
    // Error states
    groupsError: groupsQuery.error,
    groupError: groupQuery.error,
    membershipsError: membershipsQuery.error,
    statsError: adminStatsQuery.error,
    
    // Mutation states
    isVerifying: verifyAccessMutation.isPending,
    isCreating: createMembershipMutation.isPending,
    isUpdating: updateMembershipMutation.isPending,
    isDeleting: deleteMembershipMutation.isPending,
    isEnhancing: enhanceProfileMutation.isPending,
    isScraping: scrapeWebsiteMutation.isPending,
    isGenerating: generateClustersMutation.isPending,
    isSaving: saveProfileMutation.isPending,
    isSearching: searchMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    
    // Combined mutation state
    isMutating: 
      verifyAccessMutation.isPending ||
      createMembershipMutation.isPending ||
      updateMembershipMutation.isPending ||
      deleteMembershipMutation.isPending ||
      enhanceProfileMutation.isPending ||
      scrapeWebsiteMutation.isPending ||
      generateClustersMutation.isPending ||
      saveProfileMutation.isPending ||
      searchMutation.isPending ||
      updateStatusMutation.isPending,
    
    // Mutation functions
    verifyAccess: verifyAccessMutation.mutate,
    verifyAccessAsync: verifyAccessMutation.mutateAsync,
    createMembership: createMembershipMutation.mutate,
    createMembershipAsync: createMembershipMutation.mutateAsync,
    updateMembership: updateMembershipMutation.mutate,
    updateMembershipAsync: updateMembershipMutation.mutateAsync,
    deleteMembership: deleteMembershipMutation.mutate,
    deleteMembershipAsync: deleteMembershipMutation.mutateAsync,
    enhanceProfile: enhanceProfileMutation.mutate,
    enhanceProfileAsync: enhanceProfileMutation.mutateAsync,
    scrapeWebsite: scrapeWebsiteMutation.mutate,
    scrapeWebsiteAsync: scrapeWebsiteMutation.mutateAsync,
    generateClusters: generateClustersMutation.mutate,
    generateClustersAsync: generateClustersMutation.mutateAsync,
    saveProfile: saveProfileMutation.mutate,
    saveProfileAsync: saveProfileMutation.mutateAsync,
    search: searchMutation.mutate,
    searchAsync: searchMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutate,
    updateStatusAsync: updateStatusMutation.mutateAsync,
    
    // Refetch functions
    refetchGroups: groupsQuery.refetch,
    refetchGroup: groupQuery.refetch,
    refetchMemberships: membershipsQuery.refetch,
    refetchStats: adminStatsQuery.refetch,
    refetchAll: () => {
      groupsQuery.refetch();
      if (groupId) {
        groupQuery.refetch();
        membershipsQuery.refetch();
        adminStatsQuery.refetch();
      }
    }
  };
};

// Export default for convenience
export default useGroupsManager;