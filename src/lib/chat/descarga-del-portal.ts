/**
 * Vuelta 4 (31-10-2026): un PDF SUYO que el chat del portal deja para bajar —
 * un recibo de caja, una factura, una certificación del mandatario— con la
 * sesión de la persona, sin salir del chat.
 *
 * 🔴 El micro dice QUÉ se baja (`datos.ruta` de la tarjeta `bajar_documento`)
 * y aquí se vuelve a validar: sólo una ruta RELATIVA del portal, por GET, de
 * esta lista cerrada. La tarjeta nunca se convierte en un enlace a otro lado, y
 * el back comprueba que el documento sea de quien lo pide.
 */
import { apiClient } from '@/lib/api/client'
import { descargarBlob } from '@/lib/reportes/exportables'

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

const RUTAS_DEL_PORTAL: readonly RegExp[] = [
  new RegExp(`^/portal/recibos/${UUID}/pdf$`, 'i'),
  new RegExp(`^/portal/propietario/facturas/${UUID}/pdf$`, 'i'),
  new RegExp(`^/portal/propietario/certificaciones-del-mandatario/${UUID}/pdf$`, 'i'),
  // Vuelta 4 (31-10): el contrato y el mandato firmados del propietario: la ruta da `{ url }` firmado.
  new RegExp(`^/portal/propietario/contratos/${UUID}/documentos/(contrato|mandato)$`, 'i'),
]

/** Las que responden con un enlace firmado (`{ url }`) en vez del archivo. */
const CON_ENLACE = new RegExp(`^/portal/propietario/contratos/${UUID}/documentos/(contrato|mandato)$`, 'i')

export type Navegar = (url: string) => void

const navegarDeVerdad: Navegar = (url) => {
  window.location.assign(url)
}

/** ¿Es una descarga conocida y segura del portal? */
export function esUnaDescargaDelPortal(ruta: string): boolean {
  if (typeof ruta !== 'string' || ruta.length > 200) return false
  if (!ruta.startsWith('/') || ruta.startsWith('//') || ruta.includes('..') || ruta.includes('\\') || /[\s#@?]/.test(ruta)) return false
  return RUTAS_DEL_PORTAL.some((r) => r.test(ruta))
}

/** El nombre con el que queda el archivo: sin rutas ni caracteres raros. */
function nombreSeguro(nombre: string | undefined): string {
  const limpio = (nombre ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim().slice(0, 120)
  return limpio || 'documento.pdf'
}

/** Baja el PDF de la tarjeta con la sesión de la persona; si la ruta no es del portal, no llama a nada. */
export async function bajarElDocumentoDelPortal(datos: Record<string, string>, navegar: Navegar = navegarDeVerdad): Promise<void> {
  const ruta = datos.ruta ?? ''
  if (!esUnaDescargaDelPortal(ruta)) throw new Error('Este documento no es de tu portal.')
  if (CON_ENLACE.test(ruta)) {
    const r = await apiClient.get<{ url?: unknown }>(ruta)
    const url = typeof r?.url === 'string' ? r.url : ''
    if (!/^https:\/\//i.test(url)) throw new Error('El documento ya no está disponible.')
    navegar(url)
    return
  }
  const blob = await apiClient.getBlob(ruta)
  descargarBlob(blob, nombreSeguro(datos.nombre))
}
