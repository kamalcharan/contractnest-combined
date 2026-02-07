// src/components/contracts/ContractWizard/steps/BuyerSelectionStep.tsx
// Step 1: Select buyer (contact) for the contract
// V3.0: Uses shared ViewCard + PersonListItem components, fetches full contact data, skip option
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  User,
  Building2,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  Check,
  Users,
  ChevronDown,
  ChevronUp,
  Star,
  MapPin,
  Tag,
  Shield,
  Linkedin,
  LucideIcon,
  SkipForward,
  Loader2,
  X,
  Square,
  CheckSquare
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useContactList, useContact } from '@/hooks/useContacts';
import QuickAddContactDrawer from '@/components/contacts/QuickAddContactDrawer';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import {
  CONTACT_CLASSIFICATION_CONFIG,
  getClassificationColors,
  formatContactDisplayName
} from '@/utils/constants/contacts';

// Contract type definition
type ContractType = 'client' | 'vendor' | 'partner';

// Configuration for each contract type
const CONTRACT_TYPE_LABELS: Record<ContractType, {
  heading: string;
  subtitle: string;
  searchPlaceholder: string;
  addButtonText: string;
  emptyMessage: string;
  classification: string;
}> = {
  client: {
    heading: 'Select your Client',
    subtitle: 'Choose which client this contract is for',
    searchPlaceholder: 'Search clients...',
    addButtonText: 'Add New Client',
    emptyMessage: 'No clients found',
    classification: 'client',
  },
  vendor: {
    heading: 'Select your Vendor',
    subtitle: 'Choose which vendor this contract is with',
    searchPlaceholder: 'Search vendors...',
    addButtonText: 'Add New Vendor',
    emptyMessage: 'No vendors found',
    classification: 'vendor',
  },
  partner: {
    heading: 'Select your Partner',
    subtitle: 'Choose which partner this contract is with',
    searchPlaceholder: 'Search partners...',
    addButtonText: 'Add New Partner',
    emptyMessage: 'No partners found',
    classification: 'partner',
  },
};
import { countries } from '@/utils/constants/countries';

// Import shared components
import { ViewCard, PersonListItem, ContactPerson, getPersonPrimaryChannel, getPersonChannelDisplay, getChannelIcon } from '@/components/common/cards';

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

interface BuyerSelectionStepProps {
  selectedBuyerId: string | null;
  selectedBuyerName: string;
  selectedContactPersonId?: string | null;
  selectedContactPersonName?: string;
  useCompanyContact?: boolean;
  contractType?: ContractType;
  onSelectBuyer: (
    buyerId: string,
    buyerName: string,
    contactPersonId?: string,
    contactPersonName?: string,
    useCompanyContact?: boolean
  ) => void;
  // Multi-select mode (for RFQ vendor selection)
  multiSelect?: boolean;
  selectedVendorIds?: string[];
  selectedVendorNames?: string[];
  onVendorsChange?: (ids: string[], names: string[]) => void;
  // Acceptance method from wizard (drives notification note)
  acceptanceMethod?: 'payment' | 'signoff' | 'auto' | null;
}

const BuyerSelectionStep: React.FC<BuyerSelectionStepProps> = ({
  selectedBuyerId,
  selectedBuyerName,
  selectedContactPersonId,
  selectedContactPersonName,
  useCompanyContact: initialUseCompanyContact,
  contractType = 'client',
  onSelectBuyer,
  multiSelect = false,
  selectedVendorIds = [],
  selectedVendorNames = [],
  onVendorsChange,
  acceptanceMethod,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();

  // Get labels config for current contract type
  const labels = CONTRACT_TYPE_LABELS[contractType];

  // Local state - classification is now fixed based on contract type
  const selectedClassification = labels.classification;
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [showOtherContacts, setShowOtherContacts] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(selectedContactPersonId || null);
  const [useCompanyContact, setUseCompanyContact] = useState(initialUseCompanyContact || false);

  // Track explicit "change buyer" to prevent useEffect from re-setting selectedContact
  const [isChangingBuyer, setIsChangingBuyer] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length === 0 || searchTerm.length >= 3) {
        setDebouncedSearch(searchTerm);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch contacts list - filtered by contract type classification
  const { data: contacts, loading: listLoading } = useContactList({
    page: 1,
    limit: 20,
    search: debouncedSearch || undefined,
    classifications: [selectedClassification],
    status: 'active',
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  // Fetch FULL contact details when a contact is selected (to get contact_persons)
  const {
    data: fullContactData,
    loading: fullContactLoading
  } = useContact(selectedBuyerId || '');

  // Update selected contact when full data is loaded (skip if user just clicked "Change")
  useEffect(() => {
    if (fullContactData && selectedBuyerId && !isChangingBuyer) {
      setSelectedContact(fullContactData);
    }
  }, [fullContactData, selectedBuyerId, isChangingBuyer]);

  // Handle contact selection from list
  const handleSelectContact = useCallback((contact: any) => {
    const displayName = contact.type === 'corporate'
      ? contact.company_name
      : contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim();

    // Clear the change-buyer guard so useEffect can populate full data
    setIsChangingBuyer(false);

    // Set basic selection first (full data will load via useContact hook)
    setSelectedContact(contact);
    setShowOtherContacts(false);
    setUseCompanyContact(false);
    setSelectedPersonId(null);

    // Call onSelectBuyer - contact_persons will be handled after full data loads
    onSelectBuyer(contact.id, displayName || 'Unknown');

    addToast({
      type: 'success',
      title: 'Buyer selected',
      message: `${displayName || 'Contact'} selected as buyer`,
    });
  }, [onSelectBuyer, addToast]);

  // Multi-select toggle handler (for RFQ vendor selection)
  const handleToggleVendor = useCallback((contact: any) => {
    if (!onVendorsChange) return;
    const displayName = contact.type === 'corporate'
      ? contact.company_name
      : contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    const contactId = contact.id as string;
    const name = displayName || 'Unknown';

    const idx = selectedVendorIds.indexOf(contactId);
    if (idx >= 0) {
      // Remove
      const newIds = selectedVendorIds.filter((_, i) => i !== idx);
      const newNames = selectedVendorNames.filter((_, i) => i !== idx);
      onVendorsChange(newIds, newNames);
    } else {
      // Add
      onVendorsChange([...selectedVendorIds, contactId], [...selectedVendorNames, name]);
      addToast({
        type: 'success',
        title: 'Vendor added',
        message: `${name} added to RFQ recipients`,
      });
    }
  }, [onVendorsChange, selectedVendorIds, selectedVendorNames, addToast]);

  // Auto-select primary person when full contact data loads
  useEffect(() => {
    if (fullContactData && fullContactData.type === 'corporate' && !useCompanyContact) {
      const contactPersons = fullContactData.contact_persons || [];
      if (contactPersons.length > 0 && !selectedPersonId) {
        const primaryPerson = contactPersons.find((p: ContactPerson) => p.is_primary) || contactPersons[0];
        setSelectedPersonId(primaryPerson.id);
        const displayName = fullContactData.company_name || fullContactData.name;
        onSelectBuyer(fullContactData.id, displayName, primaryPerson.id, primaryPerson.name, false);
      }
    }
  }, [fullContactData, selectedPersonId, useCompanyContact, onSelectBuyer]);

  // Handle contact person selection
  const handleSelectContactPerson = useCallback((person: ContactPerson) => {
    setSelectedPersonId(person.id);
    setUseCompanyContact(false);
    if (selectedContact) {
      const displayName = selectedContact.company_name || selectedContact.name;
      onSelectBuyer(selectedContact.id, displayName, person.id, person.name, false);
      addToast({
        type: 'success',
        title: 'Contact person selected',
        message: `${person.name} selected as contact person`,
      });
    }
    setShowOtherContacts(false);
  }, [selectedContact, onSelectBuyer, addToast]);

  // Handle "Use Company Contact Info" (skip person selection)
  const handleUseCompanyContact = useCallback(() => {
    setSelectedPersonId(null);
    setUseCompanyContact(true);
    if (selectedContact) {
      const displayName = selectedContact.company_name || selectedContact.name;
      onSelectBuyer(selectedContact.id, displayName, undefined, undefined, true);
      addToast({
        type: 'info',
        title: 'Using company contact',
        message: 'Contract will use company\'s main contact information',
      });
    }
  }, [selectedContact, onSelectBuyer, addToast]);

  // Handle change buyer
  const handleChangeBuyer = useCallback(() => {
    setIsChangingBuyer(true);
    setSelectedContact(null);
    setSelectedPersonId(null);
    setShowOtherContacts(false);
    setUseCompanyContact(false);
    onSelectBuyer('', '');
  }, [onSelectBuyer]);

  // Handle quick add success
  const handleQuickAddSuccess = useCallback((contactId: string) => {
    setIsDrawerOpen(false);
    addToast({
      type: 'success',
      title: 'Contact created',
      message: 'New contact added. Search to select them as buyer.',
    });
  }, [addToast]);

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

  // Get primary and other channels
  const getPrimaryChannel = (contact: any): ContactChannel | null => {
    if (!contact?.contact_channels?.length) return null;
    return contact.contact_channels.find((ch: ContactChannel) => ch.is_primary) || contact.contact_channels[0];
  };

  const getOtherChannels = (contact: any): ContactChannel[] => {
    if (!contact?.contact_channels?.length) return [];
    const primary = getPrimaryChannel(contact);
    return contact.contact_channels.filter((ch: ContactChannel) => ch.id !== primary?.id);
  };

  // Get primary address
  const getPrimaryAddress = (contact: any): ContactAddress | null => {
    if (!contact?.addresses?.length) return null;
    return contact.addresses.find((addr: ContactAddress) => addr.is_primary) || contact.addresses[0];
  };

  // Format address for display
  const formatAddressDisplay = (address: ContactAddress): string[] => {
    const lines: string[] = [];
    const line1 = address.address_line1 || address.line1;
    const cityState = [address.city, address.state].filter(Boolean).join(', ');
    if (line1) lines.push(line1);
    if (cityState) lines.push(cityState);
    return lines;
  };

  // Generate avatar initials
  const getAvatarInitials = (contact: any): string => {
    if (contact?.type === 'corporate') {
      return contact.company_name?.substring(0, 2).toUpperCase() || 'CO';
    } else {
      const name = contact?.name || '';
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase() || 'UN';
    }
  };

  // Get corporate contact persons from full contact data
  const corporateContactPersons: ContactPerson[] = useMemo(() => {
    const data = fullContactData || selectedContact;
    if (!data || data.type !== 'corporate') return [];
    return data.contact_persons || [];
  }, [fullContactData, selectedContact]);

  // Get selected contact person details
  const selectedPerson = useMemo(() => {
    if (!selectedPersonId || !corporateContactPersons.length) return null;
    return corporateContactPersons.find(p => p.id === selectedPersonId);
  }, [selectedPersonId, corporateContactPersons]);

  // Render Selected Contact Header Card
  const renderSelectedContactCard = () => {
    if (!selectedContact) return null;

    const displayName = formatContactDisplayName(selectedContact);
    const primaryChannel = getPrimaryChannel(selectedContact);
    const otherChannels = getOtherChannels(selectedContact);
    const primaryAddress = getPrimaryAddress(selectedContact);
    const hasChannels = selectedContact.contact_channels && selectedContact.contact_channels.length > 0;
    const hasAddress = selectedContact.addresses && selectedContact.addresses.length > 0;
    const hasTags = selectedContact.tags && selectedContact.tags.length > 0;
    const hasCompliance = selectedContact.compliance_numbers && selectedContact.compliance_numbers.length > 0;
    const isCorporate = selectedContact.type === 'corporate';
    const hasContactPersons = corporateContactPersons.length > 0;
    const isLoadingPersons = isCorporate && fullContactLoading;

    const ChannelIconComponent = (channelType: string) => {
      const Icon = CHANNEL_ICONS[channelType] || Globe;
      return Icon;
    };

    return (
      <div
        className="rounded-xl border mb-6 overflow-hidden transition-all"
        style={{
          background: isDarkMode
            ? `linear-gradient(135deg, ${colors.semantic.success}15 0%, ${colors.brand.primary}10 100%)`
            : `linear-gradient(135deg, ${colors.semantic.success}08 0%, ${colors.brand.primary}05 100%)`,
          borderColor: colors.semantic.success
        }}
      >
        {/* Header Bar */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{
            backgroundColor: `${colors.semantic.success}15`,
            borderBottom: `1px solid ${colors.semantic.success}30`
          }}
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" style={{ color: colors.semantic.success }} />
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: colors.semantic.success }}
            >
              {isCorporate ? 'Selected Company' : 'Selected Buyer'}
            </span>
          </div>
          <button
            onClick={handleChangeBuyer}
            className="text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{ color: colors.brand.primary }}
          >
            Change
          </button>
        </div>

        {/* 4-Section Grid (ContactHeaderCard style) */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* SECTION 1: Name & Classification */}
            <div className="flex items-start gap-3">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.secondary || colors.brand.primary} 100%)`,
                  color: '#ffffff'
                }}
              >
                {getAvatarInitials(selectedContact)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className="font-semibold text-base truncate"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {displayName}
                  </h3>
                  {isCorporate ? (
                    <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: colors.brand.primary }} />
                  ) : (
                    <User className="h-4 w-4 flex-shrink-0" style={{ color: colors.brand.primary }} />
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedContact.classifications?.map((classification: any, index: number) => {
                    const classLabel = typeof classification === 'string'
                      ? classification
                      : classification.classification_label;
                    return (
                      <span
                        key={`class-${index}`}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${colors.brand.primary}20`,
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
                className="md:border-l md:pl-4"
                style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
              >
                <h4
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Contact
                </h4>
                <div className="space-y-1.5">
                  {primaryChannel && (
                    <div className="flex items-center gap-2">
                      <Star
                        className="h-3 w-3 flex-shrink-0"
                        style={{ color: colors.brand.primary, fill: colors.brand.primary }}
                      />
                      {React.createElement(ChannelIconComponent(primaryChannel.channel_type), {
                        className: "h-3.5 w-3.5 flex-shrink-0",
                        style: { color: colors.utility.secondaryText }
                      })}
                      <span
                        className="text-sm truncate"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {primaryChannel.channel_type === 'mobile' || primaryChannel.channel_type === 'phone'
                          ? formatPhoneDisplay(primaryChannel)
                          : primaryChannel.value}
                      </span>
                    </div>
                  )}
                  {otherChannels.slice(0, 2).map((channel) => (
                    <div key={channel.id || channel.value} className="flex items-center gap-2">
                      <span className="w-3" />
                      {React.createElement(ChannelIconComponent(channel.channel_type), {
                        className: "h-3.5 w-3.5 flex-shrink-0",
                        style: { color: colors.utility.secondaryText }
                      })}
                      <span
                        className="text-sm truncate"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {channel.channel_type === 'mobile' || channel.channel_type === 'phone'
                          ? formatPhoneDisplay(channel)
                          : channel.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: Address */}
            {hasAddress && primaryAddress && (
              <div
                className="md:border-l md:pl-4"
                style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
              >
                <h4
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Address
                </h4>
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
              </div>
            )}

            {/* SECTION 4: Tags & Compliance */}
            {(hasTags || hasCompliance) && (
              <div
                className="md:border-l md:pl-4"
                style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
              >
                {hasTags && (
                  <div className="mb-2">
                    <h4
                      className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      <Tag className="h-3 w-3" />
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedContact.tags?.slice(0, 3).map((tag: ContactTag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: (tag.tag_color || colors.brand.secondary || colors.brand.primary) + '20',
                            color: isDarkMode ? colors.utility.primaryText : (tag.tag_color || colors.brand.secondary || colors.brand.primary)
                          }}
                        >
                          {tag.tag_label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {hasCompliance && (
                  <div>
                    <h4
                      className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      <Shield className="h-3 w-3" />
                      Compliance
                    </h4>
                    <div className="space-y-1">
                      {selectedContact.compliance_numbers?.slice(0, 2).map((comp: ComplianceNumber) => (
                        <div key={comp.id || comp.number} className="flex items-center gap-2 text-xs">
                          <span
                            className="font-medium"
                            style={{ color: comp.hexcolor || colors.brand.primary }}
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
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Corporate Contact Person Picker - Using shared ViewCard */}
          {isCorporate && (
            <div className="mt-4">
              <ViewCard
                title="Contract Contact Person"
                icon={<Users className="h-3.5 w-3.5" style={{ color: '#f59e0b' }} />}
                iconBg="#f59e0b20"
                iconColor="#f59e0b"
                count={hasContactPersons ? corporateContactPersons.length : undefined}
                isEmpty={!isLoadingPersons && !hasContactPersons && !useCompanyContact}
                emptyMessage="No contact persons added for this company"
                onAdd={() => {
                  addToast({
                    type: 'info',
                    title: 'Add Contact Person',
                    message: 'To add contact persons, please edit the contact in Contacts module',
                  });
                }}
                addLabel="Add Person"
              >
                {/* Loading State */}
                {isLoadingPersons && (
                  <div className="flex items-center justify-center py-4 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: colors.brand.primary }} />
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Loading contact persons...
                    </span>
                  </div>
                )}

                {/* Use Company Contact Option (when no persons OR user chose to skip) */}
                {!isLoadingPersons && (!hasContactPersons || useCompanyContact) && (
                  <div className="space-y-3">
                    {useCompanyContact && (
                      <div
                        className="flex items-center gap-3 p-3 rounded-xl border"
                        style={{
                          backgroundColor: `${colors.brand.primary}08`,
                          borderColor: `${colors.brand.primary}40`
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${colors.brand.primary}20` }}
                        >
                          <Building2 className="w-5 h-5" style={{ color: colors.brand.primary }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                            Using Company Contact Info
                          </p>
                          <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                            Contract will use the company's main contact details
                          </p>
                        </div>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: colors.semantic.success }}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}

                    {!hasContactPersons && !useCompanyContact && (
                      <button
                        onClick={handleUseCompanyContact}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-md"
                        style={{
                          backgroundColor: colors.utility.primaryBackground,
                          borderColor: `${colors.utility.primaryText}15`
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${colors.brand.primary}15` }}
                        >
                          <SkipForward className="w-5 h-5" style={{ color: colors.brand.primary }} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                            Use Company Contact Info
                          </p>
                          <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                            Skip person selection, use company's main contact
                          </p>
                        </div>
                        <ChevronDown className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                      </button>
                    )}
                  </div>
                )}

                {/* Contact Persons List */}
                {!isLoadingPersons && hasContactPersons && !useCompanyContact && (
                  <div className="space-y-3">
                    {/* Selected/Primary Person */}
                    {selectedPerson && (
                      <PersonListItem
                        person={selectedPerson}
                        isSelected={true}
                        showCheckmark={true}
                        variant="card"
                        primaryColor="#f59e0b"
                      />
                    )}

                    {/* View Other Contacts Toggle */}
                    {corporateContactPersons.length > 1 && (
                      <>
                        <button
                          onClick={() => setShowOtherContacts(!showOtherContacts)}
                          className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
                          style={{ color: colors.brand.primary }}
                        >
                          {showOtherContacts ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Collapse
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              View {corporateContactPersons.length - 1} other contact{corporateContactPersons.length > 2 ? 's' : ''}
                            </>
                          )}
                        </button>

                        {/* Other Contact Persons */}
                        {showOtherContacts && (
                          <div className="space-y-2">
                            {corporateContactPersons
                              .filter(p => p.id !== selectedPerson?.id)
                              .map((person) => (
                                <PersonListItem
                                  key={person.id}
                                  person={person}
                                  isSelected={false}
                                  onClick={() => handleSelectContactPerson(person)}
                                  showRadio={true}
                                  variant="card"
                                  primaryColor="#f59e0b"
                                />
                              ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Skip / Use Company Option */}
                    <button
                      onClick={handleUseCompanyContact}
                      className="w-full flex items-center gap-2 py-2 text-xs font-medium hover:opacity-80 transition-opacity"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      Skip - use company's main contact info instead
                    </button>
                  </div>
                )}
              </ViewCard>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t"
          style={{
            borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            backgroundColor: isDarkMode ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.02)'
          }}
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
              {selectedContact.id?.substring(0, 8)}...
            </code>
          </div>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: selectedContact.status === 'active'
                ? colors.semantic.success + '20'
                : colors.semantic.warning + '20',
              color: selectedContact.status === 'active'
                ? colors.semantic.success
                : colors.semantic.warning
            }}
          >
            {selectedContact.status?.charAt(0).toUpperCase() + selectedContact.status?.slice(1)}
          </span>
        </div>
      </div>
    );
  };

  // Render Notification Note — shows where acceptance notifications will be sent
  const renderNotificationNote = () => {
    if (!selectedContact || !acceptanceMethod) return null;

    // Auto-accept: simple note, no channel check needed
    if (acceptanceMethod === 'auto') {
      return (
        <div
          className="rounded-xl border p-4 mb-6"
          style={{
            backgroundColor: `${colors.semantic.success}08`,
            borderColor: `${colors.semantic.success}30`,
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${colors.semantic.success}15` }}
            >
              <Check className="w-4 h-4" style={{ color: colors.semantic.success }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                Auto-Accept Enabled
              </p>
              <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                This contract will be automatically accepted upon creation. No acceptance notifications will be sent.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Determine which channels to use based on contact type / person selection
    const isCorporate = selectedContact.type === 'corporate';
    let activeChannels: ContactChannel[] = [];
    let contactLabel = '';

    if (isCorporate && selectedPerson && !useCompanyContact) {
      // Corporate with selected person — use that person's channels
      activeChannels = selectedPerson.contact_channels || [];
      contactLabel = selectedPerson.name || 'selected contact person';
    } else {
      // Individual contact or corporate using company info
      activeChannels = selectedContact.contact_channels || [];
      contactLabel = formatContactDisplayName(selectedContact);
    }

    const emailChannel = activeChannels.find(
      (ch: ContactChannel) => ch.channel_type === 'email'
    );
    const whatsappChannel = activeChannels.find(
      (ch: ContactChannel) => ch.channel_type === 'whatsapp'
    );
    const mobileChannel = activeChannels.find(
      (ch: ContactChannel) => ch.channel_type === 'mobile' || ch.channel_type === 'phone'
    );
    const notificationChannel = whatsappChannel || mobileChannel;

    const isPayment = acceptanceMethod === 'payment';

    return (
      <div
        className="rounded-xl border p-4 mb-6"
        style={{
          backgroundColor: `${colors.brand.primary}06`,
          borderColor: `${colors.brand.primary}25`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${colors.brand.primary}15` }}
          >
            <Mail className="w-4 h-4" style={{ color: colors.brand.primary }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
              {isPayment ? 'Payment Notification' : 'Sign-off Notification'}
            </p>

            {/* Email notification line */}
            {emailChannel ? (
              <div className="flex items-center gap-2 mb-1.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.semantic.success }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                  {isPayment
                    ? 'An email for payment will be sent to '
                    : 'Contract view + PDF will be emailed to '}
                  <span
                    className="font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: `${colors.brand.primary}12`,
                      color: colors.brand.primary,
                    }}
                  >
                    {emailChannel.value}
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.semantic.warning }} />
                <span className="text-sm" style={{ color: colors.semantic.warning }}>
                  No email configured for {contactLabel}
                </span>
              </div>
            )}

            {/* WhatsApp / Mobile notification line */}
            {notificationChannel ? (
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#25D366' }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                  {whatsappChannel
                    ? 'WhatsApp notification will be sent to '
                    : 'Notification will be sent to mobile '}
                  <span
                    className="font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: '#25D36612',
                      color: '#25D366',
                    }}
                  >
                    {notificationChannel.channel_type === 'mobile' || notificationChannel.channel_type === 'phone'
                      ? formatPhoneDisplay(notificationChannel)
                      : notificationChannel.value}
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  No WhatsApp or mobile configured for {contactLabel}
                </span>
              </div>
            )}

            {/* Corporate person context */}
            {isCorporate && selectedPerson && !useCompanyContact && (
              <p className="text-xs mt-2 italic" style={{ color: colors.utility.secondaryText }}>
                Notifications will be sent to {selectedPerson.name} (selected contact person)
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-[60vh] p-6"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: colors.utility.primaryText }}
          >
            {multiSelect ? 'Select Vendors for RFQ' : labels.heading}
          </h2>
          <p
            className="text-sm"
            style={{ color: colors.utility.secondaryText }}
          >
            {multiSelect ? 'Choose one or more vendors to send this RFQ to' : labels.subtitle}
          </p>
          {/* Selected count badge for multi-select */}
          {multiSelect && selectedVendorIds.length > 0 && (
            <div
              className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full text-sm font-semibold"
              style={{
                backgroundColor: `${colors.semantic.success}15`,
                color: colors.semantic.success,
              }}
            >
              <Check className="w-4 h-4" />
              {selectedVendorIds.length} vendor{selectedVendorIds.length > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Selected Contact Card (single-select only) */}
        {!multiSelect && selectedContact && renderSelectedContactCard()}

        {/* Notification Note - shows where acceptance notifications will be sent */}
        {!multiSelect && selectedContact && renderNotificationNote()}

        {/* Selected vendors chips (multi-select mode) */}
        {multiSelect && selectedVendorIds.length > 0 && (
          <div
            className="rounded-xl border p-4 mb-6"
            style={{
              backgroundColor: `${colors.semantic.success}05`,
              borderColor: `${colors.semantic.success}30`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4" style={{ color: colors.semantic.success }} />
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: colors.semantic.success }}
              >
                Selected Vendors
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedVendorNames.map((name, idx) => (
                <span
                  key={selectedVendorIds[idx]}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: `${colors.brand.primary}12`,
                    color: colors.utility.primaryText,
                  }}
                >
                  {name}
                  <button
                    onClick={() => {
                      if (onVendorsChange) {
                        const newIds = selectedVendorIds.filter((_, i) => i !== idx);
                        const newNames = selectedVendorNames.filter((_, i) => i !== idx);
                        onVendorsChange(newIds, newNames);
                      }
                    }}
                    className="ml-1 hover:opacity-70 transition-opacity"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Only show search/filters if no contact selected (single-select) or always (multi-select) */}
        {(multiSelect || !selectedContact) && (
          <>
            {/* Search + Add New */}
            <div
              className="rounded-xl border p-4 mb-6"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}10`
              }}
            >
              <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <input
                    type="text"
                    placeholder={`${labels.searchPlaceholder} (min 3 characters)`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-lg border text-sm outline-none transition-all focus:ring-2"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: `${colors.utility.primaryText}20`,
                      color: colors.utility.primaryText
                    }}
                  />
                  {listLoading && debouncedSearch && (
                    <div
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: colors.brand.primary, borderTopColor: 'transparent' }}
                    />
                  )}
                </div>

                {/* Add New Button */}
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: colors.brand.primary }}
                >
                  <Plus className="w-5 h-5" />
                  {labels.addButtonText}
                </button>
              </div>

              {/* Search hint */}
              {searchTerm.length > 0 && searchTerm.length < 3 && (
                <p
                  className="text-xs mt-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Type at least 3 characters to search
                </p>
              )}
            </div>

            {/* Contact Results */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}10`
              }}
            >
              <div
                className="px-4 py-3 border-b"
                style={{ borderColor: `${colors.utility.primaryText}10` }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {listLoading ? 'Loading...' : `${contacts?.length || 0} Contacts`}
                </p>
              </div>

              {/* Loading State */}
              {listLoading && (
                <div className="py-4">
                  <VaNiLoader size="sm" message="LOADING CONTACTS" />
                </div>
              )}

              {/* Empty State */}
              {!listLoading && (!contacts || contacts.length === 0) && (
                <div className="p-8 text-center">
                  <Users
                    className="w-12 h-12 mx-auto mb-3"
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <p
                    className="font-medium mb-1"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {labels.emptyMessage}
                  </p>
                  <p
                    className="text-sm mb-4"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {debouncedSearch
                      ? `No results for "${debouncedSearch}"`
                      : `Start by adding a new ${contractType}`}
                  </p>
                  <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ backgroundColor: colors.brand.primary }}
                  >
                    <Plus className="w-4 h-4" />
                    {labels.addButtonText}
                  </button>
                </div>
              )}

              {/* Contact List */}
              {!listLoading && contacts && contacts.length > 0 && (
                <div className="divide-y" style={{ borderColor: `${colors.utility.primaryText}10` }}>
                  {contacts.map((contact: any) => {
                    const displayName = contact.displayName || contact.name || contact.company_name || 'Unknown';
                    const primaryChannel = getPrimaryChannel(contact);
                    const ChannelIcon = primaryChannel ? CHANNEL_ICONS[primaryChannel.channel_type] || Globe : null;
                    const hasPersons = contact.type === 'corporate' && contact.contact_persons?.length > 0;
                    const isMultiSelected = multiSelect && selectedVendorIds.includes(contact.id);

                    return (
                      <button
                        key={contact.id}
                        onClick={() => multiSelect ? handleToggleVendor(contact) : handleSelectContact(contact)}
                        className="w-full flex items-center gap-4 p-4 text-left transition-all hover:bg-opacity-50"
                        style={{
                          backgroundColor: isMultiSelected
                            ? `${colors.semantic.success}06`
                            : 'transparent',
                        }}
                      >
                        {/* Avatar */}
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{
                            backgroundColor: isMultiSelected
                              ? `${colors.semantic.success}15`
                              : `${colors.brand.primary}15`,
                            color: isMultiSelected
                              ? colors.semantic.success
                              : colors.brand.primary
                          }}
                        >
                          {getAvatarInitials(contact)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p
                              className="font-semibold truncate"
                              style={{ color: colors.utility.primaryText }}
                            >
                              {displayName}
                            </p>
                            {contact.type === 'corporate' ? (
                              <Building2
                                className="w-4 h-4 flex-shrink-0"
                                style={{ color: colors.utility.secondaryText }}
                              />
                            ) : (
                              <User
                                className="w-4 h-4 flex-shrink-0"
                                style={{ color: colors.utility.secondaryText }}
                              />
                            )}
                            {/* Show persons count for corporate */}
                            {hasPersons && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: '#f59e0b20',
                                  color: '#f59e0b'
                                }}
                              >
                                {contact.contact_persons.length} person{contact.contact_persons.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {primaryChannel && ChannelIcon && (
                            <div
                              className="flex items-center gap-2 text-sm"
                              style={{ color: colors.utility.secondaryText }}
                            >
                              <ChannelIcon className="w-4 h-4" />
                              <span className="truncate">
                                {primaryChannel.channel_type === 'mobile' || primaryChannel.channel_type === 'phone'
                                  ? formatPhoneDisplay(primaryChannel)
                                  : primaryChannel.value}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Selection Indicator: checkbox for multi-select, radio for single */}
                        {multiSelect ? (
                          isMultiSelected ? (
                            <CheckSquare
                              className="w-5 h-5 flex-shrink-0"
                              style={{ color: colors.semantic.success }}
                            />
                          ) : (
                            <Square
                              className="w-5 h-5 flex-shrink-0"
                              style={{ color: `${colors.utility.primaryText}30` }}
                            />
                          )
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                            style={{
                              borderColor: `${colors.utility.primaryText}30`,
                              backgroundColor: 'transparent'
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Quick Add Contact Drawer */}
      <QuickAddContactDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={handleQuickAddSuccess}
      />
    </div>
  );
};

export default BuyerSelectionStep;
