import { redirect } from 'next/navigation'

/**
 * Ronda 30 (K8, Nico 23-10-2026: «K8 fusionar»). «Resultados del agente»
 * repetía las cifras del Resumen de Cobranza (`CobranzaResultadosKpis`). Lo que
 * tenía de propio —decir «Pagado hoy» cuando no hay agregado de recuperación—
 * entró a esas cifras; «Revisar N escalados» ya es una columna de «Te toca a
 * ti». Quien tenga el enlace guardado aterriza en «Cómo trabajó la cobranza»,
 * abierto.
 *
 * La redirección de verdad corre en `next.config.mjs`
 * (`src/lib/nav/cobranza-retiradas.data.mjs`); ésta es el respaldo.
 */
export default function ResultadosDeCobranzaRetirados(): never {
  redirect('/panel/inmobiliaria/pagos/cobranza#como-trabajo')
}
