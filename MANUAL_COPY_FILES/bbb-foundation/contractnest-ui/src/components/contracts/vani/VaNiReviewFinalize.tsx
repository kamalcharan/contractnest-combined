// src/components/contracts/vani/VaNiReviewFinalize.tsx
// Single-view review + finalize for VaNi-drafted contracts (owner decision:
// no wizard walk needed — the contract VIEW plus Approve & Send; "Edit"
// falls back to the wizard).
//
// Reuses the existing ReviewSendStep (the wizard's paper-canvas contract
// view) and finalizes through useContractSubmission — the SAME write path
// as the wizard (mapWizardToRequest → createContract → status transition).
//
// Auto-accept drafts are finalized here too — no wizard detour. They create
// directly and activate (which generates the invoices + billing events);
// payment is recorded afterwards via the Record Payment flow. Only the button
// label changes ("Approve & Create" vs "Approve & Send").

import React, { useMemo, useState } from 'react';
import {
  Sparkles, ArrowLeft, CheckCircle2, PencilLine, Send, Loader2,
  AlertTriangle, Info, Copy, Check, LayoutTemplate,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import ReviewSendStep from '@/components/contracts/ContractWizard/steps/ReviewSendStep';
import EventsPreviewStep from '@/components/contracts/ContractWizard/steps/EventsPreviewStep';
import { createInitialWizardState, serializeWizardState, sanitizeStateForTemplate } from '@/components/contracts/ContractWizard';
import useContractSubmission, { SubmissionResult } from '@/hooks/useContractSubmission';
import vaniComposerService, { VaniComposeResult } from '@/services/vaniComposerService';
import { useSaveTemplate } from '@/hooks/mutations/useCatTemplatesMutations';

export interface VaNiReviewFinalizeProps {
  result: VaniComposeResult;
  interactionIds: string[];
  /** Edit → open the wizard pre-filled */
  onEdit: () => void;
  /** Back to the canvas cards */
  onBack: () => void;
  /** Close after success (or cancel) */
  onDone: () => void;
  /** 'template': the draft becomes a reusable template, not a contract —
   *  no buyer required, final action = Save Template (draft lifecycle) */
  mode?: 'contract' | 'template';
  onTemplateSaved?: () => void;
  /** Which review tab to open on ('contract' default, or jump straight to 'events') */
  initialView?: 'contract' | 'events';
}

const VaNiReviewFinalize: React.FC<VaNiReviewFinalizeProps> = ({
  result,
  interactionIds,
  onEdit,
  onBack,
  onDone,
  mode = 'contract',
  onTemplateSaved,
  initialView = 'contract',
}) => {
  const isTemplateMode = mode === 'template';
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();
  const { submit, isSubmitting } = useContractSubmission();

  const [sent, setSent] = useState<SubmissionResult | null>(null);
  const [cnakCopied, setCnakCopied] = useState(false);

  // Contract | Events view switch. Event-date overrides made on the Events
  // view flow into the same computed_events pipeline the wizard uses.
  const [reviewView, setReviewView] = useState<'contract' | 'events'>(initialView);
  const [eventOverrides, setEventOverrides] = useState<Record<string, Date>>({});

  // Save-as-template: the door that makes the template tier self-feeding —
  // the next similar request skips the LLM entirely.
  const saveTemplateMutation = useSaveTemplate();
  const [templateName, setTemplateName] = useState(
    mode === 'template' ? (result.draft.contractName || '') : ''
  );
  const [templateSaved, setTemplateSaved] = useState(false);

  const draft = result.draft;
  const cardBg = isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF';

  // Send is blocked until the hard requirements are met (same rules the
  // wizard's gated steps enforce): buyer + blocks (+ coverage for asset groups)
  const blockers = useMemo(() => {
    const list: string[] = [];
    if (draft.selectedBlocks.length === 0) list.push('No service blocks');
    if (!isTemplateMode) {
      if (!draft.buyerId) list.push('Buyer not selected — use Edit in wizard to pick or create the contact');
      if (
        draft.nomenclatureGroup &&
        ['equipment_maintenance', 'facility_property'].includes(draft.nomenclatureGroup) &&
        draft.coverageTypes.length === 0
      ) {
        list.push('Asset coverage missing — use Edit in wizard to pick coverage');
      }
    }
    return list;
  }, [draft, isTemplateMode]);

  const isAutoAccept = draft.acceptanceMethod === 'auto';

  const handleSend = async () => {
    try {
      const created = await submit({ ...draft, eventOverrides } as any, 'client');
      setSent(created);
      vaniComposerService.sendFeedback(interactionIds, { was_accepted: true, was_edited: false });
      addToast({
        type: 'success',
        title: isAutoAccept ? 'Contract created' : 'Contract sent',
        message: isAutoAccept
          ? `${draft.contractName} is active — record payment when it comes in.`
          : `${draft.contractName} is now awaiting acceptance.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Sending failed', message: err?.message || 'Please try again.' });
    }
  };

  const handleSaveAsTemplate = async () => {
    const name = templateName.trim();
    if (!name || saveTemplateMutation.isPending) return;
    const blocks = draft.selectedBlocks.map((b: any, idx: number) => ({
      block_id: b.id,
      order: idx,
      config_overrides: {
        name: b.name,
        unit_price: b.price,
        quantity: b.quantity,
        billing_cycle: b.cycle,
        total_price: b.totalPrice,
        currency: b.currency,
        config: b.config || {},
      },
    }));
    // Counterparty-free wizard state built + serialized THE SAME WAY the wizard
    // does: createInitialWizardState() fills every field, sanitizeStateForTemplate
    // strips buyer/assets/overrides, serializeWizardState normalises dates. This
    // makes a VaNi-saved template hydrate cleanly when later opened in the wizard
    // (both save paths now produce an identical wizard_state shape).
    const wizardState = serializeWizardState(
      sanitizeStateForTemplate({
        ...createInitialWizardState(),
        ...(draft as any),
        contractName: name,
        wizardMode: 'contract',
        startDate: draft.startDate ? new Date(draft.startDate) : new Date(),
      } as any)
    );
    try {
      await saveTemplateMutation.mutateAsync({
        data: {
          name,
          display_name: name,
          description: draft.description || undefined,
          blocks,
          currency: draft.currency,
          category: draft.nomenclatureGroup || undefined,
          tags: draft.nomenclatureName ? [draft.nomenclatureName] : undefined,
          subtotal: draft.baseSubtotal || draft.totalValue || null,
          total: draft.grandTotal || null,
          settings: {
            template_source: 'vani-canvas',
            lifecycle: 'draft',
            wizard_state: wizardState,
            defaults: {
              nomenclature_id: draft.nomenclatureId,
              nomenclature_name: draft.nomenclatureName,
              nomenclature_group: draft.nomenclatureGroup,
              duration_value: draft.durationValue,
              duration_unit: draft.durationUnit,
              grace_period_value: draft.gracePeriodValue,
              grace_period_unit: draft.gracePeriodUnit,
              acceptance_method: draft.acceptanceMethod,
              billing_cycle_type: draft.billingCycleType,
              payment_mode: draft.paymentMode,
              emi_months: draft.paymentMode === 'emi' ? draft.emiMonths : undefined,
              selected_tax_rate_ids: draft.selectedTaxRateIds,
              evidence_policy_type: draft.evidencePolicyType,
              evidence_selected_forms: draft.evidenceSelectedForms,
            },
          },
        },
      });
      setTemplateSaved(true);
      onTemplateSaved?.();
      if (isTemplateMode) {
        vaniComposerService.sendFeedback(interactionIds, { was_accepted: true, was_edited: false });
      }
    } catch {
      // Error toast comes from the mutation's onError
    }
  };

  const copyCnak = () => {
    if (sent?.global_access_id) {
      navigator.clipboard.writeText(sent.global_access_id);
      setCnakCopied(true);
      setTimeout(() => setCnakCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div
        className="w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: cardBg, maxHeight: '95vh', minHeight: '80vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${colors.brand.primary}14, ${colors.brand.primary}04)` }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              disabled={isSubmitting || !!sent}
              className="p-1.5 rounded-lg hover:opacity-70 disabled:opacity-30"
              style={{ color: colors.utility.secondaryText }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                Review & Finalize
              </h3>
              <p className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                <Sparkles className="w-3 h-3 inline mr-1" style={{ color: colors.brand.primary }} />
                {isTemplateMode ? 'Template drafted by VaNi — review, then save' : 'Drafted by VaNi — check it, then approve'}
              </p>
            </div>
          </div>
          {/* Defaults strip — what VaNi assumed; adjust via Back (canvas preferences) */}
          {!sent && (
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {[
                `Acceptance: ${draft.acceptanceMethod === 'signoff' ? 'Sign-off' : draft.acceptanceMethod}`,
                `Start: ${draft.startDate ? draft.startDate.slice(0, 10) : 'today (default)'}`,
                `Currency: ${draft.currency}`,
                draft.paymentMode === 'emi'
                  ? `EMI ×${draft.emiMonths}`
                  : draft.paymentMode === 'defined' ? 'Billed per cycle' : 'Paid upfront',
              ].map((chip) => (
                <span
                  key={chip}
                  className="px-2.5 py-1 rounded-full border text-[10px] font-medium"
                  style={{ borderColor: `${colors.brand.primary}30`, color: colors.utility.secondaryText }}
                  title="Change via ← Back — the Preferences card re-assembles instantly"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── TEMPLATE SAVED ── */}
        {isTemplateMode && templateSaved ? (
          <div className="p-10 flex flex-col items-center text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: `${colors.semantic.success}15` }}
            >
              <CheckCircle2 className="w-8 h-8" style={{ color: colors.semantic.success }} />
            </div>
            <h3 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
              Template saved as draft
            </h3>
            <p className="text-sm mb-1" style={{ color: colors.utility.secondaryText }}>
              {templateName}
            </p>
            <p className="text-xs mb-6 max-w-sm" style={{ color: colors.utility.secondaryText }}>
              Publish it on the Templates page — published templates power the contract
              wizard and VaNi's instant path.
            </p>
            <button
              onClick={onDone}
              className="px-8 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90"
              style={{ backgroundColor: colors.brand.primary }}
            >
              Done
            </button>
          </div>
        ) : sent ? (
          <div className="p-10 flex flex-col items-center text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: `${colors.semantic.success}15` }}
            >
              <CheckCircle2 className="w-8 h-8" style={{ color: colors.semantic.success }} />
            </div>
            <h3 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
              {isAutoAccept ? 'Contract created' : 'Contract sent'}
            </h3>
            <p className="text-sm mb-1" style={{ color: colors.utility.secondaryText }}>
              {draft.contractName}
            </p>
            <p className="text-xs mb-4" style={{ color: colors.utility.secondaryText }}>
              Status: {sent.status.replace(/_/g, ' ')}
              {sent.contract_number ? ` · ${sent.contract_number}` : ''}
            </p>
            {sent.global_access_id && (
              <button
                onClick={copyCnak}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-mono mb-6 hover:opacity-80"
                style={{ borderColor: `${colors.utility.primaryText}20`, color: colors.utility.primaryText }}
              >
                {cnakCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {sent.global_access_id}
              </button>
            )}
            {/* Save this pick as a template — next time VaNi answers instantly */}
            <div
              className="w-full max-w-md rounded-xl border p-4 mb-6 text-left"
              style={{ borderColor: `${colors.brand.primary}30`, backgroundColor: `${colors.brand.primary}06` }}
            >
              {templateSaved ? (
                <p className="text-xs flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: colors.semantic.success }} />
                  Saved as a draft template — publish it on the <strong>Templates</strong> page and
                  VaNi will reuse it instantly for similar requests.
                </p>
              ) : (
                <>
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: colors.utility.primaryText }}>
                    <LayoutTemplate className="w-3.5 h-3.5" style={{ color: colors.brand.primary }} />
                    Save this as a template?
                  </p>
                  <p className="text-[11px] mb-2" style={{ color: colors.utility.secondaryText }}>
                    Next time, VaNi composes this pattern in seconds — no AI needed.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder={`e.g. ${draft.nomenclatureName || 'Service Contract'} — ${draft.durationValue} ${draft.durationUnit}`}
                      className="flex-1 px-3 py-2 rounded-lg border text-xs outline-none"
                      style={{
                        backgroundColor: cardBg,
                        borderColor: `${colors.utility.primaryText}20`,
                        color: colors.utility.primaryText,
                      }}
                    />
                    <button
                      onClick={handleSaveAsTemplate}
                      disabled={!templateName.trim() || saveTemplateMutation.isPending}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: colors.brand.primary }}
                    >
                      {saveTemplateMutation.isPending ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={onDone}
              className="px-8 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90"
              style={{ backgroundColor: colors.brand.primary }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* ── VIEW SWITCH: Contract | Events Schedule ── */}
            <div
              className="flex items-center gap-1.5 px-6 pt-3 flex-shrink-0"
            >
              {([['contract', isTemplateMode ? 'Template' : 'Contract'], ['events', 'Events Schedule']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setReviewView(key)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: reviewView === key ? colors.brand.primary : 'transparent',
                    color: reviewView === key ? '#fff' : colors.utility.secondaryText,
                    border: reviewView === key ? 'none' : `1px solid ${colors.utility.primaryText}20`,
                  }}
                >
                  {label}
                </button>
              ))}
              {reviewView === 'events' && isTemplateMode && (
                <span className="text-[11px] ml-2" style={{ color: colors.semantic.warning }}>
                  Illustrative — assumes a start today; real dates are set per contract
                </span>
              )}
            </div>

            {/* ── CONTRACT VIEW (the wizard's paper canvas, standalone) ── */}
            {reviewView === 'events' ? (
              <div className="flex-1 overflow-y-auto p-6">
                <EventsPreviewStep
                  startDate={draft.startDate ? new Date(draft.startDate) : new Date()}
                  durationValue={draft.durationValue}
                  durationUnit={draft.durationUnit}
                  selectedBlocks={draft.selectedBlocks as any}
                  paymentMode={draft.paymentMode}
                  emiMonths={draft.emiMonths}
                  perBlockPaymentType={draft.perBlockPaymentType}
                  billingCycleType={draft.billingCycleType}
                  grandTotal={draft.grandTotal || draft.totalValue}
                  currency={draft.currency}
                  eventOverrides={eventOverrides}
                  onEventOverridesChange={setEventOverrides}
                  readOnly={isTemplateMode}
                />
              </div>
            ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <ReviewSendStep
                contractName={draft.contractName}
                contractStatus="draft"
                description={draft.description}
                durationValue={draft.durationValue}
                durationUnit={draft.durationUnit}
                buyerId={draft.buyerId || null}
                buyerName={draft.buyerName}
                acceptanceMethod={draft.acceptanceMethod}
                billingCycleType={draft.billingCycleType}
                currency={draft.currency}
                selectedBlocks={draft.selectedBlocks as any}
                paymentMode={draft.paymentMode}
                emiMonths={draft.emiMonths}
                perBlockPaymentType={draft.perBlockPaymentType}
                selectedTaxRateIds={draft.selectedTaxRateIds}
                nomenclatureName={draft.nomenclatureName}
                forcedViewMode="self"
              />
            </div>
            )}

            {/* ── FOOTER: gaps + actions ── */}
            <div
              className="flex-shrink-0 px-6 py-4 border-t"
              style={{ borderColor: `${colors.utility.primaryText}10`, backgroundColor: cardBg }}
            >
              {(blockers.length > 0 || result.vani.gaps.some((g) => g.severity === 'warning')) && (
                <div className="mb-3 space-y-1">
                  {blockers.map((b, i) => (
                    <p key={`b${i}`} className="text-[11px] flex items-center gap-1.5" style={{ color: colors.semantic.error }}>
                      <AlertTriangle className="w-3.5 h-3.5" /> {b}
                    </p>
                  ))}
                  {result.vani.gaps.filter((g) => g.severity === 'warning').map((g, i) => (
                    <p key={`g${i}`} className="text-[11px] flex items-center gap-1.5" style={{ color: colors.semantic.warning }}>
                      <Info className="w-3.5 h-3.5" /> {g.message}
                    </p>
                  ))}
                </div>
              )}

              {isTemplateMode ? (
                <div className="flex items-center gap-2">
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Template name"
                    className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none"
                    style={{
                      backgroundColor: cardBg,
                      borderColor: `${colors.utility.primaryText}20`,
                      color: colors.utility.primaryText,
                    }}
                  />
                  <button
                    onClick={handleSaveAsTemplate}
                    disabled={!templateName.trim() || blockers.length > 0 || saveTemplateMutation.isPending}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: colors.semantic.success }}
                  >
                    {saveTemplateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutTemplate className="w-4 h-4" />}
                    {saveTemplateMutation.isPending ? 'Saving…' : 'Save Template'}
                  </button>
                </div>
              ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onEdit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium hover:opacity-80 disabled:opacity-40"
                  style={{ borderColor: `${colors.utility.primaryText}20`, color: colors.utility.primaryText }}
                >
                  <PencilLine className="w-4 h-4" />
                  Edit in wizard
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleSend}
                  disabled={isSubmitting || blockers.length > 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: colors.semantic.success }}
                  title={isAutoAccept
                    ? 'Creates and activates the contract now — record payment afterwards'
                    : 'Creates the contract and notifies the buyer to accept'}
                >
                  {isSubmitting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : (isAutoAccept ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />)}
                  {isSubmitting
                    ? (isAutoAccept ? 'Creating…' : 'Sending…')
                    : (isAutoAccept ? 'Approve & Create' : 'Approve & Send')}
                </button>
              </div>
              )}
              <p className="mt-2 text-[10px] text-right" style={{ color: colors.utility.secondaryText }}>
                {isTemplateMode
                  ? 'Saves a draft template — publish it on the Templates page to activate it.'
                  : isAutoAccept
                    ? 'Creates and activates the contract now (invoices + billing events generated) — record payment when it arrives.'
                    : 'Sending creates the contract and notifies the buyer — same pipeline as the wizard.'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VaNiReviewFinalize;
