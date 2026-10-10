/**
 * HACER LO MISMO CON VARIAS FILAS (Nico, 10-10-2026: «hay muchas tablas que
 * les hace falta acciones masivas»).
 *
 * Las tablas del directorio, el cobro, la operación y la facturación ya
 * tenían la acción de UNA fila (mandar el extracto, invitar al portal, anular,
 * cerrar…). Lo masivo es esa misma acción sobre lo marcado, sin una ruta
 * nueva del back: el back vuelve a validar cada una, igual que cuando se
 * aprieta en la fila.
 *
 * Corre en el centro de procesos (`correrEnElNavegador`): se ve con su avance
 * y «Detener», y si el back no puede abrir el proceso corre igual. De a pocas
 * a la vez (`concurrencia`), nunca cien peticiones juntas. Una que falla no
 * frena a las demás: al final se dice cuántas salieron y por qué no las otras,
 * con la frase del back (`mensajeParaLaPersona`).
 */

import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { concurrencia, correrEnElNavegador, lanzarEnElCentro } from '@/lib/procesos/en-el-centro'
import type { TipoDelNavegador } from '@/lib/api/procesos.service'

/** Lo que una tabla manda a hacer en bloque: su id y cómo se llama en pantalla. */
export interface FilaEnBloque {
  id: string
  nombre: string
}

export interface FalloEnBloque {
  id: string
  nombre: string
  motivo: string
}

export interface ResultadoEnBloque {
  total: number
  hechos: number
  fallidos: FalloEnBloque[]
  /** Lo pararon («Detener» o «Cancelar» desde el centro) antes de terminar. */
  detenido: boolean
}

export interface HacerEnBloque<T extends FilaEnBloque> {
  /** Cómo se lee en el centro: «Mandar 12 extractos». */
  titulo: string
  tipo?: TipoDelNavegador
  filas: readonly T[]
  /** La acción de UNA fila, la misma que usa su menú. Lanza si no se pudo. */
  tarea: (fila: T) => Promise<unknown>
  /** Qué se estaba haciendo, para el motivo de un fallo: «mandar el extracto». */
  accion: string
  /** Los recursos de `refresco-de-datos` que cambian. */
  recursos?: readonly string[]
  /** Cuántas a la vez. Pocas: cada una puede mandar un correo o escribir en la base. */
  aLaVez?: number
}

export async function hacerEnBloque<T extends FilaEnBloque>({
  titulo,
  tipo = 'ENVIO_MASIVO',
  filas,
  tarea,
  accion,
  recursos,
  aLaVez = 4,
}: HacerEnBloque<T>): Promise<ResultadoEnBloque> {
  let hechos = 0
  const fallidos: FalloEnBloque[] = []
  const { detenido } = await correrEnElNavegador({
    tipo,
    titulo,
    total: filas.length,
    recursos,
    trabajo: async (ctx) => {
      await concurrencia(filas, aLaVez, async (fila) => {
        if (ctx.debeParar()) return
        try {
          await tarea(fila)
          hechos += 1
        } catch (e) {
          fallidos.push({
            id: fila.id,
            nombre: fila.nombre,
            motivo: mensajeParaLaPersona(e, { accion }),
          })
        }
        await ctx.avanzar(hechos + fallidos.length, { total: filas.length })
      })
      return { mensaje: fraseDelBloque({ total: filas.length, hechos, fallidos, detenido: ctx.debeParar() }) }
    },
  })
  return { total: filas.length, hechos, fallidos, detenido }
}

/**
 * El resumen, en palabras: «Listo: 12 de 14. No se pudo con 2: Ana Ruiz
 * (no tiene correo); Luis Pérez (…).» Sin participios ni artículos con
 * género: sirve para extractos, cobros, solicitudes o facturas.
 */
export function fraseDelBloque(r: ResultadoEnBloque): string {
  const listo = `Listo: ${r.hechos} de ${r.total}.`
  const parado = r.detenido ? ' Lo detuvieron antes de terminar.' : ''
  if (r.fallidos.length === 0) return `${listo}${parado}`
  const primeros = r.fallidos.slice(0, 3).map((f) => `${f.nombre} (${minusculaInicial(f.motivo)})`)
  const resto = r.fallidos.length > 3 ? ` y ${r.fallidos.length - 3} más` : ''
  return `${listo}${parado} No se pudo con ${r.fallidos.length}: ${primeros.join('; ')}${resto}.`
}

function minusculaInicial(texto: string): string {
  const t = texto.trim().replace(/\.$/, '')
  return t.charAt(0).toLowerCase() + t.slice(1)
}

/**
 * El aviso del final. `titulo` dice lo que se hizo con las que salieron
 * («Mandamos los extractos»); la descripción, cuántas y por qué no las otras.
 * Ninguna salió → rojo; algunas → amarillo; todas → verde.
 */
export function avisarDelBloque(r: ResultadoEnBloque, titulo: { todas: string; ninguna: string }) {
  const description = fraseDelBloque(r)
  if (r.hechos === 0) toast.error(titulo.ninguna, { description })
  else if (r.fallidos.length > 0 || r.detenido) toast.warning(titulo.todas, { description })
  else toast.success(titulo.todas, { description })
}

/**
 * Lo masivo que hace el SERVIDOR (los envíos a terceros: extractos,
 * invitaciones, estados de cuenta). Esos tienen tope por persona en el back
 * (`envio`: 30 cada 5 minutos), así que lo marcado viaja en UNA petición y el
 * back lo recorre en el centro de procesos, que muestra el avance, deja
 * «Detener» y, si alguno no salió, el CSV de quién y por qué.
 *
 * Avisa al terminar: verde si salieron todas, amarillo si el centro dejó el
 * detalle de las que no, rojo si falló entero. `true` si arrancó.
 */
export async function enBloqueEnElServidor({
  titulo,
  pedir,
  accion,
  recursos,
  alTerminar,
}: {
  titulo: string
  pedir: () => Promise<{ procesoId: string }>
  /** «mandar los extractos»: para el porqué si no arranca. */
  accion: string
  recursos?: readonly string[]
  alTerminar?: () => void
}): Promise<boolean> {
  try {
    await lanzarEnElCentro({
      titulo,
      tipoDeProceso: 'ENVIO_MASIVO',
      pedir,
      recursos,
      alTerminar: (p) => {
        const description = p.mensaje ?? undefined
        if (p.estado === 'FALLO') toast.error(titulo, { description })
        else if (p.estado === 'CANCELADO') toast.warning(titulo, { description: description ?? 'Lo detuvieron antes de terminar.' })
        else if (p.archivo) toast.warning(titulo, { description: `${description ?? ''} Baja el detalle en el centro de procesos.`.trim() })
        else toast.success(titulo, { description })
        alTerminar?.()
      },
    })
    return true
  } catch (e) {
    toast.error(`No arrancó: ${titulo.charAt(0).toLowerCase()}${titulo.slice(1)}`, {
      description: mensajeParaLaPersona(e, { accion }),
    })
    return false
  }
}
