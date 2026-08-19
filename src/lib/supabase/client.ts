import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { crossTabLock } from './cross-tab-lock'

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

  // isSingleton: false → bypassa el cache interno de @supabase/ssr (que
  // persiste entre hot-reloads y devuelve clientes viejos sin aplicar opciones).
  // Igual mantenemos UN cliente porque getSupabase tiene su propio singleton arriba.
  //
  // `lock`: serialización cross-tab REAL. El singleton de arriba es por pestaña,
  // así que sin esto dos pestañas renuevan el mismo refresh token en paralelo y
  // Supabase —con reuse detection activo— revoca la familia entera. Ver
  // `cross-tab-lock.ts` para el detalle y para el defecto de auth-js que arregla.
  supabase = createBrowserClient(url, anonKey, {
    isSingleton: false,
    auth: { lock: crossTabLock },
  })
  return supabase
}
