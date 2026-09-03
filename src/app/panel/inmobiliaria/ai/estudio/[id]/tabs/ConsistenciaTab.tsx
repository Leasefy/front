'use client'

/**
 * ConsistenciaTab — estudio de inquilino, vista de caso (zona CENTRO).
 *
 * Las verificaciones cruzadas (consistencyChecks) que corrió el motor — cada
 * una pasó / parcial / omitida — más el desglose de puntaje (score_breakdown)
 * por factor, para que el humano entienda de dónde sale el nivel.
 *
 * Solo presentación de datos del pipeline — sin invenciones.
 */

import { CheckCircle, XCircle, MinusCircle, type Icon } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { TenantScoringResult } from '@/lib/estudio/decision'

interface ConsistenciaTabProps {
  result: TenantScoringResult
}

const NS = 'inmobiliaria.ai.estudio'

type CheckState = 'passed' | 'partial' | 'skipped' | 'failed'

function checkState(c: {
  passed: boolean
  partial?: boolean
  skipped?: boolean
}): CheckState {
  if (c.skipped) return 'skipped'
  if (c.partial) return 'partial'
  return c.passed ? 'passed' : 'failed'
}

const STATE_ICON: Record<CheckState, { icon: Icon; color: string }> = {
  passed: { icon: CheckCircle, color: 'text-success-700' },
  partial: { icon: MinusCircle, color: 'text-warning-700' },
  skipped: { icon: MinusCircle, color: 'text-fg-subtle' },
  failed: { icon: XCircle, color: 'text-danger' },
}

/** Etiquetas amigables de los 5 factores del score_breakdown. */
const FACTOR_KEYS = [
  'solvencia',
  'credito',
  'estabilidad_laboral',
  'consistencia_cruzada',
  'identidad',
] as const

export function ConsistenciaTab({ result }: ConsistenciaTabProps) {
  const { t } = useI18n()
  const checks = result.consistencyChecks ?? []
  const breakdown = result.score_breakdown

  const hasAnything = checks.length > 0 || !!breakdown

  if (!hasAnything) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-fg-muted">
          {t(`${NS}.detalle.consistencia.empty`)}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Verificaciones cruzadas */}
      {checks.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            {t(`${NS}.detalle.consistencia.verificacionesTitulo`)}
          </p>
          <ul role="list" className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
            {checks.map((c, i) => {
              const st = checkState(c)
              const { icon: Ico, color } = STATE_ICON[st]
              return (
                <li
                  key={`${c.name}-${i}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                  data-check-state={st}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Ico
                      className={cn('w-4 h-4 shrink-0', color)}
                      weight="duotone"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-fg min-w-0 truncate">
                      {c.name}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {typeof c.points === 'number' && (
                      <span className="text-xs text-fg-subtle tabular-nums">
                        {c.points > 0 ? '+' : ''}
                        {c.points}
                      </span>
                    )}
                    <span className={cn('text-xs font-medium whitespace-nowrap', color)}>
                      {t(`${NS}.detalle.consistencia.estado.${st}`)}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Desglose de puntaje */}
      {breakdown && (
        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            {t(`${NS}.detalle.consistencia.desgloseTitulo`)}
          </p>
          <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
            {FACTOR_KEYS.map((factor) => {
              const f = breakdown[factor]
              if (!f) return null
              const pct = Math.max(0, Math.min(100, Math.round(f.value)))
              return (
                <div key={factor} className="px-4 py-2.5" data-factor={factor}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-fg min-w-0 truncate">
                      {t(`${NS}.detalle.factores.${factor}`)}
                    </span>
                    <span className="text-xs text-fg-muted tabular-nums shrink-0">
                      {pct}/100 · ×{f.weight}
                    </span>
                  </div>
                  {/* Barra de progreso del factor */}
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
