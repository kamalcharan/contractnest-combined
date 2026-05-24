// src/pages/onboarding/steps/VaniConsentStep.tsx
// Screen 7 — VaNi Consent.
// Shows a summary of what VaNi has learned and exactly what it will do.
// "What VaNi will do" now matches the real 4-step sequence in VaniWorkingStep.
// CTA "Set up my workspace →" navigates to /onboarding/vani-working.
// Step 7 of 9.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { useServedIndustriesManager } from '@/hooks/queries/useServedIndustries';
import { themes } from '@/utils/theme';
import { Building2, Palette, Layers, User, ArrowRight, CheckCircle2 } from 'lucide-react';

type PersonaId = 'seller' | 'buyer' | 'both';

// These bullet points now match the REAL steps in VaniWorkingStep (4 steps)
const PERSONA_META: Record<PersonaId, { label: string; icon: string; whatVaniDoes: string[] }> = {
  seller: {
    label: 'Service Provider',
    icon: '🔧',
    whatVaniDoes: [
      'Provision <strong>cloud storage</strong> for your documents and contract attachments',
      'Seed <strong>sequence numbers</strong>, relationship types and event statuses in both live & test environments',
      'Copy <strong>industry service templates</strong> from VaNi\'s curated library into your catalog',
      'Activate your workspace and sync your account settings',
    ],
  },
  buyer: {
    label: 'Asset Owner',
    icon: '🏢',
    whatVaniDoes: [
      'Provision <strong>cloud storage</strong> for your assets, invoices, and vendor documents',
      'Seed <strong>sequence numbers</strong>, relationship types and event statuses in both live & test environments',
      'Copy <strong>industry procurement templates</strong> from VaNi\'s curated library into your catalog',
      'Activate your workspace and sync your account settings',
    ],
  },
  both: {
    label: 'Provider & Asset Owner',
    icon: '📤📥',
    whatVaniDoes: [
      'Provision <strong>cloud storage</strong> for documents, assets, and attachments',
      'Seed <strong>sequence numbers</strong>, relationship types and event statuses in both live & test environments',
      'Copy <strong>service & procurement templates</strong> from VaNi\'s curated library (for both roles)',
      'Activate your dual workspace and sync your account settings',
    ],
  },
};

const VaniConsentStep: React.FC = () => {
  const navigate = useNavigate();
  const { setTheme, currentTheme } = useTheme();
  const { user, currentTenant } = useAuth();
  const { formData, fetchProfile } = useTenantProfile({ isOnboarding: true });
  const { count: industryCount, isLoading: industriesLoading } = useServedIndustriesManager();
  const colors = currentTheme.colors;

  const [savedThemeName, setSavedThemeName] = useState<string | null>(null);

  useEffect(() => {
    setTheme('vani');
    fetchProfile();

    // Read saved theme from user_data — durable source (not currentThemeId which gets overwritten)
    try {
      const raw = localStorage.getItem('user_data') || sessionStorage.getItem('user_data');
      if (raw) {
        const savedId = (JSON.parse(raw) as any)?.preferred_theme;
        if (savedId && savedId !== 'vani' && themes[savedId]) {
          setSavedThemeName(themes[savedId].name);
        }
      }
    } catch {}
  }, []);

  const firstName = user?.first_name?.trim() || null;
  const fullName  = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || null;
  const company   = formData.business_name?.trim() || currentTenant?.name || 'your company';
  const personaId = (formData.business_type_id as PersonaId) || null;
  const persona   = personaId ? PERSONA_META[personaId] : null;

  // ── sub-components ──────────────────────────────────────────────────

  const VaniBubble = ({ msg }: { msg: string }) => (
    <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
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
          maxWidth: 560,
        }}
        dangerouslySetInnerHTML={{ __html: msg }}
      />
    </div>
  );

  const SummaryRow = ({
    icon, label, value,
  }: { icon: React.ReactNode; label: string; value: string | null }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 16px',
        borderBottom: `1px solid ${colors.utility.primaryText}08`,
      }}
    >
      <div
        style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `${colors.brand.primary}10`,
          border: `1px solid ${colors.brand.primary}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: colors.brand.primary,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: colors.utility.secondaryText, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 1 }}>
          {label}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: value ? colors.utility.primaryText : `${colors.utility.secondaryText}70` }}>
          {value || '—'}
        </div>
      </div>
    </div>
  );

  const vaniIntroMsg = firstName
    ? `You're all set, <strong>${firstName}</strong>. Here's exactly what I'm about to build for <strong>${company}</strong>. Click <em>Set up my workspace</em> and I'll handle everything in about 30–60 seconds.`
    : `You're all set. Here's exactly what I'm about to build for <strong>${company}</strong>. Click <em>Set up my workspace</em> and I'll handle everything in about 30–60 seconds.`;

  return (
    <>
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
        <div style={{ width: '100%', maxWidth: 640 }}>

          {/* Eyebrow */}
          <div
            style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
              letterSpacing: 1, color: colors.brand.primary,
              fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10,
            }}
          >
            Step 7 of 9
          </div>

          <h2
            style={{
              fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px',
              color: colors.utility.primaryText, marginBottom: 6,
            }}
          >
            Ready to set up your workspace
          </h2>
          <p
            style={{
              fontSize: 14, color: colors.utility.secondaryText,
              marginBottom: 32, lineHeight: 1.55,
            }}
          >
            VaNi will configure everything automatically — storage, workspace data, industry templates and your account settings.
          </p>

          {/* VaNi intro bubble */}
          <VaniBubble msg={vaniIntroMsg} />

          {/* Summary card — what VaNi learned */}
          <div
            style={{
              background: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}14`,
              borderRadius: 16,
              overflow: 'hidden',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                background: `${colors.brand.primary}08`,
                borderBottom: `1px solid ${colors.utility.primaryText}10`,
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.6px', color: colors.brand.primary,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              What VaNi knows about you
            </div>

            <SummaryRow icon={<User size={15} />} label="Your name" value={fullName} />
            <SummaryRow icon={<Building2 size={15} />} label="Company" value={company} />
            <SummaryRow
              icon={<span style={{ fontSize: 15 }}>{persona?.icon || '❓'}</span>}
              label="How you operate"
              value={persona?.label || null}
            />
            <SummaryRow icon={<Palette size={15} />} label="Workspace theme" value={savedThemeName} />

            {/* Industries — no border-bottom on last row */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
              }}
            >
              <div
                style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: `${colors.brand.primary}10`,
                  border: `1px solid ${colors.brand.primary}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: colors.brand.primary,
                }}
              >
                <Layers size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: colors.utility.secondaryText, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 1 }}>
                  Industries selected
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: industryCount > 0 ? colors.utility.primaryText : `${colors.utility.secondaryText}70` }}>
                  {industriesLoading ? 'Loading…' : industryCount > 0 ? `${industryCount} ${industryCount === 1 ? 'industry' : 'industries'}` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* What VaNi will actually do (4 real steps) */}
          {persona && (
            <div
              style={{
                background: `${colors.brand.primary}06`,
                border: `1px solid ${colors.brand.primary}20`,
                borderRadius: 16,
                padding: '16px 20px',
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                  letterSpacing: '0.6px', color: colors.brand.primary,
                  fontFamily: "'IBM Plex Mono', monospace", marginBottom: 14,
                }}
              >
                What VaNi will do
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {persona.whatVaniDoes.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <CheckCircle2
                      size={15}
                      style={{ color: colors.brand.primary, flexShrink: 0, marginTop: 2 }}
                    />
                    <span
                      style={{ fontSize: 13, color: colors.utility.secondaryText, lineHeight: 1.55 }}
                      dangerouslySetInnerHTML={{ __html: item }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VaNi closing bubble */}
          <VaniBubble
            msg={`This takes about <strong>30–60 seconds</strong>. You don't need to do anything — just sit back and watch VaNi build your workspace.`}
          />
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
          padding: '10px 10px 10px 24px',
          borderRadius: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06)',
          zIndex: 200,
          whiteSpace: 'nowrap' as const,
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
          VaNi is ready to build your workspace
        </span>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />

        <button
          type="button"
          onClick={() => navigate('/onboarding/industry-selection')}
          style={{
            padding: '10px 20px', borderRadius: 100, border: 'none',
            background: 'rgba(255,255,255,.08)',
            color: 'rgba(255,255,255,.6)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: 'pointer', transition: 'all .2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.14)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.85)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.08)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.6)';
          }}
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={() => navigate('/onboarding/vani-working')}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
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
          Set up my workspace
          <ArrowRight size={15} />
        </button>
      </div>
    </>
  );
};

export default VaniConsentStep;
