// src/components/contracts/ContractWizard/steps/NomenclatureStep.tsx
// Step 2: Choose contract nomenclature (AMC, CMC, SLA, etc.)
// Grouped card picker — follows AcceptanceMethodStep pattern

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
  useNomenclatureTypes,
  findNomenclatureById,
  type NomenclatureGroup,
  type NomenclatureType,
} from '@/hooks/queries/useNomenclatureTypes';

// ─── Props ──────────────────────────────────────────────────────────

interface NomenclatureStepProps {
  selectedId: string | null;
  onSelect: (id: string | null, displayName: string | null) => void;
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

// ─── Component ──────────────────────────────────────────────────────

const NomenclatureStep: React.FC<NomenclatureStepProps> = ({
  selectedId,
  onSelect,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const { data: groups, isLoading, error } = useNomenclatureTypes();

  // Find current selection for info panel
  const selectedItem = useMemo(
    () => findNomenclatureById(groups || [], selectedId),
    [groups, selectedId]
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
          {groups.map((group: NomenclatureGroup) => {
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
                  {group.items.map((item: NomenclatureType) => {
                    const isSelected = selectedId === item.id;
                    const ItemIcon = getIcon(item.form_settings?.icon || '');
                    const accent = item.hexcolor || colors.brand.primary;

                    return (
                      <button
                        key={item.id}
                        onClick={() =>
                          onSelect(
                            isSelected ? null : item.id,
                            isSelected ? null : item.form_settings?.short_name || item.display_name
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
                          {item.form_settings?.short_name || item.display_name}
                        </span>

                        {/* Full name */}
                        <span
                          className="text-[11px] leading-tight"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          {item.form_settings?.full_name || item.description}
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
        {selectedItem && (
          <div
            className="mt-8 p-5 rounded-xl border flex items-start gap-4"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${selectedItem.hexcolor || colors.brand.primary}25`,
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: `${selectedItem.hexcolor || colors.brand.primary}15`,
              }}
            >
              {React.createElement(
                getIcon(selectedItem.form_settings?.icon || ''),
                {
                  className: 'w-5 h-5',
                  style: { color: selectedItem.hexcolor || colors.brand.primary },
                }
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4
                className="font-semibold mb-1"
                style={{ color: colors.utility.primaryText }}
              >
                {selectedItem.form_settings?.short_name} —{' '}
                {selectedItem.form_settings?.full_name}
              </h4>
              <p
                className="text-xs mb-3"
                style={{ color: colors.utility.secondaryText }}
              >
                {selectedItem.description}
              </p>

              {/* Scope tags */}
              {selectedItem.form_settings?.scope_includes?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedItem.form_settings.scope_includes.map((scope, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${selectedItem.hexcolor || colors.brand.primary}10`,
                        color: selectedItem.hexcolor || colors.brand.primary,
                      }}
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta: typical duration + billing */}
              {(selectedItem.form_settings?.typical_duration ||
                selectedItem.form_settings?.typical_billing) && (
                <div className="flex gap-4 mt-3">
                  {selectedItem.form_settings?.typical_duration && (
                    <span
                      className="text-[10px] flex items-center gap-1"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      <Clock className="w-3 h-3" />
                      {selectedItem.form_settings.typical_duration}
                    </span>
                  )}
                  {selectedItem.form_settings?.typical_billing && (
                    <span
                      className="text-[10px] flex items-center gap-1"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      <Calculator className="w-3 h-3" />
                      {selectedItem.form_settings.typical_billing}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

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
