// src/components/landing/LandingPricing.tsx — V3 Dark Theme (Credit-Based Pricing)
import React, { useState, useEffect, useRef } from 'react';

// ── Types ──────────────────────────────────────────────
interface PricingProps {
  onPlanSelect?: (planId: string) => void;
  onCalculatorOpen?: () => void;
  onContactSales?: () => void;
  className?: string;
}

interface PricingFeature {
  label: string;
  status: 'yes' | 'no' | 'soon';
  note?: string;
}

interface CreditRow {
  label: string;
  value: string;
  color?: 'green' | 'amber' | 'default';
}

interface OverageRow {
  label: string;
  price: string;
}

interface PricingTier {
  id: string;
  tier: string;
  featured?: boolean;
  featuredLabel?: string;
  priceDisplay: 'free' | 'currency';
  symbol?: string;
  amount?: string;
  period?: string;
  tagline: string;
  credits: CreditRow[];
  overage?: { rows: OverageRow[] };
  features: PricingFeature[];
  ctaLabel: string;
  ctaVariant: 'primary' | 'outline';
}

// ── CSS Variables (matching V3 design tokens) ──────────
const V3 = {
  bg: '#0D0F14',
  surface: '#13161D',
  surface2: '#1C2030',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.12)',
  amber: '#F5A623',
  amberDim: 'rgba(245,166,35,0.12)',
  green: '#2ECC71',
  greenDim: 'rgba(46,204,113,0.10)',
  red: '#E74C3C',
  text: '#E8E6E0',
  muted: '#7A8099',
  faint: '#3A3F52',
} as const;

const font = {
  heading: "'Bebas Neue', sans-serif",
  body: "'DM Sans', sans-serif",
  mono: "'DM Mono', monospace",
} as const;

// ── Pricing Data ───────────────────────────────────────
const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    tier: 'Free Tier',
    priceDisplay: 'free',
    tagline: 'Try ContractNest with your first 3 contracts. No card needed.',
    credits: [
      { label: 'Contracts included', value: '3 contracts', color: 'green' },
      { label: 'RFQs included', value: '—' },
    ],
    features: [
      { label: 'Basic contract creation', status: 'yes' },
      { label: 'Track on system', status: 'yes' },
      { label: 'Basic text forms', status: 'yes' },
      { label: 'SLA alerts & notifications', status: 'no' },
      { label: 'Smart service forms', status: 'no' },
      { label: 'AR / AP tracking', status: 'no' },
      { label: 'RFQ creation', status: 'no' },
    ],
    ctaLabel: 'Start Free',
    ctaVariant: 'outline',
  },
  {
    id: 'subscription',
    tier: 'Subscription',
    featured: true,
    featuredLabel: 'Most Popular · Best Value',
    priceDisplay: 'currency',
    symbol: '₹',
    amount: '2,000',
    period: '/ month',
    tagline: 'For businesses running contracts on both sides — revenue and cost.',
    credits: [
      { label: 'Contracts included', value: '8 contracts / month', color: 'amber' },
      { label: 'RFQs included', value: '5 RFQs / month', color: 'amber' },
    ],
    overage: {
      rows: [
        { label: 'Additional contract', price: '₹60 / contract' },
        { label: 'Additional RFQ', price: '₹100 / RFQ' },
      ],
    },
    features: [
      { label: 'Everything in Free', status: 'yes' },
      { label: 'SLA alerts & real-time notifications', status: 'yes' },
      { label: 'Smart service forms (calibration, OT clean, PM)', status: 'yes' },
      { label: 'Evidence collection — photos, reports, certs', status: 'yes' },
      { label: 'AR / AP tracking & auto-invoicing', status: 'yes' },
      { label: 'RFQ creation & vendor responses', status: 'yes' },
      { label: 'Compliance reports — audit ready', status: 'yes' },
      { label: 'VaNi AI ops agent', status: 'soon', note: 'add-on · ₹5,000/mo in beta' },
    ],
    ctaLabel: 'Join Beta — Get Early Access',
    ctaVariant: 'primary',
  },
  {
    id: 'payg',
    tier: 'Pay-as-you-go',
    priceDisplay: 'currency',
    symbol: '₹',
    amount: '150',
    period: '/ contract',
    tagline: 'One-time contracts. No monthly commitment. Pay only when you create.',
    credits: [
      { label: 'Contracts', value: '₹150 each' },
      { label: 'RFQs', value: '₹350 each' },
    ],
    features: [
      { label: 'Digital contract creation', status: 'yes' },
      { label: 'Track on system', status: 'yes' },
      { label: 'Basic text forms & evidence upload', status: 'yes' },
      { label: 'RFQ creation (₹350/RFQ)', status: 'yes' },
      { label: 'SLA alerts & notifications', status: 'no' },
      { label: 'Smart service forms', status: 'no' },
      { label: 'AR / AP tracking', status: 'no' },
    ],
    ctaLabel: 'Get Early Access',
    ctaVariant: 'outline',
  },
];

const CREDIT_PILLS = [
  '1 contract = 1 credit · charged once',
  '1 RFQ = 1 RFQ credit · charged on creation',
  'Credits don\'t expire within billing month',
  'Overage billed at end of month',
];

// ── Sub-components ─────────────────────────────────────

const EyebrowLine: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
    <div style={{ width: 32, height: 1, background: V3.amber }} />
    <span
      style={{
        fontFamily: font.mono,
        fontSize: '0.7rem',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: V3.amber,
      }}
    >
      {label}
    </span>
  </div>
);

const CreditBar: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: V3.surface,
      border: `1px solid ${V3.border2}`,
      borderRadius: 10,
      padding: '14px 20px',
      marginBottom: 40,
      flexWrap: 'wrap',
    }}
  >
    <div
      style={{
        fontFamily: font.mono,
        fontSize: '0.65rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: V3.amber,
        flexShrink: 0,
      }}
    >
      How credits work
    </div>
    <div style={{ width: 1, height: 16, background: V3.border2, flexShrink: 0 }} />
    {CREDIT_PILLS.map((text, i) => (
      <div
        key={i}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: V3.surface2,
          border: `1px solid ${V3.border}`,
          borderRadius: 100,
          padding: '5px 12px',
          fontSize: '0.78rem',
          color: V3.muted,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: V3.amber,
            flexShrink: 0,
          }}
        />
        <span dangerouslySetInnerHTML={{ __html: text.replace(/(\b\d[^·]*credit\b|don't expire|end of month)/gi, `<strong style="color:${V3.text};font-weight:500">$1</strong>`) }} />
      </div>
    ))}
  </div>
);

const FeatureIcon: React.FC<{ status: 'yes' | 'no' | 'soon' }> = ({ status }) => {
  const map = {
    yes: { char: '✓', color: V3.green },
    no: { char: '✕', color: V3.faint },
    soon: { char: '◎', color: V3.amber },
  };
  const { char, color } = map[status];
  return (
    <span
      style={{
        flexShrink: 0,
        fontSize: '0.7rem',
        marginTop: 2,
        color,
      }}
    >
      {char}
    </span>
  );
};

const PricingCard: React.FC<{
  tier: PricingTier;
  onCta: (id: string) => void;
  visible: boolean;
  delay: number;
}> = ({ tier, onCta, visible, delay }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setShow(true), delay);
      return () => clearTimeout(t);
    }
  }, [visible, delay]);

  const cardBg = tier.featured
    ? `linear-gradient(160deg, rgba(245,166,35,0.06) 0%, ${V3.surface} 40%)`
    : V3.surface;
  const cardBorder = tier.featured ? 'rgba(245,166,35,0.35)' : V3.border;
  const cardHoverBorder = tier.featured ? 'rgba(245,166,35,0.5)' : V3.border2;

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 14,
        overflow: 'hidden',
        position: 'relative',
        transition: 'border-color 0.25s, transform 0.25s, opacity 0.5s',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(18px)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = cardHoverBorder;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = cardBorder;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Featured Bar */}
      {tier.featured && tier.featuredLabel && (
        <div
          style={{
            background: V3.amber,
            color: V3.bg,
            fontFamily: font.mono,
            fontSize: '0.62rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            textAlign: 'center',
            padding: 6,
            fontWeight: 600,
          }}
        >
          {tier.featuredLabel}
        </div>
      )}

      {/* Top: Tier + Price + Tagline */}
      <div style={{ padding: '28px 28px 20px', borderBottom: `1px solid ${V3.border}` }}>
        <div
          style={{
            fontFamily: font.mono,
            fontSize: '0.65rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: V3.muted,
            marginBottom: 12,
          }}
        >
          {tier.tier}
        </div>

        {tier.priceDisplay === 'free' ? (
          <div
            style={{
              fontFamily: font.heading,
              fontSize: '3.2rem',
              lineHeight: 1,
              letterSpacing: '0.02em',
              color: V3.green,
              marginBottom: 6,
            }}
          >
            FREE
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
            <span style={{ fontFamily: font.body, fontSize: '1.2rem', color: V3.muted, fontWeight: 300 }}>
              {tier.symbol}
            </span>
            <span
              style={{
                fontFamily: font.heading,
                fontSize: '3.2rem',
                lineHeight: 1,
                letterSpacing: '0.02em',
                color: tier.featured ? V3.amber : V3.text,
              }}
            >
              {tier.amount}
            </span>
            <span style={{ fontSize: '0.78rem', color: V3.muted, fontWeight: 300 }}>
              {tier.period}
            </span>
          </div>
        )}

        <div style={{ fontSize: '0.82rem', color: V3.muted, lineHeight: 1.5, marginTop: 8 }}>
          {tier.tagline}
        </div>
      </div>

      {/* Credits */}
      <div
        style={{
          padding: '18px 28px',
          borderBottom: `1px solid ${V3.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {tier.credits.map((cr, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: '0.8rem',
                color: V3.muted,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: tier.featured ? V3.amber : V3.faint,
                  flexShrink: 0,
                }}
              />
              {cr.label}
            </span>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: '0.72rem',
                fontWeight: 500,
                textAlign: 'right',
                color: cr.color === 'green' ? V3.green : cr.color === 'amber' ? V3.amber : V3.text,
              }}
            >
              {cr.value}
            </span>
          </div>
        ))}
      </div>

      {/* Overage (subscription only) */}
      {tier.overage && (
        <div
          style={{
            padding: '14px 28px',
            borderBottom: `1px solid ${V3.border}`,
            background: 'rgba(255,255,255,0.015)',
          }}
        >
          <div
            style={{
              fontFamily: font.mono,
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: V3.faint,
              marginBottom: 8,
            }}
          >
            Overage rates
          </div>
          {tier.overage.rows.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.76rem',
                color: V3.muted,
                padding: '3px 0',
              }}
            >
              <span>{row.label}</span>
              <span style={{ fontFamily: font.mono, fontSize: '0.72rem', color: V3.text }}>
                {row.price}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Features */}
      <div style={{ padding: '18px 28px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {tier.features.map((f, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 9,
              fontSize: '0.8rem',
              color: V3.muted,
              lineHeight: 1.4,
              opacity: f.status === 'no' ? 0.45 : 1,
            }}
          >
            <FeatureIcon status={f.status} />
            <span>
              {f.label}
              {f.note && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: V3.amber,
                    fontFamily: font.mono,
                    marginLeft: 4,
                  }}
                >
                  {f.note}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: '20px 28px', borderTop: `1px solid ${V3.border}` }}>
        <button
          onClick={() => onCta(tier.id)}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 8,
            fontFamily: font.body,
            fontSize: '0.86rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            letterSpacing: '0.01em',
            border: tier.ctaVariant === 'outline' ? `1px solid ${V3.border2}` : 'none',
            background: tier.ctaVariant === 'primary' ? V3.amber : 'transparent',
            color: tier.ctaVariant === 'primary' ? V3.bg : V3.text,
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget;
            if (tier.ctaVariant === 'primary') {
              btn.style.background = '#FFB733';
              btn.style.transform = 'translateY(-1px)';
            } else {
              btn.style.borderColor = V3.amber;
              btn.style.color = V3.amber;
            }
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget;
            if (tier.ctaVariant === 'primary') {
              btn.style.background = V3.amber;
              btn.style.transform = 'translateY(0)';
            } else {
              btn.style.borderColor = V3.border2;
              btn.style.color = V3.text;
            }
          }}
        >
          {tier.ctaLabel}
        </button>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────
const LandingPricing: React.FC<PricingProps> = ({
  onPlanSelect,
  onCalculatorOpen,
  onContactSales,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const signupUrl =
    import.meta.env.VITE_SIGNUP_URL ||
    'https://contractnest-ui-production.up.railway.app/signup';

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (typeof gtag !== 'undefined') {
            gtag('event', 'pricing_section_view', {
              event_category: 'engagement',
              event_label: 'pricing_plans',
            });
          }
        }
      },
      { threshold: 0.15 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleCta = (planId: string) => {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pricing_plan_select', {
        event_category: 'conversion',
        event_label: planId,
      });
    }

    if (onPlanSelect) {
      onPlanSelect(planId);
    } else if (planId === 'enterprise') {
      onContactSales?.();
    } else {
      const el = document.getElementById('emailInput');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        el.focus();
      } else {
        window.location.href = signupUrl;
      }
    }
  };

  const handleVaniBeta = () => {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'vani_beta_apply', {
        event_category: 'conversion',
        event_label: 'pricing_vani_callout',
      });
    }
    const el = document.getElementById('emailInput');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      el.focus();
    } else {
      window.location.href = signupUrl;
    }
  };

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className={className}
      style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: 1200,
        margin: '0 auto',
        padding: '80px 56px',
      }}
    >
      {/* ── Header ─────────────────────────── */}
      <EyebrowLine label="Pricing" />

      <h2
        style={{
          fontFamily: font.heading,
          fontSize: 'clamp(2.4rem, 5vw, 4rem)',
          lineHeight: 0.95,
          letterSpacing: '0.02em',
          color: V3.text,
          marginBottom: 16,
        }}
      >
        PAY FOR THE WORK.
        <br />
        NOT THE SEAT.
      </h2>

      <p
        style={{
          fontSize: '1rem',
          color: V3.muted,
          fontWeight: 300,
          lineHeight: 1.6,
          maxWidth: 520,
          marginBottom: 48,
        }}
      >
        ContractNest runs on a{' '}
        <strong style={{ color: V3.text, fontWeight: 500 }}>credit system</strong> — not per-user
        licences. Your 2-person team and a 10-person team doing the same work pay the same. Add{' '}
        <strong style={{ color: V3.text, fontWeight: 500 }}>VaNi</strong> and you're not buying
        software — you're hiring an AI ops employee who costs a fraction of the work they replace.
      </p>

      {/* ── Credit Explainer ───────────────── */}
      <CreditBar />

      {/* ── Pricing Cards ──────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.1fr 1fr',
          gap: 16,
          alignItems: 'start',
        }}
        className="pricing-v3-grid"
      >
        {PRICING_TIERS.map((tier, i) => (
          <PricingCard
            key={tier.id}
            tier={tier}
            onCta={handleCta}
            visible={isVisible}
            delay={i * 150}
          />
        ))}
      </div>

      {/* ── Upgrade Nudge ──────────────────── */}
      <div
        style={{
          marginTop: 28,
          padding: '16px 20px',
          background: V3.surface,
          border: `1px solid ${V3.border}`,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>💡</span>
        <div style={{ fontSize: '0.8rem', color: V3.muted, lineHeight: 1.5 }}>
          On pay-as-you-go doing{' '}
          <strong style={{ color: V3.amber }}>14+ contracts/month?</strong> Subscription saves you
          money from contract #9 onwards — and unlocks alerts, smart forms, and AR/AP tracking. Add
          VaNi and you're replacing ₹75,000+/month in staff time for ₹5,000/month.{' '}
          <strong style={{ color: V3.amber }}>The math works itself out.</strong>
        </div>
      </div>

      {/* ── VaNi Standalone Callout ────────── */}
      <div
        style={{
          marginTop: 24,
          background: 'linear-gradient(135deg, rgba(245,166,35,0.07) 0%, rgba(13,15,20,0) 70%)',
          border: '1px solid rgba(245,166,35,0.25)',
          borderRadius: 12,
          padding: '32px 36px',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 32,
          alignItems: 'center',
        }}
        className="pricing-v3-vani-callout"
      >
        <div>
          <div
            style={{
              fontFamily: font.mono,
              fontSize: '0.62rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: V3.amber,
              marginBottom: 10,
            }}
          >
            VaNi · AI Ops Employee · Private Beta
          </div>
          <div
            style={{
              fontFamily: font.heading,
              fontSize: '1.8rem',
              letterSpacing: '0.04em',
              color: V3.text,
              marginBottom: 8,
            }}
          >
            YOUR CONTRACTS RUN THEMSELVES.
          </div>
          <div style={{ fontSize: '0.84rem', color: V3.muted, lineHeight: 1.6, maxWidth: 560 }}>
            VaNi handles vendor scheduling, SLA monitoring, customer communications, AR/AP chasing,
            and compliance reporting. A hospital pilot saved{' '}
            <strong style={{ color: V3.text }}>248 hours/month</strong> across 4 departments. At
            ₹5,000/month in beta — that's{' '}
            <strong style={{ color: V3.amber }}>15× ROI on day one.</strong>
          </div>
        </div>

        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div
            style={{
              fontFamily: font.heading,
              fontSize: '3rem',
              color: V3.amber,
              lineHeight: 1,
            }}
          >
            ₹5,000
          </div>
          <div
            style={{
              fontSize: '0.72rem',
              color: V3.muted,
              fontFamily: font.mono,
              letterSpacing: '0.06em',
              marginBottom: 16,
            }}
          >
            / month · beta pricing
          </div>
          <button
            onClick={handleVaniBeta}
            style={{
              background: V3.amber,
              color: V3.bg,
              border: 'none',
              fontFamily: font.body,
              fontSize: '0.86rem',
              fontWeight: 600,
              padding: '12px 24px',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FFB733';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = V3.amber;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Apply for VaNi Beta
          </button>
          <div
            style={{
              fontSize: '0.68rem',
              color: V3.faint,
              marginTop: 8,
              fontFamily: font.mono,
            }}
          >
            Limited to 8 pilot customers
          </div>
        </div>
      </div>

      {/* ── Responsive overrides (injected once) ── */}
      <style>{`
        @media (max-width: 900px) {
          #pricing {
            padding: 48px 24px !important;
          }
          .pricing-v3-grid {
            grid-template-columns: 1fr !important;
          }
          .pricing-v3-vani-callout {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
        }
      `}</style>
    </section>
  );
};

export default LandingPricing;
