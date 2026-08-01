// src/lite/onboarding/IntroStep.tsx
//
// The first thing a new tenant sees. VaNi introduces herself AS AN AI AGENT,
// then one button. This is the lite counterpart of the long flow's
// VaniIntroStep ("VaNi Agent · Active" badge, "I'm VaNi", "Your setup agent
// for {Company}") — same identity, same voice, in the light express shell.
//
// The long flow's VaniIntroStep is a good screen — but its "Let's go"
// hardcodes navigate('/onboarding/user-profile'), the long path. Reusing it
// would drop the tenant into the 16-screen form. So express has its own
// intro, deliberately carrying the same VaNi identity: same accent, same
// breathing orb, same voice.
//
// It is a splash, not a form step: resolveJourney() has no entry for /start,
// so ExpressShell renders no progress rail here. The wizard starts counting on
// the first screen that actually asks for something.
//
// NO ESCAPE HATCH TO THE LONG FORM. The "Prefer the detailed setup?" footer
// link used to send tenants into the 16-screen chain; lite is the one path
// now. The long form stays routed at /onboarding/* for anyone mid-flight and
// for support, it just is not offered from here.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import ExpressShell from './ExpressShell';

const PROMISES = [
  'Your services, priced from real market data — not an empty catalog',
  'Service schedules and checkpoints already filled in',
  'Contracts your customers accept on their phone',
];

export const IntroStep: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentTenant } = useAuth();

  const firstName = user?.first_name?.trim() || 'there';
  const company = currentTenant?.name?.trim() || 'your business';

  return (
    <ExpressShell
      title={`Hello ${firstName} — I'm VaNi`}
      subtitle={`I'm the AI agent that sets ${company} up on ContractNest. Answer two questions and I'll build the rest — everything I create is yours to edit afterwards.`}
    >
      <div className="cnx-orbwrap" aria-hidden="true">
        <div className="cnx-orb" />
      </div>

      <div className="cnx-agentbadge" role="status">
        <span className="cnx-agentdot" aria-hidden="true" />
        VaNi Agent · AI · Active
      </div>

      <ul className="cnx-promises">
        {PROMISES.map((p) => (
          <li key={p} className="cnx-promise">
            <span className="cnx-promisetick" aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>

      <span className="cnx-hint">
        You won&apos;t be filling forms or configuring anything from scratch — tell me about
        your business and I&apos;ll set everything up. Most businesses are ready in under six
        minutes, and nothing is permanent: every service, price and schedule stays editable.
      </span>

      <button type="button" className="cnx-btn cnx-primary" onClick={() => navigate('/start/business')}>
        Let&apos;s go
        <ArrowRight size={16} />
      </button>
    </ExpressShell>
  );
};

export default IntroStep;
