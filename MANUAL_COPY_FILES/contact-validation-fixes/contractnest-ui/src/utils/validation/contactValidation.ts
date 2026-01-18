// src/utils/validation/contactValidation.ts
// Centralized validation utilities for contacts - used across Quick Add, Advanced Add, and Edit forms

import { countries, getPhoneLengthForCountry, type Country } from '../constants/countries';

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// ============================================================================
// PHONE VALIDATION
// ============================================================================

/**
 * Validates a phone number based on the selected country code
 * @param phoneNumber - The phone number (digits only, without country code)
 * @param countryCode - The country code (e.g., 'IN', 'US', 'GB')
 * @returns ValidationResult with isValid and optional error message
 */
export const validatePhoneByCountry = (
  phoneNumber: string,
  countryCode: string
): ValidationResult => {
  // Remove all non-digit characters for validation
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  if (!digitsOnly) {
    return { isValid: false, error: 'Phone number is required' };
  }

  const country = countries.find(c => c.code === countryCode);
  if (!country) {
    // Fallback validation for unknown countries
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return { isValid: false, error: 'Phone number must be between 7 and 15 digits' };
    }
    return { isValid: true };
  }

  const { min, max } = getPhoneLengthForCountry(countryCode);

  if (digitsOnly.length < min) {
    return {
      isValid: false,
      error: min === max
        ? `Phone number must be exactly ${min} digits for ${country.name}`
        : `Phone number must be at least ${min} digits for ${country.name}`
    };
  }

  if (digitsOnly.length > max) {
    return {
      isValid: false,
      error: min === max
        ? `Phone number must be exactly ${max} digits for ${country.name}`
        : `Phone number must not exceed ${max} digits for ${country.name}`
    };
  }

  // Check that it only contains valid characters (digits)
  if (!/^\d+$/.test(digitsOnly)) {
    return { isValid: false, error: 'Phone number must contain only digits' };
  }

  return { isValid: true };
};

/**
 * Gets the expected phone length description for a country
 */
export const getPhoneLengthDescription = (countryCode: string): string => {
  const country = countries.find(c => c.code === countryCode);
  if (!country) return '7-15 digits';

  const { min, max } = getPhoneLengthForCountry(countryCode);
  return min === max ? `${min} digits` : `${min}-${max} digits`;
};

/**
 * Gets the placeholder text for phone input based on country
 */
export const getPhonePlaceholder = (countryCode: string): string => {
  const { min, max } = getPhoneLengthForCountry(countryCode);
  if (min === max) {
    return '0'.repeat(min);
  }
  return '0'.repeat(min) + '...';
};

// ============================================================================
// NAME VALIDATION
// ============================================================================

// Allowed characters in names:
// - Letters (including Unicode for international names)
// - Spaces
// - Hyphens (Mary-Jane)
// - Apostrophes (O'Brien)
// - Periods (Dr. Smith, Jr.)
// - Commas (for company names like "Smith, Inc.")
const NAME_PATTERN = /^[\p{L}\p{M}\s\-'.&,]+$/u;

// For company names, also allow:
// - Numbers (Company123, 3M)
// - Ampersand (&)
// - Common business punctuation
const COMPANY_NAME_PATTERN = /^[\p{L}\p{M}\p{N}\s\-'.&,()]+$/u;

/**
 * Validates an individual's name
 * @param name - The name to validate
 * @param minLength - Minimum length (default 2)
 * @param maxLength - Maximum length (default 50)
 */
export const validateIndividualName = (
  name: string,
  minLength: number = 2,
  maxLength: number = 50
): ValidationResult => {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { isValid: false, error: 'Name is required' };
  }

  if (trimmedName.length < minLength) {
    return { isValid: false, error: `Name must be at least ${minLength} characters` };
  }

  if (trimmedName.length > maxLength) {
    return { isValid: false, error: `Name must not exceed ${maxLength} characters` };
  }

  if (!NAME_PATTERN.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Name can only contain letters, spaces, hyphens, apostrophes, and periods'
    };
  }

  // Check for consecutive special characters
  if (/[\-'.]{2,}/.test(trimmedName)) {
    return { isValid: false, error: 'Name cannot have consecutive special characters' };
  }

  // Name shouldn't start or end with special characters (except period for titles)
  if (/^[\-',]|[\-',]$/.test(trimmedName)) {
    return { isValid: false, error: 'Name cannot start or end with special characters' };
  }

  return { isValid: true };
};

/**
 * Validates a company/business name
 * @param companyName - The company name to validate
 * @param minLength - Minimum length (default 2)
 * @param maxLength - Maximum length (default 100)
 */
export const validateCompanyName = (
  companyName: string,
  minLength: number = 2,
  maxLength: number = 100
): ValidationResult => {
  const trimmedName = companyName.trim();

  if (!trimmedName) {
    return { isValid: false, error: 'Company name is required' };
  }

  if (trimmedName.length < minLength) {
    return { isValid: false, error: `Company name must be at least ${minLength} characters` };
  }

  if (trimmedName.length > maxLength) {
    return { isValid: false, error: `Company name must not exceed ${maxLength} characters` };
  }

  if (!COMPANY_NAME_PATTERN.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Company name contains invalid characters'
    };
  }

  return { isValid: true };
};

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

// RFC 5322 compliant email pattern
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validates an email address
 * @param email - The email to validate
 */
export const validateEmail = (email: string): ValidationResult => {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail) {
    return { isValid: false, error: 'Email is required' };
  }

  if (trimmedEmail.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }

  if (!EMAIL_PATTERN.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  // Check for common issues
  if (trimmedEmail.includes('..')) {
    return { isValid: false, error: 'Email cannot contain consecutive dots' };
  }

  // Ensure domain has at least one dot
  const [, domain] = trimmedEmail.split('@');
  if (!domain || !domain.includes('.')) {
    return { isValid: false, error: 'Please enter a valid email domain' };
  }

  return { isValid: true };
};

// ============================================================================
// URL VALIDATION
// ============================================================================

/**
 * Validates a website URL
 * @param url - The URL to validate
 */
export const validateWebsite = (url: string): ValidationResult => {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return { isValid: true }; // Website is usually optional
  }

  // Add protocol if missing
  let urlToValidate = trimmedUrl;
  if (!urlToValidate.match(/^https?:\/\//i)) {
    urlToValidate = 'https://' + urlToValidate;
  }

  try {
    const parsedUrl = new URL(urlToValidate);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { isValid: false, error: 'Please enter a valid website URL' };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid website URL' };
  }
};

// ============================================================================
// CHANNEL VALIDATION (Combined)
// ============================================================================

export type ChannelType = 'mobile' | 'email' | 'whatsapp' | 'linkedin' | 'website' | 'telegram' | 'skype' | 'phone';

/**
 * Validates a contact channel value based on its type
 * @param channelType - The type of channel
 * @param value - The channel value
 * @param countryCode - Country code (required for phone-based channels)
 */
export const validateChannelValue = (
  channelType: ChannelType,
  value: string,
  countryCode?: string
): ValidationResult => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { isValid: false, error: 'Value is required' };
  }

  switch (channelType) {
    case 'mobile':
    case 'phone':
    case 'whatsapp':
      if (!countryCode) {
        return { isValid: false, error: 'Country code is required for phone numbers' };
      }
      return validatePhoneByCountry(trimmedValue, countryCode);

    case 'email':
      return validateEmail(trimmedValue);

    case 'website':
      return validateWebsite(trimmedValue);

    case 'linkedin':
      // LinkedIn URLs or usernames
      if (trimmedValue.includes('linkedin.com')) {
        return validateWebsite(trimmedValue);
      }
      // Just a username
      if (/^[a-zA-Z0-9\-]{3,100}$/.test(trimmedValue)) {
        return { isValid: true };
      }
      return { isValid: false, error: 'Please enter a valid LinkedIn URL or username' };

    case 'telegram':
    case 'skype':
      // Username validation for chat apps
      if (trimmedValue.length < 3) {
        return { isValid: false, error: 'Username must be at least 3 characters' };
      }
      if (trimmedValue.length > 50) {
        return { isValid: false, error: 'Username is too long' };
      }
      if (!/^[@]?[a-zA-Z0-9_]+$/.test(trimmedValue)) {
        return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
      }
      return { isValid: true };

    default:
      // Generic text validation
      if (trimmedValue.length > 200) {
        return { isValid: false, error: 'Value is too long' };
      }
      return { isValid: true };
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a channel type requires a country code
 */
export const requiresCountryCode = (channelType: string): boolean => {
  return ['mobile', 'phone', 'whatsapp'].includes(channelType);
};

/**
 * Format phone number for display (with spaces)
 */
export const formatPhoneForDisplay = (phone: string, countryCode?: string): string => {
  const digitsOnly = phone.replace(/\D/g, '');

  // Basic formatting - group digits
  if (digitsOnly.length <= 4) return digitsOnly;
  if (digitsOnly.length <= 7) return `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3)}`;
  if (digitsOnly.length <= 10) return `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 6)} ${digitsOnly.slice(6)}`;
  return `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 6)} ${digitsOnly.slice(6, 10)} ${digitsOnly.slice(10)}`;
};

/**
 * Normalize phone number (strip all formatting, keep only digits)
 */
export const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Get full phone number with country code for storage
 */
export const getFullPhoneNumber = (phone: string, countryCode: string): string => {
  const country = countries.find(c => c.code === countryCode);
  if (!country) return phone;

  const digitsOnly = normalizePhone(phone);
  return `+${country.phoneCode}${digitsOnly}`;
};

// ============================================================================
// DUPLICATE CHECK HELPERS
// ============================================================================

export interface DuplicateCheckData {
  name?: string;
  company_name?: string;
  contact_channels?: Array<{
    channel_type: string;
    value: string;
  }>;
}

/**
 * Prepares contact data for duplicate checking
 */
export const prepareDuplicateCheckData = (data: DuplicateCheckData): DuplicateCheckData => {
  const result: DuplicateCheckData = {};

  if (data.name) {
    result.name = data.name.trim();
  }

  if (data.company_name) {
    result.company_name = data.company_name.trim();
  }

  if (data.contact_channels && data.contact_channels.length > 0) {
    // Only include email and mobile for duplicate checking
    result.contact_channels = data.contact_channels
      .filter(ch => ['mobile', 'email'].includes(ch.channel_type))
      .map(ch => ({
        channel_type: ch.channel_type,
        value: ch.channel_type === 'mobile'
          ? normalizePhone(ch.value)
          : ch.value.trim().toLowerCase()
      }));
  }

  return result;
};
