// src/components/landing/LandingFooter.tsx — V3 Dark Theme
import React, { useState } from 'react';

// ── Types ──────────────────────────────────────────────
interface FooterProps {
  onIndustrySelect?: (industryId: string) => void;
  onNewsletterSignup?: (email: string) => void;
  className?: string;
}

interface FooterLink {
  name: string;
  href: string;
  external?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

// ── V3 Design Tokens ───────────────────────────────────
const V3 = {
  bg: '#0D0F14',
  surface: '#13161D',
  surface2: '#1C2030',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.12)',
  amber: '#F5A623',
  amberDim: 'rgba(245,166,35,0.12)',
  green: '#2ECC71',
  text: '#E8E6E0',
  muted: '#7A8099',
  faint: '#3A3F52',
} as const;

const font = {
  heading: "'Bebas Neue', sans-serif",
  body: "'DM Sans', sans-serif",
  mono: "'DM Mono', monospace",
} as const;

// ── Data ───────────────────────────────────────────────
const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: 'Product',
    links: [
      { name: 'Features', href: '#features' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'How it Works', href: '#playground' },
      { name: 'API Docs', href: '/docs/api', external: true },
      { name: 'Changelog', href: '/changelog' },
    ],
  },
  {
    title: 'Industries',
    links: [
      { name: 'Healthcare', href: '/industry/healthcare' },
      { name: 'Manufacturing', href: '/industry/manufacturing' },
      { name: 'Pharmaceutical', href: '/industry/pharma' },
      { name: 'Consulting', href: '/industry/consulting' },
      { name: 'Financial Services', href: '/industry/financial' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { name: 'Blog', href: '/blog' },
      { name: 'Case Studies', href: '/case-studies' },
      { name: 'ROI Calculator', href: '/roi-calculator' },
      { name: 'Best Practices', href: '/resources/best-practices' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'About Vikuna', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Contact', href: '/contact' },
      { name: 'Security', href: '/security' },
    ],
  },
];

const SOCIAL_LINKS = [
  {
    name: 'LinkedIn',
    href: 'https://linkedin.com/company/contractnest',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    name: 'Twitter',
    href: 'https://twitter.com/contractnest',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: 'YouTube',
    href: 'https://youtube.com/contractnest',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
];

const LEGAL_LINKS = [
  { name: 'Privacy', href: '/privacy' },
  { name: 'Terms', href: '/terms' },
  { name: 'Cookies', href: '/cookies' },
  { name: 'GDPR', href: '/gdpr' },
];

// ── Newsletter Sub-component ───────────────────────────
const NewsletterV3: React.FC<{ onSignup?: (email: string) => void }> = ({ onSignup }) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      onSignup?.(email);
      if (typeof gtag !== 'undefined') {
        gtag('event', 'newsletter_signup', { event_category: 'engagement', event_label: 'footer' });
      }
      setDone(true);
      setEmail('');
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div
        style={{
          background: 'rgba(46,204,113,0.08)',
          border: `1px solid rgba(46,204,113,0.25)`,
          borderRadius: 8,
          padding: '12px 16px',
          fontSize: '0.8rem',
          color: V3.green,
        }}
      >
        Subscribed — you'll hear from us soon.
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{
          flex: 1,
          background: V3.surface2,
          border: `1px solid ${V3.border2}`,
          borderRadius: 7,
          padding: '9px 14px',
          fontSize: '0.8rem',
          fontFamily: font.body,
          color: V3.text,
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = V3.amber; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = V3.border2; }}
      />
      <button
        type="submit"
        disabled={submitting}
        style={{
          background: V3.amber,
          border: 'none',
          borderRadius: 7,
          padding: '9px 18px',
          fontFamily: font.body,
          fontSize: '0.8rem',
          fontWeight: 600,
          color: V3.bg,
          cursor: submitting ? 'wait' : 'pointer',
          opacity: submitting ? 0.7 : 1,
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
      >
        {submitting ? '...' : 'Subscribe'}
      </button>
    </form>
  );
};

// ── Main Component ─────────────────────────────────────
const LandingFooter: React.FC<FooterProps> = ({
  onIndustrySelect,
  onNewsletterSignup,
  className = '',
}) => {
  const handleLinkClick = (href: string, external?: boolean) => {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'footer_link_click', { event_category: 'navigation', event_label: href });
    }
    if (external || href.startsWith('http')) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else if (href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (href.includes('/industry/') && onIndustrySelect) {
      onIndustrySelect(href.split('/industry/')[1]);
    } else {
      window.location.href = href;
    }
  };

  const handleSocialClick = (name: string, href: string) => {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'social_click', { event_category: 'social', event_label: name });
    }
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <footer
      className={className}
      style={{
        background: V3.surface,
        borderTop: `1px solid ${V3.border}`,
        position: 'relative',
        zIndex: 2,
      }}
    >
      {/* ── Top CTA Banner ────────────── */}
      <div
        style={{
          borderBottom: `1px solid ${V3.border}`,
          padding: '40px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            alignItems: 'center',
            gap: 32,
          }}
          className="footer-v3-cta-grid"
        >
          <div>
            <div
              style={{
                fontFamily: font.heading,
                fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
                letterSpacing: '0.03em',
                color: V3.text,
                lineHeight: 1,
                marginBottom: 8,
              }}
            >
              READY TO RUN CONTRACTS THAT RUN THEMSELVES?
            </div>
            <div style={{ fontSize: '0.86rem', color: V3.muted, lineHeight: 1.5 }}>
              Start free with 3 contracts. No credit card. No seat limits.
            </div>
          </div>
          <button
            onClick={() => {
              if (typeof gtag !== 'undefined') {
                gtag('event', 'footer_cta_click', { event_category: 'conversion' });
              }
              const el = document.getElementById('emailInput');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
                el.focus();
              } else {
                window.location.href =
                  import.meta.env.VITE_SIGNUP_URL || 'https://www.contractnest.com/register';
              }
            }}
            style={{
              background: V3.amber,
              border: 'none',
              fontFamily: font.body,
              fontSize: '0.9rem',
              fontWeight: 600,
              color: V3.bg,
              padding: '13px 28px',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              flexShrink: 0,
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
            Get Early Access
          </button>
        </div>
      </div>

      {/* ── Main Grid: Links + Newsletter ── */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '48px 24px 40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr) 1.2fr',
          gap: 32,
        }}
        className="footer-v3-main-grid"
      >
        {/* Link Columns */}
        {FOOTER_SECTIONS.map((section) => (
          <div key={section.title}>
            <div
              style={{
                fontFamily: font.mono,
                fontSize: '0.62rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: V3.amber,
                marginBottom: 16,
              }}
            >
              {section.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {section.links.map((link) => (
                <button
                  key={link.name}
                  onClick={() => handleLinkClick(link.href, link.external)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontFamily: font.body,
                    fontSize: '0.8rem',
                    color: V3.muted,
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 0,
                    transition: 'color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = V3.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = V3.muted; }}
                >
                  {link.name}
                  {link.external && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity={0.5}>
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Newsletter + Contact Column */}
        <div>
          <div
            style={{
              fontFamily: font.mono,
              fontSize: '0.62rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: V3.amber,
              marginBottom: 16,
            }}
          >
            Stay Updated
          </div>
          <div style={{ marginBottom: 20 }}>
            <NewsletterV3 onSignup={onNewsletterSignup} />
            <div
              style={{
                fontSize: '0.7rem',
                color: V3.faint,
                marginTop: 8,
                lineHeight: 1.4,
              }}
            >
              Product updates & industry insights. No spam.
            </div>
          </div>

          {/* Contact */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a
              href="mailto:info@vikuna.io"
              style={{
                fontSize: '0.78rem',
                color: V3.muted,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = V3.text; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = V3.muted; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              info@vikuna.io
            </a>
            <a
              href="tel:+919949701175"
              style={{
                fontSize: '0.78rem',
                color: V3.muted,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = V3.text; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = V3.muted; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
              +91-9949701175
            </a>
            <span
              style={{
                fontSize: '0.78rem',
                color: V3.faint,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Hyderabad, India
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ─────────────────── */}
      <div
        style={{
          borderTop: `1px solid ${V3.border}`,
          padding: '20px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          {/* Left: Logo + Copyright */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  background: V3.amber,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={V3.bg} strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              </div>
              <span style={{ fontFamily: font.heading, fontSize: '0.9rem', letterSpacing: '0.05em', color: V3.muted }}>
                CONTRACTNEST
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: V3.faint }}>
              © {new Date().getFullYear()} Vikuna Technologies. All rights reserved.
            </span>
          </div>

          {/* Center: Legal links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {LEGAL_LINKS.map((link) => (
              <button
                key={link.name}
                onClick={() => handleLinkClick(link.href)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: font.body,
                  fontSize: '0.7rem',
                  color: V3.faint,
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = V3.muted; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = V3.faint; }}
              >
                {link.name}
              </button>
            ))}
          </div>

          {/* Right: Social Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {SOCIAL_LINKS.map((social) => (
              <button
                key={social.name}
                onClick={() => handleSocialClick(social.name, social.href)}
                title={social.name}
                style={{
                  background: V3.surface2,
                  border: `1px solid ${V3.border}`,
                  borderRadius: 6,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: V3.faint,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = V3.text;
                  e.currentTarget.style.borderColor = V3.border2;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = V3.faint;
                  e.currentTarget.style.borderColor = V3.border;
                }}
              >
                {social.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div
          style={{
            maxWidth: 1200,
            margin: '16px auto 0',
            paddingTop: 14,
            borderTop: `1px solid ${V3.border}`,
            fontSize: '0.66rem',
            color: V3.faint,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: V3.muted, fontWeight: 500 }}>Disclaimer:</strong> ContractNest is
          a software platform for contract management. Users are responsible for compliance with
          applicable laws. ContractNest does not provide legal advice — consult qualified
          professionals for legal guidance.
        </div>
      </div>

      {/* ── Responsive CSS ──────────── */}
      <style>{`
        @media (max-width: 900px) {
          .footer-v3-cta-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .footer-v3-main-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 560px) {
          .footer-v3-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
};

export default LandingFooter;
