import { compartirGet, invalidar, recursoDe } from './refresco-de-datos'
import { sesionTerminada } from '@/lib/auth/session-terminal'

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
// 401 con código: los tres casos en que la sesión NO vuelve.
//
// El backend y el micro del agente marcan con `code` los 401 que significan
// «esta sesión está muerta» (contrato: back/docs/contracts/30-auth-error-codes.md).
// Sin ese código un 401 es ambiguo —puede ser onboarding pendiente o falta de
// permiso— y por eso el camino de abajo lo trata como un fallo cualquiera.
//
// Ojo con lo que NO está en esta lista:
//   - `AUTH_TOKEN_MISSING`: sale cuando una petición le ganó la carrera al
//     arranque de sesión y viajó sin `Authorization`. Cerrar sesión ahí echaría
//     a un usuario cuya sesión está perfecta.
//   - un 401 SIN código: puede ser una caída del JWKS de Supabase (infra
//     nuestra, no la sesión del usuario). Si cerráramos sesión ante cualquier
//     401, un mal minuto de Supabase desloguearía a todos a la vez.
// ============================================================================

const CODIGOS_DE_SESION_MUERTA = new Set([
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_INVALID',
  'SESSION_SUPERSEDED',
])

/** ¿Este `code` de un 401 significa que la sesión ya no vuelve? */
export function esCodigoDeSesionMuerta(code: string | undefined): boolean {
  return code != null && CODIGOS_DE_SESION_MUERTA.has(code)
}

// ============================================================================
// Unauthorized handler — el backstop global de 401.
// Lo registra el AuthProvider. Dispara SOLO con un `code` de sesión muerta,
// nunca con un 401 corriente como el de "User not found" en /users/me durante
// el onboarding. Para `SESSION_SUPERSEDED` el camino instantáneo es el modal de
// Realtime; esto es la garantía para cuando ese evento no llegó.
// ============================================================================

type UnauthorizedHandler = (code: string) => void
let _onUnauthorized: UnauthorizedHandler | null = null

/**
 * Quien sabe renovar el token (el AuthProvider, con `supabase.auth.refreshSession`).
 * Devuelve el access token nuevo o `null` si el refresh token también murió.
 */
export type TokenRefresher = () => Promise<string | null>
let _refrescarToken: TokenRefresher | null = null

export function setTokenRefresher(fn: TokenRefresher | null) {
  _refrescarToken = fn
}

/**
 * `AUTH_TOKEN_EXPIRED` no es una sesión muerta: es un ACCESS token vencido, y
 * el refresh token suele estar vivo. Pasa cuando la pestaña estuvo dormida y
 * la primera petición al volver sale con el token viejo antes de que
 * supabase-js lo renueve. Antes esto cerraba la sesión de una —«Redirigiendo…»
 * a pantalla completa con el formulario a medio llenar (Nico, pedir cita,
 * 2026-09-03)—. Ahora: si ya hay un token distinto se usa; si no, se le pide
 * uno al AuthProvider; y como última carta se espera la carrera de siempre.
 * Sólo si nada de eso trae un token nuevo, la sesión se da por muerta.
 */
async function renovarTokenVencido(usado: string | null): Promise<string | null> {
  if (_accessToken && usado && _accessToken !== usado) return _accessToken
  if (_refrescarToken) {
    const nuevo = await _refrescarToken().catch(() => null)
    if (nuevo && nuevo !== usado) {
      setAccessToken(nuevo)
      return nuevo
    }
  }
  return esperarUnTokenDistinto(usado)
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  _onUnauthorized = handler
}

export class ApiError extends Error {
  /**
   * When the backend's global ValidationPipe returns `message` as a
   * string[] (a 400 — contract.md §3.3), the individual messages are
   * preserved here for callers that want to render a real list. `.message`
   * (from `Error`) is always a string — `Error`'s constructor would silently
   * coerce an array via `Array.prototype.toString` (`"a,b,c"`) if passed
   * directly, so it's joined here instead.
   */
  public messages?: string[]

  constructor(
    public status: number,
    message: string | string[],
    /** Optional machine-readable code forwarded by the backend (e.g. SESSION_SUPERSEDED). */
    public code?: string,
    /**
     * El cuerpo del error, entero y sin tocar.
     *
     * `message` y `code` no siempre alcanzan: hay 400 que traen la parte más
     * valiosa de la respuesta en otras claves. El caso que obligó a esto es
     * `CONTRATO_NO_VALIDO` (`/inmobiliaria/contratos/plantilla/generar`), que
     * manda un `motivos[]` donde cada entrada dice QUÉ cláusula es ilegal y
     * POR QUÉ artículo — y eso se perdía acá, dejando a la pantalla con un
     * párrafo concatenado en vez de la lista que un abogado va a leer.
     *
     * Va guardado y no interpretado: quien llama sabe qué forma espera y lo
     * lee con su propio type guard. Ver `contratos-plantilla.service.ts`.
     */
    public detalle?: Record<string, unknown>,
  ) {
    super(Array.isArray(message) ? message.join(' · ') : message)
    this.name = 'ApiError'
    if (Array.isArray(message)) this.messages = message
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

  // Con la sesión ya declarada muerta no hay nada que pedir: la app está
  // navegando a /auth y cada petición que igual saliera sumaría un 401 más
  // —y un cartel de error más— sobre una pantalla que está por desaparecer.
  if (sesionTerminada()) {
    throw new ApiError(401, 'Tu sesión expiró. Volvé a entrar.', 'SESSION_TERMINATED')
  }

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
    // Sesión muerta: se cierra y se sale. Va ANTES del reintento a propósito —
    // `esperarUnTokenDistinto` existe para la carrera de la renovación, y con
    // el refresh token muerto no hay token nuevo que esperar: ese segundo de
    // espera sólo retrasa la salida, una vez por cada petición en vuelo.
    //
    // La excepción es el token VENCIDO: primero se intenta renovar y repetir
    // UNA vez (ver `renovarTokenVencido`); sólo si no hay token nuevo se sale.
    if (esCodigoDeSesionMuerta(code)) {
      if (code === 'AUTH_TOKEN_EXPIRED' && !yaSeReintento) {
        const tokenNuevo = await renovarTokenVencido(tokenUsado)
        if (tokenNuevo) {
          return request<T>(method, path, body, tokenNuevo, true)
        }
      }
      _onUnauthorized?.(code as string)
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
    // Forwarded generally — not a special case for any one endpoint. 401
    // already reads `code` above; this makes every other non-2xx status do
    // the same, so a caller can branch on a machine-readable code instead of
    // pattern-matching a human `.message` string.
    const code = typeof errorBody.code === 'string' ? errorBody.code : undefined
    throw new ApiError(
      res.status,
      errorBody.message || `Error ${res.status}`,
      code,
      // El cuerpo entero, para lo que `message` y `code` no alcanzan a decir
      // (`motivos[]`, `etiquetasFaltantes[]`, …). Ver `ApiError.detalle`.
      errorBody as Record<string, unknown>,
    )
  }

  /*
   * La mutación salió bien: quien esté leyendo ese recurso tiene que enterarse.
   *
   * Va acá y no en cada pantalla porque acá pasa TODO. Antes cada acción tenía
   * que acordarse de llamar a su `refetch`, y la mitad no lo hacía: el cambio
   * quedaba en la base y la tabla seguía mostrando lo de antes hasta que
   * alguien recargaba. Puesto en el cliente, una acción nueva nace refrescando.
   */
  if (method !== 'GET') {
    invalidar(recursoDe(path))
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

/**
 * Un GET que devuelve un archivo (los CSV de Reportes).
 *
 * 🔴 Renueva el token igual que `request`. No lo hacía: cualquier descarga que
 * saliera con el token recién vencido moría en un 401, y la pantalla —que no
 * distingue— culpaba al reporte («Probá de nuevo en un momento») cuando el
 * problema era la sesión. Un GET normal en el mismo instante se recuperaba
 * solo; la descarga, no.
 *
 * Se repite UNA vez, igual que allá: `yaSeReintento` corta la cadena.
 */
async function requestBlob(path: string, token?: string, yaSeReintento = false): Promise<Blob> {
  const url = `${BACKEND_URL}${path}`
  const tokenUsado = token ?? _accessToken
  const headers = getAuthHeaders()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(url, { method: 'GET', headers })
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err)
    const message = typeof navigator !== 'undefined' && !navigator.onLine
      ? 'Sin conexión a internet. Verificá tu red e intentá de nuevo.'
      : 'No pudimos conectarnos al servidor. Verificá tu conexión o intentá más tarde.'
    throw new ApiError(0, `${message}${raw ? ` (${raw})` : ''}`)
  }

  if (res.status === 401) {
    const errorBody = await res.json().catch(() => ({}))
    const code = typeof errorBody.code === 'string' ? errorBody.code : undefined

    if (esCodigoDeSesionMuerta(code)) {
      if (code === 'AUTH_TOKEN_EXPIRED' && !yaSeReintento) {
        const tokenNuevo = await renovarTokenVencido(tokenUsado)
        if (tokenNuevo) return requestBlob(path, tokenNuevo, true)
      }
      _onUnauthorized?.(code as string)
      throw new ApiError(401, errorBody.message || 'No autorizado', code)
    }

    if (!yaSeReintento) {
      const tokenNuevo = await esperarUnTokenDistinto(tokenUsado)
      if (tokenNuevo) return requestBlob(path, tokenNuevo, true)
    }

    throw new ApiError(401, errorBody.message || 'No autorizado', code)
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    throw new ApiError(res.status, errorBody.message || `Error ${res.status}`)
  }
  return res.blob()
}

export const apiClient = {
  /**
   * Los GET idénticos que estén EN VUELO comparten una sola petición.
   *
   * Diez componentes pidiendo `/inmobiliaria/config` al montar la pantalla son
   * diez peticiones que arrancan en el mismo milisegundo y se hacen esperar
   * entre ellas. Ahora sale una.
   *
   * No se comparte cuando viene un `token` explícito: esa forma se usa para
   * pedir con una sesión distinta de la que hay en memoria, y mezclar dos
   * identidades en una respuesta es el peor error posible acá.
   */
  get: <T>(path: string, token?: string) =>
    token
      ? request<T>('GET', path, undefined, token)
      : compartirGet(path, () => request<T>('GET', path, undefined, undefined)),
  post: <T>(path: string, body?: unknown, token?: string) => request<T>('POST', path, body, token),
  put: <T>(path: string, body?: unknown, token?: string) => request<T>('PUT', path, body, token),
  patch: <T>(path: string, body?: unknown, token?: string) => request<T>('PATCH', path, body, token),
  delete: <T>(path: string, token?: string) => request<T>('DELETE', path, undefined, token),
  getBlob: (path: string) => requestBlob(path),
}
