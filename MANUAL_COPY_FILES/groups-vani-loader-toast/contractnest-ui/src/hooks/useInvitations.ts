// src/hooks/useInvitations.ts
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

// Types
export interface Invitation {
  id: string;
  tenant_id: string;
  user_code: string;
  secret_code: string;
  email?: string;
  mobile_number?: string;
  invitation_method: 'email' | 'sms' | 'whatsapp';
  status: 'pending' | 'sent' | 'resent' | 'accepted' | 'expired' | 'cancelled';
  invited_by: string;
  accepted_by?: string;
  cancelled_by?: string;
  created_at: string;
  sent_at?: string;
  accepted_at?: string;
  cancelled_at?: string;
  expires_at: string;
  resent_count: number;
  last_resent_at?: string;
  metadata?: any;
  
  // Joined data
  invited_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  accepted_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  
  // Computed fields
  is_expired?: boolean;
  time_remaining?: string;
  invitation_link?: string;
}

export interface InvitationListResponse {
  data: Invitation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateInvitationData {
  email?: string;
  mobile_number?: string;
  country_code?: string;
  phone_code?: string;
  invitation_method: 'email' | 'sms' | 'whatsapp';
  role_id?: string;
  custom_message?: string;
}

export interface UseInvitationsOptions {
  autoLoad?: boolean;
  initialStatus?: string;
  pageSize?: number;
}

export const useInvitations = (options: UseInvitationsOptions = {}) => {
  const { autoLoad = true, initialStatus = 'all', pageSize = 10 } = options;
  const { currentTenant } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  
  // Fetch invitations list
  const fetchInvitations = useCallback(async (page: number = 1, status: string = statusFilter) => {
    if (!currentTenant?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get<InvitationListResponse>('/api/users/invitations', {
        params: {
          status,
          page,
          limit: pageSize
        }
      });
      
      setInvitations(response.data.data);
      setCurrentPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.totalPages);
      setTotalCount(response.data.pagination.total);
    } catch (err: any) {
      console.error('Error fetching invitations:', err);
      const errorMsg = err.response?.data?.error || 'Failed to load invitations';
      setError(errorMsg);
      // Only show toast for actual errors, not for empty data
      if (err.response?.status !== 404) {
        vaniToast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, statusFilter, pageSize]);
  
  // Create new invitation
  const createInvitation = async (data: CreateInvitationData): Promise<Invitation | null> => {
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await api.post<Invitation>('/api/users/invitations', data);

      vaniToast.success('Invitation sent successfully');

      // Refresh the list
      await fetchInvitations(currentPage, statusFilter);

      return response.data;
    } catch (err: any) {
      console.error('Error creating invitation:', err);
      const errorMsg = err.response?.data?.error || 'Failed to send invitation';
      setError(errorMsg);
      vaniToast.error(errorMsg);
      return null;
    } finally {
      setSubmitting(false);
    }
  };
  
  // Resend invitation
  const resendInvitation = async (invitationId: string): Promise<boolean> => {
    setSubmitting(true);

    try {
      await api.post(`/api/users/invitations/${invitationId}/resend`);

      vaniToast.success('Invitation resent successfully');

      // Refresh the list
      await fetchInvitations(currentPage, statusFilter);

      return true;
    } catch (err: any) {
      console.error('Error resending invitation:', err);
      const errorMsg = err.response?.data?.error || 'Failed to resend invitation';
      vaniToast.error(errorMsg);
      return false;
    } finally {
      setSubmitting(false);
    }
  };
  
  // Cancel invitation
  const cancelInvitation = async (invitationId: string): Promise<boolean> => {
    setSubmitting(true);

    try {
      await api.post(`/api/users/invitations/${invitationId}/cancel`);

      vaniToast.success('Invitation cancelled');

      // Refresh the list
      await fetchInvitations(currentPage, statusFilter);

      return true;
    } catch (err: any) {
      console.error('Error cancelling invitation:', err);
      const errorMsg = err.response?.data?.error || 'Failed to cancel invitation';
      vaniToast.error(errorMsg);
      return false;
    } finally {
      setSubmitting(false);
    }
  };
  
  // Get single invitation details
  const getInvitation = async (invitationId: string): Promise<Invitation | null> => {
    try {
      const response = await api.get<Invitation>(`/api/users/invitations/${invitationId}`);
      return response.data;
    } catch (err: any) {
      console.error('Error fetching invitation:', err);
      const errorMsg = err.response?.data?.error || 'Failed to load invitation details';
      if (err.response?.status !== 404) {
        vaniToast.error(errorMsg);
      }
      return null;
    }
  };
  
  // Validate invitation (for public use)
  const validateInvitation = async (userCode: string, secretCode: string) => {
    try {
      const response = await api.post('/api/users/invitations/validate', {
        user_code: userCode,
        secret_code: secretCode
      });
      
      return {
        valid: true,
        data: response.data
      };
    } catch (err: any) {
      console.error('Error validating invitation:', err);
      return {
        valid: false,
        error: err.response?.data?.error || 'Invalid invitation code'
      };
    }
  };
  
  // Accept invitation (for public use)
  const acceptInvitation = async (userCode: string, secretCode: string, userId: string) => {
    try {
      const response = await api.post('/api/users/invitations/accept', {
        user_code: userCode,
        secret_code: secretCode,
        user_id: userId
      });

      vaniToast.success('Invitation accepted successfully!');

      return {
        success: true,
        data: response.data
      };
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      const errorMsg = err.response?.data?.error || 'Failed to accept invitation';
      vaniToast.error(errorMsg);

      return {
        success: false,
        error: errorMsg
      };
    }
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchInvitations(page, statusFilter);
  };
  
  // Handle status filter change
  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page
    fetchInvitations(1, status);
  };
  
  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && currentTenant?.id) {
      fetchInvitations(1, statusFilter);
    }
  }, [autoLoad, currentTenant?.id]);
  
  // Don't refetch when tenant changes if autoLoad is false
  useEffect(() => {
    if (currentTenant?.id && invitations.length > 0 && autoLoad) {
      fetchInvitations(1, statusFilter);
    }
  }, [currentTenant?.id]);
  
  return {
    // State
    invitations,
    loading,
    submitting,
    error,
    statusFilter,
    currentPage,
    totalPages,
    totalCount,
    
    // Actions
    fetchInvitations,
    createInvitation,
    resendInvitation,
    cancelInvitation,
    getInvitation,
    validateInvitation,
    acceptInvitation,
    handlePageChange,
    handleStatusChange,
    
    // Computed
    hasInvitations: invitations.length > 0,
    pendingCount: invitations.filter(inv => ['pending', 'sent', 'resent'].includes(inv.status)).length,
    acceptedCount: invitations.filter(inv => inv.status === 'accepted').length
  };
};

// Hook for referral functionality (extending invitations)
export const useReferrals = () => {
  const invitationHook = useInvitations({ autoLoad: false });
  
  // Create referral invitation
  const createReferral = async (data: CreateInvitationData & { referral_context?: any }) => {
    const invitationData = {
      ...data,
      metadata: {
        type: 'tenant_referral',
        referral_context: data.referral_context
      }
    };
    
    return invitationHook.createInvitation(invitationData);
  };
  
  // Get referrals (filter invitations by type)
  const fetchReferrals = async (page: number = 1) => {
    // This would need backend support to filter by metadata.type
    return invitationHook.fetchInvitations(page, 'all');
  };
  
  return {
    ...invitationHook,
    createReferral,
    fetchReferrals
  };
};