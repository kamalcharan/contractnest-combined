// ============================================================================
// VaniChat — the conversation on the tenant's own site (and the package page)
// ============================================================================
// Dependency-light (it renders inside embed.js's iframe on a third-party page
// and inside /p/:key). Props: the key (vn-… site key or sf-… storefront key).
// Flow: greeting → quick questions from the FAQ → each answer may carry ONE
// package card (the same PackageCard as the widget) → when VaNi asks for
// contact, an inline name + mobile form → "Thanks, <seller> has your number".
// Hand-off to WhatsApp opens wa.me when the tenant chose that mode.

import React, { useEffect, useRef, useState } from 'react';
import PackageCard from './PackageCard';
import { vaniSiteApi, errorText, storefrontUrls, mergeCardStyle, StorefrontPackage, CardStyle, inkOn, radiusFor } from './api';

const T = { paper: '#f7f5f2', ink: '#1a1816', soft: '#8a847a', faint: '#bab4a8', line: '#f0ece6', edge: '#e5e1db', vani: '#ff6b2b', wash: '#fff3ed', ok: '#16a34a' };
const FONT = 'Outfit, "Segoe UI", system-ui, -apple-system, sans-serif';

interface SiteInfo {
  site_key: string; storefront_key: string | null;
  seller: { name: string; logo_url: string | null; primary_color: string | null; city: string | null };
  greeting: string; handoff: { mode: 'capture' | 'whatsapp'; phone: string | null }; capture_mode: 'interest' | 'first' | 'never';
  enabled: boolean; vani_enabled: boolean; domain_ok: boolean; card_style: CardStyle;
  packages: Array<StorefrontPackage & { storefront_key: string | null }>; faq: Array<{ q: string; a: string }>;
}
interface Msg { role: 'user' | 'assistant'; text: string; pkg?: (StorefrontPackage & { storefront_key: string | null }) | null; askContact?: boolean; handoff?: { mode: string; phone: string | null } | null; form?: 'open' | 'done' }

export interface VaniChatProps {
  siteKey: string;                  // vn-… or sf-…
  storefrontKey?: string | null;    // scope the packages (package page)
  pageUrl?: string | null;
  compact?: boolean;                // inside the bubble panel
  onOpen?: (url: string) => void;   // Buy / Explore: the embed opens on the host page
  onClose?: () => void;
}

const Spinner = () => <span role="status" aria-label="Thinking" style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: `2px solid ${T.vani}33`, borderTopColor: T.vani, animation: 'vc-spin 0.8s linear infinite' }} />;

const VaniChat: React.FC<VaniChatProps> = ({ siteKey, storefrontKey, pageUrl, compact, onOpen, onClose }) => {
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lead, setLead] = useState({ name: '', phone: '' });
  const [leadBusy, setLeadBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let on = true;
    vaniSiteApi.resolve(siteKey, storefrontKey || null)
      .then((s) => { if (!on) return; setSite(s); setMsgs([{ role: 'assistant', text: s.greeting, askContact: s.capture_mode === 'first' }]); })
      .catch((e) => { if (on) setErr(errorText(e, 'VaNi is not available right now.')); });
    return () => { on = false; };
  }, [siteKey, storefrontKey]);

  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, busy]);

  const brand = site?.card_style?.color || T.vani;
  const style = mergeCardStyle(site?.card_style, {});
  const open = (url: string) => { if (onOpen) onOpen(url); else if (window.parent && window.parent !== window) window.open(url, '_blank', 'noopener'); else window.location.assign(url); };
  const urlsFor = (p: { storefront_key: string | null; family_id: string }) => storefrontUrls(p.storefront_key || storefrontKey || '');

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || busy || !site) return;
    setInput('');
    const history = msgs.filter((m) => !m.form).slice(-6).map((m) => ({ role: m.role, text: m.text }));
    setMsgs((m) => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const r = await vaniSiteApi.chat(siteKey, { message: text, session_id: sessionId, storefront_key: storefrontKey || site.storefront_key || undefined, page_url: pageUrl || undefined, history });
      if (r.session_id) setSessionId(r.session_id);
      setMsgs((m) => [...m, { role: 'assistant', text: r.reply.text, pkg: r.package || null, askContact: !!r.reply.ask_contact, handoff: r.handoff || null }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', text: errorText(e, 'Sorry, I could not answer just now. Please try again.') }]);
    } finally { setBusy(false); }
  };

  const sendLead = async () => {
    if (!site || leadBusy) return;
    if (lead.name.trim().length < 2 || lead.phone.replace(/\D/g, '').length < 10) return;
    setLeadBusy(true);
    try {
      const r = await vaniSiteApi.lead(siteKey, { session_id: sessionId, name: lead.name.trim(), phone: lead.phone.trim() });
      if (r.session_id) setSessionId(r.session_id);
      setMsgs((m) => [...m.map((x) => x.askContact ? { ...x, askContact: false, form: 'done' as const } : x),
        { role: 'assistant', text: `Thanks, ${lead.name.trim().split(' ')[0]}. ${site.seller.name} has your number and this conversation and will get back to you. This page stays open if you want to explore the packages meanwhile.` }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', text: errorText(e, 'Could not save your details. Please try again.') }]);
    } finally { setLeadBusy(false); }
  };

  const quick = site ? [...site.faq.slice(0, 2).map((f) => f.q), ...(site.packages.length > 1 ? ['Which package suits me?'] : site.packages.length === 1 ? [`What does ${site.packages[0].name} include?`] : []), 'Can someone call me?'].slice(0, 4) : [];
  const showForm = (m: Msg) => m.askContact && site?.capture_mode !== 'never';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: compact ? 420 : 460, background: '#fff', color: T.ink, fontFamily: FONT, borderRadius: compact ? 0 : 16, border: compact ? 'none' : `1px solid ${T.edge}`, overflow: 'hidden' }}>
      <style>{`@keyframes vc-spin{to{transform:rotate(360deg)}} .vc-quick button:hover{background:#f3efe9}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${T.line}`, background: T.paper }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: T.vani, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14 }}>V</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ fontSize: 14 }}>VaNi</b>
          <div style={{ fontSize: 11, color: T.soft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{site ? `for ${site.seller.name} · online` : '…'}</div>
        </div>
        {onClose && <button type="button" onClick={onClose} aria-label="Close" style={{ border: 0, background: 'none', fontSize: 20, color: T.soft, cursor: 'pointer', lineHeight: 1 }}>×</button>}
      </div>

      <div ref={logRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'grid', gap: 10, alignContent: 'start' }}>
        {err && <div style={{ fontSize: 13, color: T.soft }}>{err}</div>}
        {site && (!site.vani_enabled || !site.enabled) && (
          <div style={{ fontSize: 13, color: T.soft }}>VaNi is not switched on for {site.seller.name} yet. You can still explore the packages{site.packages[0] ? <> — <a href={urlsFor(site.packages[0]).page} style={{ color: brand }}>open them here</a></> : ''}.</div>
        )}
        {site && !site.domain_ok && <div style={{ fontSize: 12, color: T.soft }}>This site is not on {site.seller.name}'s allowed list, so VaNi cannot answer here.</div>}
        {msgs.map((m, i) => (
          <div key={i} style={{ justifySelf: m.role === 'user' ? 'end' : 'start', maxWidth: '88%', display: 'grid', gap: 8 }}>
            <div style={{ background: m.role === 'user' ? brand : T.paper, color: m.role === 'user' ? inkOn(brand) : T.ink, borderRadius: 12, padding: '9px 12px', fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
              {m.role === 'assistant' && <div style={{ fontSize: 10, fontWeight: 700, color: T.vani, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>VaNi</div>}
              {m.text}
            </div>
            {m.pkg && (
              <PackageCard pkg={m.pkg} style={style} compact
                onBuy={(p) => open(`${urlsFor(m.pkg!).buy}?pkg=${p.family_id}`)}
                onExplore={(p) => open(`${urlsFor(m.pkg!).page}?pkg=${p.family_id}`)} />
            )}
            {m.handoff?.mode === 'whatsapp' && m.handoff.phone && (
              <a href={`https://wa.me/${m.handoff.phone}?text=${encodeURIComponent(`Hi, I was chatting with VaNi on your site about your packages.`)}`} target="_blank" rel="noreferrer"
                style={{ justifySelf: 'start', background: '#25d366', color: '#fff', textDecoration: 'none', borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>Continue on WhatsApp</a>
            )}
            {showForm(m) && m.form !== 'done' && (
              <div style={{ background: T.wash, border: `1px solid ${T.vani}33`, borderRadius: 12, padding: 10, display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 12, color: T.soft }}>Leave your details and {site?.seller.name} will get back to you.</div>
                <input value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} placeholder="Your name" style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.edge}`, fontSize: 13, fontFamily: FONT }} />
                <input value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} placeholder="Mobile" inputMode="tel" style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.edge}`, fontSize: 13, fontFamily: FONT }}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendLead(); }} />
                <button type="button" onClick={sendLead} disabled={leadBusy || lead.name.trim().length < 2 || lead.phone.replace(/\D/g, '').length < 10}
                  style={{ justifySelf: 'start', background: brand, color: inkOn(brand), border: 0, borderRadius: radiusFor(style.shape), padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, opacity: lead.name.trim().length < 2 || lead.phone.replace(/\D/g, '').length < 10 ? 0.5 : 1 }}>
                  {leadBusy ? <Spinner /> : 'Send'}
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && <div style={{ justifySelf: 'start', background: T.paper, borderRadius: 12, padding: '9px 12px' }}><Spinner /></div>}
      </div>

      {site && site.vani_enabled && site.enabled && site.domain_ok && (
        <>
          {msgs.length <= 1 && quick.length > 0 && (
            <div className="vc-quick" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 14px 8px' }}>
              {quick.map((q) => <button key={q} type="button" onClick={() => ask(q)} style={{ background: '#fff', border: `1px solid ${T.edge}`, borderRadius: 999, padding: '6px 11px', fontSize: 12, cursor: 'pointer', fontFamily: FONT, color: T.ink }}>{q}</button>)}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: `1px solid ${T.line}` }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ask(input); }} placeholder="Ask VaNi" aria-label="Ask VaNi"
              style={{ flex: 1, padding: '10px 12px', borderRadius: 999, border: `1px solid ${T.edge}`, fontSize: 14, fontFamily: FONT, outline: 'none' }} />
            <button type="button" onClick={() => ask(input)} disabled={busy || !input.trim()} style={{ background: T.vani, color: '#fff', border: 0, borderRadius: 999, padding: '0 16px', fontWeight: 600, cursor: 'pointer', fontFamily: FONT, opacity: input.trim() ? 1 : 0.5 }}>Send</button>
          </div>
          <div style={{ fontSize: 10.5, color: T.faint, textAlign: 'center', paddingBottom: 8 }}>VaNi answers from {site.seller.name}'s packages and FAQ · Powered by ContractNest</div>
        </>
      )}
    </div>
  );
};

export default VaniChat;
