// src/pages/onboarding/steps/LovSetupStep.tsx
// VaNi onboarding — "Your tags": the Tags list for contacts.
//
// This page used to show Roles and Tags together. Roles (and the optional
// invite) moved to the "Your team" page (TeamSetupStep, /onboarding/team-setup),
// which now comes first; this page keeps its route so resume and old links
// still land here. Load / add logic lives in useLovCategory, the card in
// LovCategoryCard — both shared with the team page.
//
// Navigation: team-setup → THIS → /onboarding/done

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { completeVaniStep } from '@/utils/onboarding/completeVaniStep';
import { DEFAULT_LOV_SEED } from '@/utils/constants/lovDefaults';
import { useLovCategory } from '@/hooks/useLovCategory';
import VaniStepShell, { VANI_TOKENS as T } from '@/components/onboarding/VaniStepShell';
import LovCategoryCard, { BUSINESS_NOUN, lovPersonaFrom } from '@/components/onboarding/LovCategoryCard';

const TAGS_SEED = DEFAULT_LOV_SEED.find((s) => s.category_name === 'Tags')!;

// Example contact for the preview, in this business's world.
const EXAMPLE_CONTACT = {
  seller: { name: 'Ravi Kumar', meta: 'Sunrise Apartments · 2 lifts', initials: 'RK', kind: 'Client' },
  both: { name: 'Anil Reddy', meta: 'Greenfield Towers · DG + lifts', initials: 'AR', kind: 'Client' },
  buyer: { name: 'Sunrise Lift Services', meta: 'Lift AMC vendor', initials: 'SL', kind: 'Vendor' },
} as const;

const LovSetupStep: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state || {}) as Record<string, any>;
  const persona = lovPersonaFrom(routeState.persona);

  const tags = useLovCategory('Tags');
  // Which tags the example contact carries — tapped in the filter row.
  const [picked, setPicked] = useState<string[] | null>(null);
  const shown = picked ?? tags.values.slice(0, 1).map((v) => v.DisplayName);

  const finish = (data: Record<string, any>) => {
    completeVaniStep('lov-setup', data);
    navigate('/onboarding/done', { state: routeState });
  };

  const example = EXAMPLE_CONTACT[persona];
  const togglePreview = (name: string) =>
    setPicked(shown.includes(name) ? shown.filter((n) => n !== name) : [...shown, name]);

  return (
    <VaniStepShell
      title="Your tags"
      message={<>
        <b>Tags</b> label the people you work with, so you can find and group them later. I've started a few —
        add what fits your {BUSINESS_NOUN[persona]}, or change them any time in <b>Settings → List of Values</b>.
      </>}
      loading={tags.loading}
      loadingText="Loading your tags…"
      onSkip={() => finish({ skipped: true })}
      skipLabel="Skip, I'll do this later"
      onContinue={() => finish({ value_counts: { Tags: tags.values.length } })}
      aside={
        <div style={{ background: T.WHITE, border: `1px solid ${T.BORDER}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11.5, color: T.TEXT_MUTED, fontWeight: 600 }}>Contacts · an example contact with tags</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e8e3db', color: T.TEXT_DIM, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
              {example.initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: T.TEXT }}>{example.name}</div>
              <div style={{ fontSize: 12, color: T.TEXT_DIM }}>{example.meta}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 100, padding: '2px 8px', background: '#ccfbf1', border: '1px solid #99f6e4', color: '#0f766e' }}>
                  {example.kind}
                </span>
                {tags.values.filter((v) => shown.includes(v.DisplayName)).map((v) => (
                  <span key={v.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, borderRadius: 100, padding: '2px 8px', border: `1px solid ${T.BORDER}`, background: T.SURFACE, color: T.TEXT }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: v.hexcolor || T.TEXT_MUTED }} />
                    {v.DisplayName}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: T.TEXT_MUTED, fontWeight: 600 }}>Filter your contacts by tag · tap to try</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.values.map((v) => {
              const on = shown.includes(v.DisplayName);
              return (
                <button key={v.id} onClick={() => togglePreview(v.DisplayName)} aria-pressed={on}
                  style={{
                    fontSize: 11.5, borderRadius: 100, padding: '3px 9px', cursor: 'pointer', fontFamily: T.FONT,
                    border: `1px solid ${on ? T.VANI_LINE : T.BORDER}`, background: on ? T.VANI_SOFT : T.SURFACE,
                    color: on ? T.VANI : T.TEXT_DIM, fontWeight: on ? 600 : 500,
                  }}>
                  {v.DisplayName}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: T.TEXT_DIM }}>
            Client / Vendor / Lead are set by ContractNest itself. Tags are yours to add.
          </div>
        </div>
      }
    >
      <LovCategoryCard
        seed={TAGS_SEED}
        title="Tags for your contacts"
        subtitle="How you group the people you work with"
        persona={persona}
        businessNoun={BUSINESS_NOUN[persona]}
        lov={tags}
        placeholder="e.g. Gold AMC"
      />
    </VaniStepShell>
  );
};

export default LovSetupStep;
