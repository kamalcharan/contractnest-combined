// src/hooks/useInvitations.ts
// Hook for managing invitations in FamilyKnows

import { useState, useCallback } from 'react';
import { api, API_ENDPOINTS } from '../services/api';

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
}

export const useInvitations = (): UseInvitationsReturn => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [pagination, setPagination] = useState<InvitationsResponse['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch invitations list
  const fetchInvitations = useCallback(async (page: number = 1, status: string = 'all') => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if API has auth state before making request
      const authState = api.getAuthState();
      if (!authState.hasTenant) {
        console.log('useInvitations: No tenant ID available, skipping fetch');
        setInvitations([]);
        return;
      }

      const response = await api.get<InvitationsResponse>(
        `${API_ENDPOINTS.INVITATIONS.LIST}?page=${page}&status=${status}&limit=20`
      );

      setInvitations(response.data.data);
      setPagination(response.data.pagination);
    } catch (err: any) {
      // Log as warning instead of error to avoid Expo error notifications
      console.log('Failed to fetch invitations:', err.message);

      // Don't set error for tenantId issues (user might not be fully onboarded)
      if (!err.message?.includes('tenantId') && !err.message?.includes('temporarily unavailable')) {
        setError(err.message || 'Failed to fetch invitations');
      }
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new invitation
  const createInvitation = useCallback(async (data: CreateInvitationData): Promise<Invitation> => {
    try {
      setIsCreating(true);
      setError(null);

      const response = await api.post<Invitation>(API_ENDPOINTS.INVITATIONS.CREATE, data);

      // Add new invitation to list
      setInvitations((prev) => [response.data, ...prev]);

      return response.data;
    } catch (err: any) {
      console.error('Error creating invitation:', err);
      const errorMessage = err.message || 'Failed to send invitation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Resend invitation
  const resendInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
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
      setError(err.message || 'Failed to resend invitation');
      return false;
    }
  }, []);

  // Cancel invitation
  const cancelInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
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
      setError(err.message || 'Failed to cancel invitation');
      return false;
    }
  }, []);

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
  };
};

export default useInvitations;
