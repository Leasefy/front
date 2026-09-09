import { redirect } from 'next/navigation'

/**
 * /postulaciones/asegurabilidad/integraciones — OCULTA. Redirige al Resumen.
 *
 * Era una maqueta: seis tarjetas con un botón «Conectar» deshabilitado y
 * rotulado «Próximamente», y diez métricas de negocio en «—» porque el dato
 * real no tenía endpoint. Un control que no hace nada no se ofrece, y lo que
 * no va a producción no se muestra. La única pieza real de esa pantalla —el
 * `<BadgeFuente>` que explica de dónde sale un veredicto— sigue viva donde se
 * usa: en la matriz y el veredicto de cada cotización.
 *
 * La ruta se conserva por si quedó enlazada; la pestaña se retiró de
 * `agentWorkspaceNav.ts` (ver la nota al pie).
 */
export default function IntegracionesOcultaPage() {
  redirect('/panel/inmobiliaria/postulaciones/asegurabilidad')
}
