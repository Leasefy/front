'use client'

import { formatCurrency } from '@/lib/types/inmobiliaria'
import Link from 'next/link'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { CurrencyDollar } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { SinDatos } from '@/components/estado/SinDatos'
import type { MonthlyCostTrendRow } from '@/lib/hooks/cotizador/use-insights'

// Tokens del tema, no hex: recharts pinta atributos SVG y el navegador
// resuelve `var(--…)` en ellos.
const LINEA = 'hsl(var(--primary))'
const EJE = 'var(--fg-muted)'

const COSTOS_HREF = '/panel/inmobiliaria/postulaciones/asegurabilidad/costos'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface InsightsMonthlyCostPreviewProps {
  trend: MonthlyCostTrendRow[] | null
  isLoading?: boolean
}

function formatMonth(isoMonth: string): string {
  // "2026-01" → "Ene 26"
  const [year, month] = isoMonth.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function InsightsMonthlyCostPreview({
  trend,
  isLoading,
}: InsightsMonthlyCostPreviewProps) {
  const { t } = useI18n()

  // Loading skeleton
  if (isLoading && trend === null) {
    return (
      <div className="space-y-3 animate-pulse" role="status" aria-label="Cargando">
        <div className="h-[160px] bg-surface-muted rounded-lg" />
        <div className="h-4 w-40 bg-surface-muted rounded" />
        <span className="sr-only">Cargando…</span>
      </div>
    )
  }

  // El vacío de la casa, sin «Fase 35». La salida al detalle de costos se
  // queda: es real aunque hoy no haya serie.
  if (!trend || trend.length === 0) {
    return (
      <SinDatos
        queSon="costos mensuales"
        icono={CurrencyDollar}
        titulo={t('inmobiliaria.ai.cotizador.insights.costPreview.empty')}
        descripcion="Cuando haya consultas con costo en más de un mes, la tendencia se grafica acá."
        crear={{
          label: t('inmobiliaria.ai.cotizador.insights.costPreview.viewAll'),
          href: COSTOS_HREF,
        }}
        className="py-10"
      />
    )
  }

  // Show last 6 months of data
  const sliced = trend.slice(-6)

  // 🔴 En PESOS (Nico, 04-10-2026): el micro ya convierte con la tasa de la
  // plataforma. Un micro anterior mandaba texto: se sigue leyendo.
  const chartData = sliced.map((row) => ({
    month: row.month,
    total: (typeof row.total === 'number' ? row.total : parseFloat(row.total)) || 0,
  }))

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 9, fill: EJE }}
            tickFormatter={formatMonth}
          />
          <YAxis
            tickFormatter={(v: number) => formatCurrency(v)}
            tick={{ fontSize: 9, fill: EJE }}
            width={48}
          />
          <Tooltip
            formatter={(value: unknown) => {
              const n = typeof value === 'number' ? value : parseFloat(String(value)) || 0
              return [formatCurrency(n)]
            }}
            labelFormatter={(label: unknown) => formatMonth(String(label))}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke={LINEA}
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="text-center">
        <Link
          href={COSTOS_HREF}
          className="text-xs text-primary underline-offset-4 hover:underline font-medium"
        >
          {t('inmobiliaria.ai.cotizador.insights.costPreview.viewAll')}
        </Link>
      </div>
    </div>
  )
}
