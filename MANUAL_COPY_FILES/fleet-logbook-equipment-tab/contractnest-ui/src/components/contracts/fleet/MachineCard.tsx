// src/components/contracts/fleet/MachineCard.tsx
// Fleet Logbook (Batch B) — compact machine card purpose-built for the
// contract Equipment tab (design ref: SPRINT_REFERENCES/8-fleet-logbook-
// contract-view.html). Replaces the registry EquipmentCard in the fleet
// grid ONLY — the attach picker still uses EquipmentCard.
//
// Anatomy (top to bottom):
//   name + serial/location line          | Attached / Awaiting pill
//   condition · criticality · client (compact meta, attached only)
//   "x of y visits proven"               | "Next: <date>" / "Due: <date> (missed)"
//   thin progress bar
//   "Last serviced <date> · <assignee>"  | View logbook · Attach · remove

import React from 'react';
import { BookOpen, Link2, Trash2 } from 'lucide-react';
import type { ContractEquipmentDetail } from '@/types/contracts';
import type { MachineServiceState } from './fleetTypes';
import { formatShortDate } from './fleetTypes';

interface MachineCardProps {
  colors: any;
  detail: ContractEquipmentDetail;
  isPlaceholder: boolean;
  /** "n of m" among same-category placeholders, when applicable */
  displayIndex?: { index: number; total: number };
  state?: MachineServiceState | null;
  hasServiceData: boolean;
  clientName?: string;
  canRemove: boolean;
  canAttach: boolean;
  removing: boolean;
  onRemove?: () => void;
  onAttach?: () => void;
  /** Present only when the machine has visits to show */
  onOpenLogbook?: () => void;
}

const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const MachineCard: React.FC<MachineCardProps> = ({
  colors,
  detail,
  isPlaceholder,
  displayIndex,
  state,
  hasServiceData,
  clientName,
  canRemove,
  canAttach,
  removing,
  onRemove,
  onAttach,
  onOpenLogbook,
}) => {
  const behind = !!state && state.overdueCount > 0;
  const hasVisits = !!state && state.totalVisits > 0;
  const pct = hasVisits ? Math.round((state!.provenCount / state!.totalVisits) * 100) : 0;
  const firstOverdueDate = behind ? state!.visits.find((v) => v.isOverdue)?.dateKey || null : null;

  // Sub line: SN · location · make/model — fall back to category
  const subParts = isPlaceholder
    ? [displayIndex ? `Placeholder · ${displayIndex.index} of ${displayIndex.total}` : 'Placeholder']
    : [
        detail.serial_number ? `SN ${detail.serial_number}` : null,
        detail.location || null,
        [detail.make, detail.model].filter(Boolean).join(' ') || null,
      ].filter(Boolean);
  if (subParts.length === 0 && detail.category_name) subParts.push(detail.category_name);

  const metaParts = isPlaceholder
    ? []
    : [
        detail.condition ? cap(detail.condition) : null,
        detail.criticality ? `${cap(detail.criticality)} criticality` : null,
        clientName || null,
      ].filter(Boolean);

  const smallBtn = (bg: string, fg: string, border?: string): React.CSSProperties => ({
    backgroundColor: bg,
    color: fg,
    border: border ? `1px solid ${border}` : 'none',
  });

  const footerText = isPlaceholder
    ? 'Forms & closure blocked'
    : state?.lastProven
      ? `Last serviced ${formatShortDate(state.lastProven.dateKey)}${state.lastProven.assignee ? ` · ${state.lastProven.assignee}` : ''}`
      : hasVisits
        ? 'Not serviced yet'
        : '';
  const showLogbookBtn = !isPlaceholder && hasVisits && !!onOpenLogbook;
  const showAttachBtn = isPlaceholder && canAttach && !!onAttach;
  const showRemoveBtn = canRemove && !!onRemove;
  const hasFooter = !!footerText || showLogbookBtn || showAttachBtn || showRemoveBtn;

  return (
    <div
      className="rounded-xl border p-4 transition-shadow hover:shadow-sm h-full flex flex-col"
      style={{
        backgroundColor: isPlaceholder ? '#f59e0b08' : colors.utility.secondaryBackground,
        borderColor: isPlaceholder ? '#f59e0b50' : colors.utility.primaryText + '14',
        borderStyle: isPlaceholder ? 'dashed' : 'solid',
        opacity: removing ? 0.6 : 1,
      }}
    >
      {/* Top row: identity + pill */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-bold truncate" style={{ color: colors.utility.primaryText }}>
            {isPlaceholder ? `${detail.category_name || 'Asset'} · (to be listed)` : detail.item_name}
          </div>
          <div className="text-[11px] mt-0.5 truncate" style={{ color: colors.utility.secondaryText }}>
            {subParts.join(' · ')}
          </div>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={
            isPlaceholder
              ? { backgroundColor: '#f59e0b18', color: '#d97706' }
              : { backgroundColor: colors.semantic.success + '15', color: colors.semantic.success }
          }
        >
          {isPlaceholder ? 'Awaiting asset' : 'Attached'}
        </span>
      </div>

      {/* Compact meta line — preserves condition / criticality / client info */}
      {metaParts.length > 0 && (
        <div className="text-[10.5px] mt-1 truncate" style={{ color: colors.utility.secondaryText + 'cc' }}>
          {metaParts.join(' · ')}
        </div>
      )}

      {/* Service line + progress bar */}
      {hasServiceData && hasVisits && (
        <>
          <div className="flex items-center justify-between gap-2 mt-3 text-[11.5px]">
            {isPlaceholder ? (
              <>
                <span style={{ color: '#d97706', fontWeight: 600 }}>Visits locked until attached</span>
                <span style={{ color: colors.utility.secondaryText }}>—</span>
              </>
            ) : (
              <>
                <span
                  style={{
                    color: behind ? colors.semantic.error : colors.utility.secondaryText,
                    fontWeight: behind ? 700 : 500,
                  }}
                >
                  {state!.provenCount} of {state!.totalVisits} visits proven
                  {behind ? ` · ${state!.overdueCount} overdue` : ''}
                </span>
                <span style={{ color: behind ? colors.semantic.error : colors.utility.secondaryText }}>
                  {behind && firstOverdueDate
                    ? `Due: ${formatShortDate(firstOverdueDate)} (missed)`
                    : state!.nextDueDate
                      ? `Next: ${formatShortDate(state!.nextDueDate)}`
                      : ''}
                </span>
              </>
            )}
          </div>
          <div
            className="h-1 rounded-full mt-1.5 overflow-hidden"
            style={{ backgroundColor: colors.utility.primaryText + '10' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${isPlaceholder ? 0 : pct}%`,
                backgroundColor: behind ? colors.semantic.error : colors.semantic.success,
              }}
            />
          </div>
        </>
      )}

      {/* Footer: last-serviced note + actions */}
      {hasFooter && (
      <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t" style={{ borderColor: colors.utility.primaryText + '0a', marginTop: 'auto' }}>
        <span className="text-[10.5px] truncate" style={{ color: colors.utility.secondaryText }}>
          {footerText}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {showLogbookBtn && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLogbook?.();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors hover:opacity-90"
              style={smallBtn(colors.brand.primary + '12', colors.brand.primary)}
            >
              <BookOpen className="h-3 w-3" />
              View logbook
            </button>
          )}
          {showAttachBtn && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAttach?.();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors hover:opacity-90"
              style={smallBtn(colors.brand.primary, '#fff')}
            >
              <Link2 className="h-3 w-3" />
              Attach asset
            </button>
          )}
          {showRemoveBtn && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
              disabled={removing}
              className="p-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-40"
              style={{ color: colors.semantic.error, backgroundColor: colors.semantic.error + '10' }}
              aria-label="Remove from contract"
              title="Remove from contract"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default MachineCard;
