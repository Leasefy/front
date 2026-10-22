/**
 * «Pagar lo vencido» del portal del inquilino (Nico, 04-10-2026, TAL CUAL):
 * Wompi, todo o las cuotas escogidas (la más vieja primero), se aplica solo y
 * deja recibo en PDF. Back: `back/src/tenant-payments/pago-de-lo-vencido/`.
 *
 * El monto lo decide el back (nunca el navegador): `iniciar` va por la ruta de
 * Next `/api/inquilino/pagos/vencido/wompi-session`, que pide el monto al back
 * y firma la integridad con el secreto del servidor.
 */
import { apiClient } from './client';
import { sumar } from '@/lib/plata/plata';

export interface CuotaQueSePuedePagar {
  id: string;
  cuotaId: string | null;
  /** `AAAA-MM`. */
  mes: string;
  /** `AAAA-MM-DD`. */
  vence: string;
  vencida: boolean;
  valorCop: number;
  interesCop: number;
  /** De qué es la cuota (canon, IVA, retención…). Un back anterior no lo manda. */
  lineas?: LineaDeLaCuota[];
  /** Lo que ya se abonó a la cuota. Un back anterior no lo manda. */
  abonadoCop?: number;
}

/** Una línea del desglose de la cuota; `resta`: se descuenta (retenciones). */
export interface LineaDeLaCuota {
  nombre: string;
  valorCop: number;
  resta: boolean;
}

export interface LoQueSePuedePagar {
  aplica: boolean;
  cuotas: CuotaQueSePuedePagar[];
  totalVencidoCop: number;
  enVerificacion: {
    solicitudId: string;
    valorCop: number;
    desde: string;
    /** QA-INQ-95: `false` = Wompi todavía no conoce el intento (puede que no lo haya terminado). Un back anterior no lo manda. */
    conTransaccion?: boolean;
    puedesReintentarDesde?: string | null;
  } | null;
  ultimoRechazo: { solicitudId: string; valorCop: number; motivo: string | null } | null;
}

/**
 * 🔴 Un arriendo del inquilino con lo que puede pagar (Nico, 21-10-2026: «que
 * se muestre bien a qué hace referencia ese pago y de qué inmueble»).
 */
export interface ArriendoQueSePuedePagar extends LoQueSePuedePagar {
  leaseId: string;
  contractId: string | null;
  /** El número del contrato en la inmobiliaria. */
  contratoNumero: number | null;
  inmueble: { titulo: string | null; direccion: string; ciudad: string | null };
  inmobiliaria: string | null;
}

/** Cuántas de las cuotas más viejas de qué arriendo entran al pago. */
export interface ParteDelPago {
  leaseId: string;
  cuotas: number;
}

export const pagoEnLineaApi = {
  /**
   * Todos los arriendos con lo que se puede pagar de cada uno. Un back
   * anterior no tiene la ruta: quien llama cae al de un solo arriendo.
   */
  misArriendos(): Promise<{ arriendos: ArriendoQueSePuedePagar[] }> {
    return apiClient.get<{ arriendos: ArriendoQueSePuedePagar[] }>('/portal/pago-en-linea/mis-arriendos');
  },
  loQueSePuedePagar(leaseId: string): Promise<LoQueSePuedePagar> {
    return apiClient.get<LoQueSePuedePagar>(`/portal/pago-en-linea/arriendos/${encodeURIComponent(leaseId)}`);
  },
  /** El recibo en PDF de un pago en línea confirmado. */
  recibo(solicitudId: string): Promise<Blob> {
    return apiClient.getBlob(`/portal/pago-en-linea/recibos/${encodeURIComponent(solicitudId)}/pdf`);
  },
};

/** Las N más viejas: escoger una cuota marca todas las anteriores (no se salta una vieja). */
export function totalDeLasMasViejas(cuotas: readonly CuotaQueSePuedePagar[], cuantas: number): number {
  // Al centavo, sin ruido de flotante (la misma suma del back).
  return sumar(...cuotas.slice(0, cuantas).map((c) => c.valorCop));
}

/** El nombre corto del inmueble: su título, o la dirección si no tiene. */
export function nombreDelInmueble(a: Pick<ArriendoQueSePuedePagar, 'inmueble'>): string {
  return a.inmueble.titulo?.trim() || a.inmueble.direccion;
}
