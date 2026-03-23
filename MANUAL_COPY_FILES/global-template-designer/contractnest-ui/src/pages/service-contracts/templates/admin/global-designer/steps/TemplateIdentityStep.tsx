// src/pages/service-contracts/templates/admin/global-designer/steps/TemplateIdentityStep.tsx
// Step 1: Template name, description, target industries, nomenclature, contract type, complexity

import React, { useMemo } from 'react';
import {
  FileText,
  Check,
  X,
  Loader2,
  AlertCircle,
  Wrench,
  Building2,
  Briefcase,
  Shuffle,
  ShieldCheck,
  ShieldPlus,
  CalendarCheck,
  BadgeCheck,
  Settings2,
  Users,
  Package,
  HeartPulse,
  RefreshCw,
  MessageSquare,
  GraduationCap,
  Target,
  Gauge,
  Calculator,
  Clock,
  PhoneCall,
  Rocket,
  ArrowRightLeft,
  type LucideIcon,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { industries } from '@/utils/constants/industries';
import {
  useGlobalMasterData,
  type CategoryDetail,
} from '@/hooks/queries/useProductMasterdata';
import type { GlobalDesignerWizardState } from '../types';

// ─── Props ──────────────────────────────────────────────────────────

interface TemplateIdentityStepProps {
  state: GlobalDesignerWizardState;
  onUpdate: (updates: Partial<GlobalDesignerWizardState>) => void;
}

// ─── Icon maps ──────────────────────────────────────────────────────

const NOMENCLATURE_ICON_MAP: Record<string, LucideIcon> = {
  Wrench, Building2, Briefcase, Shuffle, FileText, ShieldCheck, ShieldPlus,
  CalendarCheck, BadgeCheck, Settings2, Users, Package, HeartPulse, RefreshCw,
  MessageSquare, GraduationCap, Target, Gauge, Calculator, Clock, PhoneCall,
  Rocket, ArrowRightLeft,
};
const getNomIcon = (name: string): LucideIcon => NOMENCLATURE_ICON_MAP[name] || FileText;

const getLucideIcon = (iconName: string): LucideIcon | null => {
  const icon = (LucideIcons as any)[iconName];
  return icon || null;
};

// ─── Nomenclature group ordering ────────────────────────────────────

interface NomenclatureGroup {
  group: string;
  label: string;
  icon: string;
  items: CategoryDetail[];
}

const GROUP_ORDER = ['equipment_maintenance', 'facility_property', 'service_delivery', 'flexible_hybrid'];

const groupItems = (items: CategoryDetail[]): NomenclatureGroup[] => {
  const groupMap: Record<string, NomenclatureGroup> = {};
  items.forEach((item) => {
    const fs = item.form_settings as any;
    const groupKey = fs?.group || 'other';
    if (!groupMap[groupKey]) {
      groupMap[groupKey] = {
        group: groupKey,
        label: fs?.group_label || groupKey,
        icon: fs?.group_icon || 'FileText',
        items: [],
      };
    }
    groupMap[groupKey].items.push(item);
  });
  return GROUP_ORDER
    .filter((key) => groupMap[key])
    .map((key) => groupMap[key])
    .concat(
      Object.entries(groupMap)
        .filter(([key]) => !GROUP_ORDER.includes(key))
        .map(([, group]) => group)
    );
};

// ─── Complexity options ─────────────────────────────────────────────

const COMPLEXITY_OPTIONS = [
  { id: 'simple' as const, label: 'Simple', desc: 'Basic contract with minimal blocks', color: '#10B981' },
  { id: 'medium' as const, label: 'Medium', desc: 'Standard with moderate complexity', color: '#F59E0B' },
  { id: 'complex' as const, label: 'Complex', desc: 'Advanced with many blocks', color: '#EF4444' },
];

// ─── Component ──────────────────────────────────────────────────────

const TemplateIdentityStep: React.FC<TemplateIdentityStepProps> = ({ state, onUpdate }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Fetch nomenclature data (reuse from contract wizard)
  const { data: nomResponse, isLoading: nomLoading } = useGlobalMasterData('cat_contract_nomenclature', true);
  const nomItems = nomResponse?.data || [];
  const nomGroups = useMemo(() => groupItems(nomItems), [nomItems]);

  // ─── Industry toggle ───────────────────────────────────────────
  const toggleIndustry = (industryId: string) => {
    const current = state.targetIndustries;
    if (current.includes(industryId)) {
      onUpdate({ targetIndustries: current.filter((id) => id !== industryId) });
    } else {
      onUpdate({ targetIndustries: [...current, industryId] });
    }
  };

  // ─── Nomenclature toggle (multi-select) ────────────────────────
  const toggleNomenclature = (itemId: string, displayName: string) => {
    const currentIds = state.nomenclatureIds;
    const currentNames = state.nomenclatureNames;
    if (currentIds.includes(itemId)) {
      onUpdate({
        nomenclatureIds: currentIds.filter((id) => id !== itemId),
        nomenclatureNames: currentNames.filter((_, i) => currentIds[i] !== itemId),
      });
    } else {
      onUpdate({
        nomenclatureIds: [...currentIds, itemId],
        nomenclatureNames: [...currentNames, displayName],
      });
    }
  };

  // ─── Tag management ────────────────────────────────────────────
  const [tagInput, setTagInput] = React.useState('');
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !state.tags.includes(tag)) {
      onUpdate({ tags: [...state.tags, tag] });
    }
    setTagInput('');
  };
  const removeTag = (tag: string) => {
    onUpdate({ tags: state.tags.filter((t) => t !== tag) });
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: `${colors.utility.primaryText}05`,
    borderColor: `${colors.utility.primaryText}15`,
    color: colors.utility.primaryText,
  };

  return (
    <div
      className="min-h-[60vh] px-4 py-8"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="max-w-5xl mx-auto space-y-10">

        {/* ─── Header ──────────────────────────────────────────── */}
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold mb-3" style={{ color: colors.utility.primaryText }}>
            Template Identity
          </h2>
          <p className="text-sm max-w-lg mx-auto" style={{ color: colors.utility.secondaryText }}>
            Define the template's name, target industries, and compatible contract types.
            This determines who sees this template in the marketplace.
          </p>
        </div>

        {/* ─── Name & Description ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
              Template Name <span style={{ color: colors.semantic.error }}>*</span>
            </label>
            <input
              type="text"
              value={state.templateName}
              onChange={(e) => onUpdate({ templateName: e.target.value })}
              placeholder="e.g., Healthcare Equipment AMC"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none"
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
              {state.templateName.length}/100 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
              Estimated Duration
            </label>
            <select
              value={state.estimatedDuration}
              onChange={(e) => onUpdate({ estimatedDuration: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none"
              style={inputStyle}
            >
              <option value="1 month">1 month</option>
              <option value="3 months">3 months</option>
              <option value="6 months">6 months</option>
              <option value="12 months">12 months</option>
              <option value="18 months">18 months</option>
              <option value="24 months">24 months</option>
              <option value="36 months">36 months</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
              Description <span style={{ color: colors.semantic.error }}>*</span>
            </label>
            <textarea
              value={state.templateDescription}
              onChange={(e) => onUpdate({ templateDescription: e.target.value })}
              placeholder="Describe what this template is for, who should use it, and what kind of contracts it supports..."
              maxLength={500}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none resize-none"
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
              {state.templateDescription.length}/500 characters
            </p>
          </div>
        </div>

        {/* ─── Contract Type & Complexity ──────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>
              Contract Type
            </label>
            <div className="flex gap-3">
              {(['service', 'partnership'] as const).map((type) => {
                const isSelected = state.contractType === type;
                return (
                  <button
                    key={type}
                    onClick={() => onUpdate({ contractType: type })}
                    className="flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: isSelected ? `${colors.brand.primary}10` : colors.utility.secondaryBackground,
                      borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}12`,
                      color: isSelected ? colors.brand.primary : colors.utility.primaryText,
                    }}
                  >
                    {type === 'service' ? 'Service Contract' : 'Partnership Agreement'}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>
              Complexity Level
            </label>
            <div className="flex gap-3">
              {COMPLEXITY_OPTIONS.map((opt) => {
                const isSelected = state.complexity === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => onUpdate({ complexity: opt.id })}
                    className="flex-1 py-3 px-3 rounded-xl border-2 text-center transition-all"
                    style={{
                      backgroundColor: isSelected ? `${opt.color}10` : colors.utility.secondaryBackground,
                      borderColor: isSelected ? opt.color : `${colors.utility.primaryText}12`,
                    }}
                  >
                    <span className="text-sm font-semibold block" style={{ color: isSelected ? opt.color : colors.utility.primaryText }}>
                      {opt.label}
                    </span>
                    <span className="text-[10px] block mt-0.5" style={{ color: colors.utility.secondaryText }}>
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Tags ────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
            Tags
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add a tag and press Enter"
              className="flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none"
              style={inputStyle}
            />
          </div>
          {state.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {state.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${colors.brand.primary}10`,
                    color: colors.brand.primary,
                  }}
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:opacity-60">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ─── Target Industries (Multi-Select) ────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                Target Industries
              </label>
              <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
                Select which industries can see this template. Leave empty for all industries.
              </p>
            </div>
            {state.targetIndustries.length > 0 && (
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: `${colors.brand.primary}12`, color: colors.brand.primary }}
              >
                {state.targetIndustries.length} selected
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {industries.map((ind) => {
              const isSelected = state.targetIndustries.includes(ind.id);
              const IconComp = getLucideIcon(ind.icon);
              return (
                <button
                  key={ind.id}
                  onClick={() => toggleIndustry(ind.id)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all text-xs"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}08` : colors.utility.secondaryBackground,
                    borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}10`,
                  }}
                >
                  {isSelected && (
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: colors.brand.primary }}
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  {!isSelected && IconComp && (
                    <IconComp className="w-4 h-4 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                  )}
                  <span
                    className="truncate font-medium"
                    style={{ color: isSelected ? colors.brand.primary : colors.utility.primaryText }}
                  >
                    {ind.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Nomenclature Compatibility (Multi-Select) ───────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                Compatible Contract Types (Nomenclature)
              </label>
              <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
                Which contract types can use this template? Tenants will see this template
                when creating contracts of these types.
              </p>
            </div>
            {state.nomenclatureIds.length > 0 && (
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: `${colors.brand.primary}12`, color: colors.brand.primary }}
              >
                {state.nomenclatureIds.length} selected
              </span>
            )}
          </div>

          {nomLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.brand.primary }} />
              <span className="ml-2 text-sm" style={{ color: colors.utility.secondaryText }}>Loading contract types...</span>
            </div>
          ) : nomGroups.length === 0 ? (
            <div className="flex items-center gap-2 py-4" style={{ color: colors.utility.secondaryText }}>
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">No nomenclature types found</span>
            </div>
          ) : (
            <div className="space-y-5">
              {nomGroups.map((group) => {
                const GroupIcon = getNomIcon(group.icon);
                return (
                  <div key={group.group}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${colors.brand.primary}10` }}
                      >
                        <GroupIcon className="w-3.5 h-3.5" style={{ color: colors.brand.primary }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                        {group.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {group.items.map((item) => {
                        const fs = item.form_settings as any;
                        const isSelected = state.nomenclatureIds.includes(item.id);
                        const accent = (item as any).hexcolor || colors.brand.primary;
                        const ItemIcon = getNomIcon(fs?.icon || '');
                        const displayName = fs?.short_name || item.display_name || item.detail_name;

                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleNomenclature(item.id, displayName)}
                            className="relative flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all text-xs"
                            style={{
                              backgroundColor: isSelected ? `${accent}08` : colors.utility.secondaryBackground,
                              borderColor: isSelected ? accent : `${colors.utility.primaryText}10`,
                            }}
                          >
                            {isSelected && (
                              <div
                                className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: accent }}
                              >
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: isSelected ? `${accent}15` : `${colors.utility.primaryText}06` }}
                            >
                              <ItemIcon
                                className="w-4 h-4"
                                style={{ color: isSelected ? accent : colors.utility.secondaryText }}
                              />
                            </div>
                            <div className="min-w-0">
                              <span
                                className="font-bold block"
                                style={{ color: isSelected ? accent : colors.utility.primaryText }}
                              >
                                {displayName}
                              </span>
                              <span
                                className="text-[10px] block truncate"
                                style={{ color: colors.utility.secondaryText }}
                              >
                                {fs?.full_name || item.description}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateIdentityStep;
