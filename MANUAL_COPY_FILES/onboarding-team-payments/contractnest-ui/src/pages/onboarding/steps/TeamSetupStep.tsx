// src/pages/onboarding/steps/TeamSetupStep.tsx
// VaNi onboarding — "Your team": the Roles list plus an optional invite.
//
// Split out of the old two-list LovSetupStep: roles are about the people who
// work WITH you, tags (now the next page, lov-setup) about the people you
// work for. A role is a designation — stored on the invitation and shown on
// the team list; nothing checks it for access, so nothing here says it does.
//
// Navigation: (terms / payment-setup / equipment-confirm …) → THIS → lov-setup

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { completeVaniStep } from '@/utils/onboarding/completeVaniStep';
import { DEFAULT_LOV_SEED } from '@/utils/constants/lovDefaults';
import { useLovCategory } from '@/hooks/useLovCategory';
import VaniStepShell, { VANI_TOKENS as T } from '@/components/onboarding/VaniStepShell';
import LovCategoryCard, { BUSINESS_NOUN, LovPersona, lovPersonaFrom } from '@/components/onboarding/LovCategoryCard';
import InviteTeamSection, { SentInvite } from '@/components/onboarding/InviteTeamSection';

const ROLES_SEED = DEFAULT_LOV_SEED.find((s) => s.category_name === 'Roles')!;

const INVITE_REASON: Record<LovPersona, string> = {
  seller: 'Invite your technicians so you can assign visits to them on the Ops board and Timeboard.',
  buyer: 'Invite your facility manager so they can follow vendor visits and approve work with you.',
  both: 'Invite your technicians and your accounts person so the work and the payments are not all on you.',
};

const TeamSetupStep: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state || {}) as Record<string, any>;
  const persona = lovPersonaFrom(routeState.persona);

  const roles = useLovCategory('Roles');
  const [sent, setSent] = useState<SentInvite[]>([]);
  const invitable = roles.values.filter((r) => r.is_deletable !== false);

  const next = (data: Record<string, any>) => {
    completeVaniStep('team-setup', data);
    navigate('/onboarding/lov-setup', { state: routeState });
  };

  const previewRole = invitable[0]?.DisplayName || 'Member';

  return (
    <VaniStepShell
      title="Your team"
      message={<>
        <b>Roles</b> are the titles your teammates carry. I've started a few for you — add what fits your {BUSINESS_NOUN[persona]},
        and invite people now if you like. You can change all of it later in <b>Settings</b>.
      </>}
      loading={roles.loading}
      loadingText="Loading your roles…"
      onSkip={() => next({ skipped: true, invites_sent: sent.length })}
      skipLabel="Skip, I'll do this later"
      onContinue={() => next({ role_count: roles.values.length, invites_sent: sent.length })}
      aside={
        <div style={{ background: T.WHITE, border: `1px solid ${T.BORDER}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11.5, color: T.TEXT_MUTED, fontWeight: 600 }}>Settings → Users · your team</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.TEXT }}>
            <b>You</b>
            <span style={{ fontSize: 11, fontWeight: 600, border: `1px solid ${T.BORDER}`, borderRadius: 100, padding: '2px 8px', background: T.SURFACE }}>Owner</span>
          </div>
          {(sent.length ? sent : [{ to: 'e.g. suresh@yourcompany.in', roleName: previewRole }]).map((s) => (
            <div key={s.to} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, color: sent.length ? T.TEXT : T.TEXT_MUTED, borderTop: `1px solid ${T.BORDER}`, paddingTop: 8 }}>
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{s.to}</span>
              <span style={{ fontSize: 11, fontWeight: 600, border: `1px solid ${T.BORDER}`, borderRadius: 100, padding: '2px 8px', background: T.SURFACE, whiteSpace: 'nowrap' }}>
                {s.roleName} · invited
              </span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: T.TEXT_DIM }}>The role shows next to each person on this list.</div>
        </div>
      }
    >
      <LovCategoryCard
        seed={ROLES_SEED}
        title="Roles for your team"
        subtitle="What your teammates are called"
        persona={persona}
        businessNoun={BUSINESS_NOUN[persona]}
        lov={roles}
        placeholder="e.g. Site engineer"
        footer={roles.categoryId && invitable.length > 0 ? (
          <InviteTeamSection
            roles={invitable}
            reason={INVITE_REASON[persona]}
            sent={sent}
            onSent={(s) => setSent((prev) => [...prev, s])}
          />
        ) : null}
      />
    </VaniStepShell>
  );
};

export default TeamSetupStep;
