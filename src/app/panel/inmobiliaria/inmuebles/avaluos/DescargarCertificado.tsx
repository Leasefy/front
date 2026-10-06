'use client'

/**
 * «Descargar certificado» de UNA fila de Avalúos (PROMESAS-Y-DIRECTOR, 05-10-2026).
 *
 * El back ya exponía el PDF firmado (`GET /inmobiliaria/avaluos/:id/certificate`,
 * acotado a la inmobiliaria por su correo) y la lista no lo ofrecía: la única
 * forma de tenerlo era buscar el correo. Va sólo en las filas con el certificado
 * firmado (`firmado` y `entregado`); la página decide cuáles.
 *
 * Cada fila tiene su propio «Descargando…» (otra descarga no apaga ésta) y su
 * error en un aviso, por el traductor de errores: un 502 dice que el servicio de
 * avalúos no responde, nunca «Avaluo service unreachable».
 */

import { useState } from 'react'
import { DownloadSimple } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { avaluosApi } from '@/lib/api/inmobiliaria.service'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { descargarBlob } from '@/lib/reportes/exportables'
import { useI18n } from '@/lib/i18n'

const NS = 'inmobiliaria.ai.workspace.pages.avaluos'

/** Los estados en los que el certificado ya está firmado. */
export const ESTADOS_CON_CERTIFICADO: readonly string[] = ['firmado', 'entregado']

export function tieneCertificado(estado: string): boolean {
  return ESTADOS_CON_CERTIFICADO.includes(estado)
}

export function DescargarCertificado({ id, propietario }: { id: string; propietario: string }) {
  const { t } = useI18n()
  const [descargando, setDescargando] = useState(false)

  const descargar = async () => {
    setDescargando(true)
    try {
      const pdf = await avaluosApi.certificado(id)
      descargarBlob(pdf, `certificado-avaluo-${id}.pdf`)
    } catch (err) {
      toast.error(
        mensajeParaLaPersona(err, {
          porDefecto: t(`${NS}.errorDescargar`),
          accion: 'descargar el certificado',
        }),
      )
    } finally {
      setDescargando(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      hideArrow
      isLoading={descargando}
      disabled={descargando}
      aria-label={`${t(`${NS}.descargarCertificadoDe`)} ${propietario}`}
      onClick={() => void descargar()}
      data-testid={`avaluo-descargar-${id}`}
    >
      {!descargando && <DownloadSimple className="size-4" aria-hidden="true" />}
      {descargando ? t(`${NS}.descargandoCertificado`) : t(`${NS}.descargarCertificado`)}
    </Button>
  )
}
