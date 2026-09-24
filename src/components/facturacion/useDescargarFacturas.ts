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
 * los ids.
 *
 * 🔴 23-09 (Nico: «todas las cargas déjalas que sucedan allí y deja la
 * pantalla quieta»): la pantalla ya NO espera el ZIP. Antes el botón giraba
 * y el aviso contaba «100 de 450 PDF» mientras preguntaba cada 2 s, lo mismo
 * que el centro mostraba arriba. Ahora: si el ZIP ya está, baja; si no, se
 * lanza (o se busca el que ya se arma) y se abre el centro en ESE proceso,
 * que es donde se ve el avance y se descarga.
 */

import { useCallback, useState } from 'react'

import { toast } from '@/components/ui/toast'
import { descargarBlob } from '@/lib/reportes/exportables'
import {
  MAXIMO_FACTURAS_POR_ZIP,
  facturacionPorMesService,
} from '@/lib/api/facturacion-por-mes.service'
import { abrirCentroDeProcesos, procesosApi } from '@/lib/api/procesos.service'
import { descargarArchivoDelProceso } from '@/components/procesos/descargar-archivo-del-proceso'

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
  /** El id (o `'lote'`) de lo que se está bajando o lanzando. `null` = nada. */
  descargando: string | null
}

export function useDescargarFacturas(): DescargaDeFacturas {
  const [descargando, setDescargando] = useState<string | null>(null)

  /**
   * El ZIP de más de 50: si el de la tanda ya está, se baja; si no, se abre
   * el centro en el proceso que lo arma. La pantalla no se queda esperando.
   */
  const porElCentro = useCallback(async (ids: string[], procesosConZip: readonly string[]) => {
    if (procesosConZip.length === 1) {
      const p = await procesosApi.ver(procesosConZip[0])
      if (p.estado === 'TERMINADO' && p.archivo && !p.archivo.vencido) {
        await descargarArchivoDelProceso(p.id)
        return
      }
      abrirCentroDeProcesos({ procesoId: p.id })
      return
    }
    // `zipEnSegundoPlano` ya anuncia el proceso: el centro se abre solo.
    const { procesoId } = await facturacionPorMesService.zipEnSegundoPlano(ids)
    abrirCentroDeProcesos({ procesoId })
  }, [])

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
          setDescargando(null)
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

  return { descargarUna, descargarLote, descargando }
}
