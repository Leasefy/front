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


// ── Franja de KPIs ───────────────────────────────────────────────────────────

export interface ConciliacionResumenProps {
  data: ConciliacionSummaryResponse | null
  isLoading?: boolean
  /** Esqueleto opcional (apagado por defecto — el host ya muestra el suyo). */
  showSkeleton?: boolean
  /** Con él, la tarjeta también lleva lo que espera tu decisión («Revisar») y los tipos de caso. */
  colaHref?: string
}

export function ConciliacionResumen({ data, isLoading, showSkeleton, colaHref }: ConciliacionResumenProps) {
  if (isLoading && showSkeleton) {
    // Revisora r24 (Conciliación #4): el esqueleto con la forma de lo que llega —rótulo, cifra,
    // barra y leyenda—, no las cuatro cajas de antes.
    return (
      <div
        className="space-y-4 rounded-lg border border-border bg-surface p-5"
        data-testid="conciliacion-resumen-loading"
        aria-label="cargando"
      >
        <div className="h-3.5 w-40 animate-pulse rounded-sm bg-surface-muted" />
        <div className="h-9 w-56 animate-pulse rounded-sm bg-surface-muted" />
        <div className="h-2 w-full animate-pulse rounded-full bg-surface-muted" />
        <div className="flex gap-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 w-24 animate-pulse rounded-sm bg-surface-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { totals } = data
  const n = (x: number) => numberFormatter.format(x)
  const falta = Math.max(0, totals.movimientos - totals.conciliados)
  const enCola = Math.min(falta, Math.max(0, totals.en_cola ?? 0))
  const porCruzar = Math.max(0, falta - enCola)
  const hallazgos = hallazgosPorTipo(data.taxonomy)

  /*
   * Revisora r24 (Conciliación #1 y #5): UNA tarjeta con LA RESPUESTA —lo que falta por conciliar—
   * y, en la barra, lo conciliado, lo que espera tu decisión (con «Revisar») y lo que falta cruzar.
   * Antes la cifra medía al agente («Lo que lleva cruzado el agente: 8 de 11») y lo que te tocaba
   * iba en otra tarjeta debajo. La tasa sale del pie: decía lo mismo que la barra.
   */
  return (
    <section
      aria-labelledby="falta-por-conciliar"
      className="rounded-lg border border-border bg-surface p-5"
      data-testid="conciliacion-resumen"
    >
      <CifraHeroe
        rotulo={<span id="falta-por-conciliar">Falta por conciliar</span>}
        cifra={
          <span data-testid="conciliacion-total-falta">
            <AnimatedNumber value={falta} format={(x) => numberFormatter.format(x)} />{' '}
            <span className="text-fg-muted">{falta === 1 ? 'movimiento' : 'movimientos'}</span>
          </span>
        }
        contexto={
          <span data-testid="conciliacion-total-movimientos">
            de los <AnimatedNumber value={totals.movimientos} format={(x) => numberFormatter.format(x)} /> del extracto
          </span>
        }
        total={totals.movimientos}
        tramos={[
          {
            clave: 'conciliados',
            etiqueta: 'Conciliados',
            monto: totals.conciliados,
            tono: 'exito',
            siempre: true,
            cifra: <span data-testid="conciliacion-total-conciliados">{n(totals.conciliados)}</span>,
          },
          {
            clave: 'en-cola',
            etiqueta: 'Esperan tu decisión',
            monto: enCola,
            tono: 'aviso',
            cifra: n(enCola),
            extra:
              colaHref && enCola > 0 ? (
                <Link
                  href={colaHref}
                  className="text-caption font-medium text-primary underline-offset-4 hover:underline"
                  data-testid="conciliacion-hallazgos-cta"
                >
                  {etiquetaDeRevision(enCola)}
                </Link>
              ) : null,
          },
          { clave: 'por-cruzar', etiqueta: 'Por cruzar', monto: porCruzar, tono: 'neutro', cifra: n(porCruzar) },
        ]}
        tamano="mediana"
        pie={
          <div className="space-y-2 border-t border-border-faint pt-3">
            {colaHref && hallazgos.length > 0 ? (
              <Stagger
                as="ul"
                className="flex flex-wrap gap-2"
                data-testid="conciliacion-hallazgos-tipos"
              >
                {hallazgos.map((h) => (
                  <StaggerItem
                    as="li"
                    key={h.tipo}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-caption text-fg-muted"
                    data-testid={`conciliacion-hallazgo-${h.tipo}`}
                  >
                    <span className="font-mono tabular-nums text-fg">{n(h.cantidad)}</span>
                    {h.etiqueta}
                  </StaggerItem>
                ))}
              </Stagger>
            ) : null}
            <p data-testid="conciliacion-total-monto">
              <span className="font-mono tabular-nums text-fg">
                <AnimatedNumber value={totals.monto_conciliado_cop} format={(x) => copFormatter.format(x)} />
              </span>{' '}
              conciliados
            </p>
          </div>
        }
        data-testid={colaHref ? 'conciliacion-hallazgos' : undefined}
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
