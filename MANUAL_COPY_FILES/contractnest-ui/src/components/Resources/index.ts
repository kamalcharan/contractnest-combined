// src/components/Resources/index.ts
// Barrel exports for Resources components

// Main components
export { default as ResourceTypesList } from './ResourceTypesList';
export { default as ResourcesPanel } from './ResourcesPanel';
export { default as ResourceCard } from './ResourceCard';
export { default as AddResourceForm } from './AddResourceForm';

// Empty states - default export and named exports
export { default as ResourcesEmptyStates } from './EmptyStates';
export {
  ManualEntryEmptyState,
  ContactBasedEmptyState,
  SearchEmptyState,
  ErrorEmptyState,
  NoResourceTypesEmptyState,
  ResourceDescriptionCard
} from './EmptyStates';

// Re-export types for convenience
export type {
  Resource,
  ResourceType,
  ResourceFilters,
  CreateResourceFormData,
  UpdateResourceFormData,
  EmptyStateProps,
  ResourceCardProps,
  ResourceFormProps,
} from '../../types/resources';