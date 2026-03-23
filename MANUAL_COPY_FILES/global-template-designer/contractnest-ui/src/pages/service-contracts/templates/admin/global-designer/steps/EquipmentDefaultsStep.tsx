// src/pages/service-contracts/templates/admin/global-designer/steps/EquipmentDefaultsStep.tsx
// Step 2: Equipment & coverage defaults for the template

import React, { useMemo } from 'react';
import {
  Wrench,
  Building2,
  Check,
  Info,
  Package,
  UserPlus,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useResourceTypes, type ResourceType as DBResourceType } from '@/hooks/queries/useResources';
import type { GlobalDesignerWizardState } from '../types';

// ─── Props ──────────────────────────────────────────────────────────

interface EquipmentDefaultsStepProps {
  state: GlobalDesignerWizardState;
  onUpdate: (updates: Partial<GlobalDesignerWizardState>) => void;
}

// ─── Component ──────────────────────────────────────────────────────

const EquipmentDefaultsStep: React.FC<EquipmentDefaultsStepProps> = ({ state, onUpdate }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Fetch resource types from DB
  const { data: resourceTypes, isLoading: rtLoading } = useResourceTypes();

  // Filter resource types by category
  const equipmentTypes = useMemo(
    () => (resourceTypes || []).filter((rt: DBResourceType) => rt.resource_category === 'equipment' && rt.is_active),
    [resourceTypes]
  );
  const entityTypes = useMemo(
    () => (resourceTypes || []).filter((rt: DBResourceType) => rt.resource_category === 'entity' && rt.is_active),
    [resourceTypes]
  );

  // Toggle equipment/entity based
  const toggleEquipmentBased = () => {
    const newVal = !state.isEquipmentBased;
    onUpdate({
      isEquipmentBased: newVal,
      // Clear equipment coverage types if turning off
      ...(!newVal ? {
        defaultCoverageTypes: state.defaultCoverageTypes.filter(
          (id) => !equipmentTypes.some((rt: DBResourceType) => rt.id === id)
        ),
        defaultCoverageNames: state.defaultCoverageNames.filter(
          (_, i) => !equipmentTypes.some((rt: DBResourceType) => rt.id === state.defaultCoverageTypes[i])
        ),
      } : {}),
    });
  };

  const toggleEntityBased = () => {
    const newVal = !state.isEntityBased;
    onUpdate({
      isEntityBased: newVal,
      ...(!newVal ? {
        defaultCoverageTypes: state.defaultCoverageTypes.filter(
          (id) => !entityTypes.some((rt: DBResourceType) => rt.id === id)
        ),
        defaultCoverageNames: state.defaultCoverageNames.filter(
          (_, i) => !entityTypes.some((rt: DBResourceType) => rt.id === state.defaultCoverageTypes[i])
        ),
      } : {}),
    });
  };

  // Toggle coverage type
  const toggleCoverageType = (rt: DBResourceType) => {
    const idx = state.defaultCoverageTypes.indexOf(rt.id);
    if (idx > -1) {
      onUpdate({
        defaultCoverageTypes: state.defaultCoverageTypes.filter((id) => id !== rt.id),
        defaultCoverageNames: state.defaultCoverageNames.filter((_, i) => i !== idx),
      });
    } else {
      onUpdate({
        defaultCoverageTypes: [...state.defaultCoverageTypes, rt.id],
        defaultCoverageNames: [...state.defaultCoverageNames, rt.name],
      });
    }
  };

  return (
    <div
      className="min-h-[60vh] px-4 py-8"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold mb-3" style={{ color: colors.utility.primaryText }}>
            Equipment & Coverage Defaults
          </h2>
          <p className="text-sm max-w-lg mx-auto" style={{ color: colors.utility.secondaryText }}>
            Define whether this template involves equipment or facilities, and set default
            coverage types. Tenants can customize these when creating contracts.
          </p>
        </div>

        {/* ─── Equipment / Entity Toggle Cards ─────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Equipment-based */}
          <button
            onClick={toggleEquipmentBased}
            className="relative flex flex-col p-6 rounded-2xl border-2 text-left transition-all duration-300 hover:shadow-lg"
            style={{
              backgroundColor: state.isEquipmentBased ? `${colors.brand.primary}08` : colors.utility.secondaryBackground,
              borderColor: state.isEquipmentBased ? colors.brand.primary : `${colors.utility.primaryText}15`,
              transform: state.isEquipmentBased ? 'scale(1.01)' : 'scale(1)',
            }}
          >
            <div
              className="absolute top-5 right-5 w-6 h-6 rounded-full border-2 flex items-center justify-center"
              style={{
                borderColor: state.isEquipmentBased ? colors.brand.primary : `${colors.utility.primaryText}30`,
                backgroundColor: state.isEquipmentBased ? colors.brand.primary : 'transparent',
              }}
            >
              {state.isEquipmentBased && <Check className="w-3.5 h-3.5 text-white" />}
            </div>
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
              style={{
                backgroundColor: state.isEquipmentBased ? `${colors.brand.primary}15` : `${colors.utility.primaryText}08`,
              }}
            >
              <Wrench
                className="w-7 h-7"
                style={{ color: state.isEquipmentBased ? colors.brand.primary : colors.utility.secondaryText }}
              />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
              Equipment-Based
            </h3>
            <p className="text-sm mb-3" style={{ color: colors.utility.secondaryText }}>
              Contract involves equipment maintenance, repair, or servicing
            </p>
            <div className="space-y-1.5 mt-auto">
              {['Equipment selection in wizard', 'Asset tracking & warranty', 'Condition & criticality'].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5" style={{ color: colors.semantic.success }} />
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>{f}</span>
                </div>
              ))}
            </div>
          </button>

          {/* Entity-based */}
          <button
            onClick={toggleEntityBased}
            className="relative flex flex-col p-6 rounded-2xl border-2 text-left transition-all duration-300 hover:shadow-lg"
            style={{
              backgroundColor: state.isEntityBased ? `${colors.brand.primary}08` : colors.utility.secondaryBackground,
              borderColor: state.isEntityBased ? colors.brand.primary : `${colors.utility.primaryText}15`,
              transform: state.isEntityBased ? 'scale(1.01)' : 'scale(1)',
            }}
          >
            <div
              className="absolute top-5 right-5 w-6 h-6 rounded-full border-2 flex items-center justify-center"
              style={{
                borderColor: state.isEntityBased ? colors.brand.primary : `${colors.utility.primaryText}30`,
                backgroundColor: state.isEntityBased ? colors.brand.primary : 'transparent',
              }}
            >
              {state.isEntityBased && <Check className="w-3.5 h-3.5 text-white" />}
            </div>
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
              style={{
                backgroundColor: state.isEntityBased ? `${colors.brand.primary}15` : `${colors.utility.primaryText}08`,
              }}
            >
              <Building2
                className="w-7 h-7"
                style={{ color: state.isEntityBased ? colors.brand.primary : colors.utility.secondaryText }}
              />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
              Facility / Entity-Based
            </h3>
            <p className="text-sm mb-3" style={{ color: colors.utility.secondaryText }}>
              Contract involves property, facility, or building management
            </p>
            <div className="space-y-1.5 mt-auto">
              {['Facility selection in wizard', 'Area & capacity tracking', 'Location management'].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5" style={{ color: colors.semantic.success }} />
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>{f}</span>
                </div>
              ))}
            </div>
          </button>
        </div>

        {/* ─── Default Coverage Types ──────────────────────────── */}
        {(state.isEquipmentBased || state.isEntityBased) && (
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
              Default Coverage Types
            </label>
            <p className="text-xs mb-4" style={{ color: colors.utility.secondaryText }}>
              Pre-select which resource types this template covers. Tenants can adjust when creating contracts.
            </p>

            {rtLoading ? (
              <div className="flex items-center gap-2 py-6 justify-center">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.brand.primary }} />
                <span className="text-sm" style={{ color: colors.utility.secondaryText }}>Loading resource types...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Equipment types */}
                {state.isEquipmentBased && equipmentTypes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Wrench className="w-4 h-4" style={{ color: colors.brand.primary }} />
                      <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                        Equipment Types
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {equipmentTypes.map((rt: DBResourceType) => {
                        const isSelected = state.defaultCoverageTypes.includes(rt.id);
                        return (
                          <button
                            key={rt.id}
                            onClick={() => toggleCoverageType(rt)}
                            className="flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all text-xs"
                            style={{
                              backgroundColor: isSelected ? `${colors.brand.primary}08` : colors.utility.secondaryBackground,
                              borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}10`,
                            }}
                          >
                            <div
                              className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0"
                              style={{
                                borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}25`,
                                backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                              }}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium block truncate" style={{ color: colors.utility.primaryText }}>
                                {rt.name}
                              </span>
                              {rt.description && (
                                <span className="text-[10px] block truncate" style={{ color: colors.utility.secondaryText }}>
                                  {rt.description}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Entity types */}
                {state.isEntityBased && entityTypes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4" style={{ color: colors.brand.primary }} />
                      <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                        Facility / Entity Types
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {entityTypes.map((rt: DBResourceType) => {
                        const isSelected = state.defaultCoverageTypes.includes(rt.id);
                        return (
                          <button
                            key={rt.id}
                            onClick={() => toggleCoverageType(rt)}
                            className="flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all text-xs"
                            style={{
                              backgroundColor: isSelected ? `${colors.brand.primary}08` : colors.utility.secondaryBackground,
                              borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}10`,
                            }}
                          >
                            <div
                              className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0"
                              style={{
                                borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}25`,
                                backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                              }}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium block truncate" style={{ color: colors.utility.primaryText }}>
                                {rt.name}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No types available */}
                {state.isEquipmentBased && equipmentTypes.length === 0 && (
                  <div className="flex items-center gap-2 py-4">
                    <AlertCircle className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      No equipment resource types found in the system
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Allow Buyer to Add Equipment ────────────────────── */}
        {(state.isEquipmentBased || state.isEntityBased) && (
          <div
            className="flex items-center justify-between p-4 rounded-xl border"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}10`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${colors.brand.primary}10` }}
              >
                <UserPlus className="w-5 h-5" style={{ color: colors.brand.primary }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                  Allow buyer to add equipment
                </p>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  Buyers can attach their own equipment during contract execution
                </p>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ allowBuyerEquipment: !state.allowBuyerEquipment })}
              className="relative w-12 h-6 rounded-full transition-colors"
              style={{
                backgroundColor: state.allowBuyerEquipment ? colors.brand.primary : `${colors.utility.primaryText}20`,
              }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm"
                style={{
                  transform: state.allowBuyerEquipment ? 'translateX(26px)' : 'translateX(2px)',
                }}
              />
            </button>
          </div>
        )}

        {/* ─── Info Banner ─────────────────────────────────────── */}
        {!state.isEquipmentBased && !state.isEntityBased && (
          <div
            className="flex items-start gap-3 p-4 rounded-xl border"
            style={{
              backgroundColor: `${colors.semantic.info || '#3B82F6'}06`,
              borderColor: `${colors.semantic.info || '#3B82F6'}20`,
            }}
          >
            <Info className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: colors.semantic.info || '#3B82F6' }} />
            <div>
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                <strong style={{ color: colors.utility.primaryText }}>Service-only template</strong> —
                No equipment or facility selection will appear in the contract wizard when this template is used.
                This is ideal for consulting, IT support, and professional service contracts.
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-xs" style={{ color: colors.utility.secondaryText }}>
          This step is optional — tenants can always customize equipment settings when creating contracts
        </p>
      </div>
    </div>
  );
};

export default EquipmentDefaultsStep;
