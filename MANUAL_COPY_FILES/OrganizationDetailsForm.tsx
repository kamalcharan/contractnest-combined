// src/components/tenantprofile/OrganizationDetailsForm.tsx
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { MapPin, Calendar, User } from 'lucide-react';
import { TenantProfile } from '@/hooks/useTenantProfile';
import { countries } from '@/utils/constants/countries';
import LogoUploadField from '@/components/tenantprofile/shared/LogoUploadField';
import BrandColorPicker from '@/components/tenantprofile/shared/BrandColorPicker';
import ContactFields from '@/components/tenantprofile/shared/ContactFields';

interface OrganizationDetailsFormProps {
  formData: TenantProfile;
  onUpdate: (field: keyof TenantProfile, value: any) => void;
  onLogoChange: (file: File | null) => void;
  disabled?: boolean;
}

const OrganizationDetailsForm: React.FC<OrganizationDetailsFormProps> = ({
  formData,
  onUpdate,
  onLogoChange,
  disabled = false
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Common input styles
  const getInputStyles = () => ({
    borderColor: colors.utility.secondaryText + '40',
    backgroundColor: colors.utility.secondaryBackground,
    color: colors.utility.primaryText,
    '--tw-ring-color': colors.brand.primary
  } as React.CSSProperties);
  
  return (
    <div className="space-y-8">
      {/* Organization Logo */}
      <LogoUploadField
        logoUrl={formData.logo_url}
        onLogoChange={onLogoChange}
        disabled={disabled}
        showLabel={true}
        labelText="Organization Logo"
      />
      
      {/* Organization Details */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Organization Name */}
          <div className="space-y-2">
            <label
              htmlFor="business_name"
              className="block text-sm font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Organization Name <span style={{ color: colors.semantic.error }}>*</span>
            </label>
            <input
              id="business_name"
              type="text"
              value={formData.business_name || ''}
              onChange={(e) => onUpdate('business_name', e.target.value)}
              placeholder="Enter your organization name"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={getInputStyles()}
              disabled={disabled}
              required
            />
          </div>

          {/* Empty space for alignment or future field */}
          <div></div>
        </div>
      </div>

      {/* Contact Person */}
      <div className="space-y-4">
        <div>
          <div
            className="text-base font-medium flex items-center transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            <User
              className="mr-2 h-5 w-5"
              style={{ color: colors.brand.primary }}
            />
            Contact Person
          </div>
          <p
            className="text-sm mt-1 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Primary contact for your organization
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* First Name */}
          <div className="space-y-2">
            <label
              htmlFor="contact_first_name"
              className="block text-sm font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              First Name
            </label>
            <input
              id="contact_first_name"
              type="text"
              value={formData.contact_first_name || ''}
              onChange={(e) => onUpdate('contact_first_name', e.target.value)}
              placeholder="First name"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={getInputStyles()}
              disabled={disabled}
            />
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <label
              htmlFor="contact_last_name"
              className="block text-sm font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Last Name
            </label>
            <input
              id="contact_last_name"
              type="text"
              value={formData.contact_last_name || ''}
              onChange={(e) => onUpdate('contact_last_name', e.target.value)}
              placeholder="Last name"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={getInputStyles()}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Contact Information - Using Shared Component with WhatsApp */}
      <ContactFields
        email={formData.business_email || ''}
        phone={formData.business_phone || ''}
        phoneCountryCode={formData.business_phone_country_code || '+91'}
        whatsapp={formData.business_whatsapp || ''}
        whatsappCountryCode={formData.business_whatsapp_country_code || '+91'}
        website={formData.website_url || ''}
        onEmailChange={(value) => onUpdate('business_email', value)}
        onPhoneChange={(value) => onUpdate('business_phone', value)}
        onPhoneCountryCodeChange={(value) => onUpdate('business_phone_country_code', value)}
        onWhatsAppChange={(value) => onUpdate('business_whatsapp', value)}
        onWhatsAppCountryCodeChange={(value) => onUpdate('business_whatsapp_country_code', value)}
        onWebsiteChange={(value) => onUpdate('website_url', value)}
        disabled={disabled}
        required={false}
        showLabel={true}
        labelText="Contact Information"
        showHelpText={true}
      />

      {/* Business Tools */}
      <div className="space-y-6">
        <div>
          <div
            className="text-base font-medium flex items-center transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            <Calendar
              className="mr-2 h-5 w-5"
              style={{ color: colors.brand.primary }}
            />
            Business Tools
          </div>
          <p
            className="text-sm mt-1 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Links for scheduling and resources
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Booking URL */}
          <div className="space-y-2">
            <label
              htmlFor="booking_url"
              className="block text-sm font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Appointment Booking Link
            </label>
            <input
              id="booking_url"
              type="url"
              value={formData.booking_url || ''}
              onChange={(e) => onUpdate('booking_url', e.target.value)}
              placeholder="https://calendly.com/your-link or https://cal.com/your-link"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={getInputStyles()}
              disabled={disabled}
            />
            <p
              className="text-xs transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Calendly, Cal.com, or any scheduling link for the "Book Appointment" feature
            </p>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="space-y-6">
        <div>
          <div 
            className="text-base font-medium flex items-center transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            <MapPin 
              className="mr-2 h-5 w-5"
              style={{ color: colors.brand.primary }}
            />
            Address Information
          </div>
          <p 
            className="text-sm mt-1 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Where your organization is located
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Address Line 1 */}
          <div className="space-y-2 md:col-span-2">
            <label 
              htmlFor="address_line1" 
              className="block text-sm font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Address Line 1
            </label>
            <input
              id="address_line1"
              type="text"
              value={formData.address_line1 || ''}
              onChange={(e) => onUpdate('address_line1', e.target.value)}
              placeholder="Street address, P.O. box, company name"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={getInputStyles()}
              disabled={disabled}
            />
          </div>
          
          {/* Address Line 2 */}
          <div className="space-y-2 md:col-span-2">
            <label 
              htmlFor="address_line2" 
              className="block text-sm font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Address Line 2
            </label>
            <input
              id="address_line2"
              type="text"
              value={formData.address_line2 || ''}
              onChange={(e) => onUpdate('address_line2', e.target.value)}
              placeholder="Apartment, suite, unit, building, floor, etc."
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={getInputStyles()}
              disabled={disabled}
            />
          </div>
          
          {/* Country */}
          <div className="space-y-2">
            <label 
              htmlFor="country_code" 
              className="block text-sm font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Country
            </label>
            <select
              id="country_code"
              value={formData.country_code || ''}
              onChange={(e) => onUpdate('country_code', e.target.value)}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={getInputStyles()}
              disabled={disabled}
            >
              <option value="">Select a country</option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* State/Province */}
          <div className="space-y-2">
            <label 
              htmlFor="state_code" 
              className="block text-sm font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              State/Province
            </label>
            <input
              id="state_code"
              type="text"
              value={formData.state_code || ''}
              onChange={(e) => onUpdate('state_code', e.target.value)}
              placeholder="State or province"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={getInputStyles()}
              disabled={disabled}
            />
          </div>
          
          {/* City */}
          <div className="space-y-2">
            <label 
              htmlFor="city" 
              className="block text-sm font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              City
            </label>
            <input
              id="city"
              type="text"
              value={formData.city || ''}
              onChange={(e) => onUpdate('city', e.target.value)}
              placeholder="City"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={getInputStyles()}
              disabled={disabled}
            />
          </div>
          
          {/* Postal/Zip Code */}
          <div className="space-y-2">
            <label 
              htmlFor="postal_code" 
              className="block text-sm font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Postal Code
            </label>
            <input
              id="postal_code"
              type="text"
              value={formData.postal_code || ''}
              onChange={(e) => onUpdate('postal_code', e.target.value)}
              placeholder="Postal or ZIP code"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={getInputStyles()}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
      
      {/* Brand Colors - Using Shared Component */}
      <BrandColorPicker
        primaryColor={formData.primary_color || '#4F46E5'}
        secondaryColor={formData.secondary_color || '#10B981'}
        onPrimaryColorChange={(value) => onUpdate('primary_color', value)}
        onSecondaryColorChange={(value) => onUpdate('secondary_color', value)}
        disabled={disabled}
        showLabel={true}
        labelText="Brand Colors"
      />
    </div>
  );
};

export default OrganizationDetailsForm;