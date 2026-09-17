/**
 * El estudio del inquilino PAGADO A LA INMOBILIARIA (Nico y Juan Camilo,
 * 17-09-2026): recibo + factura, no se devuelve, y mientras esté vigente no se
 * le vuelve a cobrar para ningún inmueble de la inmobiliaria.
 *
 *   POST /inmobiliaria/estudios/pagos            (cobros:create)
 *   GET  /inmobiliaria/estudios/pagos            (cobros:view)
 *   GET  /inmobiliaria/estudios/vigente?applicationId=   (portafolio:view, sin plata)
 *   POST /inmobiliaria/estudios/pagos/:id/anular (cobros:edit, sólo ADMIN)
 */

import { apiClient } from '@/lib/api/client';

export interface PagoDeEstudio {
  id: string;
  numeroRecibo: number;
  fecha: string;
  valorCop: number;
  medio: string;
  referencia: string | null;
  solicitante: { userId: string | null; nombre: string; documento: string | null; correo: string | null };
  applicationId: string | null;
  vigenteHasta: string;
  vigente: boolean;
  factura: {
    estado: 'GENERADA' | 'EMITIDA' | 'ANULADA';
    numero: number | null;
    totalCop: number;
    lineas: { tipo: string; nombre: string; valorCop: number }[];
  };
  anulado: boolean;
  motivoDeAnulacion: string | null;
  registradoAt: string;
}

export interface EstudioVigente {
  vigente: boolean;
  numeroRecibo: number | null;
  pagadoEl: string | null;
  vigenteHasta: string | null;
}

export interface NuevoPagoDeEstudio {
  applicationId?: string;
  solicitante?: { nombre?: string; documento?: string; correo?: string };
  valorCop: number;
  fecha?: string;
  medio: string;
  referencia?: string;
}

export const estudiosApi = {
  registrarPago(pago: NuevoPagoDeEstudio): Promise<PagoDeEstudio> {
    return apiClient.post<PagoDeEstudio>('/inmobiliaria/estudios/pagos', pago);
  },
  listar(): Promise<PagoDeEstudio[]> {
    return apiClient.get<PagoDeEstudio[]>('/inmobiliaria/estudios/pagos');
  },
  vigente(applicationId: string): Promise<EstudioVigente> {
    return apiClient.get<EstudioVigente>(
      `/inmobiliaria/estudios/vigente?applicationId=${encodeURIComponent(applicationId)}`,
    );
  },
  anular(id: string, motivo: string): Promise<PagoDeEstudio> {
    return apiClient.post<PagoDeEstudio>(`/inmobiliaria/estudios/pagos/${encodeURIComponent(id)}/anular`, {
      motivo,
    });
  },
};
