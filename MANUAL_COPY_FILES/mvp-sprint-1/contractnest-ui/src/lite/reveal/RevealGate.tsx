// src/lite/reveal/RevealGate.tsx
//
// Wrap an existing surface to gate it. This is the ONLY way reveal touches
// existing screens — wrap, never edit the logic inside.
//
//   <RevealGate id="perspective">
//     <PerspectiveToggle />
//   </RevealGate>
//
// With a replacement for empty states:
//
//   <RevealGate id="charts" fallback={<EmptyChartCta />}>
//     <BillingChart data={data} />
//   </RevealGate>

import React from 'react';
import { useReveal } from './useReveal';
import type { RevealId } from './revealRules';

interface RevealGateProps {
  id: RevealId;
  children: React.ReactNode;
  /** Rendered instead of children when hidden. Defaults to nothing. */
  fallback?: React.ReactNode;
}

export const RevealGate: React.FC<RevealGateProps> = ({ id, children, fallback = null }) => {
  const visible = useReveal(id);
  return <>{visible ? children : fallback}</>;
};

export default RevealGate;
