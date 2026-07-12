// src/theme/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeConfig } from '../types/theme';

import { PurpleToneTheme } from './themes/purpleToneTheme';
import { BharathaVarshaTheme } from './themes/bharathavarshaTheme';
import { ClassicElegantTheme } from './themes/classicElegantTheme';
import { TechySimpleTheme } from './themes/techySimpleTheme';
import { TechFutureTheme } from './themes/techFutureTheme';
import { TechAITheme } from './themes/techAITheme';
import { SleekCoolTheme } from './themes/sleekCoolTheme';
import { ProfessionalRedefinedTheme } from './themes/professionalRedefinedTheme';
import { ModernBusinessTheme } from './themes/modernBusinessTheme';
import { ModernBoldTheme } from './themes/modernBoldTheme';
import { ContractNestTheme } from './themes/contractNestTheme';
import { VikunaBlackTheme } from './themes/vikunaBlackTheme';

interface ThemeContextType {
  theme: ThemeConfig;
  isDarkMode: boolean;
  currentThemeId: string;
  setTheme: (themeId: string) => void;
  toggleDarkMode: () => void;
  availableThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@ContractNest:theme';
const DARK_MODE_STORAGE_KEY = '@ContractNest:darkMode';

// Same theme set as the ContractNest web app (default matches web: bharathavarsha)
const themes: Record<string, ThemeConfig> = {
  'bharathavarsha': BharathaVarshaTheme,
  'contract-nest': ContractNestTheme,
  'vikuna-black': VikunaBlackTheme,
  'purple-tone': PurpleToneTheme,
  'classic-elegant': ClassicElegantTheme,
  'techy-simple': TechySimpleTheme,
  'tech-future': TechFutureTheme,
  'tech-ai': TechAITheme,
  'sleek-cool': SleekCoolTheme,
  'professional-redefined': ProfessionalRedefinedTheme,
  'modern-business': ModernBusinessTheme,
  'modern-bold': ModernBoldTheme,
};

export const DEFAULT_THEME_ID = 'bharathavarsha';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [currentThemeId, setCurrentThemeId] = useState(DEFAULT_THEME_ID);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasStoredDarkMode, setHasStoredDarkMode] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadThemePreferences = async () => {
      try {
        const [savedTheme, savedDarkMode] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(DARK_MODE_STORAGE_KEY),
        ]);
        if (cancelled) return;
        if (savedTheme && themes[savedTheme]) {
          setCurrentThemeId(savedTheme);
        }
        if (savedDarkMode !== null) {
          setIsDarkMode(savedDarkMode === 'true');
          setHasStoredDarkMode(true);
        }
      } catch (error) {
        console.error('Error loading theme preferences:', error);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };
    loadThemePreferences();
    return () => {
      cancelled = true;
    };
  }, []);

  // Until the user explicitly chooses, follow the system appearance (matches web behavior)
  const effectiveDarkMode = hasStoredDarkMode ? isDarkMode : hydrated ? systemColorScheme === 'dark' : isDarkMode;

  const setTheme = useCallback((themeId: string) => {
    if (!themes[themeId]) return;
    setCurrentThemeId(themeId);
    AsyncStorage.setItem(THEME_STORAGE_KEY, themeId).catch(() => {});
  }, []);

  const toggleDarkMode = useCallback(() => {
    const next = !effectiveDarkMode;
    setIsDarkMode(next);
    setHasStoredDarkMode(true);
    AsyncStorage.setItem(DARK_MODE_STORAGE_KEY, String(next)).catch(() => {});
  }, [effectiveDarkMode]);

  const value = useMemo<ThemeContextType>(() => {
    const baseTheme = themes[currentThemeId] || themes[DEFAULT_THEME_ID];
    const theme =
      effectiveDarkMode && baseTheme.darkMode
        ? { ...baseTheme, colors: baseTheme.darkMode.colors }
        : baseTheme;
    return {
      theme,
      isDarkMode: effectiveDarkMode,
      currentThemeId,
      setTheme,
      toggleDarkMode,
      availableThemes: Object.values(themes),
    };
  }, [currentThemeId, effectiveDarkMode, setTheme, toggleDarkMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
