// src/components/tenantprofile/OrganizationDetailsForm.tsx
// Card-based layout: Card 1 (Identity), Card 2 (Contact), Card 3 (Address)
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Building2, Phone, MapPin, User, Mail, Globe, MessageCircle, Calendar } from 'lucide-react';
import { TenantProfile } from '@/hooks/useTenantProfile';
import { countries } from '@/utils/constants/countries';
import LogoUploadField from '@/components/tenantprofile/shared/LogoUploadField';
import BrandColorPicker from '@/components/tenantprofile/shared/BrandColorPicker';

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

  // Card container styles
  const cardStyles = {
    backgroundColor: colors.utility.secondaryBackground,
    borderColor: colors.utility.secondaryText + '20',
  };

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
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CARD 1: Organization Identity                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div
        className="rounded-lg border p-5 transition-colors"
        style={cardStyles}
      >
        <div className="flex items-center mb-4">
          <Building2
            className="mr-2 h-5 w-5"
            style={{ color: colors.brand.primary }}
          />
          <h3
            className="text-base font-medium"
            style={{ color: colors.utility.primaryText }}
          >
            Organization Identity
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left: Logo */}
          <div className="flex justify-center md:justify-start">
            <LogoUploadField
              logoUrl={formData.logo_url}
              onLogoChange={onLogoChange}
              disabled={disabled}
              showLabel={false}
            />
          </div>

          {/* Right: Name + Brand Colors */}
          <div className="space-y-4">
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

            {/* Brand Colors - Inline */}
            <BrandColorPicker
              primaryColor={formData.primary_color || '#4F46E5'}
              secondaryColor={formData.secondary_color || '#10B981'}
              onPrimaryColorChange={(value) => onUpdate('primary_color', value)}
              onSecondaryColorChange={(value) => onUpdate('secondary_color', value)}
              disabled={disabled}
              showLabel={false}
              compact={true}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CARD 2: Contact Information                                     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div
        className="rounded-lg border p-5 transition-colors"
        style={cardStyles}
      >
        <div className="flex items-center mb-4">
          <Phone
            className="mr-2 h-5 w-5"
            style={{ color: colors.brand.primary }}
          />
          <h3
            className="text-base font-medium"
            style={{ color: colors.utility.primaryText }}
          >
            Contact Information
          </h3>
        </div>

        <div className="space-y-4">
          {/* Contact Person Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="contact_first_name"
                className="block text-sm font-medium transition-colors flex items-center"
                style={{ color: colors.utility.primaryText }}
              >
                <User className="mr-1.5 h-4 w-4" style={{ color: colors.utility.secondaryText }} />
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

          {/* Email + Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="business_email"
                className="block text-sm font-medium transition-colors flex items-center"
                style={{ color: colors.utility.primaryText }}
              >
                <Mail className="mr-1.5 h-4 w-4" style={{ color: colors.utility.secondaryText }} />
                Email
              </label>
              <input
                id="business_email"
                type="email"
                value={formData.business_email || ''}
                onChange={(e) => onUpdate('business_email', e.target.value)}
                placeholder="contact@example.com"
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
                style={getInputStyles()}
                disabled={disabled}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label
                htmlFor="business_phone"
                className="block text-sm font-medium transition-colors flex items-center"
                style={{ color: colors.utility.primaryText }}
              >
                <Phone className="mr-1.5 h-4 w-4" style={{ color: colors.utility.secondaryText }} />
                Phone
              </label>
              <div className="flex space-x-2">
                <select
                  value={formData.business_phone_country_code || '+91'}
                  onChange={(e) => onUpdate('business_phone_country_code', e.target.value)}
                  className="w-28 p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors text-sm"
                  style={getInputStyles()}
                  disabled={disabled}
                >
                  {sortedCountries.map(country => (
                    <option key={country.code} value={`+${country.phoneCode}`}>
                      {country.code} +{country.phoneCode}
                    </option>
                  ))}
                </select>
                <input
                  id="business_phone"
                  type="tel"
                  value={formData.business_phone || ''}
                  onChange={(e) => onUpdate('business_phone', e.target.value)}
                  placeholder="1234567890"
                  className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
                  style={getInputStyles()}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          {/* WhatsApp + Website */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* WhatsApp */}
            <div className="space-y-2">
              <label
                htmlFor="business_whatsapp"
                className="block text-sm font-medium transition-colors flex items-center"
                style={{ color: colors.utility.primaryText }}
              >
                <MessageCircle className="mr-1.5 h-4 w-4" style={{ color: '#25D366' }} />
                WhatsApp
              </label>
              <div className="flex space-x-2">
                <select
                  value={formData.business_whatsapp_country_code || '+91'}
                  onChange={(e) => onUpdate('business_whatsapp_country_code', e.target.value)}
                  className="w-28 p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors text-sm"
                  style={getInputStyles()}
                  disabled={disabled}
                >
                  {sortedCountries.map(country => (
                    <option key={country.code} value={`+${country.phoneCode}`}>
                      {country.code} +{country.phoneCode}
                    </option>
                  ))}
                </select>
                <input
                  id="business_whatsapp"
                  type="tel"
                  value={formData.business_whatsapp || ''}
                  onChange={(e) => onUpdate('business_whatsapp', e.target.value)}
                  placeholder="1234567890"
                  className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
                  style={getInputStyles()}
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Website */}
            <div className="space-y-2">
              <label
                htmlFor="website_url"
                className="block text-sm font-medium transition-colors flex items-center"
                style={{ color: colors.utility.primaryText }}
              >
                <Globe className="mr-1.5 h-4 w-4" style={{ color: colors.utility.secondaryText }} />
                Website
              </label>
              <input
                id="website_url"
                type="url"
                value={formData.website_url || ''}
                onChange={(e) => onUpdate('website_url', e.target.value)}
                placeholder="https://example.com"
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
                style={getInputStyles()}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Booking URL */}
          <div className="space-y-2">
            <label
              htmlFor="booking_url"
              className="block text-sm font-medium transition-colors flex items-center"
              style={{ color: colors.utility.primaryText }}
            >
              <Calendar className="mr-1.5 h-4 w-4" style={{ color: colors.utility.secondaryText }} />
              Booking Link
            </label>
            <input
              id="booking_url"
              type="url"
              value={formData.booking_url || ''}
              onChange={(e) => onUpdate('booking_url', e.target.value)}
              placeholder="https://calendly.com/your-link"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={getInputStyles()}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CARD 3: Address                                                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div
        className="rounded-lg border p-5 transition-colors"
        style={cardStyles}
      >
        <div className="flex items-center mb-4">
          <MapPin
            className="mr-2 h-5 w-5"
            style={{ color: colors.brand.primary }}
          />
          <h3
            className="text-base font-medium"
            style={{ color: colors.utility.primaryText }}
          >
            Address
          </h3>
        </div>

        <div className="space-y-4">
          {/* Address Lines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
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
                placeholder="Street address"
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
                style={getInputStyles()}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
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
                placeholder="Apartment, suite, etc."
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
                style={getInputStyles()}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Country + State + City + Postal */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <option value="">Select</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="state_code"
                className="block text-sm font-medium transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                State
              </label>
              <input
                id="state_code"
                type="text"
                value={formData.state_code || ''}
                onChange={(e) => onUpdate('state_code', e.target.value)}
                placeholder="State"
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
                style={getInputStyles()}
                disabled={disabled}
              />
            </div>

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
                placeholder="Postal"
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
                style={getInputStyles()}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationDetailsForm;
