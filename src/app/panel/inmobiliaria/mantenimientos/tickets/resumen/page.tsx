'use client'

import { ArrowClockwise } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { AlertaAccionable } from '@/components/ui/alerta-accionable'
import { useMantenimientoOverview } from '@/lib/hooks/mantenimiento/use-mantenimiento-overview'
import { MantenimientoKpiStrip } from '@/components/inmobiliaria/mantenimiento/MantenimientoKpiStrip'

/**
 * Maintenance Triage Center — overview (DASH-01).
 *
 * Header + the 9-field KPI strip (7 health + 2 mandatory anti-gaming).
 * Mock-first: data comes from useMantenimientoOverview (07-01) — no backend.
 * Consumes the C7-02 envelope: data?.kpis + data?.generatedAt.
 *
 * Deliberately simpler than ai/cobranza/page.tsx: NO realtime, NO PII,
 * NO stage funnel/transitions. The skeleton is handled inside the KpiStrip
 * via the isLoading prop (no cobranza-specific skeleton import).
 */
export default function MantenimientoOverviewPage() {
  const { t, locale } = useI18n()
  const { data, isLoading, error, refetch } = useMantenimientoOverview()

  const generatedAtLabel = data?.generatedAt
    ? new Intl.DateTimeFormat(locale === 'es' ? 'es-CO' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(data.generatedAt))
    : null

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-h2 text-fg">
            {t('inmobiliaria.ai.mantenimiento.overview.title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm">
            {t('inmobiliaria.ai.mantenimiento.overview.subtitle')}
          </p>
        </div>
        {generatedAtLabel && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap mt-1">
            {t('inmobiliaria.ai.mantenimiento.overview.lastUpdated')} {generatedAtLabel}
          </p>
        )}
      </header>

      {/* El fallo va ARRIBA de los números, no debajo: si la consulta murió, lo
          primero que hay que leer es que no hay datos —y con qué reintentar—,
          no nueve tarjetas con raya que se leen como si fueran la operación. */}
      {error && !isLoading && (
        <AlertaAccionable
          severidad="danger"
          titulo={t('inmobiliaria.ai.mantenimiento.overview.errorLoading')}
          accion={{
            label: t('inmobiliaria.ai.cobranza.deudores.errorRetry'),
            onClick: () => void refetch(),
            icon: <ArrowClockwise size={14} weight="bold" />,
          }}
        >
          {error}
        </AlertaAccionable>
      )}

      {/* KPI Strip — 7 health + 2 anti-gaming */}
      <MantenimientoKpiStrip kpis={data?.kpis ?? null} isLoading={isLoading} />
    </main>
  )
}
