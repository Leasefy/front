/**
 * Subir las fotos de una solicitud de mantenimiento que YA existe (02-10-2026).
 *
 * 🔴 Por qué existe: el formulario guardaba `URL.createObjectURL(file)` en
 * `photoUrls` — un `blob:` que sólo abre la pestaña que lo creó. Nadie más (ni
 * el resto del equipo, ni el propietario, ni la misma persona mañana) podía
 * ver esas fotos. Nico: «súbelas de verdad a Storage».
 *
 * Se suben DESPUÉS de crear la solicitud, una por una, como las fotos de un
 * inmueble (`src/lib/api/property-photos.ts`): la solicitud ya existe en este
 * punto, así que una foto que falla NUNCA puede verse como «no se creó la
 * solicitud». Cada falla se junta con su motivo, por el traductor: el rechazo
 * del back tal cual, un 5xx «de nuestro lado» con la referencia y «conexión»
 * sólo sin respuesta. La promesa nunca se rechaza por una foto.
 */

import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { errorDeLaFoto } from './limites-del-mantenimiento'

export interface FotoQueFallo {
  nombre: string
  motivo: string
}

export interface ResultadoDeLasFotos {
  subidas: number
  fallidas: FotoQueFallo[]
}

/**
 * A dónde va cada foto (`POST :id/fotos`, campo `destino`; Nico, 02-10-2026):
 * `reporte` (las del problema, el de siempre) o `trabajo` (las del trabajo
 * terminado, al cerrar). Por defecto `reporte`: lo que ya existía no cambia.
 */
export type DestinoDeLaFoto = 'reporte' | 'trabajo'

export async function subirFotosDelMantenimiento(
  solicitudId: string,
  fotos: readonly File[],
  subir: (solicitudId: string, foto: File, destino: DestinoDeLaFoto) => Promise<unknown>,
  destino: DestinoDeLaFoto = 'reporte',
): Promise<ResultadoDeLasFotos> {
  const resultado: ResultadoDeLasFotos = { subidas: 0, fallidas: [] }
  // Una por una: el orden en que se eligieron es el orden en que se ven.
  for (const foto of fotos) {
    const invalida = errorDeLaFoto(foto)
    if (invalida) {
      resultado.fallidas.push({ nombre: foto.name, motivo: invalida })
      continue
    }
    try {
      await subir(solicitudId, foto, destino)
      resultado.subidas += 1
    } catch (error) {
      resultado.fallidas.push({
        nombre: foto.name,
        motivo: mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo subir la foto. Prueba de nuevo en un momento.',
          accion: `subir «${foto.name}»`,
        }),
      })
    }
  }
  return resultado
}

/** La línea que dice qué fotos no subieron y por qué (una por foto). */
export function lasQueNoSubieron(fallidas: readonly FotoQueFallo[]): string {
  return fallidas.map((f) => `«${f.nombre}»: ${f.motivo}`).join(' · ')
}
