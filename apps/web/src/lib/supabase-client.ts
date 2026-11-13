import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@humanity/contracts';
import { getPublicClientEnv } from './env';

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Creates or returns the singleton public Supabase client for client-side operations.
 * SECURITY ASSURANCE:
 * - Operates under public anon key + authenticated user session.
 * - All table operations are strictly evaluated against PostgreSQL Row-Level Security (RLS).
 * - Service-role key is strictly prohibited and validated on initialization.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getPublicClientEnv();

  browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'humanity_supabase_auth_token',
    },
  });

  return browserClient;
}
