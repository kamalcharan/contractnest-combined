// src/utils/format.ts
import { format, isToday, isYesterday, parseISO } from 'date-fns';

/** Compact Indian-format currency: ₹12.4L, ₹1.2Cr, ₹8,450 */
export function formatCurrencyCompact(value: number, currency = 'INR'): string {
  const symbol = currency === 'USD' ? '$' : '₹';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (currency === 'INR') {
    if (abs >= 1_00_00_000) return `${sign}${symbol}${(abs / 1_00_00_000).toFixed(abs >= 10_00_00_000 ? 0 : 1)}Cr`;
    if (abs >= 1_00_000) return `${sign}${symbol}${(abs / 1_00_000).toFixed(abs >= 10_00_000 ? 0 : 1)}L`;
    if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  } else {
    if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}k`;
  }
  return `${sign}${symbol}${Math.round(abs).toLocaleString('en-IN')}`;
}

/** Full currency with Indian digit grouping: ₹1,23,456 */
export function formatCurrency(value: number, currency = 'INR'): string {
  const symbol = currency === 'USD' ? '$' : '₹';
  const sign = value < 0 ? '-' : '';
  return `${sign}${symbol}${Math.abs(Math.round(value)).toLocaleString('en-IN')}`;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const date = parseISO(iso);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'd MMM yyyy');
  } catch {
    return '—';
  }
}

export function formatDateShort(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'd MMM');
  } catch {
    return '—';
  }
}

export function initials(nameLike?: string | null): string {
  if (!nameLike) return '?';
  const parts = nameLike.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Same palette family as the web avatar hash
const AVATAR_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#14B8A6'];

export function avatarColor(seed?: string | null): string {
  if (!seed) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** 0x15-style translucent tint of a hex color (works with #RRGGBB) */
export function tint(hex: string, alphaHex: string = '22'): string {
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return `${hex}${alphaHex}`;
  return hex;
}
