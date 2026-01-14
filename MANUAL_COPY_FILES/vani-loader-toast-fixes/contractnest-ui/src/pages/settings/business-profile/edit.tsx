// src/pages/settings/business-profile/edit.tsx - Updated with VaNiLoader & VaNiToast
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import BusinessTypeSelector from '@/components/tenantprofile/BusinessTypeSelector';
import IndustrySelector from '@/components/tenantprofile/IndustrySelector';
import OrganizationDetailsForm from '@/components/tenantprofile/OrganizationDetailsForm';
import { VaNiLoader, InlineLoader } from '@/components/common/loaders/UnifiedLoader';
import { vaniToast } from '@/components/common/toast/VaNiToast';

const EditBusinessProfilePage = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  const {
    loading,
    submitting,
    currentStep,
    formData,
    updateField,
    goToNextStep,
    goToPreviousStep,
    handleLogoChange,
    submitProfile
  } = useTenantProfile({
    redirectOnComplete: '/settings/business-profile'
  });
  
  const handleCancel = () => {
    navigate('/settings/business-profile');
  };
  
  const handleBack = () => {
    navigate('/settings/business-profile');
  };
  
  const renderStep = () => {
    if (loading) {
      return (
        <VaNiLoader size="md" message="Loading profile..." />
      );
    }
    
    if (currentStep === 'business-type') {
      return (
        <div className="space-y-6">
          <div>
            <h2 
              className="text-2xl font-semibold transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              What type of business are you?
            </h2>
            <p 
              className="mt-2 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              This helps us tailor our features to your specific needs.
            </p>
          </div>
          
          <BusinessTypeSelector
            value={formData.business_type_id}
            onChange={(value) => updateField('business_type_id', value)}
            disabled={submitting}
          />
        </div>
      );
    }
    
    if (currentStep === 'industry') {
      return (
        <div className="space-y-6">
          <div>
            <h2 
              className="text-2xl font-semibold transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              What industry are you in?
            </h2>
            <p 
              className="mt-2 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Select the industry that best describes your business.
            </p>
          </div>
          
          <IndustrySelector
            value={formData.industry_id}
            onChange={(value) => updateField('industry_id', value)}
            disabled={submitting}
          />
        </div>
      );
    }
    
    if (currentStep === 'organization-details') {
      return (
        <div className="space-y-6">
          <div>
            <h2 
              className="text-2xl font-semibold transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Tell us about your organization
            </h2>
            <p 
              className="mt-2 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Provide your organization details to complete your profile.
            </p>
          </div>
          
          <OrganizationDetailsForm
            formData={formData}
            onUpdate={updateField}
            onLogoChange={handleLogoChange}
            disabled={submitting}
          />
        </div>
      );
    }
    
    return null;
  };
  
  const getStepStatus = (step: string) => {
    const steps = ['business-type', 'industry', 'organization-details'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    
    if (stepIndex < currentIndex) {
      return 'completed'; // Step is completed
    } else if (stepIndex === currentIndex) {
      return 'current'; // Current step
    } else {
      return 'upcoming'; // Upcoming step
    }
  };
  
  return (
    <div 
      className="p-6 transition-colors"
      style={{ backgroundColor: colors.utility.secondaryText + '10' }}
    >
      {/* Header */}
      <div className="flex items-center mb-8">
        <button 
          onClick={handleBack}
          className="mr-4 p-2 rounded-full hover:opacity-80 transition-colors"
          style={{ backgroundColor: colors.utility.secondaryText + '20' }}
        >
          <ArrowLeft 
            className="h-5 w-5"
            style={{ color: colors.utility.secondaryText }}
          />
        </button>
        <div>
          <h1 
            className="text-2xl font-bold transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Create Business Profile
          </h1>
          <p 
            className="transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Set up your business profile
          </p>
        </div>
      </div>
      
      {/* Progress Steps - Theme Aware Card Background */}
      <div 
        className="rounded-lg shadow-sm border p-6 mb-8 transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '20'
        }}
      >
        <div className="flex items-center justify-center">
          <div className="flex items-center">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors"
                style={{
                  backgroundColor: getStepStatus('business-type') === 'current' 
                    ? colors.brand.primary 
                    : getStepStatus('business-type') === 'completed'
                    ? colors.brand.primary + '40'
                    : colors.utility.secondaryText + '20',
                  color: getStepStatus('business-type') === 'current' 
                    ? '#ffffff'
                    : getStepStatus('business-type') === 'completed'
                    ? colors.brand.primary
                    : colors.utility.secondaryText
                }}
              >
                1
              </div>
              <span 
                className="text-sm mt-2 transition-colors"
                style={{
                  color: getStepStatus('business-type') === 'current'
                    ? colors.utility.primaryText
                    : getStepStatus('business-type') === 'completed'
                    ? colors.brand.primary
                    : colors.utility.secondaryText,
                  fontWeight: getStepStatus('business-type') === 'current' ? '500' : '400'
                }}
              >
                Business Type
              </span>
            </div>
            
            {/* Connector Line 1-2 */}
            <div 
              className="w-28 h-0.5 mx-2 transition-colors"
              style={{
                backgroundColor: getStepStatus('industry') === 'completed' || getStepStatus('industry') === 'current'
                  ? colors.brand.primary + '60'
                  : colors.utility.secondaryText + '20'
              }}
            />
            
            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors"
                style={{
                  backgroundColor: getStepStatus('industry') === 'current' 
                    ? colors.brand.primary 
                    : getStepStatus('industry') === 'completed'
                    ? colors.brand.primary + '40'
                    : colors.utility.secondaryText + '20',
                  color: getStepStatus('industry') === 'current' 
                    ? '#ffffff'
                    : getStepStatus('industry') === 'completed'
                    ? colors.brand.primary
                    : colors.utility.secondaryText
                }}
              >
                2
              </div>
              <span 
                className="text-sm mt-2 transition-colors"
                style={{
                  color: getStepStatus('industry') === 'current'
                    ? colors.utility.primaryText
                    : getStepStatus('industry') === 'completed'
                    ? colors.brand.primary
                    : colors.utility.secondaryText,
                  fontWeight: getStepStatus('industry') === 'current' ? '500' : '400'
                }}
              >
                Industry
              </span>
            </div>
            
            {/* Connector Line 2-3 */}
            <div 
              className="w-28 h-0.5 mx-2 transition-colors"
              style={{
                backgroundColor: getStepStatus('organization-details') === 'current'
                  ? colors.brand.primary + '60'
                  : colors.utility.secondaryText + '20'
              }}
            />
            
            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors"
                style={{
                  backgroundColor: getStepStatus('organization-details') === 'current' 
                    ? colors.brand.primary 
                    : colors.utility.secondaryText + '20',
                  color: getStepStatus('organization-details') === 'current' 
                    ? '#ffffff'
                    : colors.utility.secondaryText
                }}
              >
                3
              </div>
              <span 
                className="text-sm mt-2 transition-colors"
                style={{
                  color: getStepStatus('organization-details') === 'current'
                    ? colors.utility.primaryText
                    : colors.utility.secondaryText,
                  fontWeight: getStepStatus('organization-details') === 'current' ? '500' : '400'
                }}
              >
                Organization Details
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Step Content */}
      <div 
        className="rounded-lg shadow-sm border p-6 mb-8 transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '20'
        }}
      >
        {renderStep()}
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <div>
          {currentStep !== 'business-type' ? (
            <button
              type="button"
              onClick={goToPreviousStep}
              disabled={submitting}
              className="px-6 py-2 border rounded hover:opacity-80 transition-colors disabled:opacity-50"
              style={{
                color: colors.brand.primary,
                borderColor: colors.brand.primary,
                backgroundColor: colors.brand.primary + '10'
              }}
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="px-6 py-2 border rounded hover:opacity-80 transition-colors disabled:opacity-50"
              style={{
                color: colors.brand.primary,
                borderColor: colors.brand.primary,
                backgroundColor: colors.brand.primary + '10'
              }}
            >
              Cancel
            </button>
          )}
        </div>
        
        <div>
          {currentStep !== 'organization-details' ? (
            <button
              type="button"
              onClick={goToNextStep}
              disabled={submitting || (currentStep === 'business-type' && !formData.business_type_id) || (currentStep === 'industry' && !formData.industry_id)}
              className="px-6 py-2 rounded hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff'
              }}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={submitProfile}
              disabled={submitting}
              className="px-6 py-2 rounded hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] flex items-center justify-center"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff'
              }}
            >
              {submitting ? <InlineLoader size="sm" text="Saving..." /> : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditBusinessProfilePage;