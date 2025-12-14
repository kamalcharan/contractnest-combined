# Semantic Search - N8N Developer Handover

**Date:** December 14, 2025
**For:** N8N Workflow Developer
**Feature:** AI-powered semantic search for ContractNest

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Tables](#2-database-tables)
3. [How Vector Search Works](#3-how-vector-search-works)
4. [Available RPC Functions](#4-available-rpc-functions)
5. [Embedding Generation](#5-embedding-generation)
6. [N8N Workflow Implementation](#6-n8n-workflow-implementation)
7. [Code Examples](#7-code-examples)
8. [Caching Strategy](#8-caching-strategy)
9. [Semantic Clusters (Boost)](#9-semantic-clusters-boost)
10. [Testing Queries](#10-testing-queries)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         SEMANTIC SEARCH PIPELINE                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   User Query        OpenAI API           Supabase DB         Response    │
│   ───────────►     ───────────►         ───────────►        ───────────► │
│                                                                          │
│   "panchakarma"    text-embedding-      vector_search()     Top 10       │
│                    3-small              cosine similarity   matches      │
│                    ↓                                                     │
│                    [0.12, -0.34, ...]   embedding <=> query  ranked by   │
│                    (1536 dimensions)                         similarity  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key Concepts

| Term | Description |
|------|-------------|
| **Embedding** | A 1536-dimensional vector representing text meaning |
| **Cosine Similarity** | Measure of angle between vectors (1 = identical, 0 = unrelated) |
| **pgvector** | PostgreSQL extension for vector operations |
| **IVFFlat Index** | Approximate nearest neighbor index for fast search |

---

## 2. Database Tables

### 2.1 `t_group_memberships` (Group-scoped profiles)

```sql
-- Key columns for search
id UUID PRIMARY KEY,
tenant_id UUID,                    -- Links to t_tenant_profiles
group_id UUID,                     -- Which group this membership belongs to
status VARCHAR,                    -- 'active', 'pending', etc.
is_active BOOLEAN,
profile_data JSONB,                -- Contains short_description, ai_enhanced_description, keywords
embedding vector(1536),            -- THE SEARCH VECTOR
```

### 2.2 `t_tenant_smartprofiles` (Tenant-level profiles)

```sql
tenant_id UUID PRIMARY KEY,        -- One smartprofile per tenant
short_description TEXT,            -- Original description
ai_enhanced_description TEXT,      -- AI-improved version
approved_keywords TEXT[],          -- Search keywords
profile_type TEXT,                 -- 'buyer', 'seller', 'both'
embedding vector(1536),            -- THE SEARCH VECTOR
status TEXT,                       -- 'active', 'draft', etc.
```

### 2.3 `t_semantic_clusters` (Keyword boost mappings)

```sql
id UUID PRIMARY KEY,
membership_id UUID,                -- For group-based clusters (legacy)
tenant_id UUID,                    -- For SmartProfile clusters
primary_term TEXT,                 -- e.g., "panchakarma"
related_terms TEXT[],              -- e.g., ["ayurveda", "spa", "wellness"]
is_active BOOLEAN,
```

### 2.4 `t_query_cache` / `t_smartprofile_search_cache`

```sql
cache_key TEXT UNIQUE,             -- scope:scope_id:normalized_query
query_embedding vector(1536),
results JSONB,                     -- Cached search results
hit_count INT,
expires_at TIMESTAMPTZ,            -- 45-day sliding expiration
```

---

## 3. How Vector Search Works

### 3.1 The Math (Simplified)

```
Query: "panchakarma therapy"
        ↓
Embedding: [0.12, -0.34, 0.56, ..., 0.01]  (1536 numbers)
        ↓
Compare with every stored embedding using cosine distance
        ↓
Results sorted by similarity (highest first)
```

### 3.2 PostgreSQL pgvector Operator

```sql
-- The <=> operator calculates cosine DISTANCE (not similarity)
-- Distance: 0 = identical, 2 = opposite
-- Similarity = 1 - distance

SELECT
    business_name,
    1 - (embedding <=> query_embedding) AS similarity
FROM t_tenant_smartprofiles
WHERE 1 - (embedding <=> query_embedding) >= 0.7  -- threshold
ORDER BY similarity DESC
LIMIT 10;
```

### 3.3 Similarity Score Interpretation

| Score | Meaning |
|-------|---------|
| 0.95+ | Near exact match |
| 0.85-0.95 | Very strong match |
| 0.75-0.85 | Good match |
| 0.70-0.75 | Borderline match |
| < 0.70 | Weak/no match |

---

## 4. Available RPC Functions

### 4.1 Group-Scoped Search (Legacy)

```sql
-- Basic vector search within a group
SELECT * FROM vector_search_members(
    'group-uuid'::UUID,              -- p_group_id
    '[...]'::vector(1536),           -- p_query_embedding
    10,                              -- p_limit
    0.7                              -- p_similarity_threshold
);

-- With semantic cluster boost (+15%)
SELECT * FROM vector_search_with_boost(
    'group-uuid'::UUID,
    '[...]'::vector(1536),
    'panchakarma',                   -- p_query_text (for cluster matching)
    10,
    0.7
);

-- With caching (recommended for production)
SELECT * FROM cached_vector_search(
    'group-uuid'::UUID,
    'panchakarma',
    '[...]'::vector(1536),
    10,
    0.7,
    true                             -- p_use_cache
);
```

### 4.2 SmartProfile Search (Multi-Scope)

```sql
-- Basic search with scope
SELECT * FROM smartprofile_vector_search(
    '[...]'::vector(1536),           -- p_query_embedding
    'group',                         -- p_scope: 'tenant' | 'group' | 'product'
    'group-uuid'::UUID,              -- p_scope_id
    10,                              -- p_limit
    0.7                              -- p_similarity_threshold
);

-- With cluster boost
SELECT * FROM smartprofile_search_with_boost(
    '[...]'::vector(1536),
    'panchakarma',                   -- p_query_text
    'group',
    'group-uuid'::UUID,
    10,
    0.7
);

-- RECOMMENDED: Unified search (caching + boost + scope)
SELECT * FROM smartprofile_unified_search(
    'panchakarma therapy',           -- p_query_text
    '[...]'::vector(1536),           -- p_query_embedding
    'group',                         -- p_scope
    'group-uuid'::UUID,              -- p_scope_id
    'member',                        -- p_user_role
    'whatsapp',                      -- p_channel
    10,                              -- p_limit
    0.7,                             -- p_similarity_threshold
    true                             -- p_use_cache
);
```

### 4.3 AI Agent Search (New)

```sql
-- For AI Agent feature (BBB)
SELECT * FROM scoped_member_search(
    'panchakarma',                   -- p_query_text
    '[...]'::vector(1536),           -- p_query_embedding
    'group',                         -- p_scope
    'group-uuid'::UUID,              -- p_group_id
    10,                              -- p_limit
    0.5                              -- p_similarity_threshold (lower for broader results)
);
```

---

## 5. Embedding Generation

### 5.1 OpenAI API Call

N8N must generate embeddings using OpenAI before calling search functions.

**Model:** `text-embedding-3-small`
**Dimensions:** 1536
**Max Input:** ~8000 tokens

### 5.2 N8N HTTP Request Node

```json
{
  "method": "POST",
  "url": "https://api.openai.com/v1/embeddings",
  "headers": {
    "Authorization": "Bearer {{$credentials.openaiApiKey}}",
    "Content-Type": "application/json"
  },
  "body": {
    "model": "text-embedding-3-small",
    "input": "{{ $json.query_text }}"
  }
}
```

### 5.3 Response Format

```json
{
  "data": [
    {
      "embedding": [0.12, -0.34, 0.56, ..., 0.01],  // 1536 numbers
      "index": 0
    }
  ],
  "model": "text-embedding-3-small",
  "usage": {
    "prompt_tokens": 5,
    "total_tokens": 5
  }
}
```

### 5.4 Extract Embedding in N8N

```javascript
// Code node to extract embedding
const embedding = $json.data[0].embedding;
const embeddingString = '[' + embedding.join(',') + ']';
return { embedding: embeddingString };
```

---

## 6. N8N Workflow Implementation

### 6.1 Search Workflow

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  Webhook    │───►│  Generate    │───►│  Call       │───►│  Format      │
│  (query)    │    │  Embedding   │    │  Supabase   │    │  Response    │
└─────────────┘    │  (OpenAI)    │    │  RPC        │    └──────────────┘
                   └──────────────┘    └─────────────┘
```

### 6.2 Step-by-Step Implementation

#### Step 1: Receive Query (Webhook/Trigger)

```javascript
// Input
{
  "query_text": "panchakarma therapy",
  "group_id": "abc-123-def",
  "scope": "group",
  "limit": 10
}
```

#### Step 2: Generate Embedding (HTTP Request)

```javascript
// POST to OpenAI
{
  "model": "text-embedding-3-small",
  "input": "{{ $json.query_text }}"
}
```

#### Step 3: Call Supabase RPC (HTTP Request)

```javascript
// POST to Supabase
{
  "method": "POST",
  "url": "{{ $env.SUPABASE_URL }}/rest/v1/rpc/smartprofile_unified_search",
  "headers": {
    "apikey": "{{ $env.SUPABASE_ANON_KEY }}",
    "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_KEY }}",
    "Content-Type": "application/json"
  },
  "body": {
    "p_query_text": "{{ $json.query_text }}",
    "p_query_embedding": "{{ $json.embedding }}",
    "p_scope": "group",
    "p_scope_id": "{{ $json.group_id }}",
    "p_limit": 10,
    "p_similarity_threshold": 0.7,
    "p_use_cache": true
  }
}
```

#### Step 4: Format Response

```javascript
// Code node
const response = $json;
const results = response.results || [];

return results.map(r => ({
  business_name: r.business_name,
  description: r.profile_snippet,
  industry: r.industry,
  similarity: (r.similarity * 100).toFixed(1) + '%',
  contact: r.business_email
}));
```

---

## 7. Code Examples

### 7.1 Full N8N Code Node (Generate + Search)

```javascript
// Step 1: Generate embedding
const openaiResponse = await this.helpers.httpRequest({
  method: 'POST',
  url: 'https://api.openai.com/v1/embeddings',
  headers: {
    'Authorization': `Bearer ${$credentials.openaiApiKey}`,
    'Content-Type': 'application/json'
  },
  body: {
    model: 'text-embedding-3-small',
    input: $json.query_text
  }
});

const embedding = openaiResponse.data[0].embedding;
const embeddingStr = '[' + embedding.join(',') + ']';

// Step 2: Call Supabase RPC
const searchResponse = await this.helpers.httpRequest({
  method: 'POST',
  url: `${$env.SUPABASE_URL}/rest/v1/rpc/smartprofile_unified_search`,
  headers: {
    'apikey': $env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${$env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: {
    p_query_text: $json.query_text,
    p_query_embedding: embeddingStr,
    p_scope: 'group',
    p_scope_id: $json.group_id,
    p_limit: 10,
    p_similarity_threshold: 0.7,
    p_use_cache: true
  }
});

return searchResponse;
```

### 7.2 SQL Direct Query (for testing)

```sql
-- Generate embedding externally first, then:
SELECT * FROM smartprofile_unified_search(
    'panchakarma therapy',
    '[0.12, -0.34, ...]'::vector(1536),
    'group',
    'bbb-group-uuid-here'::UUID,
    'member',
    'whatsapp',
    10,
    0.7,
    true
);
```

---

## 8. Caching Strategy

### 8.1 How It Works

```
Query: "panchakarma"
        ↓
Normalize: "panchakarma" (lowercase, trimmed)
        ↓
Cache Key: "group:abc-123:panchakarma"
        ↓
Check Cache → HIT? Return cached results
             ↓ MISS?
        Run vector search → Store in cache → Return results
```

### 8.2 Cache Expiration

- **Initial TTL:** 45 days
- **On Hit:** Expiration resets to 45 days from now (sliding window)
- **Cleanup:** `cleanup_expired_cache()` removes expired entries

### 8.3 When to Skip Cache

```sql
-- Force fresh search
SELECT * FROM smartprofile_unified_search(
    'query',
    embedding,
    'group',
    group_id,
    'member',
    'web',
    10,
    0.7,
    false  -- p_use_cache = false
);
```

---

## 9. Semantic Clusters (Boost)

### 9.1 Purpose

Clusters map related terms to boost relevant results by +15%.

**Example:**
- User searches: "spa"
- Cluster: `primary_term = "wellness"`, `related_terms = ["spa", "massage", "relaxation"]`
- Member with "wellness" cluster gets +15% similarity boost

### 9.2 How It Works

```sql
-- Search word matches cluster?
WHERE LOWER(primary_term) LIKE '%spa%'
   OR EXISTS (SELECT 1 FROM unnest(related_terms) rt WHERE LOWER(rt) LIKE '%spa%')

-- Apply boost
CASE WHEN cluster_match THEN
    LEAST(1.0, base_similarity + 0.15)  -- Cap at 1.0
ELSE
    base_similarity
END
```

### 9.3 Creating Clusters (Optional)

```sql
INSERT INTO t_semantic_clusters (tenant_id, primary_term, related_terms, is_active)
VALUES (
    'tenant-uuid',
    'ayurveda',
    ARRAY['panchakarma', 'wellness', 'herbal', 'natural healing'],
    true
);
```

---

## 10. Testing Queries

### 10.1 Check if Embeddings Exist

```sql
-- Count profiles with embeddings
SELECT
    COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS with_embedding,
    COUNT(*) FILTER (WHERE embedding IS NULL) AS without_embedding
FROM t_tenant_smartprofiles
WHERE status = 'active';
```

### 10.2 Test Search Without Embedding (Text-based fallback)

```sql
-- List members by industry (no vector search)
SELECT * FROM get_members_by_scope(
    'group',
    'bbb-group-uuid'::UUID,
    'Healthcare',  -- industry filter
    NULL,          -- search text
    10,
    0
);
```

### 10.3 Test with Mock Embedding

```sql
-- Create a zero vector for testing structure (won't find real matches)
SELECT * FROM smartprofile_vector_search(
    array_fill(0::float, ARRAY[1536])::vector(1536),
    'product',
    NULL,
    5,
    0.0  -- Low threshold to see any results
);
```

### 10.4 Check Cache Hits

```sql
SELECT
    cache_key,
    query_text,
    hit_count,
    results_count,
    created_at,
    last_hit_at
FROM t_smartprofile_search_cache
ORDER BY hit_count DESC
LIMIT 10;
```

---

## Environment Variables for N8N

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1...

# OpenAI
OPENAI_API_KEY=sk-...

# Optional
DEFAULT_SIMILARITY_THRESHOLD=0.7
DEFAULT_SEARCH_LIMIT=10
```

---

## Quick Reference Card

| Task | Function | Key Parameters |
|------|----------|----------------|
| Search within group | `smartprofile_unified_search` | `p_scope='group'`, `p_scope_id=group_uuid` |
| Search all tenants | `smartprofile_unified_search` | `p_scope='product'`, `p_scope_id=NULL` |
| Search single tenant | `smartprofile_unified_search` | `p_scope='tenant'`, `p_scope_id=tenant_uuid` |
| AI Agent search | `scoped_member_search` | `p_scope='group'`, `p_group_id=group_uuid` |
| List by industry | `get_members_by_scope` | `p_industry_filter='Healthcare'` |
| Get contact | `get_member_contact` | `p_membership_id=uuid` |
| Clear cache | `cleanup_expired_cache` | N/A |

---

## Summary

1. **Generate embedding** using OpenAI `text-embedding-3-small`
2. **Call RPC** with embedding + scope + threshold
3. **Results** come back ranked by similarity
4. **Cache** handles repeated queries automatically
5. **Clusters** boost related terms by +15%

---

**End of Handover**
