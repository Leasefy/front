/**
 * 🔴 CB-R21 (04-10-2026) · La factura de proveedor vive en Contabilidad ›
 * Gastos; «Cuentas por pagar» la lee de ahí. Lo puro: cuándo se ofrece
 * «Pagar», en qué va su pago y en qué pestaña de Cuentas por pagar cae.
 */
import type {
  EgresoDeLaFactura,
  FacturaDeProveedor,
} from '@/lib/api/gastos.service';

/** Se paga lo CAUSADO que nadie mandó a pagar todavía. */
export function sePuedePagar(f: Pick<FacturaDeProveedor, 'estado' | 'egreso'>): boolean {
  return f.estado === 'CAUSADA' && !f.egreso;
}

/** En qué va el pago de la factura, dicho para la persona. */
export function egresoDeLaFacturaEnPalabras(e: EgresoDeLaFactura): string {
  const ce = e.numero !== null ? ` CE-${e.numero}` : '';
  switch (e.estado) {
    case 'PENDIENTE':
      return 'En Egresos: falta armar el lote';
    case 'EN_LOTE':
      return 'En un lote de egresos: falta aprobarlo y girar';
    case 'PAGADO':
      return `Pagada con el egreso${ce}`;
    default:
      return 'Con un egreso anulado';
  }
}

export type EstadoDePago = 'por-pagar' | 'vencida' | 'en-pago' | 'pagada';

/**
 * El estado de la cuenta por pagar. `hoy` en `AAAA-MM-DD` (el día de la
 * persona). Vencida = causada, sin egreso y con la fecha de vencimiento ya
 * pasada; con egreso vivo está «en pago» aunque esté vencida.
 */
export function estadoDePago(
  f: Pick<FacturaDeProveedor, 'estado' | 'egreso' | 'fechaDeVencimiento'>,
  hoy: string,
): EstadoDePago | null {
  if (f.estado === 'PAGADA') return 'pagada';
  if (f.estado !== 'CAUSADA') return null;
  if (f.egreso) return f.egreso.estado === 'PAGADO' ? 'pagada' : 'en-pago';
  const vence = f.fechaDeVencimiento?.slice(0, 10);
  return vence && vence < hoy ? 'vencida' : 'por-pagar';
}

export const NOMBRE_DEL_ESTADO_DE_PAGO: Record<EstadoDePago, string> = {
  'por-pagar': 'Por pagar',
  vencida: 'Vencida',
  'en-pago': 'En pago',
  pagada: 'Pagada',
};
