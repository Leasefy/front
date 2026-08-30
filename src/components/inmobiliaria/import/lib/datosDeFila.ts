/**
 * datosDeFila — the wire <-> domain translation for one staged import row
 * (T-0038, contract-addendum-3.md §3.4).
 *
 * `fila.datos` is the ingestion DTO echoed back verbatim, so it carries the
 * WIRE vocabulary: `type`, not `propertyType`, and UPPER_SNAKE values. The
 * review UI works in the front's domain vocabulary (lowercase), like every
 * other screen. These two functions are the only place the two meet — the
 * same convention `properties.service.ts` uses for `POST /properties`.
 *
 * They live here, out of the component, because this mapping is what broke:
 * the row editor read `datos.propertyType` (always `undefined`, so the picker
 * rendered blank) and sent `propertyType` back (a 400 on every save). Neither
 * had a test.
 */

import { TYPE_MAP, TYPE_TO_BACKEND, LISTING_TYPE_TO_BACKEND } from '@/lib/api/properties.mapper';
import type { ListingType, PropertyType } from '@/lib/types/property';
import type {
  ImportarInmuebleDto,
  ResolverInmuebleDto,
} from '@/lib/api/inmuebles-importacion.service';

/** The row editor's state, in the front's domain vocabulary. */
export interface FormularioFila {
  title?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  department?: string;
  propertyType?: PropertyType;
  listingType?: ListingType;
  monthlyRent?: number;
  salePrice?: number;
  area?: number;
}

/**
 * Wire -> domain. Unmappable stays `undefined` so the picker shows its
 * placeholder rather than a fabricated type (C19). The original value is not
 * lost: it stays in `datos` on the back, and an omitted key on save leaves it
 * alone.
 */
export function propertyTypeDeDatos(valor: unknown): PropertyType | undefined {
  return TYPE_MAP[String(valor ?? '').trim().toUpperCase()];
}

/**
 * Wire -> domain, TOLERANTLY. `datos` is unvalidated free text by design (C13)
 * and this runs inside a list render, so an unrecognised value must degrade,
 * never throw. `resolveListingType` in `properties.mapper` throws on purpose —
 * correct for a validated `Property` response, a whole-page crash here. It
 * MUST NOT be used on `datos`.
 *
 * Unknown or absent returns `undefined` rather than `'rent'`: such a row
 * already carries a `tipo_de_negocio` faltante, and quietly pre-selecting
 * "Arriendo" would let the reviewer save a rental on a row that never was one.
 */
export function listingTypeDeDatos(valor: unknown): ListingType | undefined {
  const v = String(valor ?? '').trim().toUpperCase();
  if (v === 'SALE') return 'sale';
  if (v === 'RENT') return 'rent';
  return undefined;
}

export function formularioDesde(datos: ImportarInmuebleDto): FormularioFila {
  return {
    title: datos.title,
    address: datos.address,
    city: datos.city,
    neighborhood: datos.neighborhood,
    department: datos.department,
    propertyType: propertyTypeDeDatos(datos.type),
    listingType: listingTypeDeDatos(datos.listingType),
    monthlyRent: datos.monthlyRent,
    salePrice: datos.salePrice,
    area: datos.area,
  };
}

/**
 * Domain -> wire. Only fields with a real value are forwarded: an empty string
 * would clear a field the reviewer never touched, since an omitted key leaves
 * the stored value alone.
 *
 * The prices are the deliberate asymmetry. `undefined` never clears; only an
 * explicit `null` does, and clearing is the only exit from
 * `precio_inconsistente` on a row whose file carried both. **`0` does not
 * clear — it is a 400 (`@Min(1)`, C6).**
 */
export function cambiosDesdeFormulario(form: FormularioFila): ResolverInmuebleDto {
  const cambios: ResolverInmuebleDto = {};

  if (form.title) cambios.title = form.title;
  if (form.address) cambios.address = form.address;
  if (form.city) cambios.city = form.city;
  if (form.neighborhood) cambios.neighborhood = form.neighborhood;
  if (form.department) cambios.department = form.department;
  // `?? form.propertyType` keeps an unmappable value intact rather than
  // dropping it (§3.4, consequence 1).
  if (form.propertyType) {
    cambios.type = TYPE_TO_BACKEND[form.propertyType] ?? form.propertyType;
  }
  if (form.listingType) cambios.listingType = LISTING_TYPE_TO_BACKEND[form.listingType];
  if (form.area != null) cambios.area = form.area;

  if (form.listingType === 'sale') {
    if (form.salePrice != null) cambios.salePrice = form.salePrice;
    cambios.monthlyRent = null;
  } else {
    if (form.monthlyRent != null) cambios.monthlyRent = form.monthlyRent;
    cambios.salePrice = null;
  }

  return cambios;
}
