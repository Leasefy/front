/**
 * Qué medios admite un recibo de caja. Puro.
 *
 * ── La regla, con las palabras de Nico (17-09) ──────────────────────────────
 *
 * «Efectivo: sólo transferencia y pasarela; no se recibe efectivo ni cheque
 * (queda apagado, sin cierre de caja).»
 *
 * Y es un PRESET de Portofino, no una regla del producto: una inmobiliaria de
 * pueblo que recibe efectivo tiene que poder prenderlo. Por eso el back guarda
 * la lista de los APAGADOS —no la de los prendidos—: un medio nuevo nace
 * prendido y quien no lo quiera lo apaga, en vez de nacer apagado para todas
 * las que ya configuraron la suya.
 *
 * ── 🔴 Falla ABIERTO ────────────────────────────────────────────────────────
 *
 * Si no se pudo leer la configuración, no se filtra nada. Apagar medios por un
 * fallo de red le impediría a una inmobiliaria recibir plata sin que nadie lo
 * haya decidido — y el back rechaza igual lo que de verdad está apagado, con
 * el motivo escrito. Cerrar acá sólo agrega una forma de romperse.
 */

import type { MedioDeRecibo } from '@/lib/api/finanzas.types';

/** Igual que `normalizarMedio` del back: mayúsculas, sin tildes ni espacios. */
export function normalizarMedio(medio: string): string {
  return medio
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s-]+/g, '_');
}

/** Los que se pueden ofrecer: todos menos los apagados. */
export function mediosQueSeOfrecen(medios: readonly MedioDeRecibo[]): MedioDeRecibo[] {
  return medios.filter((m) => m.habilitado);
}

/** ¿Este medio está apagado? Compara normalizado, en los dos lados. */
export function estaApagado(medio: string, apagados: readonly string[]): boolean {
  const normalizado = normalizarMedio(medio);
  return apagados.some((a) => normalizarMedio(a) === normalizado);
}

/**
 * Filtra una lista de opciones de medio por la configuración de la agencia.
 * `apagados` vacío = no se filtra nada (ver «falla abierto» arriba).
 */
export function sinLosApagados<T>(
  opciones: readonly T[],
  nombreDe: (opcion: T) => string,
  apagados: readonly string[],
): T[] {
  if (apagados.length === 0) return [...opciones];
  return opciones.filter((o) => !estaApagado(nombreDe(o), apagados));
}

/** Los medios que quedarían apagados al mover un interruptor. */
export function apagadosDespuesDe(
  apagados: readonly string[],
  medio: string,
  habilitado: boolean,
): string[] {
  const normalizado = normalizarMedio(medio);
  const sin = apagados.filter((a) => normalizarMedio(a) !== normalizado);
  return habilitado ? sin : [...sin, normalizado];
}

/** Cómo se lee una familia de medios en la pantalla de configuración. */
export const NOMBRE_DE_LA_FAMILIA: Record<string, string> = {
  TRANSFERENCIA: 'Transferencias',
  PASARELA: 'Pasarela de pago',
  CAJA: 'Caja física',
  OTRO: 'Otros',
};

/** Qué significa cada familia. Va debajo del grupo, no en un tooltip. */
export const QUE_ES_LA_FAMILIA: Record<string, string> = {
  TRANSFERENCIA: 'La plata llega a una cuenta de la inmobiliaria y queda rastro en el extracto.',
  PASARELA: 'El inquilino paga en línea. La pasarela cobra por el servicio: ese costo se configura en «Costos de la plata».',
  CAJA: 'Plata en mano. Apagados por defecto: sin efectivo no hay caja física que cuadrar, y no se construyó ningún arqueo.',
  OTRO: 'Medios que no entran en las otras familias.',
};
