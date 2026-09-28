/**
 * T-0109 contract.md §3.2/§3.3 — cómo leer el pagaré y sus codeudores desde
 * la UI, sin repetir la lógica en cada pantalla. Pura, sin componentes.
 */
import { ApiError } from '@/lib/api/client';
import type { EstadoDelFirmanteDelPagare, EstadoDelPagare } from '@/lib/api/pagare.types';

/** ¿Este fallo significa "el back todavía no tiene WU-4"? Sólo un 404. */
export function esPagareNoDisponible(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

export interface EstadoDelPagareUI {
  etiqueta: string;
  tono: 'success' | 'warning' | 'danger' | 'neutral';
}

const ETIQUETAS_PAGARE: Record<EstadoDelPagare, EstadoDelPagareUI> = {
  CREANDO: { etiqueta: 'Creando…', tono: 'warning' },
  PENDIENTE_DE_FIRMA: { etiqueta: 'Pendiente de firma', tono: 'warning' },
  FIRMADO: { etiqueta: 'Firmado', tono: 'success' },
  RECHAZADO: { etiqueta: 'Rechazado', tono: 'danger' },
  VENCIDO: { etiqueta: 'Vencido', tono: 'danger' },
  CANCELADO: { etiqueta: 'Cancelado', tono: 'neutral' },
  ERROR_AL_CREAR: { etiqueta: 'No se pudo crear', tono: 'danger' },
};

/** Unknown value (future enum) → neutral label, never a throwing switch (contract.md §3.2). */
export function describirEstadoDelPagare(estado: EstadoDelPagare): EstadoDelPagareUI {
  return ETIQUETAS_PAGARE[estado] ?? { etiqueta: 'Desconocido', tono: 'neutral' };
}

const ETIQUETAS_FIRMANTE: Record<EstadoDelFirmanteDelPagare, EstadoDelPagareUI> = {
  PENDIENTE: { etiqueta: 'Pendiente', tono: 'warning' },
  FIRMADO: { etiqueta: 'Firmó', tono: 'success' },
  RECHAZADO: { etiqueta: 'Rechazó', tono: 'danger' },
  VENCIDO: { etiqueta: 'Vencido', tono: 'danger' },
};

export function describirEstadoDelFirmante(estado: EstadoDelFirmanteDelPagare): EstadoDelPagareUI {
  return ETIQUETAS_FIRMANTE[estado] ?? { etiqueta: 'Desconocido', tono: 'neutral' };
}

/**
 * Un pagaré "vivo" bloquea E6 (uno nuevo) y las ediciones de codeudores
 * (contract.md §3.3 `PAGARE_EN_CURSO` / `PAGARE_YA_FIRMADO`).
 */
export function pagareEstaVivo(estado: EstadoDelPagare | null | undefined): boolean {
  return estado === 'CREANDO' || estado === 'PENDIENTE_DE_FIRMA';
}

/** Se puede pedir un pagaré nuevo: no hay uno vivo y el último (si existe) no está FIRMADO. */
export function puedeEmitirNuevoPagare(estado: EstadoDelPagare | null | undefined): boolean {
  return !pagareEstaVivo(estado) && estado !== 'FIRMADO';
}
