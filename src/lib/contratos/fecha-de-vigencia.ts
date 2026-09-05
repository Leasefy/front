/**
 * Las fechas de vigencia de un contrato son DÍAS, no instantes.
 *
 * El back las manda como `2026-05-01`, y `new Date('2026-05-01')` las lee como
 * medianoche UTC — que en Bogotá (UTC-5) es el 30 de abril a las 19:00. Sin
 * esto, TODA la columna «Vigencia» se corre un día: un contrato que arranca el
 * 1 de mayo se muestra «30 de abril», y el que vence el 30 de abril dice «29».
 * Se vio en los diez contratos de una agencia real a la vez.
 *
 * Por eso el día se arma con los tres números en el calendario local, sin dejar
 * que el navegador convierta zonas. Un ISO con hora (`…T15:00:00Z`) sí es un
 * instante: ahí la conversión corresponde y se hace como siempre.
 *
 * Vive en `lib` y no en la página porque una página del App Router no puede
 * exportar cualquier cosa sin romper el tipo generado — y sin exportarlo no hay
 * forma honesta de probarlo.
 */

const SOLO_DIA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** El texto que se muestra cuando no hay fecha. */
export const SIN_FECHA = '—';

/**
 * Convierte lo que manda el back en una fecha para mostrar.
 * Devuelve `null` si no hay nada que mostrar.
 */
export function fechaDeVigencia(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const dia = SOLO_DIA.exec(iso);
  if (dia) {
    return new Date(Number(dia[1]), Number(dia[2]) - 1, Number(dia[3]));
  }
  const instante = new Date(iso);
  return Number.isNaN(instante.getTime()) ? null : instante;
}

/** Formatea la vigencia para la lista de contratos. */
export function formatearVigencia(iso: string | null | undefined, locale: string): string {
  const fecha = fechaDeVigencia(iso);
  if (!fecha) return iso ? iso : SIN_FECHA;
  return fecha.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
