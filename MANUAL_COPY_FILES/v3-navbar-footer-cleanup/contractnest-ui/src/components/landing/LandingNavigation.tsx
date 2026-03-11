// src/components/landing/LandingNavigation.tsx — V3 Dark Theme
import React, { useState, useEffect, useRef } from 'react';

// ── Types ──────────────────────────────────────────────
interface NavigationProps {
  onIndustrySelect?: (industryId: string) => void;
  onNavigate?: (path: string) => void;
  className?: string;
}

// ── V3 Design Tokens ───────────────────────────────────
const V3 = {
  bg: '#0D0F14',
  surface: '#13161D',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.12)',
  amber: '#F5A623',
  text: '#E8E6E0',
  muted: '#7A8099',
} as const;

const font = {
  heading: "'Bebas Neue', sans-serif",
  body: "'DM Sans', sans-serif",
  mono: "'DM Mono', monospace",
} as const;

// ── Nav Links ──────────────────────────────────────────
const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'How it Works', href: '#playground' },
];

// ── Component ──────────────────────────────────────────
const LandingNavigation: React.FC<NavigationProps> = ({
  onIndustrySelect,
  onNavigate,
  className = '',
}) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const signupUrl =
    import.meta.env.VITE_SIGNUP_URL || 'https://www.contractnest.com/register';
  const loginUrl =
    import.meta.env.VITE_LOGIN_URL || 'https://www.contractnest.com/login';

  // Scroll detection for backdrop blur intensity
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Click outside to close mobile menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignIn = () => {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'nav_sign_in', { event_category: 'navigation' });
    }
    window.location.href = loginUrl;
  };

  const handleGetStarted = () => {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'nav_get_started', { event_category: 'conversion' });
    }
    window.location.href = signupUrl;
  };

  const handleNavClick = (href: string) => {
    setShowMobileMenu(false);
    if (typeof gtag !== 'undefined') {
      gtag('event', 'nav_click', { event_category: 'navigation', event_label: href });
    }
    if (href.startsWith('#')) {
      const el = document.getElementById(href.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (onNavigate) {
      onNavigate(href);
    }
  };

  // ── Styles ─────────────────────────────────────────
  const navStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: scrolled
      ? 'rgba(13,15,20,0.88)'
      : 'rgba(13,15,20,0.65)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    borderBottom: `1px solid ${scrolled ? V3.border2 : V3.border}`,
    transition: 'background 0.3s, border-color 0.3s',
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
  };

  return (
    <nav style={navStyle} className={className}>
      <div style={innerStyle}>
        {/* ── Logo ─────────────────────── */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => onNavigate?.('/')}
        >
          {/* Amber square logo mark */}
          <div
            style={{
              width: 30,
              height: 30,
              background: V3.amber,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={V3.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: font.heading,
              fontSize: '1.35rem',
              letterSpacing: '0.06em',
              color: V3.text,
              lineHeight: 1,
            }}
          >
            CONTRACTNEST
          </span>
        </div>

        {/* ── Desktop Nav Links ────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
          }}
          className="landing-nav-desktop-links"
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: font.body,
                fontSize: '0.82rem',
                color: V3.muted,
                cursor: 'pointer',
                padding: '4px 0',
                transition: 'color 0.2s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = V3.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = V3.muted; }}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* ── Desktop CTAs ─────────────── */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          className="landing-nav-desktop-ctas"
        >
          <button
            onClick={handleSignIn}
            style={{
              background: 'none',
              border: `1px solid ${V3.border2}`,
              fontFamily: font.body,
              fontSize: '0.8rem',
              fontWeight: 500,
              color: V3.text,
              padding: '7px 18px',
              borderRadius: 7,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = V3.amber;
              e.currentTarget.style.color = V3.amber;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = V3.border2;
              e.currentTarget.style.color = V3.text;
            }}
          >
            Sign In
          </button>
          <button
            onClick={handleGetStarted}
            style={{
              background: V3.amber,
              border: 'none',
              fontFamily: font.body,
              fontSize: '0.8rem',
              fontWeight: 600,
              color: V3.bg,
              padding: '8px 20px',
              borderRadius: 7,
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
            Get Started
          </button>
        </div>

        {/* ── Mobile Hamburger ─────────── */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: V3.text,
            cursor: 'pointer',
            padding: 6,
          }}
          className="landing-nav-mobile-toggle"
        >
          {showMobileMenu ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile Menu Dropdown ────── */}
      {showMobileMenu && (
        <div
          ref={mobileMenuRef}
          style={{
            background: V3.surface,
            borderTop: `1px solid ${V3.border}`,
            padding: '16px 24px 20px',
          }}
          className="landing-nav-mobile-menu"
        >
          {/* Nav links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: font.body,
                  fontSize: '0.9rem',
                  color: V3.muted,
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: '10px 0',
                  borderBottom: `1px solid ${V3.border}`,
                  transition: 'color 0.2s',
                }}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleSignIn}
              style={{
                background: 'none',
                border: `1px solid ${V3.border2}`,
                fontFamily: font.body,
                fontSize: '0.86rem',
                fontWeight: 500,
                color: V3.text,
                padding: '11px 0',
                borderRadius: 8,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Sign In
            </button>
            <button
              onClick={handleGetStarted}
              style={{
                background: V3.amber,
                border: 'none',
                fontFamily: font.body,
                fontSize: '0.86rem',
                fontWeight: 600,
                color: V3.bg,
                padding: '11px 0',
                borderRadius: 8,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* ── Responsive CSS ──────────── */}
      <style>{`
        @media (max-width: 768px) {
          .landing-nav-desktop-links,
          .landing-nav-desktop-ctas {
            display: none !important;
          }
          .landing-nav-mobile-toggle {
            display: block !important;
          }
        }
        @media (min-width: 769px) {
          .landing-nav-mobile-menu {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
};

export default LandingNavigation;
