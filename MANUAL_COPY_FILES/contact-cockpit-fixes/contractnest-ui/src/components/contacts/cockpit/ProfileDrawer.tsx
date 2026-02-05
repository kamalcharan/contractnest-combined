// src/components/contacts/cockpit/ProfileDrawer.tsx
// Cycle 1: Profile Drawer - Matches existing ViewCard UI from ContactSummaryTab
// All editing via modals only - NO page navigation

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
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import { useUpdateContactStatus } from '@/hooks/useContacts';

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
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
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
  classifications: Classification[];
  tags: ContactTag[];
  compliance_numbers: ComplianceNumber[];
  contact_channels: ContactChannel[];
  addresses: ContactAddress[];
  contact_persons: ContactPerson[];
}

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact;
  onRefresh?: () => void;
}

// Channel icon mapping
const CHANNEL_ICONS: Record<string, React.ElementType> = {
  mobile: Phone,
  phone: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  telegram: MessageSquare,
  linkedin: Linkedin,
  website: Globe,
  skype: MessageSquare,
};

// ViewCard Component - Same as ContactSummaryTab
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

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  isOpen,
  onClose,
  contact,
  onRefresh,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { toast } = useToast();
  const updateStatusHook = useUpdateContactStatus();

  // Local state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

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

  // Get channel icon
  const getChannelIcon = (channelType: string): React.ElementType => {
    return CHANNEL_ICONS[channelType] || Globe;
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
      const code = channel.country_code === 'IN' ? '+91' : `+${channel.country_code || ''}`;
      return `${code} ${channel.value}`;
    }
    return channel.value;
  };

  // Placeholder for modal opens - TODO: Implement actual modals
  const openModal = (modalType: string) => {
    toast({
      title: "Coming Soon",
      description: `${modalType} modal editing will be implemented`,
      duration: 2000
    });
  };

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
            onEdit={() => openModal('Contact Channels')}
            count={contact.contact_channels?.length || 0}
          >
            {contact.contact_channels && contact.contact_channels.length > 0 ? (
              <div className="space-y-2">
                {contact.contact_channels.map((channel) => {
                  const Icon = getChannelIcon(channel.channel_type);
                  return (
                    <div key={channel.id} className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" style={{ color: colors.utility.secondaryText }} />
                      <span className="flex-1 truncate">{formatChannelValue(channel)}</span>
                      {channel.is_primary && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: colors.brand.primary + '20', color: colors.brand.primary }}
                        >
                          Primary
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs italic">No contact channels</span>
            )}
          </ViewCard>

          {/* 2. Classification */}
          <ViewCard
            title="Classification"
            icon={<Shield className="h-3.5 w-3.5" style={{ color: '#8b5cf6' }} />}
            iconBg="#8b5cf620"
            onEdit={() => openModal('Classification')}
          >
            {contact.classifications && contact.classifications.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {contact.classifications.map((cls) => (
                  <span
                    key={cls.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: colors.brand.primary + '20',
                      color: isDarkMode ? colors.utility.primaryText : colors.brand.primary
                    }}
                  >
                    {cls.classification_label}
                  </span>
                ))}
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
              onEdit={() => openModal('Persons')}
              count={contact.contact_persons?.length || 0}
            >
              {contact.contact_persons && contact.contact_persons.length > 0 ? (
                <div className="space-y-2">
                  {contact.contact_persons.slice(0, 3).map((person) => (
                    <div key={person.id} className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                        style={{
                          backgroundColor: person.is_primary ? '#f59e0b20' : colors.utility.secondaryBackground,
                          color: person.is_primary ? '#f59e0b' : colors.utility.secondaryText
                        }}
                      >
                        {person.name?.charAt(0) || 'P'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium truncate" style={{ color: colors.utility.primaryText }}>
                            {person.name}
                          </span>
                          {person.is_primary && (
                            <span
                              className="text-xs px-1 rounded"
                              style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}
                            >
                              Primary
                            </span>
                          )}
                        </div>
                        {person.designation && (
                          <span className="text-xs truncate block" style={{ color: colors.utility.secondaryText }}>
                            {person.designation}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {contact.contact_persons.length > 3 && (
                    <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      +{contact.contact_persons.length - 3} more
                    </span>
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
            onEdit={() => openModal('Tags')}
            count={contact.tags?.length || 0}
          >
            {contact.tags && contact.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {contact.tags.map((tag) => (
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
            onEdit={() => openModal('Address')}
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
                        {addr.address_type}
                      </span>
                      {addr.is_primary && (
                        <span
                          className="px-1 rounded"
                          style={{
                            backgroundColor: colors.brand.primary + '20',
                            color: colors.brand.primary,
                            fontSize: '10px'
                          }}
                        >
                          Primary
                        </span>
                      )}
                    </div>
                    <p style={{ color: colors.utility.primaryText }}>{addr.line1}</p>
                    {addr.line2 && <p>{addr.line2}</p>}
                    <p>{addr.city}, {addr.state} {addr.postal_code}</p>
                  </div>
                ))}
                {contact.addresses.length > 2 && (
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    +{contact.addresses.length - 2} more
                  </span>
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
              onEdit={() => openModal('Compliance')}
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
                        {comp.number}
                      </span>
                    </div>
                  ))}
                  {contact.compliance_numbers.length > 3 && (
                    <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      +{contact.compliance_numbers.length - 3} more
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs italic">No compliance numbers</span>
              )}
            </ViewCard>
          )}

          {/* 7. Status Card */}
          <ViewCard
            title="Status"
            icon={<Power className="h-3.5 w-3.5" style={{ color: contact.status === 'active' ? '#10b981' : '#ef4444' }} />}
            iconBg={contact.status === 'active' ? '#10b98120' : '#ef444420'}
          >
            <div className="space-y-3">
              {/* Status Toggle */}
              <div className="flex items-center justify-between">
                <span style={{ color: colors.utility.primaryText }}>Contact Status</span>
                <button
                  onClick={() => handleStatusChange(contact.status === 'active' ? 'inactive' : 'active')}
                  disabled={isUpdatingStatus || contact.status === 'archived'}
                  className={`
                    relative w-11 h-6 rounded-full transition-colors
                    ${contact.status === 'archived' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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

              {/* Archive Button */}
              {contact.status !== 'archived' && (
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
              )}
            </div>
          </ViewCard>
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
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
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-500 text-white disabled:opacity-50"
              >
                {isUpdatingStatus ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileDrawer;
