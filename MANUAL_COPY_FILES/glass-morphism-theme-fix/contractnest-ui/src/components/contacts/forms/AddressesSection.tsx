// src/components/contacts/forms/AddressesSection.tsx - Glass Morphism Theme
import React, { useState } from 'react';
import {
  Plus,
  MapPin,
  Trash2,
  Edit2,
  Check,
  X,
  Home,
  Building,
  Package,
  Truck,
  Factory,
  Warehouse,
  Star,
  CheckCircle
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { countries } from '@/utils/constants/countries';
import {
  ADDRESS_TYPES,
  ADDRESS_TYPE_LABELS,
  ERROR_MESSAGES,
  PLACEHOLDER_TEXTS,
  VALIDATION_RULES,
  DEFAULT_COUNTRY_CODE
} from '@/utils/constants/contacts';

// Internal format for component state
interface Address {
  id?: string;
  address_type: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  country_code: string;
  postal_code: string;
  is_primary: boolean;
  is_verified: boolean;
  notes?: string;
}

// API format matching actual database schema
interface AddressOutput {
  id?: string;
  type: string;
  label?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  state_code?: string;
  country?: string;
  country_code: string;
  postal_code?: string;
  google_pin?: string;
  is_primary: boolean;
  is_verified?: boolean;
  notes?: string;
}

interface AddressesSectionProps {
  value: AddressOutput[];
  onChange: (addresses: AddressOutput[]) => void;
  disabled?: boolean;
  mode?: 'create' | 'edit';
}

// Icon mapping for address types
const ADDRESS_TYPE_ICONS = {
  [ADDRESS_TYPES.HOME]: Home,
  [ADDRESS_TYPES.OFFICE]: Building,
  [ADDRESS_TYPES.BILLING]: Package,
  [ADDRESS_TYPES.SHIPPING]: Truck,
  [ADDRESS_TYPES.FACTORY]: Factory,
  [ADDRESS_TYPES.WAREHOUSE]: Warehouse,
  [ADDRESS_TYPES.OTHER]: MapPin
} as const;

const AddressesSection: React.FC<AddressesSectionProps> = ({
  value,
  onChange,
  disabled = false,
  mode = 'create'
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

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

  // Convert API format to internal format
  const convertToInternalFormat = (apiAddress: AddressOutput): Address => {
    const country = countries.find(c => c.code === apiAddress.country_code);
    return {
      id: apiAddress.id,
      address_type: apiAddress.type || ADDRESS_TYPES.OTHER,
      line1: apiAddress.address_line1 || '',
      line2: apiAddress.address_line2 || '',
      city: apiAddress.city || '',
      state: apiAddress.state || apiAddress.state_code || '',
      country: country?.name || apiAddress.country || '',
      country_code: apiAddress.country_code || DEFAULT_COUNTRY_CODE,
      postal_code: apiAddress.postal_code || '',
      is_primary: apiAddress.is_primary || false,
      is_verified: apiAddress.is_verified || false,
      notes: apiAddress.notes || ''
    };
  };

  // Convert internal format to API format
  const convertToApiFormat = (internalAddress: Address): AddressOutput => {
    let countryCode = internalAddress.country_code;
    if (!countryCode && internalAddress.country) {
      const country = countries.find(c => c.name === internalAddress.country);
      countryCode = country?.code || DEFAULT_COUNTRY_CODE;
    }

    return {
      id: internalAddress.id,
      type: internalAddress.address_type,
      label: getAddressTypeInfo(internalAddress.address_type).label,
      address_line1: internalAddress.line1,
      address_line2: internalAddress.line2,
      city: internalAddress.city,
      state: internalAddress.state,
      state_code: internalAddress.state,
      country: internalAddress.country,
      country_code: countryCode,
      postal_code: internalAddress.postal_code,
      google_pin: internalAddress.notes,
      is_primary: internalAddress.is_primary,
      is_verified: internalAddress.is_verified,
      notes: internalAddress.notes
    };
  };

  const defaultCountry = countries.find(c => c.code === DEFAULT_COUNTRY_CODE) || countries[0];
  const defaultState = defaultCountry?.states?.[0]?.name || '';

  const addAddress = (newAddress: Omit<Address, 'id'>) => {
    if (disabled) return;

    const addressWithId: Address = {
      ...newAddress,
      id: `temp_${Date.now()}`
    };

    let updatedAddresses = value.slice();
    if (addressWithId.is_primary) {
      updatedAddresses = updatedAddresses.map(addr => ({ ...addr, is_primary: false }));
    }

    const apiFormatAddress = convertToApiFormat(addressWithId);
    onChange([...updatedAddresses, apiFormatAddress]);
    setIsAddingAddress(false);
  };

  const removeAddress = (index: number) => {
    if (disabled) return;

    const removedAddress = value[index];
    const newAddresses = value.filter((_, i) => i !== index);

    if (removedAddress.is_primary && newAddresses.length > 0) {
      newAddresses[0] = { ...newAddresses[0], is_primary: true };
    }

    onChange(newAddresses);
    setShowDeleteDialog(false);
    setDeleteIndex(null);
  };

  const updateAddress = (index: number, updates: Partial<Address>) => {
    if (disabled) return;

    const updatedAddresses = [...value];
    const currentAddress = convertToInternalFormat(value[index]);
    const updatedInternalAddress = { ...currentAddress, ...updates };

    if (updates.is_primary) {
      updatedAddresses.forEach((addr, i) => {
        if (i !== index) {
          updatedAddresses[i] = { ...addr, is_primary: false };
        }
      });
    }

    updatedAddresses[index] = convertToApiFormat(updatedInternalAddress);
    onChange(updatedAddresses);
  };

  const handleDeleteClick = (index: number) => {
    setDeleteIndex(index);
    setShowDeleteDialog(true);
  };

  const formatAddress = (address: AddressOutput): string => {
    const parts = [
      address.address_line1,
      address.address_line2,
      address.city,
      address.state,
      address.postal_code,
      address.country
    ].filter(Boolean);

    return parts.join(', ') || 'Incomplete address';
  };

  const getAddressTypeInfo = (addressType: string | null | undefined) => {
    if (!addressType) return ADDRESS_TYPE_LABELS[ADDRESS_TYPES.OTHER];
    const typeKey = addressType as keyof typeof ADDRESS_TYPE_LABELS;
    return ADDRESS_TYPE_LABELS[typeKey] || ADDRESS_TYPE_LABELS[ADDRESS_TYPES.OTHER];
  };

  return (
    <div className="rounded-2xl shadow-sm border p-6" style={glassStyle}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>Addresses</h2>
        {!isAddingAddress && (
          <button
            onClick={() => setIsAddingAddress(true)}
            disabled={disabled}
            className="flex items-center px-3 py-2 rounded-md hover:opacity-90 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#ffffff'
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Address
          </button>
        )}
      </div>

      {/* Add Address Form */}
      {isAddingAddress && (
        <div className="mb-4">
          <AddAddressForm
            onAdd={addAddress}
            onCancel={() => setIsAddingAddress(false)}
            defaultCountry={defaultCountry}
            defaultState={defaultState}
            isPrimary={value.length === 0}
            colors={colors}
            isDarkMode={isDarkMode}
            inputStyle={inputStyle}
          />
        </div>
      )}

      {/* Existing Addresses */}
      {value.length === 0 && !isAddingAddress ? (
        <div
          className="text-center p-8 border-2 border-dashed rounded-xl"
          style={{
            borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
          }}
        >
          <MapPin className="h-12 w-12 mx-auto mb-3" style={{ color: colors.utility.secondaryText }} />
          <p className="mb-4" style={{ color: colors.utility.secondaryText }}>No addresses added yet</p>
          <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
            Add office, billing, or shipping addresses for this contact
          </p>
          <button
            onClick={() => setIsAddingAddress(true)}
            disabled={disabled}
            className="flex items-center px-4 py-2 rounded-md hover:opacity-90 transition-colors mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#ffffff'
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Address
          </button>
        </div>
      ) : value.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {value.map((address, index) => {
            const addressTypeInfo = getAddressTypeInfo(address.type);
            const IconComponent = ADDRESS_TYPE_ICONS[address.type as keyof typeof ADDRESS_TYPE_ICONS] || MapPin;
            const isEditing = editingIndex === index;

            return (
              <div
                key={address.id || `address-${index}`}
                className="relative p-4 rounded-xl border hover:shadow-md transition-all"
                style={cardStyle}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-lg"
                      style={{
                        backgroundColor: `${colors.brand.primary}20`,
                        color: colors.brand.primary
                      }}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
                        {addressTypeInfo.label}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {address.is_primary && (
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
                        {address.is_verified && (
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
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!address.is_primary && (
                      <button
                        onClick={() => updateAddress(index, { is_primary: true })}
                        disabled={disabled}
                        className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                        style={{ color: colors.utility.secondaryText }}
                        title="Set as primary"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setEditingIndex(isEditing ? null : index)}
                      disabled={disabled}
                      className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                      style={{ color: colors.utility.secondaryText }}
                      title="Edit address"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(index)}
                      disabled={disabled}
                      className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                      style={{ color: colors.semantic.error }}
                      title="Remove address"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <EditAddressForm
                    address={convertToInternalFormat(address)}
                    onSave={(updates) => {
                      updateAddress(index, updates);
                      setEditingIndex(null);
                    }}
                    onCancel={() => setEditingIndex(null)}
                    colors={colors}
                    isDarkMode={isDarkMode}
                    inputStyle={inputStyle}
                  />
                ) : (
                  <div>
                    <p className="text-sm mb-2" style={{ color: colors.utility.primaryText }}>
                      {formatAddress(address)}
                    </p>

                    {address.notes && (
                      <p className="text-xs italic" style={{ color: colors.utility.secondaryText }}>
                        💡 {address.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

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
            <strong style={{ color: colors.utility.primaryText }}>{value.length}</strong> address{value.length !== 1 ? 'es' : ''} added
            {value.filter(addr => addr.is_primary).length > 0 && (
              <span>
                {' '} • <strong style={{ color: colors.utility.primaryText }}>1</strong> primary address
              </span>
            )}
            {value.filter(addr => addr.is_verified).length > 0 && (
              <span>
                {' '} • <strong style={{ color: colors.utility.primaryText }}>{value.filter(addr => addr.is_verified).length}</strong> verified
              </span>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeleteIndex(null);
        }}
        onConfirm={() => {
          if (deleteIndex !== null) {
            removeAddress(deleteIndex);
          }
        }}
        title="Remove Address"
        description="Are you sure you want to remove this address?"
        confirmText="Remove"
        type="danger"
        icon={<Trash2 className="h-6 w-6" />}
      />
    </div>
  );
};

// Add Address Form Component
interface AddAddressFormProps {
  onAdd: (address: Omit<Address, 'id'>) => void;
  onCancel: () => void;
  defaultCountry: any;
  defaultState: string;
  isPrimary: boolean;
  colors: any;
  isDarkMode: boolean;
  inputStyle: React.CSSProperties;
}

const AddAddressForm: React.FC<AddAddressFormProps> = ({
  onAdd,
  onCancel,
  defaultCountry,
  defaultState,
  isPrimary,
  colors,
  isDarkMode,
  inputStyle
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>(defaultCountry.code);
  const [newAddress, setNewAddress] = useState<Omit<Address, 'id'>>({
    address_type: ADDRESS_TYPES.OFFICE,
    line1: '',
    line2: '',
    city: '',
    state: defaultState,
    country: defaultCountry.name,
    country_code: defaultCountry.code,
    postal_code: '',
    is_primary: isPrimary,
    is_verified: false,
    notes: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const getStatesForCountry = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    return country?.states || [];
  };

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    if (country) {
      setSelectedCountry(countryCode);
      const firstState = country.states?.[0]?.name || '';
      setNewAddress(prev => ({
        ...prev,
        country: country.name,
        country_code: country.code,
        state: firstState
      }));
    }
  };

  const validateAddress = (address: typeof newAddress): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!address.line1?.trim()) {
      errors.line1 = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (address.line1.length > VALIDATION_RULES.ADDRESS_MAX_LENGTH) {
      errors.line1 = ERROR_MESSAGES.MAX_LENGTH(VALIDATION_RULES.ADDRESS_MAX_LENGTH);
    }

    if (!address.city?.trim()) {
      errors.city = ERROR_MESSAGES.REQUIRED_FIELD;
    }

    if (!address.state?.trim()) {
      errors.state = ERROR_MESSAGES.REQUIRED_FIELD;
    }

    if (!address.postal_code?.trim()) {
      errors.postal_code = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (address.postal_code.length > VALIDATION_RULES.POSTAL_CODE_MAX_LENGTH) {
      errors.postal_code = ERROR_MESSAGES.MAX_LENGTH(VALIDATION_RULES.POSTAL_CODE_MAX_LENGTH);
    }

    if (address.country_code === 'IN' && !/^\d{6}$/.test(address.postal_code)) {
      errors.postal_code = 'Invalid postal code (6 digits required for India)';
    }

    if (!address.country_code) {
      errors.country_code = 'Country selection is required';
    }

    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateAddress(newAddress);

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    onAdd(newAddress);
  };

  const markFieldTouched = (fieldId: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldId));
  };

  return (
    <div
      className="p-4 rounded-xl border"
      style={{
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Address Type */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>Address Type</label>
          <select
            value={newAddress.address_type}
            onChange={(e) => setNewAddress({ ...newAddress, address_type: e.target.value })}
            className="w-full p-2 border rounded-md"
            style={inputStyle}
          >
            {Object.entries(ADDRESS_TYPE_LABELS).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        {/* Address Lines */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              Address Line 1 *
            </label>
            <input
              type="text"
              value={newAddress.line1}
              onChange={(e) => {
                setNewAddress({ ...newAddress, line1: e.target.value });
                if (validationErrors.line1) {
                  setValidationErrors(prev => ({ ...prev, line1: '' }));
                }
              }}
              onBlur={() => markFieldTouched('line1')}
              placeholder="House/Flat No, Building Name"
              className="w-full p-2 border rounded-md"
              style={{
                ...inputStyle,
                borderColor: validationErrors.line1 && touchedFields.has('line1')
                  ? colors.semantic.error
                  : inputStyle.borderColor,
              }}
            />
            {validationErrors.line1 && touchedFields.has('line1') && (
              <p className="text-xs mt-1" style={{ color: colors.semantic.error }}>{validationErrors.line1}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              Address Line 2
            </label>
            <input
              type="text"
              value={newAddress.line2}
              onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
              placeholder={PLACEHOLDER_TEXTS.STREET}
              className="w-full p-2 border rounded-md"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Country, State, City, Postal Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>Country</label>
            <select
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full p-2 border rounded-md"
              style={inputStyle}
            >
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
              Country code: {newAddress.country_code}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>State *</label>
            {getStatesForCountry(selectedCountry).length > 0 ? (
              <select
                value={newAddress.state}
                onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                className="w-full p-2 border rounded-md"
                style={inputStyle}
              >
                {getStatesForCountry(selectedCountry).map(state => (
                  <option key={state.code} value={state.name}>{state.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={newAddress.state}
                onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                onBlur={() => markFieldTouched('state')}
                placeholder={PLACEHOLDER_TEXTS.STATE}
                className="w-full p-2 border rounded-md"
                style={{
                  ...inputStyle,
                  borderColor: validationErrors.state && touchedFields.has('state')
                    ? colors.semantic.error
                    : inputStyle.borderColor,
                }}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>City *</label>
            <input
              type="text"
              value={newAddress.city}
              onChange={(e) => {
                setNewAddress({ ...newAddress, city: e.target.value });
                if (validationErrors.city) {
                  setValidationErrors(prev => ({ ...prev, city: '' }));
                }
              }}
              onBlur={() => markFieldTouched('city')}
              placeholder={PLACEHOLDER_TEXTS.CITY}
              className="w-full p-2 border rounded-md"
              style={{
                ...inputStyle,
                borderColor: validationErrors.city && touchedFields.has('city')
                  ? colors.semantic.error
                  : inputStyle.borderColor,
              }}
            />
            {validationErrors.city && touchedFields.has('city') && (
              <p className="text-xs mt-1" style={{ color: colors.semantic.error }}>{validationErrors.city}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              Postal Code *
            </label>
            <input
              type="text"
              value={newAddress.postal_code}
              onChange={(e) => {
                setNewAddress({ ...newAddress, postal_code: e.target.value });
                if (validationErrors.postal_code) {
                  setValidationErrors(prev => ({ ...prev, postal_code: '' }));
                }
              }}
              onBlur={() => markFieldTouched('postal_code')}
              placeholder={PLACEHOLDER_TEXTS.POSTAL_CODE}
              maxLength={VALIDATION_RULES.POSTAL_CODE_MAX_LENGTH}
              className="w-full p-2 border rounded-md"
              style={{
                ...inputStyle,
                borderColor: validationErrors.postal_code && touchedFields.has('postal_code')
                  ? colors.semantic.error
                  : inputStyle.borderColor,
              }}
            />
            {validationErrors.postal_code && touchedFields.has('postal_code') && (
              <p className="text-xs mt-1" style={{ color: colors.semantic.error }}>{validationErrors.postal_code}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
            Notes (Optional)
          </label>
          <textarea
            value={newAddress.notes || ''}
            onChange={(e) => setNewAddress({ ...newAddress, notes: e.target.value })}
            placeholder="Delivery instructions, landmarks, etc."
            rows={2}
            className="w-full p-2 border rounded-md resize-none"
            style={inputStyle}
          />
        </div>

        {/* Primary Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="new_is_primary"
            checked={newAddress.is_primary}
            onChange={(e) => setNewAddress({ ...newAddress, is_primary: e.target.checked })}
            className="mr-2"
            style={{ accentColor: colors.brand.primary }}
          />
          <label htmlFor="new_is_primary" className="text-sm" style={{ color: colors.utility.primaryText }}>
            Set as primary address
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-md hover:opacity-90 transition-colors text-sm"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#ffffff'
            }}
          >
            <Check className="mr-2 h-4 w-4 inline" />
            Add Address
          </button>
          <button
            type="button"
            onClick={onCancel}
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
      </form>
    </div>
  );
};

// Edit Address Form Component
interface EditAddressFormProps {
  address: Address;
  onSave: (updates: Partial<Address>) => void;
  onCancel: () => void;
  colors: any;
  isDarkMode: boolean;
  inputStyle: React.CSSProperties;
}

const EditAddressForm: React.FC<EditAddressFormProps> = ({
  address,
  onSave,
  onCancel,
  colors,
  isDarkMode,
  inputStyle
}) => {
  const [editedAddress, setEditedAddress] = useState(address);

  const handleSave = () => {
    onSave(editedAddress);
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={editedAddress.line1}
        onChange={(e) => setEditedAddress({ ...editedAddress, line1: e.target.value })}
        placeholder="Address Line 1"
        className="w-full p-2 border rounded-md text-sm"
        style={inputStyle}
      />
      <input
        type="text"
        value={editedAddress.line2 || ''}
        onChange={(e) => setEditedAddress({ ...editedAddress, line2: e.target.value })}
        placeholder="Address Line 2"
        className="w-full p-2 border rounded-md text-sm"
        style={inputStyle}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={editedAddress.city}
          onChange={(e) => setEditedAddress({ ...editedAddress, city: e.target.value })}
          placeholder="City"
          className="p-2 border rounded-md text-sm"
          style={inputStyle}
        />
        <input
          type="text"
          value={editedAddress.postal_code}
          onChange={(e) => setEditedAddress({ ...editedAddress, postal_code: e.target.value })}
          placeholder="Postal Code"
          className="p-2 border rounded-md text-sm"
          style={inputStyle}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 px-3 py-1.5 rounded-md hover:opacity-90 transition-colors text-sm"
          style={{
            backgroundColor: colors.brand.primary,
            color: '#ffffff'
          }}
        >
          <Check className="mr-2 h-4 w-4 inline" />
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-1.5 border rounded-md hover:opacity-80 transition-colors text-sm"
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
  );
};

export default AddressesSection;
