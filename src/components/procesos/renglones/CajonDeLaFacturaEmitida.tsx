'use client'

/**
 * La factura emitida, en un cajón (centro de procesos, Nico 20-10-2026: «Ver
 * detalle» abre ESA factura, no la pantalla de Facturación). Se pide por su id
 * (`GET /inmobiliaria/facturacion/:id`) y se puede bajar el PDF desde acá.
 */

import { useEffect, useState } from 'react'
import { DownloadSimple } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { facturacionPorMesService, type FacturaEmitidaDetalle } from '@/lib/api/facturacion-por-mes.service'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { formatCurrency } from '@/lib/format'
import { mesEnTitulo } from '@/lib/utils/mes'
import { toast } from 'sonner'

export function CajonDeLaFacturaEmitida({ id, onCerrar }: { id: string | null; onCerrar: () => void }) {
  const [factura, setFactura] = useState<FacturaEmitidaDetalle | null>(null)
  const [fallo, setFallo] = useState<unknown>(null)
  const [bajando, setBajando] = useState(false)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!id) return
    let vivo = true
    setFactura(null)
    setFallo(null)
    facturacionPorMesService
      .factura(id)
      .then((f) => vivo && setFactura(f))
      .catch((e) => vivo && setFallo(e))
    return () => {
      vivo = false
    }
  }, [id, intento])

  const bajarPdf = async () => {
    if (!factura) return
    setBajando(true)
    try {
      const blob = await facturacionPorMesService.pdfDeLaFactura(factura.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${numeroDeLaFacturaEmitida(factura) ?? 'factura'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo bajar el PDF.', accion: 'bajar el PDF' }))
    } finally {
      setBajando(false)
    }
  }

  const numero = factura ? numeroDeLaFacturaEmitida(factura) : null
  const titulo = numero ? `Factura ${numero}` : 'Factura'
  return (
    <Cajon abierto={id !== null} onOpenChange={(v) => !v && onCerrar()} data-testid="cajon-factura-emitida">
      <CajonCabecera
        titulo={titulo}
        descripcion={factura ? `${factura.terceroNombre} · ${factura.destinatario === 'PROPIETARIO' ? 'Propietario' : 'Inquilino'}` : undefined}
      />
      <CajonCuerpo className="space-y-5">
        {fallo ? (
          <FalloDeCarga error={fallo} onReintentar={() => setIntento((n) => n + 1)} />
        ) : !factura ? (
          <div className="space-y-3" aria-label="Cargando la factura" role="status">
            {[0, 1, 2].map((k) => (
              <div key={k} className="h-10 animate-pulse rounded-md bg-surface-muted" />
            ))}
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body-sm">
              <Dato etiqueta="Inmueble" valor={factura.inmueble} ancho />
              <Dato etiqueta="Mes" valor={mesEnTitulo(factura.mes)} />
              <Dato etiqueta="Documento" valor={factura.terceroDocumento ?? 'Sin registrar'} />
              {factura.notaCredito && <Dato etiqueta="Anulada con" valor={`Nota crédito ${factura.notaCredito.numero}`} ancho />}
            </dl>
            <div>
              <p className="mb-2 text-label uppercase text-fg-subtle">Renglones</p>
              <ul className="divide-y divide-border rounded-md border border-border">
                {factura.lineas.map((l, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 px-3 py-2 text-body-sm">
                    <span className="min-w-0 text-fg">{l.nombre}</span>
                    <span className="shrink-0 font-mono tabular-nums text-fg">
                      {l.resta ? '−' : ''}
                      {formatCurrency(l.valorCop)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="space-y-1.5 text-body-sm">
              <Fila etiqueta="Subtotal" valor={factura.subtotalCop} />
              {factura.descuentoCop > 0 && <Fila etiqueta="Descuento" valor={-factura.descuentoCop} />}
              {factura.ivaCop > 0 && <Fila etiqueta="IVA" valor={factura.ivaCop} />}
              {factura.retencionesCop > 0 && <Fila etiqueta="Retenciones" valor={-factura.retencionesCop} />}
              <Fila etiqueta="Total" valor={factura.totalCop} fuerte />
            </dl>
          </>
        )}
      </CajonCuerpo>
      {factura && (
        <CajonPie>
          <Button variant="secondary" onClick={() => void bajarPdf()} disabled={bajando} data-testid="bajar-pdf-factura">
            <DownloadSimple className="h-4 w-4" aria-hidden="true" />
            {bajando ? 'Descargando…' : 'Bajar el PDF'}
          </Button>
        </CajonPie>
      )}
    </Cajon>
  )
}

function Dato({ etiqueta, valor, ancho = false }: { etiqueta: string; valor: string; ancho?: boolean }) {
  return (
    <div className={ancho ? 'col-span-2' : undefined}>
      <dt className="text-caption text-fg-subtle">{etiqueta}</dt>
      <dd className="text-fg">{valor}</dd>
    </div>
  )
}

function Fila({ etiqueta, valor, fuerte = false }: { etiqueta: string; valor: number; fuerte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={fuerte ? 'font-medium text-fg' : 'text-fg-muted'}>{etiqueta}</dt>
      <dd className={`font-mono tabular-nums ${fuerte ? 'font-medium text-fg' : 'text-fg'}`}>{formatCurrency(valor)}</dd>
    </div>
  )
}

/**
 * «SETP-1», como en la lista del proceso y en Facturación: la base guarda el
 * consecutivo y el prefijo por separado, y el detalle los manda así.
 */
export function numeroDeLaFacturaEmitida(
  f: Pick<FacturaEmitidaDetalle, 'numeroDian' | 'prefijo'>,
): string | null {
  if (f.numeroDian === null || f.numeroDian === undefined) return null
  const numero = String(f.numeroDian).trim()
  if (!numero) return null
  const prefijo = f.prefijo?.trim()
  return prefijo && !numero.startsWith(`${prefijo}-`) ? `${prefijo}-${numero}` : numero
}
