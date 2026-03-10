// src/components/landing/PlaygroundV3.tsx - Interactive contract builder from v3 reference
import React, { useState, useCallback } from 'react';
import { VikunaBlackTheme } from '../../config/theme/themes/vikunaBlack';

const colors = VikunaBlackTheme.darkMode.colors;
const amber = colors.brand.primary;
const green = '#2ECC71';
const text = colors.utility.primaryText;
const muted = colors.utility.secondaryText;
const faint = 'rgba(255,255,255,0.25)';
const surface = colors.utility.secondaryBackground;
const surface2 = 'rgba(255,255,255,0.04)';
const bg = colors.utility.primaryBackground;
const border = 'rgba(255,255,255,0.07)';
const border2 = 'rgba(255,255,255,0.12)';
const mono = "'DM Mono', monospace";
const bebas = "'Bebas Neue', sans-serif";

// ─── Template Data ───
interface Template {
  icon: string;
  name: string;
  tag: string;
  desc: string;
  category: string;
  fullDesc: string;
  services: string;
  value: string;
  sla: string;
}

const templates: Template[] = [
  { icon: '🛗', name: 'Elevator AMC', tag: 'AMC', desc: 'Annual maintenance with quarterly visits & emergency response', category: 'Elevator & Lift', fullDesc: 'Annual maintenance contract for elevators with quarterly service visits and 4-hr emergency response', services: '4 Quarterly Services + Emergency', value: '₹85,000 / year', sla: '4 hr response · 8 hr resolution' },
  { icon: '❄️', name: 'HVAC Maintenance', tag: 'AMC', desc: 'Monthly filter checks, bi-annual deep service & emergency support', category: 'HVAC & Cooling', fullDesc: 'Comprehensive HVAC service contract with monthly filter checks and bi-annual deep service', services: 'Monthly Checks + 2 Deep Services', value: '₹1,20,000 / year', sla: '24 hr response · same day resolution' },
  { icon: '💻', name: 'IT Support', tag: 'Support', desc: '24/7 helpdesk, monthly patching & quarterly infra review', category: 'IT Services', fullDesc: 'Managed IT support with helpdesk, monthly patching and quarterly infrastructure review', services: '24/7 Helpdesk + Monthly Patching', value: '₹2,50,000 / year', sla: '4 hr response · 8 hr resolution' },
  { icon: '🏢', name: 'Facility Management', tag: 'FM', desc: 'Housekeeping, security & maintenance — all vendors, one contract', category: 'Facility Services', fullDesc: 'Multi-vendor facility management covering housekeeping, security and maintenance', services: 'Daily Housekeeping + Security + Maintenance', value: '₹4,50,000 / year', sla: 'Same day response' },
  { icon: '🧘', name: 'Wellness Program', tag: 'Healthcare', desc: 'Structured 3-month program with session tracking & evidence', category: 'Health & Wellness', fullDesc: '3-month structured wellness program with yoga, nutrition and medical consultations', services: '4 Yoga + 2 Consults + 1 Nutrition Plan', value: '₹12,000 / client', sla: 'Session completion tracking' },
  { icon: '🏥', name: 'Equipment CMC', tag: 'CMC', desc: 'Medical equipment maintenance with PM visits & calibration certs', category: 'Medical Equipment', fullDesc: 'Comprehensive maintenance contract for medical equipment with preventive maintenance and calibration', services: 'PM Visits + Calibration + 24/7 Emergency', value: '₹24,000 / year / device', sla: '4 hr response · 99% uptime SLA' },
];

const PlaygroundV3: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [step, setStep] = useState(1);
  const [selectedTpl, setSelectedTpl] = useState<Template | null>(null);
  const [form, setForm] = useState({ provider: '', client: '', value: '', duration: '1 Year', start: '', payment: 'Quarterly' });
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  const goStep = useCallback((n: number) => setStep(n), []);

  const updateField = (field: keyof typeof form, val: string) => {
    setForm((f) => ({ ...f, [field]: val }));
  };

  const handleSave = () => {
    if (!email.includes('@')) return;
    setSaved(true);
  };

  // Step indicator states
  const stepState = (n: number) => {
    if (n < step) return 'done';
    if (n === step) return 'active';
    return '';
  };

  const stepNumStyle = (n: number): React.CSSProperties => {
    const s = stepState(n);
    return {
      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: mono, fontSize: '0.72rem', fontWeight: 600, marginRight: 8, flexShrink: 0,
      background: s === 'active' ? amber : s === 'done' ? green : 'transparent',
      border: `1.5px solid ${s === 'active' ? amber : s === 'done' ? green : border2}`,
      color: s === 'active' || s === 'done' ? '#0D0F14' : muted,
    };
  };

  const stepLabelStyle = (n: number): React.CSSProperties => ({
    fontSize: '0.8rem', color: stepState(n) === 'active' ? text : muted, whiteSpace: 'nowrap',
  });

  const stepLineStyle = (n: number): React.CSSProperties => ({
    flex: 1, height: 1, background: n < step ? green : border, margin: '0 16px', transition: 'background 0.3s',
  });

  const steps = [
    { num: 1, label: 'Pick Template' },
    { num: 2, label: 'Fill Details' },
    { num: 3, label: 'Preview Contract' },
    { num: 4, label: 'Save & Send' },
  ];

  return (
    <section
      id="playground"
      className={className}
      style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', padding: '80px 56px' }}
    >
      {/* Eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
        <div style={{ width: 32, height: 1, background: amber }} />
        <span style={{ fontFamily: mono, fontSize: '0.7rem', letterSpacing: '0.16em', color: amber, textTransform: 'uppercase' }}>
          Try It Now — No Sign Up Needed
        </span>
      </div>

      {/* Headline */}
      <h2 style={{ fontFamily: bebas, fontSize: 'clamp(2.4rem, 5vw, 4rem)', lineHeight: 0.95, letterSpacing: '0.02em', marginBottom: 14, color: text }}>
        BUILD YOUR FIRST CONTRACT<br />IN 60 SECONDS
      </h2>
      <p style={{ fontSize: '1rem', color: muted, fontWeight: 300, lineHeight: 1.65, maxWidth: 520, marginBottom: 48 }}>
        Pick a template, fill in the basics, and see your live contract. Save it to invite your vendor or client.
      </p>

      {/* Step Progress */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
        {steps.map((s, i) => (
          <React.Fragment key={s.num}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={stepNumStyle(s.num)}>{stepState(s.num) === 'done' ? '✓' : s.num}</div>
              <div style={stepLabelStyle(s.num)}>{s.label}</div>
            </div>
            {i < steps.length - 1 && <div style={stepLineStyle(s.num)} />}
          </React.Fragment>
        ))}
      </div>

      {/* ═══════ STEP 1: TEMPLATE PICKER ═══════ */}
      {step === 1 && (
        <div style={{ background: surface, border: `1px solid ${border2}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '18px 28px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: mono, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: amber }}>Step 1 — Choose a contract template</span>
            <span style={{ fontSize: '0.75rem', color: muted }}>6 templates available in beta</span>
          </div>
          <div style={{ padding: '32px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {templates.map((tpl) => {
                const isSelected = selectedTpl?.name === tpl.name;
                return (
                  <div
                    key={tpl.name}
                    onClick={() => setSelectedTpl(tpl)}
                    style={{
                      padding: '18px 16px', border: `1.5px solid ${isSelected ? amber : border}`, borderRadius: 10,
                      cursor: 'pointer', transition: 'all 0.2s',
                      background: isSelected ? `${amber}1F` : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = amber; e.currentTarget.style.background = `${amber}1F`; } }}
                    onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = 'transparent'; } }}
                  >
                    <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>{tpl.icon}</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: text, marginBottom: 4 }}>{tpl.name}</div>
                    <div style={{ fontSize: '0.72rem', color: muted, lineHeight: 1.4 }}>{tpl.desc}</div>
                    <div style={{ display: 'inline-block', marginTop: 8, fontFamily: mono, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: amber, background: `${amber}1A`, border: `1px solid ${amber}33`, padding: '2px 7px', borderRadius: 3 }}>
                      {tpl.tag}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28 }}>
              <button
                onClick={() => selectedTpl && goStep(2)}
                disabled={!selectedTpl}
                style={{
                  background: amber, color: '#0D0F14', border: 'none', padding: '12px 28px', borderRadius: 8,
                  fontFamily: mono, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontWeight: 600, cursor: selectedTpl ? 'pointer' : 'not-allowed',
                  opacity: selectedTpl ? 1 : 0.4, transition: 'all 0.2s',
                }}
              >
                Continue with template →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ STEP 2: FILL DETAILS ═══════ */}
      {step === 2 && selectedTpl && (
        <div style={{ background: surface, border: `1px solid ${border2}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '18px 28px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: mono, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: amber }}>Step 2 — Fill contract details</span>
            <span style={{ fontSize: '0.75rem', color: muted }}>Takes about 30 seconds</span>
          </div>
          <div style={{ padding: '32px 28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Your Business Name" value={form.provider} onChange={(v) => updateField('provider', v)} placeholder="e.g. TechLift Services Pvt Ltd" />
                <FormField label="Client / Vendor Name" value={form.client} onChange={(v) => updateField('client', v)} placeholder="e.g. Prestige Tech Park" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Contract Value" value={form.value} onChange={(v) => updateField('value', v)} placeholder={`e.g. ${selectedTpl.value.split(' /')[0]}`} />
                <FormSelect label="Contract Duration" value={form.duration} onChange={(v) => updateField('duration', v)} options={['1 Year', '6 Months', '3 Months', '2 Years']} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Start Date" value={form.start} onChange={(v) => updateField('start', v)} type="date" />
                <FormSelect label="Payment Terms" value={form.payment} onChange={(v) => updateField('payment', v)} options={['Quarterly', 'Monthly', 'Annual Advance', 'Milestone-based']} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
              <NavBackBtn onClick={() => goStep(1)}>← Back</NavBackBtn>
              <NavNextBtn onClick={() => goStep(3)}>Preview Contract →</NavNextBtn>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ STEP 3: CONTRACT PREVIEW ═══════ */}
      {step === 3 && selectedTpl && (
        <div style={{ background: surface, border: `1px solid ${border2}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '18px 28px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: mono, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: amber }}>Step 3 — Your Contract Preview</span>
            <span style={{ fontSize: '0.75rem', color: muted }}>Live document — updates as you type</span>
          </div>
          <div style={{ padding: '32px 28px' }}>
            {/* White contract document */}
            <div style={{ background: '#fff', borderRadius: 8, padding: '36px 40px', color: '#1a1a2e', position: 'relative', overflow: 'hidden' }}>
              {/* Watermark */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-25deg)', fontFamily: bebas, fontSize: '6rem', color: 'rgba(0,0,0,0.04)', letterSpacing: '0.2em', pointerEvents: 'none', whiteSpace: 'nowrap' }}>DRAFT</div>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ fontFamily: bebas, fontSize: '1.2rem', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 8, color: '#1a1a2e' }}>
                  <div style={{ width: 7, height: 7, background: '#F5A623', borderRadius: '50%' }} />
                  CONTRACTNEST
                </div>
                <div style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', background: '#f0efea', padding: '4px 10px', borderRadius: 3 }}>
                  DRAFT · NOT YET SIGNED
                </div>
              </div>

              {/* Title */}
              <div style={{ fontFamily: bebas, fontSize: '1.7rem', letterSpacing: '0.04em', marginBottom: 4, color: '#1a1a2e' }}>
                {selectedTpl.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: 20 }}>
                Annual Maintenance Contract — {selectedTpl.category}
              </div>

              {/* Parties */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div style={{ padding: '12px 14px', borderRadius: 6, background: '#f8f7f2' }}>
                  <div style={{ fontFamily: mono, fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Service Provider</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1a2e' }}>{form.provider || 'Your Business Name'}</div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 6, background: '#f8f7f2' }}>
                  <div style={{ fontFamily: mono, fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Client</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1a2e' }}>{form.client || 'Client Name'}</div>
                </div>
              </div>

              {/* Terms */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Value', value: form.value || selectedTpl.value.split(' /')[0] },
                  { label: 'Duration', value: form.duration },
                  { label: 'Start Date', value: form.start || '—' },
                  { label: 'Payment', value: form.payment },
                ].map((t) => (
                  <div key={t.label} style={{ padding: '10px 12px', background: '#f8f7f2', borderRadius: 5 }}>
                    <div style={{ fontFamily: mono, fontSize: '0.56rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', marginBottom: 3 }}>{t.label}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a1a2e' }}>{t.value}</div>
                  </div>
                ))}
              </div>

              {/* Milestones */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: mono, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', paddingBottom: 8, borderBottom: '1px solid #eee', marginBottom: 10 }}>Service Milestones</div>
                {selectedTpl.services.split(' + ').map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f0', fontSize: '0.82rem', color: '#1a1a2e' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ddd', flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{m.trim()}</span>
                  </div>
                ))}
              </div>

              {/* SLA */}
              <div style={{ padding: '12px 14px', background: '#fff8ec', border: '1px solid #f5e6c8', borderRadius: 6, fontSize: '0.78rem', color: '#8B6914', fontFamily: mono, letterSpacing: '0.04em', marginBottom: 20 }}>
                ⏱ SLA: {selectedTpl.sla}
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
                {[
                  { role: 'Service Provider Signature', name: form.provider || '—' },
                  { role: 'Client Signature', name: form.client || '—' },
                ].map((sig) => (
                  <div key={sig.role} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ height: 1, background: '#ddd', marginBottom: 4 }} />
                    <div style={{ fontFamily: mono, fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999' }}>{sig.role}</div>
                    <div style={{ fontSize: '0.78rem', color: '#888' }}>{sig.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
              <NavBackBtn onClick={() => goStep(2)}>← Edit Details</NavBackBtn>
              <NavNextBtn onClick={() => goStep(4)}>Save & Invite Vendor →</NavNextBtn>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ STEP 4: SAVE & SEND ═══════ */}
      {step === 4 && selectedTpl && (
        <div style={{ background: surface, border: `1px solid ${border2}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '18px 28px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: mono, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: amber }}>Step 4 — Save your contract & join beta</span>
            <span style={{ fontSize: '0.75rem', color: muted }}>Free during closed beta</span>
          </div>
          <div style={{ padding: '32px 28px' }}>
            {/* Contract summary */}
            <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ fontSize: '2rem' }}>📄</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 3, color: text }}>{selectedTpl.name}</div>
                <div style={{ fontSize: '0.78rem', color: muted }}>{form.provider || 'Provider'} → {form.client || 'Client'}</div>
                <div style={{ fontSize: '0.78rem', color: amber, marginTop: 4, fontFamily: mono }}>{form.value || selectedTpl.value.split(' /')[0]} · {form.duration} · {form.payment}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <div style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: amber, background: `${amber}1A`, border: `1px solid ${amber}33`, padding: '4px 10px', borderRadius: 4 }}>DRAFT</div>
              </div>
            </div>

            {/* Save gate */}
            {!saved && (
              <div style={{ background: surface2, border: `1px solid ${border2}`, borderRadius: 10, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4, color: text }}>Your contract is ready to send 🎉</div>
                  <div style={{ fontSize: '0.82rem', color: muted, lineHeight: 1.5 }}>Enter your email to save this contract, invite your vendor/client to sign, and get early access to ContractNest beta.</div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@business.com"
                    style={{
                      background: bg, border: `1px solid ${border2}`, borderRadius: 8, padding: '10px 16px',
                      color: text, fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', width: 220,
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = amber)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = border2)}
                  />
                  <button
                    onClick={handleSave}
                    style={{
                      background: amber, color: '#0D0F14', border: 'none', padding: '10px 22px', borderRadius: 8,
                      fontFamily: mono, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                      fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#FFB733')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = amber)}
                  >
                    Save & Get Access
                  </button>
                </div>
              </div>
            )}

            {/* Saved message */}
            {saved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: `${green}0D`, border: `1px solid ${green}26`, borderRadius: 8, fontSize: '0.85rem', color: green }}>
                ✓  Contract saved! We'll send you beta access — your vendor invite link will be ready on day one.
              </div>
            )}

            {/* VaNi nudge */}
            <div style={{ marginTop: 16, padding: '14px 18px', background: `${amber}0A`, border: `1px dashed ${amber}40`, borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ fontSize: '1.2rem' }}>🤖</div>
              <div style={{ flex: 1, fontSize: '0.8rem', color: muted, lineHeight: 1.5 }}>
                <strong style={{ color: amber }}>Coming Soon — VaNi</strong> will automatically monitor this contract, alert you on SLA breaches, chase evidence from your vendor, and trigger invoices on completion. <strong style={{ color: amber }}>Your virtual contract ops employee.</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <NavBackBtn onClick={() => goStep(3)}>← Back to Preview</NavBackBtn>
              <span style={{ fontSize: '0.75rem', color: faint, fontFamily: mono }}>90+ businesses on waitlist</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          #playground { padding: 48px 24px !important; }
        }
      `}</style>
    </section>
  );
};

// ─── Reusable Sub-Components ───

const FormField: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: VikunaBlackTheme.darkMode.colors.utility.primaryBackground,
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 14px',
        color: VikunaBlackTheme.darkMode.colors.utility.primaryText, fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none',
        transition: 'border-color 0.2s',
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = VikunaBlackTheme.darkMode.colors.brand.primary)}
      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
    />
  </div>
);

const FormSelect: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: string[] }> = ({ label, value, onChange, options }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: VikunaBlackTheme.darkMode.colors.utility.primaryBackground,
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 14px',
        color: VikunaBlackTheme.darkMode.colors.utility.primaryText, fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none',
        cursor: 'pointer', appearance: 'none',
      }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const NavBackBtn: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 20px',
      color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Mono', monospace", fontSize: '0.72rem', letterSpacing: '0.08em',
      cursor: 'pointer', transition: 'all 0.2s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = VikunaBlackTheme.darkMode.colors.utility.primaryText; e.currentTarget.style.color = VikunaBlackTheme.darkMode.colors.utility.primaryText; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
  >
    {children}
  </button>
);

const NavNextBtn: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      background: VikunaBlackTheme.darkMode.colors.brand.primary, color: '#0D0F14', border: 'none', padding: '12px 28px', borderRadius: 8,
      fontFamily: "'DM Mono', monospace", fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase',
      fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = '#FFB733')}
    onMouseLeave={(e) => (e.currentTarget.style.background = VikunaBlackTheme.darkMode.colors.brand.primary)}
  >
    {children}
  </button>
);

export default PlaygroundV3;
