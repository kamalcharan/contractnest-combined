# Product Search - Execution Plan

> **Version:** 1.0
> **Created:** 2024-12-08
> **Status:** Ready for Execution

---

## Current State Analysis

### Existing Tables & Structures

| Table | Purpose | Status |
|-------|---------|--------|
| `t_group_memberships` | Member profiles + embeddings (vector column) | Exists |
| `t_tenant_profiles` | Tenant business info | Exists |
| `t_semantic_clusters` | Semantic clusters for search boost | Exists |
| `t_query_cache` | Search result caching | Exists |
| `t_chat_sessions` | Chat session state | Exists |
| `t_business_groups` | Group config (settings.chat.intent_buttons) | Exists |
| `t_system_config` | VaNi system config | Exists |
| `t_intent_definitions` | Master intent catalog | **TO CREATE** |

### Existing SQL Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `vector_search_members` | Basic vector search within group | Exists |
| `vector_search_with_boost` | Vector search with cluster boost | Exists |
| `cached_vector_search` | Search with caching | Exists |
| `get_group_chat_config` | Get chat config for group | Exists |
| `find_group_by_trigger` | Find group by trigger phrase | Exists |
| `get_vani_intro_message` | VaNi intro with groups | Exists |
| `get_resolved_intents` | Resolve intents with RBAC | **TO CREATE** |
| `discover_search` | Cross-tenant/product search | **TO CREATE** |
| `check_intent_permission` | RBAC permission check | **TO CREATE** |

### Existing n8n Webhooks

| Webhook | Purpose | Status |
|---------|---------|--------|
| `/process-profile` | AI profile enhancement | Exists |
| `/generate-embedding` | Generate embeddings | Exists |
| `/generate-semantic-clusters` | Generate clusters | Exists |
| `/search` | AI-powered search | **TO CREATE** |

---

## Execution Phases

---

## PHASE 0: Verification (Pre-Implementation)

### 0.1 Verify Database Tables Exist
```sql
-- Run these checks in Supabase SQL Editor
SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 't_group_memberships');
SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 't_tenant_profiles');
SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 't_semantic_clusters');
SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 't_query_cache');
SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 't_chat_sessions');
SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 't_business_groups');
SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 't_system_config');
```

### 0.2 Verify Embeddings Exist
```sql
-- Check if any memberships have embeddings
SELECT
    COUNT(*) as total_memberships,
    COUNT(embedding) as with_embeddings,
    COUNT(*) - COUNT(embedding) as without_embeddings
FROM t_group_memberships
WHERE status = 'active' AND is_active = TRUE;

-- Check embedding dimensions
SELECT
    id,
    tenant_id,
    profile_data->>'business_name' as name,
    vector_dims(embedding) as embedding_dims
FROM t_group_memberships
WHERE embedding IS NOT NULL
LIMIT 5;
```

### 0.3 Verify Tenant Profiles
```sql
-- Check tenant profiles linked to memberships
SELECT
    gm.id as membership_id,
    gm.tenant_id,
    tp.business_name,
    tp.business_email,
    tp.city,
    gm.profile_data->>'ai_enhanced_description' as ai_description,
    gm.embedding IS NOT NULL as has_embedding
FROM t_group_memberships gm
LEFT JOIN t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id::UUID
WHERE gm.status = 'active'
LIMIT 10;
```

### 0.4 Verify Semantic Clusters
```sql
-- Check semantic clusters
SELECT
    COUNT(*) as total_clusters,
    COUNT(DISTINCT membership_id) as unique_memberships
FROM t_semantic_clusters
WHERE is_active = TRUE;

-- Sample clusters
SELECT
    id,
    membership_id,
    primary_term,
    related_terms[1:3] as sample_related_terms
FROM t_semantic_clusters
WHERE is_active = TRUE
LIMIT 5;
```

### 0.5 Verify Chat Config
```sql
-- Check BBB group config
SELECT
    id,
    group_name,
    settings->'chat'->'trigger_phrase' as trigger,
    settings->'chat'->'intent_buttons' as intents
FROM t_business_groups
WHERE group_name = 'BBB';
```

### 0.6 Verify Vector Search Works
```sql
-- Test vector search (requires embedding)
-- First get a sample embedding
WITH sample_embedding AS (
    SELECT embedding
    FROM t_group_memberships
    WHERE embedding IS NOT NULL
    LIMIT 1
)
SELECT * FROM vector_search_members(
    'YOUR_GROUP_ID'::UUID,
    (SELECT embedding FROM sample_embedding),
    5,
    0.5
);
```

**Checkpoint:** All verifications must pass before proceeding.

---

## PHASE 1: Intent Definitions & RBAC Foundation

### 1.1 Create t_intent_definitions Table

**File:** `migrations/chat-search/006_create_intent_definitions.sql`

```sql
-- ============================================
-- INTENT DEFINITIONS TABLE
-- Master catalog of all search intents
-- ============================================

CREATE TABLE IF NOT EXISTS t_intent_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    intent_code VARCHAR(50) UNIQUE NOT NULL,
    intent_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- UI Defaults
    default_label VARCHAR(100),
    default_icon VARCHAR(50),
    default_prompt TEXT,

    -- Behavior
    intent_type VARCHAR(50) NOT NULL,          -- 'search', 'list', 'filter', 'action', 'info'
    requires_ai BOOLEAN DEFAULT FALSE,
    cacheable BOOLEAN DEFAULT TRUE,

    -- Default RBAC
    default_roles VARCHAR(50)[] DEFAULT ARRAY['admin', 'member'],
    default_channels VARCHAR(50)[] DEFAULT ARRAY['web', 'mobile', 'whatsapp', 'api'],
    default_scopes VARCHAR(50)[] DEFAULT ARRAY['tenant', 'group'],
    default_max_results INT DEFAULT 10,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,

    -- Metadata
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_intent_definitions_code ON t_intent_definitions(intent_code);
CREATE INDEX idx_intent_definitions_type ON t_intent_definitions(intent_type);
CREATE INDEX idx_intent_definitions_active ON t_intent_definitions(is_active);

-- Grant permissions
GRANT SELECT ON t_intent_definitions TO authenticated;
GRANT ALL ON t_intent_definitions TO service_role;
```

### 1.2 Seed System Intents

```sql
-- ============================================
-- SEED SYSTEM INTENTS
-- ============================================

INSERT INTO t_intent_definitions (
    intent_code, intent_name, description, intent_type,
    default_label, default_icon, default_prompt,
    requires_ai, is_system,
    default_roles, default_channels, default_scopes, default_max_results
) VALUES
-- Search intents (AI-powered)
('search_offering', 'Search by Offering', 'Semantic search by product/service', 'search',
 'Who is into?', 'search', 'What product or service are you looking for?',
 TRUE, TRUE,
 ARRAY['admin','member','guest'], ARRAY['web','mobile','whatsapp','chatbot'], ARRAY['group','tenant','product'], 10),

('search_segment', 'Search by Segment', 'Search by industry segment', 'search',
 'Find by segment', 'category', 'Which industry segment?',
 TRUE, TRUE,
 ARRAY['admin','member'], ARRAY['web','mobile','whatsapp','chatbot'], ARRAY['group','tenant'], 10),

('member_lookup', 'Member Lookup', 'Find by name/company', 'search',
 'Member lookup', 'person', 'Enter member or company name:',
 TRUE, TRUE,
 ARRAY['admin','member'], ARRAY['web','mobile','whatsapp','chatbot'], ARRAY['group','tenant'], 10),

-- List/Filter intents
('list_all', 'List All', 'Paginated list of all results', 'list',
 'Show all', 'list', NULL,
 FALSE, TRUE,
 ARRAY['admin','member'], ARRAY['web','mobile','api'], ARRAY['group','tenant'], 20),

('filter', 'Filter Results', 'Apply explicit filters', 'filter',
 'Filter', 'filter', NULL,
 FALSE, TRUE,
 ARRAY['admin','member'], ARRAY['web','mobile','api'], ARRAY['group','tenant'], 20),

-- Info intents
('about_group', 'About Group', 'Group information', 'info',
 'About this group', 'info', NULL,
 FALSE, TRUE,
 ARRAY['admin','member','guest'], ARRAY['web','mobile','whatsapp','chatbot'], ARRAY['group'], 1),

-- Action intents
('export', 'Export Data', 'Export to CSV/Excel', 'action',
 'Export', 'download', NULL,
 FALSE, TRUE,
 ARRAY['admin'], ARRAY['web','api'], ARRAY['group','tenant'], 1000),

('analytics', 'View Analytics', 'View search stats', 'action',
 'Analytics', 'chart', NULL,
 FALSE, TRUE,
 ARRAY['admin'], ARRAY['web'], ARRAY['group','tenant','product'], 1)

ON CONFLICT (intent_code) DO UPDATE SET
    intent_name = EXCLUDED.intent_name,
    description = EXCLUDED.description,
    updated_at = NOW();
```

### 1.3 Create get_resolved_intents Function

```sql
-- ============================================
-- RESOLVE INTENTS WITH RBAC
-- Returns intents user can use on channel
-- ============================================

CREATE OR REPLACE FUNCTION get_resolved_intents(
    p_group_id UUID,
    p_user_role VARCHAR DEFAULT 'member',
    p_channel VARCHAR DEFAULT 'web'
)
RETURNS JSONB AS $$
DECLARE
    v_group_intents JSONB;
    v_resolved JSONB := '[]'::JSONB;
    v_intent_override JSONB;
    v_master RECORD;
    v_allowed_roles VARCHAR[];
    v_allowed_channels VARCHAR[];
BEGIN
    -- Get group's intent_buttons
    SELECT COALESCE(settings->'chat'->'intent_buttons', '[]'::JSONB)
    INTO v_group_intents
    FROM t_business_groups
    WHERE id = p_group_id;

    -- If no group intents defined, use all system intents
    IF v_group_intents = '[]'::JSONB THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'intent_code', intent_code,
                'label', default_label,
                'icon', default_icon,
                'prompt', default_prompt,
                'intent_type', intent_type,
                'requires_ai', requires_ai,
                'max_results', default_max_results
            )
        ) INTO v_resolved
        FROM t_intent_definitions
        WHERE is_active = TRUE
          AND p_user_role = ANY(default_roles)
          AND p_channel = ANY(default_channels);

        RETURN COALESCE(v_resolved, '[]'::JSONB);
    END IF;

    -- Process each group intent override
    FOR v_intent_override IN SELECT * FROM jsonb_array_elements(v_group_intents)
    LOOP
        -- Skip if explicitly disabled
        IF (v_intent_override->>'enabled')::BOOLEAN = FALSE THEN
            CONTINUE;
        END IF;

        -- Get master definition
        SELECT * INTO v_master
        FROM t_intent_definitions
        WHERE intent_code = v_intent_override->>'intent_code'
          OR intent_code = v_intent_override->>'id';  -- Support legacy 'id' field

        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        -- Determine allowed roles (group override or master default)
        IF v_intent_override ? 'roles' THEN
            SELECT ARRAY(SELECT jsonb_array_elements_text(v_intent_override->'roles'))
            INTO v_allowed_roles;
        ELSE
            v_allowed_roles := v_master.default_roles;
        END IF;

        -- Check role permission
        IF NOT (p_user_role = ANY(v_allowed_roles)) THEN
            CONTINUE;
        END IF;

        -- Determine allowed channels
        IF v_intent_override ? 'channels' THEN
            SELECT ARRAY(SELECT jsonb_array_elements_text(v_intent_override->'channels'))
            INTO v_allowed_channels;
        ELSE
            v_allowed_channels := v_master.default_channels;
        END IF;

        -- Check channel permission
        IF NOT (p_channel = ANY(v_allowed_channels)) THEN
            CONTINUE;
        END IF;

        -- Build resolved intent
        v_resolved := v_resolved || jsonb_build_object(
            'intent_code', v_master.intent_code,
            'label', COALESCE(v_intent_override->>'label', v_master.default_label),
            'icon', COALESCE(v_intent_override->>'icon', v_master.default_icon),
            'prompt', COALESCE(v_intent_override->>'prompt', v_master.default_prompt),
            'intent_type', v_master.intent_type,
            'requires_ai', v_master.requires_ai,
            'max_results', COALESCE(
                (v_intent_override->>'max_results')::INT,
                v_master.default_max_results
            )
        );
    END LOOP;

    RETURN v_resolved;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_resolved_intents TO authenticated;
GRANT EXECUTE ON FUNCTION get_resolved_intents TO service_role;
```

**Verification:**
```sql
-- Test: Get resolved intents for BBB group
SELECT get_resolved_intents(
    'YOUR_BBB_GROUP_ID'::UUID,
    'member',
    'whatsapp'
);
```

---

## PHASE 2: Multi-Scope Search Functions

### 2.1 Create discover_search Function

**File:** `migrations/chat-search/007_create_discover_search.sql`

```sql
-- ============================================
-- DISCOVER SEARCH (Cross-Tenant/Product)
-- Searches across groups or entire product
-- ============================================

CREATE OR REPLACE FUNCTION discover_search(
    p_query_embedding vector(1536),
    p_query_text TEXT,
    p_scope VARCHAR DEFAULT 'group',           -- 'group', 'tenant', 'product'
    p_scope_id UUID DEFAULT NULL,              -- group_id or tenant_id
    p_limit INT DEFAULT 10,
    p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    membership_id UUID,
    tenant_id UUID,
    group_id UUID,
    business_name TEXT,
    business_email TEXT,
    mobile_number TEXT,
    city TEXT,
    industry TEXT,
    profile_snippet TEXT,
    ai_enhanced_description TEXT,
    approved_keywords TEXT[],
    similarity FLOAT,
    similarity_original FLOAT,
    boost_applied TEXT,
    match_type TEXT,
    search_scope TEXT
) AS $$
DECLARE
    v_query_words TEXT[];
    v_search_word TEXT;
BEGIN
    v_query_words := regexp_split_to_array(LOWER(TRIM(p_query_text)), '\s+');
    v_search_word := v_query_words[1];

    RETURN QUERY
    WITH base_results AS (
        SELECT
            gm.id AS membership_id,
            gm.tenant_id,
            gm.group_id,
            tp.business_name,
            tp.business_email,
            gm.profile_data->>'mobile_number' AS mobile_number,
            tp.city,
            ci.industry_name AS industry,
            LEFT(COALESCE(
                gm.profile_data->>'ai_enhanced_description',
                gm.profile_data->>'short_description',
                tp.business_name
            ), 200) AS profile_snippet,
            gm.profile_data->>'ai_enhanced_description' AS ai_enhanced_description,
            ARRAY(
                SELECT jsonb_array_elements_text(
                    COALESCE(gm.profile_data->'approved_keywords', '[]'::JSONB)
                )
            ) AS approved_keywords,
            1 - (gm.embedding <=> p_query_embedding) AS base_similarity
        FROM public.t_group_memberships gm
        LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id::UUID
        LEFT JOIN public.m_catalog_industries ci ON ci.id = tp.industry_id
        WHERE gm.status = 'active'
          AND gm.is_active = TRUE
          AND gm.embedding IS NOT NULL
          AND 1 - (gm.embedding <=> p_query_embedding) >= p_similarity_threshold
          AND (
              -- Scope filtering
              CASE p_scope
                  WHEN 'group' THEN gm.group_id = p_scope_id
                  WHEN 'tenant' THEN gm.tenant_id::UUID = p_scope_id
                  WHEN 'product' THEN TRUE  -- All tenants
                  ELSE gm.group_id = p_scope_id  -- Default to group
              END
          )
    ),
    cluster_matches AS (
        SELECT DISTINCT sc.membership_id
        FROM public.t_semantic_clusters sc
        WHERE sc.is_active = TRUE
          AND (
              LOWER(sc.primary_term) LIKE '%' || v_search_word || '%'
              OR EXISTS (
                  SELECT 1
                  FROM unnest(sc.related_terms) rt
                  WHERE LOWER(rt) LIKE '%' || v_search_word || '%'
              )
          )
    ),
    boosted_results AS (
        SELECT
            br.*,
            CASE
                WHEN cm.membership_id IS NOT NULL THEN
                    LEAST(1.0, br.base_similarity + 0.15)
                ELSE br.base_similarity
            END AS final_similarity,
            CASE
                WHEN cm.membership_id IS NOT NULL THEN 'cluster_match'
                ELSE NULL
            END AS boost_reason
        FROM base_results br
        LEFT JOIN cluster_matches cm ON cm.membership_id = br.membership_id
    )
    SELECT
        br.membership_id,
        br.tenant_id::UUID,
        br.group_id,
        br.business_name,
        br.business_email,
        br.mobile_number,
        br.city,
        br.industry,
        br.profile_snippet,
        br.ai_enhanced_description,
        br.approved_keywords,
        br.final_similarity AS similarity,
        br.base_similarity AS similarity_original,
        br.boost_reason AS boost_applied,
        'vector'::TEXT AS match_type,
        p_scope AS search_scope
    FROM boosted_results br
    ORDER BY br.final_similarity DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION discover_search TO authenticated;
GRANT EXECUTE ON FUNCTION discover_search TO service_role;
```

### 2.2 Create check_intent_permission Function

```sql
-- ============================================
-- CHECK INTENT PERMISSION
-- Validates if user can use intent on channel
-- ============================================

CREATE OR REPLACE FUNCTION check_intent_permission(
    p_group_id UUID,
    p_intent_code VARCHAR,
    p_user_role VARCHAR,
    p_channel VARCHAR,
    p_scope VARCHAR DEFAULT 'group'
)
RETURNS TABLE (
    is_allowed BOOLEAN,
    max_results INT,
    denial_reason TEXT
) AS $$
DECLARE
    v_master RECORD;
    v_group_override JSONB;
    v_allowed_roles VARCHAR[];
    v_allowed_channels VARCHAR[];
    v_allowed_scopes VARCHAR[];
BEGIN
    -- Get master definition
    SELECT * INTO v_master
    FROM t_intent_definitions
    WHERE intent_code = p_intent_code AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 'Intent not found or inactive'::TEXT;
        RETURN;
    END IF;

    -- Get group override if exists
    SELECT intent INTO v_group_override
    FROM t_business_groups bg,
         jsonb_array_elements(bg.settings->'chat'->'intent_buttons') AS intent
    WHERE bg.id = p_group_id
      AND (intent->>'intent_code' = p_intent_code OR intent->>'id' = p_intent_code)
    LIMIT 1;

    -- Check if disabled at group level
    IF v_group_override IS NOT NULL AND (v_group_override->>'enabled')::BOOLEAN = FALSE THEN
        RETURN QUERY SELECT FALSE, 0, 'Intent disabled for this group'::TEXT;
        RETURN;
    END IF;

    -- Determine allowed roles
    IF v_group_override IS NOT NULL AND v_group_override ? 'roles' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(v_group_override->'roles'))
        INTO v_allowed_roles;
    ELSE
        v_allowed_roles := v_master.default_roles;
    END IF;

    -- Check role
    IF NOT (p_user_role = ANY(v_allowed_roles)) THEN
        RETURN QUERY SELECT FALSE, 0, 'Role not permitted for this intent'::TEXT;
        RETURN;
    END IF;

    -- Determine allowed channels
    IF v_group_override IS NOT NULL AND v_group_override ? 'channels' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(v_group_override->'channels'))
        INTO v_allowed_channels;
    ELSE
        v_allowed_channels := v_master.default_channels;
    END IF;

    -- Check channel
    IF NOT (p_channel = ANY(v_allowed_channels)) THEN
        RETURN QUERY SELECT FALSE, 0, 'Channel not permitted for this intent'::TEXT;
        RETURN;
    END IF;

    -- Check scope
    v_allowed_scopes := v_master.default_scopes;
    IF NOT (p_scope = ANY(v_allowed_scopes)) THEN
        RETURN QUERY SELECT FALSE, 0, 'Scope not permitted for this intent'::TEXT;
        RETURN;
    END IF;

    -- All checks passed
    RETURN QUERY SELECT
        TRUE,
        COALESCE((v_group_override->>'max_results')::INT, v_master.default_max_results),
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION check_intent_permission TO authenticated;
GRANT EXECUTE ON FUNCTION check_intent_permission TO service_role;
```

**Verification:**
```sql
-- Test: Check if member can use search_offering on whatsapp
SELECT * FROM check_intent_permission(
    'YOUR_BBB_GROUP_ID'::UUID,
    'search_offering',
    'member',
    'whatsapp',
    'group'
);
```

---

## PHASE 3: n8n Workflow

### 3.1 Create New /search Workflow

**n8n Workflow Structure:**

```
1. Webhook Trigger
   - Path: /search
   - Method: POST
   - Body: { query, scope, scope_id, channel, use_cache, limit, ... }

2. Validate Request
   - Check required fields
   - Set defaults for optional fields
   - ERROR: Return 400 if invalid

3. Check Cache (t_query_cache)
   - Call Supabase: get_cached_search()
   - IF cache hit → Skip to step 7
   - ELSE → Continue

4. Generate Query Embedding
   - Call OpenAI embeddings API
   - Model: text-embedding-ada-002
   - RETRY: 2 attempts with backoff
   - FALLBACK: If fails, return error (don't do keyword search)

5. Execute Vector Search
   - Call Supabase: discover_search()
   - Pass: embedding, query_text, scope, scope_id, limit
   - FALLBACK: Return empty results with error flag

6. Apply Semantic Boost (in SQL function, already done)

7. Store in Cache
   - Call Supabase: store_search_cache()
   - FALLBACK: Log error, continue

8. Format Response
   - Uniform JSON structure
   - Include: results, from_cache, results_count, search_scope

9. Return Response
```

### 3.2 Workflow JSON Export

Will be created in n8n UI and exported. Key nodes:
- Webhook (trigger)
- IF (cache check)
- HTTP Request (OpenAI)
- Supabase (vector search)
- Supabase (cache store)
- Respond to Webhook

---

## PHASE 4: Edge Function Updates

### 4.1 Update /chat/search Endpoint

**File:** `contractnest-edge/supabase/functions/groups/index.ts`

Changes:
1. Accept `scope` parameter (group/tenant/product)
2. Accept `scope_id` parameter
3. Call `check_intent_permission` before search
4. Use new n8n `/search` workflow
5. Return resolved intents in response

### 4.2 Add /search/intents Endpoint

New endpoint to get available intents for a group/channel:

```typescript
// GET /search/intents?group_id=xxx&channel=web
if (method === 'GET' && path === '/search/intents') {
    const groupId = url.searchParams.get('group_id');
    const channel = url.searchParams.get('channel') || 'web';
    const userRole = /* from auth */ 'member';

    const { data, error } = await supabaseAdmin.rpc('get_resolved_intents', {
        p_group_id: groupId,
        p_user_role: userRole,
        p_channel: channel
    });

    return new Response(JSON.stringify({
        success: true,
        intents: data
    }));
}
```

---

## PHASE 5: API Routes Updates

### 5.1 Update groupsController.ts

- Add `searchDiscover` method
- Add `getIntents` method
- Update existing `chatSearch` to use new flow

### 5.2 Update groupsRoutes.ts

```typescript
// Search endpoints
router.post('/search/discover', groupsController.searchDiscover);
router.get('/search/intents', groupsController.getIntents);

// Keep existing for backward compatibility
router.post('/chat/search', groupsController.chatSearch);
```

---

## PHASE 6: UI Updates

### 6.1 Update VaNiChat Component

- Fetch intents from `/search/intents`
- Render intent buttons based on RBAC
- Use new search endpoint

### 6.2 Update Chat Service

- Add `getIntents(groupId, channel)` method
- Update `search()` to pass scope

---

## Verification Checklist

### After Phase 0
- [ ] All existing tables verified
- [ ] Embeddings exist for members
- [ ] Vector search returns results

### After Phase 1
- [ ] t_intent_definitions created with seed data
- [ ] get_resolved_intents returns correct intents
- [ ] RBAC filtering works

### After Phase 2
- [ ] discover_search works for group scope
- [ ] discover_search works for product scope
- [ ] check_intent_permission returns correct results

### After Phase 3
- [ ] n8n /search webhook responds
- [ ] Cache check works
- [ ] Embedding generation works
- [ ] Vector search returns results

### After Phase 4
- [ ] Edge /chat/search uses new flow
- [ ] Edge /search/intents returns intents
- [ ] RBAC is enforced

### After Phase 5
- [ ] API routes work
- [ ] Backward compatibility maintained

### After Phase 6
- [ ] VaNi Chat displays correct intents
- [ ] Search returns results
- [ ] Different channels show different intents

---

## Rollback Plan

If issues occur:
1. Keep old `/chat/search` endpoint working (do not delete)
2. Feature flag in t_system_config: `use_new_search_flow: false`
3. SQL functions are additive (don't modify existing ones initially)

---

## Timeline Estimate

| Phase | Effort |
|-------|--------|
| Phase 0 | Verification only |
| Phase 1 | SQL migrations + testing |
| Phase 2 | SQL migrations + testing |
| Phase 3 | n8n workflow creation |
| Phase 4 | Edge Function updates |
| Phase 5 | API updates |
| Phase 6 | UI updates |

---

*Ready to execute. Start with Phase 0 verification.*
