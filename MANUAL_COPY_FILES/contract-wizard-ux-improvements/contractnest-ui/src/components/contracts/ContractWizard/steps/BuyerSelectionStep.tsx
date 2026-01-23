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
  Loader2
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
  onSelectBuyer: (
    buyerId: string,
    buyerName: string,
    contactPersonId?: string,
    contactPersonName?: string,
    useCompanyContact?: boolean
  ) => void;
}

const BuyerSelectionStep: React.FC<BuyerSelectionStepProps> = ({
  selectedBuyerId,
  selectedBuyerName,
  selectedContactPersonId,
  selectedContactPersonName,
  useCompanyContact: initialUseCompanyContact,
  onSelectBuyer,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();

  // Local state
  const [selectedClassification, setSelectedClassification] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [showOtherContacts, setShowOtherContacts] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(selectedContactPersonId || null);
  const [useCompanyContact, setUseCompanyContact] = useState(initialUseCompanyContact || false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length === 0 || searchTerm.length >= 3) {
        setDebouncedSearch(searchTerm);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch contacts list
  const { data: contacts, loading: listLoading } = useContactList({
    page: 1,
    limit: 20,
    search: debouncedSearch || undefined,
    classifications: selectedClassification !== 'all' ? [selectedClassification] : undefined,
    status: 'active',
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  // Fetch FULL contact details when a contact is selected (to get contact_persons)
  const {
    data: fullContactData,
    loading: fullContactLoading
  } = useContact(selectedBuyerId || '');

  // Update selected contact when full data is loaded
  useEffect(() => {
    if (fullContactData && selectedBuyerId) {
      setSelectedContact(fullContactData);
    }
  }, [fullContactData, selectedBuyerId]);

  // Handle contact selection from list
  const handleSelectContact = useCallback((contact: any) => {
    const displayName = contact.type === 'corporate'
      ? contact.company_name
      : contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim();

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
            Who is this contract for?
          </h2>
          <p
            className="text-sm"
            style={{ color: colors.utility.secondaryText }}
          >
            Select an existing contact or add a new one
          </p>
        </div>

        {/* Selected Contact Card (if selected) */}
        {selectedContact && renderSelectedContactCard()}

        {/* Only show search/filters if no contact selected */}
        {!selectedContact && (
          <>
            {/* Classification Filter - Radio Style */}
            <div
              className="rounded-xl border p-4 mb-6"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}10`
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-wider mb-3"
                style={{ color: colors.utility.secondaryText }}
              >
                Filter by Type
              </p>
              <div className="flex flex-wrap gap-2">
                {/* All option */}
                <button
                  onClick={() => setSelectedClassification('all')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all"
                  style={{
                    backgroundColor: selectedClassification === 'all'
                      ? `${colors.brand.primary}15`
                      : 'transparent',
                    borderColor: selectedClassification === 'all'
                      ? colors.brand.primary
                      : `${colors.utility.primaryText}20`,
                    color: selectedClassification === 'all'
                      ? colors.brand.primary
                      : colors.utility.primaryText
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: selectedClassification === 'all'
                        ? colors.brand.primary
                        : `${colors.utility.primaryText}40`
                    }}
                  >
                    {selectedClassification === 'all' && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: colors.brand.primary }}
                      />
                    )}
                  </div>
                  All Contacts
                </button>

                {/* Dynamic classifications */}
                {CONTACT_CLASSIFICATION_CONFIG.map((cls) => {
                  const isSelected = selectedClassification === cls.id;
                  const colorSet = getClassificationColors(cls.colorKey, colors, 'selector', isSelected);

                  return (
                    <button
                      key={cls.id}
                      onClick={() => setSelectedClassification(cls.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all"
                      style={{
                        backgroundColor: colorSet.bg,
                        borderColor: colorSet.border,
                        color: colorSet.text
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{
                          borderColor: isSelected ? colorSet.text : `${colors.utility.primaryText}40`
                        }}
                      >
                        {isSelected && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: colorSet.text }}
                          />
                        )}
                      </div>
                      {cls.label}
                    </button>
                  );
                })}
              </div>
            </div>

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
                    placeholder="Search contacts... (min 3 characters)"
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
                  Add New
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
                    No contacts found
                  </p>
                  <p
                    className="text-sm mb-4"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {debouncedSearch
                      ? `No results for "${debouncedSearch}"`
                      : 'Start by adding a new contact'}
                  </p>
                  <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ backgroundColor: colors.brand.primary }}
                  >
                    <Plus className="w-4 h-4" />
                    Add Contact
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

                    return (
                      <button
                        key={contact.id}
                        onClick={() => handleSelectContact(contact)}
                        className="w-full flex items-center gap-4 p-4 text-left transition-all hover:bg-opacity-50"
                        style={{ backgroundColor: 'transparent' }}
                      >
                        {/* Avatar */}
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{
                            backgroundColor: `${colors.brand.primary}15`,
                            color: colors.brand.primary
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

                        {/* Selection Indicator */}
                        <div
                          className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor: `${colors.utility.primaryText}30`,
                            backgroundColor: 'transparent'
                          }}
                        />
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
