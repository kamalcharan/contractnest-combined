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
import ImportantNotesCard from './cards/ImportantNotesCard';
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
import { canPerformOperation, CONTACT_CHANNEL_TYPES } from '@/utils/constants/contacts';

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
        // FIXED: Pass full classification objects for preselection
        setFormData({ classifications: [...contact.classifications] });
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

  // FIXED: Transform form data to API-expected format
  const transformFormDataForAPI = (modalType: ModalType, data: any): any => {
    const transformed: any = {};

    switch (modalType) {
      case 'classification':
        // API expects classifications as array of strings: ['buyer', 'seller']
        if (data.classifications && Array.isArray(data.classifications)) {
          transformed.classifications = data.classifications.map((c: any) => {
            // Handle both object format and string format
            if (typeof c === 'string') return c;
            return c.classification_value || c;
          });
        }
        break;

      case 'channels':
        // API expects contact_channels with proper structure
        if (data.contact_channels && Array.isArray(data.contact_channels)) {
          transformed.contact_channels = data.contact_channels.map((ch: any) => ({
            id: ch.id?.startsWith('temp_') ? undefined : ch.id, // Remove temp IDs
            channel_type: ch.channel_type,
            value: ch.value,
            country_code: ch.country_code || undefined,
            is_primary: ch.is_primary || false,
            is_verified: ch.is_verified || false,
            notes: ch.notes || undefined
          }));
        }
        break;

      case 'tags':
        // API expects tags with tag_value and tag_label
        if (data.tags && Array.isArray(data.tags)) {
          transformed.tags = data.tags.map((t: any) => ({
            id: t.id?.startsWith('temp_') ? undefined : t.id,
            tag_value: t.tag_value,
            tag_label: t.tag_label,
            tag_color: t.tag_color || undefined
          }));
        }
        break;

      case 'address':
        // API expects addresses with proper structure
        if (data.addresses && Array.isArray(data.addresses)) {
          transformed.addresses = data.addresses.map((addr: any) => ({
            id: addr.id?.startsWith('temp_') ? undefined : addr.id,
            type: addr.type,
            label: addr.label || undefined,
            address_line1: addr.address_line1,
            address_line2: addr.address_line2 || undefined,
            city: addr.city,
            state_code: addr.state_code || undefined,
            country_code: addr.country_code,
            postal_code: addr.postal_code || undefined,
            google_pin: addr.google_pin || undefined,
            is_primary: addr.is_primary || false,
            notes: addr.notes || undefined
          }));
        }
        break;

      case 'compliance':
        // API expects compliance_numbers with type_value and number
        if (data.compliance_numbers && Array.isArray(data.compliance_numbers)) {
          transformed.compliance_numbers = data.compliance_numbers.map((comp: any) => ({
            id: comp.id?.startsWith('temp_') ? undefined : comp.id,
            type_value: comp.type_value,
            type_label: comp.type_label || undefined,
            number: comp.number,
            valid_from: comp.valid_from || undefined,
            valid_to: comp.valid_to || undefined,
            is_verified: comp.is_verified || false,
            verified_at: comp.verified_at || undefined,
            issuing_authority: comp.issuing_authority || undefined,
            notes: comp.notes || undefined
          }));
        }
        break;

      case 'persons':
        // API expects contact_persons with proper structure
        if (data.contact_persons && Array.isArray(data.contact_persons)) {
          transformed.contact_persons = data.contact_persons.map((person: any) => ({
            id: person.id?.startsWith('temp_') ? undefined : person.id,
            name: person.name,
            salutation: person.salutation || undefined,
            designation: person.designation || undefined,
            department: person.department || undefined,
            is_primary: person.is_primary || false,
            contact_channels: (person.contact_channels || []).map((ch: any) => ({
              id: ch.id?.startsWith('temp_') ? undefined : ch.id,
              channel_type: ch.channel_type,
              value: ch.value,
              country_code: ch.country_code || undefined,
              is_primary: ch.is_primary || false
            })),
            notes: person.notes || undefined
          }));
        }
        break;

      default:
        return data;
    }

    return transformed;
  };

  // Save modal changes - FIXED with proper data transformation
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Transform data to API-expected format
      const transformedData = transformFormDataForAPI(activeModal, formData);

      console.log('Saving with transformed data:', transformedData);

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
      console.error('Save failed:', error);

      // Show more detailed error message
      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.validation_errors?.[0]?.message ||
                          error.message ||
                          "Could not save changes. Please try again.";

      toast({
        variant: "destructive",
        title: "Save Failed",
        description: errorMessage
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle notes update
  const handleNotesUpdate = async (updates: { notes?: string; tags?: any[] }) => {
    try {
      // Transform tags if present
      const transformedUpdates: any = { ...updates };
      if (updates.tags) {
        transformedUpdates.tags = updates.tags.map((t: any) => ({
          id: t.id?.startsWith('temp_') ? undefined : t.id,
          tag_value: t.tag_value,
          tag_label: t.tag_label,
          tag_color: t.tag_color || undefined
        }));
      }

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

          {/* Important Notes & Tags */}
          <div
            className="rounded-2xl border transition-all hover:shadow-lg"
            style={glassStyle}
          >
            <ImportantNotesCard
              contact={contact}
              onUpdate={handleNotesUpdate}
              className="!bg-transparent !border-0 !shadow-none"
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
            count={contact.classifications.length}
          >
            {contact.classifications.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {contact.classifications.map((cls, index) => {
                  const color = getClassificationColor(cls.classification_value);
                  return (
                    <span
                      key={cls.id || `cls-${index}`}
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        backgroundColor: color + '20',
                        color: color
                      }}
                    >
                      {cls.classification_label || cls.classification_value}
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
