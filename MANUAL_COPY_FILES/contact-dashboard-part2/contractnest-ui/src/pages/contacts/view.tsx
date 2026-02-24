// src/pages/contacts/view.tsx - Contact Dashboard
// Tabbed layout: Overview | Contracts | Assets | Financials | Timeline
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  User,
  FileText,
  Building2,
  AlertCircle,
  Archive,
  Loader2,
  Zap,
  LayoutDashboard,
  Wrench,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import { analyticsService } from '@/services/analytics.service';

// API Hooks
import { useContact, useUpdateContactStatus, useSendInvitation } from '../../hooks/useContacts';
import { useContactCockpit } from '@/hooks/queries/useContactCockpit';

// Components
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { ActionIsland, ProfileDrawer } from '@/components/contacts/cockpit';

// Dashboard Tab Components
import OverviewTab from '@/components/contacts/dashboard/OverviewTab';
import ContractsTab from '@/components/contacts/dashboard/ContractsTab';
import AssetsTab from '@/components/contacts/dashboard/AssetsTab';

// Constants
import { USER_STATUS_MESSAGES, BUSINESS_RULES } from '@/utils/constants/contacts';

// Types
interface ContactChannel {
  id: string;
  channel_type: string;
  value: string;
  country_code?: string;
  is_primary: boolean;
  is_verified: boolean;
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
  tags: any[];
  compliance_numbers: any[];
  contact_channels: ContactChannel[];
  addresses: any[];
  contact_persons: any[];
  notes?: string;
  user_account_status?: string;
  created_at: string;
  updated_at: string;
}

// Tab configuration
type TabKey = 'overview' | 'contracts' | 'assets' | 'financials' | 'timeline';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'contracts', label: 'Contracts', icon: FileText },
  { key: 'assets', label: 'Assets', icon: Wrench },
  { key: 'financials', label: 'Financials', icon: DollarSign },
  { key: 'timeline', label: 'Timeline', icon: Calendar },
];

const ContactViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { toast } = useToast();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // State
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [daysAhead, setDaysAhead] = useState(7);

  // API
  const { data: contact, loading, error, refetch } = useContact(id || '');
  const updateStatusHook = useUpdateContactStatus();
  const sendInvitationHook = useSendInvitation();
  const { data: cockpitData, isLoading: cockpitLoading } = useContactCockpit(id || '', { daysAhead });

  // Classifications for contract creation
  const classifications = contact?.classifications?.map(c =>
    typeof c === 'string' ? c : c.classification_value
  ) || [];

  // Track page view
  useEffect(() => {
    if (id) {
      analyticsService.trackPageView('contact-dashboard', `Contact Dashboard: ${id}`);
    }
  }, [id]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({ variant: "destructive", title: "Error loading contact", description: error });
    }
  }, [error, toast]);

  // Get display name
  const getContactDisplayName = (): string => {
    if (!contact) return '';
    if (contact.type === 'corporate') return contact.company_name || 'Unnamed Company';
    const salutation = contact.salutation ? `${contact.salutation}. ` : '';
    return `${salutation}${contact.name || ''}`.trim() || 'Unnamed Contact';
  };

  // Get primary channel
  const getPrimaryChannel = (type: string): ContactChannel | null => {
    if (!contact?.contact_channels) return null;
    return contact.contact_channels.find(ch => ch.channel_type === type && ch.is_primary) ||
           contact.contact_channels.find(ch => ch.channel_type === type) || null;
  };

  // Format currency
  const formatCurrency = (value: number, currency = 'INR'): string => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString()}`;
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus: 'active' | 'inactive' | 'archived') => {
    if (!contact) return;
    try {
      await updateStatusHook.mutate(contact.id, newStatus);
      refetch();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Urgency config
  const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
    critical: { label: 'Critical', color: '#ef4444' },
    high: { label: 'High', color: '#f59e0b' },
    medium: { label: 'Medium', color: '#3b82f6' },
    low: { label: 'Low', color: '#22c55e' },
  };
  const urgencyLevel = cockpitData?.urgency_level || 'low';
  const urgencyConfig = URGENCY_CONFIG[urgencyLevel];

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.utility.primaryBackground }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.brand.primary }} />
      </div>
    );
  }

  // Error State
  if (error && !contact) {
    return (
      <div className="p-6 min-h-screen" style={{ backgroundColor: colors.utility.primaryBackground }}>
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 mx-auto mb-4" style={{ color: colors.semantic.error }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: colors.utility.primaryText }}>Failed to load contact</h3>
          <p className="mb-6" style={{ color: colors.utility.secondaryText }}>{error}</p>
          <button onClick={refetch} className="px-4 py-2 rounded-md mr-3" style={{ backgroundColor: colors.brand.primary, color: '#fff' }}>
            Try Again
          </button>
          <button onClick={() => navigate('/contacts')} className="px-4 py-2 rounded-md border" style={{ borderColor: colors.utility.primaryText + '40', color: colors.utility.primaryText }}>
            Back to Contacts
          </button>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!loading && !contact) {
    return (
      <div className="p-6 min-h-screen" style={{ backgroundColor: colors.utility.primaryBackground }}>
        <div className="text-center py-12">
          <User className="h-16 w-16 mx-auto mb-4" style={{ color: colors.utility.secondaryText }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: colors.utility.primaryText }}>Contact not found</h3>
          <button onClick={() => navigate('/contacts')} className="px-4 py-2 rounded-md" style={{ backgroundColor: colors.brand.primary, color: '#fff' }}>
            Back to Contacts
          </button>
        </div>
      </div>
    );
  }

  if (!contact) return null;

  const userStatusInfo = contact.user_account_status ?
    USER_STATUS_MESSAGES[contact.user_account_status as keyof typeof USER_STATUS_MESSAGES] : null;
  const primaryEmail = getPrimaryChannel('email');
  const primaryPhone = getPrimaryChannel('mobile');

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: colors.utility.primaryBackground }}>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STICKY HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b"
        style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '15' }}
      >
        {/* Left: Back + Contact Info */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/contacts')}
            className="p-2 rounded-xl border transition-colors hover:opacity-80"
            style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.primaryText + '15' }}
          >
            <ArrowLeft className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg"
              style={{ background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.secondary} 100%)`, color: '#fff' }}
            >
              {contact.type === 'corporate'
                ? (contact.company_name?.substring(0, 2).toUpperCase() || 'CO')
                : (contact.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'UN')}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>{getContactDisplayName()}</h1>
                {contact.type === 'corporate' ? (
                  <Building2 className="h-4 w-4" style={{ color: colors.brand.primary }} />
                ) : (
                  <User className="h-4 w-4" style={{ color: colors.brand.primary }} />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: colors.utility.secondaryText }}>
                {primaryEmail && <span>{primaryEmail.value}</span>}
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                  style={{
                    backgroundColor: contact.status === 'active' ? '#22c55e20' : contact.status === 'inactive' ? '#f59e0b20' : '#ef444420',
                    color: contact.status === 'active' ? '#22c55e' : contact.status === 'inactive' ? '#f59e0b' : '#ef4444'
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'currentColor' }} />
                  {contact.status}
                </span>
                {/* Classification Badges */}
                {classifications.map(cls => {
                  const clsConfig: Record<string, { label: string; color: string }> = {
                    client: { label: 'Client', color: '#10B981' },
                    vendor: { label: 'Vendor', color: '#3B82F6' },
                    partner: { label: 'Partner', color: '#8B5CF6' },
                  };
                  const cfg = clsConfig[cls];
                  if (!cfg) return null;
                  return (
                    <span
                      key={cls}
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: cfg.color + '15', color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Stats + Edit */}
        <div className="flex items-center gap-8">
          {/* LTV */}
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>
              {cockpitLoading ? '...' : formatCurrency(cockpitData?.ltv || 0)}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
              Lifetime Value
            </div>
          </div>

          {/* Outstanding */}
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>
              {cockpitLoading ? '...' : formatCurrency(cockpitData?.outstanding || 0)}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
              Outstanding
            </div>
          </div>

          {/* Health Score */}
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: '#3b82f6' }}>
              {cockpitLoading ? '...' : `${cockpitData?.health_score || 0}%`}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
              Health Score
            </div>
          </div>

          {/* Urgency Indicator */}
          {!cockpitLoading && cockpitData?.urgency_score !== undefined && cockpitData.urgency_score > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <Zap className="h-5 w-5" style={{ color: urgencyConfig.color }} />
                <span className="text-2xl font-bold" style={{ color: urgencyConfig.color }}>
                  {cockpitData.urgency_score}
                </span>
              </div>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: urgencyConfig.color }}>
                {urgencyConfig.label}
              </div>
            </div>
          )}

          {/* Collection Rate */}
          {!cockpitLoading && cockpitData?.payment_pattern?.collection_rate > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: '#06b6d4' }}>
                {cockpitData.payment_pattern.collection_rate}%
              </div>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
                Collection
              </div>
            </div>
          )}

          {/* On-time Rate */}
          {!cockpitLoading && cockpitData?.payment_pattern?.on_time_rate > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: '#8b5cf6' }}>
                {cockpitData.payment_pattern.on_time_rate}%
              </div>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
                On-time
              </div>
            </div>
          )}

          {/* Contracts Count */}
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: colors.brand.primary }}>
              {cockpitLoading ? '...' : (cockpitData?.contracts?.total || 0)}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
              Contracts
            </div>
          </div>

          {/* Edit Button - Opens ProfileDrawer instead of navigating */}
          <button
            onClick={() => setIsProfileDrawerOpen(true)}
            className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors hover:opacity-80"
            style={{ backgroundColor: colors.utility.primaryBackground, border: `1px solid ${colors.utility.primaryText}20`, color: colors.utility.primaryText }}
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
        </div>
      </header>

      {/* Status Warnings */}
      {contact.status === 'inactive' && (
        <div className="px-6 py-3 border-b" style={{ backgroundColor: '#f59e0b15', borderColor: '#f59e0b40' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: '#f59e0b' }}>
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Contact is Inactive</span>
            <span>• {BUSINESS_RULES.INACTIVE_CONTACT_RESTRICTIONS.join(' • ')}</span>
          </div>
        </div>
      )}

      {contact.status === 'archived' && (
        <div className="px-6 py-3 border-b" style={{ backgroundColor: colors.utility.secondaryText + '15', borderColor: colors.utility.secondaryText + '40' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: colors.utility.secondaryText }}>
            <Archive className="h-4 w-4" />
            <span className="font-medium">Contact is Archived</span>
            <span>• {BUSINESS_RULES.ARCHIVED_CONTACT_RESTRICTIONS.join(' • ')}</span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB BAR */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="flex-shrink-0 flex items-center gap-1 px-6 border-b"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '10',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors relative"
              style={{
                color: isActive ? colors.brand.primary : colors.utility.secondaryText,
              }}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                  style={{ backgroundColor: colors.brand.primary }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB CONTENT */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto">
        {/* Cockpit loading skeleton */}
        {cockpitLoading && (
          <div className="p-6 space-y-4 max-w-6xl mx-auto">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-32 rounded-2xl animate-pulse"
                style={{ backgroundColor: colors.utility.secondaryText + '15' }}
              />
            ))}
          </div>
        )}

        {/* Overview Tab */}
        {!cockpitLoading && cockpitData && activeTab === 'overview' && (
          <OverviewTab
            cockpitData={cockpitData}
            colors={colors}
            formatCurrency={formatCurrency}
            onTabChange={(tab) => setActiveTab(tab as TabKey)}
          />
        )}

        {/* Contracts Tab */}
        {activeTab === 'contracts' && (
          <ContractsTab
            contactId={contact.id}
            contracts={cockpitData?.contracts?.contracts || []}
            contractsByStatus={cockpitData?.contracts?.by_status || {}}
            contractsByRole={cockpitData?.contracts?.by_role || {}}
            colors={colors}
            isLoading={cockpitLoading}
          />
        )}

        {/* Assets Tab */}
        {activeTab === 'assets' && (
          <AssetsTab
            contactId={contact.id}
            colors={colors}
          />
        )}

        {/* Financials Tab - Placeholder for Part 3 */}
        {activeTab === 'financials' && (
          <div className="p-6 text-center py-20">
            <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-30" style={{ color: colors.utility.secondaryText }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
              Financials
            </h3>
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              {cockpitData?.invoices?.length || 0} invoices
            </p>
            <p className="text-xs mt-2" style={{ color: colors.utility.secondaryText + '80' }}>
              Full financial details coming in Part 3
            </p>
          </div>
        )}

        {/* Timeline Tab - Placeholder for Part 3 */}
        {activeTab === 'timeline' && (
          <div className="p-6 text-center py-20">
            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" style={{ color: colors.utility.secondaryText }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
              Timeline
            </h3>
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              {cockpitData?.events?.total || 0} events tracked
            </p>
            <p className="text-xs mt-2" style={{ color: colors.utility.secondaryText + '80' }}>
              Full event timeline coming in Part 3
            </p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ACTION ISLAND */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <ActionIsland
        contactId={contact.id}
        contactName={getContactDisplayName()}
        classifications={classifications}
        contactStatus={contact.status}
        primaryEmail={primaryEmail?.value}
        primaryPhone={primaryPhone?.value}
        phoneCountryCode={primaryPhone?.country_code}
        onProfileClick={() => setIsProfileDrawerOpen(true)}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PROFILE DRAWER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <ProfileDrawer
        isOpen={isProfileDrawerOpen}
        onClose={() => setIsProfileDrawerOpen(false)}
        contact={contact}
        onRefresh={refetch}
      />

      {/* Archive Dialog */}
      <ConfirmationDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        onConfirm={() => { handleStatusUpdate('archived'); setShowArchiveDialog(false); }}
        title="Archive Contact"
        description="Are you sure you want to archive this contact?"
        confirmText="Archive"
        type="danger"
        icon={<Archive className="h-6 w-6" />}
      />
    </div>
  );
};

export default ContactViewPage;
