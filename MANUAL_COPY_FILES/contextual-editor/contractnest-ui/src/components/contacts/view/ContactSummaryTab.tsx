// src/components/contacts/view/ContactSummaryTab.tsx - Contextual Editor Integration
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  MessageCircle,
  Edit,
  Mail,
  Phone,
  MapPin,
  Shield,
  CheckCircle,
  Star,
  Plus
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';

// Import all the card components
import ContactHeaderCard from './cards/ContactHeaderCard';
import ImportantNotesCard from './cards/ImportantNotesCard';

// Import the new Contextual Editor Panel
import ContextualEditorPanel, { EditorMode } from './ContextualEditorPanel';

// Import hooks for data updates
import { useUpdateContact } from '../../../hooks/useContacts';

// Import constants
import { canPerformOperation, formatContactDisplayName } from '@/utils/constants/contacts';

// Define the complete contact interface for the summary tab
interface Contact {
  id: string;
  type: 'individual' | 'corporate';
  status: 'active' | 'inactive' | 'archived';

  // Individual fields
  name?: string;
  salutation?: string;

  // Corporate fields
  company_name?: string;
  registration_number?: string;
  website?: string;
  industry?: string;

  // Arrays
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
  compliance_numbers: Array<{
    id: string;
    type_value: string;
    type_label: string;
    number: string;
    issuing_authority?: string;
    valid_from?: string;
    valid_to?: string;
    is_verified: boolean;
    hexcolor?: string;
    notes?: string;
  }>;
  contact_channels: Array<{
    id: string;
    channel_type: string;
    value: string;
    country_code?: string;
    is_primary: boolean;
    is_verified: boolean;
    notes?: string;
  }>;
  addresses: Array<{
    id: string;
    address_type: 'home' | 'office' | 'billing' | 'shipping' | 'factory' | 'warehouse' | 'other';
    label?: string;
    line1: string;
    line2?: string;
    line3?: string;
    city: string;
    state: string;
    country: string;
    postal_code?: string;
    google_pin?: string;
    is_primary: boolean;
    is_verified: boolean;
    notes?: string;
  }>;
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

  // Other fields
  notes?: string;
  user_account_status?: string;
  potential_duplicate?: boolean;
  duplicate_reasons?: string[];

  // Metadata
  created_at: string;
  updated_at: string;
  last_contact_date?: string;
  created_by?: {
    id: string;
    name: string;
  };
  audit_trail?: Array<{
    id: string;
    event_type: string;
    event_description: string;
    performed_by: string;
    performed_at: string;
    metadata?: Record<string, any>;
  }>;
}

interface ContactSummaryTabProps {
  contact: Contact;
  onRefresh?: () => void;
}

const ContactSummaryTab: React.FC<ContactSummaryTabProps> = ({ contact, onRefresh }) => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { toast } = useToast();
  const updateContactHook = useUpdateContact();
  const [isUpdating, setIsUpdating] = useState(false);

  // Contextual Editor State
  const [editorMode, setEditorMode] = useState<EditorMode>('default');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingIndex, setEditingIndex] = useState<number | undefined>(undefined);

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

  // Handle editor mode change
  const handleEditorModeChange = (mode: EditorMode, item?: any, index?: number) => {
    setEditorMode(mode);
    setEditingItem(item || null);
    setEditingIndex(index);
  };

  // Handle save success
  const handleSaveSuccess = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  // Get primary contact channel for quick actions
  const getPrimaryChannel = (type: string) => {
    return contact.contact_channels.find(ch => ch.channel_type === type && ch.is_primary) ||
           contact.contact_channels.find(ch => ch.channel_type === type);
  };

  // Get primary address
  const getPrimaryAddress = () => {
    return contact.addresses.find(addr => addr.is_primary) || contact.addresses[0];
  };

  // Quick action handlers
  const handleQuickCall = () => {
    const primaryPhone = getPrimaryChannel('mobile');
    if (primaryPhone) {
      const phoneNumber = primaryPhone.country_code ?
        `+${primaryPhone.country_code === 'IN' ? '91' : primaryPhone.country_code} ${primaryPhone.value}` :
        primaryPhone.value;
      window.location.href = `tel:${phoneNumber}`;
    } else {
      toast({
        variant: "destructive",
        title: "No phone number",
        description: "No phone number available for this contact"
      });
    }
  };

  const handleQuickEmail = () => {
    const primaryEmail = getPrimaryChannel('email');
    if (primaryEmail) {
      window.location.href = `mailto:${primaryEmail.value}`;
    } else {
      toast({
        variant: "destructive",
        title: "No email address",
        description: "No email address available for this contact"
      });
    }
  };

  const handleCreateContract = () => {
    if (!canPerformOperation(contact.status, 'create_contract')) {
      toast({
        variant: "destructive",
        title: "Action not allowed",
        description: "Cannot create contracts for inactive or archived contacts"
      });
      return;
    }
    navigate(`/contracts/create?contactId=${contact.id}`);
  };

  // Handle contact updates (for notes and tags)
  const handleContactUpdate = async (updates: { notes?: string; tags?: any[] }) => {
    try {
      setIsUpdating(true);

      await updateContactHook.mutate({
        contactId: contact.id,
        updates
      });

      if (onRefresh) {
        onRefresh();
      }

    } catch (error) {
      console.error('Failed to update contact:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Content Area - 2/3 width */}
        <div className="xl:col-span-2 space-y-6">
          {/* Contact Header Card */}
          <div
            className="rounded-2xl border transition-all hover:shadow-lg"
            style={glassStyle}
          >
            <ContactHeaderCard
              contact={contact}
              onEdit={() => handleEditorModeChange('add-channel')}
              className="!bg-transparent !border-0 !shadow-none"
            />
          </div>

          {/* Contact Channels Card */}
          <div
            className="rounded-2xl border transition-all hover:shadow-lg"
            style={glassStyle}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: colors.brand.primary + '20' }}
                  >
                    <Phone className="h-4 w-4" style={{ color: colors.brand.primary }} />
                  </div>
                  <h3 className="text-base font-semibold" style={{ color: colors.utility.primaryText }}>
                    Contact Channels
                  </h3>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: colors.brand.primary + '15',
                      color: colors.brand.primary
                    }}
                  >
                    {contact.contact_channels.length}
                  </span>
                </div>
                <button
                  onClick={() => handleEditorModeChange('add-channel')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: colors.brand.primary,
                    color: '#ffffff'
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>

              {contact.contact_channels.length === 0 ? (
                <div
                  className="text-center py-8 rounded-xl border-2 border-dashed"
                  style={{ borderColor: colors.utility.secondaryText + '30' }}
                >
                  <Phone className="h-10 w-10 mx-auto mb-2" style={{ color: colors.utility.secondaryText }} />
                  <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                    No contact channels yet
                  </p>
                  <button
                    onClick={() => handleEditorModeChange('add-channel')}
                    className="mt-2 text-sm font-medium"
                    style={{ color: colors.brand.primary }}
                  >
                    Add your first channel →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {contact.contact_channels.map((channel, index) => (
                    <div
                      key={channel.id}
                      onClick={() => handleEditorModeChange('edit-channel', channel, index)}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                      style={{
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                      }}
                    >
                      <div
                        className="p-2 rounded-lg"
                        style={{
                          backgroundColor: channel.is_primary ? colors.brand.primary : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                          color: channel.is_primary ? '#ffffff' : colors.utility.secondaryText
                        }}
                      >
                        {channel.channel_type === 'mobile' ? <Phone className="h-4 w-4" /> :
                         channel.channel_type === 'email' ? <Mail className="h-4 w-4" /> :
                         <MessageCircle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate" style={{ color: colors.utility.primaryText }}>
                            {channel.country_code && channel.channel_type === 'mobile'
                              ? `+${channel.country_code === 'IN' ? '91' : channel.country_code} ${channel.value}`
                              : channel.value
                            }
                          </span>
                          {channel.is_primary && (
                            <span
                              className="px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1"
                              style={{
                                backgroundColor: colors.brand.primary + '20',
                                color: colors.brand.primary
                              }}
                            >
                              <Star className="h-2.5 w-2.5" />
                              Primary
                            </span>
                          )}
                          {channel.is_verified && (
                            <CheckCircle className="h-3.5 w-3.5" style={{ color: colors.semantic.success }} />
                          )}
                        </div>
                        <span className="text-xs capitalize" style={{ color: colors.utility.secondaryText }}>
                          {channel.channel_type}
                        </span>
                      </div>
                      <Edit className="h-4 w-4 opacity-0 group-hover:opacity-100" style={{ color: colors.utility.secondaryText }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Addresses Card */}
          <div
            className="rounded-2xl border transition-all hover:shadow-lg"
            style={glassStyle}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: colors.semantic.warning + '20' }}
                  >
                    <MapPin className="h-4 w-4" style={{ color: colors.semantic.warning }} />
                  </div>
                  <h3 className="text-base font-semibold" style={{ color: colors.utility.primaryText }}>
                    Addresses
                  </h3>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: colors.semantic.warning + '15',
                      color: colors.semantic.warning
                    }}
                  >
                    {contact.addresses.length}
                  </span>
                </div>
                <button
                  onClick={() => handleEditorModeChange('add-address')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: colors.semantic.warning,
                    color: '#ffffff'
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>

              {contact.addresses.length === 0 ? (
                <div
                  className="text-center py-8 rounded-xl border-2 border-dashed"
                  style={{ borderColor: colors.utility.secondaryText + '30' }}
                >
                  <MapPin className="h-10 w-10 mx-auto mb-2" style={{ color: colors.utility.secondaryText }} />
                  <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                    No addresses yet
                  </p>
                  <button
                    onClick={() => handleEditorModeChange('add-address')}
                    className="mt-2 text-sm font-medium"
                    style={{ color: colors.brand.primary }}
                  >
                    Add your first address →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {contact.addresses.map((address, index) => (
                    <div
                      key={address.id}
                      onClick={() => handleEditorModeChange('edit-address', address, index)}
                      className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                      style={{
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                      }}
                    >
                      <div
                        className="p-2 rounded-lg mt-0.5"
                        style={{
                          backgroundColor: address.is_primary ? colors.semantic.warning : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                          color: address.is_primary ? '#ffffff' : colors.utility.secondaryText
                        }}
                      >
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium uppercase" style={{ color: colors.utility.secondaryText }}>
                            {address.address_type || 'Address'}
                          </span>
                          {address.is_primary && (
                            <span
                              className="px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1"
                              style={{
                                backgroundColor: colors.semantic.warning + '20',
                                color: colors.semantic.warning
                              }}
                            >
                              <Star className="h-2.5 w-2.5" />
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: colors.utility.primaryText }}>
                          {address.line1}
                          {address.line2 && `, ${address.line2}`}
                        </p>
                        <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                          {address.city}{address.state && `, ${address.state}`}{address.postal_code && ` - ${address.postal_code}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Compliance Numbers (Corporate only) */}
          {contact.type === 'corporate' && (
            <div
              className="rounded-2xl border transition-all hover:shadow-lg"
              style={glassStyle}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: colors.semantic.success + '20' }}
                    >
                      <Shield className="h-4 w-4" style={{ color: colors.semantic.success }} />
                    </div>
                    <h3 className="text-base font-semibold" style={{ color: colors.utility.primaryText }}>
                      Compliance Numbers
                    </h3>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        backgroundColor: colors.semantic.success + '15',
                        color: colors.semantic.success
                      }}
                    >
                      {contact.compliance_numbers.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleEditorModeChange('add-compliance')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                    style={{
                      backgroundColor: colors.semantic.success,
                      color: '#ffffff'
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>

                {contact.compliance_numbers.length === 0 ? (
                  <div
                    className="text-center py-8 rounded-xl border-2 border-dashed"
                    style={{ borderColor: colors.utility.secondaryText + '30' }}
                  >
                    <Shield className="h-10 w-10 mx-auto mb-2" style={{ color: colors.utility.secondaryText }} />
                    <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      No compliance numbers yet
                    </p>
                    <button
                      onClick={() => handleEditorModeChange('add-compliance')}
                      className="mt-2 text-sm font-medium"
                      style={{ color: colors.brand.primary }}
                    >
                      Add GST, PAN, etc. →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {contact.compliance_numbers.map((compliance, index) => (
                      <div
                        key={compliance.id}
                        onClick={() => handleEditorModeChange('edit-compliance', compliance, index)}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                        }}
                      >
                        <div
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: compliance.hexcolor ? compliance.hexcolor + '20' : colors.semantic.success + '20',
                            color: compliance.hexcolor || colors.semantic.success
                          }}
                        >
                          <Shield className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                            {compliance.type_label || compliance.type_value}
                          </span>
                          <p className="text-sm font-mono font-medium truncate" style={{ color: colors.utility.primaryText }}>
                            {compliance.number}
                          </p>
                        </div>
                        {compliance.is_verified && (
                          <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: colors.semantic.success }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Persons (Corporate only) */}
          {contact.type === 'corporate' && (
            <div
              className="rounded-2xl border transition-all hover:shadow-lg"
              style={glassStyle}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: '#8b5cf6' + '20' }}
                    >
                      <Users className="h-4 w-4" style={{ color: '#8b5cf6' }} />
                    </div>
                    <h3 className="text-base font-semibold" style={{ color: colors.utility.primaryText }}>
                      Contact Persons
                    </h3>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        backgroundColor: '#8b5cf6' + '15',
                        color: '#8b5cf6'
                      }}
                    >
                      {contact.contact_persons.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleEditorModeChange('add-person')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                    style={{
                      backgroundColor: '#8b5cf6',
                      color: '#ffffff'
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>

                {contact.contact_persons.length === 0 ? (
                  <div
                    className="text-center py-8 rounded-xl border-2 border-dashed"
                    style={{ borderColor: colors.utility.secondaryText + '30' }}
                  >
                    <Users className="h-10 w-10 mx-auto mb-2" style={{ color: colors.utility.secondaryText }} />
                    <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      No contact persons yet
                    </p>
                    <button
                      onClick={() => handleEditorModeChange('add-person')}
                      className="mt-2 text-sm font-medium"
                      style={{ color: colors.brand.primary }}
                    >
                      Add a contact person →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contact.contact_persons.map((person, index) => (
                      <div
                        key={person.id}
                        onClick={() => handleEditorModeChange('edit-person', person, index)}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
                          style={{
                            backgroundColor: person.is_primary ? '#8b5cf6' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                            color: person.is_primary ? '#ffffff' : colors.utility.primaryText
                          }}
                        >
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                              {person.salutation ? `${person.salutation}. ` : ''}{person.name}
                            </span>
                            {person.is_primary && (
                              <span
                                className="px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1"
                                style={{
                                  backgroundColor: '#8b5cf6' + '20',
                                  color: '#8b5cf6'
                                }}
                              >
                                <Star className="h-2.5 w-2.5" />
                                Primary
                              </span>
                            )}
                          </div>
                          {(person.designation || person.department) && (
                            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                              {person.designation}{person.designation && person.department && ' • '}{person.department}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Important Notes & Tags */}
          <div
            className="rounded-2xl border transition-all hover:shadow-lg"
            style={glassStyle}
          >
            <ImportantNotesCard
              contact={contact}
              onUpdate={handleContactUpdate}
              className="!bg-transparent !border-0 !shadow-none"
            />
          </div>
        </div>

        {/* Right Sidebar - Contextual Editor Panel */}
        <div className="xl:col-span-1">
          <div className="sticky top-6">
            <ContextualEditorPanel
              contact={contact as any}
              mode={editorMode}
              editingItem={editingItem}
              editingIndex={editingIndex}
              onModeChange={handleEditorModeChange}
              onSaveSuccess={handleSaveSuccess}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSummaryTab;
