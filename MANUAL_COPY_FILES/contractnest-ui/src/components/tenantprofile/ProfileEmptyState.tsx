// src/components/tenantprofile/ProfileEmptyState.tsx
// Shared empty state component prompting user to create profile
// Used by both GroupProfileDashboard and SmartProfile pages

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent } from '@/components/ui/card';

interface ProfileEmptyStateProps {
  title?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  onCreateProfile: () => void;
  contextName?: string; // e.g., group name for Groups scenario
}

export const ProfileEmptyState: React.FC<ProfileEmptyStateProps> = ({
  title = "Let's Create Your Profile",
  subtitle,
  description = 'Create your profile to be discoverable by other members via WhatsApp bot and web search.',
  buttonText = 'Create My Profile',
  onCreateProfile,
  contextName
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <Card
      className="max-w-2xl mx-auto"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: `${colors.brand.primary}30`
      }}
    >
      <CardContent className="p-8">
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: `${colors.brand.primary}15` }}
          >
            <Sparkles className="w-10 h-10" style={{ color: colors.brand.primary }} />
          </div>

          <h2 className="text-2xl font-bold mb-2" style={{ color: colors.utility.primaryText }}>
            {title}
          </h2>

          {subtitle && (
            <p className="mb-2" style={{ color: colors.utility.secondaryText }}>
              {contextName ? (
                <>
                  You're a member of{' '}
                  <strong style={{ color: colors.brand.primary }}>{contextName}</strong>{' '}
                  but haven't created your profile yet.
                </>
              ) : (
                subtitle
              )}
            </p>
          )}

          <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
            {description}
          </p>

          <button
            onClick={onCreateProfile}
            className="px-8 py-3 rounded-lg font-medium text-white transition-all hover:opacity-90"
            style={{
              background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
            }}
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>{buttonText}</span>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileEmptyState;
