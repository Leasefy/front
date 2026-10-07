'use client'

/**
 * 🔴 QA-FACT-CONTA-95 r2 (FA-E-05; main 05-10, «va la a»): «Descargar PDF» de
 * la certificación del mandatario —lo que el propietario necesita para
 * declarar—. Antes sólo había CSV. El mismo botón en el cajón (después de
 * generarla) y en cada fila de la lista: la descarga, el nombre del archivo y
 * el aviso de error salen iguales desde los dos lados.
 */

import { useState } from 'react'
import { FilePdf } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { descargarBlob } from '@/lib/reportes/exportables'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { facturacionElectronicaService } from '@/lib/api/facturacion-electronica.service'

/** `certificacion-Paula-Propietaria-Ruiz-2026-01-01-a-2026-12-31.pdf` (el mismo nombre que pone el back). */
export function nombreDelPdfDeLaCertificacion(nombre: string, desde: string, hasta: string): string {
  const limpio =
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'propietario'
  return `certificacion-${limpio}-${desde.slice(0, 10)}-a-${hasta.slice(0, 10)}.pdf`
}

export function BotonPdfDeLaCertificacion({
  id,
  propietario,
  desde,
  hasta,
  compacto = false,
}: {
  id: string
  propietario: string
  desde: string
  hasta: string
  /** En la fila: sólo el ícono, con su nombre para el lector de pantalla. */
  compacto?: boolean
}) {
  const [bajando, setBajando] = useState(false)
  async function bajar() {
    if (bajando) return
    setBajando(true)
    try {
      const blob = await facturacionElectronicaService.pdfDeLaCertificacion(id)
      descargarBlob(blob, nombreDelPdfDeLaCertificacion(propietario, desde, hasta))
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo descargar la certificación.',
          accion: 'descargar la certificación',
        }),
      )
    } finally {
      setBajando(false)
    }
  }
  return compacto ? (
    <Button
      size="icon"
      variant="ghost"
      hideArrow
      className="h-8 w-8"
      isLoading={bajando}
      aria-label={`Descargar el PDF de la certificación de ${propietario}`}
      title="Descargar el PDF"
      onClick={() => void bajar()}
      data-testid={`cert-pdf-${id}`}
    >
      <FilePdf className="h-4 w-4" aria-hidden="true" />
    </Button>
  ) : (
    <Button
      variant="outline"
      size="sm"
      hideArrow
      isLoading={bajando}
      onClick={() => void bajar()}
      data-testid="cert-pdf"
    >
      Descargar PDF
    </Button>
  )
}
