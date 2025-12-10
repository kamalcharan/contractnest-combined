// src/components/profile/ProfileLoadingSpinner.tsx
// Shared loading spinner component for profile pages
// Used by both GroupProfileDashboard and SmartProfile pages

import React from 'react';
import { useTheme } from '@/context/ThemeContext';

interface ProfileLoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export const ProfileLoadingSpinner: React.FC<ProfileLoadingSpinnerProps> = ({
  message = 'Loading...',
  fullScreen = true
}) => {
  const { colors } = useTheme();

  const containerClasses = fullScreen
    ? 'min-h-screen flex items-center justify-center'
    : 'flex items-center justify-center py-12';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div
          className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
          style={{
            borderColor: colors.brand.primary,
            borderTopColor: 'transparent'
          }}
        />
        <p style={{ color: colors.utility.secondaryText }}>{message}</p>
      </div>
    </div>
  );
};

export default ProfileLoadingSpinner;
