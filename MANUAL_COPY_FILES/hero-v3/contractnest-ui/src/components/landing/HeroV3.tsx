// src/components/landing/HeroV3.tsx - Vikuna Black themed hero from contractnest-v3 reference
import React, { useState } from 'react';
import { VikunaBlackTheme } from '../../config/theme/themes/vikunaBlack';

interface HeroV3Props {
  onPlaygroundClick?: () => void;
  onGetEarlyAccess?: (email: string) => void;
  signupUrl?: string;
  className?: string;
}

// Always use Vikuna Black dark mode for landing hero
const colors = VikunaBlackTheme.darkMode.colors;

// Ticker items (duplicated for seamless scroll)
const tickerItems = [
  'Equipment Maintenance', 'Facility Management', 'IT Support Services',
  'Healthcare AMC / CMC', 'Consulting & CA Firms', 'Wellness Providers',
  'Manufacturing OEM', 'Security Services', 'Elevator & Lift AMC', 'HVAC Maintenance',
];

const stats = [
  { num: '₹700', sup: 'B+', label: 'Annual service contracts market in India' },
  { num: '65', sup: '%', label: 'Still managed on paper, Excel & WhatsApp' },
  { num: '250', sup: 'hrs', label: 'Avg. staff hours/month on contract ops — before VaNi' },
  { num: '2', sup: 'hrs', label: 'After VaNi. Measured at a live pilot hospital.' },
];

const HeroV3: React.FC<HeroV3Props> = ({
  onPlaygroundClick,
  onGetEarlyAccess,
  signupUrl,
  className = '',
}) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleJoin = () => {
    if (!email) return;
    if (onGetEarlyAccess) {
      onGetEarlyAccess(email);
    } else if (signupUrl) {
      const params = new URLSearchParams({ email, source: 'hero_v3' });
      window.location.href = `${signupUrl}?${params.toString()}`;
    }
    setSubmitted(true);
  };

  return (
    <section
      className={className}
      style={{
        background: colors.utility.primaryBackground,
        color: colors.utility.primaryText,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Noise texture overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
          opacity: 0.4,
          zIndex: 0,
        }}
      />

      {/* Hero Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '80px 56px 64px',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        {/* Grid pattern on right */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: -40,
            width: 480,
            height: '100%',
            backgroundImage: `linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
            maskImage: 'linear-gradient(to left, rgba(0,0,0,0.25) 0%, transparent 65%)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.25) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        {/* Eyebrow */}
        <div
          className="hero-v3-fadeup"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 32,
            animation: 'heroV3FadeUp 0.6s ease forwards 0.1s',
            opacity: 0,
          }}
        >
          <div style={{ width: 32, height: 1, background: colors.brand.primary }} />
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.7rem',
              letterSpacing: '0.16em',
              color: colors.brand.primary,
              textTransform: 'uppercase',
            }}
          >
            For businesses that sell services & buy them
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(3.8rem, 8vw, 7.5rem)',
            lineHeight: 0.92,
            letterSpacing: '0.02em',
            animation: 'heroV3FadeUp 0.7s ease forwards 0.2s',
            opacity: 0,
          }}
        >
          <span style={{ display: 'block', color: colors.utility.primaryText }}>
            YOUR CONTRACTS
          </span>
          <span style={{ display: 'block', color: colors.brand.primary }}>
            RUN YOUR BUSINESS.
          </span>
          <span style={{ display: 'block', color: colors.utility.primaryText, opacity: 0.22 }}>
            UNTIL THEY DON'T.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          style={{
            marginTop: 28,
            maxWidth: 560,
            fontSize: '1.1rem',
            fontWeight: 300,
            lineHeight: 1.7,
            color: colors.utility.secondaryText,
            animation: 'heroV3FadeUp 0.7s ease forwards 0.35s',
            opacity: 0,
          }}
        >
          Every business has two sides —{' '}
          <strong style={{ color: colors.utility.primaryText, fontWeight: 500 }}>
            revenue you're owed
          </strong>{' '}
          and{' '}
          <strong style={{ color: colors.utility.primaryText, fontWeight: 500 }}>
            costs you've committed to.
          </strong>{' '}
          ContractNest puts both on one platform. Every promise tracked. Every SLA enforced. Every
          rupee accounted for.
        </p>

        {/* Proof Strip */}
        <div
          style={{
            display: 'flex',
            marginTop: 36,
            border: `1px solid rgba(255,255,255,0.12)`,
            borderRadius: 10,
            overflow: 'hidden',
            maxWidth: 580,
            animation: 'heroV3FadeUp 0.7s ease forwards 0.45s',
            opacity: 0,
          }}
        >
          <div
            style={{
              flex: 1,
              padding: '16px 20px',
              background: colors.utility.secondaryBackground,
              borderRight: `1px solid rgba(255,255,255,0.12)`,
            }}
          >
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.64rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 5,
                color: colors.semantic.success,
              }}
            >
              ↑ Revenue Side
            </div>
            <div style={{ fontSize: '0.82rem', color: colors.utility.secondaryText, lineHeight: 1.45 }}>
              Create client contracts, track SLAs,{' '}
              <strong style={{ color: colors.utility.primaryText, fontWeight: 500 }}>
                collect on time.
              </strong>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              padding: '16px 20px',
              background: colors.utility.secondaryBackground,
            }}
          >
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.64rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 5,
                color: colors.brand.primary,
              }}
            >
              ↓ Cost Side
            </div>
            <div style={{ fontSize: '0.82rem', color: colors.utility.secondaryText, lineHeight: 1.45 }}>
              Manage vendors, verify work done,{' '}
              <strong style={{ color: colors.utility.primaryText, fontWeight: 500 }}>
                pay what's earned.
              </strong>
            </div>
          </div>
        </div>

        {/* CTA Block */}
        <div
          style={{
            marginTop: 36,
            maxWidth: 480,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            animation: 'heroV3FadeUp 0.7s ease forwards 0.55s',
            opacity: 0,
          }}
        >
          {!submitted ? (
            <>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@business.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  style={{
                    flex: 1,
                    background: colors.brand.alternate,
                    border: `1px solid rgba(255,255,255,0.12)`,
                    color: colors.utility.primaryText,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.9rem',
                    padding: '14px 18px',
                    borderRadius: 8,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleJoin}
                  style={{
                    background: colors.brand.primary,
                    color: colors.utility.primaryBackground,
                    border: 'none',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    padding: '14px 22px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.2s, transform 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FFB733';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.brand.primary;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Get Early Access
                </button>
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '0.7rem',
                  color: colors.brand.tertiary,
                  letterSpacing: '0.04em',
                }}
              >
                <span style={{ color: colors.brand.primary, fontStyle: 'normal' }}>90+</span>{' '}
                businesses already waitlisted &nbsp;·&nbsp; Free beta &nbsp;·&nbsp; No credit card
              </div>
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 18px',
                background: `${colors.semantic.success}1A`,
                border: `1px solid ${colors.semantic.success}33`,
                borderRadius: 8,
                color: colors.semantic.success,
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.82rem',
              }}
            >
              ✓ &nbsp;You're on the list. We'll reach out before beta opens.
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: 'flex',
            marginTop: 60,
            paddingTop: 36,
            borderTop: '1px solid rgba(255,255,255,0.07)',
            animation: 'heroV3FadeUp 0.7s ease forwards 0.7s',
            opacity: 0,
          }}
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                paddingRight: i < stats.length - 1 ? 28 : 0,
                marginRight: i < stats.length - 1 ? 28 : 0,
                borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '2.5rem',
                  lineHeight: 1,
                  color: colors.utility.primaryText,
                }}
              >
                {stat.num}
                <sup style={{ fontSize: '1.3rem', color: colors.brand.primary }}>
                  {stat.sup}
                </sup>
              </div>
              <div
                style={{
                  fontSize: '0.76rem',
                  color: colors.utility.secondaryText,
                  marginTop: 5,
                  lineHeight: 1.4,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ticker */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          borderTop: '1px solid rgba(255,255,255,0.07)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: colors.utility.secondaryBackground,
          padding: '13px 0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 'max-content',
            animation: 'heroV3Scroll 30s linear infinite',
          }}
        >
          {/* Duplicate items for seamless loop */}
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '0 30px',
                borderRight: '1px solid rgba(255,255,255,0.07)',
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.7rem',
                letterSpacing: '0.1em',
                color: colors.utility.secondaryText,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: colors.brand.primary,
                  flexShrink: 0,
                }}
              />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Keyframe animations injected via style tag */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

        @keyframes heroV3FadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes heroV3Scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        @keyframes heroV3Pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }

        @media (max-width: 768px) {
          .hero-v3-mobile-stack .hero-v3-stats-row {
            flex-direction: column !important;
            gap: 20px !important;
          }
        }
      `}</style>
    </section>
  );
};

export default HeroV3;
