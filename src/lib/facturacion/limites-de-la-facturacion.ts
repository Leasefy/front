/**
 * Los topes de lo que una persona escribe en la facturación electrónica
 * (02-10-2026).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/facturacion/dto/limites-de-la-facturacion.ts`:
 * MISMOS números, MISMAS frases. Si cambias uno, cambia el otro.
 *
 *  · el valor y el IVA de una nota crédito parcial o de una nota débito
 *    (`CorregirFactura`): `int4` en la base, $2.000.000.000 en el DTO;
 *  · los números y las fechas de la resolución de la DIAN
 *    (`CajonDeLaResolucion`, vía `erroresDeLaResolucion`): el rango hasta
 *    1.000.000.000 y las fechas entre el año 2000 y el 2100.
 */

export const VALOR_MAXIMO_DE_LA_NOTA_COP = 2_000_000_000
export const NUMERO_MAXIMO_DE_LA_RESOLUCION = 1_000_000_000
export const FECHA_DE_FACTURACION_DESDE = '2000-01-01'
export const FECHA_DE_FACTURACION_HASTA = '2100-12-31'

export const MENSAJES_DE_LA_FACTURACION = {
  valorDeLaNotaMaximo:
    'El valor de la nota no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  ivaDeLaNotaMaximo:
    'El IVA de la nota no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  desdeMaximo:
    'El número inicial del rango no puede pasar de 1.000.000.000. Revisa que no sobren ceros.',
  hastaMaximo:
    'El número final del rango no puede pasar de 1.000.000.000. Revisa que no sobren ceros.',
  ultimoNumeroUsadoMaximo:
    'El último número usado no puede pasar de 1.000.000.000. Revisa que no sobren ceros.',
  fechaDeLaResolucionFueraDeRango: 'La fecha de la resolución debe estar entre el año 2000 y el 2100.',
  vigenteDesdeFueraDeRango: 'El inicio de la vigencia debe estar entre el año 2000 y el 2100.',
  vigenteHastaFueraDeRango: 'El fin de la vigencia debe estar entre el año 2000 y el 2100.',
} as const

/**
 * ¿La fecha `AAAA-MM-DD` cae entre el año 2000 y el 2100? Comparación de
 * texto: ordena igual que la fecha y no construye un `Date`, que en Bogotá
 * (UTC−5) se corre un día. Vacía = no opina (lo vacío lo frena el botón).
 */
export function fechaDeFacturacionEnRango(fecha: string): boolean {
  const f = fecha.trim()
  if (!f) return true
  return f >= FECHA_DE_FACTURACION_DESDE && f <= FECHA_DE_FACTURACION_HASTA
}
