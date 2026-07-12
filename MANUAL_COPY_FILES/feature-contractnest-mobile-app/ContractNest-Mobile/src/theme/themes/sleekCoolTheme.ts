// src/theme/themes/sleekCoolTheme.ts
import { ThemeConfig } from '../../types/theme';

export const SleekCoolTheme: ThemeConfig = {
  id: 'sleek-cool',
  name: 'Sleek & Cool',
  colors: {
    brand: {
      primary: '#2797ff',
      secondary: '#8ac7ff',
      tertiary: '#acc420',
      alternate: '#e0e3e7',
    },
    utility: {
      primaryText: '#121518',
      secondaryText: '#636f81',
      primaryBackground: '#f1f4f8',
      secondaryBackground: '#ffffff',
    },
    accent: {
      accent1: '#2797ff4c',
      accent2: '#8ac7ff4c',
      accent3: '#acc4204c',
      accent4: '#ffffffb2',
    },
    semantic: {
      success: '#27ae52',
      error: '#e44444',
      warning: '#c96446',
      info: '#ffffff',
    }
  },
  darkMode: {
    colors: {
      brand: {
        primary: '#2797ff',
        secondary: '#8ac7ff',
        tertiary: '#acc420',
        alternate: '#212836',
      },
      utility: {
        primaryText: '#ffffff',
        secondaryText: '#919eab',
        primaryBackground: '#121518',
        secondaryBackground: '#1a1d24',
      },
      accent: {
        accent1: '#2797ff4c',
        accent2: '#8ac7ff4c',
        accent3: '#acc4204c',
        accent4: '#212836b3',
      },
      semantic: {
        success: '#27ae52',
        error: '#e44444',
        warning: '#c96446',
        info: '#ffffff',
      }
    }
  }
};