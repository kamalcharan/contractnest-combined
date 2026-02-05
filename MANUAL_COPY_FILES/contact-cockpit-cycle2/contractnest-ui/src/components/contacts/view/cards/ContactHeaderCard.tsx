// src/components/contacts/view/cards/ContactHeaderCard.tsx - Enhanced with Cockpit Support
// Cycle 2: Added compact variant with LTV, Outstanding, Health Score
import React from 'react';
import {
  Building2,
  User,
  Phone,
  Mail,
  Star,
  MapPin,
  MessageSquare,
  Globe,
  Linkedin,
  Shield,
  Tag,
  Copy,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  Heart
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { formatContactDisplayName } from '@/utils/constants/contacts';
import { countries } from '@/utils/constants/countries';
import { useToast } from '@/components/ui/use-toast';

// Channel icon mapping
const CHANNEL_ICONS: Record<string, React.ElementType> = {
  mobile: Phone,
  phone: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  telegram: MessageSquare,
  linkedin: Linkedin,
  website: Globe,
  skype: MessageSquare
};

interface ContactChannel {
  id?: string;
  channel_type: string;
  value: string;
  country_code?: string;
  is_primary?: boolean;
  is_verified?: boolean;
}

interface ContactAddress {
  id?: string;
  type?: string;
  address_type?: string;
  label?: string;
  address_line1?: string;
  line1?: string;
  address_line2?: string;
  line2?: string;
  city: string;
  state?: string;
  country_code?: string;
  country?: string;
  postal_code?: string;
  is_primary?: boolean;
}

interface ContactTag {
  id: string;
  tag_label: string;
  tag_value?: string;
  tag_color?: string;
}

interface ComplianceNumber {
  id?: string;
  type_value: string;
  type_label?: string;
  number: string;
  hexcolor?: string;
}

interface Classification {
  id?: string;
  classification_value: string;
  classification_label: string;
}

// Cockpit data for compact variant
interface CockpitData {
  ltv: number;
  outstanding?: number;
  health_score: number;
}

interface ContactHeaderCardProps {
  contact: {
    id: string;
    type: 'individual' | 'corporate';
    status: 'active' | 'inactive' | 'archived';
    contact_number?: string;
    name?: string;
    salutation?: string;
    company_name?: string;
    classifications: Array<Classification | string>;
    contact_channels?: ContactChannel[];
    addresses?: ContactAddress[];
    tags?: ContactTag[];
    compliance_numbers?: ComplianceNumber[];
    created_at: string;
    updated_at: string;
  };
  cockpitData?: CockpitData;  // NEW: Optional cockpit metrics
  variant?: 'default' | 'compact';  // NEW: Layout variant
  isLoading?: boolean;  // NEW: Loading state for cockpit data
  className?: string;
}

const ContactHeaderCard: React.FC<ContactHeaderCardProps> = ({
  contact,
  cockpitData,
  variant = 'default',
  isLoading = false,
  className = ''
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { toast } = useToast();
  const [copiedValue, setCopiedValue] = React.useState<string | null>(null);

  // Determine if we should show compact cockpit layout
  const showCompactCockpit = variant === 'compact' && (cockpitData || isLoading);

  // Generate avatar initials
  const getAvatarInitials = (): string => {
    if (contact.type === 'corporate') {
      return contact.company_name?.substring(0, 2).toUpperCase() || 'CO';
    } else {
      const name = contact.name || '';
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase() || 'UN';
    }
  };

  // Get display name
  const displayName = formatContactDisplayName(contact);

  // Get primary and other channels
  const getPrimaryChannel = (): ContactChannel | null => {
    if (!contact.contact_channels?.length) return null;
    return contact.contact_channels.find(ch => ch.is_primary) || contact.contact_channels[0];
  };

  const getOtherChannels = (): ContactChannel[] => {
    if (!contact.contact_channels?.length) return [];
    const primary = getPrimaryChannel();
    return contact.contact_channels.filter(ch => ch.id !== primary?.id);
  };

  // Get primary address
  const getPrimaryAddress = (): ContactAddress | null => {
    if (!contact.addresses?.length) return null;
    return contact.addresses.find(addr => addr.is_primary) || contact.addresses[0];
  };

  // Format phone number with country code
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

  // Format address for display
  const formatAddressDisplay = (address: ContactAddress): string[] => {
    const lines: string[] = [];
    const line1 = address.address_line1 || address.line1;
    const line2 = address.address_line2 || address.line2;

    if (line1) lines.push(line1);
    if (line2) lines.push(line2);

    const cityState = [address.city, address.state].filter(Boolean).join(', ');
    if (cityState) lines.push(cityState);

    const countryPostal = [address.postal_code, address.country_code || address.country].filter(Boolean).join(', ');
    if (countryPostal) lines.push(countryPostal);

    return lines;
  };

  // Copy to clipboard
  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
        duration: 2000
      });
      setTimeout(() => setCopiedValue(null), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Could not copy to clipboard"
      });
    }
  };

  // Get channel icon
  const getChannelIcon = (channelType: string): React.ElementType => {
    return CHANNEL_ICONS[channelType] || Globe;
  };

  // Format currency for display
  const formatCurrency = (value: number): string => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(1)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value.toFixed(0)}`;
  };

  // Get health score color and label
  const getHealthInfo = (score: number): { color: string; label: string; bgColor: string } => {
    if (score >= 80) {
      return {
        color: colors.semantic.success,
        bgColor: colors.semantic.success + '20',
        label: 'Excellent'
      };
    } else if (score >= 60) {
      return {
        color: '#F59E0B',
        bgColor: '#F59E0B20',
        label: 'Good'
      };
    } else if (score >= 40) {
      return {
        color: '#F97316',
        bgColor: '#F9731620',
        label: 'Fair'
      };
    }
    return {
      color: colors.semantic.error,
      bgColor: colors.semantic.error + '20',
      label: 'Needs Attention'
    };
  };

  const primaryChannel = getPrimaryChannel();
  const otherChannels = getOtherChannels();
  const primaryAddress = getPrimaryAddress();
  const hasChannels = contact.contact_channels && contact.contact_channels.length > 0;
  const hasAddress = contact.addresses && contact.addresses.length > 0;
  const hasTags = contact.tags && contact.tags.length > 0;
  const hasCompliance = contact.compliance_numbers && contact.compliance_numbers.length > 0;

  // Calculate grid columns based on available data (for default variant)
  const visibleSections = [
    true, // Name/Classification always visible
    hasChannels,
    hasAddress,
    hasTags || hasCompliance
  ].filter(Boolean).length;

  // ═══════════════════════════════════════════════════════════════════
  // COMPACT COCKPIT VARIANT
  // ═══════════════════════════════════════════════════════════════════
  if (showCompactCockpit) {
    const healthInfo = cockpitData ? getHealthInfo(cockpitData.health_score) : null;

    return (
      <div
        className={`rounded-xl border transition-colors ${className}`}
        style={{
          background: isDarkMode
            ? `linear-gradient(135deg, ${colors.brand.primary}25 0%, ${colors.brand.secondary}15 100%)`
            : `linear-gradient(135deg, ${colors.brand.primary}12 0%, ${colors.brand.secondary}08 100%)`,
          backdropFilter: 'blur(12px)',
          borderColor: isDarkMode ? `${colors.brand.primary}40` : `${colors.brand.primary}25`
        }}
      >
        <div className="flex items-center justify-between p-4">
          {/* Left Side: Avatar + Name + Classifications */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 shadow-md"
              style={{
                background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.secondary} 100%)`,
                color: '#ffffff'
              }}
            >
              {getAvatarInitials()}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name + Type Icon */}
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

              {/* Classifications + Contact Number + Status */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {contact.classifications.slice(0, 3).map((classification, index) => {
                  const classLabel = typeof classification === 'string'
                    ? classification
                    : classification.classification_label;
                  return (
                    <span
                      key={typeof classification === 'string' ? `class-${index}` : ((classification as Classification).id || `class-${index}`)}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${colors.brand.primary}25`,
                        color: isDarkMode ? colors.utility.primaryText : colors.brand.primary
                      }}
                    >
                      {classLabel}
                    </span>
                  );
                })}
                {contact.classifications.length > 3 && (
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    +{contact.classifications.length - 3}
                  </span>
                )}

                {/* Separator */}
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ backgroundColor: colors.utility.secondaryText }}
                />

                {/* Contact Number or ID */}
                {contact.contact_number ? (
                  <code
                    className="text-xs font-mono font-medium cursor-pointer hover:opacity-80"
                    style={{ color: colors.utility.secondaryText }}
                    onClick={() => copyToClipboard(contact.contact_number!, 'Contact Number')}
                  >
                    {contact.contact_number}
                  </code>
                ) : (
                  <code
                    className="text-xs font-mono cursor-pointer hover:opacity-80"
                    style={{ color: colors.utility.secondaryText }}
                    onClick={() => copyToClipboard(contact.id, 'Contact ID')}
                  >
                    {contact.id.substring(0, 8)}
                  </code>
                )}

                {/* Status Badge */}
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: contact.status === 'active'
                      ? colors.semantic.success + '20'
                      : contact.status === 'inactive'
                        ? colors.semantic.warning + '20'
                        : colors.semantic.error + '20',
                    color: contact.status === 'active'
                      ? colors.semantic.success
                      : contact.status === 'inactive'
                        ? colors.semantic.warning
                        : colors.semantic.error
                  }}
                >
                  {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: Cockpit Metrics */}
          <div
            className="flex items-center gap-6 pl-6 border-l flex-shrink-0"
            style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
          >
            {isLoading ? (
              // Loading skeleton
              <div className="flex items-center gap-6 animate-pulse">
                <div className="text-right">
                  <div className="h-3 w-8 rounded bg-gray-300 dark:bg-gray-600 mb-1" />
                  <div className="h-5 w-16 rounded bg-gray-300 dark:bg-gray-600" />
                </div>
                <div className="text-right">
                  <div className="h-3 w-16 rounded bg-gray-300 dark:bg-gray-600 mb-1" />
                  <div className="h-5 w-12 rounded bg-gray-300 dark:bg-gray-600" />
                </div>
                <div className="text-right">
                  <div className="h-3 w-12 rounded bg-gray-300 dark:bg-gray-600 mb-1" />
                  <div className="h-5 w-20 rounded bg-gray-300 dark:bg-gray-600" />
                </div>
              </div>
            ) : cockpitData ? (
              <>
                {/* LTV */}
                <div className="text-right">
                  <div
                    className="text-xs font-medium uppercase tracking-wider flex items-center gap-1 justify-end"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <TrendingUp className="h-3 w-3" />
                    LTV
                  </div>
                  <div
                    className="text-lg font-bold"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {formatCurrency(cockpitData.ltv)}
                  </div>
                </div>

                {/* Outstanding */}
                {cockpitData.outstanding !== undefined && cockpitData.outstanding > 0 && (
                  <div className="text-right">
                    <div
                      className="text-xs font-medium uppercase tracking-wider flex items-center gap-1 justify-end"
                      style={{ color: colors.semantic.warning }}
                    >
                      <AlertCircle className="h-3 w-3" />
                      Outstanding
                    </div>
                    <div
                      className="text-lg font-bold"
                      style={{ color: colors.semantic.warning }}
                    >
                      {formatCurrency(cockpitData.outstanding)}
                    </div>
                  </div>
                )}

                {/* Health Score */}
                <div className="text-right min-w-[100px]">
                  <div
                    className="text-xs font-medium uppercase tracking-wider flex items-center gap-1 justify-end"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <Heart className="h-3 w-3" style={{ color: healthInfo?.color }} />
                    Health
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span
                      className="text-lg font-bold"
                      style={{ color: healthInfo?.color }}
                    >
                      {cockpitData.health_score}%
                    </span>
                    {/* Progress bar */}
                    <div
                      className="w-16 h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${cockpitData.health_score}%`,
                          backgroundColor: healthInfo?.color
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // DEFAULT VARIANT (Original 4-Section Layout)
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div
      className={`rounded-xl border transition-colors ${className}`}
      style={{
        background: isDarkMode
          ? `linear-gradient(135deg, ${colors.brand.primary}25 0%, ${colors.brand.secondary}15 100%)`
          : `linear-gradient(135deg, ${colors.brand.primary}12 0%, ${colors.brand.secondary}08 100%)`,
        backdropFilter: 'blur(12px)',
        borderColor: isDarkMode ? `${colors.brand.primary}40` : `${colors.brand.primary}25`
      }}
    >
      {/* 4-Section Grid */}
      <div
        className="grid gap-4 p-4"
        style={{
          gridTemplateColumns: visibleSections <= 2
            ? 'repeat(auto-fit, minmax(200px, 1fr))'
            : `repeat(${visibleSections}, minmax(0, 1fr))`
        }}
      >
        {/* SECTION 1: Name & Classification */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-md"
            style={{
              background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.secondary} 100%)`,
              color: '#ffffff'
            }}
          >
            {getAvatarInitials()}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + Type Icon */}
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

            {/* Classifications */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {contact.classifications.map((classification, index) => {
                const classLabel = typeof classification === 'string'
                  ? classification
                  : classification.classification_label;
                return (
                  <span
                    key={typeof classification === 'string' ? `class-${index}` : ((classification as Classification).id || `class-${index}`)}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${colors.brand.primary}25`,
                      color: isDarkMode ? colors.utility.primaryText : colors.brand.primary
                    }}
                  >
                    {classLabel}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 2: Contact Channels */}
        {hasChannels && (
          <div
            className="border-l pl-4"
            style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: colors.utility.secondaryText }}
            >
              Contact
            </h3>
            <div className="space-y-1.5">
              {/* Primary Channel */}
              {primaryChannel && (
                <div
                  className="flex items-center gap-2 group cursor-pointer"
                  onClick={() => copyToClipboard(
                    primaryChannel.channel_type === 'mobile' || primaryChannel.channel_type === 'phone'
                      ? formatPhoneDisplay(primaryChannel)
                      : primaryChannel.value,
                    primaryChannel.channel_type
                  )}
                >
                  <Star
                    className="h-3 w-3 flex-shrink-0"
                    style={{ color: colors.brand.primary, fill: colors.brand.primary }}
                  />
                  {React.createElement(getChannelIcon(primaryChannel.channel_type), {
                    className: "h-3.5 w-3.5 flex-shrink-0",
                    style: { color: colors.utility.secondaryText }
                  })}
                  <span
                    className="text-sm truncate group-hover:underline"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {primaryChannel.channel_type === 'mobile' || primaryChannel.channel_type === 'phone'
                      ? formatPhoneDisplay(primaryChannel)
                      : primaryChannel.value}
                  </span>
                  {copiedValue === (primaryChannel.channel_type === 'mobile' || primaryChannel.channel_type === 'phone'
                    ? formatPhoneDisplay(primaryChannel)
                    : primaryChannel.value) ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-50" style={{ color: colors.utility.secondaryText }} />
                  )}
                </div>
              )}

              {/* Other Channels (max 2) */}
              {otherChannels.slice(0, 2).map((channel) => (
                <div
                  key={channel.id || channel.value}
                  className="flex items-center gap-2 group cursor-pointer"
                  onClick={() => copyToClipboard(
                    channel.channel_type === 'mobile' || channel.channel_type === 'phone'
                      ? formatPhoneDisplay(channel)
                      : channel.value,
                    channel.channel_type
                  )}
                >
                  <span className="w-3" /> {/* Spacer for alignment */}
                  {React.createElement(getChannelIcon(channel.channel_type), {
                    className: "h-3.5 w-3.5 flex-shrink-0",
                    style: { color: colors.utility.secondaryText }
                  })}
                  <span
                    className="text-sm truncate group-hover:underline"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {channel.channel_type === 'mobile' || channel.channel_type === 'phone'
                      ? formatPhoneDisplay(channel)
                      : channel.value}
                  </span>
                  <Copy className="h-3 w-3 opacity-0 group-hover:opacity-50" style={{ color: colors.utility.secondaryText }} />
                </div>
              ))}

              {/* More channels indicator */}
              {otherChannels.length > 2 && (
                <span
                  className="text-xs pl-5"
                  style={{ color: colors.utility.secondaryText }}
                >
                  +{otherChannels.length - 2} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* SECTION 3: Address */}
        {hasAddress && primaryAddress && (
          <div
            className="border-l pl-4"
            style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: colors.utility.secondaryText }}
            >
              Address
            </h3>
            <div className="flex items-start gap-2">
              <MapPin
                className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
                style={{ color: colors.semantic.warning }}
              />
              <div className="space-y-0.5">
                {formatAddressDisplay(primaryAddress).map((line, idx) => (
                  <p
                    key={idx}
                    className="text-sm leading-tight"
                    style={{ color: idx === 0 ? colors.utility.primaryText : colors.utility.secondaryText }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
            {contact.addresses && contact.addresses.length > 1 && (
              <span
                className="text-xs mt-1 block pl-5"
                style={{ color: colors.utility.secondaryText }}
              >
                +{contact.addresses.length - 1} more address{contact.addresses.length > 2 ? 'es' : ''}
              </span>
            )}
          </div>
        )}

        {/* SECTION 4: Tags & Compliance */}
        {(hasTags || hasCompliance) && (
          <div
            className="border-l pl-4"
            style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
          >
            {/* Tags */}
            {hasTags && (
              <div className="mb-3">
                <h3
                  className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <Tag className="h-3 w-3" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1">
                  {contact.tags?.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: (tag.tag_color || colors.brand.secondary) + '25',
                        color: isDarkMode ? colors.utility.primaryText : (tag.tag_color || colors.brand.secondary)
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
              </div>
            )}

            {/* Compliance Numbers (Corporate only) */}
            {hasCompliance && (
              <div>
                <h3
                  className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <Shield className="h-3 w-3" />
                  Compliance
                </h3>
                <div className="space-y-1">
                  {contact.compliance_numbers?.slice(0, 2).map((comp) => (
                    <div
                      key={comp.id || comp.number}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className="font-medium"
                        style={{ color: comp.hexcolor || colors.accent.accent1 }}
                      >
                        {comp.type_label || comp.type_value}:
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {comp.number}
                      </span>
                    </div>
                  ))}
                  {contact.compliance_numbers && contact.compliance_numbers.length > 2 && (
                    <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      +{contact.compliance_numbers.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: Contact Number + Status */}
      <div
        className="flex items-center justify-between px-4 py-2 border-t"
        style={{
          borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          backgroundColor: isDarkMode ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)'
        }}
      >
        <div className="flex items-center gap-2">
          {contact.contact_number ? (
            <>
              <code
                className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: `${colors.brand.primary}15`,
                  color: colors.brand.primary
                }}
                onClick={() => copyToClipboard(contact.contact_number!, 'Contact Number')}
                title={`ID: ${contact.id}`}
              >
                {contact.contact_number}
              </code>
            </>
          ) : (
            <>
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>ID:</span>
              <code
                className="text-xs font-mono px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  color: colors.utility.secondaryText
                }}
                onClick={() => copyToClipboard(contact.id, 'Contact ID')}
              >
                {contact.id.substring(0, 8)}...
              </code>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: contact.status === 'active'
                ? colors.semantic.success + '20'
                : contact.status === 'inactive'
                  ? colors.semantic.warning + '20'
                  : colors.semantic.error + '20',
              color: contact.status === 'active'
                ? colors.semantic.success
                : contact.status === 'inactive'
                  ? colors.semantic.warning
                  : colors.semantic.error
            }}
          >
            {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
          </span>
          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
            Updated {new Date(contact.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ContactHeaderCard;
