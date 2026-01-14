# ContractNest - Claude Developer Rules

> **CRITICAL**: Read this entire file at the start of every session.

---

## 🚨 SESSION INITIALIZATION (EVERY SESSION)

**Run these commands at the START of every session:**
```bash
cd "D:\projects\core projects\ContractNest\contractnest-combined"
git submodule update --init --recursive
git submodule status
```

**Expected output:**
```
 [hash] contractnest-api (heads/main)
 [hash] contractnest-ui (heads/main)
 [hash] contractnest-edge (heads/main)
 [hash] ClaudeDocumentation (heads/master)  ← Note: master, not main
 [hash] ContractNest-Mobile (heads/main)
 [hash] FamilyKnows (heads/main)
```

---

## ⛔ OUTPUT METHOD (I CANNOT USE GIT)
```
MANUAL_COPY_FILES/[feature-name]/[submodule]/[path]
```
❌ `git commit` / `git push` = WILL FAIL (Auth blocked)
✅ Create files in MANUAL_COPY_FILES/ = CORRECT

---

## ⛔ WORKFLOW (NO EXCEPTIONS)
1. Analyze → Propose → **WAIT for "proceed"**
2. Code → Phase 1 (copy commands) → **WAIT for "tested, working"**
3. Only then → Phase 2 (merge commands)

❌ NEVER provide merge/commit commands in Phase 1
❌ NEVER start coding without explicit "proceed" confirmation
❌ NEVER refactor existing code unless explicitly asked

---

## 📂 PROJECT STRUCTURE & SUBMODULES

```
D:\projects\core projects\ContractNest\contractnest-combined\
├── contractnest-api/      # Backend API (Node.js/Express) - branch: main
├── contractnest-ui/       # Frontend (React/TypeScript/Vite) - branch: main
├── contractnest-edge/     # Edge Functions (Supabase) - branch: main
├── ClaudeDocumentation/   # Documentation - branch: master ⚠️
├── ContractNest-Mobile/   # Mobile (React Native) - branch: main
├── FamilyKnows/           # Separate Product - branch: main
│   ├── app/               # Expo mobile app
│   └── website/           # React website
└── MANUAL_COPY_FILES/     # Claude's output folder
```

| Submodule | Branch | Tech Stack |
|-----------|--------|------------|
| contractnest-api | `main` | Node.js, Express, TypeScript |
| contractnest-ui | `main` | React, TypeScript, Vite |
| contractnest-edge | `main` | Supabase Edge Functions |
| ClaudeDocumentation | `master` ⚠️ | Markdown |
| ContractNest-Mobile | `main` | React Native |
| FamilyKnows | `main` | Expo + React |

---

## 📁 OUTPUT STRUCTURE (MANDATORY)

```
MANUAL_COPY_FILES/
└── [feature-name]/
    ├── contractnest-api/
    │   └── [files mirroring exact repo structure]
    ├── contractnest-ui/
    │   └── [files mirroring exact repo structure]
    ├── contractnest-edge/
    │   └── [files mirroring exact repo structure]
    ├── ClaudeDocumentation/
    ├── ContractNest-Mobile/
    ├── FamilyKnows/
    │   ├── app/
    │   └── website/
    └── COPY_INSTRUCTIONS.txt  ← REQUIRED
```

❌ NEVER place files randomly in MANUAL_COPY_FILES/ root
❌ NEVER mix files from different features
✅ ALWAYS create feature folder first
✅ ALWAYS mirror exact submodule structure

---

## ⛔ ARCHITECTURE CONSTRAINTS

| ❌ NEVER | ✅ ALWAYS |
|----------|-----------|
| Loops in Edge (`for...await`) | Single DB call via RPC |
| N+1 queries | Joins in Postgres |
| AI on sync path | AI via PGMQ async |
| RLS on hot read paths | SECURITY DEFINER + explicit tenant_id |
| Unbounded queries | LIMIT + OFFSET everywhere |
| Direct git commands | MANUAL_COPY_FILES/ structure |
| RLS with joins/subqueries | Simple RLS or bypass entirely |
| Business logic in Edge | Business logic in DB functions |

---

## ⛔ RLS RULES (CRITICAL FOR SCALE)

- RLS = Safety net, NOT performance tool
- Hot reads (lists, dashboards) → Bypass RLS with SECURITY DEFINER
- Writes → RLS is acceptable
- ❌ NEVER: joins inside RLS policies
- ❌ NEVER: subqueries inside RLS policies
- ❌ NEVER: `auth.uid()` chains in RLS

---

## 📖 BEFORE CODING: ASK ME WHICH PATTERN TO READ

Available patterns in `reference/` folder:
- `patterns-edge.md` - Edge handlers, routing, events
- `patterns-api.md` - API contracts, validation, DTOs
- `patterns-db.md` - RPC functions, queries, joins
- `patterns-rls.md` - RLS policies, bypass patterns
- `patterns-scale.md` - Caching, pooling, indexes, 600-user support
- `patterns-correctness.md` - Race conditions, idempotency, transactions, API-Edge signing
- `git-commands.md` - Phase 2 merge scripts

**⏸️ STOP and ask:** "Which pattern file should I read for this task?"
Then read it with: `cat reference/[filename].md`

---

## ✅ MANDATORY: Confirmation Checklist (EVERY RESPONSE)

After **every code or analysis response**, I MUST provide this checklist:

```
═══════════════════════════════════════════════════
✅ PRODUCTION CORRECTNESS CONFIRMATION
═══════════════════════════════════════════════════
| Check | Status | Notes |
|-------|--------|-------|
| Single DB call per request | ✅/❌/N/A | |
| No loops in Edge | ✅/❌/N/A | |
| Idempotency key enforced | ✅/❌/N/A | |
| Race conditions handled by DB | ✅/❌/N/A | |
| Transaction is SHORT | ✅/❌/N/A | |
| API-Edge HMAC signed | ✅/❌/N/A | |
| RLS bypassed for hot reads | ✅/❌/N/A | |
| LIMIT + OFFSET pagination | ✅/❌/N/A | |
| AI/heavy work via PGMQ | ✅/❌/N/A | |
| Events versioned (.v1) | ✅/❌/N/A | |
| Error handling + try/catch | ✅/❌/N/A | |
| Toasts/Loaders (existing) | ✅/❌/N/A | |
| trace_id for observability | ✅/❌/N/A | |
| Output in MANUAL_COPY_FILES/ | ✅/❌/N/A | |
═══════════════════════════════════════════════════
```

**I MUST NOT skip this checklist.** If any item is ❌, I must explain why or fix it.
