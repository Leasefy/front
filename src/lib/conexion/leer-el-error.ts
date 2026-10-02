/**
 * Lo que trae un error del back, venga como venga.
 *
 * El `ApiError` sube `code` y `status` a propiedades suyas y deja el cuerpo
 * entero en `detalle`; un error re-envuelto por un servicio lo trae en `body`;
 * un objeto plano es el cuerpo mismo. Mismo criterio que `cuerpoDelNo` en
 * `clasificar.ts`: el discriminante es lo que dice el error, no su clase.
 *
 * Vive aparte para que `estado-de-conexion.ts` y `servicio-no-disponible.ts`
 * lo usen sin importarse el uno al otro.
 */

export interface LoQueDiceElError {
  status?: number
  code?: string
  servicio?: string
}

export function leerElError(error: unknown): LoQueDiceElError {
  if (!error || typeof error !== 'object') return {}
  const sitios = [
    error as Record<string, unknown>,
    (error as { detalle?: unknown }).detalle,
    (error as { body?: unknown }).body,
  ].filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === 'object')
  const primero = <T>(campo: string, es: (v: unknown) => v is T): T | undefined => {
    for (const s of sitios) if (es(s[campo])) return s[campo] as T
    return undefined
  }
  const esNumero = (v: unknown): v is number => typeof v === 'number'
  const esTexto = (v: unknown): v is string => typeof v === 'string'
  return {
    // `status` del error primero; `statusCode` del cuerpo como respaldo.
    status: primero('status', esNumero) ?? primero('statusCode', esNumero),
    code: primero('code', esTexto),
    servicio: primero('servicio', esTexto),
  }
}

/** ¿Es un 5xx? */
export function esCincoCientos(status: number | undefined): boolean {
  return typeof status === 'number' && status >= 500 && status < 600
}
