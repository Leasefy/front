import { getSupabase } from '@/lib/supabase/client'

/**
 * REST client for the admin micro (BACK.md). Reuses the front's Supabase
 * browser client for the Bearer token. Every call:
 *   - attaches `Authorization: Bearer <supabase access_token>`
 *   - on 401 (session expired)         → /admin/login
 *   - on 403 (email not on allowlist)  → /admin/forbidden
 *   - otherwise returns parsed JSON, or throws ApiError with the status
 *
 * Base origin comes from NEXT_PUBLIC_ADMIN_API_URL; `/api/v1/admin` is appended.
 */
const ADMIN_API_ORIGIN = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? ''
const API_BASE = `${ADMIN_API_ORIGIN.replace(/\/$/, '')}/api/v1/admin`

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Token is pushed in by the panel layout's onAuthStateChange subscription
// instead of pulled via getSession(): calling getSession() while
// AuthProvider's auth callback is mid-flight deadlocks (see auth-context.tsx
// "rely exclusively on onAuthStateChange"). The layout wraps every admin
// screen, so the cache is populated before any adminApi call and refreshed
// on every auth event while the panel is mounted.
let cachedToken: string | null = null

export function setAdminToken(token: string | null): void {
  cachedToken = token
}

async function bearer(): Promise<string | null> {
  return cachedToken
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  query?: Record<string, string | number | undefined | null>
  body?: unknown
  signal?: AbortSignal
  /**
   * By default a 403 redirects to `/admin/forbidden` (the "not on the allowlist"
   * page). Set this for calls that PROXY another service (avaluo micro, cotizador)
   * where a 403 is a DOMAIN error, not an allowlist rejection — the allowlist
   * guard already passed when the screen loaded. The 403 then throws an ApiError
   * for the caller to surface instead of a misleading redirect.
   */
  noForbiddenRedirect?: boolean
}

function buildUrl(path: string, query?: ApiOptions['query']): string {
  if (!ADMIN_API_ORIGIN) {
    throw new ApiError(0, 'NEXT_PUBLIC_ADMIN_API_URL is not configured — set it to the backend origin')
  }
  const url = new URL(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue
      url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

export async function adminApi<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const token = await bearer()
  if (!token) {
    redirectTo('/admin/login')
    throw new ApiError(401, 'No session')
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  })

  if (res.status === 401) {
    await getSupabase()?.auth.signOut()
    redirectTo('/admin/login')
    throw new ApiError(401, 'Sesión expirada')
  }
  if (res.status === 403 && !opts.noForbiddenRedirect) {
    redirectTo('/admin/forbidden')
    throw new ApiError(403, 'No autorizado')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => undefined)
    // Back error envelope: { statusCode, timestamp, path, message } where
    // message is string | string[] (array when it comes from the ValidationPipe).
    let message = `Error ${res.status}`
    if (body && typeof body === 'object' && 'message' in body) {
      const raw = (body as { message: unknown }).message
      if (Array.isArray(raw)) message = raw.map(String).join('; ')
      else if (raw != null && raw !== '') message = String(raw)
    }
    throw new ApiError(res.status, message, body)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/**
 * Fetch a binary admin resource (e.g. the certificate PDF stream) as a Blob,
 * reusing the same Bearer token + 401/403 redirect handling as `adminApi`.
 *
 * The endpoint is Bearer-gated, so the URL cannot be dropped into an
 * `<iframe src>` / `<a href>` directly (no way to attach the header) — the
 * caller fetches the bytes here, wraps them in an object URL, and is
 * responsible for `URL.revokeObjectURL` when done.
 */
export async function adminApiBlob(path: string, opts: ApiOptions = {}): Promise<Blob> {
  const token = await bearer()
  if (!token) {
    redirectTo('/admin/login')
    throw new ApiError(401, 'No session')
  }

  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers: { Authorization: `Bearer ${token}` },
    signal: opts.signal,
  })

  if (res.status === 401) {
    await getSupabase()?.auth.signOut()
    redirectTo('/admin/login')
    throw new ApiError(401, 'Sesión expirada')
  }
  if (res.status === 403) {
    redirectTo('/admin/forbidden')
    throw new ApiError(403, 'No autorizado')
  }
  if (!res.ok) {
    // The micro streams a PDF on success but returns a JSON error envelope on
    // failure (503/404/…). Surface the status; the body is best-effort.
    const body = await res.json().catch(() => undefined)
    throw new ApiError(res.status, `Error ${res.status}`, body)
  }

  return res.blob()
}

/** Full API URL for browser-driven downloads (e.g. CSV export links). */
export function adminApiUrl(path: string, query?: ApiOptions['query']): string {
  return buildUrl(path, query)
}

function redirectTo(path: string): void {
  if (typeof window === 'undefined') return
  if (path === '/admin/login') {
    const next = window.location.pathname + window.location.search
    window.location.href = `/admin/login?next=${encodeURIComponent(next)}`
    return
  }
  window.location.href = path
}
