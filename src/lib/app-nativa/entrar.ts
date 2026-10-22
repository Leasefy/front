/**
 * Entrar a Leasefy desde la app de iOS/Android.
 *
 * GOOGLE. Google no deja iniciar sesión dentro de una vista web embebida
 * (error «disallowed_useragent»), así que en la app:
 *   1. `signInWithOAuth` con `skipBrowserRedirect`: Supabase guarda el verificador
 *      PKCE en las cookies de la vista web y devuelve la dirección de Google.
 *   2. La app la abre en la hoja segura del sistema (LeasefyNativo.abrir:
 *      ASWebAuthenticationSession en iPhone, pestaña de Chrome en Android).
 *   3. Google vuelve a `/auth/callback?app=1&code=…` (la MISMA ruta de la web, que
 *      Supabase ya tiene permitida); con `app=1` esa ruta no canjea: rebota a
 *      `co.leasefy.app://auth/callback?code=…`, que cierra la hoja y vuelve a la app.
 *   4. La vista web abre `/auth/callback?code=…` (sin `app`): ahí sí se canjea, con
 *      el verificador que quedó en sus cookies, igual que en la web.
 *
 * APPLE («Continuar con Apple», sólo iPhone; Apple lo exige si hay Google): la hoja
 * nativa de Apple devuelve un token de identidad y Supabase abre la sesión con
 * `signInWithIdToken`. Requiere el proveedor Apple prendido en Supabase con el
 * identificador de la app (co.leasefy.app).
 */
import { getSupabase } from '@/lib/supabase/client'
import { codigoDelError, llamarALaApp } from './puente'
import { ESQUEMA_DE_LA_APP, MARCA_DE_LA_APP_EN_EL_REGRESO } from './constantes'

/*
 * En Android el regreso de Google llega DOS veces: como respuesta de
 * LeasefyNativo.abrir y como enlace de la app (appUrlOpen). Mientras esta entrada
 * está en curso, el enlace se ignora: un código de Google sólo se canjea una vez.
 */
let entradaConGoogleEnCurso = false

export function hayUnaEntradaConGoogleEnCurso(): boolean {
  return entradaConGoogleEnCurso
}

/** El destino después de entrar, como lo arma la web (pasa por /auth/post-login). */
function destinoDespuesDeEntrar(regreso?: string): string {
  return regreso && regreso !== '/'
    ? `/auth/post-login?returnUrl=${encodeURIComponent(regreso)}`
    : '/auth/post-login'
}

/**
 * La dirección `co.leasefy.app://auth/callback?…` (o `https://leasefy.co/auth/callback?…`
 * si llegó como enlace) convertida en la ruta de la web que termina de entrar.
 * `null` si no es un regreso de inicio de sesión.
 */
export function rutaDelRegresoDeLaApp(direccion: string): string | null {
  let url: URL
  try {
    url = new URL(direccion)
  } catch {
    return null
  }
  const esDeLaApp = url.protocol === `${ESQUEMA_DE_LA_APP}:` && url.host === 'auth' && url.pathname === '/callback'
  const esDeLaWeb = (url.protocol === 'https:' || url.protocol === 'http:') && url.pathname === '/auth/callback'
  if (!esDeLaApp && !esDeLaWeb) return null
  const parametros = new URLSearchParams(url.search)
  parametros.delete(MARCA_DE_LA_APP_EN_EL_REGRESO)
  if (!parametros.get('code') && !parametros.get('error') && !parametros.get('error_description')) return null
  return `/auth/callback?${parametros.toString()}`
}

/**
 * «Continuar con Google» en la app. Resuelve sin error si la persona cierra la
 * hoja sin entrar (no es un fallo: vuelve al formulario como estaba).
 */
export async function entrarConGoogleEnLaApp(regreso?: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not initialized')

  const vuelta = new URLSearchParams({ [MARCA_DE_LA_APP_EN_EL_REGRESO]: '1' })
  if (regreso && regreso !== '/') vuelta.set('returnUrl', destinoDespuesDeEntrar(regreso))
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?${vuelta.toString()}`,
      skipBrowserRedirect: true,
    },
  })
  if (error) throw error
  if (!data?.url) throw new Error('Google no devolvió la dirección para entrar.')

  let regresoDeGoogle: string
  entradaConGoogleEnCurso = true
  try {
    const respuesta = await llamarALaApp<{ url: string }>('LeasefyNativo', 'abrir', {
      url: data.url,
      esquema: ESQUEMA_DE_LA_APP,
    })
    regresoDeGoogle = respuesta.url
  } catch (fallo) {
    entradaConGoogleEnCurso = false
    if (codigoDelError(fallo) === 'CANCELADO') return
    throw fallo
  }
  const ruta = rutaDelRegresoDeLaApp(regresoDeGoogle)
  if (!ruta) {
    entradaConGoogleEnCurso = false
    throw new Error('Google no devolvió el código para entrar.')
  }
  // La marca queda puesta: la página se va a /auth/callback y se recarga entera.
  window.location.assign(ruta)
}

/** SHA-256 en hexadecimal (lo que Apple recibe como nonce). */
async function sha256Hex(texto: string): Promise<string> {
  const huella = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return Array.from(new Uint8Array(huella), (b) => b.toString(16).padStart(2, '0')).join('')
}

function nonceAleatorio(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

interface RespuestaDeApple {
  identityToken: string
  nombre?: string
  apellido?: string
}

/** «Continuar con Apple» (iPhone). Resuelve sin error si la persona cierra la hoja. */
export async function entrarConAppleEnLaApp(regreso?: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not initialized')

  const nonce = nonceAleatorio()
  let apple: RespuestaDeApple
  try {
    apple = await llamarALaApp<RespuestaDeApple>('LeasefyNativo', 'entrarConApple', { nonce: await sha256Hex(nonce) })
  } catch (fallo) {
    if (codigoDelError(fallo) === 'CANCELADO') return
    throw fallo
  }

  const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: apple.identityToken, nonce })
  if (error) throw error

  // Apple manda el nombre SÓLO la primera vez: se guarda para el registro.
  const nombreCompleto = [apple.nombre, apple.apellido].filter(Boolean).join(' ').trim()
  if (nombreCompleto) {
    await supabase.auth
      .updateUser({ data: { full_name: nombreCompleto, given_name: apple.nombre, family_name: apple.apellido } })
      .catch(() => {})
  }
  window.location.assign(destinoDespuesDeEntrar(regreso))
}
