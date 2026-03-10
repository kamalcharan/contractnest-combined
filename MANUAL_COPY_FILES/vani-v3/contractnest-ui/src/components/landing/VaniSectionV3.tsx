// src/components/landing/VaniSectionV3.tsx - "Meet VaNi" AI Ops Employee section from v3 reference
import React from 'react';
import { VikunaBlackTheme } from '../../config/theme/themes/vikunaBlack';

const c = VikunaBlackTheme.darkMode.colors;
const amber = c.brand.primary;
const green = '#2ECC71';
const text = c.utility.primaryText;
const muted = c.utility.secondaryText;
const surface = c.utility.secondaryBackground;
const border = 'rgba(255,255,255,0.07)';
const mono = "'DM Mono', monospace";
const bebas = "'Bebas Neue', sans-serif";

// ─── Capability Cards ───
const capabilities = [
  { icon: '⏰', title: 'Vendor scheduling', desc: 'Sends visit reminders, confirms schedules, chases evidence after every service. No human required.' },
  { icon: '🚨', title: 'SLA monitoring', desc: 'Watches every SLA clock in real time. Escalates before breach. Triggers penalties automatically.' },
  { icon: '🧾', title: 'AR / AP automation', desc: 'Raises invoices on completion, chases outstanding payments, tracks what\'s owed and what\'s due.' },
  { icon: '💬', title: 'Customer communications', desc: 'Manages all customer interactions via WhatsApp — appointments, updates, reminders, renewals.' },
  { icon: '🔄', title: 'Renewal management', desc: 'Flags expiring contracts 30 days out, drafts renewal proposals, follows up until signed.' },
  { icon: '📊', title: 'Compliance reporting', desc: 'Auto-generates audit-ready compliance summaries every month. One click. Zero chasing.' },
];

// ─── Terminal Lines ───
interface TermLine { type: 'cmd' | 'out' | 'warn' | 'info'; text: string }
const terminalLines: TermLine[] = [
  { type: 'cmd', text: '08:14 · vendor follow-up: Elevator AMC · Q3 PM overdue by 2 days' },
  { type: 'warn', text: '  ⚠ WhatsApp sent to TechLift Services: "Q3 service overdue. Please confirm visit date."' },
  { type: 'out', text: '  ✓ vendor confirmed: 15 March 10:00 AM · SLA clock reset' },
  { type: 'cmd', text: '09:32 · customer: Mrs. Sharma · Wellness Package #WP-0291 · session 3 of 4' },
  { type: 'info', text: '  WhatsApp reminder sent: "Your yoga session is tomorrow at 7 AM. Reply YES to confirm."' },
  { type: 'out', text: '  ✓ confirmed · appointment locked · calendar updated' },
  { type: 'cmd', text: '11:05 · AR alert: Invoice #INV-2847 · ₹1,24,000 · 7 days overdue' },
  { type: 'warn', text: '  ⚠ payment reminder sent · escalation scheduled: +3 days' },
  { type: 'cmd', text: '14:20 · service complete: MRI Unit · evidence uploaded · invoice auto-raised ₹18,500' },
];

// ─── ROI Stats ───
const roiStats = [
  { value: '250→2', color: amber, label: 'Staff hours saved per month' },
  { value: '15×', color: green, label: 'ROI vs. VaNi monthly cost' },
  { value: '4', color: text, label: 'Departments replaced: biomedical, accounts, facilities, management' },
];

const VaniSectionV3: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <section
      id="vani"
      className={className}
      style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', padding: '80px 56px' }}
    >
      {/* Outer wrapper with gradient border glow */}
      <div style={{
        background: 'linear-gradient(135deg, #0D1520 0%, #0D0F14 60%)',
        border: `1px solid rgba(245,166,35,0.2)`,
        borderRadius: 16, overflow: 'hidden', position: 'relative',
      }}>
        {/* Subtle glow effects */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 200, height: 200, background: `radial-gradient(circle, ${amber}15 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 160, height: 160, background: `radial-gradient(circle, ${amber}0A 0%, transparent 70%)`, pointerEvents: 'none' }} />

        {/* ─── TOP: Intro + Capabilities Grid ─── */}
        <div style={{ padding: '48px 56px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start', position: 'relative', zIndex: 1 }}>
          {/* LEFT: Intro */}
          <div>
            {/* Live badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: mono, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: amber, background: `${amber}12`, border: `1px solid ${amber}30`, borderRadius: 20,
              padding: '5px 14px', marginBottom: 20,
            }}>
              <span style={{
                width: 6, height: 6, background: amber, borderRadius: '50%',
                animation: 'vaniPulse 1.5s ease-in-out infinite', display: 'inline-block',
              }} />
              Private Beta · Live with Customers
            </div>

            <h2 style={{
              fontFamily: bebas, fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', lineHeight: 0.92,
              letterSpacing: '0.02em', marginBottom: 16, color: text,
            }}>
              MEET <span style={{ color: amber }}>VANI</span><br />
              YOUR AI OPS<br />
              EMPLOYEE
            </h2>

            <p style={{ fontSize: '1rem', color: muted, fontWeight: 300, lineHeight: 1.65, maxWidth: 420, marginBottom: 24 }}>
              VaNi doesn't just track your contracts — it <strong style={{ color: text, fontWeight: 500 }}>runs them.</strong> Chasing vendors, scheduling services, raising invoices, managing AR/AP, handling customer communications. The work your team spends 250+ hours a month doing? VaNi does it in 2.
            </p>

            {/* Stat callout */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: `${amber}08`, border: `1px solid ${amber}20`, borderRadius: 10,
              padding: '14px 18px', maxWidth: 380,
            }}>
              <div style={{ fontSize: '1.2rem' }}>📊</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, marginBottom: 2, color: text }}>250 hrs → 2 hrs/month</div>
                <div style={{ fontSize: '0.74rem', color: muted }}>Measured across biomedical, accounts, facilities & management at a live pilot hospital</div>
              </div>
            </div>
          </div>

          {/* RIGHT: Capability Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {capabilities.map((cap) => (
              <div
                key={cap.title}
                style={{
                  padding: '18px 20px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${border}`,
                  borderRadius: 10, cursor: 'default', transition: 'all 0.25s', position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(245,166,35,0.2)'; e.currentTarget.style.background = 'rgba(245,166,35,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              >
                <div style={{ fontSize: '1.3rem', marginBottom: 8 }}>{cap.icon}</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: text, marginBottom: 4 }}>{cap.title}</div>
                <div style={{ fontSize: '0.75rem', color: muted, lineHeight: 1.5 }}>{cap.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── TERMINAL ─── */}
        <div style={{
          margin: '40px 56px 0', background: '#080A0F', border: '1px solid rgba(245,166,35,0.15)',
          borderRadius: 10, overflow: 'hidden', position: 'relative', zIndex: 1,
        }}>
          {/* Terminal bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28CA42' }} />
            <div style={{ fontFamily: mono, fontSize: '0.65rem', color: muted, letterSpacing: '0.06em', marginLeft: 8 }}>
              vani@contractnest ~ ops-agent · live pilot · Apollo Hospital
            </div>
          </div>

          {/* Terminal body */}
          <div style={{ padding: '20px 24px', fontFamily: mono, fontSize: '0.78rem', lineHeight: 2.1 }}>
            {terminalLines.map((line, i) => {
              if (line.type === 'cmd') {
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ color: amber, flexShrink: 0 }}>→</span>
                    <span style={{ color: '#E8E6E0' }}>
                      {line.text}
                      {i === terminalLines.length - 1 && (
                        <span style={{
                          display: 'inline-block', width: 8, height: 14, background: amber,
                          verticalAlign: 'middle', marginLeft: 6, animation: 'vaniBlink 1s step-end infinite',
                        }} />
                      )}
                    </span>
                  </div>
                );
              }
              const color = line.type === 'warn' ? '#F5A623' : line.type === 'info' ? muted : green;
              return (
                <div key={i} style={{ color, paddingLeft: 20 }}>{line.text}</div>
              );
            })}
          </div>
        </div>

        {/* ─── ROI STRIP ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, margin: '2px 0 0' }}>
          {roiStats.map((stat) => (
            <div key={stat.label} style={{
              background: surface, border: `1px solid ${border}`, padding: '24px 28px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: bebas, fontSize: '2.8rem', color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.76rem', color: muted, marginTop: 6 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes vaniPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        @keyframes vaniBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @media (max-width: 900px) {
          #vani { padding: 48px 24px !important; }
          #vani .vani-top-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
};

export default VaniSectionV3;
