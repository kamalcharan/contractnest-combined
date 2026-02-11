# CLAUDE.md — ContractNest Domain Enhancement

> **Read this file FIRST before doing anything. Then read the handover documents referenced below.**

---

## WHO YOU'RE WORKING WITH

Charan Kamal Bommakanti — Founder & CEO of Vikuna Technologies. 24+ years IT experience. He designed this architecture himself and knows every table, every route, every edge function. Don't explain his own system back to him. Don't suggest "improvements" to patterns he deliberately chose. If something looks odd, ASK why before changing it — there's usually a reason.

He thinks in systems, not features. He cares about architectural consistency more than shipping speed. He will reject clean code that breaks his established patterns.

---

## THE PROJECT

ContractNest — multi-tenant SaaS for service contract lifecycle management.

**Stack**: React 18 + TypeScript + Vite (UI) | Node.js + Express (API) | Supabase PostgreSQL + Deno Edge Functions (Edge) | Docker deployment on Railway

**Repo structure** (git submodules under `contractnest-combined`):
```
contractnest-combined/          ← parent repo (master branch)
├── contractnest-ui/            ← React frontend (main branch)
├── contractnest-api/           ← Node.js backend (main branch)
├── contractnest-edge/          ← Supabase migrations + edge functions (main branch)
├── ClaudeDocumentation/        ← Docs + handover files (master branch)
├── ContractNest-Mobile/        ← React Native app (main branch)
└── FamilyKnows/                ← Separate product (main branch)
```

---

## MANDATORY READING (before writing any code)

Read these files IN ORDER before starting work:

1. `ClaudeDocumentation/contractnest-handover.md` — Full context: what ContractNest is, what the domain audit found, all architecture decisions, implementation phases P0-P4, current wizard flow, key files
2. `ClaudeDocumentation/contractnest-handover-addendum.md` — Critical fix: service-based contract segment (wellness, consulting, training), 21 nomenclature types (not 15), 4-group picker, updated wizard routing
3. `ClaudeDocumentation/contractnest-git-workflow.md` — Branch strategy, merge order, rollback plan, testing checklists

**After reading these**, confirm to the user:
- Which phase you're working on (P0, P1, or P2)
- What branch name you expect to be on
- What files you plan to create/modify
- What you will NOT touch

---

## CURRENT PHASE

**Ask the user which phase to work on.** Never assume. Never mix phases.

| Phase | Branch | Scope |
|-------|--------|-------|
| P0 | feature/p0-nomenclature | Nomenclature seed + t_contracts column + wizard picker + badges |
| P1 | feature/p1-equipment | Equipment tables + junction + resource settings + wizard step |
| P2 | feature/p2-entities | Entity tables + hierarchy + entity picker + wizard step |

---

## ARCHITECTURE PATTERNS YOU MUST FOLLOW

### 1. Database Conventions

```sql
-- Master/global tables: prefix m_
-- Example: m_category_master, m_catalog_resource_types, m_catalog_industries

-- Tenant/transactional tables: prefix t_
-- Example: t_contracts, t_equipment, t_contact_addresses

-- Catalog studio tables: prefix cat_
-- Example: cat_blocks, cat_templates, cat_asset_types

-- ALL tables must have:
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
tenant_id UUID NOT NULL REFERENCES t_tenants(id),
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now(),
created_by UUID REFERENCES auth.users(id),
updated_by UUID REFERENCES auth.users(id),
is_active BOOLEAN DEFAULT true

-- Exception: m_ (master) tables don't have tenant_id
-- Exception: m_ tables use is_active BOOLEAN DEFAULT true for soft delete

-- JSONB for flexible metadata, dedicated columns for queryable fields
-- Use form_settings JSONB on m_category_details for metadata (established pattern)

-- RLS: ALWAYS add row-level security policies for t_ tables
-- Pattern: tenant_id = auth.jwt()->>'tenant_id'
```

### 2. LOV (List of Values) Pattern

ContractNest uses `m_category_master` + `m_category_details` as a generic configurable enum system. This is used for billing models, plan features, event statuses, tax categories, AND NOW nomenclature.

```
m_category_master → defines a category GROUP (e.g., 'cat_contract_nomenclature')
m_category_details → defines individual VALUES within that group (e.g., 'AMC', 'CMC', 'FMC')
  - sub_cat_name: machine-readable code
  - display_name: human-readable label
  - description: explanation text
  - hexcolor: badge color
  - icon_name: Lucide icon name
  - form_settings: JSONB metadata (flexible per category)
  - sequence_no: display order
  - tags: JSONB for additional categorization
```

**DO NOT create new standalone enum/lookup tables when m_category_details can hold the data.** Ask first.

### 3. Catalog Resource Pattern

```
m_catalog_resource_types → global resource type definitions (equipment, team_staff, consumable, etc.)
m_catalog_resource_templates → industry × resource type templates (CURRENTLY EMPTY — needs seeding)
m_catalog_industries → global industry list
m_catalog_categories → global service category list
m_catalog_category_industry_map → industry ↔ category many-to-many
t_category_resources_master → tenant's actual resource instances
```

**DO NOT bypass this hierarchy.** New equipment/entity data should flow through this pattern where possible.

### 4. UI Component Patterns

```typescript
// All pages use the existing layout system:
// - AppLayout with sidebar navigation
// - PageHeader component for title + actions
// - Card-based content sections
// - Slide-in panels (not modals) for detail views
// - FlyBy menu for block type selection in wizard

// Theme system: 11 themes, CSS variables, no hardcoded colors
// Use: var(--primary), var(--accent), var(--surface), etc.

// Icons: Lucide React exclusively (import { IconName } from 'lucide-react')

// State management: React Query (TanStack Query) for server state
// Pattern: useQuery + useMutation hooks in src/hooks/queries/

// Form handling: React Hook Form + Zod validation
// Pattern: useForm + zodResolver in form components

// Toast notifications: existing toast system (not alert/confirm dialogs)
```

### 5. API Route Pattern

```typescript
// Routes: src/routes/{entity}.routes.ts
// Controllers: src/controllers/{entity}Controller.ts
// Services: src/services/{entity}Service.ts
// Types: src/types/{entity}.ts
// Validators: src/validators/{entity}Validators.ts

// All routes use:
// - authenticateToken middleware
// - validateRequest middleware with Zod schemas
// - Consistent error response format: { success: false, error: { message, code } }
// - Consistent success format: { success: true, data: {...} }
```

### 6. Edge Function Pattern

```typescript
// Deno runtime, TypeScript
// Located in: contractnest-edge/supabase/functions/{function-name}/index.ts
// Use Supabase client from: @supabase/supabase-js
// CORS headers required on every response
// JWT verification for authenticated endpoints
```

### 7. Migration File Naming

```
contractnest-edge/supabase/migrations/
  contracts/
    001_initial_schema.sql
    002_contract_blocks.sql
    ...
    0XX_{descriptive_name}.sql   ← increment from highest existing number

// EVERY UP migration MUST have a corresponding DOWN migration:
    0XX_{descriptive_name}.sql        ← the actual migration
    0XX_{descriptive_name}_DOWN.sql   ← rollback script (kept in repo, never auto-applied)
```

---

## CODE QUALITY RULES

1. **TypeScript strict mode** — no `any` types, no `@ts-ignore`, no `as unknown as X` casts
2. **No console.log in production code** — use the existing logger service
3. **No inline styles** — use Tailwind classes or CSS variables from theme system
4. **No new dependencies** without asking — check if existing packages cover the need
5. **Indian locale context** — use ₹ (INR), Indian number formatting (1,50,000 not 150,000), Indian company/hospital names in seed data and examples
6. **Responsive** — all new UI must work on desktop AND tablet minimum
7. **Accessibility** — proper aria labels, keyboard navigation, focus management in wizards

---

## OUTPUT FORMAT

When you finish work, ALWAYS produce:

### 1. MANUAL_COPY_FILES/ folder
Place ALL created/modified files here with their relative paths preserved:
```
MANUAL_COPY_FILES/
├── contractnest-edge/
│   └── supabase/migrations/contracts/0XX_nomenclature.sql
│   └── supabase/migrations/contracts/0XX_nomenclature_DOWN.sql
├── contractnest-api/
│   └── src/types/nomenclature.ts
├── contractnest-ui/
│   └── src/components/contracts/NomenclaturePicker/index.tsx
│   └── src/components/contracts/NomenclaturePicker/NomenclatureCard.tsx
└── ClaudeDocumentation/
    └── p0-implementation-notes.md
```

### 2. COPY_INSTRUCTIONS.txt
Exact copy commands for PowerShell:
```
Copy-Item "MANUAL_COPY_FILES\contractnest-edge\supabase\migrations\contracts\0XX_nomenclature.sql" -Destination "contractnest-edge\supabase\migrations\contracts\" -Force
```

### 3. Changes Summary (the standard format from Charan's workflow document)

### 4. DOWN migration
For every SQL migration, provide the rollback SQL in a separate _DOWN.sql file.

### 5. Testing checklist
Specific things to verify before merging.

---

## WHAT NOT TO DO

1. **Don't refactor existing working code** unless explicitly asked. Adding nomenclature should not require rewriting the contract wizard. ADD to it, don't REWRITE it.

2. **Don't create standalone tables** when existing LOV/catalog patterns can hold the data. The nomenclature taxonomy goes in m_category_details, not in a new m_contract_nomenclature table.

3. **Don't mix phases.** If you're doing P0, don't create equipment tables "while we're at it." Each phase is a separate, testable, rollback-safe unit.

4. **Don't over-engineer.** Charan has a clear architecture. Follow it. A simple ALTER TABLE + INSERT is better than a complex migration framework. A simple card component is better than an abstract configurable widget system.

5. **Don't assume context from previous sessions.** Read the handover docs every time. Memory across sessions is not guaranteed.

6. **Don't create files outside the submodule directories.** Everything goes into contractnest-ui/, contractnest-api/, contractnest-edge/, or ClaudeDocumentation/. Nothing at the parent repo level except submodule references.

7. **Don't use Lorem Ipsum or generic placeholder data.** Use real Indian context: Apollo Hospital, Fortis Healthcare, Godrej Properties, Tata Motors, ₹1,50,000, Dr. Rajesh Kumar, MRI Scanner GE Signa HDxt.

8. **Don't add new npm dependencies without asking.** The project has specific package choices. Check if lucide-react, react-hook-form, @tanstack/react-query, zod, date-fns already cover what you need.

9. **Don't modify .env files or deployment configs.** Those are managed separately.

10. **Don't touch the theming system, auth system, or tenant management.** These are stable and outside scope.

---

## BEFORE YOU START CODING — CONFIRM THESE

Tell the user:

```
I've read the handover documents. Here's my understanding:

PHASE: [P0/P1/P2]
BRANCH: [feature/p0-nomenclature etc.]
WHAT I'LL CREATE:
  - [list new files]
WHAT I'LL MODIFY:
  - [list existing files with what changes]
WHAT I WON'T TOUCH:
  - [list explicitly]
MIGRATION:
  - UP: [filename]
  - DOWN: [filename]

Should I proceed?
```

Wait for confirmation before writing code.

---

## QUICK REFERENCE: EXISTING TABLE COUNTS

- 62+ tables across public schema
- 52+ frontend pages/routes
- 150+ API endpoints
- 40+ edge functions
- 11 theme variants
- Migration files numbered 001-030+ in contracts/ subfolder

Check the highest existing migration number before creating new ones:
```bash
ls contractnest-edge/supabase/migrations/contracts/ | sort | tail -5
```

---

## QUICK REFERENCE: KEY DIRECTORIES

```
contractnest-ui/src/
├── components/contracts/ContractWizard/   ← wizard orchestrator + steps
├── pages/contracts/                       ← contract CRUD pages
├── pages/settings/resources/              ← resource management (equipment goes here)
├── pages/catalog-studio/                  ← catalog studio UI
├── types/service-contracts/               ← contract type definitions
├── hooks/queries/                         ← React Query hooks
├── services/                              ← API service calls
├── utils/constants/                       ← constants, industry configs
└── utils/helpers/                         ← utility functions

contractnest-api/src/
├── routes/                                ← Express route definitions
├── controllers/                           ← Request handlers
├── services/                              ← Business logic
├── types/                                 ← TypeScript type definitions
├── validators/                            ← Zod validation schemas
└── middleware/                            ← Auth, rate limiting, etc.

contractnest-edge/supabase/
├── migrations/contracts/                  ← SQL migration files
├── functions/                             ← Deno edge functions
└── seed/                                  ← Seed data files
``` 