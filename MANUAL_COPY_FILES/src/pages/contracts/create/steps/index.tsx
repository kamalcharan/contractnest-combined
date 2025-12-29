// src/pages/contracts/create/steps/index.tsx
// Export all Contract Builder step components

export { default as ContractTypeStep } from './ContractTypeStep';
export { default as RecipientStep } from './RecipientStep';
export { default as AcceptanceStep } from './AcceptanceStep';
export { default as BuilderStep } from './BuilderStep';
export { default as TimelineStep } from './TimelineStep';
export { default as BillingStep } from './BillingStep';
export { default as ReviewStep } from './ReviewStep';
export { default as SendStep } from './SendStep';

// Re-export types if needed
export type { Step } from '../../../../components/contracts/StepNavigation/stepindicator';
