// src/contexts/ThemeContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// ✅ FIXED: Import individual themes directly (same as utils/theme.ts)
import { BharathaVarshaTheme } from '../config/theme/themes/bharathavarshaTheme';
import { ClassicElegantTheme } from '../config/theme/themes/classicElegantTheme';
import { PurpleToneTheme } from '../config/theme/themes/purpleToneTheme';
import { ContractNestTheme } from '../config/theme/themes/contractNest';
import { ModernBoldTheme } from '../config/theme/themes/modernBold';
import { ModernBusinessTheme } from '../config/theme/themes/modernBusiness';
import { ProfessionalRedefinedTheme } from '../config/theme/themes/professionalRedefined';
import { SleekCoolTheme } from '../config/theme/themes/sleekCool';
import { TechAITheme } from '../config/theme/themes/techAI';
import { TechFutureTheme } from '../config/theme/themes/techFuture';
import { TechySimpleTheme } from '../config/theme/themes/techySimple';
import { VikunaBlackTheme } from '../config/theme/themes/vikunaBlack';

// ✅ FIXED: Create themes object and types locally
const themes = {
  [BharathaVarshaTheme.id]: BharathaVarshaTheme,
  [ClassicElegantTheme.id]: ClassicElegantTheme,
  [PurpleToneTheme.id]: PurpleToneTheme,
  [ContractNestTheme.id]: ContractNestTheme,
  [ModernBoldTheme.id]: ModernBoldTheme,
  [ModernBusinessTheme.id]: ModernBusinessTheme,
  [ProfessionalRedefinedTheme.id]: ProfessionalRedefinedTheme,
  [SleekCoolTheme.id]: SleekCoolTheme,
  [TechAITheme.id]: TechAITheme,
  [TechFutureTheme.id]: TechFutureTheme,
  [TechySimpleTheme.id]: TechySimpleTheme,
  [VikunaBlackTheme.id]: VikunaBlackTheme,
};

// ✅ FIXED: Use BharathaVarshaTheme as default
const defaultTheme = BharathaVarshaTheme;

// ✅ FIXED: Define ThemeConfig type locally based on your theme structure
interface ThemeColors {
  brand: {
    primary: string;
    secondary: string;
    tertiary: string;
    alternate: string;
  };
  utility: {
    primaryText: string;
    secondaryText: string;
    primaryBackground: string;
    secondaryBackground: string;
  };
  accent: {
    accent1: string;
    accent2: string;
    accent3: string;
    accent4: string;
  };
  semantic: {
    success: string;
    error: string;
    warning: string;
    info: string;
  };
}

interface ThemeConfig {
  id: string;
  name: string;
  colors: ThemeColors;
  darkMode: {
    colors: ThemeColors;
  };
}

// Define available theme IDs
export type ThemeName = keyof typeof themes;

interface ThemeContextType {
  currentTheme: ThemeConfig;
  currentThemeId: string;
  setTheme: (themeId: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setIsDarkMode: (darkMode: boolean) => void;
}

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  currentTheme: defaultTheme,
  currentThemeId: defaultTheme.id,
  setTheme: () => {},
  isDarkMode: false,
  toggleDarkMode: () => {},
  setIsDarkMode: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
  defaultThemeId?: string;
  defaultDarkMode?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultThemeId = defaultTheme.id,
  defaultDarkMode = false 
}) => {
  // State to track if we've initialized from user preferences
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Initialize state from localStorage or defaults
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    const savedTheme = localStorage.getItem('contractnest-theme');
    // Validate that the saved theme exists in our themes object
    if (savedTheme && themes[savedTheme]) {
      return savedTheme;
    }
    return defaultThemeId;
  });
  
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(() => {
    const savedDarkMode = localStorage.getItem('contractnest-dark-mode');
    // Check for system preference if not saved
    if (savedDarkMode === null) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches || defaultDarkMode;
    }
    return savedDarkMode === 'true';
  });

  // Get the current theme object
  const currentTheme = themes[currentThemeId] || defaultTheme;

  // Initialize from user preferences on mount
  useEffect(() => {
    const initializeFromUserPreferences = () => {
      if (hasInitialized) return;
      
      // Try to get user data from storage (both localStorage and sessionStorage)
      let userData = null;
      
      // Check sessionStorage first (for remember me = false)
      const sessionData = sessionStorage.getItem('user_data');
      if (sessionData) {
        try {
          userData = JSON.parse(sessionData);
        } catch (e) {
          console.error('Error parsing session user data:', e);
        }
      }
      
      // If not in session, check localStorage
      if (!userData) {
        const localData = localStorage.getItem('user_data');
        if (localData) {
          try {
            userData = JSON.parse(localData);
          } catch (e) {
            console.error('Error parsing local user data:', e);
          }
        }
      }
      
      // Apply user preferences if available
      if (userData) {
        console.log('Initializing theme from user preferences:', {
          theme: userData.preferred_theme,
          darkMode: userData.is_dark_mode
        });
        
        if (userData.preferred_theme && themes[userData.preferred_theme]) {
          setCurrentThemeId(userData.preferred_theme);
          localStorage.setItem('contractnest-theme', userData.preferred_theme);
        }
        
        if (userData.is_dark_mode !== undefined && userData.is_dark_mode !== null) {
          setIsDarkModeState(userData.is_dark_mode);
          localStorage.setItem('contractnest-dark-mode', String(userData.is_dark_mode));
        }
        
        setHasInitialized(true);
      }
    };
    
    // Initialize immediately
    initializeFromUserPreferences();
    
    // Also listen for storage events in case user data is set after mount
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_data' && e.newValue && !hasInitialized) {
        initializeFromUserPreferences();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [hasInitialized]);

  // Set theme function
  const setTheme = (themeId: string) => {
    console.log(`Setting theme to: ${themeId}, isDarkMode: ${isDarkMode}`);
    
    // Validate theme exists
    if (!themes[themeId]) {
      console.error(`Theme ${themeId} not found, falling back to default`);
      themeId = defaultTheme.id;
    }
    
    setCurrentThemeId(themeId);
    localStorage.setItem('contractnest-theme', themeId);
    applyTheme(themeId, isDarkMode);
  };

  // Toggle dark mode function
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
  };
  
  // Set dark mode directly
  const setIsDarkMode = (darkMode: boolean) => {
    setIsDarkModeState(darkMode);
    localStorage.setItem('contractnest-dark-mode', String(darkMode));
    applyTheme(currentThemeId, darkMode);
  };

  // Apply theme to document using CSS custom properties
  const applyTheme = (themeId: string, darkMode: boolean) => {
    console.log('Applying theme:', themeId, 'darkMode:', darkMode);
    
    const theme = themes[themeId] || defaultTheme;
    const colors = darkMode ? theme.darkMode.colors : theme.colors;
    
    // Apply theme colors as CSS custom properties
    const root = document.documentElement;
    const style = root.style;
    
    // Brand colors
    style.setProperty('--theme-brand-primary', colors.brand.primary);
    style.setProperty('--theme-brand-secondary', colors.brand.secondary);
    style.setProperty('--theme-brand-tertiary', colors.brand.tertiary);
    style.setProperty('--theme-brand-alternate', colors.brand.alternate);
    
    // Utility colors
    style.setProperty('--theme-primary-text', colors.utility.primaryText);
    style.setProperty('--theme-secondary-text', colors.utility.secondaryText);
    style.setProperty('--theme-primary-background', colors.utility.primaryBackground);
    style.setProperty('--theme-secondary-background', colors.utility.secondaryBackground);
    
    // Accent colors
    style.setProperty('--theme-accent-1', colors.accent.accent1);
    style.setProperty('--theme-accent-2', colors.accent.accent2);
    style.setProperty('--theme-accent-3', colors.accent.accent3);
    style.setProperty('--theme-accent-4', colors.accent.accent4);
    
    // Semantic colors
    style.setProperty('--theme-success', colors.semantic.success);
    style.setProperty('--theme-error', colors.semantic.error);
    style.setProperty('--theme-warning', colors.semantic.warning);
    style.setProperty('--theme-info', colors.semantic.info);
    
    // Set theme metadata
    root.setAttribute('data-theme', themeId);
    root.setAttribute('data-theme-mode', darkMode ? 'dark' : 'light');
    
    // Remove all existing theme classes
    root.classList.remove(
      'theme-bharatha-varsha',
      'theme-classic-elegant', 
      'theme-purple-tone',
      'theme-corporate',
      'theme-contract-nest',
      'theme-modern-bold',
      'theme-modern-business',
      'theme-professional-redefined',
      'theme-sleek-cool',
      'theme-tech-ai',
      'theme-tech-future',
      'theme-techy-simple',
      'theme-vikuna-black',
      'dark',
      'light'
    );
    
    // Add basic mode class (many components rely on this)
    root.classList.add(darkMode ? 'dark' : 'light');
    
    // ✅ FIXED: Complete legacy theme map for ALL themes
    const legacyThemeMap: { [key: string]: string } = {
      // Original themes
      'bharathavarsha': 'theme-bharatha-varsha',
      'classic-elegant': 'theme-classic-elegant',
      'purple-tone': 'theme-purple-tone',
      'corporate': 'theme-corporate',
      
      // New themes - ALL ADDED
      'contract-nest': 'theme-contract-nest',
      'modern-bold': 'theme-modern-bold',
      'modern-business': 'theme-modern-business',
      'professional-redefined': 'theme-professional-redefined',
      'sleek-cool': 'theme-sleek-cool',
      'tech-ai': 'theme-tech-ai',
      'tech-future': 'theme-tech-future',
      'techy-simple': 'theme-techy-simple',
      'vikuna-black': 'theme-vikuna-black',
    };
    
    const legacyClass = legacyThemeMap[themeId];
    if (legacyClass) {
      root.classList.add(legacyClass);
    }
    
    console.log('Applied theme CSS variables for:', themeId);
    console.log('Root element classes:', root.className);
    console.log('Theme CSS variables applied');
  };

  // Apply theme on initial render and when dependencies change
  useEffect(() => {
    applyTheme(currentThemeId, isDarkMode);
  }, [currentThemeId, isDarkMode]);

  // Listen for system color scheme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only change if user hasn't set a preference
      const savedDarkMode = localStorage.getItem('contractnest-dark-mode');
      const userData = sessionStorage.getItem('user_data') || localStorage.getItem('user_data');
      const hasUserPreference = userData && JSON.parse(userData).is_dark_mode !== undefined;
      
      if (savedDarkMode === null && !hasUserPreference) {
        setIsDarkModeState(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ 
      currentTheme,
      currentThemeId,
      setTheme, 
      isDarkMode, 
      toggleDarkMode,
      setIsDarkMode 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for accessing theme context
export const useTheme = () => useContext(ThemeContext);