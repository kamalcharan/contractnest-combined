// src/pages/catalog-studio/equipment.tsx
// Catalog Studio — Equipment & Facilities view (Sprint 1, founder design)
//
// The catalog mirrored in knowledge-tree shape: equipment/facility-first
// navigation, per-equipment services & spares with KT prices/cycles/ranges,
// and the single-equipment VaNi seed with a mandatory preview-before-load.
// This page is a VIEW + LAUNCHER: editing happens in the existing block
// wizard (classic blocks page); seeding reuses the onboarding seed pipeline.

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { vaniToast } from '@/components/common/toast';
import useResourceTemplatesBrowser from '@/hooks/queries/useResourceTemplates';
import { useKnowledgeTreeCoverage } from '@/hooks/queries/useKnowledgeTree';

// Platform LOV ids (same constants the seeder/mapper use)
const BLOCK_TYPE_SPARE = '1221e2dd-a603-47fb-9063-c393193514b7';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawBlock {
  id: string;
  name: string;
  block_type_id?: string;
  block_type_name?: string;
  base_price?: number | null;
  currency?: string;
  resource_template_id?: string | null;
  is_seed?: boolean;
  config?: any;
}

interface SeedPreview {
  counts: { services: number; spares: number; priced: number; total: number };
  services: PreviewItem[];
  spares: PreviewItem[];
}
interface PreviewItem {
  name: string;
  base_price: number | null;
  currency: string;
  currencies: string[];
  cycle_days: number | null;
  variants: number;
}

// ── Tokens (match VaNi onboarding styling) ────────────────────────────────────
const VANI = '#ff6b2b';
const TEXT = '#1a1816'; const TEXT_DIM = '#8a847a'; const TEXT_MUTED = '#bab4a8';
const BORDER = '#e5e1db'; const BORDER_LT = '#edeae4';
const SURFACE = '#faf9f7'; const BG = '#f7f5f2'; const WHITE = '#ffffff';
const GREEN = '#16a34a'; const GREEN_BG = '#f0fdf4'; const GREEN_BD = '#bbf7d0';
const AMBER = '#d97706'; const AMBER_BG = '#fffbeb';
const BLUE = '#2563eb'; const BLUE_BG = '#eff6ff';
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n: number, c: string) =>
  c === 'INR' ? `₹${n.toLocaleString('en-IN')}` : c === 'USD' ? `$${n.toLocaleString()}` : `${c} ${n.toLocaleString()}`;

const Badge: React.FC<{ tone: 'green' | 'blue' | 'amber' | 'grey'; children: React.ReactNode; title?: string }> = ({ tone, children, title }) => {
  const map = {
    green: { bg: GREEN_BG, fg: GREEN, bd: GREEN_BD },
    blue: { bg: BLUE_BG, fg: BLUE, bd: 'rgba(37,99,235,.2)' },
    amber: { bg: AMBER_BG, fg: AMBER, bd: 'rgba(217,119,6,.25)' },
    grey: { bg: SURFACE, fg: TEXT_MUTED, bd: BORDER_LT },
  }[tone];
  return (
    <span title={title} style={{
      fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
      letterSpacing: 0.4, background: map.bg, color: map.fg, border: `1px solid ${map.bd}`, flexShrink: 0,
    }}>{children}</span>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const CatalogEquipmentPage: React.FC = () => {
  const navigate = useNavigate();

  const { templates, isLoading: tplLoading } = useResourceTemplatesBrowser({ limit: 200 });
  const { data: ktCoverage } = useKnowledgeTreeCoverage();

  const [blocks, setBlocks] = useState<RawBlock[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [variantFilter, setVariantFilter] = useState<string>('all');   // variant_id | 'all'
  const [currencyView, setCurrencyView] = useState<string>('');        // '' = auto (primary)

  // Seed preview / load state
  const [preview, setPreview] = useState<SeedPreview | null>(null);
  const [previewFor, setPreviewFor] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchBlocks = useCallback(async () => {
    try {
      const resp = await api.get('/api/catalog-studio/blocks', { params: { limit: 500 } });
      setBlocks(resp.data?.data?.blocks || resp.data?.blocks || []);
    } catch {
      vaniToast.error('Could not load catalog blocks');
    } finally {
      setBlocksLoading(false);
    }
  }, []);
  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  // blocks grouped by equipment (resource_template_id)
  const blocksByTemplate = useMemo(() => {
    const m = new Map<string, RawBlock[]>();
    blocks.forEach(b => {
      const key = b.resource_template_id || '__custom__';
      const arr = m.get(key) || [];
      arr.push(b);
      m.set(key, arr);
    });
    return m;
  }, [blocks]);

  const isSpare = (b: RawBlock) =>
    b.block_type_id === BLOCK_TYPE_SPARE || b.block_type_name === 'spare';

  type EqState = 'seeded' | 'unpriced' | 'kt' | 'none';
  const stateFor = (tplId: string): EqState => {
    const bls = blocksByTemplate.get(tplId) || [];
    if (bls.length > 0) {
      return bls.some(b => num(b.base_price) > 0) ? 'seeded' : 'unpriced';
    }
    return (ktCoverage?.[tplId]?.variants_count ?? 0) > 0 ? 'kt' : 'none';
  };

  const equipment = useMemo(
    () => templates.filter((t: any) => (t.resource_type_id || '').toLowerCase() !== 'asset'),
    [templates]);
  const facilities = useMemo(
    () => templates.filter((t: any) => (t.resource_type_id || '').toLowerCase() === 'asset'),
    [templates]);
  const customBlocks = blocksByTemplate.get('__custom__') || [];

  const q = search.trim().toLowerCase();
  const matches = (text: string) => !q || text.toLowerCase().includes(q);
  const tplMatches = (t: any) =>
    matches(t.name) || (blocksByTemplate.get(t.id) || []).some(b => matches(b.name));

  const selected = templates.find((t: any) => t.id === selectedId)
    || (selectedId === '__custom__' ? { id: '__custom__', name: 'My custom blocks' } : null);

  useEffect(() => {
    if (!selectedId && templates.length) {
      const firstSeeded = templates.find((t: any) => (blocksByTemplate.get(t.id) || []).length > 0);
      setSelectedId((firstSeeded || templates[0])?.id || null);
    }
  }, [templates, blocksByTemplate, selectedId]);

  // ── Seed actions ────────────────────────────────────────────────────────────

  useEffect(() => { setVariantFilter('all'); }, [selectedId]);

  const openPreview = async (tplId: string) => {
    setPreviewFor(tplId);
    setPreviewLoading(true);
    setPreview(null);
    try {
      const resp = await api.get('/api/seeds/tenant/seed-preview', {
        params: { resource_template_id: tplId },
      });
      setPreview(resp.data?.data || null);
    } catch (err: any) {
      vaniToast.error(err?.response?.data?.error || 'Preview failed');
      setPreviewFor(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const loadSeed = async () => {
    if (!previewFor) return;
    setSeeding(true);
    try {
      const resp = await api.post('/api/seeds/tenant/seed-equipment', {
        resourceTemplateId: previewFor,
        purpose: 'sell',
      });
      const d = resp.data?.data || {};
      if (resp.data?.status === 'success') {
        vaniToast.success(`Loaded ${d.blocksCreated} blocks into your catalog (test + live)`);
      } else if (resp.data?.status === 'already_seeded') {
        vaniToast.info('Already in your catalog — nothing new to load');
      } else {
        vaniToast.error((d.errors || []).join('; ') || 'Seed failed');
      }
      setPreviewFor(null);
      setPreview(null);
      setBlocksLoading(true);
      await fetchBlocks();
    } catch (err: any) {
      vaniToast.error(err?.response?.data?.error || 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  // ── Renderers ───────────────────────────────────────────────────────────────

  const SidebarItem: React.FC<{ tpl: any }> = ({ tpl }) => {
    const st = stateFor(tpl.id);
    const bls = blocksByTemplate.get(tpl.id) || [];
    const svc = bls.filter(b => !isSpare(b)).length;
    const sp = bls.length - svc;
    const active = selectedId === tpl.id;
    return (
      <div
        onClick={() => setSelectedId(tpl.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer',
          borderLeft: `3px solid ${active ? VANI : 'transparent'}`,
          background: active ? '#fff8f4' : 'transparent',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tpl.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM }}>
            {bls.length > 0 ? `${svc} services · ${sp} spares`
              : st === 'kt' ? 'KT ready · not in catalog' : 'no knowledge tree yet'}
          </div>
        </div>
        {st === 'seeded' && <Badge tone="green">IN CATALOG</Badge>}
        {st === 'unpriced' && <Badge tone="amber">UNPRICED</Badge>}
        {st === 'kt' && <Badge tone="blue">KT READY</Badge>}
        {st === 'none' && <Badge tone="grey">NO KT</Badge>}
      </div>
    );
  };

  const Row: React.FC<{ b: RawBlock; perUnit: boolean; viewCurrency: string }> = ({ b, perUnit, viewCurrency }) => {
    const cfg = b.config || {};
    const inView = priceIn(b, viewCurrency);
    const price = inView ?? 0;
    const missingInCurrency = inView === null && num(b.base_price) > 0;
    const cur = viewCurrency;
    const currencies: string[] = [...new Set(((cfg.pricingRecords || []) as any[]).map(r => r.currency).filter(Boolean))];
    const min = num(cfg.kt_price_min); const max = num(cfg.kt_price_max);
    const days = cfg.serviceCycles?.enabled ? cfg.serviceCycles.days : null;
    const variants = (cfg.selectedVariants || []).length;
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 110px 90px 130px 130px 60px',
        alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${BORDER_LT}`, fontSize: 13,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {b.name}
            {currencies.length > 1 && <Badge tone="blue" title={currencies.join(', ')}>{` ${currencies.length} CUR`}</Badge>}
          </div>
          {b.is_seed && <div style={{ fontFamily: MONO, fontSize: 10, color: TEXT_MUTED }}>Seeded · KT</div>}
        </div>
        <div>{days ? <span style={{ fontFamily: MONO, fontSize: 11, color: BLUE, background: BLUE_BG, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>every {days}d</span> : <span style={{ color: TEXT_MUTED }}>—</span>}</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: TEXT_DIM }}>{variants > 0 ? `${variants} variants` : '—'}</div>
        <div style={{ fontFamily: MONO, fontWeight: 700, color: price > 0 ? TEXT : AMBER, whiteSpace: 'nowrap' }}>
          {price > 0 ? fmt(price, cur) : missingInCurrency ? `+ add ${cur}` : 'set price'}
          {price > 0 && <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600 }}> {perUnit ? '/unit' : '/visit'}</span>}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, whiteSpace: 'nowrap' }}>
          {min > 0 && max > 0 ? `${fmt(min, cur)} – ${fmt(max, cur)}` : 'no market data'}
        </div>
        <button
          onClick={() => navigate(`/catalog-studio/blocks/${b.id}/edit`)}
          title="Edit in the existing block wizard"
          style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 5, border: `1.5px solid ${BORDER}`, background: 'none', color: TEXT_DIM, cursor: 'pointer' }}
        >edit</button>
      </div>
    );
  };

  const selBlocks = selectedId ? (blocksByTemplate.get(selectedId) || []) : [];

  // Variants present across this equipment's blocks (for the variant filter)
  const selVariants = useMemo(() => {
    const m = new Map<string, string>();
    selBlocks.forEach(b => (b.config?.selectedVariants || []).forEach((v: any) => {
      if (v?.variant_id && !m.has(v.variant_id)) m.set(v.variant_id, v.variant_name || v.variant_id);
    }));
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [selBlocks]);

  // Currencies present across this equipment's pricing records
  const selCurrencies = useMemo(() => {
    const set = new Set<string>();
    selBlocks.forEach(b => {
      if (b.currency) set.add(b.currency);
      (b.config?.pricingRecords || []).forEach((r: any) => r?.currency && set.add(r.currency));
    });
    return [...set];
  }, [selBlocks]);
  const activeCurrency = currencyView || (selCurrencies.includes('INR') ? 'INR' : selCurrencies[0] || 'INR');

  // Price of a block in the viewed currency (pricing record per currency)
  const priceIn = (b: RawBlock, cur: string): number | null => {
    const rec = (b.config?.pricingRecords || []).find((r: any) => r?.currency === cur);
    if (rec) return num(rec.amount);
    return (b.currency || 'INR') === cur ? num(b.base_price) : null;
  };

  const appliesToVariant = (b: RawBlock) =>
    variantFilter === 'all' ||
    (b.config?.selectedVariants || []).some((v: any) => v?.variant_id === variantFilter) ||
    (b.config?.selectedVariants || []).length === 0; // spares without variant scoping stay visible
  const selServices = selBlocks.filter(b => !isSpare(b) && matches(b.name) && appliesToVariant(b)).sort((a, b) => a.name.localeCompare(b.name));
  const selSpares = selBlocks.filter(b => isSpare(b) && matches(b.name) && appliesToVariant(b)).sort((a, b) => a.name.localeCompare(b.name));
  const selState: EqState | null = selectedId && selectedId !== '__custom__' ? stateFor(selectedId) : null;
  const cov = selectedId ? ktCoverage?.[selectedId] : undefined;

  // Column headings (founder feedback #1)
  const Cols: React.FC<{ perUnit: boolean }> = ({ perUnit }) => (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 110px 90px 130px 130px 60px',
      gap: 12, padding: '8px 20px', background: SURFACE, borderBottom: `1px solid ${BORDER_LT}`,
      fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: TEXT_MUTED,
    }}>
      <span>{perUnit ? 'Part / Consumable' : 'Service'}</span>
      <span>{perUnit ? '' : 'Cycle'}</span>
      <span>{perUnit ? '' : 'Variants'}</span>
      <span>Your price</span>
      <span>KT market range</span>
      <span></span>
    </div>
  );

  const loading = tplLoading || blocksLoading;

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}}' }} />

      {/* Header */}
      <div style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: TEXT, margin: 0 }}>Catalog Studio</h1>
        <span style={{ fontSize: 12, color: TEXT_MUTED }}>
          <span style={{ color: VANI, fontWeight: 700 }}>Equipment &amp; Facilities</span>
          <span style={{ margin: '0 8px', color: BORDER }}>|</span>
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/catalog-studio/blocks')}>All blocks (classic)</span>
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: VANI, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', maxWidth: 1480, margin: '0 auto', minHeight: 'calc(100vh - 57px)' }}>

          {/* ── Sidebar ── */}
          <div style={{ background: WHITE, borderRight: `1px solid ${BORDER}`, padding: '18px 0' }}>
            <div style={{ margin: '0 16px 14px' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search equipment, services, spares…"
                style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${BORDER}`, borderRadius: 10, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: SURFACE }}
              />
            </div>

            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: TEXT_MUTED, padding: '14px 18px 6px' }}>My Equipment</div>
            {equipment.filter(tplMatches).map((t: any) => <SidebarItem key={t.id} tpl={t} />)}

            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: TEXT_MUTED, padding: '14px 18px 6px' }}>My Facilities</div>
            {facilities.filter(tplMatches).map((t: any) => <SidebarItem key={t.id} tpl={t} />)}

            {customBlocks.length > 0 && (
              <>
                <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: TEXT_MUTED, padding: '14px 18px 6px' }}>Other Items</div>
                <div onClick={() => setSelectedId('__custom__')} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer',
                  borderLeft: `3px solid ${selectedId === '__custom__' ? VANI : 'transparent'}`,
                  background: selectedId === '__custom__' ? '#fff8f4' : 'transparent',
                }}>
                  <div style={{ flex: 1, fontWeight: 700, fontSize: 13, color: TEXT }}>My custom blocks</div>
                  <Badge tone="grey">{customBlocks.length}</Badge>
                </div>
              </>
            )}
          </div>

          {/* ── Main ── */}
          <div style={{ padding: '24px 28px 80px', overflow: 'auto' }}>
            {selected ? (
              <>
                {/* Equipment header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
                  <div>
                    <h2 style={{ fontSize: 21, fontWeight: 800, color: TEXT, margin: 0, letterSpacing: -0.4 }}>{(selected as any).name}</h2>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {selState === 'seeded' && <Badge tone="green">IN CATALOG</Badge>}
                      {selState === 'unpriced' && <Badge tone="amber">IN CATALOG · UNPRICED</Badge>}
                      {selState === 'kt' && <Badge tone="blue">KNOWLEDGE TREE READY</Badge>}
                      {selState === 'none' && <Badge tone="grey">NO KNOWLEDGE TREE</Badge>}
                      {cov && (cov as any).variants_count > 0 && <Badge tone="blue">{`${(cov as any).variants_count} KT VARIANTS`}</Badge>}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                    {[['Services', selServices.length], ['Spares', selSpares.length], ['Priced', selBlocks.filter(b => num(b.base_price) > 0).length]].map(([k, v]) => (
                      <div key={String(k)} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 16px', textAlign: 'center', minWidth: 84 }}>
                        <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 800, color: TEXT }}>{String(v)}</div>
                        <div style={{ fontSize: 10, color: TEXT_DIM }}>{String(k)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* VaNi seed CTA */}
                {selectedId !== '__custom__' && (selState === 'kt' || selState === 'seeded' || selState === 'unpriced') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(145deg,#1a1816,#2a2520)', borderRadius: 14, padding: '14px 18px', marginBottom: 20, color: '#fff' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg,${VANI},#ff8f5a)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>V</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', flex: 1, lineHeight: 1.5 }}>
                      {selState === 'kt'
                        ? <>The knowledge tree is ready for <strong style={{ color: '#fff' }}>{(selected as any).name}</strong> — preview what VaNi would build before anything is saved.</>
                        : <>Seeded from the knowledge tree. <strong style={{ color: '#fff' }}>Re-running is safe</strong> — your edits and contract-linked blocks are always kept.</>}
                    </div>
                    <button
                      onClick={() => openPreview(selectedId!)}
                      style={{ border: 'none', borderRadius: 100, padding: '10px 20px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: `linear-gradient(135deg,${VANI},#ff8f5a)`, color: '#fff', boxShadow: '0 3px 10px rgba(255,107,43,.35)' }}
                    >{selState === 'kt' ? '✨ Seed with VaNi' : '⟳ Re-seed with VaNi'}</button>
                  </div>
                )}

                {/* Filters: variant applicability + currency view (founder feedback #2, #3) */}
                {selBlocks.length > 0 && (selVariants.length > 0 || selCurrencies.length > 0) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                    {selVariants.length > 0 && (
                      <>
                        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: TEXT_MUTED }}>Variant</span>
                        <select
                          value={variantFilter}
                          onChange={e => setVariantFilter(e.target.value)}
                          style={{ padding: '7px 12px', border: `1.5px solid ${BORDER}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: TEXT, background: WHITE, outline: 'none', cursor: 'pointer', maxWidth: 280 }}
                        >
                          <option value="all">All variants</option>
                          {selVariants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </>
                    )}
                    {selCurrencies.length > 0 && (
                      <>
                        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: TEXT_MUTED, marginLeft: 8 }}>Currency</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {selCurrencies.map(c => {
                            const active = c === activeCurrency;
                            return (
                              <button
                                key={c}
                                onClick={() => setCurrencyView(c)}
                                title={active ? `Showing prices in ${c}` : `Click to view prices in ${c}`}
                                style={{
                                  fontFamily: MONO, fontSize: 12, fontWeight: 700,
                                  padding: '6px 14px', borderRadius: 100, cursor: 'pointer',
                                  border: `1.5px solid ${active ? VANI : BORDER}`,
                                  background: active ? '#fff8f4' : WHITE,
                                  color: active ? VANI : TEXT_DIM,
                                  boxShadow: active ? '0 0 0 3px rgba(255,107,43,.08)' : 'none',
                                  transition: 'all .15s',
                                }}
                              >
                                {c === 'INR' ? '₹ INR' : c === 'USD' ? '$ USD' : c === 'EUR' ? '€ EUR' : c}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                    {variantFilter !== 'all' && (
                      <span style={{ fontSize: 11, color: TEXT_DIM }}>
                        showing items applicable to <b>{selVariants.find(v => v.id === variantFilter)?.name}</b>
                      </span>
                    )}
                  </div>
                )}

                {selState === 'none' && (
                  <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '50px 20px', textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🌱</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: TEXT, marginBottom: 6 }}>No knowledge tree for this yet</div>
                    <div style={{ color: TEXT_DIM, fontSize: 13 }}>VaNi can't seed it — add blocks manually in the classic view, or flag it for KT coverage.</div>
                  </div>
                )}

                {/* Services */}
                {selServices.length > 0 && (
                  <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
                    <div style={{ padding: '12px 20px', background: SURFACE, borderBottom: `1px solid ${BORDER_LT}`, fontSize: 13, fontWeight: 800, color: TEXT }}>
                      Services <span style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, fontWeight: 400 }}>· {selServices.length}</span>
                    </div>
                    <Cols perUnit={false} />
                    {selServices.map(b => <Row key={b.id} b={b} perUnit={false} viewCurrency={activeCurrency} />)}
                  </div>
                )}

                {/* Spares */}
                {selSpares.length > 0 && (
                  <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
                    <div style={{ padding: '12px 20px', background: SURFACE, borderBottom: `1px solid ${BORDER_LT}`, fontSize: 13, fontWeight: 800, color: TEXT }}>
                      Spare Parts &amp; Consumables <span style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, fontWeight: 400 }}>· {selSpares.length}</span>
                    </div>
                    <Cols perUnit={true} />
                    {selSpares.map(b => <Row key={b.id} b={b} perUnit={true} viewCurrency={activeCurrency} />)}
                  </div>
                )}

                {selBlocks.length === 0 && selState !== 'none' && selState !== 'kt' && (
                  <div style={{ color: TEXT_MUTED, fontSize: 13, textAlign: 'center', padding: 30 }}>Nothing here yet.</div>
                )}
              </>
            ) : (
              <div style={{ color: TEXT_MUTED, fontSize: 13, textAlign: 'center', padding: 60 }}>Select an equipment or facility on the left.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Seed preview modal ── */}
      {previewFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,22,.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: 680, maxWidth: '94vw', maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,.3)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER_LT}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg,${VANI},#ff8f5a)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#fff' }}>V</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: TEXT, margin: 0 }}>
                Seed preview — {(templates.find((t: any) => t.id === previewFor) as any)?.name || ''}
              </h3>
              <span onClick={() => { setPreviewFor(null); setPreview(null); }} style={{ marginLeft: 'auto', cursor: 'pointer', color: TEXT_MUTED, fontSize: 20, lineHeight: 1 }}>×</span>
            </div>

            <div style={{ padding: '18px 24px', overflow: 'auto' }}>
              {previewLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <div style={{ width: 30, height: 30, border: `3px solid ${BORDER}`, borderTopColor: VANI, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                </div>
              ) : preview ? (
                <>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    {[['Services', preview.counts.services], ['Spares', preview.counts.spares], ['KT priced', preview.counts.priced], ['Total blocks', preview.counts.total]].map(([k, v]) => (
                      <div key={String(k)} style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER_LT}`, borderRadius: 10, padding: 10, textAlign: 'center' }}>
                        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 18, color: VANI }}>{String(v)}</div>
                        <div style={{ fontSize: 10, color: TEXT_DIM }}>{String(k)}</div>
                      </div>
                    ))}
                  </div>

                  {[['Services it will create', preview.services, false], ['Spare parts it will create', preview.spares, true]].map(([title, items, perUnit]) => (items as PreviewItem[]).length > 0 && (
                    <div key={String(title)} style={{ border: `1px solid ${BORDER_LT}`, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: TEXT_MUTED, padding: '8px 14px', background: SURFACE, borderBottom: `1px solid ${BORDER_LT}` }}>{String(title)}</div>
                      {(items as PreviewItem[]).slice(0, 8).map((it, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: `1px solid ${BORDER_LT}`, fontSize: 12 }}>
                          <span style={{ color: TEXT, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 10 }}>
                            {it.name}
                            {it.cycle_days ? <span style={{ fontFamily: MONO, fontSize: 10, color: BLUE, background: BLUE_BG, padding: '1px 6px', borderRadius: 4, marginLeft: 6 }}>every {it.cycle_days}d</span> : null}
                            {it.currencies.length > 1 ? <span style={{ fontFamily: MONO, fontSize: 9, color: BLUE, marginLeft: 6 }}>{it.currencies.join('/')}</span> : null}
                          </span>
                          <span style={{ fontFamily: MONO, fontWeight: 700, color: num(it.base_price) > 0 ? TEXT : AMBER, whiteSpace: 'nowrap' }}>
                            {num(it.base_price) > 0 ? fmt(num(it.base_price), it.currency) : 'no KT price'}
                          </span>
                        </div>
                      ))}
                      {(items as PreviewItem[]).length > 8 && (
                        <div style={{ padding: '8px 14px', fontSize: 11, color: TEXT_MUTED }}>+ {(items as PreviewItem[]).length - 8} more…</div>
                      )}
                    </div>
                  ))}

                  <div style={{ fontSize: 11, color: TEXT_DIM, background: AMBER_BG, border: '1px solid rgba(217,119,6,.15)', borderRadius: 8, padding: '10px 14px', lineHeight: 1.5 }}>
                    Nothing is saved until you press <b>Load into my catalog</b>. Already-loaded items are skipped automatically; your edits and contract-linked blocks are always kept.
                  </div>
                </>
              ) : (
                <div style={{ color: TEXT_MUTED, fontSize: 13, textAlign: 'center', padding: 30 }}>Preview unavailable.</div>
              )}
            </div>

            <div style={{ padding: '14px 24px', borderTop: `1px solid ${BORDER_LT}`, display: 'flex', alignItems: 'center', gap: 12, background: SURFACE }}>
              <span style={{ fontSize: 12, color: TEXT_DIM }}>Will be added to <b>LIVE</b> and <b>TEST</b> catalogs</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                <button onClick={() => { setPreviewFor(null); setPreview(null); }} style={{ border: `1px solid ${BORDER}`, borderRadius: 100, padding: '10px 20px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: SURFACE, color: TEXT_DIM }}>Cancel</button>
                <button
                  onClick={loadSeed}
                  disabled={seeding || previewLoading || !preview || preview.counts.total === 0}
                  style={{ border: 'none', borderRadius: 100, padding: '10px 20px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: seeding ? 'wait' : 'pointer', background: `linear-gradient(135deg,${VANI},#ff8f5a)`, color: '#fff', boxShadow: '0 3px 10px rgba(255,107,43,.35)', opacity: seeding || !preview || preview.counts.total === 0 ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {seeding && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />}
                  {seeding ? 'Loading…' : 'Load into my catalog →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogEquipmentPage;
