// src/theme/themes/modernBoldTheme.ts
import { ThemeConfig } from '../../types/theme';

export const ModernBoldTheme: ThemeConfig = {
  id: 'modern-bold',
  name: 'Modern & Bold',
  colors: {
    brand: {
      primary: '#19db8a',
      secondary: '#38b4ff',
      tertiary: '#ffa130',
      alternate: '#e0e3e7',     // Fixed: was #e0a3e7
    },
    utility: {
      primaryText: '#141518',   // Fixed: was #14f8fb which is too bright for text
      secondaryText: '#57636c', // Fixed: was #57c36c
      primaryBackground: '#f1f4f8',
      secondaryBackground: '#ffffff',
    },
    accent: {
      accent1: '#19db8a4c',     // Fixed: was #4cf9d6a
      accent2: '#38b4ff4c',     // Fixed: was #44f5b4ff
      accent3: '#ffa1304c',     // Fixed: was #44ffa130
      accent4: '#ffffffb2',     // Fixed: added proper hex prefix
    },
    semantic: {
      success: '#16b070',
      error: '#ff5963',         // Fixed: was #ff69f3
      warning: '#cc8a30',
      info: '#ffffff',
    }
  },
  darkMode: {
    colors: {
      brand: {
        primary: '#19db8a',
        secondary: '#38b4ff',
        tertiary: '#ffa130',
        alternate: '#2b3238',     // Fixed: was #2b32db
      },
      utility: {
        primaryText: '#ffffff',
        secondaryText: '#95a1ac',
        primaryBackground: '#14181b',
        secondaryBackground: '#1a1f24', // Fixed: was #142429
      },
      accent: {
        accent1: '#19db8a4c',
        accent2: '#38b4ff4c',     // Fixed: was #44d5d4df
        accent3: '#ffa1304c',
        accent4: '#14181bb3',     // Fixed: was #b21418ib
      },
      semantic: {
        success: '#16b070',
        error: '#ff5963',         // Fixed: was #fff9fd3
        warning: '#cc8a30',       // Fixed: was #cc6b30
        info: '#ffffff',
      }
    }
  }
};