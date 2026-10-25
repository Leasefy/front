import { redirect } from 'next/navigation'

/**
 * Ronda 30 (K8, Nico 23-10-2026: «K8 fusionar»). «Analítica» repetía el Resumen
 * de Cobranza: la recuperación por etapa y las objeciones ya viven en su
 * plegado «Cómo trabajó la cobranza» (`CobranzaAnaliticaResumen`). El costo por
 * peso recuperado no se trajo: los costos del servicio no se muestran a la
 * inmobiliaria (regla de Nico del 24-08). Quien tenga el enlace guardado
 * aterriza en ese plegado, abierto.
 *
 * La redirección de verdad corre en `next.config.mjs`
 * (`src/lib/nav/cobranza-retiradas.data.mjs`), antes de la puerta del módulo;
 * ésta es el respaldo.
 */
export default function AnaliticaDeCobranzaRetirada(): never {
  redirect('/panel/inmobiliaria/pagos/cobranza#como-trabajo')
}
