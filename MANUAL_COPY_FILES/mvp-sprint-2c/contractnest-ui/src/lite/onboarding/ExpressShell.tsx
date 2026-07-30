// src/lite/onboarding/ExpressShell.tsx
//
// Frame shared by the express onboarding screens: brand, progress rail and a
// consistent card. Deliberately plain — the point of this path is that there is
// almost nothing on it.
//
// The rail is the SHARED JourneyRail — the same component OnboardingLayout's
// header renders, driven by the same model in components/onboarding/journey.
// So "Step 2 of 7" here and the header on the next screen agree, instead of
// the three contradictory step models this replaced.

import React from 'react';
import { useLocation } from 'react-router-dom';

import JourneyRail from '@/components/onboarding/JourneyRail';
import { resolveJourney, type JourneyPersona } from '@/components/onboarding/journey';

import './express.css';

interface ExpressShellProps {
  /** Drives which journey shape is shown — a buyer never sees a pricing step. */
  persona?: JourneyPersona;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const ExpressShell: React.FC<ExpressShellProps> = ({
  persona = null,
  title,
  subtitle,
  children,
  footer,
}) => {
  const location = useLocation();
  const journey = resolveJourney(location.pathname, persona);

  return (
    <div className="cnx-root">
      <div className="cnx-wrap">
        <div className="cnx-brand">
          Contract<span>Nest</span>
        </div>

        {journey && (
          <JourneyRail
            steps={journey.steps}
            currentIndex={journey.currentIndex}
            accent="var(--deep)"
            muted="var(--faint)"
            onAccent="var(--deep-ink)"
          />
        )}

        <div className="cnx-card">
          <h1 className="cnx-title">{title}</h1>
          {subtitle && <p className="cnx-sub">{subtitle}</p>}
          {children}
        </div>

        {footer && <div className="cnx-foot">{footer}</div>}
      </div>
    </div>
  );
};

export default ExpressShell;
