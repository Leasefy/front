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
    /** $1.250 + IVA por pago, descontado del pago (Nico, 31-10-2026: sin Wompi y sin giros). */
    recaudo: { porPago: number };
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
  /** ¿Se descuenta el recaudo ($1.250 + IVA por pago)? Prendido de fábrica (31-10-2026). Mori se cobra siempre. */
  cobroDelRecaudo?: boolean;
}

export const tarifasApi = {
  ver: () => apiClient.get<TarifasDeLeasefy>('/config/tarifas'),
};
