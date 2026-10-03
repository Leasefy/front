/**
 * Las rutas del agente de Retención (QA-CONT C-19, 03-10-2026).
 *
 * Nico (16:44, captura de `/contratos/aprobar`): «cuidado que esto no tiene
 * una navegación clara». Eligió «Moverlas a Agentes IA con navegación»: el
 * tablero, la bandeja de riesgos, la ficha de un caso y la cola de decisiones
 * por aprobar viven ahora bajo `/retencion`, con su fila en «Agentes IA»,
 * migas, «Volver» y sus pestañas (`AGENT_WORKSPACES`, slug `retencion`). Las
 * rutas viejas bajo `/contratos/…` redirigen acá
 * (`rutas-por-ciclo-de-vida.data.mjs`).
 *
 * Siguen mostrando los datos de ejemplo con el aviso naranja hasta que el
 * agente exista (el micro no publica `/api/agency/:id/retencion/*`).
 */
export const RETENCION = '/panel/inmobiliaria/retencion';
export const RETENCION_RIESGO = `${RETENCION}/riesgo`;
export const RETENCION_APROBAR = `${RETENCION}/aprobar`;

/** La ficha de un caso de riesgo. */
export function casoDeRetencion(caseId: string): string {
  return `${RETENCION_RIESGO}/${encodeURIComponent(caseId)}`;
}
