/**
 * Mock del segundo factor, SÓLO para desarrollo y staging.
 *
 * Inscribe un factor TOTP real en Supabase (las mismas llamadas de siempre),
 * pero en vez de mostrar el QR guarda el `secret` en `localStorage` y calcula
 * el código vigente con él. Al pedir el código, escribir `123456` hace que se
 * envíe el código real calculado con el secreto guardado de ESE factor. Back
 * y Supabase no se enteran: el `aal2` sale de un TOTP verdadero.
 *
 * 🔴 Nunca en producción. Todo pasa por `mockDeSegundoFactorHabilitado()`
 * (`lib/config/entorno.ts`), que falla cerrado.
 */

import { decodeAccessToken } from '@/lib/auth/jwt';
import { crearFactorTotp, type FactorPorVerificar } from '@/lib/auth/inscripcion-del-segundo-factor';
import { codigoTotp } from '@/lib/auth/totp';
import { mockDeSegundoFactorHabilitado } from '@/lib/config/entorno';

/** El código que se escribe para pedir «el real, calculado por el mock». */
export const CODIGO_DEL_MOCK = '123456';

export const MENSAJE_SIN_SECRETO_DEL_MOCK =
  'Este factor no se registró con el mock en este navegador. Escribe el código de tu app de autenticación.';

export const ETIQUETA_DEL_MOCK = 'Mock';

export function clavePorFactor(userId: string, factorId: string): string {
  return `leasefy:mfa-mock:${userId}:${factorId}`;
}

export function guardarSecretoDelMock(userId: string, factorId: string, secreto: string): void {
  try {
    window.localStorage.setItem(clavePorFactor(userId, factorId), secreto);
  } catch {
    // Sin almacenamiento no hay mock para ese factor; el flujo real sigue intacto.
  }
}

export function leerSecretoDelMock(userId: string | null, factorId: string): string | null {
  if (!userId) return null;
  try {
    return window.localStorage.getItem(clavePorFactor(userId, factorId));
  } catch {
    return null;
  }
}

/** El id del usuario (`sub`) del access token propio. */
export function userIdDelToken(token: string | null | undefined): string | null {
  return decodeAccessToken(token)?.sub ?? null;
}

export type CodigoResuelto =
  | { ok: true; codigo: string; sustituido: boolean }
  | { ok: false; mensaje: string };

/**
 * Lo que hay que mandar a Supabase para el código que escribió la persona.
 * Con el mock apagado o con cualquier código que no sea `123456`, es el mismo.
 */
export async function resolverCodigoDelMock({
  codigo,
  userId,
  factorId,
  ahoraMs,
}: {
  codigo: string;
  userId: string | null;
  factorId: string;
  ahoraMs?: number;
}): Promise<CodigoResuelto> {
  if (codigo !== CODIGO_DEL_MOCK || !mockDeSegundoFactorHabilitado()) {
    return { ok: true, codigo, sustituido: false };
  }
  const secreto = leerSecretoDelMock(userId, factorId);
  if (!secreto) return { ok: false, mensaje: MENSAJE_SIN_SECRETO_DEL_MOCK };
  try {
    return { ok: true, codigo: await codigoTotp(secreto, ahoraMs), sustituido: true };
  } catch {
    return { ok: false, mensaje: MENSAJE_SIN_SECRETO_DEL_MOCK };
  }
}

/**
 * Inscribe un factor TOTP como siempre, guarda su secreto y devuelve, junto al
 * factor, el primer código ya calculado. Nunca en producción: lanza.
 */
export async function crearFactorConElMock(
  token: string,
): Promise<{ factor: FactorPorVerificar; codigo: string }> {
  if (!mockDeSegundoFactorHabilitado()) throw new Error('El mock no está disponible en este entorno.');
  const factor = await crearFactorTotp(token);
  const userId = userIdDelToken(token);
  if (userId) guardarSecretoDelMock(userId, factor.factorId, factor.secret);
  return { factor, codigo: await codigoTotp(factor.secret) };
}
