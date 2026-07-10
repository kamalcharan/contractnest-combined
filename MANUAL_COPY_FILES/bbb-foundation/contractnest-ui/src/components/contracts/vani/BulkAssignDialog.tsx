// src/components/contracts/vani/BulkAssignDialog.tsx
// Multi-party assignment (Phase 2): assign one published template to many
// members at once. Reuses the SAME deterministic core as single-party —
// vaniComposerService.assembleFromTemplate (no LLM) → useContractSubmission —
// looped per member with animated batch progress. No backend change.

import React, { useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Users, Search, User, Building2, CheckCircle2, Loader2, AlertTriangle,
  Zap, ArrowRight, X,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { useContactList } from '@/hooks/useContacts';
import { useContractSubmission } from '@/hooks/useContractSubmission';
import vaniComposerService from '@/services/vaniComposerService';
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

const contactDisplayName = (c: any): string =>
  c?.display_name || c?.company_name ||
  [c?.first_name, c?.last_name].filter(Boolean).join(' ') ||
  c?.name || 'Unnamed';

// Contract relationship from the member's classifications (falls back to client).
const contactContractType = (c: any): 'client' | 'partner' | 'vendor' => {
  const cls: string[] = c?.classifications || [];
  if (cls.includes('partner')) return 'partner';
  if (cls.includes('vendor')) return 'vendor';
  return 'client';
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
  };
  const handleClose = () => { if (!running) { reset(); onClose(); } };

  // ── Run the batch: assemble ONCE → clone per member → single bulk call ──
  // The template's assembled draft is buyer-independent, so we assemble once
  // and clone it per member (setting buyer + type + template link), then hand
  // the whole set to the server bulk endpoint (create + activate + idempotent
  // dedup, one round-trip). No per-member client loop.
  const run = async () => {
    if (!seed || selectedCount === 0) return;
    const members = selectedIds.map((id) => selected[id]);
    setProgress(members.map((c) => ({ id: c.id, name: contactDisplayName(c), status: 'running' as RowStatus })));
    setRunning(true);
    setFinished(false);

    try {
      const base = await vaniComposerService.assembleFromTemplate(
        seed.match.template_id,
        { ...seed.intent, start_date: startDate },
        null,
        seed.match.currency
      );

      const items = members.map((c) => ({
        buyerId: c.id,
        contractType: contactContractType(c),
        draft: {
          ...(base.draft as any),
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
      // Whole-batch failure (e.g. the one-shot assemble failed) — mark all rows.
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
        className="sm:max-w-3xl rounded-xl"
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
          <div className="space-y-3 mt-1">
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
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: colors.utility.border, color: colors.utility.primaryText, backgroundColor: colors.utility.primaryBackground }}
              >
                <option value="all">All types</option>
                <option value="client">Client</option>
                <option value="partner">Partner</option>
                <option value="vendor">Vendor</option>
              </select>
              <button
                type="button"
                onClick={selectAllVisible}
                className="text-[11px] font-semibold px-2.5 py-2 rounded-lg"
                style={{ color: colors.brand.primary, backgroundColor: `${colors.brand.primary}12` }}
              >
                Select all shown
              </button>
            </div>

            {/* Member list */}
            <div className="rounded-lg border overflow-y-auto" style={{ borderColor: colors.utility.border, maxHeight: '18rem' }}>
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
                      <span className="text-[9px] uppercase font-bold flex-shrink-0" style={{ color: colors.utility.secondaryText }}>
                        {contactContractType(c)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Shared start date */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>Start date (all)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: colors.utility.border, color: colors.utility.primaryText, backgroundColor: colors.utility.primaryBackground }}
              />
            </div>
          </div>
        )}

        {/* ── PROGRESS / SUMMARY STAGE ── */}
        {(running || finished) && (
          <div className="mt-1">
            <div className="rounded-lg border overflow-y-auto" style={{ borderColor: colors.utility.border, maxHeight: '22rem' }}>
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
              disabled={running || selectedCount === 0}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 flex items-center gap-1.5"
              style={{ backgroundColor: colors.brand.primary, opacity: (running || selectedCount === 0) ? 0.6 : 1 }}
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
