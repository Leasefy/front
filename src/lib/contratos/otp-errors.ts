/**
 * T-0109 contract.md §3.3 — cómo leer los códigos NUEVOS del error contract
 * de OTP/firma. El `message` del back ya es español autosuficiente
 * (contract.md §3.0), así que estas funciones NO reemplazan el mensaje:
 * sólo extraen lo estructurado (`details`) que el mensaje no dice —
 * `intentosRestantes`, `segundos` de cooldown, `channels` por canal — y
 * deciden cuándo el flujo de OTP tiene que reiniciarse (token consumido o
 * faltante) en vez de sólo mostrar un toast.
 *
 * Viven fuera de `OTPVerification.tsx`/`SignatureForm.tsx` a propósito: son
 * funciones puras sobre `ApiError`, se prueban sin montar nada.
 */
import { ApiError } from '@/lib/api/client';
import type { OtpChannelResult } from '@/lib/api/contracts.types';

export interface DescripcionDeErrorOtp {
  /** El mensaje del back, tal cual — ya es español autosuficiente. */
  mensaje: string;
  /** CODIGO_INCORRECTO — cuántos intentos quedan antes del bloqueo. */
  intentosRestantes?: number;
  /** CODIGO_EN_ESPERA (429) — cooldown de reenvío que el back ya está contando. */
  segundosDeEspera?: number;
  /** CODIGO_NO_ENTREGADO — detalle por canal para explicar por qué no llegó. */
  channels?: OtpChannelResult[];
}

function numero(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function channelsDe(v: unknown): OtpChannelResult[] | undefined {
  return Array.isArray(v) ? (v as OtpChannelResult[]) : undefined;
}

/**
 * El motivo del fallo, con lo estructurado que cada código trae en
 * `details` (contract.md §3.3). Total: cualquier error (incluso uno que no
 * es `ApiError`) devuelve al menos un `mensaje` — nunca revienta.
 */
export function describirErrorDeOtp(err: unknown): DescripcionDeErrorOtp {
  if (!(err instanceof ApiError)) {
    return { mensaje: err instanceof Error ? err.message : 'No se pudo completar la verificación.' };
  }
  const detalle = err.detalle ?? {};
  return {
    mensaje: err.message,
    intentosRestantes: numero(detalle.intentosRestantes),
    segundosDeEspera: numero(detalle.segundos),
    channels: channelsDe(detalle.channels),
  };
}

/** Códigos que dejan el `otpVerificationToken` inservible: hay que pedir uno nuevo. */
const CODIGOS_QUE_REINICIAN = new Set(['TOKEN_DE_FIRMA_INVALIDO', 'CODIGO_DE_FIRMA_REQUERIDO']);

/**
 * ¿Este fallo dejó el token de verificación inútil (vencido, consumido, o
 * nunca llegó a mandarse)? El caller (`SignatureForm`) debe limpiar el
 * token guardado y volver a abrir el modal de OTP — reintentar con el MISMO
 * token repetiría el mismo 400 en bucle.
 */
export function debeReiniciarOtp(err: unknown): boolean {
  return err instanceof ApiError && !!err.code && CODIGOS_QUE_REINICIAN.has(err.code);
}
