/**
 * El regreso del enlace de CONFIRMAR CORREO del registro.
 *
 * ── Por qué existe (bug de QA, 28-09) ───────────────────────────────────────
 *
 * El correo de confirmación de Supabase traía `{{ .ConfirmationURL }}`: un GET
 * a `…/auth/v1/verify` que GASTA el token en el acto y vuelve con `?code=`
 * (PKCE). Dos cosas salían mal:
 *
 *  1. El `code` sólo se canjea en el navegador que hizo el registro (el
 *     `code_verifier` vive en SUS cookies). Abierto desde el celular, otro
 *     navegador u otro perfil —la ventana de incógnito de Arc no es la ventana
 *     normal— la cuenta quedaba confirmada pero sin sesión.
 *  2. Cualquier segunda apertura (el escáner de enlaces del correo, un doble
 *     clic, recargar una pestaña que tarda) encuentra el token ya gastado:
 *     Supabase contesta `otp_expired` y la pantalla decía «El enlace ya
 *     venció» con la cuenta confirmada y, a veces, con la sesión abierta en
 *     ese mismo navegador. Visto el 28-09 con `hola+onboarding1@leasefy.co`:
 *     primer clic 22:52:11 (confirmó y abrió sesión), la pestaña tardó ~37 s
 *     en el servidor de desarrollo, dos clics más a las 22:52:48 y 22:52:53 →
 *     «vencido».
 *
 * La salida es la que recomienda Supabase para SSR: la plantilla manda un
 * `token_hash` y la sesión se abre con `verifyOtp`, que NO depende del
 * navegador del registro; y el token no se gasta en el GET sino con un clic
 * («Confirmar mi correo»), así el escáner no lo quema.
 *
 * La plantilla nueva (`back/supabase/templates/confirmar-registro.html`) arma
 * el enlace pegándole `&token_hash=…&type=email` a `{{ .RedirectTo }}`, que es
 * lo que devuelve `urlDeRegresoDelRegistro`. Por eso esa URL lleva SIEMPRE `?`.
 */
import { sanitizeReturnUrl } from '@/lib/utils'

/** Marca del enlace del registro: un `code` que no se canjea igual confirmó la cuenta. */
export const MARCA_DEL_REGISTRO = 'registro'

/** A dónde va quien vuelve sin destino propio (resuelve el rol y el onboarding). */
export const DESTINO_POR_DEFECTO = '/auth/post-login'

/**
 * El `emailRedirectTo` de todo registro con correo y contraseña (y de su
 * reenvío): vuelve por `/auth/callback`, que sabe leer las tres formas de
 * regreso (`code`, `token_hash`, fragmento).
 */
export function urlDeRegresoDelRegistro(origen: string, destino: string): string {
  return `${origen}/auth/callback?returnUrl=${encodeURIComponent(destino)}&tipo=${MARCA_DEL_REGISTRO}`
}

export type TipoDeConfirmacion = 'email' | 'signup'

/** `email` es el tipo vigente de Supabase; `signup` queda por los enlaces viejos. */
export function tipoDeConfirmacion(valor: string | null | undefined): TipoDeConfirmacion {
  return valor === 'signup' ? 'signup' : 'email'
}

export type RegresoDelCorreo =
  | { accion: 'confirmar'; tokenHash: string; tipo: TipoDeConfirmacion; destino: string }
  | { accion: 'canjear'; code: string; destino: string; esRegistro: boolean }
  | { accion: 'enlace'; destino: string }

/** Qué hacer con lo que trajo el enlace a `/auth/callback`. Pura: no toca red ni cookies. */
export function leerRegresoDelCorreo(sp: URLSearchParams): RegresoDelCorreo {
  const destino = sanitizeReturnUrl(sp.get('returnUrl'), DESTINO_POR_DEFECTO)
  const tokenHash = sp.get('token_hash')
  if (tokenHash) {
    return { accion: 'confirmar', tokenHash, tipo: tipoDeConfirmacion(sp.get('type')), destino }
  }
  const code = sp.get('code')
  if (code) {
    return { accion: 'canjear', code, destino, esRegistro: sp.get('tipo') === MARCA_DEL_REGISTRO }
  }
  return { accion: 'enlace', destino }
}

/** La pantalla que pide el clic antes de gastar el token. Ruta relativa. */
export function urlDeLaPantallaDeConfirmacion(p: {
  tokenHash: string
  tipo: TipoDeConfirmacion
  destino: string
}): string {
  const sp = new URLSearchParams({ token_hash: p.tokenHash, type: p.tipo, returnUrl: p.destino })
  return `/auth/confirmar?${sp.toString()}`
}
