// src/lite/onboarding/ExpressShell.tsx
//
// Frame shared by the express onboarding screens: brand, progress rail, card,
// and an optional aside for contextual messages.
//
// TWO THINGS IT OWNS FOR THE WHOLE FLOW
//
// 1. The theme. The long flow applied the VaNi theme in VaniIntroStep and
//    again in VaniConsentStep — both of which express skips — so the header
//    chrome kept whatever theme the tenant happened to have while every screen
//    from vani-working on rendered in hardcoded VaNi orange. Setting it here,
//    on the first express screen, restores the single identity for the entire
//    journey. Same call the long flow makes; ThemeContext.setTheme only writes
//    localStorage, and on the next login ThemeContext re-reads
//    user_data.preferred_theme, so nothing is permanently overwritten.
//
// 2. The wizard. The rail is the SHARED JourneyRail, the same component
//    OnboardingLayout's header renders, from the same model — so "Step 2 of 7"
//    here and the header on the next screen agree.
//
// Routes outside the journey (the intro splash at /start) simply get no rail:
// resolveJourney returns null and the wizard starts counting on the first
// screen that actually asks for something.

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useTheme } from '@/contexts/ThemeContext';
import JourneyRail from '@/components/onboarding/JourneyRail';
import { resolveJourney, type JourneyPersona } from '@/components/onboarding/journey';

import './express.css';

interface ExpressShellProps {
  /** Drives which journey shape is shown — a buyer never sees a pricing step. */
  persona?: JourneyPersona;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Contextual panel beside the card. Widens the layout when present. */
  aside?: React.ReactNode;
  footer?: React.ReactNode;
}

export const ExpressShell: React.FC<ExpressShellProps> = ({
  persona = null,
  title,
  subtitle,
  children,
  aside,
  footer,
}) => {
  const location = useLocation();
  const { setTheme } = useTheme();
  const journey = resolveJourney(location.pathname, persona);

  useEffect(() => {
    setTheme('vani');
    // setTheme is recreated each render in the existing context; depending on
    // it would re-apply the theme on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = (
    <div className="cnx-card">
      <h1 className="cnx-title">{title}</h1>
      {subtitle && <p className="cnx-sub">{subtitle}</p>}
      {children}
    </div>
  );

  return (
    <div className="cnx-root">
      <div className={`cnx-wrap${aside ? ' cnx-wide' : ''}`}>
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

        {aside ? (
          <div className="cnx-cols">
            {card}
            {aside}
          </div>
        ) : (
          card
        )}

        {footer && <div className="cnx-foot">{footer}</div>}
      </div>
    </div>
  );
};

export default ExpressShell;
