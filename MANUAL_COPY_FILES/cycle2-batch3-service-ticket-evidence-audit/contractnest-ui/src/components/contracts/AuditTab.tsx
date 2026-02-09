// src/components/contracts/AuditTab.tsx
// Enhanced Audit Trail Tab — shows all contract changes including content, status, evidence, assignments
// Filterable by category, chronological with rich entries
// UI-first with mock data — combines real history + mock supplementary entries

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
} from 'lucide-react';
import type { ContractDetail } from '@/types/contracts';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface AuditTabProps {
  contract: ContractDetail;
  colors: any;
}

type AuditCategory = 'all' | 'status' | 'content' | 'assignment' | 'evidence' | 'billing';

interface AuditEntry {
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
// MOCK DATA BUILDER
// ═══════════════════════════════════════════════════

const buildAuditEntries = (contract: ContractDetail): AuditEntry[] => {
  const entries: AuditEntry[] = [];
  const createdAt = contract.created_at || '2025-01-10T09:00:00Z';

  // Real history entries from contract
  if (contract.history) {
    contract.history.forEach((h: any, i: number) => {
      entries.push({
        id: h.id || `hist-${i}`,
        category: h.from_status && h.to_status ? 'status' : 'content',
        action: h.action || 'update',
        description: h.from_status && h.to_status
          ? 'Contract status changed'
          : (h.action || 'Updated').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        detail: h.from_status && h.to_status
          ? { from: h.from_status, to: h.to_status }
          : h.note || undefined,
        performedBy: h.performed_by_name || 'System',
        timestamp: h.created_at || createdAt,
        icon: h.from_status ? RefreshCw : Edit,
        iconColor: h.from_status ? '#8B5CF6' : '#F59E0B',
      });
    });
  }

  // Mock supplementary entries to demonstrate the rich audit trail
  const mockEntries: AuditEntry[] = [
    {
      id: 'mock-1',
      category: 'content',
      action: 'description_updated',
      description: 'Contract description updated',
      detail: 'Added detailed scope of work for Q2 deliverables',
      performedBy: 'Operations Admin',
      timestamp: new Date(new Date(createdAt).getTime() + 86400000).toISOString(),
      icon: Edit,
      iconColor: '#F59E0B',
    },
    {
      id: 'mock-2',
      category: 'assignment',
      action: 'tech_assigned',
      description: 'Technician assigned to service block',
      detail: { from: 'Unassigned', to: 'Rajesh Kumar' },
      performedBy: 'Operations Admin',
      timestamp: new Date(new Date(createdAt).getTime() + 172800000).toISOString(),
      icon: UserCheck,
      iconColor: '#3B82F6',
    },
    {
      id: 'mock-3',
      category: 'evidence',
      action: 'evidence_uploaded',
      description: 'Service evidence uploaded',
      detail: '3 photos + 1 document uploaded for TKT-2025-10055',
      performedBy: 'Rajesh Kumar',
      timestamp: new Date(new Date(createdAt).getTime() + 259200000).toISOString(),
      icon: Camera,
      iconColor: '#06B6D4',
    },
    {
      id: 'mock-4',
      category: 'billing',
      action: 'invoice_generated',
      description: 'Invoice generated',
      detail: 'INV-2025-00142 generated for billing milestone',
      performedBy: 'System',
      timestamp: new Date(new Date(createdAt).getTime() + 345600000).toISOString(),
      icon: DollarSign,
      iconColor: '#F59E0B',
    },
    {
      id: 'mock-5',
      category: 'evidence',
      action: 'otp_verified',
      description: 'Customer OTP verification completed',
      detail: 'Customer verified service completion via OTP',
      performedBy: 'Amit Shah',
      timestamp: new Date(new Date(createdAt).getTime() + 432000000).toISOString(),
      icon: Shield,
      iconColor: '#10B981',
    },
    {
      id: 'mock-6',
      category: 'content',
      action: 'block_added',
      description: 'Service block added to contract',
      detail: 'Added "Quarterly Maintenance" block',
      performedBy: 'Operations Admin',
      timestamp: new Date(new Date(createdAt).getTime() + 518400000).toISOString(),
      icon: Package,
      iconColor: '#8B5CF6',
    },
    {
      id: 'mock-7',
      category: 'status',
      action: 'event_completed',
      description: 'Service event marked as completed',
      detail: { from: 'in_progress', to: 'completed' },
      performedBy: 'Rajesh Kumar',
      timestamp: new Date(new Date(createdAt).getTime() + 604800000).toISOString(),
      icon: CheckCircle2,
      iconColor: '#10B981',
    },
    {
      id: 'mock-8',
      category: 'assignment',
      action: 'tech_reassigned',
      description: 'Technician reassigned for spare part delivery',
      detail: { from: 'Rajesh Kumar', to: 'Priya Patel' },
      performedBy: 'Operations Admin',
      timestamp: new Date(new Date(createdAt).getTime() + 691200000).toISOString(),
      icon: UserCheck,
      iconColor: '#3B82F6',
    },
  ];

  // Merge and sort newest first
  const all = [...entries, ...mockEntries];
  all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return all;
};

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

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

const AuditTab: React.FC<AuditTabProps> = ({ contract, colors }) => {
  const [filter, setFilter] = useState<AuditCategory>('all');
  const [showCount, setShowCount] = useState(15);

  const allEntries = useMemo(() => buildAuditEntries(contract), [contract]);

  const filtered = useMemo(() => {
    if (filter === 'all') return allEntries;
    return allEntries.filter(e => e.category === filter);
  }, [allEntries, filter]);

  const visible = filtered.slice(0, showCount);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allEntries.length };
    allEntries.forEach(e => {
      counts[e.category] = (counts[e.category] || 0) + 1;
    });
    return counts;
  }, [allEntries]);

  const filterOptions: { key: AuditCategory; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'status', label: 'Status' },
    { key: 'content', label: 'Content' },
    { key: 'assignment', label: 'Assignments' },
    { key: 'evidence', label: 'Evidence' },
    { key: 'billing', label: 'Billing' },
  ];

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
