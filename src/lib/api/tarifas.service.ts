/** Las tarifas públicas de Leasefy (back `GET /config/tarifas`, 27-10-2026). */
import { apiClient } from './client';

export interface TarifasDeLeasefy {
  /** ¿Ya se cobra por inmueble? Mientras no, la página de precios sigue con los planes de antes. */
  vigente?: boolean;
  tarifas: {
    plan: { porInmueble: number; minimoMensual: number; usuariosIncluidos: number; usuarioAdicional: number; preguntasIncluidas: number };
    recargas: Array<{ preguntas: number; precio: number }>;
    recargaDuraMeses: number;
    pilotoAutomatico: { porInmueble: number; pruebaDias: number };
    laura: { exitoBps: number };
    avaluo: { precioConIva: number };
    recaudo: { spreadBps: number };
    dispersion: { porPago: number };
    propietariosSinInmobiliaria: { gestionBps: number };
    implementacion: { conLeasefy: number };
    facturacionElectronica?: { paquetes: Array<{ documentos: number; precio: number }>; duranMeses: number };
  };
  ejemplos: Array<{ inmuebles: number; total: number }>;
}

export const tarifasApi = {
  ver: () => apiClient.get<TarifasDeLeasefy>('/config/tarifas'),
};
