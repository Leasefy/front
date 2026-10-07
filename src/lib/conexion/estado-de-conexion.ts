/**
 * ¿Leasefy está respondiendo? El estado de la conexión con NUESTRO back, en un
 * solo lugar y fuera de React.
 *
 * ── Por qué existe (01-10-2026) ────────────────────────────────────────────
 *
 * Ese día se cayó el micro de agentes y una persona quedó con el registro
 * bloqueado sin saber por qué. Nico: «cuando algún servicio se caiga,
 * deberíamos de avisarle al usuario, porque eso puede llegar a pasar». Hasta
 * acá, cada pantalla se enteraba sola de que el back no contestaba y lo decía
 * a su manera —un cartel rojo con «Error 503», un toast con «(Failed to
 * fetch)»—, todas a la vez y ninguna diciendo lo único que importa: que no es
 * culpa de la persona y que lo que ya guardó está a salvo.
 *
 * Ésta es la capa 1 de tres: «Leasefy entero no responde» o «no hay internet».
 * Lo alimenta `apiClient` (`src/lib/api/client.ts`) con cada respuesta y lo
 * pinta UNA franja en el layout raíz (`<AvisoDeConexion>`). La capa 2 —se cayó
 * UNA parte, como el asistente o los pagos— vive en `servicio-no-disponible.ts`
 * y no pasa por acá: el back contestó, así que Leasefy sí responde.
 *
 * ── Qué cuenta como caída ──────────────────────────────────────────────────
 *
 *   · `fetch` no salió (sin red, back apagado, DNS)        → sin-internet si
 *     `navigator.onLine === false`; si no, leasefy-no-responde.
 *   · 502/503/504 cuyo cuerpo NO es de nuestro filtro      → leasefy-no-responde.
 *     El filtro global del back (`http-exception.filter.ts`) SIEMPRE manda
 *     `statusCode` (y a veces un `code`); el balanceador, ninguno de los dos.
 *     Un 502 CON `statusCode` y `code` es el back contándonos que Wompi, el
 *     micro de avalúos o Supabase fallaron: el back contestó, así que no es
 *     «Leasefy entero caído» (es capa 2 si trae `SERVICIO_NO_DISPONIBLE` o
 *     `servicio`).
 *   · 5xx con `servicio: 'base'`: el back contestó, pero sin Postgres no
 *     funciona nada                                        → leasefy-no-responde.
 *   · cualquier otra respuesta del back                    → bien.
 *
 * Las llamadas DIRECTAS del front al micro de agentes no pasan por acá: un
 * micro caído es una parte de Leasefy, no Leasefy entero (capa 2, servicio
 * `asistente`).
 */

import { useSyncExternalStore } from 'react'
import { esCincoCientos, leerElError } from './leer-el-error'

export type EstadoDeConexion = 'bien' | 'sin-internet' | 'leasefy-no-responde'

/**
 * El `code` que `apiClient` le pone al `ApiError` de una caída general. Lo
 * inventa el FRONT —el back no lo manda, por definición: no contestó—, igual
 * que `DEMASIADAS_SOLICITUDES` para el 429 del proxy sin cuerpo.
 */
export const CODIGO_LEASEFY_NO_RESPONDE = 'LEASEFY_NO_RESPONDE'

/** Lo que dice el `ApiError` de una caída general: sin «Error 503» ni jerga. */
export const MENSAJE_LEASEFY_NO_RESPONDE =
  'Leasefy no está respondiendo en este momento. No es nada que hayas hecho; vuelve a intentar en unos minutos.'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

let estado: EstadoDeConexion = 'bien'
const oyentes = new Set<() => void>()
let escuchandoLaRed = false

function poner(nuevo: EstadoDeConexion) {
  if (nuevo === estado) return
  estado = nuevo
  for (const oyente of oyentes) oyente()
}

function navegadorSinRed(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/**
 * Los eventos `online`/`offline` del navegador. Se enganchan una sola vez, la
 * primera vez que alguien se suscribe: en el servidor no hay `window`.
 *
 * `offline` se cree (sin interfaz de red no sale nada); `online` sólo dice que
 * hay interfaz, no que el back conteste —ver `hay-senal.ts`—, así que apenas
 * levanta el «sin internet». Si Leasefy sigue sin responder, la próxima
 * petición lo vuelve a marcar.
 */
function escucharLaRed() {
  if (escuchandoLaRed || typeof window === 'undefined') return
  escuchandoLaRed = true
  window.addEventListener('offline', () => poner('sin-internet'))
  window.addEventListener('online', () => {
    if (estado === 'sin-internet') poner('bien')
  })
  // Una pestaña que abrió ya sin red no recibe el evento: arranca sabiéndolo.
  if (navegadorSinRed()) poner('sin-internet')
}

export function estadoDeConexion(): EstadoDeConexion {
  return estado
}

export function suscribirseALaConexion(oyente: () => void): () => void {
  escucharLaRed()
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

/** `fetch` ni siquiera salió. */
export function avisarFallaDeRed(): void {
  poner(navegadorSinRed() ? 'sin-internet' : 'leasefy-no-responde')
}

/** Contestó alguien que no es el back (el balanceador con un 502/503/504). */
export function avisarQueLeasefyNoResponde(): void {
  poner(navegadorSinRed() ? 'sin-internet' : 'leasefy-no-responde')
}

/** El back contestó: hay camino y hay back. */
export function avisarQueLeasefyRespondio(): void {
  poner('bien')
}

/** Sólo para las pruebas: cada una arranca con la conexión sana. */
export function reiniciarEstadoDeConexion(): void {
  poner('bien')
}

/**
 * El estado, para un componente. En el servidor es siempre «bien»: no hay
 * `navigator` ni peticiones fallidas que contar, y suponer otra cosa cambiaría
 * el HTML entre servidor y navegador.
 */
export function useEstadoDeConexion(): EstadoDeConexion {
  return useSyncExternalStore(suscribirseALaConexion, estadoDeConexion, () => 'bien')
}

// ── Qué respuesta es una caída ──────────────────────────────────────────────

/** Los tres status con los que un intermediario dice «atrás no hay nadie». */
export function esStatusDeIntermediario(status: number): boolean {
  return status === 502 || status === 503 || status === 504
}

/**
 * ¿Esta respuesta es «Leasefy entero no responde»? Sólo un 502/503/504 cuyo
 * cuerpo no es de nuestro back: sin el `statusCode` numérico del filtro
 * global y sin un `code` propio. Un `code` también delata al back —el
 * balanceador no manda códigos de negocio—, y hay respuestas que lo traen
 * solo (el 503 `payment_verification_unavailable` de la suscripción).
 */
export function esRespuestaDeCaidaGeneral(status: number, cuerpo: unknown): boolean {
  if (!esStatusDeIntermediario(status)) return false
  if (!cuerpo || typeof cuerpo !== 'object') return true
  const { statusCode, code } = cuerpo as { statusCode?: unknown; code?: unknown }
  return typeof statusCode !== 'number' && typeof code !== 'string'
}

/**
 * ¿Este error es de conexión —no salió el pedido, Leasefy entero no respondió
 * o se cayó la base, sin la cual no funciona nada— y no algo de lo que se
 * pidió? Es lo que la franja global ya está avisando, así que la pantalla no
 * tiene por qué repetirlo en rojo.
 */
export function esErrorDeConexion(error: unknown): boolean {
  const { status, code, servicio } = leerElError(error)
  if (status === 0 || code === CODIGO_LEASEFY_NO_RESPONDE) return true
  // La base caída llega como 503 `SERVICIO_NO_DISPONIBLE` con `servicio:
  // 'base'` (o ya convertida por `apiClient` al code de arriba).
  return servicio === 'base' && esCincoCientos(status)
}

// ── Preguntar si ya volvió ──────────────────────────────────────────────────

/**
 * Cuánto esperar antes de cada pregunta a `/health`: 5 s, 10 s, 20 s, 40 s y
 * de ahí en adelante cada minuto. Creciente para no golpear a un back que se
 * está levantando; con tope para que, cuando vuelva, la franja no tarde más
 * de un minuto en irse.
 */
export const ESPERAS_HASTA_QUE_VUELVA_MS = [5_000, 10_000, 20_000, 40_000, 60_000] as const

export function esperaDelIntento(intento: number): number {
  const i = Math.min(Math.max(0, intento), ESPERAS_HASTA_QUE_VUELVA_MS.length - 1)
  return ESPERAS_HASTA_QUE_VUELVA_MS[i]
}

/** Más que esto sin respuesta es «todavía no volvió». */
const TOPE_DE_LA_PREGUNTA_MS = 5_000

/**
 * ¿Volvió Leasefy? `/health` es público y no toca nada. Sólo un 200 cuenta:
 * un 503 de `/health` es el back diciendo que la base no responde, y con eso
 * casi ninguna pantalla funciona todavía.
 */
export async function preguntarSiLeasefyVolvio(
  fetchImpl: typeof fetch | undefined = typeof fetch !== 'undefined' ? fetch : undefined,
): Promise<boolean> {
  if (!fetchImpl || navegadorSinRed()) return false
  const corte = new AbortController()
  const reloj = setTimeout(() => corte.abort(), TOPE_DE_LA_PREGUNTA_MS)
  try {
    const r = await fetchImpl(`${BACKEND}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: corte.signal,
    })
    return r.status === 200
  } catch {
    return false
  } finally {
    clearTimeout(reloj)
  }
}
