// src/components/reveal/useReveal.ts
//
// One hook, one question: should this surface be visible for this tenant?
//
//   const showPerspective = useReveal('perspective');
//   if (!showPerspective) return null;
//
// Fails open. If the provider is missing, signals are unknown, or a rule throws,
// the surface shows. Hiding something a live tenant depends on is the only
// failure mode that actually costs anything.

import { useMemo } from 'react';
import { useRevealContext } from './revealContext';
import { evaluateReveal, REVEAL_RULES, type RevealId, type RevealSignals } from './revealRules';

export function useReveal(id: RevealId): boolean {
  const { signals, overrides } = useRevealContext();

  return useMemo(() => {
    const override = overrides?.[id];
    if (typeof override === 'boolean') return override;
    return evaluateReveal(id, signals ?? {});
  }, [id, signals, overrides]);
}

/** Evaluate several surfaces at once. */
export function useReveals<T extends RevealId>(ids: readonly T[]): Record<T, boolean> {
  const { signals, overrides } = useRevealContext();

  return useMemo(() => {
    const out = {} as Record<T, boolean>;
    ids.forEach((id) => {
      const override = overrides?.[id];
      out[id] = typeof override === 'boolean' ? override : evaluateReveal(id, signals ?? {});
    });
    return out;
  }, [ids, signals, overrides]);
}

/**
 * Push signals in from a screen that already has the numbers.
 * Call inside an effect, never during render.
 *
 *   const { setSignals } = useRevealSignals();
 *   useEffect(() => { setSignals({ contractCount: contracts.length }); }, [contracts.length]);
 */
export function useRevealSignals(): {
  signals: RevealSignals;
  setSignals: (next: Partial<RevealSignals>) => void;
} {
  const { signals, setSignals } = useRevealContext();
  return { signals, setSignals };
}

/** Dev/QA helper: the full rule table with current outcomes. */
export function useRevealAudit(): Array<{
  id: RevealId;
  visible: boolean;
  unlocksWhen: string;
  overridden: boolean;
}> {
  const { signals, overrides } = useRevealContext();

  return useMemo(
    () =>
      (Object.keys(REVEAL_RULES) as RevealId[]).map((id) => {
        const override = overrides?.[id];
        const overridden = typeof override === 'boolean';
        return {
          id,
          visible: overridden ? (override as boolean) : evaluateReveal(id, signals ?? {}),
          unlocksWhen: REVEAL_RULES[id].unlocksWhen,
          overridden,
        };
      }),
    [signals, overrides]
  );
}
