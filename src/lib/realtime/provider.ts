/**
 * Realtime provider selection (T-0183).
 *
 * `NEXT_PUBLIC_REALTIME_PROVIDER` is inlined at build time. This is the single
 * resolver: normalize (trim + lowercase); unset, blank or unknown → `supabase`.
 * Unknown values fall back instead of throwing so a typo can never take the
 * inbox and the single-session revocation down.
 */

export type RealtimeProvider = 'supabase' | 'sse'

export function resolveRealtimeProvider(raw: string | undefined | null): RealtimeProvider {
  const value = (raw ?? '').trim().toLowerCase()
  return value === 'sse' ? 'sse' : 'supabase'
}

/** The provider this build was compiled with. */
export function currentRealtimeProvider(): RealtimeProvider {
  return resolveRealtimeProvider(process.env.NEXT_PUBLIC_REALTIME_PROVIDER)
}
