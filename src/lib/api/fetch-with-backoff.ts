'use client'

/**
 * fetch-with-backoff.ts — reintenta una llamada al agente cuando el gateway
 * la frenó por rate limit (T-0076).
 *
 * El 429 de `agents_limit` en NGINX (5 r/s, burst 10) no siempre llega como
 * un estado 429 legible: la página de error de NGINX no lleva
 * `Access-Control-Allow-Origin`, así que el navegador la reporta como un
 * fallo de red — `TypeError: Failed to fetch` — indistinguible de estar sin
 * conexión (diagnóstico completo en el ledger de la tarea, §2.1). Por eso
 * `conBackoff` reintenta AMBOS casos —estado 429 y excepción de red— con el
 * mismo backoff acotado: hasta que el gateway del WU-1 hermano mande CORS en
 * sus páginas de error, un 429 real y una caída de red se ven exactamente
 * igual desde acá.
 *
 * Cuando el hacer() está atado a un AbortSignal ya abortado, no se reintenta:
 * reintentar algo que el propio caller canceló no tiene sentido.
 */

export interface OpcionesDeBackoff {
  /** Cuántos reintentos ADEMÁS del intento inicial. Por defecto 2. */
  reintentos?: number
  /** Base del backoff, en ms. Cada intento espera `base * intento + jitter`. */
  esperaBaseMs?: number
}

const REINTENTOS_POR_DEFECTO = 2
const ESPERA_BASE_MS_POR_DEFECTO = 500

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function demora(intento: number, base: number): number {
  return base * intento + Math.floor(Math.random() * 150)
}

/**
 * `hacer` dispara la petición real (normalmente `() => agentFetch(url,
 * init)` o `() => globalThis.fetch(...)`) — `conBackoff` no construye el
 * `Request`, sólo decide si vale la pena volver a llamar a `hacer`.
 */
export async function conBackoff(
  hacer: () => Promise<Response>,
  signal?: AbortSignal,
  opciones: OpcionesDeBackoff = {},
): Promise<Response> {
  const reintentos = opciones.reintentos ?? REINTENTOS_POR_DEFECTO
  const esperaBaseMs = opciones.esperaBaseMs ?? ESPERA_BASE_MS_POR_DEFECTO

  let intento = 0
  for (;;) {
    try {
      const res = await hacer()
      if (res.status !== 429 || intento >= reintentos || signal?.aborted) return res
      intento += 1
      await esperar(demora(intento, esperaBaseMs))
    } catch (err) {
      if (intento >= reintentos || signal?.aborted) throw err
      intento += 1
      await esperar(demora(intento, esperaBaseMs))
    }
  }
}
