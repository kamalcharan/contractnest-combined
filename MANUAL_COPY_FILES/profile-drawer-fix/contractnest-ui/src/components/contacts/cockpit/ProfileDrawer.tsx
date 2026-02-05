// src/components/contacts/cockpit/ProfileDrawer.tsx
// Production-grade Profile Drawer with FULL Edit Modal Functionality
// Ported from ContactSummaryTab - All editing via modals, NO page navigation

import React, { useState } from 'react';
import {
  X,
  Building2,
  User,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  Linkedin,
  Shield,
  Tag,
  MapPin,
  Users,
  Edit,
  Power,
  Archive,
  Loader2,
  Star,
  Send,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import { useUpdateContact, useUpdateContactStatus } from '@/hooks/useContacts';

// Import form components for modal editing
import ContactChannelsSection from '@/components/contacts/forms/ContactChannelsSection';
import AddressesSection from '@/components/contacts/forms/AddressesSection';
import ComplianceNumbersSection from '@/components/contacts/forms/ComplianceNumbersSection';
import ContactPersonsSection from '@/components/contacts/forms/ContactPersonsSection';
import ContactTagsSection from '@/components/contacts/forms/ContactTagsSection';
import ContactClassificationSelector from '@/components/contacts/forms/ContactClassificationSelector';

// Import constants
import { CONTACT_CHANNEL_TYPES, CONTACT_CLASSIFICATION_CONFIG, getClassificationColors } from '@/utils/constants/contacts';

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

interface ContactTag {
  id: string;
  tag_value: string;
  tag_label: string;
  tag_color?: string;
}

interface ComplianceNumber {
  id: string;
  type_value: string;
  type_label: string;
  number: string;
  hexcolor?: string;
  is_verified?: boolean;
  valid_from?: string;
  valid_to?: string;
  issuing_authority?: string;
  notes?: string;
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
  industry?: string;
  classifications: Classification[] | string[];
  tags: ContactTag[];
  compliance_numbers: ComplianceNumber[];
  contact_channels: ContactChannel[];
  addresses: ContactAddress[];
  contact_persons: ContactPerson[];
  notes?: string;
}

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact;
  onRefresh?: () => void;
}

type ModalType = 'channels' | 'classification' | 'persons' | 'tags' | 'address' | 'compliance' | null;

// ═══════════════════════════════════════════════════════════════════════════
// EDIT MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
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
          borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
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
              color: colors.utility.primaryText
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
              opacity: isSaving ? 0.7 : 1
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

// ═══════════════════════════════════════════════════════════════════════════
// VIEW CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const ViewCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  onEdit?: () => void;
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
                color: colors.utility.primaryText
              }}
            >
              {count}
            </span>
          )}
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:opacity-70 transition-colors"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
            <Edit className="h-3.5 w-3.5" style={{ color: colors.utility.secondaryText }} />
          </button>
        )}
      </div>
      <div className="text-sm" style={{ color: colors.utility.secondaryText }}>
        {children}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PROFILE DRAWER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  isOpen,
  onClose,
  contact,
  onRefresh,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { toast } = useToast();

  // Hooks
  const updateContactHook = useUpdateContact();
  const updateStatusHook = useUpdateContactStatus();

  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────

  // Get classification label from value
  const getClassificationLabel = (value: string): string => {
    const config = CONTACT_CLASSIFICATION_CONFIG?.find(c => c.id === value);
    if (config) return config.label;
    return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
  };

  // Normalize classifications - API returns strings, UI needs objects
  const normalizeClassifications = (classifications: any[]): Array<{id: string; classification_value: string; classification_label: string}> => {
    if (!classifications || !Array.isArray(classifications)) return [];

    return classifications.map((cls, index) => {
      if (typeof cls === 'object' && cls.classification_value) {
        return {
          id: cls.id || `cls-${index}`,
          classification_value: cls.classification_value,
          classification_label: cls.classification_label || getClassificationLabel(cls.classification_value)
        };
      }
      if (typeof cls === 'string') {
        return {
          id: `cls-${index}`,
          classification_value: cls,
          classification_label: getClassificationLabel(cls)
        };
      }
      return {
        id: `cls-${index}`,
        classification_value: String(cls),
        classification_label: String(cls)
      };
    });
  };

  // Get classification badge colors
  const getClassificationBadgeColors = (classificationValue: string) => {
    const config = CONTACT_CLASSIFICATION_CONFIG?.find(c => c.id === classificationValue);
    return getClassificationColors(config?.colorKey || 'purple', colors, 'badge');
  };

  // Transform classifications for API (MUST be strings only)
  const transformClassificationsForAPI = (classifications: any[]): string[] => {
    if (!classifications || !Array.isArray(classifications)) return [];

    return classifications
      .map((c: any) => {
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object' && c.classification_value) {
          return c.classification_value;
        }
        if (c && typeof c === 'object' && c.value) {
          return c.value;
        }
        return String(c);
      })
      .filter((c: string) => c && c.length > 0);
  };

  // Transform contact channels for API
  const transformChannelsForAPI = (channels: any[]): any[] => {
    if (!channels || !Array.isArray(channels)) return [];

    return channels.map((ch: any) => {
      const channel: any = {
        channel_type: ch.channel_type,
        value: ch.value,
        is_primary: Boolean(ch.is_primary),
        is_verified: Boolean(ch.is_verified)
      };

      if (ch.id && typeof ch.id === 'string' && !ch.id.startsWith('temp_')) {
        channel.id = ch.id;
      }
      if (ch.country_code) channel.country_code = ch.country_code;
      if (ch.notes) channel.notes = ch.notes;

      return channel;
    }).filter((ch: any) => ch.channel_type && ch.value);
  };

  // Transform form data to API-expected format
  const transformFormDataForAPI = (modalType: ModalType, data: any): any => {
    const existingClassifications = transformClassificationsForAPI(contact.classifications);
    const existingChannels = transformChannelsForAPI(contact.contact_channels);

    const transformed: any = {
      classifications: existingClassifications,
      contact_channels: existingChannels
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
                tag_label: t.tag_label || t.tag_value
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
            .filter((addr: any) => (addr.address_line1 || addr.line1) && addr.city)
            .map((addr: any) => {
              const address: any = {
                type: addr.type || addr.address_type || 'office',
                address_line1: addr.address_line1 || addr.line1,
                city: addr.city,
                country_code: addr.country_code || 'IN',
                is_primary: Boolean(addr.is_primary)
              };
              if (addr.id && typeof addr.id === 'string' && !addr.id.startsWith('temp_')) {
                address.id = addr.id;
              }
              if (addr.label) address.label = addr.label;
              if (addr.address_line2 || addr.line2) address.address_line2 = addr.address_line2 || addr.line2;
              if (addr.state_code || addr.state) address.state_code = addr.state_code || addr.state;
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
                is_verified: Boolean(comp.is_verified)
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
                      is_primary: Boolean(ch.is_primary)
                    };
                    if (ch.id && typeof ch.id === 'string' && !ch.id.startsWith('temp_')) {
                      channel.id = ch.id;
                    }
                    if (ch.country_code) channel.country_code = ch.country_code;
                    return channel;
                  })
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

  // Get channel icon
  const getChannelIcon = (channelType: string): React.ElementType => {
    switch (channelType) {
      case CONTACT_CHANNEL_TYPES?.MOBILE:
      case 'mobile':
      case 'phone':
        return Phone;
      case CONTACT_CHANNEL_TYPES?.EMAIL:
      case 'email':
        return Mail;
      case CONTACT_CHANNEL_TYPES?.WHATSAPP:
      case 'whatsapp':
        return MessageSquare;
      case CONTACT_CHANNEL_TYPES?.WEBSITE:
      case 'website':
        return Globe;
      case CONTACT_CHANNEL_TYPES?.LINKEDIN:
      case 'linkedin':
        return Linkedin;
      case CONTACT_CHANNEL_TYPES?.TELEGRAM:
      case 'telegram':
        return Send;
      case CONTACT_CHANNEL_TYPES?.SKYPE:
      case 'skype':
        return MessageSquare;
      default:
        return Phone;
    }
  };

  // Get display name
  const getDisplayName = () => {
    if (contact.type === 'corporate') {
      return contact.company_name || 'Unnamed Company';
    }
    const salutation = contact.salutation ? `${contact.salutation}. ` : '';
    return `${salutation}${contact.name || ''}`.trim() || 'Unnamed Contact';
  };

  // Format channel display
  const formatChannelValue = (channel: ContactChannel) => {
    if (channel.channel_type === 'mobile' || channel.channel_type === 'phone') {
      if (channel.country_code === 'IN') {
        return `+91 ${channel.value}`;
      }
      const code = channel.country_code ? `+${channel.country_code}` : '';
      return `${code} ${channel.value}`.trim();
    }
    return channel.value;
  };

  // Get primary channel for a person
  const getPersonPrimaryChannel = (person: ContactPerson): string | null => {
    if (!person.contact_channels || person.contact_channels.length === 0) {
      return null;
    }
    const primary = person.contact_channels.find((ch) => ch.is_primary);
    const channel = primary || person.contact_channels[0];
    return channel?.value || null;
  };

  // Sort channels: primary first
  const sortedChannels = [...(contact.contact_channels || [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return 0;
  });

  // Normalized classifications for display
  const normalizedClassifications = normalizeClassifications(contact.classifications);

  // ─────────────────────────────────────────────────────────────────────────
  // MODAL HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  // Open modal with current data
  const openModal = (type: ModalType) => {
    switch (type) {
      case 'channels':
        setFormData({ contact_channels: [...(contact.contact_channels || [])] });
        break;
      case 'classification':
        setFormData({ classifications: normalizeClassifications(contact.classifications) });
        break;
      case 'persons':
        setFormData({ contact_persons: [...(contact.contact_persons || [])] });
        break;
      case 'tags':
        setFormData({ tags: [...(contact.tags || [])] });
        break;
      case 'address':
        setFormData({ addresses: [...(contact.addresses || [])] });
        break;
      case 'compliance':
        setFormData({ compliance_numbers: [...(contact.compliance_numbers || [])] });
        break;
    }
    setActiveModal(type);
  };

  // Save modal changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const transformedData = transformFormDataForAPI(activeModal, formData);

      console.log('ProfileDrawer Save:', {
        contactId: contact.id,
        modalType: activeModal,
        data: transformedData
      });

      await updateContactHook.mutate({
        contactId: contact.id,
        updates: transformedData
      });

      toast({
        title: "Saved!",
        description: "Changes saved successfully",
        duration: 2000
      });

      setActiveModal(null);
      onRefresh?.();
    } catch (error: any) {
      console.error('ProfileDrawer Save Error:', error);

      let errorMessage = "Could not save changes. Please try again.";
      if (error.response?.data?.validation_errors && Array.isArray(error.response.data.validation_errors)) {
        errorMessage = error.response.data.validation_errors.join(', ');
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: "Save Failed",
        description: errorMessage
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Get modal title
  const getModalTitle = () => {
    switch (activeModal) {
      case 'channels': return 'Edit Contact Channels';
      case 'classification': return 'Edit Classifications';
      case 'persons': return 'Edit Contact Persons';
      case 'tags': return 'Edit Tags';
      case 'address': return 'Edit Addresses';
      case 'compliance': return 'Edit Compliance Numbers';
      default: return 'Edit';
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

  // ─────────────────────────────────────────────────────────────────────────
  // STATUS HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  // Handle status toggle
  const handleStatusChange = async (newStatus: 'active' | 'inactive') => {
    setIsUpdatingStatus(true);
    try {
      await updateStatusHook.mutate(contact.id, newStatus);
      toast({
        title: "Success",
        description: `Contact ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
        duration: 3000
      });
      onRefresh?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status"
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle archive
  const handleArchive = async () => {
    setIsUpdatingStatus(true);
    try {
      await updateStatusHook.mutate(contact.id, 'archived');
      toast({
        title: "Success",
        description: "Contact archived successfully",
        duration: 3000
      });
      setShowArchiveConfirm(false);
      onRefresh?.();
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to archive contact"
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`
          fixed right-0 top-0 h-full w-full max-w-md z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{
          background: isDarkMode
            ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)'
            : 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
          boxShadow: '-10px 0 50px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{
                background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.secondary} 100%)`,
                color: '#ffffff'
              }}
            >
              {contact.type === 'corporate'
                ? contact.company_name?.substring(0, 2).toUpperCase() || 'CO'
                : contact.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'UN'
              }
            </div>
            <div>
              <h2
                className="font-semibold text-lg"
                style={{ color: colors.utility.primaryText }}
              >
                {getDisplayName()}
              </h2>
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                {contact.type === 'corporate' ? 'Corporate' : 'Individual'} • {contact.status}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:opacity-70 transition-colors"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
            <X className="h-5 w-5" style={{ color: colors.utility.primaryText }} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100% - 72px)' }}>

          {/* 1. Contact Channels */}
          <ViewCard
            title="Contact Channels"
            icon={contact.type === 'corporate'
              ? <Building2 className="h-3.5 w-3.5" style={{ color: colors.brand.primary }} />
              : <User className="h-3.5 w-3.5" style={{ color: colors.brand.primary }} />
            }
            iconBg={colors.brand.primary + '20'}
            onEdit={() => openModal('channels')}
            count={contact.contact_channels?.length || 0}
          >
            <div className="space-y-2">
              <p className="font-medium mb-3" style={{ color: colors.utility.primaryText }}>
                {contact.type === 'corporate' ? contact.company_name : contact.name}
              </p>
              {sortedChannels.length === 0 ? (
                <p className="text-xs italic">No contact channels</p>
              ) : (
                <>
                  {sortedChannels.slice(0, 4).map((channel) => {
                    const Icon = getChannelIcon(channel.channel_type);
                    return (
                      <div key={channel.id} className="flex items-center gap-2 text-xs">
                        <Icon className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate flex-1">{formatChannelValue(channel)}</span>
                        {channel.is_primary && (
                          <Star className="h-3 w-3 flex-shrink-0" style={{ color: colors.brand.primary, fill: colors.brand.primary }} />
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

          {/* 2. Classification */}
          <ViewCard
            title="Classification"
            icon={<Shield className="h-3.5 w-3.5" style={{ color: '#8b5cf6' }} />}
            iconBg="#8b5cf620"
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
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                      style={{
                        backgroundColor: badgeColors?.bg || colors.brand.primary + '20',
                        color: badgeColors?.text || (isDarkMode ? colors.utility.primaryText : colors.brand.primary),
                        borderColor: badgeColors?.border || 'transparent'
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

          {/* 3. Contact Persons (Corporate only) */}
          {contact.type === 'corporate' && (
            <ViewCard
              title="Persons"
              icon={<Users className="h-3.5 w-3.5" style={{ color: '#f59e0b' }} />}
              iconBg="#f59e0b20"
              onEdit={() => openModal('persons')}
              count={contact.contact_persons?.length || 0}
            >
              {contact.contact_persons && contact.contact_persons.length > 0 ? (
                <div className="space-y-2">
                  {contact.contact_persons.slice(0, 3).map((person) => {
                    const primaryChannel = getPersonPrimaryChannel(person);
                    return (
                      <div key={person.id} className="flex items-start gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                          style={{
                            backgroundColor: person.is_primary ? '#f59e0b' : '#f59e0b20',
                            color: person.is_primary ? '#fff' : '#f59e0b'
                          }}
                        >
                          {person.name?.charAt(0) || 'P'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs truncate font-medium" style={{ color: colors.utility.primaryText }}>
                              {person.name}
                            </span>
                            {person.is_primary && (
                              <Star className="h-2.5 w-2.5 flex-shrink-0" style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                            )}
                          </div>
                          {person.designation && (
                            <span className="text-xs truncate block" style={{ color: colors.utility.secondaryText }}>
                              {person.designation}
                            </span>
                          )}
                          {primaryChannel && (
                            <span className="text-xs truncate block" style={{ color: colors.utility.secondaryText }}>
                              {primaryChannel}
                            </span>
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

          {/* 4. Tags */}
          <ViewCard
            title="Tags"
            icon={<Tag className="h-3.5 w-3.5" style={{ color: '#ec4899' }} />}
            iconBg="#ec489920"
            onEdit={() => openModal('tags')}
            count={contact.tags?.length || 0}
          >
            {contact.tags && contact.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {contact.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: (tag.tag_color || '#ec4899') + '20',
                      color: tag.tag_color || '#ec4899'
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

          {/* 5. Address */}
          <ViewCard
            title="Address"
            icon={<MapPin className="h-3.5 w-3.5" style={{ color: '#10b981' }} />}
            iconBg="#10b98120"
            onEdit={() => openModal('address')}
            count={contact.addresses?.length || 0}
          >
            {contact.addresses && contact.addresses.length > 0 ? (
              <div className="space-y-2">
                {contact.addresses.slice(0, 2).map((addr) => (
                  <div key={addr.id} className="text-xs">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span
                        className="uppercase font-medium px-1 rounded"
                        style={{
                          backgroundColor: '#10b98120',
                          color: '#10b981',
                          fontSize: '10px'
                        }}
                      >
                        {addr.address_type || addr.type || 'office'}
                      </span>
                      {addr.is_primary && (
                        <Star className="h-2.5 w-2.5" style={{ color: '#10b981', fill: '#10b981' }} />
                      )}
                    </div>
                    <p style={{ color: colors.utility.primaryText }}>{addr.line1 || addr.address_line1}</p>
                    {(addr.line2 || addr.address_line2) && <p>{addr.line2 || addr.address_line2}</p>}
                    <p>{addr.city}, {addr.state || addr.state_code} {addr.postal_code}</p>
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

          {/* 6. Compliance (Corporate only) */}
          {contact.type === 'corporate' && (
            <ViewCard
              title="Compliance"
              icon={<Shield className="h-3.5 w-3.5" style={{ color: '#3b82f6' }} />}
              iconBg="#3b82f620"
              onEdit={() => openModal('compliance')}
              count={contact.compliance_numbers?.length || 0}
            >
              {contact.compliance_numbers && contact.compliance_numbers.length > 0 ? (
                <div className="space-y-1.5">
                  {contact.compliance_numbers.slice(0, 3).map((comp) => (
                    <div key={comp.id} className="flex items-center gap-2 text-xs">
                      <span
                        className="font-medium"
                        style={{ color: comp.hexcolor || '#3b82f6' }}
                      >
                        {comp.type_label || comp.type_value}:
                      </span>
                      <span className="font-mono" style={{ color: colors.utility.primaryText }}>
                        {comp.number?.length > 12 ? comp.number.slice(0, 12) + '...' : comp.number}
                      </span>
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

          {/* 7. Status Card */}
          {contact.status !== 'archived' && (
            <ViewCard
              title="Status"
              icon={<Power className="h-3.5 w-3.5" style={{ color: contact.status === 'active' ? '#10b981' : '#ef4444' }} />}
              iconBg={contact.status === 'active' ? '#10b98120' : '#ef444420'}
            >
              <div className="space-y-3">
                {/* Status Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-xs" style={{ color: colors.utility.primaryText }}>
                      {contact.status === 'active' ? 'Active' : 'Inactive'}
                    </p>
                    <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      {contact.status === 'active' ? 'Available for business' : 'Temporarily disabled'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleStatusChange(contact.status === 'active' ? 'inactive' : 'active')}
                    disabled={isUpdatingStatus}
                    className={`
                      relative w-11 h-6 rounded-full transition-colors
                      ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    style={{
                      backgroundColor: contact.status === 'active' ? '#10b981' : '#ef4444'
                    }}
                  >
                    <div
                      className={`
                        absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
                        ${contact.status === 'active' ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </div>

                {isUpdatingStatus && (
                  <div className="flex items-center text-xs" style={{ color: colors.utility.secondaryText }}>
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    Updating status...
                  </div>
                )}

                {/* Archive Button */}
                <button
                  onClick={() => setShowArchiveConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                    color: '#ef4444'
                  }}
                >
                  <Archive className="h-4 w-4" />
                  Archive Contact
                </button>
              </div>
            </ViewCard>
          )}

          {/* Archived Status Display */}
          {contact.status === 'archived' && (
            <ViewCard
              title="Status"
              icon={<Archive className="h-3.5 w-3.5" style={{ color: '#71717a' }} />}
              iconBg="#71717a20"
            >
              <div className="text-xs">
                <p className="font-medium" style={{ color: colors.utility.primaryText }}>Archived</p>
                <p style={{ color: colors.utility.secondaryText }}>This contact has been archived and cannot be modified.</p>
              </div>
            </ViewCard>
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

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowArchiveConfirm(false)}
          />
          <div
            className="relative rounded-xl p-6 max-w-sm w-full"
            style={{
              background: isDarkMode ? 'rgba(30, 41, 59, 0.98)' : 'rgba(255, 255, 255, 0.98)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="p-2 rounded-full"
                style={{ backgroundColor: '#ef444420' }}
              >
                <Archive className="h-5 w-5 text-red-500" />
              </div>
              <h3
                className="font-semibold text-lg"
                style={{ color: colors.utility.primaryText }}
              >
                Archive Contact
              </h3>
            </div>
            <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
              Are you sure you want to archive this contact? This action cannot be undone easily.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  color: colors.utility.primaryText
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={isUpdatingStatus}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-500 text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  'Archive'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileDrawer;
