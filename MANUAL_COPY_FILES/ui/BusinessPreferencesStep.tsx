// src/pages/onboarding/steps/BusinessPreferencesStep.tsx
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import LogoUploadField from '@/components/tenantprofile/shared/LogoUploadField';
import BrandColorPicker from '@/components/tenantprofile/shared/BrandColorPicker';
import ContactFields from '@/components/tenantprofile/shared/ContactFields';
import { Paintbrush, CheckCircle, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface OnboardingStepContext {
  onComplete: (data?: Record<string, any>) => void;
  onSkip: () => void;
  isSubmitting: boolean;
  updateTenantField: (field: string, value: any) => void;
  handleTenantLogoChange: (file: File | null) => void;
  submitProfile: () => Promise<boolean>;
}

const BusinessPreferencesStep: React.FC = () => {
  const { 
    onComplete, 
    isSubmitting, 
    updateTenantField, 
    handleTenantLogoChange
  } = useOutletContext<OnboardingStepContext>();
  
  const { isDarkMode, currentTheme } = useTheme();
  const { currentTenant } = useAuth();
  const { profile } = useTenantProfile();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Form state
  const [businessName, setBusinessName] = useState(currentTenant?.name || '');
  const [primaryColor, setPrimaryColor] = useState('#4F46E5');
  const [secondaryColor, setSecondaryColor] = useState('#10B981');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessPhoneCountryCode, setBusinessPhoneCountryCode] = useState('+91');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappCountryCode, setWhatsappCountryCode] = useState('+91');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Check if already completed
  const isAlreadyCompleted = !!profile?.business_name && !!profile?.primary_color;

  /**
   * Handle skip for already completed step
   */
  const handleSkipCompleted = () => {
    onComplete({});
  };

  /**
   * Initialize form with tenant name on mount
   */
  useEffect(() => {
    if (currentTenant?.name) {
      setBusinessName(currentTenant.name);
      updateTenantField('business_name', currentTenant.name);
    }
  }, [currentTenant?.name]);

  /**
   * Update tenant field when business name changes
   */
  useEffect(() => {
    if (businessName) {
      updateTenantField('business_name', businessName);
    }
  }, [businessName]);

  /**
   * Update tenant field when colors change
   */
  useEffect(() => {
    updateTenantField('primary_color', primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    updateTenantField('secondary_color', secondaryColor);
  }, [secondaryColor]);

  /**
   * Handle business name change
   */
  const handleBusinessNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBusinessName(value);
    setValidationError(null);
  };

  /**
   * Handle primary color change
   */
  const handlePrimaryColorChange = (color: string) => {
    console.log('🟡 Primary color changed:', color);
    setPrimaryColor(color);
  };

  /**
   * Handle secondary color change
   */
  const handleSecondaryColorChange = (color: string) => {
    console.log('🟡 Secondary color changed:', color);
    setSecondaryColor(color);
  };

  /**
   * Handle contact field changes
   */
  const handleEmailChange = (email: string) => {
    setBusinessEmail(email);
    if (email) updateTenantField('business_email', email);
  };

  const handlePhoneChange = (phone: string) => {
    setBusinessPhone(phone);
    if (phone) updateTenantField('business_phone', phone);
  };

  const handlePhoneCountryCodeChange = (code: string) => {
    setBusinessPhoneCountryCode(code);
    updateTenantField('business_phone_country_code', code);
  };

  const handleWebsiteChange = (website: string) => {
    setWebsiteUrl(website);
    if (website) updateTenantField('website_url', website);
  };

  const handleWhatsAppChange = (whatsapp: string) => {
    setWhatsappNumber(whatsapp);
    if (whatsapp) updateTenantField('whatsapp_number', whatsapp);
  };

  const handleWhatsAppCountryCodeChange = (code: string) => {
    setWhatsappCountryCode(code);
    updateTenantField('whatsapp_country_code', code);
  };

  /**
   * Validate form before submission
   */
  const validateForm = (): boolean => {
    if (!businessName || businessName.trim().length === 0) {
      setValidationError('Company name is required');
      toast.error('Company name is required');
      return false;
    }

    if (businessName.trim().length < 2) {
      setValidationError('Company name must be at least 2 characters');
      toast.error('Company name must be at least 2 characters');
      return false;
    }

    return true;
  };

  /**
   * Handle form submission
   */
  const handleContinue = async () => {
    console.log('🟢 BusinessPreferencesStep (Branding) - Continue clicked');
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setValidationError(null);

    try {
      const dataToSend: Record<string, any> = {
        business_name: businessName.trim(),
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        step: 'business-preferences',
        completed_at: new Date().toISOString()
      };

      if (businessEmail) dataToSend.business_email = businessEmail;
      if (businessPhone) {
        dataToSend.business_phone = businessPhone;
        dataToSend.business_phone_country_code = businessPhoneCountryCode;
      }
      if (websiteUrl) dataToSend.website_url = websiteUrl;

      console.log('🟢 Data to send:', dataToSend);
      console.log('🔴 FINAL BUSINESS STEP - Passing to layout for save');

      await onComplete(dataToSend);

      console.log('✅ BusinessPreferencesStep (Branding) - Step completion triggered');
    } catch (error: any) {
      console.error('❌ Error in BusinessPreferencesStep (Branding):', error);
      
      const errorMessage = error?.message || 'Failed to save business profile';
      setValidationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const canContinue = businessName.trim().length >= 2 && !isSubmitting && !isLoading;

  // Show "Already Completed" view if data exists
  if (isAlreadyCompleted) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ 
              backgroundColor: colors.semantic.success + '20',
              color: colors.semantic.success
            }}
          >
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 
            className="text-2xl font-bold mb-2"
            style={{ color: colors.utility.primaryText }}
          >
            Branding Already Completed
          </h2>
          <p 
            className="text-sm mb-6"
            style={{ color: colors.utility.secondaryText }}
          >
            You've already completed this step. Click continue to proceed to the next step.
          </p>
          <button
            onClick={handleSkipCompleted}
            className="inline-flex items-center px-8 py-3 rounded-lg font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#FFFFFF'
            }}
          >
            Continue to Next Step
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
          <p 
            className="text-xs mt-4"
            style={{ color: colors.utility.secondaryText }}
          >
            To edit your branding, go to Settings → Business Profile after completing onboarding
          </p>
        </div>
      </div>
    );
  }

  // Show normal form if not completed
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-colors"
              style={{ 
                backgroundColor: colors.brand.primary + '20',
                color: colors.brand.primary
              }}
            >
              <Paintbrush className="w-8 h-8" />
            </div>
            <h2 
              className="text-2xl font-bold mb-2 transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Brand Your Workspace
            </h2>
            <p 
              className="text-sm transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Add your logo, colors, and company details to personalize your ContractNest experience
            </p>
          </div>

          {/* Form Sections */}
          <div className="space-y-8">
            {/* Company Name - Required */}
            <div className="space-y-2">
              <label 
                htmlFor="business_name"
                className="block text-sm font-medium transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Company Name <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <input
                id="business_name"
                type="text"
                value={businessName}
                onChange={handleBusinessNameChange}
                placeholder="Enter your company name"
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 transition-colors text-base"
                style={{
                  borderColor: validationError 
                    ? colors.semantic.error 
                    : colors.utility.secondaryText + '40',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
                disabled={isSubmitting || isLoading}
                required
                aria-invalid={!!validationError}
                aria-describedby={validationError ? "name-error" : undefined}
              />
              {validationError && (
                <div 
                  id="name-error"
                  className="flex items-start space-x-2 p-2 rounded-md transition-colors"
                  style={{
                    backgroundColor: colors.semantic.error + '10',
                    borderLeft: `3px solid ${colors.semantic.error}`
                  }}
                  role="alert"
                >
                  <AlertCircle 
                    className="h-4 w-4 mt-0.5 flex-shrink-0"
                    style={{ color: colors.semantic.error }}
                  />
                  <p 
                    className="text-xs"
                    style={{ color: colors.semantic.error }}
                  >
                    {validationError}
                  </p>
                </div>
              )}
            </div>

            {/* Logo Upload */}
            <LogoUploadField
              onLogoChange={handleTenantLogoChange}
              disabled={isSubmitting || isLoading}
              showLabel={true}
              labelText="Company Logo (Optional)"
            />

            {/* Brand Colors */}
            <BrandColorPicker
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              onPrimaryColorChange={handlePrimaryColorChange}
              onSecondaryColorChange={handleSecondaryColorChange}
              disabled={isSubmitting || isLoading}
              showLabel={true}
              labelText="Brand Colors"
            />

            {/* Contact Information - Optional */}
            <ContactFields
              email={businessEmail}
              phone={businessPhone}
              phoneCountryCode={businessPhoneCountryCode}
              whatsapp={whatsappNumber}
              whatsappCountryCode={whatsappCountryCode}
              website={websiteUrl}
              onEmailChange={handleEmailChange}
              onPhoneChange={handlePhoneChange}
              onPhoneCountryCodeChange={handlePhoneCountryCodeChange}
              onWhatsAppChange={handleWhatsAppChange}
              onWhatsAppCountryCodeChange={handleWhatsAppCountryCodeChange}
              onWebsiteChange={handleWebsiteChange}
              disabled={isSubmitting || isLoading}
              required={false}
              showLabel={true}
              labelText="Contact Information (Optional)"
              showHelpText={true}
            />

            {/* Info Callout */}
            <div 
              className="p-4 rounded-lg border transition-colors"
              style={{
                backgroundColor: colors.brand.primary + '05',
                borderColor: colors.brand.primary + '20',
                borderLeft: `4px solid ${colors.brand.primary}`
              }}
            >
              <div className="flex items-start">
                <CheckCircle 
                  className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0"
                  style={{ color: colors.brand.primary }}
                />
                <div>
                  <p 
                    className="text-sm font-medium mb-1 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    You're almost done!
                  </p>
                  <p 
                    className="text-xs transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    After completing this step, you'll have access to your personalized dashboard. 
                    You can always update these details later in your business profile settings.
                  </p>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <div className="pt-6 text-center">
              <button
                onClick={handleContinue}
                disabled={!canContinue}
                className="inline-flex items-center px-8 py-3 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                style={{
                  backgroundColor: colors.brand.primary,
                  color: '#FFFFFF'
                }}
                aria-label="Complete business profile setup"
              >
                {isLoading || isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving Your Profile...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Complete Business Profile
                  </>
                )}
              </button>
              
              <p 
                className="text-xs mt-4 transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                Required fields are marked with <span style={{ color: colors.semantic.error }}>*</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessPreferencesStep;