// src/pages/onboarding/steps/BusinessBasicStep.tsx
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import BusinessTypeSelector from '@/components/tenantprofile/BusinessTypeSelector';
import { Building, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface OnboardingStepContext {
  onComplete: (data?: Record<string, any>) => void;
  onSkip: () => void;
  isSubmitting: boolean;
  updateTenantField: (field: string, value: any) => void;
}

const BusinessBasicStep: React.FC = () => {
  const { onComplete, isSubmitting, updateTenantField } = useOutletContext<OnboardingStepContext>();
  const { isDarkMode, currentTheme } = useTheme();
  const { currentTenant } = useAuth();
  const { profile } = useTenantProfile();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [selectedBusinessType, setSelectedBusinessType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if already completed
  const isAlreadyCompleted = !!profile?.business_type_id;

  /**
   * Handle skip for already completed step
   */
  const handleSkipCompleted = () => {
    onComplete({});
  };

  /**
   * Handle business type selection
   */
  const handleBusinessTypeSelect = (businessTypeId: string) => {
    console.log('🟡 BusinessBasicStep - Business type selected:', businessTypeId);
    setSelectedBusinessType(businessTypeId);
    
    updateTenantField('business_type_id', businessTypeId);
    
    toast.success('Business role selected', {
      duration: 2000,
      icon: '✓'
    });
  };

  /**
   * Handle continue button click
   */
  const handleContinue = async () => {
    console.log('🟢 BusinessBasicStep - Continue clicked');
    console.log('🟢 Selected business type:', selectedBusinessType);
    console.log('🟢 Tenant name:', currentTenant?.name);
    
    if (!selectedBusinessType) {
      console.log('🔴 No business type selected');
      toast.error('Please select your business role to continue');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const dataToSend = {
        business_type_id: selectedBusinessType,
        business_name: currentTenant?.name || '',
        step: 'business-basic',
        completed_at: new Date().toISOString()
      };
      
      if (currentTenant?.name) {
        updateTenantField('business_name', currentTenant.name);
      }
      
      console.log('🟢 Data being passed to onComplete:', dataToSend);
      
      await onComplete(dataToSend);
      
      console.log('✅ BusinessBasicStep - Step completed successfully');
    } catch (error) {
      console.error('❌ Error in BusinessBasicStep:', error);
      toast.error('Failed to save business role. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const canContinue = selectedBusinessType && !isSubmitting && !isLoading;

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
            Business Profile Already Set
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
            To edit your business profile, go to Settings → Business Profile after completing onboarding
          </p>
        </div>
      </div>
    );
  }

  // Show normal form if not completed
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-colors"
              style={{ 
                backgroundColor: colors.brand.primary + '20',
                color: colors.brand.primary
              }}
            >
              <Building className="w-8 h-8" />
            </div>
            <h2 
              className="text-2xl font-bold mb-2 transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Define Your Business Role
            </h2>
            <p 
              className="text-sm max-w-2xl mx-auto transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              ContractNest adapts to your role in service contracts. Choose your primary business function 
              to unlock the right tools, workflows, and dashboard for your specific needs.
            </p>
          </div>

          {/* Business Type Selector */}
          <BusinessTypeSelector
            value={selectedBusinessType}
            onChange={handleBusinessTypeSelect}
            disabled={isSubmitting || isLoading}
          />

          {/* Platform Customization Info */}
          {selectedBusinessType && (
            <div 
              className="mt-8 p-6 rounded-lg border transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '20'
              }}
            >
              <h3 
                className="font-semibold mb-4 flex items-center transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                  style={{ 
                    backgroundColor: colors.brand.primary + '20',
                    color: colors.brand.primary 
                  }}
                >
                  ✓
                </div>
                How This Shapes Your Experience
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-sm">
                  <div 
                    className="font-medium mb-2 transition-colors"
                    style={{ color: colors.brand.primary }}
                  >
                    Dashboard Layout
                  </div>
                  <p 
                    className="transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Your main dashboard shows the metrics, reports, and quick actions most relevant to your role
                  </p>
                </div>
                <div className="text-sm">
                  <div 
                    className="font-medium mb-2 transition-colors"
                    style={{ color: colors.brand.primary }}
                  >
                    Workflow Design
                  </div>
                  <p 
                    className="transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Contract creation, approval processes, and notifications are optimized for your business model
                  </p>
                </div>
                <div className="text-sm">
                  <div 
                    className="font-medium mb-2 transition-colors"
                    style={{ color: colors.brand.primary }}
                  >
                    Feature Priority
                  </div>
                  <p 
                    className="transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Tools most important to your role are prominently featured and easily accessible
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Continue Button */}
          {selectedBusinessType && (
            <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button
                onClick={handleContinue}
                disabled={!canContinue}
                className="inline-flex items-center px-8 py-3 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                style={{
                  backgroundColor: colors.brand.primary,
                  color: '#FFFFFF'
                }}
                aria-label="Continue to next step"
              >
                {isLoading || isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Industry Selection
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p 
              className="text-xs transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Not sure which role fits? Don't worry - you can change this anytime in Settings → Business Profile
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessBasicStep;