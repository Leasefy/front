/**
 * Tasas que se midieron vs. tasas que nadie midió.
 *
 * ── Por qué existe este archivo ─────────────────────────────────────────────
 *
 * Una inmobiliaria recién abierta no tiene un cobro, ni un lead, ni un
 * inmueble. Todo el panel calculaba igual —`a / b`— con el `: 0` de rigor
 * cuando `b` era cero, y pintaba «0.0% · Bajo ↘». Son tres afirmaciones
 * falsas seguidas: que se midió algo, que dio bajo, y que viene bajando.
 * Nadie recaudó mal: no hubo nada que recaudar.
 *
 * La respuesta correcta ya vivía en Conciliación, que trae del back
 * `tasa_conciliacion: number | null` (null cuando no hay movimientos) y pinta
 * una raya. Acá está ese mismo criterio, para el resto del panel.
 *
 * `null` significa «no se midió» y tiene que VIAJAR hasta la vista: quien lo
 * recibe no pinta el número, y tampoco la etiqueta cualitativa ni la flecha
 * de tendencia que se derivan de él. Un 0 no se distingue de un cero medido;
 * un null sí.
 */

/** Lo que se pinta cuando no hubo nada que medir. Igual que Conciliación. */
export const SIN_MEDIR = '—';

/**
 * El porcentaje `numerador / denominador`, o `null` si no hubo denominador.
 *
 * Devuelve 0–100 sin redondear: cada pantalla decide cuántos decimales muestra.
 */
export function tasaMedida(numerador: number, denominador: number): number | null {
  if (!Number.isFinite(numerador) || !Number.isFinite(denominador)) return null;
  if (denominador === 0) return null;
  return (numerador / denominador) * 100;
}

/**
 * El promedio de una lista, o `null` si la lista está vacía.
 *
 * Mismo problema que la tasa: «0 días para cerrar» con cero cierres suena a
 * una inmobiliaria instantánea, no a una que todavía no cerró nada.
 */
export function promedioMedido(valores: readonly number[]): number | null {
  const finitos = valores.filter((v) => Number.isFinite(v));
  if (finitos.length === 0) return null;
  return finitos.reduce((suma, v) => suma + v, 0) / finitos.length;
}

/**
 * Pinta una tasa ya medida. `null` → raya, nunca «0%».
 *
 * `decimales` acompaña al `toFixed` que cada pantalla ya usaba (1 en Cobros,
 * 0 en Pipeline) para no cambiar de paso cómo se ven los números que SÍ se
 * midieron.
 */
export function textoDeTasa(tasa: number | null, decimales = 1): string {
  if (tasa === null || !Number.isFinite(tasa)) return SIN_MEDIR;
  return `${tasa.toFixed(decimales)}%`;
}

/**
 * El ancho de una barra de progreso para una tasa. Sin medición, cero ancho:
 * una barra vacía no afirma nada, y es lo único honesto que puede dibujar.
 */
export function anchoDeBarra(tasa: number | null): string {
  if (tasa === null || !Number.isFinite(tasa)) return '0%';
  return `${Math.min(Math.max(tasa, 0), 100)}%`;
}
