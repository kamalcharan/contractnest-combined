// src/pages/onboarding/steps/BusinessBrandingStep.tsx
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import IndustrySelector from '@/components/tenantprofile/IndustrySelector';
import { Building2, ArrowRight, Loader2, Lightbulb, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface OnboardingStepContext {
  onComplete: (data?: Record<string, any>) => void;
  onSkip: () => void;
  isSubmitting: boolean;
  updateTenantField: (field: string, value: any) => void;
}

const BusinessBrandingStep: React.FC = () => {
  const { onComplete, isSubmitting, updateTenantField } = useOutletContext<OnboardingStepContext>();
  const { isDarkMode, currentTheme } = useTheme();
  const { profile } = useTenantProfile();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if already completed
  const isAlreadyCompleted = !!profile?.industry_id;

  /**
   * Handle skip for already completed step
   */
  const handleSkipCompleted = () => {
    onComplete({});
  };

  /**
   * Handle industry selection
   */
  const handleIndustryChange = (industryId: string) => {
    console.log('🟡 BusinessBrandingStep (Industry) - Industry selected:', industryId);
    setSelectedIndustry(industryId);
    
    updateTenantField('industry_id', industryId);
    
    toast.success('Industry selected', {
      duration: 2000,
      icon: '✓'
    });
  };

  /**
   * Handle continue button click
   */
  const handleContinue = async () => {
    console.log('🟢 BusinessBrandingStep (Industry) - Continue clicked');
    console.log('🟢 Selected industry:', selectedIndustry);
    
    if (!selectedIndustry) {
      console.log('🔴 No industry selected');
      toast.error('Please select your industry to continue');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const dataToSend = {
        industry_id: selectedIndustry,
        step: 'business-branding',
        completed_at: new Date().toISOString()
      };
      
      console.log('🟢 Data being passed to onComplete:', dataToSend);
      
      await onComplete(dataToSend);
      
      console.log('✅ BusinessBrandingStep (Industry) - Step completed successfully');
    } catch (error) {
      console.error('❌ Error in BusinessBrandingStep (Industry):', error);
      toast.error('Failed to save industry selection. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const canContinue = selectedIndustry && !isSubmitting && !isLoading;

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
            Industry Already Selected
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
            To edit your industry, go to Settings → Business Profile after completing onboarding
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
              <Building2 className="w-8 h-8" />
            </div>
            <h2 
              className="text-2xl font-bold mb-2 transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Select Your Industry
            </h2>
            <p 
              className="text-sm max-w-2xl mx-auto transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Help us understand your business context better. This allows us to provide 
              industry-specific features, compliance guidelines, and insights tailored to your sector.
            </p>
          </div>

          {/* Industry Selector */}
          <IndustrySelector
            value={selectedIndustry}
            onChange={handleIndustryChange}
            disabled={isSubmitting || isLoading}
          />

          {/* Industry Benefits Info */}
          {selectedIndustry && (
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
                  <Lightbulb className="w-5 h-5" />
                </div>
                Industry-Specific Benefits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-sm">
                  <div 
                    className="font-medium mb-2 transition-colors"
                    style={{ color: colors.brand.primary }}
                  >
                    Compliance Templates
                  </div>
                  <p 
                    className="transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Pre-configured contract templates that meet industry-specific regulatory requirements
                  </p>
                </div>
                <div className="text-sm">
                  <div 
                    className="font-medium mb-2 transition-colors"
                    style={{ color: colors.brand.primary }}
                  >
                    Smart Suggestions
                  </div>
                  <p 
                    className="transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    AI-powered recommendations based on common practices and trends in your industry
                  </p>
                </div>
                <div className="text-sm">
                  <div 
                    className="font-medium mb-2 transition-colors"
                    style={{ color: colors.brand.primary }}
                  >
                    Benchmarking
                  </div>
                  <p 
                    className="transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Compare your contract performance against industry standards and best practices
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Continue Button */}
          {selectedIndustry && (
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
                    Continue to Branding
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
              Don't see your industry? Choose the closest match - you can update this later in your business profile settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessBrandingStep;