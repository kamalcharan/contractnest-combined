// src/pages/contacts/view.tsx - Theme Integrated Version with Contact Cockpit
// Cycle 1: Added ProfileDrawer integration
// Cycle 2: Enhanced ContactHeaderCard with cockpit metrics (LTV, Outstanding, Health)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  MoreHorizontal,
  User,
  FileText,
  DollarSign,
  Settings,
  Building2,
  Loader2,
  AlertCircle,
  Plus,
  Mail,
  Phone,
  MapPin,
  Star,
  CheckCircle,
  Archive,
  Trash2,
  ExternalLink,
  Copy,
  Send,
  UserPlus,
  Activity,
  Clock,
  Shield,
  Globe,
  MessageSquare
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import { captureException } from '@/utils/sentry';
import { analyticsService } from '@/services/analytics.service';

// Import API Hooks
import { useContact, useUpdateContactStatus, useSendInvitation } from '../../hooks/useContacts';
import { useContactCockpit } from '@/hooks/queries/useContactCockpit';

// Import Shared Components
import TabsNavigation from '../../components/shared/TabsNavigation';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

// Import Tab Components
import ContactSummaryTab from '../../components/contacts/view/ContactSummaryTab';
import BillingTab from '../../components/billing/BillingTab';
import ServicesTab from '../../components/services/ServicesTab';
import ContractTab from '../../components/contracts/ContractTab';
import ContactHeaderCard from '../../components/contacts/view/cards/ContactHeaderCard';

// Import Cockpit Components
import {
  ContactCockpitPanel,
  ActionIsland,
  ProfileDrawer,
} from '@/components/contacts/cockpit';

// Import Constants
import {
  CONTACT_STATUS,
  CONTACT_STATUS_LABELS,
  getStatusColor,
  USER_STATUS_MESSAGES,
  BUSINESS_RULES
} from '@/utils/constants/contacts';

// Complete Type Definitions
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
  address_type: 'billing' | 'shipping' | 'office' | 'home' | 'factory' | 'warehouse' | 'other';
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
}

interface ComplianceNumber {
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
}

interface ContactPerson {
  id: string;
  name: string;
  salutation?: 'mr' | 'ms' | 'mrs' | 'dr' | 'prof';
  designation?: string;
  department?: string;
  is_primary: boolean;
  contact_channels: ContactChannel[];
  notes?: string;
}

interface Tag {
  id: string;
  tag_value: string;
  tag_label: string;
  tag_color?: string;
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

  // Individual fields
  name?: string;
  salutation?: 'mr' | 'ms' | 'mrs' | 'dr' | 'prof';

  // Corporate fields
  company_name?: string;
  registration_number?: string;
  website?: string;
  industry?: string;

  // Arrays
  classifications: Classification[];
  tags: Tag[];
  compliance_numbers: ComplianceNumber[];
  contact_channels: ContactChannel[];
  addresses: ContactAddress[];
  contact_persons: ContactPerson[];

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
}

// Temporary placeholder for tabs not yet implemented
const PlaceholderTab: React.FC<{
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  contactId: string;
  phase: string;
}> = ({ icon: Icon, title, description, contactId, phase }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div
      className="rounded-lg border p-12 text-center transition-colors"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.utility.primaryText + '20'
      }}
    >
      <Icon
        className="h-16 w-16 mx-auto mb-4"
        style={{ color: colors.utility.secondaryText }}
      />
      <h3
        className="text-xl font-medium mb-3 transition-colors"
        style={{ color: colors.utility.primaryText }}
      >
        {title}
      </h3>
      <p
        className="mb-2 transition-colors"
        style={{ color: colors.utility.secondaryText }}
      >
        {description}
      </p>
      <p
        className="text-sm transition-colors"
        style={{ color: colors.utility.secondaryText }}
      >
        Contact ID: {contactId}
      </p>
      <div
        className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs transition-colors"
        style={{
          backgroundColor: colors.brand.primary + '20',
          color: colors.brand.primary
        }}
      >
        Coming in {phase}
      </div>
    </div>
  );
};

type ActiveTab = 'summary' | 'contracts' | 'billing' | 'services';

const ContactViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { toast } = useToast();

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // State
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [showMoreActions, setShowMoreActions] = useState<boolean>(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [cockpitDaysAhead, setCockpitDaysAhead] = useState<number>(7);

  // Profile Drawer State - Cycle 1
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState<boolean>(false);

  // API Integration
  const { data: contact, loading, error, refetch } = useContact(id || '');
  const updateStatusHook = useUpdateContactStatus();
  const sendInvitationHook = useSendInvitation();

  // Cockpit Data - Fetch dashboard summary
  const {
    data: cockpitData,
    isLoading: cockpitLoading
  } = useContactCockpit(id || '', { daysAhead: cockpitDaysAhead });

  // Get classifications for contract creation options
  const classifications = contact?.classifications?.map(c =>
    typeof c === 'string' ? c : c.classification_value
  ) || [];

  // Track page view
  useEffect(() => {
    if (id) {
      analyticsService.trackPageView('contact-view', `Contact View: ${id}`);
    }
  }, [id]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading contact",
        description: error,
        duration: 5000
      });
    }
  }, [error, toast]);

  // Get contact display name
  const getContactDisplayName = (): string => {
    if (!contact) return '';

    if (contact.type === 'corporate') {
      return contact.company_name || 'Unnamed Company';
    } else {
      const salutation = contact.salutation ? `${contact.salutation}. ` : '';
      return `${salutation}${contact.name || ''}`.trim() || 'Unnamed Contact';
    }
  };

  // Get primary contact channel
  const getPrimaryChannel = (channels: ContactChannel[], type: string): ContactChannel | null => {
    if (!channels || channels.length === 0) return null;
    return channels.find(ch => ch.channel_type === type && ch.is_primary) ||
           channels.find(ch => ch.channel_type === type) ||
           null;
  };

  // Get primary address
  const getPrimaryAddress = (): ContactAddress | null => {
    if (!contact?.addresses || contact.addresses.length === 0) return null;
    return contact.addresses.find(addr => addr.is_primary) || contact.addresses[0] || null;
  };

  // Format phone number with country code
  const formatPhoneNumber = (channel: ContactChannel): string => {
    if (channel.channel_type === 'mobile' && channel.country_code && channel.country_code !== 'IN') {
      return `+${channel.country_code} ${channel.value}`;
    } else if (channel.channel_type === 'mobile' && channel.country_code === 'IN') {
      return `+91 ${channel.value}`;
    }
    return channel.value;
  };

  // Get theme-aware button styles
  const getActionButtonStyle = (type: 'contract' | 'billing' | 'service') => {
    const baseColors = {
      contract: { bg: '#059669', hover: '#047857' }, // green
      billing: { bg: '#2563eb', hover: '#1d4ed8' },   // blue
      service: { bg: '#7c3aed', hover: '#6d28d9' }    // purple
    };

    return {
      backgroundColor: baseColors[type].bg,
      color: '#ffffff',
      border: 'none',
      borderRadius: '6px',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
      ':hover': {
        backgroundColor: baseColors[type].hover,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
        opacity: 0.9
      },
      ':disabled': {
        opacity: 0.5,
        cursor: 'not-allowed'
      }
    };
  };

  // Handle status updates
  const handleStatusUpdate = async (newStatus: 'active' | 'inactive' | 'archived') => {
    if (!contact) return;

    try {
      await updateStatusHook.mutate(contact.id, newStatus);
      setShowMoreActions(false);
      refetch();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // Handle send invitation
  const handleSendInvitation = async () => {
    if (!contact) return;

    try {
      await sendInvitationHook.mutate(contact.id);
      setShowMoreActions(false);
    } catch (error) {
      console.error('Failed to send invitation:', error);
    }
  };

  // Copy contact info to clipboard
  const copyContactInfo = async () => {
    if (!contact) return;

    const primaryEmail = getPrimaryChannel(contact.contact_channels, 'email');
    const primaryPhone = getPrimaryChannel(contact.contact_channels, 'mobile');

    const info = `${getContactDisplayName()}
${primaryEmail ? `Email: ${primaryEmail.value}` : ''}
${primaryPhone ? `Phone: ${formatPhoneNumber(primaryPhone)}` : ''}`;

    try {
      await navigator.clipboard.writeText(info);
      toast({
        title: "Copied",
        description: "Contact information copied to clipboard",
        duration: 3000
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy contact information"
      });
    }
    setShowMoreActions(false);
  };

  // Mock data for quick stats
  const getQuickStats = () => {
    return {
      contracts: 20,
      revenue: 510000,
      services: 8,
      relationshipYears: contact?.created_at ?
        Math.floor((new Date().getTime() - new Date(contact.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365)) : 0
    };
  };

  // Tab configuration with real counts
  const tabs = [
    {
      id: 'summary',
      label: 'Summary',
      icon: User,
      count: undefined
    },
    {
      id: 'contracts',
      label: 'Contracts',
      icon: FileText,
      count: cockpitData?.contracts?.total || 0
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: DollarSign,
      count: 9
    },
    {
      id: 'services',
      label: 'Services',
      icon: Settings,
      count: 8
    }
  ];

  // Render tab content
  const renderTabContent = () => {
    if (!contact) return null;

    switch (activeTab) {
      case 'summary':
        return <ContactSummaryTab contact={contact} onRefresh={refetch} />;
      case 'contracts':
        return (
          <ContractTab
            contactId={contact.id}
            contactStatus={contact.status}
          />
        );
      case 'billing':
        return (
          <BillingTab
            contactId={contact.id}
            contactStatus={contact.status}
          />
        );
      case 'services':
        return (
          <ServicesTab
            contactId={contact.id}
            contactStatus={contact.status}
          />
        );
      default:
        return <ContactSummaryTab contact={contact} />;
    }
  };

  // Prepare cockpit data for header - Cycle 2
  // Note: ltv, outstanding, health_score are at root level of cockpitData
  const headerCockpitData = cockpitData ? {
    ltv: cockpitData.ltv || 0,
    outstanding: cockpitData.outstanding || 0,
    health_score: cockpitData.health_score || 75,
  } : undefined;

  // Loading State
  if (loading) {
    return (
      <div
        className="p-4 md:p-6 min-h-screen transition-colors"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="animate-pulse">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
              <div
                className="h-4 rounded w-48"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
            </div>
            <div className="flex gap-3">
              <div
                className="h-10 rounded w-24"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
              <div
                className="h-10 rounded w-24"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
              <div
                className="h-10 rounded w-24"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
            </div>
          </div>

          {/* Compact Header Card Skeleton - Cycle 2 */}
          <div
            className="h-20 rounded-xl mb-6"
            style={{ backgroundColor: colors.utility.secondaryText + '20' }}
          ></div>

          {/* Tabs Skeleton */}
          <div className="flex gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="h-10 rounded w-24"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <div
                className="h-64 rounded-lg"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
              <div
                className="h-48 rounded-lg"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
            </div>
            <div className="space-y-6">
              <div
                className="h-32 rounded-lg"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
              <div
                className="h-40 rounded-lg"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
              <div
                className="h-24 rounded-lg"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !contact) {
    return (
      <div
        className="p-4 md:p-6 min-h-screen transition-colors"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="text-center py-12">
          <AlertCircle
            className="h-16 w-16 mx-auto mb-4"
            style={{ color: colors.semantic.error }}
          />
          <h3
            className="text-lg font-medium mb-2 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Failed to load contact
          </h3>
          <p
            className="mb-6 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            {error}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={refetch}
              className="px-4 py-2 rounded-md transition-colors"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff'
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/contacts')}
              className="px-4 py-2 border rounded-md hover:opacity-80 transition-colors"
              style={{
                borderColor: colors.utility.primaryText + '40',
                color: colors.utility.primaryText,
                backgroundColor: 'transparent'
              }}
            >
              Back to Contacts
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!loading && !contact) {
    return (
      <div
        className="p-4 md:p-6 min-h-screen transition-colors"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="text-center py-12">
          <User
            className="h-16 w-16 mx-auto mb-4"
            style={{ color: colors.utility.secondaryText }}
          />
          <h3
            className="text-lg font-medium mb-2 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Contact not found
          </h3>
          <p
            className="mb-6 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            The contact you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/contacts')}
            className="px-4 py-2 rounded-md transition-colors"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#ffffff'
            }}
          >
            Back to Contacts
          </button>
        </div>
      </div>
    );
  }

  if (!contact) return null;

  // Get user status info
  const userStatusInfo = contact.user_account_status ?
    USER_STATUS_MESSAGES[contact.user_account_status as keyof typeof USER_STATUS_MESSAGES] : null;

  const primaryEmail = getPrimaryChannel(contact.contact_channels, 'email');
  const primaryPhone = getPrimaryChannel(contact.contact_channels, 'mobile');
  const primaryAddress = getPrimaryAddress();
  const quickStats = getQuickStats();

  return (
    <div
      className="p-4 md:p-6 min-h-screen pb-24 transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        {/* Left Side - Breadcrumb Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/contacts')}
            className="p-2 rounded-full hover:opacity-80 transition-colors"
            style={{ backgroundColor: colors.utility.secondaryBackground }}
          >
            <ArrowLeft
              className="h-5 w-5"
              style={{ color: colors.utility.primaryText }}
            />
          </button>
          <div
            className="text-sm"
            style={{ color: colors.utility.secondaryText }}
          >
            <button
              onClick={() => navigate('/contacts')}
              className="hover:opacity-80 cursor-pointer transition-colors"
              style={{ color: colors.brand.primary }}
            >
              Contacts
            </button>
            <span className="mx-2">/</span>
            <span
              className="font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              {getContactDisplayName()}
            </span>
          </div>
        </div>

        {/* Right Side - Edit Button Only (Actions moved to Island) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/contacts/${contact.id}/edit`)}
            className="px-4 py-2 rounded-md transition-colors hover:opacity-80 flex items-center gap-2"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              border: `1px solid ${colors.utility.primaryText}20`
            }}
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Status Warnings */}
      {contact.status === 'inactive' && (
        <div
          className="mb-6 p-4 rounded-lg border transition-colors"
          style={{
            backgroundColor: colors.semantic.warning + '10',
            borderColor: colors.semantic.warning + '40'
          }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle
              className="h-5 w-5"
              style={{ color: colors.semantic.warning }}
            />
            <div>
              <p
                className="text-sm font-medium"
                style={{ color: colors.semantic.warning }}
              >
                Contact is Inactive
              </p>
              <p
                className="text-sm"
                style={{ color: colors.semantic.warning }}
              >
                {BUSINESS_RULES.INACTIVE_CONTACT_RESTRICTIONS.join(' • ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {contact.status === 'archived' && (
        <div
          className="mb-6 p-4 rounded-lg border transition-colors"
          style={{
            backgroundColor: colors.utility.secondaryText + '10',
            borderColor: colors.utility.secondaryText + '40'
          }}
        >
          <div className="flex items-center gap-3">
            <Archive
              className="h-5 w-5"
              style={{ color: colors.utility.secondaryText }}
            />
            <div>
              <p
                className="text-sm font-medium"
                style={{ color: colors.utility.secondaryText }}
              >
                Contact is Archived
              </p>
              <p
                className="text-sm"
                style={{ color: colors.utility.secondaryText }}
              >
                {BUSINESS_RULES.ARCHIVED_CONTACT_RESTRICTIONS.join(' • ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User Account Status */}
      {userStatusInfo && (
        <div
          className="mb-6 p-4 rounded-lg border transition-colors"
          style={{
            backgroundColor: colors.brand.primary + '10',
            borderColor: colors.brand.primary + '40'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{userStatusInfo.icon}</span>
              <span
                className="text-sm"
                style={{ color: colors.brand.primary }}
              >
                {userStatusInfo.text}
              </span>
            </div>
            <button
              onClick={handleSendInvitation}
              disabled={sendInvitationHook.loading}
              className="px-3 py-1 text-sm rounded-md transition-colors disabled:opacity-50"
              style={{
                backgroundColor: userStatusInfo.actionType === 'primary'
                  ? colors.brand.primary
                  : 'transparent',
                color: userStatusInfo.actionType === 'primary'
                  ? '#ffffff'
                  : colors.brand.primary,
                border: userStatusInfo.actionType === 'primary'
                  ? 'none'
                  : `1px solid ${colors.brand.primary}`
              }}
            >
              {sendInvitationHook.loading ? 'Sending...' : userStatusInfo.action}
            </button>
          </div>
        </div>
      )}

      {/* === COMPACT HEADER CARD with COCKPIT METRICS - Cycle 2 === */}
      <ContactHeaderCard
        contact={contact}
        variant="compact"
        cockpitData={headerCockpitData}
        isLoading={cockpitLoading}
        className="mb-6"
      />

      {/* === COCKPIT PANEL (Contracts Pulse + Events Radar) === */}
      <ContactCockpitPanel
        data={cockpitData}
        isLoading={cockpitLoading}
        contactId={id || ''}
        classifications={classifications}
        onDateRangeChange={setCockpitDaysAhead}
        className="mb-6"
      />

      {/* Tabs Navigation */}
      <TabsNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as ActiveTab)}
        variant="underline"
        size="md"
        className="mb-6"
      />

      {/* Tab Content */}
      <div className="tab-content">
        {renderTabContent()}
      </div>

      {/* === ACTION ISLAND (Floating Bottom Bar) - Updated Cycle 1 === */}
      <ActionIsland
        contactId={contact.id}
        contactName={getContactDisplayName()}
        classifications={classifications}
        contactStatus={contact.status}
        primaryEmail={primaryEmail?.value}
        primaryPhone={primaryPhone?.value}
        onProfileClick={() => setIsProfileDrawerOpen(true)}
      />

      {/* === PROFILE DRAWER - Cycle 1 === */}
      <ProfileDrawer
        isOpen={isProfileDrawerOpen}
        onClose={() => setIsProfileDrawerOpen(false)}
        contact={contact}
        onRefresh={refetch}
      />

      {/* Click outside handler for dropdowns */}
      {showMoreActions && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowMoreActions(false)}
        />
      )}

      {/* Archive Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        onConfirm={() => {
          handleStatusUpdate('archived');
          setShowArchiveDialog(false);
        }}
        title="Archive Contact"
        description="Are you sure you want to archive this contact? This action cannot be undone."
        confirmText="Archive"
        type="danger"
        icon={<Archive className="h-6 w-6" />}
      />
    </div>
  );
};

export default ContactViewPage;
