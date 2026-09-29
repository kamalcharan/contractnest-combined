// ============================================================================
// PackagePage — /p/:storefrontKey — the public "Explore" page
// ============================================================================
// Explore lands here from the widget, from a shared link and from a QR. It
// carries the seller's identity, the package lines with prices, the term,
// the FAQ the seller wrote on the Extend page, and Buy (→ /buy/:key). A
// storefront with several packages shows them as a catalog first.
// Public page: no auth, no app shell, own tokens (VaNi paper), seller's
// brand colour on the buttons. Dependency-light like the check-in page.

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import PackageCard, { CardButton } from './PackageCard';
import VaniChat from './VaniChat';
import { storefrontApi, errorText, fmtMoney, termLabel, StorefrontPublic, StorefrontPackage } from './api';

const T = { paper: '#f7f5f2', card: '#fff', ink: '#1a1816', soft: '#8a847a', faint: '#bab4a8', line: '#f0ece6', edge: '#e5e1db' };
const FONT = 'Outfit, "Segoe UI", system-ui, -apple-system, sans-serif';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ minHeight: '100vh', background: T.paper, color: T.ink, fontFamily: FONT }}>
    <style>{`@keyframes sf-spin{to{transform:rotate(360deg)}} .sf-faq summary{cursor:pointer;list-style:none;font-weight:600;font-size:14px;padding:10px 0} .sf-faq summary::-webkit-details-marker{display:none} .sf-faq p{margin:0 0 10px;color:#4a463f;font-size:13.5px;line-height:1.5}`}</style>
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 16px 48px' }}>{children}</div>
  </div>
);

const Spinner = () => (
  <span role="status" aria-label="Loading" style={{ display: 'inline-block', width: 22, height: 22, borderRadius: '50%', border: '2px solid #e5e1db', borderTopColor: '#1a1816', animation: 'sf-spin 0.8s linear infinite' }} />
);

const SellerStrip: React.FC<{ s: StorefrontPublic['seller'] }> = ({ s }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
    {s.logo_url
      ? <img src={s.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', background: '#fff', border: `1px solid ${T.edge}` }} />
      : <div style={{ width: 44, height: 44, borderRadius: 12, background: s.primary_color || '#4F46E5', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18 }}>{(s.name || 'S').charAt(0).toUpperCase()}</div>}
    <div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
      <div style={{ fontSize: 12, color: T.soft }}>{s.city ? `${s.city} · ` : ''}Powered by ContractNest</div>
    </div>
  </div>
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

  // ── catalog: several packages, none picked yet ──
  if (!selected) {
    return (
      <Shell>
        <SellerStrip s={data.seller} />
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: style.color }}>Packages</div>
        <h1 style={{ fontSize: 26, margin: '4px 0 6px', letterSpacing: '-0.01em' }}>{data.name}</h1>
        <p style={{ color: T.soft, margin: '0 0 18px', fontSize: 14 }}>Pick a package to see everything it includes.</p>
        <div style={{ display: 'grid', gap: 10 }}>
          {data.packages.map((p) => (
            <PackageCard key={p.family_id} pkg={p} style={style} onBuy={goBuy} onExplore={pick} compact />
          ))}
        </div>
      </Shell>
    );
  }

  const term = termLabel(selected.term);
  const isFree = !selected.price || selected.price <= 0;
  return (
    <Shell>
      <SellerStrip s={data.seller} />
      {data.packages.length > 1 && (
        <button type="button" onClick={() => setParams({})} style={{ background: 'none', border: 0, color: T.soft, fontSize: 13, padding: 0, marginBottom: 10, cursor: 'pointer', fontFamily: FONT }}>← All packages</button>
      )}
      <div style={{ background: T.card, border: `1px solid ${T.edge}`, borderRadius: 16, padding: '22px 22px 20px', display: 'grid', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: style.color }}>Package</div>
          <h1 style={{ fontSize: 26, margin: '4px 0 6px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{selected.name}</h1>
          {selected.description && <p style={{ color: '#4a463f', margin: 0, fontSize: 14.5, lineHeight: 1.55 }}>{selected.description}</p>}
        </div>
        {selected.cover_image && <img src={selected.cover_image} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 12 }} />}
        {selected.lines.length > 0 && (
          <div style={{ display: 'grid', gap: 0, borderTop: `1px solid ${T.line}` }}>
            {selected.lines.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.line}`, fontSize: 14 }}>
                <span style={{ minWidth: 0 }}>{l.name}{l.quantity > 1 && <span style={{ color: T.soft }}> × {l.quantity}</span>}</span>
                {l.total_price > 0 && <b style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtMoney(l.total_price, selected.currency)}</b>}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <span style={{ color: T.soft, fontSize: 14 }}>{term ? `For ${term}` : 'Total'}{!isFree && <span style={{ color: T.faint }}> · + GST as applicable</span>}</span>
          <span style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{isFree ? 'Free' : fmtMoney(selected.price, selected.currency)}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <CardButton label={isFree ? 'Get it free' : style.label || 'Buy now'} color={style.color} shape={style.shape} onClick={() => goBuy(selected)} />
          {data.vani_enabled && <CardButton label={askOpen ? 'Close VaNi' : 'Ask VaNi'} color={style.color} shape={style.shape} ghost onClick={() => setAskOpen((v) => !v)} />}
        </div>
        {askOpen && (
          <div style={{ height: 460 }}>
            <VaniChat siteKey={storefrontKey} storefrontKey={storefrontKey} pageUrl={window.location.href} onClose={() => setAskOpen(false)} onOpen={(u) => window.location.assign(u)} />
          </div>
        )}
        <p style={{ margin: 0, fontSize: 12, color: T.soft }}>Nothing is charged here. You confirm your mobile number, then review the full agreement and pay from the contract link.</p>
      </div>

      {data.faq.length > 0 && (
        <div style={{ marginTop: 18, background: T.card, border: `1px solid ${T.edge}`, borderRadius: 16, padding: '14px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.soft, padding: '6px 0' }}>Questions people ask</div>
          {data.faq.map((f, i) => (
            <details key={i} className="sf-faq" style={{ borderTop: `1px solid ${T.line}` }}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 11.5, color: T.faint, marginTop: 22 }}>
        Your details go only to {data.seller.name}. A purchase creates a contract you can review before paying.
      </div>
    </Shell>
  );
};

export default PackagePage;
