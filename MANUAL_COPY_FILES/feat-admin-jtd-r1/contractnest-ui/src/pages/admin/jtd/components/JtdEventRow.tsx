// src/pages/admin/jtd/components/JtdEventRow.tsx
// Table row for Event Explorer list

import React from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { JtdStatusBadge } from './JtdStatusBadge';
import type { JtdEventRecord } from '../types/jtdAdmin.types';

interface JtdEventRowProps {
  event: JtdEventRecord;
  onClick: (event: JtdEventRecord) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const JtdEventRow: React.FC<JtdEventRowProps> = ({ event, onClick }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <tr
      className="hover:opacity-90 cursor-pointer transition-colors"
      style={{ borderBottom: `1px solid ${colors.utility.primaryText + '20'}` }}
      onClick={() => onClick(event)}
    >
      {/* Tenant */}
      <td className="px-4 py-3">
        <div className="text-sm font-medium transition-colors" style={{ color: colors.utility.primaryText }}>
          {event.tenant_name}
        </div>
      </td>
      {/* Type */}
      <td className="px-4 py-3">
        <JtdStatusBadge code={event.event_type_code} type="event_type" />
      </td>
      {/* Channel */}
      <td className="px-4 py-3">
        {event.channel_code ? (
          <JtdStatusBadge code={event.channel_code} type="channel" />
        ) : (
          <span className="text-xs opacity-40">—</span>
        )}
      </td>
      {/* Recipient */}
      <td className="px-4 py-3">
        <div className="text-sm transition-colors" style={{ color: colors.utility.primaryText }}>
          {event.recipient_name || '—'}
        </div>
        <div className="text-xs transition-colors" style={{ color: colors.utility.secondaryText }}>
          {event.recipient_contact || ''}
        </div>
      </td>
      {/* Status */}
      <td className="px-4 py-3">
        <JtdStatusBadge code={event.status_code} />
      </td>
      {/* Retries */}
      <td className="px-4 py-3 text-center">
        <span className="text-sm" style={{ color: event.retry_count > 0 ? colors.semantic.error : colors.utility.secondaryText }}>
          {event.retry_count}/{event.max_retries}
        </span>
      </td>
      {/* Cost */}
      <td className="px-4 py-3 text-right">
        <span className="text-sm transition-colors" style={{ color: colors.utility.secondaryText }}>
          {event.cost > 0 ? `$${event.cost.toFixed(2)}` : '—'}
        </span>
      </td>
      {/* Time */}
      <td className="px-4 py-3 text-right">
        <span className="text-xs transition-colors" style={{ color: colors.utility.secondaryText }}>
          {timeAgo(event.created_at)}
        </span>
      </td>
    </tr>
  );
};
