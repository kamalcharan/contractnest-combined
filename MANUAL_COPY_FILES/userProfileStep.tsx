// src/pages/onboarding/steps/UserProfileStep.tsx
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrentUserProfile } from '@/hooks/useUsers';
import PersonalInfoSection from '@/components/users/user-profile/PersonalInfoSection';
import { Clock, Loader2 } from 'lucide-react';

interface OnboardingStepContext {
  onComplete: (data?: Record<string, any>) => void;
  onSkip: () => void;
  isSubmitting: boolean;
}

const UserProfileStep: React.FC = () => {
  const { onComplete } = useOutletContext<OnboardingStepContext>();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  // ✅ Use the REAL hook - no fake adapters!
  const {
    profile,
    loading,
    updating,
    updateProfile,
    updateAvatar,
    removeAvatar,
    validateMobile,
    fetchProfile
  } = useCurrentUserProfile();

  const [hasCompletedStep, setHasCompletedStep] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // ✅ Wrap the real updateProfile to call onComplete after success
  const handleUpdate = async (data: any): Promise<boolean> => {
    if (hasCompletedStep) return true; // Prevent double completion

    try {
      // Actually save to database using the real hook
      const success = await updateProfile({
        first_name: data.first_name,
        last_name: data.last_name,
        mobile_number: data.mobile_number,
        country_code: data.country_code
      });

      if (success) {
        setHasCompletedStep(true);
        // Complete the onboarding step
        await onComplete({
          profile_completed: true,
          first_name: data.first_name,
          last_name: data.last_name,
          ...(data.mobile_number && {
            phone_number: data.mobile_number,
            phone_country_code: data.country_code
          })
        });
      }

      return success;
    } catch (error) {
      console.error('Profile update error:', error);
      return false;
    }
  };

  // ✅ Pass through the real updateAvatar function
  const handleUpdateAvatar = async (avatarUrl: string): Promise<boolean> => {
    return await updateAvatar(avatarUrl);
  };

  // ✅ Pass through the real removeAvatar function
  const handleRemoveAvatar = async (): Promise<boolean> => {
    return await removeAvatar();
  };

  // ✅ Pass through the real validateMobile function
  const handleValidateMobile = async (mobile: string, countryCode: string): Promise<boolean> => {
    return await validateMobile(mobile, countryCode);
  };

  // Show loading state while fetching profile
  if (loading && !profile) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: colors.brand.primary }}
          />
          <p style={{ color: colors.utility.secondaryText }}>
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 
              className="text-2xl font-bold mb-2"
              style={{ color: colors.utility.primaryText }}
            >
              Complete Your Profile
            </h2>
            <p 
              className="text-sm"
              style={{ color: colors.utility.secondaryText }}
            >
              Let's add a few more details to personalize your experience
            </p>
          </div>

          {/* Use existing PersonalInfoSection with REAL functions */}
          <PersonalInfoSection
            profile={profile}
            onUpdate={handleUpdate}
            onUpdateAvatar={handleUpdateAvatar}
            onRemoveAvatar={handleRemoveAvatar}
            onValidateMobile={handleValidateMobile}
            updating={updating}
            initialEditMode={true}  // Start in edit mode during onboarding
          />

          {/* Info Box */}
          <div 
            className="mt-6 p-4 rounded-lg border"
            style={{
              backgroundColor: colors.brand.primary + '10',
              borderColor: colors.brand.primary + '30'
            }}
          >
            <div className="flex items-start">
              <Clock className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" style={{ color: colors.brand.primary }} />
              <div>
                <p className="text-sm" style={{ color: colors.utility.primaryText }}>
                  <strong>Why we need this:</strong> Your profile helps team members identify you and enables features like SMS notifications for important contract updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileStep;