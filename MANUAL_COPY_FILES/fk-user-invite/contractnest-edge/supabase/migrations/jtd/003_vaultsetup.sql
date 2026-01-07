-- Insert secrets into vault (run separately, not in migration)
-- Replace with actual values for your target environment

SELECT vault.create_secret(
    'https://YOUR-PROJECT-REF.supabase.co',
    'SUPABASE_URL',
    'Supabase project URL'
);

SELECT vault.create_secret(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY', 
    'Supabase service role key'
);

-- Verify secrets
SELECT name, description FROM vault.decrypted_secrets;