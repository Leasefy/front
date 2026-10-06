/**
 * Los topes de la plata de nómina que una persona escribe, y sus frases
 * (02-10-2026). ESPEJO de `back/src/inmobiliaria/nomina/dto/limites-de-nomina.ts`:
 * mismos números y MISMAS frases. Lo que el back rechaza con un 400 en su campo
 * se ataja acá antes de enviar. Si cambias algo acá, cámbialo allá.
 *
 * · Los parámetros del año (salario mínimo, auxilio de transporte, UVT):
 *   $20.000.000, más de diez veces el más grande.
 * · El salario y las deducciones del MES de una persona: $200.000.000 (con el
 *   techo general el devengado del mes reventaba su columna al liquidar).
 * · Los pagos sueltos (una prestación): $2.000.000.000.
 */

export const PARAMETRO_MAXIMO_DE_NOMINA_COP = 20_000_000;
export const SALARIO_MAXIMO_DEL_MES_COP = 200_000_000;
export const PAGO_MAXIMO_DE_NOMINA_COP = 2_000_000_000;

export const MENSAJES_DE_NOMINA = {
  salarioMinimoMaximo:
    'El salario mínimo no puede pasar de $20.000.000. Revisa que no sobren ceros.',
  auxilioMaximo:
    'El auxilio de transporte no puede pasar de $20.000.000. Revisa que no sobren ceros.',
  uvtMaxima: 'La UVT no puede pasar de $20.000.000. Revisa que no sobren ceros.',
  salarioMaximo:
    'El salario no puede pasar de $200.000.000 al mes. Revisa que no sobren ceros.',
  valorDelPagoMaximo:
    'El valor pagado no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
} as const;

/** Los topes de las tres cifras del Estado, por el nombre del campo del DTO. */
export const TOPE_DE_LAS_CIFRAS_DEL_ESTADO = {
  salarioMinimoCop: MENSAJES_DE_NOMINA.salarioMinimoMaximo,
  auxilioTransporteCop: MENSAJES_DE_NOMINA.auxilioMaximo,
  uvtCop: MENSAJES_DE_NOMINA.uvtMaxima,
} as const;

/** El texto de un campo numérico como número; `null` si está vacío o no es número. */
export function comoNumero(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

/** ¿Pasa del tope? Vacío no opina. */
export function pasaDe(texto: string, tope: number): boolean {
  const n = comoNumero(texto);
  return n !== null && n > tope;
}
