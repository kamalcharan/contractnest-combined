// KnowledgeTreeDetail.tsx — Full editor matching VaNi Knowledge Tree Builder prototype
// Two-column layout: Content + Right Panel, CRUD on all data types, variant matrix

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, TreePine, Wrench, Package, ClipboardCheck, RefreshCw,
  MapPin, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Plus,
} from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { useKnowledgeTreeSummary } from '@/hooks/queries/useKnowledgeTree';
import type { KnowledgeTreeSummary } from './types';

import VaNiBubble from './components/VaNiBubble';
import RightPanel from './components/RightPanel';
import VariantsTab from './components/VariantsTab';
import SparePartsTab from './components/SparePartsTab';
import CheckpointsTab from './components/CheckpointsTab';
import CyclesTab from './components/CyclesTab';
import OverlaysTab from './components/OverlaysTab';

type DetailTab = 'variants' | 'spare-parts' | 'checkpoints' | 'cycles' | 'overlays';

const KnowledgeTreeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [activeTab, setActiveTab] = useState<DetailTab>('variants');
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: summary, isLoading, error } = useKnowledgeTreeSummary(id);

  // Hydrate selection state from loaded data
  useEffect(() => {
    if (summary?.variants) {
      setSelectedVariantIds(new Set(summary.variants.map((v) => v.id)));
    }
  }, [summary]);

  const toggleVariant = useCallback((variantId: string) => {
    setSelectedVariantIds((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  }, []);

  const toggleAllVariants = useCallback(() => {
    if (!summary) return;
    setSelectedVariantIds((prev) => {
      const allIds = summary.variants.map((v) => v.id);
      const allSelected = allIds.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(allIds);
    });
  }, [summary]);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const borderColor = colors.utility.secondaryText + '15';
  const cardBg = colors.utility.secondaryBackground;

  const tabConfig: { key: DetailTab; label: string; icon: React.ReactNode; count: number }[] = useMemo(() => {
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

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen p-8" style={{ backgroundColor: colors.utility.primaryBackground }}>
        <div className="max-w-[1400px] mx-auto animate-pulse space-y-6">
          <div className="h-8 rounded w-1/3" style={{ backgroundColor: borderColor }} />
          <div className="h-12 rounded w-2/3" style={{ backgroundColor: borderColor }} />
          <div className="h-96 rounded-xl" style={{ backgroundColor: borderColor }} />
        </div>
      </div>
    );
  }

  // Error
  if (error || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.utility.primaryBackground }}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-3" style={{ color: colors.semantic.error }} />
          <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>Knowledge Tree not found</h2>
          <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>{(error as Error)?.message || 'No data available.'}</p>
          <button onClick={() => navigate('/service-contracts/templates/admin/global-templates?tab=knowledge-trees')} className="text-sm font-semibold" style={{ color: colors.brand.primary }}>
            ← Back to Knowledge Trees
          </button>
        </div>
      </div>
    );
  }

  const { resource_template: rt } = summary;

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: colors.utility.primaryBackground }}>
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: cardBg, borderColor }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button onClick={() => navigate('/service-contracts/templates/admin/global-templates?tab=knowledge-trees')} className="flex items-center gap-2 text-sm font-medium mb-3 hover:opacity-80" style={{ color: colors.utility.secondaryText }}>
            <ArrowLeft className="h-4 w-4" /> Back to Knowledge Trees
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#16a34a15', color: '#16a34a' }}>
                <TreePine className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>{rt.name}</h1>
                <p className="text-sm mt-0.5" style={{ color: colors.utility.secondaryText }}>{rt.sub_category} · Knowledge Tree Builder</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: '#16a34a15', color: '#16a34a' }}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Built
            </span>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', minHeight: 'calc(100vh - 140px)' }}>
        {/* Left: Content */}
        <div className="min-w-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b mb-5" style={{ borderColor }}>
            {tabConfig.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px" style={{ borderColor: activeTab === tab.key ? '#ff6b2b' : 'transparent', color: activeTab === tab.key ? '#ff6b2b' : colors.utility.secondaryText }}>
                {tab.icon} {tab.label}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono" style={{ backgroundColor: activeTab === tab.key ? '#ff6b2b15' : colors.utility.primaryBackground, color: activeTab === tab.key ? '#ff6b2b' : colors.utility.secondaryText }}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'variants' && <VariantsTab summary={summary} selectedIds={selectedVariantIds} onToggle={toggleVariant} onToggleAll={toggleAllVariants} colors={colors} />}
          {activeTab === 'spare-parts' && <SparePartsTab summary={summary} selectedVariantIds={selectedVariantIds} colors={colors} expandedGroups={expandedGroups} toggleGroup={toggleGroup} />}
          {activeTab === 'checkpoints' && <CheckpointsTab summary={summary} colors={colors} />}
          {activeTab === 'cycles' && <CyclesTab summary={summary} colors={colors} />}
          {activeTab === 'overlays' && <OverlaysTab summary={summary} colors={colors} />}
        </div>

        {/* Right Panel */}
        <RightPanel summary={summary} selectedVariantCount={selectedVariantIds.size} colors={colors} />
      </div>
    </div>
  );
};

export default KnowledgeTreeDetail;
