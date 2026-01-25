// src/hooks/useInvitations.ts
// Hook for managing invitations in FamilyKnows

import { useState, useCallback } from 'react';
import { api, API_ENDPOINTS } from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface Invitation {
  id: string;
  email?: string;
  mobile_number?: string;
  phone_code?: string;
  country_code?: string;
  invitation_method: 'email' | 'sms' | 'whatsapp';
  status: 'pending' | 'sent' | 'resent' | 'accepted' | 'expired' | 'cancelled';
  role_id?: string; // For FamilyKnows, this is the relationship ID
  custom_message?: string;
  invitation_link?: string;
  created_at: string;
  expires_at: string;
  resent_count: number;
  last_resent_at?: string;
  is_expired?: boolean;
  time_remaining?: string;
  invited_by_user?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  accepted_user?: {
    id: string;
    first_name?: string;
    last_name?: string;
  };
  accepted_at?: string;
}

export interface CreateInvitationData {
  email?: string;
  mobile_number?: string;
  country_code?: string;
  phone_code?: string;
  invitation_method: 'email' | 'sms' | 'whatsapp';
  role_id?: string; // Relationship ID for FamilyKnows
  custom_message?: string;
}

export interface InvitationsResponse {
  data: Invitation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UseInvitationsReturn {
  invitations: Invitation[];
  pagination: InvitationsResponse['pagination'] | null;
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  fetchInvitations: (page?: number, status?: string) => Promise<void>;
  createInvitation: (data: CreateInvitationData) => Promise<Invitation>;
  resendInvitation: (invitationId: string) => Promise<boolean>;
  cancelInvitation: (invitationId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useInvitations = (): UseInvitationsReturn => {
  const { currentTenant, isAuthenticated } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [pagination, setPagination] = useState<InvitationsResponse['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch invitations list
  const fetchInvitations = useCallback(async (page: number = 1, status: string = 'all') => {
    // Don't fetch if not authenticated or no tenant
    if (!isAuthenticated || !currentTenant?.id) {
      console.log('Skipping invitations fetch - no auth or tenant');
      setInvitations([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get<InvitationsResponse>(
        `${API_ENDPOINTS.INVITATIONS.LIST}?page=${page}&status=${status}&limit=20`
      );

      // Handle different response formats
      if (response.data && Array.isArray(response.data.data)) {
        setInvitations(response.data.data);
        setPagination(response.data.pagination);
      } else if (Array.isArray(response.data)) {
        // Direct array response
        setInvitations(response.data as unknown as Invitation[]);
        setPagination(null);
      } else {
        setInvitations([]);
        setPagination(null);
      }
    } catch (err: any) {
      console.error('Error fetching invitations:', err);
      // Don't set error for fetch failures - just show empty list
      // This prevents error toasts on initial load
      setInvitations([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentTenant?.id]);

  // Create new invitation
  const createInvitation = useCallback(async (data: CreateInvitationData): Promise<Invitation> => {
    if (!isAuthenticated || !currentTenant?.id) {
      throw new Error('Please log in to send invitations');
    }

    try {
      setIsCreating(true);
      setError(null);

      const response = await api.post<Invitation>(API_ENDPOINTS.INVITATIONS.CREATE, data);

      // Add new invitation to list
      setInvitations((prev) => [response.data, ...prev]);

      return response.data;
    } catch (err: any) {
      console.error('Error creating invitation:', err);
      const errorMessage = err.message || 'Failed to send invitation. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  }, [isAuthenticated, currentTenant?.id]);

  // Resend invitation
  const resendInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    if (!isAuthenticated || !currentTenant?.id) {
      setError('Please log in to resend invitations');
      return false;
    }

    try {
      setError(null);

      await api.post(API_ENDPOINTS.INVITATIONS.RESEND(invitationId));

      // Update invitation in list
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === invitationId
            ? {
                ...inv,
                status: 'resent' as const,
                resent_count: inv.resent_count + 1,
                last_resent_at: new Date().toISOString(),
              }
            : inv
        )
      );

      return true;
    } catch (err: any) {
      console.error('Error resending invitation:', err);
      const errorMessage = err.message || 'Failed to resend invitation';
      setError(errorMessage);
      return false;
    }
  }, [isAuthenticated, currentTenant?.id]);

  // Cancel invitation
  const cancelInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    if (!isAuthenticated || !currentTenant?.id) {
      setError('Please log in to cancel invitations');
      return false;
    }

    try {
      setError(null);

      await api.post(API_ENDPOINTS.INVITATIONS.CANCEL(invitationId));

      // Update invitation in list
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === invitationId ? { ...inv, status: 'cancelled' as const } : inv
        )
      );

      return true;
    } catch (err: any) {
      console.error('Error cancelling invitation:', err);
      const errorMessage = err.message || 'Failed to cancel invitation';
      setError(errorMessage);
      return false;
    }
  }, [isAuthenticated, currentTenant?.id]);

  return {
    invitations,
    pagination,
    isLoading,
    isCreating,
    error,
    fetchInvitations,
    createInvitation,
    resendInvitation,
    cancelInvitation,
    clearError,
  };
};

export default useInvitations;
