'use client'

/**
 * IndicadoresTable — estudio de inquilino.
 *
 * A clean grid of the 7 derived indicators (identidad, documentos, ingresos,
 * capacidad de pago, riesgo documental, crédito, codeudor). Each row =
 * i18n label (falling back to the indicator's default `label`) + a "resultado"
 * pill colored by `indicatorStatusClasses(ind.estado)`.
 */

import type { EstudioIndicator } from '@/lib/estudio/decision'
import { indicatorStatusClasses } from '@/lib/estudio/colors'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface IndicadoresTableProps {
  indicadores: EstudioIndicator[]
  className?: string
}

export function IndicadoresTable({ indicadores, className }: IndicadoresTableProps) {
  const { t } = useI18n()

  if (!indicadores || indicadores.length === 0) return null

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card overflow-hidden',
        className,
      )}
      data-testid="indicadores-table"
    >
      <ul role="list" className="divide-y divide-border">
        {indicadores.map((ind) => {
          // Missing key renders the raw key (visible bug) → use the default label
          // as fallback by comparing the resolved translation to the key itself.
          const key = `inmobiliaria.ai.estudio.indicadores.${ind.key}`
          const resolved = t(key)
          const label = resolved === key ? ind.label : resolved

          return (
            <li
              key={ind.key}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
              data-indicator={ind.key}
            >
              <span className="text-sm text-fg min-w-0 truncate">
                {label}
              </span>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shrink-0',
                  indicatorStatusClasses(ind.estado),
                )}
                data-estado={ind.estado}
              >
                {ind.resultado}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
