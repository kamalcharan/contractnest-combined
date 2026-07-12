// src/theme/themes/classicElegantTheme.ts
import { ThemeConfig } from '../../types/theme';

export const ClassicElegantTheme: ThemeConfig = {
  id: 'classic-elegant',
  name: 'Classic & Elegant',
  colors: {
    brand: {
      primary: '#4b998c',
      secondary: '#928163',
      tertiary: '#c6604a',
      alternate: '#c587c4',
    },
    utility: {
      primaryText: '#0b191e',
      secondaryText: '#384e58',
      primaryBackground: '#f1f4f8',
      secondaryBackground: '#ffffff',
    },
    accent: {
      accent1: '#4b998c4d',    // Fixed: was #444b598c
      accent2: '#9281634d',    // Fixed: was #445f28163
      accent3: '#c6604a4d',    // Fixed: was #4c6d604a
      accent4: '#ffffffcf',
    },
    semantic: {
      success: '#336a4a',
      error: '#c4454d',
      warning: '#f3c344',
      info: '#ffffff',
    }
  },
  darkMode: {
    colors: {
      brand: {
        primary: '#4b998c',      // Fixed: was #4b496cc
        secondary: '#928163',
        tertiary: '#c6604a',
        alternate: '#72828e',    // Fixed: was #7282e
      },
      utility: {
        primaryText: '#ffffff',
        secondaryText: '#95a1ac',
        primaryBackground: '#0b191e',
        secondaryBackground: '#131f24',
      },
      accent: {
        accent1: '#4b998c4d',    // Fixed: was #44db986c
        accent2: '#9281634d',
        accent3: '#c6604a4d',    // Fixed: was #dc6d004a
        accent4: '#0cb7beb2',
      },
      semantic: {
        success: '#336a4a',      // Fixed: was #336ada
        error: '#c4454d',
        warning: '#f3c344',
        info: '#ffffff',
      }
    }
  }
};