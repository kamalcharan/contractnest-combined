// src/components/contracts/AuditTab.tsx
// Audit Trail Tab — shows real audit log entries from API
// Filterable by category, chronological with rich entries
// Wired to real API via useContractAuditLog + falls back to contract.history

import React, { useState, useMemo } from 'react';
import {
  ScrollText,
  Clock,
  Filter,
  CheckCircle2,
  Edit,
  UserCheck,
  Camera,
  DollarSign,
  Shield,
  RefreshCw,
  ArrowRight,
  User,
  Package,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import type { ContractDetail } from '@/types/contracts';
import { useContractAuditLog } from '@/hooks/queries/useServiceExecution';
import type { AuditLogEntry } from '@/hooks/queries/useServiceExecution';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface AuditTabProps {
  contract: ContractDetail;
  colors: any;
}

type AuditCategory = 'all' | 'status' | 'content' | 'assignment' | 'evidence' | 'billing';

interface AuditDisplayEntry {
  id: string;
  category: Exclude<AuditCategory, 'all'>;
  action: string;
  description: string;
  detail?: { from?: string; to?: string } | string;
  performedBy: string;
  timestamp: string;
  icon: React.ElementType;
  iconColor: string;
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

const timeAgo = (dateStr: string): string => {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTimestamp = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const CATEGORY_CONFIG: Record<Exclude<AuditCategory, 'all'>, { label: string; icon: React.ElementType; color: string }> = {
  status: { label: 'Status', icon: RefreshCw, color: '#8B5CF6' },
  content: { label: 'Content', icon: Edit, color: '#F59E0B' },
  assignment: { label: 'Assignments', icon: UserCheck, color: '#3B82F6' },
  evidence: { label: 'Evidence', icon: Camera, color: '#06B6D4' },
  billing: { label: 'Billing', icon: DollarSign, color: '#F59E0B' },
};

const CATEGORY_ICON_MAP: Record<string, { icon: React.ElementType; color: string }> = {
  status: { icon: RefreshCw, color: '#8B5CF6' },
  content: { icon: Edit, color: '#F59E0B' },
  assignment: { icon: UserCheck, color: '#3B82F6' },
  evidence: { icon: Camera, color: '#06B6D4' },
  billing: { icon: DollarSign, color: '#F59E0B' },
};

// Convert API audit log entry to display entry
const mapAuditEntry = (entry: AuditLogEntry): AuditDisplayEntry => {
  const category = (entry.category || 'content') as Exclude<AuditCategory, 'all'>;
  const iconInfo = CATEGORY_ICON_MAP[category] || CATEGORY_ICON_MAP.content;

  // Build detail from old_value/new_value
  let detail: AuditDisplayEntry['detail'] = undefined;
  if (entry.old_value && entry.new_value) {
    if (typeof entry.old_value === 'string' && typeof entry.new_value === 'string') {
      detail = { from: entry.old_value, to: entry.new_value };
    } else if (entry.old_value?.status && entry.new_value?.status) {
      detail = { from: entry.old_value.status, to: entry.new_value.status };
    } else if (entry.old_value?.assigned_to_name || entry.new_value?.assigned_to_name) {
      detail = {
        from: entry.old_value?.assigned_to_name || 'Unassigned',
        to: entry.new_value?.assigned_to_name || 'Unassigned',
      };
    }
  } else if (entry.description) {
    detail = entry.description;
  }

  return {
    id: entry.id,
    category,
    action: entry.action,
    description: entry.description || entry.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    detail,
    performedBy: entry.performed_by_name || 'System',
    timestamp: entry.created_at,
    icon: iconInfo.icon,
    iconColor: iconInfo.color,
  };
};

// Convert contract.history entries to display entries (fallback)
const mapHistoryEntries = (contract: ContractDetail): AuditDisplayEntry[] => {
  if (!contract.history) return [];
  return contract.history.map((h: any, i: number) => ({
    id: h.id || `hist-${i}`,
    category: (h.from_status && h.to_status ? 'status' : 'content') as Exclude<AuditCategory, 'all'>,
    action: h.action || 'update',
    description: h.from_status && h.to_status
      ? 'Contract status changed'
      : (h.action || 'Updated').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    detail: h.from_status && h.to_status
      ? { from: h.from_status, to: h.to_status }
      : h.note || undefined,
    performedBy: h.performed_by_name || 'System',
    timestamp: h.created_at || contract.created_at || new Date().toISOString(),
    icon: h.from_status ? RefreshCw : Edit,
    iconColor: h.from_status ? '#8B5CF6' : '#F59E0B',
  }));
};

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

const AuditTab: React.FC<AuditTabProps> = ({ contract, colors }) => {
  const [filter, setFilter] = useState<AuditCategory>('all');
  const [showCount, setShowCount] = useState(15);

  // Fetch real audit log from API
  const { data: auditData, isLoading, error } = useContractAuditLog(
    contract.id || null,
    { category: filter !== 'all' ? filter : undefined, per_page: 100 }
  );

  // Build display entries: API data + contract history fallback
  const allEntries = useMemo(() => {
    const apiEntries = (auditData?.items || []).map(mapAuditEntry);
    const historyEntries = mapHistoryEntries(contract);

    // Merge: API entries take priority, add history entries that don't overlap
    const apiIds = new Set(apiEntries.map(e => e.id));
    const merged = [
      ...apiEntries,
      ...historyEntries.filter(h => !apiIds.has(h.id)),
    ];

    // Sort newest first
    merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return merged;
  }, [auditData, contract]);

  const filtered = useMemo(() => {
    if (filter === 'all') return allEntries;
    return allEntries.filter(e => e.category === filter);
  }, [allEntries, filter]);

  const visible = filtered.slice(0, showCount);

  // Category counts — use API counts if available, otherwise compute
  const categoryCounts = useMemo(() => {
    if (auditData?.category_counts) {
      return { all: allEntries.length, ...auditData.category_counts };
    }
    const counts: Record<string, number> = { all: allEntries.length };
    allEntries.forEach(e => {
      counts[e.category] = (counts[e.category] || 0) + 1;
    });
    return counts;
  }, [allEntries, auditData]);

  const filterOptions: { key: AuditCategory; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'status', label: 'Status' },
    { key: 'content', label: 'Content' },
    { key: 'assignment', label: 'Assignments' },
    { key: 'evidence', label: 'Evidence' },
    { key: 'billing', label: 'Billing' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.brand.primary }} />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>Loading audit trail...</p>
        </div>
      </div>
    );
  }

  if (allEntries.length === 0) {
    return (
      <div className="rounded-xl border p-12 text-center" style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}15` }}>
        <ScrollText className="h-14 w-14 mx-auto mb-4" style={{ color: `${colors.utility.secondaryText}60` }} />
        <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>No Activity Yet</h3>
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          All contract changes, status updates, and evidence uploads will be recorded here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* ─── Summary Strip ─── */}
      <div
        className="rounded-xl border px-5 py-4 flex items-center gap-4 flex-wrap"
        style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}10` }}
      >
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4" style={{ color: colors.brand.primary }} />
          <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
            {allEntries.length} Audit Entries
          </span>
        </div>
        <div className="h-4 w-px" style={{ backgroundColor: `${colors.utility.primaryText}12` }} />
        {(Object.entries(CATEGORY_CONFIG) as [Exclude<AuditCategory, 'all'>, typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][]).map(([key, cfg]) => (
          categoryCounts[key] > 0 ? (
            <div key={key} className="flex items-center gap-1.5">
              <cfg.icon className="w-3 h-3" style={{ color: cfg.color }} />
              <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                {categoryCounts[key]} {cfg.label.toLowerCase()}
              </span>
            </div>
          ) : null
        ))}
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
        {filterOptions.map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setShowCount(15); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
            style={{
              backgroundColor: filter === f.key ? `${colors.brand.primary}15` : 'transparent',
              color: filter === f.key ? colors.brand.primary : colors.utility.secondaryText,
              border: `1px solid ${filter === f.key ? `${colors.brand.primary}30` : `${colors.utility.primaryText}10`}`,
            }}
          >
            {f.label}
            <span className="text-[9px] opacity-70">{categoryCounts[f.key] || 0}</span>
          </button>
        ))}
      </div>

      {/* ─── Audit Entries ─── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}10` }}
      >
        {visible.map((entry, i) => {
          const EntryIcon = entry.icon;
          return (
            <div
              key={entry.id}
              className="px-5 py-4 flex gap-4 hover:opacity-95 transition-opacity"
              style={{
                borderBottom: i < visible.length - 1 ? `1px solid ${colors.utility.primaryText}06` : 'none',
              }}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${entry.iconColor}12` }}
              >
                <EntryIcon className="w-4 h-4" style={{ color: entry.iconColor }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold mb-0.5" style={{ color: colors.utility.primaryText }}>
                  {entry.description}
                </p>
                {/* Detail: from→to or string */}
                {entry.detail && (
                  typeof entry.detail === 'string' ? (
                    <p className="text-[10px] mb-1" style={{ color: colors.utility.secondaryText }}>
                      {entry.detail}
                    </p>
                  ) : (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${colors.utility.primaryText}08`, color: colors.utility.secondaryText }}
                      >
                        {(entry.detail.from || '').replace(/_/g, ' ')}
                      </span>
                      <ArrowRight className="w-3 h-3" style={{ color: colors.utility.secondaryText }} />
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${entry.iconColor}12`, color: entry.iconColor }}
                      >
                        {(entry.detail.to || '').replace(/_/g, ' ')}
                      </span>
                    </div>
                  )
                )}
                <div className="flex items-center gap-2 text-[10px]" style={{ color: colors.utility.secondaryText }}>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {entry.performedBy}
                  </span>
                  <span>&middot;</span>
                  <span title={formatTimestamp(entry.timestamp)}>
                    {timeAgo(entry.timestamp)}
                  </span>
                </div>
              </div>

              {/* Category badge */}
              <div className="flex-shrink-0">
                <span
                  className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${entry.iconColor}10`,
                    color: entry.iconColor,
                  }}
                >
                  {entry.category.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          );
        })}

        {/* Load More */}
        {visible.length < filtered.length && (
          <div className="px-5 py-3 border-t text-center" style={{ borderColor: `${colors.utility.primaryText}08` }}>
            <button
              onClick={() => setShowCount(prev => prev + 15)}
              className="text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ color: colors.brand.primary }}
            >
              Show more ({filtered.length - visible.length} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditTab;
