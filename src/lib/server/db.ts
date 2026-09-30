import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Env = Record<string, string | undefined>;

let cached: { key: string; client: SupabaseClient } | null = null;

/**
 * Server-only Supabase client (project TMI), authenticated with the secret key.
 * Returns null when SUPABASE_URL / SUPABASE_SECRET_KEY are missing: the app
 * then works as before, just without storing anything.
 */
export function getDb(env: Env): SupabaseClient | null {
  const url = env.SUPABASE_URL?.trim();
  const secret = env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secret) return null;

  const key = `${url}\n${secret}`;
  if (cached?.key !== key) {
    cached = {
      key,
      client: createClient(url, secret, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }),
    };
  }
  return cached.client;
}
