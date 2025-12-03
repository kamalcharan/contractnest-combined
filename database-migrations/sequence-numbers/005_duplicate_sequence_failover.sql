-- ============================================================
-- Migration: 005_duplicate_sequence_failover
-- Description: Add failover mechanism for duplicate sequence numbers
--              Appends A, B, C... suffix when duplicates are detected
-- Author: Claude
-- Date: 2025-12-03
-- ============================================================

-- ============================================================
-- FUNCTION: generate_unique_suffix
-- Purpose: Generate A, B, C... suffix based on collision count
-- Examples: 1 -> 'A', 2 -> 'B', 26 -> 'Z', 27 -> 'AA'
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_unique_suffix(
    p_collision_count INTEGER
)
RETURNS TEXT AS $$
DECLARE
    v_suffix TEXT := '';
    v_num INTEGER := p_collision_count;
    v_remainder INTEGER;
BEGIN
    IF p_collision_count <= 0 THEN
        RETURN '';
    END IF;

    -- Convert number to base-26 alphabet suffix (A=1, Z=26, AA=27, etc.)
    WHILE v_num > 0 LOOP
        v_remainder := ((v_num - 1) % 26);
        v_suffix := CHR(65 + v_remainder) || v_suffix;  -- 65 = 'A'
        v_num := (v_num - 1) / 26;
    END LOOP;

    RETURN v_suffix;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- FUNCTION: get_next_formatted_sequence_safe
-- Purpose: Get next sequence with automatic duplicate detection and suffix
-- Returns: JSON with formatted value that's guaranteed unique
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_next_formatted_sequence_safe(
    p_sequence_code TEXT,
    p_tenant_id UUID,
    p_is_live BOOLEAN DEFAULT true,
    p_table_name TEXT DEFAULT NULL,
    p_column_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_sequence_type_id UUID;
    v_next_value INTEGER;
    v_formatted TEXT;
    v_config JSONB;
    v_collision_count INTEGER := 0;
    v_unique_formatted TEXT;
    v_suffix TEXT;
    v_exists BOOLEAN;
    v_check_query TEXT;
    v_max_attempts INTEGER := 26;  -- Limit to 26 suffix attempts (A-Z)
BEGIN
    -- Get sequence_type_id from category_details by code
    SELECT cd.id, cd.form_settings
    INTO v_sequence_type_id, v_config
    FROM public.t_category_details cd
    JOIN public.t_category_master cm ON cd.category_id = cm.id
    WHERE cm.category_name = 'sequence_numbers'
      AND cd.sub_cat_name = p_sequence_code
      AND cd.tenant_id = p_tenant_id
      AND cd.is_live = p_is_live
      AND cd.is_active = true;

    IF v_sequence_type_id IS NULL THEN
        RAISE EXCEPTION 'Sequence type % not found for tenant', p_sequence_code;
    END IF;

    -- Get next value
    v_next_value := public.get_next_sequence_number(v_sequence_type_id, p_tenant_id, p_is_live);

    -- Format it
    v_formatted := public.format_sequence_number(v_sequence_type_id, v_next_value);

    -- If no table/column specified, return formatted value without collision check
    IF p_table_name IS NULL OR p_column_name IS NULL THEN
        RETURN jsonb_build_object(
            'formatted', v_formatted,
            'sequence', v_next_value,
            'prefix', COALESCE(v_config->>'prefix', ''),
            'separator', COALESCE(v_config->>'separator', ''),
            'suffix', COALESCE(v_config->>'suffix', ''),
            'collision_suffix', '',
            'collision_count', 0
        );
    END IF;

    -- Check for duplicates and generate unique suffix if needed
    v_unique_formatted := v_formatted;
    v_collision_count := 0;

    LOOP
        -- Check if this formatted value already exists in the target table
        v_check_query := format(
            'SELECT EXISTS(SELECT 1 FROM %I WHERE %I = $1 AND tenant_id = $2 AND is_live = $3)',
            p_table_name,
            p_column_name
        );

        EXECUTE v_check_query INTO v_exists USING v_unique_formatted, p_tenant_id, p_is_live;

        -- If not exists, we found a unique value
        IF NOT v_exists THEN
            EXIT;
        END IF;

        -- Increment collision count and try with suffix
        v_collision_count := v_collision_count + 1;

        IF v_collision_count > v_max_attempts THEN
            RAISE EXCEPTION 'Unable to generate unique sequence after % attempts. Base: %', v_max_attempts, v_formatted;
        END IF;

        -- Generate suffix (A, B, C, ..., Z)
        v_suffix := public.generate_unique_suffix(v_collision_count);
        v_unique_formatted := v_formatted || '-' || v_suffix;

        -- Log the collision for monitoring
        RAISE NOTICE 'Sequence collision detected for %. Trying: %', v_formatted, v_unique_formatted;
    END LOOP;

    RETURN jsonb_build_object(
        'formatted', v_unique_formatted,
        'base_formatted', v_formatted,
        'sequence', v_next_value,
        'prefix', COALESCE(v_config->>'prefix', ''),
        'separator', COALESCE(v_config->>'separator', ''),
        'suffix', COALESCE(v_config->>'suffix', ''),
        'collision_suffix', CASE WHEN v_collision_count > 0 THEN v_suffix ELSE '' END,
        'collision_count', v_collision_count
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: check_sequence_uniqueness
-- Purpose: Helper function to check if a sequence value exists
-- Returns: Boolean indicating if the value exists
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_sequence_uniqueness(
    p_table_name TEXT,
    p_column_name TEXT,
    p_value TEXT,
    p_tenant_id UUID,
    p_is_live BOOLEAN DEFAULT true,
    p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
    v_query TEXT;
BEGIN
    IF p_exclude_id IS NOT NULL THEN
        v_query := format(
            'SELECT EXISTS(SELECT 1 FROM %I WHERE %I = $1 AND tenant_id = $2 AND is_live = $3 AND id != $4)',
            p_table_name,
            p_column_name
        );
        EXECUTE v_query INTO v_exists USING p_value, p_tenant_id, p_is_live, p_exclude_id;
    ELSE
        v_query := format(
            'SELECT EXISTS(SELECT 1 FROM %I WHERE %I = $1 AND tenant_id = $2 AND is_live = $3)',
            p_table_name,
            p_column_name
        );
        EXECUTE v_query INTO v_exists USING p_value, p_tenant_id, p_is_live;
    END IF;

    RETURN v_exists;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: generate_unique_sequence_for_contact
-- Purpose: Specialized function for generating unique contact numbers
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_unique_sequence_for_contact(
    p_tenant_id UUID,
    p_is_live BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
BEGIN
    RETURN public.get_next_formatted_sequence_safe(
        'CONTACT',
        p_tenant_id,
        p_is_live,
        't_contacts',
        'contact_number'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: generate_unique_sequence_for_contract
-- Purpose: Specialized function for generating unique contract numbers
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_unique_sequence_for_contract(
    p_tenant_id UUID,
    p_is_live BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
BEGIN
    RETURN public.get_next_formatted_sequence_safe(
        'CONTRACT',
        p_tenant_id,
        p_is_live,
        't_contracts',
        'contract_number'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: generate_unique_sequence_for_invoice
-- Purpose: Specialized function for generating unique invoice numbers
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_unique_sequence_for_invoice(
    p_tenant_id UUID,
    p_is_live BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
BEGIN
    RETURN public.get_next_formatted_sequence_safe(
        'INVOICE',
        p_tenant_id,
        p_is_live,
        't_invoices',
        'invoice_number'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON FUNCTION public.generate_unique_suffix IS
'Generates alphabetic suffix (A, B, C... Z, AA, AB...) for handling sequence collisions';

COMMENT ON FUNCTION public.get_next_formatted_sequence_safe IS
'Gets next sequence number with automatic collision detection and suffix generation.
If a duplicate is found in the target table, appends -A, -B, etc. up to -Z.
Use this function when inserting records to ensure unique sequence numbers.';

COMMENT ON FUNCTION public.check_sequence_uniqueness IS
'Helper function to check if a sequence value already exists in a table';

COMMENT ON FUNCTION public.generate_unique_sequence_for_contact IS
'Convenience wrapper for generating unique contact numbers with collision handling';

COMMENT ON FUNCTION public.generate_unique_sequence_for_contract IS
'Convenience wrapper for generating unique contract numbers with collision handling';

COMMENT ON FUNCTION public.generate_unique_sequence_for_invoice IS
'Convenience wrapper for generating unique invoice numbers with collision handling';

-- ============================================================
-- EXAMPLE USAGE
-- ============================================================

/*
-- Basic usage without collision checking (original behavior):
SELECT public.get_next_formatted_sequence('CONTACT', '70f8eb69-9ccf-4a0c-8177-cb6131934344', true);
-- Returns: {"formatted": "CT-1001", "sequence": 1001, ...}

-- Safe usage WITH collision checking:
SELECT public.get_next_formatted_sequence_safe(
    'CONTACT',
    '70f8eb69-9ccf-4a0c-8177-cb6131934344',
    true,
    't_contacts',
    'contact_number'
);
-- If CT-1001 exists, returns: {"formatted": "CT-1001-A", "collision_count": 1, ...}
-- If CT-1001-A exists too, returns: {"formatted": "CT-1001-B", "collision_count": 2, ...}

-- Convenience wrapper for contacts:
SELECT public.generate_unique_sequence_for_contact(
    '70f8eb69-9ccf-4a0c-8177-cb6131934344',
    true
);

-- Test suffix generation:
SELECT public.generate_unique_suffix(1);  -- Returns 'A'
SELECT public.generate_unique_suffix(26); -- Returns 'Z'
SELECT public.generate_unique_suffix(27); -- Returns 'AA'
SELECT public.generate_unique_suffix(702); -- Returns 'ZZ'
*/
