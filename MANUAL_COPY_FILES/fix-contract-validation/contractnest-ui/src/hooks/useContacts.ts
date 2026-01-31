// src/hooks/useContacts.ts - COMPLETE FIXED VERSION WITH CACHING

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useToast } from '@/components/ui/use-toast';

// =================================================================
// CACHE CONFIGURATION
// =================================================================

interface CacheEntry<T> {
  data: T;
  pagination: any;
  timestamp: number;
  key: string;
}

// Global in-memory cache for contacts list
const contactsCache: Map<string, CacheEntry<any[]>> = new Map();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Generate cache key from filters
const generateCacheKey = (tenantId: string, isLive: boolean, filters: any): string => {
  const filterKey = JSON.stringify({
    page: filters.page || 1,
    limit: filters.limit || 20,
    status: filters.status || 'active',
    type: filters.type,
    search: filters.search,
    classifications: filters.classifications,
    sort_by: filters.sort_by,
    sort_order: filters.sort_order
  });
  return `${tenantId}_${isLive ? 'live' : 'test'}_${filterKey}`;
};

// Check if cache entry is still valid
const isCacheValid = (entry: CacheEntry<any[]> | undefined): boolean => {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
};

// Get cached data
const getCachedData = (key: string): CacheEntry<any[]> | null => {
  const entry = contactsCache.get(key);
  if (isCacheValid(entry)) {
    console.log('📦 Cache HIT for contacts list');
    return entry!;
  }
  if (entry) {
    console.log('📦 Cache EXPIRED for contacts list');
    contactsCache.delete(key);
  }
  return null;
};

// Set cache data
const setCacheData = (key: string, data: any[], pagination: any): void => {
  contactsCache.set(key, {
    data,
    pagination,
    timestamp: Date.now(),
    key
  });
  console.log('📦 Cache SET for contacts list');
};

// =================================================================
// SINGLE CONTACT CACHE
// =================================================================

interface SingleContactCacheEntry {
  data: any;
  timestamp: number;
}

// Cache for individual contacts (keyed by contactId)
const singleContactCache: Map<string, SingleContactCacheEntry> = new Map();

// Single contact cache TTL (10 minutes - longer since individual contact data changes less frequently)
const SINGLE_CONTACT_CACHE_TTL = 10 * 60 * 1000;

// Get cached single contact
const getCachedContact = (contactId: string, tenantId: string, isLive: boolean): any | null => {
  const cacheKey = `${tenantId}_${isLive ? 'live' : 'test'}_${contactId}`;
  const entry = singleContactCache.get(cacheKey);
  if (entry && Date.now() - entry.timestamp < SINGLE_CONTACT_CACHE_TTL) {
    console.log('📦 Cache HIT for single contact:', contactId);
    return entry.data;
  }
  if (entry) {
    console.log('📦 Cache EXPIRED for single contact:', contactId);
    singleContactCache.delete(cacheKey);
  }
  return null;
};

// Set single contact cache
const setCachedContact = (contactId: string, tenantId: string, isLive: boolean, data: any): void => {
  const cacheKey = `${tenantId}_${isLive ? 'live' : 'test'}_${contactId}`;
  singleContactCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  console.log('📦 Cache SET for single contact:', contactId);
};

// Invalidate single contact cache
export const invalidateSingleContactCache = (contactId?: string, tenantId?: string, isLive?: boolean): void => {
  if (!contactId) {
    // Clear all single contact cache
    singleContactCache.clear();
    console.log('📦 Single contact cache CLEARED (all)');
  } else if (tenantId) {
    const cacheKey = `${tenantId}_${isLive !== undefined ? (isLive ? 'live' : 'test') : ''}_${contactId}`;
    singleContactCache.delete(cacheKey);
    console.log(`📦 Single contact cache CLEARED for ${contactId}`);
  }
};

// Invalidate cache for a tenant/environment
export const invalidateContactsCache = (tenantId?: string, isLive?: boolean): void => {
  if (!tenantId) {
    // Clear all cache
    contactsCache.clear();
    console.log('📦 Cache CLEARED (all)');
  } else {
    // Clear specific tenant/environment cache
    const prefix = `${tenantId}_${isLive !== undefined ? (isLive ? 'live' : 'test') : ''}`;
    for (const key of contactsCache.keys()) {
      if (key.startsWith(prefix)) {
        contactsCache.delete(key);
      }
    }
    console.log(`📦 Cache CLEARED for ${prefix}`);
  }
};

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

  const fetchContacts = useCallback(async (forceRefresh: boolean = false) => {
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

    // Generate cache key
    const cacheKey = generateCacheKey(currentTenant.id, isLive, filters);

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        console.log('✅ Using cached contacts data - instant load!');
        setData(cached.data);
        setPagination(cached.pagination);
        setLoading(false);
        setError(null);
        return;
      }
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
      console.log('=== CONTACT LIST REQUEST (API) ===');
      console.log('Tenant ID:', currentTenant.id);
      console.log('Environment:', isLive ? 'live' : 'test');
      console.log('Force Refresh:', forceRefresh);

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
          const contactsData = response.data.data || [];
          const paginationData = response.data.pagination;

          setData(contactsData);
          setPagination(paginationData);

          // Cache the response
          setCacheData(cacheKey, contactsData, paginationData);

          console.log(`✅ Fetched ${contactsData.length} contacts for ${isLive ? 'LIVE' : 'TEST'} environment`);
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

  // Fetch contacts when filters change (primary trigger)
  // Note: fetchContacts already has filters in its deps, so including it here
  // ensures we always call the latest version
  useEffect(() => {
    if (currentTenant?.id) {
      console.log('📋 Filters updated, fetching contacts...');
      console.log('Current sort:', filters.sort_by, filters.sort_order);
      fetchContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), currentTenant?.id]);

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
    setFilters(prevFilters => {
      // Only update and refetch if filters actually changed
      const prevKey = JSON.stringify(prevFilters);
      const newKey = JSON.stringify(newFilters);
      if (prevKey !== newKey) {
        console.log('🔄 Filters changed, will trigger refetch');
        console.log('Sort:', newFilters.sort_by, newFilters.sort_order);
        return newFilters;
      }
      return prevFilters;
    });
  }, []);

  const refetch = useCallback((forceRefresh: boolean = false) => {
    fetchContacts(forceRefresh);
  }, [fetchContacts]);

  // Force refresh that also invalidates cache
  const hardRefresh = useCallback(() => {
    if (currentTenant?.id) {
      invalidateContactsCache(currentTenant.id, isLive);
    }
    fetchContacts(true);
  }, [fetchContacts, currentTenant?.id, isLive]);

  return {
    data,
    contacts: data, // Alias for compatibility
    loading,
    error,
    pagination,
    refetch,
    hardRefresh, // Use this after create/update/delete
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
 * OPTIMIZED: Uses in-memory cache for instant loading on return visits
 */
export const useContact = (contactId: string) => {
  const { currentTenant, isLive } = useAuth();
  const [data, setData] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContact = useCallback(async (forceRefresh: boolean = false) => {
    if (!currentTenant?.id || !contactId) {
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedContact(contactId, currentTenant.id, isLive);
      if (cached) {
        console.log('✅ Using cached contact data - instant load!');
        setData(cached);
        setLoading(false);
        setError(null);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`=== FETCHING CONTACT (API) ===`);
      console.log(`Contact ID: ${contactId}`);
      console.log(`Environment: ${isLive ? 'LIVE' : 'TEST'}`);

      const response = await api.get(`/api/contacts/${contactId}`, {
        headers: {
          'x-tenant-id': currentTenant.id,
          'x-environment': isLive ? 'live' : 'test',
        }
      });

      if (response.data.success) {
        const contactData = response.data.data;
        setData(contactData);

        // Cache the response
        setCachedContact(contactId, currentTenant.id, isLive, contactData);
        console.log('✅ Contact data fetched and cached');
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

  // Hard refresh that also invalidates cache
  const hardRefresh = useCallback(() => {
    if (currentTenant?.id && contactId) {
      invalidateSingleContactCache(contactId, currentTenant.id, isLive);
    }
    fetchContact(true);
  }, [fetchContact, contactId, currentTenant?.id, isLive]);

  return {
    data,
    loading,
    error,
    refetch: fetchContact,
    hardRefresh // Use after edit to force fresh data
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

// =================================================================
// PREFETCH — warm the cache before user reaches BuyerSelectionStep
// =================================================================

/**
 * Prefetch contacts for a given classification into the module-level cache.
 * Call from ContractsHub on mount to ensure instant load in the wizard.
 * Silently succeeds/fails — does not throw or show toasts.
 */
export const prefetchContacts = async (
  tenantId: string,
  isLive: boolean,
  classification: string,
): Promise<void> => {
  const filters = {
    page: 1,
    limit: 20,
    status: 'active',
    classifications: [classification],
    sort_by: 'created_at',
    sort_order: 'desc',
  };

  const cacheKey = generateCacheKey(tenantId, isLive, filters);

  // Skip if already cached
  if (getCachedData(cacheKey)) {
    return;
  }

  try {
    const params = new URLSearchParams({
      page: '1',
      limit: '20',
      status: 'active',
      classifications: classification,
      sort_by: 'created_at',
      sort_order: 'desc',
    });

    const response = await api.get(`/api/contacts?${params.toString()}`, {
      headers: {
        'x-tenant-id': tenantId,
        'x-environment': isLive ? 'live' : 'test',
      },
    });

    if (response.data.success) {
      setCacheData(cacheKey, response.data.data || [], response.data.pagination);
      console.log(`📦 Prefetched ${classification} contacts (${(response.data.data || []).length} records)`);
    }
  } catch {
    // Silent — prefetch failures are not critical
  }
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