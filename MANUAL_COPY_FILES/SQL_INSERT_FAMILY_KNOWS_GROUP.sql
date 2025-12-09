-- ============================================
-- INSERT FAMILY KNOWS GROUP
-- Run this in Supabase SQL Editor
-- ============================================

-- Insert Family Knows Group
INSERT INTO t_business_groups (
    group_name,
    group_type,
    description,
    admin_tenant_id,
    settings,
    member_count,
    is_active
) VALUES (
    'Family Knows',
    'family_network',
    'Family Knows - A private family network for sharing knowledge, resources, and staying connected. AI-powered search helps family members discover each other''s expertise and services.',
    NULL, -- Will be set once first admin joins
    '{
        "chapter": "Family",
        "branch": "familyknows",
        "city": "Global",
        "state": "Worldwide",
        "access": {
            "type": "password",
            "user_password": "family2025",
            "admin_password": "familyadmin2025"
        },
        "profile_fields": {
            "required": ["short_description"],
            "optional": ["mobile_number", "website_url", "expertise"],
            "ai_features": ["enhancement", "keyword_extraction", "semantic_clustering"]
        },
        "search_config": {
            "enabled": true,
            "search_type": "hybrid",
            "similarity_threshold": 0.7,
            "max_results": 10,
            "cache_enabled": true,
            "cache_ttl_days": 30
        },
        "features": {
            "whatsapp_integration": true,
            "website_scraping": true,
            "ai_enhancement": true,
            "semantic_search": true,
            "admin_dashboard": true
        },
        "onboarding": {
            "generation_methods": ["manual", "website"],
            "auto_approve": true,
            "require_admin_review": false
        },
        "whatsapp": {
            "trigger_phrase": "Hi Family",
            "exit_phrase": "Exit Family",
            "bot_enabled": true
        },
        "branding": {
            "primary_color": "#059669",
            "secondary_color": "#10B981",
            "logo_url": null
        },
        "contact": {
            "admin_name": null,
            "admin_phone": null,
            "support_email": "family@contractnest.com"
        },
        "stats": {
            "founded_date": "2025-01-01",
            "target_members": 50,
            "current_focus": "Family Services, Knowledge Sharing, Resource Pooling"
        }
    }'::jsonb,
    0, -- Initial member count
    true
)
ON CONFLICT (group_name) DO NOTHING;

-- Verify insertion
SELECT id, group_name, group_type, is_active
FROM t_business_groups
WHERE group_name = 'Family Knows';
