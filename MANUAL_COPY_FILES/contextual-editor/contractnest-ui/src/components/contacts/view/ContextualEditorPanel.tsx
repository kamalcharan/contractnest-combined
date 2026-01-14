// src/components/contacts/view/ContextualEditorPanel.tsx
// Contextual Right Panel Editor with Glass Morphism
import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Shield,
  Users,
  Plus,
  Check,
  Loader2,
  Star,
  MessageSquare,
  Globe,
  Linkedin,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Activity,
  TrendingUp,
  FileText,
  Calendar
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useUpdateContact } from '../../../hooks/useContacts';
import { useToast } from '@/components/ui/use-toast';
import { CHANNELS, getChannelByCode, validateChannelValue, formatChannelValue } from '@/utils/constants/channels';
import { countries } from '@/utils/constants/countries';
import { ADDRESS_TYPES, ADDRESS_TYPE_LABELS } from '@/utils/constants/contacts';
import { useMasterDataOptions } from '@/hooks/useMasterData';

// Types
export type EditorMode =
  | 'default'
  | 'add-channel'
  | 'edit-channel'
  | 'add-address'
  | 'edit-address'
  | 'add-compliance'
  | 'edit-compliance'
  | 'add-person'
  | 'edit-person';

interface ContactChannel {
  id?: string;
  channel_type: string;
  value: string;
  country_code?: string;
  is_primary: boolean;
  is_verified: boolean;
  notes?: string;
}

interface ContactAddress {
  id?: string;
  type: string;
  label?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  country_code: string;
  postal_code?: string;
  is_primary: boolean;
}

interface ComplianceNumber {
  id?: string;
  type_value: string;
  type_label?: string;
  number: string;
  issuing_authority?: string;
  valid_from?: string;
  valid_to?: string;
  is_verified: boolean;
  notes?: string;
}

interface ContactPerson {
  id?: string;
  salutation?: string;
  name: string;
  designation?: string;
  department?: string;
  is_primary: boolean;
  contact_channels: ContactChannel[];
  notes?: string;
}

interface Contact {
  id: string;
  type: 'individual' | 'corporate';
  status: string;
  contact_channels: ContactChannel[];
  addresses: ContactAddress[];
  compliance_numbers: ComplianceNumber[];
  contact_persons: ContactPerson[];
  [key: string]: any;
}

interface ContextualEditorPanelProps {
  contact: Contact;
  mode: EditorMode;
  editingItem?: any;
  editingIndex?: number;
  onModeChange: (mode: EditorMode, item?: any, index?: number) => void;
  onSaveSuccess: () => void;
  className?: string;
}

const ContextualEditorPanel: React.FC<ContextualEditorPanelProps> = ({
  contact,
  mode,
  editingItem,
  editingIndex,
  onModeChange,
  onSaveSuccess,
  className = ''
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { toast } = useToast();
  const updateContactHook = useUpdateContact();

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Glass morphism styles
  const glassStyle: React.CSSProperties = {
    background: isDarkMode
      ? 'rgba(30, 41, 59, 0.85)'
      : 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderColor: isDarkMode
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.08)',
    boxShadow: isDarkMode
      ? '0 8px 32px rgba(0,0,0,0.3)'
      : '0 8px 32px rgba(0,0,0,0.08)',
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: isDarkMode
      ? 'rgba(15, 23, 42, 0.6)'
      : 'rgba(255, 255, 255, 0.9)',
    borderColor: isDarkMode
      ? 'rgba(255,255,255,0.15)'
      : 'rgba(0,0,0,0.12)',
    color: colors.utility.primaryText,
  };

  // Reset success state when mode changes
  useEffect(() => {
    setSaveSuccess(false);
  }, [mode]);

  // Handle save with animation
  const handleSave = async (updateData: any) => {
    setIsSaving(true);
    try {
      await updateContactHook.mutate({
        contactId: contact.id,
        updates: updateData
      });

      setSaveSuccess(true);
      toast({
        title: "Saved!",
        description: "Changes saved successfully",
        duration: 2000
      });

      // Animate back to default after success
      setTimeout(() => {
        onSaveSuccess();
        onModeChange('default');
      }, 800);

    } catch (error) {
      console.error('Save failed:', error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save changes. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Render default panel content
  const renderDefaultContent = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Quick Stats */}
      <div className="space-y-4">
        <h3
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: colors.utility.secondaryText }}
        >
          Quick Stats
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div
            className="p-4 rounded-xl border transition-all hover:scale-[1.02]"
            style={{
              ...glassStyle,
              borderColor: colors.semantic.success + '30',
              background: colors.semantic.success + '10'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4" style={{ color: colors.semantic.success }} />
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Contracts</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>0</p>
          </div>

          <div
            className="p-4 rounded-xl border transition-all hover:scale-[1.02]"
            style={{
              ...glassStyle,
              borderColor: colors.brand.primary + '30',
              background: colors.brand.primary + '10'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4" style={{ color: colors.brand.primary }} />
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Revenue</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>₹0</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: colors.utility.secondaryText }}
        >
          Quick Add
        </h3>

        <div className="space-y-2">
          <button
            onClick={() => onModeChange('add-channel')}
            className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] hover:shadow-md"
            style={glassStyle}
          >
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.brand.primary + '20' }}
            >
              <Phone className="h-4 w-4" style={{ color: colors.brand.primary }} />
            </div>
            <span className="flex-1 text-left text-sm font-medium" style={{ color: colors.utility.primaryText }}>
              Add Contact Channel
            </span>
            <ChevronRight className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
          </button>

          <button
            onClick={() => onModeChange('add-address')}
            className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] hover:shadow-md"
            style={glassStyle}
          >
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.semantic.warning + '20' }}
            >
              <MapPin className="h-4 w-4" style={{ color: colors.semantic.warning }} />
            </div>
            <span className="flex-1 text-left text-sm font-medium" style={{ color: colors.utility.primaryText }}>
              Add Address
            </span>
            <ChevronRight className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
          </button>

          {contact.type === 'corporate' && (
            <>
              <button
                onClick={() => onModeChange('add-compliance')}
                className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] hover:shadow-md"
                style={glassStyle}
              >
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: colors.semantic.success + '20' }}
                >
                  <Shield className="h-4 w-4" style={{ color: colors.semantic.success }} />
                </div>
                <span className="flex-1 text-left text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  Add Compliance Number
                </span>
                <ChevronRight className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
              </button>

              <button
                onClick={() => onModeChange('add-person')}
                className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] hover:shadow-md"
                style={glassStyle}
              >
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: '#8b5cf6' + '20' }}
                >
                  <Users className="h-4 w-4" style={{ color: '#8b5cf6' }} />
                </div>
                <span className="flex-1 text-left text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  Add Contact Person
                </span>
                <ChevronRight className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Recent Activity Preview */}
      <div className="space-y-3">
        <h3
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: colors.utility.secondaryText }}
        >
          Recent Activity
        </h3>

        <div
          className="p-4 rounded-xl border text-center"
          style={glassStyle}
        >
          <Activity className="h-8 w-8 mx-auto mb-2" style={{ color: colors.utility.secondaryText }} />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            No recent activity
          </p>
        </div>
      </div>
    </div>
  );

  // Render Channel Form
  const renderChannelForm = () => {
    const isEditing = mode === 'edit-channel';
    const [formData, setFormData] = useState<ContactChannel>(
      isEditing && editingItem ? editingItem : {
        channel_type: 'mobile',
        value: '',
        country_code: 'IN',
        is_primary: contact.contact_channels.length === 0,
        is_verified: false,
        notes: ''
      }
    );
    const [error, setError] = useState<string | null>(null);

    const channelConfig = getChannelByCode(formData.channel_type);
    const commonCountries = ['IN', 'US', 'GB', 'AE', 'SG'];
    const sortedCountries = [
      ...countries.filter(c => commonCountries.includes(c.code)),
      ...countries.filter(c => !commonCountries.includes(c.code))
    ];

    const handleSubmit = () => {
      // Validate
      if (!formData.value.trim()) {
        setError('Please enter a value');
        return;
      }

      if (channelConfig && !validateChannelValue(channelConfig, formData.value, formData.country_code)) {
        setError(`Invalid ${channelConfig.displayName}`);
        return;
      }

      // Build updated channels array
      let updatedChannels = [...contact.contact_channels];

      if (isEditing && editingIndex !== undefined) {
        // Update existing
        updatedChannels[editingIndex] = { ...formData, id: editingItem?.id };
      } else {
        // Add new
        const newChannel = {
          ...formData,
          id: `temp_${Date.now()}`,
          value: channelConfig ? formatChannelValue(channelConfig, formData.value, formData.country_code) : formData.value
        };

        // Handle primary flag
        if (newChannel.is_primary) {
          updatedChannels = updatedChannels.map(ch => ({ ...ch, is_primary: false }));
        }
        updatedChannels.push(newChannel);
      }

      handleSave({ contact_channels: updatedChannels });
    };

    return (
      <div className="space-y-5 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.brand.primary + '20' }}
            >
              <Phone className="h-5 w-5" style={{ color: colors.brand.primary }} />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
              {isEditing ? 'Edit Channel' : 'Add Channel'}
            </h3>
          </div>
          <button
            onClick={() => onModeChange('default')}
            className="p-2 rounded-lg hover:opacity-80 transition-colors"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
            <X className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Channel Type */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              Type
            </label>
            <select
              value={formData.channel_type}
              onChange={(e) => setFormData({ ...formData, channel_type: e.target.value })}
              className="w-full p-3 border rounded-xl transition-colors focus:outline-none focus:ring-2"
              style={{
                ...inputStyle,
                borderRadius: '12px'
              }}
            >
              {CHANNELS.sort((a, b) => a.order - b.order).map(channel => (
                <option key={channel.code} value={channel.code}>
                  {channel.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Country Code (for phone) */}
          {channelConfig?.validation.requiresCountryCode && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                Country
              </label>
              <select
                value={formData.country_code}
                onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                className="w-full p-3 border rounded-xl transition-colors focus:outline-none focus:ring-2"
                style={{
                  ...inputStyle,
                  borderRadius: '12px'
                }}
              >
                {sortedCountries.map(country => (
                  <option key={country.code} value={country.code}>
                    +{country.phoneCode} {country.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Value */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              {channelConfig?.displayName || 'Value'} *
            </label>
            <input
              type="text"
              value={formData.value}
              onChange={(e) => {
                let val = e.target.value;
                if (channelConfig?.validation.type === 'phone') {
                  val = val.replace(/[^\d+]/g, '');
                }
                setFormData({ ...formData, value: val });
                setError(null);
              }}
              placeholder={channelConfig?.placeholder || 'Enter value'}
              className="w-full p-3 border rounded-xl transition-colors focus:outline-none focus:ring-2"
              style={{
                ...inputStyle,
                borderRadius: '12px',
                borderColor: error ? colors.semantic.error : inputStyle.borderColor
              }}
            />
            {error && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: colors.semantic.error }}>
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              Notes (Optional)
            </label>
            <input
              type="text"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes..."
              className="w-full p-3 border rounded-xl transition-colors focus:outline-none focus:ring-2"
              style={{
                ...inputStyle,
                borderRadius: '12px'
              }}
            />
          </div>

          {/* Primary Toggle */}
          <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm" style={glassStyle}>
            <input
              type="checkbox"
              checked={formData.is_primary}
              onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: colors.brand.primary }}
            />
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" style={{ color: formData.is_primary ? colors.brand.primary : colors.utility.secondaryText }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Set as primary contact channel
              </span>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onModeChange('default')}
            className="flex-1 px-4 py-3 border rounded-xl font-medium transition-all hover:opacity-80"
            style={{
              borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
              color: colors.utility.primaryText,
              backgroundColor: 'transparent'
            }}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || saveSuccess}
            className="flex-1 px-4 py-3 rounded-xl font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{
              backgroundColor: saveSuccess ? colors.semantic.success : colors.brand.primary,
              color: '#ffffff'
            }}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Render Address Form
  const renderAddressForm = () => {
    const isEditing = mode === 'edit-address';
    const [formData, setFormData] = useState<ContactAddress>(
      isEditing && editingItem ? editingItem : {
        type: 'office',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        country_code: 'IN',
        postal_code: '',
        is_primary: contact.addresses.length === 0
      }
    );
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
      if (!formData.address_line1.trim() || !formData.city.trim()) {
        setError('Address line 1 and City are required');
        return;
      }

      let updatedAddresses = [...contact.addresses];

      if (isEditing && editingIndex !== undefined) {
        updatedAddresses[editingIndex] = { ...formData, id: editingItem?.id };
      } else {
        const newAddress = { ...formData, id: `temp_${Date.now()}` };
        if (newAddress.is_primary) {
          updatedAddresses = updatedAddresses.map(addr => ({ ...addr, is_primary: false }));
        }
        updatedAddresses.push(newAddress);
      }

      handleSave({ addresses: updatedAddresses });
    };

    return (
      <div className="space-y-5 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.semantic.warning + '20' }}
            >
              <MapPin className="h-5 w-5" style={{ color: colors.semantic.warning }} />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
              {isEditing ? 'Edit Address' : 'Add Address'}
            </h3>
          </div>
          <button
            onClick={() => onModeChange('default')}
            className="p-2 rounded-lg hover:opacity-80 transition-colors"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
            <X className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              Address Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full p-3 border rounded-xl"
              style={{ ...inputStyle, borderRadius: '12px' }}
            >
              {Object.entries(ADDRESS_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Address Line 1 */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              Address Line 1 *
            </label>
            <input
              type="text"
              value={formData.address_line1}
              onChange={(e) => { setFormData({ ...formData, address_line1: e.target.value }); setError(null); }}
              placeholder="Street address, building, floor"
              className="w-full p-3 border rounded-xl"
              style={{ ...inputStyle, borderRadius: '12px', borderColor: error ? colors.semantic.error : inputStyle.borderColor }}
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              Address Line 2
            </label>
            <input
              type="text"
              value={formData.address_line2 || ''}
              onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              placeholder="Landmark, area"
              className="w-full p-3 border rounded-xl"
              style={{ ...inputStyle, borderRadius: '12px' }}
            />
          </div>

          {/* City & State */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                City *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => { setFormData({ ...formData, city: e.target.value }); setError(null); }}
                placeholder="City"
                className="w-full p-3 border rounded-xl"
                style={{ ...inputStyle, borderRadius: '12px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                State
              </label>
              <input
                type="text"
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
                className="w-full p-3 border rounded-xl"
                style={{ ...inputStyle, borderRadius: '12px' }}
              />
            </div>
          </div>

          {/* Country & Postal Code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                Country
              </label>
              <select
                value={formData.country_code}
                onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                className="w-full p-3 border rounded-xl"
                style={{ ...inputStyle, borderRadius: '12px' }}
              >
                {countries.map(country => (
                  <option key={country.code} value={country.code}>{country.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                Postal Code
              </label>
              <input
                type="text"
                value={formData.postal_code || ''}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                placeholder="PIN/ZIP"
                className="w-full p-3 border rounded-xl"
                style={{ ...inputStyle, borderRadius: '12px' }}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs flex items-center gap-1" style={{ color: colors.semantic.error }}>
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}

          {/* Primary Toggle */}
          <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm" style={glassStyle}>
            <input
              type="checkbox"
              checked={formData.is_primary}
              onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: colors.brand.primary }}
            />
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" style={{ color: formData.is_primary ? colors.brand.primary : colors.utility.secondaryText }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Set as primary address
              </span>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onModeChange('default')}
            className="flex-1 px-4 py-3 border rounded-xl font-medium transition-all hover:opacity-80"
            style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', color: colors.utility.primaryText }}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || saveSuccess}
            className="flex-1 px-4 py-3 rounded-xl font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ backgroundColor: saveSuccess ? colors.semantic.success : colors.brand.primary, color: '#ffffff' }}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <><CheckCircle className="h-4 w-4" /> Saved!</>
            ) : (
              <><Check className="h-4 w-4" /> Save</>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Render Compliance Form (Corporate only)
  const renderComplianceForm = () => {
    const isEditing = mode === 'edit-compliance';
    const { options: complianceTypes, loading: loadingTypes } = useMasterDataOptions('Compliance Numbers', {
      valueField: 'SubCatName',
      labelField: 'DisplayName',
      includeInactive: false
    });

    const [formData, setFormData] = useState<ComplianceNumber>(
      isEditing && editingItem ? editingItem : {
        type_value: complianceTypes[0]?.value || 'GST',
        type_label: complianceTypes[0]?.label || 'GST Number',
        number: '',
        issuing_authority: '',
        is_verified: false,
        notes: ''
      }
    );
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
      if (!formData.number.trim()) {
        setError('Compliance number is required');
        return;
      }

      let updatedCompliance = [...contact.compliance_numbers];

      if (isEditing && editingIndex !== undefined) {
        updatedCompliance[editingIndex] = { ...formData, id: editingItem?.id };
      } else {
        updatedCompliance.push({ ...formData, id: `temp_${Date.now()}` });
      }

      handleSave({ compliance_numbers: updatedCompliance });
    };

    return (
      <div className="space-y-5 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.semantic.success + '20' }}
            >
              <Shield className="h-5 w-5" style={{ color: colors.semantic.success }} />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
              {isEditing ? 'Edit Compliance' : 'Add Compliance'}
            </h3>
          </div>
          <button
            onClick={() => onModeChange('default')}
            className="p-2 rounded-lg hover:opacity-80 transition-colors"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
            <X className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              Compliance Type
            </label>
            <select
              value={formData.type_value}
              onChange={(e) => {
                const selected = complianceTypes.find(t => t.value === e.target.value);
                setFormData({
                  ...formData,
                  type_value: e.target.value,
                  type_label: selected?.label || e.target.value
                });
              }}
              className="w-full p-3 border rounded-xl"
              style={{ ...inputStyle, borderRadius: '12px' }}
              disabled={loadingTypes}
            >
              {complianceTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Number */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              {formData.type_label || 'Number'} *
            </label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => { setFormData({ ...formData, number: e.target.value.toUpperCase() }); setError(null); }}
              placeholder={`Enter ${formData.type_label || 'compliance number'}`}
              className="w-full p-3 border rounded-xl uppercase"
              style={{ ...inputStyle, borderRadius: '12px', borderColor: error ? colors.semantic.error : inputStyle.borderColor }}
            />
            {error && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: colors.semantic.error }}>
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>

          {/* Issuing Authority */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              Issuing Authority
            </label>
            <input
              type="text"
              value={formData.issuing_authority || ''}
              onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
              placeholder="e.g., Government of India"
              className="w-full p-3 border rounded-xl"
              style={{ ...inputStyle, borderRadius: '12px' }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              Notes
            </label>
            <input
              type="text"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes..."
              className="w-full p-3 border rounded-xl"
              style={{ ...inputStyle, borderRadius: '12px' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onModeChange('default')}
            className="flex-1 px-4 py-3 border rounded-xl font-medium transition-all hover:opacity-80"
            style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', color: colors.utility.primaryText }}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || saveSuccess}
            className="flex-1 px-4 py-3 rounded-xl font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ backgroundColor: saveSuccess ? colors.semantic.success : colors.brand.primary, color: '#ffffff' }}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <><CheckCircle className="h-4 w-4" /> Saved!</>
            ) : (
              <><Check className="h-4 w-4" /> Save</>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Render Person Form (Corporate only)
  const renderPersonForm = () => {
    const isEditing = mode === 'edit-person';
    const [formData, setFormData] = useState<ContactPerson>(
      isEditing && editingItem ? editingItem : {
        name: '',
        salutation: 'mr',
        designation: '',
        department: '',
        is_primary: contact.contact_persons.length === 0,
        contact_channels: [],
        notes: ''
      }
    );
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
      if (!formData.name.trim()) {
        setError('Name is required');
        return;
      }

      let updatedPersons = [...contact.contact_persons];

      if (isEditing && editingIndex !== undefined) {
        updatedPersons[editingIndex] = { ...formData, id: editingItem?.id };
      } else {
        const newPerson = { ...formData, id: `temp_${Date.now()}` };
        if (newPerson.is_primary) {
          updatedPersons = updatedPersons.map(p => ({ ...p, is_primary: false }));
        }
        updatedPersons.push(newPerson);
      }

      handleSave({ contact_persons: updatedPersons });
    };

    return (
      <div className="space-y-5 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: '#8b5cf6' + '20' }}
            >
              <Users className="h-5 w-5" style={{ color: '#8b5cf6' }} />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
              {isEditing ? 'Edit Person' : 'Add Contact Person'}
            </h3>
          </div>
          <button
            onClick={() => onModeChange('default')}
            className="p-2 rounded-lg hover:opacity-80 transition-colors"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
            <X className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Salutation & Name */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                Title
              </label>
              <select
                value={formData.salutation}
                onChange={(e) => setFormData({ ...formData, salutation: e.target.value })}
                className="w-full p-3 border rounded-xl"
                style={{ ...inputStyle, borderRadius: '12px' }}
              >
                <option value="mr">Mr.</option>
                <option value="ms">Ms.</option>
                <option value="mrs">Mrs.</option>
                <option value="dr">Dr.</option>
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setError(null); }}
                placeholder="Full name"
                className="w-full p-3 border rounded-xl"
                style={{ ...inputStyle, borderRadius: '12px', borderColor: error ? colors.semantic.error : inputStyle.borderColor }}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs flex items-center gap-1" style={{ color: colors.semantic.error }}>
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}

          {/* Designation & Department */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                Designation
              </label>
              <input
                type="text"
                value={formData.designation || ''}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g., Manager"
                className="w-full p-3 border rounded-xl"
                style={{ ...inputStyle, borderRadius: '12px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                Department
              </label>
              <input
                type="text"
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Sales"
                className="w-full p-3 border rounded-xl"
                style={{ ...inputStyle, borderRadius: '12px' }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              Notes
            </label>
            <input
              type="text"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes..."
              className="w-full p-3 border rounded-xl"
              style={{ ...inputStyle, borderRadius: '12px' }}
            />
          </div>

          {/* Primary Toggle */}
          <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm" style={glassStyle}>
            <input
              type="checkbox"
              checked={formData.is_primary}
              onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: colors.brand.primary }}
            />
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" style={{ color: formData.is_primary ? colors.brand.primary : colors.utility.secondaryText }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Set as primary contact person
              </span>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onModeChange('default')}
            className="flex-1 px-4 py-3 border rounded-xl font-medium transition-all hover:opacity-80"
            style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', color: colors.utility.primaryText }}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || saveSuccess}
            className="flex-1 px-4 py-3 rounded-xl font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ backgroundColor: saveSuccess ? colors.semantic.success : colors.brand.primary, color: '#ffffff' }}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <><CheckCircle className="h-4 w-4" /> Saved!</>
            ) : (
              <><Check className="h-4 w-4" /> Save</>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-300 ${className}`}
      style={glassStyle}
    >
      {mode === 'default' && renderDefaultContent()}
      {(mode === 'add-channel' || mode === 'edit-channel') && renderChannelForm()}
      {(mode === 'add-address' || mode === 'edit-address') && renderAddressForm()}
      {(mode === 'add-compliance' || mode === 'edit-compliance') && renderComplianceForm()}
      {(mode === 'add-person' || mode === 'edit-person') && renderPersonForm()}
    </div>
  );
};

export default ContextualEditorPanel;
