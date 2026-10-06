/**
 * CB-20 / CB-21 (QA de Contabilidad, 03-10-2026): lo que el formulario de una
 * factura de proveedor PROPONE con lo que ya sabe. PURA.
 *
 *   · Al elegir un proveedor del registro: su retefuente (`retefuentePct` sobre
 *     la base, sin IVA) y, si NO es responsable de IVA, las líneas sin IVA. Las
 *     dos cosas quedan editables: es una propuesta, no una regla.
 *   · Las `notas` de la previsualización dicen qué falta configurar; la que
 *     habla de si la inmobiliaria es responsable de IVA lleva el enlace a donde
 *     se configura (Configuración → Mandato y giros).
 */

import type { ProveedorNoObligado } from '@/lib/api/facturacion-electronica.service';

export interface PropuestaDelProveedor {
  /** `null` = el registro no trae tarifa: no se propone nada. */
  retefuentePct: number | null;
  /** El IVA de las líneas: 0 si el proveedor no es responsable. */
  ivaPct: number;
  /** `true` = las líneas van sin IVA por lo que dice su registro. */
  sinIva: boolean;
}

export function propuestaDelProveedor(
  p: Pick<ProveedorNoObligado, 'retefuentePct' | 'responsableIva'>,
  ivaGeneral: number,
): PropuestaDelProveedor {
  const pct = typeof p.retefuentePct === 'number' && Number.isFinite(p.retefuentePct) && p.retefuentePct > 0
    ? p.retefuentePct
    : null;
  const sinIva = p.responsableIva === false;
  return { retefuentePct: pct, ivaPct: sinIva ? 0 : ivaGeneral, sinIva };
}

/** La retefuente propuesta: el porcentaje sobre la base (sin IVA), al peso. */
export function retefuentePropuesta(baseCop: number, pct: number): number {
  if (!Number.isFinite(baseCop) || !Number.isFinite(pct) || baseCop <= 0 || pct <= 0) return 0;
  return Math.round((baseCop * pct) / 100);
}

const CONFIGURACION_DEL_IVA = '/panel/inmobiliaria/configuracion/mandato';

/** El enlace de una nota de la previsualización, si dice algo que se configura. */
export function enlaceDeLaNota(nota: string): { href: string; label: string } | null {
  if (/inmobiliaria es responsable de IVA/i.test(nota)) {
    return { href: CONFIGURACION_DEL_IVA, label: 'Configurarlo en Mandato y giros' };
  }
  return null;
}
