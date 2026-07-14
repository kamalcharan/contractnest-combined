// ============================================================================
// SessionCheckinPage — public Group Session check-in (Batch 3 · G2 polish)
// ============================================================================
// Reached at /checkin/:token (no auth, outside the app shell). A member scans
// the chapter QR, is identified by phone, answers the tenant's check-in Smart
// Form, marks attendance for today's session, and may declare a BAU payment
// against one of their own billing dues.
//
// Option A skeleton: a fixed, polished mobile shell (branding + session hero +
// steps) whose *questions* are driven by the tenant's Smart Form schema
// (gs_checkin_form). The form body is rendered by a compact, self-contained
// renderer below — deliberately dependency-light (no ThemeContext / admin
// components) because this page renders for logged-out members on a phone.

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  sessionCheckinApi, CHECKIN_PHONE_KEY,
  type CheckinResolve, type CheckinMember, type CheckinHistory, type BillingRow,
  type CheckinForm, type CheckinField, type CheckinFormSchema,
} from './useSessionCheckin';

// ── brand tokens (Option A: the configurable skeleton) ──────────────────────
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
  err: '#B91C1C',
};

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
const money = (n?: number, c = 'INR') =>
  `${c === 'INR' ? '₹' : c + ' '}${Number(n || 0).toLocaleString()}`;
const isOpen = (s: string) => ['scheduled', 'due', 'overdue'].includes(s);
const initialOf = (s?: string) => (s || '?').trim().charAt(0).toUpperCase() || '?';

// Fields the shell renders itself (the prominent Present/Apologies control),
// so we don't double them up inside the Smart Form body.
const ATTENDANCE_FIELD_IDS = new Set(['attendance_status', 'attendance', 'present']);
const LAYOUT_TYPES = new Set(['heading', 'paragraph', 'divider']);

// ── tiny conditional evaluator (mirrors the admin FormRenderer semantics) ────
function condMet(cond: CheckinField['conditional'], values: Record<string, unknown>): boolean {
  if (!cond) return true;
  const v = values[cond.field_id];
  switch (cond.operator) {
    case 'equals': return v === cond.value;
    case 'not_equals': return v !== cond.value;
    case 'contains': return typeof v === 'string' && v.includes(String(cond.value));
    case 'greater_than': return Number(v) > Number(cond.value);
    case 'less_than': return Number(v) < Number(cond.value);
    default: return true;
  }
}

function validateField(f: CheckinField, value: unknown): string | null {
  const req = f.validation?.required;
  const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
  if (req && empty) return `${f.label} is required`;
  if (empty) return null;
  if (typeof value === 'string') {
    const v = f.validation;
    if (v?.minLength && value.length < v.minLength) return `${f.label} must be at least ${v.minLength} characters`;
    if (v?.maxLength && value.length > v.maxLength) return `${f.label} must be at most ${v.maxLength} characters`;
    if (v?.pattern) { try { if (!new RegExp(v.pattern).test(value)) return v.custom_message || `${f.label} is invalid`; } catch { /* ignore bad pattern */ } }
  }
  return null;
}

// Module-scope so their identity is stable across renders — defining these
// INSIDE the component makes React remount the whole tree on every keystroke
// (inputs lose focus). Keep them out here.
const Card: React.FC<{ children: React.ReactNode; pad?: number }> = ({ children, pad = 18 }) => (
  <div style={{ background: '#fff', border: `1px solid ${BRAND.line}`, borderRadius: 16, padding: pad,
    marginBottom: 14, boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>{children}</div>
);

const Shell: React.FC<{ chapterName: string; children: React.ReactNode }> = ({ chapterName, children }) => (
  <div style={{ minHeight: '100vh', background: BRAND.bg, padding: '20px 16px 40px' }}>
    <div style={{ maxWidth: 460, margin: '0 auto' }}>
      {/* Branded header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: BRAND.accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18,
          boxShadow: '0 4px 12px -2px rgba(218,100,16,0.45)' }}>{initialOf(chapterName)}</div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 800, color: BRAND.ink, fontSize: 16 }}>{chapterName}</div>
          <div style={{ fontSize: 12, color: BRAND.sub }}>Session check-in</div>
        </div>
      </div>
      {children}
    </div>
  </div>
);

const SessionCheckinPage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();

  const [resolve, setResolve] = useState<CheckinResolve | null>(null);
  const [form, setForm] = useState<CheckinForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [checking, setChecking] = useState(false);
  const [member, setMember] = useState<CheckinMember | null>(null);
  const [firstTimerName, setFirstTimerName] = useState('');
  const [guestConfirmed, setGuestConfirmed] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [history, setHistory] = useState<CheckinHistory | null>(null);

  // Guest / substitute (phone not on roster)
  const [notFoundKind, setNotFoundKind] = useState<'choose' | 'guest' | 'substitute'>('choose');
  const [guestCompany, setGuestCompany] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [subMemberPhone, setSubMemberPhone] = useState('');
  const [subLookupLoading, setSubLookupLoading] = useState(false);
  const [subForMember, setSubForMember] = useState<CheckinMember | null>(null);
  const [subName, setSubName] = useState('');

  const [status, setStatus] = useState<'present' | 'apologies'>('present');
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [payEventId, setPayEventId] = useState<string>('');
  const [upiRef, setUpiRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Resolve the token + load the check-in form on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await sessionCheckinApi.resolve(token);
        if (!alive) return;
        if (!r.ok) { setErr('This check-in link is invalid or has expired.'); }
        else setResolve(r);
      } catch { if (alive) setErr('Could not reach the check-in service.'); }
      finally { if (alive) setLoading(false); }
    })();
    (async () => {
      try {
        const f = await sessionCheckinApi.form(token);
        if (alive && f?.ok) {
          setForm(f);
          // seed default values so pre-filled fields submit correctly
          const seed: Record<string, unknown> = {};
          (f.schema?.sections || []).forEach((s) =>
            s.fields.forEach((fld) => {
              if (fld.default_value !== undefined && !ATTENDANCE_FIELD_IDS.has(fld.id) && !LAYOUT_TYPES.has(fld.type)) {
                seed[fld.id] = fld.default_value;
              }
            }));
          if (Object.keys(seed).length) setResponses((prev) => ({ ...seed, ...prev }));
        }
      } catch { /* form is optional — attendance still works without it */ }
    })();
    try { const p = localStorage.getItem(CHECKIN_PHONE_KEY); if (p) setPhone(p); } catch { /* ignore */ }
    return () => { alive = false; };
  }, [token]);

  const openDues = useMemo<BillingRow[]>(
    () => (history?.billing || []).filter((b) => isOpen(b.status)),
    [history]
  );

  // Flattened, condition-filtered form fields (minus the attendance control we
  // render ourselves and any pure-layout blocks we still show as text).
  const formFields = useMemo<CheckinField[]>(() => {
    const schema: CheckinFormSchema | undefined = form?.schema;
    if (!schema) return [];
    return schema.sections.flatMap((s) => s.fields).filter((f) => !ATTENDANCE_FIELD_IDS.has(f.id));
  }, [form]);

  const atStep2 = !!member || (notFound && guestConfirmed);

  const identify = async () => {
    if (phone.replace(/\D/g, '').length < 6) { setErr('Enter a valid phone number.'); return; }
    setErr(null); setChecking(true);
    setNotFound(false); setNotFoundKind('choose'); setGuestConfirmed(false); setSubForMember(null);
    try {
      const r = await sessionCheckinApi.lookup(token, phone);
      try { localStorage.setItem(CHECKIN_PHONE_KEY, phone); } catch { /* ignore */ }
      if (r.found && r.member) {
        setMember(r.member);
        const h = await sessionCheckinApi.history(token, r.member.contact_id);
        setHistory(h);
      } else {
        setNotFound(true);
      }
    } catch { setErr('Lookup failed. Try again.'); }
    finally { setChecking(false); }
  };

  // Substitute: look up the member being stood in for by their mobile number.
  const lookupSubMember = async () => {
    if (subMemberPhone.replace(/\D/g, '').length < 6) { setErr("Enter the member's mobile number."); return; }
    setErr(null); setSubLookupLoading(true);
    try {
      const r = await sessionCheckinApi.lookup(token, subMemberPhone);
      if (r.found && r.member) setSubForMember(r.member);
      else setErr("That number isn't on the member roster. Check with the chair.");
    } catch { setErr('Lookup failed. Try again.'); }
    finally { setSubLookupLoading(false); }
  };

  const resetIdentity = () => {
    setMember(null); setNotFound(false); setNotFoundKind('choose'); setGuestConfirmed(false);
    setHistory(null); setSubForMember(null); setSubName(''); setSubMemberPhone('');
    setFirstTimerName(''); setGuestCompany(''); setGuestEmail(''); setErr(null);
  };

  const setResponse = (id: string, value: unknown) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
    setFieldErrors((prev) => { if (prev[id]) { const c = { ...prev }; delete c[id]; return c; } return prev; });
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    for (const f of formFields) {
      if (LAYOUT_TYPES.has(f.type)) continue;
      if (!condMet(f.conditional, responses)) continue;
      const e = validateField(f, responses[f.id]);
      if (e) errs[f.id] = e;
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    setErr(null);
    if (!validateForm()) { setErr('Please answer the required questions.'); return; }
    setSubmitting(true);
    try {
      const payment = payEventId
        ? { billing_event_id: payEventId, upi_reference: upiRef || undefined,
            amount: openDues.find((d) => d.event_id === payEventId)?.amount }
        : null;
      // Persist the attendance choice inside the responses too, so the stored
      // form answers stay consistent with the attendance column.
      const fullResponses = { ...responses, attendance_status: status };
      const formIds = {
        form_template_id: form?.form_template_id ?? null,
        form_template_version: form?.form_template_version ?? null,
      };

      if (member) {
        // Recognised member
        await sessionCheckinApi.submit(token, {
          member_id: member.contact_id,
          member_name: member.name,
          member_phone: phone,
          status, payment, responses: fullResponses, ...formIds,
        });
      } else if (notFoundKind === 'substitute' && subForMember) {
        // Standing in for a member → member marked present, substitute saved
        // as that member's Alternative Contact Person.
        await sessionCheckinApi.substitute(token, {
          member_id: subForMember.contact_id,
          sub_name: subName,
          sub_phone: phone,
          status, responses: fullResponses, ...formIds,
        });
      } else {
        // Guest → own contact tagged 'guest'
        await sessionCheckinApi.guest(token, {
          name: firstTimerName,
          phone,
          company: guestCompany || undefined,
          email: guestEmail || undefined,
          status, responses: fullResponses, ...formIds,
        });
      }
      setDone(true);
    } catch (e: any) {
      const reason = e?.response?.data?.message;
      setErr(reason === 'no_session_today' ? 'There is no session scheduled for today.' : (reason || 'Check-in failed.'));
    } finally { setSubmitting(false); }
  };

  // ── shared UI atoms ──
  const chapterName = resolve?.contract_name || 'Session Check-in';
  const occ = resolve?.occurrence;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 13px', border: `1px solid ${BRAND.field}`, borderRadius: 11,
    marginTop: 6, fontSize: 15, color: BRAND.ink, boxSizing: 'border-box', outline: 'none', background: '#fff',
  };
  const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: BRAND.sub };

  // ── Smart Form field renderer (mobile-styled) ──
  const renderField = (f: CheckinField) => {
    if (!condMet(f.conditional, responses)) return null;
    const val = responses[f.id];
    const errText = fieldErrors[f.id];
    const req = f.validation?.required;

    if (f.type === 'heading') return <div key={f.id} style={{ fontWeight: 800, color: BRAND.ink, fontSize: 15, marginTop: 4 }}>{f.label}</div>;
    if (f.type === 'paragraph') return <p key={f.id} style={{ color: BRAND.sub, fontSize: 13.5, margin: '2px 0' }}>{f.label}</p>;
    if (f.type === 'divider') return <div key={f.id} style={{ height: 1, background: BRAND.line, margin: '6px 0' }} />;

    const Label = (
      <label style={labelStyle}>{f.label}{req && <span style={{ color: BRAND.err }}> *</span>}</label>
    );
    const Err = errText ? <div style={{ color: BRAND.err, fontSize: 12, marginTop: 5 }}>{errText}</div> : null;
    const Help = f.help_text ? <div style={{ color: BRAND.sub, fontSize: 12, marginTop: 4 }}>{f.help_text}</div> : null;

    // radio / select-as-chips
    if (f.type === 'radio' || f.type === 'select') {
      const opts = f.options || [];
      return (
        <div key={f.id}>
          {Label}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {opts.map((o) => {
              const sel = val === o.value;
              return (
                <button key={o.value} type="button" onClick={() => setResponse(f.id, o.value)}
                  style={{ padding: '9px 14px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    border: sel ? `2px solid ${BRAND.accent}` : `1px solid ${BRAND.field}`,
                    background: sel ? BRAND.accentSoft : '#fff', color: sel ? BRAND.accentInk : BRAND.ink }}>
                  {o.label}
                </button>
              );
            })}
          </div>
          {Help}{Err}
        </div>
      );
    }

    // multi-select checkboxes
    if (f.type === 'checkboxes' || f.type === 'multiselect') {
      const arr = Array.isArray(val) ? (val as string[]) : [];
      const toggle = (v: string) => setResponse(f.id, arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
      return (
        <div key={f.id}>
          {Label}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {(f.options || []).map((o) => {
              const sel = arr.includes(o.value);
              return (
                <button key={o.value} type="button" onClick={() => toggle(o.value)}
                  style={{ padding: '9px 14px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    border: sel ? `2px solid ${BRAND.accent}` : `1px solid ${BRAND.field}`,
                    background: sel ? BRAND.accentSoft : '#fff', color: sel ? BRAND.accentInk : BRAND.ink }}>
                  {sel ? '✓ ' : ''}{o.label}
                </button>
              );
            })}
          </div>
          {Help}{Err}
        </div>
      );
    }

    // single boolean toggle
    if (f.type === 'boolean' || f.type === 'checkbox' || f.type === 'toggle') {
      const on = val === true;
      return (
        <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>{Label}{Help}</div>
          <button type="button" onClick={() => setResponse(f.id, !on)}
            style={{ width: 46, height: 27, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative',
              background: on ? BRAND.accent : '#CBD5E1', transition: 'background .15s' }}>
            <span style={{ position: 'absolute', top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: '50%',
              background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
          </button>
        </div>
      );
    }

    if (f.type === 'textarea') {
      return (
        <div key={f.id}>
          {Label}
          <textarea value={(val as string) ?? ''} placeholder={f.placeholder}
            onChange={(e) => setResponse(f.id, e.target.value)} rows={3}
            style={{ ...inputStyle, resize: 'vertical' }} />
          {Help}{Err}
        </div>
      );
    }

    // text / email / tel / number / date and any unknown scalar type
    const inputType = f.type === 'number' ? 'number' : f.type === 'date' ? 'date'
      : f.type === 'email' ? 'email' : (f.type === 'tel' || f.type === 'phone') ? 'tel' : 'text';
    return (
      <div key={f.id}>
        {Label}
        <input type={inputType} value={(val as string) ?? ''} placeholder={f.placeholder}
          inputMode={inputType === 'number' ? 'numeric' : inputType === 'tel' ? 'tel' : undefined}
          onChange={(e) => setResponse(f.id, inputType === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
          style={inputStyle} />
        {Help}{Err}
      </div>
    );
  };

  // ── screens ──
  if (loading) return <Shell chapterName={chapterName}><Card>Loading…</Card></Shell>;
  if (err && !resolve) return <Shell chapterName={chapterName}><Card><p style={{ color: BRAND.err, margin: 0 }}>{err}</p></Card></Shell>;

  if (done) {
    return (
      <Shell chapterName={chapterName}>
        <Card pad={24}>
          <div style={{ width: 68, height: 68, margin: '4px auto 10px', borderRadius: '50%', background: '#ECFDF3',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>✅</div>
          <h2 style={{ textAlign: 'center', margin: '4px 0', color: BRAND.ink }}>You're checked in</h2>
          <p style={{ textAlign: 'center', color: BRAND.sub, marginTop: 4, fontSize: 14 }}>
            {status === 'present' ? 'Marked present' : 'Marked apologies'} for {fmtDate(occ?.date)}.
          </p>
          {payEventId && (
            <div style={{ marginTop: 14, background: BRAND.accentSoft, borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: BRAND.accentInk, fontWeight: 600 }}>Payment recorded as pending</div>
              <div style={{ fontSize: 12.5, color: BRAND.sub, marginTop: 2 }}>The chair will confirm it offline.</div>
            </div>
          )}
        </Card>
      </Shell>
    );
  }

  return (
    <Shell chapterName={chapterName}>
      {/* Session hero */}
      <Card>
        {occ ? (
          <>
            <div style={{ fontSize: 12.5, color: BRAND.sub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Today's session</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: BRAND.ink, marginTop: 2 }}>{fmtDate(occ.date)}</div>
            {occ.name && <div style={{ fontSize: 13, color: BRAND.sub, marginTop: 2 }}>{occ.name}</div>}
          </>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: 18, color: BRAND.ink }}>No session today</div>
            {resolve?.next_occurrence && (
              <div style={{ fontSize: 13, color: BRAND.sub, marginTop: 2 }}>Next session: {fmtDate(resolve.next_occurrence.date)}</div>
            )}
          </>
        )}
      </Card>

      {/* Step 1 · identify */}
      {!atStep2 && !notFound && (
        <Card>
          <label style={labelStyle}>Your mobile number</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+91 …" style={inputStyle}
            onKeyDown={(e) => { if (e.key === 'Enter') identify(); }} />
          {err && <p style={{ color: BRAND.err, fontSize: 13, marginBottom: 0 }}>{err}</p>}
          <button onClick={identify} disabled={checking}
            style={{ width: '100%', marginTop: 14, padding: 14, border: 'none', borderRadius: 12,
              background: BRAND.accent, color: '#fff', fontWeight: 800, fontSize: 15.5, cursor: 'pointer',
              opacity: checking ? 0.7 : 1 }}>
            {checking ? 'Checking…' : 'Continue'}
          </button>
          <p style={{ fontSize: 12, color: BRAND.sub, textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
            We use your number to recognise you on the roster.
          </p>
        </Card>
      )}

      {/* Not on roster → choose guest or substitute */}
      {notFound && !guestConfirmed && (
        <Card>
          <div style={{ fontWeight: 700, color: BRAND.ink }}>We couldn't match that number</div>

          {notFoundKind === 'choose' && (
            <>
              <p style={{ marginTop: 6, color: BRAND.sub, fontSize: 13.5 }}>How are you joining today?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                <button onClick={() => setNotFoundKind('guest')}
                  style={{ textAlign: 'left', padding: 14, borderRadius: 12, border: `1px solid ${BRAND.field}`, background: '#fff', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, color: BRAND.ink }}>I'm a guest 👋</div>
                  <div style={{ fontSize: 12.5, color: BRAND.sub, marginTop: 2 }}>Visiting this session for the first time.</div>
                </button>
                <button onClick={() => setNotFoundKind('substitute')}
                  style={{ textAlign: 'left', padding: 14, borderRadius: 12, border: `1px solid ${BRAND.field}`, background: '#fff', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, color: BRAND.ink }}>I'm standing in for a member 🔁</div>
                  <div style={{ fontSize: 12.5, color: BRAND.sub, marginTop: 2 }}>Attending on behalf of a member who can't make it.</div>
                </button>
              </div>
            </>
          )}

          {notFoundKind === 'guest' && (
            <>
              <p style={{ marginTop: 6, color: BRAND.sub, fontSize: 13.5 }}>Welcome! A couple of quick details.</p>
              <label style={labelStyle}>Your name <span style={{ color: BRAND.err }}>*</span></label>
              <input value={firstTimerName} onChange={(e) => setFirstTimerName(e.target.value)} placeholder="Full name" style={inputStyle} />
              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Company (optional)</label>
                <input value={guestCompany} onChange={(e) => setGuestCompany(e.target.value)} placeholder="Company / business" style={inputStyle} />
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Email (optional)</label>
                <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
              </div>
              <button onClick={() => { if (firstTimerName.trim()) setGuestConfirmed(true); }} disabled={!firstTimerName.trim()}
                style={{ width: '100%', marginTop: 16, padding: 13, border: 'none', borderRadius: 12,
                  background: firstTimerName.trim() ? BRAND.accent : '#9CA3AF', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
                Continue as guest
              </button>
              <button onClick={() => setNotFoundKind('choose')}
                style={{ marginTop: 12, width: '100%', background: 'none', border: 'none', color: BRAND.sub, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                ← Back
              </button>
            </>
          )}

          {notFoundKind === 'substitute' && (
            <>
              {!subForMember ? (
                <>
                  <p style={{ marginTop: 6, color: BRAND.sub, fontSize: 13.5 }}>Who are you standing in for? Enter the member's mobile number.</p>
                  <label style={labelStyle}>Member's mobile number</label>
                  <input value={subMemberPhone} onChange={(e) => setSubMemberPhone(e.target.value)} inputMode="tel" placeholder="+91 …" style={inputStyle}
                    onKeyDown={(e) => { if (e.key === 'Enter') lookupSubMember(); }} />
                  <button onClick={lookupSubMember} disabled={subLookupLoading}
                    style={{ width: '100%', marginTop: 14, padding: 13, border: 'none', borderRadius: 12,
                      background: BRAND.accent, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', opacity: subLookupLoading ? 0.7 : 1 }}>
                    {subLookupLoading ? 'Checking…' : 'Find member'}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ marginTop: 10, background: BRAND.accentSoft, borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 12.5, color: BRAND.sub }}>Standing in for</div>
                    <div style={{ fontWeight: 800, color: BRAND.accentInk }}>{subForMember.name}</div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <label style={labelStyle}>Your name <span style={{ color: BRAND.err }}>*</span></label>
                    <input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Full name" style={inputStyle} />
                  </div>
                  <button onClick={() => { if (subName.trim()) setGuestConfirmed(true); }} disabled={!subName.trim()}
                    style={{ width: '100%', marginTop: 16, padding: 13, border: 'none', borderRadius: 12,
                      background: subName.trim() ? BRAND.accent : '#9CA3AF', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
                    Continue
                  </button>
                  <button onClick={() => { setSubForMember(null); setSubName(''); }}
                    style={{ marginTop: 12, width: '100%', background: 'none', border: 'none', color: BRAND.sub, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                    ← Different member
                  </button>
                </>
              )}
              {!subForMember && (
                <button onClick={() => setNotFoundKind('choose')}
                  style={{ marginTop: 12, width: '100%', background: 'none', border: 'none', color: BRAND.sub, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  ← Back
                </button>
              )}
            </>
          )}

          {err && <p style={{ color: BRAND.err, fontSize: 13, marginTop: 10, marginBottom: 0 }}>{err}</p>}
          <button onClick={resetIdentity}
            style={{ marginTop: 14, width: '100%', background: 'none', border: 'none', color: BRAND.accent, fontWeight: 700, cursor: 'pointer' }}>
            ← Try a different number
          </button>
        </Card>
      )}

      {/* Step 2 · attendance + smart form + dues */}
      {atStep2 && (
        <>
          <Card>
            <div style={{ fontWeight: 800, color: BRAND.ink, fontSize: 16 }}>
              {member
                ? `Welcome, ${member.name}`
                : notFoundKind === 'substitute'
                  ? `${subName} (substitute)`
                  : `${firstTimerName} (guest)`}
            </div>
            {member && history && (
              <div style={{ fontSize: 12.5, color: BRAND.sub, marginTop: 3 }}>
                {history.attendance.length} past check-in{history.attendance.length === 1 ? '' : 's'}
              </div>
            )}
            {notFoundKind === 'substitute' && subForMember && (
              <div style={{ fontSize: 12.5, color: BRAND.sub, marginTop: 3 }}>
                Standing in for <strong style={{ color: BRAND.ink }}>{subForMember.name}</strong>
              </div>
            )}

            <div style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, color: BRAND.sub }}>Are you attending today?</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {(['present', 'apologies'] as const).map((s) => (
                <button key={s} onClick={() => setStatus(s)}
                  style={{ flex: 1, padding: 12, borderRadius: 11, fontWeight: 700, fontSize: 14.5, cursor: 'pointer',
                    border: status === s ? `2px solid ${BRAND.accent}` : `1px solid ${BRAND.field}`,
                    background: status === s ? BRAND.accentSoft : '#fff', color: status === s ? BRAND.accentInk : BRAND.ink }}>
                  {s === 'present' ? 'Present' : 'Apologies'}
                </button>
              ))}
            </div>
          </Card>

          {/* Smart Form questions (tenant-configurable) */}
          {formFields.length > 0 && (
            <Card>
              <div style={{ fontWeight: 800, color: BRAND.ink, marginBottom: 4 }}>
                {form?.schema?.title && form.schema.title !== 'Session Check-in' ? form.schema.title : 'A few quick questions'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 10 }}>
                {formFields.map(renderField)}
              </div>
            </Card>
          )}

          {/* BAU dues — matched members only */}
          {member && (
            <Card>
              <div style={{ fontWeight: 800, color: BRAND.ink, marginBottom: 8 }}>Your dues</div>
              {openDues.length === 0 && (
                <p style={{ color: BRAND.ok, fontSize: 14, margin: 0 }}>All dues are settled. 🎉</p>
              )}
              {openDues.map((d) => (
                <label key={d.event_id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderTop: `1px solid #F1F1F3`, cursor: 'pointer' }}>
                  <input type="radio" name="due" checked={payEventId === d.event_id}
                    onChange={() => setPayEventId(payEventId === d.event_id ? '' : d.event_id)} />
                  <span style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, color: BRAND.ink }}>{d.label}</span>
                    <span style={{ display: 'block', fontSize: 12, color: BRAND.sub }}>Due {fmtDate(d.date)} · {d.status}</span>
                  </span>
                  <strong style={{ color: BRAND.ink }}>{money(d.amount, d.currency)}</strong>
                </label>
              ))}
              {payEventId && (
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>UPI reference (after paying the chapter UPI)</label>
                  <input value={upiRef} onChange={(e) => setUpiRef(e.target.value)} placeholder="e.g. 4098XXXX2231" style={inputStyle} />
                  <p style={{ fontSize: 12, color: BRAND.sub, marginBottom: 0, marginTop: 6 }}>
                    The chair will confirm your payment offline.
                  </p>
                </div>
              )}
            </Card>
          )}

          {err && <p style={{ color: BRAND.err, fontSize: 13 }}>{err}</p>}
          <button onClick={submit} disabled={submitting || !occ}
            style={{ width: '100%', padding: 15, border: 'none', borderRadius: 13,
              background: occ ? BRAND.accent : '#9CA3AF', color: '#fff', fontWeight: 800, fontSize: 16.5, cursor: occ ? 'pointer' : 'not-allowed',
              boxShadow: occ ? '0 6px 16px -4px rgba(218,100,16,0.5)' : 'none', opacity: submitting ? 0.75 : 1 }}>
            {submitting ? 'Submitting…' : occ ? 'Check in' : 'No session today'}
          </button>
          <button onClick={resetIdentity}
            style={{ marginTop: 12, width: '100%', background: 'none', border: 'none', color: BRAND.sub, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            ← Not you? Start over
          </button>
        </>
      )}
    </Shell>
  );
};

export default SessionCheckinPage;
