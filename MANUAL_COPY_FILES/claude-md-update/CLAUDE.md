# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Session Initialization (Every Session)

```bash
git submodule update --init --recursive
git submodule status
```

Expected: all 6 submodules show a commit hash. If any is empty, run with `--force`.

Also read at session start:
- `scripts/LESSONS_LEARNED.md` — past mistakes and hard-won patterns
- `ClaudeDocumentation/onboarding/GAP_ANALYSIS.md` — current active work state and handover context

---

## Project Overview

ContractNest is a multi-tenant B2B SaaS platform. This parent repo manages 6 git submodules:

| Submodule | Branch | Tech Stack |
|-----------|--------|------------|
| `contractnest-api` | `main` | Node.js 18, Express 4, TypeScript |
| `contractnest-ui` | `main` | React 19, Vite 6, TypeScript |
| `contractnest-edge` | `main` | Supabase Edge Functions (Deno), Migrations |
| `ClaudeDocumentation` | `master` ⚠️ | Markdown docs, agent skills |
| `ContractNest-Mobile` | `main` | React Native, Expo |
| `FamilyKnows` | `main` | Expo (app/) + React/TypeScript website |

The parent repo tracks on `master`. ClaudeDocumentation uses `master` — not `main`.

**Dual-product architecture**: A single API backend (`contractnest-api`) serves both ContractNest and FamilyKnows via product context. Environment variables are unprefixed for ContractNest and `FK_`-prefixed for FamilyKnows.

---

## Dev Commands

```bash
# UI
cd contractnest-ui && npm run dev

# API
cd contractnest-api && npm run dev

# Submodule status
git submodule foreach 'echo "$(basename $(pwd)): $(git branch --show-current)"'
git submodule foreach 'git status'
```

PowerShell scripts in `scripts/`:
- `.\scripts\sync-status.ps1` — check status across all repos
- `.\scripts\pull-safe.ps1` — pull all repos safely
- `.\scripts\push-feature.ps1 -Message "feat: ..."` — push on feature branch
- `.\scripts\merge-feature.ps1` — merge feature to master after testing

---

## Mandatory Workflow

### 1. Analysis first — no code without confirmation

1. Read the relevant files using subagents (never rely on memory)
2. Propose: which files change, why, what risks
3. **Wait for explicit "proceed" / "go ahead"** before writing any code

### 2. File delivery — MANUAL_COPY_FILES only

Claude **cannot push to GitHub**. All output goes to `MANUAL_COPY_FILES/[feature-name]/`:
- Mirror the exact submodule structure inside the feature folder
- Include `COPY_INSTRUCTIONS.txt` with exact destination paths
- User copies, tests, then commits and pushes manually

**Never** paste files in chat as the delivery method. **Never** attempt `git push`.

### 3. Two-phase output

**Phase 1** — deliver files in `MANUAL_COPY_FILES/` with the standard output format (below). No commit commands.

**Phase 2** — provide commit/push commands **only after user confirms "tested, working"**.

### 4. Zero hallucination

Never reference a column, table, function, RPC, component, prop, or file path unless verified by reading the actual code. Hallucinated column names in SQL have caused production 502 errors.

---

## Standard Output Format

Use this exact format after every code delivery:

```
═══════════════════════════════════════════════════
📦 CHANGES SUMMARY
═══════════════════════════════════════════════════
Branch: [branch-name]
Files Changed:
  - [submodule]/[path/to/file] — [purpose]
Submodules Affected: [contractnest-ui | contractnest-api | contractnest-edge | ContractNest-Mobile]

═══════════════════════════════════════════════════
💻 STEP-BY-STEP COMMANDS (Windows PowerShell)
═══════════════════════════════════════════════════

STEP 1: Pull the Feature Branch
─────────────────────────────────
cd "D:\projects\core projects\ContractNest\contractnest-combined"
git fetch origin
git checkout [branch-name]
git pull origin [branch-name]

STEP 2: Verify Files Received
─────────────────────────────────
ls MANUAL_COPY_FILES
type MANUAL_COPY_FILES\COPY_INSTRUCTIONS.txt

STEP 3: Copy All Files (PowerShell)
─────────────────────────────────
[Exact Copy-Item commands for each file]
Copy-Item "MANUAL_COPY_FILES\[feature]\[file]" -Destination "[exact-submodule-path]" -Force

Write-Host "✅ All files copied!" -ForegroundColor Green

═══════════════════════════════════════════════════
🧪 TESTING CHECKLIST
═══════════════════════════════════════════════════
- [ ] [Specific test 1]
- [ ] [Specific test 2]
- [ ] [Specific test 3]

═══════════════════════════════════════════════════
⏸️ WAITING FOR CONFIRMATION
═══════════════════════════════════════════════════
Test locally and confirm:
  → "Tested, working — proceed with Phase 2"
  → "Issue found: [describe problem]"
═══════════════════════════════════════════════════
```

---

## Architecture

### Request flow

```
contractnest-ui (React/Vite)
        ↓
contractnest-api (Express/Node) — validates JWT, sets tenant context
        ↓  (HMAC-signed x-internal-key)
contractnest-edge (Supabase Edge Functions)
        ↓
Postgres (RPC functions → SECURITY DEFINER)
        ↓ (fire-and-forget)
      PGMQ → Workers → AI / Email / Webhooks
```

Edge functions receive `x-tenant-id` + `Authorization` headers. Internal API→Edge calls must include an HMAC-signed `x-internal-key`. See `scripts/reference/patterns-correctness.md` for the full signing pattern.

### Tech stack detail

| Layer | Key Libraries |
|-------|--------------|
| API | Express, Zod (validation), jsonwebtoken, Firebase Admin, ioredis, Sentry, Multer |
| UI Web | React 19, TanStack Query v5, Zustand, Radix UI, React Hook Form + Zod, Tailwind CSS, Framer Motion, TipTap, ReactFlow |
| UI Auth | Firebase + Supabase client (both in play) |
| Toast | `VaNiToast` — custom component; do NOT use react-hot-toast directly |
| Migrations | Supabase CLI, PL/pgSQL, Deno edge functions |
| Mobile | Expo, React Navigation, Redux Toolkit, i18next |

### Key feature domains (API + UI)

| Domain | API routes/controllers | UI pages/components |
|--------|----------------------|-------------------|
| Contracts | `contractRoutes`, `contractController` | `pages/contracts/` |
| Catalog Studio | `catalogStudioRoutes`, `blockRoutes` | `pages/catalog-studio/`, `components/catalog-studio/` |
| Service Catalog | `serviceCatalogRoutes` | `pages/catalog/` |
| Knowledge Tree (KT) | `knowledgeTreeGeneratorService` | `pages/` (KT detail views) |
| Contacts / Groups | `contactRoutes`, `groupsController` | `pages/contacts/` |
| VaNi Automation | `vani/` subsystem | `src/vani/` (pages + components) |
| Onboarding | `onboardingTypes`, `onboarding.service` | `pages/onboarding/` (8-step wizard) |
| Settings | 15 sub-routes | `pages/settings/` |
| Business Model | `t_bm_*` tables | `components/subscription/` |
| Storage | `storageRoutes`, Firebase | `pages/settings/storage/` |
| Admin | `admin-tenant-management/` edge fn | `pages/admin/` |

### Edge functions (52 total)

Located in `contractnest-edge/supabase/functions/`. Key ones:
`auth`, `tenants`, `contacts`, `groups`, `contracts`, `contract-events`, `service-catalog`, `catalog-studio`, `knowledge-tree`, `catalog`, `payment-gateway`, `payment-webhook`, `smart-forms`, `jtd-worker`, `admin-tenant-management`, `FKauth`, `FKonboarding` (FamilyKnows proxies).

Shared middleware in `functions/_shared/`.

---

## Database Patterns

### Table naming

| Prefix | Domain |
|--------|--------|
| `t_` | Tenant/transactional: `t_tenants`, `t_contacts`, `t_contracts`, `t_catalog_items`, `t_catalog_resources`, `t_business_groups`, `t_group_memberships`, `t_chat_sessions`, `t_ai_agent_sessions`, `t_bm_tenant_subscription`, `t_idempotency_keys` |
| `m_` | Master/reference data: `m_products`, `m_catalog_industries`, `m_catalog_categories`, `m_equipment_variants`, `m_equipment_spare_parts`, `m_equipment_checkpoints`, `m_service_cycles` |
| `n_` | Notifications / JTD: `n_jtd`, `n_jtd_channels`, `n_jtd_templates` |
| `c_` | Catalog core: `cat_blocks` (Catalog Studio blocks) |

### Core rules

- All list/dashboard reads use `SECURITY DEFINER` RPC functions — never RLS on hot paths
- RLS policies use only `tenant_id = current_setting('app.tenant_id', true)::uuid` — no joins, no subqueries inside policies
- Every write uses a short transaction (one business outcome)
- Idempotency enforced at DB layer via `t_idempotency_keys` with `ON CONFLICT DO NOTHING`
- All list queries: `LIMIT` + `OFFSET` mandatory, never unbounded
- All migrations in `contractnest-edge/supabase/migrations/` must use `IF EXISTS` / `IF NOT EXISTS`
- Never drop data or columns without explicit instruction

### KT-specific tables (active work area)

| Table | Purpose |
|-------|---------|
| `m_equipment_variants` | Equipment/facility variants (models, capacities) |
| `m_equipment_spare_parts` | Spare parts + pricing (min/median/max) |
| `m_service_cycles` | Service frequencies + `catalog_name` |
| `m_equipment_checkpoints` | Inspection checkpoints + `service_name` |
| `cat_blocks` | Catalog Studio blocks — `resource_template_id` + `kt_checkpoint_ids` being added in Phase 2 |

---

## Active Work State

**Phase 1 (KT agent-readiness) is COMPLETE** — `service_name`, `catalog_name`, pricing columns on KT tables are live; UI buttons working.

**Phase 2 is next** — Catalog Studio KT Linkage. Tasks in order:

| # | Task | Status |
|---|------|--------|
| 8 | DB migration: add `resource_template_id UUID`, `kt_checkpoint_ids UUID[]` to `cat_blocks` | ⏳ Next |
| 9 | Catalog Studio: variant step populated from KT | ⏳ Pending |
| 10 | Bulk block creation API (`POST /cat-blocks/bulk`) | ⏳ Pending |
| 11 | Global → tenant block copy (`POST /cat-blocks/copy-to-tenant`) | ⏳ Pending |

Output folder for this work: `MANUAL_COPY_FILES/kt-catalog-integration/`

---

## Production Code Checklist

After every code response, include this self-check:

| Check | Status |
|-------|--------|
| Single DB call per request | ✅/❌/N/A |
| No loops in Edge | ✅/❌/N/A |
| Idempotency enforced at DB | ✅/❌/N/A |
| Transaction is short | ✅/❌/N/A |
| API→Edge HMAC signed | ✅/❌/N/A |
| RLS bypassed for hot reads (SECURITY DEFINER) | ✅/❌/N/A |
| LIMIT + OFFSET pagination | ✅/❌/N/A |
| AI/heavy work via PGMQ (not sync path) | ✅/❌/N/A |
| Toasts use VaNiToast | ✅/❌/N/A |
| IF EXISTS / IF NOT EXISTS in migrations | ✅/❌/N/A |

---

## Pattern Reference Files

Read the relevant file **before** implementing in that layer:

| File | When to read |
|------|-------------|
| `scripts/reference/patterns-edge.md` | Any Edge function change |
| `scripts/reference/patterns-api.md` | Any API route/controller/DTO change |
| `scripts/reference/patterns-db.md` | Any RPC function or migration |
| `scripts/reference/patterns-rls.md` | Any RLS policy change |
| `scripts/reference/patterns-scale.md` | Caching, connection pooling, indexes |
| `scripts/reference/patterns-correctness.md` | Idempotency, transactions, HMAC signing |
| `ClaudeDocumentation/AgentSkills/` | KT generation skill prompts |

---

## Commit Conventions

```
feat:     New feature
fix:      Bug fix
docs:     Documentation only
style:    Formatting, no logic change
refactor: Code restructure, no feature change
test:     Adding/updating tests
chore:    Maintenance, dependencies
```

Commit order: submodules first (each on their own branch), then update parent repo references on `master`.

---

## Non-Negotiable Constraints

- **No unsolicited refactoring** — change only what is needed
- **No new DB objects** (tables, columns, RPCs, triggers) without explicit approval
- **No new libraries or packages** without explicit approval
- **No renaming** of files, variables, functions, or components unless asked
- **Ask when unclear** — never fill gaps with assumptions
- Append new lessons to `scripts/LESSONS_LEARNED.md` after any bug, wrong assumption, or new pattern discovered
