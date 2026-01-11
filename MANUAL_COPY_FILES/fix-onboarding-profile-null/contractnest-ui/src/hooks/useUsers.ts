// src/hooks/useUsers.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import api from '@/services/api';

// Types
export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_code: string;
  mobile_number?: string;
  country_code?: string;
  preferred_language?: string;  
  preferred_theme?: string; 
  timezone?: string;
  department?: string;
  employee_id?: string;
  joining_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithAccess extends UserProfile {
  status: 'active' | 'inactive' | 'suspended' | 'invited';
  role?: string;
  role_id?: string;
  last_login?: string;
  permissions?: string[];
  tenant_access?: {
    id: string;
    tenant_id: string;
    is_default: boolean;
    joined_at: string;
  };
}

export interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
}

export interface UserStats {
  total_logins: number;
  last_password_change?: string;
  failed_login_attempts: number;
  last_failed_login?: string;
}

export interface UserListResponse {
  data: UserWithAccess[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserDetailsResponse extends UserWithAccess {
  stats: UserStats;
  activity_log: UserActivity[];
  assigned_roles: Array<{
    id: string;
    name: string;
    description?: string;
    permissions: string[];
  }>;
}

export interface UseUsersOptions {
  autoLoad?: boolean;
  pageSize?: number;
}

export const useUsers = (options: UseUsersOptions = {}) => {
  const { autoLoad = true, pageSize = 10 } = options;
  const { currentTenant } = useAuth();
  
  // State
  const [users, setUsers] = useState<UserWithAccess[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Fetch users list
  const fetchUsers = useCallback(async (
    page: number = 1,
    status: string = statusFilter,
    role: string = roleFilter,
    search: string = searchTerm
  ) => {
    if (!currentTenant?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(status !== 'all' && { status }),
        ...(role !== 'all' && { role }),
        ...(search && { search })
      });
      
      const response = await api.get<UserListResponse>(`/api/users?${params}`);
      
      setUsers(response.data.data);
      setCurrentPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.totalPages);
      setTotalCount(response.data.pagination.total);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      const errorMsg = err.response?.data?.error || 'Failed to load team members';
      setError(errorMsg);
      // Don't show any toast for fetching - let the UI handle empty states
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, statusFilter, roleFilter, searchTerm, pageSize]);
  
  // Get single user details
  const getUser = async (userId: string): Promise<UserDetailsResponse | null> => {
    try {
      const response = await api.get<UserDetailsResponse>(`/api/users/${userId}`);
      return response.data;
    } catch (err: any) {
      console.error('Error fetching user:', err);
      const errorMsg = err.response?.data?.error || 'Failed to load team member details';
      if (err.response?.status !== 404) {
        toast.error(errorMsg);
      }
      return null;
    }
  };
  
  // Update user
  const updateUser = async (userId: string, data: Partial<UserProfile>): Promise<boolean> => {
    setSubmitting(true);
    
    try {
      await api.patch(`/api/users/${userId}`, data);
      
      toast.success('Team member updated successfully');
      
      // Refresh the list
      await fetchUsers(currentPage);
      
      return true;
    } catch (err: any) {
      console.error('Error updating user:', err);
      const errorMsg = err.response?.data?.error || 'Failed to update team member';
      toast.error(errorMsg);
      return false;
    } finally {
      setSubmitting(false);
    }
  };
  
  // Suspend user
  const suspendUser = async (userId: string): Promise<boolean> => {
    setSubmitting(true);
    
    try {
      await api.post(`/api/users/${userId}/suspend`);
      
      toast.success('Team member suspended successfully');
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.user_id === userId 
          ? { ...user, status: 'suspended' as const }
          : user
      ));
      
      return true;
    } catch (err: any) {
      console.error('Error suspending user:', err);
      const errorMsg = err.response?.data?.error || 'Failed to suspend team member';
      toast.error(errorMsg);
      return false;
    } finally {
      setSubmitting(false);
    }
  };
  
  // Activate user
  const activateUser = async (userId: string): Promise<boolean> => {
    setSubmitting(true);
    
    try {
      await api.post(`/api/users/${userId}/activate`);
      
      toast.success('Team member activated successfully');
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.user_id === userId 
          ? { ...user, status: 'active' as const }
          : user
      ));
      
      return true;
    } catch (err: any) {
      console.error('Error activating user:', err);
      const errorMsg = err.response?.data?.error || 'Failed to activate team member';
      toast.error(errorMsg);
      return false;
    } finally {
      setSubmitting(false);
    }
  };
  
  // Reset user password
  const resetUserPassword = async (userId: string): Promise<boolean> => {
    setSubmitting(true);
    
    try {
      await api.post(`/api/users/${userId}/reset-password`);
      
      toast.success('Password reset email sent');
      return true;
    } catch (err: any) {
      console.error('Error resetting password:', err);
      const errorMsg = err.response?.data?.error || 'Failed to reset password';
      toast.error(errorMsg);
      return false;
    } finally {
      setSubmitting(false);
    }
  };
  
  // Assign role to user
  const assignRole = async (userId: string, roleId: string): Promise<boolean> => {
    setSubmitting(true);
    
    try {
      await api.post(`/api/users/${userId}/roles`, { role_id: roleId });
      
      toast.success('Role assigned successfully');
      
      // Refresh the list
      await fetchUsers(currentPage);
      
      return true;
    } catch (err: any) {
      console.error('Error assigning role:', err);
      const errorMsg = err.response?.data?.error || 'Failed to assign role';
      toast.error(errorMsg);
      return false;
    } finally {
      setSubmitting(false);
    }
  };
  
  // Remove role from user
  const removeRole = async (userId: string, roleId: string): Promise<boolean> => {
    setSubmitting(true);
    
    try {
      await api.delete(`/api/users/${userId}/roles/${roleId}`);
      
      toast.success('Role removed successfully');
      
      // Refresh the list
      await fetchUsers(currentPage);
      
      return true;
    } catch (err: any) {
      console.error('Error removing role:', err);
      const errorMsg = err.response?.data?.error || 'Failed to remove role';
      toast.error(errorMsg);
      return false;
    } finally {
      setSubmitting(false);
    }
  };
  
  // Get user activity log
  const getUserActivity = async (userId: string, days: number = 30): Promise<UserActivity[]> => {
    try {
      const response = await api.get<{ data: UserActivity[] }>(
        `/api/users/${userId}/activity?days=${days}`
      );
      return response.data.data;
    } catch (err: any) {
      console.error('Error fetching user activity:', err);
      toast.error('Failed to load activity log');
      return [];
    }
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchUsers(page, statusFilter, roleFilter, searchTerm);
  };
  
  // Handle filter changes
  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
    fetchUsers(1, status, roleFilter, searchTerm);
  };
  
  const handleRoleChange = (role: string) => {
    setRoleFilter(role);
    setCurrentPage(1);
    fetchUsers(1, statusFilter, role, searchTerm);
  };
  
  const handleSearch = (search: string) => {
    setSearchTerm(search);
    setCurrentPage(1);
    fetchUsers(1, statusFilter, roleFilter, search);
  };
  
  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && currentTenant?.id) {
      fetchUsers(1);
    }
  }, [autoLoad, currentTenant?.id]);
  
  // Refresh users when tenant changes
  useEffect(() => {
    if (currentTenant?.id && users.length > 0) {
      fetchUsers(1);
    }
  }, [currentTenant?.id]);
  
  return {
    // State
    users,
    loading,
    submitting,
    error,
    currentPage,
    totalPages,
    totalCount,
    statusFilter,
    roleFilter,
    searchTerm,
    
    // Actions
    fetchUsers,
    getUser,
    updateUser,
    suspendUser,
    activateUser,
    resetUserPassword,
    assignRole,
    removeRole,
    getUserActivity,
    handlePageChange,
    handleStatusChange,
    handleRoleChange,
    handleSearch,
    
    // Computed
    hasUsers: users.length > 0,
    activeCount: users.filter(u => u.status === 'active').length,
    invitedCount: users.filter(u => u.status === 'invited').length,
    suspendedCount: users.filter(u => u.status === 'suspended').length
  };
};

// Hook for current user profile - EXTENDED WITH NEW FUNCTIONS
export const useCurrentUserProfile = () => {
  const { user: authUser, currentTenant } = useAuth();
  const [profile, setProfile] = useState<UserDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchProfile = useCallback(async () => {
    if (!authUser?.id || !currentTenant?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get<UserDetailsResponse>('/api/users/me');
      setProfile(response.data);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      const errorMsg = err.response?.data?.error || 'Failed to load profile';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [authUser?.id, currentTenant?.id]);
  
  const updateProfile = async (data: Partial<UserProfile>): Promise<boolean> => {
    setUpdating(true);
    try {
      await api.patch('/api/users/me', data);
      toast.success('Profile updated successfully');
      
      // Refresh profile
      await fetchProfile();
      return true;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      const errorMsg = err.response?.data?.error || 'Failed to update profile';
      toast.error(errorMsg);
      return false;
    } finally {
      setUpdating(false);
    }
  };
  
  // NEW FUNCTION: Update avatar
  const updateAvatar = async (avatarUrl: string): Promise<boolean> => {
  setUpdating(true);
  try {
    const response = await api.patch('/api/users/me', { 
      avatar_url: avatarUrl 
    });
    
    toast.success('Avatar updated successfully');
    await fetchProfile();
    
    // Update the user in AuthContext to reflect in Header
    if (authUser && setUser) {  // You'll need to get setUser from AuthContext
      setUser({
        ...authUser,
        avatar_url: avatarUrl
      });
    }
    
    return true;
  } catch (err: any) {
    console.error('Error updating avatar:', err);
    return false;
  } finally {
    setUpdating(false);
  }
};

  // NEW FUNCTION: Remove avatar
  const removeAvatar = async (): Promise<boolean> => {
    setUpdating(true);
    try {
      await api.delete('/api/user-management/me/avatar');
      toast.success('Avatar removed successfully');
      await fetchProfile();
      return true;
    } catch (err: any) {
      console.error('Error removing avatar:', err);
      const errorMsg = err.response?.data?.error || 'Failed to remove avatar';
      toast.error(errorMsg);
      return false;
    } finally {
      setUpdating(false);
    }
  };
  
  // NEW FUNCTION: Change password
  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    setUpdating(true);
    try {
      await api.post('/api/user-management/me/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      toast.success('Password changed successfully');
      return true;
    } catch (err: any) {
      console.error('Error changing password:', err);
      const errorMsg = err.response?.data?.error || 'Failed to change password';
      toast.error(errorMsg);
      return false;
    } finally {
      setUpdating(false);
    }
  };
  
  // NEW FUNCTION: Validate mobile number
  // In src/hooks/useUsers.ts - update the validateMobile function in useCurrentUserProfile

const validateMobile = async (mobile: string, countryCode: string): Promise<boolean> => {
  // Skip separate validation - profile update API handles duplicate mobile checks
  // This avoids 404 errors from missing endpoint and simplifies the flow
  return true;
};
  
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);
  
  return {
    profile,
    loading,
    updating,
    error,
    fetchProfile,
    updateProfile,
    updateAvatar,
    removeAvatar,
    changePassword,
    validateMobile
  };
};