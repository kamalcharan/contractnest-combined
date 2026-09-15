import type { StepId } from '../logic/stepConfig';

// Presentation only. Persisted step numbers, gating and calculators stay unchanged.
export const CREATION_CHAPTERS: { title: string; promise: string; steps: StepId[] }[] = [
  { title: 'Agreement', promise: 'Set the relationship and the promise.', steps: ['nomenclature', 'acceptance', 'counterparty', 'details'] },
  { title: 'Coverage & services', promise: 'Make it clear what you will deliver or receive.', steps: ['assetSelection', 'billingCycle', 'blocks'] },
  { title: 'Money', promise: 'Agree the price and when payments happen.', steps: ['billingView'] },
  { title: 'Delivery plan', promise: 'Know what happens, when, and what proves it.', steps: ['evidencePolicy', 'events'] },
  { title: 'Review', promise: 'One agreement. Every commitment in view.', steps: ['review'] },
];

export const DECISION_LABELS: Record<StepId, string> = {
  path: 'Starting point', nomenclature: 'Agreement label', acceptance: 'How it is accepted',
  counterparty: 'Who it is with', details: 'Name & term', assetSelection: 'What is covered',
  billingCycle: 'Service pricing cycles', blocks: 'Services & inclusions', billingView: 'Price & payments',
  evidencePolicy: 'Proof of delivery', events: 'Events Preview', review: 'Review & create',
};

export function chapterFor(step: StepId) {
  return CREATION_CHAPTERS.findIndex(chapter => chapter.steps.includes(step));
}
