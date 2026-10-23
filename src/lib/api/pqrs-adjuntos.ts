/**
 * Adjuntos de una PQRS (PQRS-FIX, 04-10-2026: SO-18). Hasta hoy el portal
 * aceptaba fotos y las DESCARTABA al enviar («los adjuntos estarán disponibles
 * próximamente»). Ahora se suben de verdad, una por una, DESPUÉS de radicar:
 *   · panel  → `POST /inmobiliaria/pqrs/:id/adjuntos`
 *   · portal → `POST /pqrs/:id/adjuntos` (inquilino y propietario)
 * El back decide el tipo por los BYTES (un `.exe` renombrado no entra) y pone el
 * techo de 10 MB; esto sólo adelanta el mismo aviso antes de subir.
 */
import { ApiError, getAccessToken } from './client'
import { cabecerasDeLaCuenta } from '@/lib/auth/cuenta-activa'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

export const TIPOS_DE_ADJUNTO = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export const MAX_BYTES_DE_ADJUNTO = 10 * 1024 * 1024
/** Para el `accept` del input: sólo una pista, la regla la pone el back. */
export const ACCEPT_DE_ADJUNTOS = '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf'

/** La frase del problema de este archivo, o `null` si se puede intentar subir. */
export function problemaDelAdjunto(archivo: File): string | null {
  if (archivo.size > MAX_BYTES_DE_ADJUNTO) {
    return `«${archivo.name}» pesa más de 10 MB. Envía una foto más liviana o un PDF de menos de 10 MB.`
  }
  if (!(TIPOS_DE_ADJUNTO as readonly string[]).includes(archivo.type)) {
    return `«${archivo.name}» no es una foto ni un PDF. Sólo se reciben imágenes (JPG, PNG o WEBP) y PDF.`
  }
  return null
}

/**
 * Los adjuntos de una PQRS aceptan además VIDEOS (QA en Chrome, 21-10-2026: el
 * inquilino no podía mandar el video de la fuga). 20 MB, el techo del back y el
 * mismo de los videos del mantenimiento. Las fotos y los PDF siguen en 10 MB.
 * Sólo para la PQRS: los documentos del proveedor siguen con `problemaDelAdjunto`.
 */
export const TIPOS_DE_VIDEO_DE_PQRS = ['video/mp4', 'video/quicktime', 'video/webm'] as const
export const MAX_BYTES_DE_VIDEO_DE_PQRS = 20 * 1024 * 1024
export const ACCEPT_DE_ADJUNTOS_DE_PQRS = `${ACCEPT_DE_ADJUNTOS},.mp4,.mov,.webm,video/mp4,video/quicktime,video/webm`

const EXTENSION_DE_VIDEO: Record<string, (typeof TIPOS_DE_VIDEO_DE_PQRS)[number]> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
}

/** ¿Es un video? Por el tipo que dice el navegador o, si viene vacío, por la extensión. */
export function esVideoDePqrs(archivo: { name: string; type: string }): boolean {
  if ((TIPOS_DE_VIDEO_DE_PQRS as readonly string[]).includes(archivo.type)) return true
  if (archivo.type) return false
  const ext = archivo.name.split('.').pop()?.toLowerCase() ?? ''
  return ext in EXTENSION_DE_VIDEO
}

/** La frase del problema de un adjunto de PQRS (foto, video o PDF), o `null`. */
export function problemaDelAdjuntoDePqrs(archivo: File): string | null {
  if (esVideoDePqrs(archivo)) {
    return archivo.size > MAX_BYTES_DE_VIDEO_DE_PQRS
      ? `«${archivo.name}» pesa más de 20 MB. Envía un video más corto (unos 20 segundos).`
      : null
  }
  if (archivo.size > MAX_BYTES_DE_ADJUNTO) {
    return `«${archivo.name}» pesa más de 10 MB. Envía una foto más liviana o un PDF de menos de 10 MB.`
  }
  if (!(TIPOS_DE_ADJUNTO as readonly string[]).includes(archivo.type)) {
    return `«${archivo.name}» no es una foto, un video ni un PDF. Sólo se reciben fotos (JPG, PNG o WEBP), videos (MP4, MOV o WEBM) y PDF.`
  }
  return null
}

export interface AdjuntoSubido {
  id: string
  nombre: string
  tipo: string
  tamano: number
  subidoAt: string
}

/** Sube UN archivo a la ruta de adjuntos. Lanza `ApiError` con la frase del back. */
export async function subirAdjuntoDePqrs(ruta: string, archivo: File): Promise<AdjuntoSubido> {
  const formulario = new FormData()
  formulario.append('archivo', archivo)
  const token = getAccessToken()
  let respuesta: Response
  try {
    respuesta = await fetch(`${BACKEND_URL}${ruta}`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...cabecerasDeLaCuenta() },
      body: formulario,
    })
  } catch {
    throw new ApiError(0, `No pudimos subir «${archivo.name}»: revisa tu conexión e inténtalo de nuevo.`)
  }
  const cuerpo = (await respuesta.json().catch(() => ({}))) as Record<string, unknown>
  if (!respuesta.ok) {
    const mensaje =
      typeof cuerpo.message === 'string'
        ? cuerpo.message
        : respuesta.status === 413
          ? `«${archivo.name}» pesa demasiado.`
          : `No se pudo subir «${archivo.name}».`
    throw new ApiError(respuesta.status, mensaje, typeof cuerpo.code === 'string' ? cuerpo.code : undefined)
  }
  return cuerpo as unknown as AdjuntoSubido
}
