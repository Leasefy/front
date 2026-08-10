const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

// ============================================================================
// Token store — written by AuthProvider, read by apiClient
// Avoids calling supabase.auth.getSession() on every request (which hangs
// when invoked right after onAuthStateChange).
// ============================================================================

let _accessToken: string | null = null

/** Called by AuthProvider whenever the session changes */
export function setAccessToken(token: string | null) {
  _accessToken = token
}

/** Get the current stored token (for external use) */
export function getAccessToken(): string | null {
  return _accessToken
}

// ============================================================================
// Unauthorized (session-superseded) handler — the global 401 backstop.
// Registered by AuthProvider. Fires ONLY when a 401 carries the machine-readable
// `code: 'SESSION_SUPERSEDED'` (single-session revocation), never on an ordinary
// 401 such as the onboarding "User not found" case on /users/me. The instant
// "signed in elsewhere" modal comes via Realtime; this is the guaranteed
// fallback when the realtime event never arrived.
// ============================================================================

type UnauthorizedHandler = (code: string) => void
let _onUnauthorized: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  _onUnauthorized = handler
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Optional machine-readable code forwarded by the backend (e.g. SESSION_SUPERSEDED). */
    public code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  return headers
}

async function request<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  const url = `${BACKEND_URL}${path}`

  const headers: Record<string, string> = token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : getAuthHeaders()

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    // Network-level failure: ERR_CONNECTION_REFUSED, DNS error, offline, CORS, etc.
    // `fetch` throws a plain TypeError in these cases — wrap it in ApiError(0)
    // with a user-friendly message so UI code can distinguish "backend down"
    // from "backend returned 4xx/5xx".
    const raw = err instanceof Error ? err.message : String(err)
    const message = typeof navigator !== 'undefined' && !navigator.onLine
      ? 'Sin conexión a internet. Verificá tu red e intentá de nuevo.'
      : 'No pudimos conectarnos al servidor. Verificá tu conexión o intentá más tarde.'
    throw new ApiError(0, `${message}${raw ? ` (${raw})` : ''}`)
  }

  if (res.status === 401) {
    // Preserve the backend message so callers can distinguish "User not found"
    // (onboarding needed) from real auth failures (token invalid/expired).
    const errorBody = await res.json().catch(() => ({}))
    const code = typeof errorBody.code === 'string' ? errorBody.code : undefined
    // Single-session revocation backstop: only this coded 401 triggers a global
    // sign-out. The onboarding 401 has no code and must NOT log the user out.
    if (code === 'SESSION_SUPERSEDED') {
      _onUnauthorized?.(code)
    }
    throw new ApiError(401, errorBody.message || 'No autorizado', code)
  }

  if (res.status === 403) {
    const errorBody = await res.json().catch(() => ({}))
    throw new ApiError(403, errorBody.message || 'No tienes permiso para realizar esta acción')
  }

  if (res.status === 402) {
    // Payment Required — the backend gates agency endpoints when the agency has
    // no active paid plan. Backstop the client-side AgencySubscriptionGuard:
    // bounce any gated /inmobiliaria/* call to the upgrade flow. Skip when we're
    // already on the upgrade/checkout pages to avoid a redirect loop.
    const errorBody = await res.json().catch(() => ({}))
    if (
      typeof window !== 'undefined' &&
      path.startsWith('/inmobiliaria') &&
      !window.location.pathname.startsWith('/panel/inmobiliaria/upgrade') &&
      !window.location.pathname.startsWith('/panel/inmobiliaria/checkout')
    ) {
      window.location.href = '/panel/inmobiliaria/upgrade'
    }
    throw new ApiError(402, errorBody.message || 'Se requiere un plan activo para continuar')
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    throw new ApiError(res.status, errorBody.message || `Error ${res.status}`)
  }

  // Handle empty responses (204 No Content, 201 with no body, etc.)
  if (res.status === 204) {
    return undefined as T
  }

  const text = await res.text()
  if (!text) {
    return undefined as T
  }

  return JSON.parse(text)
}

async function requestBlob(path: string): Promise<Blob> {
  const url = `${BACKEND_URL}${path}`
  const headers = getAuthHeaders()
  const res = await fetch(url, { method: 'GET', headers })
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    throw new ApiError(res.status, errorBody.message || `Error ${res.status}`)
  }
  return res.blob()
}

export const apiClient = {
  get: <T>(path: string, token?: string) => request<T>('GET', path, undefined, token),
  post: <T>(path: string, body?: unknown, token?: string) => request<T>('POST', path, body, token),
  put: <T>(path: string, body?: unknown, token?: string) => request<T>('PUT', path, body, token),
  patch: <T>(path: string, body?: unknown, token?: string) => request<T>('PATCH', path, body, token),
  delete: <T>(path: string, token?: string) => request<T>('DELETE', path, undefined, token),
  getBlob: (path: string) => requestBlob(path),
}
