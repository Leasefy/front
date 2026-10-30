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

/**
 * A dónde va quien acaba de poner su contraseña nueva desde el enlace: a
 * entrar con ella, con el aviso de que quedó guardada (QA 01-10-2026: antes iba
 * a la landing con la sesión del enlace viva). El aviso viaja como los de
 * cierre: `?reason=` (el `PARAM_MOTIVO` de session-terminal.ts, que no se
 * importa porque es `'use client'` y este módulo lo usa también
 * `/auth/callback`, del servidor; una prueba ata los dos) y `anunciarCierre`
 * en sessionStorage. Si el enlace traía su propio
 * destino (`?next=`), se conserva para después de entrar.
 */
export function rutaParaEntrarConLaNueva(destino: string): string {
  const sp = new URLSearchParams({ reason: 'contrasena-actualizada' })
  if (destino && destino !== '/') sp.set('returnUrl', destino)
  return `/auth?${sp.toString()}`
}

/*
 * ── El latido de la pantalla de recuperación ────────────────────────────────
 *
 * 🔴 Victor, 30-10-2026 (producción): pidió «Olvidé mi contraseña» y dejó esa
 * pestaña abierta en `/auth`. Abrió el enlace en otra pestaña. Las cookies de
 * sesión son compartidas, así que la pestaña de `/auth` también recibió la
 * sesión nueva, vio la marca de recuperación y —por no estar en una pantalla
 * de la recuperación— la CERRÓ: `POST /auth/v1/logout?scope=local`, que borra
 * la sesión en Supabase. La pestaña del enlace seguía usándola y todo daba
 * `session_not_found` («Tu sesión se cerró»).
 *
 * La marca dice «hay una sesión de recuperación», no «ESTA pestaña la
 * abandonó». Para saber si otra pestaña todavía está terminando, la pantalla
 * de la recuperación deja un latido en `localStorage` (compartido entre
 * pestañas) mientras está abierta, y lo suelta al irse. Sin latido —o vencido,
 * por una pestaña cerrada de golpe— el guarda cierra la sesión como siempre.
 */
export const CLAVE_DEL_LATIDO = 'leasefy_recuperacion_viva'

/** Cada cuánto late la pantalla de la recuperación. */
export const PERIODO_DEL_LATIDO_MS = 5_000

/** Un latido más viejo que esto es de una pestaña que ya no está. */
export const VIGENCIA_DEL_LATIDO_MS = 20_000

export function latirRecuperacion(ahora: number = Date.now()): void {
  try {
    localStorage.setItem(CLAVE_DEL_LATIDO, String(ahora))
  } catch {
    // Sin localStorage no hay latido: el guarda cae a su comportamiento de siempre.
  }
}

export function soltarRecuperacion(): void {
  try {
    localStorage.removeItem(CLAVE_DEL_LATIDO)
  } catch {
    // ídem
  }
}

/** ¿Hay una pantalla de la recuperación abierta (en cualquier pestaña)? */
export function recuperacionEnOtraPestana(ahora: number = Date.now()): boolean {
  try {
    const ultimo = Number(localStorage.getItem(CLAVE_DEL_LATIDO))
    return Number.isFinite(ultimo) && ultimo > 0 && ahora - ultimo < VIGENCIA_DEL_LATIDO_MS
  } catch {
    return false
  }
}
