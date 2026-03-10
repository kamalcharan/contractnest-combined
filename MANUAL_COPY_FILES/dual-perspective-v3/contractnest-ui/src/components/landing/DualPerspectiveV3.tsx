// src/components/landing/DualPerspectiveV3.tsx - Two Sides One Platform from v3 reference
import React, { useState } from 'react';
import { VikunaBlackTheme } from '../../config/theme/themes/vikunaBlack';

const colors = VikunaBlackTheme.darkMode.colors;
const green = '#2ECC71';
const amber = colors.brand.primary;
const red = '#E74C3C';
const blue = '#5DADE2';
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

type Perspective = 'hospital' | 'amc';

// ─── Hospital Asset Table Data ───
const hospitalAssets = [
  { icon: '🫁', name: 'GE Ventilator — Carescape R860', dept: 'ICU · Bed 4', status: 'covered' as const, contract: 'CN-2024-0041', expires: 'Mar 2026', lastPm: '12 Jan 2025' },
  { icon: '🧲', name: 'Siemens MRI — MAGNETOM Sola', dept: 'Radiology · B2', status: 'expiring' as const, contract: 'CN-2024-0012', expires: 'Apr 2025', lastPm: '03 Feb 2025', expiresColor: amber, expiringDays: '47d' },
  { icon: '❤️', name: 'Philips Cardiac Monitor — IntelliVue', dept: 'Cardiology · OPD', status: 'covered' as const, contract: 'CN-2024-0038', expires: 'Dec 2025', lastPm: '28 Jan 2025' },
  { icon: '⚡', name: 'Nihon Kohden Defibrillator — TEC-8300', dept: 'Emergency · OT-2', status: 'uncovered' as const, contract: '—', expires: 'Expired', lastPm: 'Nov 2024' },
  { icon: '🔬', name: 'Roche Cobas — Chemistry Analyser', dept: 'Lab · Ground Fl', status: 'expiring' as const, contract: 'CN-2024-0019', expires: 'May 2025', lastPm: '15 Jan 2025', expiresColor: amber, expiringDays: '63d' },
  { icon: '🩻', name: 'Fujifilm DR System — FDR Go Plus', dept: 'Radiology · B1', status: 'covered' as const, contract: 'CN-2024-0041', expires: 'Mar 2026', lastPm: '18 Jan 2025' },
];

// ─── AMC Contract Cards Data ───
const amcContracts = [
  {
    name: 'Apollo Hospital — Hyderabad', statusLabel: 'Active', statusType: 'active' as const,
    rows: [
      { label: 'Contract Value', value: '₹7.6L / year', color: green },
      { label: 'Assets Covered', value: '31 devices' },
      { label: 'Visits This Quarter', value: '8 / 8 completed ✓', color: green },
      { label: 'Open SLA Events', value: '0 breaches', color: green },
      { label: 'Renewal Due', value: 'Mar 2026 — 13 months', color: amber },
    ],
    assets: ['GE Ventilators ×3', 'Philips Monitors ×8', 'Fujifilm DR ×2', 'Infusion Pumps ×12', '+6 more'],
  },
  {
    name: 'Yashoda Hospital — Secunderabad', statusLabel: 'Renewal Due', statusType: 'renewing' as const,
    rows: [
      { label: 'Contract Value', value: '₹4.2L / year', color: amber },
      { label: 'Assets Covered', value: '18 devices' },
      { label: 'Visits This Quarter', value: '5 / 6 — 1 pending', color: amber },
      { label: 'Open SLA Events', value: '1 breach — response delayed', color: red },
      { label: 'Renewal Due', value: 'Apr 2025 — 47 days', color: red },
    ],
    assets: ['Siemens MRI ×1', 'Roche Analyser ×2', 'ECG Machines ×4', '+11 more'],
  },
  {
    name: 'KIMS Hospital — Secunderabad', statusLabel: 'Active', statusType: 'active' as const,
    rows: [
      { label: 'Contract Value', value: '₹2.8L / year', color: green },
      { label: 'Assets Covered', value: '12 devices' },
      { label: 'Visits This Quarter', value: '4 / 4 completed ✓', color: green },
      { label: 'Open SLA Events', value: '0 breaches', color: green },
      { label: 'Renewal Due', value: 'Nov 2025 — 8 months' },
    ],
    assets: ['Patient Monitors ×6', 'Defibrillators ×2', 'Autoclave ×1', '+3 more'],
  },
  {
    name: 'Care Hospital — Banjara Hills', statusLabel: 'Renewal Due', statusType: 'renewing' as const,
    rows: [
      { label: 'Contract Value', value: '₹1.9L / year', color: amber },
      { label: 'Assets Covered', value: '9 devices' },
      { label: 'Visits This Quarter', value: '3 / 3 completed ✓', color: green },
      { label: 'Open SLA Events', value: '0 breaches', color: green },
      { label: 'Renewal Due', value: 'May 2025 — 63 days', color: amber },
    ],
    assets: ['Roche Cobas ×1', 'Ultrasound ×2', 'OT Lights ×4', '+2 more'],
  },
];

// ─── Coverage pill helper ───
const coveragePillStyle = (status: 'covered' | 'expiring' | 'uncovered'): React.CSSProperties => {
  const map = {
    covered: { bg: 'rgba(46,204,113,0.08)', color: green, border: 'rgba(46,204,113,0.2)' },
    expiring: { bg: 'rgba(245,166,35,0.08)', color: amber, border: 'rgba(245,166,35,0.2)' },
    uncovered: { bg: 'rgba(231,76,60,0.08)', color: red, border: 'rgba(231,76,60,0.2)' },
  };
  const s = map[status];
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.08em',
    padding: '3px 9px', borderRadius: 4, whiteSpace: 'nowrap',
    background: s.bg, color: s.color, border: `1px solid ${s.border}`,
  };
};

const coverageLabel = (status: 'covered' | 'expiring' | 'uncovered', days?: string) => {
  if (status === 'covered') return '● Covered';
  if (status === 'expiring') return `⚠ Expiring ${days || ''}`;
  return '✕ No Coverage';
};

// ─── Bridge Component ───
const Bridge: React.FC<{
  leftType: 'hospital' | 'amc'; leftLabel: string; leftQ: string; leftA: string;
  rightType: 'hospital' | 'amc'; rightLabel: string; rightQ: string; rightA: string;
}> = ({ leftType, leftLabel, leftQ, leftA, rightType, rightLabel, rightQ, rightA }) => {
  const sideStyle = (type: 'hospital' | 'amc'): React.CSSProperties => ({
    padding: '24px 28px', borderRadius: 10,
    background: type === 'hospital' ? 'rgba(52,152,219,0.06)' : 'rgba(46,204,113,0.05)',
    border: `1px solid ${type === 'hospital' ? 'rgba(52,152,219,0.15)' : 'rgba(46,204,113,0.15)'}`,
  });
  const labelColor = (type: 'hospital' | 'amc') => type === 'hospital' ? blue : green;

  return (
    <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 60px 1fr', alignItems: 'center', gap: 0 }}>
      <div style={sideStyle(leftType)}>
        <div style={{ fontFamily: mono, fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, color: labelColor(leftType) }}>{leftLabel}</div>
        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: text, marginBottom: 6, lineHeight: 1.35 }}>{leftQ}</div>
        <div style={{ fontSize: '0.8rem', color: muted, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: leftA.replace(/<hl>/g, `<span style="color:${amber};font-weight:500">`).replace(/<\/hl>/g, '</span>') }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <div style={{ fontFamily: bebas, fontSize: '1.6rem', color: amber, lineHeight: 1 }}>↔</div>
        <div style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: amber, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Same Data</div>
      </div>
      <div style={sideStyle(rightType)}>
        <div style={{ fontFamily: mono, fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, color: labelColor(rightType) }}>{rightLabel}</div>
        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: text, marginBottom: 6, lineHeight: 1.35 }}>{rightQ}</div>
        <div style={{ fontSize: '0.8rem', color: muted, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: rightA.replace(/<hl>/g, `<span style="color:${amber};font-weight:500">`).replace(/<\/hl>/g, '</span>') }} />
      </div>
    </div>
  );
};

// ─── Main Component ───
const DualPerspectiveV3: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [perspective, setPerspective] = useState<Perspective>('hospital');

  return (
    <section
      id="perspective"
      className={className}
      style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', padding: '80px 56px' }}
    >
      {/* Eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
        <div style={{ width: 32, height: 1, background: amber }} />
        <span style={{ fontFamily: mono, fontSize: '0.7rem', letterSpacing: '0.16em', color: amber, textTransform: 'uppercase' }}>
          Two Sides. One Platform.
        </span>
      </div>

      {/* Headline */}
      <h2 style={{ fontFamily: bebas, fontSize: 'clamp(2.4rem, 5vw, 4.2rem)', lineHeight: 0.95, letterSpacing: '0.02em', marginBottom: 14, color: text }}>
        SAME CONTRACT.<br />DIFFERENT LENS.
      </h2>

      {/* Subtitle */}
      <p style={{ fontSize: '1rem', color: muted, fontWeight: 300, lineHeight: 1.65, maxWidth: 560, marginBottom: 48 }}>
        A hospital thinks in <strong style={{ color: text, fontWeight: 500 }}>assets — is this equipment covered?</strong>{' '}
        An AMC company thinks in <strong style={{ color: text, fontWeight: 500 }}>contracts — what's in scope?</strong>{' '}
        ContractNest bridges both worlds. One platform. Two home screens. Zero gaps.
      </p>

      {/* Toggle */}
      <div style={{ display: 'inline-flex', background: surface, border: `1px solid ${border2}`, borderRadius: 10, padding: 4, marginBottom: 36, gap: 4 }}>
        {([
          { key: 'hospital' as Perspective, label: '🏥 Hospital View — Asset Coverage' },
          { key: 'amc' as Perspective, label: '🔧 AMC Company View — Contract Pipeline' },
        ]).map((btn) => (
          <button
            key={btn.key}
            onClick={() => setPerspective(btn.key)}
            style={{
              fontFamily: mono, fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '10px 20px', borderRadius: 7, border: 'none', cursor: 'pointer',
              transition: 'all 0.25s', whiteSpace: 'nowrap',
              background: perspective === btn.key ? amber : 'transparent',
              color: perspective === btn.key ? '#0D0F14' : muted,
              fontWeight: perspective === btn.key ? 600 : 400,
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* ═══════ HOSPITAL VIEW ═══════ */}
      {perspective === 'hospital' && (
        <div>
          <div style={{ background: surface, border: `1px solid ${border2}`, borderRadius: 14, overflow: 'hidden' }}>
            {/* Dashboard bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: surface2, borderBottom: `1px solid ${border}`, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontFamily: mono, fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: amber }}>
                Asset Coverage Dashboard · Apollo Hospital — Hyderabad
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {[
                  { color: green, label: '31 Covered' },
                  { color: amber, label: '8 Expiring Soon', pulse: true },
                  { color: red, label: '4 Uncovered' },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: mono, fontSize: '0.65rem', color: muted }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0, ...(m.pulse ? { animation: 'dpPulse 1.5s ease-in-out infinite' } : {}) }} />
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Coverage stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${border}` }}>
              {[
                { num: '43', color: text, label: 'Total biomedical assets tracked' },
                { num: '31', color: green, label: 'Fully covered — active AMC/CMC' },
                { num: '8', color: amber, label: 'Coverage expiring in <90 days' },
                { num: '4', color: red, label: 'No coverage — procurement alert sent' },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{ padding: '20px 24px', borderRight: i < 3 ? `1px solid ${border}` : 'none', transition: 'background 0.2s', cursor: 'default' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = surface2)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontFamily: bebas, fontSize: '2.2rem', lineHeight: 1, marginBottom: 4, color: s.color }}>{s.num}</div>
                  <div style={{ fontSize: '0.74rem', color: muted, lineHeight: 1.4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Asset table */}
            <div style={{ padding: 24 }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1.2fr 1fr 1.2fr 1fr', gap: 12, padding: '8px 12px', marginBottom: 6 }}>
                {['Asset / Equipment', 'Dept / Location', 'Coverage Status', 'Contract', 'Expires', 'Last PM'].map((h) => (
                  <div key={h} style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: faint }}>{h}</div>
                ))}
              </div>
              {/* Rows */}
              {hospitalAssets.map((a, i) => (
                <div
                  key={i}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1.2fr 1fr 1.2fr 1fr', gap: 12, padding: '12px 12px', borderRadius: 7, marginBottom: 4, transition: 'background 0.2s', alignItems: 'center', cursor: 'default' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = surface2)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontSize: '0.8rem', color: text, fontWeight: 500 }}>{a.icon} {a.name}</div>
                  <div style={{ fontSize: '0.8rem', color: muted }}>{a.dept}</div>
                  <div><span style={coveragePillStyle(a.status)}>{coverageLabel(a.status, a.expiringDays)}</span></div>
                  <div style={{ fontFamily: mono, fontSize: '0.7rem', color: a.status === 'uncovered' ? red : muted }}>{a.contract}</div>
                  <div style={{ fontSize: '0.8rem', color: a.expiresColor || (a.status === 'uncovered' ? red : muted) }}>{a.expires}</div>
                  <div style={{ fontSize: '0.8rem', color: muted }}>{a.lastPm}</div>
                </div>
              ))}
            </div>

            {/* Insight bar */}
            <div style={{ margin: '0 24px 24px', padding: '14px 18px', background: 'rgba(245,166,35,0.05)', border: '1px dashed rgba(245,166,35,0.25)', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>💡</div>
              <div style={{ fontSize: '0.8rem', color: muted, lineHeight: 1.6 }}>
                <strong style={{ color: amber }}>ContractNest detected:</strong> Your Defibrillator in Emergency-OT2 has no active coverage. The Siemens MRI and Roche Analyser contracts expire in under 90 days — renewal RFPs have been auto-drafted and are ready to send. <strong style={{ color: amber }}>NABH calibration audit is in 38 days.</strong>
              </div>
            </div>
          </div>

          {/* Bridge */}
          <Bridge
            leftType="hospital" leftLabel="🏥 Hospital Team Asks"
            leftQ='"Is all our critical equipment covered right now?"'
            leftA='Biomedical engineers and admin teams see a <hl>live coverage map</hl> — not a contract list. Green, amber, red. Simple. No contract jargon needed.'
            rightType="amc" rightLabel="🔧 AMC Company Sees"
            rightQ='"Which of our contracts are up for renewal this quarter?"'
            rightA='Service teams see their <hl>contract pipeline with asset schedules</hl> — visit logs, SLA clocks, renewal alerts. Same underlying data, different view.'
          />
        </div>
      )}

      {/* ═══════ AMC COMPANY VIEW ═══════ */}
      {perspective === 'amc' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {amcContracts.map((c, ci) => (
              <div
                key={ci}
                style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s', cursor: 'default' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = border2; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {/* Header */}
                <div style={{ padding: '14px 18px', background: surface2, borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: text }}>{c.name}</div>
                  <div style={{
                    fontFamily: mono, fontSize: '0.58rem', letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 3,
                    ...(c.statusType === 'active'
                      ? { background: 'rgba(46,204,113,0.08)', color: green, border: '1px solid rgba(46,204,113,0.2)' }
                      : { background: 'rgba(245,166,35,0.08)', color: amber, border: '1px solid rgba(245,166,35,0.2)' }),
                  }}>
                    {c.statusLabel}
                  </div>
                </div>

                {/* Rows */}
                <div style={{ padding: '16px 18px' }}>
                  {c.rows.map((r, ri) => (
                    <div key={ri} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: ri < c.rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', fontSize: '0.76rem' }}>
                      <span style={{ color: muted }}>{r.label}</span>
                      <span style={{ color: r.color || text, fontWeight: 500, fontFamily: mono, fontSize: '0.72rem' }}>{r.value}</span>
                    </div>
                  ))}
                </div>

                {/* Asset tags */}
                <div style={{ margin: '10px 18px 14px', padding: '10px 14px', background: bg, borderRadius: 6, border: `1px solid ${border}` }}>
                  <div style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: faint, marginBottom: 6 }}>Assets on this contract</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {c.assets.map((a, ai) => (
                      <span key={ai} style={{ fontSize: '0.7rem', color: muted, background: surface, border: `1px solid ${border}`, padding: '2px 8px', borderRadius: 3 }}>{a}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bridge */}
          <Bridge
            leftType="amc" leftLabel="🔧 AMC Company Sees"
            leftQ='"Yashoda renewal in 47 days — what\'s the right price?"'
            leftA='Service teams see <hl>visit history, SLA performance, asset additions</hl> — everything needed to price a competitive renewal proposal in minutes, not days.'
            rightType="hospital" rightLabel="🏥 Hospital Receives"
            rightQ='"Our MRI contract renewal just arrived — is the SLA stronger?"'
            rightA='Hospital procurement sees a <hl>proposal built from their own asset data</hl> — no scope gaps, no missing equipment, no back-and-forth. Ready to sign.'
          />
        </div>
      )}

      <style>{`
        @keyframes dpPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        @media (max-width: 900px) {
          #perspective { padding: 48px 24px !important; }
        }
      `}</style>
    </section>
  );
};

export default DualPerspectiveV3;
