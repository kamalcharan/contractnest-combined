// src/components/contracts/vani/VaNiComposerLauncher.tsx
// VaNi Canvas — intent → drafted contract, one animated card per REAL
// pipeline step (owner sketch 2026-07-02):
//   · left: VaNi builder box (live narration + real elapsed timer)
//   · right: step cards that animate OUT of the VaNi box along a dotted
//     connector, one per completed backend step; some cards pause for user
//     action (buyer pick).
//
// HONESTY RULE (retro §8): a card appears ONLY after its endpoint returned.
// The five steps are five real calls: parse-intent (LLM) → resolve-buyer →
// shortlist → select-blocks (LLM) → assemble. No simulated streaming.
//
// Flow ends in VaNiReviewFinalize (single-view review + Approve & Send);
// "Edit in wizard" hands off via onDraftReady (vaniPrefill hydration).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles, X, ArrowRight, AlertTriangle, Info, Wrench, FileText,
  CalendarDays, Receipt, Loader2, User, Building2, CheckCircle2,
  Search, ClipboardCheck, Package, PencilLine, RotateCcw, UserPlus,
  Settings2, Zap, LayoutTemplate,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import QuickAddContactDrawer from '@/components/contacts/QuickAddContactDrawer';
import vaniComposerService, {
  VaniParseStepResult,
  VaniBuyerResolution,
  VaniShortlistResult,
  VaniSelectResult,
  VaniComposeResult,
  VaniTemplateMatch,
} from '@/services/vaniComposerService';
import { getCurrencySymbol, getDefaultCurrency, currencyOptions } from '@/utils/constants/currencies';
import VaNiReviewFinalize from './VaNiReviewFinalize';

export interface VaNiComposerLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  /** Edit path → open the wizard pre-filled, optionally at a specific step */
  onDraftReady: (result: VaniComposeResult, interactionIds: string[], initialStepId?: string) => void;
  /** 'template': compose a reusable TEMPLATE — no buyer step, no dates;
   *  review saves a draft template instead of sending a contract */
  mode?: 'contract' | 'template';
  onTemplateSaved?: () => void;
}

type StepId = 'parse' | 'template' | 'buyer' | 'shortlist' | 'select' | 'assemble';
type Stage = 'input' | 'running' | 'ready' | 'review';

interface StepCard {
  id: StepId;
  title: string;
  icon: React.ReactNode;
  status: 'done' | 'action' | 'error';
  body: React.ReactNode;
}

const STEP_NARRATION: Record<StepId, { title: string; detail: string }> = {
  parse: { title: 'Reading your request…', detail: 'Understanding type, duration and billing (AI)' },
  template: { title: 'Checking your templates…', detail: 'A published template can answer this instantly' },
  buyer: { title: 'Finding the buyer…', detail: 'Searching your contacts' },
  shortlist: { title: 'Scanning your catalog…', detail: 'Filtering and ranking service blocks' },
  select: { title: 'Composing the contract…', detail: 'Choosing blocks and checking for gaps (AI)' },
  assemble: { title: 'Assembling the draft…', detail: 'Pricing, assets, evidence and the service calendar' },
};

const TEMPLATE_EXAMPLES = [
  '1 year HVAC AMC with quarterly PM visits and sign-off acceptance',
  '6 month housekeeping FMC, billed monthly',
  'Annual chiller maintenance package with inspections',
];

const EXAMPLES = [
  '1 year AMC for Kamal Industries with quarterly billing',
  'HVAC maintenance contract for 6 months, billed monthly',
  'Annual inspection contract for the chiller units, full payment upfront',
];

// Card slide-out-of-VaNi animation (injected once)
const CANVAS_CSS = `
@keyframes vaniCardIn {
  from { opacity: 0; transform: translateX(-260px) scale(0.92); }
  to   { opacity: 1; transform: none; }
}
.vani-card-in { animation: vaniCardIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
`;

const VaNiComposerLauncher: React.FC<VaNiComposerLauncherProps> = ({
  isOpen,
  onClose,
  onDraftReady,
  mode = 'contract',
  onTemplateSaved,
}) => {
  const isTemplateMode = mode === 'template';
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();

  const [stage, setStage] = useState<Stage>('input');
  // Which tab the review opens on — set by the Ready-card buttons.
  const [reviewInitialView, setReviewInitialView] = useState<'contract' | 'events'>('contract');
  const [text, setText] = useState('');
  const [runningStep, setRunningStep] = useState<StepId | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [cards, setCards] = useState<StepCard[]>([]);

  // Pipeline data carried between steps
  const parseRef = useRef<VaniParseStepResult | null>(null);
  const templateMatchRef = useRef<VaniTemplateMatch | null>(null);
  const rawTextRef = useRef<string>('');
  const buyerRef = useRef<{ id: string; name: string } | null>(null);
  const shortlistRef = useRef<VaniShortlistResult | null>(null);
  const selectRef = useRef<VaniSelectResult | null>(null);
  const [result, setResult] = useState<VaniComposeResult | null>(null);

  // Interactive buyer card: live search + quick-create (gap mitigation on-card)
  const [buyerAction, setBuyerAction] = useState<VaniBuyerResolution | null>(null);
  const [buyerSearch, setBuyerSearch] = useState('');
  const [buyerSearching, setBuyerSearching] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Adjustable preferences (defaults visible + changeable; re-assemble on change)
  const [contractCurrency, setContractCurrency] = useState(getDefaultCurrency().code);

  // Smart helper chips — the tenant's templates/equipment/services phrased as
  // prompts (template-derived chips hit the zero-LLM fast path). Static
  // examples remain the cold-start fallback.
  const [smartChips, setSmartChips] = useState<string[]>([]);
  useEffect(() => {
    if (isOpen) {
      vaniComposerService.getSuggestions(isTemplateMode ? 'template' : 'contract')
        .then(setSmartChips);
    }
  }, [isOpen, isTemplateMode]);

  const cardBg = isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF';
  const dotted = `${colors.brand.primary}50`;

  // Real elapsed timer while a step runs
  useEffect(() => {
    if (runningStep) {
      setElapsed(0);
      const t = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => clearInterval(t);
    }
  }, [runningStep]);

  const reset = useCallback(() => {
    setStage('input');
    setText('');
    setRunningStep(null);
    setCards([]);
    setResult(null);
    setBuyerAction(null);
    setBuyerSearch('');
    setShowQuickAdd(false);
    setContractCurrency(getDefaultCurrency().code);
    parseRef.current = null;
    templateMatchRef.current = null;
    rawTextRef.current = '';
    buyerRef.current = null;
    shortlistRef.current = null;
    selectRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const pushCard = useCallback((card: StepCard) => {
    setCards((prev) => [...prev.filter((c) => c.id !== card.id), card]);
  }, []);

  const fail = useCallback((step: StepId, title: string, err: any, retry: () => void) => {
    setRunningStep(null);
    setCards((prev) => [...prev.filter((c) => c.id !== step), {
      id: step,
      title,
      icon: <AlertTriangle className="w-4 h-4" />,
      status: 'error' as const,
      body: (
        <div>
          <p className="text-xs mb-2">{err?.message || 'Failed'}</p>
          <button
            onClick={retry}
            className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-80"
          >
            <RotateCcw className="w-3 h-3" /> Retry this step
          </button>
        </div>
      ),
    }]);
  }, []);

  const buyerDoneCard = useCallback((name: string | null): StepCard => ({
    id: 'buyer',
    title: name ? 'Buyer found' : 'Buyer to be picked at review',
    icon: <User className="w-4 h-4" />,
    status: 'done',
    body: (
      <p className="text-xs">
        {name ? <><strong>{name}</strong> · from your contacts</> : 'You can select or quick-create the contact during review.'}
      </p>
    ),
  }), []);

  // ── STEP 5: assemble (deterministic) ──
  const runAssemble = useCallback(async (currencyOverride?: string) => {
    const parse = parseRef.current;
    const shortlist = shortlistRef.current;
    const selection = selectRef.current;
    if (!parse || !shortlist || !selection) return;
    setRunningStep('assemble');
    try {
      const res = await vaniComposerService.assemble(
        parse.intent, buyerRef.current, shortlist.candidates, selection,
        currencyOverride ?? contractCurrency
      );
      setResult(res);
      pushCard({
        id: 'assemble',
        title: 'Draft assembled',
        icon: <ClipboardCheck className="w-4 h-4" />,
        status: 'done',
        body: (
          <div className="text-xs space-y-1">
            <p>
              <CalendarDays className="w-3 h-3 inline mr-1" />
              {res.eventsPreview.serviceEvents} service events · {res.eventsPreview.billingEvents} billing events
            </p>
            <p>
              <Receipt className="w-3 h-3 inline mr-1" />
              {getCurrencySymbol(res.draft.currency)}{res.draft.grandTotal.toLocaleString()} incl. tax
              {' '}· acceptance: {res.draft.acceptanceMethod}
            </p>
            {res.draft.coverageTypes.length > 0 && (
              <p>Coverage: {res.draft.coverageTypes.map((c: any) => c.resource_name).join(', ')}</p>
            )}
            {res.draft.evidencePolicyType !== 'none' && (
              <p>Evidence: {res.draft.evidencePolicyType === 'smart_form' ? 'smart forms proposed' : 'photo/upload proof'}</p>
            )}
          </div>
        ),
      });
      setRunningStep(null);
      setStage('ready');
    } catch (err: any) {
      fail('assemble', 'Assembly failed', err, runAssemble);
    }
  }, [pushCard, fail, contractCurrency]);

  // ── TEMPLATE TIER: assemble straight from a matched signed-off template ──
  const runAssembleFromTemplate = useCallback(async (currencyOverride?: string) => {
    const parse = parseRef.current;
    const match = templateMatchRef.current;
    if (!parse || !match) return;
    setRunningStep('assemble');
    try {
      const res = await vaniComposerService.assembleFromTemplate(
        match.template_id, parse.intent, buyerRef.current,
        currencyOverride ?? contractCurrency
      );
      setResult(res);
      pushCard({
        id: 'assemble',
        title: 'Draft assembled from template',
        icon: <ClipboardCheck className="w-4 h-4" />,
        status: 'done',
        body: (
          <div className="text-xs space-y-1">
            <p>
              <CalendarDays className="w-3 h-3 inline mr-1" />
              {res.eventsPreview.serviceEvents} service events · {res.eventsPreview.billingEvents} billing events
            </p>
            <p>
              <Receipt className="w-3 h-3 inline mr-1" />
              {getCurrencySymbol(res.draft.currency)}{res.draft.grandTotal.toLocaleString()} incl. tax
              {' '}· acceptance: {res.draft.acceptanceMethod}
            </p>
            {res.draft.evidencePolicyType !== 'none' && (
              <p>Evidence: {res.draft.evidencePolicyType === 'smart_form' ? 'smart forms (from template)' : 'photo/upload proof'}</p>
            )}
          </div>
        ),
      });
      setRunningStep(null);
      setStage('ready');
    } catch (err: any) {
      fail('assemble', 'Template assembly failed', err, runAssembleFromTemplate);
    }
  }, [pushCard, fail, contractCurrency]);

  /** Re-run the assemble that matches the active path (template vs composed) */
  const reassemble = useCallback((currencyOverride?: string) => {
    if (templateMatchRef.current) runAssembleFromTemplate(currencyOverride);
    else runAssemble(currencyOverride);
  }, [runAssemble, runAssembleFromTemplate]);

  /** Preference adjusters (billing/acceptance/start/currency) — mutate the
   *  intent the pipeline holds and re-run the fast assemble step. */
  const adjustAndReassemble = useCallback((mutate: () => void) => {
    if (!parseRef.current || runningStep) return;
    mutate();
    reassemble();
  }, [reassemble, runningStep]);

  // ── STEP 4: select blocks (LLM) ──
  const runSelect = useCallback(async () => {
    const parse = parseRef.current;
    const shortlist = shortlistRef.current;
    if (!parse || !shortlist) return;
    setRunningStep('select');
    try {
      const res = await vaniComposerService.selectBlocks(parse.intent, parse.nomenclatureMatch, shortlist.candidates);
      selectRef.current = res;
      const byId = new Map(shortlist.candidates.map((c) => [c.block_id, c]));
      pushCard({
        id: 'select',
        title: `${res.selections.length} blocks composed`,
        icon: <Package className="w-4 h-4" />,
        status: 'done',
        body: (
          <div className="space-y-1">
            {res.selections.map((s) => {
              const c = byId.get(s.block_id);
              return (
                <p key={s.block_id} className="text-xs">
                  <Wrench className="w-3 h-3 inline mr-1" />
                  <strong>{c?.name || s.block_id}</strong>
                  {' '}×{s.quantity}{s.reason ? ` — ${s.reason}` : ''}
                </p>
              );
            })}
          </div>
        ),
      });
      runAssemble();
    } catch (err: any) {
      fail('select', 'Block composition failed', err, runSelect);
    }
  }, [pushCard, fail, runAssemble]);

  // ── STEP 3: shortlist (deterministic) ──
  const runShortlist = useCallback(async () => {
    const parse = parseRef.current;
    if (!parse) return;
    setRunningStep('shortlist');
    try {
      const res = await vaniComposerService.shortlist(parse.intent);
      shortlistRef.current = res;
      pushCard({
        id: 'shortlist',
        title: 'Catalog scanned',
        icon: <Search className="w-4 h-4" />,
        status: 'done',
        body: (
          <p className="text-xs">
            <strong>{res.scannedCount}</strong> blocks scanned →{' '}
            <strong>{res.candidates.length}</strong> relevant candidates
            {parse.intent.equipment_hint ? ` for ${parse.intent.equipment_hint}` : ''}
          </p>
        ),
      });
      runSelect();
    } catch (err: any) {
      fail('shortlist', 'Catalog scan failed', err, runShortlist);
    }
  }, [pushCard, fail, runSelect]);

  /** Escape hatch: drop the template and compose fresh via the LLM path */
  const composeFresh = useCallback(() => {
    templateMatchRef.current = null;
    pushCard({
      id: 'template',
      title: 'Composing fresh instead',
      icon: <LayoutTemplate className="w-4 h-4" />,
      status: 'done',
      body: <p className="text-xs">Template set aside — scanning your catalog and composing with AI.</p>,
    });
    runShortlist();
  }, [pushCard, runShortlist]);

  /** Card shown when a signed-off template answers the request */
  const templateMatchedCard = useCallback((match: VaniTemplateMatch): StepCard => ({
    id: 'template',
    title: 'Matched your template',
    icon: <Zap className="w-4 h-4" />,
    status: 'done',
    body: (
      <div className="text-xs space-y-1.5">
        <p>
          <LayoutTemplate className="w-3 h-3 inline mr-1" />
          <strong>{match.name}</strong> · {match.blocks_count} blocks
          {match.total ? <> · {getCurrencySymbol(match.currency)}{Number(match.total).toLocaleString()}</> : null}
        </p>
        {match.reasons.length > 0 && (
          <p className="opacity-80">{match.reasons.join(' · ')}</p>
        )}
        <p className="opacity-80">No AI selection needed — instant and deterministic.</p>
        <button
          onClick={composeFresh}
          className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 mt-1"
        >
          <RotateCcw className="w-3 h-3" /> Compose fresh instead
        </button>
      </div>
    ),
  }), [composeFresh]);

  /** After the buyer settles: template path skips the scan + AI selection */
  const proceedAfterBuyer = useCallback(() => {
    if (templateMatchRef.current) runAssembleFromTemplate();
    else runShortlist();
  }, [runAssembleFromTemplate, runShortlist]);

  /** Resume the pipeline after the user settles the buyer on the card */
  const resumeWithBuyer = useCallback((buyer: { id: string; name: string } | null) => {
    buyerRef.current = buyer;
    setBuyerAction(null);
    setShowQuickAdd(false);
    pushCard(buyerDoneCard(buyer?.name || null));
    proceedAfterBuyer();
  }, [pushCard, buyerDoneCard, proceedAfterBuyer]);

  /** On-card contact search (gap mitigation without leaving the canvas) */
  const handleBuyerSearch = useCallback(async () => {
    const q = buyerSearch.trim();
    if (q.length < 2) return;
    setBuyerSearching(true);
    try {
      const res = await vaniComposerService.resolveBuyer(q);
      if (res.status === 'resolved' && res.contact) {
        resumeWithBuyer(res.contact);
      } else {
        setBuyerAction(res); // new candidates (or none) render on the card
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Search failed', message: err.message });
    } finally {
      setBuyerSearching(false);
    }
  }, [buyerSearch, resumeWithBuyer, addToast]);

  // ── STEP 2: resolve buyer (deterministic; may pause for user action) ──
  const runBuyer = useCallback(async () => {
    const parse = parseRef.current;
    if (!parse) return;
    setRunningStep('buyer');
    try {
      const res: VaniBuyerResolution = await vaniComposerService.resolveBuyer(parse.intent.buyer_text);
      if (res.status === 'resolved' && res.contact) {
        buyerRef.current = res.contact;
        pushCard(buyerDoneCard(res.contact.name));
        proceedAfterBuyer();
      } else {
        setRunningStep(null); // pipeline pauses — user must act
        setBuyerAction(res);
        setBuyerSearch(parse.intent.buyer_text || '');
        pushCard({
          id: 'buyer',
          title: res.status === 'ambiguous'
            ? `Which "${parse.intent.buyer_text}"?`
            : 'Buyer not in your contacts',
          icon: <User className="w-4 h-4" />,
          status: 'action',
          body: null, // interactive body rendered live from buyerAction state
        });
      }
    } catch (err: any) {
      fail('buyer', 'Buyer lookup failed', err, runBuyer);
    }
  }, [pushCard, fail, proceedAfterBuyer, buyerDoneCard]);

  // ── TEMPLATE CHECK (after LLM parse): signed-off template beats the scan ──
  const runTemplateCheck = useCallback(async () => {
    const parse = parseRef.current;
    if (!parse) return;
    setRunningStep('template');
    try {
      const tm = await vaniComposerService.matchTemplate(rawTextRef.current, parse.intent);
      if (tm.match) {
        if (isTemplateMode) {
          // Creating a template: an existing match is a duplicate warning,
          // not a shortcut — surface it and keep composing
          pushCard({
            id: 'template',
            title: 'Similar template already exists',
            icon: <Info className="w-4 h-4" />,
            status: 'done',
            body: (
              <p className="text-xs">
                <strong>{tm.match.name}</strong> looks similar ({tm.match.reasons.join(' · ')}).
                Continuing — compare them on the Templates page before publishing.
              </p>
            ),
          });
        } else {
          templateMatchRef.current = tm.match;
          pushCard(templateMatchedCard(tm.match));
        }
      }
    } catch {
      // Template check must never block the pipeline — fall through to LLM path
      templateMatchRef.current = null;
    }
    if (isTemplateMode) runShortlist(); // templates have no counterparty
    else runBuyer();
  }, [pushCard, templateMatchedCard, runBuyer, runShortlist, isTemplateMode]);

  // ── STEP 1: parse intent (LLM) ──
  const runParse = useCallback(async (inputText: string) => {
    if (inputText.length < 5) return;
    setStage('running');
    setRunningStep('parse');
    try {
      const parse = await vaniComposerService.parseIntent(inputText);
      parseRef.current = parse;
      const it = parse.intent;
      pushCard({
        id: 'parse',
        title: 'Request understood',
        icon: <FileText className="w-4 h-4" />,
        status: 'done',
        body: (
          <div className="text-xs space-y-1">
            <p>
              <strong>{parse.nomenclatureMatch?.name || it.contract_kind}</strong>
              {parse.nomenclatureMatch ? ` · ${parse.nomenclatureMatch.group.replace(/_/g, ' ')}` : ''}
            </p>
            <p>
              {it.duration.value} {it.duration.unit} · {it.billing.mode === 'per_block' ? `${it.billing.cycle} billing` : it.billing.mode === 'emi' ? `EMI ×${it.billing.emi_months}` : 'paid upfront'}
              {it.equipment_hint ? ` · ${it.equipment_hint}` : ''}
            </p>
            {it.start_date && <p>Starts {it.start_date}</p>}
          </div>
        ),
      });
      runTemplateCheck();
    } catch (err: any) {
      addToast({ type: 'error', title: 'VaNi could not read that', message: err.message });
      setStage('input');
      setRunningStep(null);
    }
  }, [pushCard, runTemplateCheck, addToast]);

  // ── ENTRY: zero-LLM fast path first, LLM parse as fallback ──
  // The server quick-parses simple requests and only trusts the result when a
  // signed-off template also matches it (double confirmation). On that path a
  // repeat contract composes with NO LLM calls at all.
  const startPipeline = useCallback(async (inputText: string) => {
    if (inputText.length < 5) return;
    rawTextRef.current = inputText;
    setStage('running');
    if (isTemplateMode) {
      // Template creation always composes fresh — the zero-LLM shortcut
      // instantiates templates, which is the opposite of authoring one
      runParse(inputText);
      return;
    }
    setRunningStep('template');
    try {
      const tm = await vaniComposerService.matchTemplate(inputText);
      if (tm.match && tm.quickIntent) {
        parseRef.current = {
          intent: tm.quickIntent,
          nomenclatureMatch: tm.nomenclatureMatch,
          interactionId: '',
        } as VaniParseStepResult;
        templateMatchRef.current = tm.match;
        const it = tm.quickIntent;
        pushCard({
          id: 'parse',
          title: 'Request understood — instant',
          icon: <Zap className="w-4 h-4" />,
          status: 'done',
          body: (
            <div className="text-xs space-y-1">
              <p>
                <strong>{tm.nomenclatureMatch?.name || it.contract_kind}</strong>
                {tm.nomenclatureMatch ? ` · ${tm.nomenclatureMatch.group.replace(/_/g, ' ')}` : ''}
              </p>
              <p>
                {it.duration.value} {it.duration.unit} · {it.billing.mode === 'per_block' ? `${it.billing.cycle} billing` : it.billing.mode === 'emi' ? `EMI ×${it.billing.emi_months}` : 'paid upfront'}
              </p>
              <p className="opacity-80">Parsed without AI — confirmed by your template.</p>
            </div>
          ),
        });
        pushCard(templateMatchedCard(tm.match));
        runBuyer();
        return;
      }
    } catch {
      // Fast path must never block — fall through to the LLM parse
    }
    runParse(inputText);
  }, [pushCard, templateMatchedCard, runBuyer, runParse, isTemplateMode]);

  const interactionIds = [
    parseRef.current?.interactionId,
    selectRef.current?.interactionId,
  ].filter((x): x is string => !!x);

  if (!isOpen) return null;

  /** Hand off to the wizard, optionally landing on the first gap step */
  const editInWizard = (targetStepId?: string) => {
    if (!result) return;
    const firstGap = targetStepId
      || result.readiness.steps.find((s) => !s.ready)?.id
      || 'review';
    const r = result;
    const ids = interactionIds;
    reset();
    onDraftReady(r, ids, firstGap);
  };

  // ── REVIEW stage: single-view review + Approve & Send ──
  if (stage === 'review' && result) {
    return (
      <VaNiReviewFinalize
        result={result}
        interactionIds={interactionIds}
        onEdit={() => editInWizard()}
        onBack={() => setStage('ready')}
        onDone={handleClose}
        mode={mode}
        onTemplateSaved={onTemplateSaved}
        initialView={reviewInitialView}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <style>{CANVAS_CSS}</style>
      <div
        className="w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: cardBg, maxHeight: '94vh', color: colors.utility.primaryText }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
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
                {isTemplateMode ? 'Draft a template with VaNi' : 'Draft with VaNi'}
              </h3>
              <p className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                {isTemplateMode
                  ? 'Describe the offering — no buyer, no dates; you get a reusable template'
                  : 'Watch VaNi build — every card is a completed step'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: colors.utility.secondaryText }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── INPUT ── */}
        {stage === 'input' && (
          <div className="p-6 max-w-xl mx-auto w-full">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isTemplateMode
                ? 'e.g. "1 year HVAC AMC with quarterly PM visits and sign-off acceptance"'
                : 'e.g. "1 year AMC for Kamal Industries with quarterly billing"'}
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
              {(smartChips.length > 0 ? smartChips : (isTemplateMode ? TEMPLATE_EXAMPLES : EXAMPLES)).map((ex) => (
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
              onClick={() => startPipeline(text.trim())}
              disabled={text.trim().length < 5}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: colors.brand.primary }}
            >
              <Sparkles className="w-4 h-4" />
              Draft it
            </button>
            <p className="mt-2 text-[10px] text-center" style={{ color: colors.utility.secondaryText }}>
              VaNi runs on your own AI server. Nothing is created or sent without your approval.
            </p>
          </div>
        )}

        {/* ── CANVAS: VaNi box (left) + step cards (right) ── */}
        {(stage === 'running' || stage === 'ready') && (
          <div className="flex gap-0 p-6 overflow-y-auto" style={{ minHeight: 380 }}>

            {/* LEFT: VaNi builder box */}
            <div className="w-64 flex-shrink-0 self-start sticky top-0">
              <div
                className="rounded-2xl p-5"
                style={{
                  background: `linear-gradient(160deg, ${colors.brand.primary}, ${colors.brand.primary}CC)`,
                  boxShadow: `0 8px 24px ${colors.brand.primary}30`,
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  {runningStep
                    ? <Loader2 className="w-5 h-5 animate-spin text-white" />
                    : <CheckCircle2 className="w-5 h-5 text-white" />}
                  <span className="text-sm font-bold text-white">
                    {runningStep ? 'VaNi is building your draft' : 'Draft ready'}
                  </span>
                </div>
                {runningStep ? (
                  <>
                    <p className="text-xs text-white/90 font-semibold mb-1">
                      {STEP_NARRATION[runningStep].title}
                    </p>
                    <p className="text-[11px] text-white/70 leading-relaxed">
                      {STEP_NARRATION[runningStep].detail}
                    </p>
                    <p className="text-[11px] text-white/80 mt-3 font-mono">{elapsed}s</p>
                  </>
                ) : (
                  <p className="text-[11px] text-white/80 leading-relaxed">
                    Every step completed. Review the draft — nothing is sent until you approve.
                  </p>
                )}
              </div>

              {/* Ready actions */}
              {stage === 'ready' && result && (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => { setReviewInitialView('contract'); setStage('review'); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
                    style={{ backgroundColor: colors.semantic.success }}
                  >
                    Review & Finalize
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setReviewInitialView('events'); setStage('review'); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium hover:opacity-80"
                    style={{ borderColor: `${colors.brand.secondary}40`, color: colors.brand.secondary }}
                    title="See the service & billing schedule"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    {isTemplateMode ? 'Events Schedule (illustrative)' : 'Events Schedule'}
                  </button>
                  <button
                    onClick={() => editInWizard()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium hover:opacity-80"
                    style={{ borderColor: `${colors.utility.primaryText}20`, color: colors.utility.primaryText }}
                    title="Opens at the first step that needs you"
                  >
                    <PencilLine className="w-3.5 h-3.5" />
                    Edit in wizard
                  </button>
                  <button
                    onClick={reset}
                    className="w-full px-4 py-2 rounded-xl text-xs hover:opacity-70"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Discard & start over
                  </button>
                </div>
              )}
            </div>

            {/* CONNECTOR GUTTER: dotted spine from the VaNi box to the rail */}
            <div className="w-10 flex-shrink-0 relative">
              <div
                className="absolute left-1/2 top-8 bottom-8 w-0"
                style={{ borderLeft: `2px dotted ${dotted}` }}
              />
            </div>

            {/* RIGHT: step cards */}
            <div className="flex-1 min-w-0 space-y-4">
              {cards.map((card) => (
                <div key={`${card.id}-${card.status}`} className="vani-card-in relative">
                  {/* horizontal dotted stub from spine to card */}
                  <div
                    className="absolute top-6 -left-10 w-10 h-0"
                    style={{ borderTop: `2px dotted ${dotted}` }}
                  />
                  <div
                    className="rounded-xl border p-4"
                    style={{
                      backgroundColor: cardBg,
                      color: colors.utility.primaryText,
                      borderColor:
                        card.status === 'error' ? `${colors.semantic.error}50`
                        : card.status === 'action' ? `${colors.semantic.warning}50`
                        : `${colors.utility.primaryText}12`,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor:
                            card.status === 'error' ? `${colors.semantic.error}12`
                            : card.status === 'action' ? `${colors.semantic.warning}12`
                            : `${colors.brand.primary}10`,
                          color:
                            card.status === 'error' ? colors.semantic.error
                            : card.status === 'action' ? colors.semantic.warning
                            : colors.brand.primary,
                        }}
                      >
                        {card.icon}
                      </div>
                      <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
                        {card.title}
                      </span>
                      {card.status === 'done' && (
                        <CheckCircle2 className="w-3.5 h-3.5 ml-auto" style={{ color: colors.semantic.success }} />
                      )}
                      {card.status === 'action' && (
                        <span
                          className="ml-auto text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${colors.semantic.warning}15`, color: colors.semantic.warning }}
                        >
                          needs you
                        </span>
                      )}
                    </div>
                    <div style={{ color: colors.utility.secondaryText }}>
                      {/* Buyer action card renders LIVE (search + create + candidates) */}
                      {card.id === 'buyer' && card.status === 'action' && buyerAction ? (
                        <div className="space-y-2">
                          {(buyerAction.candidates || []).map((c) => (
                            <button
                              key={c.id}
                              onClick={() => resumeWithBuyer({ id: c.id, name: c.name })}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs hover:opacity-80"
                              style={{ borderColor: `${colors.utility.primaryText}15`, color: colors.utility.primaryText }}
                            >
                              {c.company_name ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                              <span className="font-medium">{c.name}</span>
                              {c.company_name && <span className="opacity-70">{c.company_name}</span>}
                            </button>
                          ))}

                          {/* On-card search */}
                          <div className="flex gap-1.5">
                            <input
                              value={buyerSearch}
                              onChange={(e) => setBuyerSearch(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleBuyerSearch()}
                              placeholder="Search contacts…"
                              className="flex-1 px-3 py-2 rounded-lg border text-xs outline-none"
                              style={{
                                backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F9FAFB',
                                borderColor: `${colors.utility.primaryText}20`,
                                color: colors.utility.primaryText,
                              }}
                            />
                            <button
                              onClick={handleBuyerSearch}
                              disabled={buyerSearching || buyerSearch.trim().length < 2}
                              className="px-3 py-2 rounded-lg border text-xs font-semibold hover:opacity-80 disabled:opacity-40"
                              style={{ borderColor: colors.brand.primary, color: colors.brand.primary }}
                            >
                              {buyerSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setShowQuickAdd(true)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90"
                              style={{ backgroundColor: colors.brand.primary }}
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Create contact
                            </button>
                            <button
                              onClick={() => resumeWithBuyer(null)}
                              className="flex-1 px-3 py-2 rounded-lg border border-dashed text-xs hover:opacity-80"
                              style={{ borderColor: `${colors.utility.primaryText}25`, color: colors.utility.secondaryText }}
                            >
                              Skip — pick later
                            </button>
                          </div>
                        </div>
                      ) : (
                        card.body
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Preferences card — defaults visible AND changeable; each change
                  re-runs the real assemble step (no hidden state) */}
              {stage === 'ready' && result && parseRef.current && (
                <div className="vani-card-in relative">
                  <div className="absolute top-6 -left-10 w-10 h-0" style={{ borderTop: `2px dotted ${dotted}` }} />
                  <div className="rounded-xl border p-4" style={{ borderColor: `${colors.utility.primaryText}12`, backgroundColor: cardBg }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Settings2 className="w-4 h-4" style={{ color: colors.brand.primary }} />
                      <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
                        Preferences — adjust anything, VaNi re-assembles
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Acceptance */}
                      <div>
                        <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>
                          Acceptance {!parseRef.current.intent.acceptance && '(default)'}
                        </p>
                        <div className="flex gap-1">
                          {(['signoff', 'payment', 'auto'] as const).map((m) => (
                            <button
                              key={m}
                              onClick={() => adjustAndReassemble(() => { parseRef.current!.intent.acceptance = m; })}
                              className="px-2.5 py-1.5 rounded-lg border text-[11px] font-medium hover:opacity-80"
                              style={{
                                borderColor: result.draft.acceptanceMethod === m ? colors.brand.primary : `${colors.utility.primaryText}20`,
                                backgroundColor: result.draft.acceptanceMethod === m ? `${colors.brand.primary}10` : 'transparent',
                                color: result.draft.acceptanceMethod === m ? colors.brand.primary : colors.utility.secondaryText,
                              }}
                            >
                              {m === 'signoff' ? 'Sign-off' : m === 'payment' ? 'Payment' : 'Auto'}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Billing */}
                      <div>
                        <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>Billing</p>
                        <div className="flex gap-1 flex-wrap">
                          {([
                            { m: 'prepaid' as const, label: 'Upfront' },
                            { m: 'emi' as const, label: 'EMI' },
                            { m: 'per_block' as const, label: 'Per cycle' },
                          ]).map(({ m, label }) => (
                            <button
                              key={m}
                              onClick={() => adjustAndReassemble(() => {
                                const b = parseRef.current!.intent.billing;
                                b.mode = m;
                                if (m === 'emi' && !b.emi_months) b.emi_months = 12;
                                if (m === 'per_block' && !b.cycle) b.cycle = 'quarterly';
                              })}
                              className="px-2.5 py-1.5 rounded-lg border text-[11px] font-medium hover:opacity-80"
                              style={{
                                borderColor: parseRef.current!.intent.billing.mode === m ? colors.brand.primary : `${colors.utility.primaryText}20`,
                                backgroundColor: parseRef.current!.intent.billing.mode === m ? `${colors.brand.primary}10` : 'transparent',
                                color: parseRef.current!.intent.billing.mode === m ? colors.brand.primary : colors.utility.secondaryText,
                              }}
                            >
                              {label}
                            </button>
                          ))}
                          {parseRef.current.intent.billing.mode === 'per_block' && (
                            <select
                              value={parseRef.current.intent.billing.cycle}
                              onChange={(e) => adjustAndReassemble(() => { parseRef.current!.intent.billing.cycle = e.target.value; })}
                              className="px-2 py-1.5 rounded-lg border text-[11px] outline-none"
                              style={{ borderColor: `${colors.utility.primaryText}20`, backgroundColor: 'transparent', color: colors.utility.primaryText }}
                            >
                              <option value="monthly">Monthly</option>
                              <option value="fortnightly">Fortnightly</option>
                              <option value="quarterly">Quarterly</option>
                            </select>
                          )}
                          {parseRef.current.intent.billing.mode === 'emi' && (
                            <select
                              value={parseRef.current.intent.billing.emi_months}
                              onChange={(e) => adjustAndReassemble(() => { parseRef.current!.intent.billing.emi_months = Number(e.target.value); })}
                              className="px-2 py-1.5 rounded-lg border text-[11px] outline-none"
                              style={{ borderColor: `${colors.utility.primaryText}20`, backgroundColor: 'transparent', color: colors.utility.primaryText }}
                            >
                              {[3, 6, 9, 12, 18, 24].map((n) => <option key={n} value={n}>{n} months</option>)}
                            </select>
                          )}
                        </div>
                      </div>
                      {/* Start date */}
                      <div>
                        <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>
                          Start date {!parseRef.current.intent.start_date && '(default: today)'}
                        </p>
                        <input
                          type="date"
                          value={parseRef.current.intent.start_date || new Date().toISOString().slice(0, 10)}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => adjustAndReassemble(() => { parseRef.current!.intent.start_date = e.target.value; })}
                          className="px-2.5 py-1.5 rounded-lg border text-[11px] outline-none"
                          style={{ borderColor: `${colors.utility.primaryText}20`, backgroundColor: 'transparent', color: colors.utility.primaryText }}
                        />
                      </div>
                      {/* Currency */}
                      <div>
                        <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>
                          Currency {contractCurrency === getDefaultCurrency().code && '(default)'}
                        </p>
                        <select
                          value={contractCurrency}
                          onChange={(e) => {
                            setContractCurrency(e.target.value);
                            if (!runningStep) reassemble(e.target.value);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border text-[11px] outline-none"
                          style={{ borderColor: `${colors.utility.primaryText}20`, backgroundColor: 'transparent', color: colors.utility.primaryText }}
                        >
                          {currencyOptions.map((c) => (
                            <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Readiness + gaps after assembly */}
              {stage === 'ready' && result && (
                <div className="vani-card-in relative">
                  <div className="absolute top-6 -left-10 w-10 h-0" style={{ borderTop: `2px dotted ${dotted}` }} />
                  <div
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: result.readiness.needsYou.length === 0
                        ? `${colors.semantic.success}40`
                        : `${colors.semantic.warning}40`,
                      backgroundColor: cardBg,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2
                        className="w-4 h-4"
                        style={{ color: result.readiness.needsYou.length === 0 ? colors.semantic.success : colors.semantic.warning }}
                      />
                      <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
                        Ready: {result.readiness.readyCount} of {result.readiness.totalCount} steps
                      </span>
                    </div>
                    {result.readiness.steps.filter((s) => !s.ready).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {result.readiness.steps.filter((s) => !s.ready).map((s) => (
                          <button
                            key={s.id}
                            onClick={() => editInWizard(s.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-semibold hover:opacity-80"
                            style={{ borderColor: `${colors.semantic.warning}50`, color: colors.semantic.warning }}
                            title={`Fix in wizard: ${s.note || s.label}`}
                          >
                            <PencilLine className="w-2.5 h-2.5" />
                            {s.note || s.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {result.vani.gaps.map((gap, i) => (
                      <div key={i} className="flex items-start gap-2 mt-1.5">
                        {gap.severity === 'warning'
                          ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: colors.semantic.warning }} />
                          : <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: colors.semantic.info }} />}
                        <p className="text-[11px] leading-relaxed" style={{ color: colors.utility.primaryText }}>
                          {gap.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick-create contact — same drawer the wizard's buyer step uses */}
      <QuickAddContactDrawer
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onSuccess={(contactId: string) => {
          const name =
            buyerSearch.trim() ||
            parseRef.current?.intent.buyer_text ||
            'New contact';
          addToast({ type: 'success', title: 'Contact created', message: name });
          resumeWithBuyer({ id: contactId, name });
        }}
      />
    </div>
  );
};

export default VaNiComposerLauncher;
