'use client'

import { MonoLabel } from '@leasefy/cadence'

import { useI18n } from '@/lib/i18n'
import { type CarteraStage, stageColorClasses, STAGE_LABELS_ES, STAGE_LABELS_EN } from '@/lib/cartera'

interface CobranzaFunnelChartProps {
  stages: Array<{ stage: CarteraStage; count: number }>
  isLoading?: boolean
}

export function CobranzaFunnelChart({ stages, isLoading = false }: CobranzaFunnelChartProps) {
  const { t, locale } = useI18n()

  const total = stages.reduce((sum, s) => sum + s.count, 0)

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="h-10 w-full rounded-xl bg-surface-muted animate-pulse" />
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-center h-10 rounded-xl bg-surface-muted text-sm text-fg-subtle">
          {t('inmobiliaria.ai.cobranza.overview.funnel.empty')}
        </div>
      </div>
    )
  }

  const stagesWithPct = stages.map((s) => ({
    ...s,
    pct: (s.count / total) * 100,
    colors: stageColorClasses(s.stage),
    label: locale === 'es' ? STAGE_LABELS_ES[s.stage] : STAGE_LABELS_EN[s.stage],
  }))

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      {/* Título DENTRO de la tarjeta. Al reordenar el Resumen se quedó sin el
          encabezado que tenía afuera, y una barra de colores con códigos S0…SX
          y ningún texto no dice qué es. */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-fg">
          {t('inmobiliaria.ai.cobranza.overview.funnel.title')}
        </h3>
        <p className="text-xs text-fg-muted">
          Qué porcentaje de tus casos está en cada etapa de mora.
        </p>
      </div>

      {/* Horizontal bar — md+ */}
      <div
        className="hidden md:flex rounded-xl overflow-hidden h-10"
        role="img"
        aria-describedby="funnel-summary-table"
        aria-label={t('inmobiliaria.ai.cobranza.overview.funnel.ariaDescription')}
      >
        {stagesWithPct.map(({ stage, count, pct, colors, label }) => (
          <div
            key={stage}
            className={`${colors.bg} flex items-center justify-center overflow-hidden transition-all`}
            style={{ flexBasis: `${pct}%`, minWidth: pct > 0 ? '4px' : '0' }}
            title={`${label}: ${count} (${pct.toFixed(1)}%)`}
          />
        ))}
      </div>

      {/* Vertical stacked — sm */}
      <div
        className="flex flex-col md:hidden rounded-xl overflow-hidden"
        role="img"
        aria-describedby="funnel-summary-table"
        aria-label={t('inmobiliaria.ai.cobranza.overview.funnel.ariaDescription')}
      >
        {stagesWithPct.map(({ stage, count, pct, colors, label }) => (
          <div
            key={stage}
            className={`${colors.bg} flex items-center px-3 gap-2`}
            style={{ height: `${Math.max(pct, 4)}px`, width: '100%' }}
            title={`${label}: ${count} (${pct.toFixed(1)}%)`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {stagesWithPct.map(({ stage, pct, colors, label }) => (
          <div key={stage} className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <span className={`inline-block w-2.5 h-2.5 rounded-sm ${colors.bg} border ${colors.border}`} />
            {/* El nombre primero: «S3» no significa nada para quien no se
                sabe la taxonomía de memoria. El código queda de apoyo. */}
            <span className="text-fg-muted">{label}</span>
            <MonoLabel className="text-fg-subtle opacity-60">{stage}</MonoLabel>
            <span className="opacity-70 font-mono tabular-nums">{pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      {/* ALLOWLIST: sr-only accessibility-fallback table for the chart's
          aria-describedby. Cadence `Table` injects a visible scroll-wrapper
          <div> and drops <caption> (no DS equivalent), degrading the
          screen-reader fallback semantics with no visual benefit. Kept native. */}
      <table className="sr-only" id="funnel-summary-table">
        <caption>{t('inmobiliaria.ai.cobranza.overview.funnel.tableCaption')}</caption>
        <thead>
          <tr>
            <th>{t('inmobiliaria.ai.cobranza.overview.funnel.tableHeader.stage')}</th>
            <th>{t('inmobiliaria.ai.cobranza.overview.funnel.tableHeader.debtors')}</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {stagesWithPct.map(({ stage, count, pct, label }) => (
            <tr key={stage}>
              <td>{label} ({stage})</td>
              <td>{count}</td>
              <td>{pct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
