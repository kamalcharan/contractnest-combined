// src/components/contracts/ContractWizard/vani/VaNiBlockRecommender.tsx
//
// VaNi block recommender — the tenant agent for the "Add Service Blocks" step.
// It reads the TENANT'S OWN catalog blocks (same source as the block library),
// surfaces the ones relevant to the contract's assets, and adds the accepted
// ones straight into the wizard's selectedBlocks (via onAddBlocks). It never
// invents anything — it only picks from blocks the tenant already has.
//
// Recommendation is a deterministic, local heuristic in this slice (relevance
// by asset + activity). A later batch can swap `recommend()` for an API/edge
// call without changing this component's surface.

import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Check, Wrench, Package, CalendarClock, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Block } from '@/types/catalogStudio';
import { useCatBlocksTest } from '@/hooks/queries/useCatBlocksTest';
import { catBlocksToBlocks } from '@/utils/catalog-studio/catBlockAdapter';
import { getCurrencySymbol } from '@/utils/constants/currencies';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  assetNames: string[];        // resource names from the Assets step (may be empty)
  addedBaseIds: string[];      // base catalog ids already in the contract
  onAddBlocks: (blocks: Block[]) => void;
}

const VANI = '#ff6b2b';

const resourceNamesOf = (b: Block): string[] => {
  const rs = ((b.meta as any)?.selectedResources || (b.config as any)?.selectedResources || []) as Array<{ resource_name?: string }>;
  return rs.map((r) => (r.resource_name || '').toLowerCase()).filter(Boolean);
};
const activityOf = (b: Block): string => ((b.config as any)?.kt_service_activity || '') as string;
const cadenceOf = (b: Block): number | null => {
  const c = (b.meta as any)?.serviceCycles || (b.config as any)?.serviceCycles;
  return c?.enabled && c?.days ? c.days : null;
};

const VaNiBlockRecommender: React.FC<Props> = ({ isOpen, onClose, currency, assetNames, addedBaseIds, onAddBlocks }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { data, isLoading } = useCatBlocksTest();

  const allBlocks: Block[] = useMemo(() => {
    const raw = (data as any)?.data?.blocks || (data as any)?.blocks || [];
    try { return catBlocksToBlocks(raw); } catch { return []; }
  }, [data]);

  // ── Recommendation heuristic (local, deterministic) ────────────────
  const { services, spares } = useMemo(() => {
    const added = new Set(addedBaseIds);
    const assetLc = assetNames.map((a) => a.toLowerCase()).filter(Boolean);

    const relevant = (b: Block) => {
      if (added.has(b.id)) return false;
      if (assetLc.length === 0) return true;         // no asset context → offer all
      const rn = resourceNamesOf(b);
      if (rn.length === 0) return true;              // unscoped block → generally applicable
      return rn.some((n) => assetLc.some((a) => n.includes(a) || a.includes(n)));
    };

    const pool = allBlocks.filter(relevant);
    const svc = pool.filter((b) => b.categoryId === 'service');
    const spr = pool.filter((b) => b.categoryId === 'spare');

    // Order services: scheduled (has cadence) first, then by activity, then name
    const rank = (b: Block) => (cadenceOf(b) != null ? 0 : 1);
    svc.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    spr.sort((a, b) => a.name.localeCompare(b.name));
    return { services: svc, spares: spr };
  }, [allBlocks, assetNames, addedBaseIds]);

  // Accepted set — services pre-accepted, spares opt-in.
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (isOpen) setAccepted(new Set(services.map((b) => b.id)));
  }, [isOpen, services]);

  if (!isOpen) return null;

  const toggle = (id: string) => setAccepted((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const acceptedBlocks = [...services, ...spares].filter((b) => accepted.has(b.id));
  const sym = getCurrencySymbol(currency);

  const handleAdd = () => {
    if (acceptedBlocks.length === 0) return;
    onAddBlocks(acceptedBlocks);
    onClose();
  };

  const Row: React.FC<{ b: Block; kind: 'service' | 'spare' }> = ({ b, kind }) => {
    const on = accepted.has(b.id);
    const tone = kind === 'service' ? '#2563eb' : '#F59E0B';
    const cadence = cadenceOf(b);
    const act = activityOf(b);
    return (
      <button
        onClick={() => toggle(b.id)}
        className="w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-start gap-2.5"
        style={{ border: `1.5px solid ${on ? tone : `${colors.utility.secondaryText}18`}`, background: on ? `${tone}0c` : colors.utility.primaryBackground }}
      >
        <div className="flex items-center justify-center shrink-0 mt-0.5" style={{ width: 18, height: 18, borderRadius: 5, background: on ? tone : 'transparent', border: `1.5px solid ${on ? tone : `${colors.utility.secondaryText}40`}` }}>
          {on && <Check className="w-3 h-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12.5px] font-semibold" style={{ color: colors.utility.primaryText }}>{b.name}</span>
            {act && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${tone}18`, color: tone }}>{act}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: colors.utility.secondaryText }}>
            {cadence != null && <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> every {cadence}d</span>}
            <span>{sym}{(b.price ?? 0).toLocaleString()}</span>
          </div>
        </div>
      </button>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[60]" style={{ animation: 'vbrFade .18s ease' }}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.5)' }} onClick={onClose} />
      <aside className="absolute top-0 right-0 h-full flex flex-col shadow-2xl" style={{ width: 460, maxWidth: '92vw', background: colors.utility.primaryBackground, borderLeft: `1px solid ${colors.utility.secondaryText}18`, animation: 'vbrSlide .22s ease' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0" style={{ borderColor: `${colors.utility.secondaryText}15` }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black shrink-0" style={{ background: `linear-gradient(135deg, ${VANI}, #ff8f5a)` }}>V</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>Suggest blocks with VaNi</div>
            <div className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
              {assetNames.length ? `From your catalog · for ${assetNames.slice(0, 2).join(', ')}${assetNames.length > 2 ? '…' : ''}` : 'From your catalog'}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:opacity-80" style={{ backgroundColor: `${colors.utility.secondaryText}10`, color: colors.utility.secondaryText }}><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16" style={{ color: colors.utility.secondaryText }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: VANI }} /> Reading your catalog…
            </div>
          ) : services.length === 0 && spares.length === 0 ? (
            <div className="text-center py-14">
              <Sparkles className="w-7 h-7 mx-auto mb-3" style={{ color: VANI }} />
              <div className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>No matching blocks</div>
              <p className="text-[12px] max-w-[280px] mx-auto" style={{ color: colors.utility.secondaryText }}>
                Nothing in your catalog matches these assets yet. Seed blocks for this equipment in Catalog Studio → VaNi Seeding, then try again.
              </p>
            </div>
          ) : (
            <>
              {services.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>
                    <Wrench className="w-3 h-3" /> Services · {services.length}
                  </div>
                  {services.map((b) => <Row key={b.id} b={b} kind="service" />)}
                </div>
              )}
              {spares.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>
                    <Package className="w-3 h-3" /> Spares · {spares.length}
                  </div>
                  {spares.map((b) => <Row key={b.id} b={b} kind="spare" />)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isLoading && (services.length > 0 || spares.length > 0) && (
          <div className="px-5 py-3 border-t shrink-0 flex items-center gap-3" style={{ borderColor: `${colors.utility.secondaryText}15`, background: colors.utility.secondaryBackground }}>
            <span className="text-[11px]" style={{ color: colors.utility.secondaryText }}>{accepted.size} selected</span>
            <button
              onClick={handleAdd}
              disabled={acceptedBlocks.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-white disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${VANI}, #ff8f5a)` }}
            >
              <Check className="w-4 h-4" /> Add {acceptedBlocks.length} block{acceptedBlocks.length === 1 ? '' : 's'}
            </button>
          </div>
        )}
      </aside>

      <style>{`
        @keyframes vbrFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vbrSlide { from { transform: translateX(24px); opacity: .6 } to { transform: translateX(0); opacity: 1 } }
      `}</style>
    </div>,
    document.body
  );
};

export default VaNiBlockRecommender;
