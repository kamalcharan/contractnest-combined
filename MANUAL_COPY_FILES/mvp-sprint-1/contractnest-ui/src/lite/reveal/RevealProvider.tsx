// src/lite/reveal/RevealProvider.tsx
//
// Supplies the signals the reveal rules are evaluated against.
//
// Deliberately dumb: it holds signals and an override map. It does NOT fetch.
// Screens that already know a number (contract count, visit count) push it in
// via `setSignals`, so we add no queries and no load to the API — which is what
// keeps this UX-only and keeps BBB's runtime untouched.

import React, { useCallback, useMemo, useState } from 'react';
import { RevealContext, type RevealContextValue } from './revealContext';
import type { RevealId, RevealSignals } from './revealRules';

// Every surface forced on — used by `revealAll` for pre-MVP tenants.
const ALL_ON: Partial<Record<RevealId, boolean>> = {
  'env-badge': true,
  perspective: true,
  payables: true,
  'group-sessions': true,
  'catalog-studio': true,
  'sla-metrics': true,
  charts: true,
  discount: true,
  'contact-tabs': true,
};

interface RevealProviderProps {
  children: React.ReactNode;
  /** Seed values known at mount (e.g. from tenant profile). */
  initialSignals?: RevealSignals;
  /**
   * Escape hatch for existing tenants. When true every rule returns true, so
   * the app looks exactly as it does today. Pass this for any tenant that
   * predates the MVP — nothing they use should disappear.
   */
  revealAll?: boolean;
}

export const RevealProvider: React.FC<RevealProviderProps> = ({
  children,
  initialSignals = {},
  revealAll = false,
}) => {
  const [signals, setSignalsState] = useState<RevealSignals>(initialSignals);
  const [overrides, setOverrides] = useState<Partial<Record<RevealId, boolean>>>({});

  const setSignals = useCallback((next: Partial<RevealSignals>) => {
    setSignalsState((prev) => {
      // Skip the state update when nothing actually changed — this is called
      // from effects on render paths and must not cause loops.
      const changed = (Object.keys(next) as Array<keyof RevealSignals>).some(
        (k) => prev[k] !== next[k]
      );
      return changed ? { ...prev, ...next } : prev;
    });
  }, []);

  const setOverride = useCallback((id: RevealId, value: boolean | undefined) => {
    setOverrides((prev) => {
      const nextOverrides = { ...prev };
      if (value === undefined) delete nextOverrides[id];
      else nextOverrides[id] = value;
      return nextOverrides;
    });
  }, []);

  const value = useMemo<RevealContextValue>(
    () => ({
      signals,
      setSignals,
      overrides: revealAll ? ALL_ON : overrides,
      setOverride,
    }),
    [signals, setSignals, overrides, setOverride, revealAll]
  );

  return <RevealContext.Provider value={value}>{children}</RevealContext.Provider>;
};

export default RevealProvider;
