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
 * (`GET /facturacion/documentos.zip?ids=`), hasta `MAXIMO_FACTURAS_POR_ZIP`;
 * más que eso no se pide (el back respondería 400) y quien llama apaga el
 * botón diciendo por qué.
 */

import { useCallback, useState } from 'react'

import { toast } from '@/components/ui/toast'
import { descargarBlob } from '@/lib/reportes/exportables'
import {
  MAXIMO_FACTURAS_POR_ZIP,
  facturacionPorMesService,
} from '@/lib/api/facturacion-por-mes.service'

/** `PRU-3` → `factura-PRU-3.pdf`. Sin caracteres que un sistema de archivos rechace. */
export function nombreDelPdf(numero: string | null): string {
  const limpio = (numero ?? 'sin-numero').replace(/[^A-Za-z0-9-]+/g, '-')
  return `factura-${limpio}.pdf`
}

/** Por qué no se puede bajar el lote, o `null` si se puede. */
export function motivoParaNoDescargarLote(cuantas: number): string | null {
  if (cuantas <= 0) return 'No hay facturas emitidas que descargar.'
  if (cuantas > MAXIMO_FACTURAS_POR_ZIP) {
    return `Son ${cuantas.toLocaleString('es-CO')} facturas: la descarga directa llega hasta ${MAXIMO_FACTURAS_POR_ZIP}. Descárgalas desde la tabla, una por una o por partes.`
  }
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
  /** Una factura → su PDF; varias → el ZIP. */
  descargarLote: (
    facturas: readonly DocumentoParaDescargar[],
    nombreDelZip: string,
  ) => Promise<void>
  /** El id (o `'lote'`) de lo que se está bajando. `null` = nada. */
  descargando: string | null
}

export function useDescargarFacturas(): DescargaDeFacturas {
  const [descargando, setDescargando] = useState<string | null>(null)

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
    async (facturas: readonly DocumentoParaDescargar[], nombreDelZip: string) => {
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
    [descargarUna],
  )

  return { descargarUna, descargarLote, descargando }
}
