/**
 * Avisos (notificaciones) en la app de iOS/Android.
 *
 * El back ya manda los avisos por Firebase (FCM) al token que guarda
 * `PATCH /users/me/fcm-token`. En la app el token lo da el sistema (plugin
 * PushNotifications): en Android es de FCM; en iPhone es de FCM cuando la app
 * trae Firebase (GoogleService-Info.plist), y si no, es de Apple (APNs) y NO se le
 * manda al back, que sólo sabe enviar a FCM.
 *
 * Tocar un aviso lleva a `data.url` (el mismo campo que usa la web).
 */
import { apiClient } from '@/lib/api/client'
import { escucharALaApp, llamarALaApp, plataformaDeLaApp } from './puente'

interface EstadoDeLaApp {
  firebase: boolean
  plataforma: 'ios' | 'android'
}

type EstadoDelPermiso = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'

const ESPERA_DEL_TOKEN_MS = 15_000

/** Un token de FCM (largo, con «:»); uno de APNs son 64 caracteres hexadecimales. */
export function esTokenDeFcm(token: string): boolean {
  return token.length > 100 || token.includes(':')
}

async function pedirToken(): Promise<string | null> {
  return new Promise((resolver) => {
    let listo = false
    const terminar = (token: string | null) => {
      if (listo) return
      listo = true
      dejarDeOirRegistro()
      dejarDeOirError()
      window.clearTimeout(reloj)
      resolver(token)
    }
    const dejarDeOirRegistro = escucharALaApp<{ value?: string }>('PushNotifications', 'registration', (datos) =>
      terminar(datos?.value ?? null),
    )
    const dejarDeOirError = escucharALaApp('PushNotifications', 'registrationError', () => terminar(null))
    const reloj = window.setTimeout(() => terminar(null), ESPERA_DEL_TOKEN_MS)
    llamarALaApp('PushNotifications', 'register').catch(() => terminar(null))
  })
}

/**
 * Pide el permiso de avisos del sistema (la primera vez sale el diálogo de iOS o
 * Android), registra el celular y le manda el token al back. Devuelve el token, o
 * `null` si la persona no dio permiso o la app no tiene Firebase.
 */
export async function registrarAvisosEnLaApp(): Promise<string | null> {
  if (!plataformaDeLaApp()) return null
  const estado = await llamarALaApp<EstadoDeLaApp>('LeasefyNativo', 'estado').catch(() => null)
  // Sin Firebase, en Android pedir el token tumba la app y en iPhone sale uno que
  // el back no sabe usar: no se pide el permiso para nada.
  if (!estado?.firebase) return null

  let permiso = (await llamarALaApp<{ receive: EstadoDelPermiso }>('PushNotifications', 'checkPermissions')).receive
  if (permiso === 'prompt' || permiso === 'prompt-with-rationale') {
    permiso = (await llamarALaApp<{ receive: EstadoDelPermiso }>('PushNotifications', 'requestPermissions')).receive
  }
  if (permiso !== 'granted') return null

  const token = await pedirToken()
  if (!token || !esTokenDeFcm(token)) return null
  await apiClient.patch('/users/me/fcm-token', { fcmToken: token })
  return token
}

export interface AvisoRecibido {
  titulo: string
  cuerpo: string
  url?: string
}

function leerAviso(datos: unknown): AvisoRecibido | null {
  if (!datos || typeof datos !== 'object') return null
  const aviso = datos as { title?: string; body?: string; data?: Record<string, unknown> }
  const url = typeof aviso.data?.url === 'string' ? aviso.data.url : undefined
  if (!aviso.title && !aviso.body) return null
  return { titulo: aviso.title ?? 'Leasefy', cuerpo: aviso.body ?? '', url }
}

/**
 * Escucha los avisos: `alTocar` cuando la persona toca uno (también el que abrió
 * la app) y `alLlegarConLaAppAbierta` cuando llega uno mientras la app está a la
 * vista (en Android el sistema no lo muestra solo).
 */
export function escucharAvisosDeLaApp(manejadores: {
  alTocar: (url: string) => void
  alLlegarConLaAppAbierta: (aviso: AvisoRecibido) => void
}): () => void {
  const dejarDeOirToques = escucharALaApp<{ notification?: { data?: Record<string, unknown> } }>(
    'PushNotifications',
    'pushNotificationActionPerformed',
    (accion) => {
      const url = accion?.notification?.data?.url
      if (typeof url === 'string' && url) manejadores.alTocar(url)
    },
  )
  const dejarDeOirLlegadas = escucharALaApp('PushNotifications', 'pushNotificationReceived', (datos) => {
    // En iPhone el sistema ya muestra el aviso arriba (presentationOptions).
    if (plataformaDeLaApp() !== 'android') return
    const aviso = leerAviso(datos)
    if (aviso) manejadores.alLlegarConLaAppAbierta(aviso)
  })
  return () => {
    dejarDeOirToques()
    dejarDeOirLlegadas()
  }
}
