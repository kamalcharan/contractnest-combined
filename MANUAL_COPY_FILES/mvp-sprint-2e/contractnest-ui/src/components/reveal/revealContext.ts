// src/components/reveal/revealContext.ts
//
// Context + accessor live here rather than in RevealProvider.tsx so that file
// exports a component and nothing else — otherwise React Fast Refresh stops
// working for it (react-refresh/only-export-components).

import { createContext, useContext } from 'react';
import type { RevealId, RevealSignals } from './revealRules';

export interface RevealContextValue {
  signals: RevealSignals;
  /** Merge new signals in. Safe to call repeatedly; only changed keys re-render. */
  setSignals: (next: Partial<RevealSignals>) => void;
  /** Force a surface on/off regardless of rules — for support, QA and demos. */
  overrides: Partial<Record<RevealId, boolean>>;
  setOverride: (id: RevealId, value: boolean | undefined) => void;
}

export const RevealContext = createContext<RevealContextValue>({
  signals: {},
  setSignals: () => {},
  overrides: {},
  setOverride: () => {},
});

export const useRevealContext = (): RevealContextValue => useContext(RevealContext);
