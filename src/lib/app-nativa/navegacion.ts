/**
 * Navegación en la app de iOS/Android: el botón «atrás» de Android y los enlaces
 * de leasefy.co que abren la app.
 */
import { llamarALaApp } from './puente'

/**
 * Lo que está abierto encima de la pantalla (cajones, diálogos, menús de Radix).
 * Radix los cierra con Escape.
 */
const ABIERTO_ENCIMA = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
  '[data-radix-popper-content-wrapper]',
  '[data-vaul-drawer][data-state="open"]',
].join(', ')

/**
 * El botón «atrás» de Android, como en una app nativa: primero cierra lo que está
 * abierto encima; si no hay nada, vuelve a la pantalla anterior; en la primera
 * pantalla, manda la app al fondo (no la cierra: al volver sigue donde estaba).
 */
export function manejarBotonAtras(puedeVolver: boolean): void {
  if (document.querySelector(ABIERTO_ENCIMA)) {
    const destino = (document.activeElement as HTMLElement | null) ?? document.body
    destino.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }))
    return
  }
  if (puedeVolver) {
    window.history.back()
    return
  }
  void llamarALaApp('App', 'minimizeApp').catch(() => {})
}

/**
 * `https://leasefy.co/inquilino/pagos?x=1` → `/inquilino/pagos?x=1`. Acepta también
 * rutas relativas (`/panel/...`, como las manda el back en los avisos). `null` si
 * es de otro sitio.
 */
export function rutaInternaDeLeasefy(direccion: string): string | null {
  if (direccion.startsWith('/') && !direccion.startsWith('//')) return direccion
  let url: URL
  try {
    url = new URL(direccion)
  } catch {
    return null
  }
  const esDeLeasefy =
    url.origin === window.location.origin || url.hostname === 'leasefy.co' || url.hostname === 'www.leasefy.co'
  if (!esDeLeasefy || (url.protocol !== 'https:' && url.protocol !== 'http:')) return null
  return `${url.pathname}${url.search}${url.hash}`
}
