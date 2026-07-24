-- ============================================================================
-- 005_kt_service_form_map.sql
-- ============================================================================
-- Purpose: master, tenant-independent mapping of "which SmartForm belongs to
-- which KT service group" -- the missing piece that lets tenant onboarding
-- auto-attach the right form to a newly-seeded catalog block, instead of an
-- admin having to manually attach a form to every individual tenant's copy
-- of the same service.
--
-- Keyed by (resource_template_id, service_name) -- the exact same grouping
-- key ktCatBlockMapperService already uses (catalog_name || service_name)
-- when it seeds a tenant's m_cat_blocks rows from Knowledge Tree data. One
-- row per service group per equipment; a service group's form can be
-- regenerated later (upsert on the unique key), and every tenant onboarding
-- afterward picks up the latest version automatically.
-- ============================================================================

CREATE TABLE IF NOT EXISTS m_kt_service_form_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_template_id UUID NOT NULL REFERENCES m_catalog_resource_templates(id) ON DELETE CASCADE,
    service_name VARCHAR NOT NULL,
    form_template_id UUID NOT NULL REFERENCES m_form_templates(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_kt_service_form_map UNIQUE (resource_template_id, service_name)
);

CREATE INDEX IF NOT EXISTS idx_kt_service_form_map_resource_template
    ON m_kt_service_form_map (resource_template_id);
