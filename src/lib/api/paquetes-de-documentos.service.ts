/**
 * Paquetes de documentos de facturación electrónica (back `inmobiliaria/facturacion/paquetes/`, 27-10-2026).
 */
import { apiClient } from './client';

export interface EstadoDeLaBolsa {
  comprados: number;
  usados: number;
  disponibles: number;
  porcentaje: number;
  aviso: 80 | 100 | null;
  desde: string | null;
  venceElPrimero: string | null;
}

export interface PaqueteALaVenta {
  documentos: number;
  precio: number;
  iva: number;
  total: number;
  porDocumento: number;
}

export interface CompraDePaquete {
  id: string;
  documentos: number;
  precioCop: number;
  ivaCop: number;
  estado: 'PENDIENTE' | 'PAGADO' | 'ANULADO';
  pagadoAt: string | null;
  venceAt: string | null;
  creadoAt: string;
}

export interface VistaDeLosPaquetes {
  disponible: boolean;
  migracion: string | null;
  cobroPrendido: boolean;
  aLaVenta: PaqueteALaVenta[];
  bolsa: EstadoDeLaBolsa;
  usadosEsteMes: number;
  compras: CompraDePaquete[];
}

export const paquetesDeDocumentosApi = {
  ver: () => apiClient.get<VistaDeLosPaquetes>('/inmobiliaria/facturacion/paquetes'),
  comprar: (documentos: number) =>
    apiClient.post<{ paqueteId: string; paymentUrl: string; total: number }>('/inmobiliaria/facturacion/paquetes', { documentos }),
};
