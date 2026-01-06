-- Migration: Add contact person name fields to t_tenant_profiles
-- Date: 2024-12-29
-- Description: Adds contact_first_name and contact_last_name columns for contact person information

-- Add contact name columns
ALTER TABLE t_tenant_profiles
ADD COLUMN IF NOT EXISTS contact_first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS contact_last_name VARCHAR(100);

-- Add comment for documentation
COMMENT ON COLUMN t_tenant_profiles.contact_first_name IS 'First name of the primary contact person';
COMMENT ON COLUMN t_tenant_profiles.contact_last_name IS 'Last name of the primary contact person';
