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

/**
 * Lo que dice `fetch` cuando el pedido NO llegó a salir (sin red, DNS, el
 * servidor apagado, CORS): Chrome, Firefox, Safari, React Native y Node, en
 * ese orden. En minúscula: se compara contra el texto en minúscula.
 *
 * 02-10-2026 · Node (undici) dice `TypeError: fetch failed`, distinto de los
 * navegadores. Sin esa frase, un pedido que no salió desde el servidor de
 * Next (o desde una prueba que corre en Node) se leía como «algo falló» y no
 * como «sin respuesta».
 */
export const RED_CAIDA = [
  'failed to fetch',
  'networkerror',
  'load failed',
  'network request failed',
  'fetch failed',
] as const

/** ¿Este texto es el de un pedido que no salió? */
export function suenaARedCaida(texto: string): boolean {
  const t = texto.toLowerCase()
  return RED_CAIDA.some((senal) => t.includes(senal))
}

/**
 * ¿El error es el `TypeError` de un `fetch` que no salió? Sólo un
 * `TypeError` (o algo que se llama así): un `Error` cualquiera que diga
 * «fetch failed» en su texto puede ser otra cosa.
 */
export function esFalloDeRed(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const esTypeError =
    error instanceof TypeError || (error as { name?: unknown }).name === 'TypeError'
  const mensaje = (error as { message?: unknown }).message
  return esTypeError && typeof mensaje === 'string' && suenaARedCaida(mensaje)
}

export function leerElError(error: unknown): LoQueDiceElError {
  if (!error || typeof error !== 'object') return {}
  // Sin respuesta no hay cuerpo que leer: status 0, como el `ApiError(0)` del
  // cliente. Así quien lee sólo el status (el traductor, la franja) sabe que
  // fue la red aunque el `TypeError` del `fetch` llegue crudo.
  if (esFalloDeRed(error)) return { status: 0 }
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
