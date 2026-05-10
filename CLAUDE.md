# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

ContractNest is a multi-tenant B2B SaaS platform. This is a parent repository that manages 6 git submodules. All submodules must be initialized before any work begins:

```bash
git submodule update --init --recursive
git submodule status
```

| Submodule | Branch | Tech Stack |
|-----------|--------|------------|
| `contractnest-api` | `main` | Node.js, Express, TypeScript |
| `contractnest-ui` | `main` | React, TypeScript, Vite |
| `contractnest-edge` | `main` | Supabase Edge Functions + Migrations |
| `ClaudeDocumentation` | `master` ⚠️ | Markdown |
| `ContractNest-Mobile` | `main` | React Native |
| `FamilyKnows` | `main` | Expo (app/) + React/TypeScript (website/) |

The parent repo tracks on `master`. ClaudeDocumentation is `master` — not `main`.

---

## Dev Commands

```bash
# UI development
cd contractnest-ui && npm run dev

# API development
cd contractnest-api && npm run dev

# Check all submodule status at once
git submodule foreach 'echo "$(basename $(pwd)): $(git branch --show-current)"'
git submodule foreach 'git status'
```

PowerShell scripts in `scripts/` wrap common multi-repo operations:
- `.\scripts\sync-status.ps1` — status across all repos before any operation
- `.\scripts\pull-safe.ps1` — pull all repos safely (blocks on uncommitted changes)
- `.\scripts\push-feature.ps1 -Message "feat: ..."` — push while staying on feature branch
- `.\scripts\merge-feature.ps1` — merge feature branch to master after testing

---

## Mandatory Workflow

### Analysis first — no code without confirmation

1. Understand the requirement
2. Read relevant files with subagents (never rely on memory about file contents)
3. Propose approach: files to change, technical plan, risks
4. **Wait for explicit "proceed" / "go ahead"** before writing any code

### Two-phase delivery

**Phase 1** (after coding): Paste complete file contents directly in chat. Do NOT use `MANUAL_COPY_FILES/` — that approach does not work because submodule commits in the sandbox cannot reach GitHub remotes.

**Phase 2** (only after "tested, working"): Provide commit/push commands.

### Zero hallucination rule

**Never reference a column, table, function, RPC, component, prop, or file path unless you have verified it exists** by reading the actual code or schema. If unsure, say "I need to verify X" and use subagents to check. Hallucinated column names in SQL have caused production 502 errors.

---

## Architecture

### Request flow

```
UI (React/Vite) → API (Express/Node) → Supabase Edge Functions → Postgres
                                     ↗
                        (internal HMAC-signed calls with x-internal-key)
```

Edge functions receive an `x-tenant-id` header, validate `Authorization`, and optionally verify `x-internal-key` for API-to-Edge internal calls.

### Edge layer rules

Edge exists to **protect → route → emit events**. It must NOT loop, process data, or do N+1 queries.

```typescript
// CORRECT: one RPC call, database does all work
const { data, error } = await supabase.rpc('get_contacts_list', {
  p_tenant_id: tenantId,
  p_limit: Number(limit),
  p_offset: Number(offset)
});

// WRONG: loop in Edge — forbidden
for (const contact of contacts) {
  const details = await supabase.from('details').select(...).eq('id', contact.id);
}
```

AI and heavy processing must go through PGMQ (fire-and-forget), not the synchronous request path.

### Database patterns

All list/dashboard queries use `SECURITY DEFINER` functions to bypass RLS. RLS is a safety net for writes, not a performance tool for reads.

```sql
-- CORRECT: list function pattern
CREATE OR REPLACE FUNCTION get_contacts_list(p_tenant_id UUID, p_limit INT DEFAULT 50, p_offset INT DEFAULT 0)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ ... $$;

-- WRONG: joins or subqueries inside RLS policies
CREATE POLICY "bad" ON contacts FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));
```

RLS policies must use only simple column comparisons: `tenant_id = current_setting('app.tenant_id', true)::uuid`.

Writes use short transactions (one business outcome per transaction). Idempotency is enforced at the database layer using `t_idempotency_keys` with `ON CONFLICT DO NOTHING`.

### Database table naming conventions

| Prefix | Domain |
|--------|--------|
| `t_` | Tenant/transactional tables (e.g. `t_tenants`, `t_contacts`, `t_catalog_items`) |
| `m_` | Master data / reference tables (e.g. `m_products`, `m_catalog_industries`) |
| `n_` | Notification / JTD (Job-To-Do) tables (e.g. `n_jtd`, `n_jtd_channels`) |
| `c_` | Core catalog tables |

Key tables: `t_tenants`, `t_tenant_profiles`, `t_user_profiles`, `t_user_tenants`, `t_user_tenant_roles`, `t_contacts`, `t_catalog_items`, `t_catalog_resources`, `t_business_groups`, `t_group_memberships`, `t_chat_sessions`, `t_ai_agent_sessions`, `t_bm_tenant_subscription`, `n_jtd`, `n_jtd_channels`.

All migrations live in `supabase/migrations/`. Every SQL migration must use `IF EXISTS` / `IF NOT EXISTS`. Never drop data or columns without explicit instruction.

### API layer patterns

Inputs are validated with Zod DTOs. All responses follow `{ data, pagination }` (lists) or `{ data }` (single) shapes. Errors return `{ error: string, code?: string }`. Pagination always includes `limit`, `offset`, `total`, `has_more`.

---

## Production Code Checklist

Every code change must address where applicable:

| # | Requirement |
|---|-------------|
| 1 | **Transaction management** — DB operations in transactions, rollback on failure |
| 2 | **Race condition handling** — idempotency keys in DB, no application-level locks |
| 3 | **Error handling** — try/catch, user-friendly messages |
| 4 | **Toasts** — use existing toast components (ask if unsure which) |
| 5 | **Loaders** — use existing loader components (ask if unsure which) |
| 6 | **Pagination** — LIMIT + OFFSET on all list queries, never unbounded |
| 7 | **Single DB call per request** — joins in Postgres, not loops in Edge |

After each response, provide this self-check:

| Check | Status |
|-------|--------|
| Single DB call per request | ✅/❌/N/A |
| No loops in Edge | ✅/❌/N/A |
| Idempotency enforced at DB | ✅/❌/N/A |
| Transaction is short | ✅/❌/N/A |
| API-Edge HMAC signed (if internal) | ✅/❌/N/A |
| RLS bypassed for hot reads | ✅/❌/N/A |
| LIMIT + OFFSET pagination | ✅/❌/N/A |

---

## Architecture Reference Files

Detailed canonical patterns are in `scripts/reference/`:
- `patterns-edge.md` — Edge handlers, routing, event emission
- `patterns-api.md` — API contracts, validation, DTOs
- `patterns-db.md` — RPC functions, queries, joins, SECURITY DEFINER
- `patterns-rls.md` — RLS policies, bypass patterns, tenant context
- `patterns-scale.md` — Caching, connection pooling, 600-user support
- `patterns-correctness.md` — Race conditions, idempotency, transactions, API-Edge signing

Read the relevant pattern file before implementing anything in that layer.

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

Submodule commit order: submodules first (each on their own `main` or `master`), then update parent repo references on `master`.

---

## Key Constraints (Non-Negotiable)

- **No unsolicited refactoring** — change only what is needed to solve the stated problem
- **No new DB objects** (tables, columns, RPCs, triggers) without explicit approval
- **No new libraries or packages** without explicit approval
- **No renaming** of files, variables, functions, or components unless asked
- **Ask when unclear** — never fill gaps with assumptions about column names, function signatures, or UI behavior
- `LESSONS_LEARNED.md` in `scripts/` tracks past mistakes — read it at session start and append new lessons after any bug or wrong assumption
