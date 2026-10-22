'use client'

/**
 * El resumen REAL del servidor (GET …/conciliacion/summary), en dos piezas:
 *
 *   · <ConciliacionResumen>    — UNA franja de KPIs: movimientos · conciliados ·
 *     tasa · monto conciliado. «En cola» NO va acá: es el número del que habla
 *     <HallazgosDelAgente>, y decirlo dos veces en la misma pantalla lo
 *     convierte en ruido (Nico: no repetir información).
 *
 *     🔴 Los cuatro son DEL AGENTE, y van bajo un encabezado que lo dice
 *     («Lo que lleva cruzado el agente»). Los movimientos que el BANCO mandó y
 *     nadie cruzó todavía los cuenta el back, y salen arriba en otra frase:
 *     sin encabezado, «Hay 3 movimientos esperando» y «Movimientos 0» se leen
 *     como una contradicción en la misma pantalla.
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

import { Button } from '@/components/ui/button'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import {
  etiquetaDeRevision,
  fraseDeHallazgos,
  hallazgosPorTipo,
} from '@/lib/hooks/conciliacion/hallazgos'
import type { ConciliacionSummaryResponse } from '@/lib/hooks/conciliacion/use-conciliacion-summary'
import { AnimatedNumber, Presence, Stagger, StaggerItem } from '@leasefy/cadence'
import { plataEnPantalla } from '@/lib/plata/escribir-plata'
import { cifrasDeLaPantalla, localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras'

const numberFormatter = cifrasDeLaPantalla()
const copFormatter = plataEnPantalla(localeDeLasCifras, {
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
  const porCruzar = Math.max(0, totals.movimientos - totals.conciliados)

  /*
   * GLOW UP 22-10 (UX, al nivel de Deuda del mes): LA RESPUESTA en una cifra —cuántos movimientos
   * lleva conciliados el agente de los que tiene—, con su barra (conciliados · por cruzar), y la
   * tasa y el monto debajo. Antes, cuatro tarjetas del mismo peso. «En cola» sigue sin repetirse
   * aquí: es el número de «Lo que encontró el agente».
   *
   * 🔴 21-09-2026: el rótulo le pone dueño a la cifra —«lo que lleva cruzado el agente»—: arriba la
   * pantalla habla de lo que mandó el banco y nadie cruzó todavía; sin dueño, una de las dos miente.
   */
  return (
    <section
      aria-labelledby="lo-que-cruzo-el-agente"
      className="rounded-lg border border-border bg-surface p-5"
      data-testid="conciliacion-resumen"
    >
      <CifraHeroe
        rotulo={<span id="lo-que-cruzo-el-agente">Lo que lleva cruzado el agente</span>}
        cifra={
          <span data-testid="conciliacion-total-conciliados">
            <span className="sr-only">Conciliados: </span>
            <AnimatedNumber value={totals.conciliados} format={(n) => numberFormatter.format(n)} />
          </span>
        }
        contexto={
          <span data-testid="conciliacion-total-movimientos">
            de <AnimatedNumber value={totals.movimientos} format={(n) => numberFormatter.format(n)} />{' '}
            {totals.movimientos === 1 ? 'movimiento conciliado' : 'movimientos conciliados'}
          </span>
        }
        total={totals.movimientos}
        tramos={[
          { clave: 'conciliados', etiqueta: 'Conciliados', monto: totals.conciliados, tono: 'exito' },
          { clave: 'por-cruzar', etiqueta: 'Por cruzar', monto: porCruzar, tono: 'neutro' },
        ]}
        tamano="mediana"
        pie={
          <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border-faint pt-3">
            <div className="space-y-0.5" data-testid="conciliacion-total-tasa">
              <dt className="font-mono uppercase tracking-[0.06em] text-fg-subtle">Tasa de conciliación</dt>
              <dd className="font-mono text-body-sm tabular-nums text-fg">
                {tasa_conciliacion === null ? formatTasa(null) : <AnimatedNumber value={tasa_conciliacion} format={formatTasa} />}
              </dd>
            </div>
            <div className="space-y-0.5" data-testid="conciliacion-total-monto">
              <dt className="font-mono uppercase tracking-[0.06em] text-fg-subtle">Monto conciliado</dt>
              <dd className="font-mono text-body-sm tabular-nums text-fg">
                <AnimatedNumber value={totals.monto_conciliado_cop} format={(n) => copFormatter.format(n)} />
              </dd>
            </div>
          </dl>
        }
      />
    </section>
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
          <h2 className="text-base font-medium text-fg">Lo que encontró el agente</h2>

          {enCola > 0 ? (
            <p className="text-body-sm text-fg-muted">{frase}</p>
          ) : (
            <p className="text-body-sm text-fg-muted">
              Nada pendiente de tu ojo. Cuando un movimiento no cierre contra un cobro, aparece aquí.
            </p>
          )}

          {/* El desglose por tipo — sólo los que tienen casos. Con la taxonomía
              en ceros no se pintan cinco ceros: no habría nada que mirar. */}
          {hallazgos.length > 0 && (
            <Stagger as="ul" className="flex flex-wrap gap-2 pt-1" data-testid="conciliacion-hallazgos-tipos">
              {hallazgos.map((h) => (
                <StaggerItem
                  as="li"
                  key={h.tipo}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-caption text-fg-muted"
                  data-testid={`conciliacion-hallazgo-${h.tipo}`}
                >
                  <span className="font-medium tabular-nums text-fg">
                    <AnimatedNumber value={h.cantidad} format={(n) => String(Math.round(n))} />
                  </span>
                  {h.etiqueta}
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>

        {/* Con la cola vacía no hay botón: no se ofrece revisar lo que no existe. */}
        <Presence show={enCola > 0} direction="none" initial={false} className="shrink-0">
          <Button asChild variant="secondary" hideArrow className="shrink-0">
            <Link href={colaHref} data-testid="conciliacion-hallazgos-cta">
              {etiquetaDeRevision(enCola)}
            </Link>
          </Button>
        </Presence>
      </div>
    </section>
  )
}
