'use client'

/**
 * «Tu cartera» por etapa — UNA barra y UNA lista (Nico, 21-10-2026).
 *
 * Antes eran siete tarjetas de colores, una por etapa, cada una con cuatro
 * números (casos, rango, días en la etapa, cambio de la semana) — «cosas que no
 * escalan en lectura, mira todos esos números». Con casi todo en cero, la
 * pantalla mostraba 28 números para decir «hay 1 caso en pre-jurídica». Y
 * debajo, un embudo repetía los mismos conteos por tercera vez.
 *
 * Ahora (skill `revisor-de-diseno`, patrón «Etapas, embudos y distribuciones»):
 *   · una frase con el total;
 *   · una barra apilada: el ancho de cada tramo es cuántos hay; el color, la
 *     gravedad (de gris a rojo), no decoración;
 *   · una lista alineada en columnas SÓLO con las etapas que tienen casos:
 *     etapa · casos · tiempo en la etapa · cambio de la semana (sólo si cambió);
 *   · las etapas sin casos, juntas en una línea.
 * Tocar una etapa abre sus deudores, como antes.
 */

import { ArrowDown, ArrowUp, CaretRight } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { CARTERA_STAGES, STAGE_LABELS_EN, STAGE_LABELS_ES, type CarteraStage } from '@/lib/cartera'

export interface EtapaDeLaCartera {
  stage: CarteraStage
  count: number
  avgDaysInStage?: number
  weeklyDelta?: number
}

interface CarteraPorEtapaProps {
  etapas: readonly EtapaDeLaCartera[]
  isLoading?: boolean
  onEtapa: (stage: CarteraStage) => void
}

/** La gravedad de cada etapa, en los tokens de estado (de gris a rojo). */
export const COLOR_DE_LA_ETAPA: Record<CarteraStage, string> = {
  S0: 'bg-neutral-300',
  S1: 'bg-warning-500/50',
  S2: 'bg-warning-500',
  S3: 'bg-warning-700',
  S4: 'bg-error-500',
  S5: 'bg-error-700',
  SX: 'bg-neutral-500',
}

const COLUMNAS = 'grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_5rem_9rem_8rem_1rem]'

export function CarteraPorEtapa({ etapas, isLoading = false, onEtapa }: CarteraPorEtapaProps) {
  const { locale } = useI18n()
  const en = locale === 'en'
  const tx = (es: string, eng: string) => (en ? eng : es)
  const etiquetas = en ? STAGE_LABELS_EN : STAGE_LABELS_ES

  const porEtapa = new Map(etapas.map((e) => [e.stage, e]))
  const filas = CARTERA_STAGES.map((stage) => ({ stage, count: 0, ...porEtapa.get(stage) }))
  const conCasos = filas.filter((f) => f.count > 0)
  const sinCasos = filas.filter((f) => f.count <= 0)
  const total = conCasos.reduce((s, f) => s + f.count, 0)
  const porVencer = filas.find((f) => f.stage === 'S0')?.count ?? 0
  const enMora = total - porVencer
  const nombre = (stage: CarteraStage) => etiquetas[stage].split(' · ')[0]!
  const rango = (stage: CarteraStage) => etiquetas[stage].split(' · ')[1] ?? null
  const dias = (n: number) => `${n} ${n === 1 ? tx('día', 'day') : tx('días', 'days')}`

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 sm:p-5" aria-busy="true" data-testid="cartera-por-etapa-cargando">
        <div className="h-5 w-40 animate-pulse rounded bg-surface-muted" />
        <div className="mt-3 h-2.5 w-full animate-pulse rounded-full bg-surface-muted" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-5 w-full animate-pulse rounded bg-surface-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-4 sm:px-5" data-testid="cartera-por-etapa-vacia">
        <p className="text-body-sm text-fg">{tx('Nadie en cobranza: toda la cartera está al día.', 'No one in collections: the whole portfolio is current.')}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface" data-testid="cartera-por-etapa">
      <div className="space-y-3 px-4 pb-4 pt-4 sm:px-5">
        {/* Revisora r25 (Resumen #1): LA RESPUESTA en una CifraHeroe y con la
            MISMA cuenta de «Te toca a ti»: en mora es todo menos
            Pre-vencimiento. Antes «N casos en cobranza» en text-h3, con S0
            adentro: dos totales distintos en la misma pantalla. La plata en
            mora no llega del panorama (para Víctor). */}
        <CifraHeroe
          data-testid="cartera-en-mora"
          tamano="mediana"
          rotulo={tx('En mora', 'Past due')}
          cifra={enMora.toLocaleString(en ? 'en-US' : 'es-CO')}
          contexto={
            <>
              {enMora === 1 ? tx('inquilino', 'tenant') : tx('inquilinos', 'tenants')}
              {porVencer > 0 ? (
                <span className="text-fg-subtle">
                  {' · '}
                  {porVencer === 1
                    ? tx('1 más con la cuota por vencer', '1 more with a payment coming due')
                    : tx(`${porVencer} más con la cuota por vencer`, `${porVencer} more with a payment coming due`)}
                </span>
              ) : null}
            </>
          }
          esCero={enMora === 0}
          cuandoEsCero={tx(
            `Nadie en mora: ${porVencer === 1 ? '1 caso tiene' : `${porVencer} casos tienen`} la cuota por vencer.`,
            `No one past due: ${porVencer} with a payment coming due.`,
          )}
        />
        {/* La barra: un tramo por etapa con casos, ancho = su parte del total. */}
        <div
          className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-muted"
          role="img"
          aria-label={conCasos.map((f) => `${nombre(f.stage)}: ${f.count}`).join(', ')}
          data-testid="cartera-barra"
        >
          {conCasos.map((f) => (
            <span
              key={f.stage}
              className={cn('h-full first:rounded-l-full last:rounded-r-full', COLOR_DE_LA_ETAPA[f.stage])}
              style={{ width: `${(f.count / total) * 100}%` }}
              data-etapa={f.stage}
            />
          ))}
        </div>
      </div>

      {/* Cabecera de las columnas: sólo donde hay columnas. */}
      <div
        className={cn(
          'hidden border-t border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle sm:grid sm:px-5',
          COLUMNAS,
          'gap-x-4',
        )}
        aria-hidden="true"
      >
        <span>{tx('Etapa', 'Stage')}</span>
        <span className="text-right">{tx('Casos', 'Cases')}</span>
        <span className="text-right">{tx('Promedio en la etapa', 'Avg. in stage')}</span>
        <span className="text-right">{tx('Esta semana', 'This week')}</span>
        <span />
      </div>

      <ul className="divide-y divide-border border-t border-border">
        {conCasos.map((f) => {
          const promedio = Math.round(f.avgDaysInStage ?? 0)
          const delta = f.weeklyDelta ?? 0
          const cambio =
            delta === 0 ? null : (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 font-mono tabular-nums',
                  // Más cuotas por vencer no es malo: en pre-vencimiento el cambio no lleva juicio.
                  f.stage === 'S0' ? 'text-fg-muted' : delta > 0 ? 'text-danger' : 'text-success',
                )}
              >
                {delta > 0 ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />}
                {delta > 0 ? `+${delta}` : delta}
              </span>
            )
          return (
            <li key={f.stage}>
              <button
                type="button"
                onClick={() => onEtapa(f.stage)}
                className={cn(
                  'grid w-full items-center gap-x-4 px-4 py-3 text-left transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none sm:px-5',
                  COLUMNAS,
                )}
                data-testid={`cartera-etapa-${f.stage}`}
                aria-label={tx(
                  `${nombre(f.stage)}: ${f.count} ${f.count === 1 ? 'caso' : 'casos'}. Ver los deudores`,
                  `${nombre(f.stage)}: ${f.count} ${f.count === 1 ? 'case' : 'cases'}. See the debtors`,
                )}
              >
                <span className="flex min-w-0 items-start gap-2.5">
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', COLOR_DE_LA_ETAPA[f.stage])} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-body-sm font-medium text-fg">{nombre(f.stage)}</span>
                    {/* En el celular, lo de las columnas va debajo del nombre. */}
                    <span className="block text-caption text-fg-subtle">
                      {rango(f.stage)}
                      <span className="sm:hidden">
                        {rango(f.stage) ? ' · ' : ''}
                        {tx(`${dias(promedio)} en la etapa`, `${dias(promedio)} in stage`)}
                        {cambio ? <> · {cambio}</> : null}
                      </span>
                    </span>
                  </span>
                </span>
                <span className="text-right font-mono text-body tabular-nums text-fg">{f.count}</span>
                <span className="hidden text-right font-mono text-caption tabular-nums text-fg-muted sm:block">{dias(promedio)}</span>
                <span className="hidden text-right text-caption text-fg-subtle sm:block">{cambio ?? '—'}</span>
                <CaretRight className="hidden h-4 w-4 text-fg-subtle sm:block" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>

      {sinCasos.length > 0 && (
        <p className="border-t border-border px-4 py-3 text-caption text-fg-subtle sm:px-5" data-testid="cartera-sin-casos">
          {tx('Sin casos', 'No cases')}: {sinCasos.map((f) => nombre(f.stage)).join(' · ')}
        </p>
      )}
    </div>
  )
}
