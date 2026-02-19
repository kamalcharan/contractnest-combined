// src/components/contracts/ContractWizard/steps/NomenclatureStep.tsx
// Step 2: Choose contract nomenclature (AMC, CMC, SLA, etc.)
// Grouped card picker — uses existing useGlobalMasterData hook

import React, { useMemo } from 'react';
import {
  Check,
  Loader2,
  AlertCircle,
  Wrench,
  Building2,
  Briefcase,
  Shuffle,
  FileText,
  ShieldCheck,
  ShieldPlus,
  CalendarCheck,
  AlertTriangle,
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
import { useTheme } from '@/contexts/ThemeContext';
import {
  useGlobalMasterData,
  type CategoryDetail,
} from '@/hooks/queries/useProductMasterdata';

// ─── Props ──────────────────────────────────────────────────────────

interface NomenclatureStepProps {
  selectedId: string | null;
  onSelect: (id: string | null, displayName: string | null, group?: string | null, formSettings?: any) => void;
}

// ─── Local types for grouped display ────────────────────────────────

interface NomenclatureGroup {
  group: string;
  label: string;
  icon: string;
  items: CategoryDetail[];
}

// ─── Icon map (matches form_settings.group_icon and form_settings.icon) ─

const ICON_MAP: Record<string, LucideIcon> = {
  Wrench,
  Building2,
  Briefcase,
  Shuffle,
  FileText,
  ShieldCheck,
  ShieldPlus,
  CalendarCheck,
  AlertTriangle,
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
};

const getIcon = (name: string): LucideIcon => ICON_MAP[name] || FileText;

// ─── Grouping helper ────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────

const NomenclatureStep: React.FC<NomenclatureStepProps> = ({
  selectedId,
  onSelect,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Use the existing global master data hook
  const { data: response, isLoading, error } = useGlobalMasterData('cat_contract_nomenclature', true);

  const items = response?.data || [];
  const groups = useMemo(() => groupItems(items), [items]);

  // Find current selection for info panel
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId),
    [items, selectedId]
  );

  // ─── Loading state ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="text-center">
          <Loader2
            className="w-8 h-8 animate-spin mx-auto mb-3"
            style={{ color: colors.brand.primary }}
          />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            Loading contract types...
          </p>
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────
  if (error || !groups?.length) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="text-center max-w-sm">
          <AlertCircle
            className="w-8 h-8 mx-auto mb-3"
            style={{ color: colors.semantic.warning }}
          />
          <p
            className="text-sm font-medium mb-1"
            style={{ color: colors.utility.primaryText }}
          >
            Could not load nomenclature types
          </p>
          <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
            You can skip this step and assign a type later.
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div
      className="min-h-[60vh] px-4 py-8"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h2
            className="text-2xl font-bold mb-3"
            style={{ color: colors.utility.primaryText }}
          >
            What type of contract is this?
          </h2>
          <p
            className="text-sm max-w-lg mx-auto"
            style={{ color: colors.utility.secondaryText }}
          >
            Select the nomenclature that best describes this contract.
            This is optional — you can skip and assign it later.
          </p>
        </div>

        {/* Groups */}
        <div className="space-y-8">
          {groups.map((group) => {
            const GroupIcon = getIcon(group.icon);

            return (
              <div key={group.group}>
                {/* Group Header */}
                <div className="flex items-center gap-2.5 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: `${colors.brand.primary}10`,
                    }}
                  >
                    <GroupIcon
                      className="w-4 h-4"
                      style={{ color: colors.brand.primary }}
                    />
                  </div>
                  <div>
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {group.label}
                    </h3>
                    <p
                      className="text-[10px]"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {group.items.length} type{group.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {group.items.map((item) => {
                    const isSelected = selectedId === item.id;
                    const fs = item.form_settings as any;
                    const ItemIcon = getIcon(fs?.icon || '');
                    const accent = (item as any).hexcolor || colors.brand.primary;

                    return (
                      <button
                        key={item.id}
                        onClick={() =>
                          onSelect(
                            isSelected ? null : item.id,
                            isSelected ? null : fs?.short_name || item.display_name || item.detail_name,
                            isSelected ? null : fs?.group || null,
                            isSelected ? null : fs || null
                          )
                        }
                        className="relative flex flex-col p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md group"
                        style={{
                          backgroundColor: isSelected
                            ? `${accent}08`
                            : colors.utility.secondaryBackground,
                          borderColor: isSelected
                            ? accent
                            : `${colors.utility.primaryText}10`,
                          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                        }}
                      >
                        {/* Selection check */}
                        <div
                          className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                          style={{
                            borderColor: isSelected
                              ? accent
                              : `${colors.utility.primaryText}25`,
                            backgroundColor: isSelected ? accent : 'transparent',
                          }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>

                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors"
                          style={{
                            backgroundColor: isSelected
                              ? `${accent}18`
                              : `${colors.utility.primaryText}06`,
                          }}
                        >
                          <ItemIcon
                            className="w-5 h-5"
                            style={{
                              color: isSelected
                                ? accent
                                : colors.utility.secondaryText,
                            }}
                          />
                        </div>

                        {/* Short name (e.g. AMC, CMC) */}
                        <span
                          className="text-base font-bold mb-0.5"
                          style={{
                            color: isSelected
                              ? accent
                              : colors.utility.primaryText,
                          }}
                        >
                          {fs?.short_name || item.display_name || item.detail_name}
                        </span>

                        {/* Full name */}
                        <span
                          className="text-[11px] leading-tight"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          {fs?.full_name || item.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected info panel */}
        {selectedItem && (() => {
          const fs = selectedItem.form_settings as any;
          const accent = (selectedItem as any).hexcolor || colors.brand.primary;

          return (
            <div
              className="mt-8 p-5 rounded-xl border flex items-start gap-4"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${accent}25`,
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${accent}15` }}
              >
                {React.createElement(
                  getIcon(fs?.icon || ''),
                  {
                    className: 'w-5 h-5',
                    style: { color: accent },
                  }
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4
                  className="font-semibold mb-1"
                  style={{ color: colors.utility.primaryText }}
                >
                  {fs?.short_name || selectedItem.display_name} —{' '}
                  {fs?.full_name || selectedItem.detail_name}
                </h4>
                <p
                  className="text-xs mb-3"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {selectedItem.description}
                </p>

                {/* Scope tags */}
                {fs?.scope_includes?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {fs.scope_includes.map((scope: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${accent}10`,
                          color: accent,
                        }}
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                )}

                {/* Meta: typical duration + billing */}
                {(fs?.typical_duration || fs?.typical_billing) && (
                  <div className="flex gap-4 mt-3">
                    {fs?.typical_duration && (
                      <span
                        className="text-[10px] flex items-center gap-1"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        <Clock className="w-3 h-3" />
                        {fs.typical_duration}
                      </span>
                    )}
                    {fs?.typical_billing && (
                      <span
                        className="text-[10px] flex items-center gap-1"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        <Calculator className="w-3 h-3" />
                        {fs.typical_billing}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Helper text */}
        <p
          className="text-center text-xs mt-6"
          style={{ color: colors.utility.secondaryText }}
        >
          This is optional — click the selected card again to deselect, or just proceed to the next step
        </p>
      </div>
    </div>
  );
};

export default NomenclatureStep;
