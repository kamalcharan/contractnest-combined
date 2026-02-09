// src/components/contracts/ServiceTicketDetail.tsx
// Service Ticket Detail Slide-In Panel — shows ticket details with real API data
// Evidence gallery, linked events, status timeline, assigned tech
// Fetches real data when ticketId is provided, falls back to props data otherwise

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
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import type { ContractEvent } from '@/types/contractEvents';
import {
  useServiceTicketDetail,
  useTicketEvidence,
} from '@/hooks/queries/useServiceExecution';
import type { ServiceEvidence } from '@/hooks/queries/useServiceExecution';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface TicketDetailState {
  isOpen: boolean;
  ticketId?: string;
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
// HELPERS
// ═══════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const formatTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const EVIDENCE_ICON_MAP: Record<string, { icon: React.ElementType; color: string }> = {
  'upload-form': { icon: Image, color: '#06B6D4' },
  'otp': { icon: Shield, color: '#10B981' },
  'service-form': { icon: Wrench, color: '#8B5CF6' },
};

const STATUS_ICON_MAP: Record<string, { icon: React.ElementType; color: string }> = {
  created: { icon: Ticket, color: '#3B82F6' },
  assigned: { icon: UserCheck, color: '#8B5CF6' },
  in_progress: { icon: Play, color: '#F59E0B' },
  evidence_uploaded: { icon: Camera, color: '#06B6D4' },
  completed: { icon: CheckCircle2, color: '#10B981' },
  cancelled: { icon: X, color: '#EF4444' },
};

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

const ServiceTicketDetail: React.FC<ServiceTicketDetailProps> = ({
  state, onClose, colors, currency,
}) => {
  const [showTimeline, setShowTimeline] = useState(false);
  const [showEvents, setShowEvents] = useState(false);

  // Fetch real data when ticketId is available
  const { data: ticketDetail, isLoading: loadingDetail } = useServiceTicketDetail(
    state.ticketId || null,
    { enabled: state.isOpen && !!state.ticketId }
  );

  const { data: evidenceData, isLoading: loadingEvidence } = useTicketEvidence(
    state.ticketId || null,
    { enabled: state.isOpen && !!state.ticketId }
  );

  if (!state.isOpen) return null;

  // Use API data if available, fall back to props
  const ticketNumber = ticketDetail?.ticket_number || state.ticketNumber;
  const assignedTo = ticketDetail?.assigned_to_name || state.assignedTo;
  const status = ticketDetail?.status || 'completed';
  const completedAt = ticketDetail?.completed_at || state.completedAt;
  const evidence: ServiceEvidence[] = evidenceData?.items || [];
  const linkedEvents = ticketDetail?.events || [];
  const isLoading = (loadingDetail || loadingEvidence) && !!state.ticketId;

  // Separate event types from linked events
  const deliverableEvents = linkedEvents.filter(
    (e: any) => e.event_type === 'service' || e.event_type === 'spare_part'
  );
  const billingLinkedEvents = linkedEvents.filter((e: any) => e.event_type === 'billing');

  // Fall back to props events if no API data
  const displayDeliverables = deliverableEvents.length > 0
    ? deliverableEvents
    : state.events.filter(e => e.event_type === 'service' || e.event_type === 'spare_part');
  const displayBilling = billingLinkedEvents.length > 0
    ? billingLinkedEvents
    : state.events.filter(e => e.event_type === 'billing');

  const statusInfo = STATUS_ICON_MAP[status] || STATUS_ICON_MAP.completed;

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
                style={{ backgroundColor: `${statusInfo.color}12` }}
              >
                <Ticket className="w-5 h-5" style={{ color: statusInfo.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                    {ticketNumber || 'Service Ticket'}
                  </h2>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${statusInfo.color}12`, color: statusInfo.color }}
                  >
                    {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>
                <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                  {completedAt ? formatDate(completedAt) : 'In Progress'}
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

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.brand.primary }} />
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>Loading ticket details...</p>
            </div>
          </div>
        ) : (
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
                  {assignedTo || 'Unassigned'}
                </p>
                <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                  Assigned Technician
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold" style={{ color: statusInfo.color }}>
                  {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </p>
                {completedAt && (
                  <p className="text-[9px]" style={{ color: colors.utility.secondaryText }}>
                    {formatTime(completedAt)}
                  </p>
                )}
              </div>
            </div>

            {/* ─── Evidence Gallery ─── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
                  Evidence ({evidence.length})
                </h3>
                {evidence.length > 0 && (
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${evidence.every(e => e.status === 'verified') ? colors.semantic.success : colors.semantic.warning}10`,
                      color: evidence.every(e => e.status === 'verified') ? colors.semantic.success : colors.semantic.warning,
                    }}
                  >
                    {evidence.filter(e => e.status === 'verified').length}/{evidence.length} Verified
                  </span>
                )}
              </div>
              {evidence.length === 0 ? (
                <div
                  className="p-4 rounded-lg border text-center"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: `${colors.utility.primaryText}10`,
                  }}
                >
                  <Camera className="w-8 h-8 mx-auto mb-2" style={{ color: `${colors.utility.secondaryText}40` }} />
                  <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    No evidence uploaded yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {evidence.map((ev) => {
                    const evType = EVIDENCE_ICON_MAP[ev.evidence_type] || EVIDENCE_ICON_MAP['upload-form'];
                    const EvIcon = evType.icon;
                    const evColor = evType.color;
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
                            {ev.file_name || ev.block_name || ev.evidence_type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </p>
                          <p className="text-[10px] truncate" style={{ color: colors.utility.secondaryText }}>
                            {ev.evidence_type === 'otp'
                              ? (ev.otp_verified ? `Verified by ${ev.otp_verified_by_name || 'Customer'}` : 'Pending verification')
                              : ev.evidence_type === 'service-form'
                              ? 'Service form data'
                              : (ev.file_size ? `${(ev.file_size / 1024 / 1024).toFixed(1)} MB` : ev.uploaded_by_name || '')
                            }
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
                            {formatTime(ev.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ─── Linked Events (collapsible) ─── */}
            <div>
              <button
                onClick={() => setShowEvents(!showEvents)}
                className="flex items-center justify-between w-full mb-3"
              >
                <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
                  Linked Events ({displayDeliverables.length + displayBilling.length})
                </h3>
                {showEvents ? (
                  <ChevronUp className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
                )}
              </button>
              {showEvents && (
                <div className="space-y-2">
                  {[...displayDeliverables, ...displayBilling].map((event: any) => {
                    const isService = event.event_type === 'service';
                    const isSparePart = event.event_type === 'spare_part';
                    const accent = isSparePart
                      ? (colors.semantic?.info || '#3B82F6')
                      : isService ? (colors.semantic?.success || '#10B981') : (colors.semantic?.warning || '#F59E0B');
                    const TypeIcon = isSparePart ? Package : isService ? Wrench : DollarSign;

                    return (
                      <div
                        key={event.id || event.event_id}
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
            {(ticketDetail?.notes || !state.ticketId) && (
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
                  {ticketDetail?.notes || 'No notes recorded for this service ticket.'}
                </div>
              </div>
            )}

            {/* ─── Ticket Info ─── */}
            {ticketDetail && (
              <div>
                <button
                  onClick={() => setShowTimeline(!showTimeline)}
                  className="flex items-center justify-between w-full mb-3"
                >
                  <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
                    Ticket Details
                  </h3>
                  {showTimeline ? (
                    <ChevronUp className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
                  )}
                </button>
                {showTimeline && (
                  <div className="space-y-2">
                    {[
                      { label: 'Created', value: ticketDetail.created_at ? formatDate(ticketDetail.created_at) + ' ' + formatTime(ticketDetail.created_at) : '—', by: ticketDetail.created_by_name },
                      { label: 'Started', value: ticketDetail.started_at ? formatDate(ticketDetail.started_at) + ' ' + formatTime(ticketDetail.started_at) : '—' },
                      { label: 'Completed', value: ticketDetail.completed_at ? formatDate(ticketDetail.completed_at) + ' ' + formatTime(ticketDetail.completed_at) : '—' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between p-2.5 rounded-lg"
                        style={{ backgroundColor: `${colors.utility.primaryText}04` }}
                      >
                        <span className="text-[10px] font-semibold" style={{ color: colors.utility.secondaryText }}>
                          {item.label}
                        </span>
                        <div className="text-right">
                          <span className="text-[10px] font-bold" style={{ color: colors.utility.primaryText }}>
                            {item.value}
                          </span>
                          {item.by && (
                            <p className="text-[9px]" style={{ color: colors.utility.secondaryText }}>by {item.by}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
        )}
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
