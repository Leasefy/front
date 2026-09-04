/**
 * toImportarInmuebleDto — maps a reviewed `ImportProperty` row into the
 * staging DTO for `POST /inmobiliaria/inmuebles/importar/preparar`
 * (WU-4, wu-4-report.md §6).
 *
 * Deliberately different from `toCreatePayload.ts` (the old, now-retired
 * client-fan-out path): C13 ("origin governs validation") means every
 * field here is OMITTED when absent/blank, never defaulted. `toCreatePayload`
 * fills gaps with `?? 0` / `'apartment'` / etc. because `POST /properties`
 * enforces completeness immediately; the staging endpoint does not — the
 * back's own gap-detection produces the row's `faltantes` list, and
 * inventing a value here would hide a real gap instead of surfacing it for
 * the review step to fix.
 */

import type { ImportProperty } from './importTypes';
import { resolveImportListingType } from './requisitosDelBack';
import { TYPE_TO_BACKEND } from '@/lib/api/properties.mapper';
import type { PropertyType } from '@/lib/types/property';
import type { ImportarInmuebleDto } from '@/lib/api/inmuebles-importacion.service';

export function toImportarInmuebleDto(p: ImportProperty): ImportarInmuebleDto {
  const dto: ImportarInmuebleDto = {};

  if (p.propertyTitle) dto.title = p.propertyTitle;
  if (p.propertyAddress) dto.address = p.propertyAddress;
  if (p.propertyCity) dto.city = p.propertyCity;
  if (p.propertyZone) dto.neighborhood = p.propertyZone;
  if (p.propertyDepartment) dto.department = p.propertyDepartment;
  // The wire key is `type` and the casing is UPPER_SNAKE
  // (contract-addendum-3.md §3.4) — the same translation
  // `properties.service.ts` already applies to `POST /properties`, so the
  // task has one casing rule instead of one per endpoint.
  //
  // `?? p.propertyType` is MANDATORY, not stylistic: `normalizePropertyType`
  // returns the raw cell unchanged when nothing matches, so this can be
  // "Apartaestudio". That string must reach the back INTACT, or `revisar()`
  // cannot show the original value next to the address for the reviewer to
  // fix. Upper-casing it, dropping it or defaulting it all violate C13/C19.
  if (p.propertyType) {
    dto.type = TYPE_TO_BACKEND[p.propertyType as PropertyType] ?? p.propertyType;
  }
  if (p.propertyArea != null) dto.area = p.propertyArea;
  if (p.bedrooms != null) dto.bedrooms = p.bedrooms;
  if (p.bathrooms != null) dto.bathrooms = p.bathrooms;

  // C13 — only decide listingType (and therefore which price field applies)
  // when the source file actually said something. An unrecognised/blank
  // value degrades to 'rent' via `resolveImportListingType`'s own default,
  // same heuristic the review step already uses (requisitosDelBack.ts).
  if (p.listingType) {
    const isSale = resolveImportListingType(p.listingType) === 'sale';
    // UPPER_SNAKE on the wire (§3.4). The back matches case-insensitively
    // today, but one casing rule for the whole task is what stops the next
    // "which endpoint am I on?" ambiguity — that is what produced F-1.
    dto.listingType = isSale ? 'SALE' : 'RENT';
    if (isSale) {
      if (p.salePrice != null) dto.salePrice = p.salePrice;
    } else if (p.monthlyRent != null) {
      dto.monthlyRent = p.monthlyRent;
    }
  } else {
    // No listingType hint at all — still forward whichever price the row
    // carries, never both, never a coerced 0.
    if (p.monthlyRent != null) dto.monthlyRent = p.monthlyRent;
    if (p.salePrice != null) dto.salePrice = p.salePrice;
  }

  if (p.adminFee != null) dto.adminFee = p.adminFee;
  if (p.consignedAt) dto.consignedAt = p.consignedAt;

  // El propietario del archivo viaja al back para que el inmueble nazca
  // consignado (Nico, 2026-09-02: «que tome el que viene desde la
  // migración»). Vacío no viaja: el back no debe ver '' como un dato.
  if (p.ownerDocument?.trim()) dto.propietarioDocumento = p.ownerDocument.trim();
  if (p.ownerName?.trim()) dto.propietarioNombre = p.ownerName.trim();
  if (p.commissionPercent != null) dto.comisionPorcentaje = p.commissionPercent;

  return dto;
}
