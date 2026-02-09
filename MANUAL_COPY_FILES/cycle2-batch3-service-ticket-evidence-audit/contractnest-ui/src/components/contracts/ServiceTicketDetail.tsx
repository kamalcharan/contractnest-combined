// src/components/contracts/ServiceTicketDetail.tsx
// Service Ticket Detail Slide-In Panel — shows completed ticket details
// Evidence gallery, linked events, status timeline, assigned tech
// UI-first with mock data — to be wired to real API later

import React, { useState } from 'react';
import {
  X,
  Ticket,
  CheckCircle2,
  Clock,
  User,
  Camera,
  FileText,
  Shield,
  Upload,
  Download,
  Image,
  Play,
  UserCheck,
  Wrench,
  DollarSign,
  Package,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ContractEvent } from '@/types/contractEvents';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface TicketDetailState {
  isOpen: boolean;
  ticketNumber: string;
  assignedTo: string;
  completedAt: string;
  events: ContractEvent[];
}

interface ServiceTicketDetailProps {
  state: TicketDetailState;
  onClose: () => void;
  colors: any;
  currency: string;
}

// ═══════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════

interface MockEvidence {
  id: string;
  type: 'photo' | 'document' | 'otp' | 'form';
  label: string;
  subtitle?: string;
  timestamp: string;
  verified?: boolean;
}

interface MockTimelineEntry {
  status: string;
  timestamp: string;
  by: string;
  icon: React.ElementType;
  color: string;
}

const getMockEvidence = (ticketNumber: string): MockEvidence[] => {
  const hash = ticketNumber.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const items: MockEvidence[] = [
    { id: 'ev1', type: 'photo', label: 'Before Service', subtitle: 'Equipment condition pre-service', timestamp: '10:30 AM' },
    { id: 'ev2', type: 'photo', label: 'After Service', subtitle: 'Equipment condition post-service', timestamp: '11:45 AM' },
    { id: 'ev3', type: 'document', label: 'Service Report.pdf', subtitle: '2.4 MB', timestamp: '11:50 AM' },
    { id: 'ev4', type: 'otp', label: 'Customer Verification', subtitle: 'OTP verified by customer', timestamp: '11:52 AM', verified: true },
  ];
  if (hash % 2 === 0) {
    items.push({ id: 'ev5', type: 'form', label: 'Maintenance Checklist', subtitle: '12/12 items checked', timestamp: '11:48 AM' });
  }
  return items;
};

const getMockTimeline = (date: string): MockTimelineEntry[] => [
  { status: 'Ticket Created', timestamp: `${date} 09:00`, by: 'System', icon: Ticket, color: '#3B82F6' },
  { status: 'Technician Assigned', timestamp: `${date} 09:05`, by: 'Operations Admin', icon: UserCheck, color: '#8B5CF6' },
  { status: 'Service Started', timestamp: `${date} 10:30`, by: 'Field Tech', icon: Play, color: '#F59E0B' },
  { status: 'Evidence Uploaded', timestamp: `${date} 11:50`, by: 'Field Tech', icon: Camera, color: '#06B6D4' },
  { status: 'Service Completed', timestamp: `${date} 11:55`, by: 'Field Tech', icon: CheckCircle2, color: '#10B981' },
];

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

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

const ServiceTicketDetail: React.FC<ServiceTicketDetailProps> = ({
  state, onClose, colors, currency,
}) => {
  const [showTimeline, setShowTimeline] = useState(false);
  const [showEvents, setShowEvents] = useState(false);

  if (!state.isOpen) return null;

  const evidence = getMockEvidence(state.ticketNumber);
  const timeline = getMockTimeline(state.completedAt);
  const deliverables = state.events.filter(e => e.event_type === 'service' || e.event_type === 'spare_part');
  const billingEvents = state.events.filter(e => e.event_type === 'billing');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-[480px] shadow-2xl border-l overflow-y-auto animate-slide-in-right"
        style={{
          backgroundColor: colors.utility.mainBackground,
          borderColor: `${colors.utility.primaryText}15`,
        }}
      >
        {/* ─── Header ─── */}
        <div
          className="sticky top-0 z-10 px-6 py-4 border-b"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}10`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.semantic.success}12` }}
              >
                <Ticket className="w-5 h-5" style={{ color: colors.semantic.success }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                    {state.ticketNumber}
                  </h2>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${colors.semantic.success}12`, color: colors.semantic.success }}
                  >
                    Completed
                  </span>
                </div>
                <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                  {formatDate(state.completedAt)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:opacity-70 transition-opacity"
              style={{ color: colors.utility.secondaryText }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* ─── Assigned Tech ─── */}
          <div
            className="flex items-center gap-3 p-4 rounded-xl border"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}10`,
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${colors.brand.primary}15` }}
            >
              <User className="w-5 h-5" style={{ color: colors.brand.primary }} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
                {state.assignedTo}
              </p>
              <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                Field Technician
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold" style={{ color: colors.semantic.success }}>
                Completed
              </p>
              <p className="text-[9px]" style={{ color: colors.utility.secondaryText }}>
                11:55 AM
              </p>
            </div>
          </div>

          {/* ─── Evidence Gallery ─── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
                Evidence ({evidence.length})
              </h3>
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${colors.semantic.success}10`, color: colors.semantic.success }}
              >
                All Collected
              </span>
            </div>
            <div className="space-y-2">
              {evidence.map((ev) => {
                const { icon: EvIcon, color: evColor } = EVIDENCE_ICON_MAP[ev.type] || EVIDENCE_ICON_MAP.document;
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: `${colors.utility.primaryText}10`,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${evColor}12` }}
                    >
                      <EvIcon className="w-4 h-4" style={{ color: evColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                        {ev.label}
                      </p>
                      {ev.subtitle && (
                        <p className="text-[10px] truncate" style={{ color: colors.utility.secondaryText }}>
                          {ev.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ev.verified && (
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: colors.semantic.success }} />
                      )}
                      <span className="text-[9px]" style={{ color: colors.utility.secondaryText }}>
                        {ev.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Linked Events (collapsible) ─── */}
          <div>
            <button
              onClick={() => setShowEvents(!showEvents)}
              className="flex items-center justify-between w-full mb-3"
            >
              <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
                Linked Events ({deliverables.length + billingEvents.length})
              </h3>
              {showEvents ? (
                <ChevronUp className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
              )}
            </button>
            {showEvents && (
              <div className="space-y-2">
                {[...deliverables, ...billingEvents].map((event) => {
                  const isService = event.event_type === 'service';
                  const isSparePart = event.event_type === 'spare_part';
                  const accent = isSparePart
                    ? (colors.semantic?.info || '#3B82F6')
                    : isService ? (colors.semantic?.success || '#10B981') : (colors.semantic?.warning || '#F59E0B');
                  const TypeIcon = isSparePart ? Package : isService ? Wrench : DollarSign;

                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                      style={{
                        backgroundColor: colors.utility.secondaryBackground,
                        borderColor: `${accent}15`,
                        borderLeft: `3px solid ${accent}`,
                      }}
                    >
                      <TypeIcon className="w-4 h-4 flex-shrink-0" style={{ color: accent }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                          {event.block_name}
                        </p>
                        <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                          {isSparePart ? 'Spare Part' : isService ? 'Service' : 'Billing'}
                        </p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: colors.semantic.success }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Service Notes ─── */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: colors.utility.secondaryText }}>
              Service Notes
            </h3>
            <div
              className="p-3 rounded-lg border text-xs leading-relaxed"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}10`,
                color: colors.utility.primaryText,
              }}
            >
              Service completed as scheduled. All equipment inspected and maintenance performed.
              Customer confirmed satisfaction with work quality. No issues reported.
            </div>
          </div>

          {/* ─── Status Timeline (collapsible) ─── */}
          <div>
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="flex items-center justify-between w-full mb-3"
            >
              <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
                Ticket Timeline
              </h3>
              {showTimeline ? (
                <ChevronUp className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
              )}
            </button>
            {showTimeline && (
              <div className="space-y-0">
                {timeline.map((entry, i) => {
                  const EntryIcon = entry.icon;
                  const isLast = i === timeline.length - 1;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${entry.color}15` }}
                        >
                          <EntryIcon className="w-3.5 h-3.5" style={{ color: entry.color }} />
                        </div>
                        {!isLast && (
                          <div className="w-px flex-1 min-h-[24px]" style={{ backgroundColor: `${colors.utility.primaryText}10` }} />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                          {entry.status}
                        </p>
                        <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                          {entry.by} &middot; {entry.timestamp.split(' ')[1] || entry.timestamp}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Actions ─── */}
          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-semibold transition-opacity hover:opacity-80"
              style={{
                borderColor: `${colors.utility.primaryText}20`,
                color: colors.utility.primaryText,
                backgroundColor: 'transparent',
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Download Report
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90"
              style={{ backgroundColor: colors.brand.primary, color: '#ffffff' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out;
        }
      `}</style>
    </>
  );
};

export default ServiceTicketDetail;
