// src/components/subscription/modals/AddTenantDrawer.tsx
// Admin drawer to create a new tenant account with owner

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Building2,
  Mail,
  Phone,
  User,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { CreateTenantRequest } from '../../../types/tenantManagement';
import { countries } from '../../../utils/constants/countries';
import { validatePhoneByCountry, getPhonePlaceholder, getPhoneLengthDescription } from '../../../utils/validation/contactValidation';

const POPULAR_COUNTRY_CODES = ['IN', 'US', 'GB', 'AE', 'SG', 'AU', 'CA'];

interface AddTenantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTenantRequest) => Promise<void>;
  isSubmitting?: boolean;
}

export const AddTenantDrawer: React.FC<AddTenantDrawerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [isAnimating, setIsAnimating] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateTenantRequest>({
    workspace_name: '',
    first_name: '',
    last_name: '',
    email: '',
    mobile_number: '',
    country_code: 'IN',
    is_test: false,
    send_password_reset: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Sort countries
  const sortedCountries = useMemo(() => {
    const popular = countries.filter(c => POPULAR_COUNTRY_CODES.includes(c.code));
    const others = countries.filter(c => !POPULAR_COUNTRY_CODES.includes(c.code))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { popular, others };
  }, []);

  const phonePlaceholder = useMemo(() => {
    return getPhonePlaceholder(formData.country_code || 'IN');
  }, [formData.country_code]);

  const phoneLengthHint = useMemo(() => {
    return getPhoneLengthDescription(formData.country_code || 'IN');
  }, [formData.country_code]);

  // Animation
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        workspace_name: '',
        first_name: '',
        last_name: '',
        email: '',
        mobile_number: '',
        country_code: 'IN',
        is_test: false,
        send_password_reset: true
      });
      setErrors({});
      setPhoneError(null);
    }
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      onClose();
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleChange = (field: keyof CreateTenantRequest, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePhoneChange = (value: string) => {
    const digitsOnly = value.replace(/[^\d]/g, '');
    setFormData(prev => ({ ...prev, mobile_number: digitsOnly }));

    if (digitsOnly) {
      const result = validatePhoneByCountry(digitsOnly, formData.country_code || 'IN');
      setPhoneError(result.isValid ? null : result.error || null);
    } else {
      setPhoneError(null);
    }
  };

  const handleCountryChange = (newCode: string) => {
    setFormData(prev => ({ ...prev, country_code: newCode }));
    if (formData.mobile_number) {
      const result = validatePhoneByCountry(formData.mobile_number, newCode);
      setPhoneError(result.isValid ? null : result.error || null);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.workspace_name.trim()) {
      newErrors.workspace_name = 'Workspace name is required';
    }
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.mobile_number && phoneError) {
      newErrors.mobile_number = phoneError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Add phone_code if mobile number provided
    const submitData: CreateTenantRequest = { ...formData };
    if (submitData.mobile_number && submitData.country_code) {
      const country = countries.find(c => c.code === submitData.country_code);
      if (country) {
        submitData.phone_code = country.phoneCode;
      }
    }

    // Clean empty optional fields
    if (!submitData.mobile_number) {
      delete submitData.mobile_number;
      delete submitData.country_code;
      delete submitData.phone_code;
    }

    await onSubmit(submitData);
  };

  const inputStyle = (hasError: boolean) => ({
    borderColor: hasError ? colors.semantic.error : `${colors.utility.primaryText}30`,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    color: colors.utility.primaryText
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)'
        }}
        onClick={handleBackdropClick}
      />

      {/* Drawer */}
      <div
        className={`
          fixed right-0 top-0 h-full z-50 overflow-y-auto
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{
          width: 'min(480px, 90vw)',
          background: isDarkMode
            ? 'rgba(15, 23, 42, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderLeft: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between p-5"
          style={{
            background: isDarkMode
              ? 'rgba(15, 23, 42, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${colors.brand.primary}20, ${colors.brand.secondary}20)`
              }}
            >
              <Building2 size={20} style={{ color: colors.brand.primary }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
                Add Tenant
              </h2>
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                Create a new workspace with owner
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg transition-all hover:scale-105"
            style={{
              background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
            }}
          >
            <X size={18} style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Workspace Details Section */}
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: colors.utility.secondaryText }}
            >
              Workspace Details
            </h3>
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: colors.utility.primaryText }}
              >
                Workspace Name <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <div className="relative">
                <Building2
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  size={16}
                  style={{ color: colors.utility.secondaryText }}
                />
                <input
                  type="text"
                  value={formData.workspace_name}
                  onChange={(e) => handleChange('workspace_name', e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    ...inputStyle(!!errors.workspace_name),
                    '--tw-ring-color': colors.brand.primary
                  } as React.CSSProperties}
                  disabled={isSubmitting}
                />
              </div>
              {errors.workspace_name && (
                <p className="mt-1 text-xs flex items-center gap-1" style={{ color: colors.semantic.error }}>
                  <AlertCircle size={12} /> {errors.workspace_name}
                </p>
              )}
            </div>
          </div>

          {/* Owner Details Section */}
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: colors.utility.secondaryText }}
            >
              Owner Details
            </h3>
            <div className="space-y-3">
              {/* Name fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: colors.utility.primaryText }}
                  >
                    First Name <span style={{ color: colors.semantic.error }}>*</span>
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      size={16}
                      style={{ color: colors.utility.secondaryText }}
                    />
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                      placeholder="John"
                      className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors"
                      style={{
                        ...inputStyle(!!errors.first_name),
                        '--tw-ring-color': colors.brand.primary
                      } as React.CSSProperties}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.first_name && (
                    <p className="mt-1 text-xs flex items-center gap-1" style={{ color: colors.semantic.error }}>
                      <AlertCircle size={12} /> {errors.first_name}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Last Name <span style={{ color: colors.semantic.error }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors"
                    style={{
                      ...inputStyle(!!errors.last_name),
                      '--tw-ring-color': colors.brand.primary
                    } as React.CSSProperties}
                    disabled={isSubmitting}
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-xs flex items-center gap-1" style={{ color: colors.semantic.error }}>
                      <AlertCircle size={12} /> {errors.last_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: colors.utility.primaryText }}
                >
                  Email <span style={{ color: colors.semantic.error }}>*</span>
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    size={16}
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="john.doe@example.com"
                    className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors"
                    style={{
                      ...inputStyle(!!errors.email),
                      '--tw-ring-color': colors.brand.primary
                    } as React.CSSProperties}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs flex items-center gap-1" style={{ color: colors.semantic.error }}>
                    <AlertCircle size={12} /> {errors.email}
                  </p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: colors.utility.primaryText }}
                >
                  Mobile Number <span className="text-xs font-normal" style={{ color: colors.utility.secondaryText }}>(optional)</span>
                </label>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <select
                      value={formData.country_code || 'IN'}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full px-2 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors"
                      style={{
                        ...inputStyle(false),
                        '--tw-ring-color': colors.brand.primary
                      } as React.CSSProperties}
                      disabled={isSubmitting}
                    >
                      {sortedCountries.popular.map(c => (
                        <option key={c.code} value={c.code}>+{c.phoneCode} {c.name}</option>
                      ))}
                      {sortedCountries.popular.length > 0 && sortedCountries.others.length > 0 && (
                        <option disabled>──────────</option>
                      )}
                      {sortedCountries.others.map(c => (
                        <option key={c.code} value={c.code}>+{c.phoneCode} {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-7">
                    <div className="relative">
                      <Phone
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        size={16}
                        style={{ color: colors.utility.secondaryText }}
                      />
                      <input
                        type="tel"
                        value={formData.mobile_number || ''}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder={phonePlaceholder}
                        className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors"
                        style={{
                          ...inputStyle(!!phoneError),
                          '--tw-ring-color': colors.brand.primary
                        } as React.CSSProperties}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
                {phoneError && (
                  <p className="mt-1 text-xs flex items-center gap-1" style={{ color: colors.semantic.error }}>
                    <AlertCircle size={12} /> {phoneError}
                  </p>
                )}
                {!phoneError && formData.mobile_number && (
                  <p className="mt-1 text-xs" style={{ color: colors.utility.secondaryText }}>
                    {phoneLengthHint}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Settings Section */}
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: colors.utility.secondaryText }}
            >
              Settings
            </h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_test || false}
                onChange={(e) => handleChange('is_test', e.target.checked)}
                className="w-4 h-4 rounded border transition-colors"
                style={{ accentColor: colors.brand.primary }}
                disabled={isSubmitting}
              />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Mark as Test Account
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer mt-3">
              <input
                type="checkbox"
                checked={formData.send_password_reset !== false}
                onChange={(e) => handleChange('send_password_reset', e.target.checked)}
                className="w-4 h-4 rounded border transition-colors"
                style={{ accentColor: colors.brand.primary }}
                disabled={isSubmitting}
              />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Send password reset email to owner
              </span>
            </label>
          </div>

          {/* Info Banner */}
          <div
            className="flex items-start gap-3 p-3.5 rounded-xl"
            style={{
              background: formData.send_password_reset !== false
                ? `${colors.brand.primary}10`
                : `${colors.semantic.warning || '#f59e0b'}10`,
              border: `1px solid ${formData.send_password_reset !== false
                ? `${colors.brand.primary}20`
                : `${colors.semantic.warning || '#f59e0b'}20`}`
            }}
          >
            <Info
              size={16}
              className="mt-0.5 flex-shrink-0"
              style={{ color: formData.send_password_reset !== false ? colors.brand.primary : (colors.semantic.warning || '#f59e0b') }}
            />
            <p className="text-xs leading-relaxed" style={{ color: colors.utility.secondaryText }}>
              {formData.send_password_reset !== false
                ? 'A password reset email will be sent to the owner automatically. They will set their own password — no password is shared.'
                : 'No email will be sent to the owner. You will need to manually trigger a password reset later from the tenant details.'}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary})`
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating Tenant...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Create Tenant Account
              </>
            )}
          </button>
        </form>
      </div>
    </>
  );
};
