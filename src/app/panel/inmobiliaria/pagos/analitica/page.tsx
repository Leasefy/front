import { redirect } from 'next/navigation'

/**
 * /panel/inmobiliaria/pagos/analitica — RETIRADA (QA de Portofino, 14-10-2026).
 *
 * Ya no tenía pestaña (ver la nota al pie de `agentWorkspaceNav.ts`): el
 * desempeño del agente tiene su fila propia, «Desempeño IA». Pero la ruta
 * seguía viva y pedía `ai-hub/agentes/pagos/analitica` al micro, que no existe:
 * quien llegaba por un enlace viejo veía un cartel de «no disponible». Nico:
 * «organízala». Ahora manda a Desempeño IA, que responde esa pregunta con datos.
 */
export default function PagosAnaliticaRetiradaPage() {
  redirect('/panel/inmobiliaria/reportes/ia')
}
