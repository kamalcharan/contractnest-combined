// src/components/contracts/EvidenceTab.tsx
// Contract Evidence Tab — shows all service ticket evidence across the contract
// Grouped by ticket, filterable by type, expandable evidence items
// UI-first with mock data — to be wired to real API later

import React, { useState, useMemo } from 'react';
import {
  Camera,
  Shield,
  FileText,
  Image,
  Upload,
  Wrench,
  CheckCircle2,
  ChevronDown,
  Clock,
  Ticket,
  User,
  CalendarDays,
  Eye,
  Filter,
  Loader2,
} from 'lucide-react';
import {
  useContractEventsForContract,
} from '@/hooks/queries/useContractEventQueries';
import type { ContractEvent } from '@/types/contractEvents';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface EvidenceTabProps {
  contractId: string;
  currency: string;
  colors: any;
}

interface MockTicketEvidence {
  ticketNumber: string;
  date: string;
  assignedTo: string;
  status: 'complete' | 'partial' | 'pending';
  events: ContractEvent[];
  evidence: EvidenceItem[];
}

interface EvidenceItem {
  id: string;
  type: 'photo' | 'document' | 'otp' | 'form';
  label: string;
  subtitle: string;
  timestamp: string;
  status: 'verified' | 'uploaded' | 'pending';
}

// ═══════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════

const MOCK_TECHS = ['Rajesh Kumar', 'Amit Shah', 'Priya Patel', 'Sanjay Mehta'];

const EVIDENCE_TEMPLATES: EvidenceItem[][] = [
  [
    { id: 'e1', type: 'photo', label: 'Before Service', subtitle: 'Equipment pre-inspection photo', timestamp: '10:15 AM', status: 'verified' },
    { id: 'e2', type: 'photo', label: 'After Service', subtitle: 'Equipment post-service photo', timestamp: '11:30 AM', status: 'verified' },
    { id: 'e3', type: 'document', label: 'Service Report.pdf', subtitle: '2.4 MB', timestamp: '11:45 AM', status: 'uploaded' },
    { id: 'e4', type: 'otp', label: 'Customer Verification', subtitle: 'OTP verified', timestamp: '11:50 AM', status: 'verified' },
  ],
  [
    { id: 'e5', type: 'photo', label: 'Site Inspection', subtitle: 'Overall site condition', timestamp: '09:30 AM', status: 'verified' },
    { id: 'e6', type: 'form', label: 'Maintenance Checklist', subtitle: '8/8 items checked', timestamp: '10:45 AM', status: 'verified' },
    { id: 'e7', type: 'document', label: 'Completion Certificate.pdf', subtitle: '1.8 MB', timestamp: '11:00 AM', status: 'uploaded' },
  ],
  [
    { id: 'e8', type: 'photo', label: 'Work Area Photo', subtitle: 'Designated work zone', timestamp: '10:00 AM', status: 'verified' },
    { id: 'e9', type: 'photo', label: 'Completed Work', subtitle: 'Final state after service', timestamp: '12:15 PM', status: 'verified' },
    { id: 'e10', type: 'otp', label: 'Customer Sign-off', subtitle: 'OTP verified', timestamp: '12:20 PM', status: 'verified' },
    { id: 'e11', type: 'form', label: 'Quality Inspection Form', subtitle: '15/15 items passed', timestamp: '12:10 PM', status: 'verified' },
    { id: 'e12', type: 'document', label: 'Detailed Service Log.pdf', subtitle: '3.1 MB', timestamp: '12:25 PM', status: 'uploaded' },
  ],
];

const buildMockTickets = (events: ContractEvent[]): MockTicketEvidence[] => {
  const completedByDate: Record<string, ContractEvent[]> = {};
  events.forEach(e => {
    if (e.status === 'completed' && (e.event_type === 'service' || e.event_type === 'spare_part')) {
      const dateKey = e.scheduled_date.split('T')[0];
      if (!completedByDate[dateKey]) completedByDate[dateKey] = [];
      completedByDate[dateKey].push(e);
    }
  });

  const dates = Object.keys(completedByDate).sort();
  return dates.map((date, i) => {
    const hash = date.split('-').reduce((a, b) => a + parseInt(b), 0);
    return {
      ticketNumber: `TKT-2025-${String(10040 + hash).padStart(5, '0')}`,
      date,
      assignedTo: MOCK_TECHS[hash % MOCK_TECHS.length],
      status: 'complete' as const,
      events: completedByDate[date],
      evidence: EVIDENCE_TEMPLATES[i % EVIDENCE_TEMPLATES.length],
    };
  });
};

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const EVIDENCE_ICON_MAP: Record<string, { icon: React.ElementType; color: string }> = {
  photo: { icon: Image, color: '#06B6D4' },
  document: { icon: FileText, color: '#3B82F6' },
  otp: { icon: Shield, color: '#10B981' },
  form: { icon: Wrench, color: '#8B5CF6' },
};

type EvidenceFilter = 'all' | 'photo' | 'document' | 'otp' | 'form';

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

const EvidenceTab: React.FC<EvidenceTabProps> = ({ contractId, currency, colors }) => {
  const [filter, setFilter] = useState<EvidenceFilter>('all');
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());

  const { data: eventsData, isLoading } = useContractEventsForContract(contractId);

  const tickets = useMemo(() => {
    if (!eventsData?.items) return [];
    return buildMockTickets(eventsData.items);
  }, [eventsData]);

  // Summary stats
  const totalEvidence = tickets.reduce((sum, t) => sum + t.evidence.length, 0);
  const verifiedCount = tickets.reduce(
    (sum, t) => sum + t.evidence.filter(e => e.status === 'verified').length, 0
  );
  const photoCount = tickets.reduce(
    (sum, t) => sum + t.evidence.filter(e => e.type === 'photo').length, 0
  );
  const docCount = tickets.reduce(
    (sum, t) => sum + t.evidence.filter(e => e.type === 'document').length, 0
  );
  const otpCount = tickets.reduce(
    (sum, t) => sum + t.evidence.filter(e => e.type === 'otp').length, 0
  );
  const formCount = tickets.reduce(
    (sum, t) => sum + t.evidence.filter(e => e.type === 'form').length, 0
  );

  const toggleTicket = (ticketNumber: string) => {
    setExpandedTickets(prev => {
      const next = new Set(prev);
      if (next.has(ticketNumber)) next.delete(ticketNumber);
      else next.add(ticketNumber);
      return next;
    });
  };

  const filters: { key: EvidenceFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalEvidence },
    { key: 'photo', label: 'Photos', count: photoCount },
    { key: 'document', label: 'Documents', count: docCount },
    { key: 'otp', label: 'Verifications', count: otpCount },
    { key: 'form', label: 'Forms', count: formCount },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.brand.primary }} />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>Loading evidence...</p>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="rounded-xl border p-12 text-center" style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}15` }}>
        <Camera className="h-14 w-14 mx-auto mb-4" style={{ color: `${colors.utility.secondaryText}60` }} />
        <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>No Evidence Yet</h3>
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          Evidence will appear here once service tickets are completed.
          Photos, documents, and verification records will be organized by ticket.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Summary Strip ─── */}
      <div
        className="rounded-xl border px-5 py-4 flex items-center gap-6 flex-wrap"
        style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}10` }}
      >
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4" style={{ color: colors.brand.primary }} />
          <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
            {totalEvidence} Evidence Items
          </span>
        </div>
        <div className="h-4 w-px" style={{ backgroundColor: `${colors.utility.primaryText}12` }} />
        <div className="flex items-center gap-2">
          <Ticket className="w-3.5 h-3.5" style={{ color: colors.semantic?.success || '#10B981' }} />
          <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: colors.semantic?.success || '#10B981' }} />
          <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
            {verifiedCount}/{totalEvidence} verified
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold mr-1" style={{ color: colors.utility.secondaryText }}>
            {Math.round((verifiedCount / Math.max(totalEvidence, 1)) * 100)}% coverage
          </span>
          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${colors.utility.primaryText}10` }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.round((verifiedCount / Math.max(totalEvidence, 1)) * 100)}%`,
                backgroundColor: colors.semantic?.success || '#10B981',
              }}
            />
          </div>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
            style={{
              backgroundColor: filter === f.key ? `${colors.brand.primary}15` : 'transparent',
              color: filter === f.key ? colors.brand.primary : colors.utility.secondaryText,
              border: `1px solid ${filter === f.key ? `${colors.brand.primary}30` : `${colors.utility.primaryText}10`}`,
            }}
          >
            {f.label}
            <span className="text-[9px] opacity-70">{f.count}</span>
          </button>
        ))}
      </div>

      {/* ─── Tickets with Evidence ─── */}
      <div className="space-y-4">
        {tickets.map((ticket) => {
          const isExpanded = expandedTickets.has(ticket.ticketNumber);
          const filteredEvidence = filter === 'all'
            ? ticket.evidence
            : ticket.evidence.filter(e => e.type === filter);

          if (filteredEvidence.length === 0) return null;

          return (
            <div
              key={ticket.ticketNumber}
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}10`,
              }}
            >
              {/* Ticket Header */}
              <button
                onClick={() => toggleTicket(ticket.ticketNumber)}
                className="w-full px-5 py-4 flex items-center gap-4 text-left hover:opacity-90 transition-opacity"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${colors.semantic.success}12` }}
                >
                  <Ticket className="w-4 h-4" style={{ color: colors.semantic.success }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
                      {ticket.ticketNumber}
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${colors.semantic.success}12`, color: colors.semantic.success }}
                    >
                      {filteredEvidence.length} item{filteredEvidence.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: colors.utility.secondaryText }}>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {formatDate(ticket.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {ticket.assignedTo}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  style={{ color: colors.utility.secondaryText }}
                />
              </button>

              {/* Evidence Items */}
              {isExpanded && (
                <div className="px-5 pb-4">
                  <div
                    className="border-t pt-4 space-y-2"
                    style={{ borderColor: `${colors.utility.primaryText}08` }}
                  >
                    {filteredEvidence.map((ev) => {
                      const { icon: EvIcon, color: evColor } = EVIDENCE_ICON_MAP[ev.type] || EVIDENCE_ICON_MAP.document;
                      return (
                        <div
                          key={ev.id}
                          className="flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm"
                          style={{
                            backgroundColor: `${colors.utility.primaryText}03`,
                            borderColor: `${colors.utility.primaryText}08`,
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${evColor}12` }}
                          >
                            <EvIcon className="w-4 h-4" style={{ color: evColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                              {ev.label}
                            </p>
                            <p className="text-[10px] truncate" style={{ color: colors.utility.secondaryText }}>
                              {ev.subtitle}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {ev.status === 'verified' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: colors.semantic.success }} />
                            ) : ev.status === 'pending' ? (
                              <Clock className="w-3.5 h-3.5" style={{ color: colors.semantic.warning }} />
                            ) : (
                              <Upload className="w-3.5 h-3.5" style={{ color: colors.brand.primary }} />
                            )}
                            <span className="text-[9px]" style={{ color: colors.utility.secondaryText }}>
                              {ev.timestamp}
                            </span>
                            <button
                              className="p-1 rounded hover:opacity-70 transition-opacity"
                              title="View"
                            >
                              <Eye className="w-3 h-3" style={{ color: colors.brand.primary }} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EvidenceTab;
