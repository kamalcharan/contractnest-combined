// src/theme/themes/techFutureTheme.ts
import { ThemeConfig } from '../../types/theme';

export const TechFutureTheme: ThemeConfig = {
  id: 'tech-future',
  name: 'Tech Future',
  colors: {
    brand: {
      primary: '#2797ff',
      secondary: '#0b67bc',
      tertiary: '#acc420',
      alternate: '#e0e3e7',
    },
    utility: {
      primaryText: '#161624',
      secondaryText: '#636f81',
      primaryBackground: '#f1f4f8',
      secondaryBackground: '#ffffff',
    },
    accent: {
      accent1: '#2797ff4c',
      accent2: '#0b67bc4c',
      accent3: '#acc4204c',
      accent4: '#ffffffb2',
    },
    semantic: {
      success: '#27a852',
      error: '#e74444',
      warning: '#c96446',
      info: '#ffffff',
    }
  },
  darkMode: {
    colors: {
      brand: {
        primary: '#2797ff',
        secondary: '#0b67bc',
        tertiary: '#acc420',
        alternate: '#212836',
      },
      utility: {
        primaryText: '#ffffff',
        secondaryText: '#919eab',
        primaryBackground: '#161624',
        secondaryBackground: '#1d1d2d',
      },
      accent: {
        accent1: '#2797ff4c',
        accent2: '#0b67bc4c',
        accent3: '#acc4204c',
        accent4: '#212836b3',
      },
      semantic: {
        success: '#27a852',
        error: '#e74444',
        warning: '#c96446',
        info: '#ffffff',
      }
    }
  }
};