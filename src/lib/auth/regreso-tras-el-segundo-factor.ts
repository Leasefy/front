/**
 * A dónde vuelve la persona después del SEGUNDO FACTOR.
 *
 * 🔴 QA 23-09: con segundo factor, `AuthForm` mandaba a `/auth/mfa-verify`
 * a secas y el `returnUrl` se perdía: quien tocó un enlace a una pantalla
 * concreta (un lote para aprobar, una postulación) terminaba en el inicio de
 * su panel después de escribir el código y tenía que volver a buscarla.
 *
 * El destino viaja en la URL de `/auth/mfa-verify` y se vuelve a SANEAR al
 * leerlo (`sanitizeReturnUrl`): lo que llega por la barra lo pudo escribir
 * cualquiera, y un `returnUrl=//otro.sitio` no puede sacar a nadie de Leasefy.
 */

import { sanitizeReturnUrl } from '@/lib/utils/safe-redirect';

export const RUTA_DEL_SEGUNDO_FACTOR = '/auth/mfa-verify';

/** `/auth/mfa-verify`, con `?returnUrl=` sólo si hay un destino de verdad. */
export function rutaAlSegundoFactor(returnUrl: string | null | undefined): string {
  const destino = sanitizeReturnUrl(returnUrl, '/');
  if (destino === '/' || destino.startsWith(RUTA_DEL_SEGUNDO_FACTOR)) {
    return RUTA_DEL_SEGUNDO_FACTOR;
  }
  return `${RUTA_DEL_SEGUNDO_FACTOR}?returnUrl=${encodeURIComponent(destino)}`;
}

/** El inicio de cada rol, el mismo de siempre de `/auth/mfa-verify`. */
export function inicioDelRol(role: string | null | undefined): string {
  if (role === 'agency') return '/panel/inmobiliaria';
  if (role === 'landlord') return '/panel';
  return '/inquilino';
}

/**
 * El destino tras el código: el `returnUrl` saneado, o el inicio del rol.
 * Nunca vuelve a la propia pantalla del código.
 */
export function destinoTrasElSegundoFactor(
  returnUrl: string | null | undefined,
  role: string | null | undefined,
): string {
  const inicio = inicioDelRol(role);
  const destino = sanitizeReturnUrl(returnUrl, inicio);
  if (destino === '/' || destino.startsWith(RUTA_DEL_SEGUNDO_FACTOR)) return inicio;
  return destino;
}
