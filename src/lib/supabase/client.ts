import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.startsWith('http') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.length > 20
  );
};

export function createClient() {
  if (!isSupabaseConfigured()) {
    // Return dummy client if not configured so it doesn't crash during build or mock mode
    return createSupabaseClient('https://placeholder.supabase.co', 'placeholder-anon-key');
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();
