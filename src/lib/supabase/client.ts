import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | null = null

/**
 * Get the Supabase browser client (singleton).
 * Uses @supabase/ssr for cookie-based session management.
 * Returns null if env vars are not configured yet.
 */
export function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.warn('[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — running without Supabase')
    return null
  }

  supabase = createBrowserClient(url, anonKey)
  return supabase
}
