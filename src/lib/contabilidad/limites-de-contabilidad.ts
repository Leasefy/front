/**
 * Los topes de la contabilidad que una persona escribe, y sus frases
 * (02-10-2026). ESPEJO del back:
 *
 *  · `back/src/inmobiliaria/contabilidad/gastos/dto/limites-de-gastos.ts`
 *    (factura de proveedor y egreso);
 *  · `back/src/inmobiliaria/contabilidad/limites-de-contabilidad.ts` (tope de
 *    cuantías menores de la exógena, líneas de un asiento).
 *
 * Mismos números y MISMAS frases: lo que el back rechaza con un 400 en su
 * campo se ataja acá antes de enviar, con las mismas palabras. Si cambias algo
 * acá, cámbialo allá.
 *
 * Por qué esos números: las columnas de plata son `int4` (2.147.483.647) y un
 * cero de más llegaba a Postgres como un 500. $2.000.000.000 es una cifra que
 * se lee. La SUMA de los renglones de una factura también se mira: cada uno
 * puede pasar y el total reventar su columna.
 */

export const VALOR_MAXIMO_DEL_GASTO_COP = 2_000_000_000;
export const IVA_MAXIMO_PCT = 100;
export const MAX_LINEAS_POR_FACTURA = 500;

export const MENSAJES_DE_GASTOS = {
  baseMaxima:
    'La base de un renglón no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  ivaMaximo:
    'El IVA de un renglón no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  ivaPctMaximo: 'El IVA de un renglón no puede pasar del 100 %.',
  retefuenteMaxima:
    'La retención en la fuente no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  reteivaMaxima:
    'La retención de IVA no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  reteicaMaxima:
    'La retención de ICA no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  totalMaximo:
    'El total de la factura no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  sumaMaxima:
    'Los renglones suman más de $2.000.000.000 (subtotal más IVA). Revisa que no sobren ceros o registra la factura en dos.',
  valorDelEgresoMaximo:
    'El valor del egreso no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  demasiadasLineas: 'Una factura puede traer hasta 500 renglones.',
} as const;

export const TOPE_MAXIMO_DE_CUANTIAS_MENORES_COP = 2_000_000_000;
export const MAX_LINEAS_POR_ASIENTO = 5_000;

export const MENSAJES_DE_CONTABILIDAD = {
  topeDeCuantiasMaximo:
    'El tope de cuantías menores no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  topeDeCuantiasMinimo:
    'El tope va en pesos enteros y mayor que cero. Déjalo vacío para heredar el que Leasefy publicó para el año.',
  demasiadasLineas: 'Un asiento puede tener hasta 5.000 líneas.',
} as const;

/** ¿Pasa del tope de plata? (`null`/vacío no opina: de eso se encarga otra regla). */
export function pasaDelTope(valor: number | null | undefined, tope = VALOR_MAXIMO_DEL_GASTO_COP): boolean {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > tope;
}
