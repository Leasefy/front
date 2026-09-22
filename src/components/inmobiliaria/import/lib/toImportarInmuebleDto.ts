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

import type { DuenoDelArchivo, ImportProperty } from './importTypes';
import { tipoEfectivo } from './requisitosDelBack';
import { TYPE_TO_BACKEND } from '@/lib/api/properties.mapper';
import type { PropertyType } from '@/lib/types/property';
import type {
  ImportarInmuebleDto,
  PropietarioDelInmuebleDto,
} from '@/lib/api/inmuebles-importacion.service';
import { repartoEnBps } from '@/lib/migracion/valores-de-origen';

export function toImportarInmuebleDto(p: ImportProperty): ImportarInmuebleDto {
  const dto: ImportarInmuebleDto = {};

  /*
   * El código del sistema viejo. `ImportarInmuebleDto.externalId` ya existe en
   * el back y se persiste en `Property.externalId`: es lo que después deja
   * cruzar «el inmueble 2945 de allá» con el de acá, y lo que los contratos
   * migrados nombran. Sin esto, el archivo real entraba con su columna más
   * importante tirada a la basura.
   */
  if (p.externalId?.trim()) dto.externalId = p.externalId.trim();
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
    /*
     * 🔴 `tipoEfectivo`, no `resolveImportListingType`. Éste es el camino que
     * de verdad viaja al back, y acá se decidía por la CATEGORÍA sola: una
     * fila «Venta» que sólo trae canon salía con `listingType: 'SALE'` y **sin
     * ningún precio**, porque el `if (isSale)` sólo miraba `salePrice`. El
     * back la recibía sin nada que guardar y la dejaba pendiente pidiendo un
     * precio de venta que el archivo nunca tuvo.
     *
     * En el archivo real de la inmobiliaria eso eran 10 filas de 2.895. Con el
     * tipo siguiendo al precio que sí existe, la fila viaja como arriendo con
     * su canon —que es lo que el archivo dice— en vez de viajar vacía.
     */
    const isSale = tipoEfectivo(p) === 'sale';
    // UPPER_SNAKE on the wire (§3.4). The back matches case-insensitively
    // today, but one casing rule for the whole task is what stops the next
    // "which endpoint am I on?" ambiguity — that is what produced F-1.
    dto.listingType = isSale ? 'SALE' : 'RENT';
    /*
     * 🔴 Los DOS precios viajan cuando el archivo trae los dos (QA 22-09):
     * «Arriendo» con precio de venta perdía la venta. El back guarda el de la
     * operación y deja el otro escrito en el inmueble; frenar la fila por eso
     * no (Nico, 2026-09-07: «se guarda como viene»).
     */
    if (p.monthlyRent != null) dto.monthlyRent = p.monthlyRent;
    if (p.salePrice != null) dto.salePrice = p.salePrice;
  } else {
    // No listingType hint at all — still forward whichever price the row
    // carries, never both, never a coerced 0.
    if (p.monthlyRent != null) dto.monthlyRent = p.monthlyRent;
    if (p.salePrice != null) dto.salePrice = p.salePrice;
  }

  if (p.adminFee != null) dto.adminFee = p.adminFee;
  if (p.consignedAt) dto.consignedAt = p.consignedAt;
  // El back valida `@Min(0) @Max(6)`: `estratoDePalabras` ya devuelve
  // `undefined` fuera de [1, 6], así que acá no hay nada que recortar.
  if (p.stratum != null) dto.stratum = p.stratum;

  /*
   * ── Las cinco columnas del archivo real que ya tienen dónde ir ───────────
   *
   * `ImportarInmuebleDto` del back las declara desde el 2026-09-08, con estos
   * nombres exactos. Los nombres importan más que de costumbre: el
   * `ValidationPipe` global corre con `forbidNonWhitelisted: true`, así que
   * una clave mal escrita no se ignora — devuelve 400 para el LOTE entero.
   *
   * Todas viajan CRUDAS. El estado («Activa», «Arrendada», «Inactiva») lo
   * traduce el back a su propio vocabulario y lo que no reconoce deja el
   * inmueble sin publicar; interpretarlo acá le quitaría al back la única
   * forma que tiene de decir qué palabra no entendió.
   */
  if (p.urbanizacion?.trim()) dto.urbanizacion = p.urbanizacion.trim();
  if (p.llavesEn?.trim()) dto.llavesEn = p.llavesEn.trim();
  if (p.creadaPor?.trim()) dto.creadaPor = p.creadaPor.trim();
  if (p.ownerPhone?.trim()) dto.propietarioTelefono = p.ownerPhone.trim();
  if (p.status?.trim()) dto.estadoOrigen = p.status.trim();

  // El propietario del archivo viaja al back para que el inmueble nazca
  // consignado (Nico, 2026-09-02: «que tome el que viene desde la
  // migración»). Vacío no viaja: el back no debe ver '' como un dato.
  if (p.ownerDocument?.trim()) dto.propietarioDocumento = p.ownerDocument.trim();
  if (p.ownerName?.trim()) dto.propietarioNombre = p.ownerName.trim();
  if (p.commissionPercent != null) dto.comisionPorcentaje = p.commissionPercent;

  /*
   * Varios dueños con su % (Nico, 2026-09-13). Sólo con dos o más: con uno,
   * los campos sueltos de arriba son todo lo que hay y el back sigue igual.
   * Los nombres de las claves son los de `PropietarioDelInmuebleDto`: con
   * `forbidNonWhitelisted` una clave de más es un 400 del lote entero.
   */
  const propietarios = propietariosDelInmueble(p.owners);
  if (propietarios) dto.propietarios = propietarios;

  return dto;
}

/**
 * Los dueños como los declara el back, con el % pasado a puntos básicos.
 *
 * Los porcentajes del archivo («33,33 / 33,33 / 33,34», o «60 / 40») se
 * convierten con `repartoEnBps` cuando suman 100 (tolerancia de una décima,
 * lo que pierde el redondeo a dos decimales): así 33,33 × 3 no queda en 9.999
 * sino en 10.000 exacto, que es lo que exige la base. Si suman otra cosa
 * («33 / 33 / 33»), se mandan tal cual (× 100) y es el BACK quien frena la
 * fila con `reparto`: no se corrige un archivo que dice 99.
 *
 * La plata por dueño viaja cruda (`canon`) y el back la reparte.
 */
export function propietariosDelInmueble(
  owners: DuenoDelArchivo[] | undefined,
): PropietarioDelInmuebleDto[] | undefined {
  if (!owners || owners.length < 2) return undefined;
  const porcentajes = owners.map((o) => o.porcentaje);
  const todosConPorcentaje = porcentajes.every((x): x is number => typeof x === 'number');
  const suma = todosConPorcentaje ? porcentajes.reduce((a, x) => a + x, 0) : NaN;
  const cuadran = todosConPorcentaje && Math.abs(suma - 100) <= 0.1 && porcentajes.every((x) => x > 0);
  const bps = cuadran ? repartoEnBps(porcentajes) : undefined;

  return owners.map((o, i) => {
    const dueño: PropietarioDelInmuebleDto = {};
    if (o.documento?.trim()) dueño.documento = o.documento.trim();
    if (o.nombre?.trim()) dueño.nombre = o.nombre.trim();
    if (o.telefono?.trim()) dueño.telefono = o.telefono.trim();
    if (o.correo?.trim()) dueño.correo = o.correo.trim();
    if (bps) dueño.participacionBps = bps[i];
    else if (typeof o.porcentaje === 'number') dueño.participacionBps = Math.round(o.porcentaje * 100);
    if (typeof o.canon === 'number') dueño.canon = o.canon;
    return dueño;
  });
}
