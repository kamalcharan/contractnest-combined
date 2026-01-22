// src/components/contracts/ContractWizard/steps/BuyerSelectionStep.tsx
// Step 1: Select buyer (contact) for the contract
import React, { useState, useEffect, useCallback } from 'react';
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
  LucideIcon
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useContactList } from '@/hooks/useContacts';
import QuickAddContactDrawer from '@/components/contacts/QuickAddContactDrawer';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { VaNiLoader, ContentSkeleton } from '@/components/common/loaders/UnifiedLoader';
import {
  CONTACT_CLASSIFICATION_CONFIG,
  getClassificationColors
} from '@/utils/constants/contacts';

// Icon mapping for classifications
const CLASSIFICATION_ICON_MAP: Record<string, LucideIcon> = {
  ShoppingCart: Users,
  DollarSign: Users,
  Package: Users,
  Handshake: Users,
  Users: Users
};

interface BuyerSelectionStepProps {
  selectedBuyerId: string | null;
  selectedBuyerName: string;
  onSelectBuyer: (buyerId: string, buyerName: string) => void;
}

const BuyerSelectionStep: React.FC<BuyerSelectionStepProps> = ({
  selectedBuyerId,
  selectedBuyerName,
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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length === 0 || searchTerm.length >= 3) {
        setDebouncedSearch(searchTerm);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch contacts
  const { data: contacts, loading } = useContactList({
    page: 1,
    limit: 20,
    search: debouncedSearch || undefined,
    classifications: selectedClassification !== 'all' ? [selectedClassification] : undefined,
    status: 'active',
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  // Handle contact selection
  const handleSelectContact = useCallback((contact: any) => {
    const displayName = contact.type === 'corporate'
      ? contact.company_name
      : contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    onSelectBuyer(contact.id, displayName || 'Unknown');
    addToast({
      type: 'success',
      title: 'Buyer selected',
      message: `${displayName || 'Contact'} selected as buyer`,
    });
  }, [onSelectBuyer, addToast]);

  // Handle quick add success
  const handleQuickAddSuccess = useCallback((contactId: string) => {
    // After creating, we would need to fetch the contact details
    // For now, just close the drawer - user can search for the new contact
    setIsDrawerOpen(false);
    addToast({
      type: 'success',
      title: 'Contact created',
      message: 'New contact added. Search to select them as buyer.',
    });
  }, [addToast]);

  // Get primary contact channel
  const getPrimaryChannel = (contact: any) => {
    const channel = contact.contact_channels?.[0];
    if (!channel) return null;

    const icons: Record<string, LucideIcon> = {
      email: Mail,
      mobile: Phone,
      whatsapp: MessageSquare,
      phone: Phone,
      linkedin: Globe,
      website: Globe
    };

    return {
      icon: icons[channel.channel_type] || Mail,
      value: channel.value,
      type: channel.channel_type
    };
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
              {loading && debouncedSearch && (
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

        {/* Selected Contact Display */}
        {selectedBuyerId && (
          <div
            className="rounded-xl border p-4 mb-6"
            style={{
              backgroundColor: `${colors.semantic.success}10`,
              borderColor: colors.semantic.success
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: colors.semantic.success }}
                >
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: colors.semantic.success }}
                  >
                    Selected Buyer
                  </p>
                  <p
                    className="font-semibold"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {selectedBuyerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectBuyer('', '')}
                className="text-sm font-medium hover:opacity-80"
                style={{ color: colors.semantic.error }}
              >
                Change
              </button>
            </div>
          </div>
        )}

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
              {loading ? 'Loading...' : `${contacts?.length || 0} Contacts`}
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-4">
              <VaNiLoader size="sm" message="LOADING CONTACTS" />
            </div>
          )}

          {/* Empty State */}
          {!loading && (!contacts || contacts.length === 0) && (
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
          {!loading && contacts && contacts.length > 0 && (
            <div className="divide-y" style={{ borderColor: `${colors.utility.primaryText}10` }}>
              {contacts.map((contact) => {
                const isSelected = selectedBuyerId === contact.id;
                const displayName = contact.displayName || contact.name || contact.company_name || 'Unknown';
                const primaryChannel = getPrimaryChannel(contact);
                const ChannelIcon = primaryChannel?.icon;

                return (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className="w-full flex items-center gap-4 p-4 text-left transition-all hover:bg-opacity-50"
                    style={{
                      backgroundColor: isSelected
                        ? `${colors.brand.primary}10`
                        : 'transparent'
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{
                        backgroundColor: isSelected
                          ? colors.brand.primary
                          : `${colors.brand.primary}15`,
                        color: isSelected ? 'white' : colors.brand.primary
                      }}
                    >
                      {displayName.charAt(0).toUpperCase()}
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
                      </div>
                      {primaryChannel && ChannelIcon && (
                        <div
                          className="flex items-center gap-2 text-sm"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          <ChannelIcon className="w-4 h-4" />
                          <span className="truncate">{primaryChannel.value}</span>
                        </div>
                      )}
                    </div>

                    {/* Selection Indicator */}
                    <div
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{
                        borderColor: isSelected
                          ? colors.brand.primary
                          : `${colors.utility.primaryText}30`,
                        backgroundColor: isSelected
                          ? colors.brand.primary
                          : 'transparent'
                      }}
                    >
                      {isSelected && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
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
