// src/components/onboarding/JourneyRail.tsx
//
// The one wizard. Rendered by the express screens (via ExpressShell) and by
// OnboardingLayout's header, so a tenant sees the same step, the same number
// and the same total wherever they are in the journey.
//
// Two densities:
//   default  — full rail with labels, for the express screens' own page body
//   compact  — dots plus "3 / 7", for the fixed OnboardingLayout header strip
//
// Colours are props rather than tokens because the two hosts are themed
// differently: the express screens carry their own paper palette, while
// OnboardingLayout follows the tenant's selected theme. Both pass what they
// have; the defaults are neutral enough to be legible on either.

import React from 'react';
import type { JourneyStep } from './journey';
import './journeyRail.css';

interface JourneyRailProps {
  steps: JourneyStep[];
  currentIndex: number;
  compact?: boolean;
  /** Current-step colour. Defaults to the express deep green. */
  accent?: string;
  /** Completed-step colour. Defaults to accent. */
  done?: string;
  /** Not-yet-reached colour. */
  muted?: string;
  /** Text on top of a filled dot. */
  onAccent?: string;
}

export const JourneyRail: React.FC<JourneyRailProps> = ({
  steps,
  currentIndex,
  compact = false,
  accent,
  done,
  muted,
  onAccent,
}) => {
  if (!steps.length) return null;

  const style = {
    ...(accent ? { ['--cnj-accent' as string]: accent } : null),
    ...(done ? { ['--cnj-done' as string]: done } : null),
    ...(muted ? { ['--cnj-muted' as string]: muted } : null),
    ...(onAccent ? { ['--cnj-on-accent' as string]: onAccent } : null),
  } as React.CSSProperties;

  const label = `Step ${currentIndex + 1} of ${steps.length}: ${steps[currentIndex]?.label ?? ''}`;

  if (compact) {
    return (
      <div className="cnj-rail cnj-compact" style={style} aria-label={label}>
        <span className="cnj-sr">{label}</span>
        <span className="cnj-bars" aria-hidden="true">
          {steps.map((step, i) => (
            <span
              key={step.id}
              className={`cnj-bar ${i < currentIndex ? 'cnj-is-done' : ''} ${i === currentIndex ? 'cnj-is-now' : ''}`}
              title={step.label}
            />
          ))}
        </span>
        <span className="cnj-count" aria-hidden="true">
          {currentIndex + 1} / {steps.length}
        </span>
      </div>
    );
  }

  return (
    <ol className="cnj-rail" style={style} aria-label="Setup progress">
      {steps.map((step, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'now' : 'next';
        return (
          <li key={step.id} className={`cnj-item cnj-${state}`}>
            <span className="cnj-dot" aria-hidden="true">
              {i < currentIndex ? '✓' : i + 1}
            </span>
            <span className="cnj-label">{step.label}</span>
            {i === currentIndex && <span className="cnj-sr"> (current step)</span>}
          </li>
        );
      })}
    </ol>
  );
};

export default JourneyRail;
