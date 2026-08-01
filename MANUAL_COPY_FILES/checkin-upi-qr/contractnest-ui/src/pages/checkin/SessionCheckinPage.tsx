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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  sessionCheckinApi, getOrCreateDeviceToken, forgetDeviceToken,
  type CheckinResolve, type CheckinMember, type CheckinHistory, type BillingRow,
  type CheckinForm, type CheckinField, type CheckinFormSchema, type CheckinPaymentConfig,
  type CheckinDeviceLookup, type CheckinGuestService, type CheckinMemberSearchResult,
} from './useSessionCheckin';
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

// Platform brand card — ContractNest's own identity, sitting above the
// tenant's branding. Deliberately a solid card (not a text strip): this page
// is a high-frequency, multi-tenant touchpoint (every chapter's members see
// it every week), so brand propagation here has real reach even though it
// doesn't move this page's own check-in conversion.
const PLATFORM_BLUE = '#0EA5E9';
const PlatformCard: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: `linear-gradient(135deg, ${PLATFORM_BLUE}, #0369A1)`,
    borderRadius: 16, padding: '13px 16px', marginBottom: 14, boxShadow: '0 10px 22px -8px rgba(14,165,233,0.5)' }}>
    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.16)', flex: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 9L12 4L18 9V20H6V9Z" stroke="#fff" strokeWidth="2" />
        <path d="M9 16H15" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 13H15" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
    <div>
      <div style={{ fontSize: 16.5, fontWeight: 800, color: '#fff', letterSpacing: 0.2 }}>ContractNest</div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.88)', marginTop: 1 }}>Secure session check-in</div>
    </div>
    <div style={{ marginLeft: 'auto', flex: 'none', fontSize: 10.5, fontWeight: 800, color: '#fff',
      background: 'rgba(255,255,255,0.18)', borderRadius: 999, padding: '4px 10px', letterSpacing: 0.3 }}>
      ✓ Verified
    </div>
  </div>
);

const Shell: React.FC<{ chapterName: string; tenantName?: string; children: React.ReactNode }> = ({ chapterName, tenantName, children }) => (
  <div style={{ minHeight: '100vh', background: BRAND.bg, padding: '20px 16px 40px' }}>
    <div style={{ maxWidth: 460, margin: '0 auto' }}>
      <PlatformCard />
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

// 3-step nav (Identify → Payment → Check-in). Payment is skipped visually
// when there's nothing to pay (no open dues / no guest-payable services) —
// callers only render this once identity is resolved.
type UiStep = 'identify' | 'payment' | 'checkin';
const StepPills: React.FC<{ step: UiStep; showPayment: boolean }> = ({ step, showPayment }) => {
  const steps: { key: UiStep; label: string }[] = showPayment
    ? [{ key: 'identify', label: 'Identify' }, { key: 'payment', label: 'Payment' }, { key: 'checkin', label: 'Check-in' }]
    : [{ key: 'identify', label: 'Identify' }, { key: 'checkin', label: 'Check-in' }];
  const order = steps.map((s) => s.key);
  const idx = order.indexOf(step);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: 8, marginBottom: 16 }}>
      {steps.map((s, i) => {
        const active = s.key === step;
        const done = i < idx;
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 10px', borderRadius: 12,
            border: `1px solid ${active ? BRAND.accent : BRAND.line}`, background: active ? BRAND.accentSoft : '#fff' }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11.5, fontWeight: 800, flex: 'none', background: done ? BRAND.ok : active ? BRAND.accent : BRAND.line,
              color: done || active ? '#fff' : BRAND.sub }}>
              {done ? '✓' : i + 1}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: active ? BRAND.accentInk : done ? BRAND.ink : BRAND.sub }}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
};

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

  // Guest payment: standalone catalog services the tenant flagged
  // guestPayable (not hardcoded), fetched once per token. A guest has no
  // contract, so they pick one of these instead of "paying a due".
  const [guestServices, setGuestServices] = useState<CheckinGuestService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  // Guest referrer: which member brought them, tagged via name search.
  const [referredByQuery, setReferredByQuery] = useState('');
  const [referredByResults, setReferredByResults] = useState<CheckinMemberSearchResult[]>([]);
  const [referredById, setReferredById] = useState<string>('');

  // 3-step nav: has the member/guest moved past the Payment step (by paying
  // or explicitly skipping)? Resets whenever identity resets.
  const [paymentStepDone, setPaymentStepDone] = useState(false);

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
  const [payAmount, setPayAmount] = useState<string>('');
  const [selectedCadence, setSelectedCadence] = useState<string | null>(null);
  const [upiRef, setUpiRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // React state updates aren't synchronous -- a fast double-tap can invoke
  // submit() twice before the "submitting" state re-render disables the
  // button. A ref is read/written synchronously, so it closes that gap even
  // on the very first click.
  const submitLockRef = useRef(false);
  const [done, setDone] = useState(false);
  // The member pays manually in their own UPI app (see renderPayBlock) --
  // there's no callback telling this page a payment succeeded, so a
  // visibility-change nudge reminds them to come back and enter the
  // reference once they switch back to this tab.
  const [paymentAttempted, setPaymentAttempted] = useState(false);
  const [showReturnNudge, setShowReturnNudge] = useState(false);
  const [copiedVpa, setCopiedVpa] = useState(false);

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
    (async () => {
      try { const gs = await sessionCheckinApi.guestServices(token); if (alive && gs?.ok) setGuestServices(gs.services || []); }
      catch { /* optional -- tenant may not have configured any guest-payable service */ }
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

  // Full billing timeline, oldest first — the RPC already sorts by
  // scheduled_date. This is the real cadence: which periods are paid, which
  // is next, and when — no separate "pick monthly or quarterly" abstraction,
  // because the contract is already ON one cadence and these ARE its events.
  const billingTimeline = history?.billing || [];
  const openDues = useMemo<BillingRow[]>(
    () => billingTimeline.filter((b) => isOpen(b.status)),
    [billingTimeline]
  );
  const paidEvents = useMemo<BillingRow[]>(
    () => billingTimeline.filter((b) => b.status === 'paid'),
    [billingTimeline]
  );
  // Earliest open due is the only thing a payment can settle against right
  // now — matches how the seller-side ledger applies money (oldest first).
  // It's the sole payable amount: no picker, because there's no real choice
  // here — it's exactly what this event was priced at.
  const targetDue = openDues[0] || null;
  const [showSchedule, setShowSchedule] = useState(false);

  // Auto-target the next due the moment it's known — paying it isn't a
  // decision the member makes among options, so there's nothing to tap
  // before the "Pay" action becomes available.
  useEffect(() => {
    if (targetDue) {
      setPayEventId(targetDue.event_id);
      setPayAmount(String(targetDue.remaining ?? targetDue.amount));
    } else {
      setPayEventId(''); setPayAmount('');
    }
    setSelectedCadence(null);
  }, [targetDue?.event_id, targetDue?.remaining, targetDue?.amount]);

  // Flattened, condition-filtered form fields (minus the attendance control we
  // render ourselves and any pure-layout blocks we still show as text).
  const formFields = useMemo<CheckinField[]>(() => {
    const schema: CheckinFormSchema | undefined = form?.schema;
    if (!schema) return [];
    return schema.sections.flatMap((s) => s.fields).filter((f) => !ATTENDANCE_FIELD_IDS.has(f.id));
  }, [form]);

  const atStep2 = !!member || (notFound && guestConfirmed);
  const isGuestPath = !member && notFoundKind === 'guest' && guestConfirmed;
  const selectedService = guestServices.find((s) => s.id === selectedServiceId) || null;
  // A substitute has no dues/services of their own to show (matches
  // gs_checkin_substitute today -- it records attendance only, no payment) --
  // the Payment step only exists when there's something to actually pay.
  const hasPaymentStepContent = (!!member && openDues.length > 0) || (isGuestPath && guestServices.length > 0);
  const uiStep: UiStep = !atStep2 ? 'identify' : (hasPaymentStepContent && !paymentStepDone) ? 'payment' : 'checkin';
  // payEventId/selectedServiceId auto-populate for display (so the due/service
  // card can render) -- they are not by themselves a signal of payment intent.
  // Only tapping "Pay now" or typing a UPI reference means a payment was
  // actually intended.
  const hasMemberPaymentIntent = !!payEventId && (paymentAttempted || !!upiRef);
  const hasGuestPaymentIntent = !!selectedServiceId && (paymentAttempted || !!upiRef);
  const hasAnyPaymentIntent = hasMemberPaymentIntent || (isGuestPath && hasGuestPaymentIntent);

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

  // Search roster members by name for the guest "Referred by" field.
  const searchReferrer = async (q: string) => {
    setReferredByQuery(q);
    setReferredById('');
    if (q.trim().length < 2) { setReferredByResults([]); return; }
    try {
      const r = await sessionCheckinApi.searchMembers(token, q.trim());
      if (r?.ok) setReferredByResults(r.members || []);
    } catch { /* search is optional */ }
  };

  const resetIdentity = () => {
    setMember(null); setAlreadyChecked(false); setNotFound(false); setNotFoundKind('choose'); setGuestConfirmed(false);
    setHistory(null); setSubForMember(null); setSubName(''); setPmNum(''); setPoNum('');
    setFirstTimerName(''); setGuestCompany(''); setGuestEmail(''); setErr(null);
    setP1Num(''); setPayEventId(''); setPayAmount(''); setSelectedCadence(null); setUpiRef(''); setStatus('present');
    setSelectedServiceId(''); setReferredByQuery(''); setReferredByResults([]); setReferredById(''); setPaymentStepDone(false);
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
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setErr(null);
    const hasSession = !!resolve?.occurrence;
    // Already checked in: nothing to record unless they're paying.
    if (member && alreadyChecked && !hasMemberPaymentIntent) { submitLockRef.current = false; setDone(true); return; }
    // Dues-only mode (no session today): only a payment declaration can be
    // submitted -- the backend records it without touching attendance.
    if (!hasSession && !hasAnyPaymentIntent) { submitLockRef.current = false; setErr('There is no session today -- tap "Pay now" or enter your UPI reference to record a payment.'); return; }
    // Smart-form questions only apply to a fresh check-in on a session day.
    if (hasSession && !alreadyChecked && !validateForm()) { submitLockRef.current = false; setErr('Please answer the required questions.'); return; }
    setSubmitting(true);
    try {
      const payment = hasMemberPaymentIntent
        ? { billing_event_id: payEventId, upi_reference: upiRef || undefined,
            amount: Number(payAmount) || openDues.find((d) => d.event_id === payEventId)?.amount }
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
        // Guest -- own contact tagged 'guest'. Payment (if any) is a
        // standalone catalog service, not a contract due -- no billing_event.
        const guestPayment = hasGuestPaymentIntent && selectedService
          ? { cat_block_id: selectedService.id, amount: selectedService.price, currency: selectedService.currency, upi_reference: upiRef || undefined }
          : null;
        await sessionCheckinApi.guest(token, {
          name: firstTimerName,
          phone: recognizedGuestPhone || phone,
          company: guestCompany || undefined,
          email: guestEmail || undefined,
          status, responses: fullResponses, ...formIds,
          device_token: deviceToken,
          referred_by: referredById || null,
          payment: guestPayment,
        });
      }
      setDone(true);
    } catch (e: any) {
      const reason = e?.response?.data?.message;
      setErr(reason === 'no_session_today' ? 'There is no session scheduled for today.' : (reason || 'Check-in failed.'));
    } finally { submitLockRef.current = false; setSubmitting(false); }
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

  // Shared UPI pay button + QR + reference field -- used by both the
  // member-dues Payment step and the guest-service Payment step, so the
  // deep-link/QR/return-nudge logic only lives in one place.
  // A hand-built upi://pay link/QR is unsigned -- GPay (and likely other UPI
  // apps) rejects payments to this tenant's VPA with "Payments to this
  // receiver are not allowed by UPI network" when it arrives that way, even
  // though the exact same VPA works fine via the bank's own signed QR poster.
  // Only the bank/PSP holds the signing key, so we can't reproduce that here.
  // The reliable path is the member's own UPI app's built-in "Pay to UPI ID"
  // entry -- that's the app itself constructing a first-party request, not
  // an external deep link, so the same rejection doesn't apply.
  // Gated sequence, not everything shown at once: (1) copy the UPI ID and
  // tap "Open UPI app" -- only then does (2) the reference field + "Confirm
  // payment" appear, and only confirming that advances past this step.
  // "Open UPI app" best-effort launches the device's UPI app via a bare
  // upi://pay (no payee params, so nothing for GPay's signature check to
  // reject) -- if nothing opens (desktop, no UPI app registered), the
  // instructions below already cover opening it manually.
  const renderPayBlock = (amount: number, currency: string | undefined) => {
    const canPay = !!payCfg?.configured && !!payCfg.upi_id;
    const copyVpa = () => {
      if (!payCfg?.upi_id) return;
      navigator.clipboard?.writeText(payCfg.upi_id).catch(() => { /* clipboard unavailable -- VPA is still shown for manual copy */ });
      setCopiedVpa(true);
      window.setTimeout(() => setCopiedVpa(false), 2000);
    };
    const openUpiApp = () => {
      copyVpa();
      setPaymentAttempted(true);
      try { window.location.href = 'upi://pay'; } catch { /* no UPI app registered -- instructions below cover a manual open */ }
    };

    // Build the full upi://pay?... URL for the on-page QR. Scanning this QR
    // with a UPI app prefills payee + amount + note in one step, which is
    // the biggest ergonomic win over "Open UPI app" (bare intent that then
    // requires manual VPA + amount entry inside the UPI app). NB: our
    // constructed URL is unsigned, so some UPI apps (notably GPay for
    // personal VPAs) may still reject even when scanned rather than tapped
    // -- if that happens the user still has the "Open UPI app" +
    // manual-reference fallback below. `mc=0000` = generic merchant category
    // code (mandatory per NPCI spec even on personal-account intents).
    const upiPayUrl = ((): string | null => {
      const vpa = payCfg?.upi_id;
      if (!vpa) return null;
      const params = new URLSearchParams();
      params.set('pa', vpa);
      if (payCfg?.payee_name) params.set('pn', payCfg.payee_name);
      params.set('am', String(amount));
      params.set('cu', currency || 'INR');
      const note = `${payCfg?.payee_name || 'Chapter'} check-in ${(new Date().toISOString().slice(0, 10))}`;
      params.set('tn', note);
      params.set('mc', '0000');
      return `upi://pay?${params.toString()}`;
    })();

    const onQrScan = () => {
      // Scanning the QR is a payment intent -- flip the same state the
      // "Open UPI app" tap flips so the reference-input step appears when
      // the user comes back.
      copyVpa();
      setPaymentAttempted(true);
    };
    if (!canPay) {
      return (
        <div style={{ marginTop: 14, borderTop: `1px solid #F1F1F3`, paddingTop: 14 }}>
          <label style={labelStyle}>UPI reference (after paying the chapter UPI)</label>
          <input value={upiRef} onChange={(e) => setUpiRef(e.target.value)} placeholder="e.g. 4098XXXX2231" style={inputStyle} />
          <p style={{ fontSize: 12, color: BRAND.sub, marginBottom: 0, marginTop: 6 }}>
            The chair will confirm your payment offline.
          </p>
        </div>
      );
    }
    return (
      <div style={{ marginTop: 14, borderTop: `1px solid #F1F1F3`, paddingTop: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: BRAND.ink, marginBottom: 8 }}>
          Pay {money(amount, currency)} via your UPI app
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          background: '#F8FAFC', border: `1px solid ${BRAND.line}`, borderRadius: 12, padding: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, color: BRAND.sub, fontWeight: 600 }}>UPI ID</div>
            <div style={{ fontWeight: 800, color: BRAND.ink, fontSize: 14.5, wordBreak: 'break-all' }}>{payCfg!.upi_id}</div>
            {payCfg!.payee_name && <div style={{ fontSize: 12, color: BRAND.sub, marginTop: 1 }}>{payCfg!.payee_name}</div>}
          </div>
          <button type="button" onClick={copyVpa}
            style={{ flex: 'none', padding: '9px 14px', borderRadius: 10, border: `1.5px solid ${BRAND.accent}`,
              background: copiedVpa ? BRAND.accent : '#fff', color: copiedVpa ? '#fff' : BRAND.accentInk,
              fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            {copiedVpa ? 'Copied' : 'Copy'}
          </button>
        </div>

        {!paymentAttempted ? (
          <>
            {upiPayUrl && (
              <div style={{ marginTop: 14, background: '#fff', border: `1px solid ${BRAND.line}`,
                borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: BRAND.ink, marginBottom: 10, textAlign: 'center' }}>
                  Scan with any UPI app to pay
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={onQrScan}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onQrScan(); }}
                  title="Tap after scanning to reveal the confirmation step"
                  style={{ cursor: 'pointer', padding: 8, borderRadius: 8, background: '#fff' }}
                >
                  <QRCodeSVG value={upiPayUrl} size={192} level="M" includeMargin={false} />
                </div>
                <div style={{ fontSize: 11.5, color: BRAND.sub, marginTop: 10, textAlign: 'center', lineHeight: 1.4 }}>
                  Opens payee, amount and note pre-filled.<br />Tap the QR after scanning to enter your UPI reference.
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, color: BRAND.sub, fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: BRAND.line }} />
              <span>or</span>
              <div style={{ flex: 1, height: 1, background: BRAND.line }} />
            </div>
            <button type="button" onClick={openUpiApp}
              style={{ width: '100%', marginTop: 12, padding: 13, border: `1.5px solid ${BRAND.accent}`, borderRadius: 12,
                background: '#fff', color: BRAND.accentInk, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              Open UPI app
            </button>
            <p style={{ fontSize: 12, color: BRAND.sub, textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
              Copies the UPI ID and tries to open your UPI app. If nothing opens, launch GPay / PhonePe / any UPI app yourself and choose "Pay to UPI ID."
            </p>
          </>
        ) : (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: BRAND.ok, marginBottom: 10 }}>
              <span>✓</span><span>Complete the payment in your app, then confirm below</span>
            </div>
            {showReturnNudge && (
              <div style={{ marginBottom: 10, background: BRAND.accentSoft, border: `1px solid ${BRAND.accent}44`, borderRadius: 10, padding: 11 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: BRAND.accentInk }}>Back from paying?</div>
                <div style={{ fontSize: 12, color: BRAND.sub, marginTop: 2 }}>
                  Enter your UPI reference below and tap Confirm payment.
                </div>
              </div>
            )}
            <label style={labelStyle}>UPI reference</label>
            <input value={upiRef} onChange={(e) => { setUpiRef(e.target.value); setShowReturnNudge(false); }} placeholder="e.g. 4098XXXX2231" style={inputStyle} autoFocus />
            <button type="button" onClick={() => { if (upiRef.trim()) setPaymentStepDone(true); }} disabled={!upiRef.trim()}
              style={{ width: '100%', marginTop: 12, padding: 13, border: 'none', borderRadius: 12,
                background: upiRef.trim() ? BRAND.accent : '#9CA3AF', color: '#fff', fontWeight: 800, fontSize: 15,
                cursor: upiRef.trim() ? 'pointer' : 'not-allowed' }}>
              Confirm payment
            </button>
            <p style={{ fontSize: 12, color: BRAND.sub, textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
              The chair will confirm it offline once you check in.
            </p>
          </div>
        )}
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
            {!occ ? 'Payment recorded' : alreadyChecked && !hasMemberPaymentIntent ? "You're all set" : "You're checked in"}
          </h2>
          <p style={{ textAlign: 'center', color: BRAND.sub, marginTop: 4, fontSize: 14 }}>
            {!occ
              ? 'No session today — no attendance was recorded.'
              : alreadyChecked
              ? `Attendance already recorded for ${fmtDate(occ?.date)}.`
              : `${status === 'present' ? 'Marked present' : 'Marked apologies'} for ${fmtDate(occ?.date)}.`}
          </p>
          {hasMemberPaymentIntent && (
            <div style={{ marginTop: 14, background: BRAND.accentSoft, borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 15, color: BRAND.accentInk, fontWeight: 800 }}>{money(Number(payAmount))} recorded as pending</div>
              <div style={{ fontSize: 12.5, color: BRAND.sub, marginTop: 2 }}>The chair will confirm it offline.</div>
            </div>
          )}
          {hasGuestPaymentIntent && selectedService && (
            <div style={{ marginTop: 14, background: BRAND.accentSoft, borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 15, color: BRAND.accentInk, fontWeight: 800 }}>{money(selectedService.price, selectedService.currency)} recorded as pending</div>
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
      <StepPills step={uiStep} showPayment={hasPaymentStepContent} />
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
              <div style={{ marginTop: 12, position: 'relative' }}>
                <label style={labelStyle}>Referred by <span style={{ color: BRAND.err }}>*</span></label>
                <input value={referredByQuery} onChange={(e) => searchReferrer(e.target.value)}
                  placeholder="Search member by name..." autoComplete="off" style={inputStyle} />
                {referredById && (
                  <div style={{ fontSize: 12, color: BRAND.ok, fontWeight: 700, marginTop: 5 }}>Selected: {referredByQuery}</div>
                )}
                {!referredById && referredByResults.length > 0 && (
                  <div style={{ marginTop: 6, border: `1px solid ${BRAND.line}`, borderRadius: 10, overflow: 'hidden' }}>
                    {referredByResults.map((m) => (
                      <div key={m.contact_id}
                        onClick={() => { setReferredById(m.contact_id); setReferredByQuery(m.name); setReferredByResults([]); }}
                        style={{ padding: '10px 12px', fontSize: 13.5, cursor: 'pointer', borderBottom: `1px solid ${BRAND.line}` }}>
                        {m.name}
                      </div>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: 12, color: BRAND.sub, marginTop: 5, marginBottom: 0 }}>
                  Which member brought this guest -- tags the fee to them.
                </p>
              </div>
              <button onClick={() => { if (firstTimerName.trim() && referredById) setGuestConfirmed(true); }} disabled={!firstTimerName.trim() || !referredById}
                style={{ width: '100%', marginTop: 16, padding: 13, border: 'none', borderRadius: 12,
                  background: (firstTimerName.trim() && referredById) ? BRAND.accent : '#9CA3AF', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
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
            {isGuestPath && referredByQuery && (
              <div style={{ fontSize: 12.5, color: BRAND.sub, marginTop: 3 }}>
                Referred by <strong style={{ color: BRAND.ink }}>{referredByQuery}</strong>
              </div>
            )}
          </Card>

          {/* Payment step -- member dues, or a guest's standalone service pick.
              A substitute has no payment content of their own (matches
              gs_checkin_substitute today), so this step just doesn't render
              for them and uiStep goes straight to 'checkin'. */}
          {uiStep === 'payment' && (
            <>
              {member && (
                <Card>
                  <div style={{ fontWeight: 800, color: BRAND.ink, marginBottom: 8 }}>Your dues</div>

                  {history?.totals && (history.totals.total_paid > 0 || history.totals.balance > 0) && (
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                      <div style={{ flex: 1, background: '#F8FAFC', border: `1px solid ${BRAND.line}`, borderRadius: 12, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: BRAND.sub, fontWeight: 600 }}>TOTAL PAID</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: BRAND.ok, marginTop: 2 }}>{money(history.totals.total_paid)}</div>
                      </div>
                      <div style={{ flex: 1, background: '#F8FAFC', border: `1px solid ${BRAND.line}`, borderRadius: 12, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: BRAND.sub, fontWeight: 600 }}>BALANCE</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: history.totals.balance > 0 ? BRAND.accentInk : BRAND.ok, marginTop: 2 }}>
                          {money(history.totals.balance)}
                        </div>
                      </div>
                    </div>
                  )}

                  {paidEvents.length > 0 && (
                    <div style={{ marginBottom: 4 }}>
                      <button
                        type="button"
                        onClick={() => setShowSchedule(!showSchedule)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', borderRadius: 10, border: `1px solid ${BRAND.line}`, background: '#F8FAFC',
                          cursor: 'pointer' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: BRAND.ink }}>
                          Payment History
                          <span style={{ fontWeight: 500, color: BRAND.sub }}> - {paidEvents.length} paid</span>
                        </span>
                        <span style={{ fontSize: 12, color: BRAND.sub }}>{showSchedule ? '▲' : '▼'}</span>
                      </button>
                      {showSchedule && (
                        <div style={{ marginTop: 4 }}>
                          {paidEvents.map((e) => (
                            <div key={e.event_id}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 4px', borderTop: `1px solid #F1F1F3` }}>
                              <div>
                                <div style={{ fontSize: 13, color: BRAND.ink }}>{e.label}</div>
                                <div style={{ fontSize: 11.5, color: BRAND.sub, marginTop: 1 }}>{fmtDate(e.date)}</div>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: BRAND.ok }}>
                                ✓ {money(e.amount_settled ?? e.amount, e.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(paidEvents.length > 0 && (targetDue || openDues.length === 0)) && (
                    <div style={{ height: 1, background: BRAND.line, margin: '14px 0' }} />
                  )}

                  {openDues.length === 0 ? (
                    <p style={{ color: BRAND.ok, fontSize: 14, margin: 0 }}>All dues are settled.</p>
                  ) : targetDue && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.sub, letterSpacing: 0.4, marginBottom: 6 }}>CURRENT</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: BRAND.ink }}>{targetDue.label}</div>
                          <div style={{ fontSize: 12, color: BRAND.sub, marginTop: 2 }}>Due {fmtDate(targetDue.date)}</div>
                        </div>
                        <div style={{ fontSize: 19, fontWeight: 800, color: BRAND.accentInk }}>
                          {money(targetDue.remaining ?? targetDue.amount, targetDue.currency)}
                        </div>
                      </div>
                    </div>
                  )}

                  {payEventId && Number(payAmount) > 0 && renderPayBlock(Number(payAmount), targetDue?.currency)}
                </Card>
              )}

              {isGuestPath && (
                <Card>
                  <div style={{ fontWeight: 800, color: BRAND.ink, marginBottom: 4 }}>Select what you're paying for</div>
                  <p style={{ fontSize: 12.5, color: BRAND.sub, margin: '0 0 12px' }}>
                    Guests aren't on a membership contract, so there are no dues here -- pick a service to pay for instead.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {guestServices.map((svc) => {
                      const sel = selectedServiceId === svc.id;
                      return (
                        <button key={svc.id} type="button" onClick={() => setSelectedServiceId(svc.id)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
                            padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                            border: sel ? `1.5px solid ${BRAND.accent}` : `1.5px solid ${BRAND.field}`,
                            background: sel ? BRAND.accentSoft : '#fff' }}>
                          <div style={{ fontWeight: 800, fontSize: 14.5, color: BRAND.ink }}>{svc.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ fontWeight: 800, fontSize: 16, color: BRAND.accentInk }}>{money(svc.price, svc.currency)}</div>
                            <div style={{ fontSize: 11, fontWeight: 800, padding: '5px 10px', borderRadius: 999,
                              border: sel ? `1.5px solid ${BRAND.accent}` : `1.5px solid ${BRAND.field}`,
                              background: sel ? BRAND.accent : 'transparent', color: sel ? '#fff' : BRAND.sub }}>
                              {sel ? '✓ Selected' : 'Select'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedService && renderPayBlock(selectedService.price, selectedService.currency)}
                </Card>
              )}

              {err && <p style={{ color: BRAND.err, fontSize: 13 }}>{err}</p>}
              <button onClick={() => setPaymentStepDone(true)}
                style={{ width: '100%', marginTop: 4, padding: 12, background: 'none', border: 'none',
                  color: BRAND.sub, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
                Skip for now — continue to check-in →
              </button>
            </>
          )}

          {/* Check-in step -- attendance + smart form + submit */}
          {uiStep === 'checkin' && (
            <>
              <Card>
                {alreadyChecked ? (
                  <div style={{ background: '#ECFDF3', border: '1px solid #A7F3D0', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: '#047857', fontSize: 14 }}>You've already checked in{occ ? ` for ${fmtDate(occ.date)}` : ''}</div>
                    <div style={{ fontSize: 12.5, color: BRAND.sub, marginTop: 2 }}>
                      {openDues.length > 0 ? 'You can still settle your dues from the Payment step.' : "Nothing else to do -- you're all set."}
                    </div>
                  </div>
                ) : occ ? (
                  <>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: BRAND.sub }}>Are you attending today?</div>
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
                  // Dues-only mode: no session today, so no attendance to mark.
                  <div style={{ background: BRAND.accentSoft, borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: BRAND.accentInk, fontSize: 14 }}>No session today</div>
                    <div style={{ fontSize: 12.5, color: BRAND.sub, marginTop: 2 }}>
                      No attendance will be recorded{hasPaymentStepContent ? ' -- your payment from the previous step still submits below.' : '.'}
                    </div>
                  </div>
                )}
              </Card>

              {/* Smart Form questions (tenant-configurable) -- only on a fresh
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

              {err && <p style={{ color: BRAND.err, fontSize: 13 }}>{err}</p>}
              {(() => {
                const pendingAmount = member ? Number(payAmount) : selectedService?.price;
                const pendingCurrency = member ? targetDue?.currency : selectedService?.currency;
                const canSubmit = !!occ || hasAnyPaymentIntent;
                return (
                  <button onClick={submit} disabled={submitting || !canSubmit}
                    style={{ width: '100%', padding: 15, border: 'none', borderRadius: 13,
                      background: canSubmit ? BRAND.accent : '#9CA3AF', color: '#fff', fontWeight: 800, fontSize: 16.5, cursor: canSubmit ? 'pointer' : 'not-allowed',
                      boxShadow: canSubmit ? '0 6px 16px -4px rgba(218,100,16,0.5)' : 'none', opacity: submitting ? 0.75 : 1 }}>
                    {submitting ? 'Submitting...'
                      : !occ ? (hasAnyPaymentIntent ? `Record ${money(pendingAmount, pendingCurrency)} payment` : 'No session today')
                      : alreadyChecked ? (hasAnyPaymentIntent ? `Record ${money(pendingAmount, pendingCurrency)} payment` : 'Done')
                      : 'Check in'}
                  </button>
                );
              })()}
              <button onClick={resetIdentity}
                style={{ marginTop: 12, width: '100%', background: 'none', border: 'none', color: BRAND.sub, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                ← Not you? Start over
              </button>
            </>
          )}

        </>
      )}
    </Shell>
  );
};

export default SessionCheckinPage;
