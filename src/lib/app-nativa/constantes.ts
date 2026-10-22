/**
 * Lo que comparten la app de iOS/Android (repo `app-movil`) y el front, incluso en
 * el servidor (sin `window`).
 */

/** Esquema propio de la app: `co.leasefy.app://…` (Info.plist y AndroidManifest). */
export const ESQUEMA_DE_LA_APP = 'co.leasefy.app'

/**
 * Marca de la ida a Google desde la app: con `?app=1`, `/auth/callback` no canjea
 * el código (corre en la hoja segura del sistema, sin la sesión de la app) y lo
 * devuelve a la app por `co.leasefy.app://auth/callback`.
 */
export const MARCA_DE_LA_APP_EN_EL_REGRESO = 'app'
