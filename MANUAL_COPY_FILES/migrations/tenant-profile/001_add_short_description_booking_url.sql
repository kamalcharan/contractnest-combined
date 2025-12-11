-- ============================================
-- ADD short_description AND booking_url TO t_tenant_profiles
-- For search result cards and Book Appointment intent
-- ============================================

-- Step 1: Add short_description column (200 chars for search result snippets)
ALTER TABLE public.t_tenant_profiles
ADD COLUMN IF NOT EXISTS short_description VARCHAR(200);

-- Step 2: Add booking_url column (for Calendly/Cal.com appointment links)
ALTER TABLE public.t_tenant_profiles
ADD COLUMN IF NOT EXISTS booking_url VARCHAR(500);

-- Step 3: Add comments for documentation
COMMENT ON COLUMN public.t_tenant_profiles.short_description IS 'Brief business description (max 200 chars) shown in search result cards';
COMMENT ON COLUMN public.t_tenant_profiles.booking_url IS 'Appointment booking URL (Calendly, Cal.com, etc.) for Book Appointment intent';

-- Step 4: Create index for short_description (for text search if needed later)
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_short_description
ON public.t_tenant_profiles USING gin(to_tsvector('english', COALESCE(short_description, '')));

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the columns were added:
-- SELECT column_name, data_type, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name = 't_tenant_profiles'
-- AND column_name IN ('short_description', 'booking_url');
