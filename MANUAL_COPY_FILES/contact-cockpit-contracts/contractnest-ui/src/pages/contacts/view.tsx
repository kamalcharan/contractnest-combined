// src/pages/contacts/view.tsx - Contact 360° Command Center
// THREE COLUMN LAYOUT: Contracts | Events | Financials
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  User,
  FileText,
  Building2,
  AlertCircle,
  Plus,
  Archive,
  Calendar,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import { analyticsService } from '@/services/analytics.service';

// API Hooks
import { useContact, useUpdateContactStatus, useSendInvitation } from '../../hooks/useContacts';
import { useContactCockpit } from '@/hooks/queries/useContactCockpit';

// Components
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import ContactHeaderCard from '../../components/contacts/view/cards/ContactHeaderCard';
import { ActionIsland, ProfileDrawer } from '@/components/contacts/cockpit';

// Contract Components - REUSABLE from ContractsHub
import PipelineBar from '@/components/contracts/PipelineBar';
import ContractCard from '@/components/contracts/ContractCard';

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

// Contract type from cockpit data
interface CockpitContract {
  id: string;
  contract_number: string;
  name: string;
  status: string;
  grand_total: number;
  currency: string;
  created_at: string;
  duration_value?: number;
  duration_unit?: string;
}

// Event type from cockpit data
interface CockpitEvent {
  id: string;
  contract_id: string;
  contract_number: string;
  contract_name: string;
  event_type: string;
  block_name?: string;
  scheduled_date: string;
  status: string;
  amount?: number;
  currency?: string;
  days_overdue?: number;
  days_until?: number;
  is_today?: boolean;
  sequence_number?: number;
  total_occurrences?: number;
}

const ContactViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { toast } = useToast();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // State
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [daysAhead, setDaysAhead] = useState(7);
  const [contractStatusFilter, setContractStatusFilter] = useState<string | null>(null);

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
      analyticsService.trackPageView('contact-360', `Contact 360: ${id}`);
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

  // Get contracts from cockpit data
  const contracts: CockpitContract[] = cockpitData?.contracts?.contracts || [];
  const contractsByStatus = cockpitData?.contracts?.by_status || {};

  // Filter contracts based on selected status
  const filteredContracts = contractStatusFilter
    ? contracts.filter(c => c.status === contractStatusFilter)
    : contracts;

  // Get events from cockpit data
  const overdueEvents: CockpitEvent[] = cockpitData?.overdue_events || [];
  const upcomingEvents: CockpitEvent[] = cockpitData?.upcoming_events || [];
  const todayEvents = upcomingEvents.filter(e => e.is_today);
  const futureEvents = upcomingEvents.filter(e => !e.is_today);

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
      {/* HERO HEADER */}
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
              <div className="flex items-center gap-3 text-sm" style={{ color: colors.utility.secondaryText }}>
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

          {/* Edit Button */}
          <button
            onClick={() => navigate(`/contacts/${contact.id}/edit`)}
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
      {/* THREE COLUMN LAYOUT */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 grid grid-cols-3 overflow-hidden">

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* COLUMN 1: CONTRACTS - Using Reusable Components */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col border-r overflow-hidden" style={{ borderColor: colors.utility.primaryText + '10' }}>
          {/* Column Header */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b"
            style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '10' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#22c55e20' }}>
                <FileText className="h-4 w-4" style={{ color: '#22c55e' }} />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>
                Contracts
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: colors.utility.primaryBackground, color: colors.utility.secondaryText }}>
                {contracts.length}
              </span>
            </div>
            <button
              onClick={() => navigate(`/contracts/create?contactId=${contact.id}`)}
              className="text-sm font-semibold flex items-center gap-1"
              style={{ color: '#3b82f6' }}
            >
              <Plus className="h-4 w-4" /> New
            </button>
          </div>

          {/* Status Filters - Using PipelineBar Component */}
          <div className="flex-shrink-0 px-4 py-3" style={{ backgroundColor: colors.utility.primaryBackground }}>
            <PipelineBar
              statusCounts={contractsByStatus}
              activeStatus={contractStatusFilter}
              onStatusClick={setContractStatusFilter}
              colors={colors}
              compact={true}
            />
          </div>

          {/* Contract Cards - Using ContractCard Component */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {cockpitLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 rounded-xl animate-pulse" style={{ backgroundColor: colors.utility.secondaryText + '20' }} />
                ))}
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: colors.utility.secondaryText }} />
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  {contractStatusFilter ? `No ${contractStatusFilter} contracts` : 'No contracts found'}
                </p>
                <button
                  onClick={() => navigate(`/contracts/create?contactId=${contact.id}`)}
                  className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
                >
                  Create Contract
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredContracts.map(contract => (
                  <ContractCard
                    key={contract.id}
                    contract={{
                      id: contract.id,
                      name: contract.name,
                      contract_number: contract.contract_number,
                      status: contract.status,
                      grand_total: contract.grand_total,
                      currency: contract.currency,
                      duration_value: contract.duration_value,
                      duration_unit: contract.duration_unit,
                    }}
                    colors={colors}
                    variant="compact"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* COLUMN 2: EVENTS TIMELINE */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col border-r overflow-hidden" style={{ borderColor: colors.utility.primaryText + '10' }}>
          {/* Column Header */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b"
            style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.primaryText + '10' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#3b82f620' }}>
                <Calendar className="h-4 w-4" style={{ color: '#3b82f6' }} />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>
                Events Timeline
              </h2>
            </div>
            {/* Date Range Selector */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: colors.utility.secondaryBackground }}>
              {[7, 14, 30].map(days => (
                <button
                  key={days}
                  onClick={() => setDaysAhead(days)}
                  className="px-3 py-1 rounded-md text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: daysAhead === days ? colors.utility.primaryBackground : 'transparent',
                    color: daysAhead === days ? colors.utility.primaryText : colors.utility.secondaryText
                  }}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>

          {/* Events List */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {cockpitLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: colors.utility.secondaryText + '20' }} />
                ))}
              </div>
            ) : (
              <>
                {/* OVERDUE BUCKET */}
                {overdueEvents.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#ef4444', boxShadow: '0 0 12px #ef4444' }} />
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#ef4444' }}>Overdue</span>
                      <span className="text-xs ml-auto" style={{ color: colors.utility.secondaryText }}>{overdueEvents.length} events</span>
                    </div>
                    <div className="space-y-2">
                      {overdueEvents.map(event => (
                        <div
                          key={event.id}
                          className="p-3 rounded-xl border-l-3 flex items-start gap-3"
                          style={{ backgroundColor: '#ef444415', borderLeftWidth: '3px', borderLeftColor: '#ef4444' }}
                        >
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: event.event_type === 'billing' ? '#3b82f620' : '#a855f720' }}>
                            {event.event_type === 'billing' ? '💳' : '🔧'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>{event.block_name || event.event_type}</div>
                            <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{event.contract_name}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs font-semibold" style={{ color: '#ef4444' }}>{event.days_overdue}d ago</div>
                            {event.amount && <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>{formatCurrency(event.amount)}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TODAY BUCKET */}
                {todayEvents.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }} />
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#f59e0b' }}>Today</span>
                      <span className="text-xs ml-auto" style={{ color: colors.utility.secondaryText }}>{todayEvents.length} events</span>
                    </div>
                    <div className="space-y-2">
                      {todayEvents.map(event => (
                        <div
                          key={event.id}
                          className="p-3 rounded-xl border-l-3 flex items-start gap-3"
                          style={{ backgroundColor: '#f59e0b15', borderLeftWidth: '3px', borderLeftColor: '#f59e0b' }}
                        >
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: event.event_type === 'billing' ? '#3b82f620' : '#a855f720' }}>
                            {event.event_type === 'billing' ? '💳' : '🔧'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>{event.block_name || event.event_type}</div>
                            <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{event.contract_name}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Today</div>
                            {event.amount && <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>{formatCurrency(event.amount)}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* UPCOMING BUCKET */}
                {futureEvents.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#22c55e' }}>Upcoming ({daysAhead} days)</span>
                      <span className="text-xs ml-auto" style={{ color: colors.utility.secondaryText }}>{futureEvents.length} events</span>
                    </div>
                    <div className="space-y-2">
                      {futureEvents.map(event => (
                        <div
                          key={event.id}
                          className="p-3 rounded-xl border flex items-start gap-3"
                          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '10' }}
                        >
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: event.event_type === 'billing' ? '#3b82f620' : '#a855f720' }}>
                            {event.event_type === 'billing' ? '💳' : '🔧'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>{event.block_name || event.event_type}</div>
                            <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{event.contract_name}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                              {new Date(event.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                            {event.amount && <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>{formatCurrency(event.amount)}</div>}
                            {event.sequence_number && (
                              <div className="text-xs" style={{ color: colors.utility.secondaryText }}>
                                {event.sequence_number}/{event.total_occurrences}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {overdueEvents.length === 0 && todayEvents.length === 0 && futureEvents.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: colors.utility.secondaryText }} />
                    <p className="text-sm" style={{ color: colors.utility.secondaryText }}>No events in the next {daysAhead} days</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* COLUMN 3: FINANCIALS */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col overflow-hidden">
          {/* Column Header */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b"
            style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '10' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#06b6d420' }}>
                <DollarSign className="h-4 w-4" style={{ color: '#06b6d4' }} />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>
                Financials
              </h2>
            </div>
            <button className="text-sm font-semibold" style={{ color: '#3b82f6' }}>
              Export ↓
            </button>
          </div>

          {/* Financials Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {/* Summary Card */}
            <div className="p-5 rounded-2xl border mb-5" style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '10' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded text-xs font-bold uppercase" style={{ backgroundColor: '#22c55e20', color: '#22c55e' }}>
                  Accounts Receivable
                </span>
                <button className="text-xs font-semibold" style={{ color: '#3b82f6' }}>Record Payment</button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#22c55e15' }}>
                  <div className="text-xl font-bold" style={{ color: '#22c55e' }}>
                    {formatCurrency((cockpitData?.ltv || 0) - (cockpitData?.outstanding || 0))}
                  </div>
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Collected</div>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#f59e0b15' }}>
                  <div className="text-xl font-bold" style={{ color: '#f59e0b' }}>
                    {formatCurrency(cockpitData?.outstanding || 0)}
                  </div>
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Outstanding</div>
                </div>
              </div>

              {/* Collection Progress */}
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span style={{ color: colors.utility.secondaryText }}>Collection Rate</span>
                  <span className="font-bold" style={{ color: '#22c55e' }}>
                    {cockpitData?.ltv ? Math.round(((cockpitData.ltv - (cockpitData.outstanding || 0)) / cockpitData.ltv) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.utility.primaryText + '15' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${cockpitData?.ltv ? Math.round(((cockpitData.ltv - (cockpitData.outstanding || 0)) / cockpitData.ltv) * 100) : 0}%`,
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Recent Activity Placeholder */}
            <div className="text-xs font-bold uppercase tracking-wide mb-3 px-1" style={{ color: colors.utility.secondaryText }}>
              Recent Invoices
            </div>

            <div className="text-center py-8 rounded-xl border" style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '10' }}>
              <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" style={{ color: colors.utility.secondaryText }} />
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>Invoice list coming soon</p>
              <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>Billing module integration pending</p>
            </div>
          </div>
        </div>
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
