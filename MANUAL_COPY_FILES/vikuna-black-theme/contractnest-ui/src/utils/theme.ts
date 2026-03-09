// src/utils/theme.ts

// ✅ SIMPLE: Just import what we need from existing theme config
import { BharathaVarshaTheme } from '@/config/theme/themes/bharathavarshaTheme';
import { ClassicElegantTheme } from '@/config/theme/themes/classicElegantTheme';
import { PurpleToneTheme } from '@/config/theme/themes/purpleToneTheme';
import { ContractNestTheme } from '@/config/theme/themes/contractNest';
import { ModernBoldTheme } from '@/config/theme/themes/modernBold';
import { ModernBusinessTheme } from '@/config/theme/themes/modernBusiness';
import { ProfessionalRedefinedTheme } from '@/config/theme/themes/professionalRedefined';
import { SleekCoolTheme } from '@/config/theme/themes/sleekCool';
import { TechAITheme } from '@/config/theme/themes/techAI';
import { TechFutureTheme } from '@/config/theme/themes/techFuture';
import { TechySimpleTheme } from '@/config/theme/themes/techySimple';
import { VikunaBlackTheme } from '@/config/theme/themes/vikunaBlack';

// ✅ SIMPLE: Define theme registry matching your config/theme/index.ts
const themes = {
  [BharathaVarshaTheme.id]: BharathaVarshaTheme,
  [ClassicElegantTheme.id]: ClassicElegantTheme,
  [PurpleToneTheme.id]: PurpleToneTheme,
  [ContractNestTheme.id]: ContractNestTheme,
  [ModernBoldTheme.id]: ModernBoldTheme,
  [ModernBusinessTheme.id]: ModernBusinessTheme,
  [ProfessionalRedefinedTheme.id]: ProfessionalRedefinedTheme,
  [SleekCoolTheme.id]: SleekCoolTheme,
  [TechAITheme.id]: TechAITheme,
  [TechFutureTheme.id]: TechFutureTheme,
  [TechySimpleTheme.id]: TechySimpleTheme,
  [VikunaBlackTheme.id]: VikunaBlackTheme,
};

// ✅ SIMPLE: Default theme
const defaultTheme = BharathaVarshaTheme;

// ✅ SIMPLE: Type for theme names
export type ThemeName = string;

/**
 * Get colors for the current theme and mode
 * @param themeName The current theme name
 * @param isDarkMode Whether dark mode is enabled
 * @returns Theme colors object
 */
export function getThemeColors(themeName: string, isDarkMode: boolean): any {
  const theme = themes[themeName] || defaultTheme;
  return isDarkMode ? (theme.darkMode?.colors || theme.colors) : theme.colors;
}

/**
 * Create toast styles based on current theme
 * @param themeName Current theme name
 * @param isDarkMode Whether dark mode is enabled
 * @returns Object with styled toast variants
 */
export function getToastStyles(themeName: string, isDarkMode: boolean) {
  const colors = getThemeColors(themeName, isDarkMode);
  
  // Common style attributes
  const baseStyle = {
    padding: '16px',
    borderRadius: '8px',
    fontSize: '16px',
    minWidth: '300px'
  };
  
  // Style variants for different toast types
  return {
    error: {
      ...baseStyle,
      background: colors.semantic?.error || '#EF4444',
      color: '#FFFFFF'
    },
    success: {
      ...baseStyle,
      background: colors.semantic?.success || '#10B981',
      color: '#FFFFFF'
    },
    warning: {
      ...baseStyle,
      background: colors.semantic?.warning || '#F59E0B',
      color: isDarkMode ? '#000000' : '#000000'
    },
    info: {
      ...baseStyle,
      background: colors.semantic?.info || '#3B82F6',
      color: '#FFFFFF'
    },
    loading: {
      ...baseStyle,
      background: isDarkMode ? (colors.utility?.secondaryBackground || '#1F2937') : '#FFFFFF',
      color: colors.utility?.primaryText || (isDarkMode ? '#FFFFFF' : '#000000')
    }
  };
}

/**
 * Get a specific semantic color from the current theme
 * @param themeName Current theme name
 * @param isDarkMode Whether dark mode is enabled
 * @param colorName Name of the semantic color to get
 * @returns The color value as hex string
 */
export function getSemanticColor(
  themeName: string, 
  isDarkMode: boolean, 
  colorName: 'success' | 'error' | 'warning' | 'info'
): string {
  const colors = getThemeColors(themeName, isDarkMode);
  
  const fallbackColors = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6'
  };
  
  return colors.semantic?.[colorName] || fallbackColors[colorName];
}

/**
 * Get a specific brand color from the current theme
 * @param themeName Current theme name
 * @param isDarkMode Whether dark mode is enabled
 * @param colorName Name of the brand color to get
 * @returns The color value as hex string
 */
export function getBrandColor(
  themeName: string,
  isDarkMode: boolean,
  colorName: 'primary' | 'secondary' | 'tertiary' | 'alternate'
): string {
  const colors = getThemeColors(themeName, isDarkMode);
  
  const fallbackColors = {
    primary: '#2563EB',
    secondary: '#7C3AED',
    tertiary: '#059669',
    alternate: '#DC2626'
  };
  
  return colors.brand?.[colorName] || fallbackColors[colorName];
}

/**
 * Check if a color is light (to determine text color)
 * @param color Hex color string (e.g. #FFFFFF)
 * @returns Boolean indicating if the color is light
 */
export function isLightColor(color: string): boolean {
  if (!color || typeof color !== 'string') {
    return false;
  }
  
  // Remove the hash if it exists
  const hex = color.replace('#', '');
  
  // Convert 3-digit hex to 6-digit
  if (hex.length === 3) {
    return isLightColor('#' + hex.split('').map(char => char + char).join(''));
  }
  
  // Validate hex format
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return false;
  }
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate perceived brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return true if the color is light (brightness > 125)
  return brightness > 125;
}

/**
 * Get contrasting text color for a given background color
 * @param bgColor Background color hex string
 * @returns White or black color for optimal contrast
 */
export function getContrastColor(bgColor: string): string {
  return isLightColor(bgColor) ? '#000000' : '#FFFFFF';
}

/**
 * Get all available theme IDs
 * @returns Array of theme IDs
 */
export function getAvailableThemes(): string[] {
  return Object.keys(themes);
}

/**
 * Check if a theme exists
 * @param themeName Theme name to check
 * @returns Boolean indicating if theme exists
 */
export function isValidTheme(themeName: string): boolean {
  return themeName in themes;
}

/**
 * Get theme configuration
 * @param themeName Theme name
 * @returns Theme configuration
 */
export function getThemeConfig(themeName: string) {
  return themes[themeName] || defaultTheme;
}

export { themes };
export { defaultTheme };
// Define ThemeConfig interface
export interface ThemeConfig {
  id: string;
  name: string;
  colors: any;
  darkMode: {
    colors: any;
  };
}