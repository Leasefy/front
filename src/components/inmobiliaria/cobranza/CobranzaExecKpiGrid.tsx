'use client'

/**
 * CobranzaExecKpiGrid — fila ejecutiva de 8 métricas para la HOME de cobranza
 * (visión #4: tablero ejecutivo-operativo).
 *
 * Se alimenta del MISMO `useCarteraOverview` que ya consume la home (no agrega
 * fetches ni endpoints). Solo 4 de las 8 métricas tienen fuente real hoy; las
 * 4 restantes NO existen en el overview y se muestran con em-dash "—" en vez de
 * inventar un número (regla del contrato: "donde no haya dato → '—', no inventes").
 *
 * Métricas con dato real:
 *   - Casos activos en cobranza   → kpis.deudoresActivos
 *   - Casos críticos              → Σ count de etapas rojas S4 (siniestro) + S5 (jurídico)
 *   - Casos para aprobar          → kpis.escalacionesPendientes
 *
 * Sin fuente en el overview (→ "—"):
 *   - Cartera vencida total (COP) · Recuperado este mes (COP) ·
 *     Promesas activas · Promesas incumplidas · Tasa de recuperación (%)
 *
 * Estilo: shell uniforme `rounded-xl border border-border bg-card` (mismo que
 * CobranzaKpiStrip / stage cards de la home), tints semánticos vía token.
 */

import * as React from 'react'
import {
  Briefcase,
  CurrencyDollar,
  TrendUp,
  Handshake,
  WarningCircle,
  Fire,
  CheckSquare,
  Percent,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import type { CarteraOverviewResponse } from '@/lib/hooks/cobranza/use-cartera-overview'

interface CobranzaExecKpiGridProps {
  data: CarteraOverviewResponse | null
  isLoading?: boolean
}

const DASH = '—'

interface KpiCell {
  label: string
  value: string
  Icon: Icon
  iconColor: string
}

export function CobranzaExecKpiGrid({ data, isLoading = false }: CobranzaExecKpiGridProps) {
  const { formatNumber } = useI18n()

  // Casos críticos = etapas rojas (siniestro + jurídico). Sin stages → "—".
  const casosCriticos =
    data?.stages != null
      ? data.stages
          .filter((s) => s.stage === 'S4' || s.stage === 'S5')
          .reduce((acc, s) => acc + s.count, 0)
      : null

  const casosActivos = data?.kpis.deudoresActivos ?? null
  const casosParaAprobar = data?.kpis.escalacionesPendientes ?? null

  const cells: KpiCell[] = [
    {
      // Sin campo de total COP en el overview → em-dash honesto.
      label: 'Cartera vencida total',
      value: DASH,
      Icon: CurrencyDollar,
      iconColor: 'text-fg-muted',
    },
    {
      label: 'Casos activos en cobranza',
      value: casosActivos != null ? formatNumber(casosActivos) : DASH,
      Icon: Briefcase,
      iconColor: 'text-primary',
    },
    {
      // El overview solo trae pagado de HOY; "este mes" no tiene fuente → em-dash.
      label: 'Recuperado este mes',
      value: DASH,
      Icon: TrendUp,
      iconColor: 'text-success',
    },
    {
      label: 'Promesas activas',
      value: DASH,
      Icon: Handshake,
      iconColor: 'text-fg-muted',
    },
    {
      label: 'Promesas incumplidas',
      value: DASH,
      Icon: WarningCircle,
      iconColor: 'text-fg-muted',
    },
    {
      label: 'Casos críticos',
      value: casosCriticos != null ? formatNumber(casosCriticos) : DASH,
      Icon: Fire,
      iconColor: 'text-danger',
    },
    {
      label: 'Casos para aprobar',
      value: casosParaAprobar != null ? formatNumber(casosParaAprobar) : DASH,
      Icon: CheckSquare,
      iconColor: 'text-warning',
    },
    {
      label: 'Tasa de recuperación',
      value: DASH,
      Icon: Percent,
      iconColor: 'text-fg-muted',
    },
  ]

  return (
    <section aria-label="Métricas de cobranza">
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        data-testid="cobranza-exec-kpi-grid"
      >
        {cells.map(({ label, value, Icon, iconColor }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={18} className={iconColor} weight="duotone" aria-hidden="true" />
              <p className="text-xs text-fg-muted leading-tight">{label}</p>
            </div>
            {isLoading && !data ? (
              <div className="h-6 w-16 rounded bg-surface-muted animate-pulse" />
            ) : (
              <p className="text-xl font-semibold text-fg mt-1 tabular-nums">{value}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
