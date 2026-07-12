// src/theme/themes/modernBusinessTheme.ts
import { ThemeConfig } from '../../types/theme';

export const ModernBusinessTheme: ThemeConfig = {
  id: 'modern-business',
  name: 'Modern Business',
  colors: {
    brand: {
      primary: '#39d2c0',
      secondary: '#1aaa99',
      tertiary: '#ee8b60',
      alternate: '#dfe3e7',
    },
    utility: {
      primaryText: '#1a1f24',
      secondaryText: '#656a85',
      primaryBackground: '#f1f4f8',
      secondaryBackground: '#ffffff',
    },
    accent: {
      accent1: '#39d2c04c',
      accent2: '#1aaa994d',
      accent3: '#ee8b604c',
      accent4: '#ffffffb2',
    },
    semantic: {
      success: '#165070',
      error: '#c44454',
      warning: '#cc8e30',
      info: '#ffffff',
    }
  },
  darkMode: {
    colors: {
      brand: {
        primary: '#39d2c0',
        secondary: '#1aaa99',
        tertiary: '#ee8b60',
        alternate: '#2b3238',
      },
      utility: {
        primaryText: '#ffffff',
        secondaryText: '#95a1ac',
        primaryBackground: '#1a1f24',
        secondaryBackground: '#12161b',
      },
      accent: {
        accent1: '#39d2c04c',
        accent2: '#1aaa994d',
        accent3: '#ee8b604c',
        accent4: '#2b3238b3',
      },
      semantic: {
        success: '#165070',
        error: '#c44454',
        warning: '#cc8e30',
        info: '#ffffff',
      }
    }
  }
};