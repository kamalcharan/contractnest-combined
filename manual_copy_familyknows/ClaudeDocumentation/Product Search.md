# Product Search - Strategy Document

> **Version:** 1.0
> **Created:** 2024-12-08
> **Status:** Approved Architecture
> **Scope:** Binding for all future implementations

---

## 1. Executive Summary

This document defines the unified search architecture for ContractNest. It establishes a single, intent-based search pattern that works across all entities, scopes, and delivery channels.

**Core Principles:**
1. **One endpoint, many intents** - No separate list/filter/search endpoints
2. **Intent-based architecture** - AI detects or UI specifies the intent
3. **RBAC at intent level** - Control who can use which intent on which channel
4. **Uniform response** - Same data structure, channel adapts UX
5. **Evolving without breaking** - Add new intents/entities without new endpoints

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    DELIVERY CHANNELS                            │
│   Web UI  │  Mobile App  │  Chatbot  │  WhatsApp  │  Ext API   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED SEARCH API                           │
│                    POST /api/search                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INTENT DETECTION + RBAC                      │
│   Detect intent → Check permissions → Execute or deny           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    n8n AI WORKFLOW                              │
│   Cache → Embedding → Semantic Clusters → Vector Search         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA SOURCES                                 │
│   Profiles │ Catalogs │ Contracts │ Services │ Subscriptions   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Search Modes

### 3.1 Discovery Search (Cross-Tenant)
- **Use Case:** "Who is into AC repair?" across product or group
- **Scope:** Product-wide OR Group-specific
- **Data:** Profiles + Embeddings + Semantic Clusters
- **Users:** Any authenticated user (per RBAC)

### 3.2 Tenant Knowledge Search
- **Use Case:** Tenant searching their own data
- **Scope:** Restricted to single tenant
- **Data:** Profile, Catalogs, Contracts, Customer History, Semantic Queries
- **Users:** Tenant members only
- **Future:** ServiceChatbot integration

---

## 4. Intent System

### 4.1 Intent Types

| Intent Code | Type | Description | Requires AI |
|-------------|------|-------------|-------------|
| `search_offering` | search | "Who is into AC?" | Yes |
| `search_segment` | search | "Find by industry" | Yes |
| `member_lookup` | search | "Find John's company" | Yes |
| `list_all` | list | "Show all members" | No |
| `filter` | filter | "Members in Mumbai" | No (AI optional) |
| `about_group` | info | "Tell me about BBB" | No |
| `export` | action | "Export member list" | No |
| `analytics` | action | "Show search stats" | No |

### 4.2 Intent Detection Flow

```
User Query: "who repairs AC in Mumbai"
                    │
                    ▼
┌─────────────────────────────────────────┐
│          INTENT DETECTION (AI)          │
│                                         │
│  Detected: search_offering              │
│  Extracted Filters: {city: "Mumbai"}    │
│  Entity: profile                        │
└─────────────────────────────────────────┘
                    │
                    ▼
           Execute with filters
```

### 4.3 Intent Hierarchy (Inheritance)

```
t_intent_definitions (Master)
         │
         │ INHERITS + OVERRIDES
         ▼
t_business_groups.settings.chat.intent_buttons (Group Level)
         │
         │ FURTHER RESTRICTS
         ▼
Tenant-level or Channel-level restrictions
```

---

## 5. RBAC Model

### 5.1 Permission Dimensions

| Dimension | Values | Description |
|-----------|--------|-------------|
| **Role** | admin, member, guest | Who is making the request |
| **Channel** | web, mobile, whatsapp, chatbot, api | Where request originates |
| **Entity** | profile, catalog, contract, subscription | What is being searched |
| **Scope** | tenant, group, product | How wide is the search |

### 5.2 Permission Resolution

```sql
-- Check permission for a specific action
SELECT * FROM get_resolved_intents(
    p_group_id := 'uuid',
    p_user_role := 'member',
    p_channel := 'whatsapp'
);
-- Returns only intents this user can use on this channel
```

### 5.3 Default Permission Matrix

| Intent | Admin | Member | Guest | Web | Mobile | WhatsApp | API |
|--------|-------|--------|-------|-----|--------|----------|-----|
| search_offering | Y | Y | Y | Y | Y | Y | Y |
| search_segment | Y | Y | N | Y | Y | Y | Y |
| member_lookup | Y | Y | N | Y | Y | Y | Y |
| list_all | Y | Y | N | Y | Y | N | Y |
| filter | Y | Y | N | Y | Y | Y | Y |
| export | Y | N | N | Y | N | N | Y |
| analytics | Y | N | N | Y | Y | N | N |

---

## 6. Database Schema

### 6.1 Master Intent Definitions

```sql
CREATE TABLE t_intent_definitions (
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
    intent_type VARCHAR(50),              -- 'search', 'list', 'filter', 'action', 'info'
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
```

### 6.2 Group-Level Intent Configuration

Stored in `t_business_groups.settings.chat.intent_buttons`:

```json
{
  "chat": {
    "trigger_phrase": "Hi BBB",
    "intent_buttons": [
      {
        "intent_code": "search_offering",
        "label": "Who is into?",
        "icon": "search",
        "prompt": "What are you looking for?",
        "enabled": true,
        "roles": ["admin", "member"],
        "channels": ["web", "whatsapp"],
        "max_results": 5
      }
    ]
  }
}
```

### 6.3 Existing Tables Used

| Table | Purpose |
|-------|---------|
| `t_tenant_embeddings` | Vector embeddings for semantic search |
| `t_semantic_clusters` | Cluster definitions for search boosting |
| `t_query_cache` | Cached search results (30-day TTL) |
| `t_chat_sessions` | Chat session state |
| `t_business_groups` | Group config including intent_buttons |
| `t_system_config` | VaNi system-wide config |

---

## 7. API Specification

### 7.1 Unified Search Endpoint

```
POST /api/search
```

### 7.2 Request Structure

```typescript
interface SearchRequest {
  // Required
  query: string;                    // Natural language query
  entity_type: EntityType;          // 'profile' | 'catalog' | 'contract' | 'subscription'

  // Scope (at least one required)
  scope: SearchScope;               // 'tenant' | 'group' | 'product'
  scope_id?: string;                // tenant_id or group_id

  // Optional
  intent?: IntentCode;              // Override auto-detection
  filters?: Record<string, any>;    // Explicit filters (hybrid mode)
  pagination?: {
    page: number;
    limit: number;
  };

  // Context
  channel: Channel;                 // 'web' | 'mobile' | 'whatsapp' | 'chatbot' | 'api'
  session_id?: string;              // For chat flows
}
```

### 7.3 Response Structure

```typescript
interface SearchResponse {
  success: boolean;

  // Query info
  query: string;
  intent_detected: IntentCode;
  intent_type: IntentType;
  filters_applied: Record<string, any>;

  // Results
  results: SearchResult[];
  results_count: number;
  total_count: number;              // For pagination

  // Metadata
  from_cache: boolean;
  cache_hit_count?: number;
  search_type: 'semantic' | 'keyword' | 'hybrid';
  search_time_ms: number;

  // Scope info
  scope: SearchScope;
  scope_id?: string;
}

interface SearchResult {
  // Common fields
  id: string;
  entity_type: EntityType;

  // Profile-specific
  membership_id?: string;
  tenant_id?: string;
  business_name?: string;
  business_email?: string;
  mobile_number?: string;
  city?: string;
  industry?: string;
  profile_snippet?: string;
  ai_enhanced_description?: string;
  approved_keywords?: string[];
  logo_url?: string;

  // Scoring
  similarity: number;
  similarity_original?: number;
  boost_applied?: string;
  match_type: 'vector' | 'keyword' | 'hybrid';
}
```

---

## 8. n8n Workflow Design

### 8.1 Webhook Endpoint

```
POST /webhook/search (production)
POST /webhook-test/search (development)
```

### 8.2 Workflow Steps

```
1. RECEIVE REQUEST
   └── Validate: query, entity_type, scope, channel

2. CHECK CACHE (t_query_cache)
   ├── Cache hit → Return cached results
   └── Cache miss → Continue

3. GENERATE QUERY EMBEDDING
   ├── Call OpenAI text-embedding-ada-002
   ├── Retry: 2 attempts with backoff
   └── Fallback: Keyword search if embedding fails

4. LOOKUP SEMANTIC CLUSTERS
   ├── Find matching clusters for query
   ├── Get cluster boost scores
   └── Fallback: Skip boost if lookup fails

5. EXECUTE VECTOR SEARCH
   ├── Call appropriate SQL function based on scope
   ├── Apply cluster boost to results
   └── Fallback: Return empty with error flag

6. STORE IN CACHE
   ├── Save results to t_query_cache
   └── Set TTL: 30 days (sliding)

7. RETURN RESPONSE
   └── Uniform JSON structure
```

### 8.3 Error Handling

| Step | Error | Fallback |
|------|-------|----------|
| Embedding generation | OpenAI timeout | Keyword search |
| Cluster lookup | DB error | Skip boosting |
| Vector search | No results | Return empty array |
| Cache storage | Write failed | Log and continue |

---

## 9. Implementation Phases

### Phase 1: Foundation (Current Sprint)
- [ ] Create `t_intent_definitions` table with seed data
- [ ] Update `get_group_chat_config` to resolve intents
- [ ] Create `get_resolved_intents` function
- [ ] Build new n8n `/search` workflow with error handling
- [ ] Update Edge Function with unified `/search` endpoint
- [ ] Update VaNi Chat to use new endpoint

### Phase 2: RBAC Integration
- [ ] Add RBAC checks to intent resolution
- [ ] Update group settings UI for intent configuration
- [ ] Add channel-level restrictions
- [ ] Implement rate limiting per intent

### Phase 3: Multi-Entity Support
- [ ] Add catalog embeddings and search
- [ ] Add contract embeddings and search
- [ ] Add subscription search (admin)
- [ ] Unified search across entity types

### Phase 4: Advanced Features
- [ ] Tenant Knowledge Search mode
- [ ] Search analytics dashboard
- [ ] Export functionality
- [ ] External API (API-as-a-Service)

---

## 10. Configuration Reference

### 10.1 Environment Variables

```bash
# n8n Configuration
N8N_WEBHOOK_URL=https://n8n.srv1096269.hstgr.cloud

# API Authentication
INTERNAL_SIGNING_SECRET=<secret>

# OpenAI (used by n8n)
OPENAI_API_KEY=<key>

# Cache Configuration
QUERY_CACHE_TTL_DAYS=30
```

### 10.2 VaNiN8NConfig Paths

```typescript
export const N8N_PATHS = {
  PROCESS_PROFILE: '/process-profile',
  GENERATE_EMBEDDING: '/generate-embedding',
  SEARCH: '/search',
  GENERATE_CLUSTERS: '/generate-semantic-clusters',
};
```

---

## 11. Migration Notes

### 11.1 Impact on Existing Features

| Feature | Impact | Migration |
|---------|--------|-----------|
| VaNi Chat | Uses new intent system | Update to use `/search` endpoint |
| `/search` endpoint | Keep as keyword fallback | No change |
| `/chat/search` endpoint | Deprecated | Redirect to new `/search` |
| Group settings | Add intent_buttons RBAC | Backward compatible |

### 11.2 Backward Compatibility

- Existing `intent_buttons` structure remains valid
- New RBAC fields are optional (defaults apply)
- Old endpoints continue working during transition

---

## 12. Appendix

### A. Intent Code Reference

| Code | Label | Type | AI | Description |
|------|-------|------|-----|-------------|
| `search_offering` | Who is into? | search | Yes | Semantic search by product/service |
| `search_segment` | Find by segment | search | Yes | Search by industry segment |
| `member_lookup` | Member lookup | search | Yes | Find by name/company |
| `list_all` | Show all | list | No | Paginated list |
| `filter` | Filter | filter | No | Apply explicit filters |
| `about_group` | About | info | No | Group information |
| `export` | Export | action | No | Export to CSV/Excel |
| `analytics` | Analytics | action | No | View search stats |

### B. Channel Capabilities

| Channel | Intents Supported | Max Results | Rich UI |
|---------|-------------------|-------------|---------|
| Web | All | Unlimited | Yes |
| Mobile | All except export | 50 | Yes |
| WhatsApp | search, filter, info | 5 | No |
| Chatbot | search, filter, info | 10 | Limited |
| API | All | Per plan | N/A |

### C. Related Documents

- VaNiN8NConfig.ts - n8n webhook configuration
- groupsRoutes.ts - API route definitions
- Edge Function index.ts - Supabase Edge Function
- Chat migrations (001-005) - Database schema

---

*This document is the binding reference for all Product Search implementations.*
