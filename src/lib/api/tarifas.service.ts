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
    recaudo: { spreadBps: number; wompi?: { porcentajeBps: number; fijo: number } };
    dispersion: { porPago: number; wompi?: { porcentajeBps: number; fijo: number } };
    propietariosSinInmobiliaria: { gestionBps: number };
    implementacion: { conLeasefy: number };
    facturacionElectronica?: { paquetes: Array<{ documentos: number; precio: number }>; duranMeses: number };
    /** Firmas (28-10-2026). */
    firmas?: {
      porDocumento: number;
      firmantesPorDocumento: number;
      gratisAlCrearLaCuenta: number;
      paquetes: Array<{ firmas: number; precio: number }>;
      duranMeses: number;
    };
    /** La cuenta gratis: el chat con 5 preguntas de una vez (30-10-2026). */
    cuentaGratis?: { preguntas: number };
    estudioDelInquilino?: { precio: number };
    ivaBps?: number;
  };
  ejemplos: Array<{ inmuebles: number; total: number }>;
  /** El estudio del inquilino es gratis por ahora (Nico, 27-10-2026). */
  estudioDelInquilinoGratis?: boolean;
  /** ¿Ya se cobra lo variable (spread del recaudo, $3.000 por giro, 8 % de Mori)? */
  cobroVariable?: boolean;
}

export const tarifasApi = {
  ver: () => apiClient.get<TarifasDeLeasefy>('/config/tarifas'),
};
