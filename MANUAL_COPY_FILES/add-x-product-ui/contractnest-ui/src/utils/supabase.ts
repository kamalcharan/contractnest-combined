// src/utils/supabase.ts
// Supabase client with X-Product header support for multi-product architecture

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ===== Product Context Configuration =====
const PRODUCT_CONTEXT_KEY = 'current_product_context';
const DEFAULT_PRODUCT = import.meta.env.VITE_DEFAULT_PRODUCT || 'contractnest';

/**
 * Get current product context for X-Product header
 * Priority: sessionStorage > localStorage > URL detection > env default
 */
export const getProductContext = (): string => {
  // Check sessionStorage first (per-session context)
  const sessionProduct = sessionStorage.getItem(PRODUCT_CONTEXT_KEY);
  if (sessionProduct) return sessionProduct;

  // Check localStorage (persistent context)
  const storedProduct = localStorage.getItem(PRODUCT_CONTEXT_KEY);
  if (storedProduct) return storedProduct;

  // Detect from URL path
  const path = window.location.pathname.toLowerCase();
  if (path.includes('familyknows')) return 'familyknows';

  // Return default from env or fallback
  return DEFAULT_PRODUCT;
};

/**
 * Set product context
 */
export const setProductContext = (product: string, persist: boolean = false): void => {
  sessionStorage.setItem(PRODUCT_CONTEXT_KEY, product);
  if (persist) {
    localStorage.setItem(PRODUCT_CONTEXT_KEY, product);
  }
  console.log(`[Supabase] Product context set to: ${product}`);
};

// ===== Supabase Configuration =====
// Debug: Log ALL available environment variables (only in dev)
if (import.meta.env.DEV) {
  console.log('🔍 Supabase Environment Check:', {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET',
    VITE_SUPABASE_KEY: import.meta.env.VITE_SUPABASE_KEY ? 'SET' : 'NOT SET',
    VITE_DEFAULT_PRODUCT: import.meta.env.VITE_DEFAULT_PRODUCT || 'NOT SET (using: contractnest)',
    MODE: import.meta.env.MODE
  });
}

// Direct access to env variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

// Handle missing variables
let finalUrl = supabaseUrl;
let finalKey = supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration:', {
    URL: supabaseUrl ? 'present' : 'MISSING',
    KEY: supabaseAnonKey ? 'present' : 'MISSING'
  });

  // Temporary fallback for development/testing only
  if (import.meta.env.DEV) {
    console.warn('🚨 Using fallback values for development...');
    finalUrl = 'https://uwyqhzotluikawcboldr.supabase.co';
    finalKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3eXFoem90bHVpa2F3Y2JvbGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjU1NDcsImV4cCI6MjA2MDQwMTU0N30.YB4k5XXubv8q4eMv0__VzmBX-B615qLu_ejHgpw_bIQ';
  }
}

// ===== Create Supabase Client with Global Headers =====
// X-Product header is included in ALL requests to Supabase
export const supabase: SupabaseClient = createClient(finalUrl, finalKey, {
  global: {
    headers: {
      'x-product': getProductContext(),
    },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Log successful initialization
console.log('✅ Supabase client initialized with x-product:', getProductContext());

/**
 * Create a new Supabase client with updated product context
 * Use this when product context changes and you need fresh headers
 */
export const createSupabaseWithProduct = (product: string): SupabaseClient => {
  return createClient(finalUrl, finalKey, {
    global: {
      headers: {
        'x-product': product,
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
};

/**
 * Get current product being used
 */
export const getCurrentProductContext = (): string => {
  return getProductContext();
};

export default supabase;
