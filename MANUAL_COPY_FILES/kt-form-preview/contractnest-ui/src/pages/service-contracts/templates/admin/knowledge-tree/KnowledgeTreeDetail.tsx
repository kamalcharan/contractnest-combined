// KnowledgeTreeDetail.tsx — Full editor with CRUD, two-column layout, right panel
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, TreePine, Wrench, Package, ClipboardCheck, RefreshCw,
  MapPin, CheckCircle2, AlertCircle, Save, History, Loader2, FileText,
} from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import { useKnowledgeTreeSummary, useKnowledgeTreeSave, useCreateSnapshot } from '@/hooks/queries/useKnowledgeTree';
import type { KnowledgeTreeSummary } from './types';

import RightPanel from './components/RightPanel';
import BackupHistoryPanel from './components/BackupHistoryPanel';
import VariantsTab from './components/VariantsTab';
import SparePartsTab from './components/SparePartsTab';
import CheckpointsTab from './components/CheckpointsTab';
import CyclesTab from './components/CyclesTab';
import OverlaysTab from './components/OverlaysTab';
import FormPreviewTab from './components/FormPreviewTab';

type DetailTab = 'variants' | 'spare-parts' | 'checkpoints' | 'cycles' | 'overlays' | 'form-preview';

const KnowledgeTreeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;


  const [activeTab, setActiveTab] = useState<DetailTab>('variants');
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [preEditSnapshotDone, setPreEditSnapshotDone] = useState(false);

  // ── Local CRUD state ──
  const [localVariants, setLocalVariants] = useState<any[]>([]);
  const [localParts, setLocalParts] = useState<Record<string, any[]>>({});
  const [localCheckpoints, setLocalCheckpoints] = useState<Record<string, any[]>>({});
  const [localCycles, setLocalCycles] = useState<any[]>([]);

  const { data: summary, isLoading, error, refetch } = useKnowledgeTreeSummary(id);
  const saveMutation = useKnowledgeTreeSave();
  const snapshotMutation = useCreateSnapshot();

  // Auto-create pre_edit snapshot on first change
  const ensurePreEditSnapshot = useCallback(() => {
    if (!preEditSnapshotDone && id) {
      setPreEditSnapshotDone(true);
      snapshotMutation.mutate({
        resource_template_id: id,
        snapshot_type: 'pre_edit',
        notes: 'Auto-backup before editing session',
      });
    }
  }, [preEditSnapshotDone, id, snapshotMutation]);

  // Hydrate local state from loaded data
  useEffect(() => {
    if (!summary) return;
    setSelectedVariantIds(new Set(summary.variants.map((v) => v.id)));
    setLocalVariants(summary.variants.map((v) => ({ ...v })));
    setLocalParts({ ...summary.spare_parts_by_group });
    setLocalCheckpoints({ ...summary.checkpoints_by_section });
    setLocalCycles(summary.cycles.map((c) => ({ ...c })));
  }, [summary]);

  // ── Mark changed helper ──
  const markChanged = useCallback(() => {
    ensurePreEditSnapshot();
    setHasChanges(true);
  }, [ensurePreEditSnapshot]);

  // ── Variant CRUD ──
  const toggleVariant = useCallback((variantId: string) => {
    markChanged();
    setSelectedVariantIds((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId); else next.add(variantId);
      return next;
    });
  }, [markChanged]);

  const toggleAllVariants = useCallback(() => {
    markChanged();
    setSelectedVariantIds((prev) => {
      const allIds = localVariants.map((v) => v.id);
      return allIds.every((vid) => prev.has(vid)) ? new Set() : new Set(allIds);
    });
  }, [localVariants, markChanged]);

  const addVariant = useCallback((data: Record<string, string>) => {
    markChanged();
    const newVariant = {
      id: crypto.randomUUID(),
      resource_template_id: id,
      name: data.name,
      description: data.description || null,
      capacity_range: data.capacity_range || null,
      attributes: {},
      sort_order: localVariants.length,
      source: 'user_contributed' as const,
    };
    setLocalVariants((prev) => [...prev, newVariant]);
    setSelectedVariantIds((prev) => new Set([...prev, newVariant.id]));
    vaniToast.success(`Variant "${data.name}" added to the knowledge tree`);
  }, [id, localVariants, markChanged]);

  const removeVariant = useCallback((variantId: string, variantName: string) => {
    markChanged();
    setLocalVariants((prev) => prev.filter((v) => v.id !== variantId));
    setSelectedVariantIds((prev) => { const next = new Set(prev); next.delete(variantId); return next; });
    vaniToast.success(`Variant "${variantName}" removed`);
  }, [markChanged]);

  const editVariant = useCallback((variantId: string, data: Record<string, string>) => {
    markChanged();
    setLocalVariants((prev) => prev.map((v) => v.id === variantId ? { ...v, name: data.name, description: data.description || null, capacity_range: data.capacity_range || null } : v));
    vaniToast.success(`Variant "${data.name}" updated`);
  }, [markChanged]);

  // ── Spare Parts CRUD ──
  const addSparePart = useCallback((group: string, data: Record<string, string>) => {
    markChanged();
    const newPart = {
      id: crypto.randomUUID(),
      resource_template_id: id,
      component_group: group,
      name: data.name,
      description: data.description || null,
      specifications: {},
      sort_order: 0,
      source: 'user_contributed',
      variant_applicability: [],
    };
    setLocalParts((prev) => ({ ...prev, [group]: [...(prev[group] || []), newPart] }));
    vaniToast.success(`Part "${data.name}" added to ${group.replace(/_/g, ' ')}`);
  }, [id, markChanged]);

  const removeSparePart = useCallback((group: string, partId: string, partName: string) => {
    markChanged();
    setLocalParts((prev) => ({ ...prev, [group]: (prev[group] || []).filter((p: any) => p.id !== partId) }));
    vaniToast.success(`Part "${partName}" removed`);
  }, [markChanged]);

  const editSparePart = useCallback((group: string, partId: string, data: Record<string, string>) => {
    markChanged();
    setLocalParts((prev) => ({
      ...prev,
      [group]: (prev[group] || []).map((p: any) => p.id === partId ? { ...p, name: data.name, description: data.description || null } : p),
    }));
    vaniToast.success(`Part "${data.name}" updated`);
  }, [markChanged]);

  // Toggle variant mapping for a spare part
  const togglePartVariantMapping = useCallback((group: string, partId: string, variantId: string) => {
    markChanged();
    setLocalParts((prev) => {
      const parts = [...(prev[group] || [])];
      const idx = parts.findIndex((p: any) => p.id === partId);
      if (idx < 0) return prev;
      const part = { ...parts[idx] };
      const va = [...(part.variant_applicability || [])];
      const existingIdx = va.findIndex((m: any) => m.variant_id === variantId);
      if (existingIdx >= 0) {
        va.splice(existingIdx, 1);
      } else {
        va.push({ id: crypto.randomUUID(), spare_part_id: partId, variant_id: variantId, is_recommended: true, notes: null });
      }
      part.variant_applicability = va;
      parts[idx] = part;
      return { ...prev, [group]: parts };
    });
  }, [markChanged]);

  // ── Checkpoint CRUD ──
  const addCheckpoint = useCallback((data: Record<string, string>) => {
    markChanged();
    const section = data.section_name || 'Custom Checkpoints';
    const newCp = {
      id: crypto.randomUUID(), resource_template_id: id,
      checkpoint_type: data.checkpoint_type || 'condition', service_activity: data.service_activity || 'pm',
      section_name: section, name: data.name, description: null, layer: 'equipment',
      unit: data.unit || null, normal_min: data.normal_min ? Number(data.normal_min) : null,
      normal_max: data.normal_max ? Number(data.normal_max) : null,
      amber_threshold: null, red_threshold: null, threshold_note: null,
      source: 'user_contributed', sort_order: 0, values: [], variant_applicability: [],
    };
    setLocalCheckpoints((prev) => ({ ...prev, [section]: [...(prev[section] || []), newCp] }));
    vaniToast.success(`Checkpoint "${data.name}" (${data.checkpoint_type || 'condition'}) added to ${section}`);
  }, [id, markChanged]);

  const addCheckpointValue = useCallback((checkpointId: string, sectionName: string, data: Record<string, string>) => {
    markChanged();
    const newValue = {
      id: crypto.randomUUID(), checkpoint_id: checkpointId,
      label: data.label, severity: data.severity || 'ok',
      triggers_part_consumption: false, requires_photo: false, sort_order: 0,
    };
    setLocalCheckpoints((prev) => {
      const section = [...(prev[sectionName] || [])];
      const cpIndex = section.findIndex((cp: any) => cp.id === checkpointId);
      if (cpIndex >= 0) {
        section[cpIndex] = { ...section[cpIndex], values: [...(section[cpIndex].values || []), newValue] };
      }
      return { ...prev, [sectionName]: section };
    });
    vaniToast.success(`Value "${data.label}" added (${data.severity})`);
  }, [markChanged]);

  const editCheckpoint = useCallback((sectionName: string, checkpointId: string, data: Record<string, any>) => {
    markChanged();
    setLocalCheckpoints((prev) => {
      const updated = { ...prev };
      // If section_name changed, move the checkpoint
      const oldSection = [...(updated[sectionName] || [])];
      const cpIndex = oldSection.findIndex((cp: any) => cp.id === checkpointId);
      if (cpIndex < 0) return prev;

      const cp = { ...oldSection[cpIndex] };
      // Apply all provided fields
      if (data.name !== undefined) cp.name = data.name;
      if (data.description !== undefined) cp.description = data.description || null;
      if (data.threshold_note !== undefined) cp.threshold_note = data.threshold_note || null;
      if (data.unit !== undefined) cp.unit = data.unit;
      if (data.normal_min !== undefined) cp.normal_min = data.normal_min !== '' ? Number(data.normal_min) : null;
      if (data.normal_max !== undefined) cp.normal_max = data.normal_max !== '' ? Number(data.normal_max) : null;
      if (data.amber_threshold !== undefined) cp.amber_threshold = data.amber_threshold !== '' ? Number(data.amber_threshold) : null;
      if (data.red_threshold !== undefined) cp.red_threshold = data.red_threshold !== '' ? Number(data.red_threshold) : null;

      const newSectionName = data.section_name || sectionName;
      if (newSectionName !== sectionName) {
        // Move to new section
        oldSection.splice(cpIndex, 1);
        updated[sectionName] = oldSection;
        if (oldSection.length === 0) delete updated[sectionName];
        cp.section_name = newSectionName;
        updated[newSectionName] = [...(updated[newSectionName] || []), cp];
      } else {
        oldSection[cpIndex] = cp;
        updated[sectionName] = oldSection;
      }
      return updated;
    });
  }, [markChanged]);

  // ── Cycle CRUD ──
  const addCycle = useCallback((data: Record<string, string>) => {
    markChanged();
    const newCycle = {
      id: crypto.randomUUID(), checkpoint_id: data.checkpoint_id || null,
      frequency_value: Number(data.frequency_value) || 90, frequency_unit: data.frequency_unit || 'days',
      varies_by: [], alert_overdue_days: data.alert_overdue_days ? Number(data.alert_overdue_days) : null,
      source: 'user_contributed', checkpoint_name: data.checkpoint_name || 'Custom Cycle', section_name: data.section_name || '',
    };
    setLocalCycles((prev) => [...prev, newCycle]);
    vaniToast.success(`Cycle "${data.checkpoint_name}" added (${data.frequency_value} ${data.frequency_unit})`);
  }, [markChanged]);

  const removeCycle = useCallback((cycleId: string, cycleName: string) => {
    markChanged();
    setLocalCycles((prev) => prev.filter((c) => c.id !== cycleId));
    vaniToast.success(`Cycle "${cycleName}" removed`);
  }, [markChanged]);

  const editCycle = useCallback((cycleId: string, data: Record<string, any>) => {
    markChanged();
    setLocalCycles((prev) => prev.map((c) => {
      if (c.id !== cycleId) return c;
      const updated = { ...c };
      if (data.frequency_value !== undefined) updated.frequency_value = Number(data.frequency_value);
      if (data.frequency_unit !== undefined) updated.frequency_unit = data.frequency_unit;
      if (data.alert_overdue_days !== undefined) updated.alert_overdue_days = data.alert_overdue_days;
      return updated;
    }));
  }, [markChanged]);

  // ── Save handler (full payload) ──
  const handleSave = useCallback(() => {
    if (!id) return;
    const allParts = Object.values(localParts).flat();
    const allCps = Object.values(localCheckpoints).flat();
    const allCpValues = allCps.flatMap((cp: any) => (cp.values || []).map((v: any) => ({ ...v, checkpoint_id: cp.id })));
    const allSpvm = allParts.flatMap((p: any) => (p.variant_applicability || []).map((va: any) => ({ ...va, spare_part_id: p.id })));

    saveMutation.mutate({
      resource_template_id: id,
      variants: localVariants.filter((v) => selectedVariantIds.has(v.id)),
      spare_parts: allParts.map(({ variant_applicability, ...rest }) => rest),
      spare_part_variant_map: allSpvm,
      checkpoints: allCps.map(({ values, variant_applicability, ...rest }) => rest),
      checkpoint_values: allCpValues,
      service_cycles: localCycles,
    }, {
      onSuccess: (data) => {
        const inserted = (data as any).inserted || {};
        const summary = Object.entries(inserted).map(([k, v]) => `${v} ${k.replace(/_/g, ' ')}`).join(', ');
        vaniToast.success(`Knowledge Tree saved — ${summary || 'all data saved'}`);
        setHasChanges(false);
      },
      onError: (err) => { vaniToast.error(`Save failed: ${(err as Error).message}`); },
    });
  }, [id, localVariants, localParts, localCheckpoints, localCycles, selectedVariantIds, saveMutation]);

  // ── Expand/collapse ──
  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  }, []);

  // ── Counts for tabs + right panel ──
  const allPartsCount = useMemo(() => Object.values(localParts).flat().length, [localParts]);
  const allCheckpointsFlat = useMemo(() => Object.values(localCheckpoints).flat(), [localCheckpoints]);
  const serviceActivities = useMemo(() => [...new Set(allCheckpointsFlat.map((c: any) => c.service_activity))], [allCheckpointsFlat]);

  const borderColor = colors.utility.secondaryText + '15';
  const cardBg = colors.utility.secondaryBackground;

  const tabConfig: { key: DetailTab; label: string; icon: React.ReactNode; count: number }[] = useMemo(() => [
    { key: 'variants', label: 'Variants', icon: <Wrench className="h-4 w-4" />, count: localVariants.length },
    { key: 'spare-parts', label: 'Spare Parts', icon: <Package className="h-4 w-4" />, count: allPartsCount },
    { key: 'checkpoints', label: 'Checkpoints', icon: <ClipboardCheck className="h-4 w-4" />, count: allCheckpointsFlat.length },
    { key: 'cycles', label: 'Service Cycles', icon: <RefreshCw className="h-4 w-4" />, count: localCycles.length },
    { key: 'overlays', label: 'Overlays', icon: <MapPin className="h-4 w-4" />, count: summary?.summary.overlays_count || 0 },
    { key: 'form-preview', label: 'Form Preview', icon: <FileText className="h-4 w-4" />, count: allCheckpointsFlat.length },
  ], [localVariants, allPartsCount, allCheckpointsFlat, localCycles, summary]);

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

  if (error || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.utility.primaryBackground }}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-3" style={{ color: colors.semantic.error }} />
          <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>Knowledge Tree not found</h2>
          <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>{(error as Error)?.message || 'No data available.'}</p>
          <button onClick={() => navigate('/service-contracts/templates/admin/global-templates?tab=knowledge-trees')} className="text-sm font-semibold" style={{ color: colors.brand.primary }}>← Back</button>
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
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: colors.semantic.success + '15', color: colors.semantic.success }}>
                <TreePine className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>{rt.name}</h1>
                <p className="text-sm mt-0.5" style={{ color: colors.utility.secondaryText }}>{rt.sub_category} · Knowledge Tree Builder</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowBackupPanel(true)} className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all hover:opacity-80" style={{ background: colors.utility.primaryBackground, color: colors.utility.secondaryText, border: `1px solid ${borderColor}` }}>
                <History className="h-3.5 w-3.5" /> Backup History
              </button>
              {hasChanges && (
                <button onClick={handleSave} disabled={saveMutation.isPending} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90" style={{ background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})` }}>
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              )}
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: colors.semantic.success + '15', color: colors.semantic.success }}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Built
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', minHeight: 'calc(100vh - 140px)' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-1 border-b mb-5" style={{ borderColor }}>
            {tabConfig.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px" style={{ borderColor: activeTab === tab.key ? colors.brand.primary : 'transparent', color: activeTab === tab.key ? colors.brand.primary : colors.utility.secondaryText }}>
                {tab.icon} {tab.label}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono" style={{ backgroundColor: activeTab === tab.key ? colors.brand.primary + '15' : colors.utility.primaryBackground, color: activeTab === tab.key ? colors.brand.primary : colors.utility.secondaryText }}>{tab.count}</span>
              </button>
            ))}
          </div>

          {activeTab === 'variants' && <VariantsTab summary={summary} variants={localVariants} selectedIds={selectedVariantIds} onToggle={toggleVariant} onToggleAll={toggleAllVariants} onAdd={addVariant} onRemove={removeVariant} onEdit={editVariant} colors={colors} />}
          {activeTab === 'spare-parts' && <SparePartsTab summary={summary} variants={localVariants} partsByGroup={localParts} selectedVariantIds={selectedVariantIds} onAddPart={addSparePart} onRemovePart={removeSparePart} onEditPart={editSparePart} onToggleMapping={togglePartVariantMapping} colors={colors} expandedGroups={expandedGroups} toggleGroup={toggleGroup} />}
          {activeTab === 'checkpoints' && <CheckpointsTab summary={summary} checkpointsBySection={localCheckpoints} onAddCheckpoint={addCheckpoint} onAddValue={addCheckpointValue} onEditCheckpoint={editCheckpoint} colors={colors} />}
          {activeTab === 'cycles' && <CyclesTab summary={summary} cycles={localCycles} onAdd={addCycle} onRemove={removeCycle} onEditCycle={editCycle} colors={colors} />}
          {activeTab === 'overlays' && <OverlaysTab summary={summary} colors={colors} />}
          {activeTab === 'form-preview' && <FormPreviewTab summary={summary} variants={localVariants} checkpointsBySection={localCheckpoints} partsByGroup={localParts} selectedVariantIds={selectedVariantIds} colors={colors} />}
        </div>

        {showBackupPanel && (
          <BackupHistoryPanel resourceTemplateId={id!} resourceName={rt.name} onClose={() => setShowBackupPanel(false)} onRestored={() => { setShowBackupPanel(false); refetch(); setHasChanges(false); }} colors={colors} />
        )}
        <RightPanel summary={summary} selectedVariantCount={selectedVariantIds.size} partsCount={allPartsCount} checkpointsCount={allCheckpointsFlat.length} cyclesCount={localCycles.length} serviceActivities={serviceActivities} colors={colors} />
      </div>
    </div>
  );
};

export default KnowledgeTreeDetail;
