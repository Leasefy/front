import { redirect } from 'next/navigation'

/**
 * Ronda 30 (K8, Nico 23-10-2026: «K8 fusionar»). «Pendientes» repetía el
 * tablero «Te toca a ti» del Resumen de Cobranza. Lo suyo —buscar, filtrar por
 * grupo y paginar— vive dentro del tablero (`ListaDePendientes`, plegado).
 * Quien tenga el enlace guardado (o una notificación vieja) aterriza en el
 * tablero.
 *
 * La redirección de verdad corre en `next.config.mjs`
 * (`src/lib/nav/cobranza-retiradas.data.mjs`); ésta es el respaldo.
 */
export default function PendientesDeCobranzaRetirados(): never {
  redirect('/panel/inmobiliaria/pagos/cobranza#te-toca-a-ti')
}
