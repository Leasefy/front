/**
 * Buscar entre los proveedores que la inmobiliaria ya tiene en Operación →
 * Proveedores (Portofino, 29-10-2026): por nombre, por oficio o por documento,
 * escrito como sea (sin tildes; el NIT con o sin puntos y con o sin el dígito
 * de verificación).
 *
 * Lo usan los dos lugares donde se elige con quién se trabaja: «Nueva
 * solicitud» y «Agregar cotización» en el detalle.
 */

import { EN_PALABRAS } from '@/components/mantenimientos/especialidades';
import type { ProveedorDeMantenimiento } from '@/lib/api/proveedores-de-mantenimiento.service';

function norm(s: string | null | undefined): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const digitos = (s: string | null | undefined) => String(s ?? '').replace(/\D/g, '');

/** Los oficios del proveedor en palabras («Plomería, Electricidad»). */
export function oficiosEnPalabras(p: Pick<ProveedorDeMantenimiento, 'especialidades'>): string[] {
  return p.especialidades.map((e) => EN_PALABRAS.get(e) ?? e);
}

/** ¿Lo escrito está en el nombre, en un oficio o en el documento del proveedor? */
export function coincideElProveedor(p: ProveedorDeMantenimiento, consulta: string): boolean {
  const n = norm(consulta);
  if (!n) return true;
  if (norm(p.nombre).includes(n)) return true;
  if (oficiosEnPalabras(p).some((o) => norm(o).includes(n))) return true;
  // El documento: con 3 dígitos o más se compara sólo por los dígitos
  // («900.123.456-7» y «900123456» son el mismo NIT).
  const d = digitos(consulta);
  if (d.length >= 3 && /^[\d\s.\-]+$/.test(consulta.trim())) {
    const doc = digitos(p.documento);
    return doc.includes(d) || (d.length > doc.length && d.startsWith(doc) && doc.length >= 6);
  }
  return norm(p.documento).includes(n);
}

/**
 * Los que coinciden, los del oficio de la solicitud primero y luego por nombre.
 * `oficio` es el del back (`PLUMBING`); vacío = sin preferencia.
 */
export function buscarElProveedor(
  proveedores: readonly ProveedorDeMantenimiento[],
  consulta: string,
  oficio = '',
): ProveedorDeMantenimiento[] {
  return proveedores
    .filter((p) => coincideElProveedor(p, consulta))
    .sort(
      (a, b) =>
        Number(b.especialidades.includes(oficio)) - Number(a.especialidades.includes(oficio)) ||
        a.nombre.localeCompare(b.nombre, 'es'),
    );
}
