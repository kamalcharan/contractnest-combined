// src/pages/admin/jtd/components/JtdStatusBadge.tsx
// Reusable status badge for JTD statuses

import React from 'react';
import { JTD_STATUS_META, CHANNEL_META, EVENT_TYPE_META } from '../types/jtdAdmin.types';

interface StatusBadgeProps {
  code: string;
  type?: 'status' | 'channel' | 'event_type';
  size?: 'sm' | 'md';
}

export const JtdStatusBadge: React.FC<StatusBadgeProps> = ({ code, type = 'status', size = 'sm' }) => {
  let meta: { label: string; color: string; bgColor?: string };

  if (type === 'channel') {
    const ch = CHANNEL_META[code];
    meta = ch ? { ...ch, bgColor: ch.color + '20' } : { label: code, color: '#6B7280', bgColor: '#F3F4F6' };
  } else if (type === 'event_type') {
    const et = EVENT_TYPE_META[code];
    meta = et ? { ...et, bgColor: et.color + '20' } : { label: code, color: '#6B7280', bgColor: '#F3F4F6' };
  } else {
    meta = JTD_STATUS_META[code] || { label: code, color: '#6B7280', bgColor: '#F3F4F6' };
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${padding}`}
      style={{ color: meta.color, backgroundColor: meta.bgColor }}
    >
      {meta.label}
    </span>
  );
};
