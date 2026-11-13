/**
 * Humanity Platform - Safe Environment Variable Validator
 * STRICT RULE: Only NEXT_PUBLIC_* variables may be accessed in client-side code.
 * Service role key must remain server-side only.
 */

export interface PublicClientEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  defaultLocale: 'ar' | 'en';
  appEnv: 'development' | 'staging' | 'production';
}

export function getPublicClientEnv(): PublicClientEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_anon_key_for_local_development_only';
  const defaultLocale = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE === 'en' ? 'en' : 'ar') as
    'ar' | 'en';
  const appEnv = (process.env.NEXT_PUBLIC_APP_ENV || 'development') as
    'development' | 'staging' | 'production';

  // Safeguard check: ensure no service-role key is mistakenly exposed as an anon key
  if (supabaseAnonKey.includes('service_role') || supabaseAnonKey.includes('secret')) {
    throw new Error(
      'SECURITY VIOLATION: Service role key must never be used as a public anon key!',
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    defaultLocale,
    appEnv,
  };
}
