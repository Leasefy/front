import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient, LockFunc } from '@supabase/supabase-js'

let supabase: SupabaseClient | null = null

/**
 * Custom lock that bypasses navigator.locks. Resolves immediately —
 * runs the callback in-line. Safe acá porque tenemos UN solo cliente
 * Supabase (singleton) y no necesitamos coordinación cross-tab para auth.
 *
 * El lock por defecto de @supabase/auth-js (navigator.locks) tira
 * `AbortError: signal is aborted without reason` cuando dos llamadas auth
 * concurrentes (ej. checkMfaLevel + updateUser) compiten por el lock,
 * y deja al cliente colgado.
 */
const noopLock: LockFunc = async (_name, _timeout, fn) => fn()

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

  // isSingleton: false → bypassa el cache interno de @supabase/ssr (que
  // persiste entre hot-reloads y devuelve clientes viejos sin aplicar opciones).
  // Igual mantenemos UN cliente porque getSupabase tiene su propio singleton arriba.
  supabase = createBrowserClient(url, anonKey, {
    isSingleton: false,
    auth: { lock: noopLock },
  })
  return supabase
}
