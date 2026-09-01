/**
 * Meses `YYYY-MM` para la vista de recaudo: el selector no deja pasar del
 * mes actual y los nombres salen en español, sin librerías.
 */

const NOMBRES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const FORMATO = /^\d{4}-(0[1-9]|1[0-2])$/;

export function esMesValido(month: string): boolean {
  return FORMATO.test(month);
}

/** El mes de hoy en Bogotá — el mismo criterio que el back. */
export function mesActual(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(ahora);
  const year = partes.find((p) => p.type === 'year')?.value;
  const month = partes.find((p) => p.type === 'month')?.value;
  return `${year}-${month}`;
}

export function sumarMeses(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** «septiembre de 2026». */
export function nombreDelMes(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${NOMBRES[m - 1]} de ${y}`;
}

/** «sep 26», para el eje del gráfico. */
export function mesCorto(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${NOMBRES[m - 1].slice(0, 3)} ${String(y).slice(2)}`;
}

/** Un mes es «futuro» si viene después del actual: ahí no hay nada que ver. */
export function esFuturo(month: string, hoy: string = mesActual()): boolean {
  return month > hoy;
}
