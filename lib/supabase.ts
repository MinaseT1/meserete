import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined'

// Fallback to hardcoded values if env vars are not available (for debugging)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vuwuznamewreqexscesw.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1d3V6bmFtZXdyZXFleHNjZXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMTIzNjcsImV4cCI6MjA2ODU4ODM2N30.RFA8bryyM82n6lymxXPrEyJwAVuO95xU6UcmQrdEWdY'

console.log('🔧 Supabase environment variables:', {
  isBrowser,
  url: supabaseUrl ? 'SET' : 'MISSING',
  key: supabaseAnonKey ? 'SET' : 'MISSING',
  urlValue: supabaseUrl,
  keyLength: supabaseAnonKey?.length || 0
});

// Lazy client creation
let _supabase: SupabaseClient | null = null

// Create a function to get Supabase client
export function getSupabaseClient() {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Supabase credentials missing:', { url: !!supabaseUrl, key: !!supabaseAnonKey });
      throw new Error('Supabase credentials are required');
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

// Export a getter function that creates the client on demand
export function getSupabase() {
  try {
    return getSupabaseClient();
  } catch (error) {
    console.warn('⚠️ Supabase client creation failed:', error);
    throw error;
  }
}

// For backward compatibility, export supabase as a getter
export const supabase = {
  get client() {
    return getSupabase();
  }
}

// For server-side operations with service role key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1d3V6bmFtZXdyZXFleHNjZXN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzAxMjM2NywiZXhwIjoyMDY4NTg4MzY3fQ.CipUSAN4ThDlbrfTDKsUexIxnXxkGa8TkDXYmh4KGyo'

// Create admin client with error handling
let _supabaseAdmin: SupabaseClient | null = null

export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    if (!supabaseServiceKey) {
      console.warn('⚠️ Supabase service role key missing, admin operations will not work');
      return null;
    }
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return _supabaseAdmin;
}

// Export admin client with lazy loading
export const supabaseAdmin = getSupabaseAdmin()