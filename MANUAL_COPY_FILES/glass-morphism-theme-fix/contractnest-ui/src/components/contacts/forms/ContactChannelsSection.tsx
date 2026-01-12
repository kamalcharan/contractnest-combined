// src/components/contacts/forms/ContactChannelsSection.tsx - Glass Morphism Theme
import React, { useState, useEffect } from 'react';
import {
  Plus,
  Phone,
  Mail,
  Globe,
  MessageSquare,
  Trash2,
  Star,
  Edit2,
  Check,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  MessageCircle,
  Linkedin,
  Twitter,
  Facebook,
  Instagram
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { captureException } from '@/utils/sentry';
import { analyticsService } from '@/services/analytics.service';

// Import from constants
import {
  CHANNELS,
  getChannelByCode,
  validateChannelValue as validateChannel,
  formatChannelValue
} from '@/utils/constants/channels';
import { countries } from '@/utils/constants/countries';

// Types matching API structure
interface ContactChannel {
  id?: string;
  channel_type: string;
  value: string;
  country_code?: string;
  is_primary: boolean;
  is_verified: boolean;
  notes?: string;
}

interface ContactChannelsSectionProps {
  value: ContactChannel[];
  onChange: (channels: ContactChannel[]) => void;
  disabled?: boolean;
  duplicateWarnings?: string[];
  mode?: 'create' | 'edit';
  showValidation?: boolean;
}

// Icon mapping for channel types
const getChannelIcon = (iconName?: string) => {
  const iconMap: Record<string, any> = {
    'phone': Phone,
    'mail': Mail,
    'message-circle': MessageCircle,
    'linkedin': Linkedin,
    'twitter': Twitter,
    'facebook': Facebook,
    'instagram': Instagram,
    'globe': Globe
  };
  return iconMap[iconName || 'globe'] || Globe;
};

const ContactChannelsSection: React.FC<ContactChannelsSectionProps> = ({
  value,
  onChange,
  disabled = false,
  duplicateWarnings = [],
  mode = 'create',
  showValidation = true
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Track analytics when channels are added/removed
  useEffect(() => {
    if (value.length > 0) {
      analyticsService.trackPageView(
        `contacts/${mode}/channels-count`,
        `Contact Channels: ${value.length}`
      );
    }
  }, [value.length, mode]);

  // New channel form state
  const [newChannel, setNewChannel] = useState<ContactChannel>({
    channel_type: 'mobile',
    value: '',
    country_code: 'IN',
    is_primary: value.length === 0,
    is_verified: false,
    notes: ''
  });

  // Get commonly used countries for quick selection
  const commonCountries = ['IN', 'US', 'GB', 'AE', 'SG', 'MY', 'AU'];
  const sortedCountries = [
    ...countries.filter(c => commonCountries.includes(c.code)),
    ...countries.filter(c => !commonCountries.includes(c.code))
  ];

  // Validate a channel value
  const validateChannelValue = (channel: ContactChannel): string | null => {
    const channelConfig = getChannelByCode(channel.channel_type);
    if (!channelConfig) return 'Invalid channel type';

    if (!channel.value) return 'This field is required';

    const isValid = validateChannel(channelConfig, channel.value, channel.country_code);
    if (!isValid) {
      return `Invalid ${channelConfig.displayName}`;
    }

    const duplicate = value.find((ch, idx) =>
      ch.channel_type === channel.channel_type &&
      ch.value === channel.value &&
      (editingIndex === null || idx !== editingIndex)
    );

    if (duplicate) {
      return `This ${channelConfig.displayName} is already added`;
    }

    return null;
  };

  // Add new channel
  const addChannel = () => {
    const error = validateChannelValue(newChannel);
    if (error) {
      setValidationErrors({ new: error });
      return;
    }

    const channelConfig = getChannelByCode(newChannel.channel_type);
    if (!channelConfig) return;

    const formattedValue = formatChannelValue(
      channelConfig,
      newChannel.value,
      newChannel.country_code
    );

    const channelWithId: ContactChannel = {
      ...newChannel,
      value: formattedValue,
      id: `temp_${Date.now()}`
    };

    let updatedChannels = [...value];
    if (channelWithId.is_primary) {
      updatedChannels = updatedChannels.map(ch => ({ ...ch, is_primary: false }));
    }

    onChange([...updatedChannels, channelWithId]);

    setNewChannel({
      channel_type: 'mobile',
      value: '',
      country_code: 'IN',
      is_primary: false,
      is_verified: false,
      notes: ''
    });
    setIsAddingChannel(false);
    setValidationErrors({});
  };

  // Update existing channel
  const updateChannel = (index: number, updates: Partial<ContactChannel>) => {
    const updatedChannels = [...value];

    if (updates.is_primary) {
      updatedChannels.forEach((ch, i) => {
        if (i !== index) {
          updatedChannels[i] = { ...ch, is_primary: false };
        }
      });
    }

    updatedChannels[index] = { ...updatedChannels[index], ...updates };

    const error = validateChannelValue(updatedChannels[index]);
    if (error) {
      setValidationErrors({ [index]: error });
    } else {
      const newErrors = { ...validationErrors };
      delete newErrors[index];
      setValidationErrors(newErrors);
    }

    onChange(updatedChannels);
  };

  // Remove channel
  const removeChannel = (index: number) => {
    const removedChannel = value[index];
    const newChannels = value.filter((_, i) => i !== index);

    if (removedChannel.is_primary && newChannels.length > 0) {
      newChannels[0] = { ...newChannels[0], is_primary: true };
    }

    onChange(newChannels);
  };

  const markFieldTouched = (fieldId: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldId));
  };

  // Glass morphism styles
  const glassStyle: React.CSSProperties = {
    background: isDarkMode
      ? 'rgba(30, 41, 59, 0.8)'
      : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderColor: isDarkMode
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(255,255,255,0.5)',
    boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)',
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: isDarkMode
      ? 'rgba(15, 23, 42, 0.6)'
      : 'rgba(255, 255, 255, 0.8)',
    borderColor: isDarkMode
      ? 'rgba(255,255,255,0.2)'
      : 'rgba(0,0,0,0.15)',
    color: colors.utility.primaryText,
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: isDarkMode
      ? 'rgba(255,255,255,0.05)'
      : 'rgba(0,0,0,0.02)',
    borderColor: isDarkMode
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.08)',
  };

  return (
    <div className="rounded-2xl shadow-sm border p-6" style={glassStyle}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
          Contact Channels <span style={{ color: colors.semantic.error }}>*</span>
        </h2>
        {!isAddingChannel && (
          <button
            onClick={() => setIsAddingChannel(true)}
            disabled={disabled}
            className="flex items-center px-3 py-2 rounded-md hover:opacity-90 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#ffffff'
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Channel
          </button>
        )}
      </div>

      {/* Validation Summary */}
      {showValidation && value.length === 0 && (
        <div
          className="mb-4 p-3 rounded-xl border"
          style={{
            backgroundColor: `${colors.semantic.warning}15`,
            borderColor: `${colors.semantic.warning}30`,
          }}
        >
          <p className="text-sm" style={{ color: colors.semantic.warning }}>
            <AlertCircle className="inline h-4 w-4 mr-1" />
            At least one contact channel is required
          </p>
        </div>
      )}

      {/* Duplicate Warnings */}
      {duplicateWarnings.length > 0 && (
        <div
          className="mb-4 p-3 rounded-xl border"
          style={{
            backgroundColor: `${colors.semantic.warning}15`,
            borderColor: `${colors.semantic.warning}30`,
          }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: colors.semantic.warning }}>
            <AlertCircle className="inline h-4 w-4 mr-1" />
            Potential Duplicates Found:
          </p>
          <ul className="text-xs space-y-1" style={{ color: colors.semantic.warning }}>
            {duplicateWarnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Add Channel Form */}
      {isAddingChannel && (
        <div
          className="mb-4 p-4 rounded-xl border"
          style={{
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }}
        >
          <div className="space-y-4">
            {/* Channel Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>Type</label>
                <select
                  value={newChannel.channel_type}
                  onChange={(e) => setNewChannel({ ...newChannel, channel_type: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  style={inputStyle}
                >
                  {CHANNELS.sort((a, b) => a.order - b.order).map(channel => (
                    <option key={channel.code} value={channel.code}>
                      {channel.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Country Code for Phone Numbers */}
              {(() => {
                const channelConfig = getChannelByCode(newChannel.channel_type);
                return channelConfig?.validation.requiresCountryCode ? (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>Country</label>
                    <select
                      value={newChannel.country_code}
                      onChange={(e) => setNewChannel({ ...newChannel, country_code: e.target.value })}
                      className="w-full p-2 border rounded-md"
                      style={inputStyle}
                    >
                      {sortedCountries.map(country => (
                        <option key={country.code} value={country.code}>
                          +{country.phoneCode} {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null;
              })()}

              {/* Value Input */}
              <div className={(() => {
                const channelConfig = getChannelByCode(newChannel.channel_type);
                return channelConfig?.validation.requiresCountryCode ? '' : 'md:col-span-2';
              })()}>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                  {getChannelByCode(newChannel.channel_type)?.displayName || 'Value'} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newChannel.value}
                    onChange={(e) => {
                      let inputValue = e.target.value;
                      const channelConfig = getChannelByCode(newChannel.channel_type);

                      if (channelConfig?.validation.type === 'phone') {
                        inputValue = inputValue.replace(/[^\d+]/g, '');
                        if (inputValue.includes('+')) {
                          inputValue = '+' + inputValue.replace(/\+/g, '');
                        }
                      }

                      setNewChannel({ ...newChannel, value: inputValue });
                      if (validationErrors.new) {
                        const error = validateChannelValue({ ...newChannel, value: inputValue });
                        setValidationErrors({ new: error || '' });
                      }
                    }}
                    onBlur={() => {
                      markFieldTouched('new');
                      const error = validateChannelValue(newChannel);
                      if (error) setValidationErrors({ new: error });
                    }}
                    placeholder={getChannelByCode(newChannel.channel_type)?.placeholder}
                    className="w-full p-2 pr-8 border rounded-md"
                    style={{
                      ...inputStyle,
                      borderColor: validationErrors.new && touchedFields.has('new')
                        ? colors.semantic.error
                        : inputStyle.borderColor,
                    }}
                  />
                  {validationErrors.new && touchedFields.has('new') && (
                    <div className="absolute right-2 top-2.5">
                      <AlertCircle className="h-5 w-5" style={{ color: colors.semantic.error }} />
                    </div>
                  )}
                </div>
                {validationErrors.new && touchedFields.has('new') && (
                  <p className="text-xs mt-1" style={{ color: colors.semantic.error }}>{validationErrors.new}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>Notes (Optional)</label>
              <input
                type="text"
                value={newChannel.notes || ''}
                onChange={(e) => setNewChannel({ ...newChannel, notes: e.target.value })}
                placeholder="Add any notes..."
                className="w-full p-2 border rounded-md"
                style={inputStyle}
              />
            </div>

            {/* Primary Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="new_is_primary"
                checked={newChannel.is_primary}
                onChange={(e) => setNewChannel({ ...newChannel, is_primary: e.target.checked })}
                className="mr-2"
                style={{ accentColor: colors.brand.primary }}
              />
              <label htmlFor="new_is_primary" className="text-sm" style={{ color: colors.utility.primaryText }}>
                Set as primary contact channel
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={addChannel}
                className="px-4 py-2 rounded-md hover:opacity-90 transition-colors text-sm"
                style={{
                  backgroundColor: colors.brand.primary,
                  color: '#ffffff'
                }}
              >
                <Check className="mr-2 h-4 w-4 inline" />
                Add Channel
              </button>
              <button
                onClick={() => {
                  setIsAddingChannel(false);
                  setNewChannel({
                    channel_type: 'mobile',
                    value: '',
                    country_code: 'IN',
                    is_primary: false,
                    is_verified: false,
                    notes: ''
                  });
                  setValidationErrors({});
                }}
                className="px-4 py-2 border rounded-md hover:opacity-80 transition-colors text-sm"
                style={{
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                  color: colors.utility.primaryText,
                  backgroundColor: 'transparent'
                }}
              >
                <X className="mr-2 h-4 w-4 inline" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Channels */}
      {value.length === 0 ? (
        <div
          className="text-center p-8 border-2 border-dashed rounded-xl"
          style={{
            borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
          }}
        >
          <Phone className="h-12 w-12 mx-auto mb-3" style={{ color: colors.utility.secondaryText }} />
          <p className="mb-4" style={{ color: colors.utility.secondaryText }}>No contact channels added yet</p>
          <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
            Add email, phone, or other ways to reach this contact
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {value.map((channel, index) => {
            const channelConfig = getChannelByCode(channel.channel_type);
            if (!channelConfig) return null;

            const IconComponent = getChannelIcon(channelConfig.icon);
            const isEditing = editingIndex === index;
            const fieldId = `channel_${index}`;

            return (
              <div
                key={channel.id || index}
                className="p-4 rounded-xl border transition-all"
                style={{
                  ...cardStyle,
                  borderColor: validationErrors[index] && touchedFields.has(fieldId)
                    ? colors.semantic.error
                    : cardStyle.borderColor,
                  backgroundColor: validationErrors[index] && touchedFields.has(fieldId)
                    ? `${colors.semantic.error}10`
                    : cardStyle.backgroundColor,
                }}
              >
                {isEditing ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <select
                          value={channel.channel_type}
                          onChange={(e) => updateChannel(index, { channel_type: e.target.value })}
                          className="w-full p-2 border rounded-md text-sm"
                          style={inputStyle}
                        >
                          {CHANNELS.sort((a, b) => a.order - b.order).map(ch => (
                            <option key={ch.code} value={ch.code}>
                              {ch.displayName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {channelConfig.validation.requiresCountryCode && (
                        <div>
                          <select
                            value={channel.country_code}
                            onChange={(e) => updateChannel(index, { country_code: e.target.value })}
                            className="w-full p-2 border rounded-md text-sm"
                            style={inputStyle}
                          >
                            {sortedCountries.map(country => (
                              <option key={country.code} value={country.code}>
                                +{country.phoneCode} {country.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className={channelConfig.validation.requiresCountryCode ? '' : 'md:col-span-2'}>
                        <input
                          type="text"
                          value={channel.value}
                          onChange={(e) => {
                            let inputValue = e.target.value;
                            if (channelConfig.validation.type === 'phone') {
                              inputValue = inputValue.replace(/[^\d+]/g, '');
                              if (inputValue.includes('+')) {
                                inputValue = '+' + inputValue.replace(/\+/g, '');
                              }
                            }
                            updateChannel(index, { value: inputValue });
                          }}
                          onBlur={() => markFieldTouched(fieldId)}
                          className="w-full p-2 border rounded-md text-sm"
                          style={{
                            ...inputStyle,
                            borderColor: validationErrors[index]
                              ? colors.semantic.error
                              : inputStyle.borderColor,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingIndex(null);
                          markFieldTouched(fieldId);
                        }}
                        className="px-3 py-1.5 rounded-md hover:opacity-90 transition-colors text-sm"
                        style={{
                          backgroundColor: colors.brand.primary,
                          color: '#ffffff'
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="px-3 py-1.5 border rounded-md hover:opacity-80 transition-colors text-sm"
                        style={{
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                          color: colors.utility.primaryText,
                          backgroundColor: 'transparent'
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {validationErrors[index] && (
                      <p className="text-xs" style={{ color: colors.semantic.error }}>{validationErrors[index]}</p>
                    )}
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className="p-2 rounded-lg"
                        style={{
                          backgroundColor: channel.is_primary
                            ? colors.brand.primary
                            : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                          color: channel.is_primary
                            ? '#ffffff'
                            : colors.utility.secondaryText
                        }}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
                            {channelConfig.displayName}
                          </span>
                          {channel.is_primary && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
                              style={{
                                backgroundColor: `${colors.brand.primary}15`,
                                color: colors.brand.primary,
                                borderColor: `${colors.brand.primary}30`,
                              }}
                            >
                              <Star className="h-3 w-3" />
                              Primary
                            </span>
                          )}
                          {channel.is_verified && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
                              style={{
                                backgroundColor: `${colors.semantic.success}15`,
                                color: colors.semantic.success,
                                borderColor: `${colors.semantic.success}30`,
                              }}
                            >
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </span>
                          )}
                        </div>

                        <p className="text-sm break-all" style={{ color: colors.utility.primaryText }}>
                          {channel.country_code && channelConfig.validation.requiresCountryCode
                            ? `+${countries.find(c => c.code === channel.country_code)?.phoneCode || ''} ${channel.value}`
                            : channel.value
                          }
                        </p>

                        {channel.notes && (
                          <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                            💡 {channel.notes}
                          </p>
                        )}

                        {validationErrors[index] && touchedFields.has(fieldId) && (
                          <p className="text-xs mt-1" style={{ color: colors.semantic.error }}>
                            <AlertCircle className="inline h-3 w-3 mr-1" />
                            {validationErrors[index]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!channel.is_primary && (
                        <button
                          onClick={() => updateChannel(index, { is_primary: true })}
                          disabled={disabled}
                          className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                          style={{ color: colors.utility.secondaryText }}
                          title="Set as primary"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingIndex(index)}
                        disabled={disabled}
                        className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                        style={{ color: colors.utility.secondaryText }}
                        title="Edit channel"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeChannel(index)}
                        disabled={disabled}
                        className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                        style={{ color: colors.semantic.error }}
                        title="Remove channel"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {value.length > 0 && (
        <div
          className="mt-4 p-3 rounded-xl border"
          style={{
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          }}
        >
          <div className="text-sm" style={{ color: colors.utility.secondaryText }}>
            <strong style={{ color: colors.utility.primaryText }}>{value.length}</strong> contact channel{value.length !== 1 ? 's' : ''} added
            {value.filter(ch => ch.is_primary).length > 0 && (
              <>
                {' '} • <strong style={{ color: colors.utility.primaryText }}>1</strong> primary channel
              </>
            )}
            {value.filter(ch => ch.is_verified).length > 0 && (
              <>
                {' '} • <strong style={{ color: colors.utility.primaryText }}>{value.filter(ch => ch.is_verified).length}</strong> verified
              </>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      {value.length > 0 && !value.some(ch => ch.is_primary) && (
        <div
          className="mt-4 p-3 rounded-xl border"
          style={{
            backgroundColor: `${colors.semantic.warning}10`,
            borderColor: `${colors.semantic.warning}25`,
          }}
        >
          <p className="text-sm" style={{ color: colors.semantic.warning }}>
            💡 Tip: Mark one channel as "Primary" for the main contact method.
          </p>
        </div>
      )}
    </div>
  );
};

export default ContactChannelsSection;
