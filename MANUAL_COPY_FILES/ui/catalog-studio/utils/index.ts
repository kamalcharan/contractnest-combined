// src/utils/catalog-studio/index.ts
// Catalog Studio utilities - existing + API adapters

// Existing exports (DO NOT REMOVE)
export * from './categories';
export * from './blocks';
export * from './wizard-data';

// API Adapters (NEW)
export * from './catBlockAdapter';
export * from './catTemplateAdapter';

// Re-export the default adapter objects
export { default as catBlockAdapter } from './catBlockAdapter';
export { default as catTemplateAdapter } from './catTemplateAdapter';
