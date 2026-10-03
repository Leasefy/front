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
import { createLoggerWithNamespace } from '@/lib/utils/logger'
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

/**
 * Cancelar el cierre: borrar las fotos del trabajo que subió ESE intento
 * (Nico, 02-10-2026).
 *
 * Si una foto falló y la persona cancela, las que SÍ subieron quedaban en
 * «Fotos de después» y ocupaban cupo. Ahora se borran con `DELETE :id/fotos`
 * (`destino: 'trabajo'`), sólo las de `yaSubidas` —lo que subió este intento—;
 * las que la solicitud ya tenía no se tocan.
 *
 * Una por una (el back reescribe la lista de la fila en cada borrado: en
 * paralelo se estorbarían). Nunca se rechaza: un borrado que falla no frena
 * nada —el diálogo ya se cerró— y queda escrito en el log. `yaSubidas` queda
 * vacío de una, antes de empezar: un segundo «Cancelar» no repite nada.
 */
export interface DependenciasDelDeshacer {
  borrar: (solicitudId: string, ruta: string, destino: DestinoDeLaFoto) => Promise<unknown>
  /** Dónde queda escrito un borrado que falló. Por defecto, el log del panel. */
  anotar?: (mensaje: string, error: unknown) => void
}

export interface ResultadoDelDeshacer {
  borradas: string[]
  fallidas: string[]
}

const log = createLoggerWithNamespace('Mantenimiento')

export async function borrarLasDelIntento(
  solicitudId: string,
  yaSubidas: Map<File, string>,
  { borrar, anotar = (mensaje, error) => log.warn(mensaje, error) }: DependenciasDelDeshacer,
): Promise<ResultadoDelDeshacer> {
  const rutas = [...new Set(yaSubidas.values())]
  yaSubidas.clear()
  const resultado: ResultadoDelDeshacer = { borradas: [], fallidas: [] }
  for (const ruta of rutas) {
    try {
      await borrar(solicitudId, ruta, 'trabajo')
      resultado.borradas.push(ruta)
    } catch (error) {
      resultado.fallidas.push(ruta)
      try {
        anotar(
          `No se pudo borrar la foto del trabajo «${ruta}» de la solicitud ${solicitudId} al cancelar el cierre.`,
          error,
        )
      } catch {
        // El log nunca tumba el cierre del diálogo.
      }
    }
  }
  return resultado
}
