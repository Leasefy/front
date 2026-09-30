/**
 * La sesión que abre el enlace de «¿Olvidaste tu contraseña?» sirve para UNA
 * cosa: poner la contraseña nueva.
 *
 * 🔴 Producción (Nico, 30-09-2026): pidió recuperar la contraseña, abrió el
 * enlace y no terminó (la pantalla falló por el segundo factor). Días después
 * volvió a la landing y arriba decía «Ir al panel»; al tocarlo le pedía el
 * código del segundo factor, como si hubiera iniciado sesión. Y en efecto:
 * `exchangeCodeForSession` en `/auth/callback` abre una sesión completa ANTES
 * de que exista la contraseña nueva, y nada la cerraba si la persona se iba.
 *
 * Por eso `/auth/callback` deja esta marca cuando el enlace es de recuperación,
 * y `SesionDeRecuperacionGuard` cierra la sesión (sólo en este navegador) si la
 * persona aparece en cualquier otra pantalla sin haber terminado. Al guardar la
 * contraseña la marca se borra y la sesión queda como una normal.
 *
 * Sólo la recuperación: la invitación de un inquilino migrado también llega a
 * `/auth/update-password`, pero con `?nuevo=1` y por `/auth/enlace`. Ese no
 * tiene contraseña con qué volver a entrar; cerrarle la sesión lo dejaría
 * afuera.
 */

export const COOKIE_DE_RECUPERACION = 'leasefy_sesion_de_recuperacion'

/** A dónde lleva el enlace de recuperación (`resetPasswordForEmail`). */
export const RUTA_DE_LA_CONTRASENA_NUEVA = '/auth/update-password'

/**
 * Lo que dura la marca: lo mismo que puede durar la sesión que marca. Si
 * caducara antes, la sesión abandonada volvería a quedar viva sin marca.
 */
export const DURACION_DE_LA_MARCA_S = 60 * 60 * 24 * 30

/** ¿El `returnUrl` del callback es el del enlace de recuperación? */
export function esEnlaceDeRecuperacion(returnUrl: string): boolean {
  return returnUrl === RUTA_DE_LA_CONTRASENA_NUEVA
}

/**
 * Donde la sesión de recuperación tiene que estar para terminar: la
 * contraseña nueva y, con segundo factor, el código antes de guardarla.
 */
const RUTAS_DE_LA_RECUPERACION = [RUTA_DE_LA_CONTRASENA_NUEVA, '/auth/mfa-verify', '/auth/mfa-enroll', '/auth/callback']

export function rutaDeLaRecuperacion(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return RUTAS_DE_LA_RECUPERACION.some((r) => pathname === r || pathname.startsWith(`${r}/`))
}

export function hayMarcaDeRecuperacion(cookies: string = typeof document === 'undefined' ? '' : document.cookie): boolean {
  return cookies.split(';').some((c) => c.trim().startsWith(`${COOKIE_DE_RECUPERACION}=`))
}

export function borrarMarcaDeRecuperacion(): void {
  if (typeof document === 'undefined') return
  // `Expires` en el pasado además de `Max-Age=0`: con sólo lo segundo hay
  // entornos que la dan por viva hasta el siguiente milisegundo.
  document.cookie = `${COOKIE_DE_RECUPERACION}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
}
