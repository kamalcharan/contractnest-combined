# SmartProfile — Technical Write-up & Port Guide

> Route: `/settings/business-profile/smart-profile`
> Source of truth: code read at `contractnest-ui@30656d9`, `contractnest-api@8e482f5`, `contractnest-edge@ebd5fd7`, plus live DB inspection (2026-07-27).
> Purpose: document what SmartProfile actually is, so it can be re-implemented in another product.

---

## 1. What it is

SmartProfile turns a tenant's free-text business description into **machine-matchable structure**:

| Artifact | Meaning | Stored in |
|---|---|---|
| `short_description` | what the human typed (or was built from their Business Profile) | `t_tenant_smartprofiles.short_description` |
| `ai_enhanced_description` | LLM-expanded marketing-grade prose | `.ai_enhanced_description` |
| `suggested_keywords` / `approved_keywords` | AI-proposed vs human-accepted tags | `._keywords` (text[]) |
| **semantic clusters** | `primary_term` + `related_terms[]` + `category` + `confidence_score` | `t_semantic_clusters` |
| **embedding** | pgvector embedding for similarity search | `.embedding`, `t_semantic_clusters.cluster_embedding` |

The point is **discovery**: a buyer searches "AC not cooling in my office" and the system matches HVAC providers semantically rather than by keyword. Clusters are the human-auditable layer; embeddings are the machine layer.

There are **two parallel instances** of the same machinery:
- **membership-scoped** (`membership_id`) — for BBB/group directory member profiles
- **tenant-scoped** (`tenant_id`) — this page, the tenant's own profile

They share hook factories and edge handlers. Note `t_semantic_clusters` carries **both** `membership_id` and `tenant_id` columns — a single table serving both scopes.

---

## 2. Current state — read this before porting

| Capability | Status |
|---|---|
| Save / load profile | ✅ real (Postgres upsert) |
| Save / load clusters | ✅ real |
| **AI enhance description** | ❌ **STUB** — returns a hardcoded sentence |
| **Website scrape** | ❌ **STUB** — returns mock data |
| **Cluster generation** | ❌ **STUB** — string-concatenates keywords (`X`, `X services`, `X solutions`, `X provider`) with `confidence_score = 0.85 + Math.random()*0.1` |
| Embedding generation (`/smartprofiles/generate` → n8n) | ⚠️ wired but **orphaned** — the UI page never calls it |
| Semantic search (`/smartprofiles/search` → n8n) | ⚠️ wired, not called from this page |

**Live DB evidence (2026-07-27):**
```
t_tenant_smartprofiles : 4 rows,  0 with embedding,  3 with ai_enhanced_description
t_semantic_clusters    : 45 rows, 0 with cluster_embedding, 15 tenant-scoped
extensions             : vector ✅, pg_trgm ✅   (pgvector IS installed)
```

So: **the UI is complete, the persistence is complete, the intelligence is not.** The 3 `ai_enhanced_description` rows and 45 clusters are stub output, not model output. Zero embeddings have ever been generated — meaning the semantic-search promise is currently unfulfilled end-to-end.

If you port this, you are porting **a working UX shell plus a data model**, and you must supply the AI yourself. That is the honest scope.

---

## 3. Architecture

```
UI page (smart-profile.tsx, 1135 lines)
  └─ hooks/queries/useGroupQueries.ts        ← TanStack Query; shared factories
       └─ services/groupsService.ts          ← axios wrapper
            └─ API  /api/smartprofiles/*     ← contractnest-api (groupsRoutes → groupsController → groupsService)
                 └─ EDGE  supabase/functions/groups/index.ts
                      ├─ Postgres (t_tenant_smartprofiles, t_semantic_clusters)
                      └─ n8n webhooks (generate / search only)
```

Four layers before the database. When porting, collapse this — the API tier is a pass-through proxy that adds auth-header forwarding and Sentry capture, nothing domain-specific.

### Endpoints

| Method | Path | Backing | Real? |
|---|---|---|---|
| GET | `/api/smartprofiles/:tenantId` | edge → PG select | ✅ |
| POST | `/api/smartprofiles` | edge → PG upsert | ✅ |
| POST | `/api/smartprofiles/enhance` | edge stub | ❌ |
| POST | `/api/smartprofiles/scrape-website` | edge stub | ❌ |
| POST | `/api/smartprofiles/generate-clusters` | edge stub | ❌ |
| POST | `/api/smartprofiles/clusters` | edge → PG delete-then-insert | ✅ |
| GET | `/api/smartprofiles/clusters/:tenantId` | edge → PG select | ⚠️ see §6 |
| POST | `/api/smartprofiles/generate` | **n8n** `smartprofile-generate` | wired, unused by page |
| POST | `/api/smartprofiles/search` | **n8n** `smartprofile-search` | wired, unused by page |

### n8n wiring (already in the codebase)

```ts
const n8nWebhookUrl  = Deno.env.get('N8N_WEBHOOK_URL') || 'https://n8n.srv1096269.hstgr.cloud';
const webhookPrefix  = req.headers.get('x-environment') === 'live' ? '/webhook' : '/webhook-test';
const url            = `${n8nWebhookUrl}${webhookPrefix}/smartprofile-generate`;
```

Two things to note for a port:
1. **Environment routing is by header**, `live` → `/webhook`, anything else → `/webhook-test`. Clean pattern; keep it.
2. **The webhook call is unauthenticated** — no shared secret, no HMAC. Anyone who learns the URL can write embeddings for any `tenant_id`. Fix this in a port (see §7).

---

## 4. Data model (port this as-is; it's the good part)

```sql
CREATE TABLE t_tenant_smartprofiles (
  tenant_id               uuid PRIMARY KEY,
  short_description       text,
  ai_enhanced_description text,
  suggested_keywords      text[],
  approved_keywords       text[],
  profile_type            text,          -- 'seller' | 'buyer'
  website_url             text,
  generation_method       text,          -- 'manual' | 'website'
  embedding               vector,        -- pgvector
  status                  text,
  is_active               boolean,
  enhancement_source      text,
  last_enhanced_at        timestamptz,
  last_embedding_at       timestamptz,
  created_at              timestamptz,
  updated_at              timestamptz
);

CREATE TABLE t_semantic_clusters (
  id                uuid PRIMARY KEY,
  tenant_id         uuid,               -- tenant scope
  membership_id     uuid,               -- group/directory scope
  primary_term      varchar NOT NULL,
  related_terms     text[] NOT NULL,
  category          varchar,
  confidence_score  float8,
  cluster_embedding vector,
  is_active         boolean,
  created_at        timestamptz
);
```

**Design notes worth keeping:**
- `suggested_` vs `approved_` keywords is a genuinely good pattern — AI proposes, human ratifies, and you can measure acceptance rate as a model-quality signal.
- `generation_method` records provenance (typed vs scraped).
- Clusters are stored **delete-then-insert** per tenant (not diffed). Simple and idempotent; fine at this scale, but it's a full rewrite on every save — see §7.

**Dimension warning:** the `vector` columns are declared without an explicit dimension in the live schema. Pin a dimension in a port (e.g. `vector(1536)` for OpenAI `text-embedding-3-small`, `vector(1024)` for Voyage) and add an index:
```sql
CREATE INDEX ON t_tenant_smartprofiles USING hnsw (embedding vector_cosine_ops);
```
Without an index, similarity search is a sequential scan.

---

## 5. UI flow (the part actually worth copying)

`smart-profile.tsx` is a **65:35 split view** with a 4-step wizard:

```
entry → enhanced → clusters → success
```

1. **entry** — choose `manual` (type a description) or `website` (paste URL). Pre-fills from the existing Business Profile.
2. **enhanced** — shows AI-expanded description + suggested keywords; user edits/approves.
3. **clusters** — generated clusters shown as expandable cards; each editable inline (primary term, related terms as chips, category from a 12-value list, confidence). Add/delete supported.
4. **success** — confirmation.

State is local (`useState`) with `hasClusterChanges` guarding unsaved work. Uses `vaniToast` + `VaNiLoader` (existing components — do not invent new ones).

**This is the highest-value thing to port.** The "AI proposes → human curates in an inline-editable card list → explicit save" pattern is a solid, reusable design for any AI-generated-structure feature. The intelligence behind it is swappable; the interaction model is what took the design work.

---

## 6. Bugs / gotchas found while reading

1. **Cluster-fetch path mismatch.** The UI builds `` `${SMARTPROFILES.GET(tenantId)}/clusters` `` → `/api/smartprofiles/{id}/clusters`, but the API registers `/smartprofiles/clusters/:tenantId`. These don't match; the GET-clusters call resolves to no route. The page happens to work because clusters come back embedded in the main profile GET — but the standalone `useSmartProfileClusters` hook is broken. **Don't copy this.**
2. **Route-ordering hazard:** `/smartprofiles/:tenantId` is registered before `/smartprofiles/clusters/:tenantId`, so `:tenantId` can swallow the literal `clusters` segment. Order literal routes before parameterised ones.
3. **Stub `confidence_score` uses `Math.random()`** — cosmetic realism. Any downstream logic that thresholds on confidence is thresholding on noise today.
4. **`t_semantic_clusters` has both `tenant_id` and `membership_id` nullable** with no CHECK enforcing exactly one. A row can have neither (orphan) or both (ambiguous). Add `CHECK (num_nonnulls(tenant_id, membership_id) = 1)` in a port.
5. **Embeddings never populated** — so `/smartprofiles/search` would return nothing useful even if called.

---

## 7. Port checklist

**Take:**
- The two-table data model (§4), with the fixes noted
- The 4-step wizard UX and the suggest/approve keyword split (§5)
- The environment-routed webhook pattern (`live` → `/webhook`, else `/webhook-test`)

**Fix on the way over:**
- Collapse UI → service → API → edge into **UI → service → one backend function**. The API tier adds no domain logic.
- Pin vector dimensions + add an HNSW index
- Add the `num_nonnulls` CHECK on cluster scope
- Fix the clusters route mismatch; order literal routes first
- **Authenticate the n8n webhook** — shared secret header or HMAC over the body, plus verify `tenant_id` against the caller's JWT. Currently the endpoint trusts a `tenant_id` in the request body over an unauthenticated channel.
- Consider diffing clusters on save instead of delete-then-insert, if you expect concurrent editors

**Build (does not exist today):**
- Real description enhancement
- Real website scraping + extraction
- Real cluster generation
- Real embedding generation + a search path that uses it

---

## 8. The three AI jobs to implement

| Job | Input | Output | Notes |
|---|---|---|---|
| **Enhance** | `short_description` | `ai_enhanced_description`, `suggested_keywords[]` | One LLM call. Constrain output length; return keywords as a JSON array, not prose. |
| **Scrape** | `website_url` | same shape as Enhance + `scraped_data` | Fetch → strip HTML → truncate → same enhance prompt. Needs timeout, redirect cap, size cap, and SSRF protection (block private IP ranges). |
| **Cluster + embed** | `profile_text`, `keywords[]` | `clusters[]` with `primary_term`/`related_terms[]`/`category`/`confidence_score`, plus `embedding` | Force structured JSON output. Category must come from a fixed enum (the 12 values in the UI) or the UI dropdown breaks. Embed the profile and each cluster. |

For the ContractNest stack specifically, the natural landing spot is **inside the existing edge function** (replace the three stub blocks) or **as n8n workflows behind the already-wired webhook pattern** — the choice is yours; the contracts are already defined either way.

---

## 9. On the n8n question

n8n is **already the intended AI backend** here — `/smartprofiles/generate` and `/smartprofiles/search` both call it, and the webhook naming (`smartprofile-generate`, `smartprofile-search`) is fixed in code. What's missing is (a) the workflows themselves and (b) any call from the SmartProfile page into `/generate`.

Two viable shapes:

**A. n8n does the AI** (matches existing wiring): edge posts `{tenant_id, short_description, keywords, profile_type}` → n8n runs LLM + embedding nodes → writes `embedding` and clusters directly to Postgres → returns `{embedding_generated, clusters_count}`. Least code change; keeps prompts editable without a deploy. Downside: business logic lives outside the repo and isn't version-controlled with it.

**B. Edge does the AI**: replace the three stubs with direct model calls. Everything version-controlled, one less hop, easier to test. Downside: prompt changes need an edge deploy.

I'd default to **B for enhance/scrape/cluster** (they're request-response and latency-sensitive) and **A for bulk/backfill embedding jobs** (batch, retry-friendly, no user waiting).

---

**Ask:** I can write the n8n workflow JSON for the `smartprofile-generate` and `smartprofile-search` webhooks (matching the exact payloads the edge function already sends), or implement the three stubs directly in the edge function — say which and I'll build it.
