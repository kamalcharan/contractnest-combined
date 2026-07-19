// src/components/contracts/EventAssetProgress.tsx
// Sprint 3 — per-asset progress companion for EventCard.
// Collapsed "n/m assets proven" chip; expands to a per-asset list
// (serial/name, status, assignee). Form-state isn't shown yet — that
// binding lands with Sprint 2, deferred.
import React, { useState } from 'react';
import { ChevronDown, CheckCircle2, Lock, Circle, User } from 'lucide-react';
import type { ContractEventAssetRow } from '@/hooks/queries/useContractEventQueries';

interface EventAssetProgressProps {
  assets: ContractEventAssetRow[];
  colors: any;
}

const STATUS_LABEL: Record<ContractEventAssetRow['status'], string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  proven: 'Proven',
  blocked_placeholder: 'Awaiting asset',
};

const EventAssetProgress: React.FC<EventAssetProgressProps> = ({ assets, colors }) => {
  const [expanded, setExpanded] = useState(false);

  if (!assets || assets.length === 0) return null;

  const proven = assets.filter((a) => a.status === 'proven').length;
  const total = assets.length;
  const hasBlocked = assets.some((a) => a.status === 'blocked_placeholder');

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full transition-colors hover:opacity-80"
        style={{
          backgroundColor: hasBlocked ? '#f59e0b18' : proven === total ? '#05966915' : colors.utility.primaryText + '08',
          color: hasBlocked ? '#d97706' : proven === total ? colors.semantic.success : colors.utility.secondaryText,
        }}
      >
        {proven}/{total} asset{total > 1 ? 's' : ''} proven
        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div
          className="mt-1.5 rounded-lg border divide-y overflow-hidden"
          style={{ borderColor: colors.utility.primaryText + '10' }}
        >
          {assets.map((a) => {
            const Icon = a.status === 'proven' ? CheckCircle2 : a.status === 'blocked_placeholder' ? Lock : Circle;
            const iconColor = a.status === 'proven'
              ? colors.semantic.success
              : a.status === 'blocked_placeholder'
                ? '#d97706'
                : colors.utility.secondaryText;
            return (
              <div
                key={a.id}
                className="flex items-center justify-between px-3 py-2 text-xs"
                style={{ backgroundColor: colors.utility.primaryBackground }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: iconColor }} />
                  <span className="truncate font-medium" style={{ color: colors.utility.primaryText }}>
                    {a.asset_name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {a.assignee && (
                    <span className="flex items-center gap-1" style={{ color: colors.utility.secondaryText }}>
                      <User className="h-3 w-3" />
                      {a.assignee}
                    </span>
                  )}
                  <span style={{ color: iconColor }}>{STATUS_LABEL[a.status]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventAssetProgress;
