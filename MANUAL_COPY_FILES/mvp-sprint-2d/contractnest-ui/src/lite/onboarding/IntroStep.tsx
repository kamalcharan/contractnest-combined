// src/lite/onboarding/IntroStep.tsx
//
// The first thing a new tenant sees. VaNi introduces herself, then one button.
//
// The long flow opens with VaniIntroStep, which is a good screen — but its
// "Let's go" hardcodes navigate('/onboarding/user-profile'), the long path.
// Reusing it would drop the tenant into the 16-screen form. So express has its
// own intro, deliberately carrying the same VaNi identity: same accent, same
// breathing orb, same voice.
//
// It is a splash, not a form step: resolveJourney() has no entry for /start,
// so ExpressShell renders no progress rail here. The wizard starts counting on
// the first screen that actually asks for something.

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
      subtitle={`I'll set ${company} up while you answer two questions. Everything I build is yours to edit afterwards.`}
      footer={
        <button type="button" className="cnx-link" onClick={() => navigate('/onboarding/vani-intro')}>
          Prefer the detailed setup? Use the full form →
        </button>
      }
    >
      <div className="cnx-orbwrap" aria-hidden="true">
        <div className="cnx-orb" />
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
        Most businesses are up and running in under six minutes. Nothing here is permanent —
        every service, price and schedule stays editable.
      </span>

      <button type="button" className="cnx-btn cnx-primary" onClick={() => navigate('/start/business')}>
        Let&apos;s go
        <ArrowRight size={16} />
      </button>
    </ExpressShell>
  );
};

export default IntroStep;
