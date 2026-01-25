// src/utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Debug: Log ALL available environment variables
console.log('🔍 ALL import.meta.env:', import.meta.env);
console.log('🔍 All VITE_ variables:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));

// Direct access - bypass env.ts for now
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

// X-Product header for multi-product architecture
// This identifies the product for auth operations that go directly to Supabase
const defaultProduct = import.meta.env.VITE_DEFAULT_PRODUCT || 'contractnest';

console.log('Direct VITE_SUPABASE_URL:', supabaseUrl);
console.log('Direct VITE_SUPABASE_KEY:', supabaseAnonKey);
console.log('Direct VITE_DEFAULT_PRODUCT:', defaultProduct);
console.log('Environment MODE:', import.meta.env.MODE);
console.log('Environment DEV:', import.meta.env.DEV);
console.log('Environment PROD:', import.meta.env.PROD);

// Handle missing variables
let finalUrl = supabaseUrl;
let finalKey = supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing vars - URL:', supabaseUrl, 'KEY:', supabaseAnonKey);

  // Temporary fallback for testing
  console.log('🚨 Using fallback values for testing...');
  finalUrl = 'https://uwyqhzotluikawcboldr.supabase.co';
  finalKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3eXFoem90bHVpa2F3Y2JvbGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjU1NDcsImV4cCI6MjA2MDQwMTU0N30.YB4k5XXubv8q4eMv0__VzmBX-B615qLu_ejHgpw_bIQ';
}

// Create Supabase client with x-product header for multi-product architecture
// This header identifies the product for auth operations (login, register, OAuth)
// that go directly to Supabase without passing through the API
export const supabase = createClient(finalUrl, finalKey, {
  global: {
    headers: {
      'x-product': defaultProduct
    }
  }
});
