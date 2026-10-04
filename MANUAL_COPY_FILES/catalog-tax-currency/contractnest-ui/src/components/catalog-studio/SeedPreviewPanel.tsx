// src/components/catalog-studio/SeedPreviewPanel.tsx
//
// "Seed with VaNi", inline on Catalog Studio → VaNi Seeding (replaces the
// preview modal, which showed 8 items and was easy to miss).
//
// Shows exactly what a load would write — GET /api/seeds/tenant/seed-preview
// runs the same mapper + catalogPricingService as the load:
//   · priced in the tenant's business currency only (Business Profile);
//   · carrying the taxes picked here, from the tax master (/settings/tax-settings).
//     Starts on the tax master's default rate; the picker can change it.
//   · every service and spare, with its per-variant prices.
// Nothing is saved until "Load into my catalog" (POST seed-equipment with the
// same taxRateIds), which writes LIVE and TEST.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { vaniToast } from '@/components/common/toast';
import { useTaxRates } from '@/hooks/useTaxRates';

const VANI = '#ff6b2b';
const TEXT = '#1a1816'; const TEXT_DIM = '#8a847a'; const TEXT_MUTED = '#bab4a8';
const BORDER = '#e5e1db'; const BORDER_LT = '#edeae4';
const SURFACE = '#faf9f7'; const WHITE = '#ffffff';
const AMBER = '#d97706'; const AMBER_BG = '#fffbeb';
const BLUE = '#2563eb'; const BLUE_BG = '#eff6ff';
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

interface TaxLine { id: string; name: string; rate: number }
interface PreviewItem {
  name: string;
  base_price: number | null;
  currency: string;
  cycle_days: number | null;
  variants: number;
  tax_rate: number;
  kt_currency_missing: boolean;
  variant_prices: Array<{ variant_id: string; variant_name: string; amount: number }>;
}
interface Preview {
  tax: { currency: string; inclusion: 'inclusive' | 'exclusive'; taxes: TaxLine[]; total: number; source: string; display_mode: string };
  variants: Array<{ id: string; name: string }>;
  counts: { services: number; spares: number; priced: number; variants?: number; total: number };
  services: PreviewItem[];
  spares: PreviewItem[];
}

const num = (v: unknown) => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
};
export const fmtMoney = (n: number, c: string) => {
  try {
    return new Intl.NumberFormat(c === 'INR' ? 'en-IN' : undefined, { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${c} ${n.toLocaleString()}`;
  }
};

interface Props {
  templateId: string;
  templateName: string;
  isFacility: boolean;
  onLoaded: () => void;
}

const SeedPreviewPanel: React.FC<Props> = ({ templateId, templateName, isFacility, onLoaded }) => {
  const rates = useTaxRates();
  const rateList: any[] = (rates.state.data as any[]) || [];

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string[] | null>(null); // null = the tax master's default
  const [variant, setVariant] = useState('all');
  const [seeding, setSeeding] = useState(false);
  const reqSeq = useRef(0);

  const load = useCallback(async (ids: string[] | null) => {
    const seq = ++reqSeq.current;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { resource_template_id: templateId };
      if (ids !== null) params.tax_rate_ids = ids.join(',');
      const resp = await api.get(API_ENDPOINTS.SEEDS.SEED_PREVIEW, { params });
      if (seq !== reqSeq.current) return; // a newer pick superseded this one
      const data: Preview = resp.data?.data;
      setPreview(data);
      if (ids === null) setChosen((data?.tax?.taxes || []).map((t) => t.id));
    } catch (err: any) {
      if (seq !== reqSeq.current) return;
      setError(err?.response?.data?.error || 'Preview failed');
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    setChosen(null);
    setVariant('all');
    load(null);
  }, [templateId, load]);

  const toggleTax = (id: string) => {
    const next = (chosen || []).includes(id) ? (chosen || []).filter((x) => x !== id) : [...(chosen || []), id];
    setChosen(next);
    load(next);
  };

  const handleLoad = async () => {
    if (!preview || seeding) return;
    setSeeding(true);
    try {
      const resp = await api.post(API_ENDPOINTS.SEEDS.SEED_EQUIPMENT, {
        resourceTemplateId: templateId,
        purpose: 'sell',
        taxRateIds: chosen ?? undefined,
      });
      const d = resp.data?.data || {};
      if (resp.data?.status === 'success') {
        vaniToast.success(`Loaded ${d.blocksCreated} blocks into your catalog (live + test)`);
      } else if (resp.data?.status === 'already_seeded') {
        vaniToast.info('Already in your catalog — nothing new to load');
      } else {
        vaniToast.error('Could not load', { message: (d.errors || []).join('; ') || 'Seed failed' });
        return;
      }
      onLoaded();
    } catch (err: any) {
      vaniToast.error('Could not load', { message: err?.response?.data?.error || 'Seed failed' });
    } finally {
      setSeeding(false);
    }
  };

  const tax = preview?.tax;
  const cur = tax?.currency || '';
  const noTax = tax?.display_mode === 'no_tax';
  const priceFor = (it: PreviewItem) => {
    if (variant === 'all') return num(it.base_price);
    const vp = it.variant_prices.find((v) => v.variant_id === variant);
    return vp ? num(vp.amount) : null;
  };

  const Section: React.FC<{ title: string; items: PreviewItem[]; perUnit: boolean }> = ({ title, items, perUnit }) => {
    const shown = perUnit || variant === 'all' ? items : items.filter((it) => it.variant_prices.some((v) => v.variant_id === variant));
    if (shown.length === 0) return null;
    return (
      <div style={{ border: `1px solid ${BORDER_LT}`, borderRadius: 10, overflow: 'hidden', marginBottom: 14, background: WHITE }}>
        <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: TEXT_MUTED, padding: '8px 14px', background: SURFACE, borderBottom: `1px solid ${BORDER_LT}` }}>
          {title} · {shown.length}
        </div>
        {shown.map((it, i) => {
          const p = priceFor(it);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: `1px solid ${BORDER_LT}`, fontSize: 12 }}>
              <span style={{ color: TEXT, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {it.name}
                {it.cycle_days ? <span style={{ fontFamily: MONO, fontSize: 10, color: BLUE, background: BLUE_BG, padding: '1px 6px', borderRadius: 4, marginLeft: 6 }}>every {it.cycle_days}d</span> : null}
                {it.kt_currency_missing ? <span style={{ fontFamily: MONO, fontSize: 10, color: AMBER, marginLeft: 6 }}>no {cur} market price</span> : null}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, whiteSpace: 'nowrap' }}>
                {noTax || num(it.tax_rate) === 0 ? 'no tax' : `+${num(it.tax_rate)}% tax`}
              </span>
              <span style={{ fontFamily: MONO, fontWeight: 700, minWidth: 90, textAlign: 'right', color: p && p > 0 ? TEXT : AMBER, whiteSpace: 'nowrap' }}>
                {p && p > 0 ? fmtMoney(p, cur) : 'set price'}
                {p && p > 0 ? <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600 }}>{perUnit ? ' /unit' : ' /visit'}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ background: '#fff8f4', border: `1px solid rgba(255,107,43,.25)`, borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg,${VANI},#ff8f5a)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#fff' }}>V</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, flex: 1 }}>
          What VaNi would build for {templateName}
          <div style={{ fontSize: 11, fontWeight: 500, color: TEXT_DIM }}>Preview only — nothing is saved until you load it.</div>
        </div>
        <button
          onClick={handleLoad}
          disabled={seeding || loading || !preview || preview.counts.total === 0}
          style={{ border: 'none', borderRadius: 100, padding: '10px 20px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: seeding ? 'wait' : 'pointer', background: `linear-gradient(135deg,${VANI},#ff8f5a)`, color: '#fff', opacity: seeding || loading || !preview || preview.counts.total === 0 ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {seeding && <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />}
          {seeding ? 'Loading…' : 'Load into my catalog'}
        </button>
      </div>

      {/* Taxes — from the tax master; the default rate is pre-picked */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: TEXT_MUTED }}>Taxes</span>
        {noTax ? (
          <span style={{ fontSize: 12, color: TEXT_DIM }}>Your tax settings say “No tax” — these items carry none.</span>
        ) : rateList.length === 0 ? (
          <span style={{ fontSize: 12, color: AMBER }}>No tax rates set up — add them in Settings → Tax settings to tax these items.</span>
        ) : (
          rateList.map((r) => {
            const on = (chosen || []).includes(r.id);
            return (
              <button
                key={r.id}
                onClick={() => toggleTax(r.id)}
                disabled={loading || seeding}
                style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 100, cursor: 'pointer', border: `1.5px solid ${on ? VANI : BORDER}`, background: on ? WHITE : SURFACE, color: on ? VANI : TEXT_DIM }}
              >{on ? '✓ ' : ''}{r.name} {Number(r.rate)}%</button>
            );
          })
        )}
        {tax && !noTax && (
          <span style={{ fontSize: 11, color: TEXT_DIM }}>
            = {num(tax.total)}% {tax.inclusion === 'inclusive' ? 'included in' : 'added to'} prices · in {cur}
          </span>
        )}
      </div>

      {preview && preview.variants.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: TEXT_MUTED }}>Size / variant</span>
          <select value={variant} onChange={(e) => setVariant(e.target.value)} style={{ padding: '6px 10px', border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 12, background: WHITE }}>
            <option value="all">Reference price</option>
            {preview.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <span style={{ fontSize: 11, color: TEXT_DIM }}>One service per job; each size carries its own price inside it.</span>
        </div>
      )}

      {loading && !preview ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}>
          <div style={{ width: 28, height: 28, border: `3px solid ${BORDER}`, borderTopColor: VANI, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        </div>
      ) : error ? (
        <div style={{ fontSize: 12, color: AMBER, background: AMBER_BG, borderRadius: 8, padding: '10px 14px' }}>{error}</div>
      ) : preview ? (
        <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity .15s' }}>
          <Section title="Services" items={preview.services} perUnit={false} />
          <Section title={isFacility ? 'Consumables' : 'Spare parts'} items={preview.spares} perUnit={true} />
          {preview.counts.total === 0 && <div style={{ fontSize: 12, color: TEXT_DIM }}>The knowledge tree has nothing to build here yet.</div>}
        </div>
      ) : null}
    </div>
  );
};

export default SeedPreviewPanel;
