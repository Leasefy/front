'use client'

/**
 * El resumen REAL del servidor (GET …/conciliacion/summary), en dos piezas:
 *
 *   · <ConciliacionResumen>    — UNA franja de KPIs: movimientos · conciliados ·
 *     tasa · monto conciliado. «En cola» NO va acá: es el número del que habla
 *     <HallazgosDelAgente>, y decirlo dos veces en la misma pantalla lo
 *     convierte en ruido (Nico: no repetir información).
 *   · <HallazgosDelAgente>     — «Lo que encontró el agente»: la conclusión en
 *     palabras + el desglose por tipo + UNA acción que lleva a la cola.
 *
 * ── Qué cambió y por qué (Nico, 2026-09-03) ─────────────────────────────────
 * Antes eran tres cosas distintas apiladas: cuatro KPIs, una tarjeta sola a
 * todo el ancho con «Monto conciliado» y una tarjeta «Excepciones por tipo»
 * con cinco números sin conclusión — más un botón primario «Por revisar (0) →»
 * en el encabezado de la Sala que no decía qué había encontrado el agente.
 * Ahora el monto entra a la misma franja (una sola familia de tarjeta) y las
 * excepciones se convierten en la tarjeta protagonista, que dice en una línea
 * qué pasó y ofrece el único botón que corresponde: ir a revisarlo.
 *
 * FAIL-SOFT: el back puede no estar desplegado (404) o la base en modo stub.
 * Con `data` en null estos componentes no pintan NADA — la página conserva su
 * propio vacío. Nunca muestran un banner de error propio.
 */

import Link from 'next/link'
import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  etiquetaDeRevision,
  fraseDeHallazgos,
  hallazgosPorTipo,
} from '@/lib/hooks/conciliacion/hallazgos'
import type { ConciliacionSummaryResponse } from '@/lib/hooks/conciliacion/use-conciliacion-summary'

const numberFormatter = new Intl.NumberFormat('es-CO')
const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/** tasa_conciliacion ya viene 0–100 (un decimal) o null. */
function formatTasa(tasa: number | null): string {
  if (tasa === null) return '—'
  return `${numberFormatter.format(tasa)} %`
}

// ── Franja de KPIs ───────────────────────────────────────────────────────────

export interface ConciliacionResumenProps {
  data: ConciliacionSummaryResponse | null
  isLoading?: boolean
  /** Esqueleto opcional (apagado por defecto — el host ya muestra el suyo). */
  showSkeleton?: boolean
}

export function ConciliacionResumen({ data, isLoading, showSkeleton }: ConciliacionResumenProps) {
  if (isLoading && showSkeleton) {
    return (
      <div
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        data-testid="conciliacion-resumen-loading"
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[88px] rounded-lg border border-border bg-surface-muted animate-pulse" />
        ))}
      </div>
    )
  }

  // FAIL-SOFT: sin resumen no se pinta nada; el host conserva su vacío.
  if (!data) return null

  const { totals, tasa_conciliacion } = data

  const kpis: { id: string; label: string; value: string }[] = [
    { id: 'movimientos', label: 'Movimientos', value: numberFormatter.format(totals.movimientos) },
    { id: 'conciliados', label: 'Conciliados', value: numberFormatter.format(totals.conciliados) },
    { id: 'tasa', label: 'Tasa de conciliación', value: formatTasa(tasa_conciliacion) },
    {
      id: 'monto',
      label: 'Monto conciliado',
      value: copFormatter.format(totals.monto_conciliado_cop),
    },
  ]

  return (
    <div
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      data-testid="conciliacion-resumen"
    >
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className="rounded-lg border border-border bg-surface p-4"
          data-testid={`conciliacion-total-${kpi.id}`}
        >
          <p className="text-caption text-fg-muted">{kpi.label}</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-fg">{kpi.value}</p>
        </div>
      ))}
    </div>
  )
}

// ── Lo que encontró el agente ────────────────────────────────────────────────

export interface HallazgosDelAgenteProps {
  data: ConciliacionSummaryResponse | null
  /** A dónde lleva el botón cuando hay algo que revisar. */
  colaHref: string
}

export function HallazgosDelAgente({ data, colaHref }: HallazgosDelAgenteProps) {
  // FAIL-SOFT: igual que la franja — sin resumen, nada.
  if (!data) return null

  const enCola = data.totals.en_cola
  const hallazgos = hallazgosPorTipo(data.taxonomy)
  const frase = fraseDeHallazgos(enCola, data.taxonomy)

  return (
    <section
      className="rounded-lg border border-border bg-surface p-5"
      data-testid="conciliacion-hallazgos"
      data-en-cola={enCola}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-muted">
              <MagnifyingGlass
                className="h-4 w-4 text-fg-muted"
                weight="duotone"
                aria-hidden="true"
              />
            </span>
            <h2 className="text-base font-semibold text-fg">Lo que encontró el agente</h2>
          </div>

          {enCola > 0 ? (
            <p className="text-body-sm text-fg-muted">{frase}</p>
          ) : (
            <p className="text-body-sm text-fg-muted">
              Nada pendiente de tu ojo. Cuando un movimiento no cierre contra un cobro, aparece acá.
            </p>
          )}

          {/* El desglose por tipo — sólo los que tienen casos. Con la taxonomía
              en ceros no se pintan cinco ceros: no habría nada que mirar. */}
          {hallazgos.length > 0 && (
            <ul className="flex flex-wrap gap-2 pt-1" data-testid="conciliacion-hallazgos-tipos">
              {hallazgos.map((h) => (
                <li
                  key={h.tipo}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-caption text-fg-muted"
                  data-testid={`conciliacion-hallazgo-${h.tipo}`}
                >
                  <span className="font-semibold tabular-nums text-fg">{h.cantidad}</span>
                  {h.etiqueta}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Con la cola vacía no hay botón: no se ofrece revisar lo que no existe. */}
        {enCola > 0 && (
          <Button asChild variant="secondary" hideArrow className="shrink-0">
            <Link href={colaHref} data-testid="conciliacion-hallazgos-cta">
              {etiquetaDeRevision(enCola)}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </section>
  )
}
