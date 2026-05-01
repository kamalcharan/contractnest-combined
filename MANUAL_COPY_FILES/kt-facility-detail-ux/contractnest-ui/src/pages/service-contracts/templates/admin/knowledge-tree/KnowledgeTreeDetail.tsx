// KnowledgeTreeDetail.tsx — Full editor with CRUD, two-column layout, right panel
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, TreePine, Wrench, Package, ClipboardCheck, RefreshCw,
  MapPin, CheckCircle2, AlertCircle, Save, History, Loader2, FileText, Trash2, AlertTriangle, Plus, ShieldCheck, Building2,
} from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import {
  useKnowledgeTreeSummary, useKnowledgeTreeSave, useCreateSnapshot,
  useKnowledgeTreeDelete, useKnowledgeTreeGenerate,
  useUpsertEquipmentMeta, useTagCompliance,
} from '@/hooks/queries/useKnowledgeTree';
import type { KnowledgeTreeSummary } from './types';
import KTGenerationModal from './components/KTGenerationModal';

import RightPanel from './components/RightPanel';
import BackupHistoryPanel from './components/BackupHistoryPanel';
import VariantsTab from './components/VariantsTab';
import SparePartsTab from './components/SparePartsTab';
import CheckpointsTab from './components/CheckpointsTab';
import CyclesTab from './components/CyclesTab';
import OverlaysTab from './components/OverlaysTab';
import FormPreviewTab from './components/FormPreviewTab';

type DetailTab = 'variants' | 'spare-parts' | 'checkpoints' | 'cycles' | 'overlays' | 'form-preview';

const EQUIPMENT_ACTIVITY_CONFIG = [
  { key: 'pm',           label: 'Preventive Maintenance', short: 'PM' },
  { key: 'repair',       label: 'Breakdown / Repair',     short: 'Repair' },
  { key: 'inspection',   label: 'Inspection',             short: 'Inspect' },
  { key: 'install',      label: 'Installation',           short: 'Install' },
  { key: 'decommission', label: 'Decommission',           short: 'Decomm' },
] as const;

// Facilities use only scheduled service activities — installation and decommission are not KT concepts for facilities
const FACILITY_ACTIVITY_CONFIG = [
  { key: 'pm', label: 'Preventive Maintenance', short: 'PM' },
] as const;

const CRITICALITY_OPTIONS = [
  { value: 'standard',         label: '🟢 Standard' },
  { value: 'mission_critical', label: '🟠 Mission Critical' },
  { value: 'life_critical',    label: '🔴 Life Critical' },
] as const;

const KnowledgeTreeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFacility = searchParams.get('type') === 'facility';
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
  const deleteMutation = useKnowledgeTreeDelete();
  const upsertMetaMutation = useUpsertEquipmentMeta();
  const tagComplianceMutation = useTagCompliance();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isTaggingCompliance, setIsTaggingCompliance] = useState(false);

  const { generate: ktGenerate, phase: ktPhase, isActive: ktIsActive, errorMessage: ktError, reset: ktReset } = useKnowledgeTreeGenerate();
  const [addingActivity, setAddingActivity] = useState<string | null>(null);

  // Criticality — local state mirrors summary.equipment_meta, editable inline
  const [localCriticality, setLocalCriticality] = useState<'life_critical' | 'mission_critical' | 'standard'>('standard');

  useEffect(() => {
    if (summary?.equipment_meta?.equipment_criticality) {
      setLocalCriticality(summary.equipment_meta.equipment_criticality);
    }
  }, [summary?.equipment_meta]);

  const handleCriticalityChange = useCallback(async (value: 'life_critical' | 'mission_critical' | 'standard') => {
    if (!id) return;
    setLocalCriticality(value);
    try {
      await upsertMetaMutation.mutateAsync({
        resource_template_id: id,
        equipment_criticality: value,
        calibration_interval_days: summary?.equipment_meta?.calibration_interval_days ?? null,
        notes: summary?.equipment_meta?.notes ?? null,
      });
      vaniToast.success(`Criticality set to ${CRITICALITY_OPTIONS.find((o) => o.value === value)?.label || value}`);
    } catch (err) {
      vaniToast.error(`Failed to update criticality: ${(err as Error).message}`);
      setLocalCriticality(summary?.equipment_meta?.equipment_criticality || 'standard');
    }
  }, [id, summary, upsertMetaMutation]);

  const handleTagCompliance = useCallback(async () => {
    if (!id || !summary) return;
    const allCheckpoints = Object.values(localCheckpoints).flat();
    if (allCheckpoints.length === 0) {
      vaniToast.warning('No checkpoints to tag');
      return;
    }

    setIsTaggingCompliance(true);
    try {
      // Phase 1: call API layer → LLM tags compliance
      const { default: api } = await import('@/services/api');
      const response = await api.post('/api/knowledge-tree/tag-compliance', {
        equipmentName: summary.resource_template.name,
        subCategory: summary.resource_template.sub_category,
        resourceTemplateId: id,
        checkpoints: allCheckpoints.map((cp: any) => ({
          id: cp.id,
          name: cp.name,
          section_name: cp.section_name,
          service_activity: cp.service_activity,
        })),
      }, { timeout: 120000 });

      if (!response.data?.success) {
        throw new Error(response.data?.error?.message || 'Tagging failed');
      }

      // Phase 2: save tags to DB via edge function
      await tagComplianceMutation.mutateAsync({
        resource_template_id: id,
        tags: response.data.data.tags,
      });

      const tagged = response.data.data.tags.filter((t: any) => t.compliance_standard).length;
      const mandatory = response.data.data.tags.filter((t: any) => t.is_mandatory).length;
      vaniToast.success(`Compliance tagged — ${tagged} standards applied, ${mandatory} mandatory checkpoints`);
      refetch();
    } catch (err) {
      vaniToast.error(`Compliance tagging failed: ${(err as Error).message}`);
    } finally {
      setIsTaggingCompliance(false);
    }
  }, [id, summary, localCheckpoints, tagComplianceMutation, refetch]);

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

  // ── Variant / Zone CRUD ──
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
    vaniToast.success(`${isFacility ? 'Zone' : 'Variant'} "${data.name}" added to the knowledge tree`);
  }, [id, localVariants, markChanged, isFacility]);

  const removeVariant = useCallback((variantId: string, variantName: string) => {
    markChanged();
    setLocalVariants((prev) => prev.filter((v) => v.id !== variantId));
    setSelectedVariantIds((prev) => { const next = new Set(prev); next.delete(variantId); return next; });
    vaniToast.success(`${isFacility ? 'Zone' : 'Variant'} "${variantName}" removed`);
  }, [markChanged, isFacility]);

  const editVariant = useCallback((variantId: string, data: Record<string, string>) => {
    markChanged();
    setLocalVariants((prev) => prev.map((v) => v.id === variantId ? { ...v, name: data.name, description: data.description || null, capacity_range: data.capacity_range || null } : v));
    vaniToast.success(`${isFacility ? 'Zone' : 'Variant'} "${data.name}" updated`);
  }, [markChanged, isFacility]);

  // ── Spare Parts / Consumables CRUD ──
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
    vaniToast.success(`${isFacility ? 'Consumable' : 'Part'} "${data.name}" added to ${group.replace(/_/g, ' ')}`);
  }, [id, markChanged, isFacility]);

  const removeSparePart = useCallback((group: string, partId: string, partName: string) => {
    markChanged();
    setLocalParts((prev) => ({ ...prev, [group]: (prev[group] || []).filter((p: any) => p.id !== partId) }));
    vaniToast.success(`${isFacility ? 'Consumable' : 'Part'} "${partName}" removed`);
  }, [markChanged, isFacility]);

  const editSparePart = useCallback((group: string, partId: string, data: Record<string, string>) => {
    markChanged();
    setLocalParts((prev) => ({
      ...prev,
      [group]: (prev[group] || []).map((p: any) => p.id === partId ? { ...p, name: data.name, description: data.description || null } : p),
    }));
    vaniToast.success(`${isFacility ? 'Consumable' : 'Part'} "${data.name}" updated`);
  }, [markChanged, isFacility]);

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
      compliance_standard: null, is_mandatory: false,
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
      const oldSection = [...(updated[sectionName] || [])];
      const cpIndex = oldSection.findIndex((cp: any) => cp.id === checkpointId);
      if (cpIndex < 0) return prev;

      const cp = { ...oldSection[cpIndex] };
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
        const summaryMsg = Object.entries(inserted).map(([k, v]) => `${v} ${k.replace(/_/g, ' ')}`).join(', ');
        vaniToast.success(`Knowledge Tree saved — ${summaryMsg || 'all data saved'}`);
        setHasChanges(false);
      },
      onError: (err) => { vaniToast.error(`Save failed: ${(err as Error).message}`); },
    });
  }, [id, localVariants, localParts, localCheckpoints, localCycles, selectedVariantIds, saveMutation]);

  const handleAddActivity = useCallback(async (activityKey: string, activityLabel: string) => {
    if (!id || !summary) return;
    setAddingActivity(activityLabel);
    const result = await ktGenerate({
      resourceTemplateId: id,
      equipmentName: summary.resource_template.name,
      subCategory: summary.resource_template.sub_category,
      serviceActivity: activityKey,
      existingKT: true,
    });
    if (result) {
      vaniToast.success(`${activityLabel} activity added to Knowledge Tree`);
      refetch();
    }
    setAddingActivity(null);
  }, [id, summary, ktGenerate, refetch]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
      vaniToast.success('Knowledge Tree deleted successfully');
      navigate('/service-contracts/templates/admin/global-templates?tab=knowledge-trees');
    } catch (err) {
      vaniToast.error(`Delete failed: ${(err as Error).message}`);
    }
  }, [id, deleteMutation, navigate]);

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

  // Activity config is facility-specific — facilities only use PM scheduling
  const activityConfig = isFacility ? FACILITY_ACTIVITY_CONFIG : EQUIPMENT_ACTIVITY_CONFIG;

  const tabConfig: { key: DetailTab; label: string; icon: React.ReactNode; count: number }[] = useMemo(() => [
    {
      key: 'variants',
      label: isFacility ? 'Zones' : 'Variants',
      icon: isFacility ? <Building2 className="h-4 w-4" /> : <Wrench className="h-4 w-4" />,
      count: localVariants.length,
    },
    {
      key: 'spare-parts',
      label: isFacility ? 'Consumables' : 'Spare Parts',
      icon: <Package className="h-4 w-4" />,
      count: allPartsCount,
    },
    { key: 'checkpoints', label: 'Checkpoints', icon: <ClipboardCheck className="h-4 w-4" />, count: allCheckpointsFlat.length },
    { key: 'cycles', label: 'Service Cycles', icon: <RefreshCw className="h-4 w-4" />, count: localCycles.length },
    { key: 'overlays', label: 'Overlays', icon: <MapPin className="h-4 w-4" />, count: summary?.summary.overlays_count || 0 },
    { key: 'form-preview', label: 'Form Preview', icon: <FileText className="h-4 w-4" />, count: allCheckpointsFlat.length },
  ], [localVariants, allPartsCount, allCheckpointsFlat, localCycles, summary, isFacility]);

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
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: isFacility ? '#8B5CF615' : colors.semantic.success + '15',
                  color: isFacility ? '#8B5CF6' : colors.semantic.success,
                }}
              >
                {isFacility ? <Building2 className="h-6 w-6" /> : <TreePine className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>{rt.name}</h1>
                  {isFacility && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#8B5CF615', color: '#8B5CF6' }}>
                      Facility
                    </span>
                  )}
                </div>
                <p className="text-sm mt-0.5" style={{ color: colors.utility.secondaryText }}>{rt.sub_category} · Knowledge Tree Builder</p>
                {/* Activity badges + criticality row */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {activityConfig.map((activity) => {
                    const isBuilt = serviceActivities.includes(activity.key);
                    return isBuilt ? (
                      <span
                        key={activity.key}
                        className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium"
                        style={{ backgroundColor: colors.semantic.success + '15', color: colors.semantic.success }}
                      >
                        <CheckCircle2 className="h-3 w-3" /> {activity.short}
                      </span>
                    ) : (
                      <button
                        key={activity.key}
                        onClick={() => handleAddActivity(activity.key, activity.label)}
                        disabled={ktIsActive}
                        className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium border transition-all hover:opacity-80 disabled:opacity-40"
                        style={{ borderColor: colors.brand.primary + '40', color: colors.brand.primary, backgroundColor: colors.brand.primary + '08' }}
                      >
                        <Plus className="h-3 w-3" /> {activity.short}
                      </button>
                    );
                  })}

                  {/* Separator */}
                  <span style={{ width: '1px', height: '16px', background: colors.utility.secondaryText + '30', flexShrink: 0 }} />

                  {/* Criticality inline selector */}
                  <select
                    value={localCriticality}
                    onChange={(e) => handleCriticalityChange(e.target.value as any)}
                    disabled={upsertMetaMutation.isPending}
                    style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', border: `1px solid ${borderColor}`, background: colors.utility.primaryBackground, color: colors.utility.primaryText, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                    title={isFacility ? 'Facility criticality level' : 'Equipment criticality level'}
                  >
                    {CRITICALITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Tag Compliance button */}
              <button
                onClick={handleTagCompliance}
                disabled={isTaggingCompliance || allCheckpointsFlat.length === 0}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
                style={{ background: '#0891b210', color: '#0891b2', border: '1px solid #0891b230' }}
                title="Auto-tag compliance standards using VaNi AI"
              >
                {isTaggingCompliance ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {isTaggingCompliance ? 'Tagging...' : 'Tag Compliance'}
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all hover:opacity-80"
                style={{ background: colors.utility.primaryBackground, color: colors.semantic.error, border: `1px solid ${colors.semantic.error}30` }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Tree
              </button>
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

      <KTGenerationModal
        phase={ktPhase}
        equipmentName={summary?.resource_template?.name || ''}
        errorMessage={ktError}
        onClose={ktReset}
        serviceActivityLabel={addingActivity || undefined}
        resourceType={isFacility ? 'facility' : 'equipment'}
      />

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl shadow-2xl px-8 py-7 max-w-sm w-full mx-4" style={{ backgroundColor: colors.utility.primaryBackground, border: `1px solid ${colors.utility.secondaryText}20` }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: colors.semantic.error + '15', color: colors.semantic.error }}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-[15px] font-bold mb-1" style={{ color: colors.utility.primaryText }}>Delete Knowledge Tree?</h3>
            <p className="text-[13px] mb-1" style={{ color: '#ff6b2b' }}>{rt.name}</p>
            <p className="text-[12px] mb-6" style={{ color: colors.utility.secondaryText }}>
              {isFacility
                ? 'This will permanently delete all zones, consumables, checkpoints, service cycles, overlays, and backup history. This cannot be undone.'
                : 'This will permanently delete all variants, spare parts, checkpoints, service cycles, overlays, and backup history. This cannot be undone.'
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl text-[13px] font-semibold border transition-all hover:opacity-80"
                style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.secondaryText, backgroundColor: 'transparent' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: colors.semantic.error }}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeTreeDetail;
