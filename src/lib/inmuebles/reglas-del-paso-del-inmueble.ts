/**
 * Qué exige el paso «Propiedad» de «Nueva consignación» (QA 04-10, IN-16).
 *
 * Exigía barrio, habitaciones, baños, área y una descripción de 20 letras para
 * CUALQUIER tipo: un Lote o una Bodega pedían habitaciones y baños, y «Editar
 * inmueble» ya dejaba la descripción opcional. Coherente con «Datos de
 * inmueble que pueden faltar»: sólo tipo, título, dirección, ciudad y canon
 * (o precio, si es venta) son obligatorios. Lo demás, si se escribe, se revisa
 * con los mismos topes del back (`topesDelPasoDelInmueble`); si no, viaja
 * vacío (`null`), que es lo que de verdad se sabe — nunca un 1 o un 10 de
 * relleno.
 */

/** Tipos que no tienen habitaciones ni baños que contar. */
export const TIPOS_SIN_HABITACIONES = ['commercial', 'office', 'warehouse', 'land', 'parking'] as const;

/** ¿El tipo lleva habitaciones y baños? Sin tipo elegido todavía, se muestran. */
export function llevaHabitaciones(tipo: string | null | undefined): boolean {
  if (!tipo) return true;
  return !(TIPOS_SIN_HABITACIONES as readonly string[]).includes(tipo);
}

export const DESCRIPCION_MINIMA = 20;
export const DESCRIPCION_MAXIMA = 5000;

/** La descripción es opcional; si se escribe, entre 20 y 5.000 caracteres (como en «Editar»). */
export function descripcionValida(descripcion: string | null | undefined): boolean {
  const largo = (descripcion ?? '').trim().length;
  return largo === 0 || (largo >= DESCRIPCION_MINIMA && largo <= DESCRIPCION_MAXIMA);
}

export interface DatosDelPasoDelInmueble {
  propertyType?: string | null;
  propertyTitle?: string | null;
  propertyAddress?: string | null;
  propertyCity?: string | null;
  listingType?: 'rent' | 'sale';
  monthlyRent?: number | null;
  salePrice?: number | null;
  propertyDescription?: string | null;
}

/** Lo obligatorio está y la descripción, si la hay, cumple. Los topes numéricos van aparte. */
export function pasoDelInmuebleCompleto(d: DatosDelPasoDelInmueble): boolean {
  const deVenta = d.listingType === 'sale';
  const precio = deVenta ? d.salePrice : d.monthlyRent;
  return Boolean(
    d.propertyType &&
      d.propertyTitle?.trim() &&
      d.propertyAddress?.trim() &&
      d.propertyCity?.trim() &&
      precio != null &&
      precio > 0 &&
      descripcionValida(d.propertyDescription),
  );
}

/** Lo que viaja al crear: lo que no aplica o no se escribió va `null` / ausente. */
export function datosOpcionalesParaCrear(d: {
  propertyType?: string | null;
  propertyZone?: string | null;
  propertyDescription?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
}): {
  neighborhood: string | null;
  description?: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
} {
  const conHabitaciones = llevaHabitaciones(d.propertyType);
  const descripcion = (d.propertyDescription ?? '').trim();
  const barrio = (d.propertyZone ?? '').trim();
  return {
    neighborhood: barrio || null,
    ...(descripcion ? { description: descripcion } : {}),
    bedrooms: conHabitaciones ? (d.bedrooms ?? null) : null,
    bathrooms: conHabitaciones ? (d.bathrooms ?? null) : null,
    area: d.area ?? null,
  };
}
