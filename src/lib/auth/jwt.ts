/**
 * Minimal JWT payload reader for the Supabase access token.
 *
 * We only ever read our OWN token's claims (session_id for single-session
 * revocation, sub as the user id) — never a token from an untrusted source —
 * so the signature is intentionally NOT verified. This is a pure client-side
 * claim read, not an authorization decision.
 */

export interface DecodedAccessToken {
  /** Supabase session id — stable per login session, unchanged across token refresh. */
  session_id?: string
  /** Supabase auth user id (=== User.id === auth.uid()). */
  sub?: string
  [key: string]: unknown
}

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  if (typeof atob === 'function') return atob(padded)
  // Node fallback (SSR / tooling) when atob is unavailable.
  return Buffer.from(padded, 'base64').toString('binary')
}

export function decodeAccessToken(
  token: string | null | undefined,
): DecodedAccessToken | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2 || !parts[1]) return null
  try {
    return JSON.parse(base64UrlDecode(parts[1])) as DecodedAccessToken
  } catch {
    return null
  }
}
