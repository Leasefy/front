'use client'

/**
 * CostSourcePieChart.tsx — Phase 35 plan 35-10
 *
 * Recharts PieChart with cost-SUM-driven muting per D-35-06 + RESEARCH.md finding 4.
 *
 * Wedge muting is driven by actual cost SUM (not the populated flag):
 *   - anthropic: cobalto (`--primary`), always full opacity
 *   - carrier_api: cobalto, fillOpacity 0.4 when SUM === 0 else 1
 *   - sekure_commission: same as carrier_api
 *   - datacredito: `--fg-subtle`, always muted (fillOpacity 0.4)
 *
 * Los colores son tokens del tema, no hex: recharts pinta atributos SVG y el
 * navegador resuelve `var(--…)` en ellos. Cuando una porción está atenuada,
 * la leyenda explica por qué en un tooltip — con la nota que publica el
 * micro para esa fuente, sin nombres internos de etapas del roadmap.
 */

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { CostSourceRow } from '@/lib/hooks/cotizador/use-costos'

const COBALTO = 'hsl(var(--primary))'
const APOYO = 'hsl(var(--chart-3))'
const ATENUADO = 'var(--fg-subtle)'

// =============================================================================
// Types
// =============================================================================

interface CostSourcePieChartProps {
  sources: {
    anthropicTotal: number
    carrierApiTotal: number
    sekureCommissionTotal: number
    datacreditoTotal: number
  } | null
  costSources: CostSourceRow[]
  isLoading?: boolean
}

interface PieDatum {
  name: string
  value: number
  fill: string
  fillOpacity: number
  sourceKey: string
  isMuted: boolean
  notes: string | null
}

// =============================================================================
// Component
// =============================================================================

export function CostSourcePieChart({ sources, costSources, isLoading = false }: CostSourcePieChartProps) {

  if (isLoading) {
    return (
      <div
        className="h-[260px] w-full rounded bg-surface-muted animate-pulse"
        role="status"
        aria-label="Cargando"
      >
        <span className="sr-only">Cargando…</span>
      </div>
    )
  }

  // Build pie data from sources — muting driven by cost SUM (D-35-06)
  const anthropicTotal = sources?.anthropicTotal ?? 0
  const carrierApiTotal = sources?.carrierApiTotal ?? 0
  const sekureCommissionTotal = sources?.sekureCommissionTotal ?? 0
  const datacreditoTotal = sources?.datacreditoTotal ?? 0

  // If all sources are 0, show a placeholder single full-opacity wedge for anthropic
  const totalSum = anthropicTotal + carrierApiTotal + sekureCommissionTotal + datacreditoTotal

  const findLabel = (key: string) => {
    const src = costSources.find(s => s.key === key)
    return src?.label ?? key
  }

  const findNotes = (key: string) => {
    const src = costSources.find(s => s.key === key)
    return src?.notes ?? null
  }

  const pieData: PieDatum[] = [
    {
      name: findLabel('anthropic'),
      value: totalSum === 0 ? 1 : anthropicTotal, // prevent empty pie
      fill: COBALTO,
      fillOpacity: 1,    // always active
      sourceKey: 'anthropic',
      isMuted: false,
      notes: null,
    },
    {
      name: findLabel('carrier_api'),
      value: totalSum === 0 ? 0 : carrierApiTotal,
      fill: APOYO,
      fillOpacity: carrierApiTotal === 0 ? 0.4 : 1,  // muted when SUM=0
      sourceKey: 'carrier_api',
      isMuted: carrierApiTotal === 0,
      notes: findNotes('carrier_api'),
    },
    {
      name: findLabel('sekure_commission'),
      value: totalSum === 0 ? 0 : sekureCommissionTotal,
      fill: APOYO,
      fillOpacity: sekureCommissionTotal === 0 ? 0.4 : 1,
      sourceKey: 'sekure_commission',
      isMuted: sekureCommissionTotal === 0,
      notes: findNotes('sekure_commission'),
    },
    {
      name: findLabel('datacredito'),
      value: totalSum === 0 ? 0 : datacreditoTotal,
      fill: ATENUADO,
      fillOpacity: 0.4,  // always muted
      sourceKey: 'datacredito',
      isMuted: true,
      notes: findNotes('datacredito'),
    },
  ].filter(d => totalSum === 0 ? d.sourceKey === 'anthropic' : d.value > 0 || d.isMuted)

  // Leyenda propia: las fuentes atenuadas explican por qué al pasar el mouse.
  const renderLegend = (props: { payload?: Array<{ value: string; color: string; payload: PieDatum }> }) => {
    const { payload = [] } = props
    return (
      <ul className="flex flex-col gap-1.5 text-xs">
        {payload.map((entry, idx) => {
          const datum = entry.payload
          if (datum?.isMuted) {
            return (
              <li key={idx} className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: entry.color, opacity: 0.4 }}
                />
                <TooltipProvider>
                  <ShadcnTooltip>
                    <TooltipTrigger asChild>
                      <span className="text-fg-subtle cursor-help underline decoration-dotted">
                        {entry.value}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[240px]">
                      {datum.notes ?? 'Esta fuente todavía no registra gasto en el período.'}
                    </TooltipContent>
                  </ShadcnTooltip>
                </TooltipProvider>
              </li>
            )
          }
          return (
            <li key={idx} className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: entry.color }}
              />
              <span className="text-fg">{entry.value}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          paddingAngle={2}
        >
          {pieData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.fill}
              fillOpacity={entry.fillOpacity}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: unknown) => [`$${Number(value).toFixed(4)}`, '']}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          content={renderLegend as never}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
