// src/components/contracts/fleet/FleetMatrix.tsx
// Fleet Logbook (Batch B) — "Service matrix" lens for the Equipment tab.
// Read-only table: rows = machines (grouped by category), columns = the
// contract's distinct service visit dates, cells = status dots.

import React from 'react';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import type { ContractEquipmentDetail } from '@/types/contracts';
import type { MachineServiceState } from './fleetTypes';
import { formatShortDate } from './fleetTypes';

// =================================================================
// TYPES
// =================================================================

export interface FleetMatrixMachine {
  detail: ContractEquipmentDetail;
  state?: MachineServiceState;
  isPlaceholder: boolean;
}

export interface FleetMatrixGroup {
  key: string;
  name: string;
  machines: FleetMatrixMachine[];
}

interface FleetMatrixProps {
  colors: any;
  groups: FleetMatrixGroup[];
  /** Distinct ISO date keys of the contract's service visits, sorted asc */
  dateColumns: string[];
  isLoading: boolean;
  /** If more dates than this, columns fall back to "Visit N" labels */
  maxDateLabels?: number;
}

type CellStatus = 'proven' | 'due' | 'overdue' | 'scheduled' | 'locked' | 'none';

// =================================================================
// COMPONENT
// =================================================================

const FleetMatrix: React.FC<FleetMatrixProps> = ({
  colors,
  groups,
  dateColumns,
  isLoading,
  maxDateLabels = 14,
}) => {
  const lineColor = colors.utility.primaryText + '10';
  const useSequenceLabels = dateColumns.length > maxDateLabels;

  const dotStyle = (status: CellStatus): React.CSSProperties => {
    switch (status) {
      case 'proven':
        return { backgroundColor: colors.semantic.success };
      case 'due':
        return { backgroundColor: '#d97706' };
      case 'overdue':
        return { backgroundColor: colors.semantic.error };
      case 'scheduled':
        return { backgroundColor: colors.utility.secondaryText + '50' };
      case 'locked':
        return {
          background: 'repeating-linear-gradient(45deg, #e5cf9a, #e5cf9a 3px, transparent 3px, transparent 6px)',
          border: '1px solid #a16207',
        };
      default:
        return {};
    }
  };

  const cellStatus = (machine: FleetMatrixMachine, dateKey: string): CellStatus => {
    const state = machine.state;
    const visit = state?.visits.find((v) => v.dateKey === dateKey);
    if (!visit) return 'none';
    if (visit.isLocked || machine.isPlaceholder) return 'locked';
    if (visit.isProven) return 'proven';
    if (visit.isOverdue) return 'overdue';
    if (state?.nextDueDate && visit.dateKey === state.nextDueDate) return 'due';
    return 'scheduled';
  };

  const Dot: React.FC<{ status: CellStatus }> = ({ status }) =>
    status === 'none' ? (
      <span className="text-[10px]" style={{ color: colors.utility.secondaryText + '60' }}>
        —
      </span>
    ) : (
      <span className="inline-block w-3.5 h-3.5 rounded-full" style={dotStyle(status)} />
    );

  if (isLoading) {
    return (
      <div
        className="rounded-xl border p-8 flex items-center justify-center"
        style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: lineColor }}
      >
        <VaNiLoader size="sm" message="Loading service matrix..." />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: lineColor }}
    >
      <div className="overflow-x-auto">
        <table className="border-collapse w-full" style={{ minWidth: 520 }}>
          <thead>
            <tr>
              <th
                className="text-left px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                style={{ color: colors.utility.secondaryText, borderBottom: `1px solid ${lineColor}` }}
              >
                Machine
              </th>
              {dateColumns.map((dateKey, i) => (
                <th
                  key={dateKey}
                  className="text-center px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: colors.utility.secondaryText, borderBottom: `1px solid ${lineColor}` }}
                  title={formatShortDate(dateKey)}
                >
                  {useSequenceLabels ? `Visit ${i + 1}` : formatShortDate(dateKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <React.Fragment key={group.key}>
                <tr>
                  <td
                    colSpan={dateColumns.length + 1}
                    className="px-2.5 pt-3 pb-1 text-[11px] font-bold"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {group.name}
                  </td>
                </tr>
                {group.machines.map((m) => (
                  <tr key={m.detail.id}>
                    <td
                      className="text-left px-2.5 py-2 text-xs font-semibold whitespace-nowrap"
                      style={{ color: colors.utility.primaryText, borderBottom: `1px solid ${lineColor}` }}
                    >
                      {m.isPlaceholder ? `${m.detail.category_name} (awaiting asset)` : m.detail.item_name}
                      <span
                        className="block text-[10px] font-normal"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {m.isPlaceholder
                          ? 'To be attached'
                          : m.detail.serial_number
                            ? `SN ${m.detail.serial_number}`
                            : m.detail.location || m.detail.category_name}
                      </span>
                    </td>
                    {dateColumns.map((dateKey) => (
                      <td
                        key={dateKey}
                        className="text-center px-2.5 py-2"
                        style={{ borderBottom: `1px solid ${lineColor}` }}
                      >
                        <Dot status={cellStatus(m, dateKey)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[11px]" style={{ color: colors.utility.secondaryText }}>
        {(
          [
            ['proven', 'Proven'],
            ['due', 'Due'],
            ['overdue', 'Overdue'],
            ['scheduled', 'Scheduled'],
            ['locked', 'Locked (awaiting asset)'],
          ] as Array<[CellStatus, string]>
        ).map(([status, label]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={dotStyle(status)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default FleetMatrix;
