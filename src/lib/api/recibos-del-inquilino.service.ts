/**
 * Los recibos de caja del inquilino en su portal (QA-INQ-95, 04-10-2026).
 * Back: `back/src/tenant-payments/recibos-del-inquilino/` (`GET /portal/recibos`,
 * `GET /portal/recibos/:reciboId/pdf`).
 */
import { apiClient, ApiError } from './client';

export interface ReciboDelInquilino {
  id: string;
  numero: number;
  /** `AAAA-MM-DD`: el día en que entró la plata. */
  fecha: string;
  valorCop: number;
  interesesCop: number;
  medio: string;
  referencia: string | null;
  /** `AAAA-MM` de la cuota o del cobro que pagó; `null` si no se sabe. */
  mes: string | null;
  contrato: { numero: number; inmueble: string };
  inmobiliaria: string;
}

export const recibosDelInquilinoApi = {
  /** Sus recibos vivos, del más nuevo al más viejo. Un back anterior (404) = sin la función. */
  async listar(): Promise<ReciboDelInquilino[] | null> {
    try {
      const r = await apiClient.get<{ recibos: ReciboDelInquilino[] }>('/portal/recibos');
      return r.recibos ?? [];
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },
  pdf(reciboId: string): Promise<Blob> {
    return apiClient.getBlob(`/portal/recibos/${encodeURIComponent(reciboId)}/pdf`);
  },
};
