

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "timescaledb" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE SCHEMA IF NOT EXISTS "n8n";


ALTER SCHEMA "n8n" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgroonga" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "vector";


ALTER SCHEMA "vector" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "autoinc" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "insert_username" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "isn" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_jsonschema" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgmq" WITH SCHEMA "pgmq";






CREATE EXTENSION IF NOT EXISTS "pgroonga_database" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "tiger";






CREATE EXTENSION IF NOT EXISTS "postgis_tiger_geocoder" WITH SCHEMA "tiger";






CREATE EXTENSION IF NOT EXISTS "postgis_topology" WITH SCHEMA "topology";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."t_chat_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tenant_id" "uuid",
    "channel" "text" DEFAULT 'web'::"text" NOT NULL,
    "group_id" "uuid",
    "group_name" "text",
    "intent_state" "text" DEFAULT 'IDLE'::"text" NOT NULL,
    "current_intent" "text",
    "pending_prompt" "text",
    "session_data" "jsonb" DEFAULT '{}'::"jsonb",
    "message_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_activity_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:30:00'::interval),
    CONSTRAINT "chk_intent_state" CHECK (("intent_state" = ANY (ARRAY['IDLE'::"text", 'ACTIVATED'::"text", 'AWAITING_INPUT'::"text", 'SEARCHING'::"text"])))
);


ALTER TABLE "public"."t_chat_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_chat_sessions" IS 'Chat session state for VaNi AI assistant with 30-minute sliding expiry';



CREATE OR REPLACE FUNCTION "public"."activate_group_session"("p_session_id" "uuid", "p_group_id" "uuid", "p_group_name" "text") RETURNS "public"."t_chat_sessions"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_session public.t_chat_sessions;
BEGIN
    UPDATE public.t_chat_sessions
    SET
        group_id = p_group_id,
        group_name = p_group_name,
        intent_state = 'ACTIVATED',
        current_intent = NULL,
        pending_prompt = NULL,
        last_activity_at = NOW(),
        updated_at = NOW(),
        expires_at = NOW() + INTERVAL '30 minutes'
    WHERE id = p_session_id
    RETURNING * INTO v_session;

    RETURN v_session;
END;
$$;


ALTER FUNCTION "public"."activate_group_session"("p_session_id" "uuid", "p_group_id" "uuid", "p_group_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_contact_classification"("contact_id" "uuid", "classification" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE t_contacts 
    SET classifications = classifications || to_jsonb(classification)
    WHERE id = contact_id 
    AND NOT (classifications ? classification);
END;
$$;


ALTER FUNCTION "public"."add_contact_classification"("contact_id" "uuid", "classification" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_contact_tag"("contact_id" "uuid", "tag_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE t_contacts 
    SET tags = tags || jsonb_build_array(tag_data)
    WHERE id = contact_id 
    AND NOT (tags @> jsonb_build_array(tag_data));
END;
$$;


ALTER FUNCTION "public"."add_contact_tag"("contact_id" "uuid", "tag_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."associate_service_resources"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_resource_data" "jsonb", "p_idempotency_key" character varying DEFAULT NULL::character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    v_existing_service record;
    v_result jsonb;
    v_resource record;
    v_existing_operation_id uuid;
    v_processed_resources jsonb := '[]'::jsonb;
    v_errors jsonb := '[]'::jsonb;
    v_success_count integer := 0;
    v_error_count integer := 0;
  BEGIN
    -- 1. IDEMPOTENCY CHECK
    IF p_idempotency_key IS NOT NULL THEN
      SELECT service_id INTO v_existing_operation_id
      FROM t_idempotency_keys
      WHERE idempotency_key = p_idempotency_key
        AND tenant_id = p_tenant_id
        AND operation_type = 'associate_resources'
        AND created_at > NOW() - INTERVAL '24 hours';

      IF FOUND THEN
        -- Return existing resources for this service
        RETURN jsonb_build_object(
          'success', true,
          'message', 'Resources already associated (idempotency)',
          'data', (SELECT get_service_resources(v_existing_operation_id, p_tenant_id, p_is_live))
        );
      END IF;
    END IF;

    -- 2. VALIDATE INPUT PARAMETERS
    IF p_service_id IS NULL OR p_tenant_id IS NULL OR p_user_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'service_id, tenant_id, and user_id are required',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    IF p_resource_data IS NULL OR jsonb_array_length(p_resource_data) = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'resource_data array is required and cannot be empty',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    -- 3. TRANSACTION START WITH ROW-LEVEL LOCKING
    -- Lock the service record to prevent concurrent modifications
    SELECT * INTO v_existing_service
    FROM t_catalog_items
    WHERE id = p_service_id
      AND tenant_id = p_tenant_id
      AND is_live = p_is_live
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service not found or access denied',
        'code', 'RECORD_NOT_FOUND'
      );
    END IF;

    -- 4. VALIDATE SERVICE STATUS
    IF v_existing_service.status = 'archived' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Cannot modify resources for archived service',
        'code', 'SERVICE_ARCHIVED'
      );
    END IF;

    -- 5. PROCESS RESOURCE ASSOCIATIONS WITH ERROR HANDLING
    FOR v_resource IN
      SELECT * FROM jsonb_to_recordset(p_resource_data) AS x(
        id uuid,
        resource_type_id varchar(50),
        allocation_type_id uuid,
        quantity_required integer,
        duration_hours decimal(5,2),
        unit_cost decimal(15,4),
        currency_code varchar(3),
        required_skills jsonb,
        required_attributes jsonb,
        sequence_order integer,
        is_billable boolean,
        action varchar(10) -- 'add', 'update', 'remove'
      )
    LOOP
      BEGIN
        -- SMART RECORD DETECTION AND SAFE OPERATIONS
        IF v_resource.action = 'remove' AND v_resource.id IS NOT NULL THEN
          -- Only remove explicitly marked resources with ownership check
          UPDATE t_catalog_service_resources
          SET is_active = false, updated_at = NOW()
          WHERE service_id = p_service_id
            AND id = v_resource.id
            AND tenant_id = p_tenant_id
            AND is_active = true;

          IF FOUND THEN
            v_success_count := v_success_count + 1;
            v_processed_resources := v_processed_resources || jsonb_build_object(
              'action', 'remove',
              'resource_id', v_resource.id,
              'resource_type_id', v_resource.resource_type_id,
              'status', 'success'
            );
          ELSE
            v_error_count := v_error_count + 1;
            v_errors := v_errors || jsonb_build_object(
              'action', 'remove',
              'resource_id', v_resource.id,
              'error', 'Resource association not found or already inactive'
            );
          END IF;

        ELSIF v_resource.id IS NULL OR v_resource.id::text LIKE 'temp_%' OR v_resource.action = 'add' THEN
          -- This is a new resource association
          -- Validate resource_type_id exists
          IF NOT EXISTS(SELECT 1 FROM m_catalog_resource_types WHERE id = v_resource.resource_type_id AND is_active = true) THEN
            v_error_count := v_error_count + 1;
            v_errors := v_errors || jsonb_build_object(
              'action', 'add',
              'resource_type_id', v_resource.resource_type_id,
              'error', 'Invalid resource_type_id'
            );
            CONTINUE;
          END IF;

          -- Validate allocation_type_id if provided
          IF v_resource.allocation_type_id IS NOT NULL THEN
            IF NOT EXISTS(
              SELECT 1 FROM m_category_details cd
              JOIN m_category_master cm ON cd.category_id = cm.id
              WHERE cd.id = v_resource.allocation_type_id
                AND cm.category_name = 'resource_allocation_types'
                AND cd.is_active = true
            ) THEN
              v_error_count := v_error_count + 1;
              v_errors := v_errors || jsonb_build_object(
                'action', 'add',
                'allocation_type_id', v_resource.allocation_type_id,
                'error', 'Invalid allocation_type_id'
              );
              CONTINUE;
            END IF;
          END IF;

          -- Check for duplicate resource type in same service
          IF EXISTS(
            SELECT 1 FROM t_catalog_service_resources
            WHERE service_id = p_service_id
              AND resource_type_id = v_resource.resource_type_id
              AND tenant_id = p_tenant_id
              AND is_active = true
          ) THEN
            v_error_count := v_error_count + 1;
            v_errors := v_errors || jsonb_build_object(
              'action', 'add',
              'resource_type_id', v_resource.resource_type_id,
              'error', 'Resource type already associated with this service'
            );
            CONTINUE;
          END IF;

          -- Insert new resource association
          INSERT INTO t_catalog_service_resources (
            service_id, resource_type_id, tenant_id, allocation_type_id,
            quantity_required, duration_hours, unit_cost, currency_code,
            required_skills, required_attributes, sequence_order, is_billable
          ) VALUES (
            p_service_id, v_resource.resource_type_id, p_tenant_id,
            v_resource.allocation_type_id, COALESCE(v_resource.quantity_required, 1),
            v_resource.duration_hours, v_resource.unit_cost,
            COALESCE(v_resource.currency_code, 'INR'),
            COALESCE(v_resource.required_skills, '[]'::jsonb),
            COALESCE(v_resource.required_attributes, '{}'::jsonb),
            COALESCE(v_resource.sequence_order, 0),
            COALESCE(v_resource.is_billable, true)
          );

          v_success_count := v_success_count + 1;
          v_processed_resources := v_processed_resources || jsonb_build_object(
            'action', 'add',
            'resource_type_id', v_resource.resource_type_id,
            'allocation_type_id', v_resource.allocation_type_id,
            'quantity_required', COALESCE(v_resource.quantity_required, 1),
            'status', 'success'
          );

        ELSIF v_resource.action = 'update' AND v_resource.id IS NOT NULL THEN
          -- Update existing resource association with security check
          UPDATE t_catalog_service_resources SET
            allocation_type_id = COALESCE(v_resource.allocation_type_id, allocation_type_id),
            quantity_required = COALESCE(v_resource.quantity_required, quantity_required),
            duration_hours = COALESCE(v_resource.duration_hours, duration_hours),
            unit_cost = COALESCE(v_resource.unit_cost, unit_cost),
            currency_code = COALESCE(v_resource.currency_code, currency_code),
            required_skills = CASE
              WHEN v_resource.required_skills IS NOT NULL
              THEN v_resource.required_skills
              ELSE required_skills
            END,
            required_attributes = CASE
              WHEN v_resource.required_attributes IS NOT NULL
              THEN v_resource.required_attributes
              ELSE required_attributes
            END,
            sequence_order = COALESCE(v_resource.sequence_order, sequence_order),
            is_billable = COALESCE(v_resource.is_billable, is_billable),
            updated_at = NOW()
          WHERE id = v_resource.id
            AND service_id = p_service_id
            AND tenant_id = p_tenant_id
            AND is_active = true;

          IF FOUND THEN
            v_success_count := v_success_count + 1;
            v_processed_resources := v_processed_resources || jsonb_build_object(
              'action', 'update',
              'resource_id', v_resource.id,
              'resource_type_id', v_resource.resource_type_id,
              'status', 'success'
            );
          ELSE
            v_error_count := v_error_count + 1;
            v_errors := v_errors || jsonb_build_object(
              'action', 'update',
              'resource_id', v_resource.id,
              'error', 'Resource association not found or inactive'
            );
          END IF;
        END IF;

      EXCEPTION
        WHEN OTHERS THEN
          v_error_count := v_error_count + 1;
          v_errors := v_errors || jsonb_build_object(
            'action', COALESCE(v_resource.action, 'unknown'),
            'resource_type_id', v_resource.resource_type_id,
            'error', SQLERRM
          );
      END;
    END LOOP;

    -- 6. UPDATE SERVICE RESOURCE REQUIREMENTS SUMMARY
    UPDATE t_catalog_items SET
      resource_requirements = resource_requirements || jsonb_build_object(
        'total_resources', (
          SELECT COUNT(*) FROM t_catalog_service_resources
          WHERE service_id = p_service_id AND is_active = true
        ),
        'last_updated', NOW(),
        'updated_by', p_user_id
      ),
      updated_by = p_user_id,
      updated_at = NOW()
    WHERE id = p_service_id AND tenant_id = p_tenant_id;

    -- 7. STORE IDEMPOTENCY KEY
    IF p_idempotency_key IS NOT NULL THEN
      INSERT INTO t_idempotency_keys (
        idempotency_key,
        tenant_id,
        operation_type,
        service_id,
        created_at
      ) VALUES (
        p_idempotency_key,
        p_tenant_id,
        'associate_resources',
        p_service_id,
        NOW()
      );
    END IF;

    -- 8. PREPARE RESULT
    SELECT jsonb_build_object(
      'service_id', p_service_id,
      'processed_resources', v_processed_resources,
      'errors', v_errors,
      'summary', jsonb_build_object(
        'total_processed', v_success_count + v_error_count,
        'successful', v_success_count,
        'failed', v_error_count,
        'current_total_resources', (
          SELECT COUNT(*) FROM t_catalog_service_resources
          WHERE service_id = p_service_id
            AND tenant_id = p_tenant_id
            AND is_active = true
        )
      ),
      'updated_at', NOW()
    ) INTO v_result;

    -- 9. SUCCESS RESPONSE
    RETURN jsonb_build_object(
      'success', CASE WHEN v_error_count = 0 THEN true ELSE v_success_count > 0 END,
      'data', v_result,
      'message', CASE
        WHEN v_error_count = 0 THEN 'All resource associations processed successfully'
        WHEN v_success_count = 0 THEN 'All resource associations failed'
        ELSE 'Resource associations partially processed with some errors'
      END
    );

  EXCEPTION
    WHEN lock_not_available THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service is being updated by another user. Please try again.',
        'code', 'CONCURRENT_UPDATE'
      );
    WHEN OTHERS THEN
      -- PROPER ERROR HANDLING WITH ROLLBACK
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'OPERATION_ERROR'
      );
  END;
  $$;


ALTER FUNCTION "public"."associate_service_resources"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_resource_data" "jsonb", "p_idempotency_key" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_generate_contact_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_sequence_result JSONB;
BEGIN
    -- Only generate if contact_number is not provided
    IF NEW.contact_number IS NULL OR NEW.contact_number = '' THEN
        BEGIN
            -- Get next formatted sequence
            v_sequence_result := public.get_next_formatted_sequence(
                'CONTACT',
                NEW.tenant_id,
                COALESCE(NEW.is_live, true)
            );

            NEW.contact_number := v_sequence_result->>'formatted';
        EXCEPTION WHEN OTHERS THEN
            -- If sequence generation fails (e.g., sequence not configured),
            -- log warning but don't fail the insert
            RAISE WARNING 'Could not auto-generate contact_number: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_generate_contact_number"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_generate_contact_number"() IS 'Trigger function to auto-generate contact_number on INSERT if not provided.';



CREATE OR REPLACE FUNCTION "public"."backfill_contact_numbers"("p_tenant_id" "uuid", "p_is_live" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_contact RECORD;
    v_sequence_result JSONB;
    v_count INTEGER := 0;
BEGIN
    -- Process contacts without contact_number
    FOR v_contact IN
        SELECT id, tenant_id, is_live
        FROM public.t_contacts
        WHERE tenant_id = p_tenant_id
          AND is_live = p_is_live
          AND (contact_number IS NULL OR contact_number = '')
        ORDER BY created_at ASC
    LOOP
        v_sequence_result := public.get_next_formatted_sequence(
            'CONTACT',
            v_contact.tenant_id,
            v_contact.is_live
        );

        UPDATE public.t_contacts
        SET contact_number = v_sequence_result->>'formatted'
        WHERE id = v_contact.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', p_tenant_id,
        'is_live', p_is_live,
        'contacts_updated', v_count
    );
END;
$$;


ALTER FUNCTION "public"."backfill_contact_numbers"("p_tenant_id" "uuid", "p_is_live" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."backfill_contact_numbers"("p_tenant_id" "uuid", "p_is_live" boolean) IS 'Generates contact_numbers for existing contacts that dont have one.
Call after setting up sequence_numbers for a tenant.';



CREATE OR REPLACE FUNCTION "public"."bulk_create_services"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_services_data" "jsonb", "p_idempotency_key" character varying DEFAULT NULL::character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    v_existing_operation_id uuid;
    v_service_data jsonb;
    v_service_index integer := 0;
    v_created_services jsonb := '[]'::jsonb;
    v_errors jsonb := '[]'::jsonb;
    v_success_count integer := 0;
    v_error_count integer := 0;
    v_service_result jsonb;
    v_service_id uuid;
    v_resource record;
    v_validation_errors text[];
    v_duplicate_names text[];
  BEGIN
    -- 1. IDEMPOTENCY CHECK
    IF p_idempotency_key IS NOT NULL THEN
      SELECT service_id INTO v_existing_operation_id
      FROM t_idempotency_keys
      WHERE idempotency_key = p_idempotency_key
        AND tenant_id = p_tenant_id
        AND operation_type = 'bulk_create_services'
        AND created_at > NOW() - INTERVAL '24 hours';

      IF FOUND THEN
        -- Return cached result for bulk operation
        RETURN jsonb_build_object(
          'success', true,
          'message', 'Bulk operation already completed (idempotency)',
          'data', jsonb_build_object(
            'operation_id', v_existing_operation_id,
            'status', 'completed'
          )
        );
      END IF;
    END IF;

    -- 2. VALIDATE INPUT PARAMETERS
    IF p_tenant_id IS NULL OR p_user_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'tenant_id and user_id are required',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    IF p_services_data IS NULL OR jsonb_array_length(p_services_data) = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'services_data array is required and cannot be empty',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    -- 3. VALIDATE BULK OPERATION LIMITS
    IF jsonb_array_length(p_services_data) > 100 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Bulk operation limited to 100 services maximum',
        'code', 'BULK_LIMIT_EXCEEDED'
      );
    END IF;

    -- 4. PRE-VALIDATION: CHECK FOR DUPLICATE NAMES IN BATCH
    SELECT array_agg(DISTINCT service->>'name') INTO v_duplicate_names
    FROM jsonb_array_elements(p_services_data) AS service
    WHERE service->>'name' IN (
      SELECT name FROM t_catalog_items
      WHERE tenant_id = p_tenant_id
        AND is_live = p_is_live
        AND status != 'archived'
    );

    IF array_length(v_duplicate_names, 1) > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Duplicate service names found: ' || array_to_string(v_duplicate_names, ', '),
        'code', 'DUPLICATE_NAMES',
        'duplicate_names', array_to_json(v_duplicate_names)
      );
    END IF;

    -- 5. PROCESS SERVICES IN TRANSACTION (ALL-OR-NOTHING FOR REFERENTIAL INTEGRITY)
    FOR v_service_data IN SELECT * FROM jsonb_array_elements(p_services_data)
    LOOP
      v_service_index := v_service_index + 1;

      BEGIN
        -- Reset validation errors for each service
        v_validation_errors := '{}';

        -- Basic validation for each service
        IF v_service_data->>'name' IS NULL OR trim(v_service_data->>'name') = '' THEN
          v_validation_errors := v_validation_errors || 'Service name is required';
        END IF;

        -- Validate master data references if provided
        IF v_service_data->'price_attributes'->>'pricing_type_id' IS NOT NULL THEN
          IF NOT EXISTS(
            SELECT 1 FROM m_category_details cd
            JOIN m_category_master cm ON cd.category_id = cm.id
            WHERE cd.id = (v_service_data->'price_attributes'->>'pricing_type_id')::uuid
              AND cm.category_name = 'pricing_types'
              AND cd.is_active = true
          ) THEN
            v_validation_errors := v_validation_errors || 'Invalid pricing_type_id';
          END IF;
        END IF;

        IF v_service_data->'service_attributes'->>'service_status_id' IS NOT NULL THEN
          IF NOT EXISTS(
            SELECT 1 FROM m_category_details cd
            JOIN m_category_master cm ON cd.category_id = cm.id
            WHERE cd.id = (v_service_data->'service_attributes'->>'service_status_id')::uuid
              AND cm.category_name = 'service_statuses'
              AND cd.is_active = true
          ) THEN
            v_validation_errors := v_validation_errors || 'Invalid service_status_id';
          END IF;
        END IF;

        -- If validation errors exist, add to errors array and continue
        IF array_length(v_validation_errors, 1) > 0 THEN
          v_error_count := v_error_count + 1;
          v_errors := v_errors || jsonb_build_object(
            'index', v_service_index,
            'service_name', v_service_data->>'name',
            'errors', array_to_json(v_validation_errors)
          );
          CONTINUE;
        END IF;

        -- CREATE SERVICE
        INSERT INTO t_catalog_items (
          tenant_id,
          name,
          short_description,
          description_content,
          description_format,
          type,
          industry_id,
          category_id,
          status,
          is_live,
          price_attributes,
          tax_config,
          service_attributes,
          resource_requirements,
          specifications,
          terms_content,
          terms_format,
          variant_attributes,
          metadata,
          created_by,
          updated_by
        ) VALUES (
          p_tenant_id,
          trim(v_service_data->>'name'),
          v_service_data->>'short_description',
          v_service_data->>'description_content',
          COALESCE(v_service_data->>'description_format', 'markdown'),
          COALESCE(v_service_data->>'type', 'service'),
          v_service_data->>'industry_id',
          v_service_data->>'category_id',
          COALESCE(v_service_data->>'status', 'draft'),
          p_is_live,
          COALESCE(v_service_data->'price_attributes', '{}'::jsonb),
          COALESCE(v_service_data->'tax_config', '{}'::jsonb),
          COALESCE(v_service_data->'service_attributes', '{}'::jsonb),
          COALESCE(v_service_data->'resource_requirements', '{}'::jsonb),
          COALESCE(v_service_data->'specifications', '{}'::jsonb),
          v_service_data->>'terms_content',
          COALESCE(v_service_data->>'terms_format', 'markdown'),
          COALESCE(v_service_data->'variant_attributes', '{}'::jsonb),
          COALESCE(v_service_data->'metadata', '{}'::jsonb) || jsonb_build_object('bulk_created', true, 'bulk_index', v_service_index),       
          p_user_id,
          p_user_id
        ) RETURNING id INTO v_service_id;

        -- HANDLE RESOURCES IF PROVIDED
        IF v_service_data->'resources' IS NOT NULL AND jsonb_array_length(v_service_data->'resources') > 0 THEN
          FOR v_resource IN
            SELECT * FROM jsonb_to_recordset(v_service_data->'resources') AS x(
              resource_type_id varchar(50),
              allocation_type_id uuid,
              quantity_required integer,
              duration_hours decimal(5,2),
              unit_cost decimal(15,4),
              currency_code varchar(3),
              required_skills jsonb,
              required_attributes jsonb,
              sequence_order integer
            )
          LOOP
            -- Validate resource_type_id exists
            IF NOT EXISTS(SELECT 1 FROM m_catalog_resource_types WHERE id = v_resource.resource_type_id AND is_active = true) THEN
              RAISE EXCEPTION 'Invalid resource_type_id: %', v_resource.resource_type_id;
            END IF;

            -- Insert service-resource relationship
            INSERT INTO t_catalog_service_resources (
              service_id,
              resource_type_id,
              tenant_id,
              allocation_type_id,
              quantity_required,
              duration_hours,
              unit_cost,
              currency_code,
              required_skills,
              required_attributes,
              sequence_order
            ) VALUES (
              v_service_id,
              v_resource.resource_type_id,
              p_tenant_id,
              v_resource.allocation_type_id,
              COALESCE(v_resource.quantity_required, 1),
              v_resource.duration_hours,
              v_resource.unit_cost,
              COALESCE(v_resource.currency_code, 'INR'),
              COALESCE(v_resource.required_skills, '[]'::jsonb),
              COALESCE(v_resource.required_attributes, '{}'::jsonb),
              COALESCE(v_resource.sequence_order, 0)
            );
          END LOOP;
        END IF;

        -- ADD TO SUCCESS ARRAY
        v_success_count := v_success_count + 1;
        v_created_services := v_created_services || jsonb_build_object(
          'index', v_service_index,
          'service_id', v_service_id,
          'service_name', v_service_data->>'name',
          'type', COALESCE(v_service_data->>'type', 'service'),
          'status', COALESCE(v_service_data->>'status', 'draft'),
          'resource_count', CASE
            WHEN v_service_data->'resources' IS NOT NULL
            THEN jsonb_array_length(v_service_data->'resources')
            ELSE 0
          END,
          'created_at', NOW()
        );

      EXCEPTION
        WHEN OTHERS THEN
          -- Individual service creation failed
          v_error_count := v_error_count + 1;
          v_errors := v_errors || jsonb_build_object(
            'index', v_service_index,
            'service_name', v_service_data->>'name',
            'error', SQLERRM
          );
      END;
    END LOOP;

    -- 6. STORE IDEMPOTENCY KEY FOR SUCCESSFUL OPERATIONS
    IF p_idempotency_key IS NOT NULL AND v_success_count > 0 THEN
      INSERT INTO t_idempotency_keys (
        idempotency_key,
        tenant_id,
        operation_type,
        service_id,
        created_at
      ) VALUES (
        p_idempotency_key,
        p_tenant_id,
        'bulk_create_services',
        NULL, -- No single service ID for bulk operations
        NOW()
      );
    END IF;

    -- 7. DETERMINE OVERALL SUCCESS STATUS
    DECLARE
      v_overall_success boolean := v_error_count = 0;
      v_partial_success boolean := v_success_count > 0 AND v_error_count > 0;
    BEGIN
      RETURN jsonb_build_object(
        'success', v_overall_success,
        'partial_success', v_partial_success,
        'data', jsonb_build_object(
          'created_services', v_created_services,
          'errors', v_errors,
          'summary', jsonb_build_object(
            'total_requested', jsonb_array_length(p_services_data),
            'successful_creations', v_success_count,
            'failed_creations', v_error_count,
            'success_rate', CASE
              WHEN jsonb_array_length(p_services_data) > 0
              THEN ROUND((v_success_count::decimal / jsonb_array_length(p_services_data)) * 100, 2)
              ELSE 0
            END
          ),
          'operation_completed_at', NOW()
        ),
        'message', CASE
          WHEN v_overall_success THEN 'All services created successfully'
          WHEN v_partial_success THEN 'Bulk operation completed with some failures'
          ELSE 'Bulk operation failed - no services created'
        END
      );
    END;

  EXCEPTION
    WHEN OTHERS THEN
      -- TRANSACTION ROLLBACK ON CRITICAL ERROR
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Bulk operation failed: ' || SQLERRM,
        'code', 'BULK_OPERATION_ERROR',
        'partial_results', jsonb_build_object(
          'processed_count', v_service_index,
          'success_count', v_success_count,
          'error_count', v_error_count
        )
      );
  END;
  $$;


ALTER FUNCTION "public"."bulk_create_services"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_services_data" "jsonb", "p_idempotency_key" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bulk_update_services"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_updates_data" "jsonb", "p_idempotency_key" character varying DEFAULT NULL::character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    v_existing_operation_id uuid;
    v_update_data jsonb;
    v_update_index integer := 0;
    v_updated_services jsonb := '[]'::jsonb;
    v_errors jsonb := '[]'::jsonb;
    v_success_count integer := 0;
    v_error_count integer := 0;
    v_service_id uuid;
    v_existing_service record;
    v_validation_errors text[];
    v_locked_services uuid[];
  BEGIN
    -- 1. IDEMPOTENCY CHECK
    IF p_idempotency_key IS NOT NULL THEN
      SELECT service_id INTO v_existing_operation_id
      FROM t_idempotency_keys
      WHERE idempotency_key = p_idempotency_key
        AND tenant_id = p_tenant_id
        AND operation_type = 'bulk_update_services'
        AND created_at > NOW() - INTERVAL '24 hours';

      IF FOUND THEN
        RETURN jsonb_build_object(
          'success', true,
          'message', 'Bulk update already completed (idempotency)',
          'data', jsonb_build_object(
            'operation_id', v_existing_operation_id,
            'status', 'completed'
          )
        );
      END IF;
    END IF;

    -- 2. VALIDATE INPUT PARAMETERS
    IF p_tenant_id IS NULL OR p_user_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'tenant_id and user_id are required',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    IF p_updates_data IS NULL OR jsonb_array_length(p_updates_data) = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'updates_data array is required and cannot be empty',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    -- 3. VALIDATE BULK OPERATION LIMITS
    IF jsonb_array_length(p_updates_data) > 100 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Bulk update limited to 100 services maximum',
        'code', 'BULK_LIMIT_EXCEEDED'
      );
    END IF;

    -- 4. PRE-LOCK ALL SERVICES TO PREVENT RACE CONDITIONS
    BEGIN
      FOR v_update_data IN SELECT * FROM jsonb_array_elements(p_updates_data)
      LOOP
        v_service_id := (v_update_data->>'id')::uuid;

        IF v_service_id IS NULL THEN
          CONTINUE;
        END IF;

        -- Attempt to lock each service
        SELECT * INTO v_existing_service
        FROM t_catalog_items
        WHERE id = v_service_id
          AND tenant_id = p_tenant_id
          AND is_live = p_is_live
        FOR UPDATE NOWAIT;

        IF FOUND THEN
          v_locked_services := v_locked_services || v_service_id;
        END IF;
      END LOOP;

    EXCEPTION
      WHEN lock_not_available THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'One or more services are being updated by another user. Please try again.',
          'code', 'CONCURRENT_UPDATE',
          'locked_services', COALESCE(array_length(v_locked_services, 1), 0)
        );
    END;

    -- 5. PROCESS SERVICE UPDATES
    FOR v_update_data IN SELECT * FROM jsonb_array_elements(p_updates_data)
    LOOP
      v_update_index := v_update_index + 1;

      BEGIN
        -- Reset validation errors for each update
        v_validation_errors := '{}';
        v_service_id := (v_update_data->>'id')::uuid;

        -- Validate service ID
        IF v_service_id IS NULL THEN
          v_validation_errors := v_validation_errors || 'Service ID is required';
        END IF;

        -- Get existing service (should already be locked)
        SELECT * INTO v_existing_service
        FROM t_catalog_items
        WHERE id = v_service_id
          AND tenant_id = p_tenant_id
          AND is_live = p_is_live;

        IF NOT FOUND THEN
          v_validation_errors := v_validation_errors || 'Service not found or access denied';
        END IF;

        -- Validate archived status
        IF v_existing_service.status = 'archived' THEN
          v_validation_errors := v_validation_errors || 'Cannot update archived service';
        END IF;

        -- Validate master data references if being updated
        IF v_update_data->'price_attributes'->>'pricing_type_id' IS NOT NULL THEN
          IF NOT EXISTS(
            SELECT 1 FROM m_category_details cd
            JOIN m_category_master cm ON cd.category_id = cm.id
            WHERE cd.id = (v_update_data->'price_attributes'->>'pricing_type_id')::uuid
              AND cm.category_name = 'pricing_types'
              AND cd.is_active = true
          ) THEN
            v_validation_errors := v_validation_errors || 'Invalid pricing_type_id';
          END IF;
        END IF;

        IF v_update_data->'service_attributes'->>'service_status_id' IS NOT NULL THEN
          IF NOT EXISTS(
            SELECT 1 FROM m_category_details cd
            JOIN m_category_master cm ON cd.category_id = cm.id
            WHERE cd.id = (v_update_data->'service_attributes'->>'service_status_id')::uuid
              AND cm.category_name = 'service_statuses'
              AND cd.is_active = true
          ) THEN
            v_validation_errors := v_validation_errors || 'Invalid service_status_id';
          END IF;
        END IF;

        -- Check for duplicate name if name is being updated
        IF v_update_data->>'name' IS NOT NULL
           AND LOWER(trim(v_update_data->>'name')) != LOWER(v_existing_service.name) THEN
          IF EXISTS(
            SELECT 1 FROM t_catalog_items
            WHERE tenant_id = p_tenant_id
              AND is_live = p_is_live
              AND id != v_service_id
              AND LOWER(name) = LOWER(trim(v_update_data->>'name'))
              AND status != 'archived'
          ) THEN
            v_validation_errors := v_validation_errors || 'Service name already exists';
          END IF;
        END IF;

        -- If validation errors exist, add to errors array and continue
        IF array_length(v_validation_errors, 1) > 0 THEN
          v_error_count := v_error_count + 1;
          v_errors := v_errors || jsonb_build_object(
            'index', v_update_index,
            'service_id', v_service_id,
            'service_name', COALESCE(v_update_data->>'name', v_existing_service.name),
            'errors', array_to_json(v_validation_errors)
          );
          CONTINUE;
        END IF;

        -- CONSERVATIVE UPDATE - ONLY UPDATE PROVIDED FIELDS
        UPDATE t_catalog_items SET
          name = CASE
            WHEN v_update_data->>'name' IS NOT NULL
            THEN trim(v_update_data->>'name')
            ELSE name
          END,
          short_description = COALESCE(v_update_data->>'short_description', short_description),
          description_content = COALESCE(v_update_data->>'description_content', description_content),
          description_format = COALESCE(v_update_data->>'description_format', description_format),
          type = COALESCE(v_update_data->>'type', type),
          industry_id = COALESCE(v_update_data->>'industry_id', industry_id),
          category_id = COALESCE(v_update_data->>'category_id', category_id),
          status = COALESCE(v_update_data->>'status', status),
          -- SAFE JSONB MERGING - preserve existing data, merge new data
          price_attributes = CASE
            WHEN v_update_data->'price_attributes' IS NOT NULL
            THEN price_attributes || v_update_data->'price_attributes'
            ELSE price_attributes
          END,
          tax_config = CASE
            WHEN v_update_data->'tax_config' IS NOT NULL
            THEN tax_config || v_update_data->'tax_config'
            ELSE tax_config
          END,
          service_attributes = CASE
            WHEN v_update_data->'service_attributes' IS NOT NULL
            THEN service_attributes || v_update_data->'service_attributes'
            ELSE service_attributes
          END,
          resource_requirements = CASE
            WHEN v_update_data->'resource_requirements' IS NOT NULL
            THEN resource_requirements || v_update_data->'resource_requirements'
            ELSE resource_requirements
          END,
          specifications = CASE
            WHEN v_update_data->'specifications' IS NOT NULL
            THEN specifications || v_update_data->'specifications'
            ELSE specifications
          END,
          terms_content = COALESCE(v_update_data->>'terms_content', terms_content),
          terms_format = COALESCE(v_update_data->>'terms_format', terms_format),
          variant_attributes = CASE
            WHEN v_update_data->'variant_attributes' IS NOT NULL
            THEN variant_attributes || v_update_data->'variant_attributes'
            ELSE variant_attributes
          END,
          metadata = CASE
            WHEN v_update_data->'metadata' IS NOT NULL
            THEN metadata || v_update_data->'metadata'
            ELSE metadata
          END || jsonb_build_object(
            'bulk_updated', true,
            'bulk_index', v_update_index,
            'bulk_updated_at', NOW()
          ),
          updated_by = p_user_id,
          updated_at = NOW()
        WHERE id = v_service_id
          AND tenant_id = p_tenant_id
          AND is_live = p_is_live;

        -- ADD TO SUCCESS ARRAY
        v_success_count := v_success_count + 1;
        v_updated_services := v_updated_services || jsonb_build_object(
          'index', v_update_index,
          'service_id', v_service_id,
          'service_name', COALESCE(v_update_data->>'name', v_existing_service.name),
          'previous_status', v_existing_service.status,
          'current_status', COALESCE(v_update_data->>'status', v_existing_service.status),
          'fields_updated', (
            SELECT jsonb_agg(key)
            FROM jsonb_object_keys(v_update_data) AS key
            WHERE key NOT IN ('id', 'metadata')
          ),
          'updated_at', NOW()
        );

      EXCEPTION
        WHEN OTHERS THEN
          -- Individual service update failed
          v_error_count := v_error_count + 1;
          v_errors := v_errors || jsonb_build_object(
            'index', v_update_index,
            'service_id', v_service_id,
            'service_name', COALESCE(v_update_data->>'name', 'Unknown'),
            'error', SQLERRM
          );
      END;
    END LOOP;

    -- 6. STORE IDEMPOTENCY KEY FOR SUCCESSFUL OPERATIONS
    IF p_idempotency_key IS NOT NULL AND v_success_count > 0 THEN
      INSERT INTO t_idempotency_keys (
        idempotency_key,
        tenant_id,
        operation_type,
        service_id,
        created_at
      ) VALUES (
        p_idempotency_key,
        p_tenant_id,
        'bulk_update_services',
        NULL, -- No single service ID for bulk operations
        NOW()
      );
    END IF;

    -- 7. DETERMINE OVERALL SUCCESS STATUS
    DECLARE
      v_overall_success boolean := v_error_count = 0;
      v_partial_success boolean := v_success_count > 0 AND v_error_count > 0;
    BEGIN
      RETURN jsonb_build_object(
        'success', v_overall_success,
        'partial_success', v_partial_success,
        'data', jsonb_build_object(
          'updated_services', v_updated_services,
          'errors', v_errors,
          'summary', jsonb_build_object(
            'total_requested', jsonb_array_length(p_updates_data),
            'successful_updates', v_success_count,
            'failed_updates', v_error_count,
            'success_rate', CASE
              WHEN jsonb_array_length(p_updates_data) > 0
              THEN ROUND((v_success_count::decimal / jsonb_array_length(p_updates_data)) * 100, 2)
              ELSE 0
            END,
            'services_locked', COALESCE(array_length(v_locked_services, 1), 0)
          ),
          'operation_completed_at', NOW()
        ),
        'message', CASE
          WHEN v_overall_success THEN 'All services updated successfully'
          WHEN v_partial_success THEN 'Bulk update completed with some failures'
          ELSE 'Bulk update failed - no services updated'
        END
      );
    END;

  EXCEPTION
    WHEN OTHERS THEN
      -- TRANSACTION ROLLBACK ON CRITICAL ERROR
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Bulk update failed: ' || SQLERRM,
        'code', 'BULK_OPERATION_ERROR',
        'partial_results', jsonb_build_object(
          'processed_count', v_update_index,
          'success_count', v_success_count,
          'error_count', v_error_count
        )
      );
  END;
  $$;


ALTER FUNCTION "public"."bulk_update_services"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_updates_data" "jsonb", "p_idempotency_key" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cached_discover_search"("p_query_text" "text", "p_query_embedding" "extensions"."vector", "p_scope" character varying DEFAULT 'group'::character varying, "p_scope_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 10, "p_similarity_threshold" double precision DEFAULT 0.7, "p_use_cache" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_query_normalized TEXT;
    v_cache_key TEXT;
    v_cache_result RECORD;
    v_search_results JSONB;
    v_cache_id UUID;
    v_results_count INT;
BEGIN
    v_query_normalized := LOWER(TRIM(p_query_text));

    -- Build cache key including scope
    v_cache_key := p_scope || ':' || COALESCE(p_scope_id::TEXT, 'all') || ':' || v_query_normalized;

    -- Check cache first (using group_id for backward compatibility, but key includes scope)
    IF p_use_cache AND p_scope = 'group' AND p_scope_id IS NOT NULL THEN
        SELECT * INTO v_cache_result
        FROM get_cached_search(p_scope_id, v_query_normalized);

        IF v_cache_result.is_cached THEN
            RETURN jsonb_build_object(
                'success', TRUE,
                'from_cache', TRUE,
                'cache_hit_count', v_cache_result.hit_count,
                'results_count', v_cache_result.results_count,
                'results', v_cache_result.results,
                'search_scope', p_scope
            );
        END IF;
    END IF;

    -- Perform fresh search
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::JSONB) INTO v_search_results
    FROM (
        SELECT *
        FROM discover_search(
            p_query_embedding,
            p_query_text,
            p_scope,
            p_scope_id,
            p_limit,
            p_similarity_threshold
        )
    ) r;

    v_results_count := jsonb_array_length(v_search_results);

    -- Store in cache (only for group scope currently)
    IF p_use_cache AND p_scope = 'group' AND p_scope_id IS NOT NULL THEN
        v_cache_id := store_search_cache(
            p_scope_id,
            p_query_text,
            v_query_normalized,
            p_query_embedding,
            v_search_results,
            v_results_count,
            'vector'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'from_cache', FALSE,
        'cache_id', v_cache_id,
        'results_count', v_results_count,
        'results', v_search_results,
        'search_scope', p_scope
    );
END;
$$;


ALTER FUNCTION "public"."cached_discover_search"("p_query_text" "text", "p_query_embedding" "extensions"."vector", "p_scope" character varying, "p_scope_id" "uuid", "p_limit" integer, "p_similarity_threshold" double precision, "p_use_cache" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cached_discover_search"("p_query_text" "text", "p_query_embedding" "extensions"."vector", "p_scope" character varying, "p_scope_id" "uuid", "p_limit" integer, "p_similarity_threshold" double precision, "p_use_cache" boolean) IS 'Cached version of discover_search. Checks cache before performing search.';



CREATE OR REPLACE FUNCTION "public"."cached_vector_search"("p_group_id" "uuid", "p_query_text" "text", "p_query_embedding" "extensions"."vector", "p_limit" integer DEFAULT 10, "p_similarity_threshold" double precision DEFAULT 0.7, "p_use_cache" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_query_normalized TEXT;
    v_cache_result RECORD;
    v_search_results JSONB;
    v_cache_id UUID;
    v_results_count INT;
BEGIN
    v_query_normalized := LOWER(TRIM(p_query_text));

    -- Check cache first
    IF p_use_cache THEN
        SELECT * INTO v_cache_result
        FROM get_cached_search(p_group_id, v_query_normalized);

        IF v_cache_result.is_cached THEN
            RETURN jsonb_build_object(
                'success', TRUE,
                'from_cache', TRUE,
                'cache_hit_count', v_cache_result.hit_count,
                'results_count', v_cache_result.results_count,
                'results', v_cache_result.results
            );
        END IF;
    END IF;

    -- Perform fresh search
    SELECT jsonb_agg(row_to_json(r)) INTO v_search_results
    FROM (
        SELECT *
        FROM vector_search_with_boost(
            p_group_id,
            p_query_embedding,
            p_query_text,
            p_limit,
            p_similarity_threshold
        )
    ) r;

    v_search_results := COALESCE(v_search_results, '[]'::JSONB);
    v_results_count := jsonb_array_length(v_search_results);

    -- Store in cache
    IF p_use_cache THEN
        v_cache_id := store_search_cache(
            p_group_id,
            p_query_text,
            v_query_normalized,
            p_query_embedding,
            v_search_results,
            v_results_count,
            'vector'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'from_cache', FALSE,
        'cache_id', v_cache_id,
        'results_count', v_results_count,
        'results', v_search_results
    );
END;
$$;


ALTER FUNCTION "public"."cached_vector_search"("p_group_id" "uuid", "p_query_text" "text", "p_query_embedding" "extensions"."vector", "p_limit" integer, "p_similarity_threshold" double precision, "p_use_cache" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_reset_sequence"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean DEFAULT true) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_config JSONB;
    v_reset_frequency TEXT;
    v_last_reset_date TIMESTAMP WITH TIME ZONE;
    v_start_value INTEGER;
    v_should_reset BOOLEAN := false;
    v_current_year INTEGER;
    v_last_reset_year INTEGER;
    v_current_month INTEGER;
    v_last_reset_month INTEGER;
    v_current_quarter INTEGER;
    v_last_reset_quarter INTEGER;
BEGIN
    -- Get config and last reset date
    SELECT
        cd.form_settings,
        sc.last_reset_date
    INTO v_config, v_last_reset_date
    FROM public.t_category_details cd
    LEFT JOIN public.t_sequence_counters sc
        ON sc.sequence_type_id = cd.id
        AND sc.tenant_id = p_tenant_id
        AND sc.is_live = p_is_live
    WHERE cd.id = p_sequence_type_id;

    IF v_config IS NULL THEN
        RETURN false;
    END IF;

    v_reset_frequency := UPPER(COALESCE(v_config->>'reset_frequency', 'NEVER'));
    v_start_value := COALESCE((v_config->>'start_value')::INTEGER, 1);

    -- If never reset or no counter exists yet, return false
    IF v_reset_frequency = 'NEVER' OR v_last_reset_date IS NULL THEN
        RETURN false;
    END IF;

    -- Calculate time components
    v_current_year := EXTRACT(YEAR FROM NOW());
    v_last_reset_year := EXTRACT(YEAR FROM v_last_reset_date);
    v_current_month := EXTRACT(MONTH FROM NOW());
    v_last_reset_month := EXTRACT(MONTH FROM v_last_reset_date);
    v_current_quarter := EXTRACT(QUARTER FROM NOW());
    v_last_reset_quarter := EXTRACT(QUARTER FROM v_last_reset_date);

    -- Check reset conditions
    CASE v_reset_frequency
        WHEN 'YEARLY' THEN
            v_should_reset := v_current_year > v_last_reset_year;
        WHEN 'MONTHLY' THEN
            v_should_reset := (v_current_year > v_last_reset_year) OR
                             (v_current_year = v_last_reset_year AND v_current_month > v_last_reset_month);
        WHEN 'QUARTERLY' THEN
            v_should_reset := (v_current_year > v_last_reset_year) OR
                             (v_current_year = v_last_reset_year AND v_current_quarter > v_last_reset_quarter);
        ELSE
            v_should_reset := false;
    END CASE;

    -- Perform reset if needed
    IF v_should_reset THEN
        UPDATE public.t_sequence_counters
        SET current_value = v_start_value - 1,  -- -1 because next call will increment
            last_reset_date = NOW(),
            updated_at = NOW()
        WHERE sequence_type_id = p_sequence_type_id
          AND tenant_id = p_tenant_id
          AND is_live = p_is_live;

        RAISE NOTICE 'Sequence % reset to % for tenant %',
            p_sequence_type_id, v_start_value, p_tenant_id;
    END IF;

    RETURN v_should_reset;
END;
$$;


ALTER FUNCTION "public"."check_and_reset_sequence"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_and_reset_sequence"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) IS 'Checks if a sequence needs resetting based on reset_frequency (YEARLY, MONTHLY, QUARTERLY).
Automatically resets to start_value if period has changed.';



CREATE OR REPLACE FUNCTION "public"."check_contact_duplicates"("p_contact_channels" "jsonb", "p_exclude_contact_id" "uuid" DEFAULT NULL::"uuid", "p_is_live" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_channel record;
  v_duplicates jsonb := '[]'::jsonb;
  v_duplicate_contacts jsonb;
BEGIN
  -- Check each contact channel for duplicates
  FOR v_channel IN 
    SELECT * FROM jsonb_to_recordset(p_contact_channels) AS x(
      channel_type text,
      value text
    )
  LOOP
    -- Only check critical channels
    IF v_channel.channel_type IN ('mobile', 'email') THEN
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', v_channel.channel_type,
          'value', v_channel.value,
          'existing_contact', to_jsonb(c.*)
        )
      ) INTO v_duplicate_contacts
      FROM t_contact_channels ch
      INNER JOIN t_contacts c ON ch.contact_id = c.id
      WHERE ch.channel_type = v_channel.channel_type
        AND ch.value = v_channel.value
        AND c.is_live = p_is_live
        AND c.status != 'archived'
        AND (p_exclude_contact_id IS NULL OR c.id != p_exclude_contact_id);

      IF v_duplicate_contacts IS NOT NULL THEN
        v_duplicates := v_duplicates || v_duplicate_contacts;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'hasDuplicates', jsonb_array_length(v_duplicates) > 0,
      'duplicates', v_duplicates
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'CHECK_DUPLICATES_ERROR'
    );
END;
$$;


ALTER FUNCTION "public"."check_contact_duplicates"("p_contact_channels" "jsonb", "p_exclude_contact_id" "uuid", "p_is_live" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_contact_duplicates"("p_contact_channels" "jsonb", "p_exclude_contact_id" "uuid" DEFAULT NULL::"uuid", "p_is_live" boolean DEFAULT true, "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_channel record;
  v_duplicates jsonb := '[]'::jsonb;
  v_duplicate_contacts jsonb;
  v_actual_tenant_id uuid;
BEGIN
  -- Get the tenant_id from JWT if not provided
  v_actual_tenant_id := COALESCE(
    p_tenant_id, 
    (auth.jwt() ->> 'tenant_id')::uuid,
    (SELECT tenant_id FROM t_user_profiles WHERE user_id = auth.uid() LIMIT 1)
  );

  -- Check each contact channel for duplicates
  FOR v_channel IN 
    SELECT * FROM jsonb_to_recordset(p_contact_channels) AS x(
      channel_type text,
      value text
    )
  LOOP
    -- Only check critical channels (email and mobile)
    IF v_channel.channel_type IN ('mobile', 'email') THEN
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', v_channel.channel_type,
          'value', v_channel.value,
          'existing_contact', jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'company_name', c.company_name,
            'type', c.type,
            'status', c.status,
            'classifications', c.classifications
          )
        )
      ) INTO v_duplicate_contacts
      FROM t_contact_channels ch
      INNER JOIN t_contacts c ON ch.contact_id = c.id
      WHERE ch.channel_type = v_channel.channel_type
        AND ch.value = v_channel.value
        AND c.is_live = p_is_live
        AND c.tenant_id = v_actual_tenant_id  -- TENANT FILTER
        AND c.status != 'archived'
        AND (p_exclude_contact_id IS NULL OR c.id != p_exclude_contact_id);
      
      IF v_duplicate_contacts IS NOT NULL THEN
        v_duplicates := v_duplicates || v_duplicate_contacts;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'hasDuplicates', jsonb_array_length(v_duplicates) > 0,
      'duplicates', v_duplicates
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'CHECK_DUPLICATES_ERROR'
    );
END;
$$;


ALTER FUNCTION "public"."check_contact_duplicates"("p_contact_channels" "jsonb", "p_exclude_contact_id" "uuid", "p_is_live" boolean, "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_intent_permission"("p_group_id" "uuid", "p_intent_code" character varying, "p_user_role" character varying, "p_channel" character varying, "p_scope" character varying DEFAULT 'group'::character varying) RETURNS TABLE("is_allowed" boolean, "max_results" integer, "denial_reason" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_master RECORD;
    v_group_override JSONB;
    v_allowed_roles VARCHAR[];
    v_allowed_channels VARCHAR[];
    v_allowed_scopes VARCHAR[];
BEGIN
    -- Get master definition
    SELECT * INTO v_master
    FROM t_intent_definitions
    WHERE intent_code = p_intent_code AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 'Intent not found or inactive'::TEXT;
        RETURN;
    END IF;

    -- Get group override if exists
    SELECT intent INTO v_group_override
    FROM t_business_groups bg,
         jsonb_array_elements(COALESCE(bg.settings->'chat'->'intent_buttons', '[]'::JSONB)) AS intent
    WHERE bg.id = p_group_id
      AND (intent->>'intent_code' = p_intent_code OR intent->>'id' = p_intent_code)
    LIMIT 1;

    -- Check if disabled at group level
    IF v_group_override IS NOT NULL AND (v_group_override->>'enabled')::BOOLEAN = FALSE THEN
        RETURN QUERY SELECT FALSE, 0, 'Intent disabled for this group'::TEXT;
        RETURN;
    END IF;

    -- Determine allowed roles
    IF v_group_override IS NOT NULL AND v_group_override ? 'roles' AND jsonb_array_length(v_group_override->'roles') > 0 THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(v_group_override->'roles'))
        INTO v_allowed_roles;
    ELSE
        v_allowed_roles := v_master.default_roles;
    END IF;

    -- Check role
    IF NOT (p_user_role = ANY(v_allowed_roles)) THEN
        RETURN QUERY SELECT FALSE, 0, 'Role not permitted for this intent'::TEXT;
        RETURN;
    END IF;

    -- Determine allowed channels
    IF v_group_override IS NOT NULL AND v_group_override ? 'channels' AND jsonb_array_length(v_group_override->'channels') > 0 THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(v_group_override->'channels'))
        INTO v_allowed_channels;
    ELSE
        v_allowed_channels := v_master.default_channels;
    END IF;

    -- Check channel
    IF NOT (p_channel = ANY(v_allowed_channels)) THEN
        RETURN QUERY SELECT FALSE, 0, 'Channel not permitted for this intent'::TEXT;
        RETURN;
    END IF;

    -- Determine allowed scopes
    IF v_group_override IS NOT NULL AND v_group_override ? 'scopes' AND jsonb_array_length(v_group_override->'scopes') > 0 THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(v_group_override->'scopes'))
        INTO v_allowed_scopes;
    ELSE
        v_allowed_scopes := v_master.default_scopes;
    END IF;

    -- Check scope
    IF NOT (p_scope = ANY(v_allowed_scopes)) THEN
        RETURN QUERY SELECT FALSE, 0, 'Scope not permitted for this intent'::TEXT;
        RETURN;
    END IF;

    -- All checks passed
    RETURN QUERY SELECT
        TRUE,
        COALESCE((v_group_override->>'max_results')::INT, v_master.default_max_results),
        NULL::TEXT;
END;
$$;


ALTER FUNCTION "public"."check_intent_permission"("p_group_id" "uuid", "p_intent_code" character varying, "p_user_role" character varying, "p_channel" character varying, "p_scope" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_intent_permission"("p_group_id" "uuid", "p_intent_code" character varying, "p_user_role" character varying, "p_channel" character varying, "p_scope" character varying) IS 'Checks if a user role can use an intent on a specific channel and scope';



CREATE OR REPLACE FUNCTION "public"."check_invitation_expiry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Auto-update status to expired if past expiry date
  IF NEW.expires_at < NOW() AND NEW.status IN ('pending', 'sent', 'resent') THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_invitation_expiry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_sequence_uniqueness"("p_table_name" "text", "p_column_name" "text", "p_value" "text", "p_tenant_id" "uuid", "p_is_live" boolean DEFAULT true, "p_exclude_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $_$
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
$_$;


ALTER FUNCTION "public"."check_sequence_uniqueness"("p_table_name" "text", "p_column_name" "text", "p_value" "text", "p_tenant_id" "uuid", "p_is_live" boolean, "p_exclude_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_sequence_uniqueness"("p_table_name" "text", "p_column_name" "text", "p_value" "text", "p_tenant_id" "uuid", "p_is_live" boolean, "p_exclude_id" "uuid") IS 'Helper function to check if a sequence value already exists in a table';



CREATE OR REPLACE FUNCTION "public"."check_user_group_access"("p_group_id" "uuid", "p_phone" character varying DEFAULT NULL::character varying, "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("has_access" boolean, "user_id" "uuid", "user_name" character varying, "business_name" character varying, "email" character varying, "phone" character varying, "scope" character varying, "access_level" character varying, "membership_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user RECORD;
    v_is_admin BOOLEAN;
    v_membership RECORD;
    v_phone_digits VARCHAR;
BEGIN
    -- Validate: need at least phone or user_id
    IF p_phone IS NULL AND p_user_id IS NULL THEN
        RETURN QUERY SELECT
            false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, 
            NULL::VARCHAR, NULL::VARCHAR, 'missing_identifier'::VARCHAR, NULL::UUID;
        RETURN;
    END IF;

    -- If phone provided, lookup user first
    IF p_phone IS NOT NULL AND p_user_id IS NULL THEN
        v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');
        
        SELECT 
            up.id AS user_id,
            COALESCE(up.first_name || ' ' || up.last_name, up.first_name, '')::VARCHAR AS name,
            tp.business_name::VARCHAR,
            COALESCE(up.email, tp.business_email)::VARCHAR AS email,
            up.mobile_number::VARCHAR AS phone
        INTO v_user
        FROM public.t_user_profiles up
        LEFT JOIN public.t_user_tenants ut ON ut.user_id = up.id
        LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = ut.tenant_id
        WHERE regexp_replace(up.mobile_number, '[^0-9]', '', 'g') LIKE '%' || RIGHT(v_phone_digits, 10)
           OR up.mobile_number = p_phone
        LIMIT 1;

        IF v_user.user_id IS NULL THEN
            RETURN QUERY SELECT
                false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
                p_phone::VARCHAR, NULL::VARCHAR, 'user_not_found'::VARCHAR, NULL::UUID;
            RETURN;
        END IF;

        p_user_id := v_user.user_id;
    ELSE
        -- Lookup user by user_id
        SELECT 
            up.id AS user_id,
            COALESCE(up.first_name || ' ' || up.last_name, up.first_name, '')::VARCHAR AS name,
            tp.business_name::VARCHAR,
            COALESCE(up.email, tp.business_email)::VARCHAR AS email,
            up.mobile_number::VARCHAR AS phone
        INTO v_user
        FROM public.t_user_profiles up
        LEFT JOIN public.t_user_tenants ut ON ut.user_id = up.id
        LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = ut.tenant_id
        WHERE up.id = p_user_id
        LIMIT 1;
    END IF;

    -- Check if product admin
    SELECT is_admin INTO v_is_admin
    FROM public.t_user_profiles
    WHERE id = p_user_id;

    IF v_is_admin = true THEN
        RETURN QUERY SELECT
            true,
            p_user_id,
            v_user.name::VARCHAR,
            v_user.business_name::VARCHAR,
            v_user.email::VARCHAR,
            v_user.phone::VARCHAR,
            'product'::VARCHAR,
            'admin'::VARCHAR,
            NULL::UUID;
        RETURN;
    END IF;

    -- Check membership
    SELECT gm.id, gm.status
    INTO v_membership
    FROM public.t_group_memberships gm
    INNER JOIN public.t_user_tenants ut ON ut.tenant_id = gm.tenant_id
    WHERE ut.user_id = p_user_id
      AND gm.group_id = p_group_id
      AND gm.status = 'active'
      AND gm.is_active = true
      AND ut.status = 'active'
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT
            true,
            p_user_id,
            v_user.name::VARCHAR,
            v_user.business_name::VARCHAR,
            v_user.email::VARCHAR,
            v_user.phone::VARCHAR,
            'group'::VARCHAR,
            'member'::VARCHAR,
            v_membership.id;
        RETURN;
    END IF;

    -- No access
    RETURN QUERY SELECT
        false,
        p_user_id,
        v_user.name::VARCHAR,
        v_user.business_name::VARCHAR,
        v_user.email::VARCHAR,
        v_user.phone::VARCHAR,
        NULL::VARCHAR,
        'no_membership'::VARCHAR,
        NULL::UUID;
END;
$$;


ALTER FUNCTION "public"."check_user_group_access"("p_group_id" "uuid", "p_phone" character varying, "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_ai_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    UPDATE public.t_ai_agent_sessions
    SET
        is_active = false,
        end_reason = 'timeout',
        ended_at = NOW()
    WHERE expires_at < NOW()
      AND expires_at IS NOT NULL
      AND is_active = true;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_ai_sessions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_ai_sessions"() IS 'Maintenance function to clean up expired sessions. Returns count of sessions cleaned.';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_cache"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    DELETE FROM public.t_query_cache
    WHERE expires_at < NOW();

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_cache"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_cache"() IS 'Removes expired cache entries (run daily via cron)';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_invitations"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE t_user_invitations
  SET status = 'expired'
  WHERE status IN ('pending', 'sent', 'resent')
  AND expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_invitations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_sessions"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    DELETE FROM public.t_chat_sessions
    WHERE expires_at < NOW();

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_tool_results"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM t_tool_results
    WHERE created_at < NOW() - INTERVAL '1 hour'
    RETURNING COUNT(*) INTO deleted_count;
    
    RETURN COALESCE(deleted_count, 0);
END;
$$;


ALTER FUNCTION "public"."cleanup_tool_results"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_tool_results"() IS 'Removes tool results older than 1 hour';



CREATE OR REPLACE FUNCTION "public"."copy_catalog_live_to_test"("p_tenant_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_industries_copied INTEGER := 0;
  v_categories_copied INTEGER := 0;
  v_items_copied INTEGER := 0;
BEGIN
  -- First, delete existing test data
  DELETE FROM t_catalog_items WHERE tenant_id = p_tenant_id AND is_live = FALSE;
  DELETE FROM t_catalog_categories WHERE tenant_id = p_tenant_id AND is_live = FALSE;
  DELETE FROM t_catalog_industries WHERE tenant_id = p_tenant_id AND is_live = FALSE;
  
  -- Copy industries
  INSERT INTO t_catalog_industries (
    tenant_id, is_live, industry_code, name, description, icon,
    common_pricing_rules, compliance_requirements, is_custom, 
    master_industry_id, customization_notes, is_active, sort_order,
    created_by, updated_by
  )
  SELECT 
    tenant_id, FALSE, industry_code, name, description, icon,
    common_pricing_rules, compliance_requirements, is_custom,
    master_industry_id, customization_notes, is_active, sort_order,
    created_by, updated_by
  FROM t_catalog_industries 
  WHERE tenant_id = p_tenant_id AND is_live = TRUE;
  
  GET DIAGNOSTICS v_industries_copied = ROW_COUNT;
  
  -- Copy categories
  INSERT INTO t_catalog_categories (
    tenant_id, industry_id, is_live, category_code, name, description, icon,
    default_pricing_model, suggested_duration, common_variants, pricing_rule_templates,
    is_custom, master_category_id, customization_notes, is_active, sort_order,
    created_by, updated_by
  )
  SELECT 
    c.tenant_id, ti_test.id, FALSE, c.category_code, c.name, c.description, c.icon,
    c.default_pricing_model, c.suggested_duration, c.common_variants, c.pricing_rule_templates,
    c.is_custom, c.master_category_id, c.customization_notes, c.is_active, c.sort_order,
    c.created_by, c.updated_by
  FROM t_catalog_categories c
  JOIN t_catalog_industries ti_live ON c.industry_id = ti_live.id AND ti_live.is_live = TRUE
  JOIN t_catalog_industries ti_test ON ti_live.industry_code = ti_test.industry_code 
    AND ti_test.tenant_id = p_tenant_id AND ti_test.is_live = FALSE
  WHERE c.tenant_id = p_tenant_id AND c.is_live = TRUE;
  
  GET DIAGNOSTICS v_categories_copied = ROW_COUNT;
  
  -- Copy items (this is more complex due to parent-child relationships)
  -- First copy parent items, then variants
  WITH copied_items AS (
    INSERT INTO t_catalog_items (
      tenant_id, is_live, type, industry_id, category_id, name, short_description,
      description_format, description_content, terms_format, terms_content,
      parent_id, is_variant, variant_attributes, price_attributes, tax_config,
      metadata, specifications, status, created_by, updated_by
    )
    SELECT 
      i.tenant_id, FALSE, i.type, 
      CASE WHEN i.industry_id IS NOT NULL THEN ti_test.id ELSE NULL END,
      CASE WHEN i.category_id IS NOT NULL THEN tc_test.id ELSE NULL END,
      i.name, i.short_description, i.description_format, i.description_content,
      i.terms_format, i.terms_content, NULL, FALSE, i.variant_attributes,
      i.price_attributes, i.tax_config, i.metadata, i.specifications,
      i.status, i.created_by, i.updated_by
    FROM t_catalog_items i
    LEFT JOIN t_catalog_industries ti_live ON i.industry_id = ti_live.id AND ti_live.is_live = TRUE
    LEFT JOIN t_catalog_industries ti_test ON ti_live.industry_code = ti_test.industry_code 
      AND ti_test.tenant_id = p_tenant_id AND ti_test.is_live = FALSE
    LEFT JOIN t_catalog_categories tc_live ON i.category_id = tc_live.id AND tc_live.is_live = TRUE
    LEFT JOIN t_catalog_categories tc_test ON tc_live.category_code = tc_test.category_code 
      AND tc_test.tenant_id = p_tenant_id AND tc_test.is_live = FALSE
    WHERE i.tenant_id = p_tenant_id AND i.is_live = TRUE AND i.parent_id IS NULL
    RETURNING id, name
  )
  SELECT COUNT(*) FROM copied_items INTO v_items_copied;
  
  RETURN jsonb_build_object(
    'success', true,
    'industries_copied', v_industries_copied,
    'categories_copied', v_categories_copied,
    'items_copied', v_items_copied,
    'message', 'Live data successfully copied to test environment'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to copy live data to test environment'
  );
END;
$$;


ALTER FUNCTION "public"."copy_catalog_live_to_test"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."copy_catalog_live_to_test"("p_tenant_id" "uuid") IS 'Copies all live catalog data to test environment for safe testing and development.';



CREATE OR REPLACE FUNCTION "public"."create_ai_session"("p_user_id" "uuid" DEFAULT NULL::"uuid", "p_group_id" "uuid" DEFAULT NULL::"uuid", "p_phone" character varying DEFAULT NULL::character varying, "p_channel" character varying DEFAULT 'whatsapp'::character varying, "p_language" character varying DEFAULT 'en'::character varying) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_session_id UUID;
    v_phone_digits VARCHAR;
    v_phone VARCHAR;
    v_group_code VARCHAR;
    v_timeout INTEGER;
    v_expires_at TIMESTAMPTZ;
    v_tenant_id UUID;
BEGIN
    -- ========================================
    -- VALIDATION: Must have phone OR user_id
    -- ========================================
    IF (p_phone IS NULL OR p_phone = '') AND p_user_id IS NULL THEN
        RAISE EXCEPTION 'Either p_phone or p_user_id is required';
    END IF;

    -- ========================================
    -- GET TENANT_ID (if user_id provided)
    -- ========================================
    IF p_user_id IS NOT NULL THEN
        SELECT tenant_id INTO v_tenant_id
        FROM public.t_user_tenants
        WHERE user_id = p_user_id
        LIMIT 1;
    END IF;

    -- ========================================
    -- RESOLVE PHONE NUMBER
    -- ========================================
    IF p_phone IS NOT NULL AND p_phone != '' THEN
        v_phone := p_phone;
    ELSIF p_user_id IS NOT NULL THEN
        -- Try user's mobile first
        SELECT CONCAT(COALESCE(country_code, ''), mobile_number) INTO v_phone
        FROM public.t_user_profiles
        WHERE user_id = p_user_id
        AND mobile_number IS NOT NULL AND mobile_number != '';
        
        -- If no user mobile, try tenant's business phone
        IF (v_phone IS NULL OR v_phone = '') AND v_tenant_id IS NOT NULL THEN
            SELECT CONCAT(COALESCE(business_phone_country_code, ''), business_phone) INTO v_phone
            FROM public.t_tenant_profiles
            WHERE tenant_id = v_tenant_id
            AND business_phone IS NOT NULL AND business_phone != '';
        END IF;
    END IF;

    -- Normalize phone (digits only)
    v_phone_digits := regexp_replace(COALESCE(v_phone, ''), '[^0-9]', '', 'g');

    -- ========================================
    -- GET GROUP INFO
    -- ========================================
    SELECT
        group_name,
        COALESCE((settings->'ai_agent'->>'session_timeout_minutes')::INTEGER, 30)
    INTO v_group_code, v_timeout
    FROM public.t_business_groups
    WHERE id = p_group_id;

    -- ========================================
    -- END EXISTING ACTIVE SESSIONS
    -- ========================================
    UPDATE public.t_ai_agent_sessions
    SET is_active = false, end_reason = 'new_session', ended_at = NOW()
    WHERE is_active = true
      AND (
          -- Match by phone
          (v_phone_digits IS NOT NULL AND v_phone_digits != '' AND phone_normalized = v_phone_digits)
          OR 
          -- Match by user_id
          (p_user_id IS NOT NULL AND user_id = p_user_id)
      );

    -- ========================================
    -- CALCULATE EXPIRY
    -- ========================================
    IF p_channel = 'whatsapp' THEN
        v_expires_at := NULL;  -- WhatsApp sessions don't expire
    ELSE
        v_expires_at := NOW() + (v_timeout || ' minutes')::INTERVAL;
    END IF;

    -- ========================================
    -- CREATE NEW SESSION
    -- ========================================
    INSERT INTO public.t_ai_agent_sessions (
        tenant_id,
        user_id,
        phone,
        phone_normalized,
        group_id,
        group_code,
        channel,
        session_scope,
        detected_language,
        is_active,
        started_at,
        last_activity_at,
        expires_at,
        context,
        conversation_history
    ) VALUES (
        v_tenant_id,                          -- Can be NULL for anonymous
        p_user_id,                            -- Can be NULL for anonymous
        NULLIF(v_phone, ''),
        NULLIF(v_phone_digits, ''),
        p_group_id,
        v_group_code,
        p_channel,
        'group',
        p_language,
        true,
        NOW(),
        NOW(),
        v_expires_at,
        '{}'::JSONB,
        '[]'::JSONB
    )
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$;


ALTER FUNCTION "public"."create_ai_session"("p_user_id" "uuid", "p_group_id" "uuid", "p_phone" character varying, "p_channel" character varying, "p_language" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_group_id" "uuid", "p_channel" character varying DEFAULT 'web'::character varying, "p_language" character varying DEFAULT 'en'::character varying, "p_phone" character varying DEFAULT NULL::character varying) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_session_id UUID;
    v_phone VARCHAR;
    v_phone_digits VARCHAR;
    v_group_code VARCHAR;
    v_timeout INTEGER;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Get phone from profile if not provided
    IF p_phone IS NULL THEN
        SELECT mobile_number INTO v_phone
        FROM public.t_user_profiles
        WHERE id = p_user_id
          AND tenant_id = p_tenant_id;
    ELSE
        v_phone := p_phone;
    END IF;

    v_phone_digits := regexp_replace(COALESCE(v_phone, ''), '[^0-9]', '', 'g');

    -- Get group info and timeout setting
    SELECT
        group_name,
        COALESCE((settings->'ai_agent'->>'session_timeout_minutes')::INTEGER, 30)
    INTO v_group_code, v_timeout
    FROM public.t_business_groups
    WHERE id = p_group_id;

    -- End existing sessions for this user in this tenant
    UPDATE public.t_ai_agent_sessions
    SET
        is_active = false,
        end_reason = 'new_session',
        ended_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND is_active = true;

    -- Calculate expiry: NULL for WhatsApp, timeout for web/chat
    IF p_channel = 'whatsapp' THEN
        v_expires_at := NULL;
    ELSE
        v_expires_at := NOW() + (v_timeout || ' minutes')::INTERVAL;
    END IF;

    -- Create new session
    INSERT INTO public.t_ai_agent_sessions (
        tenant_id,
        user_id,
        phone,
        phone_normalized,
        group_id,
        group_code,
        channel,
        session_scope,
        detected_language,
        is_active,
        started_at,
        last_activity_at,
        expires_at,
        context,
        conversation_history
    ) VALUES (
        p_tenant_id,
        p_user_id,
        v_phone,
        NULLIF(v_phone_digits, ''),
        p_group_id,
        v_group_code,
        p_channel,
        'group',
        p_language,
        true,
        NOW(),
        NOW(),
        v_expires_at,
        '{}'::JSONB,
        '[]'::JSONB
    )
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$;


ALTER FUNCTION "public"."create_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_group_id" "uuid", "p_channel" character varying, "p_language" character varying, "p_phone" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_group_id" "uuid", "p_channel" character varying, "p_language" character varying, "p_phone" character varying) IS 'Creates AI session using tenant_id + user_id. Phone is looked up from profile if not provided.';



CREATE OR REPLACE FUNCTION "public"."create_catalog_item_version"("p_current_item_id" "uuid", "p_version_reason" "text" DEFAULT 'Item updated'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_item RECORD;
  v_new_item_id UUID;
  v_original_item_id UUID;
  v_next_version INTEGER;
BEGIN
  -- Get current item details
  SELECT * INTO v_current_item
  FROM t_catalog_items
  WHERE id = p_current_item_id AND is_current_version = TRUE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Current item not found or not current version: %', p_current_item_id;
  END IF;
  
  -- Determine original item ID
  v_original_item_id := COALESCE(v_current_item.original_item_id, p_current_item_id);
  
  -- Get next version number
  v_next_version := get_next_version_number(v_original_item_id);
  
  -- Generate new item ID
  v_new_item_id := gen_random_uuid();
  
  -- Mark current item as no longer current and set replaced_by
  UPDATE t_catalog_items 
  SET 
    is_current_version = FALSE,
    replaced_by_id = v_new_item_id,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_current_item_id;
  
  -- Create new version (will be populated by application)
  -- This function just reserves the ID and sets up version chain
  INSERT INTO t_catalog_items (
    id,
    tenant_id,
    is_live,
    original_item_id,
    parent_version_id,
    version_number,
    is_current_version,
    version_reason,
    type,
    name,
    created_by,
    updated_by
  ) VALUES (
    v_new_item_id,
    v_current_item.tenant_id,
    v_current_item.is_live,
    v_original_item_id,
    p_current_item_id,
    v_next_version,
    TRUE,
    p_version_reason,
    v_current_item.type,
    v_current_item.name || ' (v' || v_next_version || ')', -- Temporary name
    auth.uid(),
    auth.uid()
  );
  
  RETURN v_new_item_id;
END;
$$;


ALTER FUNCTION "public"."create_catalog_item_version"("p_current_item_id" "uuid", "p_version_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_catalog_item_version"("p_current_item_id" "uuid", "p_version_reason" "text") IS 'Creates a new version of an existing catalog item. Marks old version as replaced and sets up version chain.';



CREATE OR REPLACE FUNCTION "public"."create_contact_transaction"("p_contact_data" "jsonb", "p_contact_channels" "jsonb" DEFAULT '[]'::"jsonb", "p_addresses" "jsonb" DEFAULT '[]'::"jsonb", "p_contact_persons" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_contact_id uuid;
  v_contact_record record;
  v_channel record;
  v_address record;
  v_person record;
  v_person_contact_id uuid;
  v_person_channel record;
  v_result jsonb;
BEGIN
  -- Step 1: Create main contact
  INSERT INTO t_contacts (
    type,
    status,
    name,
    company_name,
    registration_number,
    salutation,
    designation,
    department,
    is_primary_contact,
    classifications,
    tags,
    compliance_numbers,
    notes,
    parent_contact_ids,
    tenant_id,
    auth_user_id,
    t_userprofile_id,
    created_by,
    is_live
  )
  VALUES (
    (p_contact_data->>'type')::text,
    COALESCE((p_contact_data->>'status')::text, 'active'),
    (p_contact_data->>'name')::text,
    (p_contact_data->>'company_name')::text,
    (p_contact_data->>'registration_number')::text,
    (p_contact_data->>'salutation')::text,
    (p_contact_data->>'designation')::text,
    (p_contact_data->>'department')::text,
    COALESCE((p_contact_data->>'is_primary_contact')::boolean, false),
    COALESCE(p_contact_data->'classifications', '[]'::jsonb),
    COALESCE(p_contact_data->'tags', '[]'::jsonb),
    COALESCE(p_contact_data->'compliance_numbers', '[]'::jsonb),
    (p_contact_data->>'notes')::text,
    COALESCE(p_contact_data->'parent_contact_ids', '[]'::jsonb),
    (p_contact_data->>'tenant_id')::uuid,
    (p_contact_data->>'auth_user_id')::uuid,
    (p_contact_data->>'t_userprofile_id')::uuid,
    (p_contact_data->>'created_by')::uuid,
    COALESCE((p_contact_data->>'is_live')::boolean, true)
  )
  RETURNING id INTO v_contact_id;

  -- Step 2: Create contact channels
  IF jsonb_array_length(p_contact_channels) > 0 THEN
    FOR v_channel IN 
      SELECT * FROM jsonb_to_recordset(p_contact_channels) AS x(
        channel_type text,
        value text,
        country_code text,
        is_primary boolean,
        is_verified boolean,
        notes text
      )
    LOOP
      INSERT INTO t_contact_channels (
        contact_id,
        channel_type,
        value,
        country_code,
        is_primary,
        is_verified,
        notes
      )
      VALUES (
        v_contact_id,
        v_channel.channel_type,
        v_channel.value,
        v_channel.country_code,
        COALESCE(v_channel.is_primary, false),
        COALESCE(v_channel.is_verified, false),
        v_channel.notes
      );
    END LOOP;
  END IF;

  -- Step 3: Create addresses
  IF jsonb_array_length(p_addresses) > 0 THEN
    FOR v_address IN 
      SELECT * FROM jsonb_to_recordset(p_addresses) AS x(
        type text,
        address_type text,
        label text,
        address_line1 text,
        line1 text,
        address_line2 text,
        line2 text,
        city text,
        state_code text,
        state text,
        country_code text,
        country text,
        postal_code text,
        google_pin text,
        is_primary boolean,
        notes text
      )
    LOOP
      INSERT INTO t_contact_addresses (
        contact_id,
        type,
        label,
        address_line1,
        address_line2,
        city,
        state_code,
        country_code,
        postal_code,
        google_pin,
        is_primary,
        notes
      )
      VALUES (
        v_contact_id,
        COALESCE(v_address.type, v_address.address_type),
        v_address.label,
        COALESCE(v_address.address_line1, v_address.line1),
        COALESCE(v_address.address_line2, v_address.line2),
        v_address.city,
        COALESCE(v_address.state_code, v_address.state),
        COALESCE(v_address.country_code, v_address.country, 'IN'),
        v_address.postal_code,
        v_address.google_pin,
        COALESCE(v_address.is_primary, false),
        v_address.notes
      );
    END LOOP;
  END IF;

  -- Step 4: Create contact persons as separate contacts
  IF jsonb_array_length(p_contact_persons) > 0 THEN
    FOR v_person IN 
      SELECT * FROM jsonb_to_recordset(p_contact_persons) AS x(
        name text,
        salutation text,
        designation text,
        department text,
        is_primary boolean,
        notes text,
        contact_channels jsonb
      )
    LOOP
      -- Create person as separate contact
      INSERT INTO t_contacts (
        type,
        status,
        name,
        salutation,
        designation,
        department,
        is_primary_contact,
        parent_contact_ids,
        classifications,
        tags,
        compliance_numbers,
        notes,
        tenant_id,
        created_by,
        is_live
      )
      VALUES (
        'individual',
        'active',
        v_person.name,
        v_person.salutation,
        v_person.designation,
        v_person.department,
        COALESCE(v_person.is_primary, false),
        jsonb_build_array(v_contact_id),
        '["team_member"]'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        v_person.notes,
        (p_contact_data->>'tenant_id')::uuid,
        (p_contact_data->>'created_by')::uuid,
        COALESCE((p_contact_data->>'is_live')::boolean, true)
      )
      RETURNING id INTO v_person_contact_id;

      -- Create contact channels for person
      IF v_person.contact_channels IS NOT NULL AND jsonb_array_length(v_person.contact_channels) > 0 THEN
        FOR v_person_channel IN 
          SELECT * FROM jsonb_to_recordset(v_person.contact_channels) AS x(
            channel_type text,
            value text,
            country_code text,
            is_primary boolean,
            is_verified boolean,
            notes text
          )
        LOOP
          INSERT INTO t_contact_channels (
            contact_id,
            channel_type,
            value,
            country_code,
            is_primary,
            is_verified,
            notes
          )
          VALUES (
            v_person_contact_id,
            v_person_channel.channel_type,
            v_person_channel.value,
            v_person_channel.country_code,
            COALESCE(v_person_channel.is_primary, false),
            COALESCE(v_person_channel.is_verified, false),
            v_person_channel.notes
          );
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  -- Return the complete contact with all relationships
  SELECT jsonb_build_object(
    'success', true,
    'data', to_jsonb(c.*),
    'message', 'Contact created successfully'
  ) INTO v_result
  FROM t_contacts c
  WHERE c.id = v_contact_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'CREATE_CONTACT_ERROR'
    );
END;
$$;


ALTER FUNCTION "public"."create_contact_transaction"("p_contact_data" "jsonb", "p_contact_channels" "jsonb", "p_addresses" "jsonb", "p_contact_persons" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_service_catalog_item"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_service_data" "jsonb", "p_idempotency_key" character varying DEFAULT NULL::character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    v_service_id uuid;
    v_result jsonb;
    v_resource record;
    v_pricing_type_exists boolean;
    v_service_status_exists boolean;
    v_existing_service_id uuid;
  BEGIN
    -- 1. IDEMPOTENCY CHECK
    IF p_idempotency_key IS NOT NULL THEN
      SELECT service_id INTO v_existing_service_id
      FROM t_idempotency_keys
      WHERE idempotency_key = p_idempotency_key
        AND tenant_id = p_tenant_id
        AND operation_type = 'create_service'
        AND created_at > NOW() - INTERVAL '24 hours';

      IF FOUND THEN
        -- Return existing service
        SELECT jsonb_build_object(
          'success', true,
          'data', (SELECT get_service_catalog_item(v_existing_service_id, p_tenant_id, p_is_live)),
          'message', 'Service already created (idempotency)'
        ) INTO v_result;
        RETURN v_result;
      END IF;
    END IF;

    -- 2. VALIDATE INPUT PARAMETERS
    IF p_tenant_id IS NULL OR p_user_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'tenant_id and user_id are required',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    IF p_service_data->>'name' IS NULL OR trim(p_service_data->>'name') = '' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service name is required',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    -- 3. VALIDATE MASTER DATA REFERENCES
    -- Check pricing_type_id exists in product master data
    IF p_service_data->'price_attributes'->>'pricing_type_id' IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM m_category_details cd
        JOIN m_category_master cm ON cd.category_id = cm.id
        WHERE cd.id = (p_service_data->'price_attributes'->>'pricing_type_id')::uuid
          AND cm.category_name = 'pricing_types'
          AND cd.is_active = true
      ) INTO v_pricing_type_exists;

      IF NOT v_pricing_type_exists THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Invalid pricing_type_id',
          'code', 'INVALID_REFERENCE'
        );
      END IF;
    END IF;

    -- Check service_status_id exists in product master data
    IF p_service_data->'service_attributes'->>'service_status_id' IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM m_category_details cd
        JOIN m_category_master cm ON cd.category_id = cm.id
        WHERE cd.id = (p_service_data->'service_attributes'->>'service_status_id')::uuid
          AND cm.category_name = 'service_statuses'
          AND cd.is_active = true
      ) INTO v_service_status_exists;

      IF NOT v_service_status_exists THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Invalid service_status_id',
          'code', 'INVALID_REFERENCE'
        );
      END IF;
    END IF;

    -- 4. CHECK FOR DUPLICATE SERVICE NAME
    IF EXISTS(
      SELECT 1 FROM t_catalog_items
      WHERE tenant_id = p_tenant_id
        AND is_live = p_is_live
        AND LOWER(name) = LOWER(trim(p_service_data->>'name'))
        AND status != 'archived'
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service with this name already exists',
        'code', 'DUPLICATE_NAME'
      );
    END IF;

    -- 5. INSERT SERVICE WITH EXPLICIT FIELD MAPPING
    INSERT INTO t_catalog_items (
      tenant_id,
      name,
      short_description,
      description_content,
      description_format,
      type,
      industry_id,
      category_id,
      status,
      is_live,
      price_attributes,
      tax_config,
      service_attributes,
      resource_requirements,
      specifications,
      terms_content,
      terms_format,
      variant_attributes,
      metadata,
      created_by,
      updated_by
    ) VALUES (
      p_tenant_id,
      trim(p_service_data->>'name'),
      p_service_data->>'short_description',
      p_service_data->>'description_content',
      COALESCE(p_service_data->>'description_format', 'markdown'),
      COALESCE(p_service_data->>'type', 'service'),
      p_service_data->>'industry_id',
      p_service_data->>'category_id',
      COALESCE(p_service_data->>'status', 'draft'),
      p_is_live,
      COALESCE(p_service_data->'price_attributes', '{}'::jsonb),
      COALESCE(p_service_data->'tax_config', '{}'::jsonb),
      COALESCE(p_service_data->'service_attributes', '{}'::jsonb),
      COALESCE(p_service_data->'resource_requirements', '{}'::jsonb),
      COALESCE(p_service_data->'specifications', '{}'::jsonb),
      p_service_data->>'terms_content',
      COALESCE(p_service_data->>'terms_format', 'markdown'),
      COALESCE(p_service_data->'variant_attributes', '{}'::jsonb),
      COALESCE(p_service_data->'metadata', '{}'::jsonb),
      p_user_id,
      p_user_id
    ) RETURNING id INTO v_service_id;

    -- 6. SAFE RESOURCE ASSOCIATION HANDLING
    -- Only process resources if explicitly provided
    IF p_service_data->'resources' IS NOT NULL AND jsonb_array_length(p_service_data->'resources') > 0 THEN
      FOR v_resource IN
        SELECT * FROM jsonb_to_recordset(p_service_data->'resources') AS x(
          resource_type_id varchar(50),
          allocation_type_id uuid,
          quantity_required integer,
          duration_hours decimal(5,2),
          unit_cost decimal(15,4),
          currency_code varchar(3),
          required_skills jsonb,
          required_attributes jsonb
        )
      LOOP
        -- Validate resource_type_id exists
        IF NOT EXISTS(SELECT 1 FROM m_catalog_resource_types WHERE id = v_resource.resource_type_id AND is_active = true) THEN
          -- Rollback and return error
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid resource_type_id: ' || v_resource.resource_type_id,
            'code', 'INVALID_RESOURCE_TYPE'
          );
        END IF;

        -- Insert service-resource relationship
        INSERT INTO t_catalog_service_resources (
          service_id,
          resource_type_id,
          tenant_id,
          allocation_type_id,
          quantity_required,
          duration_hours,
          unit_cost,
          currency_code,
          required_skills,
          required_attributes
        ) VALUES (
          v_service_id,
          v_resource.resource_type_id,
          p_tenant_id,
          v_resource.allocation_type_id,
          COALESCE(v_resource.quantity_required, 1),
          v_resource.duration_hours,
          v_resource.unit_cost,
          COALESCE(v_resource.currency_code, 'INR'),
          COALESCE(v_resource.required_skills, '[]'::jsonb),
          COALESCE(v_resource.required_attributes, '{}'::jsonb)
        );
      END LOOP;
    END IF;

    -- 7. STORE IDEMPOTENCY KEY
    IF p_idempotency_key IS NOT NULL THEN
      INSERT INTO t_idempotency_keys (
        idempotency_key,
        tenant_id,
        operation_type,
        service_id,
        created_at
      ) VALUES (
        p_idempotency_key,
        p_tenant_id,
        'create_service',
        v_service_id,
        NOW()
      );
    END IF;

    -- 8. EXPLICIT FIELD SELECTION FOR RESPONSE
    SELECT jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'short_description', s.short_description,
      'description_content', s.description_content,
      'description_format', s.description_format,
      'type', s.type,
      'industry_id', s.industry_id,
      'category_id', s.category_id,
      'status', s.status,
      'is_live', s.is_live,
      'price_attributes', s.price_attributes,
      'tax_config', s.tax_config,
      'service_attributes', s.service_attributes,
      'resource_requirements', s.resource_requirements,
      'specifications', s.specifications,
      'terms_content', s.terms_content,
      'terms_format', s.terms_format,
      'variant_attributes', s.variant_attributes,
      'metadata', s.metadata,
      'created_at', s.created_at,
      'updated_at', s.updated_at,
      'created_by', s.created_by,
      'updated_by', s.updated_by,
      -- Include master data display values
      'industry_display', i.name,
      'category_display', c.name,
      'pricing_type_display', pt.display_name,
      'service_status_display', ss.display_name,
      -- Include resource count
      'resource_count', COALESCE(
        (SELECT COUNT(*) FROM t_catalog_service_resources WHERE service_id = s.id),
        0
      )
    ) INTO v_result
    FROM t_catalog_items s
    LEFT JOIN m_catalog_industries i ON s.industry_id = i.id
    LEFT JOIN m_catalog_categories c ON s.category_id = c.id
    LEFT JOIN m_category_details pt ON (s.price_attributes->>'pricing_type_id')::uuid = pt.id
    LEFT JOIN m_category_details ss ON (s.service_attributes->>'service_status_id')::uuid = ss.id
    WHERE s.id = v_service_id;

    -- 9. SUCCESS RESPONSE
    RETURN jsonb_build_object(
      'success', true,
      'data', v_result,
      'message', 'Service created successfully'
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- PROPER ERROR HANDLING
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'OPERATION_ERROR'
      );
  END;
  $$;


ALTER FUNCTION "public"."create_service_catalog_item"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_service_data" "jsonb", "p_idempotency_key" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_embedding_input"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN jsonb_build_object(
        'received_query', p_query_text,
        'embedding_length', length(p_embedding),
        'embedding_first_50', left(p_embedding, 50),
        'embedding_last_50', right(p_embedding, 50),
        'group_id', p_group_id,
        'starts_with_bracket', left(p_embedding, 1) = '[',
        'ends_with_bracket', right(p_embedding, 1) = ']'
    );
END;
$$;


ALTER FUNCTION "public"."debug_embedding_input"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_search_v2"("p_embedding" "text", "p_group_id" "uuid") RETURNS TABLE("business_name" "text", "similarity" double precision, "embedding_length" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_embedding vector(1536);
BEGIN
    -- Try to cast
    v_embedding := p_embedding::vector(1536);
    
    RETURN QUERY
    SELECT 
        tp.business_name::text,
        (1 - (gm.embedding <=> v_embedding))::float as similarity,
        array_length(gm.embedding::real[], 1)::int as embedding_length
    FROM t_group_memberships gm
    JOIN t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id
    WHERE gm.group_id = p_group_id
    ORDER BY similarity DESC;
END;
$$;


ALTER FUNCTION "public"."debug_search_v2"("p_embedding" "text", "p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_search_v3"("p_embedding" "text", "p_group_id" "uuid") RETURNS TABLE("info" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY SELECT 'Embedding length: ' || length(p_embedding)::text;
    RETURN QUERY SELECT 'First 50 chars: ' || left(p_embedding, 50);
    RETURN QUERY SELECT 'Group ID: ' || p_group_id::text;
END;
$$;


ALTER FUNCTION "public"."debug_search_v3"("p_embedding" "text", "p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_contact_transaction"("p_contact_id" "uuid", "p_force" boolean DEFAULT false, "p_is_live" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_existing_contact record;
  v_has_relations boolean := false;
BEGIN
  -- Check if contact exists
  SELECT * INTO v_existing_contact
  FROM t_contacts
  WHERE id = p_contact_id AND is_live = p_is_live;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Contact not found',
      'code', 'CONTACT_NOT_FOUND'
    );
  END IF;

  -- Check for active relations if not forcing
  IF NOT p_force THEN
    -- Check if this contact has children
    SELECT EXISTS(
      SELECT 1 FROM t_contacts 
      WHERE parent_contact_ids @> jsonb_build_array(p_contact_id)
        AND status != 'archived'
        AND is_live = p_is_live
    ) INTO v_has_relations;

    IF v_has_relations THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Cannot delete contact with active relations',
        'code', 'CONTACT_HAS_RELATIONS'
      );
    END IF;
  END IF;

  -- Archive the contact
  UPDATE t_contacts 
  SET status = 'archived', updated_at = CURRENT_TIMESTAMP
  WHERE id = p_contact_id;

  -- If forcing, also archive all child contacts
  IF p_force THEN
    UPDATE t_contacts 
    SET status = 'archived', updated_at = CURRENT_TIMESTAMP
    WHERE parent_contact_ids @> jsonb_build_array(p_contact_id)
      AND is_live = p_is_live;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Contact deleted successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'DELETE_CONTACT_ERROR'
    );
END;
$$;


ALTER FUNCTION "public"."delete_contact_transaction"("p_contact_id" "uuid", "p_force" boolean, "p_is_live" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_contact_transaction"("p_contact_id" "uuid", "p_force" boolean DEFAULT false, "p_is_live" boolean DEFAULT true, "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_existing_contact record;
  v_has_relations boolean := false;
  v_actual_tenant_id uuid;
BEGIN
  -- Get the tenant_id from JWT if not provided
  v_actual_tenant_id := COALESCE(
    p_tenant_id, 
    (auth.jwt() ->> 'tenant_id')::uuid,
    (SELECT tenant_id FROM t_user_profiles WHERE user_id = auth.uid() LIMIT 1)
  );

  -- Check if contact exists and belongs to tenant
  SELECT * INTO v_existing_contact
  FROM t_contacts
  WHERE id = p_contact_id 
    AND is_live = p_is_live
    AND tenant_id = v_actual_tenant_id;  -- TENANT CHECK

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Contact not found or access denied',
      'code', 'CONTACT_NOT_FOUND'
    );
  END IF;

  -- Check for active relations if not forcing
  IF NOT p_force THEN
    -- Check if this contact has children
    SELECT EXISTS(
      SELECT 1 FROM t_contacts 
      WHERE parent_contact_ids @> jsonb_build_array(p_contact_id)
        AND status != 'archived'
        AND is_live = p_is_live
        AND tenant_id = v_actual_tenant_id  -- TENANT CHECK
    ) INTO v_has_relations;
    
    IF v_has_relations THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Cannot delete contact with active relations',
        'code', 'CONTACT_HAS_RELATIONS'
      );
    END IF;
  END IF;

  -- Archive the contact (only if it belongs to the tenant)
  UPDATE t_contacts 
  SET status = 'archived', updated_at = CURRENT_TIMESTAMP
  WHERE id = p_contact_id
    AND tenant_id = v_actual_tenant_id;  -- TENANT CHECK

  -- If forcing, also archive all child contacts
  IF p_force THEN
    UPDATE t_contacts 
    SET status = 'archived', updated_at = CURRENT_TIMESTAMP
    WHERE parent_contact_ids @> jsonb_build_array(p_contact_id)
      AND is_live = p_is_live
      AND tenant_id = v_actual_tenant_id;  -- TENANT CHECK
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Contact deleted successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'DELETE_CONTACT_ERROR'
    );
END;
$$;


ALTER FUNCTION "public"."delete_contact_transaction"("p_contact_id" "uuid", "p_force" boolean, "p_is_live" boolean, "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_service_catalog_item"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_idempotency_key" character varying DEFAULT NULL::character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    v_existing_service record;
    v_result jsonb;
    v_existing_operation_id uuid;
    v_dependent_contracts integer := 0;
    v_dependent_invoices integer := 0;
    v_archive_data jsonb;
  BEGIN
    -- 1. IDEMPOTENCY CHECK
    IF p_idempotency_key IS NOT NULL THEN
      SELECT service_id INTO v_existing_operation_id
      FROM t_idempotency_keys
      WHERE idempotency_key = p_idempotency_key
        AND tenant_id = p_tenant_id
        AND operation_type = 'delete_service'
        AND created_at > NOW() - INTERVAL '24 hours';

      IF FOUND THEN
        -- Return success for idempotent delete
        RETURN jsonb_build_object(
          'success', true,
          'message', 'Service already deleted (idempotency)',
          'data', jsonb_build_object('id', v_existing_operation_id, 'status', 'archived')
        );
      END IF;
    END IF;

    -- 2. VALIDATE INPUT PARAMETERS
    IF p_service_id IS NULL OR p_tenant_id IS NULL OR p_user_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'service_id, tenant_id, and user_id are required',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    -- 3. TRANSACTION START WITH ROW-LEVEL LOCKING
    -- Lock the service record for update to prevent race conditions
    SELECT * INTO v_existing_service
    FROM t_catalog_items
    WHERE id = p_service_id
      AND tenant_id = p_tenant_id
      AND is_live = p_is_live
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service not found or access denied',
        'code', 'RECORD_NOT_FOUND'
      );
    END IF;

    -- 4. CHECK IF ALREADY ARCHIVED
    IF v_existing_service.status = 'archived' THEN
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Service already archived',
        'data', jsonb_build_object(
          'id', p_service_id,
          'name', v_existing_service.name,
          'status', 'archived'
        )
      );
    END IF;

    -- 5. CHECK FOR DEPENDENCIES (Business Logic)
    -- Check if service is used in active contracts
    SELECT COUNT(*) INTO v_dependent_contracts
    FROM t_contract_items ci
    JOIN t_contracts c ON ci.contract_id = c.id
    WHERE ci.catalog_item_id = p_service_id
      AND c.tenant_id = p_tenant_id
      AND c.is_live = p_is_live
      AND c.status NOT IN ('cancelled', 'completed');

    -- Check if service is used in invoices
    SELECT COUNT(*) INTO v_dependent_invoices
    FROM t_invoice_items ii
    JOIN t_invoices i ON ii.invoice_id = i.id
    WHERE ii.catalog_item_id = p_service_id
      AND i.tenant_id = p_tenant_id
      AND i.is_live = p_is_live
      AND i.status NOT IN ('cancelled', 'void');

    -- 6. PREVENT DELETION IF ACTIVE DEPENDENCIES EXIST
    IF v_dependent_contracts > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Cannot delete service: ' || v_dependent_contracts || ' active contracts depend on this service',
        'code', 'DEPENDENCY_EXISTS',
        'dependencies', jsonb_build_object(
          'active_contracts', v_dependent_contracts,
          'active_invoices', v_dependent_invoices
        )
      );
    END IF;

    IF v_dependent_invoices > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Cannot delete service: ' || v_dependent_invoices || ' invoices reference this service',
        'code', 'DEPENDENCY_EXISTS',
        'dependencies', jsonb_build_object(
          'active_contracts', v_dependent_contracts,
          'active_invoices', v_dependent_invoices
        )
      );
    END IF;

    -- 7. PREPARE ARCHIVE DATA FOR AUDIT TRAIL
    SELECT jsonb_build_object(
      'deleted_at', NOW(),
      'deleted_by', p_user_id,
      'original_status', v_existing_service.status,
      'deletion_reason', 'Manual deletion via API',
      'had_dependencies', jsonb_build_object(
        'contracts', v_dependent_contracts,
        'invoices', v_dependent_invoices
      )
    ) INTO v_archive_data;

    -- 8. SOFT DELETE - ARCHIVE THE SERVICE
    UPDATE t_catalog_items SET
      status = 'archived',
      updated_by = p_user_id,
      updated_at = NOW(),
      -- Store deletion metadata in metadata field
      metadata = metadata || v_archive_data
    WHERE id = p_service_id
      AND tenant_id = p_tenant_id
      AND is_live = p_is_live;

    -- 9. SOFT DELETE ASSOCIATED RESOURCES (Don't hard delete)
    UPDATE t_catalog_service_resources SET
      is_active = false,
      updated_at = NOW()
    WHERE service_id = p_service_id
      AND tenant_id = p_tenant_id
      AND is_active = true;

    -- 10. STORE IDEMPOTENCY KEY
    IF p_idempotency_key IS NOT NULL THEN
      INSERT INTO t_idempotency_keys (
        idempotency_key,
        tenant_id,
        operation_type,
        service_id,
        created_at
      ) VALUES (
        p_idempotency_key,
        p_tenant_id,
        'delete_service',
        p_service_id,
        NOW()
      );
    END IF;

    -- 11. PREPARE SUCCESS RESPONSE
    SELECT jsonb_build_object(
      'id', p_service_id,
      'name', v_existing_service.name,
      'previous_status', v_existing_service.status,
      'current_status', 'archived',
      'deleted_at', NOW(),
      'deleted_by', p_user_id,
      'resources_archived', (
        SELECT COUNT(*)
        FROM t_catalog_service_resources
        WHERE service_id = p_service_id
          AND tenant_id = p_tenant_id
          AND is_active = false
      )
    ) INTO v_result;

    -- 12. SUCCESS RESPONSE
    RETURN jsonb_build_object(
      'success', true,
      'data', v_result,
      'message', 'Service archived successfully'
    );

  EXCEPTION
    WHEN lock_not_available THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service is being updated by another user. Please try again.',
        'code', 'CONCURRENT_UPDATE'
      );
    WHEN OTHERS THEN
      -- PROPER ERROR HANDLING WITH ROLLBACK
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'OPERATION_ERROR'
      );
  END;
  $$;


ALTER FUNCTION "public"."delete_service_catalog_item"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_idempotency_key" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_group_activation"("p_message" character varying) RETURNS TABLE("group_id" "uuid", "group_name" character varying, "group_code" character varying, "group_type" character varying, "is_activation" boolean, "is_exit" boolean, "ai_config" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_message_lower VARCHAR;
    v_message_trimmed VARCHAR;
BEGIN
    -- Normalize message: lowercase and trim
    v_message_trimmed := TRIM(p_message);
    v_message_lower := LOWER(v_message_trimmed);

    -- ============================================
    -- Check for ACTIVATION keywords
    -- ============================================
    RETURN QUERY
    SELECT
        bg.id AS group_id,
        bg.group_name::VARCHAR,
        bg.group_name::VARCHAR AS group_code,  -- Using group_name as code
        bg.group_type::VARCHAR,
        true AS is_activation,
        false AS is_exit,
        get_ai_agent_config(bg.id) AS ai_config
    FROM public.t_business_groups bg
    WHERE
        -- AI agent must be enabled
        (bg.settings->'ai_agent'->>'enabled')::BOOLEAN = true
        -- Check activation keywords (case-insensitive)
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(bg.settings->'ai_agent'->'activation_keywords') kw
            WHERE LOWER(kw) = v_message_lower
        )
    LIMIT 1;

    -- If activation found, return
    IF FOUND THEN
        RETURN;
    END IF;

    -- ============================================
    -- Check for EXIT keywords (across all AI-enabled groups)
    -- ============================================
    RETURN QUERY
    SELECT
        NULL::UUID AS group_id,
        NULL::VARCHAR AS group_name,
        NULL::VARCHAR AS group_code,
        NULL::VARCHAR AS group_type,
        false AS is_activation,
        true AS is_exit,
        NULL::JSONB AS ai_config
    FROM public.t_business_groups bg
    WHERE
        (bg.settings->'ai_agent'->>'enabled')::BOOLEAN = true
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(bg.settings->'ai_agent'->'exit_keywords') kw
            WHERE LOWER(kw) = v_message_lower
        )
    LIMIT 1;

    -- Note: If neither activation nor exit found, returns empty result set
END;
$$;


ALTER FUNCTION "public"."detect_group_activation"("p_message" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."detect_group_activation"("p_message" character varying) IS 'Detects if message is an activation keyword (Hi BBB) or exit keyword (Bye). Returns matching group with AI config.';



CREATE OR REPLACE FUNCTION "public"."discover_search"("p_query_embedding" "extensions"."vector", "p_query_text" "text", "p_scope" character varying DEFAULT 'group'::character varying, "p_scope_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 10, "p_similarity_threshold" double precision DEFAULT 0.7) RETURNS TABLE("membership_id" "uuid", "tenant_id" "uuid", "group_id" "uuid", "group_name" "text", "business_name" "text", "business_email" "text", "mobile_number" "text", "city" "text", "industry" "text", "profile_snippet" "text", "ai_enhanced_description" "text", "approved_keywords" "text"[], "similarity" double precision, "similarity_original" double precision, "boost_applied" "text", "match_type" "text", "search_scope" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_search_terms TEXT[];
    v_query_lower TEXT;
BEGIN
    v_query_lower := LOWER(TRIM(p_query_text));
    
    -- Extract meaningful search terms
    SELECT ARRAY_AGG(DISTINCT word) INTO v_search_terms
    FROM unnest(regexp_split_to_array(v_query_lower, '\s+')) AS word
    WHERE length(word) > 2
      AND word NOT IN (
          -- Common stop words
          'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 
          'can', 'her', 'was', 'one', 'our', 'out', 'has', 'have',
          'been', 'were', 'being', 'their', 'there', 'this', 'that',
          'with', 'from', 'they', 'will', 'would', 'could', 'should',
          'what', 'which', 'who', 'whom', 'find', 'search', 'looking',
          'need', 'want', 'get', 'best', 'good', 'near', 'nearby',
          -- FIX 1: Added missing stop words
          'into', 'any', 'some', 'does', 'anyone', 'someone', 'anything',
          'every', 'everyone', 'thing', 'about', 'like', 'just', 'also',
          'how', 'why', 'when', 'where', 'your', 'know', 'make', 'made'
      );

    -- Fallback if all words were filtered
    IF v_search_terms IS NULL OR array_length(v_search_terms, 1) IS NULL THEN
        v_search_terms := ARRAY[v_query_lower];
    END IF;

    RETURN QUERY
    WITH scoped_memberships AS (
        SELECT 
            gm.id AS membership_id,
            gm.tenant_id::TEXT AS tenant_id,
            gm.group_id,
            gm.embedding,
            gm.profile_data,
            bg.group_name,
            tp.business_name,
            tp.business_email,
            tp.city,
            COALESCE(tp.industry_id::TEXT, '')::TEXT AS industry
        FROM public.t_group_memberships gm
        LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id::UUID
        LEFT JOIN public.t_business_groups bg ON bg.id = gm.group_id
        WHERE gm.status = 'active'
          AND gm.is_active = TRUE
          AND (
              CASE p_scope
                  WHEN 'group' THEN gm.group_id = p_scope_id
                  WHEN 'tenant' THEN gm.tenant_id::UUID = p_scope_id
                  WHEN 'product' THEN TRUE
                  ELSE gm.group_id = p_scope_id
              END
          )
    ),
    
    cluster_signals AS (
        SELECT 
            sc.membership_id,
            MAX(sc.confidence_score)::FLOAT AS cluster_confidence
        FROM public.t_semantic_clusters sc
        JOIN scoped_memberships sm ON sm.membership_id = sc.membership_id
        WHERE sc.is_active = TRUE
          AND (
              EXISTS (
                  SELECT 1 FROM unnest(v_search_terms) st
                  WHERE LOWER(sc.primary_term) LIKE '%' || st || '%'
                     OR st LIKE '%' || LOWER(sc.primary_term) || '%'
              )
              OR
              EXISTS (
                  SELECT 1 
                  FROM unnest(v_search_terms) st,
                       unnest(sc.related_terms) rt
                  WHERE LOWER(rt) LIKE '%' || st || '%'
                     OR st LIKE '%' || LOWER(rt) || '%'
              )
          )
        GROUP BY sc.membership_id
    ),
    
    keyword_signals AS (
        SELECT 
            sm.membership_id,
            (
                SELECT COUNT(DISTINCT kw)::FLOAT 
                FROM jsonb_array_elements_text(
                    COALESCE(sm.profile_data->'approved_keywords', '[]'::JSONB)
                ) kw
                WHERE EXISTS (
                    SELECT 1 FROM unnest(v_search_terms) st
                    WHERE LOWER(kw) LIKE '%' || st || '%'
                       OR st LIKE '%' || LOWER(kw) || '%'
                )
            ) / GREATEST(
                jsonb_array_length(COALESCE(sm.profile_data->'approved_keywords', '[]'::JSONB)),
                1
            )::FLOAT AS keyword_match_ratio
        FROM scoped_memberships sm
        WHERE EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(
                COALESCE(sm.profile_data->'approved_keywords', '[]'::JSONB)
            ) kw,
            unnest(v_search_terms) st
            WHERE LOWER(kw) LIKE '%' || st || '%'
               OR st LIKE '%' || LOWER(kw) || '%'
        )
    ),
    
    -- FIX 3: Text signals now match on INDIVIDUAL TERMS, not full query
    text_signals AS (
        SELECT 
            sm.membership_id,
            (
                -- Business name match (any search term)
                CASE WHEN EXISTS (
                    SELECT 1 FROM unnest(v_search_terms) st
                    WHERE LOWER(sm.business_name) LIKE '%' || st || '%'
                ) THEN 0.5 ELSE 0.0 END
                +
                -- AI enhanced description match (any search term)
                CASE WHEN EXISTS (
                    SELECT 1 FROM unnest(v_search_terms) st
                    WHERE LOWER(COALESCE(sm.profile_data->>'ai_enhanced_description', '')) LIKE '%' || st || '%'
                ) THEN 0.3 ELSE 0.0 END
                +
                -- Short description match (any search term)
                CASE WHEN EXISTS (
                    SELECT 1 FROM unnest(v_search_terms) st
                    WHERE LOWER(COALESCE(sm.profile_data->>'short_description', '')) LIKE '%' || st || '%'
                ) THEN 0.2 ELSE 0.0 END
            )::FLOAT AS text_match_score
        FROM scoped_memberships sm
        WHERE EXISTS (
            SELECT 1 FROM unnest(v_search_terms) st
            WHERE LOWER(sm.business_name) LIKE '%' || st || '%'
               OR LOWER(COALESCE(sm.profile_data->>'ai_enhanced_description', '')) LIKE '%' || st || '%'
               OR LOWER(COALESCE(sm.profile_data->>'short_description', '')) LIKE '%' || st || '%'
        )
    ),
    
    combined_signals AS (
        SELECT 
            sm.membership_id,
            sm.tenant_id,
            sm.group_id,
            sm.group_name,
            sm.business_name,
            sm.business_email,
            (sm.profile_data->>'mobile_number')::TEXT AS mobile_number,
            sm.city,
            sm.industry,
            LEFT(COALESCE(
                sm.profile_data->>'ai_enhanced_description',
                sm.profile_data->>'short_description',
                sm.business_name
            ), 200)::TEXT AS profile_snippet,
            (sm.profile_data->>'ai_enhanced_description')::TEXT AS ai_enhanced_description,
            ARRAY(
                SELECT jsonb_array_elements_text(
                    COALESCE(sm.profile_data->'approved_keywords', '[]'::JSONB)
                )
            )::TEXT[] AS approved_keywords,
            COALESCE(cs.cluster_confidence, 0.0)::FLOAT AS cluster_score,
            COALESCE(ks.keyword_match_ratio, 0.0)::FLOAT AS keyword_score,
            COALESCE(ts.text_match_score, 0.0)::FLOAT AS text_score,
            (CASE WHEN sm.embedding IS NOT NULL 
                 THEN 1.0 - (sm.embedding <=> p_query_embedding) 
                 ELSE 0.0 
            END)::FLOAT AS vector_score,
            (CASE 
                WHEN cs.membership_id IS NOT NULL THEN 'cluster_match'
                WHEN ks.membership_id IS NOT NULL THEN 'keyword_match'
                WHEN ts.membership_id IS NOT NULL THEN 'text_match'
                ELSE NULL
            END)::TEXT AS primary_match_type,
            (cs.membership_id IS NOT NULL OR ks.membership_id IS NOT NULL OR ts.membership_id IS NOT NULL) AS has_signal
        FROM scoped_memberships sm
        LEFT JOIN cluster_signals cs ON cs.membership_id = sm.membership_id
        LEFT JOIN keyword_signals ks ON ks.membership_id = sm.membership_id
        LEFT JOIN text_signals ts ON ts.membership_id = sm.membership_id
    ),
    
    scored_results AS (
        SELECT 
            cs.membership_id,
            cs.tenant_id,
            cs.group_id,
            cs.group_name,
            cs.business_name,
            cs.business_email,
            cs.mobile_number,
            cs.city,
            cs.industry,
            cs.profile_snippet,
            cs.ai_enhanced_description,
            cs.approved_keywords,
            cs.cluster_score,
            cs.keyword_score,
            cs.text_score,
            cs.vector_score,
            cs.primary_match_type,
            -- Combined score with weights
            LEAST(1.0, 
    cs.vector_score +
    CASE WHEN cs.cluster_score > 0 THEN 0.15 ELSE 0 END +
    CASE WHEN cs.keyword_score > 0 THEN 0.10 ELSE 0 END +
    CASE WHEN cs.text_score > 0 THEN 0.05 ELSE 0 END
)::FLOAT AS combined_score
        FROM combined_signals cs
        WHERE cs.has_signal = TRUE
    )
    
    -- Final SELECT with threshold applied
    SELECT 
        sr.membership_id::UUID,
        sr.tenant_id::UUID,
        sr.group_id::UUID,
        sr.group_name::TEXT,
        sr.business_name::TEXT,
        sr.business_email::TEXT,
        sr.mobile_number::TEXT,
        sr.city::TEXT,
        sr.industry::TEXT,
        sr.profile_snippet::TEXT,
        sr.ai_enhanced_description::TEXT,
        sr.approved_keywords::TEXT[],
        sr.combined_score::FLOAT AS similarity,
        sr.vector_score::FLOAT AS similarity_original,
        sr.primary_match_type::TEXT AS boost_applied,
        COALESCE(sr.primary_match_type, 'none')::TEXT AS match_type,
        p_scope::TEXT AS search_scope
    FROM scored_results sr
    -- FIX 2: Apply threshold filter
    WHERE sr.combined_score >= p_similarity_threshold
    ORDER BY sr.combined_score DESC
    LIMIT p_limit;
    
END;
$$;


ALTER FUNCTION "public"."discover_search"("p_query_embedding" "extensions"."vector", "p_query_text" "text", "p_scope" character varying, "p_scope_id" "uuid", "p_limit" integer, "p_similarity_threshold" double precision) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."discover_search"("p_query_embedding" "extensions"."vector", "p_query_text" "text", "p_scope" character varying, "p_scope_id" "uuid", "p_limit" integer, "p_similarity_threshold" double precision) IS 'Hybrid multi-signal search. Returns ONLY results matching via cluster, keyword, or text. Vector used for ranking only.';



CREATE OR REPLACE FUNCTION "public"."end_ai_session"("p_phone" character varying) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_phone_digits VARCHAR;
BEGIN
    v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');

    UPDATE public.t_ai_agent_sessions
    SET
        is_active = false,
        end_reason = 'user_exit',
        ended_at = NOW(),
        updated_at = NOW()
    WHERE phone_normalized = v_phone_digits
      AND is_active = true;

    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."end_ai_session"("p_phone" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."end_ai_session"("p_phone" character varying) IS 'Ends AI session when user says Bye. Marks session as inactive.';



CREATE OR REPLACE FUNCTION "public"."end_ai_session"("p_phone" character varying DEFAULT NULL::character varying, "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_session_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_phone_digits VARCHAR;
BEGIN
    IF p_phone IS NOT NULL THEN
        v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');
    END IF;

    UPDATE public.t_ai_agent_sessions
    SET is_active = false, end_reason = 'user_exit', ended_at = NOW()
    WHERE is_active = true
      AND (
          (p_session_id IS NOT NULL AND id = p_session_id)
          OR (p_phone IS NOT NULL AND phone_normalized = v_phone_digits)
          OR (p_user_id IS NOT NULL AND user_id = p_user_id)
      );

    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."end_ai_session"("p_phone" character varying, "p_user_id" "uuid", "p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.t_ai_agent_sessions
    SET
        is_active = false,
        end_reason = 'user_exit',
        ended_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND is_active = true;

    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."end_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."end_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid") IS 'Ends AI session by tenant_id + user_id.';



CREATE OR REPLACE FUNCTION "public"."end_chat_session"("p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.t_chat_sessions
    SET
        intent_state = 'IDLE',
        group_id = NULL,
        group_name = NULL,
        current_intent = NULL,
        pending_prompt = NULL,
        updated_at = NOW(),
        expires_at = NOW()  -- Expire immediately
    WHERE id = p_session_id;
END;
$$;


ALTER FUNCTION "public"."end_chat_session"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_default_tax_rate"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- If setting this rate as default, unset all other defaults for this tenant
  IF NEW.is_default = true AND NEW.is_active = true THEN
    UPDATE t_tax_rates 
    SET is_default = false, updated_at = NOW()
    WHERE tenant_id = NEW.tenant_id 
      AND id != NEW.id 
      AND is_default = true 
      AND is_active = true;
  END IF;
  
  -- If deactivating the default rate, ensure there's still a default
  IF NEW.is_active = false AND OLD.is_default = true THEN
    -- Try to set another active rate as default
    UPDATE t_tax_rates 
    SET is_default = true, updated_at = NOW()
    WHERE tenant_id = NEW.tenant_id 
      AND id != NEW.id 
      AND is_active = true
      AND id = (
        SELECT id FROM t_tax_rates 
        WHERE tenant_id = NEW.tenant_id 
          AND is_active = true 
          AND id != NEW.id
        ORDER BY sequence_no ASC 
        LIMIT 1
      );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_default_tax_rate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_primary_auth_method"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE t_user_auth_methods 
    SET is_primary = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_primary_auth_method"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_group_by_trigger"("p_trigger_phrase" "text") RETURNS TABLE("group_id" "uuid", "group_name" "text", "group_type" "text", "chat_config" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        bg.id AS group_id,
        bg.group_name::TEXT,          -- Cast to TEXT
        bg.group_type::TEXT,          -- Cast to TEXT
        get_group_chat_config(bg.id) AS chat_config
    FROM public.t_business_groups bg
    WHERE bg.is_active = TRUE
      AND (
          LOWER(bg.settings->'chat'->>'trigger_phrase') = LOWER(p_trigger_phrase)
          OR LOWER(bg.settings->'whatsapp'->>'trigger_phrase') = LOWER(p_trigger_phrase)
          OR LOWER('Hi ' || bg.group_name) = LOWER(p_trigger_phrase)
      )
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."find_group_by_trigger"("p_trigger_phrase" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."format_sequence_number"("p_sequence_type_id" "uuid", "p_sequence_value" integer) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_config JSONB;
    v_prefix TEXT;
    v_separator TEXT;
    v_suffix TEXT;
    v_padding INTEGER;
    v_formatted TEXT;
BEGIN
    -- Get config from form_settings
    SELECT form_settings INTO v_config
    FROM public.t_category_details
    WHERE id = p_sequence_type_id;

    IF v_config IS NULL THEN
        -- Return plain number if no config
        RETURN p_sequence_value::TEXT;
    END IF;

    -- Extract config values with defaults
    v_prefix := COALESCE(v_config->>'prefix', '');
    v_separator := COALESCE(v_config->>'separator', '');
    v_suffix := COALESCE(v_config->>'suffix', '');
    v_padding := COALESCE((v_config->>'padding_length')::INTEGER, 4);

    -- Build formatted string
    v_formatted := v_prefix || v_separator || LPAD(p_sequence_value::TEXT, v_padding, '0') || v_suffix;

    RETURN v_formatted;
END;
$$;


ALTER FUNCTION "public"."format_sequence_number"("p_sequence_type_id" "uuid", "p_sequence_value" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."format_sequence_number"("p_sequence_type_id" "uuid", "p_sequence_value" integer) IS 'Formats a sequence number using config from form_settings';



CREATE OR REPLACE FUNCTION "public"."generate_unique_sequence_for_contact"("p_tenant_id" "uuid", "p_is_live" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN public.get_next_formatted_sequence_safe(
        'CONTACT',
        p_tenant_id,
        p_is_live,
        't_contacts',
        'contact_number'
    );
END;
$$;


ALTER FUNCTION "public"."generate_unique_sequence_for_contact"("p_tenant_id" "uuid", "p_is_live" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_unique_sequence_for_contact"("p_tenant_id" "uuid", "p_is_live" boolean) IS 'Convenience wrapper for generating unique contact numbers with collision handling';



CREATE OR REPLACE FUNCTION "public"."generate_unique_sequence_for_contract"("p_tenant_id" "uuid", "p_is_live" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN public.get_next_formatted_sequence_safe(
        'CONTRACT',
        p_tenant_id,
        p_is_live,
        't_contracts',
        'contract_number'
    );
END;
$$;


ALTER FUNCTION "public"."generate_unique_sequence_for_contract"("p_tenant_id" "uuid", "p_is_live" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_unique_sequence_for_contract"("p_tenant_id" "uuid", "p_is_live" boolean) IS 'Convenience wrapper for generating unique contract numbers with collision handling';



CREATE OR REPLACE FUNCTION "public"."generate_unique_sequence_for_invoice"("p_tenant_id" "uuid", "p_is_live" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN public.get_next_formatted_sequence_safe(
        'INVOICE',
        p_tenant_id,
        p_is_live,
        't_invoices',
        'invoice_number'
    );
END;
$$;


ALTER FUNCTION "public"."generate_unique_sequence_for_invoice"("p_tenant_id" "uuid", "p_is_live" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_unique_sequence_for_invoice"("p_tenant_id" "uuid", "p_is_live" boolean) IS 'Convenience wrapper for generating unique invoice numbers with collision handling';



CREATE OR REPLACE FUNCTION "public"."generate_unique_suffix"("p_collision_count" integer) RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_unique_suffix"("p_collision_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_unique_suffix"("p_collision_count" integer) IS 'Generates alphabetic suffix (A, B, C... Z, AA, AB...) for handling sequence collisions';



CREATE OR REPLACE FUNCTION "public"."get_ai_agent_config"("p_group_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_settings JSONB;
    v_ai_config JSONB;
    v_group_name TEXT;
BEGIN
    -- Get group settings
    SELECT settings, group_name INTO v_settings, v_group_name
    FROM public.t_business_groups
    WHERE id = p_group_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Extract ai_agent config or empty object
    v_ai_config := COALESCE(v_settings->'ai_agent', '{}'::JSONB);

    -- Return config with defaults merged
    RETURN jsonb_build_object(
        'enabled', COALESCE((v_ai_config->>'enabled')::BOOLEAN, FALSE),
        'activation_keywords', COALESCE(
            v_ai_config->'activation_keywords',
            jsonb_build_array('Hi ' || v_group_name, 'Hello ' || v_group_name)
        ),
        'exit_keywords', COALESCE(
            v_ai_config->'exit_keywords',
            '["Bye", "Exit", "bye", "exit"]'::JSONB
        ),
        'welcome_message', COALESCE(
            v_ai_config->>'welcome_message',
            'Welcome to ' || v_group_name || '! How can I help you?'
        ),
        'goodbye_message', COALESCE(
            v_ai_config->>'goodbye_message',
            'Thank you for using ' || v_group_name || '! Say Hi ' || v_group_name || ' anytime.'
        ),
        'session_timeout_minutes', COALESCE(
            (v_ai_config->>'session_timeout_minutes')::INTEGER,
            30
        ),
        'default_language', COALESCE(
            v_ai_config->>'default_language',
            'en'
        ),
        'system_prompt_override', v_ai_config->>'system_prompt_override'
    );
END;
$$;


ALTER FUNCTION "public"."get_ai_agent_config"("p_group_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_ai_agent_config"("p_group_id" "uuid") IS 'Returns AI agent configuration for a group with defaults applied';



CREATE OR REPLACE FUNCTION "public"."get_ai_enabled_groups"() RETURNS TABLE("group_id" "uuid", "group_name" character varying, "group_type" character varying, "activation_keywords" "jsonb", "welcome_message" character varying, "description" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        bg.id AS group_id,
        bg.group_name::VARCHAR,
        bg.group_type::VARCHAR,
        bg.settings->'ai_agent'->'activation_keywords' AS activation_keywords,
        (bg.settings->'ai_agent'->>'welcome_message')::VARCHAR AS welcome_message,
        bg.description
    FROM public.t_business_groups bg
    WHERE
        bg.is_active = true
        AND (bg.settings->'ai_agent'->>'enabled')::BOOLEAN = true
    ORDER BY bg.group_name;
END;
$$;


ALTER FUNCTION "public"."get_ai_enabled_groups"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_ai_enabled_groups"() IS 'Returns all groups with AI agent enabled, including their activation keywords.';



CREATE OR REPLACE FUNCTION "public"."get_ai_session"("p_phone" character varying) RETURNS TABLE("session_id" "uuid", "user_id" "uuid", "group_id" "uuid", "group_code" character varying, "group_name" character varying, "session_scope" character varying, "channel" character varying, "context" "jsonb", "conversation_history" "jsonb", "detected_language" character varying, "started_at" timestamp with time zone, "last_activity_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_phone_digits VARCHAR;
BEGIN
    v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');

    -- First, expire old sessions (for web channel only)
    UPDATE public.t_ai_agent_sessions
    SET is_active = false, end_reason = 'timeout', ended_at = NOW()
    WHERE expires_at < NOW()
      AND expires_at IS NOT NULL
      AND is_active = true;

    -- Return active session
    RETURN QUERY
    SELECT
        s.id AS session_id,
        s.user_id,
        s.group_id,
        s.group_code::VARCHAR,
        bg.group_name::VARCHAR,
        s.session_scope::VARCHAR,
        s.channel::VARCHAR,
        s.context,
        s.conversation_history,
        s.detected_language::VARCHAR,
        s.started_at,
        s.last_activity_at
    FROM public.t_ai_agent_sessions s
    LEFT JOIN public.t_business_groups bg ON bg.id = s.group_id
    WHERE (s.phone = p_phone OR s.phone_normalized = v_phone_digits)
      AND s.is_active = true
    ORDER BY s.last_activity_at DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_ai_session"("p_phone" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_ai_session"("p_phone" character varying) IS 'Returns active AI session for a phone number. Auto-expires timed-out web sessions.';



CREATE OR REPLACE FUNCTION "public"."get_ai_session"("p_phone" character varying DEFAULT NULL::character varying, "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("session_id" "uuid", "user_id" "uuid", "phone" character varying, "group_id" "uuid", "group_code" character varying, "group_name" character varying, "chapter" character varying, "channel" character varying, "context" "jsonb", "conversation_history" "jsonb", "detected_language" character varying, "started_at" timestamp with time zone, "last_activity_at" timestamp with time zone, "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_phone_digits VARCHAR;
BEGIN
    -- Expire old sessions first (qualify column with table alias)
    UPDATE public.t_ai_agent_sessions sess
    SET is_active = false, end_reason = 'timeout', ended_at = NOW()
    WHERE sess.expires_at < NOW()
      AND sess.expires_at IS NOT NULL
      AND sess.is_active = true;

    -- Normalize phone if provided
    IF p_phone IS NOT NULL THEN
        v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');
    END IF;

    RETURN QUERY
    SELECT
        s.id AS session_id,
        s.user_id,
        s.phone::VARCHAR,
        s.group_id,
        s.group_code::VARCHAR,
        bg.group_name::VARCHAR,
        (bg.settings->>'chapter')::VARCHAR AS chapter,
        s.channel::VARCHAR,
        s.context,
        s.conversation_history,
        s.detected_language::VARCHAR,
        s.started_at,
        s.last_activity_at,
        s.expires_at
    FROM public.t_ai_agent_sessions s
    LEFT JOIN public.t_business_groups bg ON bg.id = s.group_id
    WHERE s.is_active = true
      AND (
          (p_phone IS NOT NULL AND (s.phone = p_phone OR s.phone_normalized = v_phone_digits))
          OR (p_user_id IS NOT NULL AND s.user_id = p_user_id)
      )
    ORDER BY s.last_activity_at DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_ai_session"("p_phone" character varying, "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid") RETURNS TABLE("session_id" "uuid", "user_id" "uuid", "phone" character varying, "group_id" "uuid", "group_code" character varying, "group_name" character varying, "session_scope" character varying, "channel" character varying, "context" "jsonb", "conversation_history" "jsonb", "detected_language" character varying, "started_at" timestamp with time zone, "last_activity_at" timestamp with time zone, "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- First, expire old sessions (for web channel only)
    UPDATE public.t_ai_agent_sessions
    SET is_active = false, end_reason = 'timeout', ended_at = NOW()
    WHERE expires_at < NOW()
      AND expires_at IS NOT NULL
      AND is_active = true;

    -- Return active session for this user
    RETURN QUERY
    SELECT
        s.id AS session_id,
        s.user_id,
        s.phone::VARCHAR,
        s.group_id,
        s.group_code::VARCHAR,
        bg.group_name::VARCHAR,
        s.session_scope::VARCHAR,
        s.channel::VARCHAR,
        s.context,
        s.conversation_history,
        s.detected_language::VARCHAR,
        s.started_at,
        s.last_activity_at,
        s.expires_at
    FROM public.t_ai_agent_sessions s
    LEFT JOIN public.t_business_groups bg ON bg.id = s.group_id
    WHERE s.user_id = p_user_id
      AND s.tenant_id = p_tenant_id
      AND s.is_active = true
    ORDER BY s.last_activity_at DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid") IS 'Returns active AI session for a tenant + user combination. Used for web/chat where user is authenticated.';



CREATE OR REPLACE FUNCTION "public"."get_all_master_categories"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    v_categories jsonb;
  BEGIN
    -- GET ALL ACTIVE MASTER CATEGORIES FOR UI DROPDOWNS
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', cm.id,
        'category_name', cm.category_name,
        'display_name', cm.display_name,
        'description', cm.description,
        'icon_name', cm.icon_name,
        'order_sequence', cm.order_sequence,
        'total_active_details', COALESCE(
          (SELECT COUNT(*) FROM m_category_details cd
           WHERE cd.category_id = cm.id AND cd.is_active = true),
          0
        )
      ) ORDER BY cm.order_sequence, cm.display_name
    ) INTO v_categories
    FROM m_category_master cm
    WHERE cm.is_active = true;

    -- SUCCESS RESPONSE
    RETURN jsonb_build_object(
      'success', true,
      'data', jsonb_build_object(
        'categories', COALESCE(v_categories, '[]'::jsonb),
        'total_categories', COALESCE(jsonb_array_length(v_categories), 0)
      ),
      'message', 'Master categories retrieved successfully'
    );

  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'OPERATION_ERROR'
      );
  END;
  $$;


ALTER FUNCTION "public"."get_all_master_categories"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_groups_for_chat"() RETURNS TABLE("group_id" "uuid", "group_name" "text", "trigger_phrase" "text", "description" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        bg.id AS group_id,
        bg.group_name,
        COALESCE(
            bg.settings->'chat'->>'trigger_phrase',
            bg.settings->'whatsapp'->>'trigger_phrase',
            'Hi ' || bg.group_name
        ) AS trigger_phrase,
        bg.description
    FROM public.t_business_groups bg
    WHERE bg.is_active = TRUE
      AND COALESCE((bg.settings->'chat'->>'bot_enabled')::BOOLEAN,
                   (bg.settings->'whatsapp'->>'bot_enabled')::BOOLEAN,
                   TRUE) = TRUE
    ORDER BY bg.group_name;
END;
$$;


ALTER FUNCTION "public"."get_available_groups_for_chat"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_resources"("p_tenant_id" "uuid", "p_is_live" boolean, "p_resource_type" character varying DEFAULT NULL::character varying, "p_filters" "jsonb" DEFAULT '{}'::"jsonb", "p_page" integer DEFAULT 1, "p_limit" integer DEFAULT 20) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
  DECLARE
    v_offset integer;
    v_total_count integer;
    v_resources jsonb;
    v_where_conditions text[] := ARRAY['r.tenant_id = $1', 'r.is_live = $2'];
    v_order_by text := 'ORDER BY r.name ASC';
    v_query text;
    v_count_query text;
    v_search_term text;
  BEGIN
    -- 1. VALIDATE INPUT PARAMETERS
    IF p_tenant_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'tenant_id is required',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    -- 2. VALIDATE AND SET PAGINATION
    v_offset := GREATEST((p_page - 1) * p_limit, 0);

    -- Limit the page size to prevent abuse
    IF p_limit > 100 THEN
      p_limit := 100;
    ELSIF p_limit < 1 THEN
      p_limit := 20;
    END IF;

    -- 3. BUILD DYNAMIC WHERE CONDITIONS SAFELY
    -- Resource type filter
    IF p_resource_type IS NOT NULL THEN
      v_where_conditions := v_where_conditions || ARRAY['r.resource_type_id = ''' || replace(p_resource_type, '''', '''''') || ''''];
    END IF;

    -- Status filter
    IF p_filters->>'status' IS NOT NULL THEN
      v_where_conditions := v_where_conditions || ARRAY['r.status = ''' || replace(p_filters->>'status', '''', '''''') || ''''];
    ELSE
      -- Default to active resources only
      v_where_conditions := v_where_conditions || ARRAY['r.status = ''active'''];
    END IF;

    -- Availability filter
    IF p_filters->>'available_only' IS NOT NULL AND p_filters->>'available_only' = 'true' THEN
      v_where_conditions := v_where_conditions || ARRAY['r.is_available = true'];
    END IF;

    -- Skills filter (check if resource has any of the required skills)
    IF p_filters->>'required_skills' IS NOT NULL AND p_filters->>'required_skills' != '[]' THEN
      v_where_conditions := v_where_conditions || ARRAY['r.skills ?| ARRAY[' ||
        (SELECT string_agg('''' || replace(value::text, '''', '''''') || '''', ',')
         FROM jsonb_array_elements_text(p_filters->'required_skills')) || ']'];
    END IF;

    -- Location filter
    IF p_filters->>'location_id' IS NOT NULL THEN
      v_where_conditions := v_where_conditions || ARRAY['r.location_id = ''' || replace(p_filters->>'location_id', '''', '''''') ||
  '''::uuid'];
    END IF;

    -- Mobile resources filter
    IF p_filters->>'mobile_only' IS NOT NULL AND p_filters->>'mobile_only' = 'true' THEN
      v_where_conditions := v_where_conditions || ARRAY['r.is_mobile = true'];
    END IF;

    -- Cost range filters
    IF p_filters->>'min_hourly_cost' IS NOT NULL THEN
      v_where_conditions := v_where_conditions || ARRAY['r.hourly_cost >= ' || (p_filters->>'min_hourly_cost')::numeric];
    END IF;

    IF p_filters->>'max_hourly_cost' IS NOT NULL THEN
      v_where_conditions := v_where_conditions || ARRAY['r.hourly_cost <= ' || (p_filters->>'max_hourly_cost')::numeric];
    END IF;

    -- Capacity filters
    IF p_filters->>'min_capacity_per_day' IS NOT NULL THEN
      v_where_conditions := v_where_conditions || ARRAY['r.capacity_per_day >= ' || (p_filters->>'min_capacity_per_day')::integer];
    END IF;

    -- Search functionality (case-insensitive)
    IF p_filters->>'search' IS NOT NULL AND trim(p_filters->>'search') != '' THEN
      v_search_term := '%' || lower(trim(p_filters->>'search')) || '%';
      v_where_conditions := v_where_conditions || ARRAY['(
        lower(r.name) LIKE ''' || replace(v_search_term, '''', '''''') || ''' OR
        lower(r.description) LIKE ''' || replace(v_search_term, '''', '''''') || '''
      )'];
    END IF;

    -- 4. BUILD SORTING
    IF p_filters->>'sort_by' IS NOT NULL THEN
      CASE p_filters->>'sort_by'
        WHEN 'name' THEN
          v_order_by := 'ORDER BY r.name ' || COALESCE(p_filters->>'sort_order', 'ASC');
        WHEN 'hourly_cost' THEN
          v_order_by := 'ORDER BY r.hourly_cost ' || COALESCE(p_filters->>'sort_order', 'ASC');
        WHEN 'capacity_per_day' THEN
          v_order_by := 'ORDER BY r.capacity_per_day ' || COALESCE(p_filters->>'sort_order', 'DESC');
        WHEN 'created_at' THEN
          v_order_by := 'ORDER BY r.created_at ' || COALESCE(p_filters->>'sort_order', 'DESC');
        ELSE
          v_order_by := 'ORDER BY r.name ASC';
      END CASE;
    END IF;

    -- 5. GET TOTAL COUNT
    v_count_query := 'SELECT COUNT(*) FROM t_catalog_resources r WHERE ' || array_to_string(v_where_conditions, ' AND ');

    EXECUTE v_count_query USING p_tenant_id, p_is_live INTO v_total_count;

    -- 6. GET RESOURCES WITH EXPLICIT FIELD SELECTION AND MASTER DATA LOOKUPS
    v_query := '
      SELECT jsonb_agg(
        jsonb_build_object(
          ''id'', r.id,
          ''name'', r.name,
          ''description'', r.description,
          ''resource_type_id'', r.resource_type_id,
          ''resource_type_display'', rt.name,
          ''resource_type_icon'', rt.icon,
          ''is_available'', r.is_available,
          ''capacity_per_day'', r.capacity_per_day,
          ''capacity_per_hour'', r.capacity_per_hour,
          ''working_hours'', r.working_hours,
          ''skills'', r.skills,
          ''attributes'', r.attributes,
          ''location_id'', r.location_id,
          ''is_mobile'', r.is_mobile,
          ''service_radius_km'', r.service_radius_km,
          ''hourly_cost'', r.hourly_cost,
          ''daily_cost'', r.daily_cost,
          ''currency_code'', r.currency_code,
          ''status'', r.status,
          ''created_at'', r.created_at,
          ''updated_at'', r.updated_at,
          ''created_by'', r.created_by,
          ''updated_by'', r.updated_by,
          -- Computed fields
          ''skills_count'', COALESCE(jsonb_array_length(r.skills), 0),
          ''current_utilization'', COALESCE(
            (SELECT COUNT(*) FROM t_catalog_service_resources sr
             WHERE sr.resource_type_id = r.resource_type_id
               AND sr.tenant_id = r.tenant_id
               AND sr.is_active = true),
            0
          ),
          ''pricing_models'', COALESCE(
            (SELECT jsonb_agg(
               jsonb_build_object(
                 ''pricing_type_id'', rp.pricing_type_id,
                 ''base_rate'', rp.base_rate,
                 ''currency_code'', rp.currency_code,
                 ''effective_from'', rp.effective_from,
                 ''effective_to'', rp.effective_to
               )
             )
             FROM t_catalog_resource_pricing rp
             WHERE rp.resource_id = r.id
               AND rp.is_active = true
               AND (rp.effective_to IS NULL OR rp.effective_to >= CURRENT_DATE)
            ),
            ''[]''::jsonb
          )
        ) ORDER BY ' ||
        CASE
          WHEN p_filters->>'sort_by' = 'name' THEN 'r.name ' || COALESCE(p_filters->>'sort_order', 'ASC')
          WHEN p_filters->>'sort_by' = 'hourly_cost' THEN 'r.hourly_cost ' || COALESCE(p_filters->>'sort_order', 'ASC')
          WHEN p_filters->>'sort_by' = 'capacity_per_day' THEN 'r.capacity_per_day ' || COALESCE(p_filters->>'sort_order', 'DESC')
          ELSE 'r.name ASC'
        END || '
      ) FROM (
        SELECT r.*
        FROM t_catalog_resources r
        LEFT JOIN m_catalog_resource_types rt ON r.resource_type_id = rt.id
        WHERE ' || array_to_string(v_where_conditions, ' AND ') || '
        ' || v_order_by || '
        LIMIT ' || p_limit || ' OFFSET ' || v_offset || '
      ) r
      LEFT JOIN m_catalog_resource_types rt ON r.resource_type_id = rt.id
    ';

    EXECUTE v_query USING p_tenant_id, p_is_live INTO v_resources;

    -- 7. SUCCESS RESPONSE WITH PAGINATION AND SUMMARY INFO
    RETURN jsonb_build_object(
      'success', true,
      'data', jsonb_build_object(
        'resources', COALESCE(v_resources, '[]'::jsonb),
        'summary', jsonb_build_object(
          'total_resources', v_total_count,
          'available_resources', (
            SELECT COUNT(*) FROM t_catalog_resources r
            WHERE r.tenant_id = p_tenant_id
              AND r.is_live = p_is_live
              AND r.status = 'active'
              AND r.is_available = true
          ),
          'resource_types', (
            SELECT jsonb_agg(DISTINCT r.resource_type_id)
            FROM t_catalog_resources r
            WHERE r.tenant_id = p_tenant_id
              AND r.is_live = p_is_live
              AND r.status = 'active'
          )
        )
      ),
      'pagination', jsonb_build_object(
        'page', p_page,
        'limit', p_limit,
        'total', v_total_count,
        'pages', CEILING(v_total_count::decimal / p_limit),
        'has_next', (p_page * p_limit) < v_total_count,
        'has_prev', p_page > 1
      ),
      'filters_applied', p_filters,
      'message', 'Resources retrieved successfully'
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- PROPER ERROR HANDLING
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'OPERATION_ERROR'
      );
  END;
  $_$;


ALTER FUNCTION "public"."get_available_resources"("p_tenant_id" "uuid", "p_is_live" boolean, "p_resource_type" character varying, "p_filters" "jsonb", "p_page" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cached_search"("p_group_id" "uuid", "p_query_normalized" "text") RETURNS TABLE("cache_id" "uuid", "results" "jsonb", "results_count" integer, "hit_count" integer, "is_cached" boolean)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_cache_record RECORD;
BEGIN
    -- Look for valid cache entry
    SELECT * INTO v_cache_record
    FROM public.t_query_cache qc
    WHERE qc.group_id = p_group_id
      AND qc.query_normalized = p_query_normalized
      AND qc.expires_at > NOW()
    LIMIT 1;

    IF FOUND THEN
        -- Update hit count and extend expiration
        PERFORM update_cache_on_hit(v_cache_record.id);

        RETURN QUERY SELECT
            v_cache_record.id,
            v_cache_record.results,
            v_cache_record.results_count,
            v_cache_record.hit_count + 1,
            TRUE;
    ELSE
        -- No cache found
        RETURN QUERY SELECT
            NULL::UUID,
            '{}'::JSONB,
            0,
            0,
            FALSE;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_cached_search"("p_group_id" "uuid", "p_query_normalized" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_campaign_stats"("p_campaign_code" character varying) RETURNS TABLE("metric" character varying, "value" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 'Total Leads'::VARCHAR, COUNT(*)::TEXT
    FROM t_campaign_leads WHERE campaign_code = p_campaign_code
    UNION ALL
    SELECT 'ContractNest Interest', COUNT(*)::TEXT
    FROM t_campaign_leads WHERE campaign_code = p_campaign_code AND interested_contractnest = TRUE
    UNION ALL
    SELECT 'FamilyKnows Interest', COUNT(*)::TEXT
    FROM t_campaign_leads WHERE campaign_code = p_campaign_code AND interested_familyknows = TRUE
    UNION ALL
    SELECT 'Both Products', COUNT(*)::TEXT
    FROM t_campaign_leads WHERE campaign_code = p_campaign_code AND interested_contractnest = TRUE AND interested_familyknows = TRUE
    UNION ALL
    SELECT 'Attending Breakfast', COUNT(*)::TEXT
    FROM t_campaign_leads WHERE campaign_code = p_campaign_code AND attending_breakfast = TRUE
    UNION ALL
    SELECT 'PDFs Sent', COUNT(*)::TEXT
    FROM t_campaign_leads WHERE campaign_code = p_campaign_code AND whatsapp_delivered = TRUE
    UNION ALL
    SELECT 'Converted', COUNT(*)::TEXT
    FROM t_campaign_leads WHERE campaign_code = p_campaign_code AND converted = TRUE;
END;
$$;


ALTER FUNCTION "public"."get_campaign_stats"("p_campaign_code" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_catalog_item_history"("p_item_id" "uuid") RETURNS TABLE("version_id" "uuid", "version_number" integer, "version_reason" "text", "created_at" timestamp with time zone, "created_by" "uuid", "is_current" boolean, "price_at_version" "jsonb", "name_at_version" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_original_item_id UUID;
BEGIN
  -- Get original item ID
  SELECT COALESCE(original_item_id, id) INTO v_original_item_id
  FROM t_catalog_items
  WHERE id = p_item_id;
  
  -- Return version history
  RETURN QUERY
  SELECT 
    ci.id,
    ci.version_number,
    ci.version_reason,
    ci.created_at,
    ci.created_by,
    ci.is_current_version,
    ci.price_attributes,
    ci.name
  FROM t_catalog_items ci
  WHERE ci.original_item_id = v_original_item_id OR ci.id = v_original_item_id
  ORDER BY ci.version_number DESC;
END;
$$;


ALTER FUNCTION "public"."get_catalog_item_history"("p_item_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_catalog_item_history"("p_item_id" "uuid") IS 'Returns complete version history for a catalog item including change tracking.';



CREATE OR REPLACE FUNCTION "public"."get_contact_with_relationships"("p_contact_id" "uuid", "p_is_live" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_contact jsonb;
  v_channels jsonb;
  v_addresses jsonb;
  v_contact_persons jsonb;
  v_parent_contacts jsonb;
  v_result jsonb;
BEGIN
  -- Get main contact
  SELECT to_jsonb(c.*) INTO v_contact
  FROM t_contacts c
  WHERE c.id = p_contact_id AND c.is_live = p_is_live;

  IF v_contact IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Contact not found',
      'code', 'CONTACT_NOT_FOUND'
    );
  END IF;

  -- Get contact channels
  SELECT COALESCE(jsonb_agg(to_jsonb(ch.*)), '[]'::jsonb) INTO v_channels
  FROM t_contact_channels ch
  WHERE ch.contact_id = p_contact_id;

  -- Get addresses with explicit field selection (FIXED)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', addr.id,
      'type', addr.type,
      'label', addr.label,
      'address_line1', addr.address_line1,
      'address_line2', addr.address_line2,
      'city', addr.city,
      'state_code', addr.state_code,
      'country_code', addr.country_code,
      'postal_code', addr.postal_code,
      'google_pin', addr.google_pin,
      'is_primary', addr.is_primary,
      'notes', addr.notes,
      'created_at', addr.created_at,
      'updated_at', addr.updated_at
    )
  ), '[]'::jsonb) INTO v_addresses
  FROM t_contact_addresses addr
  WHERE addr.contact_id = p_contact_id;

  -- Get contact persons (children)
  SELECT COALESCE(jsonb_agg(
    to_jsonb(cp.*) || jsonb_build_object(
      'contact_channels', COALESCE(cp_channels.channels, '[]'::jsonb)
    )
  ), '[]'::jsonb) INTO v_contact_persons
  FROM t_contacts cp
  LEFT JOIN (
    SELECT 
      contact_id,
      jsonb_agg(to_jsonb(ch.*)) as channels
    FROM t_contact_channels ch
    GROUP BY contact_id
  ) cp_channels ON cp.id = cp_channels.contact_id
  WHERE cp.parent_contact_ids @> jsonb_build_array(p_contact_id)
    AND cp.is_live = p_is_live;

  -- Get parent contacts if any
  IF (v_contact->'parent_contact_ids')::jsonb != '[]'::jsonb THEN
    SELECT COALESCE(jsonb_agg(
      to_jsonb(pc.*) || jsonb_build_object(
        'contact_channels', COALESCE(pc_channels.channels, '[]'::jsonb),
        'contact_addresses', COALESCE(pc_addresses.addresses, '[]'::jsonb)
      )
    ), '[]'::jsonb) INTO v_parent_contacts
    FROM t_contacts pc
    LEFT JOIN (
      SELECT 
        contact_id,
        jsonb_agg(to_jsonb(ch.*)) as channels
      FROM t_contact_channels ch
      GROUP BY contact_id
    ) pc_channels ON pc.id = pc_channels.contact_id
    LEFT JOIN (
      SELECT 
        contact_id,
        jsonb_agg(to_jsonb(addr.*)) as addresses
      FROM t_contact_addresses addr
      GROUP BY contact_id
    ) pc_addresses ON pc.id = pc_addresses.contact_id
    WHERE pc.id IN (
      SELECT jsonb_array_elements_text(v_contact->'parent_contact_ids')::uuid
    ) AND pc.is_live = p_is_live;
  ELSE
    v_parent_contacts := '[]'::jsonb;
  END IF;

  -- Combine all data
  SELECT 
    v_contact || 
    jsonb_build_object(
      'contact_channels', v_channels,
      'contact_addresses', v_addresses,
      'addresses', v_addresses,
      'contact_persons', v_contact_persons,
      'parent_contacts', v_parent_contacts
    ) INTO v_result;

  RETURN jsonb_build_object(
    'success', true,
    'data', v_result,
    'message', 'Contact retrieved successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'GET_CONTACT_ERROR'
    );
END;
$$;


ALTER FUNCTION "public"."get_contact_with_relationships"("p_contact_id" "uuid", "p_is_live" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_contact_with_relationships"("p_contact_id" "uuid", "p_is_live" boolean DEFAULT true, "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_contact jsonb;
  v_channels jsonb;
  v_addresses jsonb;
  v_contact_persons jsonb;
  v_parent_contacts jsonb;
  v_result jsonb;
  v_actual_tenant_id uuid;
BEGIN
  -- Get the tenant_id from JWT if not provided
  v_actual_tenant_id := COALESCE(
    p_tenant_id, 
    (auth.jwt() ->> 'tenant_id')::uuid,
    (SELECT tenant_id FROM t_user_profiles WHERE user_id = auth.uid() LIMIT 1)
  );

  -- Get main contact WITH TENANT CHECK
  SELECT to_jsonb(c.*) INTO v_contact
  FROM t_contacts c
  WHERE c.id = p_contact_id 
    AND c.is_live = p_is_live
    AND c.tenant_id = v_actual_tenant_id;  -- TENANT FILTER

  IF v_contact IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Contact not found or access denied',
      'code', 'CONTACT_NOT_FOUND'
    );
  END IF;

  -- Get contact channels
  SELECT COALESCE(jsonb_agg(to_jsonb(ch.*)), '[]'::jsonb) INTO v_channels
  FROM t_contact_channels ch
  WHERE ch.contact_id = p_contact_id;

  -- Get addresses with explicit field selection
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', addr.id,
      'type', addr.type,
      'label', addr.label,
      'address_line1', addr.address_line1,
      'address_line2', addr.address_line2,
      'city', addr.city,
      'state_code', addr.state_code,
      'country_code', addr.country_code,
      'postal_code', addr.postal_code,
      'google_pin', addr.google_pin,
      'is_primary', addr.is_primary,
      'notes', addr.notes,
      'created_at', addr.created_at,
      'updated_at', addr.updated_at
    )
  ), '[]'::jsonb) INTO v_addresses
  FROM t_contact_addresses addr
  WHERE addr.contact_id = p_contact_id;

  -- Get contact persons (children) WITH TENANT CHECK
  SELECT COALESCE(jsonb_agg(
    to_jsonb(cp.*) || jsonb_build_object(
      'contact_channels', COALESCE(cp_channels.channels, '[]'::jsonb)
    )
  ), '[]'::jsonb) INTO v_contact_persons
  FROM t_contacts cp
  LEFT JOIN (
    SELECT 
      contact_id,
      jsonb_agg(to_jsonb(ch.*)) as channels
    FROM t_contact_channels ch
    GROUP BY contact_id
  ) cp_channels ON cp.id = cp_channels.contact_id
  WHERE cp.parent_contact_ids @> jsonb_build_array(p_contact_id)
    AND cp.is_live = p_is_live
    AND cp.tenant_id = v_actual_tenant_id;  -- TENANT FILTER

  -- Get parent contacts if any WITH TENANT CHECK
  IF (v_contact->'parent_contact_ids')::jsonb != '[]'::jsonb AND 
     (v_contact->'parent_contact_ids') IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      to_jsonb(pc.*) || jsonb_build_object(
        'contact_channels', COALESCE(pc_channels.channels, '[]'::jsonb),
        'contact_addresses', COALESCE(pc_addresses.addresses, '[]'::jsonb)
      )
    ), '[]'::jsonb) INTO v_parent_contacts
    FROM t_contacts pc
    LEFT JOIN (
      SELECT 
        contact_id,
        jsonb_agg(to_jsonb(ch.*)) as channels
      FROM t_contact_channels ch
      GROUP BY contact_id
    ) pc_channels ON pc.id = pc_channels.contact_id
    LEFT JOIN (
      SELECT 
        contact_id,
        jsonb_agg(to_jsonb(addr.*)) as addresses
      FROM t_contact_addresses addr
      GROUP BY contact_id
    ) pc_addresses ON pc.id = pc_addresses.contact_id
    WHERE pc.id IN (
      SELECT jsonb_array_elements_text(v_contact->'parent_contact_ids')::uuid
    ) 
    AND pc.is_live = p_is_live
    AND pc.tenant_id = v_actual_tenant_id;  -- TENANT FILTER
  ELSE
    v_parent_contacts := '[]'::jsonb;
  END IF;

  -- Combine all data
  SELECT 
    v_contact || 
    jsonb_build_object(
      'contact_channels', v_channels,
      'contact_addresses', v_addresses,
      'addresses', v_addresses,  -- Duplicate for backward compatibility
      'contact_persons', v_contact_persons,
      'parent_contacts', v_parent_contacts
    ) INTO v_result;

  RETURN jsonb_build_object(
    'success', true,
    'data', v_result,
    'message', 'Contact retrieved successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'GET_CONTACT_ERROR'
    );
END;
$$;


ALTER FUNCTION "public"."get_contact_with_relationships"("p_contact_id" "uuid", "p_is_live" boolean, "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_tenant_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
    -- Get tenant_id from JWT claims
    RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_current_tenant_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_tenant_id"() IS 'Extract tenant_id from JWT claims';



CREATE OR REPLACE FUNCTION "public"."get_group_chat_config"("p_group_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_settings JSONB;
    v_chat_config JSONB;
    v_group_name TEXT;
BEGIN
    -- Get group settings
    SELECT settings, group_name INTO v_settings, v_group_name
    FROM public.t_business_groups
    WHERE id = p_group_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Extract chat config or use defaults
    v_chat_config := COALESCE(v_settings->'chat', '{}'::JSONB);

    -- Merge with defaults
    RETURN jsonb_build_object(
        'trigger_phrase', COALESCE(
            v_chat_config->>'trigger_phrase',
            v_settings->'whatsapp'->>'trigger_phrase',  -- Fallback to whatsapp trigger
            'Hi ' || v_group_name
        ),
        'exit_phrase', COALESCE(
            v_chat_config->>'exit_phrase',
            v_settings->'whatsapp'->>'exit_phrase',
            'Bye'
        ),
        'welcome_message', COALESCE(
            v_chat_config->>'welcome_message',
            'Welcome to ' || v_group_name || '! How can I help you today?'
        ),
        'goodbye_message', COALESCE(
            v_chat_config->>'goodbye_message',
            'Thank you for using ' || v_group_name || ' Directory! Have a great day!'
        ),
        'intent_buttons', COALESCE(
            v_chat_config->'intent_buttons',
            '[
                {"id": "search_offering", "label": "Who is into?", "icon": "search", "prompt": "What product or service are you looking for?"},
                {"id": "search_segment", "label": "Find by segment", "icon": "category", "prompt": "Which industry segment?"},
                {"id": "member_lookup", "label": "Member lookup", "icon": "person", "prompt": "Enter member or company name:"},
                {"id": "about_group", "label": "About this group", "icon": "info", "prompt": null}
            ]'::JSONB
        ),
        'bot_enabled', COALESCE(
            (v_chat_config->>'bot_enabled')::BOOLEAN,
            (v_settings->'whatsapp'->>'bot_enabled')::BOOLEAN,
            TRUE
        ),
        'max_results', COALESCE(
            (v_chat_config->>'max_results')::INT,
            (v_settings->'search_config'->>'max_results')::INT,
            5
        )
    );
END;
$$;


ALTER FUNCTION "public"."get_group_chat_config"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_latest_tool_result"("p_session_id" "uuid", "p_tool_name" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF p_tool_name IS NOT NULL THEN
        SELECT results INTO v_result
        FROM t_tool_results
        WHERE session_id = p_session_id
          AND tool_name = p_tool_name
        ORDER BY created_at DESC
        LIMIT 1;
    ELSE
        SELECT results INTO v_result
        FROM t_tool_results
        WHERE session_id = p_session_id
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;
    
    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;


ALTER FUNCTION "public"."get_latest_tool_result"("p_session_id" "uuid", "p_tool_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_member_card_details"("p_membership_id" "uuid") RETURNS TABLE("membership_id" "uuid", "business_name" "text", "contact_phone" "text", "contact_email" "text", "whatsapp_number" "text", "website_url" "text", "booking_url" "text", "logo_url" "text", "address" "text", "city" "text", "industry" "text", "description" "text", "group_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id AS membership_id,
        COALESCE(tp.business_name, 'Business')::TEXT AS business_name,
        COALESCE(m.profile_data->>'mobile_number', tp.business_phone)::TEXT AS contact_phone,
        tp.business_email::TEXT AS contact_email,
        COALESCE(tp.business_whatsapp, tp.business_phone)::TEXT AS whatsapp_number,
        tp.website_url::TEXT,
        tp.booking_url::TEXT,
        tp.logo_url::TEXT,
        COALESCE(tp.address_line1, '')::TEXT AS address,
        tp.city::TEXT,
        ci.name::TEXT AS industry,
        COALESCE(tp.short_description, m.profile_data->>'short_description')::TEXT AS description,
        bg.group_name::TEXT AS group_name
    FROM t_group_memberships m
    LEFT JOIN t_tenant_profiles tp ON tp.tenant_id = m.tenant_id
    LEFT JOIN t_business_groups bg ON bg.id = m.group_id
    LEFT JOIN m_catalog_industries ci ON ci.id = tp.industry_id
    WHERE m.id = p_membership_id
      AND m.status = 'active'
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_member_card_details"("p_membership_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_member_contact"("p_membership_id" "uuid" DEFAULT NULL::"uuid", "p_group_id" "uuid" DEFAULT NULL::"uuid", "p_scope" character varying DEFAULT 'group'::character varying, "p_business_name" character varying DEFAULT NULL::character varying) RETURNS TABLE("membership_id" "uuid", "tenant_id" "uuid", "group_id" "uuid", "group_name" character varying, "business_name" character varying, "short_description" "text", "ai_enhanced_description" "text", "industry" character varying, "chapter" character varying, "city" character varying, "state_code" character varying, "address_line1" character varying, "mobile_number" character varying, "business_phone_country_code" character varying, "business_email" character varying, "website_url" character varying, "logo_url" character varying, "booking_url" character varying, "business_whatsapp" character varying, "business_whatsapp_country_code" character varying, "member_number" character varying, "approved_keywords" "text"[], "has_access" boolean, "full_address" "text", "card_url" "text", "vcard_url" "text", "semantic_clusters" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        gm.id AS membership_id,
        gm.tenant_id,
        gm.group_id,
        bg.group_name::VARCHAR,
        tp.business_name::VARCHAR,
        COALESCE(tp.short_description, gm.profile_data->>'short_description')::TEXT AS short_description,
        (gm.profile_data->>'ai_enhanced_description')::TEXT AS ai_enhanced_description,
        COALESCE(tp.industry_id, 'General')::VARCHAR AS industry,
        COALESCE(gm.profile_data->>'chapter', bg.settings->>'chapter')::VARCHAR AS chapter,
        TRIM(BOTH E'\r\n ' FROM COALESCE(tp.city, ''))::VARCHAR AS city,
        tp.state_code::VARCHAR,
        tp.address_line1::VARCHAR,
        COALESCE(gm.profile_data->>'mobile_number', tp.business_phone)::VARCHAR AS mobile_number,
        tp.business_phone_country_code::VARCHAR,
        tp.business_email::VARCHAR,
        tp.website_url::VARCHAR,
        tp.logo_url::VARCHAR,
        tp.booking_url::VARCHAR,
        tp.business_whatsapp::VARCHAR,
        tp.business_whatsapp_country_code::VARCHAR,
        (gm.profile_data->>'member_number')::VARCHAR AS member_number,
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(gm.profile_data->'approved_keywords', '[]'::JSONB)))::TEXT[] AS approved_keywords,
        CASE
            WHEN p_scope = 'product' THEN true
            WHEN p_scope = 'group' AND gm.group_id = p_group_id THEN true
            ELSE false
        END AS has_access,
        CONCAT_WS(', ', 
            NULLIF(tp.address_line1::TEXT, ''), 
            NULLIF(TRIM(BOTH E'\r\n ' FROM COALESCE(tp.city, ''))::TEXT, ''), 
            NULLIF(tp.state_code::TEXT, '')
        )::TEXT AS full_address,
        ('https://n8n.srv1096269.hstgr.cloud/webhook/card/' || gm.id::TEXT)::TEXT AS card_url,
        ('https://n8n.srv1096269.hstgr.cloud/webhook/vcard/' || gm.id::TEXT)::TEXT AS vcard_url,
        COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', sc.id,
                'primary_term', sc.primary_term,
                'related_terms', sc.related_terms,
                'category', sc.category,
                'confidence_score', sc.confidence_score
            ))
            FROM t_semantic_clusters sc
            WHERE sc.membership_id = gm.id
            AND sc.is_active = true
        ), '[]'::jsonb) AS semantic_clusters
    FROM public.t_group_memberships gm
    LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id
    LEFT JOIN public.t_business_groups bg ON bg.id = gm.group_id
    WHERE 
        gm.is_active = true
        AND (
            -- Match by membership_id if provided
            (p_membership_id IS NOT NULL AND gm.id = p_membership_id)
            OR
            -- Match by business_name if membership_id not provided
            (p_membership_id IS NULL AND p_business_name IS NOT NULL AND 
             LOWER(tp.business_name) LIKE '%' || LOWER(p_business_name) || '%' AND
             (p_group_id IS NULL OR gm.group_id = p_group_id))
        )
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_member_contact"("p_membership_id" "uuid", "p_group_id" "uuid", "p_scope" character varying, "p_business_name" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_members_by_scope"("p_scope" character varying DEFAULT 'group'::character varying, "p_group_id" "uuid" DEFAULT NULL::"uuid", "p_industry_filter" character varying DEFAULT NULL::character varying, "p_chapter_filter" character varying DEFAULT NULL::character varying, "p_search_text" character varying DEFAULT NULL::character varying, "p_limit" integer DEFAULT 10, "p_offset" integer DEFAULT 0) RETURNS TABLE("membership_id" "uuid", "tenant_id" "uuid", "group_id" "uuid", "group_name" character varying, "chapter" character varying, "business_name" character varying, "short_description" "text", "industry" character varying, "city" character varying, "state_code" character varying, "address_line1" character varying, "contact_phone" character varying, "business_phone_country_code" character varying, "contact_email" character varying, "website_url" character varying, "logo_url" character varying, "booking_url" character varying, "business_whatsapp" character varying, "business_whatsapp_country_code" character varying, "member_number" character varying, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_total BIGINT;
BEGIN
    -- Get total count first
    SELECT COUNT(*) INTO v_total
    FROM t_group_memberships gm
    LEFT JOIN t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id
    WHERE gm.is_active = true
      AND (p_group_id IS NULL OR gm.group_id = p_group_id)
      AND (p_industry_filter IS NULL OR p_industry_filter = '' OR LOWER(tp.industry_id) = LOWER(p_industry_filter))
      AND (p_chapter_filter IS NULL OR p_chapter_filter = '' OR LOWER(gm.profile_data->>'chapter') = LOWER(p_chapter_filter))
      AND (p_search_text IS NULL OR p_search_text = '' OR 
           LOWER(tp.business_name) LIKE '%' || LOWER(p_search_text) || '%');

    RETURN QUERY
    SELECT
        gm.id AS membership_id,
        gm.tenant_id,
        gm.group_id,
        bg.group_name::VARCHAR,
        (bg.settings->>'chapter')::VARCHAR AS chapter,
        tp.business_name::VARCHAR,
        COALESCE(tp.short_description, gm.profile_data->>'short_description')::TEXT AS short_description,
        COALESCE(tp.industry_id, 'General')::VARCHAR AS industry,
        TRIM(BOTH E'\r\n ' FROM COALESCE(tp.city, ''))::VARCHAR AS city,
        tp.state_code::VARCHAR,
        tp.address_line1::VARCHAR,
        COALESCE(gm.profile_data->>'mobile_number', tp.business_phone)::VARCHAR AS contact_phone,
        tp.business_phone_country_code::VARCHAR,
        tp.business_email::VARCHAR AS contact_email,
        tp.website_url::VARCHAR,
        tp.logo_url::VARCHAR,
        tp.booking_url::VARCHAR,
        tp.business_whatsapp::VARCHAR,
        tp.business_whatsapp_country_code::VARCHAR,
        (gm.profile_data->>'member_number')::VARCHAR AS member_number,
        v_total AS total_count
    FROM t_group_memberships gm
    LEFT JOIN t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id
    LEFT JOIN t_business_groups bg ON bg.id = gm.group_id
    WHERE gm.is_active = true
      AND (p_group_id IS NULL OR gm.group_id = p_group_id)
      AND (p_industry_filter IS NULL OR p_industry_filter = '' OR LOWER(tp.industry_id) = LOWER(p_industry_filter))
      AND (p_chapter_filter IS NULL OR p_chapter_filter = '' OR LOWER(gm.profile_data->>'chapter') = LOWER(p_chapter_filter))
      AND (p_search_text IS NULL OR p_search_text = '' OR 
           LOWER(tp.business_name) LIKE '%' || LOWER(p_search_text) || '%')
    ORDER BY tp.business_name
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_members_by_scope"("p_scope" character varying, "p_group_id" "uuid", "p_industry_filter" character varying, "p_chapter_filter" character varying, "p_search_text" character varying, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_formatted_sequence"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_sequence_type_id UUID;
    v_next_value INTEGER;
    v_formatted TEXT;
    v_config JSONB;
    v_was_reset BOOLEAN;
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

    -- Check for reset first
    v_was_reset := public.check_and_reset_sequence(
        v_sequence_type_id,
        p_tenant_id,
        p_is_live
    );

    -- Get next value
    v_next_value := public.get_next_sequence_number(
        v_sequence_type_id,
        p_tenant_id,
        p_is_live
    );

    -- Format it
    v_formatted := public.format_sequence_number(v_sequence_type_id, v_next_value);

    RETURN jsonb_build_object(
        'formatted', v_formatted,
        'sequence', v_next_value,
        'prefix', COALESCE(v_config->>'prefix', ''),
        'separator', COALESCE(v_config->>'separator', ''),
        'suffix', COALESCE(v_config->>'suffix', ''),
        'was_reset', v_was_reset
    );
END;
$$;


ALTER FUNCTION "public"."get_next_formatted_sequence"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_next_formatted_sequence"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean) IS 'Combined function: gets next sequence and formats it in one call';



CREATE OR REPLACE FUNCTION "public"."get_next_formatted_sequence_safe"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean DEFAULT true, "p_table_name" "text" DEFAULT NULL::"text", "p_column_name" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $_$
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
$_$;


ALTER FUNCTION "public"."get_next_formatted_sequence_safe"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean, "p_table_name" "text", "p_column_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_next_formatted_sequence_safe"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean, "p_table_name" "text", "p_column_name" "text") IS 'Gets next sequence number with automatic collision detection and suffix generation.
If a duplicate is found in the target table, appends -A, -B, etc. up to -Z.
Use this function when inserting records to ensure unique sequence numbers.';



CREATE OR REPLACE FUNCTION "public"."get_next_formatted_sequence_v2"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_counter RECORD;
    v_next_value INTEGER;
    v_formatted TEXT;
BEGIN
    SELECT * INTO v_counter
    FROM public.t_sequence_counters
    WHERE sequence_code = p_sequence_code
      AND tenant_id = p_tenant_id
      AND is_live = p_is_live
    FOR UPDATE;

    IF v_counter IS NULL THEN
        RAISE EXCEPTION 'Sequence % not found for tenant in % environment',
            p_sequence_code,
            CASE WHEN p_is_live THEN 'LIVE' ELSE 'TEST' END;
    END IF;

    IF v_counter.current_value = 0 THEN
        v_next_value := COALESCE(v_counter.start_value, 1);
    ELSE
        v_next_value := v_counter.current_value + COALESCE(v_counter.increment_by, 1);
    END IF;

    UPDATE public.t_sequence_counters
    SET current_value = v_next_value,
        updated_at = NOW()
    WHERE id = v_counter.id;

    v_formatted := COALESCE(v_counter.prefix, '') ||
                   COALESCE(v_counter.separator, '') ||
                   LPAD(v_next_value::TEXT, COALESCE(v_counter.padding_length, 4), '0') ||
                   COALESCE(v_counter.suffix, '');

    RETURN jsonb_build_object(
        'formatted', v_formatted,
        'raw_value', v_next_value,
        'sequence_code', p_sequence_code,
        'prefix', COALESCE(v_counter.prefix, ''),
        'separator', COALESCE(v_counter.separator, ''),
        'suffix', COALESCE(v_counter.suffix, '')
    );
END;
$$;


ALTER FUNCTION "public"."get_next_formatted_sequence_v2"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_sequence_number"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean DEFAULT true) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_next_value INTEGER;
    v_config JSONB;
    v_start_value INTEGER;
BEGIN
    -- Try to increment existing counter atomically
    UPDATE public.t_sequence_counters
    SET current_value = current_value + 1,
        updated_at = NOW()
    WHERE sequence_type_id = p_sequence_type_id
      AND tenant_id = p_tenant_id
      AND is_live = p_is_live
    RETURNING current_value INTO v_next_value;

    -- If no row was updated, we need to create one
    IF v_next_value IS NULL THEN
        -- Get the start_value from form_settings in t_category_details
        SELECT COALESCE((form_settings->>'start_value')::INTEGER, 1)
        INTO v_start_value
        FROM public.t_category_details
        WHERE id = p_sequence_type_id;

        -- Default to 1 if not found
        IF v_start_value IS NULL THEN
            v_start_value := 1;
        END IF;

        -- Insert new counter with start_value
        INSERT INTO public.t_sequence_counters (
            sequence_type_id,
            tenant_id,
            current_value,
            is_live,
            last_reset_date
        )
        VALUES (
            p_sequence_type_id,
            p_tenant_id,
            v_start_value,
            p_is_live,
            NOW()
        )
        ON CONFLICT (sequence_type_id, tenant_id, is_live)
        DO UPDATE SET
            current_value = t_sequence_counters.current_value + 1,
            updated_at = NOW()
        RETURNING current_value INTO v_next_value;
    END IF;

    RETURN v_next_value;
END;
$$;


ALTER FUNCTION "public"."get_next_sequence_number"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_next_sequence_number"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) IS 'Atomically increments and returns the next sequence number';



CREATE OR REPLACE FUNCTION "public"."get_next_sequence_number_with_reset"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean DEFAULT true) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_was_reset BOOLEAN;
    v_next_value INTEGER;
BEGIN
    -- First check if reset is needed
    v_was_reset := public.check_and_reset_sequence(
        p_sequence_type_id,
        p_tenant_id,
        p_is_live
    );

    -- Then get next value
    v_next_value := public.get_next_sequence_number(
        p_sequence_type_id,
        p_tenant_id,
        p_is_live
    );

    RETURN v_next_value;
END;
$$;


ALTER FUNCTION "public"."get_next_sequence_number_with_reset"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_tax_rate_sequence"("p_tenant_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(sequence_no), 0) + 1
  INTO next_seq
  FROM t_tax_rates 
  WHERE tenant_id = p_tenant_id 
    AND is_active = true;
  
  RETURN next_seq;
END;
$$;


ALTER FUNCTION "public"."get_next_tax_rate_sequence"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_version_number"("p_original_item_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_max_version INTEGER;
BEGIN
  -- Get the highest version number for this original item
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_max_version
  FROM t_catalog_items
  WHERE original_item_id = p_original_item_id OR id = p_original_item_id;
  
  RETURN v_max_version;
END;
$$;


ALTER FUNCTION "public"."get_next_version_number"("p_original_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_session"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_channel" "text" DEFAULT 'web'::"text") RETURNS "public"."t_chat_sessions"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_session public.t_chat_sessions;
BEGIN
    -- Look for existing active session
    SELECT * INTO v_session
    FROM public.t_chat_sessions
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND channel = p_channel
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        -- Extend session expiry on activity
        UPDATE public.t_chat_sessions
        SET
            last_activity_at = NOW(),
            updated_at = NOW(),
            expires_at = NOW() + INTERVAL '30 minutes'
        WHERE id = v_session.id
        RETURNING * INTO v_session;

        RETURN v_session;
    ELSE
        -- Create new session
        INSERT INTO public.t_chat_sessions (
            user_id,
            tenant_id,
            channel,
            intent_state,
            created_at,
            updated_at,
            last_activity_at,
            expires_at
        ) VALUES (
            p_user_id,
            p_tenant_id,
            p_channel,
            'IDLE',
            NOW(),
            NOW(),
            NOW(),
            NOW() + INTERVAL '30 minutes'
        )
        RETURNING * INTO v_session;

        RETURN v_session;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_or_create_session"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_channel" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_master_data"("p_category_name" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    v_result jsonb;
    v_category_result jsonb;
  BEGIN
    -- 1. VALIDATE INPUT PARAMETERS
    IF p_category_name IS NOT NULL AND trim(p_category_name) = '' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'category_name cannot be empty',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    -- 2. GET SINGLE CATEGORY OR ALL CATEGORIES
    IF p_category_name IS NOT NULL THEN
      -- GET SPECIFIC MASTER DATA CATEGORY WITH EXPLICIT FIELDS
      SELECT jsonb_build_object(
        'category', jsonb_build_object(
          'id', cm.id,
          'category_name', cm.category_name,
          'display_name', cm.display_name,
          'description', cm.description,
          'icon_name', cm.icon_name,
          'order_sequence', cm.order_sequence,
          'is_active', cm.is_active,
          'created_at', cm.created_at,
          'updated_at', cm.updated_at
        ),
        'details', COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', cd.id,
              'sub_cat_name', cd.sub_cat_name,
              'display_name', cd.display_name,
              'hexcolor', cd.hexcolor,
              'icon_name', cd.icon_name,
              'sequence_no', cd.sequence_no,
              'description', cd.description,
              'tool_tip', cd.tool_tip,
              'tags', cd.tags,
              'form_settings', cd.form_settings,
              'is_active', cd.is_active,
              'is_deletable', cd.is_deletable,
              'created_at', cd.created_at,
              'updated_at', cd.updated_at
            ) ORDER BY cd.sequence_no, cd.display_name
          ) FILTER (WHERE cd.id IS NOT NULL),
          '[]'::jsonb
        ),
        'total_details', COALESCE(
          (SELECT COUNT(*) FROM m_category_details WHERE category_id = cm.id AND is_active = true),
          0
        )
      ) INTO v_category_result
      FROM m_category_master cm
      LEFT JOIN m_category_details cd ON cm.id = cd.category_id AND cd.is_active = true
      WHERE cm.category_name = p_category_name
        AND cm.is_active = true
      GROUP BY cm.id, cm.category_name, cm.display_name, cm.description,
               cm.icon_name, cm.order_sequence, cm.is_active, cm.created_at, cm.updated_at;

      -- CHECK IF CATEGORY EXISTS
      IF v_category_result IS NULL THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Master data category not found: ' || p_category_name,
          'code', 'CATEGORY_NOT_FOUND',
          'available_categories', (
            SELECT jsonb_agg(category_name ORDER BY order_sequence, category_name)
            FROM m_category_master
            WHERE is_active = true
          )
        );
      END IF;

      v_result := v_category_result;

    ELSE
      -- GET ALL MASTER DATA CATEGORIES WITH SUMMARY INFO
      SELECT jsonb_build_object(
        'categories', jsonb_agg(
          jsonb_build_object(
            'id', cm.id,
            'category_name', cm.category_name,
            'display_name', cm.display_name,
            'description', cm.description,
            'icon_name', cm.icon_name,
            'order_sequence', cm.order_sequence,
            'is_active', cm.is_active,
            'total_details', COALESCE(
              (SELECT COUNT(*) FROM m_category_details cd WHERE cd.category_id = cm.id AND cd.is_active = true),
              0
            ),
            'sample_details', COALESCE(
              (SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', cd.id,
                    'sub_cat_name', cd.sub_cat_name,
                    'display_name', cd.display_name,
                    'hexcolor', cd.hexcolor,
                    'icon_name', cd.icon_name
                  ) ORDER BY cd.sequence_no, cd.display_name
                )
                FROM (
                  SELECT * FROM m_category_details cd
                  WHERE cd.category_id = cm.id AND cd.is_active = true
                  ORDER BY cd.sequence_no, cd.display_name
                  LIMIT 5
                ) cd
              ),
              '[]'::jsonb
            ),
            'created_at', cm.created_at,
            'updated_at', cm.updated_at
          ) ORDER BY cm.order_sequence, cm.display_name
        ),
        'total_categories', COUNT(*),
        'active_categories', COUNT(*) FILTER (WHERE cm.is_active = true)
      ) INTO v_result
      FROM m_category_master cm
      WHERE cm.is_active = true
      GROUP BY (); -- Aggregate all rows

    END IF;

    -- 3. SUCCESS RESPONSE
    RETURN jsonb_build_object(
      'success', true,
      'data', v_result,
      'message', CASE
        WHEN p_category_name IS NOT NULL
        THEN 'Master data retrieved successfully for category: ' || p_category_name
        ELSE 'All master data categories retrieved successfully'
      END,
      'query_info', jsonb_build_object(
        'category_requested', p_category_name,
        'is_single_category', p_category_name IS NOT NULL,
        'retrieved_at', NOW()
      )
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- PROPER ERROR HANDLING
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'OPERATION_ERROR',
        'query_info', jsonb_build_object(
          'category_requested', p_category_name,
          'error_occurred_at', NOW()
        )
      );
  END;
  $$;


ALTER FUNCTION "public"."get_product_master_data"("p_category_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_resolved_intents"("p_group_id" "uuid", "p_user_role" character varying DEFAULT 'member'::character varying, "p_channel" character varying DEFAULT 'web'::character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_group_intents JSONB;
    v_resolved JSONB := '[]'::JSONB;
    v_intent_override JSONB;
    v_master RECORD;
    v_allowed_roles VARCHAR[];
    v_allowed_channels VARCHAR[];
    v_intent_code VARCHAR;
BEGIN
    -- Get group's intent_buttons from settings.chat
    SELECT COALESCE(settings->'chat'->'intent_buttons', '[]'::JSONB)
    INTO v_group_intents
    FROM t_business_groups
    WHERE id = p_group_id;

    -- If no group intents defined, use all active system intents filtered by RBAC
    IF v_group_intents IS NULL OR v_group_intents = '[]'::JSONB THEN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'intent_code', intent_code,
                'label', default_label,
                'icon', default_icon,
                'prompt', default_prompt,
                'intent_type', intent_type,
                'requires_ai', requires_ai,
                'cacheable', cacheable,
                'max_results', default_max_results,
                'scopes', default_scopes
            )
        ), '[]'::JSONB) INTO v_resolved
        FROM t_intent_definitions
        WHERE is_active = TRUE
          AND p_user_role = ANY(default_roles)
          AND p_channel = ANY(default_channels);

        RETURN v_resolved;
    END IF;

    -- Process each group intent override
    FOR v_intent_override IN SELECT * FROM jsonb_array_elements(v_group_intents)
    LOOP
        -- Get intent_code (support both 'intent_code' and legacy 'id' field)
        v_intent_code := COALESCE(
            v_intent_override->>'intent_code',
            v_intent_override->>'id'
        );

        -- Skip if no intent code
        IF v_intent_code IS NULL THEN
            CONTINUE;
        END IF;

        -- Skip if explicitly disabled
        IF (v_intent_override->>'enabled')::BOOLEAN = FALSE THEN
            CONTINUE;
        END IF;

        -- Get master definition
        SELECT * INTO v_master
        FROM t_intent_definitions
        WHERE intent_code = v_intent_code
          AND is_active = TRUE;

        -- Skip if intent not found in master
        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        -- Determine allowed roles (group override or master default)
        IF v_intent_override ? 'roles' AND jsonb_array_length(v_intent_override->'roles') > 0 THEN
            SELECT ARRAY(SELECT jsonb_array_elements_text(v_intent_override->'roles'))
            INTO v_allowed_roles;
        ELSE
            v_allowed_roles := v_master.default_roles;
        END IF;

        -- Check role permission
        IF NOT (p_user_role = ANY(v_allowed_roles)) THEN
            CONTINUE;
        END IF;

        -- Determine allowed channels (group override or master default)
        IF v_intent_override ? 'channels' AND jsonb_array_length(v_intent_override->'channels') > 0 THEN
            SELECT ARRAY(SELECT jsonb_array_elements_text(v_intent_override->'channels'))
            INTO v_allowed_channels;
        ELSE
            v_allowed_channels := v_master.default_channels;
        END IF;

        -- Check channel permission
        IF NOT (p_channel = ANY(v_allowed_channels)) THEN
            CONTINUE;
        END IF;

        -- Build resolved intent with merged values
        v_resolved := v_resolved || jsonb_build_object(
            'intent_code', v_master.intent_code,
            'label', COALESCE(v_intent_override->>'label', v_master.default_label),
            'icon', COALESCE(v_intent_override->>'icon', v_master.default_icon),
            'prompt', COALESCE(v_intent_override->>'prompt', v_master.default_prompt),
            'intent_type', v_master.intent_type,
            'requires_ai', v_master.requires_ai,
            'cacheable', v_master.cacheable,
            'max_results', COALESCE(
                (v_intent_override->>'max_results')::INT,
                v_master.default_max_results
            ),
            'scopes', COALESCE(
                v_intent_override->'scopes',
                to_jsonb(v_master.default_scopes)
            )
        );
    END LOOP;

    RETURN v_resolved;
END;
$$;


ALTER FUNCTION "public"."get_resolved_intents"("p_group_id" "uuid", "p_user_role" character varying, "p_channel" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_resolved_intents"("p_group_id" "uuid", "p_user_role" character varying, "p_channel" character varying) IS 'Resolves intents for a group with RBAC filtering based on user role and channel';



CREATE OR REPLACE FUNCTION "public"."get_segments_by_scope"("p_scope" character varying DEFAULT 'group'::character varying, "p_group_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("segment_name" character varying, "industry_id" character varying, "member_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ci.name::VARCHAR AS segment_name,
        tp.industry_id::VARCHAR,
        COUNT(*)::BIGINT AS member_count
    FROM public.t_group_memberships gm
    LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id
    LEFT JOIN public.m_catalog_industries ci ON ci.id = tp.industry_id
    WHERE
        gm.status = 'active'
        AND gm.is_active = true
        AND tp.industry_id IS NOT NULL
        AND ci.name IS NOT NULL
        AND CASE
            WHEN p_scope = 'product' THEN true
            WHEN p_scope = 'group' THEN gm.group_id = p_group_id
            ELSE gm.group_id = p_group_id
        END
    GROUP BY ci.name, tp.industry_id
    ORDER BY member_count DESC, ci.name;
END;
$$;


ALTER FUNCTION "public"."get_segments_by_scope"("p_scope" character varying, "p_group_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_segments_by_scope"("p_scope" character varying, "p_group_id" "uuid") IS 'Lists industry segments with member counts for a scope.';



CREATE OR REPLACE FUNCTION "public"."get_sequence_status"("p_tenant_id" "uuid", "p_is_live" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', cd.id,
            'code', cd.sub_cat_name,
            'name', cd.display_name,
            'config', cd.form_settings,
            'current_value', COALESCE(sc.current_value, 0),
            'last_reset_date', sc.last_reset_date,
            'next_formatted', public.format_sequence_number(
                cd.id,
                COALESCE(sc.current_value, 0) + 1
            ),
            'is_active', cd.is_active,
            'hexcolor', cd.hexcolor,
            'icon_name', cd.icon_name
        )
        ORDER BY cd.sequence_no
    )
    INTO v_result
    FROM public.t_category_details cd
    JOIN public.t_category_master cm ON cd.category_id = cm.id
    LEFT JOIN public.t_sequence_counters sc
        ON sc.sequence_type_id = cd.id
        AND sc.tenant_id = p_tenant_id
        AND sc.is_live = p_is_live
    WHERE cm.category_name = 'sequence_numbers'
      AND cd.tenant_id = p_tenant_id
      AND cd.is_live = p_is_live;

    RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;


ALTER FUNCTION "public"."get_sequence_status"("p_tenant_id" "uuid", "p_is_live" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_sequence_status"("p_tenant_id" "uuid", "p_is_live" boolean) IS 'Returns status of all sequence configurations for a tenant.
Includes current value, last reset date, and next formatted number.';



CREATE OR REPLACE FUNCTION "public"."get_service_catalog_item"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    v_result jsonb;
    v_resources jsonb;
  BEGIN
    -- 1. VALIDATE INPUT PARAMETERS
    IF p_service_id IS NULL OR p_tenant_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'service_id and tenant_id are required',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    -- 2. GET SERVICE WITH EXPLICIT FIELD SELECTION AND MASTER DATA LOOKUPS
    SELECT jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'short_description', s.short_description,
      'description_content', s.description_content,
      'description_format', s.description_format,
      'type', s.type,
      'industry_id', s.industry_id,
      'category_id', s.category_id,
      'status', s.status,
      'is_live', s.is_live,
      'parent_id', s.parent_id,
      'is_variant', s.is_variant,
      'price_attributes', s.price_attributes,
      'tax_config', s.tax_config,
      'service_attributes', s.service_attributes,
      'resource_requirements', s.resource_requirements,
      'specifications', s.specifications,
      'terms_content', s.terms_content,
      'terms_format', s.terms_format,
      'variant_attributes', s.variant_attributes,
      'metadata', s.metadata,
      'created_at', s.created_at,
      'updated_at', s.updated_at,
      'created_by', s.created_by,
      'updated_by', s.updated_by,
      -- Master data display values
      'industry_display', i.name,
      'industry_icon', i.icon,
      'category_display', c.name,
      'category_icon', c.icon,
      'pricing_type_display', pt.display_name,
      'pricing_type_color', pt.hexcolor,
      'service_status_display', ss.display_name,
      'service_status_color', ss.hexcolor,
      'tax_applicability_display', ta.display_name
    ) INTO v_result
    FROM t_catalog_items s
    LEFT JOIN m_catalog_industries i ON s.industry_id = i.id
    LEFT JOIN m_catalog_categories c ON s.category_id = c.id
    LEFT JOIN m_category_details pt ON (s.price_attributes->>'pricing_type_id')::uuid = pt.id
    LEFT JOIN m_category_details ss ON (s.service_attributes->>'service_status_id')::uuid = ss.id
    LEFT JOIN m_category_details ta ON (s.tax_config->>'tax_applicability_id')::uuid = ta.id
    WHERE s.id = p_service_id
      AND s.tenant_id = p_tenant_id
      AND s.is_live = p_is_live;

    -- 3. CHECK IF SERVICE EXISTS
    IF v_result IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service not found',
        'code', 'RECORD_NOT_FOUND'
      );
    END IF;

    -- 4. GET ASSOCIATED RESOURCES WITH EXPLICIT FIELD SELECTION
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', sr.id,
        'resource_type_id', sr.resource_type_id,
        'resource_type_display', rt.name,
        'resource_type_icon', rt.icon,
        'allocation_type_id', sr.allocation_type_id,
        'allocation_type_display', at.display_name,
        'allocation_type_color', at.hexcolor,
        'quantity_required', sr.quantity_required,
        'duration_hours', sr.duration_hours,
        'unit_cost', sr.unit_cost,
        'currency_code', sr.currency_code,
        'is_billable', sr.is_billable,
        'required_skills', sr.required_skills,
        'required_attributes', sr.required_attributes,
        'sequence_order', sr.sequence_order,
        'created_at', sr.created_at
      ) ORDER BY sr.sequence_order, sr.created_at
    ), '[]'::jsonb) INTO v_resources
    FROM t_catalog_service_resources sr
    LEFT JOIN m_catalog_resource_types rt ON sr.resource_type_id = rt.id
    LEFT JOIN m_category_details at ON sr.allocation_type_id = at.id
    WHERE sr.service_id = p_service_id
      AND sr.tenant_id = p_tenant_id
      AND sr.is_active = true;

    -- 5. ADD RESOURCES TO RESULT
    v_result := v_result || jsonb_build_object('resources', v_resources);

    -- 6. ADD CALCULATED FIELDS
    v_result := v_result || jsonb_build_object(
      'resource_count', jsonb_array_length(v_resources),
      'estimated_total_cost', (
        SELECT COALESCE(SUM((sr.unit_cost * sr.quantity_required)), 0)
        FROM t_catalog_service_resources sr
        WHERE sr.service_id = p_service_id
          AND sr.tenant_id = p_tenant_id
          AND sr.is_active = true
          AND sr.is_billable = true
      ),
      'has_resources', jsonb_array_length(v_resources) > 0
    );

    -- 7. SUCCESS RESPONSE
    RETURN jsonb_build_object(
      'success', true,
      'data', v_result,
      'message', 'Service retrieved successfully'
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- PROPER ERROR HANDLING
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'OPERATION_ERROR'
      );
  END;
  $$;


ALTER FUNCTION "public"."get_service_catalog_item"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_service_pricing"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean, "p_currency_code" character varying DEFAULT NULL::character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    v_service_pricing jsonb;
    v_filtered_pricing jsonb;
  BEGIN
    -- Get service pricing data
    SELECT jsonb_build_object(
      'service_id', s.id,
      'service_name', s.name,
      'pricing_data', s.price_attributes,
      'tax_config', s.tax_config,
      'currency_filter', p_currency_code,
      'retrieved_at', NOW()
    ) INTO v_service_pricing
    FROM t_catalog_items s
    WHERE s.id = p_service_id
      AND s.tenant_id = p_tenant_id
      AND s.is_live = p_is_live;

    IF v_service_pricing IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service not found',
        'code', 'RECORD_NOT_FOUND'
      );
    END IF;

    -- Filter by currency if specified
    IF p_currency_code IS NOT NULL THEN
      v_filtered_pricing := v_service_pricing;

      IF v_service_pricing->'pricing_data' ? 'currency_pricing' THEN
        SELECT jsonb_agg(pricing_entry) INTO v_filtered_pricing
        FROM jsonb_array_elements(v_service_pricing->'pricing_data'->'currency_pricing') AS pricing_entry
        WHERE pricing_entry->>'currency_code' = p_currency_code;

        v_service_pricing := jsonb_set(
          v_service_pricing,
          '{pricing_data,currency_pricing}',
          COALESCE(v_filtered_pricing, '[]'::jsonb)
        );
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'data', v_service_pricing,
      'message', 'Service pricing retrieved successfully'
    );

  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'OPERATION_ERROR'
      );
  END;
  $$;


ALTER FUNCTION "public"."get_service_pricing"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean, "p_currency_code" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_service_resources"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    v_service_exists boolean;
    v_resources jsonb;
    v_summary jsonb;
  BEGIN
    -- 1. VALIDATE INPUT PARAMETERS
    IF p_service_id IS NULL OR p_tenant_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'service_id and tenant_id are required',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    -- 2. CHECK IF SERVICE EXISTS AND IS ACCESSIBLE
    SELECT EXISTS(
      SELECT 1 FROM t_catalog_items
      WHERE id = p_service_id
        AND tenant_id = p_tenant_id
        AND is_live = p_is_live
    ) INTO v_service_exists;

    IF NOT v_service_exists THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service not found or access denied',
        'code', 'RECORD_NOT_FOUND'
      );
    END IF;

    -- 3. GET SERVICE RESOURCES WITH EXPLICIT FIELD SELECTION AND MASTER DATA LOOKUPS
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', sr.id,
        'service_id', sr.service_id,
        'resource_type_id', sr.resource_type_id,
        'resource_type_display', rt.name,
        'resource_type_description', rt.description,
        'resource_type_icon', rt.icon,
        'resource_type_pricing_model', rt.pricing_model,
        'allocation_type_id', sr.allocation_type_id,
        'allocation_type_display', at.display_name,
        'allocation_type_description', at.description,
        'allocation_type_color', at.hexcolor,
        'allocation_type_icon', at.icon_name,
        'quantity_required', sr.quantity_required,
        'duration_hours', sr.duration_hours,
        'unit_cost', sr.unit_cost,
        'currency_code', sr.currency_code,
        'is_billable', sr.is_billable,
        'required_skills', sr.required_skills,
        'required_attributes', sr.required_attributes,
        'sequence_order', sr.sequence_order,
        'is_active', sr.is_active,
        'created_at', sr.created_at,
        'updated_at', sr.updated_at,
        -- Computed fields
        'total_cost', CASE
          WHEN sr.is_billable = true
          THEN (sr.unit_cost * sr.quantity_required)
          ELSE 0
        END,
        'estimated_duration_total', CASE
          WHEN sr.duration_hours IS NOT NULL
          THEN (sr.duration_hours * sr.quantity_required)
          ELSE NULL
        END,
        'skills_count', COALESCE(jsonb_array_length(sr.required_skills), 0),
        'attributes_count', COALESCE(jsonb_array_length(jsonb_object_keys(sr.required_attributes)), 0),
        -- Available resources of this type
        'available_resources', COALESCE(
          (SELECT jsonb_agg(
             jsonb_build_object(
               'id', r.id,
               'name', r.name,
               'is_available', r.is_available,
               'hourly_cost', r.hourly_cost,
               'daily_cost', r.daily_cost,
               'capacity_per_day', r.capacity_per_day,
               'skills', r.skills,
               'is_mobile', r.is_mobile
             )
           )
           FROM t_catalog_resources r
           WHERE r.resource_type_id = sr.resource_type_id
             AND r.tenant_id = sr.tenant_id
             AND r.is_live = p_is_live
             AND r.status = 'active'
             AND r.is_available = true
           LIMIT 10
          ),
          '[]'::jsonb
        )
      ) ORDER BY sr.sequence_order, sr.created_at
    ), '[]'::jsonb) INTO v_resources
    FROM t_catalog_service_resources sr
    LEFT JOIN m_catalog_resource_types rt ON sr.resource_type_id = rt.id
    LEFT JOIN m_category_details at ON sr.allocation_type_id = at.id
    WHERE sr.service_id = p_service_id
      AND sr.tenant_id = p_tenant_id
      AND sr.is_active = true;

    -- 4. CALCULATE SUMMARY STATISTICS
    SELECT jsonb_build_object(
      'total_resources', jsonb_array_length(v_resources),
      'billable_resources', (
        SELECT COUNT(*)::integer
        FROM jsonb_array_elements(v_resources) AS elem
        WHERE (elem->>'is_billable')::boolean = true
      ),
      'non_billable_resources', (
        SELECT COUNT(*)::integer
        FROM jsonb_array_elements(v_resources) AS elem
        WHERE (elem->>'is_billable')::boolean = false
      ),
      'total_estimated_cost', (
        SELECT COALESCE(SUM((elem->>'total_cost')::numeric), 0)
        FROM jsonb_array_elements(v_resources) AS elem
      ),
      'total_estimated_hours', (
        SELECT COALESCE(SUM((elem->>'estimated_duration_total')::numeric), 0)
        FROM jsonb_array_elements(v_resources) AS elem
        WHERE elem->>'estimated_duration_total' IS NOT NULL
      ),
      'resource_types', (
        SELECT COALESCE(jsonb_agg(DISTINCT elem->>'resource_type_id'), '[]'::jsonb)
        FROM jsonb_array_elements(v_resources) AS elem
      ),
      'allocation_types', (
        SELECT COALESCE(jsonb_agg(DISTINCT
          jsonb_build_object(
            'id', elem->>'allocation_type_id',
            'display', elem->>'allocation_type_display',
            'color', elem->>'allocation_type_color'
          )
        ) FILTER (WHERE elem->>'allocation_type_id' IS NOT NULL), '[]'::jsonb)
        FROM jsonb_array_elements(v_resources) AS elem
      ),
      'currencies_used', (
        SELECT COALESCE(jsonb_agg(DISTINCT elem->>'currency_code'), '[]'::jsonb)
        FROM jsonb_array_elements(v_resources) AS elem
        WHERE elem->>'currency_code' IS NOT NULL
      ),
      'skills_required', (
        SELECT COALESCE(jsonb_agg(DISTINCT skill_elem), '[]'::jsonb)
        FROM jsonb_array_elements(v_resources) AS resource_elem,
             jsonb_array_elements_text(resource_elem->'required_skills') AS skill_elem
      ),
      'has_mobile_requirements', (
        SELECT EXISTS(
          SELECT 1 FROM jsonb_array_elements(v_resources) AS elem,
                       jsonb_array_elements(elem->'available_resources') AS avail_elem
          WHERE (avail_elem->>'is_mobile')::boolean = true
        )
      ),
      'complexity_score', CASE
        WHEN jsonb_array_length(v_resources) = 0 THEN 0
        WHEN jsonb_array_length(v_resources) <= 2 THEN 1
        WHEN jsonb_array_length(v_resources) <= 5 THEN 2
        ELSE 3
      END
    ) INTO v_summary;

    -- 5. SUCCESS RESPONSE
    RETURN jsonb_build_object(
      'success', true,
      'data', jsonb_build_object(
        'service_id', p_service_id,
        'resources', v_resources,
        'summary', v_summary,
        'retrieved_at', NOW()
      ),
      'message', 'Service resources retrieved successfully'
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- PROPER ERROR HANDLING
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'OPERATION_ERROR'
      );
  END;
  $$;


ALTER FUNCTION "public"."get_service_resources"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_smartprofile_cached_search"("p_scope" "text", "p_scope_id" "uuid", "p_query_normalized" "text") RETURNS TABLE("cache_id" "uuid", "results" "jsonb", "results_count" integer, "hit_count" integer, "is_cached" boolean)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_cache_record RECORD;
BEGIN
    SELECT * INTO v_cache_record
    FROM public.t_query_cache
    WHERE cache_type = 'smartprofile_search'
      AND scope = p_scope
      AND (
          (p_scope_id IS NULL AND scope_id IS NULL)
          OR scope_id = p_scope_id
      )
      AND query_normalized = p_query_normalized
      AND expires_at > NOW()
    LIMIT 1;

    IF FOUND THEN
        -- Update hit count and extend expiration
        UPDATE public.t_query_cache
        SET hit_count = t_query_cache.hit_count + 1,
            last_hit_at = NOW(),
            updated_at = NOW(),
            expires_at = NOW() + INTERVAL '45 days'
        WHERE id = v_cache_record.id;

        RETURN QUERY SELECT
            v_cache_record.id,
            v_cache_record.results,
            v_cache_record.results_count,
            v_cache_record.hit_count + 1,
            TRUE;
    ELSE
        RETURN QUERY SELECT
            NULL::UUID,
            '[]'::JSONB,
            0,
            0,
            FALSE;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_smartprofile_cached_search"("p_scope" "text", "p_scope_id" "uuid", "p_query_normalized" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_stats"("p_group_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_tenants', (
            SELECT COUNT(DISTINCT m.tenant_id)
            FROM t_group_memberships m
            WHERE (p_group_id IS NULL OR m.group_id = p_group_id)
              AND m.status = 'active'
        ),
        'by_group', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'group_id', g.id,
                    'group_name', g.name,
                    'count', member_count.cnt
                )
            ), '[]'::jsonb)
            FROM t_business_groups g
            LEFT JOIN (
                SELECT group_id, COUNT(DISTINCT tenant_id) as cnt
                FROM t_group_memberships
                WHERE status = 'active'
                GROUP BY group_id
            ) member_count ON member_count.group_id = g.id
            WHERE g.is_active = TRUE
              AND (p_group_id IS NULL OR g.id = p_group_id)
        ),
        'by_industry', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'industry_id', tp.industry_id,
                    'industry_name', COALESCE(tp.industry_id, 'Unknown'),
                    'count', COUNT(DISTINCT m.tenant_id)
                )
            ), '[]'::jsonb)
            FROM t_group_memberships m
            JOIN t_tenant_profiles tp ON tp.tenant_id = m.tenant_id
            WHERE m.status = 'active'
              AND (p_group_id IS NULL OR m.group_id = p_group_id)
            GROUP BY tp.industry_id
        ),
        'by_profile_type', (
            SELECT jsonb_build_object(
                'buyers', (
                    SELECT COUNT(DISTINCT m.tenant_id)
                    FROM t_group_memberships m
                    JOIN t_tenant_profiles tp ON tp.tenant_id = m.tenant_id
                    WHERE m.status = 'active'
                      AND (p_group_id IS NULL OR m.group_id = p_group_id)
                      AND tp.profile_type = 'buyer'
                ),
                'sellers', (
                    SELECT COUNT(DISTINCT m.tenant_id)
                    FROM t_group_memberships m
                    JOIN t_tenant_profiles tp ON tp.tenant_id = m.tenant_id
                    WHERE m.status = 'active'
                      AND (p_group_id IS NULL OR m.group_id = p_group_id)
                      AND tp.profile_type = 'seller'
                ),
                'both', (
                    SELECT COUNT(DISTINCT m.tenant_id)
                    FROM t_group_memberships m
                    JOIN t_tenant_profiles tp ON tp.tenant_id = m.tenant_id
                    WHERE m.status = 'active'
                      AND (p_group_id IS NULL OR m.group_id = p_group_id)
                      AND tp.profile_type = 'both'
                )
            )
        )
    ) INTO v_stats;

    RETURN v_stats;
END;
$$;


ALTER FUNCTION "public"."get_tenant_stats"("p_group_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_tenant_stats"("p_group_id" "uuid") IS 'Returns aggregated statistics for tenant profiles dashboard';



CREATE OR REPLACE FUNCTION "public"."get_user_accessible_groups"("p_user_id" "uuid") RETURNS TABLE("group_id" "uuid", "group_name" character varying, "group_type" character varying, "membership_id" "uuid", "membership_status" character varying, "ai_enabled" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if product admin
    SELECT is_admin INTO v_is_admin
    FROM public.t_user_profiles
    WHERE user_id = p_user_id;

    IF v_is_admin = true THEN
        -- Admin can access all AI-enabled groups
        RETURN QUERY
        SELECT
            bg.id AS group_id,
            bg.group_name::VARCHAR,
            bg.group_type::VARCHAR,
            NULL::UUID AS membership_id,
            'admin'::VARCHAR AS membership_status,
            COALESCE((bg.settings->'ai_agent'->>'enabled')::BOOLEAN, false) AS ai_enabled
        FROM public.t_business_groups bg
        WHERE bg.is_active = true
        ORDER BY bg.group_name;
        RETURN;
    END IF;

    -- Return groups where user has membership
    RETURN QUERY
    SELECT
        bg.id AS group_id,
        bg.group_name::VARCHAR,
        bg.group_type::VARCHAR,
        gm.id AS membership_id,
        gm.status::VARCHAR AS membership_status,
        COALESCE((bg.settings->'ai_agent'->>'enabled')::BOOLEAN, false) AS ai_enabled
    FROM public.t_group_memberships gm
    INNER JOIN public.t_user_tenants ut ON ut.tenant_id = gm.tenant_id
    INNER JOIN public.t_business_groups bg ON bg.id = gm.group_id
    WHERE ut.user_id = p_user_id
      AND gm.status = 'active'
      AND gm.is_active = true
      AND ut.status = 'active'
      AND bg.is_active = true
    ORDER BY bg.group_name;
END;
$$;


ALTER FUNCTION "public"."get_user_accessible_groups"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_accessible_groups"("p_user_id" "uuid") IS 'Returns all groups a user can access (via membership or admin status).';



CREATE OR REPLACE FUNCTION "public"."get_user_by_phone"("p_phone" character varying) RETURNS TABLE("user_id" "uuid", "name" character varying, "email" character varying, "mobile_number" character varying, "country_code" character varying, "preferred_language" character varying, "is_admin" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_phone_digits VARCHAR;
BEGIN
    -- Normalize phone: remove all non-digits
    v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');

    -- Try multiple matching strategies for flexibility
    RETURN QUERY
    SELECT
        up.user_id,
        (up.first_name || ' ' || up.last_name)::VARCHAR AS name,
        up.email::VARCHAR,
        up.mobile_number::VARCHAR,
        up.country_code::VARCHAR,
        up.preferred_language::VARCHAR,
        up.is_admin
    FROM public.t_user_profiles up
    WHERE
        -- Strategy 1: Exact match with country_code + mobile_number
        (COALESCE(up.country_code, '') || up.mobile_number) = v_phone_digits
        -- Strategy 2: Match mobile_number only (same country assumed)
        OR up.mobile_number = v_phone_digits
        -- Strategy 3: Match last 10 digits (India mobile numbers)
        OR up.mobile_number = RIGHT(v_phone_digits, 10)
        -- Strategy 4: Match without leading country code
        OR (up.country_code || up.mobile_number) = v_phone_digits
    ORDER BY
        -- Prefer exact matches
        CASE
            WHEN (COALESCE(up.country_code, '') || up.mobile_number) = v_phone_digits THEN 1
            WHEN up.mobile_number = v_phone_digits THEN 2
            ELSE 3
        END
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_user_by_phone"("p_phone" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_by_phone"("p_phone" character varying) IS 'Looks up user from t_user_profiles by phone number. Supports flexible matching: full E.164, mobile only, or last 10 digits.';



CREATE OR REPLACE FUNCTION "public"."get_user_tenant_ids"() RETURNS "uuid"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN ARRAY(
    SELECT tenant_id 
    FROM t_user_tenants 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  );
END;
$$;


ALTER FUNCTION "public"."get_user_tenant_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_vani_intro_message"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_config JSONB;
    v_groups JSONB;
BEGIN
    -- Get system config
    SELECT value INTO v_config
    FROM public.t_system_config
    WHERE key = 'vani_chat_intro';

    -- Get available groups
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'group_id', g.group_id,
            'group_name', g.group_name,
            'trigger_phrase', g.trigger_phrase,
            'description', g.description
        )
    ), '[]'::JSONB) INTO v_groups
    FROM get_available_groups_for_chat() g;

    RETURN jsonb_build_object(
        'type', 'intro',
        'greeting', v_config->>'greeting',
        'instruction', v_config->>'instruction',
        'exit_instruction', v_config->>'exit_instruction',
        'available_groups', v_groups
    );
END;
$$;


ALTER FUNCTION "public"."get_vani_intro_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_catalog_versioning"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- When creating a new version, set is_latest to false for previous versions
    IF NEW.parent_id IS NOT NULL AND NEW.is_latest = true THEN
        UPDATE t_tenant_catalog 
        SET is_latest = false 
        WHERE tenant_id = NEW.tenant_id 
        AND name = NEW.name 
        AND catalog_id != NEW.catalog_id 
        AND is_latest = true;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_catalog_versioning"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_tenant_access"("check_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if user has access to this tenant
  RETURN EXISTS (
    SELECT 1 FROM t_user_tenants
    WHERE user_id = auth.uid()
    AND tenant_id = check_tenant_id
    AND status = 'active'
  );
END;
$$;


ALTER FUNCTION "public"."has_tenant_access"("check_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_tenant_role"("check_tenant_id" "uuid", "role_names" "text"[]) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM t_user_tenants ut
    JOIN t_user_tenant_roles utr ON ut.id = utr.user_tenant_id
    JOIN t_category_details cd ON utr.role_id = cd.id
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = check_tenant_id
    AND ut.status = 'active'
    AND cd.sub_cat_name = ANY(role_names)
  );
END;
$$;


ALTER FUNCTION "public"."has_tenant_role"("check_tenant_id" "uuid", "role_names" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_campaign_conversions"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.converted = TRUE AND (OLD.converted IS NULL OR OLD.converted = FALSE) THEN
        UPDATE t_campaigns 
        SET total_conversions = total_conversions + 1
        WHERE campaign_id = NEW.campaign_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_campaign_conversions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_campaign_leads"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE t_campaigns 
    SET total_leads = total_leads + 1
    WHERE campaign_id = NEW.campaign_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_campaign_leads"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_session_messages"("p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.t_chat_sessions
    SET
        message_count = message_count + 1,
        last_activity_at = NOW(),
        updated_at = NOW(),
        expires_at = NOW() + INTERVAL '30 minutes'
    WHERE id = p_session_id;
END;
$$;


ALTER FUNCTION "public"."increment_session_messages"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_tenant_onboarding"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Create main onboarding record
    INSERT INTO t_tenant_onboarding (
        tenant_id,
        onboarding_type,
        total_steps,
        step_data
    ) VALUES (
        NEW.id,
        'business',
        6, -- Adjusted based on your actual steps
        '{}'::jsonb
    );
    
    -- Create individual step records
    INSERT INTO t_onboarding_step_status (tenant_id, step_id, step_sequence, status)
    VALUES 
        (NEW.id, 'user-profile', 1, 'pending'),
        (NEW.id, 'business-profile', 2, 'pending'),
        (NEW.id, 'data-setup', 3, 'pending'),
        (NEW.id, 'storage', 4, 'pending'),
        (NEW.id, 'team', 5, 'pending'),
        (NEW.id, 'tour', 6, 'pending');
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."initialize_tenant_onboarding"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_audit_logs_batch"("logs" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_log JSONB;
  v_inserted_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  -- Loop through each log entry
  FOR v_log IN SELECT * FROM jsonb_array_elements(logs)
  LOOP
    BEGIN
      -- Insert the audit log
      INSERT INTO t_audit_logs (
        tenant_id,
        user_id,
        action,
        resource,
        resource_id,
        metadata,
        ip_address,
        user_agent,
        success,
        error_message,
        severity,
        session_id,
        correlation_id,
        created_at
      ) VALUES (
        (v_log->>'tenant_id')::UUID,
        (v_log->>'user_id')::UUID,
        v_log->>'action',
        v_log->>'resource',
        v_log->>'resource_id',
        v_log->'metadata',
        v_log->>'ip_address',
        v_log->>'user_agent',
        (v_log->>'success')::BOOLEAN,
        v_log->>'error_message',
        v_log->>'severity',
        v_log->>'session_id',
        v_log->>'correlation_id',
        (v_log->>'created_at')::TIMESTAMPTZ
      );
      
      v_inserted_count := v_inserted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Capture error but continue processing
      v_errors := v_errors || jsonb_build_object(
        'log', v_log,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  -- Return result
  RETURN jsonb_build_object(
    'inserted', v_inserted_count,
    'errors', v_errors,
    'total', jsonb_array_length(logs)
  );
END;
$$;


ALTER FUNCTION "public"."insert_audit_logs_batch"("logs" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."insert_audit_logs_batch"("logs" "jsonb") IS 'Batch insert audit logs with SECURITY DEFINER to bypass RLS';



CREATE OR REPLACE FUNCTION "public"."invalidate_group_cache"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- On INSERT or UPDATE, use NEW.group_id
    -- On DELETE, use OLD.group_id
    IF TG_OP = 'DELETE' THEN
        DELETE FROM t_query_cache WHERE group_id = OLD.group_id;
        RETURN OLD;
    ELSE
        DELETE FROM t_query_cache WHERE group_id = NEW.group_id;
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION "public"."invalidate_group_cache"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."invalidate_group_cache"() IS 'Clears query cache when group membership changes';



CREATE OR REPLACE FUNCTION "public"."invoke_jtd_worker"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_supabase_url TEXT;
    v_service_role_key TEXT;
    v_request_id BIGINT;
BEGIN
    -- Get secrets from vault (using existing secret names)
    SELECT decrypted_secret INTO v_supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_URL'
    LIMIT 1;

    SELECT decrypted_secret INTO v_service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
    LIMIT 1;

    -- Make HTTP request to jtd-worker Edge Function
    IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
        SELECT net.http_post(
            url := v_supabase_url || '/functions/v1/jtd-worker',
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || v_service_role_key,
                'Content-Type', 'application/json'
            ),
            body := '{}'::jsonb
        ) INTO v_request_id;

        RAISE NOTICE 'JTD Worker invoked, request_id: %', v_request_id;
    ELSE
        RAISE WARNING 'Cannot invoke JTD Worker: Supabase URL or Service Role Key not configured';
    END IF;
END;
$$;


ALTER FUNCTION "public"."invoke_jtd_worker"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."invoke_jtd_worker"() IS 'Invokes JTD Worker Edge Function via pg_net';



CREATE OR REPLACE FUNCTION "public"."invoke_jtd_worker_test"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_request_id BIGINT;
BEGIN
    -- Hardcode for testing (replace with your actual values)
    SELECT net.http_post(
        url := 'https://uwyqhzotluikawcboldr.supabase.co/functions/v1/jtd-worker',
        headers := jsonb_build_object(
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3eXFoem90bHVpa2F3Y2JvbGRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDgyNTU0NywiZXhwIjoyMDYwNDAxNTQ3fQ.lXnz4-wIYZqI5EScHZQyrjLjb5hPImJliZv9OwIaXRI',
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    ) INTO v_request_id;

    RAISE NOTICE 'Request ID: %', v_request_id;
END;
$$;


ALTER FUNCTION "public"."invoke_jtd_worker_test"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_ai_agent_enabled"("p_group_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN COALESCE(
        (
            SELECT (settings->'ai_agent'->>'enabled')::BOOLEAN
            FROM public.t_business_groups
            WHERE id = p_group_id
        ),
        FALSE
    );
END;
$$;


ALTER FUNCTION "public"."is_ai_agent_enabled"("p_group_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_ai_agent_enabled"("p_group_id" "uuid") IS 'Quick check if AI agent is enabled for a group';



CREATE OR REPLACE FUNCTION "public"."is_exit_command"("p_message" character varying) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_message_lower VARCHAR;
BEGIN
    v_message_lower := LOWER(TRIM(p_message));

    -- Check common exit keywords
    IF v_message_lower IN ('bye', 'exit', 'quit', 'end', 'stop', 'goodbye') THEN
        RETURN true;
    END IF;

    -- Check against all configured exit keywords
    RETURN EXISTS (
        SELECT 1
        FROM public.t_business_groups bg,
             jsonb_array_elements_text(bg.settings->'ai_agent'->'exit_keywords') kw
        WHERE
            (bg.settings->'ai_agent'->>'enabled')::BOOLEAN = true
            AND LOWER(kw) = v_message_lower
    );
END;
$$;


ALTER FUNCTION "public"."is_exit_command"("p_message" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_exit_command"("p_message" character varying) IS 'Quick check if a message is an exit command (Bye, Exit, etc.)';



CREATE OR REPLACE FUNCTION "public"."is_service_role"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN current_setting('request.jwt.claims', true)::json->>'role' = 'service_role';
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."is_service_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_service_role"() IS 'Check if current request is using service role';



CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM t_user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  );
END;
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_tenant_admin"("check_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM t_user_tenants
    WHERE user_id = auth.uid()
    AND tenant_id = check_tenant_id
    AND is_admin = true
    AND status = 'active'
  );
END;
$$;


ALTER FUNCTION "public"."is_tenant_admin"("check_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_vani_user"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_vani_uuid UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Get user_id from JWT
    v_user_id := NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::UUID;
    
    -- Check if user is VaNi
    RETURN v_user_id = v_vani_uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."is_vani_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_vani_user"() IS 'Check if current user is VaNi system actor';



CREATE OR REPLACE FUNCTION "public"."jtd_archive_to_dlq"("p_msg_id" bigint, "p_original_message" "jsonb", "p_error_message" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_dlq_message JSONB;
BEGIN
    -- Build DLQ message with error info
    v_dlq_message := p_original_message || jsonb_build_object(
        'original_msg_id', p_msg_id,
        'error_message', p_error_message,
        'archived_at', NOW()
    );

    -- Send to DLQ
    PERFORM pgmq.send('jtd_dlq', v_dlq_message);

    -- Delete from main queue
    PERFORM pgmq.delete('jtd_queue', p_msg_id);
END;
$$;


ALTER FUNCTION "public"."jtd_archive_to_dlq"("p_msg_id" bigint, "p_original_message" "jsonb", "p_error_message" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."jtd_archive_to_dlq"("p_msg_id" bigint, "p_original_message" "jsonb", "p_error_message" "text") IS 'Move failed message to dead letter queue';



CREATE OR REPLACE FUNCTION "public"."jtd_delete_message"("p_msg_id" bigint) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN pgmq.delete('jtd_queue', p_msg_id);
END;
$$;


ALTER FUNCTION "public"."jtd_delete_message"("p_msg_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."jtd_delete_message"("p_msg_id" bigint) IS 'Delete processed message from queue';



CREATE OR REPLACE FUNCTION "public"."jtd_enqueue_on_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$

DECLARE

    v_message JSONB;

BEGIN

    -- Only enqueue if status is 'created' (initial state)

    IF NEW.status_code = 'created' THEN

        -- Build message payload

        v_message := jsonb_build_object(

            'jtd_id', NEW.id,

            'tenant_id', NEW.tenant_id,

            'event_type_code', NEW.event_type_code,

            'channel_code', NEW.channel_code,

            'source_type_code', NEW.source_type_code,

            'priority', NEW.priority,

            'scheduled_at', NEW.scheduled_at,

            'recipient_contact', NEW.recipient_contact,

            'is_live', NEW.is_live,

            'created_at', NEW.created_at

        );

 

        -- Send to queue

        PERFORM pgmq.send('jtd_queue', v_message);

 

        -- Update status to 'pending' (queued)

        NEW.status_code := 'pending';

        NEW.status_changed_at := NOW();

    END IF;

 

    RETURN NEW;

END;

$$;


ALTER FUNCTION "public"."jtd_enqueue_on_insert"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."jtd_enqueue_on_insert"() IS 'Automatically enqueue JTD to PGMQ on insert (runs with elevated privileges)';



CREATE OR REPLACE FUNCTION "public"."jtd_enqueue_scheduled"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_count INT := 0;
    v_jtd RECORD;
    v_message JSONB;
BEGIN
    -- Find JTDs that are scheduled and due
    FOR v_jtd IN
        SELECT * FROM public.n_jtd
        WHERE status_code = 'scheduled'
          AND scheduled_at <= NOW()
          AND scheduled_at IS NOT NULL
        ORDER BY priority DESC, scheduled_at ASC
        LIMIT 100
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Build message
        v_message := jsonb_build_object(
            'jtd_id', v_jtd.id,
            'tenant_id', v_jtd.tenant_id,
            'event_type_code', v_jtd.event_type_code,
            'channel_code', v_jtd.channel_code,
            'source_type_code', v_jtd.source_type_code,
            'priority', v_jtd.priority,
            'scheduled_at', v_jtd.scheduled_at,
            'recipient_contact', v_jtd.recipient_contact,
            'is_live', v_jtd.is_live,
            'created_at', v_jtd.created_at
        );

        -- Send to queue
        PERFORM pgmq.send('jtd_queue', v_message);

        -- Update status
        UPDATE public.n_jtd
        SET status_code = 'pending',
            status_changed_at = NOW()
        WHERE id = v_jtd.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."jtd_enqueue_scheduled"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."jtd_enqueue_scheduled"() IS 'Enqueue scheduled JTDs that are due for processing';



CREATE OR REPLACE FUNCTION "public"."jtd_get_status_duration_summary"("p_jtd_id" "uuid") RETURNS TABLE("status_code" character varying, "total_duration_seconds" bigint, "occurrence_count" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        sh.to_status_code,
        SUM(COALESCE(sh.duration_seconds, 0))::BIGINT,
        COUNT(*)::INT
    FROM public.n_jtd_status_history sh
    WHERE sh.jtd_id = p_jtd_id
    GROUP BY sh.to_status_code
    ORDER BY MIN(sh.created_at);
END;
$$;


ALTER FUNCTION "public"."jtd_get_status_duration_summary"("p_jtd_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."jtd_get_status_duration_summary"("p_jtd_id" "uuid") IS 'Get summary of time spent in each status for a JTD';



CREATE OR REPLACE FUNCTION "public"."jtd_log_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Log creation in general history
    INSERT INTO public.n_jtd_history (
        jtd_id,
        action,
        performed_by_type,
        performed_by_id,
        performed_by_name,
        details,
        is_live,
        created_by
    ) VALUES (
        NEW.id,
        'created',
        NEW.performed_by_type,
        NEW.performed_by_id,
        NEW.performed_by_name,
        jsonb_build_object(
            'source_type', NEW.source_type_code,
            'source_id', NEW.source_id,
            'channel', NEW.channel_code,
            'recipient', NEW.recipient_contact,
            'event_type', NEW.event_type_code
        ),
        NEW.is_live,
        NEW.created_by
    );

    -- Log initial status in status history
    INSERT INTO public.n_jtd_status_history (
        jtd_id,
        from_status_code,
        to_status_id,
        to_status_code,
        is_valid_transition,
        performed_by_type,
        performed_by_id,
        performed_by_name,
        status_started_at,
        is_live,
        created_by
    ) VALUES (
        NEW.id,
        NULL,  -- No previous status
        NEW.status_id,
        NEW.status_code,
        true,
        NEW.performed_by_type,
        NEW.performed_by_id,
        NEW.performed_by_name,
        NOW(),
        NEW.is_live,
        NEW.created_by
    );

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."jtd_log_creation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jtd_log_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_previous_history_id UUID;
    v_duration_seconds INT;
BEGIN
    -- Only log if status actually changed
    IF OLD.status_code IS DISTINCT FROM NEW.status_code THEN

        -- Calculate duration of previous status
        SELECT EXTRACT(EPOCH FROM (NOW() - status_started_at))::INT
        INTO v_duration_seconds
        FROM public.n_jtd_status_history
        WHERE jtd_id = NEW.id
        ORDER BY created_at DESC
        LIMIT 1;

        -- Update the previous status history record with end time
        UPDATE public.n_jtd_status_history
        SET status_ended_at = NOW(),
            duration_seconds = v_duration_seconds
        WHERE jtd_id = NEW.id
          AND status_ended_at IS NULL;

        -- Insert new status history record
        INSERT INTO public.n_jtd_status_history (
            jtd_id,
            from_status_id,
            from_status_code,
            to_status_id,
            to_status_code,
            is_valid_transition,
            transition_note,
            performed_by_type,
            performed_by_id,
            performed_by_name,
            status_started_at,
            is_live,
            created_by
        ) VALUES (
            NEW.id,
            OLD.status_id,
            OLD.status_code,
            NEW.status_id,
            NEW.status_code,
            NEW.is_valid_transition,
            NEW.transition_note,
            NEW.performed_by_type,
            NEW.performed_by_id,
            NEW.performed_by_name,
            NOW(),
            NEW.is_live,
            NEW.updated_by
        );

        -- Update JTD tracking fields
        NEW.status_changed_at = NOW();
        NEW.previous_status_code = OLD.status_code;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."jtd_log_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jtd_queue_metrics"() RETURNS TABLE("queue_name" "text", "queue_length" bigint, "newest_msg_age_sec" integer, "oldest_msg_age_sec" integer, "total_messages" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'jtd_queue'::TEXT,
        (SELECT count(*) FROM pgmq.q_jtd_queue)::BIGINT,
        EXTRACT(EPOCH FROM (NOW() - (SELECT MAX(enqueued_at) FROM pgmq.q_jtd_queue)))::INT,
        EXTRACT(EPOCH FROM (NOW() - (SELECT MIN(enqueued_at) FROM pgmq.q_jtd_queue)))::INT,
        (SELECT count(*) FROM pgmq.q_jtd_queue)::BIGINT;
END;
$$;


ALTER FUNCTION "public"."jtd_queue_metrics"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."jtd_queue_metrics"() IS 'Get JTD queue metrics for monitoring';



CREATE OR REPLACE FUNCTION "public"."jtd_read_queue"("p_batch_size" integer DEFAULT 10, "p_visibility_timeout" integer DEFAULT 30) RETURNS TABLE("msg_id" bigint, "read_ct" integer, "enqueued_at" timestamp with time zone, "vt" timestamp with time zone, "message" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM pgmq.read('jtd_queue', p_visibility_timeout, p_batch_size);
END;
$$;


ALTER FUNCTION "public"."jtd_read_queue"("p_batch_size" integer, "p_visibility_timeout" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."jtd_read_queue"("p_batch_size" integer, "p_visibility_timeout" integer) IS 'Read batch of JTD messages from queue';



CREATE OR REPLACE FUNCTION "public"."jtd_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."jtd_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jtd_validate_transition"("p_event_type_code" character varying, "p_from_status_code" character varying, "p_to_status_code" character varying) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_is_valid BOOLEAN;
BEGIN
    -- Check if transition exists in flow definition
    SELECT EXISTS (
        SELECT 1
        FROM public.n_jtd_status_flows sf
        JOIN public.n_jtd_statuses fs ON sf.from_status_id = fs.id
        JOIN public.n_jtd_statuses ts ON sf.to_status_id = ts.id
        WHERE sf.event_type_code = p_event_type_code
          AND fs.code = p_from_status_code
          AND ts.code = p_to_status_code
          AND sf.is_active = true
    ) INTO v_is_valid;

    RETURN v_is_valid;
END;
$$;


ALTER FUNCTION "public"."jtd_validate_transition"("p_event_type_code" character varying, "p_from_status_code" character varying, "p_to_status_code" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."jtd_validate_transition"("p_event_type_code" character varying, "p_from_status_code" character varying, "p_to_status_code" character varying) IS 'Check if status transition is valid for event type (soft enforcement)';



CREATE OR REPLACE FUNCTION "public"."manual_reset_sequence"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean DEFAULT true, "p_new_start_value" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_sequence_type_id UUID;
    v_config JSONB;
    v_start_value INTEGER;
    v_old_value INTEGER;
BEGIN
    -- Get sequence_type_id and config
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

    -- Determine start value
    v_start_value := COALESCE(
        p_new_start_value,
        (v_config->>'start_value')::INTEGER,
        1
    );

    -- Get current value before reset
    SELECT current_value INTO v_old_value
    FROM public.t_sequence_counters
    WHERE sequence_type_id = v_sequence_type_id
      AND tenant_id = p_tenant_id
      AND is_live = p_is_live;

    -- Perform reset
    UPDATE public.t_sequence_counters
    SET current_value = v_start_value - 1,  -- -1 because next call will increment
        last_reset_date = NOW(),
        updated_at = NOW()
    WHERE sequence_type_id = v_sequence_type_id
      AND tenant_id = p_tenant_id
      AND is_live = p_is_live;

    -- If no row existed, create one
    IF NOT FOUND THEN
        INSERT INTO public.t_sequence_counters (
            sequence_type_id,
            tenant_id,
            current_value,
            is_live,
            last_reset_date
        )
        VALUES (
            v_sequence_type_id,
            p_tenant_id,
            v_start_value - 1,
            p_is_live,
            NOW()
        );
        v_old_value := 0;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'sequence_code', p_sequence_code,
        'old_value', v_old_value,
        'new_start_value', v_start_value,
        'reset_at', NOW()
    );
END;
$$;


ALTER FUNCTION "public"."manual_reset_sequence"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean, "p_new_start_value" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."manual_reset_sequence"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean, "p_new_start_value" integer) IS 'Manually resets a sequence to its start value or a custom value.
Use for admin-initiated resets.';



CREATE OR REPLACE FUNCTION "public"."normalize_phone"("p_phone" character varying) RETURNS character varying
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    -- Remove all non-digits
    RETURN regexp_replace(p_phone, '[^0-9]', '', 'g');
END;
$$;


ALTER FUNCTION "public"."normalize_phone"("p_phone" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."normalize_phone"("p_phone" character varying) IS 'Normalizes phone number by removing all non-digit characters';



CREATE OR REPLACE FUNCTION "public"."promote_catalog_test_to_live"("p_tenant_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- This is a critical operation - create a backup first
  -- Then replace live data with test data
  
  -- Begin transaction
  BEGIN
    -- Delete live data
    DELETE FROM t_catalog_items WHERE tenant_id = p_tenant_id AND is_live = TRUE;
    DELETE FROM t_catalog_categories WHERE tenant_id = p_tenant_id AND is_live = TRUE;  
    DELETE FROM t_catalog_industries WHERE tenant_id = p_tenant_id AND is_live = TRUE;
    
    -- Promote test data to live
    UPDATE t_catalog_industries SET is_live = TRUE WHERE tenant_id = p_tenant_id AND is_live = FALSE;
    UPDATE t_catalog_categories SET is_live = TRUE WHERE tenant_id = p_tenant_id AND is_live = FALSE;
    UPDATE t_catalog_items SET is_live = TRUE WHERE tenant_id = p_tenant_id AND is_live = FALSE;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Test data successfully promoted to live environment'
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to promote test data to live environment'
    );
  END;
END;
$$;


ALTER FUNCTION "public"."promote_catalog_test_to_live"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."promote_catalog_test_to_live"("p_tenant_id" "uuid") IS 'Promotes test catalog data to live environment. USE WITH CAUTION - this replaces live data.';



CREATE OR REPLACE FUNCTION "public"."query_service_catalog_items"("p_tenant_id" "uuid", "p_is_live" boolean, "p_filters" "jsonb" DEFAULT '{}'::"jsonb", "p_page" integer DEFAULT 1, "p_limit" integer DEFAULT 20) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
  DECLARE
    v_offset integer;
    v_total_count integer;
    v_services jsonb;
    v_where_conditions text[] := ARRAY['s.tenant_id = $1', 's.is_live = $2'];
    v_join_conditions text := '';
    v_order_by text := 'ORDER BY s.updated_at DESC';
    v_query text;
    v_count_query text;
    v_param_count integer := 2;
    v_search_term text;
  BEGIN
    -- 1. VALIDATE INPUT PARAMETERS
    IF p_tenant_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'tenant_id is required',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    -- 2. VALIDATE AND SET PAGINATION
    v_offset := GREATEST((p_page - 1) * p_limit, 0);

    -- Limit the page size to prevent abuse
    IF p_limit > 100 THEN
      p_limit := 100;
    ELSIF p_limit < 1 THEN
      p_limit := 20;
    END IF;

    -- 3. BUILD DYNAMIC WHERE CONDITIONS SAFELY
    -- Status filter
    IF p_filters->>'status' IS NOT NULL THEN
      v_where_conditions := v_where_conditions || ARRAY['s.status = ''' || replace(p_filters->>'status', '''', '''''') || ''''];
    END IF;

    -- Type filter
    IF p_filters->>'type' IS NOT NULL THEN
      v_where_conditions := v_where_conditions || ARRAY['s.type = ''' || replace(p_filters->>'type', '''', '''''') || ''''];
    END IF;

    -- Industry filter
    IF p_filters->>'industry_id' IS NOT NULL THEN
      v_where_conditions := v_where_conditions || ARRAY['s.industry_id = ''' || replace(p_filters->>'industry_id', '''', '''''') ||
  ''''];
    END IF;

    -- Category filter
    IF p_filters->>'category_id' IS NOT NULL THEN
      v_where_conditions := v_where_conditions || ARRAY['s.category_id = ''' || replace(p_filters->>'category_id', '''', '''''') ||
  ''''];
    END IF;

    -- Pricing type filter
    IF p_filters->>'pricing_type_id' IS NOT NULL THEN
      v_where_conditions := v_where_conditions || ARRAY['(s.price_attributes->>''pricing_type_id'')::uuid = ''' ||
  replace(p_filters->>'pricing_type_id', '''', '''''') || '''::uuid'];
    END IF;

    -- Service status filter
    IF p_filters->>'service_status_id' IS NOT NULL THEN
      v_where_conditions := v_where_conditions || ARRAY['(s.service_attributes->>''service_status_id'')::uuid = ''' ||
  replace(p_filters->>'service_status_id', '''', '''''') || '''::uuid'];
    END IF;

    -- Has resources filter
    IF p_filters->>'has_resources' IS NOT NULL THEN
      IF p_filters->>'has_resources' = 'true' THEN
        v_where_conditions := v_where_conditions || ARRAY['EXISTS(SELECT 1 FROM t_catalog_service_resources sr WHERE sr.service_id = s.id     
   AND sr.is_active = true)'];
      ELSIF p_filters->>'has_resources' = 'false' THEN
        v_where_conditions := v_where_conditions || ARRAY['NOT EXISTS(SELECT 1 FROM t_catalog_service_resources sr WHERE sr.service_id =      
  s.id AND sr.is_active = true)'];
      END IF;
    END IF;

    -- Date range filters
    IF p_filters->>'created_after' IS NOT NULL THEN
      v_where_conditions := v_where_conditions || ARRAY['s.created_at >= ''' || p_filters->>'created_after' || '''::timestamp with time       
  zone'];
    END IF;

    IF p_filters->>'created_before' IS NOT NULL THEN
      v_where_conditions := v_where_conditions || ARRAY['s.created_at <= ''' || p_filters->>'created_before' || '''::timestamp with time      
  zone'];
    END IF;

    -- Search functionality (case-insensitive)
    IF p_filters->>'search' IS NOT NULL AND trim(p_filters->>'search') != '' THEN
      v_search_term := '%' || lower(trim(p_filters->>'search')) || '%';
      v_where_conditions := v_where_conditions || ARRAY['(
        lower(s.name) LIKE ''' || replace(v_search_term, '''', '''''') || ''' OR
        lower(s.short_description) LIKE ''' || replace(v_search_term, '''', '''''') || ''' OR
        lower(s.description_content) LIKE ''' || replace(v_search_term, '''', '''''') || '''
      )'];
    END IF;

    -- Archived filter (default to exclude archived unless specifically requested)
    IF p_filters->>'include_archived' IS NULL OR p_filters->>'include_archived' != 'true' THEN
      v_where_conditions := v_where_conditions || ARRAY['s.status != ''archived'''];
    END IF;

    -- 4. BUILD SORTING
    IF p_filters->>'sort_by' IS NOT NULL THEN
      CASE p_filters->>'sort_by'
        WHEN 'name' THEN
          v_order_by := 'ORDER BY s.name ' || COALESCE(p_filters->>'sort_order', 'ASC');
        WHEN 'created_at' THEN
          v_order_by := 'ORDER BY s.created_at ' || COALESCE(p_filters->>'sort_order', 'DESC');
        WHEN 'updated_at' THEN
          v_order_by := 'ORDER BY s.updated_at ' || COALESCE(p_filters->>'sort_order', 'DESC');
        WHEN 'status' THEN
          v_order_by := 'ORDER BY s.status ' || COALESCE(p_filters->>'sort_order', 'ASC');
        ELSE
          v_order_by := 'ORDER BY s.updated_at DESC';
      END CASE;
    END IF;

    -- 5. GET TOTAL COUNT (SEPARATE TRANSACTION FOR PERFORMANCE)
    v_count_query := 'SELECT COUNT(*) FROM t_catalog_items s WHERE ' || array_to_string(v_where_conditions, ' AND ');

    EXECUTE v_count_query USING p_tenant_id, p_is_live INTO v_total_count;

    -- 6. GET SERVICES WITH EXPLICIT FIELD SELECTION AND MASTER DATA LOOKUPS
    v_query := '
      SELECT jsonb_agg(
        jsonb_build_object(
          ''id'', s.id,
          ''name'', s.name,
          ''short_description'', s.short_description,
          ''type'', s.type,
          ''status'', s.status,
          ''industry_id'', s.industry_id,
          ''category_id'', s.category_id,
          ''price_attributes'', s.price_attributes,
          ''service_attributes'', s.service_attributes,
          ''is_variant'', s.is_variant,
          ''created_at'', s.created_at,
          ''updated_at'', s.updated_at,
          ''created_by'', s.created_by,
          ''updated_by'', s.updated_by,
          -- Include master data lookups
          ''industry_display'', i.name,
          ''industry_icon'', i.icon,
          ''category_display'', c.name,
          ''category_icon'', c.icon,
          ''pricing_type_display'', pt.display_name,
          ''pricing_type_color'', pt.hexcolor,
          ''service_status_display'', ss.display_name,
          ''service_status_color'', ss.hexcolor,
          -- Include computed fields
          ''resource_count'', COALESCE(
            (SELECT COUNT(*) FROM t_catalog_service_resources sr WHERE sr.service_id = s.id AND sr.is_active = true),
            0
          ),
          ''estimated_total_cost'', COALESCE(
            (SELECT SUM(sr.unit_cost * sr.quantity_required) FROM t_catalog_service_resources sr
             WHERE sr.service_id = s.id AND sr.is_active = true AND sr.is_billable = true),
            0
          )
        )
      ) FROM (
        SELECT s.*
        FROM t_catalog_items s
        LEFT JOIN m_catalog_industries i ON s.industry_id = i.id
        LEFT JOIN m_catalog_categories c ON s.category_id = c.id
        LEFT JOIN m_category_details pt ON (s.price_attributes->>''pricing_type_id'')::uuid = pt.id
        LEFT JOIN m_category_details ss ON (s.service_attributes->>''service_status_id'')::uuid = ss.id
        WHERE ' || array_to_string(v_where_conditions, ' AND ') || '
        ' || v_order_by || '
        LIMIT ' || p_limit || ' OFFSET ' || v_offset || '
      ) s
      LEFT JOIN m_catalog_industries i ON s.industry_id = i.id
      LEFT JOIN m_catalog_categories c ON s.category_id = c.id
      LEFT JOIN m_category_details pt ON (s.price_attributes->>''pricing_type_id'')::uuid = pt.id
      LEFT JOIN m_category_details ss ON (s.service_attributes->>''service_status_id'')::uuid = ss.id
    ';

    EXECUTE v_query USING p_tenant_id, p_is_live INTO v_services;

    -- 7. SUCCESS RESPONSE WITH PAGINATION INFO
    RETURN jsonb_build_object(
      'success', true,
      'data', COALESCE(v_services, '[]'::jsonb),
      'pagination', jsonb_build_object(
        'page', p_page,
        'limit', p_limit,
        'total', v_total_count,
        'pages', CEILING(v_total_count::decimal / p_limit),
        'has_next', (p_page * p_limit) < v_total_count,
        'has_prev', p_page > 1
      ),
      'filters_applied', p_filters,
      'message', 'Services retrieved successfully'
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- PROPER ERROR HANDLING
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'OPERATION_ERROR'
      );
  END;
  $_$;


ALTER FUNCTION "public"."query_service_catalog_items"("p_tenant_id" "uuid", "p_is_live" boolean, "p_filters" "jsonb", "p_page" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_cache_failure"("p_cache_type" "text", "p_scope" "text", "p_scope_id" "uuid", "p_query_normalized" "text", "p_failure_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.t_query_cache
    SET failure_count = failure_count + 1,
        last_failure_at = NOW(),
        failure_reason = p_failure_reason,
        updated_at = NOW()
    WHERE cache_type = p_cache_type
      AND scope = p_scope
      AND (
          (p_scope_id IS NULL AND scope_id IS NULL)
          OR scope_id = p_scope_id
      )
      AND query_normalized = p_query_normalized;
END;
$$;


ALTER FUNCTION "public"."record_cache_failure"("p_cache_type" "text", "p_scope" "text", "p_scope_id" "uuid", "p_query_normalized" "text", "p_failure_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_contact_classification"("contact_id" "uuid", "classification" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE t_contacts 
    SET classifications = classifications - classification
    WHERE id = contact_id;
END;
$$;


ALTER FUNCTION "public"."remove_contact_classification"("contact_id" "uuid", "classification" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_contact_tag"("contact_id" "uuid", "tag_value" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE t_contacts 
    SET tags = (
        SELECT jsonb_agg(tag)
        FROM jsonb_array_elements(tags) as tag
        WHERE tag->>'value' != tag_value
    )
    WHERE id = contact_id;
END;
$$;


ALTER FUNCTION "public"."remove_contact_tag"("contact_id" "uuid", "tag_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_tax_rate_sequences"("p_tenant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  rate_record RECORD;
  new_sequence INTEGER := 1;
BEGIN
  -- Reorder all active rates by current sequence
  FOR rate_record IN 
    SELECT id FROM t_tax_rates 
    WHERE tenant_id = p_tenant_id 
      AND is_active = true 
    ORDER BY sequence_no ASC, name ASC
  LOOP
    UPDATE t_tax_rates 
    SET sequence_no = new_sequence, updated_at = NOW()
    WHERE id = rate_record.id;
    
    new_sequence := new_sequence + 1;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."reorder_tax_rate_sequences"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scoped_member_search"("p_query_text" character varying, "p_query_embedding" "extensions"."vector", "p_group_id" "uuid" DEFAULT NULL::"uuid", "p_scope" character varying DEFAULT 'group'::character varying, "p_similarity_threshold" double precision DEFAULT 0.3, "p_limit" integer DEFAULT 10) RETURNS TABLE("membership_id" "uuid", "tenant_id" "uuid", "group_id" "uuid", "group_name" character varying, "chapter" character varying, "business_name" character varying, "short_description" "text", "ai_enhanced_description" "text", "industry" character varying, "city" character varying, "state_code" character varying, "address_line1" character varying, "contact_phone" character varying, "business_phone_country_code" character varying, "contact_email" character varying, "website_url" character varying, "logo_url" character varying, "booking_url" character varying, "business_whatsapp" character varying, "business_whatsapp_country_code" character varying, "approved_keywords" "text"[], "similarity_score" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        gm.id AS membership_id,
        gm.tenant_id,
        gm.group_id,
        bg.group_name::VARCHAR,
        (bg.settings->>'chapter')::VARCHAR AS chapter,
        tp.business_name::VARCHAR,
        COALESCE(
            gm.profile_data->>'short_description',
            LEFT(gm.profile_data->>'ai_enhanced_description', 200)
        )::TEXT AS short_description,
        (gm.profile_data->>'ai_enhanced_description')::TEXT AS ai_enhanced_description,
        ci.industry_name::VARCHAR AS industry,
        tp.city::VARCHAR,
        tp.state_code::VARCHAR,
        tp.address_line1::VARCHAR,
        COALESCE(
            gm.profile_data->>'mobile_number',
            tp.business_phone
        )::VARCHAR AS contact_phone,
        tp.business_phone_country_code::VARCHAR,
        tp.business_email::VARCHAR AS contact_email,
        tp.website_url::VARCHAR,
        tp.logo_url::VARCHAR,
        tp.booking_url::VARCHAR,
        tp.business_whatsapp::VARCHAR,
        tp.business_whatsapp_country_code::VARCHAR,
        ARRAY(
            SELECT jsonb_array_elements_text(
                COALESCE(gm.profile_data->'approved_keywords', '[]'::JSONB)
            )
        )::TEXT[] AS approved_keywords,
        (1 - (gm.embedding <=> p_query_embedding))::FLOAT AS similarity_score
    FROM public.t_group_memberships gm
    LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id
    LEFT JOIN public.t_business_groups bg ON bg.id = gm.group_id
    LEFT JOIN public.m_catalog_industries ci ON ci.id::VARCHAR = tp.industry_id
    WHERE
        gm.status = 'active'
        AND gm.is_active = true
        AND gm.embedding IS NOT NULL
        AND CASE
            WHEN p_scope = 'product' THEN true
            WHEN p_scope = 'group' THEN gm.group_id = p_group_id
            ELSE gm.group_id = p_group_id
        END
        AND (1 - (gm.embedding <=> p_query_embedding)) >= p_similarity_threshold
    ORDER BY similarity_score DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."scoped_member_search"("p_query_text" character varying, "p_query_embedding" "extensions"."vector", "p_group_id" "uuid", "p_scope" character varying, "p_similarity_threshold" double precision, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scoped_member_search"("p_query_text" character varying, "p_query_embedding" "extensions"."vector", "p_scope" character varying DEFAULT 'group'::character varying, "p_group_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 10, "p_similarity_threshold" double precision DEFAULT 0.7) RETURNS TABLE("membership_id" "uuid", "tenant_id" "uuid", "group_id" "uuid", "group_name" character varying, "business_name" character varying, "short_description" "text", "ai_enhanced_description" "text", "industry" character varying, "city" character varying, "contact_phone" character varying, "contact_email" character varying, "website_url" character varying, "logo_url" character varying, "approved_keywords" "text"[], "similarity_score" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        gm.id AS membership_id,
        gm.tenant_id,
        gm.group_id,
        bg.group_name::VARCHAR,
        tp.business_name::VARCHAR,
        COALESCE(
            gm.profile_data->>'short_description',
            LEFT(gm.profile_data->>'ai_enhanced_description', 200)
        )::TEXT AS short_description,
        (gm.profile_data->>'ai_enhanced_description')::TEXT AS ai_enhanced_description,
        ci.industry_name::VARCHAR AS industry,
        tp.city::VARCHAR,
        COALESCE(
            gm.profile_data->>'mobile_number',
            tp.business_phone
        )::VARCHAR AS contact_phone,
        tp.business_email::VARCHAR AS contact_email,
        tp.website_url::VARCHAR,
        tp.logo_url::VARCHAR,
        ARRAY(
            SELECT jsonb_array_elements_text(
                COALESCE(gm.profile_data->'approved_keywords', '[]'::JSONB)
            )
        )::TEXT[] AS approved_keywords,
        (1 - (gm.embedding <=> p_query_embedding))::FLOAT AS similarity_score
    FROM public.t_group_memberships gm
    LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id
    LEFT JOIN public.t_business_groups bg ON bg.id = gm.group_id
    LEFT JOIN public.m_catalog_industries ci ON ci.id::VARCHAR = tp.industry_id
    WHERE
        gm.status = 'active'
        AND gm.is_active = true
        AND gm.embedding IS NOT NULL
        -- Scope filtering
        AND CASE
            WHEN p_scope = 'product' THEN true
            WHEN p_scope = 'group' THEN gm.group_id = p_group_id
            ELSE gm.group_id = p_group_id  -- Default to group
        END
        -- Similarity threshold
        AND (1 - (gm.embedding <=> p_query_embedding)) >= p_similarity_threshold
    ORDER BY similarity_score DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."scoped_member_search"("p_query_text" character varying, "p_query_embedding" "extensions"."vector", "p_scope" character varying, "p_group_id" "uuid", "p_limit" integer, "p_similarity_threshold" double precision) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."scoped_member_search"("p_query_text" character varying, "p_query_embedding" "extensions"."vector", "p_scope" character varying, "p_group_id" "uuid", "p_limit" integer, "p_similarity_threshold" double precision) IS 'Vector search for members within scope. Uses embeddings for semantic matching.';



CREATE OR REPLACE FUNCTION "public"."search_businesses"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid", "p_limit" integer DEFAULT 10, "p_threshold" double precision DEFAULT 0.5) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_embedding vector(1536);
BEGIN
    -- Debug: Log what we received
    RAISE NOTICE 'Received embedding length: %, starts with: %', 
        length(p_embedding), 
        left(p_embedding, 50);
    
    -- Try to cast embedding
    BEGIN
        v_embedding := p_embedding::vector;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cast failed: ' || SQLERRM,
            'embedding_length', length(p_embedding),
            'embedding_preview', left(p_embedding, 100)
        );
    END;
    
    -- Try to call search
    BEGIN
        RETURN cached_discover_search(
            p_query_text := p_query_text,
            p_query_embedding := v_embedding,
            p_scope := 'group',
            p_scope_id := p_group_id,
            p_limit := p_limit,
            p_similarity_threshold := p_threshold,
            p_use_cache := false
        );
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Search failed: ' || SQLERRM
        );
    END;
END;
$$;


ALTER FUNCTION "public"."search_businesses"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid", "p_limit" integer, "p_threshold" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_businesses_debug"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_embedding vector(1536);
    v_count int;
    v_sample_similarity float;
BEGIN
    -- Cast embedding
    v_embedding := p_embedding::vector;
    
    -- Count members with embeddings in this group
    SELECT COUNT(*) INTO v_count
    FROM t_group_memberships
    WHERE group_id = p_group_id
    AND is_active = true
    AND embedding IS NOT NULL;
    
    -- Get similarity with first member
    SELECT 1 - (embedding <=> v_embedding) INTO v_sample_similarity
    FROM t_group_memberships
    WHERE group_id = p_group_id
    AND is_active = true
    AND embedding IS NOT NULL
    LIMIT 1;
    
    RETURN jsonb_build_object(
        'embedding_length', length(p_embedding),
        'vector_dimensions', array_length(v_embedding::real[], 1),
        'group_id', p_group_id,
        'members_with_embeddings', v_count,
        'sample_similarity', v_sample_similarity,
        'threshold_would_pass', v_sample_similarity > 0.5
    );
END;
$$;


ALTER FUNCTION "public"."search_businesses_debug"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_businesses_debug_v2"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid", "p_limit" integer DEFAULT 5, "p_threshold" double precision DEFAULT 0.5) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_embedding vector(1536);
BEGIN
    v_embedding := p_embedding::vector;
    
    -- Return debug info + results WITHOUT threshold
    RETURN jsonb_build_object(
        'debug', jsonb_build_object(
            'embedding_received', left(p_embedding, 50),
            'threshold', p_threshold
        ),
        'all_similarities', (
            SELECT jsonb_agg(jsonb_build_object(
                'business', tp.business_name,
                'similarity', ROUND((1 - (gm.embedding <=> v_embedding))::numeric, 4)
            ) ORDER BY (1 - (gm.embedding <=> v_embedding)) DESC)
            FROM t_group_memberships gm
            JOIN t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id
            WHERE gm.group_id = p_group_id
            AND gm.embedding IS NOT NULL
        )
    );
END;
$$;


ALTER FUNCTION "public"."search_businesses_debug_v2"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid", "p_limit" integer, "p_threshold" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_businesses_v2"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid", "p_threshold" double precision DEFAULT 0.3, "p_limit" integer DEFAULT 10) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_embedding vector(1536);
    v_results jsonb;
BEGIN
    v_embedding := p_embedding::vector;
    
    SELECT jsonb_agg(result ORDER BY (result->>'final_score')::float DESC)
    INTO v_results
    FROM (
        SELECT jsonb_build_object(
            'membership_id', gm.id,
            'business_name', COALESCE(tp.business_name, 'Unknown Business'),
            'description', LEFT(regexp_replace(
                COALESCE(
                    gm.profile_data->>'short_description',
                    gm.profile_data->>'ai_enhanced_description',
                    ''
                ), '<[^>]+>', '', 'g'
            ), 200),
            'city', TRIM(BOTH E'\r\n ' FROM COALESCE(tp.city, '')),
            'industry', COALESCE(tp.industry_id, 'General'),
            'chapter', COALESCE(gm.profile_data->>'chapter', bg.settings->>'chapter'),
            'group_name', bg.group_name,
            'logo_url', tp.logo_url,
            'phone', tp.business_phone,
            'whatsapp', tp.business_whatsapp,
            'email', tp.business_email,
            'website', COALESCE(gm.profile_data->>'website_url', tp.website_url),
            'booking_url', tp.booking_url,
            'similarity_raw', ROUND((1 - (gm.embedding <=> v_embedding))::numeric, 4),
            'cluster_boost', COALESCE((
                SELECT 0.15
                FROM t_semantic_clusters sc 
                WHERE sc.membership_id = gm.id 
                AND sc.is_active = true
                AND (
                    LOWER(p_query_text) LIKE '%' || LOWER(sc.primary_term) || '%'
                    OR LOWER(sc.primary_term) LIKE '%' || LOWER(p_query_text) || '%'
                    OR EXISTS (
                        SELECT 1 FROM unnest(sc.related_terms) rt 
                        WHERE LOWER(p_query_text) LIKE '%' || LOWER(rt) || '%'
                        OR LOWER(rt) LIKE '%' || LOWER(p_query_text) || '%'
                    )
                )
                LIMIT 1
            ), 0),
            'final_score', ROUND((
                (1 - (gm.embedding <=> v_embedding)) + 
                COALESCE((
                    SELECT 0.15
                    FROM t_semantic_clusters sc 
                    WHERE sc.membership_id = gm.id 
                    AND sc.is_active = true
                    AND (
                        LOWER(p_query_text) LIKE '%' || LOWER(sc.primary_term) || '%'
                        OR LOWER(sc.primary_term) LIKE '%' || LOWER(p_query_text) || '%'
                        OR EXISTS (
                            SELECT 1 FROM unnest(sc.related_terms) rt 
                            WHERE LOWER(p_query_text) LIKE '%' || LOWER(rt) || '%'
                            OR LOWER(rt) LIKE '%' || LOWER(p_query_text) || '%'
                        )
                    )
                    LIMIT 1
                ), 0)
            )::numeric, 3),
            'similarity', ROUND(LEAST(100, GREATEST(50, 
                ((1 - (gm.embedding <=> v_embedding)) + 
                COALESCE((
                    SELECT 0.15
                    FROM t_semantic_clusters sc 
                    WHERE sc.membership_id = gm.id 
                    AND sc.is_active = true
                    AND (
                        LOWER(p_query_text) LIKE '%' || LOWER(sc.primary_term) || '%'
                        OR LOWER(sc.primary_term) LIKE '%' || LOWER(p_query_text) || '%'
                        OR EXISTS (
                            SELECT 1 FROM unnest(sc.related_terms) rt 
                            WHERE LOWER(p_query_text) LIKE '%' || LOWER(rt) || '%'
                            OR LOWER(rt) LIKE '%' || LOWER(p_query_text) || '%'
                        )
                    )
                    LIMIT 1
                ), 0) - 0.25) / 0.4 * 50 + 50
            ))::numeric, 0),
            'clusters', (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'term', sc.primary_term,
                    'category', sc.category
                )), '[]'::jsonb)
                FROM t_semantic_clusters sc 
                WHERE sc.membership_id = gm.id 
                AND sc.is_active = true
                LIMIT 3
            ),
            'actions', jsonb_build_array(
                CASE WHEN tp.business_phone IS NOT NULL THEN
                    jsonb_build_object('type', 'call', 'label', '📞 Call', 'value', tp.business_phone)
                END,
                CASE WHEN tp.business_whatsapp IS NOT NULL THEN
                    jsonb_build_object('type', 'whatsapp', 'label', '💬 WhatsApp', 'value', tp.business_whatsapp)
                END,
                CASE WHEN tp.business_email IS NOT NULL THEN
                    jsonb_build_object('type', 'email', 'label', '✉️ Email', 'value', tp.business_email)
                END,
                CASE WHEN COALESCE(gm.profile_data->>'website_url', tp.website_url) IS NOT NULL THEN
                    jsonb_build_object('type', 'website', 'label', '🌐 Website', 'value', COALESCE(gm.profile_data->>'website_url', tp.website_url))
                END,
                CASE WHEN tp.booking_url IS NOT NULL THEN
                    jsonb_build_object('type', 'book', 'label', '📅 Book Meeting', 'value', tp.booking_url)
                END,
                jsonb_build_object('type', 'details', 'label', '👤 View Details', 'value', gm.id)
            )
        ) as result
        FROM t_group_memberships gm
        LEFT JOIN t_tenant_profiles tp ON gm.tenant_id = tp.tenant_id
        LEFT JOIN t_business_groups bg ON gm.group_id = bg.id
        WHERE gm.group_id = p_group_id
        AND gm.is_active = true
        AND gm.embedding IS NOT NULL
        AND (
            (1 - (gm.embedding <=> v_embedding)) + 
            COALESCE((
                SELECT 0.15
                FROM t_semantic_clusters sc 
                WHERE sc.membership_id = gm.id 
                AND sc.is_active = true
                AND (
                    LOWER(p_query_text) LIKE '%' || LOWER(sc.primary_term) || '%'
                    OR LOWER(sc.primary_term) LIKE '%' || LOWER(p_query_text) || '%'
                    OR EXISTS (
                        SELECT 1 FROM unnest(sc.related_terms) rt 
                        WHERE LOWER(p_query_text) LIKE '%' || LOWER(rt) || '%'
                        OR LOWER(rt) LIKE '%' || LOWER(p_query_text) || '%'
                    )
                )
                LIMIT 1
            ), 0)
        ) >= p_threshold
        LIMIT p_limit
    ) sub;
    
    SELECT jsonb_agg(
        jsonb_set(
            item,
            '{actions}',
            (SELECT COALESCE(jsonb_agg(action), '[]'::jsonb) FROM jsonb_array_elements(item->'actions') action WHERE action IS NOT NULL AND action != 'null'::jsonb)
        )
    )
    INTO v_results
    FROM jsonb_array_elements(COALESCE(v_results, '[]'::jsonb)) item;
    
    RETURN jsonb_build_object(
        'success', true,
        'results', COALESCE(v_results, '[]'::jsonb),
        'results_count', COALESCE(jsonb_array_length(v_results), 0),
        'query', p_query_text,
        'group_name', (SELECT group_name FROM t_business_groups WHERE id = p_group_id)
    );
END;
$$;


ALTER FUNCTION "public"."search_businesses_v2"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid", "p_threshold" double precision, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_group_members"("p_group_id" "uuid", "p_query_embedding" "extensions"."vector", "p_query_keywords" "text"[] DEFAULT NULL::"text"[], "p_limit" integer DEFAULT 5, "p_similarity_threshold" double precision DEFAULT 0.7) RETURNS TABLE("membership_id" "uuid", "tenant_id" "uuid", "business_name" character varying, "profile_data" "jsonb", "similarity_score" double precision, "match_type" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gm.id as membership_id,
    gm.tenant_id,
    tp.business_name,
    gm.profile_data,
    (1 - (gm.embedding <=> p_query_embedding))::FLOAT as similarity_score,
    CASE 
      WHEN (1 - (gm.embedding <=> p_query_embedding)) >= p_similarity_threshold 
        THEN 'vector'
      WHEN p_query_keywords IS NOT NULL 
        AND (gm.profile_data->'approved_keywords')::jsonb ?| p_query_keywords
        THEN 'keyword'
      ELSE 'semantic'
    END as match_type
  FROM t_group_memberships gm
  JOIN t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id
  WHERE 
    gm.group_id = p_group_id
    AND gm.status = 'active'
    AND gm.is_active = true
    AND (
      -- Vector similarity match
      (1 - (gm.embedding <=> p_query_embedding)) >= p_similarity_threshold
      OR
      -- Keyword match (if keywords provided)
      (p_query_keywords IS NOT NULL 
       AND (gm.profile_data->'approved_keywords')::jsonb ?| p_query_keywords)
    )
  ORDER BY 
    similarity_score DESC,
    tp.business_name ASC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."search_group_members"("p_group_id" "uuid", "p_query_embedding" "extensions"."vector", "p_query_keywords" "text"[], "p_limit" integer, "p_similarity_threshold" double precision) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_group_members"("p_group_id" "uuid", "p_query_embedding" "extensions"."vector", "p_query_keywords" "text"[], "p_limit" integer, "p_similarity_threshold" double precision) IS 'Hybrid search combining vector similarity and keyword matching';



CREATE OR REPLACE FUNCTION "public"."seed_sequence_numbers_for_tenant"("p_tenant_id" "uuid", "p_created_by" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_category_id UUID;
    v_result JSONB := '[]'::JSONB;
    v_sequence_type RECORD;
BEGIN
    -- Step 1: Create the category_master entry
    INSERT INTO public.t_category_master (
        category_name,
        display_name,
        is_active,
        description,
        icon_name,
        order_sequence,
        tenant_id,
        is_live
    )
    VALUES (
        'sequence_numbers',
        'Sequence Numbers',
        true,
        'Document and record numbering sequences configuration',
        'Hash',
        10,
        p_tenant_id,
        true
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_category_id;

    -- If category already exists, get its ID
    IF v_category_id IS NULL THEN
        SELECT id INTO v_category_id
        FROM public.t_category_master
        WHERE category_name = 'sequence_numbers'
          AND tenant_id = p_tenant_id
          AND is_live = true;
    END IF;

    -- Step 2: Insert default sequence types
    -- Each sequence type has form_settings with its configuration

    -- CONTACT sequence
    INSERT INTO public.t_category_details (
        sub_cat_name,
        display_name,
        category_id,
        hexcolor,
        icon_name,
        is_active,
        sequence_no,
        description,
        tenant_id,
        is_deletable,
        form_settings,
        is_live
    )
    VALUES (
        'CONTACT',
        'Contact Number',
        v_category_id,
        '#3B82F6',  -- Blue
        'Users',
        true,
        1,
        'Auto-generated number for contacts',
        p_tenant_id,
        false,      -- System sequence, not deletable
        jsonb_build_object(
            'prefix', 'CT',
            'separator', '-',
            'suffix', '',
            'padding_length', 4,
            'start_value', 1001,
            'reset_frequency', 'NEVER',
            'increment_by', 1
        ),
        true
    )
    ON CONFLICT DO NOTHING;

    -- CONTRACT sequence
    INSERT INTO public.t_category_details (
        sub_cat_name,
        display_name,
        category_id,
        hexcolor,
        icon_name,
        is_active,
        sequence_no,
        description,
        tenant_id,
        is_deletable,
        form_settings,
        is_live
    )
    VALUES (
        'CONTRACT',
        'Contract Number',
        v_category_id,
        '#10B981',  -- Green
        'FileText',
        true,
        2,
        'Auto-generated number for contracts',
        p_tenant_id,
        false,
        jsonb_build_object(
            'prefix', 'CN',
            'separator', '-',
            'suffix', '',
            'padding_length', 4,
            'start_value', 1001,
            'reset_frequency', 'YEARLY',
            'increment_by', 1
        ),
        true
    )
    ON CONFLICT DO NOTHING;

    -- INVOICE sequence
    INSERT INTO public.t_category_details (
        sub_cat_name,
        display_name,
        category_id,
        hexcolor,
        icon_name,
        is_active,
        sequence_no,
        description,
        tenant_id,
        is_deletable,
        form_settings,
        is_live
    )
    VALUES (
        'INVOICE',
        'Invoice Number',
        v_category_id,
        '#F59E0B',  -- Amber
        'Receipt',
        true,
        3,
        'Auto-generated number for invoices',
        p_tenant_id,
        false,
        jsonb_build_object(
            'prefix', 'INV',
            'separator', '-',
            'suffix', '',
            'padding_length', 5,
            'start_value', 10001,
            'reset_frequency', 'YEARLY',
            'increment_by', 1
        ),
        true
    )
    ON CONFLICT DO NOTHING;

    -- QUOTATION sequence
    INSERT INTO public.t_category_details (
        sub_cat_name,
        display_name,
        category_id,
        hexcolor,
        icon_name,
        is_active,
        sequence_no,
        description,
        tenant_id,
        is_deletable,
        form_settings,
        is_live
    )
    VALUES (
        'QUOTATION',
        'Quotation Number',
        v_category_id,
        '#8B5CF6',  -- Purple
        'FileQuestion',
        true,
        4,
        'Auto-generated number for quotations',
        p_tenant_id,
        false,
        jsonb_build_object(
            'prefix', 'QT',
            'separator', '-',
            'suffix', '',
            'padding_length', 4,
            'start_value', 1001,
            'reset_frequency', 'YEARLY',
            'increment_by', 1
        ),
        true
    )
    ON CONFLICT DO NOTHING;

    -- RECEIPT sequence
    INSERT INTO public.t_category_details (
        sub_cat_name,
        display_name,
        category_id,
        hexcolor,
        icon_name,
        is_active,
        sequence_no,
        description,
        tenant_id,
        is_deletable,
        form_settings,
        is_live
    )
    VALUES (
        'RECEIPT',
        'Receipt Number',
        v_category_id,
        '#EC4899',  -- Pink
        'CreditCard',
        true,
        5,
        'Auto-generated number for receipts',
        p_tenant_id,
        false,
        jsonb_build_object(
            'prefix', 'RCP',
            'separator', '-',
            'suffix', '',
            'padding_length', 5,
            'start_value', 10001,
            'reset_frequency', 'YEARLY',
            'increment_by', 1
        ),
        true
    )
    ON CONFLICT DO NOTHING;

    -- PROJECT sequence
    INSERT INTO public.t_category_details (
        sub_cat_name,
        display_name,
        category_id,
        hexcolor,
        icon_name,
        is_active,
        sequence_no,
        description,
        tenant_id,
        is_deletable,
        form_settings,
        is_live
    )
    VALUES (
        'PROJECT',
        'Project Number',
        v_category_id,
        '#06B6D4',  -- Cyan
        'Folder',
        true,
        6,
        'Auto-generated number for projects',
        p_tenant_id,
        true,       -- Optional, can be deleted
        jsonb_build_object(
            'prefix', 'PRJ',
            'separator', '-',
            'suffix', '',
            'padding_length', 4,
            'start_value', 1001,
            'reset_frequency', 'YEARLY',
            'increment_by', 1
        ),
        true
    )
    ON CONFLICT DO NOTHING;

    -- TASK sequence
    INSERT INTO public.t_category_details (
        sub_cat_name,
        display_name,
        category_id,
        hexcolor,
        icon_name,
        is_active,
        sequence_no,
        description,
        tenant_id,
        is_deletable,
        form_settings,
        is_live
    )
    VALUES (
        'TASK',
        'Task Number',
        v_category_id,
        '#64748B',  -- Slate
        'CheckSquare',
        true,
        7,
        'Auto-generated number for tasks',
        p_tenant_id,
        true,
        jsonb_build_object(
            'prefix', 'TSK',
            'separator', '-',
            'suffix', '',
            'padding_length', 5,
            'start_value', 10001,
            'reset_frequency', 'NEVER',
            'increment_by', 1
        ),
        true
    )
    ON CONFLICT DO NOTHING;

    -- TICKET sequence (Support)
    INSERT INTO public.t_category_details (
        sub_cat_name,
        display_name,
        category_id,
        hexcolor,
        icon_name,
        is_active,
        sequence_no,
        description,
        tenant_id,
        is_deletable,
        form_settings,
        is_live
    )
    VALUES (
        'TICKET',
        'Support Ticket Number',
        v_category_id,
        '#EF4444',  -- Red
        'Ticket',
        true,
        8,
        'Auto-generated number for support tickets',
        p_tenant_id,
        true,
        jsonb_build_object(
            'prefix', 'TKT',
            'separator', '-',
            'suffix', '',
            'padding_length', 5,
            'start_value', 10001,
            'reset_frequency', 'YEARLY',
            'increment_by', 1
        ),
        true
    )
    ON CONFLICT DO NOTHING;

    -- Return summary of what was created
    SELECT jsonb_agg(jsonb_build_object(
        'sub_cat_name', sub_cat_name,
        'display_name', display_name,
        'form_settings', form_settings
    ))
    INTO v_result
    FROM public.t_category_details
    WHERE category_id = v_category_id
      AND tenant_id = p_tenant_id
      AND is_live = true;

    RETURN jsonb_build_object(
        'success', true,
        'category_id', v_category_id,
        'tenant_id', p_tenant_id,
        'sequences_created', v_result
    );
END;
$$;


ALTER FUNCTION "public"."seed_sequence_numbers_for_tenant"("p_tenant_id" "uuid", "p_created_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."seed_sequence_numbers_for_tenant"("p_tenant_id" "uuid", "p_created_by" "uuid") IS 'Seeds default sequence number configurations for a new tenant.
Called during tenant onboarding to create:
- Category master entry for sequence_numbers
- Default sequence types: CONTACT, CONTRACT, INVOICE, QUOTATION, RECEIPT, PROJECT, TASK, TICKET
Each sequence type has configurable prefix, separator, padding, start value, and reset frequency.';



CREATE OR REPLACE FUNCTION "public"."set_session_intent"("p_session_id" "uuid", "p_intent" "text", "p_prompt" "text") RETURNS "public"."t_chat_sessions"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_session public.t_chat_sessions;
BEGIN
    UPDATE public.t_chat_sessions
    SET
        intent_state = 'AWAITING_INPUT',
        current_intent = p_intent,
        pending_prompt = p_prompt,
        last_activity_at = NOW(),
        updated_at = NOW(),
        expires_at = NOW() + INTERVAL '30 minutes'
    WHERE id = p_session_id
    RETURNING * INTO v_session;

    RETURN v_session;
END;
$$;


ALTER FUNCTION "public"."set_session_intent"("p_session_id" "uuid", "p_intent" "text", "p_prompt" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."smartprofile_search_with_boost"("p_query_embedding" "extensions"."vector", "p_query_text" "text", "p_scope" "text" DEFAULT 'product'::"text", "p_scope_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 10, "p_similarity_threshold" double precision DEFAULT 0.7) RETURNS TABLE("tenant_id" "uuid", "business_name" "text", "business_email" "text", "city" "text", "industry" "text", "profile_snippet" "text", "ai_enhanced_description" "text", "approved_keywords" "text"[], "profile_type" "text", "similarity" double precision, "similarity_original" double precision, "boost_applied" "text", "match_type" "text", "search_scope" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_query_words TEXT[];
    v_search_word TEXT;
BEGIN
    -- Extract meaningful search word for cluster matching
    v_query_words := regexp_split_to_array(LOWER(TRIM(p_query_text)), '\s+');
    v_search_word := v_query_words[1];

    RETURN QUERY
    WITH base_results AS (
        SELECT
            sp.tenant_id,
            tp.business_name,
            tp.business_email,
            tp.city,
            ci.industry_name AS industry,
            LEFT(COALESCE(sp.ai_enhanced_description, sp.short_description, tp.business_name), 200) AS profile_snippet,
            sp.ai_enhanced_description,
            sp.approved_keywords,
            sp.profile_type,
            1 - (sp.embedding <=> p_query_embedding) AS base_similarity
        FROM public.t_tenant_smartprofiles sp
        JOIN public.t_tenant_profiles tp ON tp.tenant_id = sp.tenant_id
        LEFT JOIN public.m_catalog_industries ci ON ci.id = tp.industry_id
        WHERE sp.status = 'active'
          AND sp.is_active = TRUE
          AND sp.embedding IS NOT NULL
          AND 1 - (sp.embedding <=> p_query_embedding) >= p_similarity_threshold
          AND (
              p_scope = 'product'
              OR (p_scope = 'tenant' AND sp.tenant_id = p_scope_id)
              OR (p_scope = 'group' AND EXISTS (
                  SELECT 1 FROM public.t_group_memberships gm
                  WHERE gm.tenant_id = sp.tenant_id
                    AND gm.group_id = p_scope_id
                    AND gm.status = 'active'
                    AND gm.is_active = TRUE
              ))
          )
    ),
    -- Find clusters matching the search word (tenant-based clusters)
    cluster_matches AS (
        SELECT DISTINCT sc.tenant_id
        FROM public.t_semantic_clusters sc
        WHERE sc.tenant_id IS NOT NULL  -- Only tenant-based clusters
          AND sc.is_active = TRUE
          AND (
              LOWER(sc.primary_term) LIKE '%' || v_search_word || '%'
              OR EXISTS (
                  SELECT 1
                  FROM unnest(sc.related_terms) rt
                  WHERE LOWER(rt) LIKE '%' || v_search_word || '%'
              )
          )
    ),
    boosted_results AS (
        SELECT
            br.*,
            CASE
                WHEN cm.tenant_id IS NOT NULL THEN
                    LEAST(1.0, br.base_similarity + 0.15)  -- +15% boost for cluster match
                ELSE br.base_similarity
            END AS final_similarity,
            CASE
                WHEN cm.tenant_id IS NOT NULL THEN 'cluster_match'
                ELSE NULL
            END AS boost_reason
        FROM base_results br
        LEFT JOIN cluster_matches cm ON cm.tenant_id = br.tenant_id
    )
    SELECT
        br.tenant_id,
        br.business_name,
        br.business_email,
        br.city,
        br.industry,
        br.profile_snippet,
        br.ai_enhanced_description,
        br.approved_keywords,
        br.profile_type,
        br.final_similarity AS similarity,
        br.base_similarity AS similarity_original,
        br.boost_reason AS boost_applied,
        'vector'::TEXT AS match_type,
        p_scope AS search_scope
    FROM boosted_results br
    ORDER BY br.final_similarity DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."smartprofile_search_with_boost"("p_query_embedding" "extensions"."vector", "p_query_text" "text", "p_scope" "text", "p_scope_id" "uuid", "p_limit" integer, "p_similarity_threshold" double precision) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."smartprofile_search_with_boost"("p_query_embedding" "extensions"."vector", "p_query_text" "text", "p_scope" "text", "p_scope_id" "uuid", "p_limit" integer, "p_similarity_threshold" double precision) IS 'Vector search with semantic cluster boost (+15%)';



CREATE OR REPLACE FUNCTION "public"."smartprofile_unified_search"("p_query_text" "text", "p_query_embedding" "extensions"."vector", "p_scope" "text" DEFAULT 'product'::"text", "p_scope_id" "uuid" DEFAULT NULL::"uuid", "p_user_role" "text" DEFAULT 'member'::"text", "p_channel" "text" DEFAULT 'web'::"text", "p_limit" integer DEFAULT 10, "p_similarity_threshold" double precision DEFAULT 0.7, "p_use_cache" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_query_normalized TEXT;
    v_cache_result RECORD;
    v_search_results JSONB;
    v_results_count INT;
    v_cache_id UUID;
BEGIN
    v_query_normalized := LOWER(TRIM(p_query_text));

    -- Check cache (if enabled and scope is not tenant-specific)
    IF p_use_cache AND p_scope != 'tenant' THEN
        SELECT * INTO v_cache_result
        FROM get_smartprofile_cached_search(p_scope, p_scope_id, v_query_normalized);

        IF v_cache_result.is_cached THEN
            RETURN jsonb_build_object(
                'success', TRUE,
                'from_cache', TRUE,
                'cache_hit_count', v_cache_result.hit_count,
                'results_count', v_cache_result.results_count,
                'results', v_cache_result.results,
                'scope', p_scope
            );
        END IF;
    END IF;

    -- Perform fresh search with boost
    SELECT jsonb_agg(row_to_json(r)) INTO v_search_results
    FROM (
        SELECT *
        FROM smartprofile_search_with_boost(
            p_query_embedding,
            p_query_text,
            p_scope,
            p_scope_id,
            p_limit,
            p_similarity_threshold
        )
    ) r;

    v_search_results := COALESCE(v_search_results, '[]'::JSONB);
    v_results_count := jsonb_array_length(v_search_results);

    -- Store in cache (if enabled and results found)
    IF p_use_cache AND p_scope != 'tenant' AND v_results_count > 0 THEN
        v_cache_id := store_smartprofile_cache(
            p_scope,
            p_scope_id,
            p_query_text,
            v_query_normalized,
            p_query_embedding,
            v_search_results,
            v_results_count
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'from_cache', FALSE,
        'results_count', v_results_count,
        'results', v_search_results,
        'scope', p_scope,
        'query', p_query_text
    );
END;
$$;


ALTER FUNCTION "public"."smartprofile_unified_search"("p_query_text" "text", "p_query_embedding" "extensions"."vector", "p_scope" "text", "p_scope_id" "uuid", "p_user_role" "text", "p_channel" "text", "p_limit" integer, "p_similarity_threshold" double precision, "p_use_cache" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."smartprofile_unified_search"("p_query_text" "text", "p_query_embedding" "extensions"."vector", "p_scope" "text", "p_scope_id" "uuid", "p_user_role" "text", "p_channel" "text", "p_limit" integer, "p_similarity_threshold" double precision, "p_use_cache" boolean) IS 'Main entry point for smartprofile search with caching';



CREATE OR REPLACE FUNCTION "public"."smartprofile_vector_search"("p_query_embedding" "extensions"."vector", "p_scope" "text" DEFAULT 'product'::"text", "p_scope_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 10, "p_similarity_threshold" double precision DEFAULT 0.7) RETURNS TABLE("tenant_id" "uuid", "business_name" "text", "business_email" "text", "city" "text", "industry" "text", "profile_snippet" "text", "ai_enhanced_description" "text", "approved_keywords" "text"[], "profile_type" "text", "similarity" double precision, "match_type" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        sp.tenant_id,
        tp.business_name,
        tp.business_email,
        tp.city,
        ci.industry_name AS industry,
        LEFT(COALESCE(sp.ai_enhanced_description, sp.short_description, tp.business_name), 200) AS profile_snippet,
        sp.ai_enhanced_description,
        sp.approved_keywords,
        sp.profile_type,
        1 - (sp.embedding <=> p_query_embedding) AS similarity,
        'vector'::TEXT AS match_type
    FROM public.t_tenant_smartprofiles sp
    JOIN public.t_tenant_profiles tp ON tp.tenant_id = sp.tenant_id
    LEFT JOIN public.m_catalog_industries ci ON ci.id = tp.industry_id
    WHERE sp.status = 'active'
      AND sp.is_active = TRUE
      AND sp.embedding IS NOT NULL
      AND 1 - (sp.embedding <=> p_query_embedding) >= p_similarity_threshold
      -- Scope filtering
      AND (
          p_scope = 'product'  -- No filter for product-wide
          OR (p_scope = 'tenant' AND sp.tenant_id = p_scope_id)
          OR (p_scope = 'group' AND EXISTS (
              SELECT 1 FROM public.t_group_memberships gm
              WHERE gm.tenant_id = sp.tenant_id
                AND gm.group_id = p_scope_id
                AND gm.status = 'active'
                AND gm.is_active = TRUE
          ))
      )
    ORDER BY similarity DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."smartprofile_vector_search"("p_query_embedding" "extensions"."vector", "p_scope" "text", "p_scope_id" "uuid", "p_limit" integer, "p_similarity_threshold" double precision) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."smartprofile_vector_search"("p_query_embedding" "extensions"."vector", "p_scope" "text", "p_scope_id" "uuid", "p_limit" integer, "p_similarity_threshold" double precision) IS 'Basic vector search for tenant smartprofiles without cluster boost';



CREATE OR REPLACE FUNCTION "public"."soft_delete_catalog_item"("p_item_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Mark item as inactive (soft delete)
  UPDATE t_catalog_items 
  SET 
    is_active = FALSE,
    status = 'inactive',
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_item_id AND is_current_version = TRUE;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."soft_delete_catalog_item"("p_item_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."soft_delete_catalog_item"("p_item_id" "uuid") IS 'Soft deletes a catalog item by marking it inactive while preserving data for historical transactions.';



CREATE OR REPLACE FUNCTION "public"."store_search_cache"("p_group_id" "uuid", "p_query_text" "text", "p_query_normalized" "text", "p_query_embedding" "extensions"."vector", "p_results" "jsonb", "p_results_count" integer, "p_search_type" "text" DEFAULT 'vector'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_cache_id UUID;
BEGIN
    INSERT INTO public.t_query_cache (
        group_id,
        query_text,
        query_normalized,
        query_embedding,
        results,
        results_count,
        search_type,
        hit_count,
        created_at,
        updated_at,
        last_hit_at,
        expires_at
    ) VALUES (
        p_group_id,
        p_query_text,
        p_query_normalized,
        p_query_embedding,
        p_results,
        p_results_count,
        p_search_type,
        1,
        NOW(),
        NOW(),
        NOW(),
        NOW() + INTERVAL '45 days'
    )
    ON CONFLICT (group_id, query_normalized)
    DO UPDATE SET
        query_embedding = EXCLUDED.query_embedding,
        results = EXCLUDED.results,
        results_count = EXCLUDED.results_count,
        hit_count = t_query_cache.hit_count + 1,
        updated_at = NOW(),
        last_hit_at = NOW(),
        expires_at = NOW() + INTERVAL '45 days'
    RETURNING id INTO v_cache_id;

    RETURN v_cache_id;
END;
$$;


ALTER FUNCTION "public"."store_search_cache"("p_group_id" "uuid", "p_query_text" "text", "p_query_normalized" "text", "p_query_embedding" "extensions"."vector", "p_results" "jsonb", "p_results_count" integer, "p_search_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."store_smartprofile_cache"("p_scope" "text", "p_scope_id" "uuid", "p_query_text" "text", "p_query_normalized" "text", "p_query_embedding" "extensions"."vector", "p_results" "jsonb", "p_results_count" integer) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_cache_id UUID;
BEGIN
    INSERT INTO public.t_query_cache (
        cache_type,
        scope,
        scope_id,
        group_id,  -- NULL for smartprofile searches
        query_text,
        query_normalized,
        query_embedding,
        results,
        results_count,
        search_type,
        hit_count,
        created_at,
        updated_at,
        last_hit_at,
        expires_at
    ) VALUES (
        'smartprofile_search',
        p_scope,
        p_scope_id,
        NULL,
        p_query_text,
        p_query_normalized,
        p_query_embedding,
        p_results,
        p_results_count,
        'vector',
        1,
        NOW(),
        NOW(),
        NOW(),
        NOW() + INTERVAL '45 days'
    )
    ON CONFLICT (cache_type, scope, scope_id, query_normalized)
    DO UPDATE SET
        query_embedding = EXCLUDED.query_embedding,
        results = EXCLUDED.results,
        results_count = EXCLUDED.results_count,
        hit_count = t_query_cache.hit_count + 1,
        updated_at = NOW(),
        last_hit_at = NOW(),
        expires_at = NOW() + INTERVAL '45 days'
    RETURNING id INTO v_cache_id;

    RETURN v_cache_id;
END;
$$;


ALTER FUNCTION "public"."store_smartprofile_cache"("p_scope" "text", "p_scope_id" "uuid", "p_query_text" "text", "p_query_normalized" "text", "p_query_embedding" "extensions"."vector", "p_results" "jsonb", "p_results_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."store_tool_result"("p_session_id" "uuid", "p_tool_name" "text", "p_query_text" "text", "p_results" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO t_tool_results (
        session_id,
        tool_name,
        query_text,
        results,
        results_count
    ) VALUES (
        p_session_id,
        p_tool_name,
        p_query_text,
        p_results,
        COALESCE(jsonb_array_length(p_results), 0)
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."store_tool_result"("p_session_id" "uuid", "p_tool_name" "text", "p_query_text" "text", "p_results" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."switch_ai_session"("p_phone" character varying, "p_new_group_id" "uuid", "p_language" character varying DEFAULT NULL::character varying) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_channel VARCHAR;
    v_language VARCHAR;
    v_new_session_id UUID;
    v_phone_digits VARCHAR;
BEGIN
    v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');

    -- Get user_id and channel from current session
    SELECT user_id, channel, detected_language
    INTO v_user_id, v_channel, v_language
    FROM public.t_ai_agent_sessions
    WHERE phone_normalized = v_phone_digits
      AND is_active = true
    ORDER BY last_activity_at DESC
    LIMIT 1;

    -- End current session with switch reason
    UPDATE public.t_ai_agent_sessions
    SET
        is_active = false,
        end_reason = 'switch_group',
        ended_at = NOW(),
        updated_at = NOW()
    WHERE phone_normalized = v_phone_digits
      AND is_active = true;

    -- Create new session with new group
    v_new_session_id := create_ai_session(
        v_user_id,
        p_phone,
        p_new_group_id,
        COALESCE(v_channel, 'whatsapp'),
        COALESCE(p_language, v_language, 'en')
    );

    RETURN v_new_session_id;
END;
$$;


ALTER FUNCTION "public"."switch_ai_session"("p_phone" character varying, "p_new_group_id" "uuid", "p_language" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."switch_ai_session"("p_phone" character varying, "p_new_group_id" "uuid", "p_language" character varying) IS 'Switches session from one group to another (e.g., user says Hi TechForum while in BBB).';



CREATE OR REPLACE FUNCTION "public"."switch_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_new_group_id" "uuid", "p_language" character varying DEFAULT NULL::character varying) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_phone VARCHAR;
    v_channel VARCHAR;
    v_language VARCHAR;
    v_new_session_id UUID;
BEGIN
    -- Get phone and channel from current session
    SELECT phone, channel, detected_language
    INTO v_phone, v_channel, v_language
    FROM public.t_ai_agent_sessions
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND is_active = true
    ORDER BY last_activity_at DESC
    LIMIT 1;

    -- End current session with switch reason
    UPDATE public.t_ai_agent_sessions
    SET
        is_active = false,
        end_reason = 'switch_group',
        ended_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND is_active = true;

    -- Create new session with new group
    v_new_session_id := create_ai_session_by_user(
        p_tenant_id,
        p_user_id,
        p_new_group_id,
        COALESCE(v_channel, 'web'),
        COALESCE(p_language, v_language, 'en'),
        v_phone
    );

    RETURN v_new_session_id;
END;
$$;


ALTER FUNCTION "public"."switch_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_new_group_id" "uuid", "p_language" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."switch_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_new_group_id" "uuid", "p_language" character varying) IS 'Switches group for session by tenant_id + user_id.';



CREATE OR REPLACE FUNCTION "public"."test_jtd_worker"() RETURNS TABLE("queue_length" bigint, "messages_sample" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT count(*) FROM pgmq.q_jtd_queue)::BIGINT as queue_length,
        (SELECT jsonb_agg(message) FROM (SELECT message FROM pgmq.q_jtd_queue LIMIT 5) sub) as messages_sample;
END;
$$;


ALTER FUNCTION "public"."test_jtd_worker"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."test_jtd_worker"() IS 'Test function to check JTD queue status';



CREATE OR REPLACE FUNCTION "public"."unified_search"("p_query_embedding" "text", "p_query_text" "text", "p_scope" character varying DEFAULT 'group'::character varying, "p_scope_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 10, "p_similarity_threshold" double precision DEFAULT 0.5) RETURNS TABLE("membership_id" "uuid", "tenant_id" "uuid", "group_id" "uuid", "group_name" "text", "business_name" "text", "business_email" "text", "mobile_number" "text", "city" "text", "industry" "text", "profile_snippet" "text", "ai_enhanced_description" "text", "approved_keywords" "text"[], "similarity" double precision, "similarity_original" double precision, "boost_applied" "text", "match_type" "text", "search_scope" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_embedding vector(1536);
    v_search_terms TEXT[];
BEGIN
    -- Convert text embedding to vector
    v_embedding := p_query_embedding::vector(1536);
    
    -- Extract search terms from query
    v_search_terms := string_to_array(LOWER(p_query_text), ' ');
    -- Remove common stop words
    v_search_terms := array_remove(v_search_terms, 'who');
    v_search_terms := array_remove(v_search_terms, 'is');
    v_search_terms := array_remove(v_search_terms, 'into');
    v_search_terms := array_remove(v_search_terms, 'the');
    v_search_terms := array_remove(v_search_terms, 'a');
    v_search_terms := array_remove(v_search_terms, 'an');
    v_search_terms := array_remove(v_search_terms, 'for');
    v_search_terms := array_remove(v_search_terms, 'and');
    v_search_terms := array_remove(v_search_terms, 'or');

    RETURN QUERY
    WITH 
    -- Get base memberships with vector similarity
    base_search AS (
        SELECT 
            sm.id AS membership_id,
            sm.tenant_id,
            sm.group_id,
            g.name AS group_name,
            sm.business_name,
            sm.business_email,
            sm.mobile_number,
            sm.city,
            sm.industry_id::TEXT AS industry,
            LEFT(COALESCE(sp.ai_enhanced_description, sm.short_description, ''), 200) AS profile_snippet,
            sp.ai_enhanced_description,
            sm.approved_keywords,
            sp.profile_embedding,
            1 - (sp.profile_embedding <=> v_embedding) AS vector_similarity
        FROM t_seller_memberships sm
        LEFT JOIN t_smart_profiles sp ON sm.id = sp.membership_id
        LEFT JOIN t_groups g ON sm.group_id = g.id
        WHERE sm.status = 'active'
          AND sp.profile_embedding IS NOT NULL
          AND (
              (p_scope = 'group' AND sm.group_id = p_scope_id)
              OR (p_scope = 'product' AND TRUE)
              OR (p_scope = 'global' AND TRUE)
          )
    ),
    
    -- Check cluster matches
    cluster_signals AS (
        SELECT DISTINCT
            bs.membership_id,
            TRUE AS has_cluster_match,
            MAX(sc.cluster_confidence) AS cluster_confidence
        FROM base_search bs
        JOIN t_semantic_clusters sc ON sc.membership_id = bs.membership_id AND sc.is_active = TRUE
        WHERE EXISTS (
            SELECT 1 FROM unnest(v_search_terms) AS term
            WHERE LOWER(sc.primary_term) LIKE '%' || term || '%'
               OR EXISTS (
                   SELECT 1 FROM unnest(sc.related_terms) AS rt
                   WHERE LOWER(rt) LIKE '%' || term || '%'
               )
        )
        GROUP BY bs.membership_id
    ),
    
    -- Check keyword matches
    keyword_signals AS (
        SELECT 
            bs.membership_id,
            TRUE AS has_keyword_match,
            COUNT(*)::FLOAT / GREATEST(array_length(bs.approved_keywords, 1), 1) AS keyword_ratio
        FROM base_search bs
        WHERE EXISTS (
            SELECT 1 FROM unnest(v_search_terms) AS term
            WHERE EXISTS (
                SELECT 1 FROM unnest(bs.approved_keywords) AS kw
                WHERE LOWER(kw) LIKE '%' || term || '%'
            )
        )
        GROUP BY bs.membership_id, bs.approved_keywords
    ),
    
    -- Check text matches in description
    text_signals AS (
        SELECT 
            bs.membership_id,
            TRUE AS has_text_match
        FROM base_search bs
        WHERE EXISTS (
            SELECT 1 FROM unnest(v_search_terms) AS term
            WHERE LENGTH(term) > 2 AND (
                LOWER(bs.business_name) LIKE '%' || term || '%'
                OR LOWER(COALESCE(bs.ai_enhanced_description, '')) LIKE '%' || term || '%'
            )
        )
    ),
    
    -- Combine all signals
    combined_signals AS (
        SELECT 
            bs.*,
            COALESCE(cs.has_cluster_match, FALSE) AS has_cluster,
            COALESCE(cs.cluster_confidence, 0) AS cluster_conf,
            COALESCE(ks.has_keyword_match, FALSE) AS has_keyword,
            COALESCE(ks.keyword_ratio, 0) AS keyword_ratio,
            COALESCE(ts.has_text_match, FALSE) AS has_text,
            -- Quality gate: must have at least one signal
            (COALESCE(cs.has_cluster_match, FALSE) 
             OR COALESCE(ks.has_keyword_match, FALSE) 
             OR COALESCE(ts.has_text_match, FALSE)) AS has_signal
        FROM base_search bs
        LEFT JOIN cluster_signals cs ON bs.membership_id = cs.membership_id
        LEFT JOIN keyword_signals ks ON bs.membership_id = ks.membership_id
        LEFT JOIN text_signals ts ON bs.membership_id = ts.membership_id
    ),
    
    -- Calculate final scores
    scored_results AS (
        SELECT 
            cs.*,
            -- Multi-signal weighted score
            (
                (CASE WHEN cs.has_cluster THEN cs.cluster_conf ELSE 0 END * 0.35) +
                (cs.keyword_ratio * 0.30) +
                (CASE WHEN cs.has_text THEN 0.8 ELSE 0 END * 0.20) +
                (cs.vector_similarity * 0.15)
            ) AS combined_score,
            -- Determine match type
            CASE 
                WHEN cs.has_cluster THEN 'cluster_match'
                WHEN cs.has_keyword THEN 'keyword_match'
                WHEN cs.has_text THEN 'text_match'
                ELSE 'vector_only'
            END AS match_type_calc
        FROM combined_signals cs
    )
    
    -- Final select with quality gate
    SELECT 
        sr.membership_id,
        sr.tenant_id,
        sr.group_id,
        sr.group_name,
        sr.business_name,
        sr.business_email,
        sr.mobile_number,
        sr.city,
        sr.industry,
        sr.profile_snippet,
        sr.ai_enhanced_description,
        sr.approved_keywords,
        sr.combined_score AS similarity,
        sr.vector_similarity AS similarity_original,
        sr.match_type_calc AS boost_applied,
        sr.match_type_calc AS match_type,
        p_scope AS search_scope
    FROM scored_results sr
    WHERE sr.has_signal = TRUE  -- QUALITY GATE: Block results without signals
      AND sr.combined_score >= p_similarity_threshold
    ORDER BY sr.combined_score DESC
    LIMIT p_limit;
    
END;
$$;


ALTER FUNCTION "public"."unified_search"("p_query_embedding" "text", "p_query_text" "text", "p_scope" character varying, "p_scope_id" "uuid", "p_limit" integer, "p_similarity_threshold" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unified_search"("p_group_id" "uuid", "p_query_text" "text", "p_query_embedding" "text", "p_intent_code" character varying DEFAULT 'search_offering'::character varying, "p_user_role" character varying DEFAULT 'member'::character varying, "p_channel" character varying DEFAULT 'web'::character varying, "p_scope" character varying DEFAULT 'group'::character varying, "p_limit" integer DEFAULT NULL::integer, "p_use_cache" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_permission RECORD;
    v_max_results INT;
    v_search_result JSONB;
    v_scope_id UUID;
    v_embedding vector(1536);  -- Internal vector variable
BEGIN
    -- Cast TEXT embedding to vector
    v_embedding := p_query_embedding::vector(1536);

    -- 1. Check permission
    SELECT * INTO v_permission
    FROM check_intent_permission(
        p_group_id,
        p_intent_code,
        p_user_role,
        p_channel,
        p_scope
    );

    IF NOT v_permission.is_allowed THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Permission denied',
            'denial_reason', v_permission.denial_reason,
            'intent_code', p_intent_code,
            'user_role', p_user_role,
            'channel', p_channel
        );
    END IF;

    -- 2. Determine max_results (use provided or permission-based)
    v_max_results := COALESCE(p_limit, v_permission.max_results, 10);

    -- 3. Determine scope_id
    IF p_scope = 'group' THEN
        v_scope_id := p_group_id;
    ELSIF p_scope = 'tenant' THEN
        v_scope_id := NULL;
    ELSE
        v_scope_id := NULL;
    END IF;

    -- 4. Execute search (pass the cast vector)
    v_search_result := cached_discover_search(
        p_query_text,
        v_embedding,  -- Use the cast vector
        p_scope,
        COALESCE(v_scope_id, p_group_id),
        v_max_results,
        0.7,
        p_use_cache
    );

    -- 5. Add metadata to result
    RETURN v_search_result || jsonb_build_object(
        'intent_code', p_intent_code,
        'user_role', p_user_role,
        'channel', p_channel,
        'query', p_query_text,
        'max_results_allowed', v_max_results
    );
END;
$$;


ALTER FUNCTION "public"."unified_search"("p_group_id" "uuid", "p_query_text" "text", "p_query_embedding" "text", "p_intent_code" character varying, "p_user_role" character varying, "p_channel" character varying, "p_scope" character varying, "p_limit" integer, "p_use_cache" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unified_search"("p_group_id" "uuid", "p_query_text" "text", "p_query_embedding" "text", "p_intent_code" character varying, "p_user_role" character varying, "p_channel" character varying, "p_scope" character varying, "p_limit" integer, "p_use_cache" boolean) IS 'Unified search entry point. Validates intent permission, then executes cached search. Accepts TEXT embedding for API compatibility.';



CREATE OR REPLACE FUNCTION "public"."update_ai_session"("p_session_id" "uuid", "p_context" "jsonb" DEFAULT NULL::"jsonb", "p_language" character varying DEFAULT NULL::character varying, "p_add_message" "jsonb" DEFAULT NULL::"jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_timeout INTEGER;
    v_channel VARCHAR;
    v_history JSONB;
    v_new_expires TIMESTAMPTZ;
BEGIN
    -- Get session info
    SELECT
        s.channel,
        COALESCE((bg.settings->'ai_agent'->>'session_timeout_minutes')::INTEGER, 30),
        s.conversation_history
    INTO v_channel, v_timeout, v_history
    FROM public.t_ai_agent_sessions s
    LEFT JOIN public.t_business_groups bg ON s.group_id = bg.id
    WHERE s.id = p_session_id AND s.is_active = true;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Add new message to history if provided
    IF p_add_message IS NOT NULL THEN
        -- Add timestamp if not present
        IF NOT (p_add_message ? 'timestamp') THEN
            p_add_message := p_add_message || jsonb_build_object('timestamp', NOW());
        END IF;

        v_history := v_history || p_add_message;

        -- Trim to last 10 messages
        IF jsonb_array_length(v_history) > 10 THEN
            v_history := (
                SELECT jsonb_agg(elem)
                FROM (
                    SELECT elem
                    FROM jsonb_array_elements(v_history) WITH ORDINALITY AS t(elem, ord)
                    ORDER BY ord DESC
                    LIMIT 10
                ) sub
            );
        END IF;
    END IF;

    -- Calculate new expiry for web channel
    IF v_channel = 'whatsapp' THEN
        v_new_expires := NULL;
    ELSE
        v_new_expires := NOW() + (v_timeout || ' minutes')::INTERVAL;
    END IF;

    -- Update session
    UPDATE public.t_ai_agent_sessions
    SET
        last_activity_at = NOW(),
        expires_at = v_new_expires,
        context = CASE
            WHEN p_context IS NOT NULL THEN context || p_context
            ELSE context
        END,
        conversation_history = v_history,
        detected_language = COALESCE(p_language, detected_language),
        updated_at = NOW()
    WHERE id = p_session_id
      AND is_active = true;

    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."update_ai_session"("p_session_id" "uuid", "p_context" "jsonb", "p_language" character varying, "p_add_message" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_ai_session"("p_session_id" "uuid", "p_context" "jsonb", "p_language" character varying, "p_add_message" "jsonb") IS 'Updates session activity, context, and conversation history. Keeps last 10 messages.';



CREATE OR REPLACE FUNCTION "public"."update_cache_on_hit"("p_cache_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.t_query_cache
    SET
        hit_count = hit_count + 1,
        last_hit_at = NOW(),
        updated_at = NOW(),
        expires_at = NOW() + INTERVAL '45 days'  -- Sliding expiration
    WHERE id = p_cache_id;
END;
$$;


ALTER FUNCTION "public"."update_cache_on_hit"("p_cache_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_catalog_timestamp_and_user"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  
  -- Auto-populate original_item_id for first version
  IF NEW.version_number = 1 AND NEW.original_item_id IS NULL THEN
    NEW.original_item_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_catalog_timestamp_and_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_contact_transaction"("p_contact_id" "uuid", "p_contact_data" "jsonb", "p_contact_channels" "jsonb" DEFAULT NULL::"jsonb", "p_addresses" "jsonb" DEFAULT NULL::"jsonb", "p_contact_persons" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_existing_contact record;
  v_channel record;
  v_address record;
  v_person record;
  v_person_contact_id uuid;
  v_person_channel record;
  v_result jsonb;
  v_person_id uuid;
BEGIN
  -- Check if contact exists and is not archived
  SELECT * INTO v_existing_contact
  FROM t_contacts
  WHERE id = p_contact_id 
    AND is_live = COALESCE((p_contact_data->>'is_live')::boolean, true);

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Contact not found',
      'code', 'CONTACT_NOT_FOUND'
    );
  END IF;

  IF v_existing_contact.status = 'archived' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot update archived contact',
      'code', 'CONTACT_ARCHIVED'
    );
  END IF;

  -- Step 1: Update main contact
  UPDATE t_contacts 
  SET
    name = COALESCE((p_contact_data->>'name')::text, name),
    company_name = COALESCE((p_contact_data->>'company_name')::text, company_name),
    registration_number = COALESCE((p_contact_data->>'registration_number')::text, registration_number),
    salutation = COALESCE((p_contact_data->>'salutation')::text, salutation),
    designation = COALESCE((p_contact_data->>'designation')::text, designation),
    department = COALESCE((p_contact_data->>'department')::text, department),
    is_primary_contact = COALESCE((p_contact_data->>'is_primary_contact')::boolean, is_primary_contact),
    classifications = COALESCE(p_contact_data->'classifications', classifications),
    tags = COALESCE(p_contact_data->'tags', tags),
    compliance_numbers = COALESCE(p_contact_data->'compliance_numbers', compliance_numbers),
    notes = COALESCE((p_contact_data->>'notes')::text, notes),
    parent_contact_ids = COALESCE(p_contact_data->'parent_contact_ids', parent_contact_ids),
    updated_by = (p_contact_data->>'updated_by')::uuid,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_contact_id;

  -- Step 2: Update contact channels if provided (SAFE - full replacement only when explicitly provided)
  IF p_contact_channels IS NOT NULL THEN
    -- Delete existing channels only if new channels are provided
    DELETE FROM t_contact_channels WHERE contact_id = p_contact_id;
    
    -- Insert new channels
    IF jsonb_array_length(p_contact_channels) > 0 THEN
      FOR v_channel IN 
        SELECT * FROM jsonb_to_recordset(p_contact_channels) AS x(
          channel_type text,
          value text,
          country_code text,
          is_primary boolean,
          is_verified boolean,
          notes text
        )
      LOOP
        INSERT INTO t_contact_channels (
          contact_id,
          channel_type,
          value,
          country_code,
          is_primary,
          is_verified,
          notes
        )
        VALUES (
          p_contact_id,
          v_channel.channel_type,
          v_channel.value,
          v_channel.country_code,
          COALESCE(v_channel.is_primary, false),
          COALESCE(v_channel.is_verified, false),
          v_channel.notes
        );
      END LOOP;
    END IF;
  END IF;

  -- Step 3: SAFE ADDRESS HANDLING - Only add/update, never delete
  IF p_addresses IS NOT NULL THEN
    -- Process incoming addresses - CONSERVATIVE APPROACH
    FOR v_address IN 
      SELECT * FROM jsonb_to_recordset(p_addresses) AS x(
        id text,
        type text,
        address_type text,
        label text,
        address_line1 text,
        line1 text,
        address_line2 text,
        line2 text,
        city text,
        state_code text,
        state text,
        country_code text,
        country text,
        postal_code text,
        google_pin text,
        is_primary boolean,
        notes text
      )
    LOOP
      -- Check if this is a new address (temp ID, no ID, or non-existent UUID)
      IF v_address.id IS NULL 
         OR v_address.id LIKE 'temp_%' 
         OR NOT EXISTS(SELECT 1 FROM t_contact_addresses WHERE id = v_address.id::uuid) THEN
        -- Insert new address
        INSERT INTO t_contact_addresses (
          contact_id,
          type,
          label,
          address_line1,
          address_line2,
          city,
          state_code,
          country_code,
          postal_code,
          google_pin,
          is_primary,
          notes
        )
        VALUES (
          p_contact_id,
          COALESCE(v_address.type, v_address.address_type),
          v_address.label,
          COALESCE(v_address.address_line1, v_address.line1),
          COALESCE(v_address.address_line2, v_address.line2),
          v_address.city,
          COALESCE(v_address.state_code, v_address.state),
          COALESCE(v_address.country_code, v_address.country, 'IN'),
          v_address.postal_code,
          v_address.google_pin,
          COALESCE(v_address.is_primary, false),
          v_address.notes
        );
      ELSE
        -- Update existing address (only if it belongs to this contact)
        UPDATE t_contact_addresses 
        SET
          type = COALESCE(v_address.type, v_address.address_type),
          label = v_address.label,
          address_line1 = COALESCE(v_address.address_line1, v_address.line1),
          address_line2 = COALESCE(v_address.address_line2, v_address.line2),
          city = v_address.city,
          state_code = COALESCE(v_address.state_code, v_address.state),
          country_code = COALESCE(v_address.country_code, v_address.country, 'IN'),
          postal_code = v_address.postal_code,
          google_pin = v_address.google_pin,
          is_primary = COALESCE(v_address.is_primary, false),
          notes = v_address.notes,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = v_address.id::uuid 
          AND contact_id = p_contact_id; -- Security: only update addresses belonging to this contact
      END IF;
    END LOOP;
    
    -- NOTE: We deliberately DO NOT delete existing addresses
    -- If explicit deletion is needed, it should be handled separately
  END IF;

  -- Step 4: FIXED Safe contact persons handling
  IF p_contact_persons IS NOT NULL THEN
    -- Process each contact person - SIMPLIFIED APPROACH
    FOR v_person IN 
      SELECT * FROM jsonb_to_recordset(p_contact_persons) AS x(
        id text,
        name text,
        salutation text,
        designation text,
        department text,
        is_primary boolean,
        notes text,
        contact_channels jsonb
      )
    LOOP
      -- Check if this is a new person (temp ID, no ID, or non-existent UUID)
      IF v_person.id IS NULL 
         OR v_person.id LIKE 'temp_%' 
         OR NOT EXISTS(SELECT 1 FROM t_contacts WHERE id = v_person.id::uuid) THEN
        -- Insert new person
        INSERT INTO t_contacts (
          type,
          status,
          name,
          salutation,
          designation,
          department,
          is_primary_contact,
          parent_contact_ids,
          classifications,
          tags,
          compliance_numbers,
          notes,
          tenant_id,
          created_by,
          is_live
        )
        VALUES (
          'individual',
          'active',
          v_person.name,
          v_person.salutation,
          v_person.designation,
          v_person.department,
          COALESCE(v_person.is_primary, false),
          jsonb_build_array(p_contact_id),
          '["team_member"]'::jsonb,
          '[]'::jsonb,
          '[]'::jsonb,
          v_person.notes,
          v_existing_contact.tenant_id,
          (p_contact_data->>'updated_by')::uuid,
          COALESCE((p_contact_data->>'is_live')::boolean, true)
        )
        RETURNING id INTO v_person_id;
        
        -- Debug logging
        RAISE NOTICE 'Created new contact person with ID: %', v_person_id;
      ELSE
        -- Update existing person
        v_person_id := v_person.id::uuid;
        
        UPDATE t_contacts 
        SET
          name = v_person.name,
          salutation = v_person.salutation,
          designation = v_person.designation,
          department = v_person.department,
          is_primary_contact = COALESCE(v_person.is_primary, false),
          notes = v_person.notes,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = v_person_id
          AND parent_contact_ids @> jsonb_build_array(p_contact_id); -- Security check

        -- Clear existing contact channels for update
        DELETE FROM t_contact_channels WHERE contact_id = v_person_id;
        
        -- Debug logging
        RAISE NOTICE 'Updated existing contact person with ID: %', v_person_id;
      END IF;

      -- Insert contact channels for person (both new and updated)
      IF v_person.contact_channels IS NOT NULL AND jsonb_array_length(v_person.contact_channels) > 0 THEN
        FOR v_person_channel IN 
          SELECT * FROM jsonb_to_recordset(v_person.contact_channels) AS x(
            channel_type text,
            value text,
            country_code text,
            is_primary boolean,
            is_verified boolean,
            notes text
          )
        LOOP
          INSERT INTO t_contact_channels (
            contact_id,
            channel_type,
            value,
            country_code,
            is_primary,
            is_verified,
            notes
          )
          VALUES (
            v_person_id,
            v_person_channel.channel_type,
            v_person_channel.value,
            v_person_channel.country_code,
            COALESCE(v_person_channel.is_primary, false),
            COALESCE(v_person_channel.is_verified, false),
            v_person_channel.notes
          );
        END LOOP;
        
        -- Debug logging
        RAISE NOTICE 'Added % contact channels for person ID: %', jsonb_array_length(v_person.contact_channels), v_person_id;
      END IF;
    END LOOP;
  END IF;

  -- Return the updated contact
  SELECT jsonb_build_object(
    'success', true,
    'data', to_jsonb(c.*),
    'message', 'Contact updated successfully'
  ) INTO v_result
  FROM t_contacts c
  WHERE c.id = p_contact_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'UPDATE_CONTACT_ERROR'
    );
END;
$$;


ALTER FUNCTION "public"."update_contact_transaction"("p_contact_id" "uuid", "p_contact_data" "jsonb", "p_contact_channels" "jsonb", "p_addresses" "jsonb", "p_contact_persons" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_contact_transaction"("p_contact_id" "uuid", "p_contact_data" "jsonb", "p_contact_channels" "jsonb" DEFAULT NULL::"jsonb", "p_addresses" "jsonb" DEFAULT NULL::"jsonb", "p_contact_persons" "jsonb" DEFAULT NULL::"jsonb", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_existing_contact record;
  v_channel record;
  v_address record;
  v_person record;
  v_person_contact_id uuid;
  v_person_channel record;
  v_result jsonb;
  v_person_id uuid;
  v_actual_tenant_id uuid;
BEGIN
  -- Get the tenant_id from JWT if not provided
  v_actual_tenant_id := COALESCE(
    p_tenant_id, 
    (auth.jwt() ->> 'tenant_id')::uuid,
    (SELECT tenant_id FROM t_user_profiles WHERE user_id = auth.uid() LIMIT 1)
  );

  -- Check if contact exists, is not archived, and belongs to tenant
  SELECT * INTO v_existing_contact
  FROM t_contacts
  WHERE id = p_contact_id 
    AND is_live = COALESCE((p_contact_data->>'is_live')::boolean, true)
    AND tenant_id = v_actual_tenant_id;  -- TENANT CHECK

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Contact not found or access denied',
      'code', 'CONTACT_NOT_FOUND'
    );
  END IF;

  IF v_existing_contact.status = 'archived' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot update archived contact',
      'code', 'CONTACT_ARCHIVED'
    );
  END IF;

  -- Step 1: Update main contact (with tenant check in WHERE clause)
  UPDATE t_contacts 
  SET
    name = COALESCE((p_contact_data->>'name')::text, name),
    company_name = COALESCE((p_contact_data->>'company_name')::text, company_name),
    registration_number = COALESCE((p_contact_data->>'registration_number')::text, registration_number),
    salutation = COALESCE((p_contact_data->>'salutation')::text, salutation),
    designation = COALESCE((p_contact_data->>'designation')::text, designation),
    department = COALESCE((p_contact_data->>'department')::text, department),
    is_primary_contact = COALESCE((p_contact_data->>'is_primary_contact')::boolean, is_primary_contact),
    classifications = COALESCE(p_contact_data->'classifications', classifications),
    tags = COALESCE(p_contact_data->'tags', tags),
    compliance_numbers = COALESCE(p_contact_data->'compliance_numbers', compliance_numbers),
    notes = COALESCE((p_contact_data->>'notes')::text, notes),
    parent_contact_ids = COALESCE(p_contact_data->'parent_contact_ids', parent_contact_ids),
    updated_by = (p_contact_data->>'updated_by')::uuid,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_contact_id
    AND tenant_id = v_actual_tenant_id;  -- TENANT CHECK

  -- Step 2: Update contact channels if provided
  IF p_contact_channels IS NOT NULL THEN
    -- Delete existing channels only if new channels are provided
    DELETE FROM t_contact_channels WHERE contact_id = p_contact_id;
    
    -- Insert new channels
    IF jsonb_array_length(p_contact_channels) > 0 THEN
      FOR v_channel IN 
        SELECT * FROM jsonb_to_recordset(p_contact_channels) AS x(
          channel_type text,
          value text,
          country_code text,
          is_primary boolean,
          is_verified boolean,
          notes text
        )
      LOOP
        INSERT INTO t_contact_channels (
          contact_id,
          channel_type,
          value,
          country_code,
          is_primary,
          is_verified,
          notes
        )
        VALUES (
          p_contact_id,
          v_channel.channel_type,
          v_channel.value,
          v_channel.country_code,
          COALESCE(v_channel.is_primary, false),
          COALESCE(v_channel.is_verified, false),
          v_channel.notes
        );
      END LOOP;
    END IF;
  END IF;

  -- Step 3: Handle addresses (only add/update, never delete)
  IF p_addresses IS NOT NULL THEN
    FOR v_address IN 
      SELECT * FROM jsonb_to_recordset(p_addresses) AS x(
        id text,
        type text,
        address_type text,
        label text,
        address_line1 text,
        line1 text,
        address_line2 text,
        line2 text,
        city text,
        state_code text,
        state text,
        country_code text,
        country text,
        postal_code text,
        google_pin text,
        is_primary boolean,
        notes text
      )
    LOOP
      -- Check if this is a new address
      IF v_address.id IS NULL 
         OR v_address.id LIKE 'temp_%' 
         OR NOT EXISTS(SELECT 1 FROM t_contact_addresses WHERE id = v_address.id::uuid) THEN
        -- Insert new address
        INSERT INTO t_contact_addresses (
          contact_id,
          type,
          label,
          address_line1,
          address_line2,
          city,
          state_code,
          country_code,
          postal_code,
          google_pin,
          is_primary,
          notes
        )
        VALUES (
          p_contact_id,
          COALESCE(v_address.type, v_address.address_type),
          v_address.label,
          COALESCE(v_address.address_line1, v_address.line1),
          COALESCE(v_address.address_line2, v_address.line2),
          v_address.city,
          COALESCE(v_address.state_code, v_address.state),
          COALESCE(v_address.country_code, v_address.country, 'IN'),
          v_address.postal_code,
          v_address.google_pin,
          COALESCE(v_address.is_primary, false),
          v_address.notes
        );
      ELSE
        -- Update existing address (only if it belongs to this contact)
        UPDATE t_contact_addresses 
        SET
          type = COALESCE(v_address.type, v_address.address_type),
          label = v_address.label,
          address_line1 = COALESCE(v_address.address_line1, v_address.line1),
          address_line2 = COALESCE(v_address.address_line2, v_address.line2),
          city = v_address.city,
          state_code = COALESCE(v_address.state_code, v_address.state),
          country_code = COALESCE(v_address.country_code, v_address.country, 'IN'),
          postal_code = v_address.postal_code,
          google_pin = v_address.google_pin,
          is_primary = COALESCE(v_address.is_primary, false),
          notes = v_address.notes,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = v_address.id::uuid 
          AND contact_id = p_contact_id;
      END IF;
    END LOOP;
  END IF;

  -- Step 4: Handle contact persons
  IF p_contact_persons IS NOT NULL THEN
    FOR v_person IN 
      SELECT * FROM jsonb_to_recordset(p_contact_persons) AS x(
        id text,
        name text,
        salutation text,
        designation text,
        department text,
        is_primary boolean,
        notes text,
        contact_channels jsonb
      )
    LOOP
      -- Check if this is a new person
      IF v_person.id IS NULL 
         OR v_person.id LIKE 'temp_%' 
         OR NOT EXISTS(
           SELECT 1 FROM t_contacts 
           WHERE id = v_person.id::uuid 
             AND tenant_id = v_actual_tenant_id  -- TENANT CHECK
         ) THEN
        -- Insert new person
        INSERT INTO t_contacts (
          type,
          status,
          name,
          salutation,
          designation,
          department,
          is_primary_contact,
          parent_contact_ids,
          classifications,
          tags,
          compliance_numbers,
          notes,
          tenant_id,
          created_by,
          is_live
        )
        VALUES (
          'individual',
          'active',
          v_person.name,
          v_person.salutation,
          v_person.designation,
          v_person.department,
          COALESCE(v_person.is_primary, false),
          jsonb_build_array(p_contact_id),
          '["team_member"]'::jsonb,
          '[]'::jsonb,
          '[]'::jsonb,
          v_person.notes,
          v_existing_contact.tenant_id,
          (p_contact_data->>'updated_by')::uuid,
          COALESCE((p_contact_data->>'is_live')::boolean, true)
        )
        RETURNING id INTO v_person_id;
      ELSE
        -- Update existing person
        v_person_id := v_person.id::uuid;
        
        UPDATE t_contacts 
        SET
          name = v_person.name,
          salutation = v_person.salutation,
          designation = v_person.designation,
          department = v_person.department,
          is_primary_contact = COALESCE(v_person.is_primary, false),
          notes = v_person.notes,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = v_person_id
          AND parent_contact_ids @> jsonb_build_array(p_contact_id)
          AND tenant_id = v_actual_tenant_id;  -- TENANT CHECK

        -- Clear existing contact channels for update
        DELETE FROM t_contact_channels WHERE contact_id = v_person_id;
      END IF;

      -- Insert contact channels for person
      IF v_person.contact_channels IS NOT NULL AND jsonb_array_length(v_person.contact_channels) > 0 THEN
        FOR v_person_channel IN 
          SELECT * FROM jsonb_to_recordset(v_person.contact_channels) AS x(
            channel_type text,
            value text,
            country_code text,
            is_primary boolean,
            is_verified boolean,
            notes text
          )
        LOOP
          INSERT INTO t_contact_channels (
            contact_id,
            channel_type,
            value,
            country_code,
            is_primary,
            is_verified,
            notes
          )
          VALUES (
            v_person_id,
            v_person_channel.channel_type,
            v_person_channel.value,
            v_person_channel.country_code,
            COALESCE(v_person_channel.is_primary, false),
            COALESCE(v_person_channel.is_verified, false),
            v_person_channel.notes
          );
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  -- Return the updated contact
  SELECT jsonb_build_object(
    'success', true,
    'data', to_jsonb(c.*),
    'message', 'Contact updated successfully'
  ) INTO v_result
  FROM t_contacts c
  WHERE c.id = p_contact_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'UPDATE_CONTACT_ERROR'
    );
END;
$$;


ALTER FUNCTION "public"."update_contact_transaction"("p_contact_id" "uuid", "p_contact_data" "jsonb", "p_contact_channels" "jsonb", "p_addresses" "jsonb", "p_contact_persons" "jsonb", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_duplicate_flags"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Reset all flags
    UPDATE t_contacts SET potential_duplicate = false, duplicate_reasons = '{}';
    
    -- Find mobile duplicates
    WITH mobile_duplicates AS (
        SELECT ch1.contact_id as contact1, ch2.contact_id as contact2
        FROM t_contact_channels ch1
        JOIN t_contact_channels ch2 ON ch1.value = ch2.value 
            AND ch1.channel_type = ch2.channel_type 
            AND ch1.channel_type = 'mobile'
            AND ch1.contact_id < ch2.contact_id
        JOIN t_contacts c1 ON ch1.contact_id = c1.id
        JOIN t_contacts c2 ON ch2.contact_id = c2.id
        WHERE c1.tenant_id = c2.tenant_id
    )
    UPDATE t_contacts 
    SET potential_duplicate = true,
        duplicate_reasons = array_append(duplicate_reasons, 'mobile_match')
    WHERE id IN (
        SELECT unnest(ARRAY[contact1, contact2]) FROM mobile_duplicates
    );
    
    -- Find email duplicates
    WITH email_duplicates AS (
        SELECT ch1.contact_id as contact1, ch2.contact_id as contact2
        FROM t_contact_channels ch1
        JOIN t_contact_channels ch2 ON ch1.value = ch2.value 
            AND ch1.channel_type = ch2.channel_type 
            AND ch1.channel_type = 'email'
            AND ch1.contact_id < ch2.contact_id
        JOIN t_contacts c1 ON ch1.contact_id = c1.id
        JOIN t_contacts c2 ON ch2.contact_id = c2.id
        WHERE c1.tenant_id = c2.tenant_id
    )
    UPDATE t_contacts 
    SET potential_duplicate = true,
        duplicate_reasons = array_append(duplicate_reasons, 'email_match')
    WHERE id IN (
        SELECT unnest(ARRAY[contact1, contact2]) FROM email_duplicates
    );
END;
$$;


ALTER FUNCTION "public"."update_duplicate_flags"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_group_member_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE t_business_groups 
    SET member_count = member_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active' THEN
    UPDATE t_business_groups 
    SET member_count = member_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active' THEN
    UPDATE t_business_groups 
    SET member_count = member_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE t_business_groups 
    SET member_count = member_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.group_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_group_member_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_m_products_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_m_products_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_master_catalog_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_master_catalog_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_sequence_counters_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_sequence_counters_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_service_catalog_item"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_update_data" "jsonb", "p_idempotency_key" character varying DEFAULT NULL::character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    v_existing_service record;
    v_result jsonb;
    v_resource record;
    v_lock_acquired boolean := false;
    v_existing_operation_id uuid;
    v_pricing_type_exists boolean;
    v_service_status_exists boolean;
  BEGIN
    -- 1. IDEMPOTENCY CHECK
    IF p_idempotency_key IS NOT NULL THEN
      SELECT service_id INTO v_existing_operation_id
      FROM t_idempotency_keys
      WHERE idempotency_key = p_idempotency_key
        AND tenant_id = p_tenant_id
        AND operation_type = 'update_service'
        AND created_at > NOW() - INTERVAL '24 hours';

      IF FOUND THEN
        -- Return existing service
        RETURN get_service_catalog_item(v_existing_operation_id, p_tenant_id, p_is_live);
      END IF;
    END IF;

    -- 2. VALIDATE INPUT PARAMETERS
    IF p_service_id IS NULL OR p_tenant_id IS NULL OR p_user_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'service_id, tenant_id, and user_id are required',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    -- 3. TRANSACTION START WITH ROW-LEVEL LOCKING
    -- Lock the service record for update to prevent race conditions
    SELECT * INTO v_existing_service
    FROM t_catalog_items
    WHERE id = p_service_id
      AND tenant_id = p_tenant_id
      AND is_live = p_is_live
    FOR UPDATE NOWAIT; -- Fail immediately if locked by another transaction

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service not found or access denied',
        'code', 'RECORD_NOT_FOUND'
      );
    END IF;

    v_lock_acquired := true;

    -- 4. VALIDATE MASTER DATA REFERENCES (if being updated)
    -- Check pricing_type_id exists in product master data
    IF p_update_data->'price_attributes'->>'pricing_type_id' IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM m_category_details cd
        JOIN m_category_master cm ON cd.category_id = cm.id
        WHERE cd.id = (p_update_data->'price_attributes'->>'pricing_type_id')::uuid
          AND cm.category_name = 'pricing_types'
          AND cd.is_active = true
      ) INTO v_pricing_type_exists;

      IF NOT v_pricing_type_exists THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Invalid pricing_type_id',
          'code', 'INVALID_REFERENCE'
        );
      END IF;
    END IF;

    -- Check service_status_id exists in product master data
    IF p_update_data->'service_attributes'->>'service_status_id' IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM m_category_details cd
        JOIN m_category_master cm ON cd.category_id = cm.id
        WHERE cd.id = (p_update_data->'service_attributes'->>'service_status_id')::uuid
          AND cm.category_name = 'service_statuses'
          AND cd.is_active = true
      ) INTO v_service_status_exists;

      IF NOT v_service_status_exists THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Invalid service_status_id',
          'code', 'INVALID_REFERENCE'
        );
      END IF;
    END IF;

    -- 5. CHECK FOR DUPLICATE NAME (if name is being updated)
    IF p_update_data->>'name' IS NOT NULL
       AND LOWER(trim(p_update_data->>'name')) != LOWER(v_existing_service.name) THEN
      IF EXISTS(
        SELECT 1 FROM t_catalog_items
        WHERE tenant_id = p_tenant_id
          AND is_live = p_is_live
          AND id != p_service_id
          AND LOWER(name) = LOWER(trim(p_update_data->>'name'))
          AND status != 'archived'
      ) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Service with this name already exists',
          'code', 'DUPLICATE_NAME'
        );
      END IF;
    END IF;

    -- 6. CONSERVATIVE UPDATE - ONLY UPDATE PROVIDED FIELDS
    UPDATE t_catalog_items SET
      name = CASE
        WHEN p_update_data->>'name' IS NOT NULL
        THEN trim(p_update_data->>'name')
        ELSE name
      END,
      short_description = COALESCE(p_update_data->>'short_description', short_description),
      description_content = COALESCE(p_update_data->>'description_content', description_content),
      description_format = COALESCE(p_update_data->>'description_format', description_format),
      type = COALESCE(p_update_data->>'type', type),
      industry_id = COALESCE(p_update_data->>'industry_id', industry_id),
      category_id = COALESCE(p_update_data->>'category_id', category_id),
      status = COALESCE(p_update_data->>'status', status),
      -- SAFE JSONB MERGING - preserve existing data, merge new data
      price_attributes = CASE
        WHEN p_update_data->'price_attributes' IS NOT NULL
        THEN price_attributes || p_update_data->'price_attributes'
        ELSE price_attributes
      END,
      tax_config = CASE
        WHEN p_update_data->'tax_config' IS NOT NULL
        THEN tax_config || p_update_data->'tax_config'
        ELSE tax_config
      END,
      service_attributes = CASE
        WHEN p_update_data->'service_attributes' IS NOT NULL
        THEN service_attributes || p_update_data->'service_attributes'
        ELSE service_attributes
      END,
      resource_requirements = CASE
        WHEN p_update_data->'resource_requirements' IS NOT NULL
        THEN resource_requirements || p_update_data->'resource_requirements'
        ELSE resource_requirements
      END,
      specifications = CASE
        WHEN p_update_data->'specifications' IS NOT NULL
        THEN specifications || p_update_data->'specifications'
        ELSE specifications
      END,
      terms_content = COALESCE(p_update_data->>'terms_content', terms_content),
      terms_format = COALESCE(p_update_data->>'terms_format', terms_format),
      variant_attributes = CASE
        WHEN p_update_data->'variant_attributes' IS NOT NULL
        THEN variant_attributes || p_update_data->'variant_attributes'
        ELSE variant_attributes
      END,
      metadata = CASE
        WHEN p_update_data->'metadata' IS NOT NULL
        THEN metadata || p_update_data->'metadata'
        ELSE metadata
      END,
      updated_by = p_user_id,
      updated_at = NOW()
    WHERE id = p_service_id
      AND tenant_id = p_tenant_id
      AND is_live = p_is_live;

    -- 7. SAFE RESOURCE UPDATES - CONSERVATIVE APPROACH
    -- Only process resources if explicitly provided in update
    IF p_update_data->'resources' IS NOT NULL THEN
      FOR v_resource IN
        SELECT * FROM jsonb_to_recordset(p_update_data->'resources') AS x(
          id uuid,
          resource_type_id varchar(50),
          allocation_type_id uuid,
          quantity_required integer,
          duration_hours decimal(5,2),
          unit_cost decimal(15,4),
          currency_code varchar(3),
          required_skills jsonb,
          required_attributes jsonb,
          sequence_order integer,
          is_billable boolean,
          action varchar(10) -- 'add', 'update', 'remove'
        )
      LOOP
        -- SMART RECORD DETECTION AND SAFE OPERATIONS
        IF v_resource.action = 'remove' AND v_resource.id IS NOT NULL THEN
          -- Only remove explicitly marked resources with ownership check
          UPDATE t_catalog_service_resources
          SET is_active = false, updated_at = NOW()
          WHERE service_id = p_service_id
            AND id = v_resource.id
            AND tenant_id = p_tenant_id; -- Security: only remove owned records

        ELSIF v_resource.id IS NULL OR v_resource.id::text LIKE 'temp_%' OR v_resource.action = 'add' THEN
          -- This is a new resource association
          -- Validate resource_type_id exists
          IF NOT EXISTS(SELECT 1 FROM m_catalog_resource_types WHERE id = v_resource.resource_type_id AND is_active = true) THEN
            RETURN jsonb_build_object(
              'success', false,
              'error', 'Invalid resource_type_id: ' || v_resource.resource_type_id,
              'code', 'INVALID_RESOURCE_TYPE'
            );
          END IF;

          INSERT INTO t_catalog_service_resources (
            service_id, resource_type_id, tenant_id, allocation_type_id,
            quantity_required, duration_hours, unit_cost, currency_code,
            required_skills, required_attributes, sequence_order, is_billable
          ) VALUES (
            p_service_id, v_resource.resource_type_id, p_tenant_id,
            v_resource.allocation_type_id, COALESCE(v_resource.quantity_required, 1),
            v_resource.duration_hours, v_resource.unit_cost,
            COALESCE(v_resource.currency_code, 'INR'),
            COALESCE(v_resource.required_skills, '[]'::jsonb),
            COALESCE(v_resource.required_attributes, '{}'::jsonb),
            COALESCE(v_resource.sequence_order, 0),
            COALESCE(v_resource.is_billable, true)
          );

        ELSIF v_resource.action = 'update' AND v_resource.id IS NOT NULL THEN
          -- Update existing resource association with security check
          UPDATE t_catalog_service_resources SET
            allocation_type_id = COALESCE(v_resource.allocation_type_id, allocation_type_id),
            quantity_required = COALESCE(v_resource.quantity_required, quantity_required),
            duration_hours = COALESCE(v_resource.duration_hours, duration_hours),
            unit_cost = COALESCE(v_resource.unit_cost, unit_cost),
            currency_code = COALESCE(v_resource.currency_code, currency_code),
            required_skills = CASE
              WHEN v_resource.required_skills IS NOT NULL
              THEN v_resource.required_skills
              ELSE required_skills
            END,
            required_attributes = CASE
              WHEN v_resource.required_attributes IS NOT NULL
              THEN v_resource.required_attributes
              ELSE required_attributes
            END,
            sequence_order = COALESCE(v_resource.sequence_order, sequence_order),
            is_billable = COALESCE(v_resource.is_billable, is_billable),
            updated_at = NOW()
          WHERE id = v_resource.id
            AND service_id = p_service_id
            AND tenant_id = p_tenant_id; -- Security: only update owned records
        END IF;
      END LOOP;
    END IF;
    -- NOTE: We deliberately do NOT delete existing resources not mentioned

    -- 8. STORE IDEMPOTENCY KEY
    IF p_idempotency_key IS NOT NULL THEN
      INSERT INTO t_idempotency_keys (
        idempotency_key,
        tenant_id,
        operation_type,
        service_id,
        created_at
      ) VALUES (
        p_idempotency_key,
        p_tenant_id,
        'update_service',
        p_service_id,
        NOW()
      );
    END IF;

    -- 9. RETURN UPDATED RECORD
    RETURN get_service_catalog_item(p_service_id, p_tenant_id, p_is_live);

  EXCEPTION
    WHEN lock_not_available THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service is being updated by another user. Please try again.',
        'code', 'CONCURRENT_UPDATE'
      );
    WHEN OTHERS THEN
      -- PROPER ERROR HANDLING WITH ROLLBACK
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'OPERATION_ERROR'
      );
  END;
  $$;


ALTER FUNCTION "public"."update_service_catalog_item"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_update_data" "jsonb", "p_idempotency_key" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_service_pricing"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_pricing_data" "jsonb", "p_idempotency_key" character varying DEFAULT NULL::character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    v_existing_service record;
    v_existing_operation_id uuid;
    v_pricing_entry jsonb;
    v_result jsonb;
    v_updated_pricing jsonb;
    v_pricing_errors jsonb := '[]'::jsonb;
    v_success_count integer := 0;
    v_error_count integer := 0;
    v_current_pricing jsonb;
  BEGIN
    -- 1. IDEMPOTENCY CHECK
    IF p_idempotency_key IS NOT NULL THEN
      SELECT service_id INTO v_existing_operation_id
      FROM t_idempotency_keys
      WHERE idempotency_key = p_idempotency_key
        AND tenant_id = p_tenant_id
        AND operation_type = 'update_service_pricing'
        AND created_at > NOW() - INTERVAL '24 hours';

      IF FOUND THEN
        -- Return existing pricing for this service
        RETURN get_service_pricing(v_existing_operation_id, p_tenant_id, p_is_live, NULL);
      END IF;
    END IF;

    -- 2. VALIDATE INPUT PARAMETERS
    IF p_service_id IS NULL OR p_tenant_id IS NULL OR p_user_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'service_id, tenant_id, and user_id are required',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    IF p_pricing_data IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'pricing_data is required',
        'code', 'VALIDATION_ERROR'
      );
    END IF;

    -- 3. TRANSACTION START WITH ROW-LEVEL LOCKING
    -- Lock the service record to prevent concurrent modifications
    SELECT * INTO v_existing_service
    FROM t_catalog_items
    WHERE id = p_service_id
      AND tenant_id = p_tenant_id
      AND is_live = p_is_live
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service not found or access denied',
        'code', 'RECORD_NOT_FOUND'
      );
    END IF;

    -- 4. VALIDATE SERVICE STATUS
    IF v_existing_service.status = 'archived' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Cannot update pricing for archived service',
        'code', 'SERVICE_ARCHIVED'
      );
    END IF;

    -- 5. GET CURRENT PRICING TO PRESERVE EXISTING DATA
    v_current_pricing := COALESCE(v_existing_service.price_attributes, '{}'::jsonb);

    -- 6. PROCESS PRICING UPDATES
    IF p_pricing_data ? 'base_pricing' THEN
      -- Update base pricing information
      BEGIN
        -- Validate pricing_type_id if provided
        IF p_pricing_data->'base_pricing'->>'pricing_type_id' IS NOT NULL THEN
          IF NOT EXISTS(
            SELECT 1 FROM m_category_details cd
            JOIN m_category_master cm ON cd.category_id = cm.id
            WHERE cd.id = (p_pricing_data->'base_pricing'->>'pricing_type_id')::uuid
              AND cm.category_name = 'pricing_types'
              AND cd.is_active = true
          ) THEN
            v_error_count := v_error_count + 1;
            v_pricing_errors := v_pricing_errors || jsonb_build_object(
              'field', 'pricing_type_id',
              'error', 'Invalid pricing_type_id'
            );
          ELSE
            v_current_pricing := v_current_pricing || p_pricing_data->'base_pricing';
            v_success_count := v_success_count + 1;
          END IF;
        ELSE
          v_current_pricing := v_current_pricing || p_pricing_data->'base_pricing';
          v_success_count := v_success_count + 1;
        END IF;

      EXCEPTION
        WHEN OTHERS THEN
          v_error_count := v_error_count + 1;
          v_pricing_errors := v_pricing_errors || jsonb_build_object(
            'field', 'base_pricing',
            'error', SQLERRM
          );
      END;
    END IF;

    -- 7. PROCESS MULTI-CURRENCY PRICING
    IF p_pricing_data ? 'currency_pricing' AND jsonb_typeof(p_pricing_data->'currency_pricing') = 'array' THEN
      DECLARE
        v_currency_pricing jsonb := COALESCE(v_current_pricing->'currency_pricing', '[]'::jsonb);
        v_currency_entry jsonb;
        v_currency_code text;
        v_found_index integer;
      BEGIN
        FOR v_currency_entry IN SELECT * FROM jsonb_array_elements(p_pricing_data->'currency_pricing')
        LOOP
          v_currency_code := v_currency_entry->>'currency_code';

          -- Validate currency code
          IF v_currency_code IS NULL THEN
            v_error_count := v_error_count + 1;
            v_pricing_errors := v_pricing_errors || jsonb_build_object(
              'field', 'currency_pricing',
              'error', 'Currency code is required for each pricing entry'
            );
            CONTINUE;
          END IF;

          -- Validate price is positive
          IF (v_currency_entry->>'price')::numeric <= 0 THEN
            v_error_count := v_error_count + 1;
            v_pricing_errors := v_pricing_errors || jsonb_build_object(
              'field', 'currency_pricing',
              'currency', v_currency_code,
              'error', 'Price must be greater than zero'
            );
            CONTINUE;
          END IF;

          -- Find existing currency pricing and update or add
          v_found_index := -1;
          FOR i IN 0..jsonb_array_length(v_currency_pricing) - 1
          LOOP
            IF (v_currency_pricing->i->>'currency_code') = v_currency_code THEN
              v_found_index := i;
              EXIT;
            END IF;
          END LOOP;

          IF v_found_index >= 0 THEN
            -- Update existing currency pricing
            v_currency_pricing := jsonb_set(
              v_currency_pricing,
              ARRAY[v_found_index::text],
              v_currency_entry || jsonb_build_object('updated_at', NOW())
            );
          ELSE
            -- Add new currency pricing
            v_currency_pricing := v_currency_pricing || jsonb_build_array(
              v_currency_entry || jsonb_build_object('created_at', NOW(), 'updated_at', NOW())
            );
          END IF;

          v_success_count := v_success_count + 1;
        END LOOP;

        v_current_pricing := v_current_pricing || jsonb_build_object('currency_pricing', v_currency_pricing);

      EXCEPTION
        WHEN OTHERS THEN
          v_error_count := v_error_count + 1;
          v_pricing_errors := v_pricing_errors || jsonb_build_object(
            'field', 'currency_pricing',
            'error', SQLERRM
          );
      END;
    END IF;

    -- 8. PROCESS TIERED PRICING
    IF p_pricing_data ? 'tiered_pricing' AND jsonb_typeof(p_pricing_data->'tiered_pricing') = 'array' THEN
      BEGIN
        -- Validate tiered pricing structure
        DECLARE
          v_tier_entry jsonb;
          v_min_qty integer;
          v_max_qty integer;
        BEGIN
          FOR v_tier_entry IN SELECT * FROM jsonb_array_elements(p_pricing_data->'tiered_pricing')
          LOOP
            v_min_qty := (v_tier_entry->>'min_quantity')::integer;
            v_max_qty := (v_tier_entry->>'max_quantity')::integer;

            -- Validate tier structure
            IF v_min_qty IS NULL OR v_min_qty <= 0 THEN
              v_error_count := v_error_count + 1;
              v_pricing_errors := v_pricing_errors || jsonb_build_object(
                'field', 'tiered_pricing',
                'error', 'min_quantity must be positive integer'
              );
              CONTINUE;
            END IF;

            IF v_max_qty IS NOT NULL AND v_max_qty <= v_min_qty THEN
              v_error_count := v_error_count + 1;
              v_pricing_errors := v_pricing_errors || jsonb_build_object(
                'field', 'tiered_pricing',
                'error', 'max_quantity must be greater than min_quantity'
              );
              CONTINUE;
            END IF;

            IF (v_tier_entry->>'price')::numeric <= 0 THEN
              v_error_count := v_error_count + 1;
              v_pricing_errors := v_pricing_errors || jsonb_build_object(
                'field', 'tiered_pricing',
                'tier', v_min_qty || '-' || COALESCE(v_max_qty::text, '∞'),
                'error', 'Price must be greater than zero'
              );
              CONTINUE;
            END IF;
          END LOOP;
        END;

        -- If no errors, update tiered pricing
        IF jsonb_array_length(v_pricing_errors) = v_error_count THEN
          v_current_pricing := v_current_pricing || jsonb_build_object(
            'tiered_pricing', p_pricing_data->'tiered_pricing'
          );
          v_success_count := v_success_count + 1;
        END IF;

      EXCEPTION
        WHEN OTHERS THEN
          v_error_count := v_error_count + 1;
          v_pricing_errors := v_pricing_errors || jsonb_build_object(
            'field', 'tiered_pricing',
            'error', SQLERRM
          );
      END;
    END IF;

    -- 9. UPDATE SERVICE WITH NEW PRICING DATA
    IF v_success_count > 0 THEN
      UPDATE t_catalog_items SET
        price_attributes = v_current_pricing || jsonb_build_object(
          'pricing_updated_at', NOW(),
          'pricing_updated_by', p_user_id
        ),
        updated_by = p_user_id,
        updated_at = NOW()
      WHERE id = p_service_id
        AND tenant_id = p_tenant_id
        AND is_live = p_is_live;
    END IF;

    -- 10. STORE IDEMPOTENCY KEY
    IF p_idempotency_key IS NOT NULL AND v_success_count > 0 THEN
      INSERT INTO t_idempotency_keys (
        idempotency_key,
        tenant_id,
        operation_type,
        service_id,
        created_at
      ) VALUES (
        p_idempotency_key,
        p_tenant_id,
        'update_service_pricing',
        p_service_id,
        NOW()
      );
    END IF;

    -- 11. PREPARE RESULT
    SELECT jsonb_build_object(
      'service_id', p_service_id,
      'pricing_data', v_current_pricing,
      'update_summary', jsonb_build_object(
        'successful_updates', v_success_count,
        'failed_updates', v_error_count,
        'errors', v_pricing_errors
      ),
      'currency_count', CASE
        WHEN v_current_pricing ? 'currency_pricing'
        THEN jsonb_array_length(v_current_pricing->'currency_pricing')
        ELSE 0
      END,
      'has_tiered_pricing', v_current_pricing ? 'tiered_pricing',
      'updated_at', NOW()
    ) INTO v_result;

    -- 12. SUCCESS RESPONSE
    RETURN jsonb_build_object(
      'success', v_error_count = 0,
      'partial_success', v_success_count > 0 AND v_error_count > 0,
      'data', v_result,
      'message', CASE
        WHEN v_error_count = 0 THEN 'Service pricing updated successfully'
        WHEN v_success_count = 0 THEN 'Service pricing update failed'
        ELSE 'Service pricing partially updated with some errors'
      END
    );

  EXCEPTION
    WHEN lock_not_available THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service is being updated by another user. Please try again.',
        'code', 'CONCURRENT_UPDATE'
      );
    WHEN OTHERS THEN
      -- PROPER ERROR HANDLING WITH ROLLBACK
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'OPERATION_ERROR'
      );
  END;
  $$;


ALTER FUNCTION "public"."update_service_pricing"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_pricing_data" "jsonb", "p_idempotency_key" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_smartprofile_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_smartprofile_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_tenant_smartprofile"("p_tenant_id" "uuid", "p_profile_type" "text" DEFAULT 'seller'::"text", "p_short_description" "text" DEFAULT NULL::"text", "p_embedding" "text" DEFAULT NULL::"text", "p_clusters" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."upsert_tenant_smartprofile"("p_tenant_id" "uuid", "p_profile_type" "text", "p_short_description" "text", "p_embedding" "text", "p_clusters" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."upsert_tenant_smartprofile"("p_tenant_id" "uuid", "p_profile_type" "text", "p_short_description" "text", "p_embedding" "text", "p_clusters" "jsonb") IS 'Upserts tenant smartprofile with embedding and replaces semantic clusters. Called by n8n smartprofile-generate endpoint.';



CREATE OR REPLACE FUNCTION "public"."user_can_access_environment"("p_tenant_id" "uuid", "p_is_live" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Super admins can access all environments
  IF EXISTS (SELECT 1 FROM t_user_profiles WHERE user_id = auth.uid() AND is_admin = true) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has access to this tenant and environment
  RETURN EXISTS (
    SELECT 1 FROM t_user_tenants ut 
    WHERE ut.user_id = auth.uid() 
    AND ut.tenant_id = p_tenant_id 
    AND ut.status = 'active'
    AND (
      p_is_live = TRUE OR  -- Everyone can access live data
      ut.can_access_test_data = TRUE  -- Only specific users can access test data
    )
  );
END;
$$;


ALTER FUNCTION "public"."user_can_access_environment"("p_tenant_id" "uuid", "p_is_live" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_can_access_environment"("p_tenant_id" "uuid", "p_is_live" boolean) IS 'Helper function to check if user has access to specific tenant environment (Live/Test).';



CREATE OR REPLACE FUNCTION "public"."validate_category_environment_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.industry_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM t_catalog_industries 
    WHERE id = NEW.industry_id 
    AND tenant_id = NEW.tenant_id 
    AND is_live = NEW.is_live
  ) THEN
    RAISE EXCEPTION 'Category industry must belong to same tenant and environment';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_category_environment_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_item_environment_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check if category belongs to same tenant and environment
  IF NEW.category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM t_catalog_categories cat 
      WHERE cat.id = NEW.category_id 
      AND cat.tenant_id = NEW.tenant_id 
      AND cat.is_live = NEW.is_live
    ) THEN
      RAISE EXCEPTION 'Item category must belong to same tenant and environment (tenant_id: %, is_live: %)', 
        NEW.tenant_id, NEW.is_live;
    END IF;
  END IF;
  
  -- Check if industry belongs to same tenant and environment
  IF NEW.industry_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM t_catalog_industries ind 
      WHERE ind.id = NEW.industry_id 
      AND ind.tenant_id = NEW.tenant_id 
      AND ind.is_live = NEW.is_live
    ) THEN
      RAISE EXCEPTION 'Item industry must belong to same tenant and environment (tenant_id: %, is_live: %)', 
        NEW.tenant_id, NEW.is_live;
    END IF;
  END IF;
  
  -- Check if parent item belongs to same tenant and environment
  IF NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM t_catalog_items parent 
      WHERE parent.id = NEW.parent_id 
      AND parent.tenant_id = NEW.tenant_id 
      AND parent.is_live = NEW.is_live
    ) THEN
      RAISE EXCEPTION 'Item parent must belong to same tenant and environment (tenant_id: %, is_live: %)', 
        NEW.tenant_id, NEW.is_live;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_item_environment_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_pricing_template_config"("p_rule_type" character varying, "p_condition_config" "jsonb", "p_action_config" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Validate based on rule type
  CASE p_rule_type
    WHEN 'time_based' THEN
      -- Must have time conditions
      IF NOT (p_condition_config ? 'time_ranges' OR p_condition_config ? 'days_of_week') THEN
        RETURN FALSE;
      END IF;
      
    WHEN 'quantity_based' THEN  
      -- Must have quantity thresholds
      IF NOT (p_condition_config ? 'min_quantity' OR p_condition_config ? 'quantity_tiers') THEN
        RETURN FALSE;
      END IF;
      
    WHEN 'customer_based' THEN
      -- Must have customer criteria
      IF NOT (p_condition_config ? 'customer_type' OR p_condition_config ? 'membership_level') THEN
        RETURN FALSE;
      END IF;
  END CASE;
  
  -- Validate action config has required fields
  IF NOT (p_action_config ? 'action_type' AND p_action_config ? 'value') THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."validate_pricing_template_config"("p_rule_type" character varying, "p_condition_config" "jsonb", "p_action_config" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_tax_rate_business_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Ensure rate is within valid range
  IF NEW.rate < 0 OR NEW.rate > 100 THEN
    RAISE EXCEPTION 'Tax rate must be between 0 and 100 percent';
  END IF;
  
  -- Ensure sequence number is positive
  IF NEW.sequence_no <= 0 THEN
    RAISE EXCEPTION 'Sequence number must be positive';
  END IF;
  
  -- Ensure name is not empty
  IF TRIM(NEW.name) = '' THEN
    RAISE EXCEPTION 'Tax rate name cannot be empty';
  END IF;
  
  -- If this is the first rate for the tenant, make it default
  IF NEW.is_active = true THEN
    DECLARE
      rate_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO rate_count
      FROM t_tax_rates 
      WHERE tenant_id = NEW.tenant_id 
        AND is_active = true 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
      
      -- If this is the first rate, make it default
      IF rate_count = 0 THEN
        NEW.is_default = true;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_tax_rate_business_rules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vector_search_members"("p_group_id" "uuid", "p_query_embedding" "extensions"."vector", "p_limit" integer DEFAULT 10, "p_similarity_threshold" double precision DEFAULT 0.7) RETURNS TABLE("membership_id" "uuid", "tenant_id" "uuid", "business_name" "text", "business_email" "text", "mobile_number" "text", "city" "text", "industry" "text", "profile_snippet" "text", "ai_enhanced_description" "text", "approved_keywords" "text"[], "similarity" double precision, "match_type" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        gm.id AS membership_id,
        gm.tenant_id,
        tp.business_name::TEXT,
        tp.business_email::TEXT,
        (gm.profile_data->>'mobile_number')::TEXT AS mobile_number,
        tp.city::TEXT,
        ci.name::TEXT AS industry,
        LEFT(COALESCE(
            gm.profile_data->>'ai_enhanced_description',
            gm.profile_data->>'short_description',
            tp.business_name::TEXT
        ), 200)::TEXT AS profile_snippet,
        (gm.profile_data->>'ai_enhanced_description')::TEXT AS ai_enhanced_description,
        ARRAY(
            SELECT jsonb_array_elements_text(
                COALESCE(gm.profile_data->'approved_keywords', '[]'::JSONB)
            )
        )::TEXT[] AS approved_keywords,
        (1 - (gm.embedding <=> p_query_embedding))::FLOAT AS similarity,
        'vector'::TEXT AS match_type
    FROM public.t_group_memberships gm
    LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id::UUID
    LEFT JOIN public.m_catalog_industries ci ON ci.id = tp.industry_id
    WHERE gm.group_id = p_group_id
      AND gm.status = 'active'
      AND gm.is_active = TRUE
      AND gm.embedding IS NOT NULL
      AND 1 - (gm.embedding <=> p_query_embedding) >= p_similarity_threshold
    ORDER BY similarity DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."vector_search_members"("p_group_id" "uuid", "p_query_embedding" "extensions"."vector", "p_limit" integer, "p_similarity_threshold" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vector_search_with_boost"("p_group_id" "uuid", "p_query_embedding" "extensions"."vector", "p_query_text" "text", "p_limit" integer DEFAULT 10, "p_similarity_threshold" double precision DEFAULT 0.7) RETURNS TABLE("membership_id" "uuid", "tenant_id" "uuid", "business_name" "text", "business_email" "text", "mobile_number" "text", "city" "text", "industry" "text", "profile_snippet" "text", "ai_enhanced_description" "text", "approved_keywords" "text"[], "similarity" double precision, "similarity_original" double precision, "boost_applied" "text", "match_type" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_query_words TEXT[];
    v_search_word TEXT;
BEGIN
    v_query_words := regexp_split_to_array(LOWER(TRIM(p_query_text)), '\s+');
    v_search_word := v_query_words[1];

    RETURN QUERY
    WITH base_results AS (
        SELECT
            gm.id AS membership_id,
            gm.tenant_id,
            tp.business_name::TEXT AS business_name,
            tp.business_email::TEXT AS business_email,
            (gm.profile_data->>'mobile_number')::TEXT AS mobile_number,
            tp.city::TEXT AS city,
            ci.name::TEXT AS industry,
            LEFT(COALESCE(
                gm.profile_data->>'ai_enhanced_description',
                gm.profile_data->>'short_description',
                tp.business_name::TEXT
            ), 200)::TEXT AS profile_snippet,
            (gm.profile_data->>'ai_enhanced_description')::TEXT AS ai_enhanced_description,
            ARRAY(
                SELECT jsonb_array_elements_text(
                    COALESCE(gm.profile_data->'approved_keywords', '[]'::JSONB)
                )
            )::TEXT[] AS approved_keywords,
            (1 - (gm.embedding <=> p_query_embedding))::FLOAT AS base_similarity
        FROM public.t_group_memberships gm
        LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id::UUID
        LEFT JOIN public.m_catalog_industries ci ON ci.id = tp.industry_id
        WHERE gm.group_id = p_group_id
          AND gm.status = 'active'
          AND gm.is_active = TRUE
          AND gm.embedding IS NOT NULL
          AND 1 - (gm.embedding <=> p_query_embedding) >= p_similarity_threshold
    ),
    cluster_matches AS (
        SELECT DISTINCT sc.membership_id
        FROM public.t_semantic_clusters sc
        WHERE sc.is_active = TRUE
          AND (
              LOWER(sc.primary_term) LIKE '%' || v_search_word || '%'
              OR EXISTS (
                  SELECT 1
                  FROM unnest(sc.related_terms) rt
                  WHERE LOWER(rt) LIKE '%' || v_search_word || '%'
              )
          )
    ),
    boosted_results AS (
        SELECT
            br.*,
            CASE
                WHEN cm.membership_id IS NOT NULL THEN
                    LEAST(1.0::FLOAT, br.base_similarity + 0.15)
                ELSE br.base_similarity
            END AS final_similarity,
            CASE
                WHEN cm.membership_id IS NOT NULL THEN 'cluster_match'::TEXT
                ELSE NULL::TEXT
            END AS boost_reason
        FROM base_results br
        LEFT JOIN cluster_matches cm ON cm.membership_id = br.membership_id
    )
    SELECT
        br.membership_id,
        br.tenant_id::UUID,
        br.business_name,
        br.business_email,
        br.mobile_number,
        br.city,
        br.industry,
        br.profile_snippet,
        br.ai_enhanced_description,
        br.approved_keywords,
        br.final_similarity AS similarity,
        br.base_similarity AS similarity_original,
        br.boost_reason AS boost_applied,
        'vector'::TEXT AS match_type
    FROM boosted_results br
    ORDER BY br.final_similarity DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."vector_search_with_boost"("p_group_id" "uuid", "p_query_embedding" "extensions"."vector", "p_query_text" "text", "p_limit" integer, "p_similarity_threshold" double precision) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."c_category_details" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sub_cat_name" character varying(100) NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "category_id" "uuid",
    "hexcolor" character varying(10),
    "icon_name" character varying(50),
    "tags" "jsonb",
    "tool_tip" "text",
    "is_active" boolean DEFAULT true,
    "sequence_no" integer,
    "description" "text",
    "is_deletable" boolean DEFAULT true,
    "form_settings" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."c_category_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."c_category_master" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category_name" character varying(100) NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "is_active" boolean DEFAULT true,
    "description" "text",
    "icon_name" character varying(50),
    "order_sequence" integer,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."c_category_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."familyknows_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "subject" "text",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "notes" "text",
    CONSTRAINT "familyknows_contacts_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'read'::"text", 'replied'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."familyknows_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."familyknows_waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "phone" "text",
    "plan_type" "text" DEFAULT 'waitlist'::"text" NOT NULL,
    "source" "text" DEFAULT 'website'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    CONSTRAINT "familyknows_waitlist_plan_type_check" CHECK (("plan_type" = ANY (ARRAY['earlybird'::"text", 'waitlist'::"text"]))),
    CONSTRAINT "familyknows_waitlist_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'contacted'::"text", 'converted'::"text"])))
);


ALTER TABLE "public"."familyknows_waitlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "company" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text" NOT NULL,
    "industry" "text",
    "source" "text" DEFAULT 'expo_qr'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."m_block_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_id" "uuid",
    "version" integer DEFAULT 1,
    "name" character varying(255),
    "description" "text",
    "icon" character varying(100),
    "sort_order" smallint,
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."m_block_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."m_block_masters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_id" "uuid",
    "version" integer DEFAULT 1,
    "category_id" "uuid",
    "name" character varying(255),
    "description" "text",
    "icon" character varying(100),
    "node_type" character varying(100),
    "config" "jsonb",
    "theme_styles" "jsonb",
    "can_rotate" boolean DEFAULT false,
    "can_resize" boolean DEFAULT false,
    "is_bidirectional" boolean DEFAULT false,
    "icon_names" "text"[],
    "hex_color" character varying(7),
    "border_style" character varying(50),
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."m_block_masters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."m_block_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_id" "uuid",
    "version" integer DEFAULT 1,
    "block_id" "uuid",
    "name" character varying(255),
    "description" "text",
    "node_type" character varying(100),
    "default_config" "jsonb",
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."m_block_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."m_catalog_categories" (
    "id" character varying(100) NOT NULL,
    "industry_id" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "icon" character varying(50),
    "default_pricing_model" character varying(30) DEFAULT 'per_session'::character varying,
    "suggested_duration" integer,
    "common_variants" "jsonb" DEFAULT '[]'::"jsonb",
    "pricing_rule_templates" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "valid_category_id" CHECK ((("id")::"text" ~ '^[a-z][a-z0-9_]*$'::"text")),
    CONSTRAINT "valid_pricing_model" CHECK ((("default_pricing_model")::"text" = ANY ((ARRAY['per_session'::character varying, 'per_hour'::character varying, 'fixed'::character varying, 'monthly'::character varying, 'package'::character varying, 'per_unit'::character varying, 'subscription'::character varying, 'hourly'::character varying, 'daily'::character varying])::"text"[])))
);


ALTER TABLE "public"."m_catalog_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."m_catalog_categories" IS 'Master categories within each industry. Contains business intelligence like default pricing models, common variants, and suggested configurations to help tenants set up their catalogs quickly.';



COMMENT ON COLUMN "public"."m_catalog_categories"."pricing_rule_templates" IS 'Array of pricing rule templates specific to this category. More specific than industry-wide rules.';



CREATE TABLE IF NOT EXISTS "public"."m_catalog_category_industry_map" (
    "category_id" character varying NOT NULL,
    "industry_id" character varying NOT NULL,
    "is_primary" boolean DEFAULT false,
    "display_name" character varying,
    "display_order" integer DEFAULT 999,
    "is_active" boolean DEFAULT true,
    "customizations" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."m_catalog_category_industry_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."m_catalog_industries" (
    "id" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "icon" character varying(50),
    "common_pricing_rules" "jsonb" DEFAULT '[]'::"jsonb",
    "compliance_requirements" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "valid_industry_id" CHECK ((("id")::"text" ~ '^[a-z][a-z0-9_]*$'::"text"))
);


ALTER TABLE "public"."m_catalog_industries" OWNER TO "postgres";


COMMENT ON TABLE "public"."m_catalog_industries" IS 'Master table containing global industry templates for tenant onboarding. Industries like healthcare, wellness, manufacturing with their metadata and common patterns.';



COMMENT ON COLUMN "public"."m_catalog_industries"."common_pricing_rules" IS 'Array of common pricing patterns for this industry. Used during onboarding to suggest pricing strategies.';



CREATE TABLE IF NOT EXISTS "public"."m_catalog_pricing_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "industry_id" character varying(50) NOT NULL,
    "category_id" character varying(100),
    "template_name" character varying(255) NOT NULL,
    "template_description" "text",
    "rule_type" character varying(50) NOT NULL,
    "condition_config" "jsonb" NOT NULL,
    "action_config" "jsonb" NOT NULL,
    "popularity_score" integer DEFAULT 0,
    "is_recommended" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "valid_action_config" CHECK (("jsonb_typeof"("action_config") = 'object'::"text")),
    CONSTRAINT "valid_condition_config" CHECK (("jsonb_typeof"("condition_config") = 'object'::"text")),
    CONSTRAINT "valid_pricing_template_config" CHECK ("public"."validate_pricing_template_config"("rule_type", "condition_config", "action_config")),
    CONSTRAINT "valid_rule_type" CHECK ((("rule_type")::"text" = ANY ((ARRAY['time_based'::character varying, 'quantity_based'::character varying, 'customer_based'::character varying, 'date_based'::character varying, 'location_based'::character varying, 'seasonal'::character varying])::"text"[])))
);


ALTER TABLE "public"."m_catalog_pricing_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."m_catalog_pricing_templates" IS 'Reusable pricing rule templates that tenants can apply to their services. Contains common patterns like peak hour pricing, bulk discounts, seasonal adjustments per industry.';



COMMENT ON COLUMN "public"."m_catalog_pricing_templates"."popularity_score" IS 'Tracking metric for how often this template is used. Higher scores indicate more popular/successful templates.';



CREATE TABLE IF NOT EXISTS "public"."m_catalog_resource_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "industry_id" character varying(50) NOT NULL,
    "resource_type_id" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "default_attributes" "jsonb" DEFAULT '{}'::"jsonb",
    "pricing_guidance" "jsonb" DEFAULT '{}'::"jsonb",
    "popularity_score" integer DEFAULT 0,
    "is_recommended" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."m_catalog_resource_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."m_catalog_resource_types" (
    "id" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "icon" character varying(50),
    "pricing_model" character varying(30) DEFAULT 'fixed'::character varying,
    "requires_human_assignment" boolean DEFAULT false,
    "has_capacity_limits" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_pricing_model" CHECK ((("pricing_model")::"text" = ANY ((ARRAY['fixed'::character varying, 'hourly'::character varying, 'per_use'::character varying, 'monthly'::character varying, 'daily'::character varying, 'per_unit'::character varying])::"text"[]))),
    CONSTRAINT "valid_resource_type_id" CHECK ((("id")::"text" ~ '^[a-z][a-z0-9_]*$'::"text"))
);


ALTER TABLE "public"."m_catalog_resource_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."m_category_details" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sub_cat_name" character varying(100) NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "category_id" "uuid",
    "hexcolor" character varying(10),
    "icon_name" character varying(50),
    "tags" "jsonb",
    "tool_tip" "text",
    "is_active" boolean DEFAULT true,
    "sequence_no" integer DEFAULT 0,
    "description" "text",
    "is_deletable" boolean DEFAULT true,
    "form_settings" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "requires_human" boolean DEFAULT false
);


ALTER TABLE "public"."m_category_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."m_category_master" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category_name" character varying(100) NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "is_active" boolean DEFAULT true,
    "description" "text",
    "icon_name" character varying(50),
    "sequence_no" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."m_category_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."m_permissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "resource" character varying(50) NOT NULL,
    "action" character varying(20) NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "m_permissions_action_check" CHECK ((("action")::"text" = ANY (ARRAY[('create'::character varying)::"text", ('read'::character varying)::"text", ('update'::character varying)::"text", ('delete'::character varying)::"text", ('manage'::character varying)::"text"])))
);


ALTER TABLE "public"."m_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."m_products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "api_key_hash" character varying(255),
    "env_prefix" character varying(20) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."m_products" OWNER TO "postgres";


COMMENT ON TABLE "public"."m_products" IS 'Product registry for multi-product architecture';



COMMENT ON COLUMN "public"."m_products"."code" IS 'Unique product code (contractnest, familyknows)';



COMMENT ON COLUMN "public"."m_products"."env_prefix" IS 'Environment variable prefix for this product (e.g., FK_ for familyknows)';



COMMENT ON COLUMN "public"."m_products"."is_default" IS 'Default product when X-Product header is missing';



COMMENT ON COLUMN "public"."m_products"."settings" IS 'Product-specific settings (GA4 ID, feature flags, etc.)';



CREATE TABLE IF NOT EXISTS "public"."n_customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_code" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "api_key" character varying(255) NOT NULL,
    "webhook_url" character varying(500),
    "webhook_secret" character varying(255),
    "is_active" boolean DEFAULT true,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."n_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."n_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "channel" character varying(20) NOT NULL,
    "recipient" character varying(255) NOT NULL,
    "provider" character varying(50),
    "provider_message_id" character varying(255),
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "status_details" "jsonb",
    "sent_at" timestamp without time zone,
    "delivered_at" timestamp without time zone,
    "failed_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."n_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."n_jtd" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "jtd_number" character varying(30),
    "event_type_code" character varying(50) NOT NULL,
    "channel_code" character varying(20),
    "source_type_code" character varying(50) NOT NULL,
    "source_id" "uuid",
    "source_ref" character varying(255),
    "recipient_type" character varying(50),
    "recipient_id" "uuid",
    "recipient_name" character varying(255),
    "recipient_contact" character varying(255),
    "scheduled_at" timestamp with time zone,
    "executed_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "status_id" "uuid",
    "status_code" character varying(30) DEFAULT 'created'::character varying NOT NULL,
    "previous_status_code" character varying(30),
    "status_changed_at" timestamp with time zone DEFAULT "now"(),
    "is_valid_transition" boolean DEFAULT true,
    "transition_note" "text",
    "priority" integer DEFAULT 5,
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 3,
    "last_retry_at" timestamp with time zone,
    "next_retry_at" timestamp with time zone,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "template_id" "uuid",
    "template_key" character varying(100),
    "template_variables" "jsonb" DEFAULT '{}'::"jsonb",
    "execution_result" "jsonb",
    "error_message" "text",
    "error_code" character varying(50),
    "provider_code" character varying(50),
    "provider_message_id" character varying(255),
    "provider_response" "jsonb",
    "cost" numeric(10,4) DEFAULT 0,
    "business_context" "jsonb" DEFAULT '{}'::"jsonb",
    "performed_by_type" character varying(20) DEFAULT 'user'::character varying NOT NULL,
    "performed_by_id" "uuid",
    "performed_by_name" character varying(255),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "is_live" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "chk_performer" CHECK ((((("performed_by_type")::"text" = 'user'::"text") AND ("performed_by_id" IS NOT NULL)) OR (("performed_by_type")::"text" = ANY ((ARRAY['vani'::character varying, 'system'::character varying, 'webhook'::character varying])::"text"[]))))
);


ALTER TABLE "public"."n_jtd" OWNER TO "postgres";


COMMENT ON TABLE "public"."n_jtd" IS 'Main Jobs To Do table - core of JTD framework';



COMMENT ON COLUMN "public"."n_jtd"."is_valid_transition" IS 'False if status transition violated flow (soft enforcement)';



COMMENT ON COLUMN "public"."n_jtd"."business_context" IS 'Linked business data: contract_id, service_number, amount, etc.';



COMMENT ON COLUMN "public"."n_jtd"."performed_by_type" IS 'Actor type: user, vani, system, webhook';



COMMENT ON COLUMN "public"."n_jtd"."is_live" IS 'true=production mode, false=test mode';



CREATE TABLE IF NOT EXISTS "public"."n_jtd_channels" (
    "code" character varying(20) NOT NULL,
    "name" character varying(50) NOT NULL,
    "description" "text",
    "icon" character varying(50),
    "color" character varying(20),
    "default_provider" character varying(50),
    "default_cost_per_unit" numeric(10,4) DEFAULT 0,
    "rate_limit_per_minute" integer DEFAULT 100,
    "supports_templates" boolean DEFAULT true,
    "supports_attachments" boolean DEFAULT false,
    "supports_rich_content" boolean DEFAULT false,
    "max_content_length" integer,
    "has_delivery_confirmation" boolean DEFAULT true,
    "has_read_receipt" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."n_jtd_channels" OWNER TO "postgres";


COMMENT ON TABLE "public"."n_jtd_channels" IS 'Communication channels: email, sms, whatsapp, push, inapp';



COMMENT ON COLUMN "public"."n_jtd_channels"."default_provider" IS 'Default provider: msg91, sendgrid, gupshup, firebase';



CREATE TABLE IF NOT EXISTS "public"."n_jtd_event_types" (
    "code" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "category" character varying(50) NOT NULL,
    "icon" character varying(50),
    "color" character varying(20),
    "allowed_channels" "text"[] DEFAULT '{}'::"text"[],
    "supports_scheduling" boolean DEFAULT false,
    "supports_recurrence" boolean DEFAULT false,
    "supports_batch" boolean DEFAULT false,
    "payload_schema" "jsonb",
    "default_priority" integer DEFAULT 5,
    "default_max_retries" integer DEFAULT 3,
    "retry_delay_seconds" integer DEFAULT 300,
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."n_jtd_event_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."n_jtd_event_types" IS 'Master list of JTD event types';



COMMENT ON COLUMN "public"."n_jtd_event_types"."category" IS 'Category: communication, scheduling, action';



COMMENT ON COLUMN "public"."n_jtd_event_types"."allowed_channels" IS 'Channels allowed for this event type';



CREATE TABLE IF NOT EXISTS "public"."n_jtd_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "jtd_id" "uuid" NOT NULL,
    "action" character varying(30) NOT NULL,
    "performed_by_type" character varying(20) NOT NULL,
    "performed_by_id" "uuid",
    "performed_by_name" character varying(255),
    "field_name" character varying(100),
    "old_value" "text",
    "new_value" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "note" "text",
    "is_live" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."n_jtd_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."n_jtd_history" IS 'General audit trail for JTD changes (non-status)';



COMMENT ON COLUMN "public"."n_jtd_history"."action" IS 'Action: created, updated, retry, cancelled, etc.';



CREATE TABLE IF NOT EXISTS "public"."n_jtd_source_types" (
    "code" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "default_event_type" character varying(50),
    "source_table" character varying(100),
    "source_id_field" character varying(100) DEFAULT 'id'::character varying,
    "default_channels" "text"[] DEFAULT '{}'::"text"[],
    "payload_mapping" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."n_jtd_source_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."n_jtd_source_types" IS 'What triggers JTD creation';



COMMENT ON COLUMN "public"."n_jtd_source_types"."source_table" IS 'Source table name: t_user_invitations, t_contracts';



COMMENT ON COLUMN "public"."n_jtd_source_types"."payload_mapping" IS 'JSON mapping to extract payload from source record';



CREATE TABLE IF NOT EXISTS "public"."n_jtd_status_flows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type_code" character varying(50) NOT NULL,
    "from_status_id" "uuid" NOT NULL,
    "to_status_id" "uuid" NOT NULL,
    "is_automatic" boolean DEFAULT false,
    "requires_reason" boolean DEFAULT false,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."n_jtd_status_flows" OWNER TO "postgres";


COMMENT ON TABLE "public"."n_jtd_status_flows" IS 'Valid status transitions per event type';



COMMENT ON COLUMN "public"."n_jtd_status_flows"."is_automatic" IS 'True if system can auto-transition';



CREATE TABLE IF NOT EXISTS "public"."n_jtd_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "jtd_id" "uuid" NOT NULL,
    "from_status_id" "uuid",
    "from_status_code" character varying(30),
    "to_status_id" "uuid",
    "to_status_code" character varying(30) NOT NULL,
    "is_valid_transition" boolean DEFAULT true,
    "transition_note" "text",
    "performed_by_type" character varying(20) NOT NULL,
    "performed_by_id" "uuid",
    "performed_by_name" character varying(255),
    "reason" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "status_started_at" timestamp with time zone DEFAULT "now"(),
    "status_ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "is_live" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."n_jtd_status_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."n_jtd_status_history" IS 'Audit trail for every JTD status change';



COMMENT ON COLUMN "public"."n_jtd_status_history"."status_started_at" IS 'When this status became active';



COMMENT ON COLUMN "public"."n_jtd_status_history"."status_ended_at" IS 'When this status ended (filled on next change)';



COMMENT ON COLUMN "public"."n_jtd_status_history"."duration_seconds" IS 'How long the JTD was in the previous status';



CREATE TABLE IF NOT EXISTS "public"."n_jtd_statuses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type_code" character varying(50),
    "code" character varying(30) NOT NULL,
    "name" character varying(50) NOT NULL,
    "description" "text",
    "status_type" character varying(20) NOT NULL,
    "icon" character varying(50),
    "color" character varying(20),
    "is_initial" boolean DEFAULT false,
    "is_terminal" boolean DEFAULT false,
    "is_success" boolean DEFAULT false,
    "is_failure" boolean DEFAULT false,
    "allows_retry" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."n_jtd_statuses" OWNER TO "postgres";


COMMENT ON TABLE "public"."n_jtd_statuses" IS 'Status definitions for JTD workflow (per event type)';



COMMENT ON COLUMN "public"."n_jtd_statuses"."event_type_code" IS 'NULL = global status, otherwise specific to event type';



COMMENT ON COLUMN "public"."n_jtd_statuses"."status_type" IS 'Type: initial, progress, success, failure, terminal';



COMMENT ON COLUMN "public"."n_jtd_statuses"."is_terminal" IS 'True if no further transitions allowed';



COMMENT ON COLUMN "public"."n_jtd_statuses"."allows_retry" IS 'True if retry is allowed from this status';



COMMENT ON COLUMN "public"."n_jtd_statuses"."is_active" IS 'Soft delete flag';



CREATE TABLE IF NOT EXISTS "public"."n_jtd_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "template_key" character varying(100) NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "channel_code" character varying(20) NOT NULL,
    "source_type_code" character varying(50),
    "subject" character varying(500),
    "content" "text" NOT NULL,
    "content_html" "text",
    "variables" "jsonb" DEFAULT '[]'::"jsonb",
    "provider_template_id" character varying(100),
    "version" integer DEFAULT 1,
    "is_live" boolean,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."n_jtd_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."n_jtd_templates" IS 'Message templates for JTD notifications';



COMMENT ON COLUMN "public"."n_jtd_templates"."tenant_id" IS 'NULL for system templates, tenant_id for custom';



COMMENT ON COLUMN "public"."n_jtd_templates"."variables" IS 'Array of {name, type, required, default}';



COMMENT ON COLUMN "public"."n_jtd_templates"."provider_template_id" IS 'External template ID (MSG91, etc.)';



CREATE TABLE IF NOT EXISTS "public"."n_jtd_tenant_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "vani_enabled" boolean DEFAULT false,
    "vani_auto_execute_types" "text"[] DEFAULT '{}'::"text"[],
    "channels_enabled" "jsonb" DEFAULT '{"sms": false, "push": false, "email": true, "inapp": true, "whatsapp": false}'::"jsonb",
    "provider_config_refs" "jsonb" DEFAULT '{}'::"jsonb",
    "daily_limit" integer,
    "monthly_limit" integer,
    "daily_used" integer DEFAULT 0,
    "monthly_used" integer DEFAULT 0,
    "last_reset_date" "date" DEFAULT CURRENT_DATE,
    "default_priority" integer DEFAULT 5,
    "timezone" character varying(50) DEFAULT 'UTC'::character varying,
    "quiet_hours_start" time without time zone,
    "quiet_hours_end" time without time zone,
    "is_live" boolean DEFAULT true NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."n_jtd_tenant_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."n_jtd_tenant_config" IS 'Per-tenant JTD configuration';



COMMENT ON COLUMN "public"."n_jtd_tenant_config"."vani_enabled" IS 'Whether VaNi AI agent is enabled for this tenant';



COMMENT ON COLUMN "public"."n_jtd_tenant_config"."vani_auto_execute_types" IS 'Event types VaNi can auto-execute';



COMMENT ON COLUMN "public"."n_jtd_tenant_config"."quiet_hours_start" IS 'Start of quiet hours (no notifications)';



COMMENT ON COLUMN "public"."n_jtd_tenant_config"."is_live" IS 'true=production mode, false=test mode';



CREATE TABLE IF NOT EXISTS "public"."n_jtd_tenant_source_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "source_type_code" character varying(50) NOT NULL,
    "channels_enabled" "text"[],
    "templates" "jsonb" DEFAULT '{}'::"jsonb",
    "is_enabled" boolean DEFAULT true,
    "auto_execute" boolean DEFAULT false,
    "priority_override" integer,
    "delay_seconds" integer DEFAULT 0,
    "batch_window_seconds" integer,
    "is_live" boolean DEFAULT true NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."n_jtd_tenant_source_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."n_jtd_tenant_source_config" IS 'Per-tenant overrides for each source type';



COMMENT ON COLUMN "public"."n_jtd_tenant_source_config"."auto_execute" IS 'VaNi auto-executes this source type';



COMMENT ON COLUMN "public"."n_jtd_tenant_source_config"."delay_seconds" IS 'Delay before execution (for batching)';



CREATE TABLE IF NOT EXISTS "public"."n_platform_providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "channel" character varying(20) NOT NULL,
    "provider_name" character varying(50) NOT NULL,
    "is_primary" boolean DEFAULT false,
    "config" "jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."n_platform_providers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."n_system_actors" (
    "id" "uuid" NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "avatar_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."n_system_actors" OWNER TO "postgres";


COMMENT ON TABLE "public"."n_system_actors" IS 'System actors like VaNi (AI Agent), System, Webhook';



COMMENT ON COLUMN "public"."n_system_actors"."code" IS 'Unique code: vani, system, webhook';



CREATE TABLE IF NOT EXISTS "public"."n_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_code" character varying(50),
    "template_key" character varying(100) NOT NULL,
    "channel" character varying(20) NOT NULL,
    "subject" character varying(500),
    "content" "text" NOT NULL,
    "variables" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."n_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."n_tenant_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "email_enabled" boolean DEFAULT true,
    "sms_enabled" boolean DEFAULT false,
    "whatsapp_enabled" boolean DEFAULT false,
    "inapp_enabled" boolean DEFAULT true,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."n_tenant_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_ai_agent_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "phone" character varying(20),
    "phone_normalized" character varying(20) NOT NULL,
    "group_id" "uuid",
    "group_code" character varying(50),
    "channel" character varying(20) DEFAULT 'whatsapp'::character varying NOT NULL,
    "session_scope" character varying(20) DEFAULT 'group'::character varying NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb",
    "conversation_history" "jsonb" DEFAULT '[]'::"jsonb",
    "detected_language" character varying(10) DEFAULT 'en'::character varying,
    "is_active" boolean DEFAULT true,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "last_activity_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "end_reason" character varying(50) DEFAULT NULL::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid"
);


ALTER TABLE "public"."t_ai_agent_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_ai_agent_sessions" IS 'AI agent conversation sessions. WhatsApp sessions have no expiry, Web sessions expire after 30 minutes of inactivity.';



COMMENT ON COLUMN "public"."t_ai_agent_sessions"."phone" IS 'Phone number in original format (E.164 recommended: +919876543210)';



COMMENT ON COLUMN "public"."t_ai_agent_sessions"."phone_normalized" IS 'Phone number with only digits for flexible matching (e.g., 919876543210)';



COMMENT ON COLUMN "public"."t_ai_agent_sessions"."context" IS 'JSON object storing conversation context like last search query, results, etc.';



COMMENT ON COLUMN "public"."t_ai_agent_sessions"."conversation_history" IS 'Array of last 10 messages for AI context window';



COMMENT ON COLUMN "public"."t_ai_agent_sessions"."expires_at" IS 'Session expiry time. NULL for WhatsApp (no time-based expiry).';



COMMENT ON COLUMN "public"."t_ai_agent_sessions"."end_reason" IS 'Why session ended: user_exit, timeout, switch_group, error';



COMMENT ON COLUMN "public"."t_ai_agent_sessions"."tenant_id" IS 'Tenant ID for user-based session lookups (web/chat)';



CREATE TABLE IF NOT EXISTS "public"."t_audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid",
    "user_id" "uuid",
    "action" character varying(100) NOT NULL,
    "resource" character varying(100) NOT NULL,
    "resource_id" character varying(255),
    "metadata" "jsonb",
    "ip_address" character varying(45),
    "user_agent" "text",
    "success" boolean DEFAULT true,
    "error_message" "text",
    "severity" character varying(20) DEFAULT 'info'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "session_id" character varying(255),
    "correlation_id" character varying(255)
);


ALTER TABLE "public"."t_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_bm_feature_reference" (
    "feature_id" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "is_special_feature" boolean DEFAULT false NOT NULL,
    "default_limit" integer DEFAULT 0 NOT NULL,
    "trial_limit" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."t_bm_feature_reference" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_bm_invoice" (
    "invoice_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency_code" character varying(3) NOT NULL,
    "status" character varying(20) NOT NULL,
    "due_date" timestamp with time zone NOT NULL,
    "paid_date" timestamp with time zone,
    "description" "text",
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "t_bm_invoice_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('paid'::character varying)::"text", ('pending'::character varying)::"text", ('overdue'::character varying)::"text"])))
);


ALTER TABLE "public"."t_bm_invoice" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_bm_notification_reference" (
    "notif_type" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "categories" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."t_bm_notification_reference" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_bm_plan_version" (
    "version_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "version_number" character varying(10) NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "effective_date" "date" NOT NULL,
    "changelog" "text",
    "created_by" character varying(255) NOT NULL,
    "tiers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "features" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "notifications" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "topup_options" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "chk_topup_options_is_array" CHECK (("jsonb_typeof"("topup_options") = 'array'::"text"))
);


ALTER TABLE "public"."t_bm_plan_version" OWNER TO "postgres";


COMMENT ON COLUMN "public"."t_bm_plan_version"."topup_options" IS 'Array of top-up options configured for this plan version';



CREATE TABLE IF NOT EXISTS "public"."t_bm_pricing_plan" (
    "plan_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "plan_type" character varying(20) NOT NULL,
    "trial_duration" integer DEFAULT 0 NOT NULL,
    "is_visible" boolean DEFAULT false NOT NULL,
    "is_archived" boolean DEFAULT false NOT NULL,
    "default_currency_code" character varying(3) NOT NULL,
    "supported_currencies" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "product_code" character varying(50) NOT NULL,
    CONSTRAINT "t_bm_pricing_plan_plan_type_check" CHECK ((("plan_type")::"text" = ANY (ARRAY[('Per User'::character varying)::"text", ('Per Contract'::character varying)::"text"])))
);


ALTER TABLE "public"."t_bm_pricing_plan" OWNER TO "postgres";


COMMENT ON COLUMN "public"."t_bm_pricing_plan"."product_code" IS 'Product this plan belongs to (contractnest, familyknows, etc.)';



CREATE TABLE IF NOT EXISTS "public"."t_bm_subscription_usage" (
    "usage_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "type" character varying(20) NOT NULL,
    "identifier" character varying(255) NOT NULL,
    "used_amount" integer DEFAULT 0 NOT NULL,
    "limit_amount" integer NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "t_bm_subscription_usage_type_check" CHECK ((("type")::"text" = ANY (ARRAY[('feature'::character varying)::"text", ('notification'::character varying)::"text"])))
);


ALTER TABLE "public"."t_bm_subscription_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_bm_tenant_subscription" (
    "subscription_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "version_id" "uuid" NOT NULL,
    "status" character varying(20) NOT NULL,
    "currency_code" character varying(3) NOT NULL,
    "units" integer DEFAULT 1 NOT NULL,
    "current_tier" "jsonb" NOT NULL,
    "amount_per_billing" numeric(10,2) NOT NULL,
    "billing_cycle" character varying(20) NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "renewal_date" timestamp with time zone NOT NULL,
    "trial_ends" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "t_bm_tenant_subscription_billing_cycle_check" CHECK ((("billing_cycle")::"text" = ANY (ARRAY[('monthly'::character varying)::"text", ('quarterly'::character varying)::"text", ('annually'::character varying)::"text"]))),
    CONSTRAINT "t_bm_tenant_subscription_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('active'::character varying)::"text", ('trial'::character varying)::"text", ('canceled'::character varying)::"text", ('expired'::character varying)::"text"])))
);


ALTER TABLE "public"."t_bm_tenant_subscription" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_business_groups" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_name" character varying(255) NOT NULL,
    "group_type" character varying(50) NOT NULL,
    "description" "text",
    "admin_tenant_id" "uuid",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "member_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."t_business_groups" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_business_groups" IS 'Business networks and communities (BBB chapters, associations, forums)';



CREATE TABLE IF NOT EXISTS "public"."t_campaign_leads" (
    "lead_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "campaign_code" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "phone" character varying(20) NOT NULL,
    "email" character varying(255) NOT NULL,
    "company" character varying(255),
    "interested_contractnest" boolean DEFAULT false,
    "interested_familyknows" boolean DEFAULT false,
    "attending_breakfast" boolean DEFAULT false,
    "source" character varying(100) DEFAULT 'unknown'::character varying,
    "referrer" character varying(255),
    "utm_source" character varying(100),
    "utm_medium" character varying(100),
    "utm_campaign" character varying(100),
    "utm_content" character varying(100),
    "utm_term" character varying(100),
    "status" character varying(50) DEFAULT 'new'::character varying,
    "pdfs_sent" "jsonb" DEFAULT '{}'::"jsonb",
    "whatsapp_delivered" boolean DEFAULT false,
    "whatsapp_read" boolean DEFAULT false,
    "email_sent" boolean DEFAULT false,
    "email_opened" boolean DEFAULT false,
    "follow_up_count" integer DEFAULT 0,
    "last_contact_method" character varying(50),
    "meeting_scheduled" boolean DEFAULT false,
    "meeting_date" timestamp with time zone,
    "demo_completed" boolean DEFAULT false,
    "demo_date" timestamp with time zone,
    "converted" boolean DEFAULT false,
    "converted_to" character varying(50),
    "conversion_value" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "pdf_sent_at" timestamp with time zone,
    "first_contact_at" timestamp with time zone,
    "last_contact_at" timestamp with time zone,
    "converted_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "tags" "text"[],
    "quality_score" integer,
    "assigned_to" character varying(255),
    CONSTRAINT "at_least_one_interest" CHECK ((("interested_contractnest" = true) OR ("interested_familyknows" = true))),
    CONSTRAINT "t_campaign_leads_quality_score_check" CHECK ((("quality_score" >= 1) AND ("quality_score" <= 10))),
    CONSTRAINT "valid_lead_status" CHECK ((("status")::"text" = ANY ((ARRAY['new'::character varying, 'pdf_sent'::character varying, 'contacted'::character varying, 'meeting_scheduled'::character varying, 'demo_completed'::character varying, 'proposal_sent'::character varying, 'negotiation'::character varying, 'converted'::character varying, 'lost'::character varying, 'unqualified'::character varying])::"text"[]))),
    CONSTRAINT "valid_quality_score" CHECK ((("quality_score" IS NULL) OR (("quality_score" >= 1) AND ("quality_score" <= 10))))
);


ALTER TABLE "public"."t_campaign_leads" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_campaign_leads" IS 'Stores all leads captured from marketing campaigns';



COMMENT ON COLUMN "public"."t_campaign_leads"."campaign_code" IS 'Denormalized for faster queries without joins';



COMMENT ON COLUMN "public"."t_campaign_leads"."pdfs_sent" IS 'JSON object tracking which PDFs were sent: {"contractnest": true, "familyknows": false}';



COMMENT ON COLUMN "public"."t_campaign_leads"."quality_score" IS 'Lead quality score from 1-10, higher is better';



CREATE TABLE IF NOT EXISTS "public"."t_campaigns" (
    "campaign_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "campaign_code" character varying(50) NOT NULL,
    "campaign_name" character varying(255) NOT NULL,
    "campaign_type" character varying(50) NOT NULL,
    "description" "text",
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "products" "jsonb" DEFAULT '[]'::"jsonb",
    "target_leads" integer,
    "budget_allocated" numeric(10,2),
    "offer_details" "jsonb" DEFAULT '{}'::"jsonb",
    "status" character varying(50) DEFAULT 'active'::character varying,
    "total_leads" integer DEFAULT 0,
    "total_conversions" integer DEFAULT 0,
    "created_by" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    CONSTRAINT "valid_dates" CHECK ((("end_date" IS NULL) OR ("end_date" >= "start_date"))),
    CONSTRAINT "valid_status" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'completed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."t_campaigns" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_campaigns" IS 'Stores all marketing campaign metadata';



CREATE TABLE IF NOT EXISTS "public"."t_catalog_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "industry_id" "uuid",
    "category_code" character varying(100) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "icon" character varying(50),
    "default_pricing_model" character varying(30) DEFAULT 'per_session'::character varying,
    "suggested_duration" integer,
    "common_variants" "jsonb" DEFAULT '[]'::"jsonb",
    "pricing_rule_templates" "jsonb" DEFAULT '[]'::"jsonb",
    "is_custom" boolean DEFAULT false,
    "master_category_id" character varying(100),
    "customization_notes" "text",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."t_catalog_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_catalog_industries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "industry_code" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "icon" character varying(50),
    "common_pricing_rules" "jsonb" DEFAULT '[]'::"jsonb",
    "compliance_requirements" "jsonb" DEFAULT '[]'::"jsonb",
    "is_custom" boolean DEFAULT false,
    "master_industry_id" character varying(50),
    "customization_notes" "text",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."t_catalog_industries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_catalog_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "short_description" "text",
    "description_content" "text",
    "description_format" character varying(20) DEFAULT 'markdown'::character varying,
    "type" character varying(50) DEFAULT 'service'::character varying,
    "industry_id" character varying(50),
    "category_id" character varying(50),
    "is_live" boolean DEFAULT false,
    "parent_id" "uuid",
    "is_variant" boolean DEFAULT false,
    "price_attributes" "jsonb" DEFAULT '{}'::"jsonb",
    "tax_config" "jsonb" DEFAULT '{}'::"jsonb",
    "service_attributes" "jsonb" DEFAULT '{}'::"jsonb",
    "resource_requirements" "jsonb" DEFAULT '{}'::"jsonb",
    "specifications" "jsonb" DEFAULT '{}'::"jsonb",
    "terms_content" "text",
    "terms_format" character varying(20) DEFAULT 'markdown'::character varying,
    "variant_attributes" "jsonb" DEFAULT '{}'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "search_vector" "tsvector",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "status" boolean DEFAULT true NOT NULL,
    CONSTRAINT "valid_type" CHECK ((("type")::"text" = ANY ((ARRAY['service'::character varying, 'product'::character varying, 'bundle'::character varying])::"text"[])))
);


ALTER TABLE "public"."t_catalog_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."t_catalog_items"."status" IS 'Active status: true = active/visible, false = inactive/soft-deleted. Default is true.';



CREATE TABLE IF NOT EXISTS "public"."t_catalog_resource_pricing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "pricing_type_id" "uuid",
    "base_rate" numeric(15,4) NOT NULL,
    "currency_code" character varying(3) DEFAULT 'INR'::character varying,
    "peak_hour_multiplier" numeric(3,2) DEFAULT 1.0,
    "weekend_multiplier" numeric(3,2) DEFAULT 1.0,
    "holiday_multiplier" numeric(3,2) DEFAULT 1.0,
    "min_quantity" integer DEFAULT 1,
    "max_quantity" integer,
    "effective_from" "date" DEFAULT CURRENT_DATE,
    "effective_to" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_date_range" CHECK ((("effective_to" IS NULL) OR ("effective_to" >= "effective_from"))),
    CONSTRAINT "valid_multipliers" CHECK ((("peak_hour_multiplier" >= (0)::numeric) AND ("weekend_multiplier" >= (0)::numeric) AND ("holiday_multiplier" >= (0)::numeric)))
);


ALTER TABLE "public"."t_catalog_resource_pricing" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_catalog_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "resource_type_id" character varying(50) NOT NULL,
    "is_available" boolean DEFAULT true,
    "capacity_per_day" integer,
    "capacity_per_hour" integer,
    "working_hours" "jsonb" DEFAULT '{}'::"jsonb",
    "skills" "jsonb" DEFAULT '[]'::"jsonb",
    "attributes" "jsonb" DEFAULT '{}'::"jsonb",
    "location_id" "uuid",
    "is_mobile" boolean DEFAULT false,
    "service_radius_km" integer,
    "hourly_cost" numeric(15,4),
    "daily_cost" numeric(15,4),
    "currency_code" character varying(3) DEFAULT 'INR'::character varying,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "is_live" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "sequence_no" integer,
    CONSTRAINT "valid_resource_status" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'maintenance'::character varying, 'retired'::character varying])::"text"[])))
);


ALTER TABLE "public"."t_catalog_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_catalog_service_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_id" "uuid" NOT NULL,
    "resource_type_id" character varying(50) NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "allocation_type_id" "uuid",
    "quantity_required" integer DEFAULT 1,
    "duration_hours" numeric(5,2),
    "unit_cost" numeric(15,4),
    "currency_code" character varying(3) DEFAULT 'INR'::character varying,
    "is_billable" boolean DEFAULT true,
    "required_skills" "jsonb" DEFAULT '[]'::"jsonb",
    "required_attributes" "jsonb" DEFAULT '{}'::"jsonb",
    "sequence_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."t_catalog_service_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_category_details" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sub_cat_name" character varying(100) NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "category_id" "uuid",
    "hexcolor" character varying(10),
    "icon_name" character varying(50),
    "tags" "jsonb",
    "tool_tip" "text",
    "is_active" boolean DEFAULT true,
    "sequence_no" integer,
    "description" "text",
    "tenant_id" "uuid",
    "is_deletable" boolean DEFAULT true,
    "form_settings" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "is_live" boolean DEFAULT true
);


ALTER TABLE "public"."t_category_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_category_master" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category_name" character varying(100) NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "is_active" boolean DEFAULT true,
    "description" "text",
    "icon_name" character varying(50),
    "order_sequence" integer,
    "tenant_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "is_live" boolean DEFAULT true
);


ALTER TABLE "public"."t_category_master" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_category_master" IS 'Global category definitions. sequence_numbers category (id: a0000000-...-000000000001) contains global sequence type templates.';



CREATE TABLE IF NOT EXISTS "public"."t_category_resources_master" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "resource_type_id" character varying NOT NULL,
    "name" character varying NOT NULL,
    "display_name" character varying NOT NULL,
    "description" "text",
    "hexcolor" character varying,
    "sequence_no" integer,
    "contact_id" "uuid",
    "tags" "jsonb",
    "form_settings" "jsonb",
    "is_active" boolean DEFAULT true,
    "is_deletable" boolean DEFAULT true,
    "is_live" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."t_category_resources_master" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_category_resources_master" IS 'Master table for category resources (LOV-style resources)';



COMMENT ON COLUMN "public"."t_category_resources_master"."resource_type_id" IS 'References resource type (consumable, asset, equipment, etc.)';



COMMENT ON COLUMN "public"."t_category_resources_master"."name" IS 'Internal name for the resource';



COMMENT ON COLUMN "public"."t_category_resources_master"."display_name" IS 'Human-readable display name';



COMMENT ON COLUMN "public"."t_category_resources_master"."contact_id" IS 'Optional reference to contact for human resources';



CREATE TABLE IF NOT EXISTS "public"."t_contact_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "type" character varying(20) NOT NULL,
    "label" character varying(100),
    "address_line1" character varying(200) NOT NULL,
    "address_line2" character varying(200),
    "city" character varying(100) NOT NULL,
    "state_code" character varying(50),
    "country_code" character varying(5) DEFAULT 'IN'::character varying NOT NULL,
    "postal_code" character varying(20),
    "google_pin" "text",
    "is_primary" boolean DEFAULT false,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "t_contact_addresses_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['home'::character varying, 'office'::character varying, 'billing'::character varying, 'shipping'::character varying, 'factory'::character varying, 'warehouse'::character varying, 'other'::character varying])::"text"[])))
);


ALTER TABLE "public"."t_contact_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_contact_channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "channel_type" character varying(20) NOT NULL,
    "value" character varying(200) NOT NULL,
    "country_code" character varying(5),
    "is_primary" boolean DEFAULT false,
    "is_verified" boolean DEFAULT false,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "t_contact_channels_type_check" CHECK ((("channel_type")::"text" = ANY ((ARRAY['mobile'::character varying, 'email'::character varying, 'whatsapp'::character varying, 'linkedin'::character varying, 'website'::character varying, 'telegram'::character varying, 'skype'::character varying])::"text"[]))),
    CONSTRAINT "t_contact_channels_value_check" CHECK (("length"(TRIM(BOTH FROM "value")) > 0))
);


ALTER TABLE "public"."t_contact_channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "auth_user_id" "uuid",
    "t_userprofile_id" "uuid",
    "parent_contact_id" "uuid",
    "type" character varying(20) NOT NULL,
    "status" character varying(20) DEFAULT 'active'::character varying NOT NULL,
    "salutation" character varying(10),
    "name" character varying(100),
    "company_name" character varying(100),
    "registration_number" character varying(50),
    "designation" character varying(100),
    "department" character varying(100),
    "is_primary_contact" boolean DEFAULT false,
    "classifications" "jsonb" DEFAULT '[]'::"jsonb",
    "tags" "jsonb" DEFAULT '[]'::"jsonb",
    "compliance_numbers" "jsonb" DEFAULT '[]'::"jsonb",
    "notes" "text",
    "potential_duplicate" boolean DEFAULT false,
    "duplicate_reasons" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "is_live" boolean DEFAULT true,
    "parent_contact_ids" "jsonb" DEFAULT '[]'::"jsonb",
    "contact_number" character varying(50),
    CONSTRAINT "check_parent_contact_ids_is_array" CHECK (("jsonb_typeof"("parent_contact_ids") = 'array'::"text")),
    CONSTRAINT "t_contacts_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::"text"[]))),
    CONSTRAINT "t_contacts_tenant_id_check" CHECK (("tenant_id" IS NOT NULL)),
    CONSTRAINT "t_contacts_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['individual'::character varying, 'corporate'::character varying, 'contact_person'::character varying])::"text"[]))),
    CONSTRAINT "t_contacts_type_name_check" CHECK ((((("type")::"text" = 'individual'::"text") AND ("name" IS NOT NULL) AND ("company_name" IS NULL)) OR ((("type")::"text" = 'corporate'::"text") AND ("company_name" IS NOT NULL) AND ("name" IS NULL)) OR ((("type")::"text" = 'contact_person'::"text") AND ("name" IS NOT NULL) AND ("parent_contact_id" IS NOT NULL))))
);


ALTER TABLE "public"."t_contacts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."t_contacts"."contact_number" IS 'Human-readable auto-generated contact identifier. Format: PREFIX-SEQUENCE (e.g., CT-1001).
Generated automatically on insert using sequence configuration from t_category_details.';



CREATE TABLE IF NOT EXISTS "public"."t_domain_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "domain_encrypted" "text" NOT NULL,
    "domain_hash" character varying(64) NOT NULL,
    "config_encrypted" "text" NOT NULL,
    "region" character varying(50) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."t_domain_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_group_activity_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_id" "uuid",
    "tenant_id" "uuid",
    "membership_id" "uuid",
    "activity_type" character varying(50) NOT NULL,
    "activity_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."t_group_activity_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_group_activity_logs" IS 'Activity tracking and error logging for groups';



CREATE TABLE IF NOT EXISTS "public"."t_group_memberships" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "group_id" "uuid" NOT NULL,
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "joined_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "profile_data" "jsonb" DEFAULT '{}'::"jsonb",
    "embedding" "extensions"."vector"(1536),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "is_owner" boolean DEFAULT false,
    CONSTRAINT "t_group_memberships_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'pending'::character varying, 'active'::character varying, 'inactive'::character varying, 'suspended'::character varying])::"text"[])))
);


ALTER TABLE "public"."t_group_memberships" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_group_memberships" IS 'Tenant memberships in business groups with AI-powered profiles';



COMMENT ON COLUMN "public"."t_group_memberships"."embedding" IS 'Vector embedding combining business info + profile description for semantic search';



CREATE TABLE IF NOT EXISTS "public"."t_idempotency_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "idempotency_key" character varying(255) NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "operation_type" character varying(50) NOT NULL,
    "service_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."t_idempotency_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_integration_providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "logo_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "config_schema" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."t_integration_providers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_integration_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "icon_name" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."t_integration_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_intent_definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "intent_code" character varying(50) NOT NULL,
    "intent_name" character varying(100) NOT NULL,
    "description" "text",
    "default_label" character varying(100),
    "default_icon" character varying(50),
    "default_prompt" "text",
    "intent_type" character varying(50) NOT NULL,
    "requires_ai" boolean DEFAULT false,
    "cacheable" boolean DEFAULT true,
    "default_roles" character varying(50)[] DEFAULT ARRAY['admin'::"text", 'member'::"text"],
    "default_channels" character varying(50)[] DEFAULT ARRAY['web'::"text", 'mobile'::"text", 'whatsapp'::"text", 'api'::"text"],
    "default_scopes" character varying(50)[] DEFAULT ARRAY['tenant'::"text", 'group'::"text"],
    "default_max_results" integer DEFAULT 10,
    "is_active" boolean DEFAULT true,
    "is_system" boolean DEFAULT false,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."t_intent_definitions" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_intent_definitions" IS 'Master catalog of all search intents with default RBAC settings';



COMMENT ON COLUMN "public"."t_intent_definitions"."intent_code" IS 'Unique identifier for the intent (e.g., search_offering)';



COMMENT ON COLUMN "public"."t_intent_definitions"."intent_type" IS 'Type: search, list, filter, action, info';



COMMENT ON COLUMN "public"."t_intent_definitions"."default_roles" IS 'Default roles allowed to use this intent';



COMMENT ON COLUMN "public"."t_intent_definitions"."default_channels" IS 'Default channels where this intent is available';



COMMENT ON COLUMN "public"."t_intent_definitions"."default_scopes" IS 'Default search scopes allowed (tenant, group, product)';



CREATE TABLE IF NOT EXISTS "public"."t_invitation_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invitation_id" "uuid" NOT NULL,
    "action" character varying(50) NOT NULL,
    "performed_by" "uuid",
    "performed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "t_invitation_audit_log_action_check" CHECK ((("action")::"text" = ANY ((ARRAY['created'::character varying, 'sent'::character varying, 'resent'::character varying, 'opened'::character varying, 'clicked'::character varying, 'validated'::character varying, 'accepted'::character varying, 'cancelled'::character varying, 'expired'::character varying, 'delivery_failed'::character varying, 'delivery_bounced'::character varying])::"text"[])))
);


ALTER TABLE "public"."t_invitation_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_invitation_audit_log" IS 'Audit trail for all invitation-related actions';



COMMENT ON COLUMN "public"."t_invitation_audit_log"."metadata" IS 'JSON field for storing action-specific details like IP, user agent, etc.';



CREATE TABLE IF NOT EXISTS "public"."t_onboarding_step_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "step_id" character varying(50) NOT NULL,
    "step_sequence" integer NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "attempts" integer DEFAULT 0,
    "error_log" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."t_onboarding_step_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_query_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid",
    "query_text" "text" NOT NULL,
    "query_normalized" "text" NOT NULL,
    "query_embedding" "extensions"."vector"(1536),
    "results" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "results_count" integer DEFAULT 0,
    "hit_count" integer DEFAULT 1,
    "search_type" "text" DEFAULT 'vector'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_hit_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '45 days'::interval),
    "cache_type" "text" DEFAULT 'group_search'::"text",
    "scope" "text" DEFAULT 'group'::"text",
    "scope_id" "uuid",
    "failure_count" integer DEFAULT 0,
    "last_failure_at" timestamp with time zone,
    "failure_reason" "text",
    CONSTRAINT "chk_cache_scope" CHECK (("scope" = ANY (ARRAY['tenant'::"text", 'group'::"text", 'product'::"text"]))),
    CONSTRAINT "chk_cache_type" CHECK (("cache_type" = ANY (ARRAY['group_search'::"text", 'smartprofile_search'::"text", 'product_search'::"text", 'tenant_search'::"text"])))
);


ALTER TABLE "public"."t_query_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_query_cache" IS 'Cache for AI search queries with 45-day sliding expiration';



COMMENT ON COLUMN "public"."t_query_cache"."cache_type" IS 'Type of cache: group_search, smartprofile_search, product_search, tenant_search';



COMMENT ON COLUMN "public"."t_query_cache"."scope" IS 'Search scope: tenant, group, product';



COMMENT ON COLUMN "public"."t_query_cache"."scope_id" IS 'ID for the scope (tenant_id, group_id, or NULL for product)';



COMMENT ON COLUMN "public"."t_query_cache"."failure_count" IS 'Number of times this cached query resulted in errors';



COMMENT ON COLUMN "public"."t_query_cache"."failure_reason" IS 'Last failure reason for debugging';



CREATE TABLE IF NOT EXISTS "public"."t_role_permissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "role_id" "uuid",
    "permission_id" "uuid",
    "tenant_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."t_role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_semantic_clusters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "primary_term" character varying(100) NOT NULL,
    "related_terms" "text"[] NOT NULL,
    "category" character varying(100),
    "confidence_score" double precision,
    "cluster_embedding" "extensions"."vector"(1536),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" "uuid",
    CONSTRAINT "chk_cluster_owner" CHECK (((("membership_id" IS NOT NULL) AND ("tenant_id" IS NULL)) OR (("membership_id" IS NULL) AND ("tenant_id" IS NOT NULL))))
);


ALTER TABLE "public"."t_semantic_clusters" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_semantic_clusters" IS 'AI-generated keyword clusters for each member (improves search discoverability)';



COMMENT ON COLUMN "public"."t_semantic_clusters"."tenant_id" IS 'FK to t_tenants for SmartProfile clusters. Mutually exclusive with membership_id.';



CREATE TABLE IF NOT EXISTS "public"."t_sequence_counters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sequence_type_id" "uuid",
    "tenant_id" "uuid" NOT NULL,
    "current_value" integer DEFAULT 0 NOT NULL,
    "last_reset_date" timestamp with time zone DEFAULT "now"(),
    "is_live" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "sequence_code" "text" NOT NULL,
    "prefix" "text" DEFAULT ''::"text",
    "separator" "text" DEFAULT '-'::"text",
    "suffix" "text" DEFAULT ''::"text",
    "padding_length" integer DEFAULT 4,
    "start_value" integer DEFAULT 1,
    "increment_by" integer DEFAULT 1,
    "reset_frequency" "text" DEFAULT 'NEVER'::"text",
    "display_name" "text",
    "description" "text",
    "hexcolor" "text" DEFAULT '#3B82F6'::"text",
    "icon_name" "text" DEFAULT 'Hash'::"text",
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."t_sequence_counters" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_sequence_counters" IS 'Stores runtime counter values for sequence number generation. Config is in t_category_details.form_settings.';



COMMENT ON COLUMN "public"."t_sequence_counters"."sequence_type_id" IS 'FK to t_category_details entry under sequence_numbers category';



COMMENT ON COLUMN "public"."t_sequence_counters"."current_value" IS 'Current counter value. Incremented atomically on each use.';



COMMENT ON COLUMN "public"."t_sequence_counters"."last_reset_date" IS 'When the counter was last reset (for yearly/monthly resets)';



COMMENT ON COLUMN "public"."t_sequence_counters"."is_live" IS 'Environment flag - true for live, false for test mode';



CREATE TABLE IF NOT EXISTS "public"."t_system_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."t_system_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_system_config" IS 'System-wide configuration including VaNi chat settings';



CREATE TABLE IF NOT EXISTS "public"."t_tax_info" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid",
    "tax_id_type" character varying(20) NOT NULL,
    "tax_id_value" character varying(50) NOT NULL,
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."t_tax_info" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_tax_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "rate" numeric(5,2) NOT NULL,
    "description" "text",
    "sequence_no" integer DEFAULT 10,
    "is_default" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."t_tax_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_tax_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "display_mode" character varying(20) DEFAULT 'excluding_tax'::character varying NOT NULL,
    "default_tax_rate_id" "uuid",
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "t_tax_settings_display_mode_check" CHECK ((("display_mode")::"text" = ANY ((ARRAY['including_tax'::character varying, 'excluding_tax'::character varying])::"text"[])))
);


ALTER TABLE "public"."t_tax_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_tax_settings" IS 'Tenant-specific tax configuration settings including display mode and default rate';



COMMENT ON COLUMN "public"."t_tax_settings"."display_mode" IS 'How prices are displayed: including_tax or excluding_tax';



COMMENT ON COLUMN "public"."t_tax_settings"."default_tax_rate_id" IS 'Reference to the default tax rate for this tenant';



COMMENT ON COLUMN "public"."t_tax_settings"."version" IS 'Optimistic locking version number';



CREATE TABLE IF NOT EXISTS "public"."t_tenant_domains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "domain_encrypted" "text" NOT NULL,
    "domain_hash" character varying(64) NOT NULL,
    "domain_mapping_id" "uuid",
    "is_primary" boolean DEFAULT false,
    "ssl_configured" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."t_tenant_domains" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_tenant_files" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "file_type" "text" NOT NULL,
    "file_category" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "download_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."t_tenant_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_tenant_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "text" NOT NULL,
    "master_integration_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_live" boolean DEFAULT true NOT NULL,
    "credentials" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "connection_status" "text" DEFAULT 'Not Configured'::"text" NOT NULL,
    "last_verified" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."t_tenant_integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_tenant_onboarding" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "onboarding_type" character varying(20) DEFAULT 'business'::character varying,
    "current_step" integer DEFAULT 1,
    "total_steps" integer DEFAULT 6,
    "completed_steps" "jsonb" DEFAULT '[]'::"jsonb",
    "skipped_steps" "jsonb" DEFAULT '[]'::"jsonb",
    "step_data" "jsonb" DEFAULT '{}'::"jsonb",
    "started_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "completed_at" timestamp with time zone,
    "is_completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."t_tenant_onboarding" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_tenant_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid",
    "profile_type" character varying(20) NOT NULL,
    "business_name" character varying(255),
    "business_email" character varying(255),
    "business_phone_country_code" character varying(5),
    "business_phone" character varying(15),
    "country_code" character varying(5),
    "state_code" character varying(10),
    "address_line1" character varying(255),
    "address_line2" character varying(255),
    "city" character varying(100),
    "postal_code" character varying(20),
    "logo_url" character varying(255),
    "primary_color" character varying(10),
    "secondary_color" character varying(10),
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "industry_id" character varying,
    "website_url" character varying,
    "business_type_id" character varying,
    "business_phone_code" character varying(4),
    "business_whatsapp_country_code" character varying(10),
    "business_whatsapp" character varying(20),
    "short_description" character varying(200),
    "booking_url" character varying(500),
    "contact_first_name" character varying(100),
    "contact_last_name" character varying(100)
);


ALTER TABLE "public"."t_tenant_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."t_tenant_profiles"."business_phone_code" IS 'International dialing code (e.g., 91, 1, 44) for SMS/WhatsApp APIs';



COMMENT ON COLUMN "public"."t_tenant_profiles"."business_whatsapp" IS 'WhatsApp number for BBB and group communications';



COMMENT ON COLUMN "public"."t_tenant_profiles"."short_description" IS 'Brief business description (max 200 chars) shown in search result cards';



COMMENT ON COLUMN "public"."t_tenant_profiles"."booking_url" IS 'Appointment booking URL (Calendly, Cal.com, etc.) for Book Appointment intent';



CREATE TABLE IF NOT EXISTS "public"."t_tenant_regions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "region" character varying(50) NOT NULL,
    "config_encrypted" "text" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "data_scope" "text"[] DEFAULT ARRAY['all'::"text"],
    "sync_status" character varying(50) DEFAULT 'active'::character varying,
    "last_sync_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."t_tenant_regions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_tenant_smartprofiles" (
    "tenant_id" "uuid" NOT NULL,
    "short_description" "text",
    "ai_enhanced_description" "text",
    "approved_keywords" "text"[] DEFAULT '{}'::"text"[],
    "suggested_keywords" "text"[] DEFAULT '{}'::"text"[],
    "profile_type" "text" DEFAULT 'both'::"text",
    "embedding" "extensions"."vector"(1536),
    "status" "text" DEFAULT 'draft'::"text",
    "is_active" boolean DEFAULT true,
    "last_enhanced_at" timestamp with time zone,
    "last_embedding_at" timestamp with time zone,
    "enhancement_source" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "t_tenant_smartprofiles_profile_type_check" CHECK (("profile_type" = ANY (ARRAY['buyer'::"text", 'seller'::"text", 'both'::"text"]))),
    CONSTRAINT "t_tenant_smartprofiles_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'inactive'::"text", 'pending_review'::"text"])))
);


ALTER TABLE "public"."t_tenant_smartprofiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_tenant_smartprofiles" IS 'AI-enhanced tenant profiles for semantic search. One profile per tenant, searchable across all groups.';



COMMENT ON COLUMN "public"."t_tenant_smartprofiles"."approved_keywords" IS 'Keywords approved by tenant for search matching';



COMMENT ON COLUMN "public"."t_tenant_smartprofiles"."profile_type" IS 'buyer = looking to purchase, seller = offering services, both = dual role';



COMMENT ON COLUMN "public"."t_tenant_smartprofiles"."embedding" IS 'OpenAI text-embedding-3-small vector for semantic similarity search';



CREATE TABLE IF NOT EXISTS "public"."t_tenants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "domain" character varying(255),
    "workspace_code" character varying(20) NOT NULL,
    "plan_id" "uuid",
    "status" character varying(20) NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid",
    "is_admin" boolean DEFAULT false,
    "storage_path" "text",
    "storage_quota" integer DEFAULT 40 NOT NULL,
    "storage_consumed" integer DEFAULT 0 NOT NULL,
    "storage_provider" "text" DEFAULT 'firebase'::"text" NOT NULL,
    "storage_setup_complete" boolean DEFAULT false NOT NULL,
    CONSTRAINT "t_tenants_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('active'::character varying)::"text", ('inactive'::character varying)::"text", ('suspended'::character varying)::"text", ('trial'::character varying)::"text"])))
);


ALTER TABLE "public"."t_tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_tool_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "tool_name" "text" NOT NULL,
    "query_text" "text",
    "results" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "results_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."t_tool_results" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_tool_results" IS 'Temporary storage for tool outputs - cleaned up after 1 hour';



CREATE TABLE IF NOT EXISTS "public"."t_user_auth_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "auth_type" character varying(50) NOT NULL,
    "auth_identifier" character varying(255) NOT NULL,
    "is_primary" boolean DEFAULT false,
    "is_verified" boolean DEFAULT true,
    "linked_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "t_user_auth_methods_auth_type_check" CHECK ((("auth_type")::"text" = ANY ((ARRAY['email'::character varying, 'google'::character varying, 'github'::character varying, 'microsoft'::character varying, 'apple'::character varying])::"text"[])))
);


ALTER TABLE "public"."t_user_auth_methods" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_user_auth_methods" IS 'Tracks multiple authentication methods per user for OAuth and traditional login';



CREATE TABLE IF NOT EXISTS "public"."t_user_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_code" character varying(20) NOT NULL,
    "secret_code" character varying(10) NOT NULL,
    "email" character varying(255),
    "mobile_number" character varying(20),
    "invitation_method" character varying(20) DEFAULT 'email'::character varying NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "accepted_by" "uuid",
    "cancelled_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    "sent_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "expires_at" timestamp with time zone NOT NULL,
    "resent_count" integer DEFAULT 0,
    "last_resent_at" timestamp with time zone,
    "last_resent_by" "uuid",
    "email_opened_at" timestamp with time zone,
    "link_clicked_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "country_code" character varying(2) DEFAULT 'IN'::character varying,
    "phone_code" character varying(4),
    CONSTRAINT "email_or_mobile_required" CHECK ((("email" IS NOT NULL) OR ("mobile_number" IS NOT NULL))),
    CONSTRAINT "t_user_invitations_invitation_method_check" CHECK ((("invitation_method")::"text" = ANY ((ARRAY['email'::character varying, 'sms'::character varying, 'whatsapp'::character varying])::"text"[]))),
    CONSTRAINT "t_user_invitations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'resent'::character varying, 'accepted'::character varying, 'expired'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."t_user_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."t_user_invitations" IS 'Stores user invitations for workspace access';



COMMENT ON COLUMN "public"."t_user_invitations"."status" IS 'Current status: pending, sent, resent, accepted, expired, cancelled';



COMMENT ON COLUMN "public"."t_user_invitations"."metadata" IS 'JSON field for storing delivery info, role assignments, custom messages, etc.';



COMMENT ON COLUMN "public"."t_user_invitations"."country_code" IS 'ISO 3166-1 alpha-2 country code (e.g., IN, US, GB)';



COMMENT ON COLUMN "public"."t_user_invitations"."phone_code" IS 'International dialing code (e.g., 91, 1, 44)';



CREATE TABLE IF NOT EXISTS "public"."t_user_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "email" character varying(255) NOT NULL,
    "country_code" character varying(5),
    "mobile_number" character varying(15),
    "user_code" character varying(8) NOT NULL,
    "avatar_url" character varying(255),
    "preferred_theme" character varying(50),
    "is_dark_mode" boolean DEFAULT false,
    "preferred_language" character varying(10) DEFAULT 'en'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "is_admin" boolean DEFAULT false
);


ALTER TABLE "public"."t_user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_user_tenant_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_tenant_id" "uuid",
    "role_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."t_user_tenant_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."t_user_tenants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "tenant_id" "uuid",
    "is_default" boolean DEFAULT false,
    "status" character varying(20) NOT NULL,
    "invitation_token" character varying(100),
    "invitation_expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "is_admin" boolean DEFAULT false,
    CONSTRAINT "t_user_tenants_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('active'::character varying)::"text", ('invited'::character varying)::"text", ('inactive'::character varying)::"text"])))
);


ALTER TABLE "public"."t_user_tenants" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_audit_logs_detailed" WITH ("security_invoker"='true') AS
 SELECT "al"."id",
    "al"."tenant_id",
    "al"."user_id",
    "al"."action",
    "al"."resource",
    "al"."resource_id",
    "al"."metadata",
    "al"."ip_address",
    "al"."user_agent",
    "al"."success",
    "al"."error_message",
    "al"."severity",
    "al"."created_at",
    "al"."session_id",
    "al"."correlation_id",
    ((("up"."first_name")::"text" || ' '::"text") || ("up"."last_name")::"text") AS "user_name",
    "up"."email" AS "user_email",
    "up"."user_code",
    "t"."name" AS "tenant_name",
    "t"."workspace_code" AS "tenant_code",
    "public"."is_tenant_admin"("al"."tenant_id") AS "can_manage"
   FROM (("public"."t_audit_logs" "al"
     LEFT JOIN "public"."t_user_profiles" "up" ON (("al"."user_id" = "up"."user_id")))
     LEFT JOIN "public"."t_tenants" "t" ON (("al"."tenant_id" = "t"."id")));


ALTER TABLE "public"."v_audit_logs_detailed" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cache_analytics" AS
 SELECT "t_query_cache"."cache_type",
    "t_query_cache"."scope",
    "count"(*) AS "total_entries",
    "sum"("t_query_cache"."hit_count") AS "total_hits",
    "sum"("t_query_cache"."failure_count") AS "total_failures",
    "avg"("t_query_cache"."hit_count") AS "avg_hits_per_entry",
    "count"(*) FILTER (WHERE ("t_query_cache"."expires_at" < "now"())) AS "expired_entries",
    "count"(*) FILTER (WHERE ("t_query_cache"."expires_at" >= "now"())) AS "active_entries",
    "max"("t_query_cache"."last_hit_at") AS "last_activity"
   FROM "public"."t_query_cache"
  GROUP BY "t_query_cache"."cache_type", "t_query_cache"."scope";


ALTER TABLE "public"."v_cache_analytics" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_cache_analytics" IS 'Analytics view for cache performance by type and scope';



CREATE OR REPLACE VIEW "public"."v_membership_details" AS
 SELECT "m"."id" AS "membership_id",
    "m"."group_id",
    "m"."tenant_id",
    "m"."status",
    COALESCE("tp"."business_name", 'Business'::character varying) AS "business_name",
    "tp"."business_phone" AS "contact_phone",
    "tp"."business_email" AS "contact_email",
    "tp"."business_whatsapp" AS "whatsapp_number",
    "tp"."website_url",
    "tp"."booking_url",
    "tp"."logo_url",
    COALESCE("tp"."address_line1", ''::character varying) AS "address",
    "tp"."city",
    "tp"."industry_id" AS "industry",
    "tp"."short_description" AS "description",
    "bg"."group_name"
   FROM (("public"."t_group_memberships" "m"
     LEFT JOIN "public"."t_tenant_profiles" "tp" ON (("tp"."tenant_id" = "m"."tenant_id")))
     LEFT JOIN "public"."t_business_groups" "bg" ON (("bg"."id" = "m"."group_id")))
  WHERE (("m"."status")::"text" = 'active'::"text");


ALTER TABLE "public"."v_membership_details" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_onboarding_master_data" AS
 SELECT "mi"."id" AS "industry_id",
    "mi"."name" AS "industry_name",
    "mi"."icon" AS "industry_icon",
    "mi"."description" AS "industry_description",
    "count"("mc"."id") AS "category_count",
    "jsonb_agg"("jsonb_build_object"('id', "mc"."id", 'name', "mc"."name", 'icon', "mc"."icon", 'default_pricing_model', "mc"."default_pricing_model", 'common_variants', "mc"."common_variants") ORDER BY "mc"."sort_order") AS "categories"
   FROM ("public"."m_catalog_industries" "mi"
     LEFT JOIN "public"."m_catalog_categories" "mc" ON (((("mi"."id")::"text" = ("mc"."industry_id")::"text") AND ("mc"."is_active" = true))))
  WHERE ("mi"."is_active" = true)
  GROUP BY "mi"."id", "mi"."name", "mi"."icon", "mi"."description", "mi"."sort_order"
  ORDER BY "mi"."sort_order";


ALTER TABLE "public"."v_onboarding_master_data" OWNER TO "postgres";


ALTER TABLE ONLY "public"."c_category_details"
    ADD CONSTRAINT "c_category_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."c_category_details"
    ADD CONSTRAINT "c_category_details_sub_cat_name_category_id_key" UNIQUE ("sub_cat_name", "category_id");



ALTER TABLE ONLY "public"."c_category_master"
    ADD CONSTRAINT "c_category_master_category_name_key" UNIQUE ("category_name");



ALTER TABLE ONLY "public"."c_category_master"
    ADD CONSTRAINT "c_category_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."familyknows_contacts"
    ADD CONSTRAINT "familyknows_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."familyknows_waitlist"
    ADD CONSTRAINT "familyknows_waitlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."m_block_categories"
    ADD CONSTRAINT "m_block_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."m_block_masters"
    ADD CONSTRAINT "m_block_masters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."m_block_variants"
    ADD CONSTRAINT "m_block_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."m_catalog_categories"
    ADD CONSTRAINT "m_catalog_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."m_catalog_category_industry_map"
    ADD CONSTRAINT "m_catalog_category_industry_map_pkey" PRIMARY KEY ("category_id", "industry_id");



ALTER TABLE ONLY "public"."m_catalog_industries"
    ADD CONSTRAINT "m_catalog_industries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."m_catalog_pricing_templates"
    ADD CONSTRAINT "m_catalog_pricing_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."m_catalog_resource_templates"
    ADD CONSTRAINT "m_catalog_resource_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."m_catalog_resource_types"
    ADD CONSTRAINT "m_catalog_resource_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."m_category_details"
    ADD CONSTRAINT "m_category_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."m_category_details"
    ADD CONSTRAINT "m_category_details_sub_cat_name_category_id_key" UNIQUE ("sub_cat_name", "category_id");



ALTER TABLE ONLY "public"."m_category_master"
    ADD CONSTRAINT "m_category_master_category_name_key" UNIQUE ("category_name");



ALTER TABLE ONLY "public"."m_category_master"
    ADD CONSTRAINT "m_category_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."m_permissions"
    ADD CONSTRAINT "m_permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."m_permissions"
    ADD CONSTRAINT "m_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."m_permissions"
    ADD CONSTRAINT "m_permissions_resource_action_key" UNIQUE ("resource", "action");



ALTER TABLE ONLY "public"."m_products"
    ADD CONSTRAINT "m_products_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."m_products"
    ADD CONSTRAINT "m_products_env_prefix_unique" UNIQUE ("env_prefix");



ALTER TABLE ONLY "public"."m_products"
    ADD CONSTRAINT "m_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n_customers"
    ADD CONSTRAINT "n_customers_customer_code_key" UNIQUE ("customer_code");



ALTER TABLE ONLY "public"."n_customers"
    ADD CONSTRAINT "n_customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n_deliveries"
    ADD CONSTRAINT "n_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n_jtd_channels"
    ADD CONSTRAINT "n_jtd_channels_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."n_jtd_event_types"
    ADD CONSTRAINT "n_jtd_event_types_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."n_jtd_history"
    ADD CONSTRAINT "n_jtd_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n_jtd"
    ADD CONSTRAINT "n_jtd_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n_jtd_source_types"
    ADD CONSTRAINT "n_jtd_source_types_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."n_jtd_status_flows"
    ADD CONSTRAINT "n_jtd_status_flows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n_jtd_status_history"
    ADD CONSTRAINT "n_jtd_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n_jtd_statuses"
    ADD CONSTRAINT "n_jtd_statuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n_jtd_templates"
    ADD CONSTRAINT "n_jtd_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n_jtd_tenant_config"
    ADD CONSTRAINT "n_jtd_tenant_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n_jtd_tenant_source_config"
    ADD CONSTRAINT "n_jtd_tenant_source_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n_platform_providers"
    ADD CONSTRAINT "n_platform_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n_system_actors"
    ADD CONSTRAINT "n_system_actors_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."n_system_actors"
    ADD CONSTRAINT "n_system_actors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n_templates"
    ADD CONSTRAINT "n_templates_customer_code_template_key_channel_key" UNIQUE ("customer_code", "template_key", "channel");



ALTER TABLE ONLY "public"."n_templates"
    ADD CONSTRAINT "n_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n_tenant_preferences"
    ADD CONSTRAINT "n_tenant_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n_tenant_preferences"
    ADD CONSTRAINT "n_tenant_preferences_tenant_id_key" UNIQUE ("tenant_id");



ALTER TABLE ONLY "public"."t_ai_agent_sessions"
    ADD CONSTRAINT "t_ai_agent_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_audit_logs"
    ADD CONSTRAINT "t_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_bm_feature_reference"
    ADD CONSTRAINT "t_bm_feature_reference_pkey" PRIMARY KEY ("feature_id");



ALTER TABLE ONLY "public"."t_bm_invoice"
    ADD CONSTRAINT "t_bm_invoice_pkey" PRIMARY KEY ("invoice_id");



ALTER TABLE ONLY "public"."t_bm_notification_reference"
    ADD CONSTRAINT "t_bm_notification_reference_pkey" PRIMARY KEY ("notif_type");



ALTER TABLE ONLY "public"."t_bm_plan_version"
    ADD CONSTRAINT "t_bm_plan_version_pkey" PRIMARY KEY ("version_id");



ALTER TABLE ONLY "public"."t_bm_plan_version"
    ADD CONSTRAINT "t_bm_plan_version_plan_id_version_number_key" UNIQUE ("plan_id", "version_number");



ALTER TABLE ONLY "public"."t_bm_pricing_plan"
    ADD CONSTRAINT "t_bm_pricing_plan_pkey" PRIMARY KEY ("plan_id");



ALTER TABLE ONLY "public"."t_bm_subscription_usage"
    ADD CONSTRAINT "t_bm_subscription_usage_pkey" PRIMARY KEY ("usage_id");



ALTER TABLE ONLY "public"."t_bm_tenant_subscription"
    ADD CONSTRAINT "t_bm_tenant_subscription_pkey" PRIMARY KEY ("subscription_id");



ALTER TABLE ONLY "public"."t_business_groups"
    ADD CONSTRAINT "t_business_groups_group_name_key" UNIQUE ("group_name");



ALTER TABLE ONLY "public"."t_business_groups"
    ADD CONSTRAINT "t_business_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_campaign_leads"
    ADD CONSTRAINT "t_campaign_leads_pkey" PRIMARY KEY ("lead_id");



ALTER TABLE ONLY "public"."t_campaigns"
    ADD CONSTRAINT "t_campaigns_campaign_code_key" UNIQUE ("campaign_code");



ALTER TABLE ONLY "public"."t_campaigns"
    ADD CONSTRAINT "t_campaigns_pkey" PRIMARY KEY ("campaign_id");



ALTER TABLE ONLY "public"."t_catalog_categories"
    ADD CONSTRAINT "t_catalog_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_catalog_industries"
    ADD CONSTRAINT "t_catalog_industries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_catalog_items"
    ADD CONSTRAINT "t_catalog_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_catalog_resource_pricing"
    ADD CONSTRAINT "t_catalog_resource_pricing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_catalog_resources"
    ADD CONSTRAINT "t_catalog_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_catalog_service_resources"
    ADD CONSTRAINT "t_catalog_service_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_category_details"
    ADD CONSTRAINT "t_category_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_category_details"
    ADD CONSTRAINT "t_category_details_sub_cat_name_category_id_tenant_id_is_live_k" UNIQUE ("sub_cat_name", "category_id", "tenant_id", "is_live");



ALTER TABLE ONLY "public"."t_category_master"
    ADD CONSTRAINT "t_category_master_category_name_tenant_id_key" UNIQUE ("category_name", "tenant_id");



ALTER TABLE ONLY "public"."t_category_master"
    ADD CONSTRAINT "t_category_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_category_resources_master"
    ADD CONSTRAINT "t_category_resources_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_category_resources_master"
    ADD CONSTRAINT "t_category_resources_master_tenant_id_idx" UNIQUE ("tenant_id", "resource_type_id", "name");



ALTER TABLE ONLY "public"."t_chat_sessions"
    ADD CONSTRAINT "t_chat_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_contact_addresses"
    ADD CONSTRAINT "t_contact_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_contact_channels"
    ADD CONSTRAINT "t_contact_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_contacts"
    ADD CONSTRAINT "t_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_domain_mappings"
    ADD CONSTRAINT "t_domain_mappings_domain_hash_key" UNIQUE ("domain_hash");



ALTER TABLE ONLY "public"."t_domain_mappings"
    ADD CONSTRAINT "t_domain_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_group_activity_logs"
    ADD CONSTRAINT "t_group_activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_group_memberships"
    ADD CONSTRAINT "t_group_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_group_memberships"
    ADD CONSTRAINT "t_group_memberships_tenant_id_group_id_key" UNIQUE ("tenant_id", "group_id");



ALTER TABLE ONLY "public"."t_idempotency_keys"
    ADD CONSTRAINT "t_idempotency_keys_idempotency_key_tenant_id_operation_type_key" UNIQUE ("idempotency_key", "tenant_id", "operation_type");



ALTER TABLE ONLY "public"."t_idempotency_keys"
    ADD CONSTRAINT "t_idempotency_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_integration_providers"
    ADD CONSTRAINT "t_integration_providers_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."t_integration_providers"
    ADD CONSTRAINT "t_integration_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_integration_types"
    ADD CONSTRAINT "t_integration_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."t_integration_types"
    ADD CONSTRAINT "t_integration_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_intent_definitions"
    ADD CONSTRAINT "t_intent_definitions_intent_code_key" UNIQUE ("intent_code");



ALTER TABLE ONLY "public"."t_intent_definitions"
    ADD CONSTRAINT "t_intent_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_invitation_audit_log"
    ADD CONSTRAINT "t_invitation_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_onboarding_step_status"
    ADD CONSTRAINT "t_onboarding_step_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_onboarding_step_status"
    ADD CONSTRAINT "t_onboarding_step_status_tenant_id_step_id_key" UNIQUE ("tenant_id", "step_id");



ALTER TABLE ONLY "public"."t_query_cache"
    ADD CONSTRAINT "t_query_cache_group_query_unique" UNIQUE ("group_id", "query_normalized");



ALTER TABLE ONLY "public"."t_query_cache"
    ADD CONSTRAINT "t_query_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_role_permissions"
    ADD CONSTRAINT "t_role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_role_permissions"
    ADD CONSTRAINT "t_role_permissions_role_id_permission_id_tenant_id_key" UNIQUE ("role_id", "permission_id", "tenant_id");



ALTER TABLE ONLY "public"."t_semantic_clusters"
    ADD CONSTRAINT "t_semantic_clusters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_sequence_counters"
    ADD CONSTRAINT "t_sequence_counters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_system_config"
    ADD CONSTRAINT "t_system_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."t_tax_info"
    ADD CONSTRAINT "t_tax_info_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_tax_rates"
    ADD CONSTRAINT "t_tax_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_tax_settings"
    ADD CONSTRAINT "t_tax_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_tenant_domains"
    ADD CONSTRAINT "t_tenant_domains_domain_hash_key" UNIQUE ("domain_hash");



ALTER TABLE ONLY "public"."t_tenant_domains"
    ADD CONSTRAINT "t_tenant_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_tenant_files"
    ADD CONSTRAINT "t_tenant_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_tenant_integrations"
    ADD CONSTRAINT "t_tenant_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_tenant_onboarding"
    ADD CONSTRAINT "t_tenant_onboarding_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_tenant_profiles"
    ADD CONSTRAINT "t_tenant_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_tenant_regions"
    ADD CONSTRAINT "t_tenant_regions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_tenant_smartprofiles"
    ADD CONSTRAINT "t_tenant_smartprofiles_pkey" PRIMARY KEY ("tenant_id");



ALTER TABLE ONLY "public"."t_tenants"
    ADD CONSTRAINT "t_tenants_domain_key" UNIQUE ("domain");



ALTER TABLE ONLY "public"."t_tenants"
    ADD CONSTRAINT "t_tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_tenants"
    ADD CONSTRAINT "t_tenants_workspace_code_key" UNIQUE ("workspace_code");



ALTER TABLE ONLY "public"."t_tool_results"
    ADD CONSTRAINT "t_tool_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_user_auth_methods"
    ADD CONSTRAINT "t_user_auth_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_user_auth_methods"
    ADD CONSTRAINT "t_user_auth_methods_user_id_auth_type_auth_identifier_key" UNIQUE ("user_id", "auth_type", "auth_identifier");



ALTER TABLE ONLY "public"."t_user_invitations"
    ADD CONSTRAINT "t_user_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_user_profiles"
    ADD CONSTRAINT "t_user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_user_profiles"
    ADD CONSTRAINT "t_user_profiles_user_code_key" UNIQUE ("user_code");



ALTER TABLE ONLY "public"."t_user_tenant_roles"
    ADD CONSTRAINT "t_user_tenant_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_user_tenant_roles"
    ADD CONSTRAINT "t_user_tenant_roles_user_tenant_id_role_id_key" UNIQUE ("user_tenant_id", "role_id");



ALTER TABLE ONLY "public"."t_user_tenants"
    ADD CONSTRAINT "t_user_tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."t_user_tenants"
    ADD CONSTRAINT "t_user_tenants_user_id_tenant_id_key" UNIQUE ("user_id", "tenant_id");



ALTER TABLE ONLY "public"."m_catalog_categories"
    ADD CONSTRAINT "unique_category_per_industry" UNIQUE ("industry_id", "name");



ALTER TABLE ONLY "public"."t_catalog_categories"
    ADD CONSTRAINT "unique_category_per_tenant_industry" UNIQUE ("tenant_id", "industry_id", "category_code");



ALTER TABLE ONLY "public"."familyknows_waitlist"
    ADD CONSTRAINT "unique_email" UNIQUE ("email");



ALTER TABLE ONLY "public"."m_catalog_industries"
    ADD CONSTRAINT "unique_industry_name" UNIQUE ("name");



ALTER TABLE ONLY "public"."t_catalog_industries"
    ADD CONSTRAINT "unique_industry_per_tenant" UNIQUE ("tenant_id", "industry_code");



ALTER TABLE ONLY "public"."t_user_invitations"
    ADD CONSTRAINT "unique_invitation_codes" UNIQUE ("user_code", "secret_code");



ALTER TABLE ONLY "public"."t_catalog_resources"
    ADD CONSTRAINT "unique_resource_name_per_tenant" UNIQUE ("tenant_id", "name");



ALTER TABLE ONLY "public"."t_catalog_resource_pricing"
    ADD CONSTRAINT "unique_resource_pricing_period" UNIQUE ("resource_id", "pricing_type_id", "effective_from");



ALTER TABLE ONLY "public"."m_catalog_resource_templates"
    ADD CONSTRAINT "unique_resource_template" UNIQUE ("industry_id", "resource_type_id", "name");



ALTER TABLE ONLY "public"."t_catalog_service_resources"
    ADD CONSTRAINT "unique_service_resource_type" UNIQUE ("service_id", "resource_type_id", "tenant_id");



ALTER TABLE ONLY "public"."t_tenant_regions"
    ADD CONSTRAINT "unique_tenant_region" UNIQUE ("tenant_id", "region");



ALTER TABLE ONLY "public"."t_tax_settings"
    ADD CONSTRAINT "unique_tenant_tax_settings" UNIQUE ("tenant_id");



ALTER TABLE ONLY "public"."t_user_profiles"
    ADD CONSTRAINT "unique_user_id" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."t_query_cache"
    ADD CONSTRAINT "uq_query_cache_unified" UNIQUE ("cache_type", "scope", "scope_id", "query_normalized");



ALTER TABLE ONLY "public"."t_sequence_counters"
    ADD CONSTRAINT "uq_sequence_counter" UNIQUE ("sequence_code", "tenant_id", "is_live");



ALTER TABLE ONLY "public"."n_jtd_status_flows"
    ADD CONSTRAINT "uq_status_flow" UNIQUE ("event_type_code", "from_status_id", "to_status_id");



ALTER TABLE ONLY "public"."n_jtd_statuses"
    ADD CONSTRAINT "uq_status_per_event_type" UNIQUE ("event_type_code", "code");



ALTER TABLE ONLY "public"."n_jtd_templates"
    ADD CONSTRAINT "uq_template" UNIQUE ("tenant_id", "template_key", "channel_code", "is_live");



ALTER TABLE ONLY "public"."n_jtd_tenant_config"
    ADD CONSTRAINT "uq_tenant_config" UNIQUE ("tenant_id", "is_live");



ALTER TABLE ONLY "public"."n_jtd_tenant_source_config"
    ADD CONSTRAINT "uq_tenant_source_config" UNIQUE ("tenant_id", "source_type_code", "is_live");



CREATE INDEX "idx_activity_logs_created" ON "public"."t_group_activity_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_logs_group" ON "public"."t_group_activity_logs" USING "btree" ("group_id");



CREATE INDEX "idx_activity_logs_tenant" ON "public"."t_group_activity_logs" USING "btree" ("tenant_id");



CREATE INDEX "idx_activity_logs_type" ON "public"."t_group_activity_logs" USING "btree" ("activity_type");



CREATE INDEX "idx_ai_sessions_channel" ON "public"."t_ai_agent_sessions" USING "btree" ("channel", "phone_normalized");



CREATE INDEX "idx_ai_sessions_expires" ON "public"."t_ai_agent_sessions" USING "btree" ("expires_at") WHERE (("is_active" = true) AND ("expires_at" IS NOT NULL));



CREATE INDEX "idx_ai_sessions_group" ON "public"."t_ai_agent_sessions" USING "btree" ("group_id") WHERE ("is_active" = true);



CREATE INDEX "idx_ai_sessions_phone" ON "public"."t_ai_agent_sessions" USING "btree" ("phone") WHERE ("is_active" = true);



CREATE INDEX "idx_ai_sessions_phone_norm" ON "public"."t_ai_agent_sessions" USING "btree" ("phone_normalized") WHERE ("is_active" = true);



CREATE INDEX "idx_ai_sessions_tenant_user" ON "public"."t_ai_agent_sessions" USING "btree" ("tenant_id", "user_id") WHERE ("is_active" = true);



CREATE INDEX "idx_ai_sessions_user" ON "public"."t_ai_agent_sessions" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE INDEX "idx_audit_action" ON "public"."t_invitation_audit_log" USING "btree" ("action");



CREATE INDEX "idx_audit_invitation" ON "public"."t_invitation_audit_log" USING "btree" ("invitation_id");



CREATE INDEX "idx_audit_logs_action" ON "public"."t_audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."t_audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_audit_logs_resource" ON "public"."t_audit_logs" USING "btree" ("resource");



CREATE INDEX "idx_audit_logs_severity" ON "public"."t_audit_logs" USING "btree" ("severity");



CREATE INDEX "idx_audit_logs_tenant_id" ON "public"."t_audit_logs" USING "btree" ("tenant_id");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."t_audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_audit_performed_at" ON "public"."t_invitation_audit_log" USING "btree" ("performed_at");



CREATE INDEX "idx_block_categories_active" ON "public"."m_block_categories" USING "btree" ("active");



CREATE INDEX "idx_block_categories_sort" ON "public"."m_block_categories" USING "btree" ("sort_order");



CREATE INDEX "idx_block_masters_active" ON "public"."m_block_masters" USING "btree" ("active");



CREATE INDEX "idx_block_masters_category" ON "public"."m_block_masters" USING "btree" ("category_id");



CREATE INDEX "idx_block_variants_active" ON "public"."m_block_variants" USING "btree" ("active");



CREATE INDEX "idx_block_variants_block" ON "public"."m_block_variants" USING "btree" ("block_id");



CREATE INDEX "idx_business_groups_active" ON "public"."t_business_groups" USING "btree" ("is_active");



CREATE INDEX "idx_business_groups_type" ON "public"."t_business_groups" USING "btree" ("group_type");



CREATE INDEX "idx_campaigns_code" ON "public"."t_campaigns" USING "btree" ("campaign_code");



CREATE INDEX "idx_campaigns_created_at" ON "public"."t_campaigns" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_campaigns_dates" ON "public"."t_campaigns" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_campaigns_products" ON "public"."t_campaigns" USING "gin" ("products");



CREATE INDEX "idx_campaigns_status" ON "public"."t_campaigns" USING "btree" ("status") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_catalog_items_industry_category" ON "public"."t_catalog_items" USING "btree" ("industry_id", "category_id") WHERE ("is_live" = true);



CREATE INDEX "idx_catalog_items_parent" ON "public"."t_catalog_items" USING "btree" ("parent_id") WHERE ("parent_id" IS NOT NULL);



CREATE INDEX "idx_catalog_items_search" ON "public"."t_catalog_items" USING "gin" ("search_vector");



CREATE INDEX "idx_catalog_resources_availability" ON "public"."t_catalog_resources" USING "btree" ("is_available", "status") WHERE ("is_live" = true);



CREATE INDEX "idx_catalog_resources_skills" ON "public"."t_catalog_resources" USING "gin" ("skills");



CREATE INDEX "idx_catalog_resources_tenant_type" ON "public"."t_catalog_resources" USING "btree" ("tenant_id", "resource_type_id", "status");



CREATE INDEX "idx_category_details_category" ON "public"."m_category_details" USING "btree" ("category_id", "is_active", "sequence_no");



CREATE INDEX "idx_category_master_active" ON "public"."m_category_master" USING "btree" ("category_name", "is_active");



CREATE INDEX "idx_chat_sessions_channel" ON "public"."t_chat_sessions" USING "btree" ("channel", "user_id");



CREATE INDEX "idx_chat_sessions_expires" ON "public"."t_chat_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_chat_sessions_user" ON "public"."t_chat_sessions" USING "btree" ("user_id", "tenant_id");



CREATE INDEX "idx_contacts_classifications" ON "public"."t_contacts" USING "gin" ("classifications");



CREATE INDEX "idx_contacts_contact_number" ON "public"."t_contacts" USING "btree" ("contact_number");



CREATE INDEX "idx_contacts_created_at" ON "public"."familyknows_contacts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_contacts_email" ON "public"."familyknows_contacts" USING "btree" ("email");



CREATE INDEX "idx_contacts_list_query" ON "public"."t_contacts" USING "btree" ("tenant_id", "is_live", "status", "type", "created_at");



CREATE INDEX "idx_contacts_parent_contact_ids" ON "public"."t_contacts" USING "gin" ("parent_contact_ids");



CREATE INDEX "idx_contacts_search" ON "public"."t_contacts" USING "gin" ("to_tsvector"('"english"'::"regconfig", (((COALESCE("name", ''::character varying))::"text" || ' '::"text") || (COALESCE("company_name", ''::character varying))::"text")));



CREATE INDEX "idx_contacts_status" ON "public"."familyknows_contacts" USING "btree" ("status");



CREATE INDEX "idx_contacts_tenant_contact_number" ON "public"."t_contacts" USING "btree" ("tenant_id", "contact_number");



CREATE INDEX "idx_contacts_tenant_env" ON "public"."t_contacts" USING "btree" ("tenant_id", "is_live") WHERE ("tenant_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_contacts_unique_contact_number" ON "public"."t_contacts" USING "btree" ("tenant_id", "contact_number", "is_live") WHERE ("contact_number" IS NOT NULL);



CREATE INDEX "idx_domain_mappings_hash" ON "public"."t_domain_mappings" USING "btree" ("domain_hash");



CREATE INDEX "idx_domain_mappings_region" ON "public"."t_domain_mappings" USING "btree" ("region");



CREATE INDEX "idx_group_memberships_embedding" ON "public"."t_group_memberships" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_group_memberships_group" ON "public"."t_group_memberships" USING "btree" ("group_id");



CREATE INDEX "idx_group_memberships_status" ON "public"."t_group_memberships" USING "btree" ("status", "is_active");



CREATE INDEX "idx_group_memberships_tenant" ON "public"."t_group_memberships" USING "btree" ("tenant_id");



CREATE INDEX "idx_idempotency_keys_cleanup" ON "public"."t_idempotency_keys" USING "btree" ("created_at");



CREATE INDEX "idx_intent_definitions_active" ON "public"."t_intent_definitions" USING "btree" ("is_active");



CREATE INDEX "idx_intent_definitions_code" ON "public"."t_intent_definitions" USING "btree" ("intent_code");



CREATE INDEX "idx_intent_definitions_type" ON "public"."t_intent_definitions" USING "btree" ("intent_type");



CREATE INDEX "idx_invitations_codes" ON "public"."t_user_invitations" USING "btree" ("user_code", "secret_code");



CREATE INDEX "idx_invitations_email" ON "public"."t_user_invitations" USING "btree" ("email") WHERE ("email" IS NOT NULL);



CREATE INDEX "idx_invitations_expires" ON "public"."t_user_invitations" USING "btree" ("expires_at") WHERE (("status")::"text" = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'resent'::character varying])::"text"[]));



CREATE INDEX "idx_invitations_invited_by" ON "public"."t_user_invitations" USING "btree" ("invited_by");



CREATE INDEX "idx_invitations_mobile" ON "public"."t_user_invitations" USING "btree" ("mobile_number") WHERE ("mobile_number" IS NOT NULL);



CREATE INDEX "idx_invitations_tenant_status" ON "public"."t_user_invitations" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_invoice_created_at" ON "public"."t_bm_invoice" USING "btree" ("created_at");



CREATE INDEX "idx_invoice_due_date" ON "public"."t_bm_invoice" USING "btree" ("due_date");



CREATE INDEX "idx_invoice_items_gin" ON "public"."t_bm_invoice" USING "gin" ("items");



CREATE INDEX "idx_invoice_status" ON "public"."t_bm_invoice" USING "btree" ("status");



CREATE INDEX "idx_invoice_subscription_id" ON "public"."t_bm_invoice" USING "btree" ("subscription_id");



CREATE INDEX "idx_jtd_history_action" ON "public"."n_jtd_history" USING "btree" ("action", "created_at" DESC);



CREATE INDEX "idx_jtd_history_jtd" ON "public"."n_jtd_history" USING "btree" ("jtd_id", "created_at" DESC);



CREATE INDEX "idx_jtd_is_live" ON "public"."n_jtd" USING "btree" ("is_live");



CREATE INDEX "idx_jtd_performer" ON "public"."n_jtd" USING "btree" ("performed_by_type", "performed_by_id");



CREATE INDEX "idx_jtd_provider" ON "public"."n_jtd" USING "btree" ("provider_code", "provider_message_id") WHERE ("provider_message_id" IS NOT NULL);



CREATE INDEX "idx_jtd_recipient" ON "public"."n_jtd" USING "btree" ("recipient_id") WHERE ("recipient_id" IS NOT NULL);



CREATE INDEX "idx_jtd_retry" ON "public"."n_jtd" USING "btree" ("next_retry_at") WHERE ((("status_code")::"text" = 'failed'::"text") AND ("retry_count" < "max_retries"));



CREATE INDEX "idx_jtd_scheduled" ON "public"."n_jtd" USING "btree" ("scheduled_at") WHERE (("status_code")::"text" = ANY ((ARRAY['created'::character varying, 'pending'::character varying, 'scheduled'::character varying])::"text"[]));



CREATE INDEX "idx_jtd_source" ON "public"."n_jtd" USING "btree" ("source_type_code", "source_id");



CREATE INDEX "idx_jtd_status_history_jtd" ON "public"."n_jtd_status_history" USING "btree" ("jtd_id", "created_at" DESC);



CREATE INDEX "idx_jtd_status_history_status" ON "public"."n_jtd_status_history" USING "btree" ("to_status_code", "created_at" DESC);



CREATE INDEX "idx_jtd_tenant_created" ON "public"."n_jtd" USING "btree" ("tenant_id", "created_at" DESC, "is_live");



CREATE INDEX "idx_jtd_tenant_event_type" ON "public"."n_jtd" USING "btree" ("tenant_id", "event_type_code", "is_live");



CREATE INDEX "idx_jtd_tenant_status" ON "public"."n_jtd" USING "btree" ("tenant_id", "status_code", "is_live");



CREATE INDEX "idx_leads_assigned_to" ON "public"."t_campaign_leads" USING "btree" ("assigned_to") WHERE ("assigned_to" IS NOT NULL);



CREATE INDEX "idx_leads_attending_breakfast" ON "public"."t_campaign_leads" USING "btree" ("attending_breakfast") WHERE ("attending_breakfast" = true);



CREATE INDEX "idx_leads_both_products" ON "public"."t_campaign_leads" USING "btree" ("interested_contractnest", "interested_familyknows") WHERE (("interested_contractnest" = true) AND ("interested_familyknows" = true));



CREATE INDEX "idx_leads_campaign_code" ON "public"."t_campaign_leads" USING "btree" ("campaign_code");



CREATE INDEX "idx_leads_campaign_id" ON "public"."t_campaign_leads" USING "btree" ("campaign_id");



CREATE INDEX "idx_leads_campaign_status" ON "public"."t_campaign_leads" USING "btree" ("campaign_code", "status");



CREATE INDEX "idx_leads_contractnest" ON "public"."t_campaign_leads" USING "btree" ("interested_contractnest") WHERE ("interested_contractnest" = true);



CREATE INDEX "idx_leads_converted" ON "public"."t_campaign_leads" USING "btree" ("converted") WHERE ("converted" = true);



CREATE INDEX "idx_leads_created_at" ON "public"."t_campaign_leads" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_leads_email" ON "public"."t_campaign_leads" USING "btree" ("email");



CREATE INDEX "idx_leads_familyknows" ON "public"."t_campaign_leads" USING "btree" ("interested_familyknows") WHERE ("interested_familyknows" = true);



CREATE INDEX "idx_leads_hot" ON "public"."t_campaign_leads" USING "btree" ("campaign_code", "status", "quality_score" DESC) WHERE ((("status")::"text" = ANY ((ARRAY['contacted'::character varying, 'meeting_scheduled'::character varying, 'demo_completed'::character varying])::"text"[])) AND ("quality_score" >= 7));



CREATE INDEX "idx_leads_last_contact" ON "public"."t_campaign_leads" USING "btree" ("last_contact_at" DESC NULLS LAST);



CREATE INDEX "idx_leads_meeting_scheduled" ON "public"."t_campaign_leads" USING "btree" ("meeting_scheduled", "meeting_date") WHERE ("meeting_scheduled" = true);



CREATE INDEX "idx_leads_name_fts" ON "public"."t_campaign_leads" USING "gin" ("to_tsvector"('"english"'::"regconfig", (((COALESCE("name", ''::character varying))::"text" || ' '::"text") || (COALESCE("company", ''::character varying))::"text")));



CREATE INDEX "idx_leads_notes_fts" ON "public"."t_campaign_leads" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("notes", ''::"text")));



CREATE INDEX "idx_leads_pdfs_sent" ON "public"."t_campaign_leads" USING "gin" ("pdfs_sent");



CREATE INDEX "idx_leads_phone" ON "public"."t_campaign_leads" USING "btree" ("phone");



CREATE INDEX "idx_leads_quality_score" ON "public"."t_campaign_leads" USING "btree" ("quality_score" DESC) WHERE ("quality_score" IS NOT NULL);



CREATE INDEX "idx_leads_status" ON "public"."t_campaign_leads" USING "btree" ("status");



CREATE INDEX "idx_leads_tags" ON "public"."t_campaign_leads" USING "gin" ("tags");



CREATE INDEX "idx_leads_whatsapp_delivered" ON "public"."t_campaign_leads" USING "btree" ("whatsapp_delivered") WHERE ("whatsapp_delivered" = false);



CREATE INDEX "idx_m_catalog_categories_industry" ON "public"."m_catalog_categories" USING "btree" ("industry_id", "is_active", "sort_order");



CREATE INDEX "idx_m_catalog_categories_pricing_model" ON "public"."m_catalog_categories" USING "btree" ("default_pricing_model");



CREATE INDEX "idx_m_catalog_categories_variants" ON "public"."m_catalog_categories" USING "gin" ("common_variants");



CREATE INDEX "idx_m_catalog_industries_active" ON "public"."m_catalog_industries" USING "btree" ("is_active", "sort_order");



CREATE INDEX "idx_m_catalog_industries_name" ON "public"."m_catalog_industries" USING "btree" ("name");



CREATE INDEX "idx_m_catalog_pricing_templates_category" ON "public"."m_catalog_pricing_templates" USING "btree" ("category_id", "is_active");



CREATE INDEX "idx_m_catalog_pricing_templates_industry" ON "public"."m_catalog_pricing_templates" USING "btree" ("industry_id", "is_active");



CREATE INDEX "idx_m_catalog_pricing_templates_recommended" ON "public"."m_catalog_pricing_templates" USING "btree" ("is_recommended", "popularity_score" DESC);



CREATE INDEX "idx_m_catalog_pricing_templates_rule_type" ON "public"."m_catalog_pricing_templates" USING "btree" ("rule_type");



CREATE INDEX "idx_m_catalog_resource_templates_industry" ON "public"."m_catalog_resource_templates" USING "btree" ("industry_id", "is_active");



CREATE INDEX "idx_m_catalog_resource_templates_recommended" ON "public"."m_catalog_resource_templates" USING "btree" ("is_recommended", "popularity_score" DESC);



CREATE INDEX "idx_m_catalog_resource_templates_type" ON "public"."m_catalog_resource_templates" USING "btree" ("resource_type_id", "is_active");



CREATE INDEX "idx_m_catalog_resource_types_active" ON "public"."m_catalog_resource_types" USING "btree" ("is_active", "sort_order");



CREATE INDEX "idx_m_products_code" ON "public"."m_products" USING "btree" ("code");



CREATE INDEX "idx_m_products_is_active" ON "public"."m_products" USING "btree" ("is_active");



CREATE INDEX "idx_n_deliveries_event" ON "public"."n_deliveries" USING "btree" ("event_id");



CREATE INDEX "idx_n_deliveries_provider" ON "public"."n_deliveries" USING "btree" ("provider", "provider_message_id");



CREATE INDEX "idx_onboarding_step_tenant" ON "public"."t_onboarding_step_status" USING "btree" ("tenant_id");



CREATE INDEX "idx_plan_version_effective_date" ON "public"."t_bm_plan_version" USING "btree" ("effective_date");



CREATE INDEX "idx_plan_version_features_gin" ON "public"."t_bm_plan_version" USING "gin" ("features");



CREATE INDEX "idx_plan_version_is_active" ON "public"."t_bm_plan_version" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_plan_version_notifications_gin" ON "public"."t_bm_plan_version" USING "gin" ("notifications");



CREATE INDEX "idx_plan_version_plan_id" ON "public"."t_bm_plan_version" USING "btree" ("plan_id");



CREATE INDEX "idx_plan_version_tiers_gin" ON "public"."t_bm_plan_version" USING "gin" ("tiers");



CREATE INDEX "idx_pricing_plan_is_archived" ON "public"."t_bm_pricing_plan" USING "btree" ("is_archived") WHERE ("is_archived" = false);



CREATE INDEX "idx_pricing_plan_is_visible" ON "public"."t_bm_pricing_plan" USING "btree" ("is_visible") WHERE ("is_visible" = true);



CREATE INDEX "idx_pricing_plan_plan_type" ON "public"."t_bm_pricing_plan" USING "btree" ("plan_type");



CREATE INDEX "idx_pricing_plan_product_code" ON "public"."t_bm_pricing_plan" USING "btree" ("product_code");



CREATE INDEX "idx_pricing_plan_product_visible" ON "public"."t_bm_pricing_plan" USING "btree" ("product_code", "is_visible") WHERE ("is_archived" = false);



CREATE INDEX "idx_query_cache_embedding" ON "public"."t_query_cache" USING "ivfflat" ("query_embedding" "extensions"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_query_cache_expires" ON "public"."t_query_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_query_cache_failures" ON "public"."t_query_cache" USING "btree" ("cache_type", "failure_count") WHERE ("failure_count" > 0);



CREATE INDEX "idx_query_cache_lookup" ON "public"."t_query_cache" USING "btree" ("group_id", "query_normalized");



CREATE INDEX "idx_query_cache_scope" ON "public"."t_query_cache" USING "btree" ("scope", "scope_id");



CREATE INDEX "idx_query_cache_type" ON "public"."t_query_cache" USING "btree" ("cache_type");



CREATE INDEX "idx_query_cache_unified_lookup" ON "public"."t_query_cache" USING "btree" ("cache_type", "scope", "scope_id", "query_normalized");



CREATE INDEX "idx_resource_pricing_active" ON "public"."t_catalog_resource_pricing" USING "btree" ("resource_id", "is_active", "effective_from", "effective_to");



CREATE INDEX "idx_semantic_clusters_category" ON "public"."t_semantic_clusters" USING "btree" ("category");



CREATE INDEX "idx_semantic_clusters_membership" ON "public"."t_semantic_clusters" USING "btree" ("membership_id");



CREATE INDEX "idx_semantic_clusters_primary_term" ON "public"."t_semantic_clusters" USING "btree" ("primary_term");



CREATE INDEX "idx_semantic_clusters_tenant_active" ON "public"."t_semantic_clusters" USING "btree" ("tenant_id", "is_active") WHERE ("tenant_id" IS NOT NULL);



CREATE INDEX "idx_semantic_clusters_tenant_id" ON "public"."t_semantic_clusters" USING "btree" ("tenant_id") WHERE ("tenant_id" IS NOT NULL);



CREATE INDEX "idx_sequence_counters_code_tenant" ON "public"."t_sequence_counters" USING "btree" ("sequence_code", "tenant_id", "is_live");



CREATE INDEX "idx_sequence_counters_is_live" ON "public"."t_sequence_counters" USING "btree" ("is_live");



CREATE INDEX "idx_sequence_counters_lookup" ON "public"."t_sequence_counters" USING "btree" ("tenant_id", "sequence_type_id", "is_live");



CREATE INDEX "idx_sequence_counters_tenant" ON "public"."t_sequence_counters" USING "btree" ("tenant_id");



CREATE INDEX "idx_sequence_counters_tenant_type" ON "public"."t_sequence_counters" USING "btree" ("tenant_id", "sequence_type_id");



CREATE INDEX "idx_service_resources_resource_type" ON "public"."t_catalog_service_resources" USING "btree" ("resource_type_id", "tenant_id");



CREATE INDEX "idx_service_resources_service" ON "public"."t_catalog_service_resources" USING "btree" ("service_id", "is_active");



CREATE INDEX "idx_smartprofiles_embedding" ON "public"."t_tenant_smartprofiles" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_smartprofiles_keywords" ON "public"."t_tenant_smartprofiles" USING "gin" ("approved_keywords");



CREATE INDEX "idx_smartprofiles_profile_type" ON "public"."t_tenant_smartprofiles" USING "btree" ("profile_type");



CREATE INDEX "idx_smartprofiles_status" ON "public"."t_tenant_smartprofiles" USING "btree" ("status", "is_active");



CREATE INDEX "idx_statuses_event_type" ON "public"."n_jtd_statuses" USING "btree" ("event_type_code", "is_active");



CREATE INDEX "idx_subscription_usage_subscription_id" ON "public"."t_bm_subscription_usage" USING "btree" ("subscription_id");



CREATE INDEX "idx_subscription_usage_type_identifier" ON "public"."t_bm_subscription_usage" USING "btree" ("type", "identifier");



CREATE INDEX "idx_t_contact_addresses_contact_id" ON "public"."t_contact_addresses" USING "btree" ("contact_id");



CREATE INDEX "idx_t_contact_addresses_primary" ON "public"."t_contact_addresses" USING "btree" ("contact_id", "is_primary") WHERE ("is_primary" = true);



CREATE INDEX "idx_t_contact_channels_contact_id" ON "public"."t_contact_channels" USING "btree" ("contact_id");



CREATE INDEX "idx_t_contact_channels_email" ON "public"."t_contact_channels" USING "btree" ("value") WHERE (("channel_type")::"text" = 'email'::"text");



CREATE INDEX "idx_t_contact_channels_mobile" ON "public"."t_contact_channels" USING "btree" ("value") WHERE (("channel_type")::"text" = 'mobile'::"text");



CREATE INDEX "idx_t_contact_channels_primary" ON "public"."t_contact_channels" USING "btree" ("contact_id", "is_primary") WHERE ("is_primary" = true);



CREATE INDEX "idx_t_contact_channels_value" ON "public"."t_contact_channels" USING "btree" ("value");



CREATE INDEX "idx_t_contacts_auth_user_id" ON "public"."t_contacts" USING "btree" ("auth_user_id");



CREATE INDEX "idx_t_contacts_classifications" ON "public"."t_contacts" USING "gin" ("classifications");



CREATE INDEX "idx_t_contacts_compliance" ON "public"."t_contacts" USING "gin" ("compliance_numbers");



CREATE INDEX "idx_t_contacts_parent_id" ON "public"."t_contacts" USING "btree" ("parent_contact_id");



CREATE INDEX "idx_t_contacts_potential_duplicate" ON "public"."t_contacts" USING "btree" ("potential_duplicate") WHERE ("potential_duplicate" = true);



CREATE INDEX "idx_t_contacts_search" ON "public"."t_contacts" USING "gin" ("to_tsvector"('"english"'::"regconfig", (((((COALESCE("name", ''::character varying))::"text" || ' '::"text") || (COALESCE("company_name", ''::character varying))::"text") || ' '::"text") || (COALESCE("designation", ''::character varying))::"text")));



CREATE INDEX "idx_t_contacts_status" ON "public"."t_contacts" USING "btree" ("status");



CREATE INDEX "idx_t_contacts_tags" ON "public"."t_contacts" USING "gin" ("tags");



CREATE INDEX "idx_t_contacts_tenant_id" ON "public"."t_contacts" USING "btree" ("tenant_id");



CREATE INDEX "idx_t_contacts_type" ON "public"."t_contacts" USING "btree" ("type");



CREATE INDEX "idx_tax_settings_tenant_id" ON "public"."t_tax_settings" USING "btree" ("tenant_id");



CREATE INDEX "idx_templates_lookup" ON "public"."n_jtd_templates" USING "btree" ("channel_code", "source_type_code", "is_active");



CREATE INDEX "idx_tenant_domains_hash" ON "public"."t_tenant_domains" USING "btree" ("domain_hash");



CREATE INDEX "idx_tenant_domains_tenant" ON "public"."t_tenant_domains" USING "btree" ("tenant_id");



CREATE INDEX "idx_tenant_files_category" ON "public"."t_tenant_files" USING "btree" ("file_category");



CREATE INDEX "idx_tenant_files_created_at" ON "public"."t_tenant_files" USING "btree" ("created_at");



CREATE INDEX "idx_tenant_files_metadata" ON "public"."t_tenant_files" USING "gin" ("metadata");



CREATE INDEX "idx_tenant_files_tenant_id" ON "public"."t_tenant_files" USING "btree" ("tenant_id");



CREATE INDEX "idx_tenant_onboarding_tenant" ON "public"."t_tenant_onboarding" USING "btree" ("tenant_id");



CREATE INDEX "idx_tenant_profiles_short_description" ON "public"."t_tenant_profiles" USING "gin" ("to_tsvector"('"english"'::"regconfig", (COALESCE("short_description", ''::character varying))::"text"));



CREATE INDEX "idx_tenant_profiles_whatsapp" ON "public"."t_tenant_profiles" USING "btree" ("business_whatsapp");



CREATE INDEX "idx_tenant_regions_region" ON "public"."t_tenant_regions" USING "btree" ("region");



CREATE INDEX "idx_tenant_regions_tenant" ON "public"."t_tenant_regions" USING "btree" ("tenant_id");



CREATE INDEX "idx_tenant_subscription_current_tier_gin" ON "public"."t_bm_tenant_subscription" USING "gin" ("current_tier");



CREATE INDEX "idx_tenant_subscription_renewal_date" ON "public"."t_bm_tenant_subscription" USING "btree" ("renewal_date");



CREATE INDEX "idx_tenant_subscription_status" ON "public"."t_bm_tenant_subscription" USING "btree" ("status");



CREATE INDEX "idx_tenant_subscription_tenant_id" ON "public"."t_bm_tenant_subscription" USING "btree" ("tenant_id");



CREATE INDEX "idx_tenant_subscription_trial_ends" ON "public"."t_bm_tenant_subscription" USING "btree" ("trial_ends");



CREATE INDEX "idx_tenant_subscription_version_id" ON "public"."t_bm_tenant_subscription" USING "btree" ("version_id");



CREATE INDEX "idx_tool_results_created" ON "public"."t_tool_results" USING "btree" ("created_at");



CREATE INDEX "idx_tool_results_session" ON "public"."t_tool_results" USING "btree" ("session_id", "created_at" DESC);



CREATE INDEX "idx_user_auth_methods_auth_identifier" ON "public"."t_user_auth_methods" USING "btree" ("auth_identifier");



CREATE INDEX "idx_user_auth_methods_auth_type" ON "public"."t_user_auth_methods" USING "btree" ("auth_type");



CREATE INDEX "idx_user_auth_methods_user_id" ON "public"."t_user_auth_methods" USING "btree" ("user_id");



CREATE INDEX "idx_user_invitations_country_code" ON "public"."t_user_invitations" USING "btree" ("country_code");



CREATE INDEX "idx_waitlist_created_at" ON "public"."familyknows_waitlist" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_waitlist_email" ON "public"."familyknows_waitlist" USING "btree" ("email");



CREATE INDEX "idx_waitlist_plan_type" ON "public"."familyknows_waitlist" USING "btree" ("plan_type");



CREATE INDEX "idx_waitlist_status" ON "public"."familyknows_waitlist" USING "btree" ("status");



CREATE INDEX "t_category_resources_master_active_idx" ON "public"."t_category_resources_master" USING "btree" ("is_active", "is_live");



CREATE INDEX "t_category_resources_master_resource_type_idx" ON "public"."t_category_resources_master" USING "btree" ("resource_type_id");



CREATE INDEX "t_category_resources_master_sequence_idx" ON "public"."t_category_resources_master" USING "btree" ("sequence_no");



CREATE UNIQUE INDEX "unique_active_invitation_email" ON "public"."t_user_invitations" USING "btree" ("tenant_id", "email") WHERE ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'resent'::character varying])::"text"[])) AND ("email" IS NOT NULL));



CREATE UNIQUE INDEX "unique_active_invitation_mobile" ON "public"."t_user_invitations" USING "btree" ("tenant_id", "mobile_number") WHERE ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'resent'::character varying])::"text"[])) AND ("mobile_number" IS NOT NULL));



CREATE UNIQUE INDEX "unique_active_name_per_tenant" ON "public"."t_catalog_items" USING "btree" ("tenant_id", "name", "is_live") WHERE ("status" = true);



CREATE OR REPLACE TRIGGER "after_tenant_created" AFTER INSERT ON "public"."t_tenants" FOR EACH ROW EXECUTE FUNCTION "public"."initialize_tenant_onboarding"();



CREATE OR REPLACE TRIGGER "enforce_single_primary_auth_method" BEFORE INSERT OR UPDATE ON "public"."t_user_auth_methods" FOR EACH ROW WHEN (("new"."is_primary" = true)) EXECUTE FUNCTION "public"."ensure_single_primary_auth_method"();



CREATE OR REPLACE TRIGGER "increment_campaign_conversions_trigger" AFTER UPDATE ON "public"."t_campaign_leads" FOR EACH ROW EXECUTE FUNCTION "public"."increment_campaign_conversions"();



CREATE OR REPLACE TRIGGER "increment_campaign_leads_trigger" AFTER INSERT ON "public"."t_campaign_leads" FOR EACH ROW EXECUTE FUNCTION "public"."increment_campaign_leads"();



CREATE OR REPLACE TRIGGER "m_catalog_categories_update_trigger" BEFORE UPDATE ON "public"."m_catalog_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_master_catalog_timestamp"();



CREATE OR REPLACE TRIGGER "m_catalog_industries_update_trigger" BEFORE UPDATE ON "public"."m_catalog_industries" FOR EACH ROW EXECUTE FUNCTION "public"."update_master_catalog_timestamp"();



CREATE OR REPLACE TRIGGER "m_catalog_pricing_templates_update_trigger" BEFORE UPDATE ON "public"."m_catalog_pricing_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_master_catalog_timestamp"();



CREATE OR REPLACE TRIGGER "trg_auto_contact_number" BEFORE INSERT ON "public"."t_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."auto_generate_contact_number"();



CREATE OR REPLACE TRIGGER "trg_business_groups_updated_at" BEFORE UPDATE ON "public"."t_business_groups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_group_memberships_updated_at" BEFORE UPDATE ON "public"."t_group_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_invalidate_cache_on_membership_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."t_group_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."invalidate_group_cache"();



CREATE OR REPLACE TRIGGER "trg_jtd_channels_updated_at" BEFORE UPDATE ON "public"."n_jtd_channels" FOR EACH ROW EXECUTE FUNCTION "public"."jtd_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_jtd_creation" AFTER INSERT ON "public"."n_jtd" FOR EACH ROW EXECUTE FUNCTION "public"."jtd_log_creation"();



CREATE OR REPLACE TRIGGER "trg_jtd_enqueue" BEFORE INSERT ON "public"."n_jtd" FOR EACH ROW EXECUTE FUNCTION "public"."jtd_enqueue_on_insert"();



CREATE OR REPLACE TRIGGER "trg_jtd_event_types_updated_at" BEFORE UPDATE ON "public"."n_jtd_event_types" FOR EACH ROW EXECUTE FUNCTION "public"."jtd_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_jtd_source_types_updated_at" BEFORE UPDATE ON "public"."n_jtd_source_types" FOR EACH ROW EXECUTE FUNCTION "public"."jtd_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_jtd_status_change" BEFORE UPDATE ON "public"."n_jtd" FOR EACH ROW EXECUTE FUNCTION "public"."jtd_log_status_change"();



CREATE OR REPLACE TRIGGER "trg_jtd_status_flows_updated_at" BEFORE UPDATE ON "public"."n_jtd_status_flows" FOR EACH ROW EXECUTE FUNCTION "public"."jtd_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_jtd_statuses_updated_at" BEFORE UPDATE ON "public"."n_jtd_statuses" FOR EACH ROW EXECUTE FUNCTION "public"."jtd_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_jtd_templates_updated_at" BEFORE UPDATE ON "public"."n_jtd_templates" FOR EACH ROW EXECUTE FUNCTION "public"."jtd_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_jtd_tenant_config_updated_at" BEFORE UPDATE ON "public"."n_jtd_tenant_config" FOR EACH ROW EXECUTE FUNCTION "public"."jtd_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_jtd_tenant_source_config_updated_at" BEFORE UPDATE ON "public"."n_jtd_tenant_source_config" FOR EACH ROW EXECUTE FUNCTION "public"."jtd_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_jtd_updated_at" BEFORE UPDATE ON "public"."n_jtd" FOR EACH ROW EXECUTE FUNCTION "public"."jtd_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sequence_counters_updated_at" BEFORE UPDATE ON "public"."t_sequence_counters" FOR EACH ROW EXECUTE FUNCTION "public"."update_sequence_counters_updated_at"();



CREATE OR REPLACE TRIGGER "trg_smartprofiles_updated_at" BEFORE UPDATE ON "public"."t_tenant_smartprofiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_smartprofile_timestamp"();



CREATE OR REPLACE TRIGGER "trg_system_actors_updated_at" BEFORE UPDATE ON "public"."n_system_actors" FOR EACH ROW EXECUTE FUNCTION "public"."jtd_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_update_group_member_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."t_group_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_group_member_count"();



CREATE OR REPLACE TRIGGER "trigger_check_invitation_expiry" BEFORE INSERT OR UPDATE ON "public"."t_user_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."check_invitation_expiry"();



CREATE OR REPLACE TRIGGER "trigger_m_products_updated_at" BEFORE UPDATE ON "public"."m_products" FOR EACH ROW EXECUTE FUNCTION "public"."update_m_products_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_tax_settings_updated_at" BEFORE UPDATE ON "public"."t_tax_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contacts_updated_at" BEFORE UPDATE ON "public"."familyknows_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_domain_mappings_updated_at" BEFORE UPDATE ON "public"."t_domain_mappings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_t_campaign_leads_updated_at" BEFORE UPDATE ON "public"."t_campaign_leads" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_t_campaigns_updated_at" BEFORE UPDATE ON "public"."t_campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_t_contact_addresses_updated_at" BEFORE UPDATE ON "public"."t_contact_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_t_contact_channels_updated_at" BEFORE UPDATE ON "public"."t_contact_channels" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_t_contacts_updated_at" BEFORE UPDATE ON "public"."t_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenant_domains_updated_at" BEFORE UPDATE ON "public"."t_tenant_domains" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenant_regions_updated_at" BEFORE UPDATE ON "public"."t_tenant_regions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_auth_methods_updated_at" BEFORE UPDATE ON "public"."t_user_auth_methods" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_waitlist_updated_at" BEFORE UPDATE ON "public"."familyknows_waitlist" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."c_category_details"
    ADD CONSTRAINT "c_category_details_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."c_category_master"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."m_catalog_categories"
    ADD CONSTRAINT "fk_category_industry" FOREIGN KEY ("industry_id") REFERENCES "public"."m_catalog_industries"("id");



ALTER TABLE ONLY "public"."m_catalog_pricing_templates"
    ADD CONSTRAINT "fk_pricing_template_category" FOREIGN KEY ("category_id") REFERENCES "public"."m_catalog_categories"("id");



ALTER TABLE ONLY "public"."m_catalog_pricing_templates"
    ADD CONSTRAINT "fk_pricing_template_industry" FOREIGN KEY ("industry_id") REFERENCES "public"."m_catalog_industries"("id");



ALTER TABLE ONLY "public"."m_block_categories"
    ADD CONSTRAINT "m_block_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."m_block_categories"("id");



ALTER TABLE ONLY "public"."m_block_masters"
    ADD CONSTRAINT "m_block_masters_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."m_block_categories"("id");



ALTER TABLE ONLY "public"."m_block_masters"
    ADD CONSTRAINT "m_block_masters_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."m_block_masters"("id");



ALTER TABLE ONLY "public"."m_block_variants"
    ADD CONSTRAINT "m_block_variants_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."m_block_masters"("id");



ALTER TABLE ONLY "public"."m_block_variants"
    ADD CONSTRAINT "m_block_variants_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."m_block_variants"("id");



ALTER TABLE ONLY "public"."m_catalog_category_industry_map"
    ADD CONSTRAINT "m_catalog_category_industry_map_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."m_catalog_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."m_catalog_category_industry_map"
    ADD CONSTRAINT "m_catalog_category_industry_map_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "public"."m_catalog_industries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."m_catalog_resource_templates"
    ADD CONSTRAINT "m_catalog_resource_templates_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "public"."m_catalog_industries"("id");



ALTER TABLE ONLY "public"."m_catalog_resource_templates"
    ADD CONSTRAINT "m_catalog_resource_templates_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "public"."m_catalog_resource_types"("id");



ALTER TABLE ONLY "public"."m_category_details"
    ADD CONSTRAINT "m_category_details_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."m_category_master"("id");



ALTER TABLE ONLY "public"."n_jtd"
    ADD CONSTRAINT "n_jtd_channel_code_fkey" FOREIGN KEY ("channel_code") REFERENCES "public"."n_jtd_channels"("code");



ALTER TABLE ONLY "public"."n_jtd"
    ADD CONSTRAINT "n_jtd_event_type_code_fkey" FOREIGN KEY ("event_type_code") REFERENCES "public"."n_jtd_event_types"("code");



ALTER TABLE ONLY "public"."n_jtd_history"
    ADD CONSTRAINT "n_jtd_history_jtd_id_fkey" FOREIGN KEY ("jtd_id") REFERENCES "public"."n_jtd"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."n_jtd"
    ADD CONSTRAINT "n_jtd_source_type_code_fkey" FOREIGN KEY ("source_type_code") REFERENCES "public"."n_jtd_source_types"("code");



ALTER TABLE ONLY "public"."n_jtd_source_types"
    ADD CONSTRAINT "n_jtd_source_types_default_event_type_fkey" FOREIGN KEY ("default_event_type") REFERENCES "public"."n_jtd_event_types"("code");



ALTER TABLE ONLY "public"."n_jtd_status_flows"
    ADD CONSTRAINT "n_jtd_status_flows_event_type_code_fkey" FOREIGN KEY ("event_type_code") REFERENCES "public"."n_jtd_event_types"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."n_jtd_status_flows"
    ADD CONSTRAINT "n_jtd_status_flows_from_status_id_fkey" FOREIGN KEY ("from_status_id") REFERENCES "public"."n_jtd_statuses"("id");



ALTER TABLE ONLY "public"."n_jtd_status_flows"
    ADD CONSTRAINT "n_jtd_status_flows_to_status_id_fkey" FOREIGN KEY ("to_status_id") REFERENCES "public"."n_jtd_statuses"("id");



ALTER TABLE ONLY "public"."n_jtd_status_history"
    ADD CONSTRAINT "n_jtd_status_history_from_status_id_fkey" FOREIGN KEY ("from_status_id") REFERENCES "public"."n_jtd_statuses"("id");



ALTER TABLE ONLY "public"."n_jtd_status_history"
    ADD CONSTRAINT "n_jtd_status_history_jtd_id_fkey" FOREIGN KEY ("jtd_id") REFERENCES "public"."n_jtd"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."n_jtd_status_history"
    ADD CONSTRAINT "n_jtd_status_history_to_status_id_fkey" FOREIGN KEY ("to_status_id") REFERENCES "public"."n_jtd_statuses"("id");



ALTER TABLE ONLY "public"."n_jtd"
    ADD CONSTRAINT "n_jtd_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."n_jtd_statuses"("id");



ALTER TABLE ONLY "public"."n_jtd_statuses"
    ADD CONSTRAINT "n_jtd_statuses_event_type_code_fkey" FOREIGN KEY ("event_type_code") REFERENCES "public"."n_jtd_event_types"("code");



ALTER TABLE ONLY "public"."n_jtd"
    ADD CONSTRAINT "n_jtd_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."n_jtd_templates"("id");



ALTER TABLE ONLY "public"."n_jtd_templates"
    ADD CONSTRAINT "n_jtd_templates_channel_code_fkey" FOREIGN KEY ("channel_code") REFERENCES "public"."n_jtd_channels"("code");



ALTER TABLE ONLY "public"."n_jtd_templates"
    ADD CONSTRAINT "n_jtd_templates_source_type_code_fkey" FOREIGN KEY ("source_type_code") REFERENCES "public"."n_jtd_source_types"("code");



ALTER TABLE ONLY "public"."n_jtd_tenant_source_config"
    ADD CONSTRAINT "n_jtd_tenant_source_config_source_type_code_fkey" FOREIGN KEY ("source_type_code") REFERENCES "public"."n_jtd_source_types"("code");



ALTER TABLE ONLY "public"."n_templates"
    ADD CONSTRAINT "n_templates_customer_code_fkey" FOREIGN KEY ("customer_code") REFERENCES "public"."n_customers"("customer_code");



ALTER TABLE ONLY "public"."n_tenant_preferences"
    ADD CONSTRAINT "n_tenant_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id");



ALTER TABLE ONLY "public"."t_ai_agent_sessions"
    ADD CONSTRAINT "t_ai_agent_sessions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."t_business_groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."t_ai_agent_sessions"
    ADD CONSTRAINT "t_ai_agent_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id");



ALTER TABLE ONLY "public"."t_ai_agent_sessions"
    ADD CONSTRAINT "t_ai_agent_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_audit_logs"
    ADD CONSTRAINT "t_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id");



ALTER TABLE ONLY "public"."t_audit_logs"
    ADD CONSTRAINT "t_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."t_bm_invoice"
    ADD CONSTRAINT "t_bm_invoice_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."t_bm_tenant_subscription"("subscription_id");



ALTER TABLE ONLY "public"."t_bm_plan_version"
    ADD CONSTRAINT "t_bm_plan_version_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."t_bm_pricing_plan"("plan_id");



ALTER TABLE ONLY "public"."t_bm_pricing_plan"
    ADD CONSTRAINT "t_bm_pricing_plan_product_code_fkey" FOREIGN KEY ("product_code") REFERENCES "public"."m_products"("code") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."t_bm_subscription_usage"
    ADD CONSTRAINT "t_bm_subscription_usage_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."t_bm_tenant_subscription"("subscription_id");



ALTER TABLE ONLY "public"."t_bm_tenant_subscription"
    ADD CONSTRAINT "t_bm_tenant_subscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id");



ALTER TABLE ONLY "public"."t_bm_tenant_subscription"
    ADD CONSTRAINT "t_bm_tenant_subscription_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."t_bm_plan_version"("version_id");



ALTER TABLE ONLY "public"."t_business_groups"
    ADD CONSTRAINT "t_business_groups_admin_tenant_id_fkey" FOREIGN KEY ("admin_tenant_id") REFERENCES "public"."t_tenants"("id");



ALTER TABLE ONLY "public"."t_campaign_leads"
    ADD CONSTRAINT "t_campaign_leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."t_campaigns"("campaign_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."t_catalog_categories"
    ADD CONSTRAINT "t_catalog_categories_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "public"."t_catalog_industries"("id");



ALTER TABLE ONLY "public"."t_catalog_items"
    ADD CONSTRAINT "t_catalog_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."m_catalog_categories"("id");



ALTER TABLE ONLY "public"."t_catalog_items"
    ADD CONSTRAINT "t_catalog_items_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "public"."m_catalog_industries"("id");



ALTER TABLE ONLY "public"."t_catalog_items"
    ADD CONSTRAINT "t_catalog_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."t_catalog_items"("id");



ALTER TABLE ONLY "public"."t_catalog_items"
    ADD CONSTRAINT "t_catalog_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_catalog_resource_pricing"
    ADD CONSTRAINT "t_catalog_resource_pricing_pricing_type_id_fkey" FOREIGN KEY ("pricing_type_id") REFERENCES "public"."m_category_details"("id");



ALTER TABLE ONLY "public"."t_catalog_resource_pricing"
    ADD CONSTRAINT "t_catalog_resource_pricing_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."t_catalog_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_catalog_resource_pricing"
    ADD CONSTRAINT "t_catalog_resource_pricing_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_catalog_resources"
    ADD CONSTRAINT "t_catalog_resources_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "public"."m_catalog_resource_types"("id");



ALTER TABLE ONLY "public"."t_catalog_resources"
    ADD CONSTRAINT "t_catalog_resources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_catalog_service_resources"
    ADD CONSTRAINT "t_catalog_service_resources_allocation_type_id_fkey" FOREIGN KEY ("allocation_type_id") REFERENCES "public"."m_category_details"("id");



ALTER TABLE ONLY "public"."t_catalog_service_resources"
    ADD CONSTRAINT "t_catalog_service_resources_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "public"."m_catalog_resource_types"("id");



ALTER TABLE ONLY "public"."t_catalog_service_resources"
    ADD CONSTRAINT "t_catalog_service_resources_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."t_catalog_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_catalog_service_resources"
    ADD CONSTRAINT "t_catalog_service_resources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_category_details"
    ADD CONSTRAINT "t_category_details_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."t_category_master"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_category_details"
    ADD CONSTRAINT "t_category_details_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_category_master"
    ADD CONSTRAINT "t_category_master_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_chat_sessions"
    ADD CONSTRAINT "t_chat_sessions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."t_business_groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."t_contact_addresses"
    ADD CONSTRAINT "t_contact_addresses_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."t_contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_contact_channels"
    ADD CONSTRAINT "t_contact_channels_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."t_contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_contacts"
    ADD CONSTRAINT "t_contacts_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."t_contacts"
    ADD CONSTRAINT "t_contacts_parent_contact_id_fkey" FOREIGN KEY ("parent_contact_id") REFERENCES "public"."t_contacts"("id");



ALTER TABLE ONLY "public"."t_group_activity_logs"
    ADD CONSTRAINT "t_group_activity_logs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."t_business_groups"("id");



ALTER TABLE ONLY "public"."t_group_activity_logs"
    ADD CONSTRAINT "t_group_activity_logs_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."t_group_memberships"("id");



ALTER TABLE ONLY "public"."t_group_activity_logs"
    ADD CONSTRAINT "t_group_activity_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id");



ALTER TABLE ONLY "public"."t_group_memberships"
    ADD CONSTRAINT "t_group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."t_business_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_group_memberships"
    ADD CONSTRAINT "t_group_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_integration_providers"
    ADD CONSTRAINT "t_integration_providers_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."t_integration_types"("id");



ALTER TABLE ONLY "public"."t_invitation_audit_log"
    ADD CONSTRAINT "t_invitation_audit_log_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "public"."t_user_invitations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_invitation_audit_log"
    ADD CONSTRAINT "t_invitation_audit_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."t_onboarding_step_status"
    ADD CONSTRAINT "t_onboarding_step_status_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_query_cache"
    ADD CONSTRAINT "t_query_cache_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."t_business_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_role_permissions"
    ADD CONSTRAINT "t_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."m_permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_role_permissions"
    ADD CONSTRAINT "t_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."t_category_details"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_role_permissions"
    ADD CONSTRAINT "t_role_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_semantic_clusters"
    ADD CONSTRAINT "t_semantic_clusters_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."t_group_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_semantic_clusters"
    ADD CONSTRAINT "t_semantic_clusters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_sequence_counters"
    ADD CONSTRAINT "t_sequence_counters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_tax_info"
    ADD CONSTRAINT "t_tax_info_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_tax_settings"
    ADD CONSTRAINT "t_tax_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_tenant_domains"
    ADD CONSTRAINT "t_tenant_domains_domain_mapping_id_fkey" FOREIGN KEY ("domain_mapping_id") REFERENCES "public"."t_domain_mappings"("id");



ALTER TABLE ONLY "public"."t_tenant_domains"
    ADD CONSTRAINT "t_tenant_domains_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_tenant_files"
    ADD CONSTRAINT "t_tenant_files_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."t_tenant_files"
    ADD CONSTRAINT "t_tenant_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_tenant_integrations"
    ADD CONSTRAINT "t_tenant_integrations_master_integration_id_fkey" FOREIGN KEY ("master_integration_id") REFERENCES "public"."t_integration_providers"("id");



ALTER TABLE ONLY "public"."t_tenant_onboarding"
    ADD CONSTRAINT "t_tenant_onboarding_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_tenant_profiles"
    ADD CONSTRAINT "t_tenant_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id");



ALTER TABLE ONLY "public"."t_tenant_regions"
    ADD CONSTRAINT "t_tenant_regions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_tenant_smartprofiles"
    ADD CONSTRAINT "t_tenant_smartprofiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_tenants"
    ADD CONSTRAINT "t_tenants_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."t_user_auth_methods"
    ADD CONSTRAINT "t_user_auth_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_user_invitations"
    ADD CONSTRAINT "t_user_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."t_user_invitations"
    ADD CONSTRAINT "t_user_invitations_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."t_user_invitations"
    ADD CONSTRAINT "t_user_invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."t_user_invitations"
    ADD CONSTRAINT "t_user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."t_user_invitations"
    ADD CONSTRAINT "t_user_invitations_last_resent_by_fkey" FOREIGN KEY ("last_resent_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."t_user_invitations"
    ADD CONSTRAINT "t_user_invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_user_profiles"
    ADD CONSTRAINT "t_user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_user_tenant_roles"
    ADD CONSTRAINT "t_user_tenant_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."t_category_details"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_user_tenant_roles"
    ADD CONSTRAINT "t_user_tenant_roles_user_tenant_id_fkey" FOREIGN KEY ("user_tenant_id") REFERENCES "public"."t_user_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_user_tenants"
    ADD CONSTRAINT "t_user_tenants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."t_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."t_user_tenants"
    ADD CONSTRAINT "t_user_tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow anonymous contact submission" ON "public"."familyknows_contacts" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow anonymous waitlist signup" ON "public"."familyknows_waitlist" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow authenticated read contacts" ON "public"."familyknows_contacts" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated read waitlist" ON "public"."familyknows_waitlist" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated update contacts" ON "public"."familyknows_contacts" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated update waitlist" ON "public"."familyknows_waitlist" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow read access to block categories for authenticated users" ON "public"."m_block_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read access to block masters for authenticated users" ON "public"."m_block_masters" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read access to block variants for authenticated users" ON "public"."m_block_variants" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow service role to manage block categories" ON "public"."m_block_categories" TO "service_role" USING (true);



CREATE POLICY "Allow service role to manage block masters" ON "public"."m_block_masters" TO "service_role" USING (true);



CREATE POLICY "Allow service role to manage block variants" ON "public"."m_block_variants" TO "service_role" USING (true);



CREATE POLICY "Authenticated can read active tenant clusters" ON "public"."t_semantic_clusters" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND ("tenant_id" IS NOT NULL) AND ("is_active" = true)));



CREATE POLICY "Authenticated users can read active smartprofiles" ON "public"."t_tenant_smartprofiles" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND ("status" = 'active'::"text") AND ("is_active" = true)));



CREATE POLICY "Authorized users can create invitations" ON "public"."t_user_invitations" FOR INSERT WITH CHECK ((("tenant_id" IN ( SELECT "ut"."tenant_id"
   FROM (("public"."t_user_tenants" "ut"
     JOIN "public"."t_user_tenant_roles" "utr" ON (("ut"."id" = "utr"."user_tenant_id")))
     JOIN "public"."t_category_details" "cd" ON (("utr"."role_id" = "cd"."id")))
  WHERE (("ut"."user_id" = "auth"."uid"()) AND (("ut"."status")::"text" = 'active'::"text") AND (("cd"."sub_cat_name")::"text" = ANY ((ARRAY['Owner'::character varying, 'Admin'::character varying, 'HR Manager'::character varying])::"text"[]))))) AND ("invited_by" = "auth"."uid"()) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Enable insert for anonymous users" ON "public"."leads" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Enable read for authenticated users" ON "public"."leads" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public can validate invitations" ON "public"."t_user_invitations" FOR SELECT USING ((("user_code" IS NOT NULL) AND ("secret_code" IS NOT NULL)));



CREATE POLICY "Service role can insert audit logs" ON "public"."t_invitation_audit_log" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage auth methods" ON "public"."t_user_auth_methods" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."t_ai_agent_sessions" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."t_chat_sessions" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."t_query_cache" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access to smartprofiles" ON "public"."t_tenant_smartprofiles" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access to tenant domains" ON "public"."t_tenant_domains" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access to tenant regions" ON "public"."t_tenant_regions" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role only for domain mappings" ON "public"."t_domain_mappings" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Tenants can manage their own smartprofile" ON "public"."t_tenant_smartprofiles" USING ((("tenant_id")::"text" = ("auth"."uid"())::"text"));



CREATE POLICY "Tenants can manage their smartprofile clusters" ON "public"."t_semantic_clusters" USING ((("tenant_id" IS NOT NULL) AND (("tenant_id")::"text" = ("auth"."uid"())::"text")));



CREATE POLICY "Tenants can read their smartprofile clusters" ON "public"."t_semantic_clusters" FOR SELECT USING ((("tenant_id" IS NOT NULL) AND (("tenant_id")::"text" = ("auth"."uid"())::"text")));



CREATE POLICY "Users can access contact addresses from their tenant" ON "public"."t_contact_addresses" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."t_contacts"
  WHERE (("t_contacts"."id" = "t_contact_addresses"."contact_id") AND ("t_contacts"."tenant_id" IN ( SELECT "t_contacts"."tenant_id"
           FROM "public"."t_user_profiles"
          WHERE ("t_user_profiles"."user_id" = "auth"."uid"())
        UNION
         SELECT "t_user_tenants"."tenant_id"
           FROM "public"."t_user_tenants"
          WHERE ("t_user_tenants"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can access contact channels from their tenant" ON "public"."t_contact_channels" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."t_contacts"
  WHERE (("t_contacts"."id" = "t_contact_channels"."contact_id") AND ("t_contacts"."tenant_id" IN ( SELECT "t_contacts"."tenant_id"
           FROM "public"."t_user_profiles"
          WHERE ("t_user_profiles"."user_id" = "auth"."uid"())
        UNION
         SELECT "t_user_tenants"."tenant_id"
           FROM "public"."t_user_tenants"
          WHERE ("t_user_tenants"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can access contacts from their tenant" ON "public"."t_contacts" TO "authenticated" USING ((("tenant_id" = ( SELECT "t_contacts"."tenant_id"
   FROM "public"."t_user_profiles"
  WHERE ("t_user_profiles"."user_id" = "auth"."uid"()))) OR ("tenant_id" IN ( SELECT "t_user_tenants"."tenant_id"
   FROM "public"."t_user_tenants"
  WHERE ("t_user_tenants"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage own sessions" ON "public"."t_chat_sessions" USING ((("user_id" = "auth"."uid"()) OR (("tenant_id")::"text" = ("auth"."uid"())::"text")));



CREATE POLICY "Users can read cache for their groups" ON "public"."t_query_cache" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."t_group_memberships" "gm"
  WHERE (("gm"."group_id" = "t_query_cache"."group_id") AND (("gm"."tenant_id")::"text" = ("auth"."uid"())::"text") AND (("gm"."status")::"text" = 'active'::"text")))));



CREATE POLICY "Users can update own auth methods" ON "public"."t_user_auth_methods" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own sessions" ON "public"."t_ai_agent_sessions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their invitations" ON "public"."t_user_invitations" FOR UPDATE USING ((("invited_by" = "auth"."uid"()) OR ("tenant_id" IN ( SELECT "ut"."tenant_id"
   FROM (("public"."t_user_tenants" "ut"
     JOIN "public"."t_user_tenant_roles" "utr" ON (("ut"."id" = "utr"."user_tenant_id")))
     JOIN "public"."t_category_details" "cd" ON (("utr"."role_id" = "cd"."id")))
  WHERE (("ut"."user_id" = "auth"."uid"()) AND (("ut"."status")::"text" = 'active'::"text") AND (("cd"."sub_cat_name")::"text" = ANY ((ARRAY['Owner'::character varying, 'Admin'::character varying])::"text"[])))))));



CREATE POLICY "Users can view audit logs" ON "public"."t_invitation_audit_log" FOR SELECT USING (("invitation_id" IN ( SELECT "t_user_invitations"."id"
   FROM "public"."t_user_invitations"
  WHERE ("t_user_invitations"."tenant_id" IN ( SELECT "t_user_tenants"."tenant_id"
           FROM "public"."t_user_tenants"
          WHERE (("t_user_tenants"."user_id" = "auth"."uid"()) AND (("t_user_tenants"."status")::"text" = 'active'::"text")))))));



CREATE POLICY "Users can view own auth methods" ON "public"."t_user_auth_methods" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own sessions" ON "public"."t_ai_agent_sessions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view tenant invitations" ON "public"."t_user_invitations" FOR SELECT USING (("tenant_id" IN ( SELECT "t_user_tenants"."tenant_id"
   FROM "public"."t_user_tenants"
  WHERE (("t_user_tenants"."user_id" = "auth"."uid"()) AND (("t_user_tenants"."status")::"text" = 'active'::"text")))));



CREATE POLICY "Users can view their tenant domains" ON "public"."t_tenant_domains" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."tenant_id" = "t_tenant_domains"."tenant_id") AND ("ut"."user_id" = "auth"."uid"()) AND (("ut"."status")::"text" = 'active'::"text")))));



CREATE POLICY "Users can view their tenant regions" ON "public"."t_tenant_regions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."tenant_id" = "t_tenant_regions"."tenant_id") AND ("ut"."user_id" = "auth"."uid"()) AND (("ut"."status")::"text" = 'active'::"text")))));



CREATE POLICY "allow_insert_plans" ON "public"."t_bm_pricing_plan" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "allow_update_plans" ON "public"."t_bm_pricing_plan" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_view_active_versions" ON "public"."t_bm_plan_version" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."t_bm_pricing_plan"
  WHERE (("t_bm_pricing_plan"."plan_id" = "t_bm_plan_version"."plan_id") AND ("t_bm_pricing_plan"."is_visible" = true) AND ("t_bm_pricing_plan"."is_archived" = false)))));



CREATE POLICY "authenticated_view_feature_reference" ON "public"."t_bm_feature_reference" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_view_notification_reference" ON "public"."t_bm_notification_reference" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_view_visible_plans" ON "public"."t_bm_pricing_plan" FOR SELECT TO "authenticated" USING ((("is_visible" = true) AND ("is_archived" = false)));



ALTER TABLE "public"."c_category_details" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "c_category_details_no_access" ON "public"."c_category_details" TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."c_category_master" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "c_category_master_no_access" ON "public"."c_category_master" TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "campaigns_delete_policy" ON "public"."t_campaigns" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "campaigns_insert_policy" ON "public"."t_campaigns" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "campaigns_select_policy" ON "public"."t_campaigns" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "campaigns_update_policy" ON "public"."t_campaigns" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "category_details_delete_policy" ON "public"."t_category_details" FOR DELETE TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"]) AND ("is_deletable" = true)));



CREATE POLICY "category_details_insert_policy" ON "public"."t_category_details" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "category_details_tenant_isolation" ON "public"."t_category_details" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id")));



CREATE POLICY "category_details_update_policy" ON "public"."t_category_details" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "category_master_delete_policy" ON "public"."t_category_master" FOR DELETE TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "category_master_insert_policy" ON "public"."t_category_master" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "category_master_tenant_isolation" ON "public"."t_category_master" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id")));



CREATE POLICY "category_master_update_policy" ON "public"."t_category_master" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "category_resources_master_policy" ON "public"."t_category_resources_master" TO "authenticated" USING (("tenant_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "channels_read_all" ON "public"."n_jtd_channels" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "clusters_delete_service" ON "public"."t_semantic_clusters" FOR DELETE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "clusters_insert_service" ON "public"."t_semantic_clusters" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "clusters_select_own" ON "public"."t_semantic_clusters" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."t_group_memberships" "m"
  WHERE (("m"."id" = "t_semantic_clusters"."membership_id") AND (("m"."tenant_id" = "auth"."uid"()) OR ((("m"."status")::"text" = 'active'::"text") AND ("m"."is_active" = true)))))) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "clusters_update_service" ON "public"."t_semantic_clusters" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "event_types_read_all" ON "public"."n_jtd_event_types" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."familyknows_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."familyknows_waitlist" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "groups_delete_service" ON "public"."t_business_groups" FOR DELETE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "groups_insert_service" ON "public"."t_business_groups" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "groups_select_active" ON "public"."t_business_groups" FOR SELECT USING (("is_active" = true));



CREATE POLICY "groups_update_service" ON "public"."t_business_groups" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "history_insert" ON "public"."n_jtd_history" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."n_jtd" "j"
  WHERE (("j"."id" = "n_jtd_history"."jtd_id") AND (("j"."tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_vani_user"() OR "public"."is_service_role"())))));



CREATE POLICY "history_select" ON "public"."n_jtd_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."n_jtd" "j"
  WHERE (("j"."id" = "n_jtd_history"."jtd_id") AND (("j"."tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_vani_user"() OR "public"."is_service_role"())))));



CREATE POLICY "integration_providers_select_policy" ON "public"."t_integration_providers" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "integration_types_select_policy" ON "public"."t_integration_types" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "jtd_delete_service" ON "public"."n_jtd" FOR DELETE TO "authenticated" USING ("public"."is_service_role"());



CREATE POLICY "jtd_insert_tenant" ON "public"."n_jtd" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_vani_user"() OR "public"."is_service_role"()));



CREATE POLICY "jtd_select_tenant" ON "public"."n_jtd" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_vani_user"() OR "public"."is_service_role"()));



CREATE POLICY "jtd_update_tenant" ON "public"."n_jtd" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_vani_user"() OR "public"."is_service_role"())) WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_vani_user"() OR "public"."is_service_role"()));



CREATE POLICY "leads_delete_policy" ON "public"."t_campaign_leads" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "leads_insert_policy_anon" ON "public"."t_campaign_leads" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "leads_insert_policy_auth" ON "public"."t_campaign_leads" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "leads_select_policy" ON "public"."t_campaign_leads" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "leads_update_policy" ON "public"."t_campaign_leads" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "logs_insert_service" ON "public"."t_group_activity_logs" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "logs_select_own" ON "public"."t_group_activity_logs" FOR SELECT USING ((("tenant_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "public"."m_block_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."m_block_masters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."m_block_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."m_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."m_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "memberships_delete_service" ON "public"."t_group_memberships" FOR DELETE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "memberships_insert_service" ON "public"."t_group_memberships" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "memberships_select_group_members" ON "public"."t_group_memberships" FOR SELECT USING (((("status")::"text" = 'active'::"text") AND ("is_active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."t_group_memberships" "my_membership"
  WHERE (("my_membership"."tenant_id" = "auth"."uid"()) AND ("my_membership"."group_id" = "t_group_memberships"."group_id") AND (("my_membership"."status")::"text" = 'active'::"text"))))));



CREATE POLICY "memberships_select_own" ON "public"."t_group_memberships" FOR SELECT USING ((("tenant_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "memberships_update_own" ON "public"."t_group_memberships" FOR UPDATE USING ((("tenant_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "public"."n_jtd" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."n_jtd_channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."n_jtd_event_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."n_jtd_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."n_jtd_source_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."n_jtd_status_flows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."n_jtd_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."n_jtd_statuses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."n_jtd_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."n_jtd_tenant_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."n_jtd_tenant_source_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."n_system_actors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permissions_no_modifications" ON "public"."m_permissions" TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "permissions_tenant_isolation" ON "public"."m_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_active_products" ON "public"."m_products" FOR SELECT USING (("is_active" = true));



CREATE POLICY "role_permissions_delete_policy" ON "public"."t_role_permissions" FOR DELETE TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "role_permissions_insert_policy" ON "public"."t_role_permissions" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "role_permissions_tenant_isolation" ON "public"."t_role_permissions" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id")));



CREATE POLICY "role_permissions_update_policy" ON "public"."t_role_permissions" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "service_role_access_t_catalog_items" ON "public"."t_catalog_items" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_access_t_catalog_resource_pricing" ON "public"."t_catalog_resource_pricing" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_access_t_catalog_resources" ON "public"."t_catalog_resources" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_access_t_catalog_service_resources" ON "public"."t_catalog_service_resources" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_rls_tax_settings" ON "public"."t_tax_settings" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access_tax_settings" ON "public"."t_tax_settings" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_manage_feature_reference" ON "public"."t_bm_feature_reference" TO "service_role" USING (true);



CREATE POLICY "service_role_manage_invoices" ON "public"."t_bm_invoice" TO "service_role" USING (true);



CREATE POLICY "service_role_manage_notification_reference" ON "public"."t_bm_notification_reference" TO "service_role" USING (true);



CREATE POLICY "service_role_manage_plans" ON "public"."t_bm_pricing_plan" TO "service_role" USING (true);



CREATE POLICY "service_role_manage_subscriptions" ON "public"."t_bm_tenant_subscription" TO "service_role" USING (true);



CREATE POLICY "service_role_manage_usage" ON "public"."t_bm_subscription_usage" TO "service_role" USING (true);



CREATE POLICY "service_role_manage_versions" ON "public"."t_bm_plan_version" TO "service_role" USING (true);



CREATE POLICY "source_types_read_all" ON "public"."n_jtd_source_types" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "status_flows_read_all" ON "public"."n_jtd_status_flows" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "status_history_insert" ON "public"."n_jtd_status_history" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."n_jtd" "j"
  WHERE (("j"."id" = "n_jtd_status_history"."jtd_id") AND (("j"."tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_vani_user"() OR "public"."is_service_role"())))));



CREATE POLICY "status_history_select" ON "public"."n_jtd_status_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."n_jtd" "j"
  WHERE (("j"."id" = "n_jtd_status_history"."jtd_id") AND (("j"."tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_vani_user"() OR "public"."is_service_role"())))));



CREATE POLICY "statuses_read_all" ON "public"."n_jtd_statuses" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "step_status_insert" ON "public"."t_onboarding_step_status" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "t_user_tenants"."tenant_id"
   FROM "public"."t_user_tenants"
  WHERE (("t_user_tenants"."user_id" = "auth"."uid"()) AND (("t_user_tenants"."status")::"text" = 'active'::"text")))));



CREATE POLICY "step_status_select" ON "public"."t_onboarding_step_status" FOR SELECT USING (("tenant_id" IN ( SELECT "t_user_tenants"."tenant_id"
   FROM "public"."t_user_tenants"
  WHERE (("t_user_tenants"."user_id" = "auth"."uid"()) AND (("t_user_tenants"."status")::"text" = 'active'::"text")))));



CREATE POLICY "step_status_update" ON "public"."t_onboarding_step_status" FOR UPDATE USING (("tenant_id" IN ( SELECT "t_user_tenants"."tenant_id"
   FROM "public"."t_user_tenants"
  WHERE (("t_user_tenants"."user_id" = "auth"."uid"()) AND (("t_user_tenants"."status")::"text" = 'active'::"text")))));



CREATE POLICY "super_admin_audit_logs_select" ON "public"."t_audit_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."t_user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."is_admin" = true)))));



CREATE POLICY "super_admins_manage_products" ON "public"."m_products" USING (true) WITH CHECK (true);



CREATE POLICY "superadmin_bypass" ON "public"."t_user_profiles" USING ((("auth"."jwt"() ->> 'role'::"text") = 'supabase_admin'::"text"));



CREATE POLICY "system_actors_read_all" ON "public"."n_system_actors" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."t_ai_agent_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_bm_feature_reference" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_bm_invoice" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_bm_notification_reference" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_bm_plan_version" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_bm_pricing_plan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_bm_subscription_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_bm_tenant_subscription" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_campaign_leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_catalog_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_catalog_resource_pricing" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_catalog_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_catalog_service_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_category_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_category_master" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_chat_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_contact_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_contact_channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_domain_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_group_activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_integration_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_integration_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_invitation_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_onboarding_step_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_query_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_semantic_clusters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_sequence_counters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_tax_info" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_tax_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_tax_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_tenant_domains" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_tenant_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_tenant_integrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_tenant_onboarding" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_tenant_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_tenant_regions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_tenant_smartprofiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_tenants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_user_auth_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_user_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_user_tenant_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."t_user_tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tax_info_delete_policy" ON "public"."t_tax_info" FOR DELETE TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "tax_info_insert_policy" ON "public"."t_tax_info" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "tax_info_tenant_isolation" ON "public"."t_tax_info" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id")));



CREATE POLICY "tax_info_update_policy" ON "public"."t_tax_info" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "tax_rates_policy" ON "public"."t_tax_rates" TO "authenticated" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "tax_settings_all_for_super_admins" ON "public"."t_tax_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."t_user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."is_admin" = true)))));



CREATE POLICY "tax_settings_insert_for_tenant_admins" ON "public"."t_tax_settings" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."user_id" = "auth"."uid"()) AND ("ut"."tenant_id" = "t_tax_settings"."tenant_id") AND ("ut"."is_admin" = true) AND (("ut"."status")::"text" = 'active'::"text")))));



CREATE POLICY "tax_settings_select_for_super_admins" ON "public"."t_tax_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."t_user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."is_admin" = true)))));



CREATE POLICY "tax_settings_select_for_tenant_users" ON "public"."t_tax_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."user_id" = "auth"."uid"()) AND ("ut"."tenant_id" = "t_tax_settings"."tenant_id") AND (("ut"."status")::"text" = 'active'::"text")))));



CREATE POLICY "tax_settings_update_for_tenant_admins" ON "public"."t_tax_settings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."user_id" = "auth"."uid"()) AND ("ut"."tenant_id" = "t_tax_settings"."tenant_id") AND ("ut"."is_admin" = true) AND (("ut"."status")::"text" = 'active'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."user_id" = "auth"."uid"()) AND ("ut"."tenant_id" = "t_tax_settings"."tenant_id") AND ("ut"."is_admin" = true) AND (("ut"."status")::"text" = 'active'::"text")))));



CREATE POLICY "templates_insert" ON "public"."n_jtd_templates" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_service_role"()));



CREATE POLICY "templates_select" ON "public"."n_jtd_templates" FOR SELECT TO "authenticated" USING ((("tenant_id" IS NULL) OR ("tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_vani_user"() OR "public"."is_service_role"()));



CREATE POLICY "templates_update" ON "public"."n_jtd_templates" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_service_role"()));



CREATE POLICY "tenant_admin_audit_logs_select" ON "public"."t_audit_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."user_id" = "auth"."uid"()) AND ("ut"."tenant_id" = "t_audit_logs"."tenant_id") AND ("ut"."is_admin" = true) AND (("ut"."status")::"text" = 'active'::"text")))));



CREATE POLICY "tenant_config_insert" ON "public"."n_jtd_tenant_config" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_service_role"()));



CREATE POLICY "tenant_config_select" ON "public"."n_jtd_tenant_config" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_vani_user"() OR "public"."is_service_role"()));



CREATE POLICY "tenant_config_update" ON "public"."n_jtd_tenant_config" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_service_role"()));



CREATE POLICY "tenant_creation_during_signup" ON "public"."t_tenants" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "tenant_files_delete_policy" ON "public"."t_tenant_files" FOR DELETE USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "tenant_files_insert_policy" ON "public"."t_tenant_files" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id")));



CREATE POLICY "tenant_files_select_policy" ON "public"."t_tenant_files" FOR SELECT USING ("public"."has_tenant_access"("tenant_id"));



CREATE POLICY "tenant_files_update_policy" ON "public"."t_tenant_files" FOR UPDATE USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])));



CREATE POLICY "tenant_integrations_delete_policy" ON "public"."t_tenant_integrations" FOR DELETE USING (("tenant_id" = ("public"."get_current_tenant_id"())::"text"));



CREATE POLICY "tenant_integrations_insert_policy" ON "public"."t_tenant_integrations" FOR INSERT WITH CHECK (("tenant_id" = ("public"."get_current_tenant_id"())::"text"));



CREATE POLICY "tenant_integrations_select_policy" ON "public"."t_tenant_integrations" FOR SELECT USING (("tenant_id" = ("public"."get_current_tenant_id"())::"text"));



CREATE POLICY "tenant_integrations_update_policy" ON "public"."t_tenant_integrations" FOR UPDATE USING (("tenant_id" = ("public"."get_current_tenant_id"())::"text"));



CREATE POLICY "tenant_isolation" ON "public"."t_category_resources_master" USING (("tenant_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "tenant_isolation_sequence_counters_delete" ON "public"."t_sequence_counters" FOR DELETE USING (("tenant_id" = ("current_setting"('app.current_tenant_id'::"text", true))::"uuid"));



CREATE POLICY "tenant_isolation_sequence_counters_insert" ON "public"."t_sequence_counters" FOR INSERT WITH CHECK (("tenant_id" = ("current_setting"('app.current_tenant_id'::"text", true))::"uuid"));



CREATE POLICY "tenant_isolation_sequence_counters_select" ON "public"."t_sequence_counters" FOR SELECT USING (("tenant_id" = ("current_setting"('app.current_tenant_id'::"text", true))::"uuid"));



CREATE POLICY "tenant_isolation_sequence_counters_update" ON "public"."t_sequence_counters" FOR UPDATE USING (("tenant_id" = ("current_setting"('app.current_tenant_id'::"text", true))::"uuid")) WITH CHECK (("tenant_id" = ("current_setting"('app.current_tenant_id'::"text", true))::"uuid"));



CREATE POLICY "tenant_isolation_t_catalog_items" ON "public"."t_catalog_items" TO "authenticated" USING (("tenant_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'tenant_id'::"text"))::"uuid")) WITH CHECK (("tenant_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "tenant_isolation_t_catalog_resource_pricing" ON "public"."t_catalog_resource_pricing" TO "authenticated" USING (("tenant_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'tenant_id'::"text"))::"uuid")) WITH CHECK (("tenant_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "tenant_isolation_t_catalog_resources" ON "public"."t_catalog_resources" TO "authenticated" USING (("tenant_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'tenant_id'::"text"))::"uuid")) WITH CHECK (("tenant_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "tenant_isolation_t_catalog_service_resources" ON "public"."t_catalog_service_resources" TO "authenticated" USING (("tenant_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'tenant_id'::"text"))::"uuid")) WITH CHECK (("tenant_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "tenant_onboarding_insert" ON "public"."t_tenant_onboarding" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "t_user_tenants"."tenant_id"
   FROM "public"."t_user_tenants"
  WHERE (("t_user_tenants"."user_id" = "auth"."uid"()) AND (("t_user_tenants"."status")::"text" = 'active'::"text")))));



CREATE POLICY "tenant_onboarding_select" ON "public"."t_tenant_onboarding" FOR SELECT USING (("tenant_id" IN ( SELECT "t_user_tenants"."tenant_id"
   FROM "public"."t_user_tenants"
  WHERE (("t_user_tenants"."user_id" = "auth"."uid"()) AND (("t_user_tenants"."status")::"text" = 'active'::"text")))));



CREATE POLICY "tenant_onboarding_update" ON "public"."t_tenant_onboarding" FOR UPDATE USING (("tenant_id" IN ( SELECT "t_user_tenants"."tenant_id"
   FROM "public"."t_user_tenants"
  WHERE (("t_user_tenants"."user_id" = "auth"."uid"()) AND (("t_user_tenants"."status")::"text" = 'active'::"text")))));



CREATE POLICY "tenant_profiles_delete_policy" ON "public"."t_tenant_profiles" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."t_user_tenants" "ut"
     JOIN "public"."t_user_tenant_roles" "utr" ON (("ut"."id" = "utr"."user_tenant_id")))
     JOIN "public"."t_category_details" "cd" ON (("utr"."role_id" = "cd"."id")))
  WHERE (("ut"."user_id" = "auth"."uid"()) AND ("ut"."tenant_id" = "t_tenant_profiles"."tenant_id") AND (("ut"."status")::"text" = 'active'::"text") AND (("cd"."sub_cat_name")::"text" = 'Owner'::"text")))));



CREATE POLICY "tenant_profiles_insert_policy" ON "public"."t_tenant_profiles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."t_user_tenants" "ut"
     JOIN "public"."t_user_tenant_roles" "utr" ON (("ut"."id" = "utr"."user_tenant_id")))
     JOIN "public"."t_category_details" "cd" ON (("utr"."role_id" = "cd"."id")))
  WHERE (("ut"."user_id" = "auth"."uid"()) AND ("ut"."tenant_id" = "t_tenant_profiles"."tenant_id") AND (("ut"."status")::"text" = 'active'::"text") AND (("cd"."sub_cat_name")::"text" = ANY ((ARRAY['Owner'::character varying, 'Admin'::character varying])::"text"[]))))));



CREATE POLICY "tenant_profiles_select_policy" ON "public"."t_tenant_profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."user_id" = "auth"."uid"()) AND ("ut"."tenant_id" = "t_tenant_profiles"."tenant_id") AND (("ut"."status")::"text" = 'active'::"text")))));



CREATE POLICY "tenant_profiles_service_role_policy" ON "public"."t_tenant_profiles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "tenant_profiles_update_policy" ON "public"."t_tenant_profiles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."t_user_tenants" "ut"
     JOIN "public"."t_user_tenant_roles" "utr" ON (("ut"."id" = "utr"."user_tenant_id")))
     JOIN "public"."t_category_details" "cd" ON (("utr"."role_id" = "cd"."id")))
  WHERE (("ut"."user_id" = "auth"."uid"()) AND ("ut"."tenant_id" = "t_tenant_profiles"."tenant_id") AND (("ut"."status")::"text" = 'active'::"text") AND (("cd"."sub_cat_name")::"text" = ANY ((ARRAY['Owner'::character varying, 'Admin'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."t_user_tenants" "ut"
     JOIN "public"."t_user_tenant_roles" "utr" ON (("ut"."id" = "utr"."user_tenant_id")))
     JOIN "public"."t_category_details" "cd" ON (("utr"."role_id" = "cd"."id")))
  WHERE (("ut"."user_id" = "auth"."uid"()) AND ("ut"."tenant_id" = "t_tenant_profiles"."tenant_id") AND (("ut"."status")::"text" = 'active'::"text") AND (("cd"."sub_cat_name")::"text" = ANY ((ARRAY['Owner'::character varying, 'Admin'::character varying])::"text"[]))))));



CREATE POLICY "tenant_source_config_insert" ON "public"."n_jtd_tenant_source_config" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_service_role"()));



CREATE POLICY "tenant_source_config_select" ON "public"."n_jtd_tenant_source_config" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_vani_user"() OR "public"."is_service_role"()));



CREATE POLICY "tenant_source_config_update" ON "public"."n_jtd_tenant_source_config" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) OR "public"."is_service_role"()));



CREATE POLICY "tenant_tax_rates_delete" ON "public"."t_tax_rates" FOR DELETE USING ((("tenant_id")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'tenant_id'::"text")));



CREATE POLICY "tenant_tax_rates_insert" ON "public"."t_tax_rates" FOR INSERT WITH CHECK ((("tenant_id")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'tenant_id'::"text")));



CREATE POLICY "tenant_tax_rates_select" ON "public"."t_tax_rates" FOR SELECT USING ((("tenant_id")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'tenant_id'::"text")));



CREATE POLICY "tenant_tax_rates_update" ON "public"."t_tax_rates" FOR UPDATE USING ((("tenant_id")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'tenant_id'::"text"))) WITH CHECK ((("tenant_id")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'tenant_id'::"text")));



CREATE POLICY "tenant_view_own_invoices" ON "public"."t_bm_invoice" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."t_bm_tenant_subscription" "ts"
     JOIN "public"."t_user_tenants" "ut" ON (("ut"."tenant_id" = "ts"."tenant_id")))
  WHERE (("ts"."subscription_id" = "t_bm_invoice"."subscription_id") AND ("ut"."user_id" = "auth"."uid"()) AND (("ut"."status")::"text" = 'active'::"text")))));



CREATE POLICY "tenant_view_own_subscriptions" ON "public"."t_bm_tenant_subscription" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."t_user_tenants"
  WHERE (("t_user_tenants"."tenant_id" = "t_bm_tenant_subscription"."tenant_id") AND ("t_user_tenants"."user_id" = "auth"."uid"()) AND (("t_user_tenants"."status")::"text" = 'active'::"text")))));



CREATE POLICY "tenant_view_own_usage" ON "public"."t_bm_subscription_usage" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."t_bm_tenant_subscription" "ts"
     JOIN "public"."t_user_tenants" "ut" ON (("ut"."tenant_id" = "ts"."tenant_id")))
  WHERE (("ts"."subscription_id" = "t_bm_subscription_usage"."subscription_id") AND ("ut"."user_id" = "auth"."uid"()) AND (("ut"."status")::"text" = 'active'::"text")))));



CREATE POLICY "tenants_insert_policy" ON "public"."t_tenants" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "tenants_tenant_isolation" ON "public"."t_tenants" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."t_user_tenants"
  WHERE (("t_user_tenants"."tenant_id" = "t_tenants"."id") AND ("t_user_tenants"."user_id" = "auth"."uid"()) AND (("t_user_tenants"."status")::"text" = 'active'::"text")))) OR ("created_by" = "auth"."uid"())));



CREATE POLICY "tenants_update_policy" ON "public"."t_tenants" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR ("is_admin" = true) OR (EXISTS ( SELECT 1
   FROM "public"."t_user_tenants"
  WHERE (("t_user_tenants"."tenant_id" = "t_tenants"."id") AND ("t_user_tenants"."user_id" = "auth"."uid"()) AND (("t_user_tenants"."status")::"text" = 'active'::"text"))))));



CREATE POLICY "user_profiles_delete_policy" ON "public"."t_user_profiles" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("user_id" IN ( SELECT "ut"."user_id"
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("ut"."tenant_id") AND "public"."has_tenant_role"("ut"."tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"]))))));



CREATE POLICY "user_profiles_insert_policy" ON "public"."t_user_profiles" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."tenant_id" = "public"."get_current_tenant_id"()) AND ("ut"."user_id" = "auth"."uid"()) AND "public"."has_tenant_role"("ut"."tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"]))))));



CREATE POLICY "user_profiles_tenant_isolation" ON "public"."t_user_profiles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("user_id" IN ( SELECT "ut"."user_id"
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("ut"."tenant_id"))))));



CREATE POLICY "user_profiles_update_policy" ON "public"."t_user_profiles" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("user_id" IN ( SELECT "ut"."user_id"
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("ut"."tenant_id") AND "public"."has_tenant_role"("ut"."tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"]))))));



CREATE POLICY "user_tenant_audit_logs_select" ON "public"."t_audit_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."user_id" = "auth"."uid"()) AND ("ut"."tenant_id" = "t_audit_logs"."tenant_id") AND (("ut"."status")::"text" = 'active'::"text")))));



CREATE POLICY "user_tenant_roles_delete_policy" ON "public"."t_user_tenant_roles" FOR DELETE TO "authenticated" USING (("user_tenant_id" IN ( SELECT "ut"."id"
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("ut"."tenant_id") AND "public"."has_tenant_role"("ut"."tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])))));



CREATE POLICY "user_tenant_roles_insert_policy" ON "public"."t_user_tenant_roles" FOR INSERT TO "authenticated" WITH CHECK (("user_tenant_id" IN ( SELECT "ut"."id"
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("ut"."tenant_id") AND "public"."has_tenant_role"("ut"."tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])))));



CREATE POLICY "user_tenant_roles_tenant_isolation" ON "public"."t_user_tenant_roles" FOR SELECT TO "authenticated" USING (("user_tenant_id" IN ( SELECT "t_user_tenants"."id"
   FROM "public"."t_user_tenants"
  WHERE (("t_user_tenants"."user_id" = "auth"."uid"()) OR (("t_user_tenants"."tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("t_user_tenants"."tenant_id"))))));



CREATE POLICY "user_tenant_roles_update_policy" ON "public"."t_user_tenant_roles" FOR UPDATE TO "authenticated" USING (("user_tenant_id" IN ( SELECT "ut"."id"
   FROM "public"."t_user_tenants" "ut"
  WHERE (("ut"."tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("ut"."tenant_id") AND "public"."has_tenant_role"("ut"."tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])))));



CREATE POLICY "user_tenants_delete_policy" ON "public"."t_user_tenants" FOR DELETE TO "authenticated" USING (((("user_id" = "auth"."uid"()) AND ("tenant_id" = "public"."get_current_tenant_id"())) OR (("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"]))));



CREATE POLICY "user_tenants_insert_policy" ON "public"."t_user_tenants" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR ((("user_id" = "auth"."uid"()) AND ("tenant_id" = "public"."get_current_tenant_id"())) OR (("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"])))));



CREATE POLICY "user_tenants_tenant_isolation" ON "public"."t_user_tenants" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id"))));



CREATE POLICY "user_tenants_update_policy" ON "public"."t_user_tenants" FOR UPDATE TO "authenticated" USING (((("user_id" = "auth"."uid"()) AND ("tenant_id" = "public"."get_current_tenant_id"())) OR (("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."has_tenant_access"("tenant_id") AND "public"."has_tenant_role"("tenant_id", ARRAY['Owner'::"text", 'Admin'::"text"]))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."t_user_invitations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."t_user_profiles";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."t_user_tenants";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































GRANT ALL ON TABLE "public"."t_chat_sessions" TO "anon";
GRANT ALL ON TABLE "public"."t_chat_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."t_chat_sessions" TO "service_role";



GRANT ALL ON FUNCTION "public"."activate_group_session"("p_session_id" "uuid", "p_group_id" "uuid", "p_group_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."activate_group_session"("p_session_id" "uuid", "p_group_id" "uuid", "p_group_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."activate_group_session"("p_session_id" "uuid", "p_group_id" "uuid", "p_group_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_contact_classification"("contact_id" "uuid", "classification" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_contact_classification"("contact_id" "uuid", "classification" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_contact_classification"("contact_id" "uuid", "classification" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_contact_tag"("contact_id" "uuid", "tag_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."add_contact_tag"("contact_id" "uuid", "tag_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_contact_tag"("contact_id" "uuid", "tag_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."associate_service_resources"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_resource_data" "jsonb", "p_idempotency_key" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."associate_service_resources"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_resource_data" "jsonb", "p_idempotency_key" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."associate_service_resources"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_resource_data" "jsonb", "p_idempotency_key" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_generate_contact_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_generate_contact_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_contact_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."backfill_contact_numbers"("p_tenant_id" "uuid", "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."backfill_contact_numbers"("p_tenant_id" "uuid", "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."backfill_contact_numbers"("p_tenant_id" "uuid", "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_create_services"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_services_data" "jsonb", "p_idempotency_key" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_create_services"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_services_data" "jsonb", "p_idempotency_key" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_create_services"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_services_data" "jsonb", "p_idempotency_key" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_update_services"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_updates_data" "jsonb", "p_idempotency_key" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_update_services"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_updates_data" "jsonb", "p_idempotency_key" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_update_services"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_updates_data" "jsonb", "p_idempotency_key" character varying) TO "service_role";









GRANT ALL ON FUNCTION "public"."check_and_reset_sequence"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_reset_sequence"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_reset_sequence"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_contact_duplicates"("p_contact_channels" "jsonb", "p_exclude_contact_id" "uuid", "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."check_contact_duplicates"("p_contact_channels" "jsonb", "p_exclude_contact_id" "uuid", "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_contact_duplicates"("p_contact_channels" "jsonb", "p_exclude_contact_id" "uuid", "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_contact_duplicates"("p_contact_channels" "jsonb", "p_exclude_contact_id" "uuid", "p_is_live" boolean, "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_contact_duplicates"("p_contact_channels" "jsonb", "p_exclude_contact_id" "uuid", "p_is_live" boolean, "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_contact_duplicates"("p_contact_channels" "jsonb", "p_exclude_contact_id" "uuid", "p_is_live" boolean, "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_intent_permission"("p_group_id" "uuid", "p_intent_code" character varying, "p_user_role" character varying, "p_channel" character varying, "p_scope" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."check_intent_permission"("p_group_id" "uuid", "p_intent_code" character varying, "p_user_role" character varying, "p_channel" character varying, "p_scope" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_intent_permission"("p_group_id" "uuid", "p_intent_code" character varying, "p_user_role" character varying, "p_channel" character varying, "p_scope" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_invitation_expiry"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_invitation_expiry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_invitation_expiry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_sequence_uniqueness"("p_table_name" "text", "p_column_name" "text", "p_value" "text", "p_tenant_id" "uuid", "p_is_live" boolean, "p_exclude_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_sequence_uniqueness"("p_table_name" "text", "p_column_name" "text", "p_value" "text", "p_tenant_id" "uuid", "p_is_live" boolean, "p_exclude_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_sequence_uniqueness"("p_table_name" "text", "p_column_name" "text", "p_value" "text", "p_tenant_id" "uuid", "p_is_live" boolean, "p_exclude_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_group_access"("p_group_id" "uuid", "p_phone" character varying, "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_group_access"("p_group_id" "uuid", "p_phone" character varying, "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_group_access"("p_group_id" "uuid", "p_phone" character varying, "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_ai_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_ai_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_ai_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_invitations"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_invitations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_tool_results"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_tool_results"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_tool_results"() TO "service_role";



GRANT ALL ON FUNCTION "public"."copy_catalog_live_to_test"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."copy_catalog_live_to_test"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."copy_catalog_live_to_test"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_ai_session"("p_user_id" "uuid", "p_group_id" "uuid", "p_phone" character varying, "p_channel" character varying, "p_language" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."create_ai_session"("p_user_id" "uuid", "p_group_id" "uuid", "p_phone" character varying, "p_channel" character varying, "p_language" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_ai_session"("p_user_id" "uuid", "p_group_id" "uuid", "p_phone" character varying, "p_channel" character varying, "p_language" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_group_id" "uuid", "p_channel" character varying, "p_language" character varying, "p_phone" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."create_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_group_id" "uuid", "p_channel" character varying, "p_language" character varying, "p_phone" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_group_id" "uuid", "p_channel" character varying, "p_language" character varying, "p_phone" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_catalog_item_version"("p_current_item_id" "uuid", "p_version_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_catalog_item_version"("p_current_item_id" "uuid", "p_version_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_catalog_item_version"("p_current_item_id" "uuid", "p_version_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_contact_transaction"("p_contact_data" "jsonb", "p_contact_channels" "jsonb", "p_addresses" "jsonb", "p_contact_persons" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_contact_transaction"("p_contact_data" "jsonb", "p_contact_channels" "jsonb", "p_addresses" "jsonb", "p_contact_persons" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_contact_transaction"("p_contact_data" "jsonb", "p_contact_channels" "jsonb", "p_addresses" "jsonb", "p_contact_persons" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_service_catalog_item"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_service_data" "jsonb", "p_idempotency_key" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."create_service_catalog_item"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_service_data" "jsonb", "p_idempotency_key" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_service_catalog_item"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_service_data" "jsonb", "p_idempotency_key" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_embedding_input"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_embedding_input"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_embedding_input"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_search_v2"("p_embedding" "text", "p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_search_v2"("p_embedding" "text", "p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_search_v2"("p_embedding" "text", "p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_search_v3"("p_embedding" "text", "p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_search_v3"("p_embedding" "text", "p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_search_v3"("p_embedding" "text", "p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_contact_transaction"("p_contact_id" "uuid", "p_force" boolean, "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_contact_transaction"("p_contact_id" "uuid", "p_force" boolean, "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_contact_transaction"("p_contact_id" "uuid", "p_force" boolean, "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_contact_transaction"("p_contact_id" "uuid", "p_force" boolean, "p_is_live" boolean, "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_contact_transaction"("p_contact_id" "uuid", "p_force" boolean, "p_is_live" boolean, "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_contact_transaction"("p_contact_id" "uuid", "p_force" boolean, "p_is_live" boolean, "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_service_catalog_item"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_idempotency_key" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_service_catalog_item"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_idempotency_key" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_service_catalog_item"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_idempotency_key" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_group_activation"("p_message" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."detect_group_activation"("p_message" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_group_activation"("p_message" character varying) TO "service_role";






GRANT ALL ON FUNCTION "public"."end_ai_session"("p_phone" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."end_ai_session"("p_phone" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_ai_session"("p_phone" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."end_ai_session"("p_phone" character varying, "p_user_id" "uuid", "p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."end_ai_session"("p_phone" character varying, "p_user_id" "uuid", "p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_ai_session"("p_phone" character varying, "p_user_id" "uuid", "p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."end_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."end_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."end_chat_session"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."end_chat_session"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_chat_session"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_default_tax_rate"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_default_tax_rate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_default_tax_rate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_primary_auth_method"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_primary_auth_method"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_primary_auth_method"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_group_by_trigger"("p_trigger_phrase" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."find_group_by_trigger"("p_trigger_phrase" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_group_by_trigger"("p_trigger_phrase" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."format_sequence_number"("p_sequence_type_id" "uuid", "p_sequence_value" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."format_sequence_number"("p_sequence_type_id" "uuid", "p_sequence_value" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."format_sequence_number"("p_sequence_type_id" "uuid", "p_sequence_value" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_unique_sequence_for_contact"("p_tenant_id" "uuid", "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_unique_sequence_for_contact"("p_tenant_id" "uuid", "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_unique_sequence_for_contact"("p_tenant_id" "uuid", "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_unique_sequence_for_contract"("p_tenant_id" "uuid", "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_unique_sequence_for_contract"("p_tenant_id" "uuid", "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_unique_sequence_for_contract"("p_tenant_id" "uuid", "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_unique_sequence_for_invoice"("p_tenant_id" "uuid", "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_unique_sequence_for_invoice"("p_tenant_id" "uuid", "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_unique_sequence_for_invoice"("p_tenant_id" "uuid", "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_unique_suffix"("p_collision_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_unique_suffix"("p_collision_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_unique_suffix"("p_collision_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ai_agent_config"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_ai_agent_config"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ai_agent_config"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ai_enabled_groups"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_ai_enabled_groups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ai_enabled_groups"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ai_session"("p_phone" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_ai_session"("p_phone" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ai_session"("p_phone" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ai_session"("p_phone" character varying, "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_ai_session"("p_phone" character varying, "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ai_session"("p_phone" character varying, "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_master_categories"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_master_categories"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_master_categories"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_groups_for_chat"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_groups_for_chat"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_groups_for_chat"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_resources"("p_tenant_id" "uuid", "p_is_live" boolean, "p_resource_type" character varying, "p_filters" "jsonb", "p_page" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_resources"("p_tenant_id" "uuid", "p_is_live" boolean, "p_resource_type" character varying, "p_filters" "jsonb", "p_page" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_resources"("p_tenant_id" "uuid", "p_is_live" boolean, "p_resource_type" character varying, "p_filters" "jsonb", "p_page" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cached_search"("p_group_id" "uuid", "p_query_normalized" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cached_search"("p_group_id" "uuid", "p_query_normalized" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cached_search"("p_group_id" "uuid", "p_query_normalized" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_stats"("p_campaign_code" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_stats"("p_campaign_code" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_stats"("p_campaign_code" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_catalog_item_history"("p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_catalog_item_history"("p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_catalog_item_history"("p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_contact_with_relationships"("p_contact_id" "uuid", "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_contact_with_relationships"("p_contact_id" "uuid", "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_contact_with_relationships"("p_contact_id" "uuid", "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_contact_with_relationships"("p_contact_id" "uuid", "p_is_live" boolean, "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_contact_with_relationships"("p_contact_id" "uuid", "p_is_live" boolean, "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_contact_with_relationships"("p_contact_id" "uuid", "p_is_live" boolean, "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_group_chat_config"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_group_chat_config"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_group_chat_config"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_tool_result"("p_session_id" "uuid", "p_tool_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_tool_result"("p_session_id" "uuid", "p_tool_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_tool_result"("p_session_id" "uuid", "p_tool_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_member_card_details"("p_membership_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_member_card_details"("p_membership_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_member_card_details"("p_membership_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_member_contact"("p_membership_id" "uuid", "p_group_id" "uuid", "p_scope" character varying, "p_business_name" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_member_contact"("p_membership_id" "uuid", "p_group_id" "uuid", "p_scope" character varying, "p_business_name" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_member_contact"("p_membership_id" "uuid", "p_group_id" "uuid", "p_scope" character varying, "p_business_name" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_members_by_scope"("p_scope" character varying, "p_group_id" "uuid", "p_industry_filter" character varying, "p_chapter_filter" character varying, "p_search_text" character varying, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_members_by_scope"("p_scope" character varying, "p_group_id" "uuid", "p_industry_filter" character varying, "p_chapter_filter" character varying, "p_search_text" character varying, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_members_by_scope"("p_scope" character varying, "p_group_id" "uuid", "p_industry_filter" character varying, "p_chapter_filter" character varying, "p_search_text" character varying, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_formatted_sequence"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_formatted_sequence"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_formatted_sequence"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_formatted_sequence_safe"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean, "p_table_name" "text", "p_column_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_formatted_sequence_safe"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean, "p_table_name" "text", "p_column_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_formatted_sequence_safe"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean, "p_table_name" "text", "p_column_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_formatted_sequence_v2"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_formatted_sequence_v2"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_formatted_sequence_v2"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_sequence_number"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_sequence_number"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_sequence_number"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_sequence_number_with_reset"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_sequence_number_with_reset"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_sequence_number_with_reset"("p_sequence_type_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_tax_rate_sequence"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_tax_rate_sequence"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_tax_rate_sequence"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_version_number"("p_original_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_version_number"("p_original_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_version_number"("p_original_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_session"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_channel" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_session"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_channel" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_session"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_channel" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_master_data"("p_category_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_master_data"("p_category_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_master_data"("p_category_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_resolved_intents"("p_group_id" "uuid", "p_user_role" character varying, "p_channel" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_resolved_intents"("p_group_id" "uuid", "p_user_role" character varying, "p_channel" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_resolved_intents"("p_group_id" "uuid", "p_user_role" character varying, "p_channel" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_segments_by_scope"("p_scope" character varying, "p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_segments_by_scope"("p_scope" character varying, "p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_segments_by_scope"("p_scope" character varying, "p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sequence_status"("p_tenant_id" "uuid", "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_sequence_status"("p_tenant_id" "uuid", "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sequence_status"("p_tenant_id" "uuid", "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_service_catalog_item"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_service_catalog_item"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_service_catalog_item"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_service_pricing"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean, "p_currency_code" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_service_pricing"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean, "p_currency_code" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_service_pricing"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean, "p_currency_code" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_service_resources"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_service_resources"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_service_resources"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_smartprofile_cached_search"("p_scope" "text", "p_scope_id" "uuid", "p_query_normalized" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_smartprofile_cached_search"("p_scope" "text", "p_scope_id" "uuid", "p_query_normalized" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_smartprofile_cached_search"("p_scope" "text", "p_scope_id" "uuid", "p_query_normalized" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_stats"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_stats"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_stats"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_accessible_groups"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_accessible_groups"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_accessible_groups"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_by_phone"("p_phone" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_by_phone"("p_phone" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_by_phone"("p_phone" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_tenant_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_tenant_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_tenant_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_vani_intro_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_vani_intro_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_vani_intro_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_catalog_versioning"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_catalog_versioning"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_catalog_versioning"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_tenant_access"("check_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_tenant_access"("check_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_tenant_access"("check_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_tenant_role"("check_tenant_id" "uuid", "role_names" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."has_tenant_role"("check_tenant_id" "uuid", "role_names" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_tenant_role"("check_tenant_id" "uuid", "role_names" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_campaign_conversions"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_campaign_conversions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_campaign_conversions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_campaign_leads"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_campaign_leads"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_campaign_leads"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_session_messages"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_session_messages"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_session_messages"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_tenant_onboarding"() TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_tenant_onboarding"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_tenant_onboarding"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_audit_logs_batch"("logs" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_audit_logs_batch"("logs" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_audit_logs_batch"("logs" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."invalidate_group_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."invalidate_group_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."invalidate_group_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."invoke_jtd_worker"() TO "anon";
GRANT ALL ON FUNCTION "public"."invoke_jtd_worker"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."invoke_jtd_worker"() TO "service_role";



GRANT ALL ON FUNCTION "public"."invoke_jtd_worker_test"() TO "anon";
GRANT ALL ON FUNCTION "public"."invoke_jtd_worker_test"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."invoke_jtd_worker_test"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_ai_agent_enabled"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_ai_agent_enabled"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_ai_agent_enabled"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_exit_command"("p_message" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."is_exit_command"("p_message" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_exit_command"("p_message" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_service_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_service_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_service_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_tenant_admin"("check_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_tenant_admin"("check_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_tenant_admin"("check_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_vani_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_vani_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_vani_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."jtd_archive_to_dlq"("p_msg_id" bigint, "p_original_message" "jsonb", "p_error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."jtd_archive_to_dlq"("p_msg_id" bigint, "p_original_message" "jsonb", "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."jtd_archive_to_dlq"("p_msg_id" bigint, "p_original_message" "jsonb", "p_error_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."jtd_delete_message"("p_msg_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."jtd_delete_message"("p_msg_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jtd_delete_message"("p_msg_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."jtd_enqueue_on_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."jtd_enqueue_on_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jtd_enqueue_on_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."jtd_enqueue_scheduled"() TO "anon";
GRANT ALL ON FUNCTION "public"."jtd_enqueue_scheduled"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jtd_enqueue_scheduled"() TO "service_role";



GRANT ALL ON FUNCTION "public"."jtd_get_status_duration_summary"("p_jtd_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."jtd_get_status_duration_summary"("p_jtd_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."jtd_get_status_duration_summary"("p_jtd_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."jtd_log_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."jtd_log_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jtd_log_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."jtd_log_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."jtd_log_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jtd_log_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."jtd_queue_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."jtd_queue_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jtd_queue_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."jtd_read_queue"("p_batch_size" integer, "p_visibility_timeout" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."jtd_read_queue"("p_batch_size" integer, "p_visibility_timeout" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jtd_read_queue"("p_batch_size" integer, "p_visibility_timeout" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."jtd_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."jtd_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jtd_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."jtd_validate_transition"("p_event_type_code" character varying, "p_from_status_code" character varying, "p_to_status_code" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."jtd_validate_transition"("p_event_type_code" character varying, "p_from_status_code" character varying, "p_to_status_code" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jtd_validate_transition"("p_event_type_code" character varying, "p_from_status_code" character varying, "p_to_status_code" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."manual_reset_sequence"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean, "p_new_start_value" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."manual_reset_sequence"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean, "p_new_start_value" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."manual_reset_sequence"("p_sequence_code" "text", "p_tenant_id" "uuid", "p_is_live" boolean, "p_new_start_value" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_phone"("p_phone" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_phone"("p_phone" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_phone"("p_phone" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."promote_catalog_test_to_live"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."promote_catalog_test_to_live"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."promote_catalog_test_to_live"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."query_service_catalog_items"("p_tenant_id" "uuid", "p_is_live" boolean, "p_filters" "jsonb", "p_page" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."query_service_catalog_items"("p_tenant_id" "uuid", "p_is_live" boolean, "p_filters" "jsonb", "p_page" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."query_service_catalog_items"("p_tenant_id" "uuid", "p_is_live" boolean, "p_filters" "jsonb", "p_page" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."record_cache_failure"("p_cache_type" "text", "p_scope" "text", "p_scope_id" "uuid", "p_query_normalized" "text", "p_failure_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_cache_failure"("p_cache_type" "text", "p_scope" "text", "p_scope_id" "uuid", "p_query_normalized" "text", "p_failure_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_cache_failure"("p_cache_type" "text", "p_scope" "text", "p_scope_id" "uuid", "p_query_normalized" "text", "p_failure_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_contact_classification"("contact_id" "uuid", "classification" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_contact_classification"("contact_id" "uuid", "classification" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_contact_classification"("contact_id" "uuid", "classification" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_contact_tag"("contact_id" "uuid", "tag_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_contact_tag"("contact_id" "uuid", "tag_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_contact_tag"("contact_id" "uuid", "tag_value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reorder_tax_rate_sequences"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reorder_tax_rate_sequences"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_tax_rate_sequences"("p_tenant_id" "uuid") TO "service_role";









GRANT ALL ON FUNCTION "public"."search_businesses"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid", "p_limit" integer, "p_threshold" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."search_businesses"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid", "p_limit" integer, "p_threshold" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_businesses"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid", "p_limit" integer, "p_threshold" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_businesses_debug"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."search_businesses_debug"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_businesses_debug"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_businesses_debug_v2"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid", "p_limit" integer, "p_threshold" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."search_businesses_debug_v2"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid", "p_limit" integer, "p_threshold" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_businesses_debug_v2"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid", "p_limit" integer, "p_threshold" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_businesses_v2"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid", "p_threshold" double precision, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_businesses_v2"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid", "p_threshold" double precision, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_businesses_v2"("p_query_text" "text", "p_embedding" "text", "p_group_id" "uuid", "p_threshold" double precision, "p_limit" integer) TO "service_role";






GRANT ALL ON FUNCTION "public"."seed_sequence_numbers_for_tenant"("p_tenant_id" "uuid", "p_created_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_sequence_numbers_for_tenant"("p_tenant_id" "uuid", "p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_sequence_numbers_for_tenant"("p_tenant_id" "uuid", "p_created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_session_intent"("p_session_id" "uuid", "p_intent" "text", "p_prompt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_session_intent"("p_session_id" "uuid", "p_intent" "text", "p_prompt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_session_intent"("p_session_id" "uuid", "p_intent" "text", "p_prompt" "text") TO "service_role";












GRANT ALL ON FUNCTION "public"."soft_delete_catalog_item"("p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_catalog_item"("p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_catalog_item"("p_item_id" "uuid") TO "service_role";









GRANT ALL ON FUNCTION "public"."store_tool_result"("p_session_id" "uuid", "p_tool_name" "text", "p_query_text" "text", "p_results" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."store_tool_result"("p_session_id" "uuid", "p_tool_name" "text", "p_query_text" "text", "p_results" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_tool_result"("p_session_id" "uuid", "p_tool_name" "text", "p_query_text" "text", "p_results" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."switch_ai_session"("p_phone" character varying, "p_new_group_id" "uuid", "p_language" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."switch_ai_session"("p_phone" character varying, "p_new_group_id" "uuid", "p_language" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."switch_ai_session"("p_phone" character varying, "p_new_group_id" "uuid", "p_language" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."switch_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_new_group_id" "uuid", "p_language" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."switch_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_new_group_id" "uuid", "p_language" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."switch_ai_session_by_user"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_new_group_id" "uuid", "p_language" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."test_jtd_worker"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_jtd_worker"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_jtd_worker"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unified_search"("p_query_embedding" "text", "p_query_text" "text", "p_scope" character varying, "p_scope_id" "uuid", "p_limit" integer, "p_similarity_threshold" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."unified_search"("p_query_embedding" "text", "p_query_text" "text", "p_scope" character varying, "p_scope_id" "uuid", "p_limit" integer, "p_similarity_threshold" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."unified_search"("p_query_embedding" "text", "p_query_text" "text", "p_scope" character varying, "p_scope_id" "uuid", "p_limit" integer, "p_similarity_threshold" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."unified_search"("p_group_id" "uuid", "p_query_text" "text", "p_query_embedding" "text", "p_intent_code" character varying, "p_user_role" character varying, "p_channel" character varying, "p_scope" character varying, "p_limit" integer, "p_use_cache" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."unified_search"("p_group_id" "uuid", "p_query_text" "text", "p_query_embedding" "text", "p_intent_code" character varying, "p_user_role" character varying, "p_channel" character varying, "p_scope" character varying, "p_limit" integer, "p_use_cache" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."unified_search"("p_group_id" "uuid", "p_query_text" "text", "p_query_embedding" "text", "p_intent_code" character varying, "p_user_role" character varying, "p_channel" character varying, "p_scope" character varying, "p_limit" integer, "p_use_cache" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ai_session"("p_session_id" "uuid", "p_context" "jsonb", "p_language" character varying, "p_add_message" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_ai_session"("p_session_id" "uuid", "p_context" "jsonb", "p_language" character varying, "p_add_message" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ai_session"("p_session_id" "uuid", "p_context" "jsonb", "p_language" character varying, "p_add_message" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_cache_on_hit"("p_cache_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_cache_on_hit"("p_cache_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_cache_on_hit"("p_cache_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_catalog_timestamp_and_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_catalog_timestamp_and_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_catalog_timestamp_and_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_contact_transaction"("p_contact_id" "uuid", "p_contact_data" "jsonb", "p_contact_channels" "jsonb", "p_addresses" "jsonb", "p_contact_persons" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_contact_transaction"("p_contact_id" "uuid", "p_contact_data" "jsonb", "p_contact_channels" "jsonb", "p_addresses" "jsonb", "p_contact_persons" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_contact_transaction"("p_contact_id" "uuid", "p_contact_data" "jsonb", "p_contact_channels" "jsonb", "p_addresses" "jsonb", "p_contact_persons" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_contact_transaction"("p_contact_id" "uuid", "p_contact_data" "jsonb", "p_contact_channels" "jsonb", "p_addresses" "jsonb", "p_contact_persons" "jsonb", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_contact_transaction"("p_contact_id" "uuid", "p_contact_data" "jsonb", "p_contact_channels" "jsonb", "p_addresses" "jsonb", "p_contact_persons" "jsonb", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_contact_transaction"("p_contact_id" "uuid", "p_contact_data" "jsonb", "p_contact_channels" "jsonb", "p_addresses" "jsonb", "p_contact_persons" "jsonb", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_duplicate_flags"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_duplicate_flags"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_duplicate_flags"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_group_member_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_group_member_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_group_member_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_m_products_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_m_products_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_m_products_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_master_catalog_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_master_catalog_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_master_catalog_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_sequence_counters_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_sequence_counters_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_sequence_counters_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_service_catalog_item"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_update_data" "jsonb", "p_idempotency_key" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."update_service_catalog_item"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_update_data" "jsonb", "p_idempotency_key" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_service_catalog_item"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_update_data" "jsonb", "p_idempotency_key" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_service_pricing"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_pricing_data" "jsonb", "p_idempotency_key" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."update_service_pricing"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_pricing_data" "jsonb", "p_idempotency_key" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_service_pricing"("p_service_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_is_live" boolean, "p_pricing_data" "jsonb", "p_idempotency_key" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_smartprofile_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_smartprofile_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_smartprofile_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_tenant_smartprofile"("p_tenant_id" "uuid", "p_profile_type" "text", "p_short_description" "text", "p_embedding" "text", "p_clusters" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_tenant_smartprofile"("p_tenant_id" "uuid", "p_profile_type" "text", "p_short_description" "text", "p_embedding" "text", "p_clusters" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_tenant_smartprofile"("p_tenant_id" "uuid", "p_profile_type" "text", "p_short_description" "text", "p_embedding" "text", "p_clusters" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_access_environment"("p_tenant_id" "uuid", "p_is_live" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_access_environment"("p_tenant_id" "uuid", "p_is_live" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_access_environment"("p_tenant_id" "uuid", "p_is_live" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_category_environment_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_category_environment_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_category_environment_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_item_environment_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_item_environment_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_item_environment_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_pricing_template_config"("p_rule_type" character varying, "p_condition_config" "jsonb", "p_action_config" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_pricing_template_config"("p_rule_type" character varying, "p_condition_config" "jsonb", "p_action_config" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_pricing_template_config"("p_rule_type" character varying, "p_condition_config" "jsonb", "p_action_config" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_tax_rate_business_rules"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_tax_rate_business_rules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_tax_rate_business_rules"() TO "service_role";





























































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































GRANT ALL ON TABLE "public"."c_category_details" TO "anon";
GRANT ALL ON TABLE "public"."c_category_details" TO "authenticated";
GRANT ALL ON TABLE "public"."c_category_details" TO "service_role";



GRANT ALL ON TABLE "public"."c_category_master" TO "anon";
GRANT ALL ON TABLE "public"."c_category_master" TO "authenticated";
GRANT ALL ON TABLE "public"."c_category_master" TO "service_role";



GRANT ALL ON TABLE "public"."familyknows_contacts" TO "anon";
GRANT ALL ON TABLE "public"."familyknows_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."familyknows_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."familyknows_waitlist" TO "anon";
GRANT ALL ON TABLE "public"."familyknows_waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."familyknows_waitlist" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON TABLE "public"."m_block_categories" TO "anon";
GRANT ALL ON TABLE "public"."m_block_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."m_block_categories" TO "service_role";



GRANT ALL ON TABLE "public"."m_block_masters" TO "anon";
GRANT ALL ON TABLE "public"."m_block_masters" TO "authenticated";
GRANT ALL ON TABLE "public"."m_block_masters" TO "service_role";



GRANT ALL ON TABLE "public"."m_block_variants" TO "anon";
GRANT ALL ON TABLE "public"."m_block_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."m_block_variants" TO "service_role";



GRANT ALL ON TABLE "public"."m_catalog_categories" TO "anon";
GRANT ALL ON TABLE "public"."m_catalog_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."m_catalog_categories" TO "service_role";



GRANT ALL ON TABLE "public"."m_catalog_category_industry_map" TO "anon";
GRANT ALL ON TABLE "public"."m_catalog_category_industry_map" TO "authenticated";
GRANT ALL ON TABLE "public"."m_catalog_category_industry_map" TO "service_role";



GRANT ALL ON TABLE "public"."m_catalog_industries" TO "anon";
GRANT ALL ON TABLE "public"."m_catalog_industries" TO "authenticated";
GRANT ALL ON TABLE "public"."m_catalog_industries" TO "service_role";



GRANT ALL ON TABLE "public"."m_catalog_pricing_templates" TO "anon";
GRANT ALL ON TABLE "public"."m_catalog_pricing_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."m_catalog_pricing_templates" TO "service_role";



GRANT ALL ON TABLE "public"."m_catalog_resource_templates" TO "anon";
GRANT ALL ON TABLE "public"."m_catalog_resource_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."m_catalog_resource_templates" TO "service_role";



GRANT ALL ON TABLE "public"."m_catalog_resource_types" TO "anon";
GRANT ALL ON TABLE "public"."m_catalog_resource_types" TO "authenticated";
GRANT ALL ON TABLE "public"."m_catalog_resource_types" TO "service_role";



GRANT ALL ON TABLE "public"."m_category_details" TO "anon";
GRANT ALL ON TABLE "public"."m_category_details" TO "authenticated";
GRANT ALL ON TABLE "public"."m_category_details" TO "service_role";



GRANT ALL ON TABLE "public"."m_category_master" TO "anon";
GRANT ALL ON TABLE "public"."m_category_master" TO "authenticated";
GRANT ALL ON TABLE "public"."m_category_master" TO "service_role";



GRANT ALL ON TABLE "public"."m_permissions" TO "anon";
GRANT ALL ON TABLE "public"."m_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."m_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."m_products" TO "anon";
GRANT ALL ON TABLE "public"."m_products" TO "authenticated";
GRANT ALL ON TABLE "public"."m_products" TO "service_role";



GRANT ALL ON TABLE "public"."n_customers" TO "anon";
GRANT ALL ON TABLE "public"."n_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."n_customers" TO "service_role";



GRANT ALL ON TABLE "public"."n_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."n_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."n_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."n_jtd" TO "anon";
GRANT ALL ON TABLE "public"."n_jtd" TO "authenticated";
GRANT ALL ON TABLE "public"."n_jtd" TO "service_role";



GRANT ALL ON TABLE "public"."n_jtd_channels" TO "anon";
GRANT ALL ON TABLE "public"."n_jtd_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."n_jtd_channels" TO "service_role";



GRANT ALL ON TABLE "public"."n_jtd_event_types" TO "anon";
GRANT ALL ON TABLE "public"."n_jtd_event_types" TO "authenticated";
GRANT ALL ON TABLE "public"."n_jtd_event_types" TO "service_role";



GRANT ALL ON TABLE "public"."n_jtd_history" TO "anon";
GRANT ALL ON TABLE "public"."n_jtd_history" TO "authenticated";
GRANT ALL ON TABLE "public"."n_jtd_history" TO "service_role";



GRANT ALL ON TABLE "public"."n_jtd_source_types" TO "anon";
GRANT ALL ON TABLE "public"."n_jtd_source_types" TO "authenticated";
GRANT ALL ON TABLE "public"."n_jtd_source_types" TO "service_role";



GRANT ALL ON TABLE "public"."n_jtd_status_flows" TO "anon";
GRANT ALL ON TABLE "public"."n_jtd_status_flows" TO "authenticated";
GRANT ALL ON TABLE "public"."n_jtd_status_flows" TO "service_role";



GRANT ALL ON TABLE "public"."n_jtd_status_history" TO "anon";
GRANT ALL ON TABLE "public"."n_jtd_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."n_jtd_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."n_jtd_statuses" TO "anon";
GRANT ALL ON TABLE "public"."n_jtd_statuses" TO "authenticated";
GRANT ALL ON TABLE "public"."n_jtd_statuses" TO "service_role";



GRANT ALL ON TABLE "public"."n_jtd_templates" TO "anon";
GRANT ALL ON TABLE "public"."n_jtd_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."n_jtd_templates" TO "service_role";



GRANT ALL ON TABLE "public"."n_jtd_tenant_config" TO "anon";
GRANT ALL ON TABLE "public"."n_jtd_tenant_config" TO "authenticated";
GRANT ALL ON TABLE "public"."n_jtd_tenant_config" TO "service_role";



GRANT ALL ON TABLE "public"."n_jtd_tenant_source_config" TO "anon";
GRANT ALL ON TABLE "public"."n_jtd_tenant_source_config" TO "authenticated";
GRANT ALL ON TABLE "public"."n_jtd_tenant_source_config" TO "service_role";



GRANT ALL ON TABLE "public"."n_platform_providers" TO "anon";
GRANT ALL ON TABLE "public"."n_platform_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."n_platform_providers" TO "service_role";



GRANT ALL ON TABLE "public"."n_system_actors" TO "anon";
GRANT ALL ON TABLE "public"."n_system_actors" TO "authenticated";
GRANT ALL ON TABLE "public"."n_system_actors" TO "service_role";



GRANT ALL ON TABLE "public"."n_templates" TO "anon";
GRANT ALL ON TABLE "public"."n_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."n_templates" TO "service_role";



GRANT ALL ON TABLE "public"."n_tenant_preferences" TO "anon";
GRANT ALL ON TABLE "public"."n_tenant_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."n_tenant_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."t_ai_agent_sessions" TO "anon";
GRANT ALL ON TABLE "public"."t_ai_agent_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."t_ai_agent_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."t_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."t_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."t_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."t_bm_feature_reference" TO "anon";
GRANT ALL ON TABLE "public"."t_bm_feature_reference" TO "authenticated";
GRANT ALL ON TABLE "public"."t_bm_feature_reference" TO "service_role";



GRANT ALL ON TABLE "public"."t_bm_invoice" TO "anon";
GRANT ALL ON TABLE "public"."t_bm_invoice" TO "authenticated";
GRANT ALL ON TABLE "public"."t_bm_invoice" TO "service_role";



GRANT ALL ON TABLE "public"."t_bm_notification_reference" TO "anon";
GRANT ALL ON TABLE "public"."t_bm_notification_reference" TO "authenticated";
GRANT ALL ON TABLE "public"."t_bm_notification_reference" TO "service_role";



GRANT ALL ON TABLE "public"."t_bm_plan_version" TO "anon";
GRANT ALL ON TABLE "public"."t_bm_plan_version" TO "authenticated";
GRANT ALL ON TABLE "public"."t_bm_plan_version" TO "service_role";



GRANT ALL ON TABLE "public"."t_bm_pricing_plan" TO "anon";
GRANT ALL ON TABLE "public"."t_bm_pricing_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."t_bm_pricing_plan" TO "service_role";



GRANT ALL ON TABLE "public"."t_bm_subscription_usage" TO "anon";
GRANT ALL ON TABLE "public"."t_bm_subscription_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."t_bm_subscription_usage" TO "service_role";



GRANT ALL ON TABLE "public"."t_bm_tenant_subscription" TO "anon";
GRANT ALL ON TABLE "public"."t_bm_tenant_subscription" TO "authenticated";
GRANT ALL ON TABLE "public"."t_bm_tenant_subscription" TO "service_role";



GRANT ALL ON TABLE "public"."t_business_groups" TO "anon";
GRANT ALL ON TABLE "public"."t_business_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."t_business_groups" TO "service_role";



GRANT ALL ON TABLE "public"."t_campaign_leads" TO "anon";
GRANT ALL ON TABLE "public"."t_campaign_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."t_campaign_leads" TO "service_role";



GRANT ALL ON TABLE "public"."t_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."t_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."t_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."t_catalog_categories" TO "anon";
GRANT ALL ON TABLE "public"."t_catalog_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."t_catalog_categories" TO "service_role";



GRANT ALL ON TABLE "public"."t_catalog_industries" TO "anon";
GRANT ALL ON TABLE "public"."t_catalog_industries" TO "authenticated";
GRANT ALL ON TABLE "public"."t_catalog_industries" TO "service_role";



GRANT ALL ON TABLE "public"."t_catalog_items" TO "anon";
GRANT ALL ON TABLE "public"."t_catalog_items" TO "authenticated";
GRANT ALL ON TABLE "public"."t_catalog_items" TO "service_role";



GRANT ALL ON TABLE "public"."t_catalog_resource_pricing" TO "anon";
GRANT ALL ON TABLE "public"."t_catalog_resource_pricing" TO "authenticated";
GRANT ALL ON TABLE "public"."t_catalog_resource_pricing" TO "service_role";



GRANT ALL ON TABLE "public"."t_catalog_resources" TO "anon";
GRANT ALL ON TABLE "public"."t_catalog_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."t_catalog_resources" TO "service_role";



GRANT ALL ON TABLE "public"."t_catalog_service_resources" TO "anon";
GRANT ALL ON TABLE "public"."t_catalog_service_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."t_catalog_service_resources" TO "service_role";



GRANT ALL ON TABLE "public"."t_category_details" TO "anon";
GRANT ALL ON TABLE "public"."t_category_details" TO "authenticated";
GRANT ALL ON TABLE "public"."t_category_details" TO "service_role";



GRANT ALL ON TABLE "public"."t_category_master" TO "anon";
GRANT ALL ON TABLE "public"."t_category_master" TO "authenticated";
GRANT ALL ON TABLE "public"."t_category_master" TO "service_role";



GRANT ALL ON TABLE "public"."t_category_resources_master" TO "anon";
GRANT ALL ON TABLE "public"."t_category_resources_master" TO "authenticated";
GRANT ALL ON TABLE "public"."t_category_resources_master" TO "service_role";



GRANT ALL ON TABLE "public"."t_contact_addresses" TO "anon";
GRANT ALL ON TABLE "public"."t_contact_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."t_contact_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."t_contact_channels" TO "anon";
GRANT ALL ON TABLE "public"."t_contact_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."t_contact_channels" TO "service_role";



GRANT ALL ON TABLE "public"."t_contacts" TO "anon";
GRANT ALL ON TABLE "public"."t_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."t_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."t_domain_mappings" TO "anon";
GRANT ALL ON TABLE "public"."t_domain_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."t_domain_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."t_group_activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."t_group_activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."t_group_activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."t_group_memberships" TO "anon";
GRANT ALL ON TABLE "public"."t_group_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."t_group_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."t_idempotency_keys" TO "anon";
GRANT ALL ON TABLE "public"."t_idempotency_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."t_idempotency_keys" TO "service_role";



GRANT ALL ON TABLE "public"."t_integration_providers" TO "anon";
GRANT ALL ON TABLE "public"."t_integration_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."t_integration_providers" TO "service_role";



GRANT ALL ON TABLE "public"."t_integration_types" TO "anon";
GRANT ALL ON TABLE "public"."t_integration_types" TO "authenticated";
GRANT ALL ON TABLE "public"."t_integration_types" TO "service_role";



GRANT ALL ON TABLE "public"."t_intent_definitions" TO "anon";
GRANT ALL ON TABLE "public"."t_intent_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."t_intent_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."t_invitation_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."t_invitation_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."t_invitation_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."t_onboarding_step_status" TO "anon";
GRANT ALL ON TABLE "public"."t_onboarding_step_status" TO "authenticated";
GRANT ALL ON TABLE "public"."t_onboarding_step_status" TO "service_role";



GRANT ALL ON TABLE "public"."t_query_cache" TO "anon";
GRANT ALL ON TABLE "public"."t_query_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."t_query_cache" TO "service_role";



GRANT ALL ON TABLE "public"."t_role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."t_role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."t_role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."t_semantic_clusters" TO "anon";
GRANT ALL ON TABLE "public"."t_semantic_clusters" TO "authenticated";
GRANT ALL ON TABLE "public"."t_semantic_clusters" TO "service_role";



GRANT ALL ON TABLE "public"."t_sequence_counters" TO "anon";
GRANT ALL ON TABLE "public"."t_sequence_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."t_sequence_counters" TO "service_role";



GRANT ALL ON TABLE "public"."t_system_config" TO "anon";
GRANT ALL ON TABLE "public"."t_system_config" TO "authenticated";
GRANT ALL ON TABLE "public"."t_system_config" TO "service_role";



GRANT ALL ON TABLE "public"."t_tax_info" TO "anon";
GRANT ALL ON TABLE "public"."t_tax_info" TO "authenticated";
GRANT ALL ON TABLE "public"."t_tax_info" TO "service_role";



GRANT ALL ON TABLE "public"."t_tax_rates" TO "anon";
GRANT ALL ON TABLE "public"."t_tax_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."t_tax_rates" TO "service_role";



GRANT ALL ON TABLE "public"."t_tax_settings" TO "anon";
GRANT ALL ON TABLE "public"."t_tax_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."t_tax_settings" TO "service_role";



GRANT ALL ON TABLE "public"."t_tenant_domains" TO "anon";
GRANT ALL ON TABLE "public"."t_tenant_domains" TO "authenticated";
GRANT ALL ON TABLE "public"."t_tenant_domains" TO "service_role";



GRANT ALL ON TABLE "public"."t_tenant_files" TO "anon";
GRANT ALL ON TABLE "public"."t_tenant_files" TO "authenticated";
GRANT ALL ON TABLE "public"."t_tenant_files" TO "service_role";



GRANT ALL ON TABLE "public"."t_tenant_integrations" TO "anon";
GRANT ALL ON TABLE "public"."t_tenant_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."t_tenant_integrations" TO "service_role";



GRANT ALL ON TABLE "public"."t_tenant_onboarding" TO "anon";
GRANT ALL ON TABLE "public"."t_tenant_onboarding" TO "authenticated";
GRANT ALL ON TABLE "public"."t_tenant_onboarding" TO "service_role";



GRANT ALL ON TABLE "public"."t_tenant_profiles" TO "anon";
GRANT ALL ON TABLE "public"."t_tenant_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."t_tenant_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."t_tenant_regions" TO "anon";
GRANT ALL ON TABLE "public"."t_tenant_regions" TO "authenticated";
GRANT ALL ON TABLE "public"."t_tenant_regions" TO "service_role";



GRANT ALL ON TABLE "public"."t_tenant_smartprofiles" TO "anon";
GRANT ALL ON TABLE "public"."t_tenant_smartprofiles" TO "authenticated";
GRANT ALL ON TABLE "public"."t_tenant_smartprofiles" TO "service_role";



GRANT ALL ON TABLE "public"."t_tenants" TO "anon";
GRANT ALL ON TABLE "public"."t_tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."t_tenants" TO "service_role";



GRANT ALL ON TABLE "public"."t_tool_results" TO "anon";
GRANT ALL ON TABLE "public"."t_tool_results" TO "authenticated";
GRANT ALL ON TABLE "public"."t_tool_results" TO "service_role";



GRANT ALL ON TABLE "public"."t_user_auth_methods" TO "anon";
GRANT ALL ON TABLE "public"."t_user_auth_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."t_user_auth_methods" TO "service_role";



GRANT UPDATE("last_used_at") ON TABLE "public"."t_user_auth_methods" TO "authenticated";



GRANT UPDATE("metadata") ON TABLE "public"."t_user_auth_methods" TO "authenticated";



GRANT ALL ON TABLE "public"."t_user_invitations" TO "anon";
GRANT ALL ON TABLE "public"."t_user_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."t_user_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."t_user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."t_user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."t_user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."t_user_tenant_roles" TO "anon";
GRANT ALL ON TABLE "public"."t_user_tenant_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."t_user_tenant_roles" TO "service_role";



GRANT ALL ON TABLE "public"."t_user_tenants" TO "anon";
GRANT ALL ON TABLE "public"."t_user_tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."t_user_tenants" TO "service_role";



GRANT ALL ON TABLE "public"."v_audit_logs_detailed" TO "anon";
GRANT ALL ON TABLE "public"."v_audit_logs_detailed" TO "authenticated";
GRANT ALL ON TABLE "public"."v_audit_logs_detailed" TO "service_role";



GRANT ALL ON TABLE "public"."v_cache_analytics" TO "anon";
GRANT ALL ON TABLE "public"."v_cache_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cache_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."v_membership_details" TO "anon";
GRANT ALL ON TABLE "public"."v_membership_details" TO "authenticated";
GRANT ALL ON TABLE "public"."v_membership_details" TO "service_role";



GRANT ALL ON TABLE "public"."v_onboarding_master_data" TO "anon";
GRANT ALL ON TABLE "public"."v_onboarding_master_data" TO "authenticated";
GRANT ALL ON TABLE "public"."v_onboarding_master_data" TO "service_role";


































































































































































SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "n8n" GRANT ALL ON TABLES  TO "postgres";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
