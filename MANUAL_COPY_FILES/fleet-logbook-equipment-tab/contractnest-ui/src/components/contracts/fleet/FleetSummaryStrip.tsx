// src/components/contracts/fleet/FleetSummaryStrip.tsx
// Fleet Logbook (Batch B) — summary stat strip rendered above the
// machine grid on the contract Equipment tab. Read-only except the
// "Awaiting asset" stat, which doubles as the "show only awaiting" toggle.

import React from 'react';
import { formatShortDate } from './fleetTypes';

interface FleetSummaryStripProps {
  colors: any;
  /** All machines on the contract (attached + placeholders) */
  machinesTotal: number;
  equipmentCount: number;
  entityCount: number;
  /** Placeholder count ("attach later" slots) */
  awaitingCount: number;
  /** Fleet-wide proven visits (only meaningful when hasServiceData) */
  provenTotal: number;
  visitsTotal: number;
  /** ISO date key of the next due visit across the fleet, null if none */
  nextVisitDate: string | null;
  /** Machines with at least one overdue visit */
  machinesBehind: number;
  /** True once events + event-assets have loaded and the contract has visits */
  hasServiceData: boolean;
  /** True while events / event-assets queries are in flight */
  serviceDataLoading: boolean;
  /** "Show only awaiting" filter state — the awaiting stat is the toggle */
  showOnlyAwaiting: boolean;
  onToggleAwaiting: () => void;
}

const FleetSummaryStrip: React.FC<FleetSummaryStripProps> = ({
  colors,
  machinesTotal,
  equipmentCount,
  entityCount,
  awaitingCount,
  provenTotal,
  visitsTotal,
  nextVisitDate,
  machinesBehind,
  hasServiceData,
  serviceDataLoading,
  showOnlyAwaiting,
  onToggleAwaiting,
}) => {
  const cardBase: React.CSSProperties = {
    backgroundColor: colors.utility.secondaryBackground,
    borderColor: colors.utility.primaryText + '12',
  };

  const attachedCount = machinesTotal - awaitingCount;
  const breakdownParts: string[] = [];
  if (equipmentCount > 0) breakdownParts.push(`${equipmentCount} equipment`);
  if (entityCount > 0) breakdownParts.push(`${entityCount} facilit${entityCount === 1 ? 'y' : 'ies'}`);
  if (awaitingCount > 0) breakdownParts.push(`${attachedCount} attached`);

  const serviceValue = (value: React.ReactNode) =>
    serviceDataLoading ? '…' : hasServiceData ? value : '—';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {/* Machines covered */}
      <div className="rounded-xl border px-4 py-3" style={cardBase}>
        <div className="text-xl font-extrabold leading-tight" style={{ color: colors.utility.primaryText }}>
          {machinesTotal}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: colors.utility.secondaryText }}>
          Machines covered
          {breakdownParts.length > 0 && (
            <span className="block truncate">{breakdownParts.join(' · ')}</span>
          )}
        </div>
      </div>

      {/* Awaiting asset — doubles as the "show only awaiting" filter toggle */}
      <button
        type="button"
        onClick={awaitingCount > 0 ? onToggleAwaiting : undefined}
        aria-pressed={showOnlyAwaiting}
        className={`rounded-xl border px-4 py-3 text-left transition-colors ${awaitingCount > 0 ? 'hover:opacity-90 cursor-pointer' : 'cursor-default'}`}
        style={{
          backgroundColor: showOnlyAwaiting ? '#f59e0b14' : colors.utility.secondaryBackground,
          borderColor: showOnlyAwaiting ? '#f59e0b60' : awaitingCount > 0 ? '#f59e0b40' : colors.utility.primaryText + '12',
        }}
      >
        <div
          className="text-xl font-extrabold leading-tight"
          style={{ color: awaitingCount > 0 ? '#d97706' : colors.utility.primaryText }}
        >
          {awaitingCount}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: colors.utility.secondaryText }}>
          Awaiting asset
          {awaitingCount > 0 && (
            <span className="block" style={{ color: '#d97706' }}>
              {showOnlyAwaiting ? 'Showing only awaiting — tap to clear' : 'Tap to filter'}
            </span>
          )}
        </div>
      </button>

      {/* Visits proven */}
      <div className="rounded-xl border px-4 py-3" style={cardBase}>
        <div
          className="text-xl font-extrabold leading-tight"
          style={{
            color:
              hasServiceData && visitsTotal > 0 && provenTotal === visitsTotal
                ? colors.semantic.success
                : colors.utility.primaryText,
          }}
        >
          {serviceValue(`${provenTotal} / ${visitsTotal}`)}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: colors.utility.secondaryText }}>
          Visits proven (fleet)
        </div>
      </div>

      {/* Next visit */}
      <div className="rounded-xl border px-4 py-3" style={cardBase}>
        <div className="text-xl font-extrabold leading-tight" style={{ color: colors.utility.primaryText }}>
          {serviceValue(formatShortDate(nextVisitDate))}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: colors.utility.secondaryText }}>
          Next visit due
        </div>
      </div>

      {/* Machines behind */}
      <div
        className="rounded-xl border px-4 py-3"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor:
            hasServiceData && machinesBehind > 0
              ? colors.semantic.error + '50'
              : colors.utility.primaryText + '12',
        }}
      >
        <div
          className="text-xl font-extrabold leading-tight"
          style={{
            color: hasServiceData && machinesBehind > 0 ? colors.semantic.error : colors.utility.primaryText,
          }}
        >
          {serviceValue(machinesBehind)}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: colors.utility.secondaryText }}>
          Machine{machinesBehind === 1 ? '' : 's'} behind schedule
        </div>
      </div>
    </div>
  );
};

export default FleetSummaryStrip;
