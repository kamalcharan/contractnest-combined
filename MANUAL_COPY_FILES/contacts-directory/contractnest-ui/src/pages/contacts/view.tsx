// src/pages/contacts/view.tsx - Contact Dashboard
// Redesigned shell (owner-approved playground, 2026-09-16): identity hero +
// summary strip + pill tabs. All existing machinery preserved — cockpit hook,
// tab components, ActionIsland, drawers, status flow, explainer.
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  FileText,
  Building2,
  AlertCircle,
  Archive,
  ChevronDown,
  Check,
  Loader2,
  Wrench,
  Calendar,
  DollarSign,
  HelpCircle,
  UserRound,
  Phone,
  Mail,
  MapPin,
  Plus,
  Pencil,
  ShoppingCart,
  Package,
  Handshake,
  Users,
  Tag,
  LucideIcon,
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
import FinancialsTab from '@/components/contacts/dashboard/FinancialsTab';
import TimelineTab from '@/components/contacts/dashboard/TimelineTab';
import ExplainerDrawer from '@/components/common/ExplainerDrawer';
import ContactProfileTab from '@/components/contacts/view/ContactProfileTab';
import type { ExplainerTab } from '@/utils/explainerRegistry';

// Constants
import {
  USER_STATUS_MESSAGES,
  BUSINESS_RULES,
  formatContactDisplayName,
  CONTACT_CLASSIFICATION_CONFIG,
  getClassificationThemeColor,
} from '@/utils/constants/contacts';

// Lucide icon mapping for classification icons (matches constants)
const CLASSIFICATION_ICON_MAP: Record<string, LucideIcon> = {
  ShoppingCart,
  DollarSign,
  Package,
  Handshake,
  Users,
};

const getClassificationVisual = (classificationId: string) => {
  const config = CONTACT_CLASSIFICATION_CONFIG.find(c => c.id === classificationId);
  const { themeColor } = getClassificationThemeColor(config?.colorKey || 'default');
  const Icon = (config?.lucideIcon && CLASSIFICATION_ICON_MAP[config.lucideIcon]) || Tag;
  return { label: config?.label || classificationId, color: themeColor, Icon };
};

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
type TabKey = 'profile' | 'overview' | 'contracts' | 'assets' | 'financials' | 'timeline';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ElementType;
  insight?: boolean; // analytics tabs — only shown when the contact has activity
}

const TABS: TabConfig[] = [
  { key: 'profile', label: 'Profile', icon: UserRound },
  // Hidden 2026-07-24, flagged for review next session — see CLAUDE.md "Future Review Items".
  // { key: 'overview', label: 'Overview', icon: LayoutDashboard, insight: true },
  { key: 'contracts', label: 'Contracts', icon: FileText, insight: true },
  { key: 'assets', label: 'Assets', icon: Wrench, insight: true },
  { key: 'financials', label: 'Financials', icon: DollarSign, insight: true },
  { key: 'timeline', label: 'Timeline', icon: Calendar, insight: true },
];

const ContactViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { toast } = useToast();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const line = colors.utility.primaryText + '15';
  const infoHue = colors.semantic?.info || '#3573E8';

  // State
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [daysAhead, setDaysAhead] = useState(7);
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);

  // API
  const { data: contact, loading, error, refetch, hardRefresh } = useContact(id || '');
  const updateStatusHook = useUpdateContactStatus();
  const sendInvitationHook = useSendInvitation();
  const { data: cockpitData, isLoading: cockpitLoading } = useContactCockpit(id || '', { daysAhead });

  // Classifications for contract creation
  const classifications = contact?.classifications?.map(c =>
    typeof c === 'string' ? c : c.classification_value
  ) || [];

  // Analytics (Insights) tabs only appear when the contact actually has activity —
  // a bare contact never shows an empty dashboard.
  const hasActivity = !!cockpitData && (
    (cockpitData.contracts?.contracts?.length || 0) > 0 ||
    (cockpitData.invoices?.length || 0) > 0 ||
    (cockpitData.events?.total || 0) > 0 ||
    (cockpitData.ltv || 0) > 0 ||
    (cockpitData.outstanding || 0) > 0
  );
  const visibleTabs = TABS.filter(t => !t.insight || hasActivity);

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
    return formatContactDisplayName(contact);
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
    if (!contact || newStatus === contact.status) return;
    try {
      await updateStatusHook.mutate(contact.id, newStatus);
      toast({ title: 'Status updated', description: `Contact is now ${newStatus}.` });
      // refetch() serves cached data first (useContact's fetchContact skips
      // the network call when a cache entry exists) — that cache still
      // holds the pre-update status, so the header/lock state wouldn't
      // update until something else (e.g. a full page reload) invalidated
      // it. hardRefresh() explicitly invalidates the cache before fetching.
      hardRefresh();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      const description = err?.code === 'DEPENDENCY_EXISTS'
        ? err.message
        : err?.message || 'Failed to update contact status.';
      toast({ variant: 'destructive', title: 'Could not update status', description });
    }
  };

  // "New contract" — same mapping ActionIsland uses; first classification wins
  // here, the island keeps the full per-classification menu.
  const handleNewContract = () => {
    if (!contact) return;
    const type = classifications.includes('vendor') && !classifications.includes('client')
      ? 'vendor'
      : classifications.includes('partner') && classifications.length === 1
        ? 'partner'
        : 'client';
    navigate(`/contracts/create?contactId=${contact.id}&contractType=${type}`);
  };

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
  const primaryPhone = getPrimaryChannel('mobile') || getPrimaryChannel('phone');
  const primaryCity: string | undefined = contact.addresses?.[0]?.city || undefined;

  // Hero visuals from the PRIMARY classification (fixed product colors)
  const heroVisual = getClassificationVisual(classifications[0] || 'default');
  const HeroIcon = classifications[0] ? heroVisual.Icon : (contact.type === 'corporate' ? Building2 : User);
  const memberSince = contact.created_at
    ? new Date(contact.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : null;

  // Summary strip values (cockpit data; strip renders only with activity)
  const activeContracts = cockpitData?.contracts?.by_status?.['active'] ?? 0;
  const totalContracts = cockpitData?.contracts?.total ?? 0;
  const outstanding = cockpitData?.outstanding ?? 0;
  const nextEvent = cockpitData?.upcoming_events?.[0];
  const nextEventDate = nextEvent
    ? new Date(nextEvent.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null;

  const statTile = (label: string, value: React.ReactNode, sub: string, warn = false) => (
    <div
      className="rounded-2xl border px-4 py-3.5"
      style={{
        borderColor: warn ? colors.semantic.warning + '60' : line,
        backgroundColor: warn ? colors.semantic.warning + '10' : colors.utility.secondaryBackground,
      }}
    >
      <p className="text-[10px] font-bold tracking-[0.12em] mb-1.5" style={{ color: colors.utility.secondaryText }}>{label}</p>
      <p
        className="text-lg font-semibold tracking-tight"
        style={{ color: warn ? colors.semantic.warning : colors.utility.primaryText, fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </p>
      <p className="text-[11px] mt-0.5 truncate" style={{ color: colors.utility.secondaryText }} title={sub}>{sub}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: colors.utility.primaryBackground }}>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* IDENTITY HERO — classification-tinted gradient band */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <header
        className="flex-shrink-0 px-4 md:px-6 py-4 border-b"
        style={{
          borderColor: line,
          background: `linear-gradient(120deg, ${heroVisual.color}1E, ${colors.utility.secondaryBackground} 55%, ${infoHue}12)`,
        }}
      >
        <div className="flex items-start gap-3 md:gap-4 flex-wrap">
          <button
            onClick={() => navigate('/contacts')}
            className="p-2 rounded-xl border transition-colors hover:opacity-80 mt-1"
            style={{ backgroundColor: colors.utility.primaryBackground, borderColor: line }}
            aria-label="Back to contacts"
          >
            <ArrowLeft className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
          </button>

          {/* Avatar — primary-classification color + product icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center border flex-shrink-0"
            style={{
              backgroundColor: heroVisual.color + '20',
              color: heroVisual.color,
              borderColor: heroVisual.color + '40',
            }}
          >
            <HeroIcon className="h-6 w-6" />
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight" style={{ color: colors.utility.primaryText }}>
                {getContactDisplayName()}
              </h1>
              {contact.type === 'corporate' ? (
                <Building2 className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
              ) : (
                <User className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
              )}
              {contact.contact_number && (
                <span
                  className="px-2 py-0.5 rounded-md text-xs font-semibold"
                  style={{
                    fontFamily: 'ui-monospace, monospace',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.secondaryText,
                    border: `1px solid ${line}`,
                  }}
                >
                  {contact.contact_number}
                </span>
              )}

              {/* Status pill + menu (unchanged flow) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsStatusMenuOpen(o => !o)}
                  disabled={updateStatusHook.loading}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold uppercase transition-opacity hover:opacity-80 disabled:opacity-60"
                  style={{
                    backgroundColor: contact.status === 'active' ? colors.semantic.success + '20' : contact.status === 'inactive' ? colors.semantic.warning + '20' : colors.semantic.error + '20',
                    color: contact.status === 'active' ? colors.semantic.success : contact.status === 'inactive' ? colors.semantic.warning : colors.semantic.error,
                  }}
                >
                  {updateStatusHook.loading
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'currentColor' }} />}
                  {contact.status}
                  <ChevronDown className="h-3 w-3" />
                </button>

                {isStatusMenuOpen && (
                  <div
                    className="absolute top-full left-0 mt-1 py-1 rounded-lg shadow-xl border min-w-[140px] z-10 normal-case"
                    style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
                  >
                    {(['active', 'inactive', 'archived'] as const).map(statusOption => (
                      <button
                        key={statusOption}
                        type="button"
                        onClick={() => {
                          setIsStatusMenuOpen(false);
                          if (statusOption === contact.status) return;
                          if (statusOption === 'archived') {
                            setShowArchiveDialog(true);
                          } else {
                            handleStatusUpdate(statusOption);
                          }
                        }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-left transition-colors hover:opacity-80"
                        style={{ color: colors.utility.primaryText }}
                      >
                        <span className="capitalize">{statusOption}</span>
                        {statusOption === contact.status && <Check className="h-3 w-3" style={{ color: colors.brand.primary }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Badges: classifications (fixed product colors + icons) · tags · member-since */}
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              {classifications.map(cls => {
                const v = getClassificationVisual(cls);
                const BadgeIcon = v.Icon;
                return (
                  <span
                    key={cls}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border"
                    style={{
                      backgroundColor: v.color + '15',
                      color: v.color,
                      borderColor: v.color + '40',
                    }}
                  >
                    <BadgeIcon className="h-3 w-3" />
                    {v.label}
                  </span>
                );
              })}
              {(Array.isArray(contact.tags) ? contact.tags : []).slice(0, 4).map((tag: any, idx: number) => (
                <span
                  key={tag.tag_value || idx}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border"
                  style={{ borderColor: line, color: colors.utility.secondaryText }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.tag_color || colors.utility.secondaryText }} />
                  {tag.tag_label || tag.tag_value}
                </span>
              ))}
              {memberSince && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold border"
                  style={{ borderColor: line, color: colors.utility.secondaryText }}
                >
                  Since {memberSince}
                </span>
              )}
            </div>

            {/* Reach: icon + value, per the approved directory pattern */}
            <div className="flex items-center gap-4 flex-wrap mt-2 text-[13px]" style={{ color: colors.utility.secondaryText }}>
              {primaryPhone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                  {primaryPhone.value}
                </span>
              )}
              {primaryEmail && (
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate max-w-[240px]" title={primaryEmail.value}>{primaryEmail.value}</span>
                </span>
              )}
              {primaryCity && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  {primaryCity}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsProfileDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-semibold transition-colors hover:opacity-80"
              style={{ borderColor: line, color: colors.utility.primaryText, backgroundColor: colors.utility.primaryBackground }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            {contact.status === 'active' && (
              <button
                onClick={handleNewContract}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-transform hover:scale-105"
                style={{ backgroundColor: colors.brand.primary, color: '#ffffff' }}
              >
                <Plus className="h-4 w-4" />
                New contract
              </button>
            )}
          </div>
        </div>

        {/* Summary strip — the cockpit answer before any tab is opened */}
        {hasActivity && cockpitData && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
            {statTile(
              'ACTIVE CONTRACTS',
              activeContracts,
              totalContracts > activeContracts ? `${totalContracts} total` : (cockpitData.contracts?.contracts?.[0]?.name || 'All agreements')
            )}
            {statTile(
              'OPEN DUES',
              formatCurrency(outstanding),
              outstanding > 0 ? 'Outstanding across invoices' : 'Nothing outstanding',
              outstanding > 0
            )}
            {statTile(
              'NEXT EVENT',
              nextEventDate || '—',
              nextEvent ? `${nextEvent.block_name}${nextEvent.is_today ? ' · today' : ''}` : `Nothing in the next ${daysAhead} days`
            )}
            {statTile(
              'LIFETIME VALUE',
              formatCurrency(cockpitData.ltv || 0),
              `${cockpitData.events?.completed ?? 0} of ${cockpitData.events?.total ?? 0} events completed`
            )}
          </div>
        )}
      </header>

      {/* Status Warnings */}
      {contact.status === 'inactive' && (
        <div className="px-6 py-3 border-b flex-shrink-0" style={{ backgroundColor: colors.semantic.warning + '15', borderColor: colors.semantic.warning + '40' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: colors.semantic.warning }}>
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Contact is Inactive</span>
            <span>• {BUSINESS_RULES.INACTIVE_CONTACT_RESTRICTIONS.join(' • ')}</span>
          </div>
        </div>
      )}

      {contact.status === 'archived' && (
        <div className="px-6 py-3 border-b flex-shrink-0" style={{ backgroundColor: colors.utility.secondaryText + '15', borderColor: colors.utility.secondaryText + '40' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: colors.utility.secondaryText }}>
            <Archive className="h-4 w-4" />
            <span className="font-medium">Contact is Archived</span>
            <span>• {BUSINESS_RULES.ARCHIVED_CONTACT_RESTRICTIONS.join(' • ')}</span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB PILLS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-4 md:px-6 py-3 border-b overflow-x-auto"
        style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '10' }}
      >
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-colors whitespace-nowrap"
              style={{
                backgroundColor: isActive ? colors.brand.primary : colors.utility.primaryBackground,
                borderColor: isActive ? colors.brand.primary : line,
                color: isActive ? '#ffffff' : colors.utility.secondaryText,
              }}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.key === 'contracts' && totalContracts > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 rounded-full"
                  style={{
                    backgroundColor: isActive ? '#ffffff30' : colors.brand.primary + '18',
                    color: isActive ? '#ffffff' : colors.brand.primary,
                  }}
                >
                  {totalContracts}
                </span>
              )}
            </button>
          );
        })}

        {/* Explainer (?) Button — right-aligned, analytics tabs only */}
        <div className="ml-auto flex items-center" style={{ visibility: activeTab === 'profile' ? 'hidden' : 'visible' }}>
          <button
            onClick={() => setIsExplainerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
            style={{
              backgroundColor: colors.brand.primary + '10',
              color: colors.brand.primary,
              border: `1px solid ${colors.brand.primary}20`,
            }}
            title={`Understand ${activeTab} metrics`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Explain
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB CONTENT */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Tab — identity-first, inline section edit (no cockpit needed) */}
        {activeTab === 'profile' && (
          <ContactProfileTab contact={contact as any} colors={colors} onSaved={refetch} readOnly={contact.status === 'archived'} />
        )}

        {/* Cockpit loading skeleton (analytics tabs only) */}
        {activeTab !== 'profile' && cockpitLoading && (
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

        {/* Financials Tab */}
        {activeTab === 'financials' && cockpitData && (
          <FinancialsTab
            invoices={cockpitData.invoices || []}
            paymentPattern={cockpitData.payment_pattern || { total_invoiced: 0, total_paid: 0, invoice_count: 0, paid_on_time: 0, collection_rate: 0, on_time_rate: 0 }}
            ltv={cockpitData.ltv || 0}
            outstanding={cockpitData.outstanding || 0}
            colors={colors}
            formatCurrency={formatCurrency}
          />
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && cockpitData && (
          <TimelineTab
            events={cockpitData.events || { total: 0, completed: 0, overdue: 0, by_status: {}, by_type: {} }}
            overdueEvents={cockpitData.overdue_events || []}
            upcomingEvents={cockpitData.upcoming_events || []}
            colors={colors}
            formatCurrency={formatCurrency}
            daysAhead={daysAhead}
            onDaysAheadChange={setDaysAhead}
          />
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

      {/* Explainer Drawer */}
      <ExplainerDrawer
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
        tab={activeTab as ExplainerTab}
        cockpitData={cockpitData}
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
