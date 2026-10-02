/**
 * Cerrar una solicitud de mantenimiento con las fotos del trabajo (02-10-2026).
 *
 * Nico: «Subir fotos del trabajo» al cerrar, con la MISMA subida real de las
 * fotos del reporte: `subirFotosDelMantenimiento` → `POST
 * /inmobiliaria/mantenimiento/:id/fotos`, una por una, con `destino: 'trabajo'`
 * (la foto va DIRECTO a `completionPhotoUrls`, con su propio tope de 30, y no
 * entra a las del reporte ni descuenta de su tope). Después, el cierre
 * (`PUT :id/complete`) lleva las rutas en `completionPhotoUrls` (hasta 30,
 * `CompleteMantenimientoDto`).
 *
 * Si alguna foto no sube, la solicitud NO se cierra: se devuelve qué foto y
 * por qué, y la persona decide (reintentar o quitarla). `yaSubidas` recuerda
 * las que sí subieron entre un intento y el siguiente, para no subirlas dos
 * veces. Un rechazo del cierre sube tal cual (lo lee el traductor).
 */

import { camposDelError } from '@/lib/errores/traductor-de-errores'
import {
  subirFotosDelMantenimiento,
  type DestinoDeLaFoto,
  type FotoQueFallo,
} from './subir-fotos-del-mantenimiento'

export interface DependenciasDelCierre<Solicitud> {
  subir: (solicitudId: string, foto: File, destino: DestinoDeLaFoto) => Promise<{ ruta: string }>
  completar: (solicitudId: string, cierre: { completionPhotoUrls: string[] }) => Promise<Solicitud>
}

export type ResultadoDelCierre<Solicitud> =
  | { completada: true; solicitud: Solicitud }
  | {
      completada: false
      fallidas: FotoQueFallo[]
      /**
       * La frase del back cuando una foto chocó con el tope del trabajo (400
       * con `campos` en `completionPhotoUrls`): es del CAMPO, no de una foto.
       */
      fraseDelTope?: string
    }

/** El campo del tope de las fotos del trabajo, en el sobre de error del back. */
const CAMPO_DE_LAS_FOTOS_DEL_TRABAJO = 'completionPhotoUrls'

export async function completarConFotos<Solicitud>(
  solicitudId: string,
  fotos: readonly File[],
  yaSubidas: Map<File, string>,
  { subir, completar }: DependenciasDelCierre<Solicitud>,
): Promise<ResultadoDelCierre<Solicitud>> {
  const pendientes = fotos.filter((f) => !yaSubidas.has(f))
  let fraseDelTope: string | undefined
  if (pendientes.length > 0) {
    const subida = await subirFotosDelMantenimiento(
      solicitudId,
      pendientes,
      async (id, foto, destino) => {
        try {
          const r = await subir(id, foto, destino)
          yaSubidas.set(foto, r.ruta)
          return r
        } catch (error) {
          fraseDelTope ??= camposDelError(error).find(
            (c) => (c.campo.split('.').pop() ?? c.campo) === CAMPO_DE_LAS_FOTOS_DEL_TRABAJO,
          )?.mensaje
          throw error
        }
      },
      'trabajo',
    )
    if (subida.fallidas.length > 0) {
      return { completada: false, fallidas: subida.fallidas, ...(fraseDelTope ? { fraseDelTope } : {}) }
    }
  }
  // En el orden en que se eligieron: así se ven después.
  const completionPhotoUrls = fotos.map((f) => yaSubidas.get(f)).filter((r): r is string => !!r)
  const solicitud = await completar(solicitudId, { completionPhotoUrls })
  return { completada: true, solicitud }
}
