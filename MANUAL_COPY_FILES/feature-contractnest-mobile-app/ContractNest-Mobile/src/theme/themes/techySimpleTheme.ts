// src/theme/themes/techySimpleTheme.ts
import { ThemeConfig } from '../../types/theme';

export const TechySimpleTheme: ThemeConfig = {
  id: 'techy-simple',
  name: 'Techy Simple',
  colors: {
    brand: {
      primary: '#f83b46',
      secondary: '#ff6a73',
      tertiary: '#0299ff',
      alternate: '#e0e3e7',
    },
    utility: {
      primaryText: '#141518',
      secondaryText: '#677681',
      primaryBackground: '#f1f4f8',
      secondaryBackground: '#ffffff',
    },
    accent: {
      accent1: '#f83b464c',
      accent2: '#ff6a734c',
      accent3: '#0299ff4c',
      accent4: '#ffffffb2',
    },
    semantic: {
      success: '#6bbd78',
      error: '#ff5963',
      warning: '#ec9c4b',
      info: '#ffffff',
    }
  },
  darkMode: {
    colors: {
      brand: {
        primary: '#f83b46',
        secondary: '#ff6a73',
        tertiary: '#0299ff',
        alternate: '#262b36',
      },
      utility: {
        primaryText: '#ffffff',
        secondaryText: '#95a1ac',
        primaryBackground: '#141518',
        secondaryBackground: '#1a1f24',
      },
      accent: {
        accent1: '#f83b464c',
        accent2: '#ff6a734c',
        accent3: '#0299ff4c',
        accent4: '#262b36b3',
      },
      semantic: {
        success: '#6bbd78',
        error: '#ff5963',
        warning: '#ec9c4b',
        info: '#ffffff',
      }
    }
  }
};