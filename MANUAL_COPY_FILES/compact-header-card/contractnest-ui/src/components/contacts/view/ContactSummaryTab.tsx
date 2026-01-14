// src/components/contacts/view/ContactSummaryTab.tsx - View Cards with Modal Edit
// FIXED: All save issues, classification preselection, contact channels display, persons display
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Mail,
  Phone,
  MapPin,
  Shield,
  CheckCircle,
  Star,
  Edit,
  Tag,
  User,
  Building2,
  X,
  Loader2,
  MessageSquare,
  Globe,
  Linkedin,
  Send
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';

// Import original left side card components
import QuickStatsGrid from './cards/QuickStatsGrid';
import RecentActivityCard from './cards/RecentActivityCard';

// Import form components for modal
import ContactChannelsSection from '../../contacts/forms/ContactChannelsSection';
import AddressesSection from '../../contacts/forms/AddressesSection';
import ComplianceNumbersSection from '../../contacts/forms/ComplianceNumbersSection';
import ContactPersonsSection from '../../contacts/forms/ContactPersonsSection';
import ContactTagsSection from '../../contacts/forms/ContactTagsSection';
import ContactClassificationSelector from '../../contacts/forms/ContactClassificationSelector';

// Import hooks
import { useUpdateContact } from '../../../hooks/useContacts';

// Import constants
import { canPerformOperation, CONTACT_CHANNEL_TYPES, CONTACT_CLASSIFICATION_CONFIG } from '@/utils/constants/contacts';

// Types
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
  classifications: Array<{
    id: string;
    classification_value: string;
    classification_label: string;
  }>;
  tags: Array<{
    id: string;
    tag_value: string;
    tag_label: string;
    tag_color?: string;
  }>;
  compliance_numbers: Array<any>;
  contact_channels: Array<{
    id: string;
    channel_type: string;
    value: string;
    country_code?: string;
    is_primary: boolean;
    is_verified: boolean;
    notes?: string;
  }>;
  addresses: Array<any>;
  contact_persons: Array<{
    id: string;
    name: string;
    salutation?: string;
    designation?: string;
    department?: string;
    is_primary: boolean;
    contact_channels: any[];
    notes?: string;
  }>;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: { id: string; name: string; };
  audit_trail?: any[];
}

type ModalType = 'contact' | 'classification' | 'persons' | 'tags' | 'address' | 'compliance' | 'channels' | null;

interface ContactSummaryTabProps {
  contact: Contact;
  onRefresh?: () => void;
}

// Edit Modal Component
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              color: '#ffffff'
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

// Compact View Card Component
const ViewCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  onEdit: () => void;
  children: React.ReactNode;
  count?: number;
  onMoreClick?: () => void;
}> = ({ title, icon, iconBg, onEdit, children, count, onMoreClick }) => {
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

const ContactSummaryTab: React.FC<ContactSummaryTabProps> = ({ contact, onRefresh }) => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { toast } = useToast();
  const updateContactHook = useUpdateContact();

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form data state for modal editing
  const [formData, setFormData] = useState<any>({});

  // Glass morphism styles
  const glassStyle: React.CSSProperties = {
    background: isDarkMode
      ? 'rgba(30, 41, 59, 0.8)'
      : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderColor: isDarkMode
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.08)',
    boxShadow: isDarkMode
      ? '0 4px 24px rgba(0,0,0,0.2)'
      : '0 4px 24px rgba(0,0,0,0.06)',
  };

  // Open modal with current data
  const openModal = (type: ModalType) => {
    switch (type) {
      case 'channels':
        setFormData({ contact_channels: [...contact.contact_channels] });
        break;
      case 'classification':
        // FIXED: Use normalized classifications (converts strings to objects)
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

  // Helper: Remove undefined/null values from object (clean for JSON)
  const cleanObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(cleanObject);
    if (typeof obj !== 'object') return obj;

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = typeof value === 'object' ? cleanObject(value) : value;
      }
    }
    return cleaned;
  };

  // Helper: Transform classifications for API (MUST be strings only)
  const transformClassificationsForAPI = (classifications: any[]): string[] => {
    if (!classifications || !Array.isArray(classifications)) return [];

    return classifications
      .map((c: any) => {
        // Already a string - return as-is
        if (typeof c === 'string') return c;
        // Object with classification_value - extract it
        if (c && typeof c === 'object' && c.classification_value) {
          return c.classification_value;
        }
        // Object with value property
        if (c && typeof c === 'object' && c.value) {
          return c.value;
        }
        // Fallback - convert to string
        return String(c);
      })
      .filter((c: string) => c && c.length > 0); // Remove empty strings
  };

  // Helper: Transform contact channels for API (clean format)
  const transformChannelsForAPI = (channels: any[]): any[] => {
    if (!channels || !Array.isArray(channels)) return [];

    return channels.map((ch: any) => {
      const channel: any = {
        channel_type: ch.channel_type,
        value: ch.value,
        is_primary: Boolean(ch.is_primary),
        is_verified: Boolean(ch.is_verified)
      };

      // Only include id if it's a valid UUID (not temp_)
      if (ch.id && typeof ch.id === 'string' && !ch.id.startsWith('temp_')) {
        channel.id = ch.id;
      }

      // Only include optional fields if they have values
      if (ch.country_code) channel.country_code = ch.country_code;
      if (ch.notes) channel.notes = ch.notes;

      return channel;
    }).filter((ch: any) => ch.channel_type && ch.value); // Remove invalid channels
  };

  // FIXED: Transform form data to API-expected format
  // CRITICAL: API validation requires BOTH classifications AND contact_channels on EVERY update
  const transformFormDataForAPI = (modalType: ModalType, data: any): any => {
    // ALWAYS include the two required fields from existing contact data
    const existingClassifications = transformClassificationsForAPI(contact.classifications);
    const existingChannels = transformChannelsForAPI(contact.contact_channels);

    // Start with required fields
    const transformed: any = {
      classifications: existingClassifications,
      contact_channels: existingChannels
    };

    // Debug logging
    console.log('=== transformFormDataForAPI ===');
    console.log('Modal type:', modalType);
    console.log('Existing classifications:', existingClassifications);
    console.log('Existing channels count:', existingChannels.length);
    console.log('Form data:', data);

    // Now overlay the specific changes being made
    switch (modalType) {
      case 'classification':
        // Override with new classifications
        if (data.classifications && Array.isArray(data.classifications)) {
          transformed.classifications = transformClassificationsForAPI(data.classifications);
        }
        break;

      case 'channels':
        // Override with new contact_channels
        if (data.contact_channels && Array.isArray(data.contact_channels)) {
          transformed.contact_channels = transformChannelsForAPI(data.contact_channels);
        }
        break;

      case 'tags':
        // Add tags to the update
        if (data.tags && Array.isArray(data.tags)) {
          transformed.tags = data.tags
            .filter((t: any) => t.tag_value) // Only include tags with values
            .map((t: any) => {
              const tag: any = {
                tag_value: t.tag_value,
                tag_label: t.tag_label || t.tag_value
              };
              // Only include id if valid
              if (t.id && typeof t.id === 'string' && !t.id.startsWith('temp_')) {
                tag.id = t.id;
              }
              if (t.tag_color) tag.tag_color = t.tag_color;
              return tag;
            });
        }
        break;

      case 'address':
        // Add addresses to the update
        if (data.addresses && Array.isArray(data.addresses)) {
          transformed.addresses = data.addresses
            .filter((addr: any) => addr.address_line1 && addr.city) // Required fields
            .map((addr: any) => {
              const address: any = {
                type: addr.type || 'office',
                address_line1: addr.address_line1,
                city: addr.city,
                country_code: addr.country_code || 'IN',
                is_primary: Boolean(addr.is_primary)
              };
              // Only include id if valid
              if (addr.id && typeof addr.id === 'string' && !addr.id.startsWith('temp_')) {
                address.id = addr.id;
              }
              // Optional fields
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
        // Add compliance_numbers to the update
        if (data.compliance_numbers && Array.isArray(data.compliance_numbers)) {
          transformed.compliance_numbers = data.compliance_numbers
            .filter((comp: any) => comp.type_value && comp.number) // Required fields
            .map((comp: any) => {
              const compliance: any = {
                type_value: comp.type_value,
                number: comp.number,
                is_verified: Boolean(comp.is_verified)
              };
              // Only include id if valid
              if (comp.id && typeof comp.id === 'string' && !comp.id.startsWith('temp_')) {
                compliance.id = comp.id;
              }
              // Optional fields
              if (comp.type_label) compliance.type_label = comp.type_label;
              if (comp.valid_from) compliance.valid_from = comp.valid_from;
              if (comp.valid_to) compliance.valid_to = comp.valid_to;
              if (comp.verified_at) compliance.verified_at = comp.verified_at;
              if (comp.issuing_authority) compliance.issuing_authority = comp.issuing_authority;
              if (comp.notes) compliance.notes = comp.notes;
              return compliance;
            });
        }
        break;

      case 'persons':
        // Add contact_persons to the update
        if (data.contact_persons && Array.isArray(data.contact_persons)) {
          transformed.contact_persons = data.contact_persons
            .filter((person: any) => person.name) // Name is required
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
              // Only include id if valid
              if (person.id && typeof person.id === 'string' && !person.id.startsWith('temp_')) {
                p.id = person.id;
              }
              // Optional fields
              if (person.salutation) p.salutation = person.salutation;
              if (person.designation) p.designation = person.designation;
              if (person.department) p.department = person.department;
              if (person.notes) p.notes = person.notes;
              return p;
            });
        }
        break;
    }

    // Final validation check
    if (!transformed.classifications || transformed.classifications.length === 0) {
      console.error('ERROR: No classifications in transformed data!');
    }
    if (!transformed.contact_channels || transformed.contact_channels.length === 0) {
      console.error('ERROR: No contact_channels in transformed data!');
    }
    if (transformed.contact_channels && !transformed.contact_channels.some((ch: any) => ch.is_primary)) {
      console.error('ERROR: No primary contact channel!');
    }

    console.log('Final transformed data:', JSON.stringify(transformed, null, 2));
    return transformed;
  };

  // Save modal changes - FIXED with proper data transformation
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Transform data to API-expected format
      const transformedData = transformFormDataForAPI(activeModal, formData);

      console.log('=== SAVE REQUEST ===');
      console.log('Contact ID:', contact.id);
      console.log('Modal type:', activeModal);
      console.log('Transformed data:', JSON.stringify(transformedData, null, 2));

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
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      console.error('=== SAVE FAILED ===');
      console.error('Error object:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);

      // Extract detailed error message
      let errorMessage = "Could not save changes. Please try again.";

      if (error.response?.data?.validation_errors && Array.isArray(error.response.data.validation_errors)) {
        // Show all validation errors
        errorMessage = error.response.data.validation_errors.join(', ');
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.error('Error message for toast:', errorMessage);

      toast({
        variant: "destructive",
        title: "Save Failed",
        description: errorMessage
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle notes update - FIXED: Include required fields for validation
  const handleNotesUpdate = async (updates: { notes?: string; tags?: any[] }) => {
    try {
      // CRITICAL: Always include required fields for validation
      const transformedUpdates: any = {
        classifications: transformClassificationsForAPI(contact.classifications),
        contact_channels: transformChannelsForAPI(contact.contact_channels)
      };

      // Add notes if present
      if (updates.notes !== undefined) {
        transformedUpdates.notes = updates.notes;
      }

      // Transform tags if present
      if (updates.tags) {
        transformedUpdates.tags = updates.tags
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

      console.log('handleNotesUpdate - transformedUpdates:', transformedUpdates);

      await updateContactHook.mutate({
        contactId: contact.id,
        updates: transformedUpdates
      });
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to update:', error);
      throw error;
    }
  };

  // Get channel icon based on type
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
      case CONTACT_CHANNEL_TYPES.SKYPE:
        return MessageSquare;
      default:
        return Phone;
    }
  };

  // Get channel label
  const getChannelLabel = (channelType: string): string => {
    switch (channelType) {
      case CONTACT_CHANNEL_TYPES.MOBILE: return 'Mobile';
      case CONTACT_CHANNEL_TYPES.EMAIL: return 'Email';
      case CONTACT_CHANNEL_TYPES.WHATSAPP: return 'WhatsApp';
      case CONTACT_CHANNEL_TYPES.WEBSITE: return 'Website';
      case CONTACT_CHANNEL_TYPES.LINKEDIN: return 'LinkedIn';
      case CONTACT_CHANNEL_TYPES.TELEGRAM: return 'Telegram';
      case CONTACT_CHANNEL_TYPES.SKYPE: return 'Skype';
      default: return channelType;
    }
  };

  // Get primary contact channel for a person
  const getPersonPrimaryChannel = (person: any): string | null => {
    if (!person.contact_channels || person.contact_channels.length === 0) {
      return null;
    }
    const primary = person.contact_channels.find((ch: any) => ch.is_primary);
    const channel = primary || person.contact_channels[0];
    return channel?.value || null;
  };

  // Sort channels: primary first
  const sortedChannels = [...contact.contact_channels].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return 0;
  });

  // Render modal content based on type
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

  // Get classification color
  const getClassificationColor = (classificationValue: string): string => {
    const colorMap: Record<string, string> = {
      'buyer': '#3b82f6',
      'seller': '#22c55e',
      'vendor': '#8b5cf6',
      'partner': '#f59e0b',
      'team_member': '#6366f1'
    };
    return colorMap[classificationValue] || '#8b5cf6';
  };

  // Get classification label from value (must be defined before normalizeClassifications)
  const getClassificationLabel = (value: string): string => {
    const config = CONTACT_CLASSIFICATION_CONFIG?.find(c => c.id === value);
    if (config) return config.label;

    // Fallback: capitalize and replace underscores
    return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
  };

  // FIXED: Normalize classifications - API returns strings, UI needs objects
  // This handles both formats: ['buyer'] and [{classification_value: 'buyer', ...}]
  const normalizeClassifications = (classifications: any[]): Array<{id: string; classification_value: string; classification_label: string}> => {
    if (!classifications || !Array.isArray(classifications)) return [];

    return classifications.map((cls, index) => {
      // If already an object with classification_value, return as-is
      if (typeof cls === 'object' && cls.classification_value) {
        return {
          id: cls.id || `cls-${index}`,
          classification_value: cls.classification_value,
          classification_label: cls.classification_label || getClassificationLabel(cls.classification_value)
        };
      }

      // If it's a string (from API), convert to object
      if (typeof cls === 'string') {
        return {
          id: `cls-${index}`,
          classification_value: cls,
          classification_label: getClassificationLabel(cls)
        };
      }

      // Fallback
      return {
        id: `cls-${index}`,
        classification_value: String(cls),
        classification_label: String(cls)
      };
    });
  };

  // Get normalized classifications for display
  const normalizedClassifications = normalizeClassifications(contact.classifications);

  return (
    <div className="space-y-6">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
        {/* Left Content Area - 70% (7/10 cols) */}
        <div className="xl:col-span-7 space-y-6">
          {/* Quick Stats Grid */}
          <div
            className="rounded-2xl border p-6 transition-all hover:shadow-lg"
            style={glassStyle}
          >
            <QuickStatsGrid
              contact={contact}
              className="!bg-transparent !border-0 !shadow-none !p-0"
            />
          </div>

          {/* Recent Activity */}
          <div
            className="rounded-2xl border transition-all hover:shadow-lg"
            style={glassStyle}
          >
            <div className="p-5">
              <RecentActivityCard
                contact={contact}
                limit={10}
                className="!bg-transparent !border-0 !shadow-none !p-0"
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar - 30% (3/10 cols) */}
        <div className="xl:col-span-3 space-y-4">
          {/* 1. Contact Channels Card - FIXED: Show ALL channels */}
          <ViewCard
            title="Contact Channels"
            icon={contact.type === 'corporate' ?
              <Building2 className="h-3.5 w-3.5" style={{ color: colors.brand.primary }} /> :
              <User className="h-3.5 w-3.5" style={{ color: colors.brand.primary }} />
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

              {/* Show all channels (max 4, then +more) */}
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

          {/* 2. Classification Card - FIXED: Show actual labels */}
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
                  const color = getClassificationColor(cls.classification_value);
                  return (
                    <span
                      key={cls.id}
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        backgroundColor: color + '20',
                        color: color
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

          {/* 3. Contact Persons Card (Corporate only) - FIXED: Show primary channel */}
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
                            color: person.is_primary ? '#fff' : '#f59e0b'
                          }}
                        >
                          {person.name.charAt(0)}
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
                      <Star className="h-2.5 w-2.5 mt-0.5 flex-shrink-0" style={{ color: '#10b981', fill: '#10b981' }} />
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
    </div>
  );
};

export default ContactSummaryTab;
