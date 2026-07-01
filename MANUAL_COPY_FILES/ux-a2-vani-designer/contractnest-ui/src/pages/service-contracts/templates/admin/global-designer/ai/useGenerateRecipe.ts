// src/pages/service-contracts/templates/admin/global-designer/ai/useGenerateRecipe.ts
//
// VaNi Designer — recipe generation state machine (UX-A2).
//
// This hook drives the AI panel's four quick actions with a 7-step streaming
// animation and returns a structured result. In this batch the generator is a
// DETERMINISTIC STUB derived from the wizard context (industry / asset /
// nomenclature) so the whole UX is clickable and testable with no backend.
// Batch C replaces `runStub` with a real /api/agent/recipe/* + edge LLM call;
// the hook's public surface (phase, steps, result, run, reset, toggleSlot)
// stays identical, so the panel does not change.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecipeSlot } from '../types';

// ─── Public types ───────────────────────────────────────────────────

export type GenAction = 'generate_full' | 'suggest_slots' | 'fill_fields' | 'review';
export type GenPhase = 'idle' | 'generating' | 'done' | 'error';

export interface GenStep {
  label: string;
  status: 'pending' | 'active' | 'done';
}

export interface FieldSuggestion {
  key: 'currency' | 'billingCycle' | 'paymentTermsDays' | 'compliance';
  label: string;
  value: string;
}

export type GenResult =
  | { kind: 'slots'; slots: RecipeSlot[] }
  | { kind: 'fields'; fields: FieldSuggestion[] }
  | { kind: 'review'; findings: string[] }
  | null;

export interface RecipeContext {
  industries: string[];
  industryLabels: string[];
  assetTypeNames: string[];
  assetTypeIds: string[];
  nomenclatureGroup: string | null;
  nomenclatureDisplayName: string | null;
  currency: string;
}

// ─── Streaming choreography (mirrors KTGenerationModal) ─────────────

const STEP_LABELS = [
  'Analyzing industry context',
  'Identifying resource attributes',
  'Generating scope of work',
  'Building pricing structure',
  'Defining service cadence',
  'Compiling compliance requirements',
  'Finalizing recipe',
];

const STEP_MS = 620; // per-step dwell

// ─── Deterministic knowledge stub ───────────────────────────────────
// Small, readable maps so the mock reads like real HVAC/facility output.

const COMPLIANCE_BY_INDUSTRY: Record<string, string[]> = {
  healthcare: ['Infection Control'],
  pharmaceutical: ['GMP', 'Cleanroom'],
  food_processing: ['HACCP', 'GMP'],
  manufacturing: ['ISO 9001'],
};

interface SlotSeed {
  activity: RecipeSlot['activity'];
  label: string;
  cadenceDays: number | null;
  checkpointCount: number;
  priceHintMin: number | null;
  priceHintMax: number | null;
}

// Skeleton recipes per nomenclature group. Generic enough for any industry;
// HVAC/AMC is simply the richest example.
const RECIPE_BY_GROUP: Record<string, SlotSeed[]> = {
  equipment_maintenance: [
    { activity: 'pm', label: 'Quarterly Preventive Maintenance', cadenceDays: 90, checkpointCount: 9, priceHintMin: 400, priceHintMax: 3000 },
    { activity: 'pm', label: 'Bi-monthly Filter, Coil & Drainage Service', cadenceDays: 45, checkpointCount: 5, priceHintMin: 300, priceHintMax: 5000 },
    { activity: 'inspection', label: 'Annual Performance Inspection', cadenceDays: 365, checkpointCount: 7, priceHintMin: 800, priceHintMax: 4000 },
    { activity: 'spare_pool', label: 'On-demand Spare Parts Pool', cadenceDays: null, checkpointCount: 0, priceHintMin: null, priceHintMax: null },
  ],
  facility_property: [
    { activity: 'pm', label: 'Monthly Housekeeping & Upkeep', cadenceDays: 30, checkpointCount: 8, priceHintMin: 2000, priceHintMax: 20000 },
    { activity: 'inspection', label: 'Quarterly Condition Inspection', cadenceDays: 90, checkpointCount: 6, priceHintMin: 1500, priceHintMax: 12000 },
    { activity: 'spare_pool', label: 'On-demand Consumables Pool', cadenceDays: null, checkpointCount: 0, priceHintMin: null, priceHintMax: null },
  ],
  _default: [
    { activity: 'pm', label: 'Scheduled Service Visit', cadenceDays: 90, checkpointCount: 6, priceHintMin: 500, priceHintMax: 5000 },
    { activity: 'inspection', label: 'Periodic Inspection', cadenceDays: 180, checkpointCount: 5, priceHintMin: 500, priceHintMax: 4000 },
  ],
};

let slotSeq = 0;
const nextId = () => `slot_${Date.now().toString(36)}_${(slotSeq++).toString(36)}`;

function buildSlots(ctx: RecipeContext, action: GenAction): RecipeSlot[] {
  const group = ctx.nomenclatureGroup && RECIPE_BY_GROUP[ctx.nomenclatureGroup]
    ? ctx.nomenclatureGroup
    : '_default';
  const seeds = RECIPE_BY_GROUP[group];

  const assetName = ctx.assetTypeNames[0] || 'Any';
  const assetId = ctx.assetTypeIds[0] || null;

  const compliance = Array.from(
    new Set(ctx.industries.flatMap((i) => COMPLIANCE_BY_INDUSTRY[i] || []))
  );

  return seeds.map((s) => ({
    id: nextId(),
    activity: s.activity,
    label: s.label,
    assetTypeName: assetName,
    assetTypeId: assetId,
    cadenceDays: s.cadenceDays,
    checkpointCount: s.checkpointCount,
    // spares/on-demand don't carry service compliance
    complianceStandards: s.activity === 'spare_pool' ? [] : compliance,
    priceHintMin: s.priceHintMin,
    priceHintMax: s.priceHintMax,
    currency: ctx.currency || 'INR',
    // "Suggest" opts the admin IN per slot; "Generate Full" pre-accepts all.
    accepted: action === 'generate_full',
  }));
}

function buildFields(ctx: RecipeContext): FieldSuggestion[] {
  const isEquipment = ctx.nomenclatureGroup === 'equipment_maintenance';
  const compliance = Array.from(
    new Set(ctx.industries.flatMap((i) => COMPLIANCE_BY_INDUSTRY[i] || []))
  );
  return [
    { key: 'currency', label: 'Currency', value: ctx.currency || 'INR' },
    { key: 'billingCycle', label: 'Billing cycle', value: isEquipment ? 'quarterly' : 'monthly' },
    { key: 'paymentTermsDays', label: 'Payment terms', value: 'Net 30' },
    { key: 'compliance', label: 'Compliance', value: compliance.length ? compliance.join(', ') : 'None' },
  ];
}

function buildReview(ctx: RecipeContext): string[] {
  const findings: string[] = [];
  if (!ctx.nomenclatureDisplayName) findings.push('No nomenclature selected — the recipe has no contract-type shape yet.');
  if (ctx.industries.length === 0) findings.push('No target industries — compliance defaults cannot be inferred.');
  if (ctx.assetTypeNames.length === 0) findings.push('No equipment/facility selected — slots will be unscoped (asset = Any).');
  findings.push('Cadence looks reasonable for the selected nomenclature group.');
  findings.push('Consider adding a breakdown/repair slot for round-the-clock coverage.');
  return findings;
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useGenerateRecipe() {
  const [phase, setPhase] = useState<GenPhase>('idle');
  const [action, setAction] = useState<GenAction | null>(null);
  const [steps, setSteps] = useState<GenStep[]>([]);
  const [result, setResult] = useState<GenResult>(null);
  const [error, setError] = useState<string | null>(null);

  // Track timers so we can cancel on unmount / re-run (prevents state updates
  // after unmount and overlapping runs — the UX equivalent of a race guard).
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const runToken = useRef(0);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    runToken.current += 1;
    setPhase('idle');
    setAction(null);
    setSteps([]);
    setResult(null);
    setError(null);
  }, [clearTimers]);

  const run = useCallback((act: GenAction, ctx: RecipeContext) => {
    clearTimers();
    const token = ++runToken.current;

    setAction(act);
    setError(null);
    setResult(null);
    setPhase('generating');
    setSteps(STEP_LABELS.map((label, i) => ({ label, status: i === 0 ? 'active' : 'pending' })));

    // Advance the 7-step animation.
    STEP_LABELS.forEach((_, i) => {
      const t = setTimeout(() => {
        if (runToken.current !== token) return; // superseded
        setSteps((prev) =>
          prev.map((s, idx) => {
            if (idx < i) return { ...s, status: 'done' };
            if (idx === i) return { ...s, status: 'active' };
            return s;
          })
        );
      }, i * STEP_MS);
      timers.current.push(t);
    });

    // Finalize.
    const done = setTimeout(() => {
      if (runToken.current !== token) return;
      try {
        setSteps((prev) => prev.map((s) => ({ ...s, status: 'done' })));
        let res: GenResult;
        if (act === 'generate_full' || act === 'suggest_slots') {
          res = { kind: 'slots', slots: buildSlots(ctx, act) };
        } else if (act === 'fill_fields') {
          res = { kind: 'fields', fields: buildFields(ctx) };
        } else {
          res = { kind: 'review', findings: buildReview(ctx) };
        }
        setResult(res);
        setPhase('done');
      } catch (e: any) {
        setError(e?.message || 'Generation failed');
        setPhase('error');
      }
    }, STEP_LABELS.length * STEP_MS + 200);
    timers.current.push(done);
  }, [clearTimers]);

  // Toggle a slot's accepted flag in the current result (per-slot accept/reject).
  const toggleSlot = useCallback((id: string) => {
    setResult((prev) => {
      if (!prev || prev.kind !== 'slots') return prev;
      return { kind: 'slots', slots: prev.slots.map((s) => (s.id === id ? { ...s, accepted: !s.accepted } : s)) };
    });
  }, []);

  const setAllSlots = useCallback((accepted: boolean) => {
    setResult((prev) => {
      if (!prev || prev.kind !== 'slots') return prev;
      return { kind: 'slots', slots: prev.slots.map((s) => ({ ...s, accepted })) };
    });
  }, []);

  return { phase, action, steps, result, error, run, reset, toggleSlot, setAllSlots };
}

export default useGenerateRecipe;
