// src/pages/service-contracts/templates/admin/global-designer/index.tsx
// Global Template Designer Wizard — 7-step wizard for admin template creation
// Step 1: Nomenclature (reused from contract wizard)
// Step 2: Template Details (adapted from ContractDetailsStep — no Status)
// Step 3: Block Assembly
// Step 4: Equipment / Facility Names (driven by nomenclature group)
// Steps 5-7: Billing, Policies, Review

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Save,
  Loader2,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import { captureException } from '@/utils/sentry';
import { analyticsService } from '@/services/analytics.service';
import useTemplateBuilder from '@/hooks/service-contracts/templates/useTemplateBuilder';

// Wizard types & steps
import {
  WIZARD_STEPS,
  INITIAL_WIZARD_STATE,
  type GlobalDesignerWizardState,
} from './types';

// Step 1: Nomenclature — reused from contract wizard
import NomenclatureStep from '@/components/contracts/ContractWizard/steps/NomenclatureStep';
import type { ContractDetailsData } from '@/components/contracts/ContractWizard/steps/ContractDetailsStep';

// Steps 2-7: Global designer specific
import TemplateDetailsStep from './steps/TemplateDetailsStep';
import BlockAssemblyStep from './steps/BlockAssemblyStep';
import AssetNamesStep from './steps/AssetNamesStep';
import BillingDefaultsStep from './steps/BillingDefaultsStep';
import PoliciesStep from './steps/PoliciesStep';
import ReviewPublishStep from './steps/ReviewPublishStep';

// ─── Icon resolver ──────────────────────────────────────────────────

const getLucideIcon = (name: string): LucideIcon => {
  return (LucideIcons as any)[name] || LucideIcons.FileText;
};

// ─── Component ──────────────────────────────────────────────────────

const GlobalDesignerPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { toast } = useToast();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardState, setWizardState] = useState<GlobalDesignerWizardState>(INITIAL_WIZARD_STATE);
  const [isSaving, setIsSaving] = useState(false);

  // Template builder hook (for Step 3: Block Assembly)
  const templateBuilder = useTemplateBuilder({
    initialTemplate: {
      templateName: 'Global Template',
      industry: '',
      contractType: 'service',
    },
  });

  // ─── State update handler ──────────────────────────────────────
  const updateWizardState = useCallback((updates: Partial<GlobalDesignerWizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }));

    // Sync template name to builder if contract details changed
    if (updates.contractDetails?.contractName !== undefined) {
      templateBuilder.updateTemplate({ templateName: updates.contractDetails.contractName });
    }
  }, [templateBuilder]);

  // ─── Nomenclature handler (Step 1) ────────────────────────────
  const handleNomenclatureSelect = useCallback((
    id: string | null,
    displayName: string | null,
    group?: string | null
  ) => {
    setWizardState((prev) => ({
      ...prev,
      nomenclatureId: id,
      nomenclatureDisplayName: displayName,
      nomenclatureGroup: group ?? null,
    }));
  }, []);

  // ─── Contract details handler (Step 2) ────────────────────────
  const handleContractDetailsChange = useCallback((updates: Partial<ContractDetailsData>) => {
    setWizardState((prev) => ({
      ...prev,
      contractDetails: { ...prev.contractDetails, ...updates },
    }));

    // Sync template name to builder
    if (updates.contractName !== undefined) {
      templateBuilder.updateTemplate({ templateName: updates.contractName });
    }
  }, [templateBuilder]);

  // ─── Navigation ────────────────────────────────────────────────
  const totalSteps = WIZARD_STEPS.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: // Nomenclature — optional (can skip)
        return true;
      case 1: // Template Details — name required
        return wizardState.contractDetails.contractName.trim().length >= 3;
      case 2: // Blocks — always valid (can be 0 blocks for draft)
        return true;
      case 3: // Asset Names — optional
        return true;
      case 4: // Billing — optional
        return true;
      case 5: // Policies — optional
        return true;
      case 6: // Review — ready to save
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (currentStep < totalSteps - 1 && canProceed()) {
      setCurrentStep((s) => s + 1);
      analyticsService.trackEvent('global_designer_step_next', {
        fromStep: currentStep,
        toStep: currentStep + 1,
        stepKey: WIZARD_STEPS[currentStep].key,
      });
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex <= currentStep || canProceed()) {
      setCurrentStep(stepIndex);
    }
  };

  // ─── Save handler ──────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validate minimum requirements
      if (!wizardState.contractDetails.contractName.trim()) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Contract/template name is required' });
        setCurrentStep(1); // Go to Contract Details step
        return;
      }

      toast({ title: 'Saving Template', description: 'Please wait while we save your template...' });

      analyticsService.trackEvent('global_designer_save_attempted', {
        templateName: wizardState.contractDetails.contractName,
        blockCount: templateBuilder.template.blocks.length,
        nomenclatureId: wizardState.nomenclatureId,
        nomenclatureGroup: wizardState.nomenclatureGroup,
        publishStatus: wizardState.publishStatus,
      });

      // TODO: Wire to actual API mutation (useSaveTemplate)
      const payload = {
        // Nomenclature
        nomenclatureId: wizardState.nomenclatureId,
        nomenclatureGroup: wizardState.nomenclatureGroup,

        // Contract Details
        name: wizardState.contractDetails.contractName,
        description: wizardState.contractDetails.description,
        status: wizardState.contractDetails.status,
        currency: wizardState.contractDetails.currency,
        startDate: wizardState.contractDetails.startDate,
        durationValue: wizardState.contractDetails.durationValue,
        durationUnit: wizardState.contractDetails.durationUnit,
        gracePeriodValue: wizardState.contractDetails.gracePeriodValue,
        gracePeriodUnit: wizardState.contractDetails.gracePeriodUnit,

        // Asset Names
        selectedAssetTypeIds: wizardState.selectedAssetTypeIds,
        selectedAssetTypeNames: wizardState.selectedAssetTypeNames,

        // Blocks
        blocks: templateBuilder.template.blocks.map((b) => ({
          variantId: b.variantId,
          blockType: b.blockType,
          name: b.name,
          position: b.position,
          isRequired: b.isRequired,
          configuration: b.configuration,
        })),

        // Billing
        defaultBillingCycleType: wizardState.defaultBillingCycleType,
        defaultPaymentMode: wizardState.defaultPaymentMode,
        defaultPaymentTermsDays: wizardState.defaultPaymentTermsDays,
        defaultTaxApproach: wizardState.defaultTaxApproach,

        // Policies
        defaultEvidencePolicy: wizardState.defaultEvidencePolicy,
        defaultAcceptanceMethod: wizardState.defaultAcceptanceMethod,
        complianceTags: wizardState.complianceTags,

        // Publish
        publishStatus: wizardState.publishStatus,
        globalTemplate: true,
      };

      console.log('Saving global template:', payload);

      // Simulate save delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast({
        title: 'Template Saved',
        description: `"${wizardState.contractDetails.contractName}" has been ${wizardState.publishStatus === 'draft' ? 'saved as draft' : 'published'} successfully.`,
      });

      analyticsService.trackEvent('global_designer_save_completed', {
        templateName: wizardState.contractDetails.contractName,
        publishStatus: wizardState.publishStatus,
      });

      // Navigate back to gallery
      navigate('/service-contracts/templates/admin/global-templates');
    } catch (error) {
      captureException(error, {
        tags: { component: 'GlobalDesignerPage', action: 'save_template' },
      });
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Failed to save template. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Exit handler ──────────────────────────────────────────────
  const handleExit = () => {
    const hasChanges = wizardState.contractDetails.contractName.trim() ||
      wizardState.nomenclatureId ||
      templateBuilder.template.blocks.length > 0;
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    navigate('/service-contracts/templates/admin/global-templates');
  };

  // ─── Display name for header ─────────────────────────────────
  const displayName = wizardState.contractDetails.contractName || 'New Global Template';

  // ─── Render current step ───────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {
      case 0: // Nomenclature — reused from contract wizard
        return (
          <NomenclatureStep
            selectedId={wizardState.nomenclatureId}
            onSelect={handleNomenclatureSelect}
          />
        );
      case 1: // Template Details — adapted from ContractDetailsStep (no Status)
        return (
          <TemplateDetailsStep
            data={wizardState.contractDetails}
            onChange={handleContractDetailsChange}
          />
        );
      case 2: // Block Assembly
        return <BlockAssemblyStep templateBuilder={templateBuilder} />;
      case 3: // Equipment / Facility Names — driven by nomenclature group
        return <AssetNamesStep state={wizardState} onUpdate={updateWizardState} />;
      case 4: // Billing Defaults
        return <BillingDefaultsStep state={wizardState} onUpdate={updateWizardState} />;
      case 5: // Policies & Compliance
        return <PoliciesStep state={wizardState} onUpdate={updateWizardState} />;
      case 6: // Review & Publish
        return <ReviewPublishStep state={wizardState} onUpdate={updateWizardState} templateBuilder={templateBuilder} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: colors.utility.primaryBackground }}>

      {/* ─── Top Header ────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.secondaryText}20`,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleExit}
            className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors hover:opacity-80"
            style={{
              borderColor: `${colors.utility.secondaryText}40`,
              color: colors.utility.primaryText,
            }}
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to Gallery</span>
          </button>
          <div className="hidden sm:block h-6 w-px" style={{ backgroundColor: `${colors.utility.secondaryText}20` }} />
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: colors.brand.primary }} />
            <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
              {displayName}
            </span>
            {wizardState.nomenclatureDisplayName && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${colors.brand.primary}12`, color: colors.brand.primary }}
              >
                {wizardState.nomenclatureDisplayName}
              </span>
            )}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${colors.brand.primary}12`, color: colors.brand.primary }}
            >
              Global
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLastStep && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})` }}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? 'Saving...' : 'Save Template'}
            </button>
          )}
        </div>
      </div>

      {/* ─── Stepper ───────────────────────────────────────────── */}
      <div
        className="px-6 py-3 border-b"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.secondaryText}10`,
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {WIZARD_STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isClickable = index <= currentStep || canProceed();
            const StepIcon = getLucideIcon(step.icon);

            return (
              <React.Fragment key={step.id}>
                {/* Step */}
                <button
                  onClick={() => isClickable && goToStep(index)}
                  disabled={!isClickable}
                  className="flex items-center gap-2.5 transition-all group"
                  style={{ opacity: isClickable ? 1 : 0.4 }}
                >
                  {/* Step circle */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                    style={{
                      backgroundColor: isCompleted
                        ? colors.semantic.success
                        : isActive
                          ? colors.brand.primary
                          : `${colors.utility.primaryText}10`,
                      color: isCompleted || isActive ? 'white' : colors.utility.secondaryText,
                    }}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <StepIcon className="w-4 h-4" />
                    )}
                  </div>

                  {/* Step text */}
                  <div className="hidden lg:block text-left">
                    <p
                      className="text-xs font-semibold leading-tight"
                      style={{
                        color: isActive ? colors.brand.primary : isCompleted ? colors.semantic.success : colors.utility.secondaryText,
                      }}
                    >
                      {step.title}
                    </p>
                    <p
                      className="text-[10px] leading-tight"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {step.isOptional ? 'Optional' : 'Required'}
                    </p>
                  </div>
                </button>

                {/* Connector line */}
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className="flex-1 h-0.5 mx-2 rounded-full hidden sm:block"
                    style={{
                      backgroundColor: index < currentStep
                        ? colors.semantic.success
                        : `${colors.utility.primaryText}10`,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ─── Step Content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {renderStep()}
      </div>

      {/* ─── Bottom Navigation ─────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-3 border-t"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.secondaryText}20`,
        }}
      >
        {/* Left: Back / Step info */}
        <div className="flex items-center gap-3">
          {!isFirstStep ? (
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-4 py-2.5 text-sm border rounded-lg transition-colors hover:opacity-80"
              style={{
                borderColor: `${colors.utility.secondaryText}40`,
                color: colors.utility.primaryText,
              }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : (
            <div />
          )}
          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
            Step {currentStep + 1} of {totalSteps}
            {WIZARD_STEPS[currentStep].isOptional && (
              <span className="ml-1 opacity-60">(Optional)</span>
            )}
          </span>
        </div>

        {/* Right: Next / Save */}
        <div className="flex items-center gap-3">
          {WIZARD_STEPS[currentStep].isOptional && !isLastStep && (
            <button
              onClick={goNext}
              className="px-4 py-2.5 text-sm rounded-lg transition-colors hover:opacity-80"
              style={{ color: colors.utility.secondaryText }}
            >
              Skip
            </button>
          )}

          {!isLastStep ? (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm text-white rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})`,
              }}
            >
              Next
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm text-white rounded-lg transition-colors hover:opacity-90 disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})`,
              }}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? 'Saving...' : 'Save Template'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalDesignerPage;
