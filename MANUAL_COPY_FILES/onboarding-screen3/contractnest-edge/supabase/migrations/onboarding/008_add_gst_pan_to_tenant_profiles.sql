-- Migration: 008_add_gst_pan_to_tenant_profiles.sql
-- Adds India-specific tax identity fields to t_tenant_profiles.
-- Both columns are optional (nullable) — existing rows are unaffected.

ALTER TABLE t_tenant_profiles
  ADD COLUMN IF NOT EXISTS gst_number  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pan_number  TEXT DEFAULT NULL;

-- Normalise on write (uppercase, stripped whitespace) via check constraints.
ALTER TABLE t_tenant_profiles
  ADD CONSTRAINT chk_gst_format
    CHECK (gst_number IS NULL OR (length(trim(gst_number)) = 15)),
  ADD CONSTRAINT chk_pan_format
    CHECK (pan_number IS NULL OR (length(trim(pan_number)) = 10));

COMMENT ON COLUMN t_tenant_profiles.gst_number IS
  'Goods and Services Tax Identification Number (15-char GSTIN, India)';
COMMENT ON COLUMN t_tenant_profiles.pan_number IS
  'Permanent Account Number (10-char PAN, India)';
