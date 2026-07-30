// ============================================================================
// VendorQuotePage — public RFQ response (RFQ batch 2)
// ============================================================================
// Reached at /quote/:cnak/:secret (no auth, outside the app shell). A vendor
// opens the link the buyer sent, sees what is being asked for, and answers
// with a price — either one figure for the whole request, or a price per line.
//
// The vendor is a CONTACT, not a tenant. There is no account, no login, and no
// tenant context, so this page is deliberately dependency-light: no
// ThemeContext, no admin components, no app shell — the same choice
// SessionCheckinPage made for logged-out members on a phone.
//
// What this page never shows: the buyer's own prices, and the other vendors.
// Both are enforced server-side in rfq_resolve_for_vendor, not here.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  vendorQuoteApi,
  type QuoteResolve,
  type QuoteBreakdownRow,
} from './useVendorQuote';

// ── brand tokens — same palette as the public check-in page ─────────────────
const BRAND = {
  accent: '#DA6410',
  accentSoft: '#FEF3EC',
  accentInk: '#9A4408',
  ink: '#111827',
  sub: '#6B7280',
  line: '#ECECEE',
  field: '#D1D5DB',
  bg: '#F6F7F9',
  ok: '#059669',
  okSoft: '#ECFDF5',
  err: '#B91C1C',
  errSoft: '#FEF2F2',
};

const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

const money = (n?: number | null, c = 'INR') =>
  `${CURRENCY_SYMBOL[c] || `${c} `}${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const CYCLE_LABEL: Record<string, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', halfyearly: 'Half-yearly',
  annual: 'Annual', yearly: 'Annual', onetime: 'One-time', one_time: 'One-time',
};

type Mode = 'single' | 'perline';

// ── small building blocks ───────────────────────────────────────────────────

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ minHeight: '100vh', backgroundColor: BRAND.bg, padding: '16px 12px 48px' }}>
    <div style={{ maxWidth: 560, margin: '0 auto' }}>{children}</div>
  </div>
);

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      backgroundColor: '#FFFFFF',
      border: `1px solid ${BRAND.line}`,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      ...style,
    }}
  >
    {children}
  </div>
);

const Notice: React.FC<{ tone: 'ok' | 'err' | 'info'; children: React.ReactNode }> = ({ tone, children }) => {
  const bg = tone === 'ok' ? BRAND.okSoft : tone === 'err' ? BRAND.errSoft : BRAND.accentSoft;
  const fg = tone === 'ok' ? BRAND.ok : tone === 'err' ? BRAND.err : BRAND.accentInk;
  return (
    <div style={{ backgroundColor: bg, color: fg, borderRadius: 10, padding: '10px 12px', fontSize: 13, lineHeight: 1.5 }}>
      {children}
    </div>
  );
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.sub, marginBottom: 6 }}>{children}</div>
);

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: `1px solid ${BRAND.field}`,
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 15,
  color: BRAND.ink,
  outline: 'none',
  backgroundColor: '#FFFFFF',
};

// ── page ────────────────────────────────────────────────────────────────────

const VendorQuotePage: React.FC = () => {
  const { cnak = '', secret = '' } = useParams<{ cnak: string; secret: string }>();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<QuoteResolve | null>(null);

  const [mode, setMode] = useState<Mode>('single');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [lines, setLines] = useState<Record<string, string>>({});

  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<null | 'quoted' | 'declined'>(null);

  const currency = data?.rfq?.currency || data?.me?.quote_currency || 'INR';

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await vendorQuoteApi.resolve(cnak, secret);
      setData(res);

      // Pre-fill from a previous answer — vendors revise, and retyping a quote
      // they already gave is the fastest way to lose one.
      const me = res.me;
      if (me?.quoted_amount != null) setAmount(String(me.quoted_amount));
      if (me?.quote_notes) setNotes(me.quote_notes);
      if (me?.quote_valid_until) setValidUntil(me.quote_valid_until);
      if (me?.quote_breakdown && me.quote_breakdown.length > 0) {
        setMode('perline');
        const seeded: Record<string, string> = {};
        me.quote_breakdown.forEach((r) => { seeded[r.block_id] = String(r.unit_price ?? r.total_price ?? ''); });
        setLines(seeded);
      }
    } catch (e: any) {
      setLoadError(e?.message || 'This request link could not be opened');
    } finally {
      setLoading(false);
    }
  }, [cnak, secret]);

  useEffect(() => { void load(); }, [load]);

  // ── per-line total ────────────────────────────────────────────────────────
  const breakdown: QuoteBreakdownRow[] = useMemo(() => {
    if (!data) return [];
    return data.blocks
      .map((b) => {
        const unit = Number(lines[b.id] || 0);
        const qty = Number(b.quantity || 1) || 1;
        return {
          block_id: b.id,
          block_name: b.block_name,
          unit_price: unit,
          quantity: qty,
          total_price: unit * qty,
        };
      })
      .filter((r) => r.unit_price > 0);
  }, [data, lines]);

  const perLineTotal = useMemo(
    () => breakdown.reduce((sum, r) => sum + r.total_price, 0),
    [breakdown]
  );

  const canSubmit = declining
    ? true
    : mode === 'single'
      ? Number(amount) > 0
      : perLineTotal > 0;

  // ── submit ────────────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (submitting || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (declining) {
        await vendorQuoteApi.submit(cnak, secret, {
          decline: true,
          decline_reason: declineReason.trim() || null,
        });
        setDone('declined');
      } else {
        await vendorQuoteApi.submit(cnak, secret, {
          quoted_amount: mode === 'single' ? Number(amount) : null,
          breakdown: mode === 'perline' ? breakdown : null,
          quote_notes: notes.trim() || null,
          valid_until: validUntil || null,
        });
        setDone('quoted');
      }
    } catch (e: any) {
      setSubmitError(e?.message || 'Your quote could not be submitted');
    } finally {
      setSubmitting(false);
    }
  }, [submitting, canSubmit, declining, declineReason, cnak, secret, mode, amount, breakdown, notes, validUntil]);

  // ── states ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Shell>
        <Card>
          <div style={{ textAlign: 'center', padding: '32px 0', color: BRAND.sub, fontSize: 14 }}>
            Opening the request…
          </div>
        </Card>
      </Shell>
    );
  }

  if (loadError || !data) {
    return (
      <Shell>
        <Card>
          <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.ink, marginBottom: 8 }}>
            This link didn&apos;t open
          </div>
          <Notice tone="err">{loadError || 'This request link is not valid'}</Notice>
          <div style={{ fontSize: 12, color: BRAND.sub, marginTop: 12, lineHeight: 1.6 }}>
            Links are personal to each vendor and stop working once the request is closed.
            If you believe this is wrong, reply to whoever sent it and ask for a fresh link.
          </div>
        </Card>
      </Shell>
    );
  }

  const { rfq, blocks, me } = data;

  // Already answered and awarded elsewhere, or answered in this session
  if (done || me.response_status === 'accepted') {
    const awarded = me.response_status === 'accepted';
    return (
      <Shell>
        <Card>
          <div style={{ fontSize: 18, fontWeight: 700, color: BRAND.ink, marginBottom: 10 }}>
            {awarded ? 'Your quote was accepted' : done === 'declined' ? 'Thanks for letting them know' : 'Quote sent'}
          </div>
          <Notice tone={done === 'declined' ? 'info' : 'ok'}>
            {awarded
              ? 'The buyer has chosen your quote. They will be in touch to put the contract in place.'
              : done === 'declined'
                ? 'We have told the buyer you are not quoting on this one.'
                : 'The buyer can see your price now. You can reopen this link and revise it any time until they decide.'}
          </Notice>
          {!awarded && done === 'quoted' && (
            <button
              onClick={() => { setDone(null); void load(); }}
              style={{
                marginTop: 14, width: '100%', padding: '11px 16px', borderRadius: 10,
                border: `1px solid ${BRAND.field}`, backgroundColor: '#FFFFFF',
                color: BRAND.ink, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Revise my quote
            </button>
          )}
        </Card>
      </Shell>
    );
  }

  const term =
    rfq.duration_value && rfq.duration_unit
      ? `${rfq.duration_value} ${rfq.duration_unit}`
      : null;

  return (
    <Shell>
      {/* ── who is asking, and for what ── */}
      <Card style={{ borderTop: `3px solid ${BRAND.accent}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: BRAND.accent, textTransform: 'uppercase' }}>
          Request for quotation
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, color: BRAND.ink, margin: '6px 0 4px' }}>
          {rfq.name}
        </div>
        {rfq.rfq_number && (
          <div style={{ fontSize: 12, color: BRAND.sub }}>{rfq.rfq_number}</div>
        )}
        {rfq.description && (
          <div style={{ fontSize: 13, color: BRAND.sub, marginTop: 10, lineHeight: 1.6 }}>
            {rfq.description}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {rfq.nomenclature_name && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 999, backgroundColor: BRAND.accentSoft, color: BRAND.accentInk }}>
              {rfq.nomenclature_code || rfq.nomenclature_name}
            </span>
          )}
          {term && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 999, backgroundColor: '#F3F4F6', color: BRAND.sub }}>
              Term: {term}
            </span>
          )}
          {rfq.start_date && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 999, backgroundColor: '#F3F4F6', color: BRAND.sub }}>
              From {fmtDate(rfq.start_date)}
            </span>
          )}
        </div>

        {me.vendor_name && (
          <div style={{ fontSize: 12, color: BRAND.sub, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BRAND.line}` }}>
            Quoting as <strong style={{ color: BRAND.ink }}>{me.vendor_company || me.vendor_name}</strong>
          </div>
        )}
      </Card>

      {/* ── what they want priced ── */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.ink, marginBottom: 4 }}>
          What they need — {blocks.length} item{blocks.length === 1 ? '' : 's'}
        </div>
        <div style={{ fontSize: 12, color: BRAND.sub, marginBottom: 12 }}>
          Quote one figure for all of it, or price each line.
        </div>

        {blocks.length === 0 && (
          <Notice tone="info">
            No line items were attached to this request. Quote a single figure and add
            what it covers in the notes.
          </Notice>
        )}

        {blocks.map((b) => (
          <div
            key={b.id}
            style={{
              padding: '10px 0',
              borderBottom: `1px solid ${BRAND.line}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: BRAND.ink }}>{b.block_name}</div>
              {b.block_description && (
                <div style={{ fontSize: 12, color: BRAND.sub, marginTop: 2, lineHeight: 1.5 }}>
                  {b.block_description}
                </div>
              )}
              <div style={{ fontSize: 11, color: BRAND.sub, marginTop: 4 }}>
                {b.quantity ? `Qty ${b.quantity}` : null}
                {b.quantity && b.billing_cycle ? ' · ' : null}
                {b.billing_cycle ? (CYCLE_LABEL[b.billing_cycle] || b.billing_cycle) : null}
              </div>
            </div>

            {mode === 'perline' && (
              <div style={{ width: 128, flexShrink: 0 }}>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="Your price"
                  value={lines[b.id] || ''}
                  onChange={(e) => setLines((prev) => ({ ...prev, [b.id]: e.target.value }))}
                  style={{ ...inputStyle, padding: '8px 10px', fontSize: 14, textAlign: 'right' }}
                />
                {Number(lines[b.id] || 0) > 0 && Number(b.quantity || 1) > 1 && (
                  <div style={{ fontSize: 10, color: BRAND.sub, textAlign: 'right', marginTop: 3 }}>
                    × {b.quantity} = {money(Number(lines[b.id]) * Number(b.quantity), currency)}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </Card>

      {/* ── the answer ── */}
      {!declining && (
        <Card>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {(['single', 'perline'] as Mode[]).map((m) => {
              const on = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  disabled={m === 'perline' && blocks.length === 0}
                  style={{
                    flex: 1,
                    padding: '9px 10px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: m === 'perline' && blocks.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: m === 'perline' && blocks.length === 0 ? 0.5 : 1,
                    border: `1px solid ${on ? BRAND.accent : BRAND.field}`,
                    backgroundColor: on ? BRAND.accentSoft : '#FFFFFF',
                    color: on ? BRAND.accentInk : BRAND.sub,
                  }}
                >
                  {m === 'single' ? 'One total price' : 'Price each line'}
                </button>
              );
            })}
          </div>

          {mode === 'single' ? (
            <>
              <Label>Your quote ({currency})</Label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ ...inputStyle, fontSize: 20, fontWeight: 700 }}
              />
            </>
          ) : (
            <div
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', borderRadius: 10, backgroundColor: BRAND.accentSoft,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.accentInk }}>
                Total of {breakdown.length} priced line{breakdown.length === 1 ? '' : 's'}
              </span>
              <span style={{ fontSize: 19, fontWeight: 800, color: BRAND.accentInk }}>
                {money(perLineTotal, currency)}
              </span>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <Label>Anything they should know (optional)</Label>
            <textarea
              rows={3}
              placeholder="What is included, what is not, response times, payment terms…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', fontSize: 14, lineHeight: 1.5 }}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <Label>Quote valid until (optional)</Label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              style={{ ...inputStyle, fontSize: 14 }}
            />
          </div>
        </Card>
      )}

      {/* ── decline ── */}
      {declining && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.ink, marginBottom: 8 }}>
            Not quoting on this one?
          </div>
          <Label>Reason (optional — it goes to the buyer)</Label>
          <textarea
            rows={3}
            placeholder="Outside our area, no capacity right now, …"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            style={{ ...inputStyle, resize: 'vertical', fontSize: 14, lineHeight: 1.5 }}
          />
        </Card>
      )}

      {submitError && (
        <div style={{ marginBottom: 12 }}>
          <Notice tone="err">{submitError}</Notice>
        </div>
      )}

      {me.response_status === 'quoted' && !declining && (
        <div style={{ marginBottom: 12 }}>
          <Notice tone="info">
            You quoted {money(me.quoted_amount, currency)} on {fmtDate(me.responded_at)}.
            Sending again replaces it.
          </Notice>
        </div>
      )}

      {/* ── actions ── */}
      <button
        onClick={() => void submit()}
        disabled={submitting || !canSubmit}
        style={{
          width: '100%',
          padding: '13px 16px',
          borderRadius: 12,
          border: 'none',
          backgroundColor: declining ? BRAND.err : BRAND.accent,
          color: '#FFFFFF',
          fontSize: 15,
          fontWeight: 700,
          cursor: submitting || !canSubmit ? 'not-allowed' : 'pointer',
          opacity: submitting || !canSubmit ? 0.55 : 1,
        }}
      >
        {submitting
          ? 'Sending…'
          : declining
            ? 'Send my decline'
            : me.response_status === 'quoted'
              ? 'Update my quote'
              : 'Send my quote'}
      </button>

      <button
        onClick={() => { setDeclining((d) => !d); setSubmitError(null); }}
        disabled={submitting}
        style={{
          width: '100%',
          marginTop: 10,
          padding: '11px 16px',
          borderRadius: 12,
          border: `1px solid ${BRAND.field}`,
          backgroundColor: '#FFFFFF',
          color: BRAND.sub,
          fontSize: 14,
          fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {declining ? 'Back to quoting' : 'I’m not quoting on this'}
      </button>

      <div style={{ fontSize: 11, color: BRAND.sub, textAlign: 'center', marginTop: 18, lineHeight: 1.6 }}>
        This link is personal to you. Other vendors were asked separately and cannot
        see your price.
      </div>
    </Shell>
  );
};

export default VendorQuotePage;
