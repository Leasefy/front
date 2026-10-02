/**
 * Inscribir y verificar el segundo factor (TOTP) contra Supabase.
 *
 * Vivía dentro de `MfaSetupSection` (Configuración → Seguridad). Salió acá el
 * 30-09-2026 porque `/auth/mfa-enroll` pasó a tener su propio paso a paso
 * (`ActivarSegundoFactorPasoAPaso`) y los dos tienen que hablar con Supabase
 * EXACTAMENTE igual: con los mismos rodeos del candado del SDK y los mismos
 * topes. Lo que está acá no pinta nada; sólo pide y traduce.
 */

import { decodeAccessToken } from '@/lib/auth/jwt';
import { errorDeSupabaseAuth } from '@/lib/auth/errores-del-segundo-factor';
import { getSupabase } from '@/lib/supabase/client';

/**
 * Cuánto se espera a Supabase antes de rendirse. Sin tope, el candado interno
 * del SDK deja la promesa colgada para siempre y el botón se queda en
 * «Cargando...» sin decir nada — que es exactamente lo que pasaba al activar.
 */
export const TOPE_MS = 15000;

/**
 * Lo que se dice cuando se agotan los 15 s (Nico, 02-10-2026). Decía
 * «Supabase no respondió a tiempo»: a la persona no le importa el proveedor,
 * y nombrarlo no le dice qué hacer.
 */
export const MENSAJE_DEL_TOPE =
  'El servicio de acceso no respondió a tiempo. Intenta de nuevo en un momento.';

/**
 * Llama la API de auth de Supabase por HTTP, sin el SDK.
 *
 * Por qué no el SDK: `supabase.auth.mfa.*` serializa todo detrás de un candado
 * (`navigator.locks`) compartido con el refresco de sesión. Si otra pestaña o
 * el propio contexto de auth lo tiene tomado, `enroll()` NO resuelve ni
 * rechaza: se queda esperando. `verify` ya lo evitaba así; ahora lo evitan
 * también `enroll` y `unenroll`, que eran los que colgaban.
 *
 * El `AbortController` es el cinturón: si la red se cuelga, esto falla con un
 * mensaje en vez de dejar el botón girando.
 */
export async function apiDeAuth<T>(
  ruta: string,
  token: string,
  init: { method: string; body?: unknown } = { method: 'GET' },
): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Falta la configuración de Supabase');

  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TOPE_MS);
  try {
    const res = await fetch(`${url}/auth/v1${ruta}`, {
      method: init.method,
      signal: control.signal,
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
    const cuerpo = (await res.json().catch(() => ({}))) as {
      message?: string;
      msg?: string;
      error_code?: string;
      error_description?: string;
    };
    if (!res.ok) {
      // 🔴 GoTrue contesta `{ error_code, msg }`, no `message`: leer sólo
      // `message` es lo que dejaba el toast en «Error 422» a secas (Nico,
      // 29-09). Todo sale traducido (`errores-del-segundo-factor.ts`).
      throw errorDeSupabaseAuth({
        status: res.status,
        codigo: cuerpo.error_code,
        mensaje: cuerpo.msg || cuerpo.message || cuerpo.error_description,
      });
    }
    return cuerpo as T;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(MENSAJE_DEL_TOPE);
    }
    // El pedido no salió (sin red, DNS): «Failed to fetch» no le dice nada a
    // nadie. Sale como «sin respuesta», que es lo único que habla de la
    // conexión (regla de oro, 02-10-2026).
    if (err instanceof TypeError) {
      throw errorDeSupabaseAuth({ status: 0, mensaje: err.message });
    }
    throw err;
  } finally {
    clearTimeout(reloj);
  }
}

/**
 * El QR listo para un `<img src>`.
 *
 * El SDK devolvía el código ya envuelto como data URI; la API REST lo devuelve
 * como SVG crudo («<svg …>»), y puesto tal cual en un `src` la imagen sale
 * rota. Se envuelve acá. Si ya viene como data URI o como URL, se deja igual.
 */
export function qrParaImagen(crudo: string): string {
  const valor = (crudo ?? '').trim();
  if (!valor) return '';
  if (valor.startsWith('data:') || valor.startsWith('http')) return valor;
  return `data:image/svg+xml;utf8,${encodeURIComponent(valor)}`;
}

/**
 * Una promesa del SDK con el mismo tope de 15 s que `apiDeAuth`: el candado
 * de auth del SDK puede dejarla sin resolver ni rechazar.
 */
export function conTope<T>(promesa: Promise<T>): Promise<T> {
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const tope = new Promise<never>((_, rechazar) => {
    reloj = setTimeout(
      () => rechazar(new Error(MENSAJE_DEL_TOPE)),
      TOPE_MS,
    );
  });
  return Promise.race([promesa, tope]).finally(() => clearTimeout(reloj));
}

/**
 * Un código de la app contra un factor, POR EL SDK (`mfa.challenge` +
 * `mfa.verify`), como `/auth/mfa-verify`. A diferencia del camino HTTP de
 * Configuración, el SDK GUARDA la sesión que devuelve Supabase: queda en
 * `aal2`, con el refresh token nuevo, y el AuthProvider se entera
 * (`MFA_CHALLENGE_VERIFIED`). Devuelve el access token nuevo.
 */
export async function verificarConElSdk(factorId: string, codigo: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Falta la configuración de Supabase');
  const { data: desafio, error: errorDelDesafio } = await conTope(
    supabase.auth.mfa.challenge({ factorId }),
  );
  if (errorDelDesafio || !desafio) {
    throw errorDeSupabaseAuth({
      status: errorDelDesafio?.status,
      codigo: errorDelDesafio?.code,
      mensaje: errorDelDesafio?.message,
    });
  }
  const { data, error } = await conTope(
    supabase.auth.mfa.verify({ factorId, challengeId: desafio.id, code: codigo }),
  );
  if (error) {
    throw errorDeSupabaseAuth({ status: error.status, codigo: error.code, mensaje: error.message });
  }
  return data?.access_token ?? null;
}

/** ¿Esta sesión ya pasó un segundo factor? (`aal2`, o más si algún día existe). */
export function sesionConSegundoFactor(token: string | null): boolean {
  const aal = decodeAccessToken(token)?.aal;
  return aal === 'aal2' || aal === 'aal3';
}

/**
 * El id del factor TOTP ya verificado de la cuenta, o `null` si no tiene.
 *
 * Por HTTP: los métodos del SDK (`mfa.getAuthenticatorAssuranceLevel`,
 * `getSession`) comparten el candado de auth y se quedaban esperando.
 * `GET /user` trae los factores y, con ellos, el id que hace falta para poder
 * desactivar.
 */
export async function factorTotpVerificado(token: string): Promise<string | null> {
  const usuario = await apiDeAuth<{
    factors?: Array<{ id: string; factor_type: string; status: string }>;
  }>('/user', token);
  return (
    usuario.factors?.find((f) => f.factor_type === 'totp' && f.status === 'verified')?.id ?? null
  );
}

/** Lo que devuelve Supabase al crear un factor, listo para pintarlo. */
export interface FactorPorVerificar {
  factorId: string;
  /** El QR listo para un `<img src>` (`qrParaImagen`). */
  qrCode: string;
  /** La clave para escribirla a mano en la app. */
  secret: string;
  /** `otpauth://…`: en el celular abre la app de autenticación directo. */
  uri?: string;
}

/**
 * Crea un factor TOTP sin verificar.
 *
 * Por HTTP, no por el SDK: `mfa.enroll()` se colgaba sin resolver ni rechazar
 * cuando el candado de auth estaba tomado, y el botón se quedaba en
 * «Cargando...» para siempre. El nombre lleva la marca de tiempo para no
 * chocar con factores huérfanos de intentos anteriores
 * (`mfa_factor_name_conflict`).
 */
export async function crearFactorTotp(token: string): Promise<FactorPorVerificar> {
  const data = await apiDeAuth<{
    id: string;
    totp: { qr_code: string; secret: string; uri?: string };
  }>('/factors', token, {
    method: 'POST',
    body: { factor_type: 'totp', friendly_name: `Leasefy ${Date.now()}` },
  });
  return {
    factorId: data.id,
    qrCode: qrParaImagen(data.totp.qr_code),
    secret: data.totp.secret,
    uri: data.totp.uri || undefined,
  };
}

/**
 * El primer código de un factor recién creado.
 *
 * - `enElIngreso` (login, sesión `aal1`): por el SDK, que deja la sesión
 *   guardada en `aal2` (con su refresh token nuevo) y el AuthProvider se
 *   entera. Por HTTP la respuesta se perdía y la persona tenía que escribir
 *   otro código.
 * - Si no (Configuración, sesión ya adentro): fuera del SDK, como todo lo
 *   demás de esa pantalla — el candado interno de auth cuelga después de
 *   `enroll()`. Y por `apiDeAuth`, no por un `fetch` suelto: una red colgada
 *   dejaba «Verificando...» para siempre.
 */
export async function verificarFactorNuevo({
  factorId,
  codigo,
  enElIngreso,
  token,
}: {
  factorId: string;
  codigo: string;
  enElIngreso: boolean;
  token: string | null;
}): Promise<void> {
  if (enElIngreso) {
    await verificarConElSdk(factorId, codigo);
    return;
  }
  if (!token) throw new Error('No hay sesión activa');
  // Paso 1: el desafío.
  const desafio = await apiDeAuth<{ id: string }>(`/factors/${factorId}/challenge`, token, {
    method: 'POST',
  });
  // Paso 2: verificar con el código.
  await apiDeAuth(`/factors/${factorId}/verify`, token, {
    method: 'POST',
    body: { challenge_id: desafio.id, code: codigo },
  });
}

/**
 * Quita un factor que quedó a medio crear, de fondo y sin esperar a nadie: un
 * factor huérfano no rompe nada (el próximo intento usa otro nombre, con marca
 * de tiempo, y no choca con éste).
 */
export function descartarFactorSinVerificar(factorId: string, token: string): void {
  void apiDeAuth(`/factors/${factorId}`, token, { method: 'DELETE' }).catch(() => {});
}
