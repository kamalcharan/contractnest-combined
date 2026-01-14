// src/hooks/useTenantProfile.ts
// Updated with VaNiToast
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast/VaNiToast';
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
  short_description?: string | null;  // For search result cards (200 chars)
  booking_url?: string | null;        // For Book Appointment intent (Calendly/Cal.com)
  logo_url?: string | null;
  // Contact Person
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  // Address
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_code?: string | null;
  country_code?: string | null;
  postal_code?: string | null;
  // Contact Info
  business_phone_country_code?: string | null;
  business_phone?: string | null;
  business_whatsapp_country_code?: string | null;
  business_whatsapp?: string | null;
  business_email?: string | null;
  website_url?: string | null;
  // Branding
  primary_color?: string | null;
  secondary_color?: string | null;
  // Timestamps
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
        vaniToast.error(err.response?.data?.error || 'Failed to load tenant profile');
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
        // Refresh the profile data
        fetchProfile().then(() => {
          vaniToast.success('Data refreshed successfully');
        }).catch(() => {
          vaniToast.error('Failed to refresh data');
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
        vaniToast.error('Please select a business type');
        return;
      }

      // Success feedback
      vaniToast.success('Great choice! Now let\'s select your industry.');
      setCurrentStep('industry');
    } else if (currentStep === 'industry') {
      if (!formData.industry_id) {
        vaniToast.error('Please select an industry');
        return;
      }

      // Success feedback
      vaniToast.success('Perfect! Just a few more details to complete your profile.');
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

      vaniToast.success('Logo uploaded successfully');
      return response.data.url;
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      vaniToast.error(err.response?.data?.error || 'Failed to upload logo image');
      return null;
    }
  };
  
  // Validate the final form
  const validateForm = (): boolean => {
    if (!formData.business_type_id) {
      vaniToast.error('Business type is required');
      return false;
    }

    if (!formData.industry_id) {
      vaniToast.error('Industry is required');
      return false;
    }

    if (!formData.business_name) {
      vaniToast.error('Business name is required');
      return false;
    }

    return true;
  };
  
  // Submit the form to create/update profile
  const submitProfile = async () => {
    if (!validateForm()) return false;

    setSubmitting(true);
    setError(null);

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

      // Show success toast
      vaniToast.success(profile?.id
        ? `Business profile updated successfully in ${isLive ? 'Live' : 'Test'} environment`
        : `Business profile created successfully in ${isLive ? 'Live' : 'Test'} environment`
      );

      // Redirect if specified
      if (redirectOnComplete) {
        navigate(redirectOnComplete);
      }

      return true;
    } catch (err: any) {
      console.error('Error saving tenant profile:', err);
      const errorMsg = err.response?.data?.error || 'Failed to save tenant profile';
      setError(errorMsg);
      vaniToast.error(errorMsg);
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