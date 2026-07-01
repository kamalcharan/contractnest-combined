// src/pages/service-contracts/templates/admin/global-designer/ai/VaNiDesignerPanel.tsx
//
// VaNi Designer — the AI panel (prototype "View 4") as a right slide-in drawer
// over the Global Template Designer wizard. UX-A2.
//
// Interaction: context strip (read from the wizard) → 4 quick actions →
// 7-step streaming → result (slot cards w/ per-slot accept/reject, or field
// suggestions, or a review list) → Apply / Regenerate. Preview-before-commit:
// nothing touches the wizard until the admin presses Apply.

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Brain, PenLine, Search, Check, RotateCcw, Loader2, CalendarClock, ShieldCheck, Layers } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { GlobalDesignerWizardState, RecipeSlot } from '../types';
import useGenerateRecipe, { stubVariantsFor, type GenAction, type FieldSuggestion, type RecipeContext } from './useGenerateRecipe';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  state: GlobalDesignerWizardState;
  industryLabels: string[];           // resolved human labels for targetIndustries
  onApplySlots: (slots: RecipeSlot[]) => void;
  onApplyFields: (fields: FieldSuggestion[]) => void;
}

const QUICK_ACTIONS: { id: GenAction; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'generate_full', label: 'Generate Full', Icon: Sparkles },
  { id: 'suggest_slots', label: 'Suggest Slots', Icon: Brain },
  { id: 'fill_fields', label: 'Auto-Fill', Icon: PenLine },
  { id: 'review', label: 'Review', Icon: Search },
];

const activityTone: Record<string, string> = {
  pm: '#2563eb',
  inspection: '#7c3aed',
  repair: '#d97706',
  install: '#16a34a',
  decommission: '#6b7280',
  spare_pool: '#0891b2',
};

const VaNiDesignerPanel: React.FC<Props> = ({ isOpen, onClose, state, industryLabels, onApplySlots, onApplyFields }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { phase, action, steps, result, error, run, reset, toggleSlot, setAllSlots, setSlotVariants } = useGenerateRecipe();

  const ctx: RecipeContext = useMemo(() => ({
    industries: state.targetIndustries,
    industryLabels,
    assetTypeNames: state.selectedAssetTypeNames,
    assetTypeIds: state.selectedAssetTypeIds,
    nomenclatureGroup: state.nomenclatureGroup,
    nomenclatureDisplayName: state.nomenclatureDisplayName,
    currency: state.contractDetails.currency || 'INR',
  }), [state, industryLabels]);

  // Variant options for the selected asset (stub; real KG variants in batch C)
  const variantOptions = useMemo(() => stubVariantsFor(ctx.assetTypeNames[0]), [ctx.assetTypeNames]);

  if (!isOpen) return null;

  const VANI = '#ff6b2b';
  const acceptedCount = result?.kind === 'slots' ? result.slots.filter((s) => s.accepted).length : 0;

  const handleApply = () => {
    if (!result) return;
    if (result.kind === 'slots') {
      const accepted = result.slots.filter((s) => s.accepted);
      if (accepted.length === 0) return;
      onApplySlots(accepted);
    } else if (result.kind === 'fields') {
      onApplyFields(result.fields);
    }
    reset();
    onClose();
  };

  const chip = (text: string, tone?: string) => (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ backgroundColor: `${tone || colors.brand.primary}14`, color: tone || colors.brand.primary }}
    >
      {text}
    </span>
  );

  return createPortal(
    <div className="fixed inset-0 z-[60]" style={{ animation: 'vdFade .18s ease' }}>
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.5)' }} onClick={onClose} />

      {/* Drawer */}
      <aside
        className="absolute top-0 right-0 h-full flex flex-col shadow-2xl"
        style={{
          width: 460,
          maxWidth: '92vw',
          background: colors.utility.primaryBackground,
          borderLeft: `1px solid ${colors.utility.secondaryText}18`,
          animation: 'vdSlide .22s ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0" style={{ borderColor: `${colors.utility.secondaryText}15` }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black shrink-0"
            style={{ background: `linear-gradient(135deg, ${VANI}, #ff8f5a)` }}>V</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>Design with VaNi</div>
            <div className="text-[11px]" style={{ color: colors.utility.secondaryText }}>Recipe = slots (activity · asset · cadence · compliance)</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:opacity-80" style={{ backgroundColor: `${colors.utility.secondaryText}10`, color: colors.utility.secondaryText }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Context strip */}
        <div className="px-5 py-3 border-b shrink-0 flex flex-wrap items-center gap-1.5" style={{ borderColor: `${colors.utility.secondaryText}12`, background: colors.utility.secondaryBackground }}>
          <span className="text-[10px] font-semibold uppercase tracking-wide mr-1" style={{ color: colors.utility.secondaryText }}>Context</span>
          {chip(ctx.nomenclatureDisplayName || 'No nomenclature', ctx.nomenclatureDisplayName ? colors.brand.primary : '#9ca3af')}
          {industryLabels.length > 0 ? industryLabels.slice(0, 2).map((l) => <React.Fragment key={l}>{chip(l, '#0891b2')}</React.Fragment>) : chip('No industry', '#9ca3af')}
          {chip(ctx.assetTypeNames[0] || 'Asset: Any', '#7c3aed')}
          {chip(ctx.currency, '#16a34a')}
        </div>

        {/* Quick actions */}
        <div className="px-5 py-3 grid grid-cols-2 gap-2 border-b shrink-0" style={{ borderColor: `${colors.utility.secondaryText}12` }}>
          {QUICK_ACTIONS.map(({ id, label, Icon }) => {
            const isRunning = phase === 'generating' && action === id;
            return (
              <button
                key={id}
                disabled={phase === 'generating'}
                onClick={() => run(id, ctx)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition disabled:opacity-50"
                style={{
                  border: `1.5px solid ${colors.utility.secondaryText}1f`,
                  background: isRunning ? `${VANI}12` : colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                }}
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: VANI }} /> : <Icon className="w-4 h-4" style={{ color: VANI }} />}
                {label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Idle */}
          {phase === 'idle' && (
            <div className="text-center py-12">
              <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: VANI }} />
              <div className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>Generate a recipe</div>
              <p className="text-[12px] leading-relaxed max-w-[280px] mx-auto" style={{ color: colors.utility.secondaryText }}>
                VaNi drafts a slot-based recipe from your industry, asset and nomenclature. Nothing is applied until you accept.
              </p>
            </div>
          )}

          {/* Generating — 7-step stream */}
          {phase === 'generating' && (
            <div className="py-2 space-y-2.5">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: s.status === 'done' ? '#16a34a' : s.status === 'active' ? `${VANI}` : `${colors.utility.secondaryText}20`,
                    }}>
                    {s.status === 'done' ? <Check className="w-3 h-3 text-white" /> : s.status === 'active' ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : null}
                  </div>
                  <span className="text-[12.5px]" style={{ color: s.status === 'pending' ? colors.utility.secondaryText : colors.utility.primaryText, fontWeight: s.status === 'active' ? 600 : 400 }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="py-8 text-center">
              <div className="text-sm font-semibold mb-1" style={{ color: colors.semantic?.error || '#dc2626' }}>Generation failed</div>
              <p className="text-[12px]" style={{ color: colors.utility.secondaryText }}>{error}</p>
            </div>
          )}

          {/* Done — slots */}
          {phase === 'done' && result?.kind === 'slots' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>
                  {result.slots.length} slots · {acceptedCount} accepted
                </span>
                <div className="flex gap-2">
                  <button className="text-[11px] font-medium" style={{ color: colors.brand.primary }} onClick={() => setAllSlots(true)}>Accept all</button>
                  <span style={{ color: `${colors.utility.secondaryText}60` }}>·</span>
                  <button className="text-[11px] font-medium" style={{ color: colors.utility.secondaryText }} onClick={() => setAllSlots(false)}>Clear</button>
                </div>
              </div>
              {result.slots.map((slot) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  colors={colors}
                  variantOptions={variantOptions}
                  onToggle={() => toggleSlot(slot.id)}
                  onSetVariants={(scope) => setSlotVariants(slot.id, scope)}
                />
              ))}
            </div>
          )}

          {/* Done — field suggestions */}
          {phase === 'done' && result?.kind === 'fields' && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>Suggested defaults</span>
              {result.fields.map((f) => (
                <div key={f.key} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ border: `1px solid ${colors.utility.secondaryText}18` }}>
                  <span className="text-[12px]" style={{ color: colors.utility.secondaryText }}>{f.label}</span>
                  <span className="text-[12.5px] font-semibold" style={{ color: colors.utility.primaryText }}>{f.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Done — review findings */}
          {phase === 'done' && result?.kind === 'review' && (
            <ul className="space-y-2">
              {result.findings.map((f, i) => (
                <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed" style={{ color: colors.utility.primaryText }}>
                  <span style={{ color: VANI }}>•</span>{f}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {phase === 'done' && (
          <div className="px-5 py-3 border-t shrink-0 flex items-center gap-2" style={{ borderColor: `${colors.utility.secondaryText}15`, background: colors.utility.secondaryBackground }}>
            <button
              onClick={() => reset()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium"
              style={{ border: `1px solid ${colors.utility.secondaryText}22`, color: colors.utility.secondaryText }}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Regenerate
            </button>
            {result?.kind !== 'review' && (
              <button
                onClick={handleApply}
                disabled={result?.kind === 'slots' && acceptedCount === 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-white disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${VANI}, #ff8f5a)` }}
              >
                <Check className="w-4 h-4" />
                {result?.kind === 'slots' ? `Apply ${acceptedCount} slot${acceptedCount === 1 ? '' : 's'}` : 'Apply defaults'}
              </button>
            )}
          </div>
        )}
      </aside>

      <style>{`
        @keyframes vdFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vdSlide { from { transform: translateX(24px); opacity: .6 } to { transform: translateX(0); opacity: 1 } }
      `}</style>
    </div>,
    document.body
  );
};

// ─── Slot card ──────────────────────────────────────────────────────

interface SlotCardProps {
  slot: RecipeSlot;
  colors: any;
  variantOptions: string[];
  onToggle: () => void;
  onSetVariants: (scope: 'all' | string[]) => void;
}

const SlotCard: React.FC<SlotCardProps> = ({ slot, colors, variantOptions, onToggle, onSetVariants }) => {
  const tone = activityTone[slot.activity] || colors.brand.primary;
  const [pickerOpen, setPickerOpen] = useState(false);

  // Variant control is meaningless for on-demand spare pools.
  const showVariants = slot.activity !== 'spare_pool' && variantOptions.length > 0;
  const isAll = !Array.isArray(slot.variantScope);
  const selected = Array.isArray(slot.variantScope) ? slot.variantScope : [];

  const toggleVariant = (name: string) => {
    if (isAll) { onSetVariants([name]); return; }
    const next = selected.includes(name) ? selected.filter((v) => v !== name) : [...selected, name];
    onSetVariants(next.length === 0 ? 'all' : next);
  };

  return (
    <div
      className="w-full rounded-xl transition"
      style={{
        border: `1.5px solid ${slot.accepted ? tone : `${colors.utility.secondaryText}18`}`,
        background: slot.accepted ? `${tone}0c` : colors.utility.primaryBackground,
      }}
    >
      {/* Clickable header toggles accept/reject */}
      <div className="flex items-start gap-2.5 px-3.5 py-3 cursor-pointer" onClick={onToggle}>
        <div className="rounded-md flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: slot.accepted ? tone : 'transparent', border: `1.5px solid ${slot.accepted ? tone : `${colors.utility.secondaryText}40`}`, width: 18, height: 18 }}>
          {slot.accepted && <Check className="w-3 h-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12.5px] font-semibold" style={{ color: colors.utility.primaryText }}>{slot.label}</span>
            <span className="text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: `${tone}18`, color: tone }}>{slot.activity}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: colors.utility.secondaryText }}>
            <span>{slot.assetTypeName}</span>
            {slot.cadenceDays != null ? (
              <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> every {slot.cadenceDays}d</span>
            ) : (
              <span>on-demand</span>
            )}
            {slot.checkpointCount > 0 && <span>{slot.checkpointCount} checkpoints</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: colors.utility.secondaryText }}>
            {slot.priceHintMin != null && slot.priceHintMax != null && (
              <span>band {slot.currency} {slot.priceHintMin.toLocaleString()}–{slot.priceHintMax.toLocaleString()}</span>
            )}
            {slot.complianceStandards.length > 0 && (
              <span className="flex items-center gap-1" style={{ color: '#7c3aed' }}>
                <ShieldCheck className="w-3 h-3" /> {slot.complianceStandards.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Variant applicability control */}
      {showVariants && (
        <div className="px-3.5 pb-3 pt-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setPickerOpen((o) => !o)}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg"
            style={{ border: `1px solid ${colors.utility.secondaryText}22`, color: colors.utility.secondaryText }}
          >
            <Layers className="w-3 h-3" />
            {isAll ? 'All variants' : `${selected.length} of ${variantOptions.length} variants`}
          </button>
          {pickerOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <VariantChip label="All variants" active={isAll} tone={tone} colors={colors} onClick={() => onSetVariants('all')} />
              {variantOptions.map((name) => (
                <VariantChip key={name} label={name} active={!isAll && selected.includes(name)} tone={tone} colors={colors} onClick={() => toggleVariant(name)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const VariantChip: React.FC<{ label: string; active: boolean; tone: string; colors: any; onClick: () => void }> = ({ label, active, tone, colors, onClick }) => (
  <button
    onClick={onClick}
    className="text-[10.5px] font-medium px-2 py-1 rounded-full transition"
    style={{
      border: `1px solid ${active ? tone : `${colors.utility.secondaryText}22`}`,
      background: active ? `${tone}14` : 'transparent',
      color: active ? tone : colors.utility.secondaryText,
    }}
  >
    {label}
  </button>
);

export default VaNiDesignerPanel;
