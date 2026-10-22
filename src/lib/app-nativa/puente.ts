/**
 * El puente con la app de Leasefy para iOS y Android (repo `app-movil`, Capacitor 8).
 *
 * La app abre leasefy.co dentro de una vista web nativa y le inyecta
 * `window.Capacitor`. Desde aquí se le habla con dos funciones del puente nativo
 * (`nativePromise` y `addListener`), sin instalar ningún paquete de Capacitor en el
 * front: en el navegador `window.Capacitor` no existe y nada de esto corre.
 *
 * Los plugins que trae la app: App, Browser, Filesystem, PushNotifications, Share,
 * SplashScreen, SystemBars (de Capacitor) y LeasefyNativo (propio: entrar con
 * Google/Apple y si hay Firebase).
 */

export type PlataformaDeLaApp = 'ios' | 'android'

interface ManejadorDelEscucha {
  remove: () => Promise<void> | void
}

interface CapacitorEnLaPagina {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
  nativePromise?: (plugin: string, metodo: string, opciones?: Record<string, unknown>) => Promise<unknown>
  addListener?: (plugin: string, evento: string, alOir: (datos: unknown) => void) => ManejadorDelEscucha | number
  removeListener?: (plugin: string, idDelEscucha: number, evento: string, alOir: (datos: unknown) => void) => void
}

/** Marca que la app agrega al user-agent (`appendUserAgent` de capacitor.config.ts). */
export const MARCA_DEL_USER_AGENT = /LeasefyApp\/\d+/

function capacitor(): CapacitorEnLaPagina | null {
  if (typeof window === 'undefined') return null
  const cap = (window as unknown as { Capacitor?: CapacitorEnLaPagina }).Capacitor
  return cap ?? null
}

/** ¿Esta página corre dentro de la app de iOS o Android? */
export function esLaApp(): boolean {
  const cap = capacitor()
  return Boolean(cap?.isNativePlatform?.() && cap.nativePromise)
}

export function plataformaDeLaApp(): PlataformaDeLaApp | null {
  if (!esLaApp()) return null
  const plataforma = capacitor()?.getPlatform?.()
  return plataforma === 'ios' || plataforma === 'android' ? plataforma : null
}

/**
 * La plataforma según el user-agent de la petición (en el servidor, sin `window`).
 * `null` si no es la app.
 */
export function plataformaPorElUserAgent(userAgent: string | null | undefined): PlataformaDeLaApp | null {
  if (!userAgent || !MARCA_DEL_USER_AGENT.test(userAgent)) return null
  return /Android/i.test(userAgent) ? 'android' : 'ios'
}

/** Llama un método nativo. Fuera de la app rechaza con `NO_ES_LA_APP`. */
export async function llamarALaApp<T = unknown>(
  plugin: string,
  metodo: string,
  opciones: Record<string, unknown> = {},
): Promise<T> {
  const cap = capacitor()
  if (!cap?.nativePromise || !esLaApp()) {
    throw Object.assign(new Error('Esto sólo existe dentro de la app de Leasefy.'), { code: 'NO_ES_LA_APP' })
  }
  return (await cap.nativePromise(plugin, metodo, opciones)) as T
}

/**
 * Escucha un evento nativo (p. ej. `App`/`backButton`). Devuelve con qué dejar de
 * escuchar; fuera de la app no hace nada.
 */
export function escucharALaApp<T = unknown>(
  plugin: string,
  evento: string,
  alOir: (datos: T) => void,
): () => void {
  const cap = capacitor()
  if (!cap?.addListener || !esLaApp()) return () => {}
  const manejador = (datos: unknown) => alOir(datos as T)
  const escucha = cap.addListener(plugin, evento, manejador)
  return () => {
    if (typeof escucha === 'number') {
      cap.removeListener?.(plugin, escucha, evento, manejador)
    } else {
      void escucha?.remove?.()
    }
  }
}

/** El código de error que manda un plugin nativo al rechazar (`CANCELADO`, `FALLO`…). */
export function codigoDelError(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}
