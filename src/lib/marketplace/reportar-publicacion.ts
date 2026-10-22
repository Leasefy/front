/**
 * «Reportar esta publicación» (22-10-2026): App Store (1.2) y Google Play piden que
 * todo lo que la gente publica se pueda reportar. Por ahora el reporte es un correo a
 * hola@leasefy.co con el enlace del inmueble y el motivo; en la app abre el correo
 * del celular.
 */
export const CORREO_PARA_REPORTES = 'hola@leasefy.co'

export function enlaceParaReportar(propertyId: string, origen: string): string {
  const asunto = `Reporte de una publicación (${propertyId})`
  const cuerpo = [
    'Quiero reportar esta publicación:',
    `${origen}/propiedades/${propertyId}`,
    '',
    'Motivo (información falsa, posible estafa, contenido ofensivo, ya no existe u otro):',
    '',
  ].join('\n')
  return `mailto:${CORREO_PARA_REPORTES}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
}
