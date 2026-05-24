// src/pages/onboarding/steps/VaniDoneStep.tsx
// Screen 9 — Workspace Done.
// Persona-specific celebration screen. Shows what was set up and provides
// role-specific CTAs to get the user started.
// Step 9 of 9.

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, FileText, Package, LayoutDashboard, Users } from 'lucide-react';

type PersonaId = 'seller' | 'buyer' | 'both';

interface PersonaConfig {
  headline: string;
  subheadline: string;
  vanitMsg: string;
  primaryLabel: string;
  primaryPath: string;
  primaryIcon: React.ReactNode;
  secondaryLabel: string;
  secondaryPath: string;
  secondaryIcon: React.ReactNode;
  whatWasBuilt: string[];
}

const PERSONA_CONFIG: Record<PersonaId, PersonaConfig> = {
  seller: {
    headline: 'Your service workspace is live',
    subheadline: 'You\'re ready to start creating contracts and managing clients.',
    vanitMsg: 'Your sequences are set, your catalog is ready. Time to land your first contract.',
    primaryLabel: 'Open Service Catalog',
    primaryPath: '/catalog',
    primaryIcon: <FileText size={15} />,
    secondaryLabel: 'Invite your team',
    secondaryPath: '/settings/team',
    secondaryIcon: <Users size={15} />,
    whatWasBuilt: [
      'Cloud storage provisioned',
      'Sequence numbers configured (contracts, invoices, jobs)',
      'Relationship types and event statuses seeded',
      'Service templates copied to your catalog',
    ],
  },
  buyer: {
    headline: 'Your asset workspace is live',
    subheadline: 'You\'re ready to track assets, manage vendors, and monitor SLAs.',
    vanitMsg: 'Your procurement workspace is configured. Start by adding your first asset or vendor.',
    primaryLabel: 'View Asset Registry',
    primaryPath: '/client-asset-registry',
    primaryIcon: <Package size={15} />,
    secondaryLabel: 'Go to Dashboard',
    secondaryPath: '/dashboard',
    secondaryIcon: <LayoutDashboard size={15} />,
    whatWasBuilt: [
      'Cloud storage provisioned',
      'Sequence numbers configured (POs, service records)',
      'Relationship types and event statuses seeded',
      'Procurement templates copied to your catalog',
    ],
  },
  both: {
    headline: 'Your full workspace is live',
    subheadline: 'Both service delivery and asset management are ready.',
    vanitMsg: 'You have the full dual setup — service provider and asset owner. Everything is configured.',
    primaryLabel: 'Go to Dashboard',
    primaryPath: '/dashboard',
    primaryIcon: <LayoutDashboard size={15} />,
    secondaryLabel: 'Open Service Catalog',
    secondaryPath: '/catalog',
    secondaryIcon: <FileText size={15} />,
    whatWasBuilt: [
      'Cloud storage provisioned',
      'Sequence numbers configured (all types)',
      'Relationship types and event statuses seeded',
      'Service and procurement templates copied',
    ],
  },
};

const animStyles = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes popIn { 0%{transform:scale(.7);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
  @keyframes shimmer {
    0%{background-position:200% center}
    100%{background-position:-200% center}
  }
  @keyframes checkIn { 0%{transform:scale(0) rotate(-15deg);opacity:0} 70%{transform:scale(1.2) rotate(2deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
`;

const VaniDoneStep: React.FC = () => {
  const navigate = useNavigate();
  const { setTheme, currentTheme } = useTheme();
  const { user, currentTenant } = useAuth();
  const colors = currentTheme.colors;

  const personaId = (currentTenant as any)?.business_type_id as PersonaId | null;
  const config    = personaId ? PERSONA_CONFIG[personaId] : PERSONA_CONFIG.both;
  const firstName = user?.first_name?.trim() || null;

  useEffect(() => {
    setTheme('vani');
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animStyles }} />

      <div
        style={{
          flex: 1,
          backgroundColor: colors.utility.primaryBackground,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '48px 24px 140px',
          fontFamily: "'Outfit', sans-serif",
          minHeight: '100%',
        }}
      >
        <div style={{ width: '100%', maxWidth: 600 }}>

          {/* Eyebrow */}
          <div
            style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
              letterSpacing: 1, color: colors.brand.primary,
              fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10,
              animation: 'fadeUp .5s ease both',
            }}
          >
            Step 9 of 9
          </div>

          {/* Celebration emoji */}
          <div
            style={{
              fontSize: 56, marginBottom: 20,
              animation: 'popIn .6s cubic-bezier(.34,1.56,.64,1) .1s both',
              display: 'inline-block',
            }}
          >
            🎉
          </div>

          {/* Headline */}
          <h2
            style={{
              fontSize: 32, fontWeight: 900, letterSpacing: '-1px',
              color: colors.utility.primaryText,
              marginBottom: 8,
              animation: 'fadeUp .5s ease .15s both',
            }}
          >
            {config.headline}
          </h2>
          <p
            style={{
              fontSize: 15, color: colors.utility.secondaryText,
              marginBottom: 36, lineHeight: 1.55,
              animation: 'fadeUp .5s ease .2s both',
            }}
          >
            {config.subheadline}
          </p>

          {/* VaNi message */}
          <div
            style={{
              display: 'flex', gap: 12, marginBottom: 32,
              animation: 'fadeUp .5s ease .25s both',
            }}
          >
            <div
              style={{
                width: 36, height: 36, flexShrink: 0,
                background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.alternate})`,
                borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 14, color: '#fff',
                boxShadow: `0 3px 8px ${colors.brand.primary}40`,
                marginTop: 2,
              }}
            >
              V
            </div>
            <div
              style={{
                background: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}14`,
                borderRadius: '3px 14px 14px 14px',
                padding: '14px 18px',
                boxShadow: `0 2px 12px ${colors.utility.primaryText}08`,
                fontSize: 14,
                color: colors.utility.secondaryText,
                lineHeight: 1.6,
              }}
            >
              {firstName
                ? <><strong>{firstName}</strong>, {config.vanitMsg}</>
                : config.vanitMsg}
            </div>
          </div>

          {/* What was set up */}
          <div
            style={{
              background: `${colors.brand.primary}06`,
              border: `1px solid ${colors.brand.primary}20`,
              borderRadius: 16,
              padding: '18px 20px',
              marginBottom: 32,
              animation: 'fadeUp .5s ease .3s both',
            }}
          >
            <div
              style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.6px', color: colors.brand.primary,
                fontFamily: "'IBM Plex Mono', monospace", marginBottom: 14,
              }}
            >
              What VaNi set up for you
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {config.whatWasBuilt.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    animation: `checkIn .4s cubic-bezier(.34,1.56,.64,1) ${0.35 + i * 0.08}s both`,
                  }}
                >
                  <div
                    style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      background: `${colors.brand.primary}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: colors.brand.primary,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 13, color: colors.utility.secondaryText, lineHeight: 1.4 }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Workspace ID card */}
          <div
            style={{
              background: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}12`,
              borderRadius: 14,
              padding: '16px 20px',
              marginBottom: 12,
              animation: 'fadeUp .5s ease .55s both',
            }}
          >
            <div
              style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.6px', color: colors.utility.secondaryText,
                fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6,
              }}
            >
              Your workspace
            </div>
            <div
              style={{
                fontSize: 16, fontWeight: 800,
                color: colors.utility.primaryText,
                letterSpacing: '-0.3px',
              }}
            >
              {currentTenant?.name || 'My Workspace'}
            </div>
            {currentTenant?.id && (
              <div
                style={{
                  fontSize: 11, color: `${colors.utility.secondaryText}70`,
                  fontFamily: "'IBM Plex Mono', monospace",
                  marginTop: 4,
                }}
              >
                ID: {currentTenant.id.split('-')[0].toUpperCase()}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Floating action island */}
      <div
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          background: `${colors.accent.accent1}f0`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '10px 10px 10px 10px',
          borderRadius: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 20px 50px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06)',
          zIndex: 200,
          animation: 'fadeUp .6s ease .7s both',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        {/* Secondary CTA */}
        <button
          type="button"
          onClick={() => navigate(config.secondaryPath)}
          style={{
            padding: '10px 20px', borderRadius: 100, border: 'none',
            background: 'rgba(255,255,255,.08)',
            color: 'rgba(255,255,255,.7)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: 'pointer', transition: 'all .2s',
            display: 'flex', alignItems: 'center', gap: 7,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.14)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.9)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.08)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.7)';
          }}
        >
          {config.secondaryIcon}
          {config.secondaryLabel}
        </button>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={() => navigate(config.primaryPath)}
          style={{
            padding: '11px 24px', borderRadius: 100, border: 'none',
            background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.alternate})`,
            color: '#fff',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 800,
            cursor: 'pointer',
            boxShadow: `0 8px 24px ${colors.brand.primary}50`,
            transition: 'all .2s',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 12px 32px ${colors.brand.primary}70`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px ${colors.brand.primary}50`;
          }}
        >
          {config.primaryIcon}
          {config.primaryLabel}
          <ArrowRight size={14} />
        </button>
      </div>
    </>
  );
};

export default VaniDoneStep;
