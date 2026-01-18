// src/components/contacts/QuickAddContactDrawer.tsx - REFACTORED to use Lucide icons
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X,
  User,
  Building2,
  Plus,
  Trash2,
  Loader2,
  ChevronRight,
  Mail,
  Phone,
  MessageSquare,
  Globe,
  ShoppingCart,
  DollarSign,
  Package,
  Handshake,
  Users,
  LucideIcon
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCreateContact } from '../../hooks/useContacts';
import {
  SALUTATIONS,
  CONTACT_CLASSIFICATION_CONFIG,
  getClassificationColors
} from '../../utils/constants/contacts';
import { CHANNELS, getChannelByCode, formatChannelValue, validateChannelValueWithError } from '../../utils/constants/channels';
import { countries, getPhoneLengthForCountry } from '../../utils/constants/countries';
import {
  validateIndividualName,
  validateCompanyName,
  validateChannelValue,
  getPhoneLengthDescription,
  prepareDuplicateCheckData
} from '../../utils/validation/contactValidation';
import { useCheckDuplicates } from '../../hooks/useContacts';

// Lucide icon mapping from string names in constants
const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  ShoppingCart,
  DollarSign,
  Package,
  Handshake,
  Users
};

// ============================================================================
// TYPES
// ============================================================================

interface QuickAddContactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (contactId: string) => void;
}

interface ChannelInput {
  id: string;
  channel_type: string;
  value: string;
  country_code?: string;
}

interface QuickFormData {
  classifications: string[];
  type: 'individual' | 'corporate';
  salutation?: string;
  name: string;
  company_name: string;
  contact_channels: ChannelInput[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Common countries for quick selection
const COMMON_COUNTRY_CODES = ['IN', 'US', 'GB', 'AE', 'SG', 'MY', 'AU'];
const sortedCountries = [
  ...countries.filter(c => COMMON_COUNTRY_CODES.includes(c.code)),
  ...countries.filter(c => !COMMON_COUNTRY_CODES.includes(c.code))
];

// Quick Add uses subset of channels - sorted by order
const QUICK_ADD_CHANNELS = CHANNELS.filter(ch =>
  ['mobile', 'email', 'whatsapp'].includes(ch.code)
).sort((a, b) => a.order - b.order);

// Classifications loaded from CONTACT_CLASSIFICATION_CONFIG constant

// ============================================================================
// COMPONENT
// ============================================================================

const QuickAddContactDrawer: React.FC<QuickAddContactDrawerProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { currentTenant, user, isLive } = useAuth();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // API Hooks
  const createContactHook = useCreateContact();
  const checkDuplicatesHook = useCheckDuplicates();

  // Race condition prevention
  const isSavingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Duplicate confirmation state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateContacts, setDuplicateContacts] = useState<any[]>([]);
  const [skipDuplicateCheck, setSkipDuplicateCheck] = useState(false);

  // Form state
  const [formData, setFormData] = useState<QuickFormData>({
    classifications: [],
    type: 'individual',
    salutation: '',
    name: '',
    company_name: '',
    contact_channels: [{ id: 'channel_1', channel_type: 'mobile', value: '', country_code: 'IN' }]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        classifications: [],
        type: 'individual',
        salutation: '',
        name: '',
        company_name: '',
        contact_channels: [{ id: 'channel_1', channel_type: 'mobile', value: '', country_code: 'IN' }]
      });
      setErrors({});
      setIsSaving(false);
      isSavingRef.current = false;
    }

    // Cleanup on close
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSaving, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Update form data helper
  const updateFormData = useCallback((updates: Partial<QuickFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear related errors
    Object.keys(updates).forEach(key => {
      if (errors[key]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    });
  }, [errors]);

  // Toggle classification
  const toggleClassification = (value: string) => {
    setFormData(prev => {
      const exists = prev.classifications.includes(value);
      return {
        ...prev,
        classifications: exists
          ? prev.classifications.filter(c => c !== value)
          : [...prev.classifications, value]
      };
    });
    if (errors.classifications) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.classifications;
        return newErrors;
      });
    }
  };

  // Add channel
  const addChannel = () => {
    const newId = `channel_${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      contact_channels: [
        ...prev.contact_channels,
        { id: newId, channel_type: 'mobile', value: '', country_code: 'IN' }
      ]
    }));
  };

  // Remove channel
  const removeChannel = (id: string) => {
    if (formData.contact_channels.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      contact_channels: prev.contact_channels.filter(c => c.id !== id)
    }));
  };

  // Update channel
  const updateChannel = (id: string, field: 'channel_type' | 'value' | 'country_code', value: string) => {
    setFormData(prev => ({
      ...prev,
      contact_channels: prev.contact_channels.map(c => {
        if (c.id !== id) return c;

        // When changing channel type, set/clear country_code based on new type
        if (field === 'channel_type') {
          const channelConfig = getChannelByCode(value);
          return {
            ...c,
            channel_type: value,
            country_code: channelConfig?.validation.requiresCountryCode ? (c.country_code || 'IN') : undefined
          };
        }

        return { ...c, [field]: value };
      })
    }));
    if (errors.contact_channels) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.contact_channels;
        return newErrors;
      });
    }
  };

  // Validate form with country-aware phone validation and name character validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Classification validation
    if (formData.classifications.length === 0) {
      newErrors.classifications = 'Select at least one classification';
    }

    // Name validation with character restrictions
    if (formData.type === 'individual') {
      const nameValidation = validateIndividualName(formData.name);
      if (!nameValidation.isValid) {
        newErrors.name = nameValidation.error || 'Invalid name';
      }
    }

    // Company name validation
    if (formData.type === 'corporate') {
      const companyValidation = validateCompanyName(formData.company_name);
      if (!companyValidation.isValid) {
        newErrors.company_name = companyValidation.error || 'Invalid company name';
      }
    }

    // Channel validation - at least one required
    const validChannels = formData.contact_channels.filter(c => c.value.trim());
    if (validChannels.length === 0) {
      newErrors.contact_channels = 'At least one contact channel is required';
    } else {
      // Validate each channel with appropriate validation (country-aware for phones)
      for (const channel of formData.contact_channels) {
        if (!channel.value.trim()) continue;

        const channelValidation = validateChannelValue(
          channel.channel_type as any,
          channel.value,
          channel.country_code
        );

        if (!channelValidation.isValid) {
          newErrors.contact_channels = channelValidation.error || 'Invalid contact channel';
          break;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save with race condition prevention and duplicate check
  const handleSave = async (forceCreate: boolean = false) => {
    // Prevent double submission
    if (isSavingRef.current || isSaving) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    // Set saving state
    isSavingRef.current = true;
    setIsSaving(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Prepare contact data
      const contactData = {
        type: formData.type,
        classifications: formData.classifications,
        status: 'active' as const,
        name: formData.type === 'individual' ? formData.name.trim() : undefined,
        salutation: formData.type === 'individual' && formData.salutation ? formData.salutation : undefined,
        company_name: formData.type === 'corporate' ? formData.company_name.trim() : undefined,
        contact_channels: formData.contact_channels
          .filter(c => c.value.trim())
          .map(c => {
            const channelConfig = getChannelByCode(c.channel_type);
            // Format value with country code for phone-type channels
            const formattedValue = channelConfig
              ? formatChannelValue(channelConfig, c.value.trim(), c.country_code)
              : c.value.trim();
            return {
              channel_type: c.channel_type,
              value: formattedValue,
              country_code: c.country_code,
              is_primary: c.id === formData.contact_channels[0]?.id
            };
          }),
        addresses: [],
        compliance_numbers: [],
        contact_persons: [],
        tags: [],
        tenant_id: currentTenant?.id,
        is_live: isLive,
        created_by: user?.id || null,
        t_userprofile_id: null,
        auth_user_id: null
      };

      // Check for duplicates before creating (unless force create)
      if (!forceCreate && !skipDuplicateCheck) {
        try {
          const duplicateCheckData = prepareDuplicateCheckData({
            name: contactData.name,
            company_name: contactData.company_name,
            contact_channels: contactData.contact_channels
          });

          const duplicateResult = await checkDuplicatesHook.mutate(duplicateCheckData);

          if (duplicateResult?.has_duplicates && duplicateResult.duplicates?.length > 0) {
            // Show duplicate warning
            setDuplicateContacts(duplicateResult.duplicates);
            setShowDuplicateWarning(true);
            isSavingRef.current = false;
            setIsSaving(false);
            return;
          }
        } catch (dupError) {
          // If duplicate check fails, continue with creation
          console.warn('Duplicate check failed, proceeding with creation:', dupError);
        }
      }

      const result = await createContactHook.mutate(contactData);

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Success
      setShowDuplicateWarning(false);
      setDuplicateContacts([]);
      if (onSuccess) {
        onSuccess(result.id);
      }
      onClose();

    } catch (error: any) {
      // Check if this is an abort error
      if (error.name === 'AbortError') {
        return;
      }

      setErrors({ submit: error.message || 'Failed to create contact. Please try again.' });
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
      abortControllerRef.current = null;
    }
  };

  // Handle confirm create after duplicate warning
  const handleConfirmCreate = () => {
    setShowDuplicateWarning(false);
    setSkipDuplicateCheck(true);
    handleSave(true);
  };

  // Handle cancel duplicate warning
  const handleCancelDuplicateWarning = () => {
    setShowDuplicateWarning(false);
    setDuplicateContacts([]);
  };

  // Navigate to advanced create
  const handleAdvancedCreate = () => {
    // Pass current form data to full create page via state
    navigate('/contacts/create', {
      state: {
        prefill: {
          type: formData.type,
          classifications: formData.classifications,
          salutation: formData.salutation,
          name: formData.name,
          company_name: formData.company_name,
          contact_channels: formData.contact_channels.filter(c => c.value.trim())
        }
      }
    });
    onClose();
  };

  // Get Lucide icon for classification - uses constants lucideIcon property
  const getClassificationIcon = (lucideIconName: string): LucideIcon => {
    return LUCIDE_ICON_MAP[lucideIconName] || Users;
  };

  if (!isOpen) return null;

  // Glass effect styles
  const glassStyle = {
    background: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(12px)',
    borderLeft: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)'}`,
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={() => !isSaving && onClose()}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-[580px] z-50 flex flex-col shadow-2xl transform transition-transform duration-400 ease-out"
        style={{
          ...glassStyle,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div
          className="p-6 border-b flex justify-between items-center"
          style={{ borderColor: colors.utility.primaryText + '15' }}
        >
          <div>
            <h2
              className="text-xl font-bold"
              style={{ color: colors.utility.primaryText }}
            >
              Quick Add Contact
            </h2>
            <p
              className="text-xs mt-1"
              style={{ color: colors.utility.secondaryText }}
            >
              Add a new contact quickly
            </p>
          </div>
          <button
            onClick={() => !isSaving && onClose()}
            disabled={isSaving}
            className="p-2 rounded-lg hover:opacity-80 transition-colors disabled:opacity-50"
            style={{ color: colors.utility.secondaryText }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Classification */}
          <div className="space-y-3">
            <h3
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: colors.brand.primary }}
            >
              1. Classification *
            </h3>
            <div className="flex flex-wrap gap-2">
              {CONTACT_CLASSIFICATION_CONFIG.map(cls => {
                const isSelected = formData.classifications.includes(cls.id);
                const colorSet = getClassificationColors(cls.colorKey, colors, 'selector', isSelected);
                const IconComponent = getClassificationIcon(cls.lucideIcon);
                return (
                  <button
                    key={cls.id}
                    onClick={() => toggleClassification(cls.id)}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all disabled:opacity-50 flex items-center gap-2"
                    style={{
                      backgroundColor: colorSet.bg,
                      borderColor: colorSet.border,
                      color: colorSet.text,
                    }}
                  >
                    <IconComponent className="h-4 w-4" />
                    {cls.label}
                  </button>
                );
              })}
            </div>
            {errors.classifications && (
              <p className="text-xs" style={{ color: colors.semantic.error }}>
                {errors.classifications}
              </p>
            )}
          </div>

          {/* Section 2: Account Type */}
          <div className="space-y-3">
            <h3
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: colors.brand.primary }}
            >
              2. Account Type *
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Individual */}
              <button
                onClick={() => updateFormData({ type: 'individual' })}
                disabled={isSaving}
                className="p-4 rounded-xl border-2 transition-all disabled:opacity-50 text-left"
                style={{
                  backgroundColor: formData.type === 'individual'
                    ? colors.brand.primary + '15'
                    : 'transparent',
                  borderColor: formData.type === 'individual'
                    ? colors.brand.primary
                    : colors.utility.primaryText + '20',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: formData.type === 'individual'
                        ? colors.brand.primary
                        : colors.utility.secondaryText + '20',
                    }}
                  >
                    <User
                      className="h-5 w-5"
                      style={{
                        color: formData.type === 'individual'
                          ? '#ffffff'
                          : colors.utility.secondaryText,
                      }}
                    />
                  </div>
                  <div>
                    <p
                      className="font-semibold text-sm"
                      style={{
                        color: formData.type === 'individual'
                          ? colors.brand.primary
                          : colors.utility.primaryText,
                      }}
                    >
                      Individual
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Person
                    </p>
                  </div>
                </div>
              </button>

              {/* Corporate */}
              <button
                onClick={() => updateFormData({ type: 'corporate' })}
                disabled={isSaving}
                className="p-4 rounded-xl border-2 transition-all disabled:opacity-50 text-left"
                style={{
                  backgroundColor: formData.type === 'corporate'
                    ? colors.brand.primary + '15'
                    : 'transparent',
                  borderColor: formData.type === 'corporate'
                    ? colors.brand.primary
                    : colors.utility.primaryText + '20',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: formData.type === 'corporate'
                        ? colors.brand.primary
                        : colors.utility.secondaryText + '20',
                    }}
                  >
                    <Building2
                      className="h-5 w-5"
                      style={{
                        color: formData.type === 'corporate'
                          ? '#ffffff'
                          : colors.utility.secondaryText,
                      }}
                    />
                  </div>
                  <div>
                    <p
                      className="font-semibold text-sm"
                      style={{
                        color: formData.type === 'corporate'
                          ? colors.brand.primary
                          : colors.utility.primaryText,
                      }}
                    >
                      Corporate
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Company
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 3: Identity */}
          <div className="space-y-3">
            <h3
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: colors.brand.primary }}
            >
              3. Identity *
            </h3>

            {formData.type === 'individual' ? (
              <div className="space-y-3">
                {/* Salutation + Name */}
                <div className="flex gap-3">
                  <div className="w-28">
                    <label
                      className="text-[11px] font-bold mb-1 block"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Salutation
                    </label>
                    <select
                      value={formData.salutation || ''}
                      onChange={(e) => updateFormData({ salutation: e.target.value })}
                      disabled={isSaving}
                      className="w-full p-3 rounded-xl border-2 text-sm transition-all focus:outline-none disabled:opacity-50"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: colors.utility.primaryText + '20',
                        color: colors.utility.primaryText,
                      }}
                    >
                      <option value="">--</option>
                      {SALUTATIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label
                      className="text-[11px] font-bold mb-1 block"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormData({ name: e.target.value })}
                      disabled={isSaving}
                      placeholder="John Doe"
                      className="w-full p-3 rounded-xl border-2 text-sm transition-all focus:outline-none disabled:opacity-50"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: errors.name ? colors.semantic.error : colors.utility.primaryText + '20',
                        color: colors.utility.primaryText,
                      }}
                    />
                    {errors.name && (
                      <p className="text-xs mt-1" style={{ color: colors.semantic.error }}>
                        {errors.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label
                  className="text-[11px] font-bold mb-1 block"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => updateFormData({ company_name: e.target.value })}
                  disabled={isSaving}
                  placeholder="Acme Corporation"
                  className="w-full p-3 rounded-xl border-2 text-sm transition-all focus:outline-none disabled:opacity-50"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: errors.company_name ? colors.semantic.error : colors.utility.primaryText + '20',
                    color: colors.utility.primaryText,
                  }}
                />
                {errors.company_name && (
                  <p className="text-xs mt-1" style={{ color: colors.semantic.error }}>
                    {errors.company_name}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Channels */}
          <div className="space-y-3">
            <h3
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: colors.brand.primary }}
            >
              4. Contact Channels *
            </h3>

            <div className="space-y-3">
              {formData.contact_channels.map((channel, index) => {
                const channelConfig = getChannelByCode(channel.channel_type);
                const requiresCountryCode = channelConfig?.validation.requiresCountryCode;

                return (
                  <div key={channel.id} className="flex gap-2">
                    {/* Channel Type */}
                    <select
                      value={channel.channel_type}
                      onChange={(e) => updateChannel(channel.id, 'channel_type', e.target.value)}
                      disabled={isSaving}
                      className="w-28 p-3 rounded-xl border-2 text-sm transition-all focus:outline-none disabled:opacity-50"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: colors.utility.primaryText + '20',
                        color: colors.utility.primaryText,
                      }}
                    >
                      {QUICK_ADD_CHANNELS.map(ch => (
                        <option key={ch.code} value={ch.code}>{ch.displayName}</option>
                      ))}
                    </select>

                    {/* Country Code (for phone-type channels) */}
                    {requiresCountryCode && (
                      <select
                        value={channel.country_code || 'IN'}
                        onChange={(e) => updateChannel(channel.id, 'country_code', e.target.value)}
                        disabled={isSaving}
                        className="w-24 p-3 rounded-xl border-2 text-sm transition-all focus:outline-none disabled:opacity-50"
                        style={{
                          backgroundColor: colors.utility.primaryBackground,
                          borderColor: colors.utility.primaryText + '20',
                          color: colors.utility.primaryText,
                        }}
                      >
                        {sortedCountries.map(country => (
                          <option key={country.code} value={country.code}>
                            +{country.phoneCode}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Value Input */}
                    <div className="flex-1 relative">
                      <input
                        type={channel.channel_type === 'email' ? 'email' : 'tel'}
                        value={channel.value}
                        onChange={(e) => {
                          let inputValue = e.target.value;
                          // For phone types, only allow digits
                          if (requiresCountryCode) {
                            inputValue = inputValue.replace(/\D/g, '');
                          }
                          updateChannel(channel.id, 'value', inputValue);
                        }}
                        disabled={isSaving}
                        placeholder={
                          requiresCountryCode && channel.country_code
                            ? `Enter ${getPhoneLengthDescription(channel.country_code)}`
                            : (channelConfig?.placeholder || 'Enter value')
                        }
                        className="w-full p-3 rounded-xl border-2 text-sm transition-all focus:outline-none disabled:opacity-50"
                        style={{
                          backgroundColor: colors.utility.primaryBackground,
                          borderColor: errors.contact_channels && index === 0 ? colors.semantic.error : colors.utility.primaryText + '20',
                          color: colors.utility.primaryText,
                        }}
                      />
                      {/* Show digit count hint for phone fields */}
                      {requiresCountryCode && channel.value && channel.country_code && (
                        <span
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                          style={{
                            color: (() => {
                              const { min, max } = getPhoneLengthForCountry(channel.country_code);
                              const digitCount = channel.value.replace(/\D/g, '').length;
                              if (digitCount < min) return colors.semantic.warning;
                              if (digitCount > max) return colors.semantic.error;
                              return colors.semantic.success;
                            })()
                          }}
                        >
                          {channel.value.replace(/\D/g, '').length}/{(() => {
                            const { min, max } = getPhoneLengthForCountry(channel.country_code);
                            return min === max ? min : `${min}-${max}`;
                          })()}
                        </span>
                      )}
                    </div>

                    {/* Remove Button */}
                    {formData.contact_channels.length > 1 && (
                      <button
                        onClick={() => removeChannel(channel.id)}
                        disabled={isSaving}
                        className="p-3 rounded-xl border-2 hover:opacity-80 transition-all disabled:opacity-50"
                        style={{
                          borderColor: colors.semantic.error + '40',
                          color: colors.semantic.error,
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {errors.contact_channels && (
              <p className="text-xs" style={{ color: colors.semantic.error }}>
                {errors.contact_channels}
              </p>
            )}

            <button
              onClick={addChannel}
              disabled={isSaving}
              className="flex items-center gap-2 text-sm font-semibold hover:opacity-80 transition-all disabled:opacity-50"
              style={{ color: colors.brand.primary }}
            >
              <Plus className="h-4 w-4" />
              Add another channel
            </button>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div
              className="p-3 rounded-xl text-sm"
              style={{
                backgroundColor: colors.semantic.error + '15',
                color: colors.semantic.error,
              }}
            >
              {errors.submit}
            </div>
          )}

          {/* Duplicate Warning Modal */}
          {showDuplicateWarning && (
            <div
              className="p-4 rounded-xl border-2"
              style={{
                backgroundColor: colors.semantic.warning + '10',
                borderColor: colors.semantic.warning,
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: colors.semantic.warning + '20' }}
                >
                  <span style={{ color: colors.semantic.warning }}>!</span>
                </div>
                <div>
                  <h4
                    className="font-bold text-sm mb-1"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Potential Duplicate Found
                  </h4>
                  <p
                    className="text-xs"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    A contact with similar information already exists:
                  </p>
                </div>
              </div>

              {/* Duplicate contacts list */}
              <div className="space-y-2 mb-4">
                {duplicateContacts.slice(0, 3).map((dup, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg text-xs"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                    }}
                  >
                    <span className="font-semibold">{dup.name || dup.company_name}</span>
                    {dup.contact_channels?.[0]?.value && (
                      <span className="ml-2" style={{ color: colors.utility.secondaryText }}>
                        ({dup.contact_channels[0].value})
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCancelDuplicateWarning}
                  className="flex-1 py-2 text-xs font-bold rounded-lg border transition-all"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    color: colors.utility.secondaryText,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCreate}
                  className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
                  style={{
                    backgroundColor: colors.semantic.warning,
                    color: '#ffffff',
                  }}
                >
                  Create Anyway
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-6 border-t"
          style={{
            borderColor: colors.utility.primaryText + '15',
            backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.8)',
          }}
        >
          {/* Advanced Options Link */}
          <button
            onClick={handleAdvancedCreate}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 mb-4 text-sm font-semibold hover:opacity-80 transition-all disabled:opacity-50"
            style={{ color: colors.utility.secondaryText }}
          >
            Advanced Options
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => !isSaving && onClose()}
              disabled={isSaving}
              className="flex-1 py-3 text-sm font-bold rounded-xl border-2 hover:opacity-80 transition-all disabled:opacity-50"
              style={{
                borderColor: colors.utility.primaryText + '20',
                color: colors.utility.secondaryText,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-[2] py-3 text-sm font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff',
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Contact'
              )}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default QuickAddContactDrawer;
