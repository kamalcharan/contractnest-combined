// src/contexts/TenantContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

// Types
export interface TenantProfile {
  id?: string;
  tenant_id?: string;
  business_type_id: string;
  industry_id: string;
  business_name: string;
  logo_url?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_code?: string | null;
  country_code?: string | null;
  postal_code?: string | null;
  business_phone_country_code?: string | null;
  business_phone?: string | null;
  business_email?: string | null;
  website_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface TenantContextType {
  // State
  profile: TenantProfile | null;
  loading: boolean;
  error: string | null;
  
  // Methods
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<TenantProfile>) => Promise<boolean>;
  uploadLogo: (file: File) => Promise<string | null>;
  clearError: () => void;
  resetProfile: () => void;
}

const TenantContext = createContext<TenantContextType>({
  profile: null,
  loading: false,
  error: null,
  fetchProfile: async () => {},
  updateProfile: async () => false,
  uploadLogo: async () => null,
  clearError: () => {},
  resetProfile: () => {}
});

export const useTenantContext = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenantContext must be used within TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const { currentTenant, isLive, initializePerspective } = useAuth();
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  // Fetch profile with caching
  const fetchProfile = useCallback(async (forceRefresh = false) => {
    if (!currentTenant?.id) {
      setProfile(null);
      return;
    }

    // Check cache validity
    const now = Date.now();
    const cacheValid = !forceRefresh && lastFetchTime && (now - lastFetchTime < CACHE_DURATION);
    
    if (cacheValid && profile) {
      console.log('Using cached tenant profile');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching tenant profile for ${currentTenant.name} (${isLive ? 'Live' : 'Test'})`);
      
      const response = await api.get(API_ENDPOINTS.TENANTS.PROFILE);
      const profileData = response.data;
      
      if (profileData) {
        setProfile(profileData);
        setLastFetchTime(now);
        // Initialize perspective default from business type (only runs once)
        if (profileData.business_type_id) {
          initializePerspective(profileData.business_type_id);
        }
      } else {
        setProfile(null);
      }
    } catch (err: any) {
      console.error('Error fetching tenant profile:', err);
      
      if (err.response?.status === 404) {
        // No profile exists yet - this is okay
        setProfile(null);
      } else {
        const errorMsg = err.response?.data?.error || 'Failed to load tenant profile';
        setError(errorMsg);
        
        // Only show toast for non-404 errors
        toast.error(errorMsg, {
          duration: 3000,
          style: {
            padding: '16px',
            borderRadius: '8px',
            background: '#EF4444',
            color: '#FFF',
            fontSize: '16px',
            minWidth: '300px'
          },
        });
      }
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, currentTenant?.name, isLive, profile, lastFetchTime]);

  // Update profile
  const updateProfile = useCallback(async (data: Partial<TenantProfile>): Promise<boolean> => {
    if (!currentTenant?.id) return false;

    setError(null);
    
    // Show loading toast
    const loadingToastId = toast.loading(`Updating business profile (${isLive ? 'Live' : 'Test'})...`, {
      style: {
        padding: '16px',
        borderRadius: '8px',
        background: '#FFFFFF',
        color: '#333333',
        fontSize: '16px',
        minWidth: '300px'
      },
    });

    try {
      let response;
      
      if (profile?.id) {
        // Update existing profile
        response = await api.put(API_ENDPOINTS.TENANTS.PROFILE, data);
      } else {
        // Create new profile with default values
        const newProfileData: TenantProfile = {
          business_type_id: data.business_type_id || '',
          industry_id: data.industry_id || '',
          business_name: data.business_name || currentTenant.name || '',
          primary_color: data.primary_color || '#F59E0B',
          secondary_color: data.secondary_color || '#10B981',
          country_code: data.country_code || 'IN',
          business_phone_country_code: data.business_phone_country_code || '+91',
          ...data
        };
        
        response = await api.post(API_ENDPOINTS.TENANTS.PROFILE, newProfileData);
      }
      
      setProfile(response.data);
      setLastFetchTime(Date.now());
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToastId);
      toast.success(profile?.id 
        ? `Profile updated successfully (${isLive ? 'Live' : 'Test'})` 
        : `Profile created successfully (${isLive ? 'Live' : 'Test'})`, {
        duration: 3000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#10B981',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
      
      return true;
    } catch (err: any) {
      console.error('Error updating tenant profile:', err);
      const errorMsg = err.response?.data?.error || 'Failed to update profile';
      setError(errorMsg);
      
      // Dismiss loading toast and show error
      toast.dismiss(loadingToastId);
      toast.error(errorMsg, {
        duration: 4000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#EF4444',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
      
      return false;
    }
  }, [currentTenant?.id, currentTenant?.name, isLive, profile?.id]);

  // Upload logo
  const uploadLogo = useCallback(async (file: File): Promise<string | null> => {
    if (!currentTenant?.id) return null;

    const loadingToastId = toast.loading('Uploading logo...', {
      style: {
        padding: '16px',
        borderRadius: '8px',
        background: '#FFFFFF',
        color: '#333333',
        fontSize: '16px',
        minWidth: '300px'
      },
    });

    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await api.post(
        API_ENDPOINTS.TENANTS.UPLOAD_LOGO,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      const logoUrl = response.data.url;
      
      // Update profile with new logo URL
      if (profile) {
        setProfile({
          ...profile,
          logo_url: logoUrl
        });
      }
      
      toast.dismiss(loadingToastId);
      toast.success('Logo uploaded successfully', {
        duration: 2000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#10B981',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
      
      return logoUrl;
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      
      toast.dismiss(loadingToastId);
      toast.error(err.response?.data?.error || 'Failed to upload logo', {
        duration: 3000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#EF4444',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        },
      });
      
      return null;
    }
  }, [currentTenant?.id, profile]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset profile (clear cache)
  const resetProfile = useCallback(() => {
    setProfile(null);
    setLastFetchTime(0);
    setError(null);
  }, []);

  // Fetch profile when tenant changes
  useEffect(() => {
    if (currentTenant?.id) {
      fetchProfile();
    } else {
      resetProfile();
    }
  }, [currentTenant?.id]);

  // Listen for environment changes
  useEffect(() => {
    const handleEnvironmentChange = (event: CustomEvent) => {
      console.log('TenantContext: Environment changed', event.detail);
      
      if (currentTenant?.id) {
        // Force refresh on environment change
        fetchProfile(true);
      }
    };
    
    window.addEventListener('environment-changed', handleEnvironmentChange as EventListener);
    
    return () => {
      window.removeEventListener('environment-changed', handleEnvironmentChange as EventListener);
    };
  }, [currentTenant?.id, fetchProfile]);

  // Also refresh when isLive changes
  useEffect(() => {
    if (currentTenant?.id && profile) {
      // Skip initial load
      fetchProfile(true);
    }
  }, [isLive]);

  const value: TenantContextType = {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    uploadLogo,
    clearError,
    resetProfile
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

// Specialized hooks for common use cases

// Hook for onboarding workflow
export const useTenantOnboarding = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, uploadLogo } = useTenantContext();
  const { currentTenant } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<'business-type' | 'industry' | 'organization-details'>('business-type');
  const [formData, setFormData] = useState<Partial<TenantProfile>>({
    business_type_id: '',
    industry_id: '',
    business_name: currentTenant?.name || '',
    primary_color: '#F59E0B',
    secondary_color: '#10B981',
    country_code: 'IN',
    business_phone_country_code: '+91',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const updateField = (field: keyof TenantProfile, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const goToNextStep = () => {
    if (currentStep === 'business-type') {
      if (!formData.business_type_id) {
        toast.error('Please select a business type');
        return;
      }
      setCurrentStep('industry');
    } else if (currentStep === 'industry') {
      if (!formData.industry_id) {
        toast.error('Please select an industry');
        return;
      }
      setCurrentStep('organization-details');
    }
  };

  const goToPreviousStep = () => {
    if (currentStep === 'industry') {
      setCurrentStep('business-type');
    } else if (currentStep === 'organization-details') {
      setCurrentStep('industry');
    }
  };

  const completeOnboarding = async (redirectTo?: string) => {
    // Upload logo if provided
    let logoUrl = formData.logo_url;
    if (logoFile) {
      const uploadedUrl = await uploadLogo(logoFile);
      if (uploadedUrl) {
        logoUrl = uploadedUrl;
      }
    }

    // Save profile
    const success = await updateProfile({
      ...formData,
      logo_url: logoUrl
    });

    if (success && redirectTo) {
      navigate(redirectTo);
    }

    return success;
  };

  return {
    currentStep,
    formData,
    logoFile,
    setCurrentStep,
    updateField,
    setLogoFile,
    goToNextStep,
    goToPreviousStep,
    completeOnboarding
  };
};