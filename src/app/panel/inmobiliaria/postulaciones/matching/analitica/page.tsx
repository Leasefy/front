import { redirect } from 'next/navigation'

/**
 * /panel/inmobiliaria/postulaciones/matching/analitica — RETIRADA.
 *
 * El micro no expone `ai-hub/agentes/{agente}/analitica` para ningún agente:
 * esta pestaña era un error garantizado (<AnaliticaAgente> pintaba un
 * <FalloDeCarga> con un 404 sintético en cada visita). Una pestaña que
 * siempre falla es un control muerto, y el producto no muestra lo que no
 * hace. La ruta se conserva sólo para que un enlace viejo no dé 404: manda
 * al Resumen.
 */
export default function MatchingAnaliticaRetiradaPage() {
  redirect('/panel/inmobiliaria/postulaciones/matching')
}
