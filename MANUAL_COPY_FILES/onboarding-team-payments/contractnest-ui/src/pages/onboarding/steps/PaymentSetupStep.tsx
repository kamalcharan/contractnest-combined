// src/pages/onboarding/steps/PaymentSetupStep.tsx
// VaNi onboarding — "How you get paid".
//
// Asks how the tenant collects from customers and saves it through the same
// integrations path Settings → Integrations uses (useIntegrations →
// POST /api/integrations). What the customer then sees is decided by
// fn_tenant_payment_options; the preview on the right describes it with the
// same rule (utils/payments/paymentOutcome).
//
// Environments — payment settings are stored per environment:
//   · UPI: the same UPI id is saved for Live AND Test, so practice contracts
//     show the same pay section.
//   · Razorpay: live and test keys are different keys. The live key goes to
//     Live only; Test gets Razorpay only if a separate rzp_test_ key is given,
//     so a practice contract can never take real money.
// A method that is already set up is shown as such and NOT re-saved — that
// would overwrite details added in Settings (bank QR, merchant fields).
//
// Sellers and "both" only (buyers pay, they don't collect).
// Navigation: terms-conditions → THIS → both ? equipment-confirm : team-setup

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useIntegrations, Integration } from '@/hooks/useIntegrations';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { vaniToast } from '@/components/common/toast';
import { completeVaniStep } from '@/utils/onboarding/completeVaniStep';
import { describePaymentOutcome, isValidUpiId } from '@/utils/payments/paymentOutcome';
import CustomerPaymentPreview from '@/components/payments/CustomerPaymentPreview';
import VaniStepShell, { VANI_TOKENS as T } from '@/components/onboarding/VaniStepShell';

type Method = 'upi' | 'razorpay' | 'self';
type FieldErrors = Partial<Record<'upiId' | 'payee' | 'rzpKey' | 'rzpSecret' | 'rzpTestKey' | 'rzpTestSecret', string>>;

const LIVE_KEY_RE = /^rzp_live_\w{6,}$/;
const TEST_KEY_RE = /^rzp_test_\w{6,}$/;

const PaymentSetupStep: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state || {}) as Record<string, any>;
  const persona = (routeState.persona || 'seller') as string;
  const nextPath = persona === 'both' ? '/onboarding/equipment-confirm' : '/onboarding/team-setup';

  const { currentTenant } = useAuth();
  const { profile } = useTenantProfile();
  const businessName = profile?.business_name || currentTenant?.name || 'Your business';
  const { integrations, fetchIntegrationsByType, testConnection, saveIntegration } = useIntegrations();

  const [loading, setLoading] = useState(true);
  const [chosen, setChosen] = useState<Record<Method, boolean>>({ upi: false, razorpay: false, self: false });
  const [upiId, setUpiId] = useState('');
  // null = untouched, so the field follows the business name until edited
  const [payeeInput, setPayee] = useState<string | null>(null);
  const payee = payeeInput ?? businessName;
  const [rzpKey, setRzpKey] = useState('');
  const [rzpSecret, setRzpSecret] = useState('');
  const [rzpTestKey, setRzpTestKey] = useState('');
  const [rzpTestSecret, setRzpTestSecret] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchIntegrationsByType('payment_gateway').finally(() => setLoading(false));
  }, [fetchIntegrationsByType]);

  const provider = (name: string): Integration | undefined =>
    integrations.find((i) => i.integration_type === 'payment_gateway' && i.provider_name === name);
  const upiRow = provider('offline_upi');
  const rzpRow = provider('razorpay');
  const already = {
    upi: !!(upiRow?.is_configured && upiRow.is_active),
    razorpay: !!(rzpRow?.is_configured && rzpRow.is_active),
  };

  // A method that is already on starts ticked.
  useEffect(() => {
    if (loading) return;
    setChosen((c) => ({ ...c, upi: c.upi || already.upi, razorpay: c.razorpay || already.razorpay }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const toggle = (m: Method) => {
    setErrors({});
    setFormError(null);
    setChosen((c) => (m === 'self'
      ? { upi: false, razorpay: false, self: !c.self }
      : { ...c, [m]: !c[m], self: false }));
  };

  const preview = useMemo(() => describePaymentOutcome({
    razorpay: chosen.razorpay,
    upi: chosen.upi,
  }), [chosen]);

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (chosen.upi && !already.upi) {
      if (!upiId.trim()) e.upiId = 'Enter your UPI ID, or untick this option.';
      else if (!isValidUpiId(upiId)) e.upiId = "That doesn't look like a UPI ID. It needs an @, e.g. sunrise@okhdfcbank.";
      if (!payee.trim()) e.payee = 'Enter the name your customers will see.';
    }
    if (chosen.razorpay && !already.razorpay) {
      if (!LIVE_KEY_RE.test(rzpKey.trim())) e.rzpKey = 'Paste the live Key ID. It starts with rzp_live_.';
      if (!rzpSecret.trim()) e.rzpSecret = 'Paste the key secret.';
      if (rzpTestKey.trim() || rzpTestSecret.trim()) {
        if (!TEST_KEY_RE.test(rzpTestKey.trim())) e.rzpTestKey = 'A test Key ID starts with rzp_test_.';
        if (!rzpTestSecret.trim()) e.rzpTestSecret = 'Paste the test key secret.';
      }
    }
    return e;
  };

  /** Saves one provider into one environment; returns an error message or null. */
  const saveOne = async (row: Integration, credentials: Record<string, string>, isLive: boolean): Promise<string | null> => {
    const integration: Integration = {
      master_integration_id: row.master_integration_id,
      integration_type: 'payment_gateway',
      provider_name: row.provider_name,
      display_name: row.display_name,
      credentials,
      is_active: true,
      is_live: isLive,
    };
    const test = await testConnection(integration, { isLive, quiet: true });
    if (!test?.success) return test?.message || 'Those details did not work.';
    const ok = await saveIntegration(integration, { isLive, quiet: true });
    return ok ? null : 'Could not save. Please try again.';
  };

  const handleContinue = async () => {
    if (saving) return;
    setFormError(null);
    if (!chosen.upi && !chosen.razorpay && !chosen.self) {
      setFormError('Pick how you collect, or choose "Set this up later".');
      return;
    }
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    const done: string[] = [];
    try {
      if (chosen.upi && !already.upi) {
        if (!upiRow) throw new Error('UPI is not available right now. You can set it up later in Settings → Integrations.');
        const creds = { upi_id: upiId.trim(), payee_name: payee.trim() };
        for (const live of [true, false]) {
          const err = await saveOne(upiRow, creds, live);
          if (err) throw new Error(`UPI: ${err}`);
        }
        done.push('UPI');
      }
      if (chosen.razorpay && !already.razorpay) {
        if (!rzpRow) throw new Error('Razorpay is not available right now. You can connect it later in Settings → Integrations.');
        const liveErr = await saveOne(rzpRow, { key_id: rzpKey.trim(), key_secret: rzpSecret.trim() }, true);
        if (liveErr) {
          setErrors({ rzpKey: liveErr });
          throw new Error(`Razorpay: ${liveErr}`);
        }
        done.push('Razorpay');
        if (rzpTestKey.trim()) {
          const testErr = await saveOne(rzpRow, { key_id: rzpTestKey.trim(), key_secret: rzpTestSecret.trim() }, false);
          if (testErr) {
            // Live is saved; say so rather than failing the whole step.
            vaniToast.warning('Razorpay live key saved, but the test key did not work', {
              message: 'Practice contracts will not show Razorpay. You can add the test key later in Settings → Integrations.',
            });
          }
        }
      }

      completeVaniStep('payment-setup', {
        methods: (['upi', 'razorpay', 'self'] as Method[]).filter((m) => chosen[m]),
        newly_saved: done,
      });
      vaniToast.success(done.length ? `Saved. ${preview.headline}.` : preview.headline);
      navigate(nextPath, { state: routeState });
    } catch (err: any) {
      const msg = err?.message || 'Could not save your payment details. Please try again.';
      setFormError(done.length ? `${done.join(' and ')} saved. ${msg}` : msg);
      vaniToast.error('Payment details not saved', { message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    completeVaniStep('payment-setup', { skipped: true });
    navigate(nextPath, { state: routeState });
  };

  // ── small pieces ───────────────────────────────────────────────────────
  const field = (
    id: string, label: string, value: string, onChange: (v: string) => void,
    opts: { placeholder?: string; type?: string; error?: string; hint?: string } = {}
  ) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <label htmlFor={id} style={{ fontSize: 12.5, fontWeight: 700, color: T.TEXT }}>{label}</label>
      <input id={id} type={opts.type || 'text'} value={value} placeholder={opts.placeholder} disabled={saving}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setErrors((p) => ({ ...p, [id]: undefined })); }}
        style={{
          padding: '9px 12px', border: `1px solid ${opts.error ? '#ef4444' : T.BORDER}`, borderRadius: 8,
          fontSize: 13.5, background: T.WHITE, color: T.TEXT, fontFamily: T.FONT, outline: 'none',
        }} />
      {opts.error
        ? <span style={{ fontSize: 12, color: T.ERROR }}>{opts.error}</span>
        : opts.hint && <span style={{ fontSize: 12, color: T.TEXT_DIM }}>{opts.hint}</span>}
    </div>
  );

  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 };
  const howto: React.CSSProperties = {
    background: T.SURFACE, border: `1px solid ${T.BORDER}`, borderRadius: 10, padding: '10px 12px', fontSize: 12.5, color: T.TEXT_DIM, lineHeight: 1.55,
  };
  const alreadyLine = (what: string) => (
    <div style={{ ...howto, background: T.OK_SOFT, borderColor: '#bbf7d0', color: T.TEXT }}>
      ✓ {what} is already set up. Change it any time in <b>Settings → Integrations</b>.
    </div>
  );

  const option = (m: Method, title: string, desc: string, badge: string | null, body: React.ReactNode) => {
    const on = chosen[m];
    return (
      <div style={{
        border: `1.5px solid ${on ? T.VANI : T.BORDER}`, borderRadius: 14, background: T.WHITE, overflow: 'hidden',
        boxShadow: on ? `0 0 0 3px ${T.VANI_SOFT}` : 'none', transition: 'border-color .15s',
      }}>
        <button onClick={() => toggle(m)} disabled={saving} aria-pressed={on}
          style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.FONT }}>
          <span aria-hidden="true" style={{
            width: 22, height: 22, borderRadius: m === 'self' ? '50%' : 6, flexShrink: 0, marginTop: 2,
            border: `1.5px solid ${on ? T.VANI : T.TEXT_MUTED}`, background: on ? T.VANI : 'transparent',
            color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900,
          }}>{on ? '✓' : ''}</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontWeight: 800, fontSize: 15, color: T.TEXT }}>
              {title}
              {badge && (
                <span style={{ fontFamily: T.MONO, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, border: `1px solid ${T.BORDER}`, color: T.TEXT_DIM, background: T.SURFACE }}>
                  {badge}
                </span>
              )}
            </span>
            <span style={{ display: 'block', fontSize: 13, color: T.TEXT_DIM, marginTop: 2 }}>{desc}</span>
          </span>
        </button>
        {on && body && <div style={{ padding: '0 16px 16px 52px', display: 'flex', flexDirection: 'column', gap: 12 }}>{body}</div>}
      </div>
    );
  };

  return (
    <VaniStepShell
      title="How do your customers pay you?"
      message={<>
        When a customer accepts a contract, I show them how to pay you right there. Pick what you use today —
        you can choose both online options, and change it any time in <b>Settings → Integrations</b>.
      </>}
      loading={loading}
      loadingText="Checking your payment settings…"
      onBack={() => navigate('/onboarding/terms-conditions', { state: routeState })}
      onSkip={handleSkip}
      skipLabel="Set this up later"
      onContinue={handleContinue}
      continueBusy={saving}
      continueLabel={saving ? 'Saving…' : 'Continue →'}
      asideTitle="What your customer sees"
      aside={
        <>
          <CustomerPaymentPreview
            businessName={businessName}
            razorpay={chosen.razorpay}
            upi={chosen.upi}
            upiId={already.upi ? undefined : upiId}
            payeeName={payee}
          />
          <div style={{ fontSize: 12.5, color: T.TEXT_DIM, textAlign: 'center' }}>
            <b style={{ color: T.TEXT }}>{preview.headline}.</b> {preview.detail}
          </div>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {option('upi', 'UPI to your bank account',
          'Customers scan or pay your UPI ID, then tell you the reference. You confirm it in Money In. No fees.',
          'most common',
          already.upi ? alreadyLine('UPI') : (
            <>
              <div style={grid2}>
                {field('upiId', 'UPI ID', upiId, setUpiId, {
                  placeholder: 'yourname@okhdfcbank', error: errors.upiId,
                  hint: 'The ID your bank or UPI app shows, with the @ part.',
                })}
                {field('payee', 'Name your customers see', payee, setPayee, {
                  error: errors.payee, hint: 'Shown in their UPI app when they pay.',
                })}
              </div>
              <div style={{ fontSize: 12, color: T.TEXT_DIM }}>
                ✓ Saved for both your live and practice contracts. Add your bank's QR later in Settings → Integrations.
              </div>
            </>
          ))}

        {option('razorpay', 'Online with Razorpay',
          'Cards, UPI and netbanking. Payments are matched to the invoice automatically. Razorpay charges its own fee.',
          'needs a Razorpay account',
          already.razorpay ? alreadyLine('Razorpay') : (
            <>
              <div style={grid2}>
                {field('rzpKey', 'Live Key ID', rzpKey, setRzpKey, { placeholder: 'rzp_live_…', error: errors.rzpKey })}
                {field('rzpSecret', 'Live key secret', rzpSecret, setRzpSecret, { type: 'password', error: errors.rzpSecret })}
              </div>
              <div style={howto}>
                <b style={{ color: T.TEXT }}>Where to find these</b>
                <ol style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  <li>Log in to the Razorpay Dashboard in <b>Live mode</b>.</li>
                  <li>Open <b>Account &amp; Settings → API Keys</b>.</li>
                  <li>Click <b>Generate key</b> and copy both values here.</li>
                </ol>
              </div>
              <details>
                <summary style={{ fontSize: 12.5, color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>
                  Use a separate test key for practice contracts (optional)
                </summary>
                <div style={{ ...grid2, marginTop: 10 }}>
                  {field('rzpTestKey', 'Test Key ID', rzpTestKey, setRzpTestKey, { placeholder: 'rzp_test_…', error: errors.rzpTestKey })}
                  {field('rzpTestSecret', 'Test key secret', rzpTestSecret, setRzpTestSecret, { type: 'password', error: errors.rzpTestSecret })}
                </div>
                <div style={{ fontSize: 12, color: T.TEXT_DIM, marginTop: 6 }}>
                  Without one, practice contracts don't show Razorpay — so a practice payment can never be real money.
                </div>
              </details>
            </>
          ))}

        {option('self', "I'll collect it myself", 'Bank transfer, cash or cheque. Customers just accept the contract.', null, (
          <div style={howto}>
            Customers accept the contract on their phone. You collect by bank transfer, cash or cheque, then record it in
            <b style={{ color: T.TEXT }}> Money In</b>. You can add online payments any time from Settings.
          </div>
        ))}

        {formError && (
          <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: T.ERROR, fontSize: 13 }}>
            {formError}
          </div>
        )}
      </div>
    </VaniStepShell>
  );
};

export default PaymentSetupStep;
