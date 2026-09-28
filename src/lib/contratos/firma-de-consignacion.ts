/**
 * T-0109 contract.md §3.2/§3.3 — cómo leer la firma electrónica de la
 * consignación desde la UI, sin repetir la lógica en cada pantalla:
 *
 *   · `esFirmaDeConsignacionNoDisponible` — un 404 en C2 (back anterior a
 *     WU-3) es degradación esperada: la sección entera se oculta, nunca un
 *     error en pantalla (contract.md §3.2, última fila).
 *   · `describirEstadoDelProceso` — la etiqueta y el tono del estado.
 *   · `puedeIniciarOtroProceso` — sólo cuando no hay uno PENDIENTE.
 *
 * Pura, sin componentes — se prueba sin montar nada, igual que
 * `estado-del-sello.ts` y `otp-errors.ts`.
 */
import { ApiError } from '@/lib/api/client';
import type { EstadoDeFirmaDeConsignacion, ProcesoDeFirmaResponse } from '@/lib/api/consignacion-firma.types';

/**
 * ¿Este fallo significa "el back todavía no tiene WU-3"? Sólo un 404 cuenta
 * — cualquier otro status (403, 409, 500) es un fallo real que la pantalla
 * tiene que mostrar, no una sección que se apaga sola.
 */
export function esFirmaDeConsignacionNoDisponible(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

export interface EstadoDelProcesoDeFirma {
  etiqueta: string;
  tono: 'success' | 'warning' | 'danger' | 'neutral';
}

const ETIQUETAS: Record<EstadoDeFirmaDeConsignacion, EstadoDelProcesoDeFirma> = {
  PENDIENTE: { etiqueta: 'En proceso de firma', tono: 'warning' },
  FIRMADO: { etiqueta: 'Firmado', tono: 'success' },
  CANCELADO: { etiqueta: 'Cancelado', tono: 'neutral' },
};

/** Unknown value (future enum) → neutral label, never a throwing switch (contract.md §3.2). */
export function describirEstadoDelProceso(estado: EstadoDeFirmaDeConsignacion): EstadoDelProcesoDeFirma {
  return ETIQUETAS[estado] ?? { etiqueta: 'Desconocido', tono: 'neutral' };
}

/** Un proceso nuevo (C1) sólo se puede iniciar cuando no hay uno PENDIENTE. */
export function puedeIniciarOtroProceso(proceso: ProcesoDeFirmaResponse | null): boolean {
  return proceso === null || proceso.estado !== 'PENDIENTE';
}

/** Cuenta de propietarios que ya firmaron, sobre el total (sin el representante). */
export function progresoDePropietarios(proceso: ProcesoDeFirmaResponse): { firmados: number; total: number } {
  const propietarios = proceso.firmantes.filter((f) => f.tipo === 'PROPIETARIO');
  return { firmados: propietarios.filter((f) => f.firmado).length, total: propietarios.length };
}
