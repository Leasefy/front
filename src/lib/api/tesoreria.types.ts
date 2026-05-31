/**
 * Tesorería / Egresos a propietarios — contrato de tipos (v6-04, frontend-first).
 *
 * Vista ERP del egreso neto al propietario con la fórmula que el motor
 * (M1 — back-main) calculará de forma autoritativa:
 *   canon − comisión − IVA s/comisión − retenciones (ReteFuente/ReteICA/ReteIVA) − descuentos = neto
 * Las retenciones son opcionales en el contrato (las modela/aplica M1 según el
 * régimen tributario del propietario); hoy el ejemplo del frontend las deja en 0.
 *
 * Complementa el módulo `dispersiones` (la acción operativa de dispersar);
 * aquí vive el ledger/desglose contable. UI con estado vacío honesto; el cómputo
 * real es backend (M1).
 */

export type EgresoEstado = 'pendiente' | 'aprobado' | 'procesado' | 'fallido';

/** Línea de egreso neto por propietario (fórmula ERP completa). */
export interface EgresoNeto {
  id: string;
  propietarioId: string;
  propietarioNombre: string;
  periodo: string;            // '2026-05'
  canonRecibido: number;      // COP — suma de cánones recaudados
  comisionAdmin: number;      // COP — comisión de administración
  comisionPorcentaje: number; // %
  ivaComision: number;        // COP — IVA (19%) sobre la comisión
  // Retenciones tributarias colombianas sobre los honorarios — opcionales: las
  // calcula M1 según el régimen del propietario (no todos las causan).
  retencionFuente?: number;   // COP — ReteFuente sobre la comisión/honorarios
  reteIca?: number;           // COP — ReteICA (municipal)
  reteIva?: number;           // COP — ReteIVA
  descuentos: number;         // COP — descuentos pendientes (mantenimiento, etc.)
  neto: number;               // COP — neto a pagar (ver calcularNeto)
  cuentaDestino?: string;     // banco + número (enmascarado)
  estado: EgresoEstado;
  comprobanteUrl?: string;    // comprobante de egreso (PDF), cuando procesado
}

/** Cálculo del neto a partir de las partes (mirror de lo que hará M1). Las
 *  retenciones son opcionales (default 0) — backward-compatible. */
export function calcularNeto(parts: {
  canonRecibido: number;
  comisionAdmin: number;
  ivaComision: number;
  descuentos: number;
  retencionFuente?: number;
  reteIca?: number;
  reteIva?: number;
}): number {
  return (
    parts.canonRecibido -
    parts.comisionAdmin -
    parts.ivaComision -
    (parts.retencionFuente ?? 0) -
    (parts.reteIca ?? 0) -
    (parts.reteIva ?? 0) -
    parts.descuentos
  );
}

/** Contrato del listado que el motor (M1) devolverá. */
export interface TesoreriaListResponse {
  periodo: string;
  egresos: EgresoNeto[];
  totalNeto: number;
}
