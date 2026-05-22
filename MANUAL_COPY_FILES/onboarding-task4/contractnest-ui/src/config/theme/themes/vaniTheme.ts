import { ThemeConfig } from '../types';

// VaNi Theme — applied during the onboarding flow only (not user-selectable).
// Structural/UI tokens follow the same shape as all other themes so any
// component using useTheme() works without changes.
// The hero panel's dark accent tokens (accent1–4) are VaNi-specific and used
// only by the onboarding screens to avoid hardcoded values.

export const VaNiTheme: ThemeConfig = {
  id: 'vani',
  name: 'VaNi',
  colors: {
    brand: {
      primary: '#ff6b2b',     // VaNi orange — buttons, highlights, focus rings
      secondary: '#e55a1f',   // Darker orange — hover states
      tertiary: '#fff8f4',    // Soft orange tint — backgrounds
      alternate: '#ff8f5a',   // Lighter orange — gradient end
    },
    utility: {
      primaryText: '#1a1816',
      secondaryText: '#4a4540',
      primaryBackground: '#f7f5f2',   // Warm off-white page background
      secondaryBackground: '#ffffff', // Cards and form surfaces
    },
    accent: {
      accent1: '#1a1816',   // Hero panel background (dark start/end)
      accent2: '#2d2620',   // Hero panel gradient midpoint
      accent3: '#f0ece6',   // Hero headline text
      accent4: '#6a6460',   // Hero dim/muted text and stats labels
    },
    semantic: {
      success: '#16a34a',
      error: '#dc2626',
      warning: '#d97706',
      info: '#3b82f6',
    },
  },
  darkMode: {
    colors: {
      brand: {
        primary: '#ff6b2b',
        secondary: '#e55a1f',
        tertiary: '#2d1810',
        alternate: '#ff8f5a',
      },
      utility: {
        primaryText: '#f0ece6',
        secondaryText: '#8a847a',
        primaryBackground: '#1a1816',
        secondaryBackground: '#2d2620',
      },
      accent: {
        accent1: '#0f0e0d',
        accent2: '#1a1816',
        accent3: '#f0ece6',
        accent4: '#6a6460',
      },
      semantic: {
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#60a5fa',
      },
    },
  },
};
