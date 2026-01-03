-- ============================================================================
-- CATALOG STUDIO: Seed Block Types into Master Data
-- ============================================================================
-- Purpose: Insert block types into m_category_master and m_category_details
-- This ensures the useBlockTypes hook can fetch block types from the database
--
-- Category: cat_block_type
-- Details: service, spare, billing, text, video, image, checklist, document
-- ============================================================================

-- ============================================================================
-- 1. INSERT INTO m_category_master
-- ============================================================================

INSERT INTO m_category_master (
    id,
    category_name,
    display_name,
    description,
    icon_name,
    sequence_no,
    is_active
)
VALUES (
    uuid_generate_v4(),
    'cat_block_type',
    'Block Types',
    'Types of blocks available in Catalog Studio',
    'Blocks',
    100,
    true
)
ON CONFLICT (category_name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon_name = EXCLUDED.icon_name,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ============================================================================
-- 2. INSERT INTO m_category_details
-- ============================================================================

DO $$
DECLARE
    v_category_id UUID;
BEGIN
    -- Get the category_id for cat_block_type
    SELECT id INTO v_category_id
    FROM m_category_master
    WHERE category_name = 'cat_block_type';

    IF v_category_id IS NULL THEN
        RAISE EXCEPTION 'cat_block_type category not found in m_category_master';
    END IF;

    -- Insert block type details with UPSERT logic
    -- Using sub_cat_name as the unique identifier within a category

    -- 1. Service Block
    INSERT INTO m_category_details (
        id, category_id, sub_cat_name, display_name, description,
        icon_name, hexcolor, sequence_no, is_active, is_deletable
    )
    VALUES (
        uuid_generate_v4(), v_category_id, 'service', 'Service',
        'Deliverable work items with SLA, duration, and evidence requirements',
        'Briefcase', '#4F46E5', 1, true, false
    )
    ON CONFLICT (category_id, sub_cat_name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        icon_name = EXCLUDED.icon_name,
        hexcolor = EXCLUDED.hexcolor,
        sequence_no = EXCLUDED.sequence_no,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

    -- 2. Spare Part Block
    INSERT INTO m_category_details (
        id, category_id, sub_cat_name, display_name, description,
        icon_name, hexcolor, sequence_no, is_active, is_deletable
    )
    VALUES (
        uuid_generate_v4(), v_category_id, 'spare', 'Spare Part',
        'Physical products with SKU, inventory tracking, and warranty',
        'Package', '#059669', 2, true, false
    )
    ON CONFLICT (category_id, sub_cat_name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        icon_name = EXCLUDED.icon_name,
        hexcolor = EXCLUDED.hexcolor,
        sequence_no = EXCLUDED.sequence_no,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

    -- 3. Billing Block
    INSERT INTO m_category_details (
        id, category_id, sub_cat_name, display_name, description,
        icon_name, hexcolor, sequence_no, is_active, is_deletable
    )
    VALUES (
        uuid_generate_v4(), v_category_id, 'billing', 'Billing',
        'Payment structures - EMI, milestone, advance, postpaid, subscription',
        'CreditCard', '#D97706', 3, true, false
    )
    ON CONFLICT (category_id, sub_cat_name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        icon_name = EXCLUDED.icon_name,
        hexcolor = EXCLUDED.hexcolor,
        sequence_no = EXCLUDED.sequence_no,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

    -- 4. Text Block
    INSERT INTO m_category_details (
        id, category_id, sub_cat_name, display_name, description,
        icon_name, hexcolor, sequence_no, is_active, is_deletable
    )
    VALUES (
        uuid_generate_v4(), v_category_id, 'text', 'Text',
        'Terms, conditions, policies, and formatted text content',
        'FileText', '#6B7280', 4, true, false
    )
    ON CONFLICT (category_id, sub_cat_name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        icon_name = EXCLUDED.icon_name,
        hexcolor = EXCLUDED.hexcolor,
        sequence_no = EXCLUDED.sequence_no,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

    -- 5. Video Block
    INSERT INTO m_category_details (
        id, category_id, sub_cat_name, display_name, description,
        icon_name, hexcolor, sequence_no, is_active, is_deletable
    )
    VALUES (
        uuid_generate_v4(), v_category_id, 'video', 'Video',
        'Embedded video content from YouTube, Vimeo, or direct upload',
        'Video', '#DC2626', 5, true, false
    )
    ON CONFLICT (category_id, sub_cat_name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        icon_name = EXCLUDED.icon_name,
        hexcolor = EXCLUDED.hexcolor,
        sequence_no = EXCLUDED.sequence_no,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

    -- 6. Image Block
    INSERT INTO m_category_details (
        id, category_id, sub_cat_name, display_name, description,
        icon_name, hexcolor, sequence_no, is_active, is_deletable
    )
    VALUES (
        uuid_generate_v4(), v_category_id, 'image', 'Image',
        'Photos, diagrams, galleries, and visual content',
        'Image', '#7C3AED', 6, true, false
    )
    ON CONFLICT (category_id, sub_cat_name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        icon_name = EXCLUDED.icon_name,
        hexcolor = EXCLUDED.hexcolor,
        sequence_no = EXCLUDED.sequence_no,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

    -- 7. Checklist Block
    INSERT INTO m_category_details (
        id, category_id, sub_cat_name, display_name, description,
        icon_name, hexcolor, sequence_no, is_active, is_deletable
    )
    VALUES (
        uuid_generate_v4(), v_category_id, 'checklist', 'Checklist',
        'Task verification lists with optional photo evidence per item',
        'CheckSquare', '#0891B2', 7, true, false
    )
    ON CONFLICT (category_id, sub_cat_name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        icon_name = EXCLUDED.icon_name,
        hexcolor = EXCLUDED.hexcolor,
        sequence_no = EXCLUDED.sequence_no,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

    -- 8. Document Block
    INSERT INTO m_category_details (
        id, category_id, sub_cat_name, display_name, description,
        icon_name, hexcolor, sequence_no, is_active, is_deletable
    )
    VALUES (
        uuid_generate_v4(), v_category_id, 'document', 'Document',
        'File attachments, uploads, and downloadable documents',
        'Paperclip', '#64748B', 8, true, false
    )
    ON CONFLICT (category_id, sub_cat_name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        icon_name = EXCLUDED.icon_name,
        hexcolor = EXCLUDED.hexcolor,
        sequence_no = EXCLUDED.sequence_no,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

    RAISE NOTICE 'Successfully seeded % block types for category %', 8, v_category_id;
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to verify the seed data:
-- SELECT
--     m.category_name,
--     d.sub_cat_name,
--     d.display_name,
--     d.icon_name,
--     d.hexcolor,
--     d.sequence_no
-- FROM m_category_master m
-- JOIN m_category_details d ON d.category_id = m.id
-- WHERE m.category_name = 'cat_block_type'
-- ORDER BY d.sequence_no;
