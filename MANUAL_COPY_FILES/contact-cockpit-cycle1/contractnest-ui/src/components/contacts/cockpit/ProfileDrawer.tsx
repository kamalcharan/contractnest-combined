// src/components/contacts/cockpit/ProfileDrawer.tsx
// Profile Drawer - Slides from right, contains contact demographics
// Cycle 1: Foundation - Contact 360° Cockpit

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';

// Import form components for modal editing
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

// Types
interface ContactChannel {
  id: string;
  channel_type: string;
  value: string;
  country_code?: string;
  is_primary: boolean;
  is_verified: boolean;
  notes?: string;
}

interface ContactAddress {
  id: string;
  address_type: string;
  label?: string;
  line1?: string;
  address_line1?: string;
  line2?: string;
  address_line2?: string;
  city: string;
  state?: string;
  state_code?: string;
  country: string;
  country_code?: string;
  postal_code?: string;
  google_pin?: string;
  is_primary: boolean;
  notes?: string;
}

interface ComplianceNumber {
  id: string;
  type_value: string;
  type_label?: string;
  number: string;
  is_verified: boolean;
  valid_from?: string;
  valid_to?: string;
  issuing_authority?: string;
  notes?: string;
}

interface ContactPerson {
  id: string;
  name: string;
  salutation?: string;
  designation?: string;
  department?: string;
  is_primary: boolean;
  contact_channels: ContactChannel[];
  notes?: string;
}

interface Tag {
  id: string;
  tag_value: string;
  tag_label: string;
  tag_color?: string;
}

interface Classification {
  id: string;
  classification_value: string;
  classification_label: string;
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
  classifications: Classification[] | string[];
  tags: Tag[];
  compliance_numbers: ComplianceNumber[];
  contact_channels: ContactChannel[];
  addresses: ContactAddress[];
  contact_persons: ContactPerson[];
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
// EDIT MODAL COMPONENT
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
          background: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
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
// DRAWER SECTION COMPONENT
// ═══════════════════════════════════════════════════════════════════
const DrawerSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  onEdit: () => void;
  count?: number;
  children: React.ReactNode;
}> = ({ title, icon, iconColor, onEdit, count, children }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div
      className="border-b last:border-b-0 py-4"
      style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ color: iconColor }}>{icon}</span>
          <span
            className="text-sm font-semibold"
            style={{ color: colors.utility.primaryText }}
          >
            {title}
          </span>
          {count !== undefined && count > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: iconColor + '20',
                color: iconColor,
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
  const navigate = useNavigate();
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
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Get display name
  const getDisplayName = (): string => {
    if (contact.type === 'corporate') {
      return contact.company_name || 'Unnamed Company';
    }
    return contact.name || 'Unnamed Contact';
  };

  // Get classification label
  const getClassificationLabel = (value: string): string => {
    const config = CONTACT_CLASSIFICATION_CONFIG?.find((c) => c.id === value);
    if (config) return config.label;
    return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
  };

  // Normalize classifications (API returns strings, UI needs objects)
  const normalizeClassifications = (
    classifications: any[]
  ): Array<{ id: string; classification_value: string; classification_label: string }> => {
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
        return <Phone className="h-3.5 w-3.5" />;
      case CONTACT_CHANNEL_TYPES.EMAIL:
        return <Mail className="h-3.5 w-3.5" />;
      case CONTACT_CHANNEL_TYPES.WHATSAPP:
        return <MessageSquare className="h-3.5 w-3.5" />;
      case CONTACT_CHANNEL_TYPES.WEBSITE:
        return <Globe className="h-3.5 w-3.5" />;
      case CONTACT_CHANNEL_TYPES.LINKEDIN:
        return <Linkedin className="h-3.5 w-3.5" />;
      case CONTACT_CHANNEL_TYPES.TELEGRAM:
        return <Send className="h-3.5 w-3.5" />;
      default:
        return <Phone className="h-3.5 w-3.5" />;
    }
  };

  // Sort channels: primary first
  const sortedChannels = [...contact.contact_channels].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return 0;
  });

  // Get primary channel for a person
  const getPersonPrimaryChannel = (person: ContactPerson): string | null => {
    if (!person.contact_channels || person.contact_channels.length === 0) return null;
    const primary = person.contact_channels.find((ch) => ch.is_primary);
    const channel = primary || person.contact_channels[0];
    return channel?.value || null;
  };

  // ─────────────────────────────────────────────────────────────────
  // MODAL & SAVE LOGIC
  // ─────────────────────────────────────────────────────────────────
  const openModal = (type: ModalType) => {
    switch (type) {
      case 'channels':
        setFormData({ contact_channels: [...contact.contact_channels] });
        break;
      case 'classification':
        setFormData({ classifications: normalizedClassifications });
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
          fixed top-0 right-0 h-full w-[400px] max-w-[90vw] z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          overflow-hidden flex flex-col
        `}
        style={{
          backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
          borderLeft: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          boxShadow: isOpen ? '-4px 0 24px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        {/* Drawer Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold"
              style={{
                backgroundColor: colors.brand.primary + '20',
                color: colors.brand.primary,
              }}
            >
              {contact.type === 'corporate' ? (
                <Building2 className="h-5 w-5" />
              ) : (
                getDisplayName().charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2
                className="font-semibold text-base"
                style={{ color: colors.utility.primaryText }}
              >
                {getDisplayName()}
              </h2>
              <p
                className="text-xs capitalize"
                style={{ color: colors.utility.secondaryText }}
              >
                {contact.type} Contact
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:opacity-70 transition-colors"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
            <X className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        {/* Drawer Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-5">
          {/* Contact Channels */}
          <DrawerSection
            title="Contact Channels"
            icon={<Phone className="h-4 w-4" />}
            iconColor={colors.brand.primary}
            onEdit={() => openModal('channels')}
            count={contact.contact_channels.length}
          >
            {sortedChannels.length === 0 ? (
              <p className="text-xs italic">No contact channels</p>
            ) : (
              <div className="space-y-2">
                {sortedChannels.map((channel) => (
                  <div key={channel.id} className="flex items-center gap-2 text-xs">
                    {getChannelIcon(channel.channel_type)}
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
                ))}
              </div>
            )}
          </DrawerSection>

          {/* Classification */}
          <DrawerSection
            title="Classification"
            icon={<Shield className="h-4 w-4" />}
            iconColor="#8b5cf6"
            onEdit={() => openModal('classification')}
            count={normalizedClassifications.length}
          >
            {normalizedClassifications.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
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
          </DrawerSection>

          {/* Contact Persons (Corporate only) */}
          {contact.type === 'corporate' && (
            <DrawerSection
              title="Contact Persons"
              icon={<Users className="h-4 w-4" />}
              iconColor="#f59e0b"
              onEdit={() => openModal('persons')}
              count={contact.contact_persons.length}
            >
              {contact.contact_persons.length > 0 ? (
                <div className="space-y-2.5">
                  {contact.contact_persons.map((person) => {
                    const primaryChannel = getPersonPrimaryChannel(person);
                    return (
                      <div key={person.id} className="flex items-start gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
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
                              className="text-xs font-medium truncate"
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
                          {person.designation && (
                            <p className="text-xs truncate" style={{ color: colors.utility.secondaryText }}>
                              {person.designation}
                            </p>
                          )}
                          {primaryChannel && (
                            <p className="text-xs truncate" style={{ color: colors.utility.secondaryText }}>
                              {primaryChannel}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="text-xs italic">No contact persons</span>
              )}
            </DrawerSection>
          )}

          {/* Addresses */}
          <DrawerSection
            title="Addresses"
            icon={<MapPin className="h-4 w-4" />}
            iconColor="#10b981"
            onEdit={() => openModal('address')}
            count={contact.addresses.length}
          >
            {contact.addresses.length > 0 ? (
              <div className="space-y-2">
                {contact.addresses.map((addr, idx) => (
                  <div key={addr.id || idx} className="flex items-start gap-2">
                    {addr.is_primary && (
                      <Star
                        className="h-3 w-3 mt-0.5 flex-shrink-0"
                        style={{ color: '#10b981', fill: '#10b981' }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      {addr.label && (
                        <span
                          className="text-xs font-medium block"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {addr.label}
                        </span>
                      )}
                      <p className="text-xs">
                        {addr.address_line1 || addr.line1}, {addr.city}
                        {addr.state_code && `, ${addr.state_code}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs italic">No addresses</span>
            )}
          </DrawerSection>

          {/* Compliance Numbers (Corporate only) */}
          {contact.type === 'corporate' && (
            <DrawerSection
              title="Compliance Numbers"
              icon={<Shield className="h-4 w-4" />}
              iconColor="#3b82f6"
              onEdit={() => openModal('compliance')}
              count={contact.compliance_numbers.length}
            >
              {contact.compliance_numbers.length > 0 ? (
                <div className="space-y-1.5">
                  {contact.compliance_numbers.map((comp, idx) => (
                    <div key={comp.id || idx} className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                        {comp.type_label || comp.type_value}
                      </span>
                      <span className="text-xs font-mono">{comp.number}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs italic">No compliance numbers</span>
              )}
            </DrawerSection>
          )}

          {/* Tags */}
          <DrawerSection
            title="Tags"
            icon={<Tag className="h-4 w-4" />}
            iconColor="#ec4899"
            onEdit={() => openModal('tags')}
            count={contact.tags.length}
          >
            {contact.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {contact.tags.map((tag) => (
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
              </div>
            ) : (
              <span className="text-xs italic">No tags</span>
            )}
          </DrawerSection>

          {/* Notes Section */}
          {contact.notes && (
            <DrawerSection
              title="Notes"
              icon={<MessageSquare className="h-4 w-4" />}
              iconColor="#6b7280"
              onEdit={() => navigate(`/contacts/${contact.id}/edit`)}
            >
              <p className="text-xs whitespace-pre-wrap">{contact.notes}</p>
            </DrawerSection>
          )}

          {/* Status Section */}
          {contact.status !== 'archived' && (
            <div
              className="border-b py-4"
              style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                    Contact Status
                  </p>
                  <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    {contact.status === 'active' ? 'Active - available for business' : 'Inactive - temporarily disabled'}
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
                <div className="mt-2 flex items-center text-xs" style={{ color: colors.utility.secondaryText }}>
                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  Updating status...
                </div>
              )}
            </div>
          )}

          {/* Archive Section */}
          {contact.status !== 'archived' && (
            <div className="py-4">
              <button
                onClick={() => setShowArchiveConfirm(true)}
                disabled={isArchiving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: colors.semantic.error + '15',
                  color: colors.semantic.error,
                  border: `1px solid ${colors.semantic.error}30`,
                }}
              >
                <Archive className="h-4 w-4" />
                Archive Contact
              </button>
              <p className="text-xs text-center mt-2" style={{ color: colors.utility.secondaryText }}>
                Once archived, this action cannot be undone
              </p>
            </div>
          )}
        </div>

        {/* Drawer Footer - Edit Contact Button */}
        <div
          className="px-5 py-4 border-t flex-shrink-0"
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        >
          <button
            onClick={() => navigate(`/contacts/${contact.id}/edit`)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#ffffff',
            }}
          >
            <Edit className="h-4 w-4" />
            Edit Contact
          </button>
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
