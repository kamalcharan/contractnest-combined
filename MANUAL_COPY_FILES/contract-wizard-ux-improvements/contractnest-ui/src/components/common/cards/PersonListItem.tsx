// src/components/common/cards/PersonListItem.tsx
// Shared PersonListItem component for displaying contact persons
// Used in: ContactSummaryTab (Persons card), BuyerSelectionStep (Contact Person Picker)

import React from 'react';
import {
  Star,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  Linkedin,
  Check,
  LucideIcon
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { countries } from '@/utils/constants/countries';

// Channel icon mapping
const CHANNEL_ICONS: Record<string, LucideIcon> = {
  mobile: Phone,
  phone: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  telegram: MessageSquare,
  linkedin: Linkedin,
  website: Globe,
  skype: MessageSquare
};

export interface ContactChannel {
  id?: string;
  channel_type: string;
  value: string;
  country_code?: string;
  is_primary?: boolean;
  is_verified?: boolean;
}

export interface ContactPerson {
  id: string;
  name: string;
  salutation?: string;
  designation?: string;
  department?: string;
  is_primary: boolean;
  contact_channels: ContactChannel[];
  notes?: string;
}

export interface PersonListItemProps {
  person: ContactPerson;
  isSelected?: boolean;
  onClick?: () => void;
  showCheckmark?: boolean;
  showRadio?: boolean;
  variant?: 'default' | 'compact' | 'card';
  primaryColor?: string;
  className?: string;
}

// Helper: Format phone with country code
const formatPhoneDisplay = (channel: ContactChannel): string => {
  const countryCode = channel.country_code;
  const country = countries.find(c => c.code === countryCode);
  const phoneCode = country?.phoneCode || '';
  const value = channel.value;

  if (phoneCode && !value.startsWith('+')) {
    return `+${phoneCode} ${value}`;
  }
  return value;
};

// Helper: Get primary channel from person's channels
const getPersonPrimaryChannel = (person: ContactPerson): ContactChannel | null => {
  if (!person.contact_channels || person.contact_channels.length === 0) {
    return null;
  }
  const primary = person.contact_channels.find(ch => ch.is_primary);
  return primary || person.contact_channels[0];
};

// Helper: Get formatted channel display
const getPersonChannelDisplay = (person: ContactPerson): string | null => {
  const channel = getPersonPrimaryChannel(person);
  if (!channel) return null;

  if (channel.channel_type === 'mobile' || channel.channel_type === 'phone') {
    return formatPhoneDisplay(channel);
  }
  return channel.value;
};

// Helper: Get channel icon
const getChannelIcon = (channelType: string): LucideIcon => {
  return CHANNEL_ICONS[channelType] || Globe;
};

// Helper: Generate initials
const getPersonInitials = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase() || 'CP';
};

export const PersonListItem: React.FC<PersonListItemProps> = ({
  person,
  isSelected = false,
  onClick,
  showCheckmark = false,
  showRadio = false,
  variant = 'default',
  primaryColor = '#f59e0b', // Gold/amber for persons
  className = ''
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const personChannel = getPersonPrimaryChannel(person);
  const personChannelDisplay = getPersonChannelDisplay(person);
  const ChannelIcon = personChannel ? getChannelIcon(personChannel.channel_type) : null;

  // Variant styles
  const variantStyles = {
    default: 'flex items-start gap-2',
    compact: 'flex items-center gap-2',
    card: 'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md'
  };

  const cardStyle = variant === 'card' ? {
    backgroundColor: isSelected
      ? `${colors.brand.primary}08`
      : colors.utility.primaryBackground,
    borderColor: isSelected
      ? `${colors.brand.primary}40`
      : `${colors.utility.primaryText}15`
  } : {};

  const content = (
    <>
      {/* Avatar */}
      <div
        className={`rounded-${variant === 'compact' ? 'full' : 'xl'} flex items-center justify-center font-bold flex-shrink-0 ${
          variant === 'compact' ? 'w-5 h-5 text-xs' : variant === 'card' ? 'w-10 h-10 text-xs' : 'w-8 h-8 text-xs'
        }`}
        style={{
          backgroundColor: person.is_primary ? primaryColor : `${primaryColor}20`,
          color: person.is_primary ? '#fff' : primaryColor
        }}
      >
        {getPersonInitials(person.name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span
            className={`${variant === 'compact' ? 'text-xs' : 'text-sm'} truncate font-medium`}
            style={{ color: colors.utility.primaryText }}
          >
            {person.name}
          </span>
          {person.is_primary && (
            <Star
              className={`flex-shrink-0 ${variant === 'compact' ? 'h-2.5 w-2.5' : 'h-3 w-3'}`}
              style={{ color: primaryColor, fill: primaryColor }}
            />
          )}
          {variant === 'card' && person.is_primary && (
            <span
              className="text-xs px-2 py-0.5 rounded-full ml-1"
              style={{
                backgroundColor: `${primaryColor}20`,
                color: primaryColor
              }}
            >
              Primary
            </span>
          )}
        </div>

        {/* Designation (for card variant) */}
        {variant === 'card' && person.designation && (
          <p
            className="text-xs"
            style={{ color: colors.utility.secondaryText }}
          >
            {person.designation}
            {person.department && `, ${person.department}`}
          </p>
        )}

        {/* Channel display */}
        {personChannelDisplay && ChannelIcon && (
          <div className={`flex items-center gap-1 ${variant === 'compact' ? 'mt-0' : 'mt-0.5'}`}>
            <ChannelIcon
              className={`flex-shrink-0 ${variant === 'compact' ? 'h-2.5 w-2.5' : 'h-3 w-3'}`}
              style={{ color: colors.utility.secondaryText }}
            />
            <span
              className={`${variant === 'compact' ? 'text-xs' : 'text-xs'} truncate`}
              style={{ color: colors.utility.secondaryText }}
            >
              {personChannelDisplay}
            </span>
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {showCheckmark && isSelected && (
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: colors.semantic.success }}
        >
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      {showRadio && (
        <div
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
          style={{
            borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}30`,
            backgroundColor: isSelected ? colors.brand.primary : 'transparent'
          }}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <div
        onClick={onClick}
        className={`${variantStyles[variant]} ${className}`}
        style={cardStyle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
      >
        {content}
      </div>
    );
  }

  return (
    <div className={`${variantStyles[variant]} ${className}`} style={cardStyle}>
      {content}
    </div>
  );
};

export default PersonListItem;

// Export helpers for reuse
export {
  getPersonPrimaryChannel,
  getPersonChannelDisplay,
  getChannelIcon,
  getPersonInitials,
  formatPhoneDisplay,
  CHANNEL_ICONS
};
