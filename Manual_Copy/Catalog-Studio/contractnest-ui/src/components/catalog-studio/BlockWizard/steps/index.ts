// src/components/catalog-studio/BlockWizard/steps/index.ts
// Phase 5: Added ResourceDependencyStep export

export { default as TypeSelectionStep } from './TypeSelectionStep';
export { default as BasicInfoStep } from './BasicInfoStep';

// Phase 5: Resource Dependency step
export { default as ResourceDependencyStep } from './ResourceDependencyStep';

// Service block steps
export * from './service';

// Spare Parts block steps
export * from './spare';

// Billing block steps
export * from './billing';

// Content/Text block steps
export * from './content';

// Media (Video/Image) block steps
export * from './media';

// Checklist block steps
export * from './checklist';

// Document block steps
export * from './document';
