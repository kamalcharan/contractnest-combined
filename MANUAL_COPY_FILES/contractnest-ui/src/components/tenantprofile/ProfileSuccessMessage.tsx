// src/components/tenantprofile/ProfileSuccessMessage.tsx
// Shared success message component for profile creation wizard
// Used by both GroupProfileDashboard and SmartProfile pages

import React from 'react';
import { CheckCircle, Eye, ArrowLeft } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ProfileSuccessMessageProps {
  title?: string;
  description?: string;
  onViewProfile?: () => void;
  onBack?: () => void;
  viewButtonText?: string;
  backButtonText?: string;
  showViewButton?: boolean;
  showBackButton?: boolean;
}

export const ProfileSuccessMessage: React.FC<ProfileSuccessMessageProps> = ({
  title = 'Profile Created Successfully!',
  description = 'Your profile is now active and searchable.',
  onViewProfile,
  onBack,
  viewButtonText = 'View Profile',
  backButtonText = 'Back',
  showViewButton = true,
  showBackButton = true
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-lg text-center py-12"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${colors.semantic.success}30`
      }}
    >
      <div
        className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
        style={{ backgroundColor: `${colors.semantic.success}15` }}
      >
        <CheckCircle className="w-10 h-10" style={{ color: colors.semantic.success }} />
      </div>

      <h2 className="text-2xl font-bold mb-2" style={{ color: colors.utility.primaryText }}>
        {title}
      </h2>

      <p className="text-lg mb-6" style={{ color: colors.utility.secondaryText }}>
        {description}
      </p>

      {(showViewButton || showBackButton) && (
        <div className="flex justify-center space-x-4">
          {showViewButton && onViewProfile && (
            <button
              onClick={onViewProfile}
              className="flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#FFF'
              }}
            >
              <Eye className="w-5 h-5" />
              <span>{viewButtonText}</span>
            </button>
          )}

          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}20`
              }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{backButtonText}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileSuccessMessage;
