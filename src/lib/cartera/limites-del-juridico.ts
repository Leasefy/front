/**
 * Los topes de lo pactado en el cobro jurídico (02-10-2026).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/juridico/limites-del-juridico.ts`:
 * mismos números, mismas frases. `CobroJuridico` los usa antes de guardar el
 * tope y el porcentaje de los honorarios: lo que el back rechaza se ataja
 * acá, debajo del campo, y no viaja.
 */

export const HONORARIOS_TOPE_MAXIMO_COP = 2_000_000_000;
export const HONORARIOS_PCT_MAXIMO = 100;
/** Los textos del abogado, contra sus columnas (`abogados.nombre`, `.documento`). */
export const MAX_LARGO_DEL_NOMBRE_DEL_ABOGADO = 200;
export const MAX_LARGO_DEL_DOCUMENTO_DEL_ABOGADO = 40;

export const MENSAJES_DEL_JURIDICO = {
  topeEntero: 'El tope de los honorarios debe ser un número entero de pesos, sin decimales.',
  topePositivo: 'El tope de los honorarios debe ser mayor que cero.',
  topeMaximo:
    'El tope de los honorarios no puede pasar de $\u00a02.000.000.000. Revisa que no sobren ceros.',
  porcentajeNumero: 'El porcentaje de los honorarios debe ser un número.',
  porcentajeMinimo: 'El porcentaje de los honorarios debe ser mayor que cero.',
  porcentajeMaximo: 'El porcentaje de los honorarios no puede pasar de 100 %.',
} as const;

/**
 * El tope escrito, leído como pesos: «3.000.000» y «$ 3.000.000» son lo mismo.
 * Vacío = `null` (no se guarda nada).
 */
export function leerTopeDeHonorarios(texto: string): number | null {
  const digitos = texto.replace(/\D/g, '');
  return digitos ? Number(digitos) : null;
}

/** El error del tope, o `null`. Vacío no opina: no se guarda nada. */
export function errorDelTopeDeHonorarios(texto: string): string | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  const tope = leerTopeDeHonorarios(limpio);
  if (tope === null) return MENSAJES_DEL_JURIDICO.topeEntero;
  if (tope < 1) return MENSAJES_DEL_JURIDICO.topePositivo;
  if (tope > HONORARIOS_TOPE_MAXIMO_COP) return MENSAJES_DEL_JURIDICO.topeMaximo;
  return null;
}

/** El porcentaje escrito («10», «12,5»), o `null` si no es un número. */
export function leerPorcentajeDeHonorarios(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return null;
  const pct = Number(limpio);
  return Number.isFinite(pct) ? pct : null;
}

/** El error del porcentaje, o `null`. */
export function errorDelPorcentajeDeHonorarios(texto: string): string | null {
  if (!texto.trim()) return null;
  const pct = leerPorcentajeDeHonorarios(texto);
  if (pct === null) return MENSAJES_DEL_JURIDICO.porcentajeNumero;
  if (pct <= 0) return MENSAJES_DEL_JURIDICO.porcentajeMinimo;
  if (pct > HONORARIOS_PCT_MAXIMO) return MENSAJES_DEL_JURIDICO.porcentajeMaximo;
  return null;
}
