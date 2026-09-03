'use client'

/**
 * AnaliticaAgente — F10 of the Agent Workspace initiative (superficie 6).
 *
 * The generic per-agent Analítica body: resumen KPI strip (reuses
 * `formatKpiValue` from SalaAgente — number / percent-fraction / cop) plus one
 * block per serie rendering the last 30 Bogotá days as a simple daily bar
 * chart.
 *
 * Chart approach: the cotizador insights widgets use recharts per-widget
 * (ResponsiveContainer needs real DOM measurements — renders nothing in unit
 * tests and is heavy for 4 new pages), so this primitive uses pure-CSS bars:
 * a flex row of divs, height = % of the serie max, per-day title tooltip and
 * an accessible role="img" summary per serie.
 *
 * 404 from the analitica endpoint (`notAvailable`) renders a friendly
 * "el agente aún no reporta analítica" panel — NOT an error banner.
 */

import { ChartBar, Robot } from '@phosphor-icons/react'

import type { AgentAnaliticaResponse, AnaliticaSerie } from '@/lib/api/agent-workspace'
import { useI18n } from '@/lib/i18n'
import { formatKpiValue } from './SalaAgente'

const NS = 'inmobiliaria.ai.workspace.analitica'

// ── Props ───────────────────────────────────────────────────────────────────

export interface AnaliticaAgenteProps {
  data: AgentAnaliticaResponse | null
  isLoading?: boolean
  error?: string | null
  /** Backend 404 — graceful empty state, NOT an error. */
  notAvailable?: boolean
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const dayFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  timeZone: 'America/Bogota',
})

/** "2026-06-09" → "09 jun" (parsed as a Bogotá calendar day, not UTC drift). */
function formatDay(date: string): string {
  const parsed = new Date(`${date}T12:00:00-05:00`)
  return Number.isNaN(parsed.getTime()) ? date : dayFormatter.format(parsed)
}

// ── Serie block ─────────────────────────────────────────────────────────────

function SerieBlock({ serie }: { serie: AnaliticaSerie }) {
  const { t } = useI18n()
  const max = serie.points.reduce((acc, p) => Math.max(acc, p.value), 0)

  return (
    <section
      className="rounded-lg border border-border bg-card p-4 space-y-3"
      data-testid={`analitica-serie-${serie.id}`}
    >
      <h2 className="text-sm font-semibold text-foreground">{serie.label}</h2>

      {max === 0 ? (
        <p className="text-xs text-muted-foreground" data-testid="analitica-serie-empty">
          {t(`${NS}.serieEmpty`)}
        </p>
      ) : (
        <div
          className="flex items-end gap-[2px] h-24 w-full"
          role="img"
          aria-label={t(`${NS}.serieAria`, {
            label: serie.label,
            dias: serie.points.length,
            max: formatKpiValue(max, serie.format),
          })}
        >
          {serie.points.map((point) => (
            <div
              key={point.date}
              data-testid="analitica-bar"
              className="flex-1 min-w-0 rounded-t-sm bg-primary/80 hover:bg-primary transition-colors"
              style={{
                // 0 keeps a 2px floor so the day remains hover-discoverable.
                height: point.value === 0 ? '2px' : `${Math.max((point.value / max) * 100, 4)}%`,
              }}
              title={`${formatDay(point.date)} · ${formatKpiValue(point.value, serie.format)}`}
            />
          ))}
        </div>
      )}

      {max > 0 && (
        <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
          <span>{formatDay(serie.points[0]?.date ?? '')}</span>
          <span>{formatDay(serie.points[serie.points.length - 1]?.date ?? '')}</span>
        </div>
      )}
    </section>
  )
}

// ── Component ───────────────────────────────────────────────────────────────

export function AnaliticaAgente({ data, isLoading, error, notAvailable }: AnaliticaAgenteProps) {
  const { t } = useI18n()
  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="analitica-loading">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-border bg-muted/40 animate-pulse" />
          ))}
        </div>
        <div className="h-40 rounded-lg border border-border bg-muted/40 animate-pulse" />
        <div className="h-40 rounded-lg border border-border bg-muted/40 animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-lg border border-danger/30 bg-danger-soft text-danger"
        data-testid="analitica-error"
      >
        {t(`${NS}.error`, { error })}
      </div>
    )
  }

  if (notAvailable || !data) {
    // 404 / not deployed — graceful empty state, NOT an error banner.
    return (
      <div
        className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center"
        data-testid="analitica-empty"
      >
        <Robot className="w-8 h-8 mx-auto text-muted-foreground mb-2" weight="duotone" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">{t(`${NS}.emptyTitle`)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t(`${NS}.emptyBody`)}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="analitica-agente">
      {/* Resumen KPI strip */}
      {data.resumen.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="analitica-resumen">
          {data.resumen.map((kpi) => (
            <div
              key={kpi.id}
              className="rounded-lg border border-border bg-card p-4"
              data-testid={`analitica-kpi-${kpi.id}`}
            >
              <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">
                {formatKpiValue(kpi.value, kpi.format)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* One bar-chart block per serie */}
      {data.series.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
          <ChartBar className="w-8 h-8 mx-auto text-muted-foreground mb-2" weight="duotone" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t(`${NS}.sinSeries`)}</p>
        </div>
      ) : (
        data.series.map((serie) => <SerieBlock key={serie.id} serie={serie} />)
      )}
    </div>
  )
}
