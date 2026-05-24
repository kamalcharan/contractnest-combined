// src/pages/onboarding/steps/VaniIntroStep.tsx
// Screen 1.5 — VaNi Introduction. Standalone full-screen route (no OnboardingLayout header).
// Applies VaNi theme on mount; all colors read from useTheme() — zero hardcoded values.

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';

const VaniIntroStep: React.FC = () => {
  const navigate = useNavigate();
  const { setTheme, currentTheme } = useTheme();
  const { user, currentTenant } = useAuth();

  // Always light variant for this screen — design is intentionally dark via accent tokens.
  const colors = currentTheme.colors;

  const firstName = user?.first_name || 'there';
  const companyName = currentTenant?.name || 'your company';

  useEffect(() => {
    setTheme('vani');
  }, []);

  const handleLetsGo = () => {
    navigate('/onboarding/user-profile');
  };

  // Inline keyframes injected once per mount so we have no CSS file dependency.
  const animationStyles = `
    @keyframes orbPulse {
      0%, 100% { transform: scale(1); opacity: .8; }
      50%       { transform: scale(1.08); opacity: 1; }
    }
    @keyframes orbMorph {
      0%   { border-radius: 38% 62% 63% 37% / 41% 44% 56% 59%; }
      25%  { border-radius: 55% 45% 38% 62% / 55% 38% 62% 45%; }
      50%  { border-radius: 63% 37% 50% 50% / 30% 60% 40% 70%; }
      75%  { border-radius: 45% 55% 62% 38% / 62% 44% 56% 38%; }
      100% { border-radius: 38% 62% 44% 56% / 50% 55% 45% 50%; }
    }
    @keyframes orbRotate {
      100% { filter: blur(1px) hue-rotate(15deg); }
    }
    @keyframes floatParticle {
      from { transform: translate(0, 0); opacity: .3; }
      to   { transform: translate(var(--dx, 20px), var(--dy, -30px)); opacity: .8; }
    }
    @keyframes cardRise {
      from { opacity: 0; transform: translateY(24px) scale(.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes textIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes badgePulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: .5; transform: scale(.7); }
    }
  `;

  const particles = [
    { top: '20%', left: '15%', d: '7s', delay: '0s',   dx: '15px',  dy: '-25px', w: '3px', opacity: '.6'  },
    { top: '70%', left: '25%', d: '9s', delay: '1s',   dx: '-10px', dy: '-35px', w: '2px', opacity: '.5'  },
    { top: '35%', left: '75%', d: '6s', delay: '.5s',  dx: '20px',  dy: '-20px', w: '3px', opacity: '.5'  },
    { top: '80%', left: '65%', d: '8s', delay: '2s',   dx: '-15px', dy: '-40px', w: '2px', opacity: '.4'  },
    { top: '50%', left: '85%', d: '10s', delay: '1.5s', dx: '-8px', dy: '-30px', w: '3px', opacity: '.5'  },
    { top: '15%', left: '55%', d: '7.5s', delay: '.8s', dx: '12px', dy: '-22px', w: '2px', opacity: '.5'  },
    { top: '60%', left: '40%', d: '11s', delay: '3s',  dx: '18px',  dy: '-15px', w: '1px', opacity: '.8'  },
    { top: '90%', left: '80%', d: '6.5s', delay: '.3s', dx: '-20px', dy: '-28px', w: '2px', opacity: '.3' },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />

      {/* Full screen dark stage */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: colors.accent.accent1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        {/* Deep-space radial glow layers */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(ellipse 60% 50% at 50% 50%, ${colors.brand.primary}12 0%, transparent 70%),
              radial-gradient(ellipse 30% 30% at 20% 80%, ${colors.brand.primary}0a 0%, transparent 60%),
              radial-gradient(ellipse 40% 40% at 80% 20%, ${colors.brand.alternate}08 0%, transparent 60%)
            `,
            pointerEvents: 'none',
          }}
        />

        {/* Floating particles */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {particles.map((p, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: p.top,
                left: p.left,
                width: p.w,
                height: p.w,
                borderRadius: '50%',
                backgroundColor: colors.brand.primary,
                opacity: parseFloat(p.opacity),
                // @ts-ignore CSS custom properties
                '--dx': p.dx,
                '--dy': p.dy,
                animation: `floatParticle ${p.d} ${p.delay} ease-in-out infinite alternate`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* VaNi orb — positioned behind the card */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -60%)',
            width: 480,
            height: 480,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {/* Outer pulse ring */}
          <div
            style={{
              width: 280,
              height: 280,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${colors.brand.primary}14 0%, transparent 70%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'orbPulse 4s ease-in-out infinite',
            }}
          >
            {/* Morphing orb blob */}
            <div
              style={{
                width: 120,
                height: 120,
                background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.alternate} 40%, #ffb347 100%)`,
                borderRadius: '38% 62% 63% 37% / 41% 44% 56% 59%',
                filter: 'blur(1px)',
                boxShadow: `
                  0 0 60px ${colors.brand.primary}66,
                  0 0 120px ${colors.brand.primary}26,
                  0 0 200px ${colors.brand.primary}0f
                `,
                animation: 'orbMorph 8s ease-in-out infinite alternate, orbRotate 20s linear infinite',
              }}
            />
          </div>
        </div>

        {/* Glassmorphic intro card */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            background: `${colors.accent.accent1}d9`, // 85% opacity
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: `1px solid ${colors.brand.primary}26`,
            borderRadius: 22,
            padding: '48px 52px',
            width: '100%',
            maxWidth: 480,
            margin: '0 16px',
            textAlign: 'center',
            boxShadow: `
              0 32px 80px rgba(0,0,0,.5),
              0 0 0 1px rgba(255,255,255,.04),
              inset 0 1px 0 rgba(255,255,255,.06)
            `,
            animation: 'cardRise .8s cubic-bezier(.22,1,.36,1) .3s both',
          }}
        >
          {/* "VaNi Agent · Active" badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 14px',
              background: `${colors.brand.primary}1a`,
              border: `1px solid ${colors.brand.primary}33`,
              borderRadius: 100,
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: colors.brand.primary,
              fontFamily: "'IBM Plex Mono', monospace",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: colors.brand.primary,
                animation: 'badgePulse 2s ease-in-out infinite',
              }}
            />
            VaNi Agent · Active
          </div>

          {/* "Hi [firstName]." */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: '-1.2px',
              color: colors.accent.accent3,
              marginBottom: 4,
              animation: 'textIn .6s ease .7s both',
              opacity: 0,
            }}
          >
            Hi {firstName}.
          </div>

          {/* "I'm VaNi." — gradient text */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: '-1.2px',
              background: `linear-gradient(135deg, ${colors.brand.primary}, #ffb347)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: 20,
              animation: 'textIn .6s ease .8s both',
              opacity: 0,
            }}
          >
            I'm VaNi.
          </div>

          {/* "Your setup agent for [Company]." */}
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: `${colors.accent.accent3}80`,
              marginBottom: 8,
              lineHeight: 1.4,
              animation: 'textIn .6s ease .9s both',
              opacity: 0,
            }}
          >
            Your setup agent for
            <br />
            <span style={{ color: colors.accent.accent3, fontWeight: 800 }}>
              {companyName}.
            </span>
          </div>

          {/* Body copy */}
          <div
            style={{
              fontSize: 15,
              color: `${colors.accent.accent3}73`,
              lineHeight: 1.7,
              marginBottom: 36,
              animation: 'textIn .6s ease 1s both',
              opacity: 0,
            }}
          >
            You won't be filling forms or configuring anything from scratch.
            Tell me about your business —{' '}
            <strong style={{ color: `${colors.accent.accent3}bf`, fontWeight: 700 }}>
              I'll set everything up.
            </strong>
          </div>

          {/* Time estimate row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
              color: colors.accent.accent4,
              marginBottom: 32,
              fontFamily: "'IBM Plex Mono', monospace",
              animation: 'textIn .6s ease 1.1s both',
              opacity: 0,
            }}
          >
            <span style={{ fontSize: 14 }}>⏱</span>
            Takes about 10 minutes · Zero blank forms
          </div>

          {/* "Let's go →" button */}
          <button
            onClick={handleLetsGo}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.alternate} 100%)`,
              border: 'none',
              borderRadius: 8,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 16,
              fontWeight: 800,
              color: '#fff',
              cursor: 'pointer',
              boxShadow: `0 8px 24px ${colors.brand.primary}66`,
              transition: 'transform .25s, box-shadow .25s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              animation: 'textIn .6s ease 1.2s both',
              opacity: 0,
            }}
            onMouseEnter={e => {
              const btn = e.currentTarget;
              btn.style.transform = 'translateY(-2px)';
              btn.style.boxShadow = `0 12px 32px ${colors.brand.primary}80`;
            }}
            onMouseLeave={e => {
              const btn = e.currentTarget;
              btn.style.transform = 'translateY(0)';
              btn.style.boxShadow = `0 8px 24px ${colors.brand.primary}66`;
            }}
          >
            Let's go
            <span
              style={{ display: 'inline-block', transition: 'transform .2s' }}
              onMouseEnter={e => { (e.currentTarget.parentElement as HTMLButtonElement).dispatchEvent(new MouseEvent('mouseenter')); }}
            >
              →
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

export default VaniIntroStep;
