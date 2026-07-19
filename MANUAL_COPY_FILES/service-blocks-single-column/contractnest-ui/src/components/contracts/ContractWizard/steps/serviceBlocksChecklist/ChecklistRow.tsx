// src/components/contracts/ContractWizard/steps/serviceBlocksChecklist/ChecklistRow.tsx
// Mock 9 — one catalog block as a checklist row.
// Anatomy: [checkbox] name/description [price] → when checked, a compact
// config summary line (tags + Edit) → Edit opens the 3-field editor
// (visits / your price / billing cycle) with an Advanced disclosure.
// ALL edits route through the wizard's existing handleUpdateBlock — this
// component owns zero pricing math.

import React from 'react';
import { Block } from '@/types/catalogStudio';
import type { ConfigurableBlock } from '@/components/catalog-studio';
// Single source of truth for non-cadence billing cycles — the SAME six
// options the previous card offered (PrePaid/PostPaid/Monthly/
// Fortnightly/Quarterly/Custom)
import { CYCLE_OPTIONS } from '@/components/catalog-studio/BlockCardConfigurable';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import {
  getCadenceCycle,
  fittingCadences,
  cadenceTermMath,
  type BlockCadencePricing,
} from '@/utils/catalog-studio/cadencePricing';

export interface ChecklistRowProps {
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
  /** This block's cycle offends the unified billing cycle */
  mismatch?: { majority: string } | null;
  expanded: boolean;
  durationMonths: number;
  onToggle: () => void;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<ConfigurableBlock>) => void;
  onRemove?: () => void;
  /** Type suffix shown after the name for content blocks ("text block") */
  typeLabel?: string;
}

const cycleLabel = (cycle: string, customDays?: number): string => {
  const cad = getCadenceCycle(cycle);
  if (cad) return `${cad.label} billing`;
  if (cycle === 'custom') return customDays ? `Every ${customDays} days` : 'Custom cycle';
  const opt = CYCLE_OPTIONS.find((o) => o.id === cycle);
  if (opt) return opt.label;
  return cycle;
};

const ChecklistRow: React.FC<ChecklistRowProps> = ({
  colors,
  isDarkMode,
  currency,
  block,
  instance,
  checked,
  disabled = false,
  disabledLabel = 'COMING SOON',
  priced,
  flyBy = false,
  mismatch,
  expanded,
  durationMonths,
  onToggle,
  onToggleExpand,
  onUpdate,
  onRemove,
  typeLabel,
}) => {
  const line = colors.utility.primaryText + '15';
  const dim = colors.utility.secondaryText;
  const sym = getCurrencySymbol(instance?.currency || currency);

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

  const inputStyle: React.CSSProperties = {
    backgroundColor: isDarkMode ? 'rgba(15,23,42,0.6)' : '#fff',
    border: `1px solid ${line}`,
    color: colors.utility.primaryText,
  };

  const advRow = (label: string, value: React.ReactNode) => (
    <div
      className="flex items-center justify-between rounded-lg border px-3 py-2 text-[12.5px]"
      style={{ backgroundColor: isDarkMode ? 'rgba(15,23,42,0.5)' : '#fff', borderColor: line, color: dim }}
    >
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );

  return (
    <div
      className="rounded-[11px] border mb-2 overflow-hidden transition-colors"
      style={{
        backgroundColor: disabled
          ? 'transparent'
          : isDarkMode
            ? 'rgba(30,41,59,0.6)'
            : '#ffffff',
        borderColor: checked ? colors.brand.primary : line,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {/* Row top: checkbox + name + price */}
      <div
        className="flex items-center gap-3 px-3.5 py-3"
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
        onClick={disabled ? undefined : onToggle}
      >
        <div
          className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-white text-[12px] font-black"
          style={{
            border: `2px solid ${checked ? colors.brand.primary : '#c3cad4'}`,
            backgroundColor: checked ? colors.brand.primary : 'transparent',
          }}
        >
          {checked ? '✓' : ''}
        </div>
        <div className="min-w-0 flex-1">
          {flyBy && checked ? (
            <input
              value={name}
              placeholder="Custom line name…"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-full rounded-md px-2 py-1 text-[13.5px] font-bold"
              style={inputStyle}
            />
          ) : (
            <div className="font-bold text-[13.5px] truncate" style={{ color: colors.utility.primaryText }}>
              {name || 'Custom line'}
              {typeLabel && (
                <span className="font-normal" style={{ color: dim }}> · {typeLabel}</span>
              )}
            </div>
          )}
          <div className="text-[12px] truncate" style={{ color: dim }}>
            {description}
          </div>
        </div>
        {/* Explicit pick affordance — the checkbox alone was easy to miss */}
        {!disabled && !flyBy && (
          <span
            className="text-[10.5px] font-extrabold rounded-full px-2.5 py-1 flex-shrink-0"
            style={
              checked
                ? { backgroundColor: colors.semantic?.success ? colors.semantic.success + '15' : '#0d946415', color: colors.semantic?.success || '#0d9464' }
                : { backgroundColor: colors.brand.primary + '12', color: colors.brand.primary }
            }
          >
            {checked ? '✓ Added' : '+ Add'}
          </span>
        )}
        <div className="ml-auto text-right flex-shrink-0">
          {disabled ? (
            <span
              className="text-[10.5px] font-extrabold rounded-full px-2.5 py-1"
              style={{ backgroundColor: colors.utility.primaryText + '0d', color: dim }}
            >
              {disabledLabel}
            </span>
          ) : priced ? (
            <>
              <div className="font-extrabold text-[13.5px] tabular-nums" style={{ color: colors.utility.primaryText }}>
                {displayPrice !== undefined ? `${sym}${displayPrice.toLocaleString()}` : '—'}
              </div>
              <div className="text-[11px]" style={{ color: dim }}>
                {checked && instance ? cycleLabel(instance.cycle, instance.customCycleDays) : 'per unit'}
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] font-bold" style={{ color: dim }}>No charge</div>
              <div className="text-[11px]" style={{ color: dim }}>shapes the document</div>
            </>
          )}
        </div>
      </div>

      {/* Compact config summary line (checked only) */}
      {checked && instance && (
        <div className="flex items-center gap-2 flex-wrap px-3.5 pb-3 pl-[46px] text-[12px]" style={{ color: dim }}>
          {priced && (
            <span className="rounded-full px-2.5 py-0.5 font-semibold" style={{ backgroundColor: colors.utility.primaryText + '0a' }}>
              {instance.unlimited ? 'Unlimited' : `${instance.quantity} visit${instance.quantity === 1 ? '' : 's'}`}
            </span>
          )}
          {priced && (
            <span
              className="rounded-full px-2.5 py-0.5 font-semibold"
              style={
                mismatch
                  ? { backgroundColor: '#F59E0B18', color: '#B45309' }
                  : { backgroundColor: colors.utility.primaryText + '0a' }
              }
            >
              {cycleLabel(instance.cycle, instance.customCycleDays)}
            </span>
          )}
          {discounted && (
            <span className="rounded-full px-2.5 py-0.5 font-bold" style={{ backgroundColor: '#0d946418', color: '#0d9464' }}>
              {sym}{effPrice!.toLocaleString()} · −{discountPct}% off list
            </span>
          )}
          {instance.config?.billingOnly && (
            <span className="rounded-full px-2.5 py-0.5 font-semibold" style={{ backgroundColor: colors.utility.primaryText + '0a' }}>
              Billing-only
            </span>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="ml-auto font-bold text-[12px]"
            style={{ color: colors.brand.primary }}
          >
            {expanded ? 'Close' : 'Edit'}
          </button>
        </div>
      )}

      {/* Expanded 3-field editor */}
      {checked && instance && expanded && (
        <div
          className="border-t border-dashed px-3.5 py-3.5"
          style={{ borderColor: line, backgroundColor: isDarkMode ? 'rgba(15,23,42,0.35)' : '#fafbfd' }}
        >
          {flyBy && (
            <div className="mb-3">
              <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: dim }}>
                Description
              </label>
              <input
                value={description}
                placeholder="What does this line cover?"
                onChange={(e) => onUpdate({ description: e.target.value })}
                className="w-full rounded-lg px-2.5 py-2 text-[13px]"
                style={inputStyle}
              />
            </div>
          )}
          {priced ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: dim }}>
                  Visits
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
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
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: dim }}>
                  Your price {cp ? '(per payment)' : '(per visit)'}
                </label>
                <input
                  type="number"
                  min={0}
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
            </div>
          ) : (
            <div className="text-[12.5px]" style={{ color: dim }}>
              Content block — no pricing. It shapes the contract document{typeLabel === 'checklist block' ? ' and attaches to visits' : ''}.
            </div>
          )}

          {/* Billing cycle — chip selection (same options as the previous card) */}
          {priced && (
            <div className="mt-3">
              <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: dim }}>
                {cp ? 'Payment cadence — your proposal to the buyer' : 'Billing cycle'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {cp
                  ? cadenceOptions.map((c) => {
                      const rate = cp.rates.find((r) => r.cycle === c.id);
                      const override = (instance.config as any)?.cadenceOverrides?.[c.id];
                      const shown = c.id === instance.cycle ? (effPrice ?? rate?.amount) : (override ?? rate?.amount);
                      const isActive = instance.cycle === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleCycleChange(c.id)}
                          className="px-3 py-2 rounded-lg text-xs font-medium transition-all text-left"
                          style={{
                            backgroundColor: isActive ? colors.brand.primary : colors.utility.primaryText + '08',
                            color: isActive ? '#fff' : dim,
                          }}
                        >
                          <span className="font-bold">
                            {c.label}
                            {cp.defaultCadence === c.id && (
                              <span
                                className="ml-1.5 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.brand.primary + '15',
                                  color: isActive ? '#fff' : colors.brand.primary,
                                }}
                              >
                                default
                              </span>
                            )}
                          </span>
                          <span className="block text-[10px] mt-0.5" style={{ opacity: 0.85 }}>
                            {sym}{(shown ?? 0).toLocaleString()} {c.per}
                          </span>
                        </button>
                      );
                    })
                  : CYCLE_OPTIONS.map((o) => {
                      const isActive = instance.cycle === o.id;
                      const OptIcon = o.icon;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => handleCycleChange(o.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                          style={{
                            backgroundColor: isActive ? colors.brand.primary : colors.utility.primaryText + '08',
                            color: isActive ? '#fff' : dim,
                          }}
                        >
                          <OptIcon className="w-3.5 h-3.5" />
                          {o.label}
                        </button>
                      );
                    })}
              </div>
              {/* Custom cycle days — only when Custom is selected */}
              {!cp && instance.cycle === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min={1}
                    value={instance.customCycleDays || ''}
                    placeholder="Enter days"
                    onChange={(e) => onUpdate({ customCycleDays: e.target.value ? Math.max(1, Number(e.target.value)) : undefined })}
                    className="w-24 rounded-lg px-2.5 py-1.5 text-[12.5px]"
                    style={inputStyle}
                  />
                  <span className="text-[11.5px]" style={{ color: dim }}>Days</span>
                </div>
              )}
            </div>
          )}

          {/* Service cycle (visit interval) — full previous-card logic:
              editable interval, anchor weekday, plain-language summary,
              span-vs-duration validation. Hidden when Unlimited. */}
          {deliversOccurrences && !instance.unlimited && (
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
              {isGroupSession && (
                <p className="text-[11px] mt-1" style={{ color: dim }}>
                  Holidays shift per Cadence Settings — you'll confirm each clash at the schedule preview.
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
          )}

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

          {/* Advanced disclosure */}
          <details className="mt-3">
            <summary className="text-[12.5px] font-bold cursor-pointer" style={{ color: dim }}>
              Advanced — tax, description{priced ? ', billing-only' : ''} (rarely needed)
            </summary>
            <div className="grid gap-2 mt-2.5">
              {priced && advRow(
                'Tax',
                instance.taxes && instance.taxes.length > 0
                  ? `${instance.taxes.map((t) => `${t.name} ${t.rate}%`).join(' + ')} · ${instance.taxInclusion === 'inclusive' ? 'inclusive' : 'exclusive'}`
                  : 'No tax on this block',
              )}
              {advRow(
                'Show description on contract',
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!instance.config?.showDescription}
                    onChange={(e) => onUpdate({ config: { ...instance.config, showDescription: e.target.checked } as any })}
                  />
                  {instance.config?.showDescription ? 'Yes' : 'No'}
                </label>,
              )}
              {priced && advRow(
                'Billing-only (no visits)',
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!instance.config?.billingOnly}
                    onChange={(e) => onUpdate({ config: { ...instance.config, billingOnly: e.target.checked } as any })}
                  />
                  {instance.config?.billingOnly ? 'Yes' : 'No'}
                </label>,
              )}
            </div>
          </details>

          <div className="flex items-center justify-between mt-3">
            {onRemove ? (
              <button
                type="button"
                onClick={onRemove}
                className="text-[12px] font-bold"
                style={{ color: colors.semantic?.error || '#EF4444' }}
              >
                Remove line
              </button>
            ) : <span />}
            <button
              type="button"
              onClick={onToggleExpand}
              className="rounded-lg px-4 py-2 text-[12.5px] font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: colors.brand.primary }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistRow;
