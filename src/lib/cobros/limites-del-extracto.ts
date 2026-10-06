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

import { fraseDeLaPlata } from '@/lib/plata/con-centavos';

export const VALOR_MAXIMO_DEL_MOVIMIENTO_COP = 1_000_000_000_000;
export const MAX_FILAS_DEL_EXTRACTO = 20_000;
/**
 * 🔴 (02-10-2026, Fase 1) El tope de un SALDO del extracto (la columna «Saldo»,
 * el saldo inicial y el final): ±$1.000.000.000.000, el mismo del back.
 */
export const SALDO_MAXIMO_DEL_EXTRACTO_COP = 1_000_000_000_000;

export const MENSAJES_DEL_EXTRACTO = {
  valorMaximo:
    'El valor de un movimiento no puede pasar de $1.000.000.000.000. Revisa que no sobren ceros.',
  valorMinimo:
    'Una salida de plata no puede pasar de $1.000.000.000.000. Revisa que no sobren ceros.',
  filasMaximas:
    'Puedes cargar hasta 20.000 movimientos a la vez. Divide el extracto (por ejemplo, por mes).',
  saldoEntero: 'El saldo debe ser un número entero de pesos, sin decimales.',
  saldoFueraDeRango:
    'Un saldo no puede pasar de $1.000.000.000.000 (ni bajar de −$1.000.000.000.000). Revisa que no sobren ceros.',
} as const;

/**
 * Lo que la persona escribe en «Saldo inicial» / «Saldo final»: `undefined` si
 * lo dejó vacío, el número si se lee, o la frase del error. Acepta «$ 1.230.000»,
 * «-45.000» y «(45.000)», como el archivo.
 *
 * «Centavos en todo» (C3-FRONT): con la llave de la tesorería, `parsear` lee
 * los centavos tal cual y la frase de un saldo que no sirve es la de «hasta dos
 * decimales» (la del back con `@EsPlataDeLasAreas`); sin ella, la de siempre.
 */
export function leerSaldoEscrito(
  texto: string,
  parsear: (t: string) => number | null,
  { conCentavos = false }: { conCentavos?: boolean } = {},
): { valor?: number; error?: string } {
  if (!texto.trim()) return {};
  const n = parsear(texto);
  if (n === null) return { error: fraseDeLaPlata(MENSAJES_DEL_EXTRACTO.saldoEntero, conCentavos) };
  if (Math.abs(n) > SALDO_MAXIMO_DEL_EXTRACTO_COP) return { error: MENSAJES_DEL_EXTRACTO.saldoFueraDeRango };
  return { valor: n };
}

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
