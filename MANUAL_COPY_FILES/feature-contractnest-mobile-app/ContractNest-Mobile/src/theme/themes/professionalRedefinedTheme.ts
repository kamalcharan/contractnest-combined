// src/theme/themes/professionalRedefinedTheme.ts
import { ThemeConfig } from '../../types/theme';

export const ProfessionalRedefinedTheme: ThemeConfig = {
  id: 'professional-redefined',
  name: 'Professional Redefined',
  colors: {
    brand: {
      primary: '#507583',
      secondary: '#18aa99',
      tertiary: '#928163',
      alternate: '#ede8df',
    },
    utility: {
      primaryText: '#101518',
      secondaryText: '#576363',
      primaryBackground: '#f1f4f8',
      secondaryBackground: '#ffffff',
    },
    accent: {
      accent1: '#5075834c',
      accent2: '#18aa994c',
      accent3: '#9281634c',
      accent4: '#ffffffb2',
    },
    semantic: {
      success: '#16857b',
      error: '#c44454',
      warning: '#f3c344',
      info: '#ffffff',
    }
  },
  darkMode: {
    colors: {
      brand: {
        primary: '#507583',
        secondary: '#18aa99',
        tertiary: '#928163',
        alternate: '#2f2b26',
      },
      utility: {
        primaryText: '#ffffff',
        secondaryText: '#95a1ac',
        primaryBackground: '#101518',
        secondaryBackground: '#181c1f',
      },
      accent: {
        accent1: '#5075834c',
        accent2: '#18aa994c',
        accent3: '#9281634c',
        accent4: '#2f2b26b3',
      },
      semantic: {
        success: '#16857b',
        error: '#c44454',
        warning: '#f3c344',
        info: '#ffffff',
      }
    }
  }
};