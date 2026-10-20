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
import { segundoFactorApi } from '@/lib/api/segundo-factor.service';
import {
  crearFactorTotp,
  descartarFactorSinVerificar,
  verificarFactorNuevo,
  type FactorPorVerificar,
} from '@/lib/auth/inscripcion-del-segundo-factor';
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
  | { ok: false; mensaje: string; sinSecreto?: true };

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
  if (!secreto) return { ok: false, mensaje: MENSAJE_SIN_SECRETO_DEL_MOCK, sinSecreto: true };
  try {
    return { ok: true, codigo: await codigoTotp(secreto, ahoraMs), sustituido: true };
  } catch {
    return { ok: false, mensaje: MENSAJE_SIN_SECRETO_DEL_MOCK, sinSecreto: true };
  }
}

/**
 * Inscribe un factor TOTP como siempre y lo verifica con el código calculado.
 * El secreto se guarda DESPUÉS de verificar: si algo falla no queda ninguna
 * clave huérfana y el factor a medio crear se descarta. Nunca en producción.
 */
export async function inscribirYVerificarConElMock({
  token,
  enElIngreso,
}: {
  token: string;
  enElIngreso: boolean;
}): Promise<{ factorId: string }> {
  if (!mockDeSegundoFactorHabilitado()) throw new Error('El mock no está disponible en este entorno.');
  const factor = await crearFactorTotp(token);
  try {
    await verificarFactorNuevo({
      factorId: factor.factorId,
      codigo: await codigoTotp(factor.secret),
      enElIngreso,
      token,
    });
  } catch (err) {
    descartarFactorSinVerificar(factor.factorId, token);
    throw err;
  }
  const userId = userIdDelToken(token);
  if (userId) guardarSecretoDelMock(userId, factor.factorId, factor.secret);
  return { factorId: factor.factorId };
}

export const MENSAJE_FALLO_AL_REINSCRIBIR_CON_EL_MOCK =
  'No pudimos activar el mock. Intenta de nuevo en un momento.';

export type RecuperacionDelMock = { ok: true; factorId: string } | { ok: false; mensaje: string };

/**
 * `123456` sobre un factor que NO se inscribió con el mock (T-0172, ronda 2):
 * el back (sólo desarrollo y staging) libera los factores de la persona y acá
 * se inscribe y verifica uno nuevo con el mock. Una sola vez, sin reintentos:
 * si el back contesta 404, red o 5xx, queda el mensaje de siempre. Compuerta
 * cerrada (producción): ni siquiera se llama al back.
 */
export async function liberarYVerificarConElMock({
  token,
  enElIngreso,
}: {
  token: string;
  enElIngreso: boolean;
}): Promise<RecuperacionDelMock> {
  if (!mockDeSegundoFactorHabilitado()) return { ok: false, mensaje: MENSAJE_SIN_SECRETO_DEL_MOCK };
  try {
    await segundoFactorApi.liberarFactoresDelMock();
  } catch {
    return { ok: false, mensaje: MENSAJE_SIN_SECRETO_DEL_MOCK };
  }
  try {
    const { factorId } = await inscribirYVerificarConElMock({ token, enElIngreso });
    return { ok: true, factorId };
  } catch {
    return { ok: false, mensaje: MENSAJE_FALLO_AL_REINSCRIBIR_CON_EL_MOCK };
  }
}
