// src/pages/onboarding/steps/EngagementModelStep.tsx
// Stream 1 / Task 1.1 — Engagement Model
// Shown after PersonaSelectionStep for seller/both personas.
// Captures HOW the seller engages clients: equipment, facility, service-only, or hybrid.
// Saves engagement_model to t_tenant_profiles and routes to /onboarding/theme-selection.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { vaniToast } from '@/components/common/toast';
import { completeVaniStep } from '@/utils/onboarding/completeVaniStep';
import { Loader2 } from 'lucide-react';

type EngagementModel = 'equipment_first' | 'facility_first' | 'service_first' | 'hybrid';

interface EngagementOption {
  id: EngagementModel;
  icon: string;
  name: string;
  desc: string;
  tags: string[];
  vaniMsg: string;
  islandLabel: string;
  defaultTab: 'equipment' | 'facilities' | 'services';
}

const OPTIONS: EngagementOption[] = [
  {
    id: 'equipment_first',
    icon: '🔧',
    name: 'Equipment Servicer',
    desc: 'You service and maintain equipment — AC units, generators, lifts, medical devices. Your contracts are AMC, CMC, or repair-based.',
    tags: ['AMC', 'CMC', 'Repair', 'Equipment'],
    vaniMsg: "Got it — you're an <strong>equipment servicer</strong>. I'll highlight your equipment catalog and help you build pricing for each type you work with.",
    islandLabel: 'Equipment Servicer',
    defaultTab: 'equipment',
  },
  {
    id: 'facility_first',
    icon: '🏢',
    name: 'Facility Manager',
    desc: 'You manage facilities — housekeeping, security, horticulture, property maintenance. Your clients are buildings, campuses, or complexes.',
    tags: ['Housekeeping', 'Security', 'Property', 'SLA'],
    vaniMsg: "Got it — you're a <strong>facility manager</strong>. I'll set up your facility service catalog and help you define scope for each site type.",
    islandLabel: 'Facility Manager',
    defaultTab: 'facilities',
  },
  {
    id: 'service_first',
    icon: '💼',
    name: 'Service Provider',
    desc: 'You sell knowledge or expertise — consulting, legal, payroll, wellness, training. No equipment involved — your deliverables are services.',
    tags: ['Consulting', 'Wellness', 'Legal', 'Payroll'],
    vaniMsg: "Got it — you're a <strong>pure service provider</strong>. I'll focus your catalog on service packages and deliverables, with flexible billing options.",
    islandLabel: 'Service Provider',
    defaultTab: 'services',
  },
  {
    id: 'hybrid',
    icon: '🔀',
    name: 'Hybrid',
    desc: 'You do a mix — maybe you service equipment AND provide consulting, or manage facilities AND run training programs.',
    tags: ['Mixed', 'Equipment + Services', 'Full catalog'],
    vaniMsg: "Hybrid setup — I'll give you access to <strong>equipment, facility, and service catalogs</strong> so you can build contracts for any engagement type.",
    islandLabel: 'Hybrid',
    defaultTab: 'equipment',
  },
];

const EngagementModelStep: React.FC = () => {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const { user, currentTenant } = useAuth();
  const { formData } = useTenantProfile({ isOnboarding: true });

  const colors = currentTheme.colors;
  const firstName = user?.first_name || 'there';

  const [selected, setSelected] = useState<EngagementModel | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [vaniVisible, setVaniVisible] = useState(false);

  useEffect(() => {
    const saved = (formData as any).engagement_model;
    if (saved && OPTIONS.find(o => o.id === saved)) {
      setSelected(saved as EngagementModel);
      setVaniVisible(true);
    }
  }, [(formData as any).engagement_model]);

  const handleSelect = (id: EngagementModel) => {
    setSelected(id);
    setTimeout(() => setVaniVisible(true), 100);
  };

  const handleContinue = async () => {
    if (!selected || isSaving) return;
    setIsSaving(true);
    try {
      await api.post(API_ENDPOINTS.TENANTS.PROFILE, {
        business_name: (formData as any).business_name || currentTenant?.name || '',
        engagement_model: selected,
      });
      const option = OPTIONS.find(o => o.id === selected)!;
      completeVaniStep('engagement-model', {
        engagement_model: selected,
        default_tab: option.defaultTab,
      });
      vaniToast.success('Saved');
      navigate('/onboarding/theme-selection');
    } catch (err: any) {
      vaniToast.error(err?.response?.data?.error || 'Failed to save — please try again');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedOption = OPTIONS.find(o => o.id === selected);

  const VaniBubble = ({ msg }: { msg: string }) => (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
      <div style={{
        width: 36, height: 36, flexShrink: 0,
        background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.alternate})`,
        borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: 14, color: '#fff',
        boxShadow: `0 3px 8px ${colors.brand.primary}40`, marginTop: 2,
      }}>V</div>
      <div style={{
        background: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}14`,
        borderRadius: '3px 14px 14px 14px',
        padding: '14px 18px',
        boxShadow: `0 2px 12px ${colors.utility.primaryText}08`,
        fontSize: 14, color: colors.utility.secondaryText, lineHeight: 1.6,
        maxWidth: 520,
      }} dangerouslySetInnerHTML={{ __html: msg }} />
    </div>
  );

  const OptionCard = ({ option }: { option: EngagementOption }) => {
    const isSelected = selected === option.id;
    const isHybrid = option.id === 'hybrid';

    return (
      <div
        onClick={() => handleSelect(option.id)}
        style={{
          background: isSelected ? `${colors.brand.primary}06` : colors.utility.secondaryBackground,
          border: `2px solid ${isSelected ? colors.brand.primary : `${colors.utility.primaryText}18`}`,
          borderRadius: 14,
          padding: isHybrid ? '20px 22px' : '24px 22px',
          cursor: 'pointer',
          transition: 'all .2s cubic-bezier(.22,1,.36,1)',
          position: 'relative',
          overflow: 'hidden',
          gridColumn: isHybrid ? '1 / -1' : undefined,
          display: isHybrid ? 'grid' : 'block',
          gridTemplateColumns: isHybrid ? 'auto 1fr' : undefined,
          alignItems: isHybrid ? 'center' : undefined,
          gap: isHybrid ? 20 : undefined,
          boxShadow: isSelected
            ? `0 0 0 3px ${colors.brand.primary}14, 0 4px 20px ${colors.utility.primaryText}08`
            : 'none',
        }}
        onMouseEnter={e => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.borderColor = `${colors.brand.primary}50`;
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={e => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.borderColor = `${colors.utility.primaryText}18`;
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          }
        }}
      >
        {/* Check mark */}
        <div style={{
          position: 'absolute', top: 14, right: 14,
          width: 22, height: 22, borderRadius: '50%',
          background: colors.brand.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, color: '#fff',
          opacity: isSelected ? 1 : 0,
          transform: isSelected ? 'scale(1)' : 'scale(.5)',
          transition: 'all .25s cubic-bezier(.34,1.56,.64,1)',
        }}>✓</div>

        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, marginBottom: isHybrid ? 0 : 16, flexShrink: 0,
          background: isSelected ? `${colors.brand.primary}10` : `${colors.utility.primaryText}06`,
          border: `1px solid ${isSelected ? `${colors.brand.primary}30` : `${colors.utility.primaryText}10`}`,
          transition: 'all .2s',
        }}>{option.icon}</div>

        <div>
          <div style={{
            fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px',
            marginBottom: 6, color: colors.utility.primaryText,
          }}>{option.name}</div>
          <div style={{
            fontSize: 12, color: colors.utility.secondaryText,
            lineHeight: 1.5, marginBottom: 14,
          }}>{option.desc}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
            {option.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 10, fontWeight: 700,
                fontFamily: "'IBM Plex Mono', monospace",
                padding: '3px 8px', borderRadius: 4,
                background: isSelected ? `${colors.brand.primary}10` : `${colors.utility.primaryText}06`,
                color: isSelected ? colors.brand.primary : colors.utility.secondaryText,
                border: `1px solid ${isSelected ? `${colors.brand.primary}25` : `${colors.utility.primaryText}10`}`,
                textTransform: 'uppercase' as const, letterSpacing: '0.4px', transition: 'all .2s',
              }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={{
        flex: 1, backgroundColor: colors.utility.primaryBackground,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '48px 24px 140px', fontFamily: "'Outfit', sans-serif", minHeight: '100%',
      }}>
        <div style={{ width: '100%', maxWidth: 680 }}>

          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
            letterSpacing: 1, color: colors.brand.primary,
            fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10,
          }}>
            Step 5 · How you engage clients
          </div>

          <h2 style={{
            fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px',
            color: colors.utility.primaryText, marginBottom: 6,
          }}>
            What kind of services do you provide?
          </h2>
          <p style={{
            fontSize: 14, color: colors.utility.secondaryText,
            marginBottom: 32, lineHeight: 1.55,
          }}>
            This shapes your catalog — equipment types, facility scopes, or service packages.
          </p>

          <VaniBubble msg={`<strong>${firstName}</strong>, as a service provider — what does your typical engagement look like? This helps me build the right catalog for you.`} />

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 14, marginBottom: 14,
          }}>
            {OPTIONS.map(o => <OptionCard key={o.id} option={o} />)}
          </div>

          {selectedOption && (
            <div style={{
              marginTop: 20,
              opacity: vaniVisible ? 1 : 0,
              transform: vaniVisible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'all .4s cubic-bezier(.22,1,.36,1)',
            }}>
              <VaniBubble msg={selectedOption.vaniMsg} />
            </div>
          )}
        </div>
      </div>

      {/* Floating action island */}
      <div style={{
        position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        background: `${(colors as any).accent?.accent1 || '#1a1816'}f0`,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        padding: '10px 10px 10px 24px', borderRadius: 100,
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 20px 50px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06)',
        zIndex: 200, whiteSpace: 'nowrap' as const, fontFamily: "'Outfit', sans-serif",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
          {selected ? selectedOption!.islandLabel : 'Choose your engagement type'}
        </span>
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />
        <button
          type="button"
          onClick={() => navigate('/onboarding/persona-selection')}
          style={{
            padding: '10px 20px', borderRadius: 100, border: 'none',
            background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >← Back</button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected || isSaving}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: !selected ? 'rgba(255,255,255,.15)' : colors.utility.secondaryBackground,
            color: !selected ? 'rgba(255,255,255,.3)' : colors.utility.primaryText,
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: !selected || isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {isSaving && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
          Continue →
        </button>
      </div>
    </>
  );
};

export default EngagementModelStep;
