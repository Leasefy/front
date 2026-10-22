'use client'

/**
 * Subir UN papel del mandato desde la ficha (revisión de diseño del 22-10-2026:
 * «"Ver los papeles" lleva a 5 papeles sin ningún "Subir": es un callejón sin
 * salida»). La ruta del back existe desde el 18-09
 * (`POST /inmobiliaria/captacion/mandatos/:id/documentos`): PDF o imagen de
 * hasta 10 MB; el certificado de tradición exige su fecha de expedición (vale
 * 30 días desde esa fecha, no desde que se sube). En un inmueble con varios
 * dueños, la cédula y el RUT van con el dueño al que le faltan.
 */

import { useId, useState } from 'react'

import { Button } from '@/components/ui'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { CampoDeFecha } from '@/components/facturacion/CampoDeFecha'
import { toast } from '@/components/ui/toast'
import { captacionApi, type PapelQueFalta } from '@/lib/api/crm.service'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { hoyEnColombia } from '@/lib/fechas/fecha-de-la-casa'

const TIPOS_DE_ARCHIVO = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

/** Qué tiene de malo el archivo, o `null` si sirve. */
export function problemaDelArchivo(archivo: File | null): string | null {
  if (!archivo) return 'Elige el archivo.'
  if (!TIPOS_DE_ARCHIVO.includes(archivo.type)) return 'Tiene que ser un PDF o una foto (JPG, PNG o WebP).'
  if (archivo.size > MAX_BYTES) return 'Pesa más de 10 MB: comprímelo o tómale una foto.'
  return null
}

export function SubirPapelDelMandato({
  consignacionId,
  papel,
  dueno,
  onCerrar,
  onSubido,
}: {
  consignacionId: string
  /** El papel que se va a subir; `null` = cerrado. */
  papel: PapelQueFalta | null
  /** De quién es, en palabras («de Jorge Ruiz»), si se sabe. */
  dueno?: string | null
  onCerrar: () => void
  onSubido: () => void
}) {
  const id = useId()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [expedidoEl, setExpedidoEl] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [intento, setIntento] = useState(false)

  const esCertificado = papel?.tipo === 'CERTIFICADO_TRADICION'
  const problema = problemaDelArchivo(archivo)
  const faltaLaFecha = esCertificado && !expedidoEl
  const fechaFutura = esCertificado && expedidoEl > hoyEnColombia()

  const cerrar = () => {
    if (subiendo) return
    setArchivo(null)
    setExpedidoEl('')
    setIntento(false)
    onCerrar()
  }

  const subir = async () => {
    setIntento(true)
    if (!papel || problema || faltaLaFecha || fechaFutura) return
    setSubiendo(true)
    try {
      await captacionApi.subirDocumento(consignacionId, {
        tipo: papel.tipo,
        propietarioId: papel.propietarioId ?? null,
        expedidoEl: esCertificado ? expedidoEl : undefined,
        archivo: archivo as File,
      })
      toast.success(`Listo: se subió ${papel.nombre.toLowerCase()}.`)
      setArchivo(null)
      setExpedidoEl('')
      setIntento(false)
      onSubido()
      onCerrar()
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No pudimos subir el papel.', accion: 'subir el papel' }))
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <Cajon abierto={papel !== null} onOpenChange={(a) => (!a ? cerrar() : undefined)} tamano="sm" data-testid="cajon-subir-papel">
      <CajonCabecera
        titulo={papel ? `Subir ${papel.nombre.toLowerCase()}` : 'Subir un papel'}
        descripcion={dueno ? `Es ${dueno}.` : 'Un PDF o una foto legible, de hasta 10 MB.'}
      />
      <CajonCuerpo className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor={`${id}-archivo`} className="text-body-sm font-medium text-fg">
            El archivo
          </label>
          <input
            id={`${id}-archivo`}
            type="file"
            accept={TIPOS_DE_ARCHIVO.join(',')}
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="block w-full text-body-sm text-fg file:mr-3 file:rounded-full file:border-0 file:bg-surface-muted file:px-3.5 file:py-1.5 file:text-body-sm file:font-medium file:text-fg hover:file:bg-border"
            data-testid="archivo-del-papel"
            aria-invalid={intento && problema ? true : undefined}
            aria-describedby={intento && problema ? `${id}-archivo-error` : undefined}
          />
          {intento && problema ? (
            <p id={`${id}-archivo-error`} className="text-caption text-danger">
              {problema}
            </p>
          ) : (
            <p className="text-caption text-fg-muted">PDF, JPG, PNG o WebP, de hasta 10 MB.</p>
          )}
        </div>

        {esCertificado ? (
          <div className="space-y-1.5">
            <label htmlFor={`${id}-fecha`} className="text-body-sm font-medium text-fg">
              Fecha de expedición
            </label>
            <CampoDeFecha
              id={`${id}-fecha`}
              value={expedidoEl}
              onChange={setExpedidoEl}
              invalido={intento && (faltaLaFecha || fechaFutura)}
              testid="fecha-de-expedicion"
            />
            <p className={intento && (faltaLaFecha || fechaFutura) ? 'text-caption text-danger' : 'text-caption text-fg-muted'}>
              {intento && faltaLaFecha
                ? 'Falta la fecha: es la que dice el certificado, no la de hoy.'
                : intento && fechaFutura
                  ? 'La fecha no puede ser futura.'
                  : 'La que dice el certificado. Vale 30 días desde esa fecha.'}
            </p>
          </div>
        ) : null}
      </CajonCuerpo>
      <CajonPie
        izquierda={
          <Button variant="ghost" size="sm" hideArrow onClick={cerrar} disabled={subiendo}>
            Cancelar
          </Button>
        }
      >
        <Button size="sm" hideArrow onClick={() => void subir()} isLoading={subiendo} data-testid="confirmar-subir-papel">
          {subiendo ? 'Subiendo…' : 'Subir el papel'}
        </Button>
      </CajonPie>
    </Cajon>
  )
}
