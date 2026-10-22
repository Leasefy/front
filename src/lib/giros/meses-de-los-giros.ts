/**
 * Los meses que se pueden elegir en «Giros a propietarios»: los MISMOS para los
 * cuatro pasos (ronda 19 de la revisora: «el mes se elige de tres maneras»).
 *
 * 🔴 PG-R18 (decisión de Nico, 03-10-2026): hasta el mes en curso + 3 —con la
 * base CAUSADO la liquidación de un mes futuro existe— y doce hacia atrás
 * (contando el corriente). Del más nuevo al más viejo.
 */
import { mesEnTitulo } from '@/lib/utils/mes';

export const MESES_HACIA_ATRAS = 12;
export const MESES_HACIA_ADELANTE = 3;

/** `2026-02` de una fecha. */
export function claveDelMes(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

export function mesesDeLosGiros(hoy: Date = new Date()): { value: string; label: string }[] {
  return Array.from({ length: MESES_HACIA_ATRAS + MESES_HACIA_ADELANTE }, (_, i) => {
    const value = claveDelMes(new Date(hoy.getFullYear(), hoy.getMonth() + MESES_HACIA_ADELANTE - i, 1));
    return { value, label: mesEnTitulo(value) };
  });
}

/** ¿Es un `AAAA-MM` que el selector ofrece? */
export function esMesDeLosGiros(mes: string | null | undefined, hoy: Date = new Date()): mes is string {
  return Boolean(mes) && mesesDeLosGiros(hoy).some((m) => m.value === mes);
}

/** La ruta de un paso con el mes que se está mirando (el mes viaja entre los pasos). */
export function conElMes(href: string, mes?: string): string {
  if (!mes) return href;
  return `${href}${href.includes('?') ? '&' : '?'}mes=${encodeURIComponent(mes)}`;
}
