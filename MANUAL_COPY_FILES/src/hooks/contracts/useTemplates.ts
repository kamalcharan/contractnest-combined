// src/hooks/contracts/useTemplates.ts
// Re-export from queries hooks (TanStack Query based)
export {
  useTemplates,
  useTemplateSelection,
  useTemplateAnalytics,
  INDUSTRIES,
  TEMPLATE_COMPLEXITY_LABELS,
  CONTRACT_TYPE_LABELS,
  ITEMS_PER_PAGE_OPTIONS,
  templateKeys
} from '../queries/useTemplates';

export type {
  Template,
  TemplateFilters,
  TemplateStats,
  TemplateContext
} from '../queries/useTemplates';
