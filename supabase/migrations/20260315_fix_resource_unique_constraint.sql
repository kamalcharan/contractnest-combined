-- Fix: Replace absolute unique constraint with partial unique index
-- This allows soft-deleted (is_live=false) or inactive (is_active=false) resource names to be reused
-- while still enforcing uniqueness among active, live resources.

-- Drop the existing unique index that blocks ALL duplicate names (including deleted ones)
DROP INDEX IF EXISTS public.t_category_resources_master_tenant_id_idx;

-- Create a partial unique index that only enforces uniqueness on active, live records
CREATE UNIQUE INDEX t_category_resources_master_tenant_id_idx
  ON public.t_category_resources_master (tenant_id, resource_type_id, name)
  WHERE is_live = true AND is_active = true;
