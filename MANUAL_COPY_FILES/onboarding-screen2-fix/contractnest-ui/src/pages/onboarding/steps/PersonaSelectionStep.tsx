// src/pages/onboarding/steps/PersonaSelectionStep.tsx
// Screen 3 — Persona Selection.
// Inside OnboardingLayout (progress header visible). Own action island at bottom.
// Saves business_type_id to /api/tenant-profile then navigates to /onboarding/theme-selection.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { vaniToast } from '@/components/common/toast';
import { Loader2 } from 'lucide-react';

type PersonaId = 'seller' | 'buyer' | 'both';

interface Persona {
  id: PersonaId;
  icon: string;
  name: string;
  desc: string;
  tags: string[];
  vaniMsg: string;
  islandLabel: string;
}

const PERSONAS: Persona[] = [
  {
    id: 'seller',
    icon: '🔧',
    name: 'Service Provider',
    desc: 'You provide maintenance, repair, or AMC/CMC services to clients. You create contracts and send them to buyers.',
    tags: ['AMC', 'CMC', 'SLA', 'Contracts out'],
    vaniMsg: "Great — I'll set up your <strong>service catalog</strong>, contract templates, and client management tools. You're a provider.",
    islandLabel: 'Confirmed: Service Provider',
  },
  {
    id: 'buyer',
    icon: '🏢',
    name: 'Asset Owner',
    desc: 'You own equipment or facilities and hire vendors for maintenance. You receive contracts and manage service SLAs.',
    tags: ['Assets', 'Vendors', 'Facilities', 'Contracts in'],
    vaniMsg: "Perfect — I'll set up your <strong>asset registry</strong>, vendor management, and SLA tracking. You manage assets and vendors.",
    islandLabel: 'Confirmed: Asset Owner',
  },
  {
    id: 'both',
    icon: '📤📥',
    name: 'Both — Provider & Asset Owner',
    desc: 'You provide services to clients AND own assets that need servicing. Common for hospitals, hotel chains, and large corporates.',
    tags: ['Full setup', 'Catalog + Registry', 'Dual dashboard'],
    vaniMsg: "Excellent — you operate on both sides. I'll give you a <strong>full dual setup</strong>: service delivery tools for your clients and asset management for your own facilities.",
    islandLabel: 'Confirmed: Both roles',
  },
];

const PersonaSelectionStep: React.FC = () => {
  const navigate = useNavigate();
  const { setTheme, currentTheme } = useTheme();
  const { user, currentTenant } = useAuth();
  // Fetch existing profile so we use the actual saved business_name, not the tenant slug
  const { formData, fetchProfile } = useTenantProfile({ isOnboarding: true });

  const colors = currentTheme.colors;
  const firstName = user?.first_name || 'there';
  const companyName = currentTenant?.name || 'your company';

  const [selected, setSelected] = useState<PersonaId | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [vaniVisible, setVaniVisible] = useState(false);

  useEffect(() => {
    setTheme('vani');
    fetchProfile();
  }, []);

  const handleSelect = (id: PersonaId) => {
    setSelected(id);
    // Slight delay so card selection animates before bubble appears
    setTimeout(() => setVaniVisible(true), 100);
  };

  const handleContinue = async () => {
    if (!selected || isSaving) return;
    setIsSaving(true);
    try {
      // POST = UPSERT (onConflict: tenant_id). Sends actual saved business_name
      // so the business name the user entered in Screen 2 is never overwritten.
      await api.post(API_ENDPOINTS.TENANTS.PROFILE, {
        business_name: formData.business_name || currentTenant?.name || '',
        business_type_id: selected,
      });
      vaniToast.success('Persona saved');
      navigate('/onboarding/theme-selection');
    } catch (err: any) {
      vaniToast.error(err?.response?.data?.error || 'Failed to save — please try again');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedPersona = PERSONAS.find(p => p.id === selected);

  // ── sub-components (inline to keep file self-contained) ──

  const VaniBubble = ({ msg }: { msg: string }) => (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
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
          maxWidth: 520,
        }}
        dangerouslySetInnerHTML={{ __html: msg }}
      />
    </div>
  );

  const PersonaCard = ({ persona }: { persona: Persona }) => {
    const isSelected = selected === persona.id;
    const isBoth = persona.id === 'both';

    return (
      <div
        onClick={() => handleSelect(persona.id)}
        style={{
          background: colors.utility.secondaryBackground,
          border: `2px solid ${isSelected ? colors.brand.primary : `${colors.utility.primaryText}18`}`,
          borderRadius: 14,
          padding: isBoth ? '20px 22px' : '24px 22px',
          cursor: 'pointer',
          transition: 'all .2s cubic-bezier(.22,1,.36,1)',
          position: 'relative',
          overflow: 'hidden',
          gridColumn: isBoth ? '1 / -1' : undefined,
          display: isBoth ? 'grid' : 'block',
          gridTemplateColumns: isBoth ? 'auto 1fr' : undefined,
          alignItems: isBoth ? 'center' : undefined,
          gap: isBoth ? 20 : undefined,
          boxShadow: isSelected
            ? `0 0 0 3px ${colors.brand.primary}14, 0 4px 20px ${colors.utility.primaryText}08`
            : 'none',
          backgroundColor: isSelected
            ? `${colors.brand.primary}06`
            : colors.utility.secondaryBackground,
        }}
        onMouseEnter={e => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.borderColor = `${colors.brand.primary}50`;
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${colors.utility.primaryText}0a`;
          }
        }}
        onMouseLeave={e => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.borderColor = `${colors.utility.primaryText}18`;
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          }
        }}
      >
        {/* Check mark */}
        <div
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 22, height: 22, borderRadius: '50%',
            background: colors.brand.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#fff',
            opacity: isSelected ? 1 : 0,
            transform: isSelected ? 'scale(1)' : 'scale(.5)',
            transition: 'all .25s cubic-bezier(.34,1.56,.64,1)',
          }}
        >
          ✓
        </div>

        {/* Icon */}
        <div
          style={{
            width: 48, height: 48, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
            marginBottom: isBoth ? 0 : 16,
            background: isSelected ? `${colors.brand.primary}10` : `${colors.utility.primaryText}06`,
            border: `1px solid ${isSelected ? `${colors.brand.primary}30` : `${colors.utility.primaryText}10`}`,
            transition: 'all .2s',
            flexShrink: 0,
          }}
        >
          {persona.icon}
        </div>

        {/* Content */}
        <div>
          <div
            style={{
              fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px',
              marginBottom: 6, color: colors.utility.primaryText,
            }}
          >
            {persona.name}
          </div>
          <div
            style={{
              fontSize: 12, color: colors.utility.secondaryText,
              lineHeight: 1.5, marginBottom: 14,
            }}
          >
            {persona.desc}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {persona.tags.map(tag => (
              <span
                key={tag}
                style={{
                  fontSize: 10, fontWeight: 700,
                  fontFamily: "'IBM Plex Mono', monospace",
                  padding: '3px 8px', borderRadius: 4,
                  background: isSelected ? `${colors.brand.primary}10` : `${colors.utility.primaryText}06`,
                  color: isSelected ? colors.brand.primary : colors.utility.secondaryText,
                  border: `1px solid ${isSelected ? `${colors.brand.primary}25` : `${colors.utility.primaryText}10`}`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  transition: 'all .2s',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Page */}
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
        <div style={{ width: '100%', maxWidth: 680 }}>

          {/* Eyebrow */}
          <div
            style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: 1, color: colors.brand.primary,
              fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10,
            }}
          >
            Step 3 of 9
          </div>

          <h2
            style={{
              fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px',
              color: colors.utility.primaryText, marginBottom: 6,
            }}
          >
            How will you use ContractNest?
          </h2>
          <p
            style={{
              fontSize: 14, color: colors.utility.secondaryText,
              marginBottom: 32, lineHeight: 1.55,
            }}
          >
            Your answer shapes the entire setup. VaNi will configure your workspace accordingly.
          </p>

          {/* VaNi intro bubble */}
          <VaniBubble
            msg={`Hi <strong>${firstName}</strong>. I'm VaNi — I'll be setting up your workspace. Tell me how <strong>${companyName}</strong> operates and I'll take care of the rest.`}
          />

          {/* Persona cards grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
              marginBottom: 14,
            }}
          >
            {PERSONAS.map(p => (
              <PersonaCard key={p.id} persona={p} />
            ))}
          </div>

          {/* VaNi reaction bubble — slides up after selection */}
          {selectedPersona && (
            <div
              style={{
                marginTop: 20,
                opacity: vaniVisible ? 1 : 0,
                transform: vaniVisible ? 'translateY(0)' : 'translateY(8px)',
                transition: 'all .4s cubic-bezier(.22,1,.36,1)',
              }}
            >
              <VaniBubble msg={selectedPersona.vaniMsg} />
            </div>
          )}
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
          whiteSpace: 'nowrap',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        <span
          style={{
            fontSize: 13, fontWeight: 600,
            color: 'rgba(255,255,255,.65)',
          }}
        >
          {selected ? selectedPersona!.islandLabel : 'Choose how you operate'}
        </span>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />

        {/* Back */}
        <button
          type="button"
          onClick={() => navigate('/onboarding/business-details')}
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

        {/* Continue */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected || isSaving}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: !selected
              ? 'rgba(255,255,255,.15)'
              : colors.utility.secondaryBackground,
            color: !selected
              ? 'rgba(255,255,255,.3)'
              : colors.utility.primaryText,
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: !selected || isSaving ? 'not-allowed' : 'pointer',
            transition: 'all .2s',
            opacity: isSaving ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => {
            if (selected && !isSaving) {
              (e.currentTarget as HTMLButtonElement).style.background = '#f0ece6';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = selected
              ? colors.utility.secondaryBackground : 'rgba(255,255,255,.15)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          {isSaving ? (
            <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
          ) : null}
          Continue →
        </button>
      </div>
    </>
  );
};

export default PersonaSelectionStep;
