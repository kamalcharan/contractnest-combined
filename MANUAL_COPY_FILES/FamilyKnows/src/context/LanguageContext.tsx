// src/context/LanguageContext.tsx
// Language context for i18n support across the app

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, getTranslation, supportedLanguages } from '../constants/languages';

const LANGUAGE_STORAGE_KEY = '@FamilyKnows:language';

type TranslationKeys = keyof typeof translations.en;

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (languageCode: string) => Promise<void>;
  t: (key: TranslationKeys | string) => string;
  isRTL: boolean;
  languageName: string;
  nativeLanguageName: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language on mount
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && Object.keys(translations).includes(savedLanguage)) {
        setCurrentLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = useCallback(async (languageCode: string) => {
    try {
      // Validate language code
      if (!Object.keys(translations).includes(languageCode)) {
        console.warn(`Invalid language code: ${languageCode}. Falling back to English.`);
        languageCode = 'en';
      }

      // Save to AsyncStorage
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
      setCurrentLanguage(languageCode);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  }, []);

  // Translation function
  const t = useCallback((key: TranslationKeys | string): string => {
    return getTranslation(currentLanguage, key);
  }, [currentLanguage]);

  // Check if current language is RTL (for future Hebrew/Arabic support)
  const isRTL = ['ar', 'he', 'fa', 'ur'].includes(currentLanguage);

  // Get language display names
  const currentLangInfo = supportedLanguages.find(l => l.code === currentLanguage);
  const languageName = currentLangInfo?.name || 'English';
  const nativeLanguageName = currentLangInfo?.nativeName || 'English';

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    t,
    isRTL,
    languageName,
    nativeLanguageName,
  };

  // Don't render until we've loaded the saved language
  if (isLoading) {
    return null;
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
