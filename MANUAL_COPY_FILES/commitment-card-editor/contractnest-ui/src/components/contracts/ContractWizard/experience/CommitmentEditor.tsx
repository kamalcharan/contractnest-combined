// Experience-only commitment editor. Existing checklist/RFQ screens are untouched.
// Cadence, occurrence and split controls retain their existing update contracts.
import React, { useState, useContext, useEffect, useRef } from 'react';
import { CommitmentEditingContext } from './CommitmentEditingContext';
import { RefreshCw, X } from 'lucide-react';
import { Block } from '@/types/catalogStudio';
import type { ConfigurableBlock } from '@/components/catalog-studio';
// Single source of truth for non-cadence billing cycles — the SAME six
// options the previous card offered (PrePaid/PostPaid/Monthly/
// Fortnightly/Quarterly/Custom)
import { CYCLE_OPTIONS } from '@/components/catalog-studio/BlockCardConfigurable';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import SafeHtml from '@/components/catalog-studio/SafeHtml';
import {
  getCadenceCycle,
  fittingCadences,
  cadenceTermMath,
  type BlockCadencePricing,
} from '@/utils/catalog-studio/cadencePricing';

export interface ChecklistRowProps {
  editorOnly?: boolean;
  colors: any;
  isDarkMode: boolean;
  currency: string;
  /** Catalog block (absent for FlyBy custom lines) */
  block?: Block;
  /** The selected instance in the current coverage scope, if checked */
  instance?: ConfigurableBlock;
  checked: boolean;
  /** COMING SOON rows: visible but not selectable */
  disabled?: boolean;
  disabledLabel?: string;
  /** Category has pricing (services/spares/fees) vs content (terms/checklists) */
  priced: boolean;
  /** Row is a FlyBy custom line (name/description editable) */
  flyBy?: boolean;
  /**
   * Contract vs RFQ, consulted ONLY within flyBy rows — catalog (non-flyBy)
   * rendering is completely unaffected by this prop. In 'rfq' mode a flyBy
   * line still shows Visits/Unlimited/Billing Cycle/Service Cycle, but hides
   * the price amount and the Advanced (tax/billing-only) disclosure, since
   * an RFQ has no price yet — the vendor sets it when they quote.
   * Default 'contract' — existing behavior, byte-for-byte unchanged.
   */
  mode?: 'contract' | 'rfq';
  /** This block's cycle offends the unified billing cycle */
  mismatch?: { majority: string } | null;
  /**
   * Unit count of the coverage/asset group this block is scoped to (e.g. "DG
   * Set ×2"), resolved by the caller from CoverageTypeItem/coverage line.
   * Undefined or 1 → no ambiguity, nothing shown. When > 1 and a service
   * cycle is set, disambiguates that Visits × Cycle covers ALL units
   * together per visit, not per unit — the compliance gap flagged 2026-07-31
   * (see CLAUDE.md). Not shown on a block already produced by a split
   * (config.splitUnitIndex set).
   */
  coverageUnitCount?: number;
  /**
   * Split this recurring FlyBy block into N independent per-unit schedules
   * (one clone per unit, each keeping its own Visits/Cycle to edit
   * separately). Only offered by the caller for FlyBy rows — catalog rows
   * never receive this prop, so no button renders there (splitting a
   * reusable catalog block per unit is a bigger structural change, deferred).
   */
  onSplitByUnits?: () => void;
  expanded: boolean;
  durationMonths: number;
  onToggle: () => void;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<ConfigurableBlock>) => void;
  onRemove?: () => void;
  /** Type suffix used in content-block copy ("checklist block") */
  typeLabel?: string;
  /** Small colored category pill so the block TYPE is visible on every row */
  typeChip?: { label: string; color: string };
}

// Spare Part category — SAME options catalog-studio's Basic Info step offers
// when defining a Spare Part block (id -> label kept identical so a value
// written here reads the same way there). No SKU on the flyby line — SKU is
// an inventory-tracked identity that only makes sense for a real catalog part;
// a loose RFQ/contract line asks by CATEGORY + quantity instead.
const SPARE_CATEGORIES = [
  { id: 'filter', label: 'Filters' },
  { id: 'gas', label: 'Gases' },
  { id: 'parts', label: 'Parts' },
  { id: 'accessories', label: 'Accessories' },
];

const cycleLabel = (cycle: string, customDays?: number): string => {
  const cad = getCadenceCycle(cycle);
  if (cad) return `${cad.label} billing`;
  if (cycle === 'custom') return customDays ? `Every ${customDays} days` : 'Custom cycle';
  const opt = CYCLE_OPTIONS.find((o) => o.id === cycle);
  if (opt) return opt.label;
  return cycle;
};


const CommitmentEditor: React.FC<ChecklistRowProps & { instance: ConfigurableBlock }> = (props) => {
  const {colors,isDarkMode,currency,block,priced:pricedProp,flyBy=false,mode='contract',
    coverageUnitCount,durationMonths,typeLabel} = props;
  const [instance,setInstance] = useState<ConfigurableBlock>(()=>structuredClone(props.instance));
  const [error,setError] = useState('');
  const setEditing = useContext(CommitmentEditingContext);
  const editorRef=useRef<HTMLElement>(null);
  useEffect(()=>{setEditing(true);return()=>setEditing(false);},[setEditing]);
  useEffect(()=>{editorRef.current?.scrollIntoView({block:'start'});},[]);
  const dirty = JSON.stringify(instance)!==JSON.stringify(props.instance);
  const checked=true;
  const onUpdate=(patch:Partial<ConfigurableBlock>)=>{
    setError('');
    setInstance(previous=>{
      const next={...previous,...patch};
      if (patch.config?.customPrice !== undefined && patch.config.customPrice>0)
        next.config={...next.config,complimentary:false};
      return next;
    });
  };
  const onSplitByUnits=props.onSplitByUnits ? ()=>{
    if(dirty){setError('Apply your changes first, then reopen to split the saved commitment.');return;}
    props.onSplitByUnits?.();
  }:undefined;
  // Group Session is NEVER priced — enforced HERE regardless of what the
  // caller passes, so a caller bug can't accidentally show pricing UI for it.
  // Matches the catalog side: categoryHasPricing('session') is false there
  // (no CATEGORY_METADATA entry) — this is the FlyBy equivalent of that rule.
  const isSessionFlyBy = flyBy && instance?.flyByType === 'session';
  const priced = pricedProp && !isSessionFlyBy;
  const rfqFlyBy = flyBy && mode === 'rfq';
  const line = colors.utility.primaryText + '15';
  const dim = colors.utility.secondaryText;
  const sym = getCurrencySymbol(instance?.currency || currency);
  // Coverage-unit ambiguity: only meaningful once a cycle is actually set,
  // and never on a block a split already produced (that instance IS one unit).
  const showCoverageAmbiguity =
    !!instance &&
    !!instance.serviceCycleDays &&
    !!coverageUnitCount &&
    coverageUnitCount > 1 &&
    !instance.config?.splitUnitIndex;

  const name = instance?.name ?? block?.name ?? '';
  const description = instance?.description ?? block?.description ?? '';

  const effPrice = instance ? (instance.config?.customPrice ?? instance.price) : undefined;
  const listPrice = instance?.listPrice;
  const hasList = typeof listPrice === 'number' && listPrice > 0;
  const discounted = checked && hasList && effPrice !== undefined && effPrice < listPrice!;
  const discountPct = discounted ? Math.round((1 - effPrice! / listPrice!) * 1000) / 10 : 0;

  const cp = instance?.config?.cadencePricing as BlockCadencePricing | undefined;
  const cadenceOptions = cp ? fittingCadences(cp, durationMonths) : [];

  // ── Service cycle (visit interval) — same rules as the previous card ──
  const isGroupSession = instance?.config?.audience === 'group' || instance?.categoryId === 'session';
  const deliversOccurrences = priced || isGroupSession || !!instance?.serviceCycleDays;
  const anchorWeekday = (instance?.config as any)?.serviceCycles?.anchorWeekday;
  const anchorLabel =
    typeof anchorWeekday === 'number' && anchorWeekday >= 0 && anchorWeekday <= 6
      ? ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][anchorWeekday]
      : null;
  // First-occurrence override (catalog-studio: "overrides the weekday anchor
  // above for the first occurrence only") and the overdue buffer, both from
  // the SAME config.serviceCycles cluster as anchorWeekday/days.
  const anchorDate = (instance?.config as any)?.serviceCycles?.anchorDate as string | undefined;
  const gracePeriod = (instance?.config as any)?.serviceCycles?.gracePeriod as number | undefined;
  const spareCategory = (instance?.config as any)?.spareCategory as string | undefined;
  const contractDurationDays = durationMonths * 30;
  const serviceCycleSpanDays =
    instance?.serviceCycleDays && !instance.unlimited && instance.quantity > 1
      ? (instance.quantity - 1) * instance.serviceCycleDays
      : 0;
  const serviceCycleExceedsDuration = !!(contractDurationDays && serviceCycleSpanDays > contractDurationDays);
  // Payment schedule for the chosen cadence (N payments × rate + final)
  const cadDefCur = cp && instance ? getCadenceCycle(instance.cycle) : undefined;
  const cadenceMath =
    cp && instance && cadDefCur
      ? cadenceTermMath(
          (instance.config?.customPrice ?? instance.price),
          durationMonths,
          cadDefCur.monthsPerPeriod,
          instance.config?.cadenceFinalPayment,
        )
      : null;

  const displayPrice = checked
    ? effPrice
    : (block?.price ?? undefined);

  // Cadence switch — mirrors BlockCardConfigurable's handleCadenceSwitch:
  // stash the current override under the old cycle, restore the target's.
  const handleCycleChange = (nextCycle: string) => {
    if (!instance) return;
    if (cp && getCadenceCycle(nextCycle)) {
      const rate = cp.rates.find((r) => r.cycle === nextCycle);
      if (!rate) return;
      const overrides: Record<string, number | undefined> = { ...(instance.config as any)?.cadenceOverrides };
      if (instance.config?.customPrice !== undefined) overrides[instance.cycle] = instance.config.customPrice;
      else delete overrides[instance.cycle];
      onUpdate({
        cycle: nextCycle,
        price: rate.amount,
        listPrice: rate.amount,
        config: {
          ...instance.config,
          cadenceOverrides: overrides,
          customPrice: overrides[nextCycle],
          cadenceFinalPayment: undefined,
        } as any,
      });
    } else {
      onUpdate({ cycle: nextCycle });
    }
  };

  const handlePriceChange = (raw: string) => {
    if (!instance) return;
    const v = raw === '' ? undefined : Math.max(0, parseFloat(raw) || 0);
    const cfg: any = { ...instance.config };
    if (v === undefined || (hasList && v === listPrice)) delete cfg.customPrice;
    else cfg.customPrice = v;
    onUpdate({ config: cfg });
  };

  const handleQtyChange = (raw: string) => {
    if (!instance) return;
    const v = Math.max(1, parseInt(raw, 10) || 1);
    const cfg: any = { ...instance.config };
    // A manual count pins group sessions (stops duration auto-derive)
    if (cfg.autoCount) cfg.autoCount = false;
    onUpdate({ quantity: v, config: cfg });
  };

  // FlyBy Spare Part — category, same field/options as catalog-studio's Basic
  // Info step (config.spareCategory). No SKU here by design.
  const handleSpareCategoryChange = (category: string) => {
    if (!instance) return;
    onUpdate({ config: { ...instance.config, spareCategory: category } as any });
  };

  // FlyBy Service Cycle — Yes/No toggle (mirrors catalog-studio's "Does this
  // service require Cycles?" in Delivery Settings). Reuses the SAME
  // serviceCycleDays field — no schema change. "Yes" seeds a sensible
  // default so the days input is immediately visible and editable.
  const handleRequiresCycleToggle = (yes: boolean) => {
    if (!instance) return;
    if (yes) {
      onUpdate({ serviceCycleDays: instance.serviceCycleDays || 30 });
    } else {
      onUpdate({
        serviceCycleDays: undefined,
        config: { ...instance.config, serviceCycles: { ...(instance.config as any)?.serviceCycles, days: undefined, anchorWeekday: undefined, anchorDate: undefined, gracePeriod: undefined } } as any,
      });
    }
  };
  const handleAnchorWeekdayChange = (day: number | undefined) => {
    if (!instance) return;
    onUpdate({
      config: {
        ...instance.config,
        serviceCycles: { ...(instance.config as any)?.serviceCycles, anchorWeekday: day, days: instance.serviceCycleDays, enabled: true },
      } as any,
    });
  };
  // First-occurrence date override — "overrides the weekday anchor above for
  // the first occurrence only" (same semantics as catalog-studio). Setting it
  // clears any conflicting weekday anchor is NOT done here — the anchor still
  // governs occurrence 2+ once the first is pinned, matching DeliveryStep.
  const handleAnchorDateChange = (dateStr: string | undefined) => {
    if (!instance) return;
    onUpdate({
      config: {
        ...instance.config,
        serviceCycles: { ...(instance.config as any)?.serviceCycles, anchorDate: dateStr, days: instance.serviceCycleDays, enabled: true },
      } as any,
    });
  };
  // Grace period — buffer before an occurrence is marked overdue.
  const handleGracePeriodChange = (days: number | undefined) => {
    if (!instance) return;
    onUpdate({
      config: {
        ...instance.config,
        serviceCycles: { ...(instance.config as any)?.serviceCycles, gracePeriod: days, days: instance.serviceCycleDays, enabled: true },
      } as any,
    });
  };
  // Next few occurrence dates from today — same anchor-aware logic as the
  // catalog-studio Delivery Settings preview, so a buyer/seller can see how
  // the cadence lands before saving. An explicit first-occurrence date
  // overrides the computed first date; later dates still follow the interval.
  const sampleDates = React.useMemo(() => {
    if (!instance?.serviceCycleDays || instance.serviceCycleDays < 1) return [] as Date[];
    const hasAnchor = typeof anchorWeekday === 'number' && anchorWeekday >= 0 && anchorWeekday <= 6;
    const addD = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    let first = start;
    if (anchorDate) {
      const parsed = new Date(`${anchorDate}T00:00:00`);
      if (!isNaN(parsed.getTime())) first = parsed;
    } else if (hasAnchor) {
      const diff = (((anchorWeekday as number) - start.getDay()) % 7 + 7) % 7;
      first = addD(start, diff);
    }
    const everyNWeeks = Math.max(1, Math.round(instance.serviceCycleDays / 7));
    const count = Math.min(instance.quantity || 6, 6);
    const out: Date[] = [];
    for (let i = 0; i < count; i++) out.push(hasAnchor && !anchorDate ? addD(first, i * everyNWeeks * 7) : addD(first, i * instance.serviceCycleDays!));
    return out;
  }, [instance?.serviceCycleDays, anchorWeekday, anchorDate, instance?.quantity]);


  const inputStyle:React.CSSProperties={backgroundColor:'var(--ag-bg)',border:'1px solid var(--ag-line)',color:'var(--ag-text)'};
  const taxFactor=instance.taxRate && instance.taxInclusion==='exclusive'?1+instance.taxRate/100:1;
  const gross=Math.round((cadenceMath?cadenceMath.termTotal:(instance.unlimited?1:instance.quantity)*(effPrice??0))*taxFactor*100)/100;
  const money=(v:number)=>Number.isFinite(v)?new Intl.NumberFormat(undefined,{style:'currency',currency:instance.currency}).format(v):'Review price';
  const apply=()=>{
    if(!instance.name.trim()){setError('Enter a commitment name.');return;}
    if(!Number.isInteger(instance.quantity)||instance.quantity<1){setError('Enter a positive whole quantity.');return;}
    if(priced&&(!Number.isFinite(effPrice)||effPrice!<0||(effPrice===0&&!instance.config?.complimentary))){setError('Enter a price or explicitly mark this commitment complimentary.');return;}
    if(priced&&instance.cycle==='custom'&&(!instance.customCycleDays||instance.customCycleDays<1)){setError('Enter the custom billing interval.');return;}
    if(instance.serviceCycleDays!==undefined&&(!Number.isFinite(instance.serviceCycleDays)||instance.serviceCycleDays<1)){setError('Enter a valid service interval.');return;}
    props.onUpdate(instance); props.onToggleExpand();
  };
  return <section ref={editorRef} className="cm-editor" aria-label="Edit commitment" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();props.onToggleExpand();}}}>
    <header className="cm-editor-head"><div><small>EDIT COMMITMENT</small><h3>{instance.name||'New commitment'}</h3><p>Changes apply to this agreement only.</p></div><button type="button" aria-label="Cancel commitment editing" onClick={props.onToggleExpand}><X size={18}/></button></header>
    <section className="cm-section"><h4><span>1</span>What’s included</h4>
      {flyBy && <label>Commitment name *<input aria-label="Commitment name" value={name} onChange={e=>onUpdate({name:e.target.value})}/></label>}
      {flyBy ? <RichTextEditor value={description} onChange={html=>onUpdate({description:html})} label="Description" placeholder="What does this line cover?" minHeight={90} maxHeight={220} allowFullscreen={false}/> : <SafeHtml html={description || instance.config?.content || ''}/>}
      <p className="cm-hint">{instance.coverageTypeName ? `Covers ${instance.coverageTypeName}${instance.config?.splitUnitIndex ? ' · Unit '+instance.config.splitUnitIndex+' of '+instance.config.splitUnitTotal : coverageUnitCount ? ' × '+coverageUnitCount:''}`:'Whole agreement'}</p>
      <label className="cm-check"><input type="checkbox" checked={!!instance.config?.showDescription} onChange={e=>onUpdate({config:{...instance.config,showDescription:e.target.checked}})}/>Show description on contract</label>
          {/* Spare Part category — same 4 options catalog-studio offers when
              defining a spare part. No SKU on a loose line; category + the
              Visits quantity above is enough to ask "N of this kind". */}
          {flyBy && instance.flyByType === 'spare' && (
            <div className="mt-3">
              <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: dim }}>
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SPARE_CATEGORIES.map((c) => {
                  const isActive = (spareCategory || 'parts') === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSpareCategoryChange(c.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        backgroundColor: isActive ? colors.brand.primary : colors.utility.primaryText + '08',
                        color: isActive ? '#fff' : dim,
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}


    </section>
    {(priced || isGroupSession || deliversOccurrences) && <section className="cm-section"><h4><span>2</span>{instance.config?.billingOnly?'Quantity billed':'How it’s delivered'}</h4>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: dim }}>
                  {isGroupSession ? 'Sessions' : instance.categoryId === 'service' && !cp && !instance.config?.billingOnly ? 'Total visits' : 'Quantity'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    aria-label="Commitment quantity"
                    value={instance.unlimited ? '' : instance.quantity}
                    disabled={instance.unlimited}
                    onChange={(e) => handleQtyChange(e.target.value)}
                    className="w-full rounded-lg px-2.5 py-2 text-[13px] disabled:opacity-50"
                    style={inputStyle}
                  />
                  <label className="flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap" style={{ color: dim }}>
                    <input
                      type="checkbox"
                      checked={instance.unlimited}
                      onChange={(e) =>
                        // Same rule as the previous card: switching to
                        // Unlimited clears the service cycle interval
                        onUpdate({
                          unlimited: e.target.checked,
                          ...(e.target.checked ? { serviceCycleDays: undefined } : {}),
                        })
                      }
                    />
                    Unlimited
                  </label>
                </div>
              </div>

      {instance.config?.billingOnly ? <p className="cm-hint">Billing only. No service events or visits are generated.</p> : <>
          {/* Service cycle (visit interval). FlyBy rows (Contract's custom
              lines AND RFQ) get the catalog-studio "Delivery Settings" style
              redesign — explicit Yes/No + anchor weekday + sample dates.
              Catalog (non-flyBy) rows keep the EXACT previous design,
              completely untouched — zero behavior change there. */}
          {deliversOccurrences && !instance.unlimited && (
            flyBy ? (
              <div
                className="mt-3 p-3 rounded-xl border-2 border-dashed"
                style={{
                  borderColor: serviceCycleExceedsDuration
                    ? colors.semantic?.error || '#EF4444'
                    : instance.serviceCycleDays
                      ? colors.brand.primary
                      : colors.utility.primaryText + '20',
                  backgroundColor: serviceCycleExceedsDuration
                    ? (colors.semantic?.error || '#EF4444') + '08'
                    : instance.serviceCycleDays
                      ? colors.brand.primary + '06'
                      : 'transparent',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-3.5 h-3.5" style={{ color: colors.brand.primary }} />
                  <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: dim }}>
                    Service Cycles
                  </label>
                </div>
                <div className="text-[12px] mb-2" style={{ color: dim }}>Does this repeat?</div>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => handleRequiresCycleToggle(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 text-[12px] font-semibold transition-all"
                    style={{
                      backgroundColor: instance.serviceCycleDays ? colors.brand.primary : (isDarkMode ? 'rgba(15,23,42,0.5)' : '#fff'),
                      borderColor: instance.serviceCycleDays ? colors.brand.primary : line,
                      color: instance.serviceCycleDays ? '#fff' : colors.utility.primaryText,
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Yes, repeats
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequiresCycleToggle(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 text-[12px] font-semibold transition-all"
                    style={{
                      backgroundColor: !instance.serviceCycleDays ? colors.brand.primary : (isDarkMode ? 'rgba(15,23,42,0.5)' : '#fff'),
                      borderColor: !instance.serviceCycleDays ? colors.brand.primary : line,
                      color: !instance.serviceCycleDays ? '#fff' : colors.utility.primaryText,
                    }}
                  >
                    One-time
                  </button>
                </div>

                {instance.serviceCycleDays !== undefined && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: dim }}>Every</span>
                      <input
                        type="number"
                        min={1}
                        aria-label="Days between service events"
                        value={instance.serviceCycleDays || ''}
                        onChange={(e) =>
                          onUpdate({ serviceCycleDays: e.target.value ? Math.max(1, Number(e.target.value)) : undefined })
                        }
                        className="w-20 rounded-lg px-2.5 py-1.5 text-sm font-medium text-center"
                        style={{
                          ...inputStyle,
                          border: `1px solid ${serviceCycleExceedsDuration ? colors.semantic?.error || '#EF4444' : colors.utility.primaryText + '20'}`,
                        }}
                      />
                      <span className="text-xs" style={{ color: dim }}>days</span>
                    </div>

                    <div className="mt-2.5">
                      <div className="text-[11px] font-semibold mb-1.5" style={{ color: dim }}>
                        Repeat on a fixed weekday? (optional)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAnchorWeekdayChange(undefined)}
                          className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={{
                            backgroundColor: anchorWeekday === undefined ? colors.brand.primary : colors.utility.primaryText + '0a',
                            color: anchorWeekday === undefined ? '#fff' : dim,
                          }}
                        >
                          No fixed day
                        </button>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((lbl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleAnchorWeekdayChange(i)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                            style={{
                              backgroundColor: anchorWeekday === i ? colors.brand.primary : colors.utility.primaryText + '0a',
                              color: anchorWeekday === i ? '#fff' : dim,
                            }}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <div className="text-[11px] font-semibold mb-1.5" style={{ color: dim }}>
                        First occurrence date (optional)
                      </div>
                      <input
                        type="date"
                        aria-label="First occurrence date"
                        value={anchorDate || ''}
                        onChange={(e) => handleAnchorDateChange(e.target.value === '' ? undefined : e.target.value)}
                        className="rounded-lg px-2.5 py-1.5 text-[13px]"
                        style={inputStyle}
                      />
                      <p className="text-[10.5px] mt-1" style={{ color: dim }}>
                        Set this when the real first visit doesn&apos;t match the computed date — overrides the weekday anchor above for the first occurrence only.
                      </p>
                    </div>

                    <div className="mt-2.5">
                      <div className="text-[11px] font-semibold mb-1.5" style={{ color: dim }}>
                        Grace period
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          placeholder="e.g. 7"
                          aria-label="Grace period in days"
                          value={gracePeriod ?? ''}
                          onChange={(e) => handleGracePeriodChange(e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-20 rounded-lg px-2.5 py-1.5 text-sm font-medium text-center"
                          style={inputStyle}
                        />
                        <span className="text-xs" style={{ color: dim }}>days — buffer before marking overdue</span>
                      </div>
                    </div>

                    {sampleDates.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-dashed" style={{ borderColor: line }}>
                        <div className="text-[11px] font-semibold mb-1" style={{ color: dim }}>Next occurrences</div>
                        <div className="flex flex-wrap gap-1.5">
                          {sampleDates.map((d, i) => (
                            <span
                              key={i}
                              className="text-[10.5px] px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: colors.brand.primary + '10', color: colors.brand.primary }}
                            >
                              {d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {showCoverageAmbiguity && (
                      <div className="mt-2.5 pt-2.5 border-t border-dashed" style={{ borderColor: line }}>
                        <p className="text-[11.5px] leading-relaxed" style={{ color: colors.utility.primaryText }}>
                          <strong>{instance.quantity} visit{instance.quantity === 1 ? '' : 's'}</strong> cover{instance.quantity === 1 ? 's' : ''} all{' '}
                          <strong>{coverageUnitCount} units</strong>
                          {instance.coverageTypeName ? <> of <strong>{instance.coverageTypeName}</strong></> : null} together, per visit —
                          not {instance.quantity} visits for each unit.
                        </p>
                        {onSplitByUnits && (
                          <button
                            type="button"
                            onClick={onSplitByUnits}
                            className="mt-1.5 text-[11px] font-bold underline"
                            style={{ color: colors.brand.primary }}
                          >
                            Split into {coverageUnitCount} independent schedules instead
                          </button>
                        )}
                      </div>
                    )}
                    {isGroupSession && (
                      <p className="text-[11px] mt-2" style={{ color: dim }}>
                        Holidays shift per Cadence Settings — you&apos;ll confirm each clash at the schedule preview.
                      </p>
                    )}
                    {serviceCycleExceedsDuration && (
                      <div
                        className="mt-2 p-2 rounded-lg text-xs"
                        style={{ backgroundColor: (colors.semantic?.error || '#EF4444') + '12', color: colors.semantic?.error || '#EF4444' }}
                      >
                        Cycles span {serviceCycleSpanDays} days but the contract is only {contractDurationDays} days.
                        Reduce visits or shorten the interval.
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div
                className="mt-3 p-3 rounded-xl border-2 border-dashed"
                style={{
                  borderColor: serviceCycleExceedsDuration
                    ? colors.semantic?.error || '#EF4444'
                    : instance.serviceCycleDays
                      ? colors.brand.primary
                      : colors.utility.primaryText + '20',
                  backgroundColor: serviceCycleExceedsDuration
                    ? (colors.semantic?.error || '#EF4444') + '08'
                    : instance.serviceCycleDays
                      ? colors.brand.primary + '06'
                      : 'transparent',
                }}
              >
                <label className="block text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: dim }}>
                  Service cycle
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: dim }}>Every</span>
                  <input
                    type="number"
                    min={1}
                    aria-label="Days between service events"
                        value={instance.serviceCycleDays || ''}
                    placeholder="—"
                    onChange={(e) =>
                      onUpdate({ serviceCycleDays: e.target.value ? Math.max(1, Number(e.target.value)) : undefined })
                    }
                    className="w-20 rounded-lg px-2.5 py-1.5 text-sm font-medium text-center"
                    style={{
                      ...inputStyle,
                      border: `1px solid ${serviceCycleExceedsDuration ? colors.semantic?.error || '#EF4444' : colors.utility.primaryText + '20'}`,
                    }}
                  />
                  <span className="text-xs" style={{ color: dim }}>
                    {anchorLabel ? `days · on ${anchorLabel}` : 'days from start of contract'}
                  </span>
                </div>
                {instance.serviceCycleDays && instance.serviceCycleDays > 0 ? (
                  <p className="text-xs leading-relaxed mt-2" style={{ color: colors.utility.primaryText }}>
                    {isGroupSession ? 'This session runs' : 'This service will be performed'} every{' '}
                    <strong>{instance.serviceCycleDays} days</strong>
                    {anchorLabel && <> on <strong>{anchorLabel}</strong></>},{' '}
                    <strong>{instance.quantity} time{instance.quantity > 1 ? 's' : ''}</strong>
                    {instance.quantity > 1 && !anchorLabel && (
                      <span style={{ color: dim }}>
                        {' '}(Day 1 to Day {(instance.quantity - 1) * instance.serviceCycleDays})
                      </span>
                    )}
                  </p>
                ) : null}
                {showCoverageAmbiguity && (
                  <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: line }}>
                    <p className="text-[11.5px] leading-relaxed" style={{ color: colors.utility.primaryText }}>
                      <strong>{instance.quantity} visit{instance.quantity === 1 ? '' : 's'}</strong> cover{instance.quantity === 1 ? 's' : ''} all{' '}
                      <strong>{coverageUnitCount} units</strong>
                      {instance.coverageTypeName ? <> of <strong>{instance.coverageTypeName}</strong></> : null} together, per visit —
                      not {instance.quantity} visits for each unit.
                    </p>
                  </div>
                )}
                {isGroupSession && (
                  <p className="text-[11px] mt-1" style={{ color: dim }}>
                    Holidays shift per Cadence Settings — you&apos;ll confirm each clash at the schedule preview.
                  </p>
                )}
                {serviceCycleExceedsDuration && (
                  <div
                    className="mt-2 p-2 rounded-lg text-xs"
                    style={{ backgroundColor: (colors.semantic?.error || '#EF4444') + '12', color: colors.semantic?.error || '#EF4444' }}
                  >
                    Cycles span {serviceCycleSpanDays} days but the contract is only {contractDurationDays} days.
                    Reduce visits or increase the interval.
                  </div>
                )}
              </div>
            )
          )}


      </>}
    </section>}
    <section className="cm-section"><h4><span>{priced || isGroupSession || deliversOccurrences ? '3':'2'}</span>{priced?'Price & billing':'Included in the agreement'}</h4>
    {priced ? <>
              {!rfqFlyBy && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: dim }}>
                    Your price {cp ? '(per payment)' : instance.categoryId === 'service' && !instance.config?.billingOnly ? '(per visit)' : '(per unit)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    aria-label="Your price"
                    value={effPrice ?? ''}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="w-full rounded-lg px-2.5 py-2 text-[13px]"
                    style={inputStyle}
                  />
                  <div
                    className="text-[11.5px] font-semibold mt-1"
                    style={{ color: discounted ? '#0d9464' : dim }}
                  >
                    {hasList
                      ? discounted
                        ? `List ${sym}${listPrice!.toLocaleString()} → −${discountPct}% recorded as discount`
                        : effPrice !== undefined && effPrice > listPrice!
                          ? `Above list (${sym}${listPrice!.toLocaleString()})`
                          : 'At list price — no discount recorded'
                      : 'No list price on this block'}
                  </div>
                </div>
              )}
      {priced && <label>{cp ? 'Payment cadence' : 'Billing frequency'}<select aria-label="Billing frequency" value={instance.cycle} onChange={e=>handleCycleChange(e.target.value)}>
        {!(cp ? cadenceOptions.some(c=>c.id===instance.cycle) : CYCLE_OPTIONS.some(c=>c.id===instance.cycle)) && <option value={instance.cycle}>{instance.cycle || 'Choose billing frequency'}</option>}
        {cp ? cadenceOptions.map(c=><option key={c.id} value={c.id}>{c.label}{cp.defaultCadence===c.id?' · Catalogue default':''}</option>) : CYCLE_OPTIONS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
      </select></label>}
      {priced && !cp && instance.cycle==='custom' && <label>Days between bills *<input aria-label="Days between bills" type="number" min={1} value={instance.customCycleDays ?? ''} onChange={e=>onUpdate({customCycleDays:e.target.value?Number(e.target.value):undefined})}/></label>}


          {/* Cadence payment schedule + seller-set final payment (as before) */}
          {priced && cp && cadenceMath && (
            <div
              className="mt-3 rounded-lg border px-3 py-2.5"
              style={{ borderColor: `${colors.brand.primary}30`, backgroundColor: `${colors.brand.primary}06` }}
            >
              <div className="text-[12px] font-semibold" style={{ color: colors.utility.primaryText }}>
                {cadenceMath.fullPayments} payment{cadenceMath.fullPayments !== 1 ? 's' : ''} × {sym}
                {(effPrice ?? instance!.price).toLocaleString()}
                {cadenceMath.remMonths > 0 && (
                  <> + final payment {sym}{cadenceMath.finalPayment.toLocaleString()}</>
                )}{' '}
                = <span style={{ color: colors.brand.primary }}>{sym}{cadenceMath.termTotal.toLocaleString()}</span> over {durationMonths} months
              </div>
              {cadenceMath.remMonths > 0 && (
                <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: '#F59E0B60' }}>
                  <div className="text-[11px] font-semibold mb-1" style={{ color: '#B45309' }}>
                    {cadenceMath.remMonths} month{cadenceMath.remMonths > 1 ? 's' : ''} left over — you decide the final payment
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      aria-label="Final payment"
                      value={instance!.config?.cadenceFinalPayment ?? cadenceMath.suggestedFinal}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        onUpdate({
                          config: {
                            ...instance!.config,
                            cadenceFinalPayment: isNaN(v) ? undefined : Math.max(0, v),
                          } as any,
                        });
                      }}
                      className="w-28 rounded-lg px-2.5 py-1.5 text-[12.5px]"
                      style={{ ...inputStyle, borderColor: '#F59E0B60' }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate({ config: { ...instance!.config, cadenceFinalPayment: undefined } as any })
                      }
                      className="text-[10.5px] font-bold underline"
                      style={{ color: '#B45309' }}
                    >
                      pro-rata suggestion: {sym}{cadenceMath.suggestedFinal.toLocaleString()}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}


      <div className="cm-tax"><strong>Tax from catalogue</strong><p>{instance.taxes?.length ? instance.taxes.map(t=>`${t.name} ${t.rate}%`).join(' + ') : instance.taxRate ? `${instance.taxRate}%`:'No tax configured'}{instance.taxRate ? ` · ${instance.taxInclusion}`:''}</p><small>Tax settings stay attached to the selected block; no replacement rate is assumed.</small></div>
      <label className="cm-check"><input type="checkbox" checked={!!instance.config?.complimentary} onChange={e=>onUpdate({config:{...instance.config,complimentary:e.target.checked,...(e.target.checked?{customPrice:0}:{})}})}/>This line is intentionally complimentary</label>
      <label>This commitment creates<select aria-label="This commitment creates" value={instance.config?.billingOnly?'billing':'delivery'} onChange={e=>onUpdate({config:{...instance.config,billingOnly:e.target.value==='billing'}})}><option value="delivery">Delivery + billing events</option><option value="billing">Billing events only</option></select></label>
      <p className="cm-hint">{instance.config?.billingOnly?'No service visits or appointments.':'Service frequency and billing frequency are separate.'}</p>
      <div className="cm-result" aria-live="polite"><span>Commitment total · configured tax</span><strong>{money(gross)}</strong></div>
    </>:<p>No charge. {isGroupSession?'Session scheduling remains part of this commitment.':'This block contributes content to your agreement.'}</p>}
    </section>
    {error && <p className="cm-error" role="alert">{error}</p>}
    <footer className="cm-editor-footer"><button type="button" onClick={props.onToggleExpand}>Cancel</button><button type="button" className="ag-primary" onClick={apply}>Apply changes</button></footer>
  </section>;
};
export default CommitmentEditor;
