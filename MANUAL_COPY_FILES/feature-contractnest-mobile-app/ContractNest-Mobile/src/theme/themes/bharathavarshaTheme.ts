// src/theme/themes/bharathavarshaTheme.ts
import { ThemeConfig } from '../../types/theme';

export const BharathaVarshaTheme: ThemeConfig = {
  id: 'bharathavarsha',
  name: 'Bharathavarsha',
  colors: {
    brand: {
      primary: '#e67e22',      // Primary orange from UI design
      secondary: '#d35400',    // Darker orange for contrast
      tertiary: '#8e44ad',     // Purple as complementary color
      alternate: '#f39c12',    // Yellow-orange for variety
    },
    utility: {
      primaryText: '#2c3e50',  // Dark slate for main text
      secondaryText: '#7f8c8d', // Medium gray for secondary text
      primaryBackground: '#f9f5f0', // Light cream background
      secondaryBackground: '#ffffff', // White background
    },
    accent: {
      accent1: '#e67e224c',    // Transparent versions of the primary colors
      accent2: '#d354004c',
      accent3: '#8e44ad4c',
      accent4: '#ffffffb2',
    },
    semantic: {
      success: '#27ae60',      // Green for success
      error: '#e74c3c',        // Red for error
      warning: '#f1c40f',      // Yellow for warning
      info: '#3498db',         // Blue for information
    }
  },
  darkMode: {
    colors: {
      brand: {
        primary: '#e67e22',    // Keep primary orange consistent
        secondary: '#d35400',  // Darker orange
        tertiary: '#8e44ad',   // Purple
        alternate: '#f39c12',  // Yellow-orange
      },
      utility: {
        primaryText: '#ecf0f1', // Light gray almost white for text
        secondaryText: '#bdc3c7', // Medium light gray for secondary text
        primaryBackground: '#2c3e50', // Dark slate background
        secondaryBackground: '#34495e', // Slightly lighter slate
      },
      accent: {
        accent1: '#e67e224c',
        accent2: '#d354004c',
        accent3: '#8e44ad4c',
        accent4: '#f39c12b2',
      },
      semantic: {
        success: '#2ecc71',
        error: '#e74c3c',
        warning: '#f1c40f',
        info: '#3498db',
      }
    }
  }
};