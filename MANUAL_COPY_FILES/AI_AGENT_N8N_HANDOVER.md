# AI Agent N8N Workflow Handover Document

**Date:** December 14, 2025
**From:** Claude (Database Developer)
**To:** Claude (N8N Workflow Author)
**Feature:** ContractNest BBB AI Agent

---

## Status Summary

**Database Layer: COMPLETE**

All 8 SQL migrations have been deployed to Supabase and are ready for use.

---

## Deployed RPC Functions (18 Total)

### 1. User Lookup Functions

```sql
-- Find user by phone number (flexible matching)
SELECT * FROM get_user_by_phone('+919876543210');
-- Returns: user_id, name, email, mobile_number, tenant_id, is_admin

-- Normalize phone to E.164
SELECT normalize_phone('9876543210');
-- Returns: +919876543210
```

### 2. Group Configuration Functions

```sql
-- Get AI agent config for a group
SELECT * FROM get_ai_agent_config('group-uuid');
-- Returns: Full ai_agent JSONB config

-- Check if AI agent is enabled for group
SELECT is_ai_agent_enabled('group-uuid');
-- Returns: boolean
```

### 3. Session Management Functions

```sql
-- Get active session for a phone number
SELECT * FROM get_ai_session('+919876543210');
-- Returns: session_id, user_id, group_id, group_name, context, conversation_history, language, channel, expires_at

-- Create new session
SELECT create_ai_session(
    'user-uuid',           -- p_user_id
    '+919876543210',       -- p_phone
    'group-uuid',          -- p_group_id
    'whatsapp',            -- p_channel: 'whatsapp' | 'web' | 'chat'
    'en'                   -- p_language
);
-- Returns: session_id UUID

-- Update session (add message to history)
SELECT update_ai_session(
    'session-uuid',                              -- p_session_id
    '{"last_intent": "search", "query": ".."}',  -- p_context (JSONB)
    'en',                                        -- p_language
    '{"role": "user", "content": "...", "timestamp": "..."}'  -- p_add_message (JSONB)
);
-- Returns: success boolean

-- End session (user said "Bye")
SELECT end_ai_session('+919876543210');
-- Returns: void (ends the session)

-- Switch to different group
SELECT switch_ai_session('+919876543210', 'new-group-uuid', 'en');
-- Returns: new session_id

-- Cleanup expired sessions (run periodically)
SELECT cleanup_expired_ai_sessions();
-- Returns: count of sessions cleaned up
```

### 4. Activation Detection Functions

```sql
-- Detect "Hi BBB" or "Bye" commands
SELECT * FROM detect_group_activation('Hi BBB');
-- Returns: group_id, group_name, is_activation, is_exit, ai_config

SELECT * FROM detect_group_activation('Bye');
-- Returns: group_id=null, is_activation=false, is_exit=true

-- List all AI-enabled groups
SELECT * FROM get_ai_enabled_groups();
-- Returns: group_id, group_name, group_type, ai_config

-- Quick exit check
SELECT is_exit_command('Bye');
-- Returns: boolean
```

### 5. Access Control Functions

```sql
-- Check if user has access to a group
SELECT * FROM check_user_group_access('user-uuid', 'group-uuid');
-- Returns: has_access, scope ('group'|'product'), access_level ('member'|'admin'), membership_id

-- Combined: lookup user by phone and check access
SELECT * FROM check_phone_group_access('+919876543210', 'group-uuid');
-- Returns: user_id, user_name, has_access, scope, access_level, membership_id

-- Get all groups user can access
SELECT * FROM get_user_accessible_groups('user-uuid');
-- Returns: group_id, group_name, group_type, membership_id, membership_status, ai_enabled
```

### 6. Scoped Search Functions

```sql
-- Vector search for members (requires embedding)
SELECT * FROM scoped_member_search(
    'panchakarma ayurveda',      -- p_query_text
    '[0.1, 0.2, ...]'::vector,   -- p_query_embedding (1536 dimensions)
    'group',                      -- p_scope: 'group' or 'product'
    'group-uuid',                 -- p_group_id
    10,                           -- p_limit
    0.7                           -- p_similarity_threshold
);
-- Returns: membership_id, business_name, short_description, industry, contact_phone, similarity_score, etc.

-- List members without vector search
SELECT * FROM get_members_by_scope(
    'group',         -- p_scope
    'group-uuid',    -- p_group_id
    'Healthcare',    -- p_industry_filter (optional)
    'clinic',        -- p_search_text (optional)
    50,              -- p_limit
    0                -- p_offset
);
-- Returns: membership_id, business_name, short_description, industry, contact_phone, total_count

-- Get detailed contact info
SELECT * FROM get_member_contact(
    'membership-uuid',  -- p_membership_id
    'group',            -- p_scope
    'group-uuid'        -- p_group_id
);
-- Returns: Full contact details including phone, email, address, etc.

-- Get industry segments with counts
SELECT * FROM get_segments_by_scope('group', 'group-uuid');
-- Returns: segment_name, industry_id, member_count
```

---

## BBB Group Configuration

The BBB group has been seeded with the following AI agent config:

```json
{
  "enabled": true,
  "activation_keywords": ["Hi BBB", "Hello BBB", "hi bbb", "hello bbb", "Namaste BBB", "namaste bbb"],
  "exit_keywords": ["Bye", "bye", "Exit", "exit", "Quit", "quit", "End", "end", "Bye BBB"],
  "welcome_message": "Namaste! Welcome to BBB Business Network. I can help you find businesses, services, and connect with members. What are you looking for?",
  "goodbye_message": "Thank you for using BBB! Say \"Hi BBB\" anytime to start again. Have a great day!",
  "session_timeout_minutes": 30,
  "default_language": "en",
  "system_prompt_override": null
}
```

---

## Session Table Schema

```sql
CREATE TABLE t_ai_agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    phone_number VARCHAR(20) NOT NULL,
    group_id UUID REFERENCES t_business_groups(id),
    channel VARCHAR(20) DEFAULT 'whatsapp',  -- 'whatsapp' | 'web' | 'chat'
    status VARCHAR(20) DEFAULT 'active',      -- 'active' | 'ended'
    context JSONB DEFAULT '{}',
    conversation_history JSONB DEFAULT '[]',
    language VARCHAR(10) DEFAULT 'en',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,                   -- NULL for WhatsApp (no expiry)
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Workflow Logic for N8N

### Flow 1: Message Received

```
1. Receive WhatsApp/Web message (phone, message_text)

2. Check for activation/exit:
   SELECT * FROM detect_group_activation(message_text);

   IF is_exit = true:
     - Call: SELECT end_ai_session(phone);
     - Reply with goodbye_message
     - END

   IF is_activation = true:
     - Get user: SELECT * FROM get_user_by_phone(phone);
     - Check access: SELECT * FROM check_phone_group_access(phone, group_id);
     - IF has_access:
       - Create session: SELECT create_ai_session(user_id, phone, group_id, 'whatsapp', 'en');
       - Reply with welcome_message
     - ELSE:
       - Reply: "Sorry, you don't have access to this group."
     - END

3. Check for existing session:
   SELECT * FROM get_ai_session(phone);

   IF no session:
     - Reply: "Please say 'Hi BBB' to start a conversation."
     - END

4. Process user query:
   - Update session context
   - Generate embedding for user query (using OpenAI/etc)
   - Search: SELECT * FROM scoped_member_search(query, embedding, 'group', group_id, 5, 0.5);
   - Format results
   - Update history: SELECT update_ai_session(session_id, context, language, message_json);
   - Reply with results
```

### Flow 2: Get Contact Details

```
1. User requests contact for a specific business

2. Get contact:
   SELECT * FROM get_member_contact(membership_id, 'group', group_id);

3. Format and reply with contact info
```

### Flow 3: List by Category

```
1. User asks "show me healthcare businesses"

2. Get segments:
   SELECT * FROM get_segments_by_scope('group', group_id);

3. Search by industry:
   SELECT * FROM get_members_by_scope('group', group_id, 'Healthcare', NULL, 10, 0);

4. Reply with list
```

---

## Key Design Decisions

1. **RBAC**: Uses existing `t_group_memberships` table. No new access tables created.

2. **Session Expiry**:
   - WhatsApp: No expiry (`expires_at = NULL`)
   - Web/Chat: 30 minutes

3. **History Limit**: Last 10 messages stored in `conversation_history`

4. **Phone Matching**: Flexible matching handles +91, 91, or raw 10-digit numbers

5. **Scope**:
   - `group`: Search within specific group only
   - `product`: Search across all groups (admin only)

---

## Testing Queries

```sql
-- Test 1: Activation detection
SELECT * FROM detect_group_activation('Hi BBB');

-- Test 2: Exit detection
SELECT * FROM detect_group_activation('Bye');

-- Test 3: List AI-enabled groups
SELECT * FROM get_ai_enabled_groups();

-- Test 4: User lookup (use real phone from t_user_profiles)
SELECT * FROM get_user_by_phone('+919876543210');

-- Test 5: Access check
SELECT * FROM check_phone_group_access('+919876543210', (SELECT id FROM t_business_groups WHERE group_name = 'BBB'));

-- Test 6: Member search (text-based, no embedding)
SELECT * FROM get_members_by_scope('group', (SELECT id FROM t_business_groups WHERE group_name = 'BBB'), NULL, NULL, 10, 0);

-- Test 7: Industry segments
SELECT * FROM get_segments_by_scope('group', (SELECT id FROM t_business_groups WHERE group_name = 'BBB'));
```

---

## What N8N Needs to Implement

1. **WhatsApp Webhook Handler**: Receive messages, extract phone and text

2. **OpenAI/Embedding Integration**: Generate embeddings for search queries

3. **Response Formatting**: Format search results for WhatsApp/Web

4. **LLM Integration**: Use GPT to understand intent and generate natural responses

5. **Session Context Management**: Track conversation flow (initial greeting, search, get contact, etc.)

---

## Environment Variables Needed

For N8N workflows:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Service role key (for RPC calls)
- `OPENAI_API_KEY`: For embeddings and LLM
- `WHATSAPP_API_*`: WhatsApp Business API credentials

---

## Questions for Charan

1. Which embedding model should N8N use? (text-embedding-ada-002 or newer?)
2. What's the WhatsApp Business API provider? (Twilio, MessageBird, etc.)
3. Should the AI use GPT-4 or GPT-3.5-turbo for responses?

---

**End of Handover**
