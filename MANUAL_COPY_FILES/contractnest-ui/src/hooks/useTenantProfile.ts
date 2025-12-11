// src/hooks/useTenantProfile.ts
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

// Types
export type BusinessTypeID = 'service_provider' | 'merchant';
export type WizardStep = 'business-type' | 'industry' | 'organization-details';

export interface TenantProfile {
  id?: string;
  tenant_id?: string;
  business_type_id: string;
  industry_id: string;
  business_name: string;
  short_description?: string | null;  // NEW: For search result cards (200 chars)
  booking_url?: string | null;        // NEW: For Book Appointment intent (Calendly/Cal.com)
  logo_url?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_code?: string | null;
  country_code?: string | null;
  postal_code?: string | null;
  business_phone_country_code?: string | null;
  business_phone?: string | null;
  business_whatsapp_country_code?: string | null;  // WhatsApp country code
  business_whatsapp?: string | null;               // WhatsApp number
  business_email?: string | null;
  website_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface UseTenantProfileOptions {
  isOnboarding?: boolean;
  redirectOnComplete?: string;
}

export const useTenantProfile = (options: UseTenantProfileOptions = {}) => {
  const { isOnboarding = false, redirectOnComplete } = options;
  const { currentTenant, isLive } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<WizardStep>('business-type');
  const [formData, setFormData] = useState<TenantProfile>({
    business_type_id: '',
    industry_id: '',
    business_name: currentTenant?.name || '',
    primary_color: '#F59E0B', // Default amber/orange color
    secondary_color: '#10B981', // Default green color
    country_code: 'IN', // Default to India
    business_phone_country_code: '+91', // Default to India's country code
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  // Fetch tenant profile data
  const fetchProfile = async () => {
    if (!currentTenant?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching tenant profile for environment: ${isLive ? 'Live' : 'Test'}`);
      
      const response = await api.get(API_ENDPOINTS.TENANTS.PROFILE);
      const profileData = response.data;
      
      if (profileData) {
        setProfile(profileData);
        setFormData({
          ...profileData,
          business_name: profileData.business_name || currentTenant.name || '',
        });
      } else {
        // No profile exists yet
        setProfile(null);
        setFormData({
          business_type_id: '',
          industry_id: '',
          business_name: currentTenant.name || '',
          primary_color: '#F59E0B',
          secondary_color: '#10B981',
          country_code: 'IN', // Default to India
          business_phone_country_code: '+91', // Default to India's country code
        });
      }
    } catch (err: any) {
      console.error('Error fetching tenant profile:', err);
      
      // Show error toast (only for non-404 errors)
      if (err.response?.status !== 404) {
        toast.error(err.response?.data?.error || 'Failed to load tenant profile', {
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
        setError(err.response?.data?.error || 'Failed to load tenant profile');
      }
      
      // Handle 404 silently
      if (err.response?.status === 404) {
        setProfile(null);
        setFormData({
          business_type_id: '',
          industry_id: '',
          business_name: currentTenant?.name || '',
          primary_color: '#F59E0B',
          secondary_color: '#10B981',
          country_code: 'IN',
          business_phone_country_code: '+91',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    if (!isOnboarding) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [currentTenant?.id, isOnboarding]);
  
  // Listen for environment changes
  useEffect(() => {
    const handleEnvironmentChange = (event: CustomEvent) => {
      console.log('Environment changed event received:', event.detail);
      
      // Only refresh if we're not in onboarding mode and have a current tenant
      if (!isOnboarding && currentTenant?.id) {
        // Show loading toast
        const loadingToastId = toast.loading('Refreshing data for new environment...', {
          style: {
            padding: '16px',
            borderRadius: '8px',
            background: '#FFFFFF',
            color: '#333333',
            fontSize: '16px',
            minWidth: '300px'
          },
        });
        
        // Refresh the profile data
        fetchProfile().then(() => {
          toast.dismiss(loadingToastId);
          toast.success('Data refreshed successfully', {
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
        }).catch(() => {
          toast.dismiss(loadingToastId);
          toast.error('Failed to refresh data', {
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
        });
      }
    };
    
    // Add event listener
    window.addEventListener('environment-changed', handleEnvironmentChange as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('environment-changed', handleEnvironmentChange as EventListener);
    };
  }, [currentTenant?.id, isOnboarding]);
  
  // Also refresh when isLive changes (for cases where the event might not fire)
  useEffect(() => {
    if (!isOnboarding && currentTenant?.id) {
      // Skip the initial load (when component mounts)
      const isInitialMount = profile === null && isLoading;
      if (!isInitialMount) {
        fetchProfile();
      }
    }
  }, [isLive]);
  
  // Update form fields
  const updateField = (field: keyof TenantProfile, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Navigate between wizard steps
  const goToNextStep = () => {
    if (currentStep === 'business-type') {
      if (!formData.business_type_id) {
        toast.error('Please select a business type', {
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
        return;
      }
      
      // Success feedback
      toast.success('Great choice! Now let\'s select your industry.', {
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
      
      setCurrentStep('industry');
    } else if (currentStep === 'industry') {
      if (!formData.industry_id) {
        toast.error('Please select an industry', {
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
        return;
      }
      
      // Success feedback
      toast.success('Perfect! Just a few more details to complete your profile.', {
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
  
  // Handle logo file selection
  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
  };
  
  // Upload logo file and get URL
  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return formData.logo_url || null;
    
    // Show uploading toast
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
      const formDataObj = new FormData();
      formDataObj.append('logo', logoFile);
      
      const response = await api.post(
        API_ENDPOINTS.TENANTS.UPLOAD_LOGO,
        formDataObj,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      // Dismiss loading toast and show success
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
      
      return response.data.url;
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      
      // Dismiss loading toast and show error
      toast.dismiss(loadingToastId);
      toast.error(err.response?.data?.error || 'Failed to upload logo image', {
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
  };
  
  // Validate the final form
  const validateForm = (): boolean => {
    if (!formData.business_type_id) {
      toast.error('Business type is required', {
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
      return false;
    }
    
    if (!formData.industry_id) {
      toast.error('Industry is required', {
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
      return false;
    }
    
    if (!formData.business_name) {
      toast.error('Business name is required', {
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
      return false;
    }
    
    return true;
  };
  
  // Submit the form to create/update profile
  const submitProfile = async () => {
    if (!validateForm()) return false;
    
    setSubmitting(true);
    setError(null);
    
    // Show loading toast
    const loadingToastId = toast.loading(`Saving your business profile (${isLive ? 'Live' : 'Test'} environment)...`, {
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
      // Upload logo first if there is one
      if (logoFile) {
        const logoUrl = await uploadLogo();
        if (logoUrl) {
          formData.logo_url = logoUrl;
        }
      }
      
      let response;
      
      if (profile?.id) {
        // Update existing profile
        response = await api.put(
          API_ENDPOINTS.TENANTS.PROFILE,
          formData
        );
      } else {
        // Create new profile
        response = await api.post(
          API_ENDPOINTS.TENANTS.PROFILE,
          formData
        );
      }
      
      setProfile(response.data);
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToastId);
      toast.success(profile?.id 
        ? `Business profile updated successfully in ${isLive ? 'Live' : 'Test'} environment` 
        : `Business profile created successfully in ${isLive ? 'Live' : 'Test'} environment`, {
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
      
      // Redirect if specified
      if (redirectOnComplete) {
        navigate(redirectOnComplete);
      }
      
      return true;
    } catch (err: any) {
      console.error('Error saving tenant profile:', err);
      const errorMsg = err.response?.data?.error || 'Failed to save tenant profile';
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
    } finally {
      setSubmitting(false);
    }
  };
  
  return {
    // State
    loading: isLoading, // Make sure to return the loading state with the correct name
    submitting,
    profile,
    error,
    currentStep,
    formData,
    logoFile,
    
    // Methods
    fetchProfile,
    updateField,
    goToNextStep,
    goToPreviousStep,
    handleLogoChange,
    submitProfile,
    setCurrentStep
  };
};