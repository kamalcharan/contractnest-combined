// ============================================================================
// BuyPage — /buy/:storefrontKey — the public checkout (OTP-verified)
// ============================================================================
// Reached from the widget button, the package page and embed.js's overlay.
// One column: the package (or a pick when the storefront holds several) →
// name + mobile (+ company / email if they want) → a 6-digit code by SMS →
// Confirm → the contract is raised in the seller's book and the buyer lands
// in the EXISTING public review/accept flow (/contracts/review?cnak&secret).
//
// The OTP is what makes the lead real and lets the seller's existing contact
// be matched safely (by verified mobile). Public page: bare axios, no auth,
// no app shell, seller's brand colour, dependency-light.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  storefrontApi, errorText, fmtMoney, termLabel, inkOn, radiusFor,
  StorefrontPublic, StorefrontPackage,
} from '../storefront/api';

const T = { paper: '#f7f5f2', card: '#fff', ink: '#1a1816', soft: '#8a847a', faint: '#bab4a8', line: '#f0ece6', edge: '#e5e1db', field: '#d6d1ca', ok: '#16a34a', okSoft: '#ecfdf5', err: '#b91c1c', errSoft: '#fef2f2' };
const FONT = 'Outfit, "Segoe UI", system-ui, -apple-system, sans-serif';

const field: React.CSSProperties = { width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${T.field}`, fontSize: 15, fontFamily: FONT, background: '#fff', color: T.ink, outline: 'none', boxSizing: 'border-box' };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: T.soft, marginBottom: 5, display: 'block' };

const Spinner: React.FC<{ color?: string }> = ({ color = T.ink }) => (
  <span role="status" aria-label="Loading" style={{ display: 'inline-block', width: 18, height: 18, borderRadius: '50%', border: `2px solid ${color}33`, borderTopColor: color, animation: 'sf-spin 0.8s linear infinite', verticalAlign: 'middle' }} />
);

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ minHeight: '100vh', background: T.paper, color: T.ink, fontFamily: FONT }}>
    <style>{`@keyframes sf-spin{to{transform:rotate(360deg)}} input:focus{border-color:#1a1816!important}`}</style>
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px 40px' }}>{children}</div>
  </div>
);

const BuyPage: React.FC = () => {
  const { storefrontKey = '' } = useParams<{ storefrontKey: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const [data, setData] = useState<StorefrontPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [forCompany, setForCompany] = useState(false);

  const [otpId, setOtpId] = useState<string | null>(null);
  const [otpPhone, setOtpPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<'send' | 'verify' | 'buy' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let on = true;
    storefrontApi.resolve(storefrontKey)
      .then((d) => { if (on) { setData(d); storefrontApi.start(storefrontKey); } })
      .catch((e) => { if (on) setLoadErr(errorText(e, 'This link is not available')); })
      .finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
  }, [storefrontKey]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const wanted = params.get('pkg');
  const selected: StorefrontPackage | null = useMemo(() => {
    if (!data) return null;
    if (data.packages.length === 1) return data.packages[0];
    return data.packages.find((p) => p.family_id === wanted || p.id === wanted) || null;
  }, [data, wanted]);

  const digits = phone.replace(/\D/g, '');
  const phoneOk = digits.length >= 10 && digits.length <= 15;
  const nameOk = name.trim().length > 1;
  // a verified number that was then edited is no longer verified
  const verified = !!verifyToken && otpPhone.replace(/\D/g, '').slice(-10) === digits.slice(-10);

  const sendCode = async () => {
    if (!phoneOk || busy) return;
    setBusy('send'); setError(null); setDevCode(null); setCode(''); setVerifyToken(null);
    try {
      const r = await storefrontApi.otpIssue(storefrontKey, phone.trim());
      setOtpId(r.otp_id); setOtpPhone(phone); setCooldown(30);
      if (r.dev_code) setDevCode(r.dev_code);
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (e) {
      setError(errorText(e, 'Could not send the code. Please try again.'));
    } finally { setBusy(null); }
  };

  const verifyCode = async () => {
    if (!otpId || code.trim().length < 4 || busy) return;
    setBusy('verify'); setError(null);
    try {
      const r = await storefrontApi.otpVerify(storefrontKey, otpId, code.trim());
      setVerifyToken(r.verify_token); setOtpPhone(phone);
      // a verified name + number is a lead even if they stop here
      if (nameOk) {
        storefrontApi.identify(storefrontKey, {
          name: name.trim(), phone: phone.trim(), otp_token: r.verify_token, template_id: selected?.family_id,
          email: email.trim() || undefined, company: forCompany ? company.trim() || undefined : undefined,
          channel: window.parent && window.parent !== window ? 'website' : 'link',
        });
      }
    } catch (e: any) {
      const left = e?.response?.data?.attempts_left;
      setError(errorText(e, 'That code is not right.') + (typeof left === 'number' && left > 0 ? ` ${left} tries left.` : ''));
    } finally { setBusy(null); }
  };

  const buy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !verified || !nameOk || busy) return;
    setBusy('buy'); setError(null);
    try {
      const out = await storefrontApi.purchase(storefrontKey, {
        name: name.trim(), phone: phone.trim(), otp_token: verifyToken!, template_id: selected.family_id,
        email: email.trim() || undefined, company: forCompany ? company.trim() || undefined : undefined,
      });
      if (out?.review_path) navigate(out.review_path);
      else setError('Your order was created but the confirmation page could not be opened. Please contact the seller.');
    } catch (e) {
      setError(errorText(e, 'Something went wrong. Please try again.'));
    } finally { setBusy(null); }
  };

  if (loading) return <Shell><div style={{ display: 'grid', placeItems: 'center', padding: 80 }}><Spinner /></div></Shell>;
  if (loadErr || !data) return (
    <Shell>
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>This link isn't available</h1>
        <p style={{ color: T.soft, fontSize: 14 }}>The offer may have been paused or removed. Please check with whoever shared it with you.</p>
      </div>
    </Shell>
  );

  const style = data.card_style;
  const brand = style.color;

  // ── which package? ──
  if (!selected) {
    return (
      <Shell>
        <div style={{ fontSize: 12, color: T.soft, marginBottom: 14 }}>{data.seller.name}</div>
        <h1 style={{ fontSize: 22, margin: '0 0 12px' }}>Which package?</h1>
        <div style={{ display: 'grid', gap: 8 }}>
          {data.packages.map((p) => (
            <button key={p.family_id} type="button" onClick={() => setParams({ pkg: p.family_id })}
              style={{ textAlign: 'left', background: '#fff', border: `1px solid ${T.edge}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', fontFamily: FONT, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: T.soft }}>{p.price > 0 ? fmtMoney(p.price, p.currency) : 'Free'}{termLabel(p.term) ? ` / ${termLabel(p.term)}` : ''}</span>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  const term = termLabel(selected.term);
  const isFree = !selected.price || selected.price <= 0;

  return (
    <Shell>
      {/* seller + package summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        {data.seller.logo_url
          ? <img src={data.seller.logo_url} alt="" style={{ width: 34, height: 34, borderRadius: 9, objectFit: 'cover', border: `1px solid ${T.edge}`, background: '#fff' }} />
          : <div style={{ width: 34, height: 34, borderRadius: 9, background: brand, color: inkOn(brand), display: 'grid', placeItems: 'center', fontWeight: 700 }}>{(data.seller.name || 'S').charAt(0).toUpperCase()}</div>}
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{data.seller.name}</div>
          <div style={{ fontSize: 11.5, color: T.soft }}>Secure checkout · Powered by ContractNest</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: `1px solid ${T.edge}`, borderRadius: 14, padding: '14px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.25 }}>{selected.name}</div>
          <div style={{ fontSize: 12.5, color: T.soft, marginTop: 2 }}>
            {selected.lines.length > 0 ? `${selected.lines.length} item${selected.lines.length > 1 ? 's' : ''}` : 'Package'}{term ? ` · ${term}` : ''}
            {' · '}<a href={`/p/${storefrontKey}?pkg=${selected.family_id}`} style={{ color: brand, textDecoration: 'none' }}>details</a>
          </div>
        </div>
        <div style={{ fontWeight: 700, fontSize: 18, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{isFree ? 'Free' : fmtMoney(selected.price, selected.currency)}</div>
      </div>

      <form onSubmit={buy} style={{ background: '#fff', border: `1px solid ${T.edge}`, borderRadius: 14, padding: '18px 16px', display: 'grid', gap: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Your details</div>

        <div>
          <label style={label} htmlFor="sf-name">Name</label>
          <input id="sf-name" style={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your name" />
        </div>

        <div>
          <label style={label} htmlFor="sf-phone">Mobile</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input id="sf-phone" style={{ ...field, flex: 1 }} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" disabled={!!verifyToken && verified} />
            {verified ? (
              <span style={{ alignSelf: 'center', fontSize: 12.5, color: T.ok, fontWeight: 600, whiteSpace: 'nowrap' }}>✓ Verified</span>
            ) : (
              <button type="button" onClick={sendCode} disabled={!phoneOk || busy === 'send' || cooldown > 0}
                style={{ padding: '0 14px', borderRadius: 10, border: `1px solid ${T.field}`, background: '#fff', fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: phoneOk && cooldown === 0 ? 'pointer' : 'default', opacity: phoneOk && cooldown === 0 ? 1 : 0.5, whiteSpace: 'nowrap' }}>
                {busy === 'send' ? <Spinner /> : otpId ? (cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code') : 'Send code'}
              </button>
            )}
          </div>
          {verified && <button type="button" onClick={() => { setVerifyToken(null); setOtpId(null); setCode(''); }} style={{ background: 'none', border: 0, padding: 0, marginTop: 6, fontSize: 12, color: T.soft, cursor: 'pointer', fontFamily: FONT }}>Use a different number</button>}
        </div>

        {otpId && !verified && (
          <div>
            <label style={label} htmlFor="sf-code">Code sent to your mobile</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="sf-code" ref={codeRef} style={{ ...field, flex: 1, letterSpacing: '0.2em', fontVariantNumeric: 'tabular-nums' }} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6 digits"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); verifyCode(); } }} />
              <button type="button" onClick={verifyCode} disabled={code.length < 4 || busy === 'verify'}
                style={{ padding: '0 16px', borderRadius: 10, border: 0, background: T.ink, color: '#fff', fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: code.length < 4 ? 0.5 : 1 }}>
                {busy === 'verify' ? <Spinner color="#fff" /> : 'Verify'}
              </button>
            </div>
            {devCode && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 10px' }}>
                Test mode — SMS not sent. Your code is <b style={{ fontVariantNumeric: 'tabular-nums' }}>{devCode}</b>.
              </div>
            )}
          </div>
        )}

        {!forCompany ? (
          <button type="button" onClick={() => setForCompany(true)} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', fontSize: 13, color: brand, cursor: 'pointer', fontFamily: FONT }}>
            Buying for a company?
          </button>
        ) : (
          <div>
            <label style={label} htmlFor="sf-company">Company</label>
            <input id="sf-company" style={field} value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" placeholder="Company name" />
          </div>
        )}
        <div>
          <label style={label} htmlFor="sf-email">Email <span style={{ fontWeight: 400 }}>(optional, for the contract copy)</span></label>
          <input id="sf-email" style={field} value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="you@company.com" />
        </div>

        {error && (
          <div style={{ fontSize: 13, color: T.err, background: T.errSoft, border: '1px solid #fecaca', borderRadius: 10, padding: '9px 12px' }}>{error}</div>
        )}

        <button type="submit" disabled={!verified || !nameOk || busy === 'buy'} style={{
          width: '100%', padding: '13px 18px', borderRadius: radiusFor(style.shape), border: 0, background: brand, color: inkOn(brand),
          fontFamily: FONT, fontSize: 15, fontWeight: 700, cursor: verified && nameOk ? 'pointer' : 'default', opacity: verified && nameOk ? 1 : 0.45,
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
        }}>
          {busy === 'buy' ? <Spinner color={inkOn(brand)} /> : (isFree ? 'Get it free' : `Confirm — ${fmtMoney(selected.price, selected.currency)}`)}
        </button>
        <p style={{ margin: 0, fontSize: 11.5, color: T.soft, textAlign: 'center' }}>
          {verified ? 'Nothing is charged yet — you review the full agreement and pay on the next page.' : 'Verify your mobile to continue. Nothing is charged here.'}
        </p>
      </form>

      <div style={{ textAlign: 'center', fontSize: 11.5, color: T.faint, marginTop: 18 }}>
        Your details go only to {data.seller.name}.
      </div>
    </Shell>
  );
};

export default BuyPage;
