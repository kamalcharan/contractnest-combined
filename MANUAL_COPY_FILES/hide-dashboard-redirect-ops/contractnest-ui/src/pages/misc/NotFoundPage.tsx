//src/pages/misc/NotFoundPage.tsx - Theme-Aware Version

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import MiscPageLayout from '../../components/misc/MiscPageLayout';
import { analyticsService } from '../../services/analytics.service';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, currentTheme, setTheme, setIsDarkMode } = useTheme();

  // ===== NEW: Force load user theme preferences on mount =====
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
        console.log('🎨 Loading user theme preferences for NotFound page:', {
          preferred_theme: userData.preferred_theme,
          is_dark_mode: userData.is_dark_mode
        });

        // Set theme if user has a preference
        if (userData.preferred_theme && userData.preferred_theme !== currentTheme.id) {
          console.log(`🎨 Applying user theme: ${userData.preferred_theme}`);
          setTheme(userData.preferred_theme);
        }

        // Set dark mode if user has a preference
        if (userData.is_dark_mode !== undefined && userData.is_dark_mode !== isDarkMode) {
          console.log(`🎨 Applying user dark mode: ${userData.is_dark_mode}`);
          setIsDarkMode(userData.is_dark_mode);
        }
      } else {
        console.log('🎨 No user theme preferences found, using defaults');
      }
    };

    // Load theme preferences immediately
    loadUserThemePreferences();
  }, []); // Run only once on mount

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  useEffect(() => {
    analyticsService.trackMiscPageView('not-found', '404 Not Found', {
      attempted_path: location.pathname
    });
  }, [location]);

  const handleGoHome = () => {
    analyticsService.trackMiscPageAction('not-found', 'go_home_clicked');
    navigate('/ops/cockpit');
  };

  const handleGoBack = () => {
    analyticsService.trackMiscPageAction('not-found', 'go_back_clicked');
    navigate(-1);
  };

  return (
    <MiscPageLayout
      icon={<FileQuestion className="h-16 w-16" style={{ color: colors.utility.secondaryText }} />}
      title="Page Not Found"
      description="The page you're looking for doesn't exist or has been moved."
      illustration="not-found"
      actions={[
        {
          label: 'Go to Dashboard',
          onClick: handleGoHome,
          variant: 'primary',
          icon: <Home className="h-4 w-4" />
        },
        {
          label: 'Go Back',
          onClick: handleGoBack,
          variant: 'outline',
          icon: <ArrowLeft className="h-4 w-4" />
        }
      ]}
    >
      <div className="mt-6 text-center">
        <p 
          className="text-sm transition-colors"
          style={{ color: colors.utility.secondaryText }}
        >
          Error Code: <span style={{ color: colors.utility.primaryText, fontWeight: '600' }}>404</span>
        </p>
        
        {/* ===== NEW: Debug info (only in development) ===== */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 rounded text-xs opacity-50">
            <p>Theme: {currentTheme.id} | Dark: {isDarkMode.toString()}</p>
          </div>
        )}
      </div>
    </MiscPageLayout>
  );
};

export default NotFoundPage;