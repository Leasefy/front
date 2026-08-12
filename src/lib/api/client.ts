const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

// ============================================================================
// Token store — written by AuthProvider, read by apiClient
// Avoids calling supabase.auth.getSession() on every request (which hangs
// when invoked right after onAuthStateChange).
// ============================================================================

let _accessToken: string | null = null

/**
 * ¿Ya sabemos si hay sesión o no?
 *
 * Es distinto de «no hay token»: al montar la app todavía nadie contestó, y una
 * pantalla que pide datos en ese instante sale SIN Authorization, el backend
 * responde 401 y la pantalla dice «tu sesión se venció» estando la sesión
 * perfecta. Eso es lo que se veía en /postulaciones: `/users/me` daba 200 y la
 * lista 401, en la misma carga.
 *
 * `setAccessToken` es lo que resuelve la pregunta — la llama el AuthProvider
 * tanto cuando hay sesión como cuando confirma que no la hay.
 */
let _sesionResuelta = false
let _avisarResuelta: (() => void) | null = null
const _esperaDeSesion = new Promise<void>((resolve) => {
  _avisarResuelta = resolve
})

/** Called by AuthProvider whenever the session changes */
export function setAccessToken(token: string | null) {
  _accessToken = token
  _sesionResuelta = true
  _avisarResuelta?.()
}

/** Get the current stored token (for external use) */
export function getAccessToken(): string | null {
  return _accessToken
}

/** ¿El AuthProvider ya dijo si hay sesión? `false` = todavía está resolviendo. */
export function hayRespuestaDeSesion(): boolean {
  return _sesionResuelta
}

/**
 * Espera a que el AuthProvider conteste, con tope. El tope existe para que un
 * provider que nunca contesta no cuelgue la app: pasado ese tiempo se sale sin
 * token y el 401 se maneja como cualquier otro fallo.
 */
const TOPE_DE_ESPERA_MS = 3000

async function esperarRespuestaDeSesion(): Promise<void> {
  if (_sesionResuelta) return
  await Promise.race([
    _esperaDeSesion,
    new Promise<void>((resolve) => setTimeout(resolve, TOPE_DE_ESPERA_MS)),
  ])
}

/**
 * Un 401 con el token que ACABA de vencer no es un fallo: es una carrera.
 *
 * El access token de Supabase dura una hora y se renueva solo. Las peticiones
 * que salen mientras la renovación está en vuelo llevan el token viejo y el
 * backend responde 401 — con la sesión perfectamente viva. Medido en el panel:
 *
 *     GET  …/arco/requests                        → 401
 *     POST supabase/token?grant_type=refresh_token → 200   ← se renovó acá
 *     GET  …/arco/requests                        → 200
 *
 * La pantalla que pidió primero se quedaba con el 401 para siempre y mostraba
 * «No pudimos cargar esto». Peor: «Intentar de nuevo» disparaba OTRA petición
 * dentro de la misma ventana y fallaba igual, así que el botón parecía muerto.
 *
 * Esto espera a que el AuthProvider avise que hay un token DISTINTO —no a un
 * reloj— y devuelve el nuevo. Si no llega ninguno, el 401 sigue su camino: no
 * se reintenta a ciegas, porque un 401 que de verdad es de permisos tiene que
 * llegar a la pantalla.
 */
/**
 * ⚠️ El tope es corto A PROPÓSITO. Este camino lo recorre TODO 401, incluido el
 * de «no tenés permiso», que es legítimo y tiene que llegar rápido a la
 * pantalla. Con un tope de 4 s, cada 401 real tardaba cuatro segundos de más en
 * mostrarse — se veía en los tests, que pasaron a durar 4 s cada uno.
 *
 * Casi siempre ni se espera: para cuando el 401 vuelve, la renovación ya
 * terminó y el token nuevo está puesto. El bucle es sólo para el caso en que la
 * respuesta gane la carrera por poco.
 */
const ESPERA_DE_TOKEN_NUEVO_MS = 1000

async function esperarUnTokenDistinto(usado: string | null): Promise<string | null> {
  if (!usado) return null
  // Lo más común: ya se renovó mientras esta petición viajaba.
  if (_accessToken && _accessToken !== usado) return _accessToken

  const hasta = Date.now() + ESPERA_DE_TOKEN_NUEVO_MS
  while (Date.now() < hasta) {
    await new Promise((resolve) => setTimeout(resolve, 60))
    if (_accessToken && _accessToken !== usado) return _accessToken
  }
  return null
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

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
  /** Interno: evita que el reintento por token renovado se encadene. */
  yaSeReintento = false,
): Promise<T> {
  const url = `${BACKEND_URL}${path}`

  // Si el AuthProvider todavía no contestó, esperamos acá en vez de salir sin
  // Authorization y comerse un 401 que no significa nada. Cuando ya contestó
  // —haya sesión o no— esto no cuesta nada.
  if (!token) await esperarRespuestaDeSesion()

  const tokenUsado = token ?? getAccessToken()
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
      throw new ApiError(401, errorBody.message || 'No autorizado', code)
    }

    // ¿Fue la carrera de la renovación? Si aparece un token distinto, esta
    // petición salió con uno que ya no servía: se repite UNA vez con el nuevo.
    // Si no aparece ninguno, el 401 sigue de largo hacia la pantalla.
    if (!yaSeReintento) {
      const tokenNuevo = await esperarUnTokenDistinto(tokenUsado)
      if (tokenNuevo) {
        return request<T>(method, path, body, tokenNuevo, true)
      }
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
