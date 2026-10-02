/**
 * Los topes del extracto bancario (02-10-2026).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/conciliacion-bancaria/dto/limites-del-extracto.ts`:
 * mismos números, mismas frases.
 *
 * · El valor de cada línea va a `movimientos_bancarios.valor_cop` (con signo:
 *   una salida es negativa). Desde el 02-10 (tarde) Nico eligió «columna más
 *   grande»: un movimiento real puede pasar de $2.000.000.000 y viaja. Lo que
 *   pasa de ±$1.000.000.000.000 (ceros de más, un saldo leído como valor) se
 *   DESCARTA al leer el archivo, con esta frase en la vista previa: no viaja, y
 *   el resto del extracto se carga igual.
 *   Mientras la migración de la columna no esté aplicada, el BACK descarta la
 *   línea de más de $2.000.000.000 y lo dice en `avisos` (el navegador no
 *   sabe si la migración está); el resultado lo cuenta en
 *   `descartadasPorValor`.
 * · Un archivo de más de 20.000 líneas no se manda: se dice antes cómo
 *   dividirlo.
 */

export const VALOR_MAXIMO_DEL_MOVIMIENTO_COP = 1_000_000_000_000;
export const MAX_FILAS_DEL_EXTRACTO = 20_000;

export const MENSAJES_DEL_EXTRACTO = {
  valorMaximo:
    'El valor de un movimiento no puede pasar de $1.000.000.000.000. Revisa que no sobren ceros.',
  valorMinimo:
    'Una salida de plata no puede pasar de $1.000.000.000.000. Revisa que no sobren ceros.',
  filasMaximas:
    'Puedes cargar hasta 20.000 movimientos a la vez. Divide el extracto (por ejemplo, por mes).',
} as const;

/** La frase del tope si el valor de la línea no cabe; `null` si cabe. */
export function errorDelValorDelMovimiento(valorCop: number): string | null {
  if (valorCop > VALOR_MAXIMO_DEL_MOVIMIENTO_COP) return MENSAJES_DEL_EXTRACTO.valorMaximo;
  if (valorCop < -VALOR_MAXIMO_DEL_MOVIMIENTO_COP) return MENSAJES_DEL_EXTRACTO.valorMinimo;
  return null;
}

/** La frase del tope si el extracto trae demasiadas líneas; `null` si no. */
export function errorDeLasFilasDelExtracto(cuantas: number): string | null {
  return cuantas > MAX_FILAS_DEL_EXTRACTO ? MENSAJES_DEL_EXTRACTO.filasMaximas : null;
}
