// ============================================================================
// SessionCheckinPage — public Group Session check-in (Batch 3)
// ============================================================================
// Reached at /checkin/:token (no auth, outside the app shell). A member scans
// the chapter QR, is identified by phone, marks attendance for today's session,
// and may declare a BAU payment against one of their own billing dues. Kept
// self-styled and dependency-light because it renders for logged-out members.

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  sessionCheckinApi, CHECKIN_PHONE_KEY, DEFAULT_CHECKIN_SCHEMA,
  type CheckinResolve, type CheckinMember, type CheckinHistory, type BillingRow,
} from './useSessionCheckin';
import FormRenderer from '@/pages/settings/smart-forms/components/FormRenderer';
import type { FormSchema } from '@/pages/settings/smart-forms/types';

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
const money = (n?: number, c = 'INR') =>
  `${c === 'INR' ? '₹' : c + ' '}${Number(n || 0).toLocaleString()}`;
const isOpen = (s: string) => ['scheduled', 'due', 'overdue'].includes(s);

const SessionCheckinPage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();

  const [resolve, setResolve] = useState<CheckinResolve | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [checking, setChecking] = useState(false);
  const [member, setMember] = useState<CheckinMember | null>(null);
  const [firstTimerName, setFirstTimerName] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [history, setHistory] = useState<CheckinHistory | null>(null);

  const [status, setStatus] = useState<'present' | 'apologies'>('present');
  const [payEventId, setPayEventId] = useState<string>('');
  const [upiRef, setUpiRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Smart Forms check-in schema (questions rendered by FormRenderer)
  const [formSchema, setFormSchema] = useState<FormSchema>(DEFAULT_CHECKIN_SCHEMA);
  const [formTemplateId, setFormTemplateId] = useState<string | null>(null);
  const [formTemplateVersion, setFormTemplateVersion] = useState<number | null>(null);

  // Resolve the token + fetch the check-in form on load
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await sessionCheckinApi.resolve(token);
        if (!alive) return;
        if (!r.ok) { setErr('This check-in link is invalid or has expired.'); setLoading(false); return; }
        setResolve(r);
        // fetch the configured questions; fall back to the built-in default
        try {
          const f = await sessionCheckinApi.form(token);
          if (alive && f?.ok && f.schema) {
            setFormSchema(f.schema);
            setFormTemplateId(f.form_template_id ?? null);
            setFormTemplateVersion(f.form_template_version ?? null);
          }
        } catch { /* keep DEFAULT_CHECKIN_SCHEMA */ }
      } catch { if (alive) setErr('Could not reach the check-in service.'); }
      finally { if (alive) setLoading(false); }
    })();
    // pre-fill remembered phone
    try { const p = localStorage.getItem(CHECKIN_PHONE_KEY); if (p) setPhone(p); } catch { /* ignore */ }
    return () => { alive = false; };
  }, [token]);

  const openDues = useMemo<BillingRow[]>(
    () => (history?.billing || []).filter((b) => isOpen(b.status)),
    [history]
  );

  // Seed the form with each field's default_value (memoized so FormRenderer
  // doesn't reset answers on every render).
  const formInitialValues = useMemo<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    formSchema.sections.forEach((s) =>
      s.fields.forEach((f) => {
        if (f.default_value !== undefined && f.default_value !== null) init[f.id] = f.default_value;
      })
    );
    return init;
  }, [formSchema]);

  const identify = async () => {
    if (phone.replace(/\D/g, '').length < 6) { setErr('Enter a valid phone number.'); return; }
    setErr(null); setChecking(true); setNotFound(false);
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

  // Called by FormRenderer's submit; `values` holds the questionnaire answers,
  // including the well-known `attendance_status` field. Dues stay custom.
  const handleFormSubmit = async (values: Record<string, unknown>) => {
    const st: 'present' | 'apologies' = values.attendance_status === 'apologies' ? 'apologies' : 'present';
    setStatus(st);
    setErr(null); setSubmitting(true);
    try {
      const payment = payEventId
        ? { billing_event_id: payEventId, upi_reference: upiRef || undefined,
            amount: openDues.find((d) => d.event_id === payEventId)?.amount }
        : null;
      await sessionCheckinApi.submit(token, {
        member_id: member?.contact_id ?? null,
        member_name: member?.name ?? firstTimerName ?? null,
        member_phone: phone,
        status: st,
        payment,
        responses: values,
        form_template_id: formTemplateId,
        form_template_version: formTemplateVersion,
      });
      setDone(true);
    } catch (e: any) {
      const reason = e?.response?.data?.message;
      setErr(reason === 'no_session_today' ? 'There is no session scheduled for today.' : (reason || 'Check-in failed.'));
    } finally { setSubmitting(false); }
  };

  // ── shells ──
  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ minHeight: '100vh', background: '#F6F7F9', padding: '24px 16px' }}>
      <div style={{ maxWidth: 440, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#DA6410',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>C</div>
          <strong style={{ color: '#111827' }}>Session Check-in</strong>
        </div>
        {children}
      </div>
    </div>
  );
  const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ background: '#fff', border: '1px solid #ECECEE', borderRadius: 14, padding: 18, marginBottom: 14 }}>{children}</div>
  );

  if (loading) return <Shell><Card>Loading…</Card></Shell>;
  if (err && !resolve) return <Shell><Card><p style={{ color: '#B91C1C', margin: 0 }}>{err}</p></Card></Shell>;

  if (done) {
    return (
      <Shell>
        <Card>
          <div style={{ fontSize: 40, textAlign: 'center' }}>✅</div>
          <h2 style={{ textAlign: 'center', margin: '8px 0 4px' }}>You're checked in</h2>
          <p style={{ textAlign: 'center', color: '#6B7280', marginTop: 0 }}>
            {status === 'present' ? 'Marked present' : 'Marked apologies'} for {fmtDate(resolve?.occurrence?.date)}.
            {payEventId ? ' Your payment is recorded as pending — the chair will confirm it.' : ''}
          </p>
        </Card>
      </Shell>
    );
  }

  const occ = resolve?.occurrence;

  return (
    <Shell>
      <Card>
        <div style={{ fontSize: 13, color: '#6B7280' }}>{resolve?.contract_name}</div>
        {occ ? (
          <div style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>Today's session · {fmtDate(occ.date)}</div>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>No session today</div>
            {resolve?.next_occurrence && (
              <div style={{ fontSize: 13, color: '#6B7280' }}>Next: {fmtDate(resolve.next_occurrence.date)}</div>
            )}
          </>
        )}
      </Card>

      {/* Identify */}
      {!member && !notFound && (
        <Card>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Your mobile number</label>
          <input
            value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+91 …"
            style={{ width: '100%', padding: '11px 12px', border: '1px solid #D1D5DB', borderRadius: 10, marginTop: 6, fontSize: 15 }}
          />
          {err && <p style={{ color: '#B91C1C', fontSize: 13 }}>{err}</p>}
          <button onClick={identify} disabled={checking}
            style={{ width: '100%', marginTop: 12, padding: '12px', border: 'none', borderRadius: 10,
              background: '#DA6410', color: '#fff', fontWeight: 700, fontSize: 15 }}>
            {checking ? 'Checking…' : 'Continue'}
          </button>
        </Card>
      )}

      {/* First-timer (phone not on roster) */}
      {notFound && !member && (
        <Card>
          <p style={{ marginTop: 0, color: '#6B7280', fontSize: 14 }}>
            We couldn't match that number to a member. You can still check in as a guest.
          </p>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Your name</label>
          <input value={firstTimerName} onChange={(e) => setFirstTimerName(e.target.value)} placeholder="Full name"
            style={{ width: '100%', padding: '11px 12px', border: '1px solid #D1D5DB', borderRadius: 10, marginTop: 6, fontSize: 15 }} />
          <button onClick={() => setNotFound(false)}
            style={{ marginTop: 10, background: 'none', border: 'none', color: '#DA6410', fontWeight: 600 }}>← Try a different number</button>
        </Card>
      )}

      {/* Identified member / guest → dues (custom) + Smart-Forms questions */}
      {(member || (notFound && firstTimerName)) && (
        <>
          <Card>
            <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>
              {member ? member.name : firstTimerName} {member ? '' : '(guest)'}
            </div>
            {member && history && (
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                {history.attendance.length} past check-in{history.attendance.length === 1 ? '' : 's'}
              </div>
            )}
          </Card>

          {/* BAU dues — custom, matched members only (dynamic per-member) */}
          {member && (
            <Card>
              <div style={{ fontWeight: 700, color: '#111827', marginBottom: 8 }}>Your dues</div>
              {openDues.length === 0 && (
                <p style={{ color: '#059669', fontSize: 14, margin: 0 }}>All dues are settled. 🎉</p>
              )}
              {openDues.map((d) => (
                <label key={d.event_id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #F1F1F3', cursor: 'pointer' }}>
                  <input type="radio" name="due" checked={payEventId === d.event_id}
                    onChange={() => setPayEventId(payEventId === d.event_id ? '' : d.event_id)} />
                  <span style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, color: '#111827' }}>{d.label}</span>
                    <span style={{ display: 'block', fontSize: 12, color: '#6B7280' }}>Due {fmtDate(d.date)} · {d.status}</span>
                  </span>
                  <strong style={{ color: '#111827' }}>{money(d.amount, d.currency)}</strong>
                </label>
              ))}
              {payEventId && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>UPI reference (after paying the chapter UPI)</label>
                  <input value={upiRef} onChange={(e) => setUpiRef(e.target.value)} placeholder="e.g. 4098XXXX2231"
                    style={{ width: '100%', padding: '11px 12px', border: '1px solid #D1D5DB', borderRadius: 10, marginTop: 6, fontSize: 15 }} />
                  <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 0 }}>
                    The chair will confirm your payment offline.
                  </p>
                </div>
              )}
            </Card>
          )}

          {err && <p style={{ color: '#B91C1C', fontSize: 13 }}>{err}</p>}

          {/* Smart-Forms-configured questions (attendance + any custom fields).
              The renderer's Submit button finalises the check-in. */}
          {occ ? (
            <FormRenderer
              schema={formSchema}
              initialValues={formInitialValues}
              onSubmit={(values) => { void handleFormSubmit(values); }}
              loading={submitting}
            />
          ) : (
            <button disabled
              style={{ width: '100%', padding: '14px', border: 'none', borderRadius: 12,
                background: '#9CA3AF', color: '#fff', fontWeight: 700, fontSize: 16 }}>
              No session today
            </button>
          )}
        </>
      )}
    </Shell>
  );
};

export default SessionCheckinPage;
