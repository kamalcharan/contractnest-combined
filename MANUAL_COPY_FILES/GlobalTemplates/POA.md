# Global Template Designer — Plan of Action (POA)

**Session:** GlobalTemplates
**Date:** 2026-03-15 (Updated)
**PRD Reference:** `ClaudeDocumentation/globaltemplates/GlobalTemplates PRD.pdf`
**Submodules Affected:** `contractnest-api`, `contractnest-ui`, `contractnest-edge`

---

## Current State Analysis

### What Already Exists

| Item | Status | Location |
|------|--------|----------|
| Route: `global-templates` | Exists | `App.tsx:466` — renders existing `GlobalTemplatesPage` (template gallery) |
| Route: `global-designer` | Placeholder | `App.tsx:467` — renders `<div>Global Designer Coming Soon</div>` |
| `GlobalTemplatesPage` | Exists | `src/pages/service-contracts/templates/admin/global-templates.tsx` — filter/grid/list for existing templates |
| `TemplateDesignerPage` | Exists | `src/pages/service-contracts/templates/designer/index.tsx` — tenant template builder with block drag/drop |
| `TemplateCard` component | Exists | `src/components/service-contracts/templates/TemplateCard.tsx` |
| `TemplateDesigner` folder | Exists | Has `BlockConfigPanel.tsx`, `handleDrop-wrapper.tsx` |
| `useTemplates` hook | Exists | `src/hooks/service-contracts/templates/useTemplates.ts` |
| Template types | Exists | `src/types/service-contracts/template.ts` |
| Template utils/constants | Exists | `src/utils/service-contracts/templates.ts` |
| `catTemplatesService` (API) | Exists | Backend service with HMAC signing to Edge Functions |
| `catBlocksService` (API) | Exists | Backend service for block operations |
| `cat-templates` edge fn | Exists | Supabase edge function with copy/CRUD |
| `cat-blocks` edge fn | Exists | Block management edge function |
| `smart-forms` edge fn | Exists | Form template CRUD + clone + versioning |
| `_shared/signatureValidator` | Exists | HMAC-SHA256 signing pattern |
| `_shared/edgeUtils` | Exists | Pagination, idempotency, optimistic locking |
| UI component library | shadcn/ui | `src/components/ui/` — toast, dialog, card, tabs, skeleton, badge, etc. |
| Toast system | `useToast` | `@/components/ui/use-toast` |
| Loading spinner | Exists | `src/components/ui/LoadingSpinner.tsx` |
| Theme system | Context | `ThemeContext.tsx` with `isDarkMode`, `currentTheme`, `colors` |
| Auth system | Context | `AuthContext.tsx` with tenant/admin roles |
| State management | React Context + React Query | No Redux/Zustand — uses contexts + `QueryProvider` |

### What Needs To Be Built

Per PRD — 4 phases, but since **Section 12 requires approval before execution**, below is the detailed task breakdown for each phase.

---

## Step 0: Table Rename (COMPLETED)

> **Status: Files ready in `MANUAL_COPY_FILES/GlobalTemplates/`**

Renamed `cat_blocks` → `m_cat_blocks` and `cat_templates` → `m_cat_templates` to align with master data naming convention (`m_` prefix).

| # | File | Change |
|---|------|--------|
| 1 | `contractnest-edge/supabase/migrations/global-templates/000_rename_cat_tables.sql` | NEW — ALTER TABLE RENAME + verification |
| 2 | `contractnest-edge/supabase/functions/cat-blocks/index.ts` | MODIFIED — 8x `.from('cat_blocks')` → `.from('m_cat_blocks')` |
| 3 | `contractnest-edge/supabase/functions/cat-templates/index.ts` | MODIFIED — 11x `.from('cat_templates')` → `.from('m_cat_templates')` |
| 4 | `contractnest-ui/src/hooks/queries/useCatBlocks.ts` | MODIFIED — 1x parseResponse context string |

**Deployment order:** Migration FIRST → Edge functions SECOND → UI LAST

---

## Phase 1: Foundation (DB + Coverage APIs + UI Shell)

> **All table references below use the NEW names: `m_cat_blocks`, `m_cat_templates`**

### 1.1 Database Migrations (PROPOSAL — Needs Approval)

> **All SQL below is for review. Will NOT execute until approved.**

| # | Migration | Table/Object | What It Does |
|---|-----------|-------------|--------------|
| 1 | `001_alter_m_cat_templates.sql` | `m_cat_templates` | Add columns: `scope`, `resource_template_id`, `nomenclature_id`, `nomenclature_code`, `supported_currencies`, `description` (text), `tags`, `complexity`, `est_duration_minutes`, `times_used`, `avg_rating`, `is_featured`, `created_by_agent`, `agent_metadata` |
| 2 | `002_alter_m_cat_blocks.sql` | `m_cat_blocks` | Add columns: `scope`, `source_global_block_id` |
| 3 | `003_alter_form_templates.sql` | `m_form_templates` | Add columns: `source_template_id`, `resource_template_id`, `created_by_agent`, `agent_metadata` |
| 4 | `004_create_coverage_view.sql` | `m_global_template_coverage` | Create materialized view + refresh function joining `m_catalog_resource_templates` ↔ `m_cat_templates` ↔ `m_form_templates` ↔ `m_catalog_industries` |
| 5 | `005_create_clone_log.sql` | `m_template_clone_log` | Audit trail table for global→tenant transitions |
| 6 | `006_create_indexes.sql` | Indexes | `idx_m_cat_templates_scope`, `idx_m_cat_templates_resource`, `idx_m_cat_blocks_scope`, `idx_gtc_resource_industry` |

**Files created in:** `contractnest-edge/supabase/migrations/global-templates/`

### 1.2 Coverage Dashboard API Endpoints (contractnest-api)

| # | Method | Endpoint | Purpose | Source |
|---|--------|----------|---------|--------|
| 1 | GET | `/api/admin/template-coverage` | Industry-wise resource template coverage stats | `m_global_template_coverage` |
| 2 | GET | `/api/admin/template-coverage/:industryId` | Resources for an industry with template/gap status | `m_global_template_coverage` filtered |
| 3 | GET | `/api/admin/template-coverage/:industryId/:resourceTemplateId` | Full resource detail + all templates + all SmartForms | Join `m_catalog_resource_templates` + `m_cat_templates` + `m_form_templates` |
| 4 | POST | `/api/admin/template-coverage/refresh` | Trigger `REFRESH MATERIALIZED VIEW` | Admin only |

**Files to create:**
- `contractnest-api/src/routes/globalTemplateRoutes.ts` — Express router
- `contractnest-api/src/services/globalTemplateService.ts` — Service layer (calls Supabase directly or via edge function)

**Files to modify:**
- `contractnest-api/src/index.ts` — Register new route (pattern: `app.use('/api/admin', authenticate, globalTemplateRoutes)`)

### 1.3 UI Shell — Global Designer Page (contractnest-ui)

**New page:** `src/pages/service-contracts/templates/admin/global-designer/index.tsx`

**4 Views (as per PRD Section 5):**

| View | Component | Description |
|------|-----------|-------------|
| View 1 | `IndustryCoverageGrid` | 4 stat cards (Total Resources, Templated, Gaps, SmartForms) + industry cards with coverage % and color coding (>70% green, 40-69% amber, <40% red) |
| View 2 | `ResourceList` | Breadcrumb navigation, resource type pill filters (All/Equipment/Facility/Service/Consumable/Partner), sort options, coverage stats, resource rows with status dots (green=has template, amber=no template), bulk action "Create Templates for All Gaps" |
| View 3 | `ResourceDetail` | Right panel slide-in: Resource info card, common makes, pricing guidance, templates list with cards, "No Template" state with "Create with AI" button |
| View 4 | `AIAgentPanel` | Slide-in from right (400px): Header with avatar, resource context card, nomenclature chips (AMC/CMC/FMC/etc.), chat interface with streaming, action buttons (Accept/Modify/Regenerate) |

**New files:**
```
src/pages/service-contracts/templates/admin/global-designer/
├── index.tsx                    (main page with view state management)
├── IndustryCoverageGrid.tsx     (View 1)
├── ResourceList.tsx             (View 2)
├── ResourceDetail.tsx           (View 3)
├── AIAgentPanel.tsx             (View 4 — Phase 2)
└── components/
    ├── IndustryCard.tsx
    ├── ResourceRow.tsx
    ├── CoverageStats.tsx
    ├── TemplateDetailCard.tsx
    └── SmartFormCard.tsx
```

**Files to modify:**
- `src/App.tsx` — Replace placeholder route with actual `GlobalDesignerPage` component

**New hooks:**
- `src/hooks/service-contracts/templates/useTemplateCoverage.ts` — React Query hooks for coverage APIs

**New types:**
- `src/types/service-contracts/global-template.ts` — TypeScript interfaces for coverage, resource detail, generated template

---

## Phase 2: AI Agent (LLM Integration + Template Generation)

### 2.1 Backend — LLM Adapter + Template Agent (contractnest-api)

| # | File | Purpose |
|---|------|---------|
| 1 | `src/constants/ai-providers.ts` | `AI_PROVIDERS` record (claude, openai, gemini, liquidai), `ACTIVE_AI_PROVIDER`, `TEMPLATE_AGENT_CONFIG` |
| 2 | `src/services/ai/llm-adapter.ts` | `LLMAdapter` interface (`generate`, `generateStream`), `createLLMAdapter` factory function |
| 3 | `src/services/ai/adapters/anthropic.ts` | Claude adapter implementation |
| 4 | `src/services/ai/adapters/openai.ts` | OpenAI adapter implementation |
| 5 | `src/services/ai/adapters/gemini.ts` | Gemini adapter implementation |
| 6 | `src/services/ai/adapters/custom.ts` | Custom/LiquidAI adapter |
| 7 | `src/services/ai/template-agent.ts` | Template generation pipeline: fetch resource → build system prompt → call LLM → parse/validate → return `GeneratedTemplate` |
| 8 | `src/services/ai/prompts/template-generation.ts` | `buildSystemPrompt()` function using PRD prompt templates |
| 9 | `src/services/ai/prompts/smartform-generation.ts` | SmartForm-only generation prompts |
| 10 | `src/constants/template-agent.ts` | `BLOCK_TYPES_FOR_NOMENCLATURE`, `SMARTFORM_TIMING`, `CURRENCY_DEFAULTS`, `TAX_RATES` |

### 2.2 Template Generation API Endpoints

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | POST | `/api/admin/templates/generate` | Generate template (preview, not saved). Body: `TemplateGenerationRequest` → Returns: `GeneratedTemplate` |
| 2 | POST | `/api/admin/templates/generate/save` | Save generated template. Body: `{ generatedTemplate, modifications? }` → Creates `m_cat_templates` + `m_cat_blocks` + `m_form_templates` |
| 3 | POST | `/api/admin/templates/generate/regenerate` | Regenerate with feedback. Body: `{ resourceTemplateId, nomenclatureCode, feedback }` |
| 4 | POST | `/api/admin/smartform/generate` | Generate SmartForm only. Body: `{ resourceTemplateId, timing, context }` |
| 5 | POST | `/api/admin/smartform/generate/save` | Save generated SmartForm |

**Files to modify:**
- `src/routes/globalTemplateRoutes.ts` — Add generation endpoints

### 2.3 UI — AI Agent Panel (contractnest-ui)

Complete View 4 (`AIAgentPanel.tsx`):
- Chat interface with streaming responses (SSE or fetch stream)
- Nomenclature chip selector
- Template preview in agent response (block list + SmartForm field preview)
- Action buttons: "Accept & Create", "Modify", "Regenerate"
- SmartForm JSON schema preview modal

**New hooks:**
- `src/hooks/service-contracts/templates/useTemplateGeneration.ts` — Mutation hooks for generate/save/regenerate

---

## Phase 3: Global → Tenant Transition (Clone Flow)

### 3.1 Edge Function — Clone Global Template (contractnest-edge)

**New file:** `supabase/functions/clone-global-template/index.ts`

| Step | What It Does |
|------|-------------|
| 1 | Validate tenant has required industry setup (`t_tenant_served_industries`) |
| 2 | BEGIN TRANSACTION |
| 3 | Seed missing `t_category_details` for tenant (block_type_id, pricing_mode_id, price_type_id) |
| 4 | Clone `m_cat_blocks` → tenant `m_cat_blocks` (new UUIDs, `tenant_id` set, `source_global_block_id` for reference) |
| 5 | Create tenant `m_cat_templates` (new UUID, `scope='tenant'`, `is_system=false`, blocks array with new IDs) |
| 6 | Link SmartForms via `form_template_mappings` (reference global forms, NOT clone them) |
| 7 | Seed resource in `t_category_resources_master` if missing |
| 8 | Log to `m_template_clone_log` |
| 9 | Increment `times_used` on global template |
| 10 | COMMIT |

Supports two `clone_type` values:
- `use_template` — Strict clone, `is_system=true`, blocks read-only
- `copy_to_space` — Editable copy, `is_system=false`, `source_global_block_id` set for reference

### 3.2 API Proxy for Clone (contractnest-api)

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | POST | `/api/templates/clone-to-tenant` | Proxy to `clone-global-template` edge function with HMAC signing |
| 2 | POST | `/api/templates/copy-to-space` | Same edge function, `clone_type='copy_to_space'` |

### 3.3 UI — Template Gallery Updates (contractnest-ui)

Modify existing `GlobalTemplatesPage` (`global-templates.tsx`):
- Add "Use Template" button on template cards
- Add "Copy to My Space" flow
- Clone progress indicator
- Success state showing cloned resources

---

## Phase 4: Polish & Integration

### 4.1 Integration Testing
- Designer → Global Templates page flow (new template appears in gallery after save)
- Global → Tenant clone flow (verify all FKs, mappings, resources seeded)
- SmartForm schema validation against existing `FormRenderer`
- Materialized view refresh triggers
- Error handling and rollback scenarios

### 4.2 Performance
- Materialized view refresh strategy (manual trigger via API for now — open decision #1)
- Pagination on coverage dashboard APIs

### 4.3 Admin Notifications
- Template versioning: when global template updated → notify tenants who cloned it (open decision #5)

---

## Implementation Order (Recommended)

```
Step 0 (Prerequisite — DONE):
  └── Table rename: cat_blocks → m_cat_blocks, cat_templates → m_cat_templates

Sprint 1 (Phase 1):
  ├── Step 1: DB migrations (REVIEW FIRST) ──────────────── needs approval
  ├── Step 2: Coverage API endpoints ────────────────────── contractnest-api
  ├── Step 3: UI shell - View 1 (IndustryCoverageGrid) ── contractnest-ui
  ├── Step 4: UI shell - View 2 (ResourceList) ──────────── contractnest-ui
  ├── Step 5: UI shell - View 3 (ResourceDetail) ────────── contractnest-ui
  └── Step 6: Breadcrumb navigation between views ────────── contractnest-ui

Sprint 2 (Phase 2):
  ├── Step 7: AI provider constants + LLM adapter ────────── contractnest-api
  ├── Step 8: Template agent pipeline + prompts ──────────── contractnest-api
  ├── Step 9: Generation API endpoints ──────────────────── contractnest-api
  ├── Step 10: UI - AIAgentPanel (View 4) ────────────────── contractnest-ui
  └── Step 11: Save generated template flow ──────────────── full stack

Sprint 3 (Phase 3):
  ├── Step 12: Clone edge function ───────────────────────── contractnest-edge
  ├── Step 13: Clone API proxy ──────────────────────────── contractnest-api
  └── Step 14: Template Gallery "Use Template" UI ────────── contractnest-ui

Sprint 4 (Phase 4):
  ├── Step 15: Integration testing ──────────────────────── all
  ├── Step 16: Materialized view refresh ────────────────── contractnest-edge
  └── Step 17: Template detail view (PRD 5.7) ───────────── contractnest-ui
```

---

## Open Decisions (From PRD Section 13 — Need Your Input)

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| 1 | **Materialized view refresh strategy** | On every template save / Cron job / Manual trigger | Performance vs freshness |
| 2 | **SmartForm approval workflow** | Agent forms go `draft→in_review→approved` OR skip to `approved` | UX speed vs safety |
| 3 | **LiquidAI integration** | How does it inject domain knowledge before LLM call? | Architecture of adapter |
| 4 | **Batch template generation** | Synchronous (wait for all) OR queued (background job) | UX for "Create All Gaps" |
| 5 | **Template versioning** | Notify tenants / Auto-update / Do nothing | Clone maintenance |

---

## File Count Estimate

| Submodule | New Files | Modified Files |
|-----------|----------|----------------|
| `contractnest-api` | ~12 | ~2 |
| `contractnest-ui` | ~15 | ~3 |
| `contractnest-edge` | ~7 | ~3 (Step 0 rename) |
| **Total** | **~34** | **~8** |

---

## Next Step

**Per PRD Section 12:** All database schema changes, API designs, and architectural decisions must be approved before execution.

**Recommended starting point:** Review & approve the DB migrations (Step 1) so we can build the foundation that everything else depends on.
