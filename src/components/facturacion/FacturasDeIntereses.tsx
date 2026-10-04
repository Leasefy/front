'use client'

/**
 * Las facturas de INTERESES por emitir, dentro de «Por facturar».
 *
 * 🔴 Q6 (QA-FACT, 03-10-2026; Nico, la recomendada): cuando un recibo paga
 * intereses de un mes cuya factura ya salió, los intereses van en una factura
 * APARTE que nace sin número (FA-R11). Hasta hoy no aparecía en ninguna pestaña
 * y nunca se numeraba: el ingreso propio de la inmobiliaria quedaba sin factura.
 * Acá se ven y se emiten, con la resolución de «Otros» (`intereses/por-emitir`
 * e `intereses/emitir` del back).
 *
 * Con un back sin esas rutas, o sin ninguna factura de intereses pendiente, no
 * se pinta nada: la pantalla queda como antes.
 */

import { useCallback, useEffect, useState } from 'react'
import { Receipt, SealWarning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { confirmar } from '@/components/ui/confirmar'
import { toast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/format'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import {
  facturacionPorMesService,
  mesLegible,
  type InteresesPorEmitir,
} from '@/lib/api/facturacion-por-mes.service'
import { cuantos, numerosQueSalen, sinLaRutaDeFacturacion } from '@/lib/facturacion/por-facturar'

export interface FacturasDeInteresesProps {
  /** Se llama después de emitir, para que «Por facturar» relea lo suyo. */
  onEmitidas?: () => void
}

export function FacturasDeIntereses({ onEmitidas }: FacturasDeInteresesProps) {
  const [datos, setDatos] = useState<InteresesPorEmitir | null>(null)
  const [emitiendo, setEmitiendo] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      setDatos(await facturacionPorMesService.interesesPorEmitir())
    } catch {
      // Un back sin la ruta (o caído): esta sección no se pinta.
      setDatos(null)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  if (!datos || !datos.disponible || datos.facturas.length === 0) return null

  const resolucion = datos.resolucion
  const motivoParaNoEmitir =
    resolucion && !resolucion.puedeNumerar
      ? sinLaRutaDeFacturacion(resolucion.explicacion) ||
        'No hay una resolución vigente que numere «Otros» (intereses, reparaciones, estudios).'
      : null
  const totalCop = datos.facturas.reduce((s, f) => s + f.totalCop, 0)

  async function emitir(ids: string[]) {
    if (!datos || ids.length === 0 || emitiendo || motivoParaNoEmitir) return
    const elegidas = datos.facturas.filter((f) => ids.includes(f.id))
    const total = elegidas.reduce((s, f) => s + f.totalCop, 0)
    const numeros = numerosQueSalen(resolucion, ids.length)
    const una = elegidas.length === 1 ? elegidas[0] : null
    const ok = await confirmar({
      titulo: una
        ? numeros
          ? `¿Emitir la factura de intereses ${numeros}?`
          : '¿Emitir la factura de intereses?'
        : `¿Emitir ${ids.length.toLocaleString('es-CO')} facturas de intereses?`,
      descripcion: una
        ? `A nombre de ${una.terceroNombre}, por ${formatCurrency(una.totalCop)}: los intereses de ${mesLegible(una.mes)} que ya pagó. Una factura emitida no se borra.`
        : `Por ${formatCurrency(total)}${numeros ? `, numeradas de la ${numeros.replace(' a ', ' a la ')}` : ''}. Una factura emitida no se borra.`,
      accion: una ? 'Emitir la factura' : `Emitir ${ids.length.toLocaleString('es-CO')} facturas`,
    })
    if (!ok) return
    setEmitiendo(ids.length === 1 ? ids[0] : 'todas')
    try {
      const r = await facturacionPorMesService.emitirIntereses(ids)
      if (r.emitidas > 0) {
        toast.success(
          `${cuantos(r.emitidas, 'factura de intereses emitida', 'facturas de intereses emitidas')} · ${formatCurrency(r.totalCop)}`,
        )
      }
      if (r.sinNumero > 0 && r.motivo) toast.error(r.motivo)
      await cargar()
      onEmitidas?.()
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudieron emitir las facturas de intereses.',
          accion: 'emitir las facturas de intereses',
        }),
      )
    } finally {
      setEmitiendo(null)
    }
  }

  return (
    <section className="border-t border-border p-4 space-y-3" data-testid="facturas-de-intereses">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-body font-semibold text-fg">Intereses pagados por facturar</h3>
          <p className="text-caption text-fg-muted">
            Un recibo pagó intereses de un mes cuya factura ya había salido: van en una factura
            aparte, con la resolución de «Otros».{' '}
            <span className="font-mono tabular-nums">
              {cuantos(datos.facturas.length, 'factura', 'facturas')} · {formatCurrency(totalCop)}
            </span>
          </p>
        </div>
        <Button
          size="sm"
          hideArrow
          className="shrink-0"
          disabled={emitiendo !== null || motivoParaNoEmitir !== null}
          isLoading={emitiendo === 'todas'}
          title={motivoParaNoEmitir ?? undefined}
          onClick={() => void emitir(datos.facturas.map((f) => f.id))}
          data-testid="intereses-emitir-todas"
        >
          <Receipt className="h-4 w-4" weight="bold" />
          {datos.facturas.length === 1
            ? 'Emitir la factura de intereses'
            : `Emitir las ${datos.facturas.length.toLocaleString('es-CO')}`}
        </Button>
      </div>

      {motivoParaNoEmitir && (
        <p className="flex items-start gap-2 text-caption text-warning" data-testid="intereses-sin-resolucion">
          <SealWarning className="mt-0.5 h-4 w-4 shrink-0" weight="fill" aria-hidden="true" />
          {motivoParaNoEmitir}
        </p>
      )}

      <ul className="divide-y divide-border rounded-lg border border-border">
        {datos.facturas.map((f) => (
          <li
            key={f.id}
            className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            data-testid={`interes-${f.id}`}
          >
            <div className="min-w-0">
              <p className="break-words text-fg">{f.terceroNombre}</p>
              <p className="text-caption text-fg-muted">
                Intereses de {mesLegible(f.mes)}
                {f.codigoDelContrato !== null && (
                  <>
                    {' · '}contrato <span className="font-mono tabular-nums">#{f.codigoDelContrato}</span>
                  </>
                )}
                {' · '}
                <span className="truncate">{f.inmueble}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
              <span className="font-mono font-medium tabular-nums text-fg">{formatCurrency(f.totalCop)}</span>
              <Button
                size="sm"
                variant="outline"
                hideArrow
                disabled={emitiendo !== null || motivoParaNoEmitir !== null}
                isLoading={emitiendo === f.id}
                title={motivoParaNoEmitir ?? undefined}
                onClick={() => void emitir([f.id])}
                data-testid={`interes-emitir-${f.id}`}
              >
                Emitir
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
