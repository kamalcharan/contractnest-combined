-- ============================================================
-- Migration: 002_seed_fk_relationships
-- Description: Seed FamilyKnows relationship types (system-level)
-- Author: Claude
-- Date: 2025-01-07
-- Note: This seeds SYSTEM-LEVEL templates for relationships.
--       Per-tenant relationships are created during tenant registration.
-- ============================================================

-- ============================================================
-- 1. CREATE SYSTEM RELATIONSHIP CATEGORY (tenant_id = NULL for templates)
-- ============================================================

INSERT INTO public.t_category_master (
    id,
    category_name,
    display_name,
    description,
    is_active,
    tenant_id,
    x_product
)
VALUES (
    '00000000-0000-0000-0000-000000000100',
    'Relationships',
    'Family Relationships',
    'Template for FamilyKnows family relationship types',
    true,
    NULL,
    'familyknows'
)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- ============================================================
-- 2. SEED SYSTEM-LEVEL RELATIONSHIP TYPES (Templates)
-- ============================================================

INSERT INTO public.t_category_details (
    id,
    category_id,
    sub_cat_name,
    display_name,
    description,
    hexcolor,
    icon_name,
    sequence_no,
    is_active,
    is_deletable,
    tenant_id,
    form_settings
) VALUES
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000100', 'OWNER', 'Family Head', 'Primary owner/head of the family space', '#32e275', 'Crown', 1, true, false, NULL, '{"permissions": ["all"]}'::jsonb),
    ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000100', 'PARENT', 'Parent', 'Parent in the family (Mother/Father)', '#3B82F6', 'Users', 2, true, false, NULL, '{"permissions": ["read", "write", "invite"]}'::jsonb),
    ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000100', 'SPOUSE', 'Spouse', 'Spouse/Partner in the family', '#EC4899', 'Heart', 3, true, false, NULL, '{"permissions": ["read", "write", "invite"]}'::jsonb),
    ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000100', 'CHILD', 'Child', 'Child in the family (Son/Daughter)', '#F59E0B', 'Baby', 4, true, false, NULL, '{"permissions": ["read", "write"]}'::jsonb),
    ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000100', 'GRANDPARENT', 'Grandparent', 'Grandparent in the family', '#8B5CF6', 'UserCircle', 5, true, false, NULL, '{"permissions": ["read", "write"]}'::jsonb),
    ('00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000100', 'SIBLING', 'Sibling', 'Sibling in the family (Brother/Sister)', '#06B6D4', 'Users2', 6, true, false, NULL, '{"permissions": ["read", "write"]}'::jsonb),
    ('00000000-0000-0000-0001-000000000007', '00000000-0000-0000-0000-000000000100', 'OTHER', 'Other', 'Other family member or relative', '#64748B', 'User', 7, true, true, NULL, '{"permissions": ["read"]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    hexcolor = EXCLUDED.hexcolor,
    icon_name = EXCLUDED.icon_name,
    form_settings = EXCLUDED.form_settings;

-- ============================================================
-- 3. RPC: Copy System Relationships to Tenant
-- ============================================================

CREATE OR REPLACE FUNCTION public.copy_fk_relationships_to_tenant(
    p_tenant_id UUID,
    p_user_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
    relationship_category_id UUID,
    relationships_created INTEGER,
    owner_role_id UUID
) AS $$
DECLARE
    v_category_id UUID;
    v_relationships_count INTEGER := 0;
    v_owner_role_id UUID;
BEGIN
    SELECT id INTO v_category_id
    FROM public.t_category_master
    WHERE tenant_id = p_tenant_id AND category_name = 'Relationships';

    IF v_category_id IS NOT NULL THEN
        SELECT id INTO v_owner_role_id FROM public.t_category_details WHERE category_id = v_category_id AND sub_cat_name = 'OWNER';
        SELECT COUNT(*) INTO v_relationships_count FROM public.t_category_details WHERE category_id = v_category_id;
        RETURN QUERY SELECT v_category_id, v_relationships_count, v_owner_role_id;
        RETURN;
    END IF;

    INSERT INTO public.t_category_master (category_name, display_name, description, is_active, tenant_id, x_product)
    VALUES ('Relationships', 'Family Relationships', 'Relationship types in the family space', true, p_tenant_id, 'familyknows')
    RETURNING id INTO v_category_id;

    INSERT INTO public.t_category_details (category_id, sub_cat_name, display_name, description, hexcolor, icon_name, sequence_no, is_active, is_deletable, tenant_id, form_settings)
    SELECT v_category_id, sub_cat_name, display_name, description, hexcolor, icon_name, sequence_no, is_active, is_deletable, p_tenant_id, form_settings
    FROM public.t_category_details
    WHERE category_id = '00000000-0000-0000-0000-000000000100' AND tenant_id IS NULL;

    GET DIAGNOSTICS v_relationships_count = ROW_COUNT;

    SELECT id INTO v_owner_role_id FROM public.t_category_details WHERE category_id = v_category_id AND sub_cat_name = 'OWNER';

    IF p_user_tenant_id IS NOT NULL AND v_owner_role_id IS NOT NULL THEN
        INSERT INTO public.t_user_tenant_roles (user_tenant_id, role_id) VALUES (p_user_tenant_id, v_owner_role_id) ON CONFLICT DO NOTHING;
    END IF;

    RETURN QUERY SELECT v_category_id, v_relationships_count, v_owner_role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. RPC: Get Relationships for Tenant
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_fk_relationships(p_tenant_id UUID)
RETURNS TABLE (id UUID, code VARCHAR, name VARCHAR, description TEXT, hexcolor VARCHAR, icon_name VARCHAR, sequence_no INTEGER, permissions JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT cd.id, cd.sub_cat_name::VARCHAR, cd.display_name::VARCHAR, cd.description, cd.hexcolor::VARCHAR, cd.icon_name::VARCHAR, cd.sequence_no, cd.form_settings->'permissions'
    FROM public.t_category_details cd
    JOIN public.t_category_master cm ON cd.category_id = cm.id
    WHERE cm.tenant_id = p_tenant_id AND cm.category_name = 'Relationships' AND cd.is_active = true
    ORDER BY cd.sequence_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
