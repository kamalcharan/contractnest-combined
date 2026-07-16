// src/components/contracts/ContractWizard/shell/PhaseStepper.tsx
// WizardShell Phase 2 — the single progress model for the contract wizard.
// Groups the granular steps into 4 phases; every VISITED step is clickable
// (forward or backward), future steps are visibly locked. Replaces the old
// backward-only header dots; the action bar below carries no dots anymore.
import React from 'react';
import { Check, Lock } from 'lucide-react';
import type { StepConfig } from '../logic/stepConfig';
import { STEP_PHASE, PHASE_LABELS, type WizardPhaseId } from '../logic/stepConfig';

interface ThemeColors {
  brand: { primary: string };
  semantic: { success: string };
  utility: { primaryText: string; secondaryText: string };
}

interface PhaseStepperProps {
  steps: StepConfig[];
  currentStep: number;
  /** Highest step index the user has reached — steps ≤ this are clickable */
  maxVisitedStep: number;
  /** Index of the assetSelection step when it is skipped for this flow, else -1 */
  skippedStepIndex: number;
  onJump: (index: number) => void;
  colors: ThemeColors;
}

interface PhaseGroup {
  phase: WizardPhaseId;
  label: string;
  indices: number[]; // step indices in this phase (visible ones only)
}

function buildPhaseGroups(steps: StepConfig[], skippedStepIndex: number): PhaseGroup[] {
  const groups: PhaseGroup[] = [];
  steps.forEach((step, index) => {
    if (index === skippedStepIndex) return; // hidden step never renders
    const phase = STEP_PHASE[step.id];
    const last = groups[groups.length - 1];
    if (last && last.phase === phase) last.indices.push(index);
    else groups.push({ phase, label: PHASE_LABELS[phase], indices: [index] });
  });
  return groups;
}

const PhaseStepper: React.FC<PhaseStepperProps> = ({
  steps,
  currentStep,
  maxVisitedStep,
  skippedStepIndex,
  onJump,
  colors,
}) => {
  const groups = buildPhaseGroups(steps, skippedStepIndex);

  return (
    <nav aria-label="Wizard progress" className="flex items-center gap-3 md:gap-4 overflow-x-auto">
      {groups.map((group, gi) => {
        const phaseDone = group.indices.every((i) => i < currentStep);
        const phaseActive = group.indices.includes(currentStep);
        const phaseColor = phaseActive
          ? colors.brand.primary
          : phaseDone
            ? colors.semantic.success
            : `${colors.utility.primaryText}40`;
        return (
          <React.Fragment key={group.phase}>
            {gi > 0 && (
              <div
                aria-hidden
                style={{ width: 14, height: 1, backgroundColor: `${colors.utility.primaryText}20`, flexShrink: 0 }}
              />
            )}
            <div className="flex flex-col items-center gap-1" style={{ flexShrink: 0 }}>
              {/* Phase label — hidden on small screens, dots still shown */}
              <span
                className="hidden md:block text-[10px] font-semibold uppercase"
                style={{ color: phaseColor, letterSpacing: '0.08em', lineHeight: 1 }}
              >
                {group.label}
              </span>
              <div className="flex items-center gap-1.5">
                {group.indices.map((index) => {
                  const step = steps[index];
                  const isCurrent = index === currentStep;
                  const isVisited = index <= maxVisitedStep;
                  const isDone = index < currentStep || (isVisited && !isCurrent);
                  const clickable = isVisited && !isCurrent;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => clickable && onJump(index)}
                      disabled={!clickable}
                      title={
                        isCurrent
                          ? step.label
                          : isVisited
                            ? `Go to ${step.label}`
                            : `${step.label} — complete the current step first`
                      }
                      aria-label={step.label}
                      aria-current={isCurrent ? 'step' : undefined}
                      className="transition-all duration-300 rounded-full flex items-center justify-center"
                      style={{
                        width: isCurrent ? 30 : 14,
                        height: 14,
                        backgroundColor: isCurrent
                          ? colors.brand.primary
                          : isDone
                            ? `${colors.semantic.success}26`
                            : `${colors.utility.primaryText}12`,
                        border: isCurrent
                          ? 'none'
                          : isDone
                            ? `1px solid ${colors.semantic.success}`
                            : `1px solid ${colors.utility.primaryText}25`,
                        cursor: clickable ? 'pointer' : 'default',
                        flexShrink: 0,
                        padding: 0,
                      }}
                    >
                      {isDone && !isCurrent && (
                        <Check className="w-2.5 h-2.5" style={{ color: colors.semantic.success }} />
                      )}
                      {!isVisited && !isCurrent && (
                        <Lock className="w-2 h-2" style={{ color: `${colors.utility.primaryText}50` }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default PhaseStepper;
