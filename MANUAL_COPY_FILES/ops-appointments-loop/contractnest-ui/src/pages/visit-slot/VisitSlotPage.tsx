// ============================================================================
// VisitSlotPage — public: a customer confirms, moves or declines a visit slot
// ============================================================================
// Reached at /slot/:token (no auth, outside the app shell) from the link the
// team shares ("Ask customer" on the Ops board). One question, three answers:
//   Yes, that works · Suggest another time · Not needed this time
// A counter-proposal waits for the team (owner decision: it never confirms
// itself). Dependency-light like the check-in page — it renders for logged-out
// customers on a phone: own tokens, own spinner, inline messages, no toasts.

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { visitSlotApi, errorText, type SlotResolve, type SlotState } from './useVisitSlot';

const BRAND = {
  accent: '#DA6410', accentSoft: '#FEF3EC', accentInk: '#9A4408',
  ink: '#111827', sub: '#6B7280', line: '#ECECEE', field: '#D1D5DB', bg: '#F6F7F9',
  ok: '#059669', okSoft: '#ECFDF5', err: '#B91C1C', errSoft: '#FEF2F2', amber: '#B45309', amberSoft: '#FFFBEB',
};

const fmtWhen = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
};
const localInput = (fromIso?: string | null) => {
  const base = fromIso && new Date(fromIso).getTime() > Date.now() ? new Date(fromIso) : (() => { const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(10, 0, 0, 0); return t; })();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
};

const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = BRAND.accent }) => (
  <span aria-label="Loading" role="status" style={{
    display: 'inline-block', width: size, height: size, borderRadius: '50%',
    border: `2px solid ${color}33`, borderTopColor: color, animation: 'vs-spin 0.8s linear infinite',
  }} />
);

const VisitSlotPage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const [data, setData] = useState<SlotResolve | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<'answer' | 'propose' | 'done'>('answer');
  const [proposedAt, setProposedAt] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'accept' | 'propose' | 'decline' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setLoadError(null);
    try {
      const r = await visitSlotApi.resolve(token);
      setData(r);
      setProposedAt(localInput(r.proposed_at));
    } catch (e) {
      setLoadError(errorText(e, 'This link could not be opened.'));
    } finally { setLoading(false); }
  };
  useEffect(() => { if (token) load(); else { setLoading(false); setLoadError('This link is not valid.'); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const respond = async (action: 'accept' | 'propose' | 'decline') => {
    if (busy) return;
    if (action === 'propose' && !proposedAt) { setActionError('Pick a date and time first.'); return; }
    setBusy(action); setActionError(null);
    try {
      const r = await visitSlotApi.respond(token, action === 'propose'
        ? { action, proposed_at: proposedAt, note: note.trim() || undefined }
        : { action, note: note.trim() || undefined });
      setFlash(action === 'accept' ? 'Thank you — the visit is confirmed.' : action === 'propose' ? 'Thank you — we will confirm the new time shortly.' : 'Noted — we will not visit this time.');
      setMode('done');
      // re-read so the page shows the truth, not our guess
      const fresh = await visitSlotApi.resolve(token);
      setData(fresh);
      void r;
    } catch (e) {
      setActionError(errorText(e, 'Could not record your answer. Please try again.'));
    } finally { setBusy(null); }
  };

  const business = data?.business?.name || 'Your service partner';

  const stateCopy = (s: SlotState): { tone: 'ok' | 'amber' | 'sub'; title: string; body: string } => {
    switch (s) {
      case 'confirmed': return { tone: 'ok', title: `Confirmed for ${fmtWhen(data?.proposed_at)}`, body: `${business} will see you then.${data?.technician_name ? ` ${data.technician_name} is assigned to this visit.` : ''}` };
      case 'proposed_by_you': return { tone: 'amber', title: `You suggested ${fmtWhen(data?.customer_response?.proposed_at || data?.proposed_at)}`, body: `${business} will confirm this time with you shortly.` };
      case 'declined': return { tone: 'sub', title: 'You asked us not to visit this time', body: 'Changed your mind? You can still pick an answer below.' };
      case 'in_progress': return { tone: 'ok', title: 'This visit is under way', body: 'Nothing more to do here.' };
      case 'closed': return { tone: 'sub', title: 'This visit is closed', body: `If you need ${business}, please get in touch directly.` };
      default: return { tone: 'amber', title: `Can we visit on ${fmtWhen(data?.proposed_at)}?`, body: '' };
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BRAND.bg, color: BRAND.ink, fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <style>{`@keyframes vs-spin { to { transform: rotate(360deg); } } .vs-btn:disabled { opacity: .6; cursor: not-allowed; } .vs-btn:focus-visible { outline: 3px solid ${BRAND.accent}55; outline-offset: 2px; }`}</style>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '28px 16px 48px' }}>
        {/* business header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          {data?.business?.logo_url
            ? <img src={data.business.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'contain', backgroundColor: '#fff', border: `1px solid ${BRAND.line}` }} />
            : <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: BRAND.accentSoft, color: BRAND.accentInk, display: 'grid', placeItems: 'center', fontWeight: 800 }}>{business.charAt(0)}</div>}
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: BRAND.sub, fontWeight: 700 }}>Service visit</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{business}</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', border: `1px solid ${BRAND.line}`, borderRadius: 20, padding: 20 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', justifyContent: 'center', color: BRAND.sub, fontSize: 14 }}>
              <Spinner /> Opening your visit…
            </div>
          )}
          {!loading && loadError && (
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>We couldn't open this link</p>
              <p style={{ margin: '8px 0 16px', color: BRAND.sub, fontSize: 14 }}>{loadError}</p>
              <button className="vs-btn" onClick={load} style={{ border: `1px solid ${BRAND.accent}66`, color: BRAND.accent, background: '#fff', borderRadius: 999, padding: '10px 18px', fontWeight: 700, fontSize: 14 }}>Try again</button>
            </div>
          )}
          {!loading && data && (() => {
            const sc = stateCopy(data.state);
            const toneColor = sc.tone === 'ok' ? BRAND.ok : sc.tone === 'amber' ? BRAND.amber : BRAND.sub;
            const toneSoft = sc.tone === 'ok' ? BRAND.okSoft : sc.tone === 'amber' ? BRAND.amberSoft : BRAND.bg;
            const showAnswers = data.can_respond && (mode !== 'done' || data.state === 'declined');
            return (
              <>
                <p style={{ margin: 0, fontSize: 14, color: BRAND.sub }}>Hi{data.customer_first_name ? ` ${data.customer_first_name}` : ''},</p>
                <h1 style={{ margin: '6px 0 12px', fontSize: 22, lineHeight: 1.3, fontWeight: 800 }}>{sc.title}</h1>

                <div style={{ display: 'grid', gap: 6, padding: '12px 14px', borderRadius: 14, backgroundColor: BRAND.bg, fontSize: 14 }}>
                  <div><span style={{ color: BRAND.sub }}>For </span><b>{data.service_name}</b>{data.visit?.sequence && data.visit?.of ? <span style={{ color: BRAND.sub }}> · visit {data.visit.sequence} of {data.visit.of}</span> : null}</div>
                  {data.proposed_at && <div><span style={{ color: BRAND.sub }}>When </span><b>{fmtWhen(data.proposed_at)}</b></div>}
                  {data.technician_name && <div><span style={{ color: BRAND.sub }}>Technician </span><b>{data.technician_name}</b></div>}
                </div>

                {flash && mode === 'done' && (
                  <p style={{ margin: '14px 0 0', padding: '10px 12px', borderRadius: 12, backgroundColor: toneSoft, color: toneColor, fontWeight: 700, fontSize: 14 }}>{flash}</p>
                )}
                {sc.body && !(flash && mode === 'done') && (
                  <p style={{ margin: '12px 0 0', color: BRAND.sub, fontSize: 14, lineHeight: 1.5 }}>{sc.body}</p>
                )}

                {showAnswers && (
                  <div style={{ marginTop: 18 }}>
                    {data.state === 'declined' && mode === 'done' && <p style={{ margin: '0 0 10px', color: BRAND.sub, fontSize: 13 }}>Changed your mind?</p>}
                    {mode !== 'propose' ? (
                      <div style={{ display: 'grid', gap: 10 }}>
                        {data.state !== 'confirmed' && data.proposed_at && (
                          <button className="vs-btn" disabled={!!busy} onClick={() => respond('accept')}
                            style={{ minHeight: 48, borderRadius: 999, border: 'none', background: BRAND.accent, color: '#fff', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {busy === 'accept' ? <Spinner color="#fff" /> : null} Yes, {fmtWhen(data.proposed_at)} works
                          </button>
                        )}
                        <button className="vs-btn" disabled={!!busy} onClick={() => { setMode('propose'); setActionError(null); }}
                          style={{ minHeight: 48, borderRadius: 999, border: `1px solid ${BRAND.accent}66`, background: '#fff', color: BRAND.accent, fontWeight: 800, fontSize: 15 }}>
                          Suggest another time
                        </button>
                        {data.state !== 'declined' && (
                          <button className="vs-btn" disabled={!!busy} onClick={() => respond('decline')}
                            style={{ minHeight: 44, borderRadius: 999, border: 'none', background: 'transparent', color: BRAND.sub, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {busy === 'decline' ? <Spinner color={BRAND.sub} /> : null} Not needed this time
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: 10 }}>
                        <label style={{ fontSize: 13, fontWeight: 700, color: BRAND.sub }}>When suits you?
                          <input type="datetime-local" value={proposedAt} onChange={(e) => setProposedAt(e.target.value)}
                            style={{ display: 'block', width: '100%', marginTop: 6, minHeight: 46, borderRadius: 12, border: `1px solid ${BRAND.field}`, padding: '0 12px', fontSize: 15, color: BRAND.ink, background: '#fff' }} />
                        </label>
                        <label style={{ fontSize: 13, fontWeight: 700, color: BRAND.sub }}>Anything we should know? <span style={{ fontWeight: 500 }}>(optional)</span>
                          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Afternoons are better…" maxLength={500}
                            style={{ display: 'block', width: '100%', marginTop: 6, minHeight: 46, borderRadius: 12, border: `1px solid ${BRAND.field}`, padding: '0 12px', fontSize: 15, color: BRAND.ink, background: '#fff' }} />
                        </label>
                        <button className="vs-btn" disabled={!!busy || !proposedAt} onClick={() => respond('propose')}
                          style={{ minHeight: 48, borderRadius: 999, border: 'none', background: BRAND.accent, color: '#fff', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          {busy === 'propose' ? <Spinner color="#fff" /> : null} Send this time
                        </button>
                        <button className="vs-btn" disabled={!!busy} onClick={() => setMode('answer')}
                          style={{ minHeight: 40, borderRadius: 999, border: 'none', background: 'transparent', color: BRAND.sub, fontWeight: 700, fontSize: 14 }}>Back</button>
                        <p style={{ margin: 0, fontSize: 12, color: BRAND.sub }}>{business} will confirm the new time with you.</p>
                      </div>
                    )}
                  </div>
                )}
                {actionError && (
                  <p role="alert" style={{ margin: '12px 0 0', padding: '10px 12px', borderRadius: 12, backgroundColor: BRAND.errSoft, color: BRAND.err, fontSize: 13, fontWeight: 600 }}>{actionError}</p>
                )}
              </>
            );
          })()}
        </div>

        {data?.business?.phone && (
          <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 13, color: BRAND.sub }}>
            Questions? Call {business} on <a href={`tel:${data.business.phone}`} style={{ color: BRAND.accent, fontWeight: 700 }}>{data.business.phone}</a>
          </p>
        )}
        <p style={{ margin: '24px 0 0', textAlign: 'center', fontSize: 11, color: BRAND.sub }}>Powered by ContractNest</p>
      </div>
    </div>
  );
};

export default VisitSlotPage;
