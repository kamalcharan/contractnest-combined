-- jtd-nucleus/028 — propagate a registry change to existing tenant rows.
-- APPLIED LIVE 2026-09-19. Source of record.
--
-- Before per-tenant seeding, wiring a global template row reached every tenant
-- instantly through the fallback. Once a tenant owns a row, the tenant row
-- WINS and the global change reaches nobody. This closes that gap.
--
-- Asymmetric by design:
--   COPY FIELDS (name, description, subject, content, content_html, variables,
--   version) are ALWAYS refreshed. The admin surface cannot edit them —
--   UpdateTemplateRequest allows only provider_template_id and is_active — so
--   any difference is registry drift, never a tenant's choice. `variables`
--   especially MUST track the registry: it is the declared order the worker
--   uses to build body_1..N, and drift there sends scrambled parameters.
--
--   provider_template_id is only FILLED when the tenant's is NULL. A non-NULL
--   value is a deliberate remap to the tenant's own MSG91 template — the whole
--   point of a per-tenant row — so it is never overwritten, only reported.
--
--   is_active is never touched. Nothing is ever deleted. Closed tenants are
--   skipped. p_dry_run reports the same counts without writing.

CREATE OR REPLACE FUNCTION public.fn_jtd_template_sync(p_tenant uuid DEFAULT NULL,
                                                       p_dry_run boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS
$f$
DECLARE v_copy int := 0; v_wire int := 0; v_conflict int := 0;
BEGIN
  SELECT count(*) INTO v_conflict
    FROM n_jtd_templates t JOIN t_tenants tn ON tn.id = t.tenant_id
    JOIN n_jtd_templates r ON r.tenant_id IS NULL AND r.is_active
      AND r.source_type_code = t.source_type_code AND r.channel_code = t.channel_code
   WHERE t.tenant_id IS NOT NULL AND t.is_active AND COALESCE(tn.status,'') <> 'closed'
     AND (p_tenant IS NULL OR t.tenant_id = p_tenant)
     AND t.provider_template_id IS NOT NULL
     AND t.provider_template_id IS DISTINCT FROM r.provider_template_id;

  IF p_dry_run THEN
    SELECT count(*) FILTER (WHERE t.name IS DISTINCT FROM r.name
           OR t.description IS DISTINCT FROM r.description OR t.subject IS DISTINCT FROM r.subject
           OR t.content IS DISTINCT FROM r.content OR t.content_html IS DISTINCT FROM r.content_html
           OR t.variables IS DISTINCT FROM r.variables OR t.version IS DISTINCT FROM COALESCE(r.version,1)),
           count(*) FILTER (WHERE t.provider_template_id IS NULL AND r.provider_template_id IS NOT NULL)
      INTO v_copy, v_wire
      FROM n_jtd_templates t JOIN t_tenants tn ON tn.id = t.tenant_id
      JOIN n_jtd_templates r ON r.tenant_id IS NULL AND r.is_active
        AND r.source_type_code = t.source_type_code AND r.channel_code = t.channel_code
     WHERE t.tenant_id IS NOT NULL AND t.is_active AND COALESCE(tn.status,'') <> 'closed'
       AND (p_tenant IS NULL OR t.tenant_id = p_tenant)
       AND r.source_type_code <> ALL (public.jtd_platform_source_types());
  ELSE
    UPDATE n_jtd_templates t
       SET name = r.name, description = r.description, subject = r.subject,
           content = r.content, content_html = r.content_html, variables = r.variables,
           version = COALESCE(r.version,1), updated_at = now()
      FROM n_jtd_templates r, t_tenants tn
     WHERE r.tenant_id IS NULL AND r.is_active
       AND r.source_type_code <> ALL (public.jtd_platform_source_types())
       AND t.tenant_id IS NOT NULL AND t.is_active
       AND tn.id = t.tenant_id AND COALESCE(tn.status,'') <> 'closed'
       AND (p_tenant IS NULL OR t.tenant_id = p_tenant)
       AND r.source_type_code = t.source_type_code AND r.channel_code = t.channel_code
       AND (t.name IS DISTINCT FROM r.name OR t.description IS DISTINCT FROM r.description
         OR t.subject IS DISTINCT FROM r.subject OR t.content IS DISTINCT FROM r.content
         OR t.content_html IS DISTINCT FROM r.content_html
         OR t.variables IS DISTINCT FROM r.variables
         OR t.version IS DISTINCT FROM COALESCE(r.version,1));
    GET DIAGNOSTICS v_copy = ROW_COUNT;

    UPDATE n_jtd_templates t
       SET provider_template_id = r.provider_template_id, updated_at = now()
      FROM n_jtd_templates r, t_tenants tn
     WHERE r.tenant_id IS NULL AND r.is_active
       AND r.source_type_code <> ALL (public.jtd_platform_source_types())
       AND t.tenant_id IS NOT NULL AND t.is_active
       AND tn.id = t.tenant_id AND COALESCE(tn.status,'') <> 'closed'
       AND (p_tenant IS NULL OR t.tenant_id = p_tenant)
       AND r.source_type_code = t.source_type_code AND r.channel_code = t.channel_code
       AND t.provider_template_id IS NULL AND r.provider_template_id IS NOT NULL;
    GET DIAGNOSTICS v_wire = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('success', true, 'dry_run', p_dry_run, 'tenant', p_tenant,
    'copy_refreshed', v_copy, 'provider_filled', v_wire,
    'provider_conflicts_left_alone', v_conflict);
END $f$;

COMMENT ON FUNCTION public.fn_jtd_template_sync(uuid, boolean) IS
  'Propagates registry changes to existing tenant template rows. Always refreshes the copy fields (which the admin surface cannot edit); only FILLS provider_template_id when the tenant has none, never overwriting a deliberate remap. Never deletes, never touches is_active, skips closed tenants. p_dry_run reports without writing.';
