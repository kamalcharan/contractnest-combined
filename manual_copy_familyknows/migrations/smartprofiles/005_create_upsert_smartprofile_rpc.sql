-- ============================================
-- UPSERT TENANT SMARTPROFILE RPC
-- Called by n8n /smartprofile-generate endpoint
-- Handles: profile upsert + cluster replacement
-- ============================================

CREATE OR REPLACE FUNCTION upsert_tenant_smartprofile(
    p_tenant_id UUID,
    p_profile_type TEXT DEFAULT 'seller',
    p_short_description TEXT DEFAULT NULL,
    p_embedding TEXT DEFAULT NULL,  -- PostgreSQL vector string '[0.1,0.2,...]'
    p_clusters JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_embedding vector(1536);
    v_cluster RECORD;
    v_clusters_inserted INT := 0;
BEGIN
    -- Parse embedding string to vector
    IF p_embedding IS NOT NULL AND p_embedding != '' THEN
        v_embedding := p_embedding::vector(1536);
    END IF;

    -- Upsert smartprofile
    INSERT INTO public.t_tenant_smartprofiles (
        tenant_id,
        profile_type,
        short_description,
        embedding,
        status,
        is_active,
        last_embedding_at,
        created_at,
        updated_at
    ) VALUES (
        p_tenant_id,
        COALESCE(p_profile_type, 'seller'),
        p_short_description,
        v_embedding,
        'active',
        TRUE,
        CASE WHEN v_embedding IS NOT NULL THEN NOW() ELSE NULL END,
        NOW(),
        NOW()
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
        profile_type = COALESCE(EXCLUDED.profile_type, t_tenant_smartprofiles.profile_type),
        short_description = COALESCE(EXCLUDED.short_description, t_tenant_smartprofiles.short_description),
        embedding = COALESCE(EXCLUDED.embedding, t_tenant_smartprofiles.embedding),
        status = 'active',
        is_active = TRUE,
        last_embedding_at = CASE
            WHEN EXCLUDED.embedding IS NOT NULL THEN NOW()
            ELSE t_tenant_smartprofiles.last_embedding_at
        END,
        updated_at = NOW();

    -- Delete existing clusters for this tenant
    DELETE FROM public.t_semantic_clusters
    WHERE tenant_id = p_tenant_id;

    -- Insert new clusters
    IF p_clusters IS NOT NULL AND jsonb_array_length(p_clusters) > 0 THEN
        FOR v_cluster IN SELECT * FROM jsonb_array_elements(p_clusters)
        LOOP
            INSERT INTO public.t_semantic_clusters (
                tenant_id,
                membership_id,  -- NULL for tenant-based clusters
                primary_term,
                related_terms,
                category,
                confidence_score,
                is_active,
                created_at
            ) VALUES (
                p_tenant_id,
                NULL,
                LOWER(TRIM(v_cluster.value->>'primary_term')),
                ARRAY(SELECT jsonb_array_elements_text(v_cluster.value->'related_terms')),
                COALESCE(v_cluster.value->>'category', 'Services'),
                COALESCE((v_cluster.value->>'confidence_score')::FLOAT, 0.8),
                TRUE,
                NOW()
            );
            v_clusters_inserted := v_clusters_inserted + 1;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'tenant_id', p_tenant_id,
        'profile_updated', TRUE,
        'embedding_set', v_embedding IS NOT NULL,
        'clusters_inserted', v_clusters_inserted
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', SQLERRM,
        'tenant_id', p_tenant_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_tenant_smartprofile TO service_role;
GRANT EXECUTE ON FUNCTION upsert_tenant_smartprofile TO authenticated;

COMMENT ON FUNCTION upsert_tenant_smartprofile IS 'Upserts tenant smartprofile with embedding and replaces semantic clusters. Called by n8n smartprofile-generate endpoint.';
