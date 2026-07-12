// src/theme/themes/techAITheme.ts
import { ThemeConfig } from '../../types/theme';

export const TechAITheme: ThemeConfig = {
  id: 'tech-ai',
  name: 'Tech AI',
  colors: {
    brand: {
      primary: '#06d5cd',
      secondary: '#18aa99',
      tertiary: '#9984bb',    // Fixed: was #9984bb6
      alternate: '#dfedec',
    },
    utility: {
      primaryText: '#101518',
      secondaryText: '#5763cc',
      primaryBackground: '#f1f4f8',
      secondaryBackground: '#ffffff',
    },
    accent: {
      accent1: '#06d5cd4c',   // Fixed: was #4c05d5cd
      accent2: '#18aa994d',
      accent3: '#9984bb4d',   // Fixed: was #4d984bb6
      accent4: '#ffffffb2',
    },
    semantic: {
      success: '#16857b',
      error: '#c4454d',
      warning: '#f3c344',
      info: '#ffffff',
    }
  },
  darkMode: {
    colors: {
      brand: {
        primary: '#06d5cd',
        secondary: '#18aa99',
        tertiary: '#9984bb',    // Fixed: was #9984bb6
        alternate: '#293d42',
      },
      utility: {
        primaryText: '#ffffff',
        secondaryText: '#95a1ac',
        primaryBackground: '#132121',
        secondaryBackground: '#101818',
      },
      accent: {
        accent1: '#06d5cd4c',
        accent2: '#18aa994d',
        accent3: '#9984bb4d',   // Fixed: was #4d984bb6
        accent4: '#1d2428b3',
      },
      semantic: {
        success: '#16857b',
        error: '#c4454d',
        warning: '#f3c344',
        info: '#ffffff',
      }
    }
  }
};