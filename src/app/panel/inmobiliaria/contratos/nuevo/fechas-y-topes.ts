/**
 * Las fechas y los topes del formulario de contrato nuevo.
 *
 * En su propio archivo —y no adentro de `page.tsx`— por la misma razón que
 * `[id]/format.ts` y `iso-to-input-date.ts`: son reglas puras, se pueden
 * probar sin montar una pantalla de 900 líneas, y los dos defectos que
 * cierran (C21 y C22 de la auditoría del 2026-09-13) son exactamente el tipo
 * de cosa que sólo se ve con un test.
 */

/**
 * Hoy, en la fecha de QUIEN ESTÁ MIRANDO — no en UTC.
 *
 * 🔴 C21 (auditoría 2026-09-13): esto era `new Date().toISOString()`, y en
 * Bogotá (UTC−5) a partir de las 19:00 el día de UTC ya es el siguiente. El
 * formulario de un contrato nuevo se abría, cada tarde, con la fecha de inicio
 * en MAÑANA — y un contrato que arranca un día después cobra un día menos.
 * Mismo criterio que `fechaLocal` en el resto del panel: una fecha de
 * calendario se lee en el calendario de la persona.
 */
export function todayISO(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/** Un año después de `from` (`YYYY-MM-DD`), sin pasar por UTC por lo mismo. */
export function oneYearAheadISO(from: string): string {
  const [anio, mes, dia] = from.split('-').map(Number);
  if (!anio || !mes || !dia) return from;
  const d = new Date(anio + 1, mes - 1, dia);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dd}`;
}

/**
 * Tope del canon mensual. Por debajo del límite de `int4` (2.147.483.647), que
 * es el tipo de `contracts.monthly_rent` en el back.
 */
export const CANON_MAXIMO_COP = 1_000_000_000;
/** Cuánto se acepta retrofechar un contrato, y cuánto adelantarlo. */
export const ANIOS_HACIA_ATRAS = 5;
export const ANIOS_HACIA_ADELANTE = 2;

export function hace(anios: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anios);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dd}`;
}

export function dentroDe(anios: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + anios);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dd}`;
}
