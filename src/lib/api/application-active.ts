/**
 * application-active — la regla de "postulación activa", una sola vez.
 *
 * Espeja EXACTO el guard anti-duplicados del back (applications.service.ts): un
 * par (inquilino, propiedad) solo puede tener UNA aplicación en estado activo.
 * "Activa" = cualquier status salvo WITHDRAWN / REJECTED.
 *
 * Se define por COMPLEMENTO a propósito: un estado nuevo del back (o
 * CONTRACT_FAILED, que hoy también bloquea re-postular) cuenta como activo por
 * defecto. Es la lectura conservadora — nunca dejar iniciar el wizard para
 * después comerse el 409 del back. Si el negocio decide permitir re-postular
 * tras un contrato caído, ese es un cambio del back y de esta lista, en un solo
 * lugar.
 */

/** Los únicos status que NO bloquean re-postular. */
export const NON_BLOCKING_APPLICATION_STATUSES = new Set(['WITHDRAWN', 'REJECTED'])

/** true si una aplicación en este status bloquea abrir una nueva para la misma propiedad. */
export function isActiveApplicationStatus(status: string): boolean {
  return !NON_BLOCKING_APPLICATION_STATUSES.has(status.trim().toUpperCase())
}
