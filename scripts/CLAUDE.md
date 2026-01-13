# ContractNest - Claude Developer Rules

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

## ✅ PRODUCTION CHECKLIST (Every Code Response)
- [ ] Transaction management (for writes)
- [ ] Error handling + try/catch
- [ ] Toasts (use existing component - ASK if unsure)
- [ ] Loaders (use existing component - ASK if unsure)
- [ ] No loops in Edge
- [ ] Single DB call per request
- [ ] LIMIT + OFFSET on all list queries
- [ ] RLS bypassed for hot reads

---

## 📁 OUTPUT STRUCTURE (MANDATORY)
```
MANUAL_COPY_FILES/
└── feature-name/
    ├── contractnest-api/[exact repo path]
    ├── contractnest-ui/[exact repo path]
    ├── contractnest-edge/[exact repo path]
    └── COPY_INSTRUCTIONS.txt  ← REQUIRED
```

---

## 📂 PROJECT STRUCTURE
```
D:\projects\core projects\ContractNest\contractnest-combined\
├── contractnest-api/      # Backend (main branch)
├── contractnest-ui/       # Frontend (main branch)
├── contractnest-edge/     # Edge Functions (main branch)
├── ClaudeDocumentation/   # Docs (master branch)
├── ContractNest-Mobile/   # Mobile (main branch)
├── FamilyKnows/           # Separate Product (main branch)
└── MANUAL_COPY_FILES/     # Claude's output folder
```

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
