//src/components/misc/MiscPageLayout.tsx

import React, { useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';
import MiscIllustration from './MiscIllustration';

interface MiscPageAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  icon?: React.ReactNode;
}

interface MiscPageLayoutProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  illustration: string;
  actions?: MiscPageAction[];
  children?: React.ReactNode;
}

const MiscPageLayout: React.FC<MiscPageLayoutProps> = ({
  icon,
  title,
  description,
  illustration,
  actions = [],
  children
}) => {
  const { isDarkMode, currentTheme, setTheme, setIsDarkMode } = useTheme();

  // ===== FIX: Load user theme preferences on mount =====
  useEffect(() => {
    const loadUserThemePreferences = () => {
      // Get user data from storage (prioritize sessionStorage, fallback to localStorage)
      let userData = null;

      try {
        // Check sessionStorage first (for remember_me = false)
        const sessionData = sessionStorage.getItem('user_data');
        if (sessionData) {
          userData = JSON.parse(sessionData);
        } else {
          // Fallback to localStorage
          const localData = localStorage.getItem('user_data');
          if (localData) {
            userData = JSON.parse(localData);
          }
        }
      } catch (error) {
        console.error('Error parsing user data for theme:', error);
      }

      // Apply user's theme preferences if found
      if (userData) {
        console.log('MiscPageLayout: Loading user theme preferences:', {
          preferred_theme: userData.preferred_theme,
          is_dark_mode: userData.is_dark_mode
        });

        // Set theme if user has a preference
        if (userData.preferred_theme && userData.preferred_theme !== currentTheme.id) {
          console.log(`MiscPageLayout: Applying user theme: ${userData.preferred_theme}`);
          setTheme(userData.preferred_theme);
        }

        // Set dark mode if user has a preference
        if (userData.is_dark_mode !== undefined && userData.is_dark_mode !== isDarkMode) {
          console.log(`MiscPageLayout: Applying user dark mode: ${userData.is_dark_mode}`);
          setIsDarkMode(userData.is_dark_mode);
        }
      } else {
        console.log('MiscPageLayout: No user theme preferences found, using defaults');
      }
    };

    // Load theme preferences immediately
    loadUserThemePreferences();
  }, []); // Run only once on mount

  // Get theme colors for styled components
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const getButtonClasses = (variant: string = 'primary') => {
    const baseClasses = 'inline-flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

    switch (variant) {
      case 'primary':
        return cn(baseClasses, 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary');
      case 'outline':
        return cn(baseClasses, 'border border-border bg-background hover:bg-accent hover:text-accent-foreground');
      case 'ghost':
        return cn(baseClasses, 'hover:bg-accent hover:text-accent-foreground');
      default:
        return baseClasses;
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 transition-colors"
      style={{
        backgroundColor: colors.utility.primaryBackground
      }}
    >
      <div className="max-w-2xl w-full">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div
              className="p-4 rounded-full transition-colors"
              style={{
                backgroundColor: `${colors.brand.primary}15`
              }}
            >
              {icon}
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h1
              className="text-3xl font-bold tracking-tight transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              {title}
            </h1>
            <p
              className="text-lg max-w-md mx-auto transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              {description}
            </p>
          </div>

          {/* Illustration */}
          <div className="py-8">
            <MiscIllustration name={illustration} className="mx-auto" />
          </div>

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={getButtonClasses(action.variant)}
                  style={action.variant === 'primary' ? {
                    background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                    color: 'white'
                  } : action.variant === 'outline' ? {
                    borderColor: `${colors.utility.secondaryText}40`,
                    color: colors.utility.primaryText,
                    backgroundColor: colors.utility.secondaryBackground
                  } : undefined}
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Additional Content */}
          {children}
        </div>
      </div>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 h-80 w-80 rounded-full opacity-20 blur-3xl transition-colors"
          style={{ backgroundColor: colors.brand.primary }}
        />
        <div
          className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full opacity-20 blur-3xl transition-colors"
          style={{ backgroundColor: colors.brand.secondary }}
        />
      </div>
    </div>
  );
};

export default MiscPageLayout;
