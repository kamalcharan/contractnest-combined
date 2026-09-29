// ============================================================================
// PackagePage — /p/:storefrontKey — the public "Explore" page
// ============================================================================
// Explore lands here from the widget, from a shared link and from a QR. It
// reads as the DOCUMENT the buyer is about to sign, not a shop card (owner,
// 2026-09-29: "explore package should be more professional"): the seller's
// letterhead (logo, address, GSTIN, contact), the package as a proposal —
// deliverables table (what · how many · when billed · amount), commercial
// terms (term, billing, payment method, what happens next) — the FAQ the
// seller wrote, and Buy / Ask VaNi. A storefront with several packages shows
// them as a catalog first. Public page: no auth, no app shell, own tokens
// (VaNi paper), seller's brand colour on the buttons. Dependency-light like
// the check-in page.

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import PackageCard, { CardButton } from './PackageCard';
import VaniChat from './VaniChat';
import { storefrontApi, errorText, fmtMoney, termLabel, cycleLabel, StorefrontPublic, StorefrontPackage, StorefrontSeller } from './api';

const T = { paper: '#f7f5f2', card: '#fff', ink: '#1a1816', body: '#4a463f', soft: '#8a847a', faint: '#bab4a8', line: '#f0ece6', edge: '#e5e1db', wash: '#faf8f5' };
const FONT = 'Outfit, "Segoe UI", system-ui, -apple-system, sans-serif';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ minHeight: '100vh', background: T.paper, color: T.ink, fontFamily: FONT }}>
    <style>{`
      @keyframes sf-spin{to{transform:rotate(360deg)}}
      .sf-faq summary{cursor:pointer;list-style:none;font-weight:600;font-size:14px;padding:10px 0}
      .sf-faq summary::-webkit-details-marker{display:none}
      .sf-faq p{margin:0 0 10px;color:#4a463f;font-size:13.5px;line-height:1.5}
      .sf-doc table{width:100%;border-collapse:collapse;font-size:13.5px}
      .sf-doc th{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8a847a;text-align:left;padding:0 8px 8px 0;border-bottom:1px solid #e5e1db}
      .sf-doc td{padding:10px 8px 10px 0;border-bottom:1px solid #f0ece6;vertical-align:top}
      .sf-doc th.num,.sf-doc td.num{text-align:right;padding-right:0;font-variant-numeric:tabular-nums;white-space:nowrap}
      .sf-doc .hide-sm{display:table-cell}
      .sf-doc th.bill,.sf-doc td.bill{padding-left:18px}
      .sf-doc td.lbl{padding-right:14px}
      .sf-sticky{display:flex}
      @media (max-width:560px){.sf-doc .hide-sm{display:none}.sf-letter{grid-template-columns:1fr!important}.sf-letter .right{text-align:left!important}}
      @media (min-width:641px){.sf-sticky{display:none}}
    `}</style>
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px 96px' }}>{children}</div>
  </div>
);

const Spinner = () => (
  <span role="status" aria-label="Loading" style={{ display: 'inline-block', width: 22, height: 22, borderRadius: '50%', border: '2px solid #e5e1db', borderTopColor: '#1a1816', animation: 'sf-spin 0.8s linear infinite' }} />
);

const Logo: React.FC<{ s: StorefrontSeller; size?: number }> = ({ s, size = 52 }) => s.logo_url
  ? <img src={s.logo_url} alt="" style={{ width: size, height: size, borderRadius: 12, objectFit: 'cover', background: '#fff', border: `1px solid ${T.edge}` }} />
  : <div style={{ width: size, height: size, borderRadius: 12, background: s.primary_color || '#4F46E5', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: size * 0.4 }}>{(s.name || 'S').charAt(0).toUpperCase()}</div>;

/** The seller's letterhead: identity left, address / registration / contact right. */
const Letterhead: React.FC<{ s: StorefrontSeller }> = ({ s }) => {
  const addr = [s.address_line1, s.address_line2, [s.city, s.state_code].filter(Boolean).join(', '), s.postal_code].filter((x) => x && String(x).trim()).join(' · ');
  const site = s.website_url ? s.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '') : null;
  return (
    <div className="sf-letter" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
        <Logo s={s} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{s.name}</div>
          {s.short_description && <div style={{ fontSize: 12.5, color: T.soft, marginTop: 3, lineHeight: 1.4 }}>{s.short_description}</div>}
        </div>
      </div>
      <div className="right" style={{ textAlign: 'right', fontSize: 12, color: T.body, lineHeight: 1.55, minWidth: 0 }}>
        {addr && <div>{addr}</div>}
        {s.gst_number && <div>GSTIN <b style={{ fontVariantNumeric: 'tabular-nums' }}>{s.gst_number}</b></div>}
        {(s.phone || s.email) && <div>{[s.phone, s.email].filter(Boolean).join(' · ')}</div>}
        {site && <div><a href={s.website_url!} target="_blank" rel="noreferrer" style={{ color: T.body }}>{site}</a></div>}
      </div>
    </div>
  );
};

const Label: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: color || T.soft }}>{children}</div>
);

const PackagePage: React.FC = () => {
  const { storefrontKey = '' } = useParams<{ storefrontKey: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<StorefrontPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    let on = true;
    setLoading(true);
    storefrontApi.resolve(storefrontKey)
      .then((d) => { if (on) setData(d); })
      .catch((e) => { if (on) setErr(errorText(e, 'This link is not available')); })
      .finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
  }, [storefrontKey]);

  const wanted = params.get('pkg');
  const selected: StorefrontPackage | null = useMemo(() => {
    if (!data) return null;
    if (data.packages.length === 1) return data.packages[0];
    return data.packages.find((p) => p.family_id === wanted || p.id === wanted) || null;
  }, [data, wanted]);

  const goBuy = (p: StorefrontPackage) => navigate(`/buy/${storefrontKey}?pkg=${p.family_id}`);
  const pick = (p: StorefrontPackage) => setParams({ pkg: p.family_id });

  if (loading) return <Shell><div style={{ display: 'grid', placeItems: 'center', padding: 80 }}><Spinner /></div></Shell>;
  if (err || !data) return (
    <Shell>
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>This link isn't available</h1>
        <p style={{ color: T.soft, fontSize: 14 }}>The offer may have been paused or removed. Please check with whoever shared it with you.</p>
      </div>
    </Shell>
  );

  const style = data.card_style;
  const brand = style.color;
  const seller = data.seller;

  // ── catalog: several packages, none picked yet ──
  if (!selected) {
    return (
      <Shell>
        <div style={{ background: T.card, border: `1px solid ${T.edge}`, borderRadius: 16, padding: '22px 22px 24px' }}>
          <Letterhead s={seller} />
          <div style={{ borderTop: `1px solid ${T.edge}`, margin: '18px 0' }} />
          <Label color={brand}>Packages</Label>
          <h1 style={{ fontSize: 24, margin: '4px 0 6px', letterSpacing: '-0.01em' }}>{data.name}</h1>
          <p style={{ color: T.soft, margin: '0 0 16px', fontSize: 14 }}>Pick a package to see everything it includes and the terms.</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {data.packages.map((p) => (
              <PackageCard key={p.family_id} pkg={p} style={style} onBuy={goBuy} onExplore={pick} compact />
            ))}
          </div>
        </div>
        <Footer seller={seller.name} />
      </Shell>
    );
  }

  const term = termLabel(selected.term);
  const isFree = !selected.price || selected.price <= 0;
  const services = selected.lines.filter((l) => l.category !== 'text');
  const textLines = selected.lines.filter((l) => l.category === 'text');
  const subtotal = services.reduce((n, l) => n + (l.total_price || 0), 0);
  const cycles = Array.from(new Set(services.map((l) => cycleLabel(l.billing_cycle)).filter(Boolean)));
  const pay = data.payment;
  const payLabel = isFree ? 'Nothing to pay'
    : pay?.gateway && pay?.offline_upi ? 'Online (card / UPI / netbanking) or UPI QR'
    : pay?.gateway ? 'Online — card, UPI or netbanking'
    : pay?.offline_upi ? `UPI — scan ${seller.name}'s QR, share the reference`
    : `Agreed with ${seller.name} after you accept`;
  const priceLabel = isFree ? 'Free' : fmtMoney(selected.price, selected.currency);
  const buyLabel = isFree ? 'Get it free' : style.label || 'Buy now';

  return (
    <Shell>
      {data.packages.length > 1 && (
        <button type="button" onClick={() => setParams({})} style={{ background: 'none', border: 0, color: T.soft, fontSize: 13, padding: 0, marginBottom: 10, cursor: 'pointer', fontFamily: FONT }}>← All packages</button>
      )}

      {/* ═══ THE DOCUMENT ═══ */}
      <div className="sf-doc" style={{ background: T.card, border: `1px solid ${T.edge}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ height: 6, background: brand }} />
        <div style={{ padding: '22px 22px 24px', display: 'grid', gap: 20 }}>
          <Letterhead s={seller} />
          <div style={{ borderTop: `1px solid ${T.edge}` }} />

          {/* title row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ minWidth: 0, flex: '1 1 320px' }}>
              <Label color={brand}>Service package</Label>
              <h1 style={{ fontSize: 26, margin: '4px 0 6px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{selected.name}</h1>
              {selected.description && <p style={{ color: T.body, margin: 0, fontSize: 14.5, lineHeight: 1.55 }}>{selected.description}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <Label>{term ? `For ${term}` : 'Total'}</Label>
              <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginTop: 2 }}>{priceLabel}</div>
              {!isFree && <div style={{ fontSize: 11.5, color: T.faint }}>+ GST as applicable</div>}
            </div>
          </div>

          {selected.cover_image && <img src={selected.cover_image} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 12 }} />}

          {/* deliverables */}
          {services.length > 0 && (
            <div>
              <Label>What you get</Label>
              <div style={{ overflowX: 'auto', marginTop: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}>#</th>
                      <th>Service</th>
                      <th className="num hide-sm">Qty</th>
                      <th className="hide-sm bill">Billed</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((l, i) => (
                      <tr key={i}>
                        <td style={{ color: T.faint, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{l.name}</div>
                          <div style={{ fontSize: 12, color: T.soft }}>
                            {l.quantity > 1 ? `${l.quantity} × ${l.unit_price > 0 ? fmtMoney(l.unit_price, selected.currency) : 'included'}` : (l.unit_price > 0 ? fmtMoney(l.unit_price, selected.currency) : 'Included')}
                            {l.billing_cycle ? ` · ${cycleLabel(l.billing_cycle)}` : ''}
                          </div>
                        </td>
                        <td className="num hide-sm">{l.quantity}</td>
                        <td className="hide-sm bill" style={{ color: T.body }}>{cycleLabel(l.billing_cycle) || '—'}</td>
                        <td className="num" style={{ fontWeight: 600 }}>{l.total_price > 0 ? fmtMoney(l.total_price, selected.currency) : 'Included'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {subtotal !== selected.price && subtotal > 0 && (
                      <tr><td colSpan={4} className="num lbl" style={{ color: T.soft, borderBottom: 0, paddingTop: 12 }}>Subtotal</td><td className="num" style={{ borderBottom: 0, paddingTop: 12 }}>{fmtMoney(subtotal, selected.currency)}</td></tr>
                    )}
                    <tr>
                      <td colSpan={4} className="num lbl" style={{ borderBottom: 0, paddingTop: subtotal !== selected.price && subtotal > 0 ? 4 : 12, fontWeight: 700 }}>Total{term ? ` for ${term}` : ''}</td>
                      <td className="num" style={{ borderBottom: 0, paddingTop: subtotal !== selected.price && subtotal > 0 ? 4 : 12, fontWeight: 700, fontSize: 15 }}>{priceLabel}</td>
                    </tr>
                    {!isFree && <tr><td colSpan={5} className="num" style={{ borderBottom: 0, padding: 0, fontSize: 11.5, color: T.faint }}>GST as applicable is added on the invoice</td></tr>}
                  </tfoot>
                </table>
              </div>
              {textLines.length > 0 && (
                <div style={{ fontSize: 12.5, color: T.soft, marginTop: 10 }}>
                  Also part of this package: {textLines.map((l) => l.name).join(', ')} — in full on the agreement you review before accepting.
                </div>
              )}
            </div>
          )}

          {/* commercial terms */}
          <div>
            <Label>Terms</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 8 }}>
              {[
                ['Term', term ? `${term} from the day you accept` : 'As agreed'],
                ['Billing', cycles.length ? cycles.join(' · ') : (isFree ? 'None' : 'On acceptance')],
                ['Payment', payLabel],
                ['Provided by', seller.name + (seller.city ? `, ${seller.city}` : '')],
              ].map(([k, v]) => (
                <div key={k} style={{ background: T.wash, border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.faint }}>{k}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 3, lineHeight: 1.35 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* what happens next */}
          <div>
            <Label>How it works</Label>
            <ol style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
              {[
                ['Confirm your mobile', 'A one-time code by SMS. Nothing is charged here.'],
                ['Review the agreement', `The full contract from ${seller.name}, with every service and term, on its own page.`],
                isFree || !pay?.any
                  ? ['Accept', `${seller.name} will connect with you to close up your request.`]
                  : pay?.gateway
                    ? ['Pay and it starts', 'Pay online and the contract activates at once. UPI QR works too — the seller confirms it.']
                    : ['Pay by UPI', `Scan ${seller.name}'s QR, share the reference; they check it and connect with you.`],
              ].map(([t, b], i) => (
                <li key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: `${brand}1a`, color: brand, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 13.5, lineHeight: 1.45 }}><b>{t}.</b> <span style={{ color: T.body }}>{b}</span></span>
                </li>
              ))}
            </ol>
          </div>

          {/* actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <CardButton label={buyLabel} color={brand} shape={style.shape} onClick={() => goBuy(selected)} />
            {data.vani_enabled && <CardButton label={askOpen ? 'Close VaNi' : 'Ask VaNi'} color={brand} shape={style.shape} ghost onClick={() => setAskOpen((v) => !v)} />}
            <span style={{ fontSize: 12, color: T.soft }}>Price shown is the price you sign — it does not change.</span>
          </div>
          {askOpen && (
            <div style={{ height: 460 }}>
              <VaniChat siteKey={storefrontKey} storefrontKey={storefrontKey} pageUrl={window.location.href} onClose={() => setAskOpen(false)} onOpen={(u) => window.location.assign(u)} />
            </div>
          )}
        </div>
      </div>

      {data.faq.length > 0 && (
        <div style={{ marginTop: 16, background: T.card, border: `1px solid ${T.edge}`, borderRadius: 16, padding: '14px 22px' }}>
          <div style={{ padding: '6px 0' }}><Label>Questions people ask</Label></div>
          {data.faq.map((f, i) => (
            <details key={i} className="sf-faq" style={{ borderTop: `1px solid ${T.line}` }}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      )}

      <Footer seller={seller.name} />

      {/* sticky buy bar on small screens */}
      <div className="sf-sticky" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(6px)', borderTop: `1px solid ${T.edge}`, padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))', alignItems: 'center', justifyContent: 'space-between', gap: 12, zIndex: 5 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: T.soft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.name}</div>
          <div style={{ fontWeight: 700, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{priceLabel}{term ? <span style={{ fontWeight: 400, color: T.soft, fontSize: 12 }}> / {term}</span> : null}</div>
        </div>
        <CardButton label={buyLabel} color={brand} shape={style.shape} onClick={() => goBuy(selected)} />
      </div>
    </Shell>
  );
};

const Footer: React.FC<{ seller: string }> = ({ seller }) => (
  <div style={{ textAlign: 'center', fontSize: 11.5, color: T.faint, marginTop: 22 }}>
    Your details go only to {seller}. A purchase creates a contract you review before you accept or pay. Powered by ContractNest.
  </div>
);

export default PackagePage;
