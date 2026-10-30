/**
 * D1 (pregunta 54 de Nico, 30-10-2026): lo que una acción del chat deja para
 * bajar (la exógena aprobada, el archivo de un proceso del Centro de procesos)
 * se baja DENTRO del chat, con la sesión de la persona, sin ir a otra pantalla.
 *
 * 🔴 El micro dice QUÉ se baja (`descarga` en la tarjeta del resultado) y aquí
 * se vuelve a validar: sólo una ruta RELATIVA del back, por GET, de la lista de
 * descargas conocidas (la misma del micro, `descargas-del-chat.ts`). Una
 * tarjeta del chat nunca se convierte en un enlace a otro lado.
 */
import { apiClient } from '@/lib/api/client'
import { descargarBlob } from '@/lib/reportes/exportables'

export type FormaDeLaDescarga = 'archivo' | 'enlace'

export interface DescargaDelChat {
  ruta: string
  nombre: string
  forma: FormaDeLaDescarga
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

const RUTAS_DE_DESCARGA: ReadonlyArray<{ patron: RegExp; forma: FormaDeLaDescarga }> = [
  { patron: new RegExp(`^/inmobiliaria/procesos/${UUID}/descarga$`, 'i'), forma: 'enlace' },
  { patron: /^\/inmobiliaria\/contabilidad\/exogena\/[0-9]{4}\/archivo\?anio=[0-9]{4}$/, forma: 'archivo' },
  { patron: new RegExp(`^/inmobiliaria/documents/${UUID}/pdf$`, 'i'), forma: 'archivo' },
]

/** La forma si la ruta es una descarga conocida y segura del back; `null` si no. */
export function formaDeLaRutaDeDescarga(ruta: string): FormaDeLaDescarga | null {
  if (typeof ruta !== 'string' || ruta.length > 200) return null
  if (!ruta.startsWith('/') || ruta.startsWith('//') || ruta.includes('..') || ruta.includes('\\') || /[\s#@]/.test(ruta)) return null
  return RUTAS_DE_DESCARGA.find((r) => r.patron.test(ruta))?.forma ?? null
}

/** Lee la `descarga` de la tarjeta: `null` si falta, viene rota o no es una ruta conocida. */
export function leerDescargaDelChat(v: unknown): DescargaDelChat | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const ruta = typeof o.ruta === 'string' ? o.ruta : ''
  const nombre = typeof o.nombre === 'string' ? o.nombre.trim() : ''
  const forma = formaDeLaRutaDeDescarga(ruta)
  // La forma la decide la ruta, no lo que diga el cuerpo.
  if (!forma || !nombre || o.forma !== forma) return null
  return { ruta, nombre, forma }
}

export type Navegar = (url: string) => void

const navegarDeVerdad: Navegar = (url) => {
  window.location.assign(url)
}

/**
 * Baja el archivo con la sesión de la persona: `archivo` = GET del blob y se
 * guarda con su nombre; `enlace` = GET de `{ url }` firmado (como el Centro de
 * procesos), que el navegador baja como adjunto sin salir del chat.
 */
export async function bajarLaDescargaDelChat(d: DescargaDelChat, navegar: Navegar = navegarDeVerdad): Promise<void> {
  if (formaDeLaRutaDeDescarga(d.ruta) !== d.forma) throw new Error('Esta descarga no es de Leasefy.')
  if (d.forma === 'archivo') {
    const blob = await apiClient.getBlob(d.ruta)
    descargarBlob(blob, d.nombre)
    return
  }
  const r = await apiClient.get<{ url?: unknown }>(d.ruta)
  const url = typeof r?.url === 'string' ? r.url : ''
  if (!/^https:\/\//i.test(url)) throw new Error('El archivo ya no está disponible.')
  navegar(url)
}
