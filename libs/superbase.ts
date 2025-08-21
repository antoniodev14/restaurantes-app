import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra =
  (Constants.expoConfig?.extra as any) ??
  ((Constants as any).manifest?.extra as any) ?? {}; // compatibilidad Expo Go

const supabaseUrl = extra.supabaseUrl;
const supabaseAnonKey = extra.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ SUPABASE_URL o SUPABASE_ANON_KEY no están definidos. Revisa .env y app.config.ts.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

// Public client without auth headers, useful for fetching data that should be
// accessible even when the user is logged in (RLS policies may restrict the
// authenticated role).
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export { supabaseAnonKey, supabaseUrl };
