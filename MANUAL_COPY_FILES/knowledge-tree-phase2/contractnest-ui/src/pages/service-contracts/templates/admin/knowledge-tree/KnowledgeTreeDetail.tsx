// src/pages/service-contracts/templates/admin/knowledge-tree/KnowledgeTreeDetail.tsx
// Read-only detail page — shows full Knowledge Tree for a resource template

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  TreePine,
  Wrench,
  Package,
  ClipboardCheck,
  RefreshCw,
  MapPin,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Gauge,
  Layers,
} from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { useKnowledgeTreeSummary } from '@/hooks/queries/useKnowledgeTree';
import type { KnowledgeTreeSummary } from './types';

// ── Severity badge colors ──────────────────────────────────────────
const severityConfig: Record<string, { bg: string; text: string; label: string }> = {
  ok: { bg: '#16a34a15', text: '#16a34a', label: 'OK' },
  attention: { bg: '#d9770615', text: '#d97706', label: 'Attention' },
  critical: { bg: '#dc262615', text: '#dc2626', label: 'Critical' },
};

// ── Tab type ───────────────────────────────────────────────────────
type DetailTab = 'variants' | 'spare-parts' | 'checkpoints' | 'cycles' | 'overlays';

const KnowledgeTreeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [activeTab, setActiveTab] = useState<DetailTab>('variants');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: summary, isLoading, error } = useKnowledgeTreeSummary(id);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const borderColor = colors.utility.secondaryText + '15';
  const cardBg = colors.utility.secondaryBackground;

  const tabs: { key: DetailTab; label: string; icon: React.ReactNode; count: number }[] = useMemo(() => {
    if (!summary) return [];
    const s = summary.summary;
    return [
      { key: 'variants', label: 'Variants', icon: <Wrench className="h-4 w-4" />, count: s.variants_count },
      { key: 'spare-parts', label: 'Spare Parts', icon: <Package className="h-4 w-4" />, count: s.spare_parts_count },
      { key: 'checkpoints', label: 'Checkpoints', icon: <ClipboardCheck className="h-4 w-4" />, count: s.checkpoints_count },
      { key: 'cycles', label: 'Service Cycles', icon: <RefreshCw className="h-4 w-4" />, count: s.cycles_count },
      { key: 'overlays', label: 'Overlays', icon: <MapPin className="h-4 w-4" />, count: s.overlays_count },
    ];
  }, [summary]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen p-8" style={{ backgroundColor: colors.utility.primaryBackground }}>
        <div className="max-w-[1400px] mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 rounded w-1/3" style={{ backgroundColor: borderColor }} />
            <div className="h-12 rounded w-2/3" style={{ backgroundColor: borderColor }} />
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl" style={{ backgroundColor: borderColor }} />
              ))}
            </div>
            <div className="h-96 rounded-xl" style={{ backgroundColor: borderColor }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.utility.primaryBackground }}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-3" style={{ color: colors.semantic.error }} />
          <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
            Knowledge Tree not found
          </h2>
          <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
            {(error as Error)?.message || 'No data available for this resource template.'}
          </p>
          <button
            onClick={() => navigate('/service-contracts/templates/admin/global-templates?tab=knowledge-trees')}
            className="text-sm font-semibold"
            style={{ color: colors.brand.primary }}
          >
            ← Back to Knowledge Trees
          </button>
        </div>
      </div>
    );
  }

  const { resource_template: rt, summary: stats } = summary;

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: colors.utility.primaryBackground }}>
      {/* ── Header ── */}
      <div className="border-b" style={{ backgroundColor: cardBg, borderColor }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <button
            onClick={() => navigate('/service-contracts/templates/admin/global-templates?tab=knowledge-trees')}
            className="flex items-center gap-2 text-sm font-medium mb-3 hover:opacity-80"
            style={{ color: colors.utility.secondaryText }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Knowledge Trees
          </button>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#16a34a15', color: '#16a34a' }}
              >
                <TreePine className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
                  {rt.name}
                </h1>
                <p className="text-sm mt-0.5" style={{ color: colors.utility.secondaryText }}>
                  {rt.sub_category} · {rt.scope === 'cross_industry' ? 'Cross-Industry' : 'Industry Specific'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ backgroundColor: '#16a34a15', color: '#16a34a' }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Knowledge Tree Built
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniStat label="Variants" value={stats.variants_count} icon={<Wrench className="h-3.5 w-3.5" />} color="#3B82F6" colors={colors} />
          <MiniStat label="Spare Parts" value={stats.spare_parts_count} icon={<Package className="h-3.5 w-3.5" />} color="#8B5CF6" colors={colors} />
          <MiniStat label="Part Groups" value={stats.component_groups.length} icon={<Layers className="h-3.5 w-3.5" />} color="#6366F1" colors={colors} />
          <MiniStat label="Checkpoints" value={stats.checkpoints_count} icon={<ClipboardCheck className="h-3.5 w-3.5" />} color="#F59E0B" colors={colors} />
          <MiniStat label="Cycles" value={stats.cycles_count} icon={<RefreshCw className="h-3.5 w-3.5" />} color="#10B981" colors={colors} />
          <MiniStat label="Overlays" value={stats.overlays_count} icon={<MapPin className="h-3.5 w-3.5" />} color="#EF4444" colors={colors} />
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 mt-6 border-b" style={{ borderColor }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px"
              style={{
                borderColor: activeTab === tab.key ? colors.brand.primary : 'transparent',
                color: activeTab === tab.key ? colors.brand.primary : colors.utility.secondaryText,
              }}
            >
              {tab.icon}
              {tab.label}
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono"
                style={{
                  backgroundColor: activeTab === tab.key ? colors.brand.primary + '15' : colors.utility.primaryBackground,
                  color: activeTab === tab.key ? colors.brand.primary : colors.utility.secondaryText,
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="mt-5">
          {activeTab === 'variants' && <VariantsTab summary={summary} colors={colors} borderColor={borderColor} cardBg={cardBg} />}
          {activeTab === 'spare-parts' && <SparePartsTab summary={summary} colors={colors} borderColor={borderColor} cardBg={cardBg} expandedGroups={expandedGroups} toggleGroup={toggleGroup} />}
          {activeTab === 'checkpoints' && <CheckpointsTab summary={summary} colors={colors} borderColor={borderColor} cardBg={cardBg} expandedGroups={expandedGroups} toggleGroup={toggleGroup} />}
          {activeTab === 'cycles' && <CyclesTab summary={summary} colors={colors} borderColor={borderColor} cardBg={cardBg} />}
          {activeTab === 'overlays' && <OverlaysTab summary={summary} colors={colors} borderColor={borderColor} cardBg={cardBg} />}
        </div>
      </div>
    </div>
  );
};

// ── MiniStat ────────────────────────────────────────────────────────
const MiniStat: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string; colors: any }> = ({
  label, value, icon, color, colors,
}) => (
  <div className="rounded-xl border p-4" style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.secondaryText + '15' }}>
    <div className="flex items-center gap-2 mb-2">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '15', color }}>
        {icon}
      </div>
      <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>{label}</span>
    </div>
    <div className="text-2xl font-black font-mono" style={{ color: colors.utility.primaryText }}>{value}</div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════
// TAB: VARIANTS
// ══════════════════════════════════════════════════════════════════════
const VariantsTab: React.FC<{ summary: KnowledgeTreeSummary; colors: any; borderColor: string; cardBg: string }> = ({
  summary, colors, borderColor, cardBg,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {summary.variants.map((v) => (
      <div key={v.id} className="rounded-xl border p-5" style={{ backgroundColor: cardBg, borderColor }}>
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-[15px]" style={{ color: colors.utility.primaryText }}>{v.name}</h3>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full"
            style={{ backgroundColor: colors.utility.primaryBackground, color: colors.utility.secondaryText }}
          >
            {v.source === 'ai_researched' ? 'AI' : 'User'}
          </span>
        </div>
        {v.description && (
          <p className="text-xs mb-2 leading-relaxed" style={{ color: colors.utility.secondaryText }}>{v.description}</p>
        )}
        {v.capacity_range && (
          <div
            className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg"
            style={{ backgroundColor: '#3B82F610', color: '#3B82F6' }}
          >
            <Gauge className="h-3 w-3" />
            {v.capacity_range}
          </div>
        )}
      </div>
    ))}
  </div>
);

// ══════════════════════════════════════════════════════════════════════
// TAB: SPARE PARTS
// ══════════════════════════════════════════════════════════════════════
const groupIcons: Record<string, string> = {
  electrical: '⚡', mechanical: '⚙️', refrigerant: '🧊', filters: '🌀',
  water_side: '💧', controls: '🖥️', consumables: '🧴',
};

const SparePartsTab: React.FC<{
  summary: KnowledgeTreeSummary; colors: any; borderColor: string; cardBg: string;
  expandedGroups: Set<string>; toggleGroup: (k: string) => void;
}> = ({ summary, colors, borderColor, cardBg, expandedGroups, toggleGroup }) => {
  const groups = Object.entries(summary.spare_parts_by_group);
  return (
    <div className="space-y-3">
      {groups.map(([groupName, parts]) => {
        const isOpen = expandedGroups.has(groupName);
        return (
          <div key={groupName} className="rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor }}>
            <button
              onClick={() => toggleGroup(groupName)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:opacity-90"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{groupIcons[groupName] || '📦'}</span>
                <span className="font-semibold text-sm capitalize" style={{ color: colors.utility.primaryText }}>
                  {groupName.replace(/_/g, ' ')}
                </span>
                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: colors.utility.primaryBackground, color: colors.utility.secondaryText }}
                >
                  {parts.length} items
                </span>
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" style={{ color: colors.utility.secondaryText }} /> : <ChevronDown className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />}
            </button>
            {isOpen && (
              <div className="border-t" style={{ borderColor }}>
                {/* Header */}
                <div className="grid px-5 py-2 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: colors.utility.secondaryText, gridTemplateColumns: '1fr auto' }}
                >
                  <span>Part Name</span>
                  <span>Variants Mapped</span>
                </div>
                {/* Rows */}
                {parts.map((part: any) => (
                  <div
                    key={part.id}
                    className="grid px-5 py-2.5 border-t text-sm"
                    style={{ borderColor, gridTemplateColumns: '1fr auto', color: colors.utility.primaryText }}
                  >
                    <span>{part.name}</span>
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#8B5CF615', color: '#8B5CF6' }}
                    >
                      {part.variant_applicability?.length || 0}/{summary.variants.length}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// TAB: CHECKPOINTS
// ══════════════════════════════════════════════════════════════════════
const CheckpointsTab: React.FC<{
  summary: KnowledgeTreeSummary; colors: any; borderColor: string; cardBg: string;
  expandedGroups: Set<string>; toggleGroup: (k: string) => void;
}> = ({ summary, colors, borderColor, cardBg, expandedGroups, toggleGroup }) => {
  const sections = Object.entries(summary.checkpoints_by_section);
  return (
    <div className="space-y-3">
      {sections.map(([sectionName, checkpoints]) => {
        const isOpen = expandedGroups.has(`cp-${sectionName}`);
        const condCount = checkpoints.filter((c: any) => c.checkpoint_type === 'condition').length;
        const readCount = checkpoints.filter((c: any) => c.checkpoint_type === 'reading').length;
        return (
          <div key={sectionName} className="rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor }}>
            <button
              onClick={() => toggleGroup(`cp-${sectionName}`)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:opacity-90"
            >
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-4 w-4" style={{ color: '#F59E0B' }} />
                <span className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>{sectionName}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F59E0B15', color: '#F59E0B' }}>
                  {condCount} condition
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: '#3B82F615', color: '#3B82F6' }}>
                  {readCount} reading
                </span>
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" style={{ color: colors.utility.secondaryText }} /> : <ChevronDown className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />}
            </button>
            {isOpen && (
              <div className="border-t space-y-0" style={{ borderColor }}>
                {checkpoints.map((cp: any) => (
                  <div key={cp.id} className="px-5 py-3 border-t first:border-t-0" style={{ borderColor }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>{cp.name}</span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase"
                        style={{
                          backgroundColor: cp.checkpoint_type === 'condition' ? '#F59E0B15' : '#3B82F615',
                          color: cp.checkpoint_type === 'condition' ? '#F59E0B' : '#3B82F6',
                        }}
                      >
                        {cp.checkpoint_type}
                      </span>
                    </div>
                    {/* Condition type: show values */}
                    {cp.checkpoint_type === 'condition' && cp.values?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {cp.values.map((v: any) => (
                          <span
                            key={v.id}
                            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: severityConfig[v.severity]?.bg || '#f3f4f6',
                              color: severityConfig[v.severity]?.text || '#6b7280',
                            }}
                          >
                            {v.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Reading type: show thresholds */}
                    {cp.checkpoint_type === 'reading' && (
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs" style={{ color: colors.utility.secondaryText }}>
                        {cp.unit && <span className="font-mono font-semibold" style={{ color: '#3B82F6' }}>Unit: {cp.unit}</span>}
                        {cp.normal_min != null && cp.normal_max != null && (
                          <span>Normal: <span className="font-mono">{cp.normal_min}–{cp.normal_max}</span></span>
                        )}
                        {cp.amber_threshold != null && (
                          <span style={{ color: '#d97706' }}>⚠ Amber: <span className="font-mono">{cp.amber_threshold}</span></span>
                        )}
                        {cp.red_threshold != null && (
                          <span style={{ color: '#dc2626' }}>🔴 Red: <span className="font-mono">{cp.red_threshold}</span></span>
                        )}
                        {cp.threshold_note && <span className="italic">({cp.threshold_note})</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// TAB: SERVICE CYCLES
// ══════════════════════════════════════════════════════════════════════
const CyclesTab: React.FC<{ summary: KnowledgeTreeSummary; colors: any; borderColor: string; cardBg: string }> = ({
  summary, colors, borderColor, cardBg,
}) => (
  <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor }}>
    {/* Header */}
    <div
      className="grid px-5 py-3 text-[10px] font-semibold uppercase tracking-wider border-b"
      style={{ color: colors.utility.secondaryText, borderColor, gridTemplateColumns: '1fr 140px 1fr 100px' }}
    >
      <span>Checkpoint</span>
      <span>Frequency</span>
      <span>Varies By</span>
      <span>Alert Overdue</span>
    </div>
    {/* Rows */}
    {summary.cycles.length === 0 ? (
      <div className="px-5 py-8 text-center text-sm" style={{ color: colors.utility.secondaryText }}>
        No service cycles defined
      </div>
    ) : (
      summary.cycles.map((cy) => (
        <div
          key={cy.id}
          className="grid px-5 py-3 border-t text-sm items-center"
          style={{ borderColor, gridTemplateColumns: '1fr 140px 1fr 100px' }}
        >
          <div>
            <div style={{ color: colors.utility.primaryText }}>{cy.checkpoint_name || 'Unknown'}</div>
            <div className="text-[10px]" style={{ color: colors.utility.secondaryText }}>{cy.section_name}</div>
          </div>
          <div className="font-mono text-xs font-semibold" style={{ color: colors.brand.primary }}>
            {cy.frequency_value} {cy.frequency_unit}
          </div>
          <div className="flex flex-wrap gap-1">
            {(cy.varies_by || []).map((factor: string, i: number) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: colors.utility.primaryBackground, color: colors.utility.secondaryText }}
              >
                {factor}
              </span>
            ))}
          </div>
          <div className="text-xs font-mono" style={{ color: cy.alert_overdue_days ? '#d97706' : colors.utility.secondaryText }}>
            {cy.alert_overdue_days ? `${cy.alert_overdue_days} days` : '—'}
          </div>
        </div>
      ))
    )}
  </div>
);

// ══════════════════════════════════════════════════════════════════════
// TAB: OVERLAYS
// ══════════════════════════════════════════════════════════════════════
const OverlaysTab: React.FC<{ summary: KnowledgeTreeSummary; colors: any; borderColor: string; cardBg: string }> = ({
  summary, colors, borderColor, cardBg,
}) => {
  const groups = Object.entries(summary.overlays_by_type);
  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: colors.utility.secondaryText }} />
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>No context overlays defined for this equipment type</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {groups.map(([contextType, overlays]) => (
        <div key={contextType} className="rounded-xl border p-5" style={{ backgroundColor: cardBg, borderColor }}>
          <h3 className="font-semibold text-sm mb-3 capitalize" style={{ color: colors.utility.primaryText }}>
            {contextType.replace(/_/g, ' ')} Overlays
          </h3>
          <div className="space-y-2">
            {overlays.map((o: any) => (
              <div key={o.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: colors.utility.primaryBackground }}>
                <span className="text-xs font-semibold px-2 py-1 rounded-full capitalize" style={{ backgroundColor: '#EF444415', color: '#EF4444' }}>
                  {o.context_value}
                </span>
                <div className="flex-1 text-xs" style={{ color: colors.utility.secondaryText }}>
                  <pre className="whitespace-pre-wrap font-mono text-[11px]">
                    {JSON.stringify(o.adjustments, null, 2)}
                  </pre>
                </div>
                <span className="text-[10px] font-mono" style={{ color: colors.utility.secondaryText }}>
                  Priority: {o.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KnowledgeTreeDetail;
