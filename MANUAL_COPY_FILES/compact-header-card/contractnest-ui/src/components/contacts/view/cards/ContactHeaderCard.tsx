// src/components/contacts/view/cards/ContactHeaderCard.tsx - Compact Production Version
import React from 'react';
import { Building2, User, Phone, Mail, Star } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { formatContactDisplayName } from '@/utils/constants/contacts';

interface ContactChannel {
  id?: string;
  channel_type: string;
  value: string;
  is_primary?: boolean;
}

interface ContactTag {
  id: string;
  tag_label: string;
  tag_value?: string;
  tag_color?: string;
}

interface Classification {
  id?: string;
  classification_value: string;
  classification_label: string;
}

interface ContactHeaderCardProps {
  contact: {
    id: string;
    type: 'individual' | 'corporate';
    status: 'active' | 'inactive' | 'archived';
    name?: string;
    salutation?: string;
    company_name?: string;
    classifications: Array<Classification | string>;
    contact_channels?: ContactChannel[];
    tags?: ContactTag[];
    created_at: string;
    updated_at: string;
  };
  className?: string;
}

const ContactHeaderCard: React.FC<ContactHeaderCardProps> = ({
  contact,
  className = ''
}) => {
  const themeContext = useTheme();

  // Fallback colors if theme context is not available
  const colors = themeContext?.colors || {
    brand: {
      primary: '#6366f1',
      secondary: '#8b5cf6'
    },
    utility: {
      primaryText: '#1f2937',
      secondaryText: '#6b7280'
    }
  };
  const isDarkMode = themeContext?.isDarkMode || false;

  // Generate avatar initials
  const getAvatarInitials = (): string => {
    if (contact.type === 'corporate') {
      return contact.company_name?.substring(0, 2).toUpperCase() || 'UC';
    } else {
      return contact.name?.substring(0, 2).toUpperCase() || 'UN';
    }
  };

  // Get display name using utility function
  const displayName = formatContactDisplayName(contact);

  // Get primary contact channel
  const getPrimaryChannel = () => {
    if (!contact.contact_channels || contact.contact_channels.length === 0) {
      return { phone: null, email: null };
    }

    const primaryPhone = contact.contact_channels.find(
      ch => ch.channel_type === 'mobile' && ch.is_primary
    ) || contact.contact_channels.find(ch => ch.channel_type === 'mobile');

    const primaryEmail = contact.contact_channels.find(
      ch => ch.channel_type === 'email' && ch.is_primary
    ) || contact.contact_channels.find(ch => ch.channel_type === 'email');

    return { phone: primaryPhone, email: primaryEmail };
  };

  // Format phone number
  const formatPhoneNumber = (channel: ContactChannel | null): string => {
    if (!channel) return '';
    const value = channel.value;
    // Simple formatting - add spaces for readability
    if (value.length === 10) {
      return `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}`;
    }
    return value;
  };

  const { phone: primaryPhone, email: primaryEmail } = getPrimaryChannel();

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${className}`}
      style={{
        background: isDarkMode
          ? `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}10 100%)`
          : `linear-gradient(135deg, ${colors.brand.primary}08 0%, ${colors.brand.secondary}05 100%)`,
        backdropFilter: 'blur(12px)',
        borderColor: isDarkMode ? `${colors.brand.primary}30` : `${colors.brand.primary}20`
      }}
    >
      {/* Row 1: Avatar + Name + Primary Channel */}
      <div className="flex items-center gap-3">
        {/* Avatar with theme gradient */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.secondary} 100%)`,
            color: '#ffffff'
          }}
        >
          {getAvatarInitials()}
        </div>

        {/* Name + Primary Channel */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1
              className="font-semibold text-lg truncate"
              style={{ color: colors.utility.primaryText }}
            >
              {displayName}
            </h1>
            {contact.type === 'corporate' ? (
              <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: colors.brand.primary }} />
            ) : (
              <User className="h-4 w-4 flex-shrink-0" style={{ color: colors.brand.primary }} />
            )}
          </div>

          {/* Primary Contact Channel */}
          {(primaryPhone || primaryEmail) && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {primaryPhone ? (
                <>
                  <Phone className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
                  <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                    {formatPhoneNumber(primaryPhone)}
                  </span>
                </>
              ) : primaryEmail ? (
                <>
                  <Mail className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
                  <span className="text-sm truncate" style={{ color: colors.utility.secondaryText }}>
                    {primaryEmail.value}
                  </span>
                </>
              ) : null}
              <Star
                className="h-3 w-3 flex-shrink-0"
                style={{ color: colors.brand.primary, fill: colors.brand.primary }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Classifications + Tags */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {/* Classifications */}
        {contact.classifications.map((classification, index) => {
          const classLabel = typeof classification === 'string'
            ? classification
            : classification.classification_label;
          return (
            <span
              key={typeof classification === 'string' ? `class-${index}` : ((classification as Classification).id || `class-${index}`)}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${colors.brand.primary}20`,
                color: colors.brand.primary
              }}
            >
              {classLabel}
            </span>
          );
        })}

        {/* Separator */}
        {contact.classifications.length > 0 && contact.tags && contact.tags.length > 0 && (
          <span className="text-xs mx-1" style={{ color: colors.utility.secondaryText }}>•</span>
        )}

        {/* Tags */}
        {contact.tags?.slice(0, 3).map((tag: ContactTag) => (
          <span
            key={tag.id}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: (tag.tag_color || colors.brand.secondary) + '20',
              color: tag.tag_color || colors.brand.secondary
            }}
          >
            {tag.tag_label}
          </span>
        ))}
        {contact.tags && contact.tags.length > 3 && (
          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
            +{contact.tags.length - 3}
          </span>
        )}
      </div>

      {/* Row 3: Contact ID + Created Date */}
      <div
        className="flex items-center justify-between mt-3 pt-2 border-t"
        style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>ID:</span>
          <code
            className="text-xs font-mono px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              color: colors.utility.secondaryText
            }}
          >
            {contact.id.substring(0, 8)}...
          </code>
        </div>
        <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
          Created {new Date(contact.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
};

export default ContactHeaderCard;
