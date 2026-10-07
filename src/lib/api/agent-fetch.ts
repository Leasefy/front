'use client'

/**
 * agentFetch — `fetch` contra el microservicio del agente que sobrevive a que
 * el token venza.
 *
 * El problema que resuelve: `agentAuthHeaders()` lee un access token guardado
 * en memoria que sólo se reescribe cuando Supabase emite `TOKEN_REFRESHED`. Si
 * el token vence mientras la pestaña está en segundo plano (o el refresh
 * automático no llegó a correr), TODA llamada al agente sale con el token viejo
 * y responde 401. Las pantallas que hacen polling quedan clavadas en "Error
 * cargando datos: 401" hasta que el usuario recarga a mano — que es justo lo
 * que una pantalla auto-actualizable no debería pedir.
 *
 * Acá el 401 se trata como lo que casi siempre es —un token vencido, no una
 * falta de permisos— y se reintenta UNA vez con sesión fresca. Si el segundo
 * intento también da 401, ahí sí es un problema real de acceso y se devuelve
 * tal cual para que la UI lo muestre.
 *
 * ── Por qué NO renovamos nosotros ───────────────────────────────────────────
 *
 * Antes esto llamaba `supabase.auth.refreshSession()` a mano cuando veía un
 * 401. Parecía inofensivo y era la peor línea del archivo: auth-js ya renueva
 * solo, así que ese refresh manual corría EN PARALELO al automático, y los dos
 * usaban el mismo refresh token.
 *
 * Con `Detect and revoke potentially compromised refresh tokens` activo en
 * Supabase y una ventana de reúso de 10s, dos usos del mismo refresh token
 * fuera de esa ventana no son un error recuperable: Supabase lo interpreta como
 * un token comprometido y **revoca la familia entera**. O sea que el código
 * puesto para salvar una sesión vencida era, él mismo, una forma de matarla.
 *
 * Ahora esperamos a que aparezca un token DISTINTO —el que pone el AuthProvider
 * cuando auth-js emite `TOKEN_REFRESHED`— exactamente como hace `api/client.ts`
 * con el backend. Nadie renueva por su cuenta; hay un solo renovador.
 */

import { ApiError, getAccessToken, esCodigoDeSesionMuerta } from './client'
import { agentAuthHeaders } from './agent-auth'
import { sesionTerminada, terminarSesionSiMurio } from '@/lib/auth/session-terminal'
import { esFalloDeRed } from '@/lib/conexion/leer-el-error'
import { estadoDeConexion } from '@/lib/conexion/estado-de-conexion'
import {
  CODIGO_SERVICIO_NO_DISPONIBLE,
  textoParaUnAviso,
} from '@/lib/conexion/servicio-no-disponible'

/**
 * 🔴 03-10-2026 (pruebas en el navegador) · El micro caído es UNA parte de
 * Leasefy (capa 2, servicio `asistente`), no la red de la persona.
 *
 * Con el micro apagado y el back sano, el `fetch` al micro no sale y su
 * `TypeError` subía crudo: el Piloto, la Bandeja y la actividad decían «No
 * pudimos conectarnos · Revisa tu conexión» a alguien con internet y con el
 * resto del panel funcionando — justo el caso del 01-10 que dio origen a las
 * caídas (`lib/conexion/`), cuyo diseño ya decía que las llamadas directas al
 * micro son capa 2.
 *
 * Sólo se convierte cuando se puede afirmar que lo caído es el micro: el
 * `fetch` no salió (nunca un `AbortError` ni otro error), el navegador dice que
 * hay red y el back viene respondiendo (`estadoDeConexion() === 'bien'`). Sin
 * red o con Leasefy entero caído, el `TypeError` sigue tal cual: ahí manda la
 * franja de la capa 1.
 */
export function caidaDelAsistente(error: unknown): unknown {
  if (!esFalloDeRed(error)) return error
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return error
  if (estadoDeConexion() !== 'bien') return error
  const message = textoParaUnAviso('asistente')
  return new ApiError(503, message, CODIGO_SERVICIO_NO_DISPONIBLE, {
    statusCode: 503,
    code: CODIGO_SERVICIO_NO_DISPONIBLE,
    servicio: 'asistente',
    message,
  })
}

/** El `fetch` de siempre, con la caída del micro dicha como capa 2. */
async function pedirAlMicro(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await globalThis.fetch(input, {
      ...init,
      headers: agentAuthHeaders(init?.headers),
    })
  } catch (error) {
    throw caidaDelAsistente(error)
  }
}

/**
 * Cuánto esperamos a que aparezca el token renovado antes de rendirnos.
 *
 * Más largo que el equivalente del backend (1s) por una razón concreta: allá el
 * 401 llega cuando la renovación ya suele estar en vuelo, mientras que acá el
 * caso típico es la pestaña que vuelve del segundo plano, donde el tick de
 * auto-refresh de auth-js recién arranca al recuperar visibilidad. Aun así es
 * un tope corto: pasado eso, el 401 tiene que llegar a la pantalla.
 */
const ESPERA_DE_TOKEN_NUEVO_MS = 3000
const INTERVALO_DE_SONDEO_MS = 100

/**
 * Espera a que el AuthProvider publique un token distinto del que ya falló.
 * Devuelve `null` si no aparece ninguno — ahí el 401 es real y sigue su camino.
 */
async function esperarUnTokenDistinto(usado: string | null): Promise<string | null> {
  if (!usado) return null
  // Lo más común: ya se renovó mientras esta petición viajaba.
  const actual = getAccessToken()
  if (actual && actual !== usado) return actual

  const hasta = Date.now() + ESPERA_DE_TOKEN_NUEVO_MS
  while (Date.now() < hasta) {
    // Si la sesión se declaró muerta mientras esperábamos, no hay nada que
    // esperar: el token nuevo no va a llegar nunca.
    if (sesionTerminada()) return null
    await new Promise((resolve) => setTimeout(resolve, INTERVALO_DE_SONDEO_MS))
    const nuevo = getAccessToken()
    if (nuevo && nuevo !== usado) return nuevo
  }
  return null
}

/**
 * Lee el `code` del cuerpo de una respuesta SIN consumirla.
 *
 * El `clone()` no es opcional: quien llamó a `agentFetch` va a leer ese mismo
 * body, y un stream ya consumido le llegaría vacío. Cualquier fallo al parsear
 * (cuerpo vacío, HTML de un proxy, JSON roto) devuelve `undefined` — un cuerpo
 * ilegible nunca puede cerrar la sesión de nadie.
 */
async function codigoDe(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.clone().json()) as { code?: unknown }
    return typeof body?.code === 'string' ? body.code : undefined
  } catch {
    return undefined
  }
}

/**
 * `fetch` con Authorization del agente y un reintento ante 401.
 *
 * Misma firma que `fetch`: los headers extra que pases se conservan, sólo se
 * agrega/reescribe el `Authorization`.
 */
export async function agentFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await pedirAlMicro(input, init)

  if (res.status !== 401) return res

  // El micro marca con `code` los 401 que significan "esta sesión no vuelve"
  // (contrato: back/docs/contracts/30-auth-error-codes.md). Ahí no hay nada que
  // reintentar ni token que esperar: se cierra y se sale.
  if (esCodigoDeSesionMuerta(await codigoDe(res))) {
    // Se confirma con el refresh token antes de cerrar: el micro puede estar
    // validando contra otro proyecto de Supabase y decir «inválido» sobre una
    // sesión que está perfecta.
    void terminarSesionSiMurio('expirada')
    return res
  }

  const tokenUsado = getAccessToken()
  const tokenNuevo = await esperarUnTokenDistinto(tokenUsado)
  // Sin token nuevo, reintentar sería mandar exactamente lo mismo.
  if (!tokenNuevo) return res

  return pedirAlMicro(input, init)
}
