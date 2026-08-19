'use client'

/**
 * El estado terminal de sesión: "esto ya no vuelve, salí a /auth".
 *
 * ── El problema que resuelve ────────────────────────────────────────────────
 *
 * Todo el manejo de 401 del front está construido sobre una premisa correcta —
 * que casi siempre un 401 es la carrera de la renovación del token, no una
 * sesión muerta— y actúa en consecuencia: espera un token nuevo, reintenta, y
 * si no, muestra «No pudimos cargar esto. Probá de nuevo».
 *
 * Esa premisa se cae exactamente en un caso: cuando el refresh token murió.
 * Ahí no hay token nuevo que esperar, el reintento no puede funcionar, y el
 * botón «Intentar de nuevo» es una promesa falsa que el usuario aprieta
 * indefinidamente. Peor: cada pantalla del panel lo descubre por su cuenta, así
 * que el panel queda lleno de carteles rojos alrededor de una sesión que ya no
 * existe.
 *
 * Este módulo es el único lugar donde se declara esa muerte. Es una bandera de
 * un solo sentido: una vez cerrada, ninguna petición nueva sale a la red y la
 * app navega a /auth. No hay vuelta atrás dentro de la misma carga de página —
 * volver a levantar la sesión implica recargar, que es justo lo que hacemos.
 *
 * ── Por qué vive fuera de React ─────────────────────────────────────────────
 *
 * Lo consume `apiClient`, que no es un componente y corre para peticiones que
 * empezaron antes de que cualquier efecto se montara. Un estado de React llega
 * tarde: para cuando el provider re-renderiza, ya salieron diez peticiones más.
 */

import { TENANT_ONBOARDING_STORAGE_KEY } from '@/lib/onboarding/tenant-onboarding-status'

/** Por qué se terminó la sesión. Define qué ve el usuario al llegar a /auth. */
export type MotivoDeCierre =
  /** El token venció y Supabase no pudo renovarlo. */
  | 'expirada'
  /** El backend la invalidó (sesión única: entraste en otro dispositivo). */
  | 'revocada'
  /** Nadie tocó nada durante el tope configurado. */
  | 'inactividad'

/** El valor que viaja en `?reason=` hacia /auth. */
export const PARAM_MOTIVO = 'reason'

const RUTA_AUTH = '/auth'

/**
 * Rutas donde NO hay que redirigir: ya son la salida.
 *
 * Sin esto, un 401 terminal disparado desde la propia pantalla de login
 * (o desde el callback de OAuth, que corre sin sesión por definición)
 * produciría una navegación a /auth desde /auth — un refresh que borra lo que
 * el usuario estaba tipeando.
 */
const RUTAS_DE_SALIDA = ['/auth', '/invitacion', '/registro']

let cerrada = false
let motivoDeCierre: MotivoDeCierre | null = null
let alCerrar: (() => void) | null = null

/**
 * ¿La sesión ya se dio por muerta?
 *
 * `apiClient` lo consulta antes de cada petición: con la sesión cerrada no
 * tiene sentido salir a la red ni esperar un token que no va a llegar.
 */
export function sesionTerminada(): boolean {
  return cerrada
}

/** El motivo, para que /auth sepa qué contar. `null` si la sesión sigue viva. */
export function motivoDeSesionTerminada(): MotivoDeCierre | null {
  return motivoDeCierre
}

/**
 * El AuthProvider registra acá su `signOut` para que la limpieza asíncrona
 * (FCM, Supabase) también corra. Se llama sin esperar: la navegación no puede
 * quedar colgada de una petición de red.
 */
export function registrarCierreDeSesion(handler: (() => void) | null): void {
  alCerrar = handler
}

/**
 * Borra TODO rastro local de la sesión, de forma síncrona.
 *
 * Síncrona es el requisito, no un detalle: corre justo antes de navegar, y
 * cualquier `await` acá significa navegar con las cookies de Supabase todavía
 * puestas — con lo cual la carga siguiente vuelve a intentar el mismo token
 * muerto y el usuario entra en un rulo de redirecciones.
 *
 * Exportada porque `signOut` (cierre voluntario) necesita exactamente lo mismo:
 * una sola definición de "qué es limpiar la sesión", no dos que se desincronizan.
 */
export function purgarSesionLocal(): void {
  if (typeof document !== 'undefined') {
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0]?.trim()
      if (name && (name.startsWith('sb-') || name.startsWith('supabase'))) {
        document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`
        document.cookie = `${name}=; Max-Age=0; path=/`
      }
    })
  }

  if (typeof window === 'undefined') return

  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith('sb-') || k.startsWith('supabase.'))
      .forEach((k) => window.localStorage.removeItem(k))
    Object.keys(window.sessionStorage)
      .filter((k) => k.startsWith('sb-') || k.startsWith('supabase.'))
      .forEach((k) => window.sessionStorage.removeItem(k))
    // El borrador del onboarding de inquilino lleva datos personales de ESTA
    // cuenta (teléfono, presupuesto, zonas, mascotas). Nunca dejarlo para la
    // cuenta que entre después en un navegador compartido.
    window.localStorage.removeItem(TENANT_ONBOARDING_STORAGE_KEY)
  } catch {
    // localStorage puede tirar en modo privado / con cuota llena. Que no
    // impida el resto del cierre.
  }
}

/**
 * ¿Hay una sesión de Supabase GUARDADA en este navegador?
 *
 * Sirve para una distinción que no se puede hacer de otra forma: `SIGNED_OUT`
 * es el mismo evento cuando auth-js descarta una sesión que no pudo renovar y
 * cuando simplemente no había ninguna. Sin separarlos, un visitante anónimo en
 * la landing —que también recibe `SIGNED_OUT` en el arranque— terminaría
 * rebotado a /auth con el cartel "tu sesión expiró", sin haber tenido sesión
 * jamás.
 *
 * Hay que leerlo AL MONTAR, antes de que auth-js borre lo que había: una vez
 * que `_removeSession` corrió, ya no queda rastro que consultar.
 *
 * `@supabase/ssr` guarda la sesión en cookies `sb-<ref>-auth-token` (partidas
 * en `.0`, `.1`… cuando no entran); las versiones viejas usaban localStorage.
 * Miramos los dos.
 */
const CLAVE_DE_SESION = /^sb-.+-auth-token/

export function haySesionGuardada(): boolean {
  if (typeof document !== 'undefined') {
    const hayCookie = document.cookie
      .split(';')
      .some((c) => CLAVE_DE_SESION.test(c.split('=')[0]?.trim() ?? ''))
    if (hayCookie) return true
  }

  if (typeof window === 'undefined') return false
  try {
    return Object.keys(window.localStorage).some((k) => CLAVE_DE_SESION.test(k))
  } catch {
    return false
  }
}

/**
 * Declarar la sesión muerta y salir a /auth.
 *
 * **Idempotente por diseño.** Cuando un token muere, no falla una petición:
 * fallan las ocho que la pantalla tenía en vuelo. Sin esta guarda serían ocho
 * navegaciones pisándose y ocho `signOut` compitiendo. La primera gana y las
 * demás no hacen nada.
 *
 * Usa `location.replace` y no el router de Next a propósito:
 *  - `replace` (no `push`) para que el botón "atrás" no devuelva a una pantalla
 *    del panel que ya no puede cargar nada.
 *  - navegación DURA para que se tire todo el estado en memoria — tokens,
 *    caches de datos, peticiones en vuelo. Una navegación de Next preserva el
 *    árbol de React, y con él los hooks que reintentan contra la sesión muerta.
 */
export function terminarSesion(motivo: MotivoDeCierre): void {
  if (cerrada) return
  cerrada = true
  motivoDeCierre = motivo

  purgarSesionLocal()

  // Limpieza de fondo (FCM, signOut de Supabase). Nunca se espera: si la red
  // está caída, el usuario igual tiene que poder salir.
  try {
    alCerrar?.()
  } catch {
    // Un handler roto no puede impedir la salida.
  }

  if (typeof window === 'undefined') return

  const { pathname, search } = window.location
  if (RUTAS_DE_SALIDA.some((ruta) => pathname.startsWith(ruta))) return

  const destino = new URL(RUTA_AUTH, window.location.origin)
  destino.searchParams.set('returnUrl', `${pathname}${search}`)
  destino.searchParams.set(PARAM_MOTIVO, motivo)
  window.location.replace(destino.toString())
}

/**
 * Vuelve el módulo a cero. **Sólo para tests** — en el navegador el reset real
 * es la recarga que provoca `terminarSesion`.
 */
export function resetSessionTerminal(): void {
  cerrada = false
  motivoDeCierre = null
  alCerrar = null
}
