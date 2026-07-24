-- ============================================================================
-- 004_get_form_equipment_tags_rpc.sql
-- ============================================================================
-- Purpose: Power an "Equipment" filter dropdown on the Admin Smart Forms
-- list. Equipment/facility tagging (m_form_templates.resource_template_id)
-- is dynamic and open-ended (grows every time a new Knowledge Tree is
-- built), unlike the fixed category/form_type enums -- so the dropdown's
-- options must come from the database, not a hardcoded list.
--
-- Returns one row per distinct resource_template_id actually present on
-- at least one form template, with its display name and how many forms
-- reference it.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_form_equipment_tags()
RETURNS TABLE (
    resource_template_id UUID,
    name VARCHAR,
    resource_type_id VARCHAR,
    form_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT
        rt.id AS resource_template_id,
        rt.name,
        rt.resource_type_id,
        COUNT(ft.id) AS form_count
    FROM m_catalog_resource_templates rt
    JOIN m_form_templates ft ON ft.resource_template_id = rt.id
    GROUP BY rt.id, rt.name, rt.resource_type_id
    ORDER BY rt.name;
$function$;
