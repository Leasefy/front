/**
 * toCreatePayload — maps a reviewed `ImportProperty` row into the
 * `propertiesApi.create()` payload.
 *
 * Extracted out of `StepConfirmImport.tsx` (T-0038) so the listing-type
 * branching is testable on its own: before this task the function
 * unconditionally sent `monthlyRent: p.monthlyRent ?? 0`, which is a C6
 * violation the moment a SALE row (which legitimately has no `monthlyRent`
 * at all — `faltantesParaElBack` only requires `salePrice` for one) reaches
 * it. `resolveImportListingType` is the same free-text heuristic
 * `faltantesParaElBack`/`gapFiller` already use.
 *
 * ⚠ Retired from the live flow (WU-6): `StepConfirmImport.tsx` no longer
 * fans out client-side to `POST /properties` — it stages the batch via
 * `toImportarInmuebleDto.ts` + the durable `inmuebles-importacion.service.ts`
 * instead. Left in place (not deleted) in case a future single-property
 * quick-add path wants the same mapping; has no other importer today.
 */

import type { ImportProperty } from './importTypes';
import { resolveImportListingType } from './requisitosDelBack';

const TIPO_EN_ESPANOL: Record<string, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  studio: 'Apartaestudio',
  commercial: 'Local comercial',
  office: 'Oficina',
  warehouse: 'Bodega',
};

/**
 * La descripción sí se puede armar, porque NO se inventa nada: es el propio
 * inmueble contado con sus datos reales. El back sólo pide 20 caracteres.
 */
function descripcionParaElBack(p: ImportProperty): string {
  const propia = (p.notes ?? '').trim();
  if (propia.length >= 20) return propia;

  const partes = [
    p.propertyType ? TIPO_EN_ESPANOL[p.propertyType] ?? 'Inmueble' : 'Inmueble',
    p.propertyZone ? `en ${p.propertyZone}` : null,
    p.propertyCity ? `, ${p.propertyCity}` : null,
    p.propertyAddress ? `. ${p.propertyAddress}` : null,
    propia ? `. ${propia}` : null,
  ].filter(Boolean);

  const armada = partes.join(' ').replace(/\s+,/g, ',').replace(/\s+\./g, '.');
  // Piso duro: si el archivo venía casi vacío, igual tiene que pasar el mínimo.
  return armada.length >= 20 ? armada : `${armada} — inmueble importado`.trim();
}

/**
 * Map a parsed/AI-reviewed ImportProperty to the propertiesApi.create payload.
 * Accepted AI suggestions are already applied onto the property fields in StepAIReview.
 */
export function toCreatePayload(p: ImportProperty) {
  // contract.md T-0038 §3.2.2/§3.2.4 — a SALE row sends salePrice and
  // monthlyRent: null, never 0 (C6). A RENT row keeps the pre-existing
  // `?? 0` fallback for a missing/blank canon (unchanged behaviour).
  const isSale = resolveImportListingType(p.listingType) === 'sale';

  return {
    title: p.propertyTitle || p.propertyAddress || p.propertyCity || 'Propiedad importada',
    description: descripcionParaElBack(p),
    type: p.propertyType ?? 'apartment',
    city: p.propertyCity ?? '',
    neighborhood: p.propertyZone ?? '',
    address: p.propertyAddress ?? '',
    ...(p.propertyDepartment ? { department: p.propertyDepartment } : {}),
    listingType: isSale ? ('sale' as const) : ('rent' as const),
    monthlyRent: isSale ? null : (p.monthlyRent ?? 0),
    salePrice: isSale ? (p.salePrice ?? null) : null,
    ...(p.consignedAt ? { consignedAt: p.consignedAt } : {}),
    bedrooms: p.bedrooms ?? 0,
    bathrooms: p.bathrooms ?? 0,
    area: p.propertyArea ?? 0,
    ...(p.adminFee != null ? { adminFee: p.adminFee } : {}),
  };
}
