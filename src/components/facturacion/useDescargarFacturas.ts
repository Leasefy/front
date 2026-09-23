'use client'

/**
 * Bajar el documento de una factura emitida, o el lote de una emisión.
 *
 * 🔴 Nico, 22-09: «ya acabo de facturar y yo dónde puedo descargar el lote o
 * esa factura en sí, porque literal no deja ver en ningún lado; y pues si ya
 * acabó, en el drawer debería de verse, y también ahí donde dice estado».
 *
 * Tres lugares piden lo mismo —la columna ESTADO de la fila, el cajón y el
 * aviso «Se emitió N facturas»—, así que la descarga vive acá una sola vez: el
 * nombre del archivo, el aviso de error y el «descargando…» no pueden salir
 * distintos según desde dónde se apretó.
 *
 * Una factura → su PDF (`GET /facturacion/:id/pdf`). Varias → un ZIP
 * (`GET /facturacion/documentos.zip?ids=`), hasta `MAXIMO_FACTURAS_POR_ZIP`.
 *
 * 🔴 Más que eso (22-09) ya NO se apaga: el ZIP se arma en el CENTRO DE
 * PROCESOS y se baja de ahí. Si la corrida fue de una sola tanda, su proceso
 * ya lo está armando y se abre ése; si fue de varias, se lanza uno con todos
 * los ids. Mientras tanto el botón dice cuánto va, y si la persona se va de
 * la pantalla el archivo la espera en el botón de procesos de arriba.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { toast } from '@/components/ui/toast'
import { descargarBlob } from '@/lib/reportes/exportables'
import {
  MAXIMO_FACTURAS_POR_ZIP,
  facturacionPorMesService,
} from '@/lib/api/facturacion-por-mes.service'
import { anunciarProceso, procesosApi } from '@/lib/api/procesos.service'
import type { Proceso } from '@/lib/api/procesos.types'
import { descargarArchivoDelProceso } from '@/components/procesos/descargar-archivo-del-proceso'

/** Cada cuánto se pregunta por el ZIP que arma el centro. */
export const MS_ENTRE_CONSULTAS_DEL_ZIP = 2_000

/** ¿Este lote se arma en el centro de procesos en vez de bajarse directo? */
export function vaPorElCentro(cuantas: number): boolean {
  return cuantas > MAXIMO_FACTURAS_POR_ZIP
}

/** `PRU-3` → `factura-PRU-3.pdf`. Sin caracteres que un sistema de archivos rechace. */
export function nombreDelPdf(numero: string | null): string {
  const limpio = (numero ?? 'sin-numero').replace(/[^A-Za-z0-9-]+/g, '-')
  return `factura-${limpio}.pdf`
}

/** Por qué no se puede bajar el lote, o `null` si se puede. */
export function motivoParaNoDescargarLote(cuantas: number): string | null {
  if (cuantas <= 0) return 'No hay facturas emitidas que descargar.'
  return null
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'No se pudo descargar el documento.'
}

/** Lo que hace falta para bajar una factura: su id y el número que se ve. */
export interface DocumentoParaDescargar {
  facturaId: string
  numero: string | null
}

export interface DescargaDeFacturas {
  /** El PDF de una factura. */
  descargarUna: (facturaId: string, numero: string | null) => Promise<void>
  /**
   * Una factura → su PDF; varias → el ZIP; más del tope → el ZIP del centro
   * de procesos (el de la tanda si hay uno solo en `procesosConZip`).
   */
  descargarLote: (
    facturas: readonly DocumentoParaDescargar[],
    nombreDelZip: string,
    opciones?: { procesosConZip?: readonly string[] },
  ) => Promise<void>
  /** El id (o `'lote'`) de lo que se está bajando. `null` = nada. */
  descargando: string | null
  /** El proceso del centro que está armando el ZIP, con su avance. */
  zipEnElCentro: Proceso | null
}

export function useDescargarFacturas(): DescargaDeFacturas {
  const [descargando, setDescargando] = useState<string | null>(null)
  const [zipEnElCentro, setZipEnElCentro] = useState<Proceso | null>(null)
  // Se deja de preguntar si la pantalla se desmonta: el archivo igual queda
  // en el centro de procesos.
  const montado = useRef(true)
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  const porElCentro = useCallback(
    async (ids: string[], procesosConZip: readonly string[]) => {
      const procesoId =
        procesosConZip.length === 1
          ? procesosConZip[0]
          : (await facturacionPorMesService.zipEnSegundoPlano(ids)).procesoId
      anunciarProceso()
      toast.info('Armando el ZIP en el centro de procesos.', {
        description: 'Si te vas de esta pantalla, lo bajas desde el botón de procesos de arriba.',
      })
      for (;;) {
        const p = await procesosApi.ver(procesoId)
        if (!montado.current) return
        setZipEnElCentro(p)
        if (p.estado === 'TERMINADO' && p.archivo && !p.archivo.vencido) {
          await descargarArchivoDelProceso(p.id)
          return
        }
        if (p.estado === 'TERMINADO' || p.estado === 'FALLO' || p.estado === 'CANCELADO') {
          toast.error(p.mensaje ?? 'El ZIP no se pudo armar.')
          return
        }
        await new Promise((r) => setTimeout(r, MS_ENTRE_CONSULTAS_DEL_ZIP))
      }
    },
    [],
  )

  const descargarUna = useCallback(
    async (facturaId: string, numero: string | null) => {
      setDescargando(facturaId)
      try {
        const blob = await facturacionPorMesService.pdfDeLaFactura(facturaId)
        descargarBlob(blob, nombreDelPdf(numero))
      } catch (error) {
        toast.error(mensajeDeError(error))
      } finally {
        setDescargando(null)
      }
    },
    [],
  )

  const descargarLote = useCallback(
    async (
      facturas: readonly DocumentoParaDescargar[],
      nombreDelZip: string,
      opciones: { procesosConZip?: readonly string[] } = {},
    ) => {
      const motivo = motivoParaNoDescargarLote(facturas.length)
      if (motivo) {
        toast.error(motivo)
        return
      }
      if (facturas.length === 1) {
        await descargarUna(facturas[0].facturaId, facturas[0].numero)
        return
      }
      setDescargando('lote')
      if (vaPorElCentro(facturas.length)) {
        try {
          await porElCentro(
            facturas.map((f) => f.facturaId),
            opciones.procesosConZip ?? [],
          )
        } catch (error) {
          toast.error(mensajeDeError(error))
        } finally {
          if (montado.current) {
            setDescargando(null)
            setZipEnElCentro(null)
          }
        }
        return
      }
      try {
        const blob = await facturacionPorMesService.zipDeFacturas(
          facturas.map((f) => f.facturaId),
        )
        descargarBlob(blob, nombreDelZip)
      } catch (error) {
        toast.error(mensajeDeError(error))
      } finally {
        setDescargando(null)
      }
    },
    [descargarUna, porElCentro],
  )

  return { descargarUna, descargarLote, descargando, zipEnElCentro }
}
