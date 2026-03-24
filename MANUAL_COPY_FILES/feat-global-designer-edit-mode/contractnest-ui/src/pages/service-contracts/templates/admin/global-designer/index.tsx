// src/pages/service-contracts/templates/admin/global-designer/index.tsx
// Global Template Designer Wizard — 8-step wizard for admin template creation
// Uses FloatingActionIsland navigation (same as contract wizard)
// 1: Nomenclature | 2: Template Details | 3: Industries | 4: Equipment/Facility
// 5: Service Blocks | 6: Billing | 7: Policies | 8: Review

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import { captureException } from '@/utils/sentry';
import { analyticsService } from '@/services/analytics.service';

// FloatingActionIsland — reused from contract wizard
import FloatingActionIsland from '@/components/contracts/ContractWizard/FloatingActionIsland';
import type { DraftSaveStatus } from '@/components/contracts/ContractWizard/FloatingActionIsland';

// ConfigurableBlock type for service blocks
import type { ConfigurableBlock } from '@/components/catalog-studio';

// CRUD mutation hooks
import { useCreateCatTemplate, useUpdateCatTemplate } from '@/hooks/mutations/useCatTemplatesMutations';
import type { CreateTemplateData, UpdateTemplateData } from '@/hooks/mutations/useCatTemplatesMutations';

// Query hook — fetch existing template for edit mode
import { useCatTemplate } from '@/hooks/queries/useCatTemplates';

// Wizard types & steps
import {
  WIZARD_STEPS,
  INITIAL_WIZARD_STATE,
  type GlobalDesignerWizardState,
} from './types';

// Step 1: Nomenclature — reused from contract wizard
import NomenclatureStep from '@/components/contracts/ContractWizard/steps/NomenclatureStep';
import type { ContractDetailsData } from '@/components/contracts/ContractWizard/steps/ContractDetailsStep';

// Step 5: Service Blocks — reused from contract wizard (catalog-driven)
import ServiceBlocksStep from '@/components/contracts/ContractWizard/steps/ServiceBlocksStep';

// Steps 2-4, 6-8: Global designer specific
import TemplateDetailsStep from './steps/TemplateDetailsStep';
import IndustryStep from './steps/IndustryStep';
import AssetNamesStep from './steps/AssetNamesStep';
import BillingDefaultsStep from './steps/BillingDefaultsStep';
import PoliciesStep from './steps/PoliciesStep';
import ReviewPublishStep from './steps/ReviewPublishStep';

// ─── Component ──────────────────────────────────────────────────────

const GlobalDesignerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { toast } = useToast();

  // Edit mode — read templateId from query string (?templateId=xxx)
  const templateId = searchParams.get('templateId') || undefined;
  const isEditMode = !!templateId;

  // Fetch existing template when in edit mode
  const { data: existingTemplateResponse, isLoading: isLoadingTemplate } = useCatTemplate(templateId);
  const existingTemplate = existingTemplateResponse?.data;

  // CRUD mutations
  const createTemplateMutation = useCreateCatTemplate();
  const updateTemplateMutation = useUpdateCatTemplate();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardState, setWizardState] = useState<GlobalDesignerWizardState>(INITIAL_WIZARD_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<DraftSaveStatus>('idle');

  // Service blocks — separate state (ConfigurableBlock[] from catalog-studio)
  const [selectedBlocks, setSelectedBlocks] = useState<ConfigurableBlock[]>([]);

  // Track whether we've already populated from the fetched template (prevent re-population)
  const hasPopulatedRef = useRef(false);

  // ─── Populate wizard state from existing template (edit mode) ───
  useEffect(() => {
    if (!isEditMode || !existingTemplate || hasPopulatedRef.current) return;
    hasPopulatedRef.current = true;

    const settings = existingTemplate.settings || {};

    setWizardState({
      // Step 1: Nomenclature
      nomenclatureId: settings.nomenclatureId || null,
      nomenclatureDisplayName: settings.nomenclatureDisplayName || null,
      nomenclatureGroup: settings.nomenclatureGroup || null,

      // Step 2: Template Details
      contractDetails: {
        contractName: existingTemplate.name || '',
        status: 'draft',
        currency: existingTemplate.currency || '',
        description: existingTemplate.description || '',
        startDate: settings.startDate ? new Date(settings.startDate) : new Date(),
        durationValue: settings.durationValue ?? 12,
        durationUnit: settings.durationUnit || 'months',
        gracePeriodValue: settings.gracePeriodValue ?? 0,
        gracePeriodUnit: settings.gracePeriodUnit || 'days',
      },

      // Step 3: Industries
      targetIndustries: existingTemplate.industry_tags || [],

      // Step 4: Asset Names
      selectedAssetTypeIds: settings.selectedAssetTypeIds || [],
      selectedAssetTypeNames: settings.selectedAssetTypeNames || [],

      // Step 6: Billing
      defaultBillingCycleType: settings.defaultBillingCycleType || null,
      defaultPaymentMode: settings.defaultPaymentMode || null,
      defaultPaymentTermsDays: settings.defaultPaymentTermsDays ?? 30,
      defaultTaxApproach: settings.defaultTaxApproach || 'exclusive',

      // Step 7: Policies
      defaultEvidencePolicy: settings.defaultEvidencePolicy || 'none',
      defaultEvidenceForms: settings.defaultEvidenceForms || [],
      defaultAcceptanceMethod: settings.defaultAcceptanceMethod || null,
      complianceTags: settings.complianceTags || [],

      // Step 8: Publish
      publishStatus: existingTemplate.is_public ? 'active' : 'draft',
    });

    // Populate service blocks from existing template blocks
    if (existingTemplate.blocks?.length) {
      const restoredBlocks: ConfigurableBlock[] = existingTemplate.blocks.map((b) => ({
        id: b.block_id,
        quantity: b.config_overrides?.quantity ?? 1,
        billingCycle: b.config_overrides?.billingCycle ?? null,
        unitPrice: b.config_overrides?.unitPrice ?? 0,
        isUnlimited: b.config_overrides?.isUnlimited ?? false,
      } as ConfigurableBlock));
      setSelectedBlocks(restoredBlocks);
    }
  }, [isEditMode, existingTemplate]);

  // ─── State update handler ──────────────────────────────────────
  const updateWizardState = useCallback((updates: Partial<GlobalDesignerWizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }));
  }, []);

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
  }, []);

  // ─── Navigation ────────────────────────────────────────────────
  const totalSteps = WIZARD_STEPS.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: // Nomenclature — optional
        return true;
      case 1: // Template Details — name required
        return wizardState.contractDetails.contractName.trim().length >= 3;
      case 2: // Industries — at least 1 selected
        return wizardState.targetIndustries.length > 0;
      case 3: // Equipment / Facility — optional
        return true;
      case 4: // Service Blocks — always valid
        return true;
      case 5: // Billing — optional
        return true;
      case 6: // Policies — optional
        return true;
      case 7: // Review — ready
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
    } else if (isLastStep) {
      handleSave();
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  // ─── Save handler (Create or Update) ────────────────────────
  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (!wizardState.contractDetails.contractName.trim()) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Template name is required' });
        setCurrentStep(1);
        return;
      }

      const action = isEditMode ? 'update' : 'create';
      analyticsService.trackEvent(`global_designer_save_attempted`, {
        action,
        templateId: templateId || null,
        templateName: wizardState.contractDetails.contractName,
        blockCount: selectedBlocks.length,
        nomenclatureId: wizardState.nomenclatureId,
        nomenclatureGroup: wizardState.nomenclatureGroup,
        publishStatus: wizardState.publishStatus,
      });

      // Map selectedBlocks → TemplateBlock[] for m_cat_templates.blocks column
      const templateBlocks = selectedBlocks.map((b, index) => ({
        block_id: b.id,
        order: index + 1,
        config_overrides: {
          quantity: b.quantity,
          billingCycle: b.billingCycle,
          unitPrice: b.unitPrice,
          isUnlimited: b.isUnlimited,
        },
      }));

      // Build settings JSONB (all wizard fields that don't have a dedicated column)
      const templateSettings: Record<string, any> = {
        // Nomenclature
        nomenclatureId: wizardState.nomenclatureId,
        nomenclatureGroup: wizardState.nomenclatureGroup,
        nomenclatureDisplayName: wizardState.nomenclatureDisplayName,

        // Duration & timeline
        startDate: wizardState.contractDetails.startDate,
        durationValue: wizardState.contractDetails.durationValue,
        durationUnit: wizardState.contractDetails.durationUnit,
        gracePeriodValue: wizardState.contractDetails.gracePeriodValue,
        gracePeriodUnit: wizardState.contractDetails.gracePeriodUnit,

        // Equipment / Facility selections
        selectedAssetTypeIds: wizardState.selectedAssetTypeIds,
        selectedAssetTypeNames: wizardState.selectedAssetTypeNames,

        // Billing defaults
        defaultBillingCycleType: wizardState.defaultBillingCycleType,
        defaultPaymentMode: wizardState.defaultPaymentMode,
        defaultPaymentTermsDays: wizardState.defaultPaymentTermsDays,
        defaultTaxApproach: wizardState.defaultTaxApproach,

        // Policies
        defaultEvidencePolicy: wizardState.defaultEvidencePolicy,
        defaultEvidenceForms: wizardState.defaultEvidenceForms,
        defaultAcceptanceMethod: wizardState.defaultAcceptanceMethod,
        complianceTags: wizardState.complianceTags,
      };

      // Resolve publish status
      const isPublic = wizardState.publishStatus === 'active' || wizardState.publishStatus === 'featured';

      // Common payload fields shared by create and update
      const commonPayload = {
        name: wizardState.contractDetails.contractName,
        display_name: wizardState.contractDetails.contractName,
        description: wizardState.contractDetails.description || undefined,
        blocks: templateBlocks,
        currency: wizardState.contractDetails.currency || 'INR',
        is_system: true,           // Global admin template
        is_public: isPublic,
        industry_tags: wizardState.targetIndustries,
        category: wizardState.nomenclatureGroup || undefined,
        tags: [
          wizardState.nomenclatureDisplayName,
          wizardState.publishStatus,
          ...wizardState.complianceTags,
        ].filter(Boolean) as string[],
        settings: templateSettings,
      };

      let resultId: string | undefined;

      if (isEditMode && templateId) {
        // UPDATE existing template
        const updatePayload: UpdateTemplateData = commonPayload;
        const result = await updateTemplateMutation.mutateAsync({ id: templateId, data: updatePayload });
        resultId = result.data?.id;
      } else {
        // CREATE new template
        const createPayload: CreateTemplateData = commonPayload;
        const result = await createTemplateMutation.mutateAsync(createPayload);
        resultId = result.data?.id;
      }

      analyticsService.trackEvent('global_designer_save_completed', {
        action,
        templateId: resultId,
        templateName: wizardState.contractDetails.contractName,
        publishStatus: wizardState.publishStatus,
        blockCount: selectedBlocks.length,
        industryCount: wizardState.targetIndustries.length,
      });

      navigate('/service-contracts/templates/admin/global-templates');
    } catch (error) {
      captureException(error, {
        tags: { component: 'GlobalDesignerPage', action: isEditMode ? 'update_template' : 'save_template' },
      });
      // Toast is handled by the mutation hook's onError
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Exit handler ──────────────────────────────────────────────
  const handleExit = () => {
    const hasChanges = wizardState.contractDetails.contractName.trim() ||
      wizardState.nomenclatureId ||
      wizardState.targetIndustries.length > 0 ||
      selectedBlocks.length > 0;
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    navigate('/service-contracts/templates/admin/global-templates');
  };

  // ─── Step labels for FloatingActionIsland ─────────────────────
  const stepLabels = WIZARD_STEPS.map((s) => s.title);

  // ─── Display name for header ─────────────────────────────────
  const displayName = wizardState.contractDetails.contractName || (isEditMode ? 'Edit Global Template' : 'New Global Template');

  // ─── Render current step ───────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {
      case 0: // Nomenclature
        return (
          <NomenclatureStep
            selectedId={wizardState.nomenclatureId}
            onSelect={handleNomenclatureSelect}
          />
        );
      case 1: // Template Details
        return (
          <TemplateDetailsStep
            data={wizardState.contractDetails}
            onChange={handleContractDetailsChange}
          />
        );
      case 2: // Industries
        return (
          <IndustryStep
            state={wizardState}
            onUpdate={updateWizardState}
          />
        );
      case 3: // Equipment / Facility Names (filtered by industries + nomenclature)
        return <AssetNamesStep state={wizardState} onUpdate={updateWizardState} />;
      case 4: // Service Blocks — from catalog (same as contract wizard)
        return (
          <ServiceBlocksStep
            selectedBlocks={selectedBlocks}
            currency={wizardState.contractDetails.currency || 'INR'}
            onBlocksChange={setSelectedBlocks}
            contractName={wizardState.contractDetails.contractName || 'Global Template'}
            contractStatus="draft"
            contractDuration={wizardState.contractDetails.durationValue}
            contractStartDate={wizardState.contractDetails.startDate}
            rfqMode={false}
            coverageTypes={[]}
          />
        );
      case 5: // Billing Defaults
        return <BillingDefaultsStep state={wizardState} onUpdate={updateWizardState} />;
      case 6: // Policies & Compliance
        return <PoliciesStep state={wizardState} onUpdate={updateWizardState} />;
      case 7: // Review & Publish
        return (
          <ReviewPublishStep
            state={wizardState}
            onUpdate={updateWizardState}
            blockCount={selectedBlocks.length}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50" style={{ backgroundColor: colors.utility.primaryBackground }}>

      {/* ─── Slim Header ─────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 py-3 border-b shrink-0"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.secondaryText}15`,
        }}
      >
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5" style={{ color: colors.brand.primary }} />
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
            {isEditMode ? 'Editing' : 'Global Template'}
          </span>
        </div>

        <button
          onClick={handleExit}
          className="p-2 rounded-lg transition-colors hover:opacity-80"
          style={{
            backgroundColor: `${colors.utility.secondaryText}10`,
            color: colors.utility.secondaryText,
          }}
          title="Close wizard"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* ─── Step Content ────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-24" style={{ height: 'calc(100vh - 56px)' }}>
        {isEditMode && isLoadingTemplate ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3" style={{ borderColor: colors.brand.primary }} />
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>Loading template...</p>
            </div>
          </div>
        ) : (
          renderStep()
        )}
      </main>

      {/* ─── Floating Action Island (same as contract wizard) ──── */}
      <FloatingActionIsland
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepLabels={stepLabels}
        totalValue={0}
        currency={wizardState.contractDetails.currency || 'INR'}
        canGoBack={!isFirstStep}
        canGoNext={canProceed()}
        isLastStep={isLastStep}
        onBack={goBack}
        onNext={goNext}
        onClose={handleExit}
        sendButtonText={isEditMode ? 'Update Template' : 'Save Template'}
        showTotal={false}
        isSavingDraft={isSaving}
        draftSaveStatus={draftSaveStatus}
      />
    </div>
  );
};

export default GlobalDesignerPage;
