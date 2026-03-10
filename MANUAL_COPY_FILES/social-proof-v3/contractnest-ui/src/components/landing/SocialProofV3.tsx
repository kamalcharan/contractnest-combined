// src/components/landing/SocialProofV3.tsx - Early Customers / Social Proof section from v3 reference
import React from 'react';
import { VikunaBlackTheme } from '../../config/theme/themes/vikunaBlack';

const c = VikunaBlackTheme.darkMode.colors;
const amber = c.brand.primary;
const green = '#2ECC71';
const text = c.utility.primaryText;
const muted = c.utility.secondaryText;
const surface = c.utility.secondaryBackground;
const surface2 = 'rgba(255,255,255,0.04)';
const border = 'rgba(255,255,255,0.07)';
const border2 = 'rgba(255,255,255,0.12)';
const mono = "'DM Mono', monospace";
const bebas = "'Bebas Neue', sans-serif";

// ─── Testimonials ───
interface Testimonial {
  industry: string;
  icon: string;
  tagClass: 'hospital' | 'wellness' | 'oem';
  quote: React.ReactNode;
  name: string;
  role: string;
  metric: string;
  metricAmber?: boolean;
}

const tagColors = {
  hospital: { bg: 'rgba(52,152,219,0.1)', color: '#5DADE2', border: 'rgba(52,152,219,0.2)' },
  wellness: { bg: `${green}14`, color: green, border: 'rgba(46,204,113,0.2)' },
  oem: { bg: 'rgba(155,89,182,0.1)', color: '#A569BD', border: 'rgba(155,89,182,0.2)' },
};

const testimonials: Testimonial[] = [
  {
    industry: 'Healthcare', icon: '🏥', tagClass: 'hospital',
    quote: (
      <>
        "We went from receipts in a drawer to knowing exactly which vendor is coming, when, and what they promised. Our <strong>OT scheduling improved</strong> — we now plan around service events instead of being surprised by them. <span style={{ color: green, fontWeight: 500 }}>SLA compliance jumped from 45% to 80% in two months.</span> The digital records are also building our foundation for NABH calibration compliance."
      </>
    ),
    name: 'Biomedical & Admin Team',
    role: '70-bed Hospital · Hyderabad',
    metric: '↑ 45% → 80% SLA compliance in 60 days',
  },
  {
    industry: 'Wellness', icon: '🧘', tagClass: 'wellness',
    quote: (
      <>
        "We sold <strong>600 packages in 2 months</strong> and nearly drowned in our own success. We were calling customers who had already paid — because nobody had the same data. ContractNest organized our chaos. Now we know exactly what's promised, what's delivered, and what's owed. <span style={{ color: amber, fontWeight: 500 }}>We're waiting for VaNi</span> — the day it can automatically chase session completions and send client reminders, we won't need a third ops hire."
      </>
    ),
    name: 'CMO',
    role: 'Wellness Startup · Hyderabad',
    metric: '600 packages · AR now fully visible',
    metricAmber: true,
  },
  {
    industry: 'Manufacturing OEM', icon: '⚙️', tagClass: 'oem',
    quote: (
      <>
        "We have <strong>400 machines in the field</strong> on subscription. Every one has a service schedule, a spare parts history, and an SLA attached to it. Before ContractNest, that lived across engineer WhatsApps and spreadsheets — invoicing was always chasing. Now <strong>subscriptions run cleanly, invoices go out on time</strong>, and every service visit is logged with evidence. When IoT tracking comes, this platform will close the loop completely."
      </>
    ),
    name: 'Operations Lead',
    role: 'Industrial Machinery OEM · India',
    metric: '400 deployments · on-time invoicing',
  },
];

// ─── Trust Stats ───
const trustStats = [
  { num: '3', label: 'Beta customers', desc: 'across Healthcare, Wellness & Manufacturing' },
  { num: '80%', label: 'SLA compliance', desc: 'achieved by our hospital customer in 60 days' },
  { num: '600+', label: 'Service packages', desc: 'managed by our wellness customer in 2 months' },
  { num: '400+', label: 'Field deployments', desc: 'tracked by our OEM customer on subscription' },
];

const SocialProofV3: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <section
      id="proof"
      className={className}
      style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', padding: '80px 56px' }}
    >
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 56 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 32, height: 1, background: amber }} />
            <span style={{ fontFamily: mono, fontSize: '0.7rem', letterSpacing: '0.16em', color: amber, textTransform: 'uppercase' }}>
              Early Customers
            </span>
          </div>
          <h2 style={{ fontFamily: bebas, fontSize: 'clamp(2.4rem, 5vw, 4rem)', lineHeight: 0.95, letterSpacing: '0.02em', color: text }}>
            REAL BUSINESSES.<br />REAL OUTCOMES.
          </h2>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: bebas, fontSize: '3.2rem', lineHeight: 1, color: amber }}>90+</div>
          <div style={{ fontFamily: mono, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: muted, marginTop: 4 }}>
            Businesses on waitlist
          </div>
        </div>
      </div>

      {/* ─── Testimonial Cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 64 }}>
        {testimonials.map((t) => {
          const tc = tagColors[t.tagClass];
          return (
            <div
              key={t.name}
              style={{
                background: surface, border: `1px solid ${border}`, borderRadius: 12,
                padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16,
                position: 'relative', overflow: 'hidden', transition: 'border-color 0.25s, transform 0.25s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = border2; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {/* Decorative quote mark */}
              <div style={{
                position: 'absolute', top: -10, right: 20,
                fontFamily: 'Georgia, serif', fontSize: '5rem', color: 'rgba(255,255,255,0.03)',
                lineHeight: 1, pointerEvents: 'none',
              }}>"</div>

              {/* Industry tag */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                padding: '4px 10px', borderRadius: 4, width: 'fit-content',
              }}>
                {t.icon} &nbsp;{t.industry}
              </div>

              {/* Quote */}
              <div style={{ fontSize: '0.88rem', color: muted, lineHeight: 1.75, fontStyle: 'italic', flex: 1 }}>
                <QuoteText>{t.quote}</QuoteText>
              </div>

              {/* Author */}
              <div style={{ borderTop: `1px solid ${border}`, paddingTop: 16 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: text, marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontSize: '0.74rem', color: muted, marginBottom: 10 }}>{t.role}</div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: mono, fontSize: '0.62rem', letterSpacing: '0.08em',
                  background: t.metricAmber ? `${amber}14` : `${green}14`,
                  border: `1px solid ${t.metricAmber ? `${amber}33` : `${green}33`}`,
                  color: t.metricAmber ? amber : green,
                  padding: '4px 10px', borderRadius: 4,
                }}>
                  {t.metric}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Trust Stats ─── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
        border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden',
      }}>
        {trustStats.map((stat, i) => (
          <div
            key={stat.num}
            style={{
              background: surface, padding: '28px 24px',
              borderRight: i < trustStats.length - 1 ? `1px solid ${border}` : 'none',
              transition: 'background 0.2s', cursor: 'default',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = surface2)}
            onMouseLeave={(e) => (e.currentTarget.style.background = surface)}
          >
            <div style={{ fontFamily: bebas, fontSize: '2.4rem', lineHeight: 1, color: amber, marginBottom: 6 }}>
              {stat.num}
            </div>
            <div style={{ fontSize: '0.78rem', color: muted, lineHeight: 1.45 }}>
              <strong style={{ color: text, display: 'block', fontWeight: 500 }}>{stat.label}</strong>
              {stat.desc}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 900px) {
          #proof { padding: 48px 24px !important; }
        }
      `}</style>
    </section>
  );
};

// Helper to style <strong> tags inside quotes
const QuoteText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{ fontStyle: 'italic' }}
    css-strong={{ color: text, fontStyle: 'normal', fontWeight: 500 }}
  >
    {children}
  </span>
);

export default SocialProofV3;
