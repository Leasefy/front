/**
 * El restablecimiento del segundo factor que quedó PEDIDO (el código ya salió
 * al correo) y todavía no se confirmó.
 *
 * 🔴 Nico, 29-09-2026: pidió el código, fue a buscarlo al correo y al volver
 * la pantalla estaba otra vez en «Verificación de seguridad» — la página se
 * montó de nuevo y el paso vivía sólo en el estado de React. Escribió el
 * código del correo en las casillas de la app y le dijo «Código incorrecto».
 * Anotado acá, la pantalla vuelve sola a las casillas del correo.
 *
 * `sessionStorage`: sobrevive a recargar la pestaña y se va al cerrarla. Vale
 * lo que vale el código (10 minutos) y sólo para quien lo pidió. Si el
 * navegador no deja guardar, no se rompe nada: sólo no se recuerda.
 */

const CLAVE = 'leasefy:segundo-factor:restablecimiento'

/** Lo mismo que vive el código en el back. */
export const VIGENCIA_DEL_RESTABLECIMIENTO_MS = 10 * 60_000

export interface RestablecimientoPendiente {
  usuarioId: string
  /** Cuándo salió el código (epoch ms). */
  pedidoEn: number
  /** Desde cuándo se puede pedir otro (epoch ms). */
  reenviarDesde: number
}

export function marcarRestablecimientoPendiente(
  usuarioId: string,
  reenviarDesde: number,
  ahora: number = Date.now(),
): void {
  try {
    const valor: RestablecimientoPendiente = { usuarioId, pedidoEn: ahora, reenviarDesde }
    window.sessionStorage.setItem(CLAVE, JSON.stringify(valor))
  } catch {
    // Sin almacenamiento: la pantalla funciona igual, sólo no recuerda el paso.
  }
}

export function leerRestablecimientoPendiente(
  usuarioId: string,
  ahora: number = Date.now(),
): RestablecimientoPendiente | null {
  try {
    const crudo = window.sessionStorage.getItem(CLAVE)
    if (!crudo) return null
    const valor = JSON.parse(crudo) as Partial<RestablecimientoPendiente>
    if (
      valor.usuarioId !== usuarioId ||
      typeof valor.pedidoEn !== 'number' ||
      typeof valor.reenviarDesde !== 'number' ||
      ahora - valor.pedidoEn > VIGENCIA_DEL_RESTABLECIMIENTO_MS
    ) {
      return null
    }
    return { usuarioId, pedidoEn: valor.pedidoEn, reenviarDesde: valor.reenviarDesde }
  } catch {
    return null
  }
}

export function olvidarRestablecimientoPendiente(): void {
  try {
    window.sessionStorage.removeItem(CLAVE)
  } catch {
    // Nada que olvidar si no se pudo guardar.
  }
}
