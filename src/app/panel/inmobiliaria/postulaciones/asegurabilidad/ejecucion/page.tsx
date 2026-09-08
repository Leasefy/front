import { redirect } from 'next/navigation'

/**
 * /postulaciones/asegurabilidad/ejecucion — OCULTA. Redirige al Resumen.
 *
 * Era una maqueta: doce estados escritos a mano y `FILAS_EJEMPLO` con
 * «Aseguradora A…G», rotuladas «datos ilustrativos». No había ejecución en
 * vivo cableada; la pantalla documentaba una leyenda, no mostraba una consulta.
 * Lo que sí existe —el avance por aseguradora de una consulta real— se ve en
 * la ficha de cada cotización (`[quoteId]`), que lee el stream del micro.
 *
 * La ruta se conserva por si quedó enlazada; la pestaña se retiró de
 * `agentWorkspaceNav.ts` (ver la nota al pie).
 */
export default function EjecucionOcultaPage() {
  redirect('/panel/inmobiliaria/postulaciones/asegurabilidad')
}
