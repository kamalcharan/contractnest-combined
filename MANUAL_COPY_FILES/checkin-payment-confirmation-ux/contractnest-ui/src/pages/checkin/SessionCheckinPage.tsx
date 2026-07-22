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
  sessionCheckinApi, getOrCreateDeviceToken, forgetDeviceToken,
  type CheckinResolve, type CheckinMember, type CheckinHistory, type BillingRow,
  type CheckinForm, type CheckinField, type CheckinFormSchema, type CheckinPaymentConfig,
  type CheckinDeviceLookup,
} from './useSessionCheckin';
import { QrCode } from '@/utils/qrcodegen';
import { countries } from '@/utils/constants/countries';
import { validatePhoneByCountry, getFullPhoneNumber, getPhonePlaceholder } from '@/utils/validation/contactValidation';

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

// Build a UPI intent URL (upi://pay?…). On a phone this opens the UPI app
// chooser (GPay / PhonePe / Paytm) pre-filled with payee + amount.
const upiPayUrl = (vpa: string, payee?: string, amount?: number, note?: string) => {
  const parts = [`pa=${encodeURIComponent(vpa)}`];
  if (payee) parts.push(`pn=${encodeURIComponent(payee)}`);
  if (amount) parts.push(`am=${amount}`);
  parts.push('cu=INR');
  if (note) parts.push(`tn=${encodeURIComponent(note)}`);
  return `upi://pay?${parts.join('&')}`;
};

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

const Shell: React.FC<{ chapterName: string; tenantName?: string; children: React.ReactNode }> = ({ chapterName, tenantName, children }) => (
  <div style={{ minHeight: '100vh', background: BRAND.bg, padding: '20px 16px 40px' }}>
    <div style={{ maxWidth: 460, margin: '0 auto' }}>
      {/* Branded header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: BRAND.accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18,
          boxShadow: '0 4px 12px -2px rgba(218,100,16,0.45)' }}>{initialOf(chapterName)}</div>
        <div style={{ lineHeight: 1.2 }}>
          {tenantName && (
            <div style={{ fontSize: 15, color: BRAND.ink, fontWeight: 800, letterSpacing: 0.2 }}>
              {tenantName}
            </div>
          )}
          <div style={{ fontWeight: 700, color: BRAND.sub, fontSize: 13.5, marginTop: tenantName ? 1 : 0 }}>{chapterName}</div>
          <div style={{ fontSize: 12, color: BRAND.sub }}>Session check-in</div>
        </div>
      </div>
      {children}
    </div>
  </div>
);

// Shared input styles (module scope so PhoneField stays stable across renders).
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '12px 13px', border: `1px solid ${BRAND.field}`, borderRadius: 11,
  marginTop: 6, fontSize: 15, color: BRAND.ink, boxSizing: 'border-box', outline: 'none', background: '#fff',
};
const LABEL_STYLE: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: BRAND.sub };

// Store phones the product way: +{phoneCode}{localDigits}, country as ISO ('IN').
const fullPhone = (num: string, ccIso: string) => getFullPhoneNumber(num, ccIso);
// Sorted country list, India first (default market).
const PHONE_COUNTRIES = [...countries].sort((a, b) =>
  a.code === 'IN' ? -1 : b.code === 'IN' ? 1 : a.name.localeCompare(b.name));

// Country-code selector + local number, validated with the product utility.
const PhoneField: React.FC<{
  label: string; cc: string; num: string; onCc: (v: string) => void; onNum: (v: string) => void;
  error?: string; onEnter?: () => void; required?: boolean;
}> = ({ label, cc, num, onCc, onNum, error, onEnter, required }) => (
  <div>
    <label style={LABEL_STYLE}>{label}{required && <span style={{ color: BRAND.err }}> *</span>}</label>
    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
      <select value={cc} onChange={(e) => onCc(e.target.value)}
        style={{ ...INPUT_STYLE, marginTop: 0, width: 116, flexShrink: 0, paddingLeft: 8, paddingRight: 4 }}
        aria-label="Country code">
        {PHONE_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>{c.code} +{c.phoneCode}</option>
        ))}
      </select>
      <input value={num} onChange={(e) => onNum(e.target.value.replace(/\D/g, ''))}
        inputMode="numeric" placeholder={getPhonePlaceholder(cc)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
        style={{ ...INPUT_STYLE, marginTop: 0, flex: 1 }} />
    </div>
    {error && <div style={{ color: BRAND.err, fontSize: 12, marginTop: 5 }}>{error}</div>}
  </div>
);

const SessionCheckinPage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();

  const [resolve, setResolve] = useState<CheckinResolve | null>(null);
  const [form, setForm] = useState<CheckinForm | null>(null);
  const [payCfg, setPayCfg] = useState<CheckinPaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Phone entry: country (ISO) + local digits, stored as +{code}{digits}.
  const [p1Cc, setP1Cc] = useState('IN');   // scanning member's own number
  const [p1Num, setP1Num] = useState('');
  const [checking, setChecking] = useState(false);
  const [member, setMember] = useState<CheckinMember | null>(null);
  const [alreadyChecked, setAlreadyChecked] = useState(false);
  const [firstTimerName, setFirstTimerName] = useState('');
  const [guestConfirmed, setGuestConfirmed] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [history, setHistory] = useState<CheckinHistory | null>(null);

  // Guest / substitute (phone not on roster)
  const [notFoundKind, setNotFoundKind] = useState<'choose' | 'guest' | 'substitute'>('choose');
  const [guestCompany, setGuestCompany] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [pmCc, setPmCc] = useState('IN');   // member being stood in for
  const [pmNum, setPmNum] = useState('');
  const [poCc, setPoCc] = useState('IN');   // substitute's own number
  const [poNum, setPoNum] = useState('');
  const [subLookupLoading, setSubLookupLoading] = useState(false);
  const [subForMember, setSubForMember] = useState<CheckinMember | null>(null);
  const [subName, setSubName] = useState('');

  // Device recognition (returning browser on this chapter's QR)
  const [deviceToken, setDeviceToken] = useState<string>(() => getOrCreateDeviceToken());
  const [deviceChecking, setDeviceChecking] = useState(true);
  const [deviceMatch, setDeviceMatch] = useState<CheckinDeviceLookup | null>(null);
  const [deviceDismissed, setDeviceDismissed] = useState(false);
  const [deviceConfirming, setDeviceConfirming] = useState(false);
  // Recognised phone numbers, used at submit time in place of the typed
  // p1Num/poNum fields (which stay blank on the silent/confirm paths).
  const [recognizedMemberPhone, setRecognizedMemberPhone] = useState('');
  const [recognizedSubPhone, setRecognizedSubPhone] = useState('');
  const [recognizedGuestPhone, setRecognizedGuestPhone] = useState('');

  const phone = fullPhone(p1Num, p1Cc);

  const [status, setStatus] = useState<'present' | 'apologies'>('present');
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [payEventId, setPayEventId] = useState<string>('');
  const [upiRef, setUpiRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // UPI deep links have no callback — the browser tab just sits there
  // untouched while the user pays in GPay/PhonePe. Without this, a user can
  // easily assume the system detected the payment automatically and never
  // come back to enter the reference + tap Record payment. A confirm modal
  // sets that expectation before they leave, and a visibility-change nudge
  // catches them again if they forget once they're back on the tab.
  const [payConfirmOpen, setPayConfirmOpen] = useState(false);
  const [pendingPayUrl, setPendingPayUrl] = useState('');
  const [paymentAttempted, setPaymentAttempted] = useState(false);
  const [showReturnNudge, setShowReturnNudge] = useState(false);

  // Resolve the token + load the check-in form on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      let resolved: CheckinResolve | null = null;
      try {
        const r = await sessionCheckinApi.resolve(token);
        if (!alive) return;
        if (!r.ok) { setErr('This check-in link is invalid or has expired.'); }
        else { setResolve(r); resolved = r; }
      } catch { if (alive) setErr('Could not reach the check-in service.'); }
      finally { if (alive) setLoading(false); }
      // Device recognition runs after resolve succeeds (needs today's
      // occurrence date to compute alreadyChecked correctly for a
      // silently-recognised member) — best-effort, never blocks the page.
      if (!alive || !resolved) { if (alive) setDeviceChecking(false); return; }
      try {
        const dl = await sessionCheckinApi.deviceLookup(token, deviceToken);
        if (!alive) return;
        if (dl.ok && dl.found) {
          if (dl.role === 'member' && dl.member) {
            await applyMemberMatch(dl.member, resolved, dl.member.phone || undefined);
          } else if (dl.role === 'substitute' || dl.role === 'guest') {
            setDeviceMatch(dl);
          }
        }
      } catch { /* device recognition is optional — phone entry still works */ }
      finally { if (alive) setDeviceChecking(false); }
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
    (async () => {
      try { const pc = await sessionCheckinApi.paymentConfig(token); if (alive && pc?.ok) setPayCfg(pc); }
      catch { /* payment config is optional — dues still declare without it */ }
    })();
    // (#3) No pre-fill — each open starts blank.
    return () => { alive = false; };
  }, [token]);

  // Nudge if the tab regains focus after a UPI pay attempt and the payment
  // still hasn't been declared — the deep link gives no signal on its own
  // that the user ever came back, let alone paid.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && paymentAttempted && !upiRef && !done) {
        setShowReturnNudge(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [paymentAttempted, upiRef, done]);

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

  // Shared by identify() (typed phone) and the on-mount device recognition
  // (silent, no typing) — both land on the same Step 2 attendance screen.
  const applyMemberMatch = async (m: CheckinMember, resolvedData: CheckinResolve | null, phoneForSubmit?: string) => {
    setMember(m);
    if (phoneForSubmit) setRecognizedMemberPhone(phoneForSubmit);
    try {
      const h = await sessionCheckinApi.history(token, m.contact_id);
      setHistory(h);
      const today = resolvedData?.occurrence?.date;
      if (today && (h?.attendance || []).some((a) => a.date === today)) setAlreadyChecked(true);
    } catch { /* history is optional — attendance still works without it */ }
  };

  const identify = async () => {
    const v = validatePhoneByCountry(p1Num, p1Cc);
    if (!v.isValid) { setErr(v.error || 'Enter a valid mobile number.'); return; }
    setErr(null); setChecking(true);
    setNotFound(false); setNotFoundKind('choose'); setGuestConfirmed(false); setSubForMember(null); setAlreadyChecked(false);
    try {
      const r = await sessionCheckinApi.lookup(token, phone);
      if (r.found && r.member) {
        await applyMemberMatch(r.member, resolve);
      } else {
        setNotFound(true);
      }
    } catch { setErr('Lookup failed. Try again.'); }
    finally { setChecking(false); }
  };

  // Substitute/guest device match: confirmed with one tap, or dismissed
  // ("not me") which forgets this browser going forward.
  const confirmDeviceSubstitute = () => {
    if (!deviceMatch?.substitute || !deviceMatch.last_member) return;
    setDeviceConfirming(true);
    setNotFound(true); setNotFoundKind('substitute');
    setSubName(deviceMatch.substitute.name);
    setRecognizedSubPhone(deviceMatch.substitute.phone || '');
    setSubForMember({
      contact_id: deviceMatch.last_member.contact_id,
      name: deviceMatch.last_member.name,
      membership_contract_id: deviceMatch.last_member.membership_contract_id,
    });
    setGuestConfirmed(true);
  };

  const confirmDeviceGuest = () => {
    if (!deviceMatch?.guest) return;
    setDeviceConfirming(true);
    setNotFound(true); setNotFoundKind('guest');
    setFirstTimerName(deviceMatch.guest.name);
    setGuestCompany(deviceMatch.guest.company || '');
    setGuestEmail(deviceMatch.guest.email || '');
    setRecognizedGuestPhone(deviceMatch.guest.phone || '');
    setGuestConfirmed(true);
  };

  const dismissDeviceMatch = () => {
    setDeviceMatch(null);
    setDeviceDismissed(true);
    setDeviceToken(forgetDeviceToken());
  };

  // Same recognised substitute, but standing in for someone else today —
  // keep the browser recognised as this substitute (last_member updates on
  // the next successful submit), just ask which member this time.
  const substituteDifferentMemberToday = () => {
    if (!deviceMatch?.substitute) return;
    setDeviceMatch(null); // clear the confirm card without forgetting the device token
    setNotFound(true); setNotFoundKind('substitute'); setGuestConfirmed(false);
    setSubName(deviceMatch.substitute.name);
    setRecognizedSubPhone(deviceMatch.substitute.phone || '');
    setSubForMember(null);
  };

  // Substitute: look up the member being stood in for by their mobile number.
  const lookupSubMember = async () => {
    const v = validatePhoneByCountry(pmNum, pmCc);
    if (!v.isValid) { setErr(v.error || "Enter the member's mobile number."); return; }
    setErr(null); setSubLookupLoading(true);
    try {
      const r = await sessionCheckinApi.lookup(token, fullPhone(pmNum, pmCc));
      if (r.found && r.member) setSubForMember(r.member);
      else setErr("That number isn't on the member roster. Check with the chair.");
    } catch { setErr('Lookup failed. Try again.'); }
    finally { setSubLookupLoading(false); }
  };

  const resetIdentity = () => {
    setMember(null); setAlreadyChecked(false); setNotFound(false); setNotFoundKind('choose'); setGuestConfirmed(false);
    setHistory(null); setSubForMember(null); setSubName(''); setPmNum(''); setPoNum('');
    setFirstTimerName(''); setGuestCompany(''); setGuestEmail(''); setErr(null);
    setP1Num(''); setPayEventId(''); setUpiRef(''); setStatus('present');
    // Forget this browser too — "not you" means the next scan should ask again.
    setDeviceMatch(null); setDeviceDismissed(true); setDeviceConfirming(false);
    setRecognizedMemberPhone(''); setRecognizedSubPhone(''); setRecognizedGuestPhone('');
    setDeviceToken(forgetDeviceToken());
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
    const hasSession = !!resolve?.occurrence;
    // Already checked in: nothing to record unless they're paying a due.
    if (member && alreadyChecked && !payEventId) { setDone(true); return; }
    // Dues-only mode (no session today): only a payment declaration can be
    // submitted — the backend records it without touching attendance.
    if (!hasSession && !payEventId) { setErr('There is no session today — select a due to record a payment.'); return; }
    // Smart-form questions only apply to a fresh check-in on a session day.
    if (hasSession && !alreadyChecked && !validateForm()) { setErr('Please answer the required questions.'); return; }
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
        // Recognised member (typed phone, or silently via device recognition)
        await sessionCheckinApi.submit(token, {
          member_id: member.contact_id,
          member_name: member.name,
          member_phone: recognizedMemberPhone || phone,
          status, payment, responses: fullResponses, ...formIds,
          device_token: deviceToken,
        });
      } else if (notFoundKind === 'substitute' && subForMember) {
        // Standing in for a member → member marked present, substitute saved
        // as that member's Alternative Contact Person.
        await sessionCheckinApi.substitute(token, {
          member_id: subForMember.contact_id,
          sub_name: subName,
          sub_phone: recognizedSubPhone || fullPhone(poNum, poCc),
          status, responses: fullResponses, ...formIds,
          device_token: deviceToken,
        });
      } else {
        // Guest → own contact tagged 'guest'
        await sessionCheckinApi.guest(token, {
          name: firstTimerName,
          phone: recognizedGuestPhone || phone,
          company: guestCompany || undefined,
          email: guestEmail || undefined,
          status, responses: fullResponses, ...formIds,
          device_token: deviceToken,
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
  const tenantName = resolve?.business_name;
  const occ = resolve?.occurrence;
  // Substitute/guest device recognition needs a one-tap confirm before it's
  // treated as identified; member recognition is silent (member is already
  // set by applyMemberMatch by the time this would matter).
  const showDeviceConfirm = !!deviceMatch && deviceMatch.role !== 'member' && !deviceDismissed && !deviceConfirming && !atStep2;

  const inputStyle = INPUT_STYLE;
  const labelStyle = LABEL_STYLE;

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
  if (loading) return <Shell chapterName={chapterName} tenantName={tenantName}><Card>Loading…</Card></Shell>;
  if (err && !resolve) return <Shell chapterName={chapterName} tenantName={tenantName}><Card><p style={{ color: BRAND.err, margin: 0 }}>{err}</p></Card></Shell>;

  if (done) {
    return (
      <Shell chapterName={chapterName} tenantName={tenantName}>
        <Card pad={24}>
          <div style={{ width: 68, height: 68, margin: '4px auto 10px', borderRadius: '50%', background: '#ECFDF3',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>✅</div>
          <h2 style={{ textAlign: 'center', margin: '4px 0', color: BRAND.ink }}>
            {!occ ? 'Payment recorded' : alreadyChecked && !payEventId ? "You're all set" : "You're checked in"}
          </h2>
          <p style={{ textAlign: 'center', color: BRAND.sub, marginTop: 4, fontSize: 14 }}>
            {!occ
              ? 'No session today — no attendance was recorded.'
              : alreadyChecked
              ? `Attendance already recorded for ${fmtDate(occ?.date)}.`
              : `${status === 'present' ? 'Marked present' : 'Marked apologies'} for ${fmtDate(occ?.date)}.`}
          </p>
          {payEventId && (
            <div style={{ marginTop: 14, background: BRAND.accentSoft, borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: BRAND.accentInk, fontWeight: 600 }}>Payment recorded as pending</div>
              <div style={{ fontSize: 12.5, color: BRAND.sub, marginTop: 2 }}>The chair will confirm it offline.</div>
            </div>
          )}
          <button onClick={() => { try { window.close(); } catch { /* ignore */ } }}
            style={{ width: '100%', marginTop: 18, padding: 14, border: 'none', borderRadius: 12,
              background: BRAND.accent, color: '#fff', fontWeight: 800, fontSize: 15.5, cursor: 'pointer' }}>
            Close
          </button>
          <button onClick={() => { setDone(false); resetIdentity(); }}
            style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: BRAND.sub, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            Check in someone else
          </button>
          <p style={{ textAlign: 'center', color: BRAND.sub, fontSize: 11.5, marginTop: 10, marginBottom: 0 }}>
            You can now close this tab.
          </p>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell chapterName={chapterName} tenantName={tenantName}>
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
            <div style={{ fontSize: 12, color: BRAND.sub, marginTop: 8 }}>
              Check-in opens on the session day — but you can still view and settle your dues below.
              For a past session, please ask the chapter to mark you.
            </div>
          </>
        )}
      </Card>

      {/* Recognised this browser as a substitute or guest — one-tap confirm */}
      {showDeviceConfirm && deviceMatch?.role === 'substitute' && deviceMatch.substitute && deviceMatch.last_member && (
        <Card>
          <div style={{ fontWeight: 800, color: BRAND.ink, fontSize: 16 }}>Welcome back, {deviceMatch.substitute.name}</div>
          <p style={{ marginTop: 6, color: BRAND.sub, fontSize: 13.5 }}>
            Standing in for <strong style={{ color: BRAND.ink }}>{deviceMatch.last_member.name}</strong> again today?
          </p>
          <button onClick={confirmDeviceSubstitute}
            style={{ width: '100%', marginTop: 12, padding: 13, border: 'none', borderRadius: 12,
              background: BRAND.accent, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            Yes, continue
          </button>
          <button onClick={substituteDifferentMemberToday}
            style={{ width: '100%', marginTop: 10, padding: 12, border: `1px solid ${BRAND.field}`, borderRadius: 12,
              background: '#fff', color: BRAND.ink, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Different member today
          </button>
          <button onClick={dismissDeviceMatch}
            style={{ marginTop: 10, width: '100%', background: 'none', border: 'none', color: BRAND.sub, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            Not you? Use your number instead
          </button>
        </Card>
      )}

      {showDeviceConfirm && deviceMatch?.role === 'guest' && deviceMatch.guest && (
        <Card>
          <div style={{ fontWeight: 800, color: BRAND.ink, fontSize: 16 }}>Welcome back, {deviceMatch.guest.name}</div>
          <p style={{ marginTop: 6, color: BRAND.sub, fontSize: 13.5 }}>Check in as a guest again today?</p>
          <button onClick={confirmDeviceGuest}
            style={{ width: '100%', marginTop: 12, padding: 13, border: 'none', borderRadius: 12,
              background: BRAND.accent, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            Yes, continue
          </button>
          <button onClick={dismissDeviceMatch}
            style={{ marginTop: 10, width: '100%', background: 'none', border: 'none', color: BRAND.sub, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            Not you? Use your number instead
          </button>
        </Card>
      )}

      {/* Step 1 · identify (skipped while device recognition is still checking, or once it found a match above) */}
      {!atStep2 && !notFound && !showDeviceConfirm && (
        <Card>
          {deviceChecking ? (
            <p style={{ fontSize: 13.5, color: BRAND.sub, textAlign: 'center', margin: 0 }}>Checking this device…</p>
          ) : (
            <>
              <PhoneField label="Your mobile number" cc={p1Cc} num={p1Num} onCc={setP1Cc} onNum={setP1Num} onEnter={identify} />
              {err && <p style={{ color: BRAND.err, fontSize: 13, marginBottom: 0, marginTop: 8 }}>{err}</p>}
              <button onClick={identify} disabled={checking}
                style={{ width: '100%', marginTop: 14, padding: 14, border: 'none', borderRadius: 12,
                  background: BRAND.accent, color: '#fff', fontWeight: 800, fontSize: 15.5, cursor: 'pointer',
                  opacity: checking ? 0.7 : 1 }}>
                {checking ? 'Checking…' : 'Continue'}
              </button>
              <p style={{ fontSize: 12, color: BRAND.sub, textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
                We use your number to recognise you on the roster.
              </p>
            </>
          )}
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
                <button onClick={() => { setNotFoundKind('substitute'); setPoCc(p1Cc); setPoNum(p1Num); }}
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
                  <PhoneField label="Member's mobile number" cc={pmCc} num={pmNum} onCc={setPmCc} onNum={setPmNum} onEnter={lookupSubMember} />
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
                  {recognizedSubPhone ? (
                    <p style={{ marginTop: 12, fontSize: 12.5, color: BRAND.sub }}>Mobile: {recognizedSubPhone}</p>
                  ) : (
                    <div style={{ marginTop: 12 }}>
                      <PhoneField label="Your mobile number" cc={poCc} num={poNum} onCc={setPoCc} onNum={setPoNum} required />
                    </div>
                  )}
                  <button onClick={() => { const phoneOk = !!recognizedSubPhone || validatePhoneByCountry(poNum, poCc).isValid; if (subName.trim() && phoneOk) setGuestConfirmed(true); else setErr('Enter your name and a valid mobile number.'); }} disabled={!subName.trim()}
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

            {alreadyChecked ? (
              <div style={{ marginTop: 14, background: '#ECFDF3', border: '1px solid #A7F3D0', borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700, color: '#047857', fontSize: 14 }}>✓ You've already checked in{occ ? ` for ${fmtDate(occ.date)}` : ''}</div>
                <div style={{ fontSize: 12.5, color: BRAND.sub, marginTop: 2 }}>
                  {openDues.length > 0 ? 'You can still settle your dues below.' : 'Nothing else to do — you’re all set.'}
                </div>
              </div>
            ) : occ ? (
              <>
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
              </>
            ) : (
              // Dues-only mode: no session today, so no attendance to mark —
              // the member can still review and settle dues below.
              <div style={{ marginTop: 14, background: BRAND.accentSoft, borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700, color: BRAND.accentInk, fontSize: 14 }}>No session today</div>
                <div style={{ fontSize: 12.5, color: BRAND.sub, marginTop: 2 }}>
                  You can view and settle your dues below — no attendance will be recorded.
                </div>
              </div>
            )}
          </Card>

          {/* Smart Form questions (tenant-configurable) — only on a fresh
              check-in on a session day (dues-only mode records no attendance) */}
          {!alreadyChecked && !!occ && formFields.length > 0 && (
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
              {payEventId && (() => {
                const due = openDues.find((d) => d.event_id === payEventId);
                const amount = due?.amount;
                const note = `${chapterName} — ${due?.label || 'dues'}`;
                const canPay = !!payCfg?.configured && !!payCfg.upi_id;
                const url = canPay ? upiPayUrl(payCfg!.upi_id!, payCfg!.payee_name, amount, note) : '';
                let qrSvg = '';
                if (canPay) { try { qrSvg = QrCode.encodeText(url, 'MEDIUM').toSvgString(1, '#111827', '#ffffff'); } catch { qrSvg = ''; } }
                return (
                  <div style={{ marginTop: 14, borderTop: `1px solid #F1F1F3`, paddingTop: 14 }}>
                    {canPay && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setPendingPayUrl(url); setPayConfirmOpen(true); }}
                          style={{ display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none', padding: 13, borderRadius: 12,
                            background: BRAND.accent, color: '#fff', fontWeight: 800, fontSize: 15.5, border: 'none', cursor: 'pointer' }}>
                          Pay {money(amount, due?.currency)} now
                        </button>
                        <p style={{ fontSize: 12, color: BRAND.sub, textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
                          Opens your UPI app (GPay / PhonePe / Paytm).
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12,
                          background: '#F8FAFC', border: `1px solid ${BRAND.line}`, borderRadius: 12, padding: 12 }}>
                          {qrSvg && <div style={{ width: 84, height: 84, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: qrSvg }} />}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: BRAND.sub }}>Or scan to pay</div>
                            <div style={{ fontWeight: 700, color: BRAND.ink, fontSize: 13.5, wordBreak: 'break-all' }}>{payCfg!.upi_id}</div>
                            {payCfg!.payee_name && <div style={{ fontSize: 12, color: BRAND.sub }}>{payCfg!.payee_name}</div>}
                          </div>
                        </div>
                      </>
                    )}
                    {showReturnNudge && (
                      <div style={{ marginTop: 12, background: BRAND.accentSoft, border: `1px solid ${BRAND.accent}44`, borderRadius: 10, padding: 11 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: BRAND.accentInk }}>Back from paying?</div>
                        <div style={{ fontSize: 12, color: BRAND.sub, marginTop: 2 }}>
                          Enter your UPI reference below and tap Record payment — it isn't recorded until you do.
                        </div>
                      </div>
                    )}
                    <div style={{ marginTop: canPay ? 14 : 0 }}>
                      <label style={labelStyle}>UPI reference {canPay ? '(after paying)' : '(after paying the chapter UPI)'}</label>
                      <input value={upiRef} onChange={(e) => { setUpiRef(e.target.value); setShowReturnNudge(false); }} placeholder="e.g. 4098XXXX2231" style={inputStyle} />
                      <p style={{ fontSize: 12, color: BRAND.sub, marginBottom: 0, marginTop: 6 }}>
                        The chair will confirm your payment offline.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </Card>
          )}

          {err && <p style={{ color: BRAND.err, fontSize: 13 }}>{err}</p>}
          <button onClick={submit} disabled={submitting || (!occ && !payEventId)}
            style={{ width: '100%', padding: 15, border: 'none', borderRadius: 13,
              background: (occ || payEventId) ? BRAND.accent : '#9CA3AF', color: '#fff', fontWeight: 800, fontSize: 16.5, cursor: (occ || payEventId) ? 'pointer' : 'not-allowed',
              boxShadow: (occ || payEventId) ? '0 6px 16px -4px rgba(218,100,16,0.5)' : 'none', opacity: submitting ? 0.75 : 1 }}>
            {submitting ? 'Submitting…'
              : !occ ? (payEventId ? 'Record payment' : 'Select a due to pay')
              : alreadyChecked ? (payEventId ? 'Record payment' : 'Done')
              : 'Check in'}
          </button>
          <button onClick={resetIdentity}
            style={{ marginTop: 12, width: '100%', background: 'none', border: 'none', color: BRAND.sub, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            ← Not you? Start over
          </button>

          {/* Sets expectations before the user leaves for their UPI app —
              there's no callback that tells this page a payment succeeded,
              so without this a user can easily assume it's automatic and
              never come back to declare it. */}
          {payConfirmOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}
              onClick={() => setPayConfirmOpen(false)}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 20, maxWidth: 360, width: '100%' }}
                onClick={(e) => e.stopPropagation()}>
                <div style={{ fontWeight: 800, fontSize: 16, color: BRAND.ink, marginBottom: 8 }}>Before you pay</div>
                <p style={{ fontSize: 13.5, color: BRAND.sub, marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
                  This opens your UPI app to pay. <strong style={{ color: BRAND.ink }}>The payment isn't recorded automatically</strong> —
                  once you've paid, come back here, enter the UPI reference number, and tap <strong style={{ color: BRAND.ink }}>Record payment</strong> so the chair knows.
                </p>
                <a href={pendingPayUrl}
                  onClick={() => { setPaymentAttempted(true); setPayConfirmOpen(false); }}
                  style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: 13, borderRadius: 12,
                    background: BRAND.accent, color: '#fff', fontWeight: 800, fontSize: 15 }}>
                  Continue to pay
                </a>
                <button onClick={() => setPayConfirmOpen(false)}
                  style={{ marginTop: 10, width: '100%', background: 'none', border: 'none', color: BRAND.sub, fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 8 }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
};

export default SessionCheckinPage;
