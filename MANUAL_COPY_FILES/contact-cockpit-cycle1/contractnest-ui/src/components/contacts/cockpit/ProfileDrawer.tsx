// src/components/contacts/cockpit/ProfileDrawer.tsx
// Profile Drawer - Slides from right, contains contact demographics
// Cycle 1 v2: Matches existing ViewCard UI exactly, modal-only editing

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Mail,
  Phone,
  MapPin,
  Shield,
  Star,
  Edit,
  Tag,
  User,
  Building2,
  Loader2,
  MessageSquare,
  Globe,
  Linkedin,
  Send,
  Archive,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';

// Import form components for modal editing (same as ContactSummaryTab)
import ContactChannelsSection from '@/components/contacts/forms/ContactChannelsSection';
import AddressesSection from '@/components/contacts/forms/AddressesSection';
import ComplianceNumbersSection from '@/components/contacts/forms/ComplianceNumbersSection';
import ContactPersonsSection from '@/components/contacts/forms/ContactPersonsSection';
import ContactTagsSection from '@/components/contacts/forms/ContactTagsSection';
import ContactClassificationSelector from '@/components/contacts/forms/ContactClassificationSelector';

// Import hooks
import { useUpdateContact, useUpdateContactStatus } from '@/hooks/useContacts';

// Import UI components
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

// Import constants
import {
  CONTACT_CHANNEL_TYPES,
  CONTACT_CLASSIFICATION_CONFIG,
  getClassificationColors,
} from '@/utils/constants/contacts';

// Types (same as ContactSummaryTab)
interface ContactChannel {
  id: string;
  channel_type: string;
  value: string;
  country_code?: string;
  is_primary: boolean;
  is_verified: boolean;
  notes?: string;
}

interface Contact {
  id: string;
  type: 'individual' | 'corporate';
  status: 'active' | 'inactive' | 'archived';
  name?: string;
  salutation?: string;
  company_name?: string;
  registration_number?: string;
  website?: string;
  industry?: string;
  classifications: any[];
  tags: any[];
  compliance_numbers: any[];
  contact_channels: ContactChannel[];
  addresses: any[];
  contact_persons: any[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

type ModalType = 'channels' | 'classification' | 'persons' | 'tags' | 'address' | 'compliance' | null;

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact;
  onRefresh?: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// EDIT MODAL COMPONENT (Same as ContactSummaryTab)
// ═══════════════════════════════════════════════════════════════════
const EditModal: React.FC<{
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  onSave: () => Promise<void>;
  isSaving: boolean;
}> = ({ isOpen, title, onClose, children, onSave, isSaving }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  if (!isOpen) return null;

  const glassStyle: React.CSSProperties = {
    background: isDarkMode
      ? 'rgba(15, 23, 42, 0.95)'
      : 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border animate-in zoom-in-95 duration-200"
        style={{
          ...glassStyle,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:opacity-70 transition-colors"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
            <X className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-6">
          {children}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        >
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl font-medium transition-colors"
            style={{
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              color: colors.utility.primaryText,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-6 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
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
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// VIEW CARD COMPONENT (Same as ContactSummaryTab)
// ═══════════════════════════════════════════════════════════════════
const ViewCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  onEdit: () => void;
  children: React.ReactNode;
  count?: number;
}> = ({ title, icon, iconBg, onEdit, children, count }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const glassStyle: React.CSSProperties = {
    background: isDarkMode
      ? 'rgba(30, 41, 59, 0.8)'
      : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderColor: isDarkMode
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.08)',
  };

  return (
    <div
      className="rounded-xl border p-4 transition-all hover:shadow-md"
      style={glassStyle}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded-lg"
            style={{ backgroundColor: iconBg }}
          >
            {icon}
          </div>
          <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
            {title}
          </span>
          {count !== undefined && (
            <span
              className="px-1.5 py-0.5 rounded-full text-xs"
              style={{
                backgroundColor: iconBg,
                color: colors.utility.primaryText,
              }}
            >
              {count}
            </span>
          )}
        </div>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:opacity-70 transition-colors"
          style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
        >
          <Edit className="h-3.5 w-3.5" style={{ color: colors.utility.secondaryText }} />
        </button>
      </div>
      <div className="text-sm" style={{ color: colors.utility.secondaryText }}>
        {children}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN PROFILE DRAWER COMPONENT
// ═══════════════════════════════════════════════════════════════════
const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  isOpen,
  onClose,
  contact,
  onRefresh,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { toast } = useToast();
  const updateContactHook = useUpdateContact();
  const updateStatusHook = useUpdateContactStatus();

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && activeModal === null) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, activeModal]);

  // ─────────────────────────────────────────────────────────────────
  // HELPER FUNCTIONS (Same as ContactSummaryTab)
  // ─────────────────────────────────────────────────────────────────

  // Get classification label from value
  const getClassificationLabel = (value: string): string => {
    const config = CONTACT_CLASSIFICATION_CONFIG?.find((c) => c.id === value);
    if (config) return config.label;
    return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
  };

  // Normalize classifications (API returns strings, UI needs objects)
  const normalizeClassifications = (classifications: any[]): Array<{ id: string; classification_value: string; classification_label: string }> => {
    if (!classifications || !Array.isArray(classifications)) return [];

    return classifications.map((cls, index) => {
      if (typeof cls === 'object' && cls.classification_value) {
        return {
          id: cls.id || `cls-${index}`,
          classification_value: cls.classification_value,
          classification_label: cls.classification_label || getClassificationLabel(cls.classification_value),
        };
      }
      if (typeof cls === 'string') {
        return {
          id: `cls-${index}`,
          classification_value: cls,
          classification_label: getClassificationLabel(cls),
        };
      }
      return {
        id: `cls-${index}`,
        classification_value: String(cls),
        classification_label: String(cls),
      };
    });
  };

  const normalizedClassifications = normalizeClassifications(contact.classifications);

  // Get classification badge colors
  const getClassificationBadgeColors = (classificationValue: string) => {
    const config = CONTACT_CLASSIFICATION_CONFIG?.find((c) => c.id === classificationValue);
    return getClassificationColors(config?.colorKey || 'purple', colors, 'badge');
  };

  // Get channel icon
  const getChannelIcon = (channelType: string) => {
    switch (channelType) {
      case CONTACT_CHANNEL_TYPES.MOBILE:
        return Phone;
      case CONTACT_CHANNEL_TYPES.EMAIL:
        return Mail;
      case CONTACT_CHANNEL_TYPES.WHATSAPP:
        return MessageSquare;
      case CONTACT_CHANNEL_TYPES.WEBSITE:
        return Globe;
      case CONTACT_CHANNEL_TYPES.LINKEDIN:
        return Linkedin;
      case CONTACT_CHANNEL_TYPES.TELEGRAM:
        return Send;
      default:
        return Phone;
    }
  };

  // Sort channels: primary first
  const sortedChannels = [...contact.contact_channels].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return 0;
  });

  // Get primary channel for a person
  const getPersonPrimaryChannel = (person: any): string | null => {
    if (!person.contact_channels || person.contact_channels.length === 0) return null;
    const primary = person.contact_channels.find((ch: any) => ch.is_primary);
    const channel = primary || person.contact_channels[0];
    return channel?.value || null;
  };

  // ─────────────────────────────────────────────────────────────────
  // MODAL & SAVE LOGIC (Same as ContactSummaryTab)
  // ─────────────────────────────────────────────────────────────────
  const openModal = (type: ModalType) => {
    switch (type) {
      case 'channels':
        setFormData({ contact_channels: [...contact.contact_channels] });
        break;
      case 'classification':
        setFormData({ classifications: normalizeClassifications(contact.classifications) });
        break;
      case 'persons':
        setFormData({ contact_persons: [...contact.contact_persons] });
        break;
      case 'tags':
        setFormData({ tags: [...contact.tags] });
        break;
      case 'address':
        setFormData({ addresses: [...contact.addresses] });
        break;
      case 'compliance':
        setFormData({ compliance_numbers: [...contact.compliance_numbers] });
        break;
    }
    setActiveModal(type);
  };

  // Transform classifications for API (must be strings only)
  const transformClassificationsForAPI = (classifications: any[]): string[] => {
    if (!classifications || !Array.isArray(classifications)) return [];
    return classifications
      .map((c: any) => {
        if (typeof c === 'string') return c;
        if (c?.classification_value) return c.classification_value;
        if (c?.value) return c.value;
        return String(c);
      })
      .filter((c: string) => c && c.length > 0);
  };

  // Transform contact channels for API
  const transformChannelsForAPI = (channels: any[]): any[] => {
    if (!channels || !Array.isArray(channels)) return [];
    return channels
      .map((ch: any) => {
        const channel: any = {
          channel_type: ch.channel_type,
          value: ch.value,
          is_primary: Boolean(ch.is_primary),
          is_verified: Boolean(ch.is_verified),
        };
        if (ch.id && typeof ch.id === 'string' && !ch.id.startsWith('temp_')) {
          channel.id = ch.id;
        }
        if (ch.country_code) channel.country_code = ch.country_code;
        if (ch.notes) channel.notes = ch.notes;
        return channel;
      })
      .filter((ch: any) => ch.channel_type && ch.value);
  };

  // Transform form data for API
  const transformFormDataForAPI = (modalType: ModalType, data: any): any => {
    const existingClassifications = transformClassificationsForAPI(contact.classifications);
    const existingChannels = transformChannelsForAPI(contact.contact_channels);

    const transformed: any = {
      classifications: existingClassifications,
      contact_channels: existingChannels,
    };

    switch (modalType) {
      case 'classification':
        if (data.classifications && Array.isArray(data.classifications)) {
          transformed.classifications = transformClassificationsForAPI(data.classifications);
        }
        break;

      case 'channels':
        if (data.contact_channels && Array.isArray(data.contact_channels)) {
          transformed.contact_channels = transformChannelsForAPI(data.contact_channels);
        }
        break;

      case 'tags':
        if (data.tags && Array.isArray(data.tags)) {
          transformed.tags = data.tags
            .filter((t: any) => t.tag_value)
            .map((t: any) => {
              const tag: any = {
                tag_value: t.tag_value,
                tag_label: t.tag_label || t.tag_value,
              };
              if (t.id && typeof t.id === 'string' && !t.id.startsWith('temp_')) {
                tag.id = t.id;
              }
              if (t.tag_color) tag.tag_color = t.tag_color;
              return tag;
            });
        }
        break;

      case 'address':
        if (data.addresses && Array.isArray(data.addresses)) {
          transformed.addresses = data.addresses
            .filter((addr: any) => addr.address_line1 && addr.city)
            .map((addr: any) => {
              const address: any = {
                type: addr.type || 'office',
                address_line1: addr.address_line1,
                city: addr.city,
                country_code: addr.country_code || 'IN',
                is_primary: Boolean(addr.is_primary),
              };
              if (addr.id && typeof addr.id === 'string' && !addr.id.startsWith('temp_')) {
                address.id = addr.id;
              }
              if (addr.label) address.label = addr.label;
              if (addr.address_line2) address.address_line2 = addr.address_line2;
              if (addr.state_code) address.state_code = addr.state_code;
              if (addr.postal_code) address.postal_code = addr.postal_code;
              if (addr.google_pin) address.google_pin = addr.google_pin;
              if (addr.notes) address.notes = addr.notes;
              return address;
            });
        }
        break;

      case 'compliance':
        if (data.compliance_numbers && Array.isArray(data.compliance_numbers)) {
          transformed.compliance_numbers = data.compliance_numbers
            .filter((comp: any) => comp.type_value && comp.number)
            .map((comp: any) => {
              const compliance: any = {
                type_value: comp.type_value,
                number: comp.number,
                is_verified: Boolean(comp.is_verified),
              };
              if (comp.id && typeof comp.id === 'string' && !comp.id.startsWith('temp_')) {
                compliance.id = comp.id;
              }
              if (comp.type_label) compliance.type_label = comp.type_label;
              if (comp.valid_from) compliance.valid_from = comp.valid_from;
              if (comp.valid_to) compliance.valid_to = comp.valid_to;
              if (comp.issuing_authority) compliance.issuing_authority = comp.issuing_authority;
              if (comp.notes) compliance.notes = comp.notes;
              return compliance;
            });
        }
        break;

      case 'persons':
        if (data.contact_persons && Array.isArray(data.contact_persons)) {
          transformed.contact_persons = data.contact_persons
            .filter((person: any) => person.name)
            .map((person: any) => {
              const p: any = {
                name: person.name,
                is_primary: Boolean(person.is_primary),
                contact_channels: (person.contact_channels || [])
                  .filter((ch: any) => ch.channel_type && ch.value)
                  .map((ch: any) => {
                    const channel: any = {
                      channel_type: ch.channel_type,
                      value: ch.value,
                      is_primary: Boolean(ch.is_primary),
                    };
                    if (ch.id && typeof ch.id === 'string' && !ch.id.startsWith('temp_')) {
                      channel.id = ch.id;
                    }
                    if (ch.country_code) channel.country_code = ch.country_code;
                    return channel;
                  }),
              };
              if (person.id && typeof person.id === 'string' && !person.id.startsWith('temp_')) {
                p.id = person.id;
              }
              if (person.salutation) p.salutation = person.salutation;
              if (person.designation) p.designation = person.designation;
              if (person.department) p.department = person.department;
              if (person.notes) p.notes = person.notes;
              return p;
            });
        }
        break;
    }

    return transformed;
  };

  // Save modal changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const transformedData = transformFormDataForAPI(activeModal, formData);

      await updateContactHook.mutate({
        contactId: contact.id,
        updates: transformedData,
      });

      toast({
        title: 'Saved!',
        description: 'Changes saved successfully',
        duration: 2000,
      });

      setActiveModal(null);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      let errorMessage = 'Could not save changes. Please try again.';
      if (error.response?.data?.validation_errors && Array.isArray(error.response.data.validation_errors)) {
        errorMessage = error.response.data.validation_errors.join(', ');
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle status toggle
  const handleStatusChange = async (newStatus: 'active' | 'inactive') => {
    setIsUpdatingStatus(true);
    try {
      await updateStatusHook.mutate(contact.id, newStatus);
      toast({
        title: 'Success',
        description: `Contact ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
        duration: 3000,
      });
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update contact status',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle archive
  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      await updateStatusHook.mutate(contact.id, 'archived');
      toast({
        title: 'Contact Archived',
        description: 'The contact has been permanently archived',
        duration: 3000,
      });
      setShowArchiveConfirm(false);
      onClose();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Archive Failed',
        description: 'Could not archive contact. Please try again.',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  // Get modal title
  const getModalTitle = () => {
    switch (activeModal) {
      case 'channels':
        return 'Edit Contact Channels';
      case 'classification':
        return 'Edit Classifications';
      case 'persons':
        return 'Edit Contact Persons';
      case 'tags':
        return 'Edit Tags';
      case 'address':
        return 'Edit Addresses';
      case 'compliance':
        return 'Edit Compliance Numbers';
      default:
        return 'Edit';
    }
  };

  // Render modal content
  const renderModalContent = () => {
    switch (activeModal) {
      case 'channels':
        return (
          <ContactChannelsSection
            value={formData.contact_channels || []}
            onChange={(channels) => setFormData({ ...formData, contact_channels: channels })}
            mode="edit"
          />
        );
      case 'classification':
        return (
          <ContactClassificationSelector
            value={formData.classifications || []}
            onChange={(classifications) => setFormData({ ...formData, classifications })}
            industry={contact.industry}
          />
        );
      case 'persons':
        return (
          <ContactPersonsSection
            value={formData.contact_persons || []}
            onChange={(persons) => setFormData({ ...formData, contact_persons: persons })}
            contactType={contact.type}
          />
        );
      case 'tags':
        return (
          <ContactTagsSection
            value={formData.tags || []}
            onChange={(tags) => setFormData({ ...formData, tags })}
          />
        );
      case 'address':
        return (
          <AddressesSection
            value={formData.addresses || []}
            onChange={(addresses) => setFormData({ ...formData, addresses })}
            mode="edit"
          />
        );
      case 'compliance':
        return (
          <ComplianceNumbersSection
            value={formData.compliance_numbers || []}
            onChange={(compliance) => setFormData({ ...formData, compliance_numbers: compliance })}
            contactType={contact.type}
          />
        );
      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-[380px] max-w-[90vw] z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          overflow-hidden flex flex-col
        `}
        style={{
          background: isDarkMode
            ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)'
            : 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderLeft: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow: isOpen ? '-8px 0 32px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        {/* Drawer Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold"
              style={{
                backgroundColor: colors.brand.primary + '20',
                color: colors.brand.primary,
              }}
            >
              {contact.type === 'corporate' ? (
                <Building2 className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <div>
              <h2
                className="font-semibold text-sm"
                style={{ color: colors.utility.primaryText }}
              >
                Contact Profile
              </h2>
              <p
                className="text-xs capitalize"
                style={{ color: colors.utility.secondaryText }}
              >
                {contact.type}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:opacity-70 transition-colors"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
            <X className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        {/* Drawer Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. Contact Channels Card */}
          <ViewCard
            title="Contact Channels"
            icon={
              contact.type === 'corporate' ? (
                <Building2 className="h-3.5 w-3.5" style={{ color: colors.brand.primary }} />
              ) : (
                <User className="h-3.5 w-3.5" style={{ color: colors.brand.primary }} />
              )
            }
            iconBg={colors.brand.primary + '20'}
            onEdit={() => openModal('channels')}
            count={contact.contact_channels.length}
          >
            <div className="space-y-2">
              {/* Contact Name */}
              <p className="font-medium mb-3" style={{ color: colors.utility.primaryText }}>
                {contact.type === 'corporate' ? contact.company_name : contact.name}
              </p>

              {sortedChannels.length === 0 ? (
                <p className="text-xs italic">No contact channels</p>
              ) : (
                <>
                  {sortedChannels.slice(0, 4).map((channel) => {
                    const IconComponent = getChannelIcon(channel.channel_type);
                    return (
                      <div key={channel.id} className="flex items-center gap-2 text-xs">
                        <IconComponent className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate flex-1">
                          {channel.channel_type === 'mobile' && channel.country_code === 'IN' ? '+91 ' : ''}
                          {channel.value}
                        </span>
                        {channel.is_primary && (
                          <Star
                            className="h-3 w-3 flex-shrink-0"
                            style={{ color: colors.brand.primary, fill: colors.brand.primary }}
                          />
                        )}
                      </div>
                    );
                  })}
                  {sortedChannels.length > 4 && (
                    <button
                      onClick={() => openModal('channels')}
                      className="text-xs hover:underline cursor-pointer"
                      style={{ color: colors.brand.primary }}
                    >
                      +{sortedChannels.length - 4} more channels
                    </button>
                  )}
                </>
              )}
            </div>
          </ViewCard>

          {/* 2. Classification Card */}
          <ViewCard
            title="Classification"
            icon={<Shield className="h-3.5 w-3.5" style={{ color: '#8b5cf6' }} />}
            iconBg="#8b5cf620"
            onEdit={() => openModal('classification')}
            count={normalizedClassifications.length}
          >
            {normalizedClassifications.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {normalizedClassifications.map((cls) => {
                  const badgeColors = getClassificationBadgeColors(cls.classification_value);
                  return (
                    <span
                      key={cls.id}
                      className="px-2 py-0.5 rounded-full text-xs border"
                      style={{
                        backgroundColor: badgeColors.bg,
                        color: badgeColors.text,
                        borderColor: badgeColors.border,
                      }}
                    >
                      {cls.classification_label}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs italic">No classifications</span>
            )}
          </ViewCard>

          {/* 3. Contact Persons Card (Corporate only) */}
          {contact.type === 'corporate' && (
            <ViewCard
              title="Persons"
              icon={<Users className="h-3.5 w-3.5" style={{ color: '#f59e0b' }} />}
              iconBg="#f59e0b20"
              onEdit={() => openModal('persons')}
              count={contact.contact_persons.length}
            >
              {contact.contact_persons.length > 0 ? (
                <div className="space-y-2">
                  {contact.contact_persons.slice(0, 3).map((person) => {
                    const primaryChannel = getPersonPrimaryChannel(person);
                    return (
                      <div key={person.id} className="flex items-start gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                          style={{
                            backgroundColor: person.is_primary ? '#f59e0b' : '#f59e0b20',
                            color: person.is_primary ? '#fff' : '#f59e0b',
                          }}
                        >
                          {person.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span
                              className="text-xs truncate font-medium"
                              style={{ color: colors.utility.primaryText }}
                            >
                              {person.name}
                            </span>
                            {person.is_primary && (
                              <Star
                                className="h-2.5 w-2.5 flex-shrink-0"
                                style={{ color: '#f59e0b', fill: '#f59e0b' }}
                              />
                            )}
                          </div>
                          {primaryChannel && (
                            <p className="text-xs truncate" style={{ color: colors.utility.secondaryText }}>
                              {primaryChannel}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {contact.contact_persons.length > 3 && (
                    <button
                      onClick={() => openModal('persons')}
                      className="text-xs hover:underline cursor-pointer"
                      style={{ color: '#f59e0b' }}
                    >
                      +{contact.contact_persons.length - 3} more
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-xs italic">No contact persons</span>
              )}
            </ViewCard>
          )}

          {/* 4. Tags Card */}
          <ViewCard
            title="Tags"
            icon={<Tag className="h-3.5 w-3.5" style={{ color: '#ec4899' }} />}
            iconBg="#ec489920"
            onEdit={() => openModal('tags')}
            count={contact.tags.length}
          >
            {contact.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {contact.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: (tag.tag_color || '#ec4899') + '20',
                      color: tag.tag_color || '#ec4899',
                    }}
                  >
                    {tag.tag_label}
                  </span>
                ))}
                {contact.tags.length > 5 && (
                  <button
                    onClick={() => openModal('tags')}
                    className="text-xs hover:underline cursor-pointer"
                    style={{ color: '#ec4899' }}
                  >
                    +{contact.tags.length - 5} more
                  </button>
                )}
              </div>
            ) : (
              <span className="text-xs italic">No tags</span>
            )}
          </ViewCard>

          {/* 5. Address Card */}
          <ViewCard
            title="Address"
            icon={<MapPin className="h-3.5 w-3.5" style={{ color: '#10b981' }} />}
            iconBg="#10b98120"
            onEdit={() => openModal('address')}
            count={contact.addresses.length}
          >
            {contact.addresses.length > 0 ? (
              <div className="space-y-1">
                {contact.addresses.slice(0, 2).map((addr: any, idx: number) => (
                  <div key={addr.id || idx} className="flex items-start gap-2">
                    {addr.is_primary && (
                      <Star
                        className="h-2.5 w-2.5 mt-0.5 flex-shrink-0"
                        style={{ color: '#10b981', fill: '#10b981' }}
                      />
                    )}
                    <p className="text-xs line-clamp-2">
                      {addr.address_line1 || addr.line1}, {addr.city}
                    </p>
                  </div>
                ))}
                {contact.addresses.length > 2 && (
                  <button
                    onClick={() => openModal('address')}
                    className="text-xs hover:underline cursor-pointer"
                    style={{ color: '#10b981' }}
                  >
                    +{contact.addresses.length - 2} more
                  </button>
                )}
              </div>
            ) : (
              <span className="text-xs italic">No addresses</span>
            )}
          </ViewCard>

          {/* 6. Compliance Card (Corporate only) */}
          {contact.type === 'corporate' && (
            <ViewCard
              title="Compliance"
              icon={<Shield className="h-3.5 w-3.5" style={{ color: '#3b82f6' }} />}
              iconBg="#3b82f620"
              onEdit={() => openModal('compliance')}
              count={contact.compliance_numbers.length}
            >
              {contact.compliance_numbers.length > 0 ? (
                <div className="space-y-1">
                  {contact.compliance_numbers.slice(0, 3).map((comp: any, idx: number) => (
                    <div key={comp.id || idx} className="flex items-center justify-between">
                      <span className="text-xs font-medium">{comp.type_label || comp.type_value}</span>
                      <span className="text-xs font-mono">{comp.number?.slice(0, 10)}...</span>
                    </div>
                  ))}
                  {contact.compliance_numbers.length > 3 && (
                    <button
                      onClick={() => openModal('compliance')}
                      className="text-xs hover:underline cursor-pointer"
                      style={{ color: '#3b82f6' }}
                    >
                      +{contact.compliance_numbers.length - 3} more
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-xs italic">No compliance numbers</span>
              )}
            </ViewCard>
          )}

          {/* 7. Contact Status Card */}
          {contact.status !== 'archived' && (
            <div
              className="rounded-xl border p-4 transition-all"
              style={{
                background: isDarkMode
                  ? 'rgba(30, 41, 59, 0.8)'
                  : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              }}
            >
              <h3
                className="text-sm font-semibold mb-3 transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Contact Status
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="font-medium text-xs transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {contact.status === 'active' ? 'Active' : 'Inactive'}
                  </p>
                  <p
                    className="text-xs transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {contact.status === 'active'
                      ? 'Contact is available for business'
                      : 'Contact is temporarily disabled'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contact.status === 'active'}
                    onChange={(e) => handleStatusChange(e.target.checked ? 'active' : 'inactive')}
                    disabled={isUpdatingStatus}
                    className="sr-only peer"
                  />
                  <div
                    className={`
                      w-11 h-6 peer-focus:outline-none peer-focus:ring-4
                      rounded-full peer
                      peer-checked:after:translate-x-full peer-checked:after:border-white
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                      after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                      ${isUpdatingStatus ? 'opacity-50' : ''}
                    `}
                    style={{
                      backgroundColor:
                        contact.status === 'active' ? colors.brand.primary : colors.utility.secondaryText + '40',
                    }}
                  />
                </label>
              </div>
              {isUpdatingStatus && (
                <div
                  className="mt-2 flex items-center text-xs"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  Updating status...
                </div>
              )}
            </div>
          )}

          {/* 8. Archive Card */}
          {contact.status !== 'archived' && (
            <div
              className="rounded-xl border p-4 transition-all"
              style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderColor: colors.semantic.error + '40',
              }}
            >
              <div className="flex items-start gap-3">
                <Archive
                  className="h-5 w-5 flex-shrink-0 mt-0.5"
                  style={{ color: colors.semantic.error }}
                />
                <div className="flex-1">
                  <h3
                    className="text-sm font-semibold mb-2 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Archive Contact
                  </h3>
                  <p
                    className="text-xs mb-3 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Once archived, this contact cannot be reverted back.
                  </p>

                  <button
                    onClick={() => setShowArchiveConfirm(true)}
                    disabled={isArchiving}
                    className="flex items-center px-3 py-1.5 rounded-md transition-colors text-xs disabled:opacity-50"
                    style={{
                      backgroundColor: colors.semantic.error,
                      color: '#ffffff',
                    }}
                  >
                    <Archive className="mr-2 h-3 w-3" />
                    Archive Contact
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <EditModal
        isOpen={activeModal !== null}
        title={getModalTitle()}
        onClose={() => setActiveModal(null)}
        onSave={handleSave}
        isSaving={isSaving}
      >
        {renderModalContent()}
      </EditModal>

      {/* Archive Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={handleArchive}
        title="Archive Contact"
        description="Are you sure you want to archive this contact? This action cannot be undone. The contact will be permanently disabled."
        confirmText={isArchiving ? 'Archiving...' : 'Archive'}
        type="danger"
        icon={<Archive className="h-6 w-6" />}
      />
    </>
  );
};

export default ProfileDrawer;
