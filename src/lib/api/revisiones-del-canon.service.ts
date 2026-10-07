/**
 * «Revisar el canon» en el portal del propietario (MANOS-2, 04-10-2026).
 *
 * Cuando su inmueble lleva más de un mes desocupado, el Piloto de la
 * inmobiliaria le cuenta al propietario cuánto le ha costado la vacancia y le
 * pregunta si quiere revisar el canon. El número lo pone ÉL (D-PV-02: nadie
 * le propone un precio). La sesión dice quién es:
 *   `GET /portal/revisiones-del-canon`,
 *   `POST /portal/revisiones-del-canon/:id/responder { decision, canonPedidoCop?, comentario? }`.
 * Si pide otro canon, la inmobiliaria lo aplica con un clic (P-4).
 */
import { apiClient } from '@/lib/api/client';

export type EstadoDeLaRevision = 'PENDIENTE' | 'MANTENER' | 'BAJAR' | 'AVALUO' | 'APLICADA' | 'ANULADA';
export type DecisionDelPropietario = 'MANTENER' | 'BAJAR' | 'AVALUO';

export interface RevisionDelCanonEnElPortal {
  id: string;
  estado: EstadoDeLaRevision;
  inmobiliaria: string;
  inmueble: string;
  canonActualCop: number;
  diasVacante: number;
  vacanteDesde: string | null;
  costoDeLaVacanciaCop: number;
  siSigueVacio: Array<{ meses: number; cuestaCop: number }>;
  mesesDelContrato: number;
  canonPedidoCop: number | null;
  loQueCuestaElCanonPedido: { dejaDeRecibirCop: number; equivaleAMesesVacio: number } | null;
  comentario: string | null;
  preguntadaAt: string;
  respondidaAt: string | null;
  aplicadaAt: string | null;
}

export const revisionesDelCanonApi = {
  async delPortal(): Promise<{ pendientes: RevisionDelCanonEnElPortal[]; historial: RevisionDelCanonEnElPortal[] }> {
    return apiClient.get('/portal/revisiones-del-canon');
  },

  async responder(
    id: string,
    respuesta: { decision: DecisionDelPropietario; canonPedidoCop?: number; comentario?: string },
  ): Promise<RevisionDelCanonEnElPortal> {
    return apiClient.post(`/portal/revisiones-del-canon/${encodeURIComponent(id)}/responder`, {
      decision: respuesta.decision,
      ...(respuesta.canonPedidoCop !== undefined ? { canonPedidoCop: respuesta.canonPedidoCop } : {}),
      ...(respuesta.comentario?.trim() ? { comentario: respuesta.comentario.trim() } : {}),
    });
  },
};
