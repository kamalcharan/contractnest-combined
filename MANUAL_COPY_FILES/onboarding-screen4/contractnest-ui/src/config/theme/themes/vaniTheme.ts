// src/config/theme/themes/vaniTheme.ts
// VaNi onboarding skin — NOT shown in the workspace theme picker.
// Used exclusively during the onboarding flow (screens 1–4).
// Registered in ThemeContext so setTheme('vani') works correctly.
import { ThemeConfig } from '../types';

export const VaniTheme: ThemeConfig = {
  id: 'vani',
  name: 'VaNi Onboarding',
  colors: {
    brand: {
      primary:   '#ff6b2b',   // signature VaNi orange
      secondary: '#ff8f5a',   // soft orange
      tertiary:  '#e85520',   // deep orange
      alternate: '#ff8f5a',
    },
    utility: {
      primaryText:        '#1a1816',
      secondaryText:      '#6a6460',
      primaryBackground:  '#f0ece6',   // warm off-white
      secondaryBackground: '#ffffff',
    },
    accent: {
      accent1: '#1a1816',   // near-black — used for floating island bg
      accent2: '#2a2420',
      accent3: '#f0ece6',
      accent4: '#6a6460',
    },
    semantic: {
      success: '#22c55e',
      error:   '#ef4444',
      warning: '#f59e0b',
      info:    '#3b82f6',
    },
  },
  darkMode: {
    colors: {
      brand: {
        primary:   '#ff6b2b',
        secondary: '#ff8f5a',
        tertiary:  '#e85520',
        alternate: '#ff8f5a',
      },
      utility: {
        primaryText:        '#f0ece6',
        secondaryText:      '#9a9490',
        primaryBackground:  '#1a1816',
        secondaryBackground: '#2a2420',
      },
      accent: {
        accent1: '#0a0806',
        accent2: '#1a1816',
        accent3: '#f0ece6',
        accent4: '#6a6460',
      },
      semantic: {
        success: '#22c55e',
        error:   '#ef4444',
        warning: '#f59e0b',
        info:    '#3b82f6',
      },
    },
  },
};
