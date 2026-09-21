/**
 * El castigo de cartera contra el back.
 *
 * Una sola puerta: ninguna pantalla arma estas rutas a mano.
 */

import { apiClient } from '@/lib/api/client';
import type {
  CandidatasACastigo,
  CastigoDeCartera,
  EstadoDelCastigo,
  ListaDeCastigos,
} from '@/lib/types/castigo';

const BASE = '/inmobiliaria/cartera/castigo';

export const castigoApi = {
  async listar(filtros: {
    estado?: EstadoDelCastigo;
    contractId?: string;
  } = {}): Promise<ListaDeCastigos> {
    const query = new URLSearchParams();
    if (filtros.estado) query.set('estado', filtros.estado);
    if (filtros.contractId) query.set('contractId', filtros.contractId);
    const qs = query.toString();
    return apiClient.get<ListaDeCastigos>(`${BASE}${qs ? `?${qs}` : ''}`);
  },

  async candidatas(contractId: string): Promise<CandidatasACastigo> {
    return apiClient.get<CandidatasACastigo>(`${BASE}/candidatas/${contractId}`);
  },

  async proponer(dto: {
    contractId: string;
    cuotaIds: string[];
    motivo: string;
    notas?: string;
  }): Promise<CastigoDeCartera> {
    return apiClient.post<CastigoDeCartera>(BASE, dto);
  },

  async firmar(castigoId: string): Promise<CastigoDeCartera> {
    return apiClient.post<CastigoDeCartera>(`${BASE}/${castigoId}/firmar`, {});
  },

  async rechazar(castigoId: string, motivo: string): Promise<CastigoDeCartera> {
    return apiClient.post<CastigoDeCartera>(`${BASE}/${castigoId}/rechazar`, {
      motivo,
    });
  },

  async reversar(castigoId: string, motivo: string): Promise<CastigoDeCartera> {
    return apiClient.post<CastigoDeCartera>(`${BASE}/${castigoId}/reversar`, {
      motivo,
    });
  },
};
