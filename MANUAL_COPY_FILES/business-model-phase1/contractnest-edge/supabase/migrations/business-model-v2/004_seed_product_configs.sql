-- ============================================================
-- Migration: 004_seed_product_configs
-- Description: Seed product configurations for all 3 products
-- Author: Claude Code Session
-- Date: 2025-01-11
-- Phase: 1 - Schema & Product Configs (Deliverable 4)
-- ============================================================

-- ============================================================
-- PRODUCTS TO SEED
-- ============================================================
-- 1. ContractNest - Composite billing (base + usage + credits + addons)
-- 2. FamilyKnows  - Tiered family billing (free + paid tiers)
-- 3. Kaladristi   - Subscription + Usage billing
-- ============================================================


-- ============================================================
-- 1. CONTRACTNEST PRODUCT CONFIG
-- ============================================================

INSERT INTO public.t_bm_product_config (
    product_code,
    product_name,
    description,
    billing_config,
    is_active,
    created_at,
    updated_at
) VALUES (
    'contractnest',
    'ContractNest',
    'Contract management SaaS platform with composite billing model',
    '{
        "billing_model": "composite",
        "billing_cycles": ["quarterly", "annual"],

        "base_fee": {
            "description": "Platform access fee",
            "included_users": 2,
            "tiers": [
                { "users_from": 1, "users_to": 2, "monthly_amount": 500 },
                { "users_from": 3, "users_to": 5, "monthly_amount": 750 },
                { "users_from": 6, "users_to": 10, "monthly_amount": 1200 },
                { "users_from": 11, "users_to": null, "per_user_amount": 100 }
            ]
        },

        "storage": {
            "included_mb": 40,
            "overage_per_mb": 0.50
        },

        "contracts": {
            "description": "Per contract charge",
            "base_price": 150,
            "standalone_price": 250,
            "with_rfp_price": 250,
            "tiers": [
                { "from": 1, "to": 50, "price": 150 },
                { "from": 51, "to": 200, "price": 120 },
                { "from": 201, "to": null, "price": 100 }
            ]
        },

        "credits": {
            "notification": {
                "name": "Notification Credits",
                "description": "Credits for WhatsApp, SMS, Email notifications",
                "channels": ["whatsapp", "sms", "email"],
                "included_per_contract": 10,
                "configurable_expiry": true,
                "default_low_threshold": 20
            }
        },

        "usage_metrics": {
            "users": {
                "name": "Active Users",
                "description": "Number of active users in the tenant",
                "aggregation": "max",
                "billing_type": "tiered"
            },
            "storage_mb": {
                "name": "Storage Usage",
                "description": "Storage used in MB",
                "aggregation": "max",
                "billing_type": "overage"
            },
            "contracts_created": {
                "name": "Contracts Created",
                "description": "Number of contracts created",
                "aggregation": "sum",
                "billing_type": "tiered"
            },
            "notifications_sent": {
                "name": "Notifications Sent",
                "description": "Notifications sent (WhatsApp, SMS, Email)",
                "aggregation": "sum",
                "billing_type": "credit_deduction"
            }
        },

        "addons": {
            "vani_ai": {
                "name": "VaNi AI Agent",
                "description": "AI-powered workflow automation",
                "monthly_price": 5000,
                "trial_days": 7
            }
        },

        "trial": {
            "days": 14,
            "features_included": "all"
        },

        "grace_period": {
            "days": 7,
            "access_level": "full"
        }
    }'::JSONB,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (product_code) DO UPDATE SET
    product_name = EXCLUDED.product_name,
    description = EXCLUDED.description,
    billing_config = EXCLUDED.billing_config,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();


-- ============================================================
-- 2. FAMILYKNOWS PRODUCT CONFIG
-- ============================================================

INSERT INTO public.t_bm_product_config (
    product_code,
    product_name,
    description,
    billing_config,
    is_active,
    created_at,
    updated_at
) VALUES (
    'familyknows',
    'FamilyKnows',
    'Family asset and document management app with tiered pricing',
    '{
        "billing_model": "tiered_family",
        "billing_cycles": ["quarterly"],

        "free_tier": {
            "name": "Free",
            "users": 1,
            "assets_limit": 25,
            "price": 0
        },

        "paid_tiers": [
            {
                "tier_code": "individual",
                "name": "Individual",
                "users": 1,
                "assets_limit": null,
                "quarterly_price": 75
            },
            {
                "tier_code": "family_4",
                "name": "Family of 4",
                "users": 4,
                "assets_limit": null,
                "monthly_price": 200
            },
            {
                "tier_code": "extended_family",
                "name": "Extended Family",
                "users": 10,
                "assets_limit": null,
                "monthly_price": 400
            }
        ],

        "usage_metrics": {
            "family_members": {
                "name": "Family Members",
                "description": "Number of family members in account",
                "aggregation": "max",
                "billing_type": "tier_selection"
            },
            "assets_stored": {
                "name": "Assets Stored",
                "description": "Number of assets/documents stored",
                "aggregation": "max",
                "billing_type": "limit_check"
            }
        },

        "addons": {
            "ai_assistant": {
                "name": "AI Family Assistant",
                "description": "AI-powered family management assistant",
                "monthly_price": 100
            }
        },

        "trial": {
            "days": 14,
            "features_included": "all"
        },

        "grace_period": {
            "days": 7,
            "access_level": "read_only"
        }
    }'::JSONB,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (product_code) DO UPDATE SET
    product_name = EXCLUDED.product_name,
    description = EXCLUDED.description,
    billing_config = EXCLUDED.billing_config,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();


-- ============================================================
-- 3. KALADRISTI PRODUCT CONFIG
-- ============================================================

INSERT INTO public.t_bm_product_config (
    product_code,
    product_name,
    description,
    billing_config,
    is_active,
    created_at,
    updated_at
) VALUES (
    'kaladristi',
    'Kaladristi',
    'Stock research and AI analysis platform with subscription + usage billing',
    '{
        "billing_model": "subscription_plus_usage",
        "billing_cycles": ["monthly"],

        "base_subscription": {
            "name": "Basic Dashboard",
            "monthly_price": 100,
            "includes": ["dashboard", "basic_reports", "alerts"]
        },

        "usage_charges": {
            "ai_research_report": {
                "name": "AI Research Report",
                "description": "Per AI-generated stock research report",
                "price": 50
            }
        },

        "credits": {
            "ai_report": {
                "name": "AI Report Credits",
                "description": "Credits for AI-generated research reports",
                "default_low_threshold": 5,
                "configurable_expiry": false
            }
        },

        "usage_metrics": {
            "ai_reports_generated": {
                "name": "AI Reports Generated",
                "description": "Number of AI research reports generated",
                "aggregation": "sum",
                "billing_type": "per_unit"
            },
            "dashboard_views": {
                "name": "Dashboard Views",
                "description": "Number of dashboard views (for analytics)",
                "aggregation": "sum",
                "billing_type": "free"
            }
        },

        "trial": {
            "days": 7,
            "includes_reports": 2
        },

        "grace_period": {
            "days": 3,
            "access_level": "read_only"
        }
    }'::JSONB,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (product_code) DO UPDATE SET
    product_name = EXCLUDED.product_name,
    description = EXCLUDED.description,
    billing_config = EXCLUDED.billing_config,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();


-- ============================================================
-- 4. SEED TOPUP PACKS FOR CONTRACTNEST
-- ============================================================

-- Notification topup packs for ContractNest
INSERT INTO public.t_bm_topup_pack (
    product_code,
    credit_type,
    pack_name,
    quantity,
    price,
    currency,
    validity_days,
    is_active,
    created_at,
    updated_at
) VALUES
    -- WhatsApp notification packs
    ('contractnest', 'notification', 'WhatsApp 50 Pack', 50, 200.00, 'INR', NULL, true, NOW(), NOW()),
    ('contractnest', 'notification', 'WhatsApp 200 Pack', 200, 700.00, 'INR', NULL, true, NOW(), NOW()),
    ('contractnest', 'notification', 'WhatsApp 500 Pack', 500, 1500.00, 'INR', NULL, true, NOW(), NOW()),

    -- SMS notification packs
    ('contractnest', 'notification', 'SMS 100 Pack', 100, 150.00, 'INR', NULL, true, NOW(), NOW()),
    ('contractnest', 'notification', 'SMS 500 Pack', 500, 650.00, 'INR', NULL, true, NOW(), NOW()),

    -- Email notification packs
    ('contractnest', 'notification', 'Email 500 Pack', 500, 100.00, 'INR', NULL, true, NOW(), NOW()),
    ('contractnest', 'notification', 'Email 2000 Pack', 2000, 350.00, 'INR', NULL, true, NOW(), NOW())
ON CONFLICT DO NOTHING;


-- ============================================================
-- 5. SEED TOPUP PACKS FOR KALADRISTI
-- ============================================================

INSERT INTO public.t_bm_topup_pack (
    product_code,
    credit_type,
    pack_name,
    quantity,
    price,
    currency,
    validity_days,
    is_active,
    created_at,
    updated_at
) VALUES
    ('kaladristi', 'ai_report', 'AI Report 5 Pack', 5, 200.00, 'INR', 90, true, NOW(), NOW()),
    ('kaladristi', 'ai_report', 'AI Report 10 Pack', 10, 375.00, 'INR', 90, true, NOW(), NOW()),
    ('kaladristi', 'ai_report', 'AI Report 25 Pack', 25, 875.00, 'INR', 180, true, NOW(), NOW())
ON CONFLICT DO NOTHING;


-- ============================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================
--
-- -- Check product configs
-- SELECT product_code, product_name, billing_config->>'billing_model' as billing_model, is_active
-- FROM t_bm_product_config;
--
-- -- Check ContractNest billing config
-- SELECT billing_config->'base_fee'->'tiers'
-- FROM t_bm_product_config
-- WHERE product_code = 'contractnest';
--
-- -- Check topup packs
-- SELECT product_code, credit_type, pack_name, quantity, price
-- FROM t_bm_topup_pack
-- ORDER BY product_code, credit_type, quantity;
--
-- ============================================================


-- ============================================================
-- MIGRATION 004 COMPLETE - Product Configs Seeded
-- ============================================================
--
-- Products configured:
--   1. ContractNest (composite billing)
--      - Base fee with user tiers
--      - Storage overage
--      - Contract tiered pricing
--      - VaNi AI addon
--      - Notification credits (WhatsApp, SMS, Email)
--
--   2. FamilyKnows (tiered family billing)
--      - Free tier (1 user, 25 assets)
--      - Individual, Family of 4, Extended Family tiers
--      - AI Family Assistant addon
--
--   3. Kaladristi (subscription + usage)
--      - Base subscription ₹100/month
--      - AI Report usage at ₹50/report
--      - AI Report credit packs
--
-- Topup Packs created:
--   - ContractNest: 7 notification packs (WhatsApp, SMS, Email)
--   - Kaladristi: 3 AI report packs
-- ============================================================
