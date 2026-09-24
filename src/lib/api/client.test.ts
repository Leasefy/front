import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  apiClient,
  ApiError,
  setAccessToken,
  setUnauthorizedHandler,
  esCodigoDeSesionMuerta,
  setTokenRefresher,
  getAccessToken,
  clearInFlightGets,
  setMfaPendingFlag,
  estaMfaPendiente,
} from './client'
import { resetSessionTerminal, terminarSesion } from '@/lib/auth/session-terminal'

// ---------------------------------------------------------------------------
// Este archivo llegó a `develop` en 13b40359 CON los marcadores de conflicto
// adentro, así que no parseaba y la suite entera del archivo no corría. Eran
// dos suites independientes —el 401 `SESSION_SUPERSEDED` y el respaldo del
// 402— que se pisaron al fusionar. Acá conviven: se unieron los helpers y los
// hooks, sin quitarle un test a ninguna.
// ---------------------------------------------------------------------------

const realLocation = window.location

function setLocation(pathname: string) {
  Object.defineProperty(window, 'location', {
    value: { href: '', pathname },
    writable: true,
    configurable: true,
  })
}

/** Stub de `fetch` vía `vi.stubGlobal` — usado por la suite del 401. */
function stubFetch(status: number, body: unknown) {
  const res = {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => (body == null ? '' : JSON.stringify(body)),
    blob: async () => new Blob(),
  }
  return vi.fn().mockResolvedValue(res as unknown as Response)
}

beforeEach(() => {
  resetSessionTerminal()
  setAccessToken('token-abc')
  setUnauthorizedHandler(null)
})

afterEach(() => {
  resetSessionTerminal()
  vi.restoreAllMocks()
  setUnauthorizedHandler(null)
  Object.defineProperty(window, 'location', {
    value: realLocation,
    writable: true,
    configurable: true,
  })
})

describe('apiClient 401 handling', () => {
  it('invokes the unauthorized handler when a 401 carries code SESSION_SUPERSEDED', async () => {
    vi.stubGlobal('fetch', stubFetch(401, { message: 'sesión cerrada', code: 'SESSION_SUPERSEDED' }))
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    await expect(apiClient.get('/x')).rejects.toMatchObject({
      status: 401,
      code: 'SESSION_SUPERSEDED',
    })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(onUnauthorized).toHaveBeenCalledWith('SESSION_SUPERSEDED')
  })

  it('does NOT invoke the handler on an ordinary 401 (e.g. onboarding "User not found")', async () => {
    vi.stubGlobal('fetch', stubFetch(401, { message: 'User not found' }))
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    const err = (await apiClient.get('/users/me').catch((e) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(401)
    expect(err.code).toBeUndefined()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('preserves the backend message on a 401', async () => {
    vi.stubGlobal('fetch', stubFetch(401, { message: 'User not found' }))
    const err = (await apiClient.get('/users/me').catch((e) => e)) as ApiError
    expect(err.message).toBe('User not found')
  })
})

describe('401 durante la renovación del token', () => {
  /**
   * El access token de Supabase dura una hora y se renueva solo. Lo que salió
   * con el token viejo vuelve 401 con la sesión viva — medido en el panel:
   * `arco/requests` 401 → `grant_type=refresh_token` 200 → `arco/requests` 200.
   *
   * La pantalla se quedaba con ese 401 para siempre, y «Intentar de nuevo»
   * disparaba otra petición dentro de la misma ventana: parecía un botón muerto.
   */
  it('repite UNA vez con el token nuevo y devuelve los datos', async () => {
    setAccessToken('token-viejo')

    const llamadas: string[] = []
    const fetchFalso = vi.fn(async (_url: string, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string>)?.['Authorization'] ?? ''
      llamadas.push(auth)
      if (auth === 'Bearer token-viejo') {
        // Mientras esta petición viajaba, el provider ya renovó.
        setAccessToken('token-nuevo')
        return {
          status: 401,
          ok: false,
          json: async () => ({ message: 'Unauthorized' }),
          text: async () => JSON.stringify({ message: 'Unauthorized' }),
          blob: async () => new Blob(),
        } as unknown as Response
      }
      return {
        status: 200,
        ok: true,
        json: async () => ({ ok: true }),
        text: async () => JSON.stringify({ ok: true }),
        blob: async () => new Blob(),
      } as unknown as Response
    })
    vi.stubGlobal('fetch', fetchFalso)

    await expect(apiClient.get('/inmobiliaria/avaluos')).resolves.toEqual({ ok: true })
    expect(llamadas).toEqual(['Bearer token-viejo', 'Bearer token-nuevo'])
  })

  it('un 401 de permisos NO se reintenta: el token sigue siendo el mismo', async () => {
    // Sin token nuevo no hay carrera que justificar. Reintentar a ciegas
    // escondería un «no tienes acceso» detrás de dos peticiones iguales.
    setAccessToken('token-abc')
    const fetchFalso = stubFetch(401, { message: 'Forbidden for this role' })
    vi.stubGlobal('fetch', fetchFalso)

    await expect(apiClient.get('/inmobiliaria/avaluos')).rejects.toBeInstanceOf(ApiError)
    expect(fetchFalso).toHaveBeenCalledTimes(1)
  })

  it('SESSION_SUPERSEDED no se reintenta nunca: la sesión fue revocada', async () => {
    setAccessToken('token-abc')
    const fetchFalso = stubFetch(401, { message: 'sesión cerrada', code: 'SESSION_SUPERSEDED' })
    vi.stubGlobal('fetch', fetchFalso)

    await expect(apiClient.get('/users/me')).rejects.toBeInstanceOf(ApiError)
    expect(fetchFalso).toHaveBeenCalledTimes(1)
  })
})

/**
 * El backend y el micro marcan con `code` los 401 que significan "esta sesión
 * no vuelve" (contrato: back/docs/contracts/30-auth-error-codes.md). La mitad
 * importante de estos tests es la NEGATIVA: qué NO tiene que cerrar sesión.
 */
describe('401 con código de sesión muerta', () => {
  it.each(['AUTH_TOKEN_EXPIRED', 'AUTH_TOKEN_INVALID', 'SESSION_SUPERSEDED'])(
    'avisa al handler global con %s',
    async (code) => {
      vi.stubGlobal('fetch', stubFetch(401, { message: 'sesión muerta', code }))
      const onUnauthorized = vi.fn()
      setUnauthorizedHandler(onUnauthorized)

      await expect(apiClient.get('/x')).rejects.toMatchObject({ status: 401, code })
      expect(onUnauthorized).toHaveBeenCalledWith(code)
    },
  )

  /**
   * `AUTH_TOKEN_MISSING` sale cuando una petición le ganó la carrera al arranque
   * de sesión y viajó sin `Authorization`. Cerrar sesión ahí echaría a alguien
   * cuya sesión está perfecta — es el bug que estamos evitando, no arreglando.
   */
  it('NO cierra sesión con AUTH_TOKEN_MISSING (no es terminal)', async () => {
    vi.stubGlobal('fetch', stubFetch(401, { message: 'No autorizado', code: 'AUTH_TOKEN_MISSING' }))
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    await apiClient.get('/x').catch(() => {})
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  /**
   * Un 401 sin código puede ser una caída del JWKS de Supabase — infra nuestra,
   * no la sesión del usuario. Si cerráramos sesión ante cualquier 401, un mal
   * minuto de Supabase desloguearía a todos los usuarios activos a la vez.
   */
  it('NO cierra sesión con un 401 sin código', async () => {
    vi.stubGlobal('fetch', stubFetch(401, { message: 'Unauthorized' }))
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    await apiClient.get('/x').catch(() => {})
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  /**
   * El reintento por token renovado (1s de espera) existe para la carrera de la
   * renovación. Con la sesión muerta no hay token nuevo que esperar: ese
   * segundo, una vez por cada petición en vuelo, sólo retrasa la salida.
   */
  it('no gasta la espera del reintento — sale de una (token inválido, sesión revocada)', async () => {
    vi.stubGlobal('fetch', stubFetch(401, { message: 'inválido', code: 'AUTH_TOKEN_INVALID' }))
    const antes = Date.now()
    await apiClient.get('/x').catch(() => {})
    expect(Date.now() - antes).toBeLessThan(200)
  })
})

/**
 * `AUTH_TOKEN_EXPIRED` es un ACCESS token vencido, no una sesión muerta: la
 * pestaña estuvo dormida y la primera petición salió con el token viejo. Antes
 * cerraba la sesión de una y el usuario veía «Redirigiendo…» con el formulario
 * a medio llenar (Nico, pedir cita, 2026-09-03). Ahora se renueva y se repite
 * UNA vez; sólo si no hay token nuevo se sale.
 */
describe('AUTH_TOKEN_EXPIRED — renovar y repetir antes de cerrar sesión', () => {
  afterEach(() => setTokenRefresher(null))

  it('con un refresher que trae token nuevo: repite con él, no avisa al handler y devuelve los datos', async () => {
    setAccessToken('viejo')
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({ message: 'expiró', code: 'AUTH_TOKEN_EXPIRED' }) })
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ ok: true }), text: async () => '{"ok":true}' })
    vi.stubGlobal('fetch', fetchFalso)
    setTokenRefresher(async () => 'nuevo')
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    await expect(apiClient.get('/x')).resolves.toEqual({ ok: true })
    expect(onUnauthorized).not.toHaveBeenCalled()
    expect(fetchFalso).toHaveBeenCalledTimes(2)
    const segunda = fetchFalso.mock.calls[1][1] as { headers: Record<string, string> }
    expect(segunda.headers.Authorization).toBe('Bearer nuevo')
    expect(getAccessToken()).toBe('nuevo')
  })

  it('si el refresher no trae nada (refresh token muerto), ahí sí se cierra la sesión', async () => {
    setAccessToken('viejo')
    vi.stubGlobal('fetch', stubFetch(401, { message: 'expiró', code: 'AUTH_TOKEN_EXPIRED' }))
    setTokenRefresher(async () => null)
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    await expect(apiClient.get('/x')).rejects.toMatchObject({ status: 401, code: 'AUTH_TOKEN_EXPIRED' })
    expect(onUnauthorized).toHaveBeenCalledWith('AUTH_TOKEN_EXPIRED')
  })

  it('no entra en bucle: el reintento que vuelve a vencer cierra sesión', async () => {
    setAccessToken('viejo')
    vi.stubGlobal('fetch', stubFetch(401, { message: 'expiró', code: 'AUTH_TOKEN_EXPIRED' }))
    setTokenRefresher(async () => 'nuevo')
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    await apiClient.get('/x').catch(() => {})
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2)
  })
})

describe('peticiones con la sesión ya declarada muerta', () => {
  it('ni siquiera sale a la red', async () => {
    const fetchFalso = vi.fn()
    vi.stubGlobal('fetch', fetchFalso)
    terminarSesion('expirada')

    const err = (await apiClient.get('/x').catch((e) => e)) as ApiError
    expect(fetchFalso).not.toHaveBeenCalled()
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(401)
  })
})

/**
 * T-0011 — the global ValidationPipe returns `message` as a string[] on a
 * 400 (contract.md §3.3). `Error`'s constructor coerces a non-string message
 * via ToString, which for an array means `Array.prototype.join(',')` — so a
 * naive `new ApiError(400, errorBody.message)` silently turned
 * `['a', 'b']` into the string `"a,b"`. ApiError now preserves the original
 * array on `.messages` so callers can render a real list instead.
 */
describe('ApiError — 400 con message: string[] (contract.md §3.3)', () => {
  it('preserves the array on .messages instead of losing it to ToString coercion', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(400, { statusCode: 400, message: ['El titulo es requerido', 'El area debe ser mayor a 10'] }),
    )

    const err = (await apiClient.post('/properties', {}).catch((e) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(400)
    expect(err.messages).toEqual(['El titulo es requerido', 'El area debe ser mayor a 10'])
  })

  it('joins the array into .message for callers that only read a string', async () => {
    vi.stubGlobal('fetch', stubFetch(400, { statusCode: 400, message: ['a', 'b'] }))

    const err = (await apiClient.post('/properties', {}).catch((e) => e)) as ApiError
    expect(err.message).toBe('a · b')
  })

  it('leaves a plain string message untouched (.messages stays undefined)', async () => {
    vi.stubGlobal('fetch', stubFetch(400, { statusCode: 400, message: 'Ya existe ese numero de documento' }))

    const err = (await apiClient.post('/properties', {}).catch((e) => e)) as ApiError
    expect(err.message).toBe('Ya existe ese numero de documento')
    expect(err.messages).toBeUndefined()
  })
})

/**
 * T-0012 WU-5 — the generic non-2xx branch only ever forwarded `message`,
 * never `code`, so any status carrying a machine-readable `code` (e.g. the
 * back's 409 PENDING_CHARGE_ALREADY_PAID / 503
 * payment_verification_unavailable on select-plan) silently lost it — callers
 * could only pattern-match on `.message`, a human string never meant to be
 * parsed. This is general plumbing, not a special case for one endpoint.
 *
 * 🔴 CORRECCIÓN DEL 21-09-2026. Este comentario decía que reenviar el código
 * sólo hacía falta para los status «genéricos», porque «401/402/403 ya leen
 * `code` ellos mismos». Era falso y nadie lo comprobó: el 401 sí, el 402 y el
 * 403 NO — sus ramas construían el `ApiError` con `message` y nada más, y al
 * estar ANTES de la rama general nunca llegaban a ella.
 *
 * Lo que costó: el back manda `SEGUNDO_FACTOR_REQUERIDO` en un 403 desde el
 * 18-09 y `clasificar.ts` sabía reconocerlo desde entonces. No podía, porque
 * el código moría acá. A un administrador al que sólo le falta activar su
 * segundo factor el panel le decía, en las 25 secciones, «tu rol no incluye
 * esta sección, pídele a un administrador que te lo habilite» — a la persona
 * que ES el administrador. Nico lo preguntó el 21-09: «¿por qué no me das
 * acceso a todo?».
 *
 * Los dos tests de abajo son los que faltaban: una suposición escrita en un
 * comentario no es una prueba.
 */
describe('ApiError — `code` forwarding on the generic non-2xx branch', () => {
  it('forwards `code` from the response body on a 409', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(409, { message: 'ya pagado', code: 'PENDING_CHARGE_ALREADY_PAID' }),
    )

    const err = (await apiClient
      .post('/inmobiliaria/subscription/select-plan', {})
      .catch((e) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(409)
    expect(err.code).toBe('PENDING_CHARGE_ALREADY_PAID')
    expect(err.message).toBe('ya pagado')
  })

  it('🔴 reenvía `code` en un 403: era el único status donde decidía el mensaje', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(403, {
        message: 'Tu rol exige segundo factor.',
        code: 'SEGUNDO_FACTOR_REQUERIDO',
      }),
    )

    const err = (await apiClient.get('/inmobiliaria/pipeline').catch((e) => e)) as ApiError
    expect(err.status).toBe(403)
    expect(err.code).toBe('SEGUNDO_FACTOR_REQUERIDO')
  })

  it('🔴 y también el CUERPO del 403: sin `module` el cartel no nombra la sección', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(403, {
        message: 'No tienes permiso para view en pipeline',
        code: 'SIN_PERMISO_DE_MODULO',
        module: 'pipeline',
        action: 'view',
        role: 'AGENTE',
      }),
    )

    const err = (await apiClient.get('/inmobiliaria/pipeline').catch((e) => e)) as ApiError
    expect(err.code).toBe('SIN_PERMISO_DE_MODULO')
    expect(err.detalle?.module).toBe('pipeline')
    expect(err.detalle?.action).toBe('view')
  })

  it('reenvía `code` en un 402, por el mismo motivo', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(402, { message: 'Se requiere un plan activo', code: 'PLAN_VENCIDO' }),
    )

    const err = (await apiClient.get('/otra/cosa').catch((e) => e)) as ApiError
    expect(err.status).toBe(402)
    expect(err.code).toBe('PLAN_VENCIDO')
  })

  it('forwards `code` from the response body on a 503', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(503, { message: 'no se pudo verificar', code: 'payment_verification_unavailable' }),
    )

    const err = (await apiClient
      .post('/inmobiliaria/subscription/select-plan', {})
      .catch((e) => e)) as ApiError
    expect(err.status).toBe(503)
    expect(err.code).toBe('payment_verification_unavailable')
  })

  it('leaves `code` undefined when the body carries none', async () => {
    vi.stubGlobal('fetch', stubFetch(500, { message: 'boom' }))

    const err = (await apiClient.get('/x').catch((e) => e)) as ApiError
    expect(err.code).toBeUndefined()
  })
})

/**
 * T-0082 WU-1 (F1/F2) — an explicit `token` used to always bypass
 * `compartirGet`'s in-flight dedup, so two concurrent explicit-token GETs to
 * the same path (the login bootstrap's `fetchUser` + `fetchAgencyProfile`
 * pattern) always hit the network twice. The token is per-session, not
 * per-call, so sharing by path alone is safe.
 */
describe('apiClient.get — explicit-token GETs share the in-flight request', () => {
  it('two concurrent calls with the same explicit token to the same path produce one network call', async () => {
    const fetchFalso = vi.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                status: 200,
                ok: true,
                json: async () => ({ id: 'u1' }),
                text: async () => JSON.stringify({ id: 'u1' }),
              } as unknown as Response),
            10,
          ),
        ),
    )
    vi.stubGlobal('fetch', fetchFalso)

    const [a, b] = await Promise.all([
      apiClient.get('/users/me', 'token-de-sesion'),
      apiClient.get('/users/me', 'token-de-sesion'),
    ])

    expect(fetchFalso).toHaveBeenCalledTimes(1)
    expect(a).toEqual({ id: 'u1' })
    expect(b).toEqual({ id: 'u1' })
  })

  it('is NOT a cache: once the shared promise settles, the next call goes out again', async () => {
    const fetchFalso = stubFetch(200, { id: 'u1' })
    vi.stubGlobal('fetch', fetchFalso)

    await apiClient.get('/users/me', 'token-de-sesion')
    await apiClient.get('/users/me', 'token-de-sesion')

    expect(fetchFalso).toHaveBeenCalledTimes(2)
  })

  /**
   * verify-1.md §2 CRITICAL — the dangerous case the original WU-1 tests never
   * exercised: two DIFFERENT identities (different explicit tokens) racing the
   * SAME path. Mixing two identities in one response is the worst possible
   * error here — same-tab sign-out → sign-in as another account
   * (`AuthForm.tsx`'s `quiereOtraCuenta`) can overlap exactly like this. The
   * fix keys `compartirGet` by `path` + token (`claveDeGet` in `client.ts`), so
   * two different tokens must NEVER share a network call or a response body,
   * even when they race in flight at the same millisecond.
   */
  it('two concurrent calls with DIFFERENT explicit tokens to the same path do NOT share — two network calls, each with its own body', async () => {
    const fetchFalso = vi.fn((_url: string, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string>)?.['Authorization'] ?? ''
      const body = auth === 'Bearer token-A' ? { id: 'user-A' } : { id: 'user-B' }
      return new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              status: 200,
              ok: true,
              json: async () => body,
              text: async () => JSON.stringify(body),
            } as unknown as Response),
          10,
        ),
      )
    })
    vi.stubGlobal('fetch', fetchFalso)

    const [a, b] = await Promise.all([
      apiClient.get('/users/me', 'token-A'),
      apiClient.get('/users/me', 'token-B'),
    ])

    expect(fetchFalso).toHaveBeenCalledTimes(2)
    expect(a).toEqual({ id: 'user-A' })
    expect(b).toEqual({ id: 'user-B' })
  })

  /**
   * verify-1.md §2 — the implicit (no-token) path has no identity to key by at
   * all: it shares by `path` alone, same as before this fix. The only guard
   * against a stale in-flight implicit GET leaking into the NEXT session (in
   * the same tab, no page reload) is clearing the shared map on sign-out.
   * `clearInFlightGets` (re-exported from `refresco-de-datos.ts`'s
   * `descartarEnVuelo`) is what `AuthProvider` calls on `SIGNED_OUT` and on its
   * own `signOut()` — see `auth-context.tsx`.
   */
  it('clearInFlightGets drops a still-pending implicit GET, so the next call after "sign-out" starts fresh instead of inheriting it', async () => {
    let resolveA!: (res: unknown) => void
    const fetchFalso = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveA = resolve
          }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: async () => ({ id: 'user-B' }),
          text: async () => JSON.stringify({ id: 'user-B' }),
        } as unknown as Response),
      )
    vi.stubGlobal('fetch', fetchFalso)

    // User A's implicit GET (no explicit token — reads `_accessToken`) is still
    // in flight when "sign-out" happens. An implicit call awaits the
    // session-resolved gate before it actually reaches `fetch` (see
    // `esperarRespuestaDeSesion` in client.ts) — flush that microtask first.
    const pendingA = apiClient.get('/users/me')
    await Promise.resolve()
    await Promise.resolve()
    expect(fetchFalso).toHaveBeenCalledTimes(1)

    // Simulates AuthProvider's SIGNED_OUT / signOut() cleanup.
    clearInFlightGets()

    // User B signs in and the SAME implicit path is requested again — without
    // the clear, this would have reused A's still-pending promise (same key:
    // `path` alone). With the clear, it must go out as a fresh network call.
    const pendingB = apiClient.get('/users/me')
    await Promise.resolve()
    await Promise.resolve()
    expect(fetchFalso).toHaveBeenCalledTimes(2)

    resolveA({
      status: 200,
      ok: true,
      json: async () => ({ id: 'user-A' }),
      text: async () => JSON.stringify({ id: 'user-A' }),
    })

    const [a, b] = await Promise.all([pendingA, pendingB])
    expect(a).toEqual({ id: 'user-A' })
    expect(b).toEqual({ id: 'user-B' })
  })
})

describe('T-0099: mfa-pending flag mirror (non-React consumers, e.g. clasificar.ts)', () => {
  afterEach(() => {
    setMfaPendingFlag(false)
  })

  it('defaults to false — no session has ever reported a pending second factor', () => {
    expect(estaMfaPendiente()).toBe(false)
  })

  it('reflects the last value AuthProvider pushed via setMfaPendingFlag', () => {
    setMfaPendingFlag(true)
    expect(estaMfaPendiente()).toBe(true)
    setMfaPendingFlag(false)
    expect(estaMfaPendiente()).toBe(false)
  })
})

describe('esCodigoDeSesionMuerta', () => {
  it.each(['AUTH_TOKEN_EXPIRED', 'AUTH_TOKEN_INVALID', 'SESSION_SUPERSEDED'])(
    'reconoce %s',
    (code) => expect(esCodigoDeSesionMuerta(code)).toBe(true),
  )

  it.each([undefined, 'AUTH_TOKEN_MISSING', 'ALGO_NUEVO', ''])(
    'no reconoce %p',
    (code) => expect(esCodigoDeSesionMuerta(code)).toBe(false),
  )
})
