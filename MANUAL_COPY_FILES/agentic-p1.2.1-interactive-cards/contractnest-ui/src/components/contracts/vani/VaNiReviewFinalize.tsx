// src/components/contracts/vani/VaNiReviewFinalize.tsx
// Single-view review + finalize for VaNi-drafted contracts (owner decision:
// no wizard walk needed — the contract VIEW plus Approve & Send; "Edit"
// falls back to the wizard).
//
// Reuses the existing ReviewSendStep (the wizard's paper-canvas contract
// view) and finalizes through useContractSubmission — the SAME write path
// as the wizard (mapWizardToRequest → createContract → status transition).
//
// Auto-accept drafts route to the wizard: they need the pre-payment dialog,
// which lives there.

import React, { useMemo, useState } from 'react';
import {
  Sparkles, ArrowLeft, CheckCircle2, PencilLine, Send, Loader2,
  AlertTriangle, Info, Copy, Check,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import ReviewSendStep from '@/components/contracts/ContractWizard/steps/ReviewSendStep';
import useContractSubmission, { SubmissionResult } from '@/hooks/useContractSubmission';
import vaniComposerService, { VaniComposeResult } from '@/services/vaniComposerService';

export interface VaNiReviewFinalizeProps {
  result: VaniComposeResult;
  interactionIds: string[];
  /** Edit → open the wizard pre-filled */
  onEdit: () => void;
  /** Back to the canvas cards */
  onBack: () => void;
  /** Close after success (or cancel) */
  onDone: () => void;
}

const VaNiReviewFinalize: React.FC<VaNiReviewFinalizeProps> = ({
  result,
  interactionIds,
  onEdit,
  onBack,
  onDone,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();
  const { submit, isSubmitting } = useContractSubmission();

  const [sent, setSent] = useState<SubmissionResult | null>(null);
  const [cnakCopied, setCnakCopied] = useState(false);

  const draft = result.draft;
  const cardBg = isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF';

  // Send is blocked until the hard requirements are met (same rules the
  // wizard's gated steps enforce): buyer + blocks (+ coverage for asset groups)
  const blockers = useMemo(() => {
    const list: string[] = [];
    if (!draft.buyerId) list.push('Buyer not selected — use Edit in wizard to pick or create the contact');
    if (draft.selectedBlocks.length === 0) list.push('No service blocks');
    if (
      draft.nomenclatureGroup &&
      ['equipment_maintenance', 'facility_property'].includes(draft.nomenclatureGroup) &&
      draft.coverageTypes.length === 0
    ) {
      list.push('Asset coverage missing — use Edit in wizard to pick coverage');
    }
    return list;
  }, [draft]);

  const isAutoAccept = draft.acceptanceMethod === 'auto';

  const handleSend = async () => {
    try {
      const created = await submit(draft as any, 'client');
      setSent(created);
      vaniComposerService.sendFeedback(interactionIds, { was_accepted: true, was_edited: false });
      addToast({
        type: 'success',
        title: 'Contract sent',
        message: `${draft.contractName} is now awaiting acceptance.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Sending failed', message: err?.message || 'Please try again.' });
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
                Drafted by VaNi — check it, then approve
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

        {/* ── SUCCESS ── */}
        {sent ? (
          <div className="p-10 flex flex-col items-center text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: `${colors.semantic.success}15` }}
            >
              <CheckCircle2 className="w-8 h-8" style={{ color: colors.semantic.success }} />
            </div>
            <h3 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
              Contract sent
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
            {/* ── CONTRACT VIEW (the wizard's paper canvas, standalone) ── */}
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
                {isAutoAccept ? (
                  <button
                    onClick={onEdit}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90"
                    style={{ backgroundColor: colors.brand.primary }}
                    title="Auto-accept contracts collect payment at creation — the wizard handles that"
                  >
                    Continue in wizard (payment on acceptance)
                    <PencilLine className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={isSubmitting || blockers.length > 0}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: colors.semantic.success }}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isSubmitting ? 'Sending…' : 'Approve & Send'}
                  </button>
                )}
              </div>
              <p className="mt-2 text-[10px] text-right" style={{ color: colors.utility.secondaryText }}>
                Sending creates the contract and notifies the buyer — same pipeline as the wizard.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VaNiReviewFinalize;
