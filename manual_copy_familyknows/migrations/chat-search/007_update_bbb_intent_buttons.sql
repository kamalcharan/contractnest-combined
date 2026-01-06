-- ============================================
-- UPDATE BBB GROUP WITH CHAT INTENT BUTTONS
-- Adds RBAC-enabled intent_buttons to BBB settings
-- ============================================

-- ============================================
-- 1. UPDATE BBB GROUP SETTINGS
-- Adds settings.chat with intent_buttons
-- Preserves existing whatsapp config values
-- ============================================

UPDATE t_business_groups
SET settings = settings || jsonb_build_object(
    'chat', jsonb_build_object(
        'trigger_phrase', COALESCE(settings->'whatsapp'->>'trigger_phrase', 'Hi BBB'),
        'exit_phrase', COALESCE(settings->'whatsapp'->>'exit_phrase', 'Exit BBB'),
        'bot_enabled', COALESCE((settings->'whatsapp'->>'bot_enabled')::BOOLEAN, TRUE),
        'welcome_message', 'Welcome to BBB Business Directory! How can I help you find what you''re looking for?',
        'goodbye_message', 'Thank you for using BBB Directory! Have a great day!',
        'intent_buttons', '[
            {
                "intent_code": "search_offering",
                "label": "Who is into?",
                "icon": "search",
                "prompt": "What product or service are you looking for?",
                "enabled": true,
                "roles": ["admin", "member", "guest"],
                "channels": ["web", "mobile", "whatsapp", "chatbot"],
                "scopes": ["group"],
                "max_results": 10
            },
            {
                "intent_code": "search_segment",
                "label": "Find by segment",
                "icon": "category",
                "prompt": "Which industry segment?",
                "enabled": true,
                "roles": ["admin", "member"],
                "channels": ["web", "mobile", "whatsapp", "chatbot"],
                "scopes": ["group"],
                "max_results": 10
            },
            {
                "intent_code": "member_lookup",
                "label": "Member lookup",
                "icon": "person",
                "prompt": "Enter member or company name:",
                "enabled": true,
                "roles": ["admin", "member"],
                "channels": ["web", "mobile", "whatsapp", "chatbot"],
                "scopes": ["group"],
                "max_results": 10
            },
            {
                "intent_code": "about_group",
                "label": "About BBB",
                "icon": "info",
                "prompt": null,
                "enabled": true,
                "roles": ["admin", "member", "guest"],
                "channels": ["web", "mobile", "whatsapp", "chatbot"],
                "scopes": ["group"],
                "max_results": 1
            },
            {
                "intent_code": "list_all",
                "label": "Show all members",
                "icon": "list",
                "prompt": null,
                "enabled": true,
                "roles": ["admin", "member"],
                "channels": ["web", "mobile"],
                "scopes": ["group"],
                "max_results": 20
            },
            {
                "intent_code": "export",
                "label": "Export",
                "icon": "download",
                "prompt": null,
                "enabled": true,
                "roles": ["admin"],
                "channels": ["web"],
                "scopes": ["group"],
                "max_results": 1000
            }
        ]'::JSONB
    )
)
WHERE group_name = 'BBB';

-- ============================================
-- 2. VERIFICATION QUERIES
-- ============================================

-- Verify BBB chat config
-- SELECT
--     group_name,
--     settings->'chat'->'trigger_phrase' as trigger,
--     settings->'chat'->'welcome_message' as welcome,
--     jsonb_array_length(settings->'chat'->'intent_buttons') as intent_count
-- FROM t_business_groups
-- WHERE group_name = 'BBB';

-- Verify intent_buttons structure
-- SELECT
--     group_name,
--     jsonb_pretty(settings->'chat'->'intent_buttons') as intent_buttons
-- FROM t_business_groups
-- WHERE group_name = 'BBB';

-- Test resolved intents for member on whatsapp
-- SELECT get_resolved_intents(
--     (SELECT id FROM t_business_groups WHERE group_name = 'BBB'),
--     'member',
--     'whatsapp'
-- );

-- Test resolved intents for guest on web
-- SELECT get_resolved_intents(
--     (SELECT id FROM t_business_groups WHERE group_name = 'BBB'),
--     'guest',
--     'web'
-- );

-- Test check_intent_permission
-- SELECT * FROM check_intent_permission(
--     (SELECT id FROM t_business_groups WHERE group_name = 'BBB'),
--     'export',
--     'member',
--     'web',
--     'group'
-- );
-- Expected: is_allowed=FALSE, denial_reason='Role not permitted for this intent'
