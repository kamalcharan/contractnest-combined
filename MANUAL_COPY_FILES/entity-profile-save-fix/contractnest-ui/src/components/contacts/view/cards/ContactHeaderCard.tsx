// src/components/contacts/view/cards/ContactHeaderCard.tsx - Compact Design
import React from 'react';
import { Building2, User, Edit, Phone, Mail, MessageSquare, Globe, Star, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../contexts/ThemeContext';
import {
  getClassificationConfig,
  formatContactDisplayName,
  canPerformOperation,
  CONTACT_CHANNEL_TYPES
} from '@/utils/constants/contacts';

interface ContactHeaderCardProps {
  contact: {
    id: string;
    type: 'individual' | 'corporate';
    status: 'active' | 'inactive' | 'archived';
    name?: string;
    salutation?: string;
    company_name?: string;
    classifications: Array<{
      id: string;
      classification_value: string;
      classification_label: string;
    } | string>;
    tags?: Array<{
      id: string;
      tag_value: string;
      tag_label: string;
      tag_color?: string;
    }>;
    contact_channels?: Array<{
      id: string;
      channel_type: string;
      value: string;
      country_code?: string;
      is_primary: boolean;
    }>;
    created_at: string;
  };
  onEdit?: () => void;
  className?: string;
}

const ContactHeaderCard: React.FC<ContactHeaderCardProps> = ({
  contact,
  onEdit,
  className = ''
}) => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [copiedId, setCopiedId] = React.useState(false);

  // Generate avatar initials
  const getAvatarInitials = (): string => {
    if (contact.type === 'corporate') {
      return contact.company_name?.substring(0, 2).toUpperCase() || 'CO';
    } else {
      return contact.name?.substring(0, 2).toUpperCase() || 'UN';
    }
  };

  // Get display name
  const displayName = formatContactDisplayName(contact);

  // Handle edit action
  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      navigate(`/contacts/${contact.id}/edit`);
    }
  };

  // Check if edit is allowed
  const canEdit = canPerformOperation(contact.status, 'edit');

  // Get primary contact channel
  const getPrimaryChannel = () => {
    if (!contact.contact_channels || contact.contact_channels.length === 0) return null;
    const primary = contact.contact_channels.find(ch => ch.is_primary);
    return primary || contact.contact_channels[0];
  };

  const primaryChannel = getPrimaryChannel();

  // Get channel icon
  const getChannelIcon = (channelType: string) => {
    switch (channelType) {
      case CONTACT_CHANNEL_TYPES.MOBILE:
      case 'mobile':
        return Phone;
      case CONTACT_CHANNEL_TYPES.EMAIL:
      case 'email':
        return Mail;
      case CONTACT_CHANNEL_TYPES.WHATSAPP:
      case 'whatsapp':
        return MessageSquare;
      default:
        return Globe;
    }
  };

  // Format channel value for display
  const formatChannelValue = (channel: any): string => {
    if (channel.channel_type === 'mobile' && channel.country_code === 'IN') {
      return `+91 ${channel.value}`;
    }
    return channel.value;
  };

  // Normalize classifications (handle both string and object formats)
  const normalizeClassification = (cls: any, index: number) => {
    if (typeof cls === 'string') {
      return { id: `cls-${index}`, classification_value: cls, classification_label: cls };
    }
    return cls;
  };

  // Copy contact ID to clipboard
  const copyContactId = async () => {
    try {
      await navigator.clipboard.writeText(contact.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Format created date
  const formatCreatedDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Glass morphism card style with theme colors
  const cardStyle: React.CSSProperties = {
    background: isDarkMode
      ? `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}10 100%)`
      : `linear-gradient(135deg, ${colors.brand.primary}08 0%, ${colors.brand.secondary}05 100%)`,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderColor: isDarkMode
      ? `${colors.brand.primary}30`
      : `${colors.brand.primary}20`,
  };

  return (
    <div
      className={`rounded-xl border p-4 ${className}`}
      style={cardStyle}
    >
      {/* Row 1: Avatar + Name + Primary Channel + Edit */}
      <div className="flex items-center gap-3">
        {/* Avatar with theme color */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.secondary} 100%)`,
            color: '#ffffff'
          }}
        >
          {getAvatarInitials()}
        </div>

        {/* Name + Type */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="font-semibold text-base truncate"
              style={{ color: colors.utility.primaryText }}
            >
              {displayName}
            </h3>
            {contact.type === 'corporate' ? (
              <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: colors.brand.primary }} />
            ) : (
              <User className="h-4 w-4 flex-shrink-0" style={{ color: colors.brand.primary }} />
            )}
          </div>

          {/* Primary Contact Channel */}
          {primaryChannel && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {React.createElement(getChannelIcon(primaryChannel.channel_type), {
                className: "h-3 w-3",
                style: { color: colors.utility.secondaryText }
              })}
              <span
                className="text-sm truncate"
                style={{ color: colors.utility.secondaryText }}
              >
                {formatChannelValue(primaryChannel)}
              </span>
              {primaryChannel.is_primary && (
                <Star
                  className="h-3 w-3 flex-shrink-0"
                  style={{ color: colors.brand.primary, fill: colors.brand.primary }}
                />
              )}
            </div>
          )}
        </div>

        {/* Edit Button */}
        {canEdit && (
          <button
            onClick={handleEdit}
            className="p-2 rounded-lg transition-all hover:scale-105 flex-shrink-0"
            style={{
              backgroundColor: `${colors.brand.primary}15`,
              color: colors.brand.primary
            }}
            title="Edit contact"
          >
            <Edit className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Row 2: Classifications + Tags */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {/* Classifications */}
        {contact.classifications.map((cls, index) => {
          const normalized = normalizeClassification(cls, index);
          const config = getClassificationConfig(normalized.classification_value);
          return (
            <span
              key={normalized.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${colors.brand.primary}20`,
                color: colors.brand.primary
              }}
            >
              {config?.icon && <span className="text-xs">{config.icon}</span>}
              {normalized.classification_label || normalized.classification_value}
            </span>
          );
        })}

        {/* Separator if both exist */}
        {contact.classifications.length > 0 && contact.tags && contact.tags.length > 0 && (
          <span
            className="text-xs mx-1"
            style={{ color: colors.utility.secondaryText }}
          >
            •
          </span>
        )}

        {/* Tags */}
        {contact.tags?.slice(0, 3).map((tag) => (
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
          <span
            className="text-xs"
            style={{ color: colors.utility.secondaryText }}
          >
            +{contact.tags.length - 3}
          </span>
        )}
      </div>

      {/* Row 3: Contact ID + Created Date */}
      <div
        className="flex items-center justify-between mt-3 pt-2 border-t"
        style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
      >
        {/* Contact ID with copy */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs"
            style={{ color: colors.utility.secondaryText }}
          >
            ID:
          </span>
          <code
            className="text-xs font-mono px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              color: colors.utility.secondaryText
            }}
          >
            {contact.id.substring(0, 8)}...
          </code>
          <button
            onClick={copyContactId}
            className="p-1 rounded hover:opacity-70 transition-opacity"
            title="Copy full ID"
          >
            {copiedId ? (
              <Check className="h-3 w-3" style={{ color: '#22c55e' }} />
            ) : (
              <Copy className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
            )}
          </button>
        </div>

        {/* Created Date */}
        <span
          className="text-xs"
          style={{ color: colors.utility.secondaryText }}
        >
          Created {formatCreatedDate(contact.created_at)}
        </span>
      </div>
    </div>
  );
};

export default ContactHeaderCard;
