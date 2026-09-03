'use client'

/**
 * EstudioSidebar — estudio de inquilino, vista de caso (zona IZQUIERDA "Contexto").
 *
 * Espejo de DebtorSidebar (cobranza): aside con eyebrow de zona + el headline
 * del caso (ResultTypeBadge) + bloques KPI que el motor YA produce:
 *   - banda/score (decision.scoreBand + decision.score)
 *   - relación ingreso/canon (result.financialAnalysis.incomeToRentRatio)
 *   - documentos procesados (result.documents_summary)
 *
 * Maneja isLoading (animate-pulse) y null ("sin datos"). UX-only — no ejecuta
 * nada; solo presenta el contexto derivado del motor.
 */

import { ResultTypeBadge } from '@/components/inmobiliaria/estudio/ResultTypeBadge'
import { useI18n } from '@/lib/i18n'
import type { EstudioDecision, TenantScoringResult } from '@/lib/estudio/decision'

const NS = 'inmobiliaria.ai.estudio'

interface EstudioSidebarProps {
  decision: EstudioDecision | null
  result: TenantScoringResult | null
  isLoading: boolean
}

export function EstudioSidebar({ decision, result, isLoading }: EstudioSidebarProps) {
  const { t } = useI18n()

  if (isLoading && !decision) {
    return (
      <aside className="rounded-lg border border-border bg-card p-4 animate-pulse">
        <div className="h-4 w-1/2 bg-surface-muted rounded mb-3" />
        <div className="h-6 w-2/3 bg-surface-muted rounded-full mb-4" />
        <div className="h-3 w-3/4 bg-surface-muted rounded mb-2" />
        <div className="h-3 w-2/3 bg-surface-muted rounded" />
      </aside>
    )
  }

  if (!decision) {
    return (
      <aside className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-fg-muted">
          {t(`${NS}.detalle.sinDatos`)}
        </p>
      </aside>
    )
  }

  const fin = result?.financialAnalysis ?? null
  const ratio = fin?.incomeToRentRatio ?? null
  const docs = result?.documents_summary ?? null

  return (
    <aside className="rounded-lg border border-border bg-card p-4 space-y-4">
      {/* Zone eyebrow */}
      <h2 className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
        />
        <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          {t(`${NS}.detalle.contexto`)}
        </span>
      </h2>

      {/* Headline — tipo de resultado */}
      <div>
        <ResultTypeBadge resultType={decision.resultType} />
      </div>

      {/* Banda / score */}
      <div>
        <p className="text-xs font-medium text-fg-muted">
          {t(`${NS}.detalle.puntaje`)}
        </p>
        <p className="mt-0.5 text-xl font-semibold tracking-tight text-fg tabular-nums">
          {decision.score}
          <span className="text-sm font-normal text-fg-subtle">
            /100
          </span>
          <span className="ml-2 text-sm font-medium text-fg-muted">
            {t(`${NS}.detalle.nivel`)} {decision.scoreBand}
          </span>
        </p>
      </div>

      {/* Relación ingreso / canon + documentos */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
        <div>
          <p className="text-xs font-medium text-fg-muted">
            {t(`${NS}.detalle.relacionIngresoCanon`)}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-fg tabular-nums">
            {ratio === null ? '—' : `${ratio.toFixed(1)}×`}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-fg-muted">
            {t(`${NS}.detalle.documentosProcesados`)}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-fg tabular-nums">
            {docs ? `${docs.processed}/${docs.total_sent}` : '—'}
          </p>
        </div>
      </div>

      {/* Codeudor recomendado — señal contextual */}
      {decision.requiereCodeudor && (
        <div className="rounded-md bg-warning-soft border border-warning/30 px-3 py-2 text-xs text-warning-700">
          {t(`${NS}.detalle.codeudorRecomendado`)}
        </div>
      )}
    </aside>
  )
}
