/**
 * Los topes de la carga de inmuebles y sus frases, del lado del cliente
 * (02-10-2026).
 *
 * Espejo de `back/src/inmobiliaria/inmuebles-importacion/dto/limites-de-la-importacion.ts`:
 * los MISMOS números y las MISMAS frases, para atajar antes de mandar lo que
 * el back rechazaría con un 400. Si cambias algo acá, cámbialo allá.
 *
 * Sólo topa lo que ESCRIBE una persona (corregir una fila, poner un valor en
 * bloque). Lo que viene en el ARCHIVO no se topa al subir (C13: una celda rara
 * no puede tumbar la tanda): lo que no cabe se dice fila por fila al crear.
 */

/** $100.000.000 al mes: el tope de `CreatePropertyDto` y del presupuesto (Nico, 02-10-2026). */
export const CANON_MAXIMO_COP = 100_000_000;
/** El precio de venta, el mismo de `CreatePropertyDto`. */
export const PRECIO_DE_VENTA_MAXIMO_COP = 100_000_000_000;
/** 1.000.000 m² (100 hectáreas): la carga trae fincas. */
export const AREA_MAXIMA_M2 = 1_000_000;

const pesos = (n: number) => `$${n.toLocaleString('es-CO')}`;

export const MENSAJES_DE_LA_IMPORTACION = {
  canonMaximo: `El canon no puede pasar de ${pesos(CANON_MAXIMO_COP)} al mes. Revisa que no sobren ceros.`,
  canonMinimo: 'El canon debe ser mayor que cero. Si no lo sabes, déjalo vacío.',
  precioDeVentaMaximo: `El precio de venta no puede pasar de ${pesos(PRECIO_DE_VENTA_MAXIMO_COP)}. Revisa que no sobren ceros.`,
  precioDeVentaMinimo: 'El precio de venta debe ser mayor que cero.',
  areaMaxima: `El área no puede pasar de ${AREA_MAXIMA_M2.toLocaleString('es-CO')} m². Revisa que no sobren ceros.`,
  areaNegativa: 'El área no puede ser negativa.',
} as const;

/** Los números que una persona escribe en la carga y tienen tope. */
export type CampoConTope = 'monthlyRent' | 'salePrice' | 'area';

/**
 * El error de UN número escrito a mano, o `null` si está bien. Vacío
 * (`undefined`/`null`) siempre está bien: «no sé» es un estado válido.
 */
export function errorDelNumero(campo: CampoConTope, valor: number | null | undefined): string | null {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return null;
  const M = MENSAJES_DE_LA_IMPORTACION;
  switch (campo) {
    case 'monthlyRent':
      if (valor < 1) return M.canonMinimo;
      return valor > CANON_MAXIMO_COP ? M.canonMaximo : null;
    case 'salePrice':
      if (valor < 1) return M.precioDeVentaMinimo;
      return valor > PRECIO_DE_VENTA_MAXIMO_COP ? M.precioDeVentaMaximo : null;
    case 'area':
      if (valor < 0) return M.areaNegativa;
      return valor > AREA_MAXIMA_M2 ? M.areaMaxima : null;
  }
}
