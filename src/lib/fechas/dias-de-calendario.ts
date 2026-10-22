/**
 * Cuántos días de CALENDARIO pasaron desde una fecha (QA en Chrome, 21-10-2026:
 * la tarjeta de una reparación recién reportada decía «Hace 1 día» porque se
 * redondeaba hacia arriba el tiempo transcurrido; a las 11 p. m. todo lo de ese
 * día ya contaba como de ayer). Hoy = 0, ayer = 1, en el día de quien mira.
 * Puro; una fecha que no se lee cuenta como hoy.
 */
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export function diasDeCalendarioDesde(fecha: string | Date, ahora: Date = new Date()): number {
  const desde = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(desde.getTime())) return 0;
  const inicioDelDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.max(0, Math.round((inicioDelDia(ahora) - inicioDelDia(desde)) / MS_POR_DIA));
}
