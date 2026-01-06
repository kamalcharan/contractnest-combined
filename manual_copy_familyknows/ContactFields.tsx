// src/components/tenantprofile/shared/ContactFields.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Mail, Phone, Globe, AlertCircle, CheckCircle, MessageCircle } from 'lucide-react';
import { countries } from '@/utils/constants/countries';
import toast from 'react-hot-toast';

interface ContactFieldsProps {
  /** Email value */
  email?: string;
  /** Phone number value */
  phone?: string;
  /** Phone country code value */
  phoneCountryCode?: string;
  /** WhatsApp number value */
  whatsapp?: string;
  /** WhatsApp country code value */
  whatsappCountryCode?: string;
  /** Website URL value */
  website?: string;
  /** Callback when email changes */
  onEmailChange: (email: string) => void;
  /** Callback when phone changes */
  onPhoneChange: (phone: string) => void;
  /** Callback when phone country code changes */
  onPhoneCountryCodeChange: (code: string) => void;
  /** Callback when WhatsApp changes */
  onWhatsAppChange: (whatsapp: string) => void;
  /** Callback when WhatsApp country code changes */
  onWhatsAppCountryCodeChange: (code: string) => void;
  /** Callback when website changes */
  onWebsiteChange: (website: string) => void;
  /** Whether the fields are disabled */
  disabled?: boolean;
  /** Whether fields are required */
  required?: boolean;
  /** Optional custom class name */
  className?: string;
  /** Show label */
  showLabel?: boolean;
  /** Custom label text */
  labelText?: string;
  /** Show help text */
  showHelpText?: boolean;
}

const ContactFields: React.FC<ContactFieldsProps> = ({
  email = '',
  phone = '',
  phoneCountryCode = '+91',
  whatsapp = '',
  whatsappCountryCode = '+91',
  website = '',
  onEmailChange,
  onPhoneChange,
  onPhoneCountryCodeChange,
  onWhatsAppChange,
  onWhatsAppCountryCodeChange,
  onWebsiteChange,
  disabled = false,
  required = false,
  className = '',
  showLabel = true,
  labelText = 'Contact Information',
  showHelpText = true
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  // Local state for validation
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [whatsappTouched, setWhatsappTouched] = useState(false);
  const [websiteTouched, setWebsiteTouched] = useState(false);
  
  /**
   * Validate email format
   */
  const validateEmail = (value: string): string | null => {
    if (!value && required) {
      return 'Email is required';
    }
    
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email address';
    }
    
    return null;
  };
  
  /**
   * Validate phone format
   */
  const validatePhone = (value: string): string | null => {
    if (!value && required) {
      return 'Phone number is required';
    }
    
    if (value && !/^[\d\s\-\(\)]+$/.test(value)) {
      return 'Please enter a valid phone number';
    }
    
    if (value && value.replace(/\D/g, '').length < 10) {
      return 'Phone number must be at least 10 digits';
    }
    
    return null;
  };
  
  /**
   * Validate WhatsApp format (same as phone)
   */
  const validateWhatsApp = (value: string): string | null => {
    if (!value) {
      return null; // WhatsApp is always optional
    }
    
    if (!/^[\d\s\-\(\)]+$/.test(value)) {
      return 'Please enter a valid WhatsApp number';
    }
    
    if (value.replace(/\D/g, '').length < 10) {
      return 'WhatsApp number must be at least 10 digits';
    }
    
    return null;
  };
  
  /**
   * Validate website URL
   */
  const validateWebsite = (value: string): string | null => {
    if (!value && required) {
      return 'Website is required';
    }
    
    if (value) {
      // Allow URLs with or without protocol
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(value)) {
        return 'Please enter a valid website URL';
      }
    }
    
    return null;
  };
  
  /**
   * Handle email change
   */
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onEmailChange(value);
    
    if (emailTouched) {
      setEmailError(validateEmail(value));
    }
  };
  
  /**
   * Handle email blur
   */
  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmail(email));
  };
  
  /**
   * Handle phone change
   */
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onPhoneChange(value);
    
    if (phoneTouched) {
      setPhoneError(validatePhone(value));
    }
  };
  
  /**
   * Handle phone blur
   */
  const handlePhoneBlur = () => {
    setPhoneTouched(true);
    setPhoneError(validatePhone(phone));
  };
  
  /**
   * Handle WhatsApp change
   */
  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onWhatsAppChange(value);
    
    if (whatsappTouched) {
      setWhatsappError(validateWhatsApp(value));
    }
  };
  
  /**
   * Handle WhatsApp blur
   */
  const handleWhatsAppBlur = () => {
    setWhatsappTouched(true);
    setWhatsappError(validateWhatsApp(whatsapp));
  };
  
  /**
   * Handle website change
   */
  const handleWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onWebsiteChange(value);
    
    if (websiteTouched) {
      setWebsiteError(validateWebsite(value));
    }
  };
  
  /**
   * Handle website blur
   */
  const handleWebsiteBlur = () => {
    setWebsiteTouched(true);
    setWebsiteError(validateWebsite(website));
  };
  
  /**
   * Format website URL (add https:// if missing)
   */
  const formatWebsiteUrl = () => {
    if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
      const formatted = `https://${website}`;
      onWebsiteChange(formatted);
      toast.success('Website URL formatted');
    }
  };
  
  /**
   * Copy phone to WhatsApp
   */
  const copyPhoneToWhatsApp = () => {
    if (phone) {
      onWhatsAppChange(phone);
      onWhatsAppCountryCodeChange(phoneCountryCode);
      toast.success('Phone number copied to WhatsApp');
    }
  };
  
  // Common input styles
  const getInputStyles = (hasError: boolean) => ({
    borderColor: hasError 
      ? colors.semantic.error 
      : colors.utility.secondaryText + '40',
    backgroundColor: colors.utility.secondaryBackground,
    color: colors.utility.primaryText,
    '--tw-ring-color': hasError ? colors.semantic.error : colors.brand.primary
  } as React.CSSProperties);
  
  // Sort countries with common ones first
  const sortedCountries = React.useMemo(() => {
    const priority = ['IN', 'US', 'GB', 'CA', 'AU'];
    const priorityCountries = countries.filter(c => c.phoneCode && priority.includes(c.code));
    const otherCountries = countries.filter(c => c.phoneCode && !priority.includes(c.code));
    
    return [
      ...priorityCountries.sort((a, b) => priority.indexOf(a.code) - priority.indexOf(b.code)),
      ...otherCountries.sort((a, b) => a.name.localeCompare(b.name))
    ];
  }, []);
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Section Label */}
      {showLabel && (
        <div>
          <div 
            className="text-base font-medium transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            {labelText}
            {!required && (
              <span 
                className="text-sm font-normal ml-2"
                style={{ color: colors.utility.secondaryText }}
              >
                (Optional)
              </span>
            )}
          </div>
          {showHelpText && (
            <p 
              className="text-sm mt-1 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              How can people reach your organization?
            </p>
          )}
        </div>
      )}
      
      {/* Contact Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email Field */}
        <div className="space-y-2">
          <label 
            htmlFor="contact_email"
            className="block text-sm font-medium transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            <div className="flex items-center">
              <Mail 
                className="mr-2 h-4 w-4"
                style={{ color: colors.utility.secondaryText }}
              />
              Email Address
              {required && (
                <span style={{ color: colors.semantic.error }} className="ml-1">*</span>
              )}
            </div>
          </label>
          <div className="relative">
            <input
              id="contact_email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              placeholder="contact@example.com"
              className="w-full p-2 pr-10 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={getInputStyles(!!emailError)}
              disabled={disabled}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "email-error" : undefined}
            />
            {email && !emailError && emailTouched && (
              <CheckCircle 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                style={{ color: colors.semantic.success }}
              />
            )}
          </div>
          {emailError && emailTouched && (
            <div 
              id="email-error"
              className="flex items-start space-x-2 p-2 rounded-md transition-colors"
              style={{
                backgroundColor: colors.semantic.error + '10',
                borderLeft: `3px solid ${colors.semantic.error}`
              }}
              role="alert"
            >
              <AlertCircle 
                className="h-4 w-4 mt-0.5 flex-shrink-0"
                style={{ color: colors.semantic.error }}
              />
              <p 
                className="text-xs"
                style={{ color: colors.semantic.error }}
              >
                {emailError}
              </p>
            </div>
          )}
        </div>
        
        {/* Phone Field */}
        <div className="space-y-2">
          <label 
            htmlFor="contact_phone"
            className="block text-sm font-medium transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            <div className="flex items-center">
              <Phone 
                className="mr-2 h-4 w-4"
                style={{ color: colors.utility.secondaryText }}
              />
              Phone Number
              {required && (
                <span style={{ color: colors.semantic.error }} className="ml-1">*</span>
              )}
            </div>
          </label>
          <div className="flex space-x-2">
            {/* Country Code Selector */}
            <div className="w-32">
              <select
                id="contact_phone_country_code"
                value={phoneCountryCode}
                onChange={(e) => onPhoneCountryCodeChange(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
                style={getInputStyles(false)}
                disabled={disabled}
                aria-label="Phone country code"
              >
                {sortedCountries.map(country => (
                  <option key={country.code} value={`+${country.phoneCode}`}>
                    {country.code} +{country.phoneCode}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Phone Number Input */}
            <div className="flex-1 relative">
              <input
                id="contact_phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                placeholder="1234567890"
                className="w-full p-2 pr-10 border rounded-md focus:outline-none focus:ring-2 transition-colors"
                style={getInputStyles(!!phoneError)}
                disabled={disabled}
                aria-invalid={!!phoneError}
                aria-describedby={phoneError ? "phone-error" : undefined}
              />
              {phone && !phoneError && phoneTouched && (
                <CheckCircle 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                  style={{ color: colors.semantic.success }}
                />
              )}
            </div>
          </div>
          {phoneError && phoneTouched && (
            <div 
              id="phone-error"
              className="flex items-start space-x-2 p-2 rounded-md transition-colors"
              style={{
                backgroundColor: colors.semantic.error + '10',
                borderLeft: `3px solid ${colors.semantic.error}`
              }}
              role="alert"
            >
              <AlertCircle 
                className="h-4 w-4 mt-0.5 flex-shrink-0"
                style={{ color: colors.semantic.error }}
              />
              <p 
                className="text-xs"
                style={{ color: colors.semantic.error }}
              >
                {phoneError}
              </p>
            </div>
          )}
        </div>
        
        {/* WhatsApp Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="contact_whatsapp"
              className="block text-sm font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              <div className="flex items-center">
                <MessageCircle
                  className="mr-2 h-4 w-4"
                  style={{ color: '#25D366' }}
                />
                WhatsApp
              </div>
            </label>
            {phone && !whatsapp && (
              <button
                type="button"
                onClick={copyPhoneToWhatsApp}
                className="text-xs px-2 py-1 rounded hover:opacity-80 transition-colors"
                style={{
                  color: colors.brand.primary,
                  backgroundColor: colors.brand.primary + '10'
                }}
                disabled={disabled}
              >
                Copy
              </button>
            )}
          </div>
          <div className="flex space-x-2">
            {/* WhatsApp Country Code - Same format as Phone */}
            <div className="w-32">
              <select
                id="contact_whatsapp_country_code"
                value={whatsappCountryCode}
                onChange={(e) => onWhatsAppCountryCodeChange(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
                style={getInputStyles(false)}
                disabled={disabled}
                aria-label="WhatsApp country code"
              >
                {sortedCountries.map(country => (
                  <option key={country.code} value={`+${country.phoneCode}`}>
                    {country.code} +{country.phoneCode}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 relative">
              <input
                id="contact_whatsapp"
                type="tel"
                value={whatsapp}
                onChange={handleWhatsAppChange}
                onBlur={handleWhatsAppBlur}
                placeholder="1234567890"
                className="w-full p-2 pr-8 border rounded-md focus:outline-none focus:ring-2 transition-colors"
                style={getInputStyles(!!whatsappError)}
                disabled={disabled}
                aria-invalid={!!whatsappError}
                aria-describedby={whatsappError ? "whatsapp-error" : undefined}
              />
              {whatsapp && !whatsappError && whatsappTouched && (
                <CheckCircle
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
                  style={{ color: colors.semantic.success }}
                />
              )}
            </div>
          </div>
          {whatsappError && whatsappTouched && (
            <p className="text-xs" style={{ color: colors.semantic.error }}>
              {whatsappError}
            </p>
          )}
        </div>

        {/* Website Field */}
        <div className="space-y-2">
          <label 
            htmlFor="contact_website"
            className="block text-sm font-medium transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            <div className="flex items-center">
              <Globe 
                className="mr-2 h-4 w-4"
                style={{ color: colors.utility.secondaryText }}
              />
              Website
              {required && (
                <span style={{ color: colors.semantic.error }} className="ml-1">*</span>
              )}
            </div>
          </label>
          <div className="relative">
            <input
              id="contact_website"
              type="url"
              value={website}
              onChange={handleWebsiteChange}
              onBlur={handleWebsiteBlur}
              placeholder="https://example.com"
              className="w-full p-2 pr-10 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={getInputStyles(!!websiteError)}
              disabled={disabled}
              aria-invalid={!!websiteError}
              aria-describedby={websiteError ? "website-error" : undefined}
            />
            {website && !websiteError && websiteTouched && (
              <CheckCircle 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                style={{ color: colors.semantic.success }}
              />
            )}
          </div>
          {websiteError && websiteTouched && (
            <p className="text-xs" style={{ color: colors.semantic.error }}>
              {websiteError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactFields;