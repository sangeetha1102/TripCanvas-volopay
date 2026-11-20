import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function isValidHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      !value.includes('your-project-ref')
    );
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  isValidHttpUrl(supabaseUrl) &&
    supabaseAnonKey &&
    supabaseAnonKey.trim().length > 10 &&
    !supabaseAnonKey.includes('your-supabase-anon-key')
);

// Public anon key only — service-role credentials are strictly forbidden in frontend code.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
