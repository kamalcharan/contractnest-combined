// src/pages/service-contracts/templates/admin/global-designer/steps/IndustryStep.tsx
// Step 3: Industry Selection
// Admin → picks freely from all m_catalog_industries
// Non-Admin → "My Industry" (auto-selected from profile) + "Industries I Serve" (multi-select)

import React, { useEffect, useMemo } from 'react';
import {
  Check,
  Loader2,
  AlertCircle,
  Building2,
  Lock,
  Globe2,
  Briefcase,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useIndustries } from '@/hooks/queries/useProductMasterdata';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { useServedIndustriesManager } from '@/hooks/queries/useServedIndustries';
import type { GlobalDesignerWizardState } from '../types';

// ─── Props ──────────────────────────────────────────────────────────

interface IndustryStepProps {
  state: GlobalDesignerWizardState;
  onUpdate: (updates: Partial<GlobalDesignerWizardState>) => void;
}

// ─── Component ──────────────────────────────────────────────────────

const IndustryStep: React.FC<IndustryStepProps> = ({ state, onUpdate }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { currentTenant } = useAuth();

  // Admin check: tenant-level admin or platform admin
  const isAdmin = !!(currentTenant?.is_admin || currentTenant?.is_owner);

  // All industries from master catalog
  const { data: industriesData, isLoading: industriesLoading } = useIndustries({ limit: 100 });
  const allIndustriesRaw = industriesData?.data || [];

  // For admin: show only parent industries (level === 0) since resource templates
  // are mapped to parent industry IDs in m_catalog_resource_templates.
  // For non-admin: show their served industries (which can be any level).
  const hasHierarchy = allIndustriesRaw.some((i) => i.level !== undefined && i.level !== null);
  const parentIndustries = hasHierarchy
    ? allIndustriesRaw.filter((i) => i.level === 0)
    : allIndustriesRaw;
  const allIndustries = isAdmin ? parentIndustries : allIndustriesRaw;

  // Non-admin: tenant's own industry from profile
  const { profile, loading: profileLoading } = useTenantProfile();
  const myIndustryId = profile?.industry_id || null;

  // Non-admin: served industries
  const {
    servedIndustries,
    isLoading: servedLoading,
  } = useServedIndustriesManager();

  // Derive served industry IDs
  const servedIndustryIds = useMemo(
    () => servedIndustries.map((si) => si.industry_id),
    [servedIndustries]
  );

  // ─── Auto-select logic for non-admin ──────────────────────────
  useEffect(() => {
    if (isAdmin) return;
    if (profileLoading || servedLoading) return;

    const autoIds: string[] = [];

    // Auto-select "My Industry"
    if (myIndustryId) {
      autoIds.push(myIndustryId);
    }

    // If only 1 served industry, auto-select it too
    if (servedIndustryIds.length === 1 && !autoIds.includes(servedIndustryIds[0])) {
      autoIds.push(servedIndustryIds[0]);
    }

    // Only set if there are auto-selects and user hasn't already made choices
    if (autoIds.length > 0 && state.targetIndustries.length === 0) {
      onUpdate({ targetIndustries: autoIds });
    }
  }, [isAdmin, myIndustryId, servedIndustryIds, profileLoading, servedLoading, state.targetIndustries.length, onUpdate]);

  // ─── Toggle handler ────────────────────────────────────────────
  const toggleIndustry = (industryId: string) => {
    // Non-admin: can't deselect "My Industry"
    if (!isAdmin && industryId === myIndustryId) return;

    const current = state.targetIndustries;
    if (current.includes(industryId)) {
      onUpdate({ targetIndustries: current.filter((id) => id !== industryId) });
    } else {
      onUpdate({ targetIndustries: [...current, industryId] });
    }
  };

  // ─── Loading ───────────────────────────────────────────────────
  const isLoading = industriesLoading || (!isAdmin && (profileLoading || servedLoading));

  if (isLoading) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: colors.brand.primary }} />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            Loading industries...
          </p>
        </div>
      </div>
    );
  }

  // ─── For non-admin: build available industries list ────────────
  // "My Industry" + "Industries I Serve"
  const availableIndustryIds = isAdmin
    ? allIndustries.map((i) => i.id)
    : [...new Set([myIndustryId, ...servedIndustryIds].filter(Boolean) as string[])];

  const availableIndustries = allIndustries.filter((i) => availableIndustryIds.includes(i.id));

  // Resolve "My Industry" name
  const myIndustryName = myIndustryId
    ? allIndustries.find((i) => i.id === myIndustryId)?.name || myIndustryId
    : null;

  return (
    <div
      className="min-h-[60vh] px-4 py-8"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center mb-2">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${colors.brand.primary}12` }}
          >
            <Globe2 className="w-7 h-7" style={{ color: colors.brand.primary }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: colors.utility.primaryText }}>
            Target Industries
          </h2>
          <p className="text-sm max-w-lg mx-auto" style={{ color: colors.utility.secondaryText }}>
            {isAdmin
              ? 'Select which industries this template is designed for. Equipment and facility options in the next step will match your selection.'
              : 'Select the industries this template targets. Your primary industry is auto-selected.'
            }
          </p>
        </div>

        {/* Non-admin: "My Industry" badge */}
        {!isAdmin && myIndustryId && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border"
            style={{
              backgroundColor: `${colors.brand.primary}06`,
              borderColor: `${colors.brand.primary}20`,
            }}
          >
            <Briefcase className="w-5 h-5" style={{ color: colors.brand.primary }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                My Industry
              </p>
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                {myIndustryName} — auto-selected from your business profile
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
              <span className="text-[10px] font-medium" style={{ color: colors.utility.secondaryText }}>
                Locked
              </span>
            </div>
          </div>
        )}

        {/* Non-admin: Section label for served industries */}
        {!isAdmin && servedIndustryIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
              Industries I Serve
            </span>
          </div>
        )}

        {/* Industry Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {(isAdmin ? allIndustries : availableIndustries.filter((i) => i.id !== myIndustryId)).map((industry) => {
            const isSelected = state.targetIndustries.includes(industry.id);
            const isLocked = !isAdmin && industry.id === myIndustryId;

            return (
              <button
                key={industry.id}
                onClick={() => toggleIndustry(industry.id)}
                disabled={isLocked}
                className="relative flex flex-col p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md group disabled:cursor-not-allowed"
                style={{
                  backgroundColor: isSelected
                    ? `${colors.brand.primary}08`
                    : colors.utility.secondaryBackground,
                  borderColor: isSelected
                    ? colors.brand.primary
                    : `${colors.utility.primaryText}10`,
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  opacity: isLocked ? 0.7 : 1,
                }}
              >
                {/* Selection check */}
                <div
                  className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}25`,
                    backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                  }}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>

                {/* Name */}
                <span
                  className="text-sm font-semibold mb-1"
                  style={{ color: isSelected ? colors.brand.primary : colors.utility.primaryText }}
                >
                  {industry.name}
                </span>

                {/* Description */}
                {industry.description && (
                  <span
                    className="text-[10px] leading-tight line-clamp-2"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {industry.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Empty state */}
        {availableIndustries.length === 0 && !isAdmin && (
          <div className="flex items-center gap-3 py-8 justify-center">
            <AlertCircle className="w-5 h-5" style={{ color: colors.semantic.warning }} />
            <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
              No industries found. Please configure your industry in Settings → Business Profile.
            </span>
          </div>
        )}

        {/* Selection count */}
        <p className="text-center text-xs" style={{ color: colors.utility.secondaryText }}>
          {state.targetIndustries.length > 0
            ? `${state.targetIndustries.length} industr${state.targetIndustries.length !== 1 ? 'ies' : 'y'} selected — equipment and facility options will match your selection`
            : 'Select at least one industry to see relevant equipment and facility options'
          }
        </p>
      </div>
    </div>
  );
};

export default IndustryStep;
