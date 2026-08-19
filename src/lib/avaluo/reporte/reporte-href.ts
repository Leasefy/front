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
export function reporteAvaluoHref(slug: string, capToken: string): string {
  return `/avaluo/reporte/${encodeURIComponent(slug)}?token=${encodeURIComponent(capToken)}`
}
