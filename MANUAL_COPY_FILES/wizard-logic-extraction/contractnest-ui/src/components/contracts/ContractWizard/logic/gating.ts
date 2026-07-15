// src/components/contracts/ContractWizard/logic/gating.ts
// Step gating (canGoNext) + step-skip rules — extracted VERBATIM from index.tsx
// (Phase 1.5 logic extraction). No behavior change; guarded by logic/__parity__.
//
// NOTE for WizardShell (Phase 2): this boolean gate is the seam that later
// becomes per-step `validate(): FieldErrors` — extend here, not in the component.
import type { ContractWizardState } from './state';
import type { StepId } from './stepConfig';

// Nomenclature groups that require the asset selection step
export const ASSET_STEP_GROUPS = new Set(['equipment_maintenance', 'facility_property']);

export interface GatingContext {
  showTemplateSelection: boolean;
  isRfqMode: boolean;
}

// Navigation validation (step ID-based) — verbatim switch from index.tsx canGoNext()
export function canGoNextForStep(
  currentStepId: StepId,
  state: ContractWizardState,
  ctx: GatingContext
): boolean {
  // If showing template selection sub-step
  if (ctx.showTemplateSelection) {
    return state.templateId !== null;
  }

  switch (currentStepId) {
    case 'path':
      return state.path !== null;
    case 'nomenclature':
      return true; // Optional step — can always proceed
    case 'counterparty':
      return ctx.isRfqMode
        ? state.vendorIds.length > 0
        : state.buyerId !== null;
    case 'acceptance':
      return state.acceptanceMethod !== null;
    case 'details':
      return state.contractName.trim() !== '' && state.durationValue > 0;
    case 'billingCycle':
      return state.billingCycleType !== null;
    case 'blocks':
      return state.selectedBlocks.length > 0;
    case 'billingView':
      return true;
    case 'assetSelection':
      // Coverage types are mandatory — user must pick at least one type
      return state.coverageTypes.length > 0;
    case 'evidencePolicy':
      return true; // Evidence policy always has a default (none)
    case 'events':
      return true; // Events preview is informational, always valid
    case 'review':
      return true;
    default:
      return false;
  }
}

// Skip asset selection step when nomenclature group has no resource mapping
// (template mode has no asset step at all — flag must stay false)
export function shouldSkipAssetStepFor(
  state: ContractWizardState,
  ctx: { isRfqMode: boolean; isTemplateMode: boolean }
): boolean {
  return !ctx.isRfqMode && !ctx.isTemplateMode && !ASSET_STEP_GROUPS.has(state.nomenclatureGroup || '');
}
