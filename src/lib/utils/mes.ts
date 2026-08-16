/**
 * mes — mostrar un 'YYYY-MM' sin que el huso lo corra un mes.
 *
 * ── El defecto ──────────────────────────────────────────────────────────────
 *
 * `new Date('2026-08-01')` NO es «el primero de agosto»: es medianoche UTC del
 * primero de agosto. Al pintarlo con `toLocaleDateString` se convierte a la
 * hora local, y en Colombia (UTC-5) eso son las 19:00 del **31 de julio**.
 *
 * El panel de dispersiones lo hacía en cinco lugares: el título decía «julio de
 * 2026» sobre los datos de agosto, y cada fila de la tabla repetía la mentira.
 * Un mes es una etiqueta, no un instante — y para leer una etiqueta no hace
 * falta pasar por ningún huso.
 *
 * Es el mismo defecto que ya nos costó una fecha de contrato corrida un día.
 */

/** Un mes en formato 'YYYY-MM'. */
export type Mes = string;

/**
 * Convierte 'YYYY-MM' a una fecha LOCAL del día 1, sin cruzar husos.
 *
 * Devuelve `null` si el string no tiene la forma esperada: inventar el mes
 * actual escondería un dato corrupto detrás de algo plausible.
 */
export function fechaLocalDelMes(mes: Mes): Date | null {
  const partes = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!partes) return null;
  const anio = Number(partes[1]);
  const numeroDeMes = Number(partes[2]);
  if (numeroDeMes < 1 || numeroDeMes > 12) return null;
  // El constructor de tres argumentos crea la fecha en hora LOCAL.
  return new Date(anio, numeroDeMes - 1, 1);
}

/**
 * El nombre del mes, para mostrar.
 *
 * @param formato 'long' → «agosto de 2026» · 'short' → «ago 2026»
 */
export function nombreDelMes(
  mes: Mes,
  locale: 'es' | 'en' = 'es',
  formato: 'long' | 'short' = 'long',
): string {
  const fecha = fechaLocalDelMes(mes);
  // Sin fecha válida se devuelve el string crudo: es más honesto que una
  // fecha inventada, y quien lo vea sabe que algo llegó mal.
  if (!fecha) return mes;
  return fecha.toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
    month: formato,
    year: 'numeric',
  });
}
