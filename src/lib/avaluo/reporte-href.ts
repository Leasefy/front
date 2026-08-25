/**
 * reporte-href.ts — la URL (relativa) del informe web del avalúo, la entrega
 * principal: `/avaluo/reporte/[slug]?token=<capability>`.
 *
 * El capability token viaja en la query igual que en `certificateUrl` (es el
 * mismo secreto del dueño); la página lo canjea SERVER-SIDE contra el micro
 * (`report-view.data.ts`) y nunca lo lee en el cliente. Una sola función para
 * que la tarjeta de estado, los tests y cualquier otro punto de entrada armen
 * la misma URL.
 */

import type { AvaluoStatus } from '@/lib/types/avaluo'

export function reporteAvaluoHref(slug: string, capToken: string): string {
  return `/avaluo/reporte/${encodeURIComponent(slug)}?token=${encodeURIComponent(capToken)}`
}

/**
 * El predicado de auto-redirect de la pantalla de espera (T-0007 §3.4,
 * FROZEN — no se toca sin re-congelar el contrato):
 *
 *   redirect to /avaluo/reporte/<slug>?token=<capToken>
 *     iff   statusData.slug != null
 *      &&   statusData.status !== 'rechazado'
 *      &&   capToken != null
 *
 * No hace falta ningún campo nuevo en `GET /:id/status`: `status` sólo puede
 * distinguir "pipeline corriendo" de "en revisión" — los dos son
 * `'en_revisión'` — así que `slug` es el discriminador. La exclusión de
 * `rechazado` es deliberada: una solicitud rechazada queda reembolsada
 * (`signoff/route.ts`, rama reject → `refundForSubmission`) y no hay que
 * mandarla a un informe.
 */
export function shouldRedirectToReport(
  status: AvaluoStatus,
  slug: string | null | undefined,
  capToken: string | null,
): boolean {
  return slug != null && slug.length > 0 && status !== 'rechazado' && capToken !== null
}
