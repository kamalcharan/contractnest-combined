// src/components/contacts/QuickAddContactDrawer.tsx
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
  Globe
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCreateContact } from '../../hooks/useContacts';
import {
  SALUTATIONS,
  CONTACT_CLASSIFICATION_CONFIG
} from '../../utils/constants/contacts';

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

const CHANNEL_TYPES = [
  { value: 'email', label: 'Email', icon: Mail, placeholder: 'email@example.com' },
  { value: 'mobile', label: 'Mobile', icon: Phone, placeholder: '+91 98765 43210' },
  { value: 'phone', label: 'Phone', icon: Phone, placeholder: '+91 11 2345 6789' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, placeholder: '+91 98765 43210' },
  { value: 'website', label: 'Website', icon: Globe, placeholder: 'https://example.com' },
];

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

  // API Hook
  const createContactHook = useCreateContact();

  // Race condition prevention
  const isSavingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Form state
  const [formData, setFormData] = useState<QuickFormData>({
    classifications: [],
    type: 'individual',
    salutation: '',
    name: '',
    company_name: '',
    contact_channels: [{ id: 'channel_1', channel_type: 'email', value: '' }]
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
        contact_channels: [{ id: 'channel_1', channel_type: 'email', value: '' }]
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
        { id: newId, channel_type: 'email', value: '' }
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
  const updateChannel = (id: string, field: 'channel_type' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      contact_channels: prev.contact_channels.map(c =>
        c.id === id ? { ...c, [field]: value } : c
      )
    }));
    if (errors.contact_channels) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.contact_channels;
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.classifications.length === 0) {
      newErrors.classifications = 'Select at least one classification';
    }

    if (formData.type === 'individual' && !formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.type === 'corporate' && !formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    const validChannels = formData.contact_channels.filter(c => c.value.trim());
    if (validChannels.length === 0) {
      newErrors.contact_channels = 'At least one contact channel is required';
    }

    // Validate email format
    formData.contact_channels.forEach(channel => {
      if (channel.channel_type === 'email' && channel.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(channel.value.trim())) {
          newErrors.contact_channels = 'Please enter a valid email address';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save with race condition prevention
  const handleSave = async () => {
    // Prevent double submission
    if (isSavingRef.current || isSaving) {
      // console.log('Save already in progress, ignoring duplicate call');
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
          .map(c => ({
            channel_type: c.channel_type,
            value: c.value.trim(),
            is_primary: c.id === formData.contact_channels[0]?.id
          })),
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

      // console.log('Creating contact with data:', contactData);

      const result = await createContactHook.mutate(contactData);

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        // console.log('Request was aborted');
        return;
      }

      // Success
      if (onSuccess) {
        onSuccess(result.id);
      }
      onClose();

    } catch (error: any) {
      // Check if this is an abort error
      if (error.name === 'AbortError') {
        // console.log('Request aborted');
        return;
      }

      // console.error('Failed to create contact:', error);
      setErrors({ submit: error.message || 'Failed to create entity. Please try again.' });
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
      abortControllerRef.current = null;
    }
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

  // Get classification color
  const getClassificationColor = (colorName: string) => {
    switch (colorName) {
      case 'blue': return { bg: colors.brand.primary + '20', border: colors.brand.primary + '40', text: colors.brand.primary };
      case 'green': return { bg: colors.semantic.success + '20', border: colors.semantic.success + '40', text: colors.semantic.success };
      case 'purple': return { bg: colors.brand.tertiary + '20', border: colors.brand.tertiary + '40', text: colors.brand.tertiary };
      case 'orange': return { bg: colors.semantic.warning + '20', border: colors.semantic.warning + '40', text: colors.semantic.warning };
      case 'indigo': return { bg: colors.semantic.info + '20', border: colors.semantic.info + '40', text: colors.semantic.info };
      default: return { bg: colors.utility.secondaryText + '20', border: colors.utility.secondaryText + '40', text: colors.utility.secondaryText };
    }
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
        className="fixed top-0 right-0 h-full w-[500px] z-50 flex flex-col shadow-2xl transform transition-transform duration-400 ease-out"
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
              Quick Add Entity
            </h2>
            <p
              className="text-xs mt-1"
              style={{ color: colors.utility.secondaryText }}
            >
              Add a new entity quickly
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
                const colorSet = getClassificationColor(cls.color);
                return (
                  <button
                    key={cls.id}
                    onClick={() => toggleClassification(cls.id)}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: isSelected ? colorSet.bg : 'transparent',
                      borderColor: isSelected ? colorSet.border : colors.utility.primaryText + '20',
                      color: isSelected ? colorSet.text : colors.utility.secondaryText,
                    }}
                  >
                    {cls.icon} {cls.label}
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
              {formData.contact_channels.map((channel, index) => (
                <div key={channel.id} className="flex gap-2">
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
                    {CHANNEL_TYPES.map(ct => (
                      <option key={ct.value} value={ct.value}>{ct.label}</option>
                    ))}
                  </select>
                  <input
                    type={channel.channel_type === 'email' ? 'email' : 'text'}
                    value={channel.value}
                    onChange={(e) => updateChannel(channel.id, 'value', e.target.value)}
                    disabled={isSaving}
                    placeholder={CHANNEL_TYPES.find(ct => ct.value === channel.channel_type)?.placeholder || ''}
                    className="flex-1 p-3 rounded-xl border-2 text-sm transition-all focus:outline-none disabled:opacity-50"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: errors.contact_channels && index === 0 ? colors.semantic.error : colors.utility.primaryText + '20',
                      color: colors.utility.primaryText,
                    }}
                  />
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
              ))}
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
                'Save Entity'
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
