import type { ApiError } from '@/lib/api/client'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'

/**
 * El resultado de una acción del micro que no salió (02-10-2026, tanda 2 de
 * errores, A6).
 *
 * Los hooks de los agentes IA, el piloto y la conciliación devuelven
 * `{ ok: false, error }` y las pantallas lo pintaban tal cual: «403»,
 * «not_configured», «(approve_failed)». Ahora llevan además `fallo`, el error
 * entero, para que la pantalla diga lo que pasó con `mensajeParaLaPersona` o
 * lo reparta por campo con `repartirErroresDelServidor`:
 *
 *  · `error` se conserva por compatibilidad (pantallas y pruebas que deciden
 *    con `'not_configured'`): es el `error` del cuerpo viejo o el status. NO es
 *    para la persona.
 *  · `fallo` es el `ApiError` de `falloDelMicro` (status, `code`, `message`
 *    del sobre y `campos`) o, si el pedido ni salió, el error de red TAL CUAL
 *    (el traductor lee el `TypeError('Failed to fetch')` como status 0).
 */
export interface AccionQueNoSalio {
  ok: false
  error: string
  fallo: unknown
}

/** La respuesta que no salió bien, con su `fallo` leído del sobre. */
export async function accionQueNoSalio(
  res: Pick<Response, 'status' | 'json'>,
): Promise<{ ok: false; error: string; fallo: ApiError }> {
  const fallo = await falloDelMicro(res)
  return { ok: false, error: errorDelCuerpoViejo(fallo), fallo }
}

/**
 * Lo mismo, cuando el cuerpo ya se leyó (la ruta devuelve datos útiles aun
 * fallando, como los `fallidos` de la confirmación en lote).
 */
export function accionQueNoSalioConCuerpo(
  status: number,
  cuerpo: unknown,
): Promise<{ ok: false; error: string; fallo: ApiError }> {
  return accionQueNoSalio({ status, json: async () => cuerpo })
}

/** El pedido no salió (sin red, CORS): el error llega tal cual al traductor. */
export function accionSinRespuesta(err: unknown, codigo: string): AccionQueNoSalio {
  return { ok: false, error: err instanceof Error ? err.message : codigo, fallo: err }
}

function errorDelCuerpoViejo(fallo: ApiError): string {
  const viejo = fallo.detalle?.error
  return typeof viejo === 'string' && viejo ? viejo : String(fallo.status)
}
