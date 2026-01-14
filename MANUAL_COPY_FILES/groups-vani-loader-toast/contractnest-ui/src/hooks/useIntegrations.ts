// src/hooks/useIntegrations.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

// Types
export type IntegrationType = {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ConnectionStatus = 'Connected' | 'Failed' | 'Pending' | 'Not Configured';

export interface ConfigField {
  name: string;
  type: 'text' | 'password' | 'email' | 'boolean' | 'select' | 'number';
  required: boolean;
  sensitive: boolean;
  description: string | null;
  display_name: string;
  default?: any;
  options?: Array<{ label: string; value: string | number | boolean }>;
}

export interface IntegrationProvider {
  id: string;
  type_id: string;
  name: string;
  display_name: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  config_schema: {
    fields: ConfigField[];
  };
  metadata: {
    support_email?: string;
    documentation_url?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface TenantIntegration {
  id: string;
  tenant_id: string;
  master_integration_id: string;
  is_active: boolean;
  is_live: boolean;
  credentials: Record<string, any>;
  connection_status: ConnectionStatus;
  last_verified: string | null;
  created_at: string;
  updated_at: string;
  provider?: IntegrationProvider;
}

export interface Integration {
  id?: string;
  tenant_id?: string;
  master_integration_id: string;
  integration_type: string; // Changed from IntegrationType to string for dynamic types
  integration_type_display?: string; // For UI display
  provider_name: string;
  display_name: string;
  description?: string;
  icon_name?: string;
  logo_url?: string; // Added for provider logos
  config_schema?: any; // Added for configuration schema
  metadata?: any; // Added for provider metadata
  is_configured?: boolean;
  is_active: boolean;
  is_live: boolean;
  credentials?: Record<string, any>;
  connection_status?: ConnectionStatus;
  last_verified?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IntegrationTypeStatus {
  integration_type: string; // Actual database name
  display_name: string;     // For UI display
  description: string;      // For UI description
  icon_name: string;       // For UI icons
  active_count: number;
  total_available: number;
}

// Component prop types
export interface ConnectIntegrationParams {
  master_integration_id: string;
  credentials: Record<string, any>;
  is_live?: boolean;
}

export interface UpdateIntegrationParams {
  id: string;
  credentials?: Record<string, any>;
  is_active?: boolean;
  is_live?: boolean;
}

export interface TestConnectionParams {
  provider_id: string;
  credentials: Record<string, any>;
  integration_id?: string;
}

export const useIntegrations = () => {
  const { isLive, currentTenant } = useAuth();
  
  // State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [integrationTypes, setIntegrationTypes] = useState<IntegrationTypeStatus[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [currentIntegration, setCurrentIntegration] = useState<Integration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null);
  
  // Use refs to prevent duplicate API calls
  const fetchingTypesRef = useRef(false);
  const fetchedTypesRef = useRef<Set<string>>(new Set());
  
  // Fetch all integration types with their status
  const fetchIntegrationTypes = useCallback(async () => {
    // Prevent duplicate calls
    if (fetchingTypesRef.current || !currentTenant?.id) return;
    
    fetchingTypesRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Fetching integration types with isLive:", isLive);
      
      const response = await api.get(`${API_ENDPOINTS.INTEGRATIONS.LIST}?isLive=${isLive}`);
      
      console.log("Integration types response:", response.data);
      setIntegrationTypes(response.data);
      
      // Clear fetched types when we get new types
      fetchedTypesRef.current.clear();
    } catch (err: any) {
      console.error('Error fetching integration types:', err);
      
      // Only show error toast if it's not an auth error (to prevent logout)
      if (err.response?.status !== 401) {
        vaniToast.error(err.response?.data?.error || 'Failed to load integration types');
      }
      
      setError(err.response?.data?.error || 'Failed to load integration types');
    } finally {
      setIsLoading(false);
      fetchingTypesRef.current = false;
    }
  }, [currentTenant?.id, isLive]);
  
  // Fetch integrations by type
  const fetchIntegrationsByType = useCallback(async (type: string) => {
    if (!currentTenant?.id) return;
    
    // Prevent duplicate calls for the same type
    if (fetchedTypesRef.current.has(type)) {
      console.log(`Already fetched integrations for type: ${type}`);
      return;
    }
    
    setError(null);
    
    try {
      console.log(`Fetching integrations for type: ${type} with isLive: ${isLive}`);
      
      // Use the type directly as it comes from the database
      const response = await api.get(`/api/integrations?type=${type}&isLive=${isLive}`);
      
      console.log(`Integrations response for ${type}:`, response.data);
      
      // Mark this type as fetched
      fetchedTypesRef.current.add(type);
      
      // Update integrations state - append new integrations
      setIntegrations(prev => {
        // Remove any existing integrations of this type
        const filtered = prev.filter(int => int.integration_type !== type);
        // Add the new integrations
        return [...filtered, ...response.data];
      });
    } catch (err: any) {
      console.error(`Error fetching integrations for type ${type}:`, err);
      
      // Only show error toast if it's not an auth error
      if (err.response?.status !== 401) {
        vaniToast.error(err.response?.data?.error || `Failed to load ${type} integrations`);
      }

      setError(err.response?.data?.error || 'Failed to load integrations');
    }
  }, [currentTenant?.id, isLive]);
  
  // Fetch specific integration
  const fetchIntegration = async (providerId: string) => {
    if (!currentTenant?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`${API_ENDPOINTS.INTEGRATIONS.BASE}?providerId=${providerId}&isLive=${isLive}`);
      setCurrentIntegration(response.data);
    } catch (err: any) {
      console.error('Error fetching integration:', err);

      if (err.response?.status !== 401) {
        vaniToast.error(err.response?.data?.error || 'Failed to load integration');
      }

      setError(err.response?.data?.error || 'Failed to load integration');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test integration connection - Updated to handle existing integrations
  const testConnection = async (integration: Integration) => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);
    
    try {
      // Build the test request payload
      const testPayload: any = {
        master_integration_id: integration.master_integration_id,
        credentials: integration.credentials,
        is_live: isLive,
        save: false
      };
      
      // If testing an existing integration, include the integration_id
      if (integration.id && integration.is_configured) {
        testPayload.integration_id = integration.id;
      }
      
      const response = await api.post(`${API_ENDPOINTS.INTEGRATIONS.TEST}`, testPayload);
      
      setTestResult(response.data);

      // Show toast based on result
      if (response.data.success) {
        vaniToast.success(response.data.message);
      } else {
        vaniToast.error(response.data.message);
      }

      return response.data;
    } catch (err: any) {
      console.error('Error testing integration:', err);
      
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Connection test failed';
      setError(errorMessage);
      setTestResult({
        success: false,
        message: errorMessage
      });

      if (err.response?.status !== 401) {
        vaniToast.error(errorMessage);
      }

      return { success: false, message: errorMessage };
    } finally {
      setIsTesting(false);
    }
  };
  
  // Save integration
  const saveIntegration = async (integration: Integration) => {
    setSubmitting(true);
    setError(null);

    const loadingToastId = vaniToast.info('Saving integration...', { duration: 60000 });

    try {
      // Test the connection first
      const testResponse = await testConnection(integration);

      if (!testResponse.success) {
        vaniToast.dismiss(loadingToastId);
        return false;
      }
      
      // Save the integration with test results
      const response = await api.post(API_ENDPOINTS.INTEGRATIONS.BASE, {
        ...integration,
        is_live: isLive,
        connection_status: 'Connected'
      });
      
      // Update current integration
      setCurrentIntegration(response.data);
      
      // Clear the fetched types to force refresh
      fetchedTypesRef.current.clear();

      vaniToast.dismiss(loadingToastId);
      vaniToast.success('Integration saved successfully');

      return true;
    } catch (err: any) {
      console.error('Error saving integration:', err);

      const errorMessage = err.response?.data?.error || 'Failed to save integration';
      setError(errorMessage);

      vaniToast.dismiss(loadingToastId);

      if (err.response?.status !== 401) {
        vaniToast.error(errorMessage);
      }

      return false;
    } finally {
      setSubmitting(false);
    }
  };
  
  // Toggle integration status
  const toggleIntegrationStatus = async (integrationId: string, active: boolean) => {
    try {
      await api.put(`${API_ENDPOINTS.INTEGRATIONS.TOGGLE_STATUS(integrationId)}`, {
        is_active: active
      });
      
      // Update local state
      if (currentIntegration && currentIntegration.id === integrationId) {
        setCurrentIntegration(prev => prev ? { ...prev, is_active: active } : null);
      }
      
      setIntegrations(prev => prev.map(int => 
        int.id === integrationId ? { ...int, is_active: active } : int
      ));
      
      // Clear fetched types to force refresh
      fetchedTypesRef.current.clear();
      
      // Refresh integration types to update counts
      fetchIntegrationTypes();

      vaniToast.success(`Integration ${active ? 'activated' : 'deactivated'} successfully`);

      return true;
    } catch (err: any) {
      console.error('Error toggling integration status:', err);

      if (err.response?.status !== 401) {
        vaniToast.error(err.response?.data?.error || 'Failed to update integration status');
      }

      return false;
    }
  };
  
  // Update form fields for current integration
  const updateIntegrationField = (field: keyof Integration, value: any) => {
    setCurrentIntegration(prev => {
      if (!prev) return null;
      
      if (field === 'credentials') {
        return {
          ...prev,
          credentials: {
            ...prev.credentials,
            ...value
          }
        };
      }
      
      return {
        ...prev,
        [field]: value
      };
    });
  };
  
  // Effect to reload when environment changes
  useEffect(() => {
    // Reset state when environment changes
    setIntegrationTypes([]);
    setIntegrations([]);
    setCurrentIntegration(null);
    fetchedTypesRef.current.clear();
  }, [isLive]);
  
  return {
    // State
    loading: isLoading,
    testing: isTesting,
    submitting,
    integrationTypes,
    integrations,
    currentIntegration,
    error,
    testResult,
    
    // Methods
    fetchIntegrationTypes,
    fetchIntegrationsByType,
    fetchIntegration,
    testConnection,
    saveIntegration,
    toggleIntegrationStatus,
    updateIntegrationField,
    setCurrentIntegration
  };
};