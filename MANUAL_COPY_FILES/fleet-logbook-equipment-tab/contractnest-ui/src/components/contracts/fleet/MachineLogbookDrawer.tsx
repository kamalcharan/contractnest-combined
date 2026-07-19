// src/components/contracts/fleet/MachineLogbookDrawer.tsx
// Fleet Logbook (Batch B) — read-only right-side drawer listing one
// machine's service visits chronologically. Follows the fixed-overlay +
// slide-in drawer convention used by ServiceExecutionDrawer.

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, Circle, AlertTriangle, Lock, User, BookOpen } from 'lucide-react';
import type { ContractEquipmentDetail } from '@/types/contracts';
import type { MachineServiceState, MachineVisit } from './fleetTypes';
import { formatShortDate } from './fleetTypes';

interface MachineLogbookDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  colors: any;
  machine: ContractEquipmentDetail | null;
  state: MachineServiceState | null;
}

/** Row status → display label (same vocab as EventAssetProgress) */
const ROW_STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  proven: 'Proven',
  blocked_placeholder: 'Awaiting asset',
};

const MachineLogbookDrawer: React.FC<MachineLogbookDrawerProps> = ({
  isOpen,
  onClose,
  colors,
  machine,
  state,
}) => {
  // Slide-in transition: mount closed, then translate in on next frame
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!isOpen) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  if (!isOpen || !machine) return null;

  const visits = state?.visits || [];
  const lineColor = colors.utility.primaryText + '10';

  const visitTitle = (v: MachineVisit): string => {
    if (!v.event) return 'Service visit';
    const seq =
      v.event.total_occurrences > 1
        ? ` — Visit ${v.event.sequence_number} of ${v.event.total_occurrences}`
        : '';
    return `${v.event.block_name || 'Service visit'}${seq}`;
  };

  const visitIcon = (v: MachineVisit) => {
    if (v.isLocked) return { Icon: Lock, color: '#d97706', bg: '#f59e0b18' };
    if (v.isProven) return { Icon: CheckCircle2, color: colors.semantic.success, bg: colors.semantic.success + '15' };
    if (v.isOverdue) return { Icon: AlertTriangle, color: colors.semantic.error, bg: colors.semantic.error + '15' };
    return { Icon: Circle, color: colors.utility.secondaryText, bg: colors.utility.primaryText + '08' };
  };

  const visitStatusLine = (v: MachineVisit): string => {
    if (v.isLocked) return 'Locked until an asset is attached';
    if (v.isProven) return 'Proven';
    if (v.isOverdue) return 'Overdue';
    const evtStatus = v.event?.status ? v.event.status.replace(/_/g, ' ') : 'scheduled';
    return evtStatus.charAt(0).toUpperCase() + evtStatus.slice(1);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.35)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[440px] max-w-[94vw] shadow-2xl border-l flex flex-col transition-transform duration-300 ease-out ${entered ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderColor: lineColor,
        }}
        role="dialog"
        aria-label="Machine service logbook"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-start justify-between gap-3" style={{ borderColor: lineColor }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 flex-shrink-0" style={{ color: colors.brand.primary }} />
              <h3 className="text-sm font-bold truncate" style={{ color: colors.utility.primaryText }}>
                {machine.item_name}
              </h3>
            </div>
            <p className="text-[11px] mt-0.5 truncate" style={{ color: colors.utility.secondaryText }}>
              {[
                machine.serial_number ? `SN ${machine.serial_number}` : null,
                machine.location || null,
                machine.category_name || null,
              ]
                .filter(Boolean)
                .join(' · ') || 'No serial / location recorded'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:opacity-80 flex-shrink-0"
            style={{ color: colors.utility.secondaryText, backgroundColor: colors.utility.primaryText + '08' }}
            aria-label="Close logbook"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{ color: colors.utility.secondaryText }}
          >
            Service logbook — this machine only
          </div>

          {state && state.totalVisits > 0 && (
            <div className="text-[11px] mb-3" style={{ color: colors.utility.secondaryText }}>
              {state.provenCount} of {state.totalVisits} visits proven
              {state.overdueCount > 0 && (
                <span className="font-bold" style={{ color: colors.semantic.error }}>
                  {' '}
                  · {state.overdueCount} overdue
                </span>
              )}
              {state.nextDueDate && ` · Next: ${formatShortDate(state.nextDueDate)}`}
            </div>
          )}

          {visits.length === 0 ? (
            <div
              className="rounded-lg border border-dashed px-4 py-8 text-center text-xs"
              style={{ borderColor: lineColor, color: colors.utility.secondaryText }}
            >
              No service visits recorded for this machine yet.
            </div>
          ) : (
            <div>
              {visits.map((v) => {
                const { Icon, color, bg } = visitIcon(v);
                return (
                  <div
                    key={v.row.id}
                    className="flex gap-3 py-3 border-b last:border-b-0"
                    style={{ borderColor: lineColor }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: bg }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                        {visitTitle(v)}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: colors.utility.secondaryText }}>
                        {v.dateKey ? formatShortDate(v.dateKey) : 'Date TBD'} · {visitStatusLine(v)}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: bg, color }}
                        >
                          {ROW_STATUS_LABEL[v.row.status] || v.row.status}
                        </span>
                        {(v.row.assignee || v.event?.assigned_to_name) && (
                          <span
                            className="flex items-center gap-1 text-[10px]"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            <User className="h-3 w-3" />
                            {v.row.assignee || v.event?.assigned_to_name}
                          </span>
                        )}
                        {v.isProven && v.row.proven_at && (
                          <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                            Proven {formatShortDate(v.row.proven_at.split('T')[0])}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MachineLogbookDrawer;
