// src/components/contracts/vani/BulkAssignDialog.tsx
// Multi-party assignment (Phase 2): assign one published template to many
// members at once. Reuses the SAME deterministic core as single-party —
// vaniComposerService.assembleFromTemplate (no LLM) → useContractSubmission —
// looped per member with animated batch progress. No backend change.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Users, Search, User, Building2, CheckCircle2, Loader2, AlertTriangle,
  Zap, ArrowRight, Settings2,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { useContactList } from '@/hooks/useContacts';
import { useContractSubmission } from '@/hooks/useContractSubmission';
import vaniComposerService, { VaniParsedIntent, VaniComposeResult } from '@/services/vaniComposerService';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { CONTACT_CLASSIFICATION_CONFIG } from '@/utils/constants/contacts';
import type { TemplateSeed } from './VaNiComposerLauncher';

interface BulkAssignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  seed: TemplateSeed | null;
  templateName: string;
  onDone?: () => void;
}

type RowStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error';
interface ProgressRow {
  id: string;
  name: string;
  status: RowStatus;
  contractNumber?: string;
  error?: string;
}

// Mirrors CADENCE_LABEL in VaNiComposerLauncher.tsx / cadence-acceptance.ts
const CADENCE_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  halfyearly: '6-Monthly',
  annual: 'Annual',
};

const DURATION_TO_DAYS: Record<string, number> = { days: 1, months: 30, years: 365 };

const contactDisplayName = (c: any): string =>
  c?.display_name || c?.company_name ||
  [c?.first_name, c?.last_name].filter(Boolean).join(' ') ||
  c?.name || 'Unnamed';

// Display classification — the contact's actual type, for the tag/badge shown
// beside their name. Uses the shared 4-type config (client/vendor/partner/
// team_member) so it never mislabels a team member as a client.
const contactClassificationLabel = (c: any): string => {
  const cls: string[] = c?.classifications || [];
  const match = CONTACT_CLASSIFICATION_CONFIG.find((cfg) => cls.includes(cfg.id));
  return match?.label || 'Client';
};

// Contract relationship (t_contracts.contract_type) — distinct from the
// display tag above. The contract record only models client/partner/vendor;
// a team-member contact still gets a normal client-perspective contract.
const contactContractType = (c: any): 'client' | 'partner' | 'vendor' => {
  const cls: string[] = c?.classifications || [];
  if (cls.includes('partner')) return 'partner';
  if (cls.includes('vendor')) return 'vendor';
  return 'client';
};

const addDays = (isoDate: string, days: number): Date => {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d;
};

const BulkAssignDialog: React.FC<BulkAssignDialogProps> = ({
  isOpen, onClose, seed, templateName, onDone,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();
  const { submitBulk } = useContractSubmission();

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Record<string, any>>({}); // id -> contact
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [finished, setFinished] = useState(false);

  // Preferences — mirrors VaNiComposerLauncher's single-assign panel, applied
  // to the ONE shared draft (assembleFromTemplate is buyer-independent) that
  // gets cloned per member at Create time.
  const [intent, setIntent] = useState<VaniParsedIntent | null>(null);
  const [cadenceOverrides, setCadenceOverrides] = useState<Record<string, string>>({});
  const [result, setResult] = useState<VaniComposeResult | null>(null);
  const [assembling, setAssembling] = useState(false);

  const { data: contacts, loading } = useContactList({
    search: search.trim().length >= 2 ? search.trim() : undefined,
    classifications: classFilter === 'all' ? [] : [classFilter],
    per_page: 100,
    enabled: isOpen && !running && !finished,
  } as any);

  const selectedIds = Object.keys(selected);
  const selectedCount = selectedIds.length;

  const perContract = seed?.match.total || 0;
  const currencySym = useMemo(() => {
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: seed?.match.currency || 'INR' }); }
    catch { return null; }
  }, [seed?.match.currency]);
  const fmt = (n: number) => currencySym ? currencySym.format(n) : `${seed?.match.currency || 'INR'} ${n.toLocaleString()}`;

  const toggle = (c: any) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[c.id]) delete next[c.id];
      else next[c.id] = c;
      return next;
    });
  };
  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = { ...prev };
      const list = contacts || [];
      const allOn = list.length > 0 && list.every((c: any) => next[c.id]);
      if (allOn) list.forEach((c: any) => delete next[c.id]);
      else list.forEach((c: any) => { next[c.id] = c; });
      return next;
    });
  };

  const reset = () => {
    setSelected({}); setProgress([]); setFinished(false); setRunning(false);
    setSearch(''); setClassFilter('all');
    setIntent(null); setResult(null); setCadenceOverrides({});
  };
  const handleClose = () => { if (!running) { reset(); onClose(); } };

  // ── Preview assemble: runs once on open, then again on every preference
  //    change — same live-reassemble UX as single-assign. Create time just
  //    clones whatever the LAST assemble produced, per member. ──
  const reassembleBase = useCallback(async (nextIntent: VaniParsedIntent, cadOverride: Record<string, string>) => {
    if (!seed) return;
    setAssembling(true);
    try {
      const res = await vaniComposerService.assembleFromTemplate(
        seed.match.template_id,
        nextIntent,
        null,
        seed.match.currency,
        Object.entries(cadOverride).map(([block_id, cycle]) => ({ block_id, cycle }))
      );
      setResult(res);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Could not refresh draft', message: err?.message || 'Failed to assemble' });
    } finally {
      setAssembling(false);
    }
  }, [seed, addToast]);

  useEffect(() => {
    if (!isOpen || !seed) return;
    const today = new Date().toISOString().slice(0, 10);
    setStartDate(today);
    const initIntent: VaniParsedIntent = { ...seed.intent, start_date: today };
    setIntent(initIntent);
    setCadenceOverrides({});
    reassembleBase(initIntent, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, seed?.match.template_id]);

  const updateIntent = (mutate: (i: VaniParsedIntent) => void) => {
    if (!intent || assembling) return;
    const next: VaniParsedIntent = { ...intent, billing: { ...intent.billing }, duration: { ...intent.duration } };
    mutate(next);
    setIntent(next);
    reassembleBase(next, cadenceOverrides);
  };

  const updateStartDate = (v: string) => {
    setStartDate(v);
    updateIntent((i) => { i.start_date = v; });
  };

  const setCadenceOverride = (blockId: string, cycle: string) => {
    if (!intent || assembling) return;
    const next = { ...cadenceOverrides, [blockId]: cycle };
    setCadenceOverrides(next);
    reassembleBase(intent, next);
  };

  const endDateLabel = useMemo(() => {
    if (!intent) return '';
    const days = Math.max(1, Number(intent.duration.value) || 1) * (DURATION_TO_DAYS[intent.duration.unit] || 30);
    return addDays(startDate, days).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }, [intent, startDate]);

  // ── Run the batch: clone the already-assembled draft per member → single
  //    bulk call. The template's assembled draft is buyer-independent, so it
  //    only needs to be built once (via the Preferences panel above), then
  //    every member gets a clone with buyer + start date substituted, and the
  //    whole set goes to the server bulk endpoint (create + activate +
  //    idempotent dedup, one round-trip). No per-member client loop.
  const run = async () => {
    if (!seed || !result || selectedCount === 0) return;
    const members = selectedIds.map((id) => selected[id]);
    setProgress(members.map((c) => ({ id: c.id, name: contactDisplayName(c), status: 'running' as RowStatus })));
    setRunning(true);
    setFinished(false);

    try {
      const items = members.map((c) => ({
        buyerId: c.id,
        contractType: contactContractType(c),
        draft: {
          ...(result.draft as any),
          buyerId: c.id,
          buyerName: contactDisplayName(c),
          startDate,
          templateId: seed.match.template_id,
        },
      }));

      const { results, summary } = await submitBulk(items, {
        templateId: seed.match.template_id,
        activate: true,
      });

      const byBuyer = new Map(results.map((r) => [r.buyer_id, r]));
      setProgress(members.map((c) => {
        const r = byBuyer.get(c.id);
        const status: RowStatus =
          r?.status === 'skipped' ? 'skipped'
          : r?.status === 'failed' ? 'error'
          : 'done';
        return {
          id: c.id,
          name: contactDisplayName(c),
          status,
          contractNumber: r?.contract_number,
          error: r?.error || r?.reason,
        };
      }));

      addToast({
        type: summary.failed === 0 ? 'success' : 'warning',
        title: 'Bulk assignment complete',
        message: `${summary.created} created`
          + (summary.skipped ? `, ${summary.skipped} skipped` : '')
          + (summary.failed ? `, ${summary.failed} failed` : ''),
      });
    } catch (err: any) {
      // Whole-batch failure — mark all rows.
      setProgress((p) => p.map((r) => ({ ...r, status: 'error' as RowStatus, error: err?.message || 'Failed' })));
      addToast({ type: 'error', title: 'Bulk assignment failed', message: err?.message || 'Please try again.' });
    } finally {
      setRunning(false);
      setFinished(true);
      onDone?.();
    }
  };

  if (!isOpen || !seed) return null;

  const list = contacts || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-5xl rounded-xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.border }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: colors.utility.primaryText, fontSize: '0.95rem' }}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: colors.brand.primary }} />
              Assign to members
            </div>
          </DialogTitle>
          <DialogDescription style={{ color: colors.utility.secondaryText, fontSize: '0.72rem' }}>
            <Zap className="w-3 h-3 inline mr-1" />
            {templateName}{perContract ? ` · ${fmt(perContract)} each` : ''} — one contract per member, deterministic (no AI).
          </DialogDescription>
        </DialogHeader>

        {/* ── PICK STAGE ── */}
        {!running && !finished && (
          <div className="space-y-4 mt-1">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.utility.secondaryText }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search members…"
                  className="pl-9 pr-3 py-2 rounded-lg border text-sm w-full bg-transparent"
                  style={{ borderColor: colors.utility.border, color: colors.utility.primaryText }}
                />
              </div>
              <button
                type="button"
                onClick={selectAllVisible}
                className="text-[11px] font-semibold px-2.5 py-2 rounded-lg"
                style={{ color: colors.brand.primary, backgroundColor: `${colors.brand.primary}12` }}
              >
                Select all shown
              </button>
            </div>

            {/* Contact type filter — radio, all 4 classifications */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setClassFilter('all')}
                className="px-2.5 py-1.5 rounded-lg border text-[11px] font-medium hover:opacity-80"
                style={{
                  borderColor: classFilter === 'all' ? colors.brand.primary : colors.utility.border,
                  backgroundColor: classFilter === 'all' ? `${colors.brand.primary}10` : 'transparent',
                  color: classFilter === 'all' ? colors.brand.primary : colors.utility.secondaryText,
                }}
              >
                All types
              </button>
              {CONTACT_CLASSIFICATION_CONFIG.map((cfg) => (
                <button
                  key={cfg.id}
                  type="button"
                  onClick={() => setClassFilter(cfg.id)}
                  className="px-2.5 py-1.5 rounded-lg border text-[11px] font-medium hover:opacity-80"
                  style={{
                    borderColor: classFilter === cfg.id ? colors.brand.primary : colors.utility.border,
                    backgroundColor: classFilter === cfg.id ? `${colors.brand.primary}10` : 'transparent',
                    color: classFilter === cfg.id ? colors.brand.primary : colors.utility.secondaryText,
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>

            {/* Member list */}
            <div className="rounded-lg border overflow-y-auto" style={{ borderColor: colors.utility.border, maxHeight: '24rem' }}>
              {loading ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: colors.brand.primary }} />
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Loading members…</span>
                </div>
              ) : list.length === 0 ? (
                <div className="text-center py-8 text-xs" style={{ color: colors.utility.secondaryText }}>No members match.</div>
              ) : (
                list.map((c: any) => {
                  const checked = !!selected[c.id];
                  const isCorp = c.type === 'corporate';
                  const EntityIcon = isCorp ? Building2 : User;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left border-b last:border-b-0 transition-colors"
                      style={{ borderColor: colors.utility.border, backgroundColor: checked ? `${colors.brand.primary}0c` : 'transparent' }}
                    >
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{
                          border: `2px solid ${checked ? colors.brand.primary : `${colors.utility.secondaryText}55`}`,
                          backgroundColor: checked ? colors.brand.primary : 'transparent',
                        }}
                      >
                        {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </span>
                      <EntityIcon className="w-4 h-4 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                      <span className="text-xs font-medium truncate flex-1" style={{ color: colors.utility.primaryText }}>
                        {contactDisplayName(c)}
                      </span>
                      {(c.tags || []).slice(0, 3).map((tag: any) => (
                        <span
                          key={tag.id || tag.tag_value}
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium flex-shrink-0"
                          style={{
                            backgroundColor: (tag.tag_color || colors.brand.secondary || colors.brand.primary) + '20',
                            color: isDarkMode ? colors.utility.primaryText : (tag.tag_color || colors.brand.secondary || colors.brand.primary),
                          }}
                        >
                          {tag.tag_label || tag.tag_value}
                        </span>
                      ))}
                      <span className="text-[9px] uppercase font-bold flex-shrink-0" style={{ color: colors.utility.secondaryText }}>
                        {contactClassificationLabel(c)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Preferences — same live-reassemble pattern as single-assign */}
            <div className="rounded-lg border p-3" style={{ borderColor: colors.utility.border }}>
              <div className="flex items-center gap-2 mb-3">
                <Settings2 className="w-4 h-4" style={{ color: colors.brand.primary }} />
                <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
                  Preferences — applies to every contract in this batch
                </span>
                {assembling && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto" style={{ color: colors.brand.primary }} />}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Acceptance */}
                <div>
                  <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>Acceptance</p>
                  <div className="flex gap-1 flex-wrap">
                    {(['signoff', 'payment', 'auto'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => updateIntent((i) => { i.acceptance = m; })}
                        className="px-2 py-1 rounded-lg border text-[11px] font-medium hover:opacity-80"
                        style={{
                          borderColor: intent?.acceptance === m ? colors.brand.primary : colors.utility.border,
                          backgroundColor: intent?.acceptance === m ? `${colors.brand.primary}10` : 'transparent',
                          color: intent?.acceptance === m ? colors.brand.primary : colors.utility.secondaryText,
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
                        type="button"
                        onClick={() => updateIntent((i) => {
                          i.billing.mode = m;
                          if (m === 'emi' && !i.billing.emi_months) i.billing.emi_months = 12;
                          if (m === 'per_block' && !i.billing.cycle) i.billing.cycle = 'quarterly';
                        })}
                        className="px-2 py-1 rounded-lg border text-[11px] font-medium hover:opacity-80"
                        style={{
                          borderColor: intent?.billing.mode === m ? colors.brand.primary : colors.utility.border,
                          backgroundColor: intent?.billing.mode === m ? `${colors.brand.primary}10` : 'transparent',
                          color: intent?.billing.mode === m ? colors.brand.primary : colors.utility.secondaryText,
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Start date + computed end date */}
                <div>
                  <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>Start date (all)</p>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => updateStartDate(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border text-[11px] outline-none w-full"
                    style={{ borderColor: colors.utility.border, color: colors.utility.primaryText, backgroundColor: colors.utility.primaryBackground }}
                  />
                  {intent && (
                    <p className="text-[10px] mt-1" style={{ color: colors.utility.secondaryText }}>Ends {endDateLabel}</p>
                  )}
                </div>
                {/* Duration override */}
                <div>
                  <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>Duration</p>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min={1}
                      value={intent?.duration.value ?? ''}
                      onChange={(e) => updateIntent((i) => { i.duration.value = Math.max(1, Number(e.target.value) || 1); })}
                      className="px-2 py-1.5 rounded-lg border text-[11px] outline-none w-16"
                      style={{ borderColor: colors.utility.border, color: colors.utility.primaryText, backgroundColor: colors.utility.primaryBackground }}
                    />
                    <select
                      value={intent?.duration.unit ?? 'months'}
                      onChange={(e) => updateIntent((i) => { i.duration.unit = e.target.value as VaniParsedIntent['duration']['unit']; })}
                      className="px-2 py-1.5 rounded-lg border text-[11px] outline-none flex-1"
                      style={{ borderColor: colors.utility.border, color: colors.utility.primaryText, backgroundColor: colors.utility.primaryBackground }}
                    >
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Per-block cadence — only for blocks with a real cadencePricing
                  rate card (same as single-assign's picker). */}
              {result?.draft.selectedBlocks
                .filter((b: any) => b.config?.cadencePricing?.rates?.length)
                .map((b: any) => {
                  const rates = (b.config.cadencePricing.rates as Array<{ cycle: string; amount: number; enabled?: boolean }>)
                    .filter((r) => r.enabled !== false && Number(r.amount) > 0);
                  const activeCycle = cadenceOverrides[b.id] ?? b.cycle;
                  return (
                    <div key={b.id} className="mt-3 pt-3 border-t" style={{ borderColor: colors.utility.border }}>
                      <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>
                        Cadence — {b.name}
                      </p>
                      <div className="flex gap-1 flex-wrap">
                        {rates.map((r) => (
                          <button
                            key={r.cycle}
                            type="button"
                            onClick={() => setCadenceOverride(b.id, r.cycle)}
                            className="px-2.5 py-1.5 rounded-lg border text-[11px] font-medium hover:opacity-80"
                            style={{
                              borderColor: activeCycle === r.cycle ? colors.brand.primary : colors.utility.border,
                              backgroundColor: activeCycle === r.cycle ? `${colors.brand.primary}10` : 'transparent',
                              color: activeCycle === r.cycle ? colors.brand.primary : colors.utility.secondaryText,
                            }}
                          >
                            {CADENCE_LABEL[r.cycle] || r.cycle} · {getCurrencySymbol(b.currency)}{Number(r.amount).toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── PROGRESS / SUMMARY STAGE ── */}
        {(running || finished) && (
          <div className="mt-1">
            <div className="rounded-lg border overflow-y-auto" style={{ borderColor: colors.utility.border, maxHeight: '26rem' }}>
              {progress.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 px-3 py-2 border-b last:border-b-0" style={{ borderColor: colors.utility.border }}>
                  <span className="w-5 flex-shrink-0 flex items-center justify-center">
                    {r.status === 'done' && <CheckCircle2 className="w-4 h-4" style={{ color: colors.semantic.success }} />}
                    {r.status === 'running' && <Loader2 className="w-4 h-4 animate-spin" style={{ color: colors.brand.primary }} />}
                    {r.status === 'error' && <AlertTriangle className="w-4 h-4" style={{ color: colors.semantic.error }} />}
                    {r.status === 'skipped' && <CheckCircle2 className="w-4 h-4" style={{ color: `${colors.utility.secondaryText}99` }} />}
                    {r.status === 'pending' && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `${colors.utility.secondaryText}55` }} />}
                  </span>
                  <span className="text-xs font-medium truncate flex-1" style={{ color: colors.utility.primaryText }}>{r.name}</span>
                  <span className="text-[10px] flex-shrink-0" style={{ color: r.status === 'error' ? colors.semantic.error : colors.utility.secondaryText }}>
                    {r.status === 'done' ? r.contractNumber
                      : r.status === 'skipped' ? 'Already assigned'
                      : r.status === 'error' ? r.error
                      : r.status === 'running' ? 'Creating…' : 'Queued'}
                  </span>
                </div>
              ))}
            </div>
            {finished && (
              <p className="text-xs mt-2 font-semibold" style={{ color: colors.utility.primaryText }}>
                {progress.filter((r) => r.status === 'done').length} created
                {progress.some((r) => r.status === 'skipped') ? ` · ${progress.filter((r) => r.status === 'skipped').length} already assigned` : ''}
                {progress.some((r) => r.status === 'error') ? ` · ${progress.filter((r) => r.status === 'error').length} failed` : ''}
              </p>
            )}
          </div>
        )}

        {/* ── ACTIONS ── */}
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={handleClose}
            disabled={running}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.secondaryText, border: `1px solid ${colors.utility.border}`, opacity: running ? 0.5 : 1 }}
          >
            {finished ? 'Close' : 'Cancel'}
          </button>
          {!finished && (
            <button
              onClick={run}
              disabled={running || assembling || !result || selectedCount === 0}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 flex items-center gap-1.5"
              style={{ backgroundColor: colors.brand.primary, opacity: (running || assembling || !result || selectedCount === 0) ? 0.6 : 1 }}
            >
              {running ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</>) : (<><ArrowRight className="w-3.5 h-3.5" /> Create {selectedCount || ''} contract{selectedCount === 1 ? '' : 's'}</>)}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkAssignDialog;
