// src/components/contracts/vani/VaNiComposerLauncher.tsx
// VaNi Contract Composer — intent → drafted contract, reviewed in the wizard.
//
// HONEST PROGRESS: every stage shown here is a real backend call in flight
// (intent parse and block composition are genuine LLM calls on the VaNi
// server; they take 30–90s each on CPU inference). The elapsed timer is real.
// No fake streaming, no theater — see AGENT_BUILD_RETRO §8.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles, X, ArrowRight, AlertTriangle, Info, Wrench,
  CalendarDays, Receipt, Loader2, User, Building2,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import vaniComposerService, {
  VaniParseIntentResult,
  VaniComposeResult,
} from '@/services/vaniComposerService';
import { getCurrencySymbol } from '@/utils/constants/currencies';

export interface VaNiComposerLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  /** Draft ready → open the wizard pre-filled */
  onDraftReady: (result: VaniComposeResult, interactionIds: string[]) => void;
}

type Stage = 'input' | 'parsing' | 'disambiguate' | 'composing' | 'result';

const EXAMPLES = [
  '1 year AMC for Kamal Industries with quarterly billing',
  'HVAC maintenance contract for 6 months, billed monthly',
  'Annual inspection contract for the chiller units, full payment upfront',
];

const VaNiComposerLauncher: React.FC<VaNiComposerLauncherProps> = ({
  isOpen,
  onClose,
  onDraftReady,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();

  const [stage, setStage] = useState<Stage>('input');
  const [text, setText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [parseResult, setParseResult] = useState<VaniParseIntentResult | null>(null);
  const [composeResult, setComposeResult] = useState<VaniComposeResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cardBg = isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF';

  // Elapsed-seconds ticker while a real call is in flight
  useEffect(() => {
    if (stage === 'parsing' || stage === 'composing') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [stage]);

  const reset = useCallback(() => {
    setStage('input');
    setText('');
    setParseResult(null);
    setComposeResult(null);
    setElapsed(0);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // ── Step 1: parse intent (real LLM call) ──
  const handleParse = useCallback(async () => {
    if (text.trim().length < 5) return;
    setStage('parsing');
    try {
      const result = await vaniComposerService.parseIntent(text.trim());
      setParseResult(result);

      if (result.buyer.status === 'resolved' && result.buyer.contact) {
        await runCompose(result, result.buyer.contact.id, result.buyer.contact.name);
      } else if (result.buyer.status === 'ambiguous') {
        setStage('disambiguate');
      } else {
        addToast({
          type: 'warning',
          title: 'Buyer not found',
          message: result.intent.buyer_text
            ? `No contact matching "${result.intent.buyer_text}". Add the contact first, then try again.`
            : 'Mention who the contract is for, e.g. "…for Kamal Industries".',
        });
        setStage('input');
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'VaNi could not read that', message: err.message });
      setStage('input');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, addToast]);

  // ── Step 2: compose (real LLM call over the shortlisted catalog) ──
  const runCompose = useCallback(async (
    parsed: VaniParseIntentResult,
    buyerId: string,
    buyerName: string
  ) => {
    setStage('composing');
    try {
      const result = await vaniComposerService.compose(parsed.intent, buyerId, buyerName);
      setComposeResult(result);
      setStage('result');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Composition failed', message: err.message });
      setStage('input');
    }
  }, [addToast]);

  const handleReview = useCallback(() => {
    if (!composeResult || !parseResult) return;
    onDraftReady(composeResult, [parseResult.interactionId, composeResult.interactionId]);
    reset();
  }, [composeResult, parseResult, onDraftReady, reset]);

  if (!isOpen) return null;

  const busy = stage === 'parsing' || stage === 'composing';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: cardBg }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: `linear-gradient(135deg, ${colors.brand.primary}14, ${colors.brand.primary}04)` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.primary}BB)` }}
            >
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                Draft with VaNi
              </h3>
              <p className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                Describe the contract — VaNi drafts it from your catalog
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={busy}
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity disabled:opacity-30"
            style={{ color: colors.utility.secondaryText }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {/* ── INPUT ── */}
          {stage === 'input' && (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='e.g. "1 year AMC for Kamal Industries with quarterly billing"'
                rows={3}
                maxLength={500}
                autoFocus
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none focus:ring-2"
                style={{
                  backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F9FAFB',
                  borderColor: `${colors.utility.primaryText}20`,
                  color: colors.utility.primaryText,
                }}
              />
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
                  Try
                </p>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setText(ex)}
                    className="block w-full text-left text-xs px-3 py-2 rounded-lg border border-dashed hover:opacity-80 transition-opacity"
                    style={{ borderColor: `${colors.brand.primary}30`, color: colors.utility.secondaryText }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <button
                onClick={handleParse}
                disabled={text.trim().length < 5}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: colors.brand.primary }}
              >
                <Sparkles className="w-4 h-4" />
                Draft it
              </button>
              <p className="mt-2 text-[10px] text-center" style={{ color: colors.utility.secondaryText }}>
                VaNi runs on your own AI server — drafting takes a minute or two. You review everything before sending.
              </p>
            </>
          )}

          {/* ── WORKING (real calls, real timer) ── */}
          {busy && (
            <div className="py-10 flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: colors.brand.primary }} />
              <p className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
                {stage === 'parsing' ? 'VaNi is reading your request…' : 'VaNi is composing from your catalog…'}
              </p>
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                {stage === 'parsing'
                  ? 'Parsing intent and finding the buyer'
                  : 'Selecting service blocks and checking for gaps'}
                {' · '}{elapsed}s
              </p>
            </div>
          )}

          {/* ── BUYER DISAMBIGUATION ── */}
          {stage === 'disambiguate' && parseResult?.buyer.candidates && (
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>
                Which "{parseResult.intent.buyer_text}" did you mean?
              </p>
              <div className="space-y-2">
                {parseResult.buyer.candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => runCompose(parseResult, c.id, c.name)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left hover:opacity-80 transition-opacity"
                    style={{ borderColor: `${colors.utility.primaryText}15`, color: colors.utility.primaryText }}
                  >
                    {c.company_name ? <Building2 className="w-4 h-4 flex-shrink-0" /> : <User className="w-4 h-4 flex-shrink-0" />}
                    <span className="text-sm font-medium">{c.name}</span>
                    {c.company_name && (
                      <span className="text-xs" style={{ color: colors.utility.secondaryText }}>{c.company_name}</span>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStage('input')}
                className="mt-3 text-xs hover:opacity-70"
                style={{ color: colors.utility.secondaryText }}
              >
                ← Back
              </button>
            </div>
          )}

          {/* ── RESULT ── */}
          {stage === 'result' && composeResult && (
            <div>
              <div
                className="px-4 py-3 rounded-xl mb-4"
                style={{ backgroundColor: `${colors.brand.primary}08`, border: `1px solid ${colors.brand.primary}20` }}
              >
                <p className="text-xs leading-relaxed" style={{ color: colors.utility.primaryText }}>
                  <Sparkles className="w-3.5 h-3.5 inline mr-1.5" style={{ color: colors.brand.primary }} />
                  {composeResult.vani.summary}
                </p>
              </div>

              {/* Draft stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { icon: <Wrench className="w-3.5 h-3.5" />, label: 'Blocks', value: composeResult.draft.selectedBlocks.length },
                  { icon: <CalendarDays className="w-3.5 h-3.5" />, label: 'Service events', value: composeResult.eventsPreview.serviceEvents },
                  {
                    icon: <Receipt className="w-3.5 h-3.5" />, label: 'Est. total',
                    value: `${getCurrencySymbol(composeResult.draft.currency)}${composeResult.eventsPreview.estimatedTotal.toLocaleString()}`,
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="px-3 py-2.5 rounded-xl border text-center"
                    style={{ borderColor: `${colors.utility.primaryText}10` }}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1" style={{ color: colors.utility.secondaryText }}>
                      {s.icon}
                      <span className="text-[9px] uppercase tracking-wide">{s.label}</span>
                    </div>
                    <p className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Gaps — the reasoning output, front and center */}
              {composeResult.vani.gaps.length > 0 && (
                <div className="space-y-2 mb-4">
                  {composeResult.vani.gaps.map((gap, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl"
                      style={{
                        backgroundColor: gap.severity === 'warning' ? `${colors.semantic.warning}0A` : `${colors.semantic.info}0A`,
                        border: `1px solid ${gap.severity === 'warning' ? colors.semantic.warning : colors.semantic.info}25`,
                      }}
                    >
                      {gap.severity === 'warning'
                        ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.semantic.warning }} />
                        : <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.semantic.info }} />}
                      <p className="text-xs leading-relaxed" style={{ color: colors.utility.primaryText }}>
                        {gap.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleReview}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
                  style={{ backgroundColor: colors.brand.primary }}
                >
                  Review in Wizard
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-3 rounded-xl border text-sm font-medium hover:opacity-80"
                  style={{ borderColor: `${colors.utility.primaryText}20`, color: colors.utility.secondaryText }}
                >
                  Discard
                </button>
              </div>
              <p className="mt-2 text-[10px] text-center" style={{ color: colors.utility.secondaryText }}>
                Every field is editable in the wizard — nothing is sent until you approve.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VaNiComposerLauncher;
