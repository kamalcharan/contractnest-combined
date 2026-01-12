// src/components/contacts/forms/ContactChannelsSection.tsx - FIXED VERSION
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

// FIXED: Import from constants instead of hardcoding
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

// FIXED: Icon mapping for channel types
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
    country_code: 'IN', // Default to India
    is_primary: value.length === 0,
    is_verified: false,
    notes: ''
  });

  // FIXED: Get commonly used countries for quick selection
  const commonCountries = ['IN', 'US', 'GB', 'AE', 'SG', 'MY', 'AU'];
  const sortedCountries = [
    ...countries.filter(c => commonCountries.includes(c.code)),
    ...countries.filter(c => !commonCountries.includes(c.code))
  ];

  // Validate a channel value using imported validation
  const validateChannelValue = (channel: ContactChannel): string | null => {
    const channelConfig = getChannelByCode(channel.channel_type);
    if (!channelConfig) return 'Invalid channel type';

    // Skip validation for empty values
    if (!channel.value) return 'This field is required';

    // Use the imported validation function
    const isValid = validateChannel(channelConfig, channel.value, channel.country_code);
    if (!isValid) {
      return `Invalid ${channelConfig.displayName}`;
    }

    // Check for duplicates
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
      // Validation error is shown in the form UI via validationErrors state
      return;
    }

    const channelConfig = getChannelByCode(newChannel.channel_type);
    if (!channelConfig) return;

    // Format the value if needed
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

    // If marking as primary, unset others
    let updatedChannels = [...value];
    if (channelWithId.is_primary) {
      updatedChannels = updatedChannels.map(ch => ({ ...ch, is_primary: false }));
    }

    onChange([...updatedChannels, channelWithId]);
    
    // Reset form
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
    // Note: Toast removed - user will see "Unsaved changes" indicator instead
  };

  // Update existing channel
  const updateChannel = (index: number, updates: Partial<ContactChannel>) => {
    const updatedChannels = [...value];
    
    // If setting as primary, unset others
    if (updates.is_primary) {
      updatedChannels.forEach((ch, i) => {
        if (i !== index) {
          updatedChannels[i] = { ...ch, is_primary: false };
        }
      });
    }
    
    updatedChannels[index] = { ...updatedChannels[index], ...updates };
    
    // Validate the updated channel
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
    
    // If removed channel was primary, make first remaining channel primary
    if (removedChannel.is_primary && newChannels.length > 0) {
      newChannels[0] = { ...newChannels[0], is_primary: true };
    }
    
    onChange(newChannels);
    // Note: Toast removed - user will see "Unsaved changes" indicator instead
  };

  // Mark field as touched for validation display
  const markFieldTouched = (fieldId: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldId));
  };

  return (
    <div className="rounded-lg shadow-sm border p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Contact Channels <span className="text-destructive">*</span>
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
        <div className="mb-4 p-3 rounded-md border bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="inline h-4 w-4 mr-1" />
            At least one contact channel is required
          </p>
        </div>
      )}

      {/* Duplicate Warnings */}
      {duplicateWarnings.length > 0 && (
        <div className="mb-4 p-3 rounded-md border bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/20">
          <p className="text-sm font-medium mb-1 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="inline h-4 w-4 mr-1" />
            Potential Duplicates Found:
          </p>
          <ul className="text-xs space-y-1 text-yellow-700 dark:text-yellow-300">
            {duplicateWarnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Add Channel Form */}
      {isAddingChannel && (
        <div className="mb-4 p-4 rounded-lg border bg-muted/30 border-border">
          <div className="space-y-4">
            {/* Channel Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Type</label>
                <select
                  value={newChannel.channel_type}
                  onChange={(e) => setNewChannel({ ...newChannel, channel_type: e.target.value })}
                  className="w-full p-2 border rounded-md bg-background border-input text-foreground"
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
                    <label className="block text-sm font-medium mb-2 text-foreground">Country</label>
                    <select
                      value={newChannel.country_code}
                      onChange={(e) => setNewChannel({ ...newChannel, country_code: e.target.value })}
                      className="w-full p-2 border rounded-md bg-background border-input text-foreground"
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
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {getChannelByCode(newChannel.channel_type)?.displayName || 'Value'} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newChannel.value}
                    onChange={(e) => {
                      setNewChannel({ ...newChannel, value: e.target.value });
                      if (validationErrors.new) {
                        const error = validateChannelValue({ ...newChannel, value: e.target.value });
                        setValidationErrors({ new: error || '' });
                      }
                    }}
                    onBlur={() => {
                      markFieldTouched('new');
                      const error = validateChannelValue(newChannel);
                      if (error) setValidationErrors({ new: error });
                    }}
                    placeholder={getChannelByCode(newChannel.channel_type)?.placeholder}
                    className={`w-full p-2 pr-8 border rounded-md bg-background text-foreground ${
                      validationErrors.new && touchedFields.has('new')
                        ? 'border-destructive focus:ring-destructive/20' 
                        : 'border-input'
                    }`}
                  />
                  {validationErrors.new && touchedFields.has('new') && (
                    <div className="absolute right-2 top-2.5">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    </div>
                  )}
                </div>
                {validationErrors.new && touchedFields.has('new') && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.new}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Notes (Optional)</label>
              <input
                type="text"
                value={newChannel.notes || ''}
                onChange={(e) => setNewChannel({ ...newChannel, notes: e.target.value })}
                placeholder="Add any notes..."
                className="w-full p-2 border rounded-md bg-background border-input text-foreground"
              />
            </div>

            {/* Primary Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="new_is_primary"
                checked={newChannel.is_primary}
                onChange={(e) => setNewChannel({ ...newChannel, is_primary: e.target.checked })}
                className="mr-2 accent-primary"
              />
              <label htmlFor="new_is_primary" className="text-sm text-foreground">
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
                  borderColor: colors.utility.primaryText + '40',
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
        <div className="text-center p-8 border-2 border-dashed rounded-lg border-border">
          <Phone className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">No contact channels added yet</p>
          <p className="text-sm mb-4 text-muted-foreground">
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
                className={`p-4 rounded-lg border transition-all ${
                  validationErrors[index] && touchedFields.has(fieldId)
                    ? 'border-destructive bg-destructive/5' 
                    : 'border-border bg-card hover:shadow-sm'
                }`}
              >
                {isEditing ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <select
                          value={channel.channel_type}
                          onChange={(e) => updateChannel(index, { channel_type: e.target.value })}
                          className="w-full p-2 border rounded-md bg-background border-input text-foreground text-sm"
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
                            className="w-full p-2 border rounded-md bg-background border-input text-foreground text-sm"
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
                          onChange={(e) => updateChannel(index, { value: e.target.value })}
                          onBlur={() => markFieldTouched(fieldId)}
                          className={`w-full p-2 border rounded-md bg-background text-foreground text-sm ${
                            validationErrors[index] ? 'border-destructive' : 'border-input'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingIndex(null);
                          markFieldTouched(fieldId);
                        }}
                        className="px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors text-sm bg-primary text-primary-foreground"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="px-3 py-1.5 border rounded-md hover:bg-accent transition-colors text-sm border-input text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {validationErrors[index] && (
                      <p className="text-xs text-destructive">{validationErrors[index]}</p>
                    )}
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        channel.is_primary 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-foreground">
                            {channelConfig.displayName}
                          </span>
                          {channel.is_primary && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                              <Star className="h-3 w-3" />
                              Primary
                            </span>
                          )}
                          {channel.is_verified && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-foreground break-all">
                          {channel.country_code && channelConfig.validation.requiresCountryCode
                            ? `+${countries.find(c => c.code === channel.country_code)?.phoneCode || ''} ${channel.value}`
                            : channel.value
                          }
                        </p>
                        
                        {channel.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            💡 {channel.notes}
                          </p>
                        )}

                        {validationErrors[index] && touchedFields.has(fieldId) && (
                          <p className="text-xs text-destructive mt-1">
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
                          className="p-1.5 rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                          title="Set as primary"
                        >
                          <Star className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingIndex(index)}
                        disabled={disabled}
                        className="p-1.5 rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                        title="Edit channel"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => removeChannel(index)}
                        disabled={disabled}
                        className="p-1.5 rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                        title="Remove channel"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
        <div className="mt-4 p-3 rounded-md border bg-muted/50 border-border">
          <div className="text-sm text-muted-foreground">
            <strong className="text-foreground">{value.length}</strong> contact channel{value.length !== 1 ? 's' : ''} added
            {value.filter(ch => ch.is_primary).length > 0 && (
              <>
                {' '} • <strong className="text-foreground">1</strong> primary channel
              </>
            )}
            {value.filter(ch => ch.is_verified).length > 0 && (
              <>
                {' '} • <strong className="text-foreground">{value.filter(ch => ch.is_verified).length}</strong> verified
              </>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      {value.length > 0 && !value.some(ch => ch.is_primary) && (
        <div className="mt-4 p-3 rounded-md border bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            💡 Tip: Mark one channel as "Primary" for the main contact method.
          </p>
        </div>
      )}
    </div>
  );
};

export default ContactChannelsSection;