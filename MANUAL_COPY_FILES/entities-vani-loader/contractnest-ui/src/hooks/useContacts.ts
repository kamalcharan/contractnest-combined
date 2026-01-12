// src/hooks/useContacts.ts - COMPLETE FIXED VERSION

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useToast } from '@/components/ui/use-toast';

// =================================================================
// TYPES
// =================================================================

export interface ContactFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'archived' | 'all';
  type?: 'individual' | 'corporate';
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  classifications?: string[];
  user_status?: 'all' | 'user' | 'not_user';
  show_duplicates?: boolean;
  includeInactive?: boolean;
  includeArchived?: boolean;
  enabled?: boolean; // ADDED: Control whether to fetch or not
}

export interface Contact {
  id: string;
  type: 'individual' | 'corporate';
  status: 'active' | 'inactive' | 'archived';
  name?: string;
  company_name?: string;
  displayName: string;
  salutation?: string;
  designation?: string;
  department?: string;
  classifications: string[];
  tags: any[];
  contact_channels: ContactChannel[];
  addresses: ContactAddress[];
  contact_addresses?: ContactAddress[]; // Alias
  contact_persons?: Contact[];
  parent_contacts?: Contact[];
  notes?: string;
  tenant_id: string;
  auth_user_id?: string;
  created_at: string;
  updated_at: string;
  is_live: boolean;
}

export interface ContactChannel {
  id: string;
  contact_id: string;
  channel_type: string;
  value: string;
  country_code?: string;
  is_primary: boolean;
  is_verified: boolean;
  notes?: string;
}

export interface ContactAddress {
  id: string;
  contact_id: string;
  type: string;
  label?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_code: string;
  country_code: string;
  postal_code?: string;
  google_pin?: string;
  is_primary: boolean;
  notes?: string;
}

export interface CreateContactRequest {
  type: 'individual' | 'corporate';
  status?: 'active' | 'inactive' | 'archived';
  name?: string;
  company_name?: string;
  salutation?: string;
  designation?: string;
  department?: string;
  classifications: string[];
  tags?: any[];
  contact_channels: Omit<ContactChannel, 'id' | 'contact_id'>[];
  addresses?: Omit<ContactAddress, 'id' | 'contact_id'>[];
  contact_persons?: any[];
  compliance_numbers?: any[];
  notes?: string;
  force_create?: boolean;
}

export interface UpdateContactRequest extends Partial<CreateContactRequest> {
  // All fields optional for updates
}

export interface ContactStats {
  total: number;
  active: number;
  inactive: number;
  archived: number;
  by_type?: {
    individual: number;
    corporate: number;
  };
  by_classification?: Record<string, number>;
  duplicates?: number;
}

// =================================================================
// CUSTOM HOOKS
// =================================================================

/**
 * Hook to list contacts with filtering and pagination
 * FIXED: Properly handles environment and tenant filtering
 */
export const useContactList = (initialFilters: ContactFilters) => {
  const { currentTenant, isLive } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [filters, setFilters] = useState(initialFilters);

  // Use ref to track the current request to prevent race conditions
  const requestIdRef = useRef(0);

  // Update filters when initialFilters change
  useEffect(() => {
    setFilters(initialFilters);
  }, [JSON.stringify(initialFilters)]); // Use JSON.stringify to detect deep changes

  const fetchContacts = useCallback(async () => {
    // Check if fetching is enabled
    if (filters.enabled === false) {
      console.log('Contact fetching disabled by enabled flag');
      setData([]);
      setLoading(false);
      return;
    }

    // Validate tenant
    if (!currentTenant?.id) {
      console.warn('No tenant selected, skipping contact fetch');
      setError('No workspace selected');
      setData([]);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      // Add all filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (key === 'classifications' && Array.isArray(value) && value.length > 0) {
            // FIXED: Send classifications as comma-separated string
            params.append(key, value.join(','));
          } else if (key === 'includeInactive' || key === 'includeArchived' || key === 'show_duplicates') {
            // Boolean flags
            if (value === true) {
              params.append(key, 'true');
            }
          } else if (Array.isArray(value)) {
            // Other arrays
            if (value.length > 0) {
              params.append(key, value.join(','));
            }
          } else {
            // All other values
            params.append(key, String(value));
          }
        }
      });

      // Debug logging
      console.log('=== CONTACT LIST REQUEST ===');
      console.log('Tenant ID:', currentTenant.id);
      console.log('Environment:', isLive ? 'live' : 'test');
      console.log('Filters:', filters);
      console.log('Query params:', params.toString());
      console.log('Headers being sent:', {
        'x-tenant-id': currentTenant.id,
        'x-environment': isLive ? 'live' : 'test'
      });

      // Make the API request with proper headers
      const response = await api.get(`/api/contacts?${params.toString()}`, {
        headers: {
          'x-tenant-id': currentTenant.id,
          'x-environment': isLive ? 'live' : 'test', // CRITICAL: Send environment header
        }
      });

      // Only update state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        if (response.data.success) {
          setData(response.data.data || []);
          setPagination(response.data.pagination);
          
          console.log(`Fetched ${response.data.data?.length || 0} contacts for ${isLive ? 'LIVE' : 'TEST'} environment`);
        } else {
          const errorMsg = response.data.error || 'Failed to fetch contacts';
          setError(errorMsg);
          console.error('API returned error:', errorMsg);
        }
      }
    } catch (err: any) {
      // Only update state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        console.error('Error fetching contacts:', err);
        const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch contacts';
        setError(errorMsg);
        
        // Show toast for errors (except initial load)
        if (filters.page !== 1) {
          toast({
            variant: "destructive",
            title: "Error",
            description: errorMsg
          });
        }
      }
    } finally {
      // Only update loading state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [currentTenant?.id, isLive, filters, toast]);

  // Fetch contacts when dependencies change
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Re-fetch when tenant or environment changes
  useEffect(() => {
    console.log('Environment or tenant changed, refreshing contacts');
    console.log('New environment:', isLive ? 'live' : 'test');
    console.log('Tenant:', currentTenant?.id);
    
    if (currentTenant?.id) {
      fetchContacts();
    }
  }, [currentTenant?.id, isLive]);

  const updateFilters = useCallback((newFilters: ContactFilters) => {
    setFilters(newFilters);
  }, []);

  const refetch = useCallback(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    data,
    contacts: data, // Alias for compatibility
    loading,
    error,
    pagination,
    refetch,
    updateFilters,
    filters,
    currentEnvironment: isLive ? 'live' : 'test'
  };
};

/**
 * Hook to get contact statistics
 * FIXED: Properly handles environment filtering
 */
export const useContactStats = (filters?: Partial<ContactFilters>) => {
  const { currentTenant, isLive } = useAuth();
  const [data, setData] = useState<ContactStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!currentTenant?.id) {
      setError('No workspace selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'classifications' && Array.isArray(value) && value.length > 0) {
              params.append(key, value.join(','));
            } else if (!Array.isArray(value)) {
              params.append(key, String(value));
            }
          }
        });
      }

      console.log('Fetching contact stats for environment:', isLive ? 'live' : 'test');

      const response = await api.get(`/api/contacts/stats?${params.toString()}`, {
        headers: {
          'x-tenant-id': currentTenant.id,
          'x-environment': isLive ? 'live' : 'test', // CRITICAL: Send environment header
        }
      });

      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch stats');
      }
    } catch (err: any) {
      console.error('Error fetching contact stats:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, isLive, filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    data,
    loading,
    error,
    refetch: fetchStats
  };
};

/**
 * Hook to get a single contact by ID
 * FIXED: Properly handles environment filtering
 */
export const useContact = (contactId: string) => {
  const { currentTenant, isLive } = useAuth();
  const [data, setData] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContact = useCallback(async () => {
    if (!currentTenant?.id || !contactId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching contact ${contactId} for ${isLive ? 'LIVE' : 'TEST'} environment`);

      const response = await api.get(`/api/contacts/${contactId}`, {
        headers: {
          'x-tenant-id': currentTenant.id,
          'x-environment': isLive ? 'live' : 'test',
        }
      });

      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.error || 'Contact not found');
      }
    } catch (err: any) {
      console.error('Error fetching contact:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch contact');
    } finally {
      setLoading(false);
    }
  }, [contactId, currentTenant?.id, isLive]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  return {
    data,
    loading,
    error,
    refetch: fetchContact
  };
};

/**
 * Hook to create a contact
 * FIXED: Properly handles environment
 */
export const useCreateContact = () => {
  const { currentTenant, isLive } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (contactData: CreateContactRequest): Promise<Contact> => {
    if (!currentTenant?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Creating contact in ${isLive ? 'LIVE' : 'TEST'} environment`);

      const response = await api.post('/api/contacts', contactData, {
        headers: {
          'x-tenant-id': currentTenant.id,
          'x-environment': isLive ? 'live' : 'test',
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to create contact');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create contact';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    mutate,
    loading,
    error
  };
};

/**
 * Hook to update a contact
 * FIXED: Properly handles environment
 */
export const useUpdateContact = () => {
  const { currentTenant, isLive } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async ({ 
    contactId, 
    updates 
  }: { 
    contactId: string; 
    updates: UpdateContactRequest 
  }): Promise<Contact> => {
    if (!currentTenant?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Updating contact ${contactId} in ${isLive ? 'LIVE' : 'TEST'} environment`);

      const response = await api.put(`/api/contacts/${contactId}`, updates, {
        headers: {
          'x-tenant-id': currentTenant.id,
          'x-environment': isLive ? 'live' : 'test',
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to update contact');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to update contact';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    mutate,
    loading,
    error
  };
};

/**
 * Hook to update contact status
 * FIXED: Properly handles environment
 */
export const useUpdateContactStatus = () => {
  const { currentTenant, isLive } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (contactId: string, status: string): Promise<Contact> => {
    if (!currentTenant?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Updating contact ${contactId} status to ${status} in ${isLive ? 'LIVE' : 'TEST'} environment`);

      const response = await api.patch(`/api/contacts/${contactId}/status`,
        { status },
        {
          headers: {
            'x-tenant-id': currentTenant.id,
            'x-environment': isLive ? 'live' : 'test',
          }
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to update contact status');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to update status';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    mutate,
    loading,
    error
  };
};

/**
 * Hook to check for duplicate contacts
 * FIXED: Properly handles environment
 */
export const useCheckDuplicates = () => {
  const { currentTenant, isLive } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async (contactData: any): Promise<any> => {
    if (!currentTenant?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Checking duplicates in ${isLive ? 'LIVE' : 'TEST'} environment`);

      const response = await api.post('/api/contacts/duplicates', contactData, {
        headers: {
          'x-tenant-id': currentTenant.id,
          'x-environment': isLive ? 'live' : 'test',
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to check duplicates');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to check duplicates';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    check,
    loading,
    error
  };
};

/**
 * Hook to send invitation to contact
 * FIXED: Properly handles environment
 */
export const useSendInvitation = () => {
  const { currentTenant, isLive } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (contactId: string): Promise<any> => {
    if (!currentTenant?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Sending invitation to contact ${contactId} in ${isLive ? 'LIVE' : 'TEST'} environment`);

      const response = await api.post(`/api/contacts/${contactId}/invite`, {}, {
        headers: {
          'x-tenant-id': currentTenant.id,
          'x-environment': isLive ? 'live' : 'test',
        }
      });

      if (response.data.success) {
        toast({
          title: "Success",
          description: response.data.message || "Invitation sent successfully"
        });
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to send invitation');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to send invitation';
      setError(errorMsg);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMsg
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    mutate,
    loading,
    error
  };
};

// Export all hooks
export {
  ContactFilters,
  Contact,
  ContactChannel,
  ContactAddress,
  CreateContactRequest,
  UpdateContactRequest,
  ContactStats
};