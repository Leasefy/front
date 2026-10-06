import { apiClient } from './client';

/**
 * QA-INQ-95 ronda 2 (decisión de Nico, 04-10): «Certificado de que no debe nada
 * por el tiempo en que fue inquilino», para quien salió de un contrato por un
 * cambio de inquilino. La inmobiliaria lo ve y lo emite desde la ficha del
 * contrato; el PDF sale como cualquier documento de la inmobiliaria.
 */
export interface CertificadoDeSuTiempoEnLaFicha {
  parte: { id: string; nombre: string; documento: string | null; desde: string; hasta: string };
  revision: {
    puedeEmitirse: boolean;
    impedimentos: { code: string; mensaje: string }[];
    faltaCop: number;
    canceladoCop: number;
  };
  ultimo: { documentoId: string; emitidoEl: string } | null;
}

const base = (contractId: string) => `/inmobiliaria/contratos/${contractId}/certificados-de-su-tiempo`;

export const certificadoDeSuTiempoApi = {
  async enLaFicha(contractId: string): Promise<CertificadoDeSuTiempoEnLaFicha[]> {
    const r = await apiClient.get<{ partes: CertificadoDeSuTiempoEnLaFicha[] }>(base(contractId));
    return r.partes ?? [];
  },
  async emitir(contractId: string, parteId: string): Promise<{ documentoId: string }> {
    return apiClient.post<{ documentoId: string }>(`${base(contractId)}/${parteId}`);
  },
};
