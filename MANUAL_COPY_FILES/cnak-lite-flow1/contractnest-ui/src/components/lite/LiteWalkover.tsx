// src/components/lite/LiteWalkover.tsx
//
// First-visit guided tour for lite tenants. Zero dependencies: a fixed
// overlay dims the page, the current step's target (found by its
// [data-walkover] attribute) is spotlit with a box-shadow cutout, and a
// small card is positioned next to it. Steps whose target isn't in the
// DOM (collapsed sidebar, registry card with nothing to show) are skipped
// automatically, so LITE_WALKOVER can stay the superset.
//
// Shown once per tenant per LITE_WALKOVER_VERSION (localStorage); the
// dashboard's "Show me around" button clears the flag to replay it.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import {
  LITE_WALKOVER,
  LITE_WALKOVER_VERSION,
  LiteFlavor,
  LiteWalkoverStep
} from '../../utils/constants/liteAccess';

const storageKey = (tenantId: string) => `cn_lite_walkover_v${LITE_WALKOVER_VERSION}_${tenantId}`;

export const hasSeenWalkover = (tenantId: string | undefined | null): boolean => {
  if (!tenantId) return true; // no tenant → never auto-show
  try {
    return localStorage.getItem(storageKey(tenantId)) === 'done';
  } catch {
    return true; // storage blocked → fail closed, don't loop the tour
  }
};

export const resetWalkover = (tenantId: string | undefined | null): void => {
  if (!tenantId) return;
  try {
    localStorage.removeItem(storageKey(tenantId));
  } catch {
    /* ignore */
  }
};

interface LiteWalkoverProps {
  flavor: LiteFlavor;
  tenantId: string;
  /** Bump to re-open the tour (dashboard "Show me around" button) */
  runToken?: number;
}

interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6; // px of breathing room around the spotlit element
const CARD_W = 300;

const LiteWalkover: React.FC<LiteWalkoverProps> = ({ flavor, tenantId, runToken = 0 }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const brand = colors.brand.primary;

  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<SpotRect | null>(null);
  // Steps are resolved against the DOM when the tour starts, so hidden
  // targets drop out and indexes stay stable for the whole run.
  const [steps, setSteps] = useState<LiteWalkoverStep[]>([]);
  const rafRef = useRef<number | null>(null);

  const findTarget = useCallback((step: LiteWalkoverStep | undefined): HTMLElement | null => {
    if (!step) return null;
    return document.querySelector<HTMLElement>(`[data-walkover="${step.target}"]`);
  }, []);

  const begin = useCallback(() => {
    const available = LITE_WALKOVER[flavor].filter((s) =>
      document.querySelector(`[data-walkover="${s.target}"]`)
    );
    if (available.length === 0) return;
    setSteps(available);
    setStepIndex(0);
    setActive(true);
  }, [flavor]);

  // Auto-start once per tenant/version. Delayed so the dashboard's data
  // pass finishes and the real cards (not loaders) are what gets spotlit.
  useEffect(() => {
    if (hasSeenWalkover(tenantId)) return;
    const t = setTimeout(begin, 900);
    return () => clearTimeout(t);
  }, [tenantId, begin]);

  // Manual replay
  const lastRunToken = useRef(runToken);
  useEffect(() => {
    if (runToken !== lastRunToken.current) {
      lastRunToken.current = runToken;
      begin();
    }
  }, [runToken, begin]);

  const finish = useCallback(() => {
    setActive(false);
    try {
      localStorage.setItem(storageKey(tenantId), 'done');
    } catch {
      /* ignore */
    }
  }, [tenantId]);

  // Track the current target's rect (scroll into view first, then follow
  // it through resizes/scrolls while the step is up).
  useEffect(() => {
    if (!active) return;
    const el = findTarget(steps[stepIndex]);
    if (!el) {
      // Target vanished mid-run (data refetch) — skip forward, or end.
      if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
      else finish();
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
      rafRef.current = requestAnimationFrame(measure);
    };
    rafRef.current = requestAnimationFrame(measure);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, stepIndex, steps, findTarget, finish]);

  // Esc closes
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, finish]);

  const cardPos = useMemo(() => {
    if (!rect) return { top: 0, left: 0 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Prefer below the target, flip above when there's no room.
    let top = rect.top + rect.height + 12;
    if (top + 170 > vh) top = Math.max(12, rect.top - 182);
    let left = rect.left;
    if (left + CARD_W > vw - 12) left = Math.max(12, vw - CARD_W - 12);
    return { top, left };
  }, [rect]);

  if (!active || !rect || steps.length === 0) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Product tour">
      {/* Spotlight: one element whose massive box-shadow dims everything
          around the cutout. Clicks on the dimmed area advance nothing. */}
      <div
        className="absolute rounded-xl transition-all duration-300 pointer-events-none"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          boxShadow: `0 0 0 9999px ${isDarkMode ? 'rgba(0,0,0,0.72)' : 'rgba(15,15,15,0.6)'}`,
          border: `2px solid ${brand}`
        }}
      />

      {/* Step card */}
      <div
        className="absolute rounded-xl p-4 shadow-2xl transition-all duration-300"
        style={{
          top: cardPos.top,
          left: cardPos.left,
          width: CARD_W,
          backgroundColor: colors.utility.secondaryBackground,
          border: `1px solid ${colors.utility.primaryText}20`
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-sm font-extrabold" style={{ color: colors.utility.primaryText }}>
            {step.title}
          </span>
          <button onClick={finish} aria-label="Close tour" className="flex-none -mt-0.5 -mr-1 p-1 rounded">
            <X size={14} style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>
        <p className="text-xs leading-relaxed mb-3" style={{ color: colors.utility.secondaryText }}>
          {step.body}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono" style={{ color: colors.utility.secondaryText }}>
            {stepIndex + 1}/{steps.length}
          </span>
          <button
            onClick={finish}
            className="ml-auto text-[11px] font-semibold px-2 py-1.5 rounded-lg"
            style={{ color: colors.utility.secondaryText }}
          >
            Skip
          </button>
          {stepIndex > 0 && (
            <button
              onClick={() => setStepIndex((i) => i - 1)}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg"
              style={{ color: brand, backgroundColor: `${brand}12`, border: `1px solid ${brand}40` }}
            >
              Back
            </button>
          )}
          <button
            onClick={() => (isLast ? finish() : setStepIndex((i) => i + 1))}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white"
            style={{ backgroundColor: brand }}
          >
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiteWalkover;
