'use client'

/**
 * RacionalTab — estudio de inquilino, vista de caso (zona CENTRO).
 *
 * El "por qué" del veredicto, en lenguaje humano:
 *  - los motivos derivados (decision.motivos)
 *  - la explicación del motor (result.explanation), si existe
 *  - el desglose ponderado de cada factor (score_breakdown → weighted)
 *
 * Transparencia de la decisión. Solo datos del pipeline + lo derivado en el
 * front — sin invenciones.
 */

import { useI18n } from '@/lib/i18n'
import type { EstudioDecision, TenantScoringResult } from '@/lib/estudio/decision'

interface RacionalTabProps {
  decision: EstudioDecision
  result: TenantScoringResult
}

const NS = 'inmobiliaria.ai.estudio'

const FACTOR_KEYS = [
  'solvencia',
  'credito',
  'estabilidad_laboral',
  'consistencia_cruzada',
  'identidad',
] as const

export function RacionalTab({ decision, result }: RacionalTabProps) {
  const { t } = useI18n()
  const explanation = result.explanation?.trim() || null
  const breakdown = result.score_breakdown

  return (
    <div className="space-y-5">
      {/* Motivos */}
      {decision.motivos.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-base font-semibold text-fg">
            {t(`${NS}.detalle.motivos`)}
          </h3>
          <ul role="list" className="mt-3 space-y-1.5">
            {decision.motivos.map((m, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm text-fg leading-snug"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 w-1 h-1 rounded-full bg-fg-subtle shrink-0"
                />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Explicación del motor */}
      {explanation && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-base font-semibold text-fg">
            {t(`${NS}.detalle.racional.explicacionTitulo`)}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            {explanation}
          </p>
        </section>
      )}

      {/* Aporte ponderado por factor (weighted) */}
      {breakdown && (
        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            {t(`${NS}.detalle.racional.aporteTitulo`)}
          </p>
          <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
            {FACTOR_KEYS.map((factor) => {
              const f = breakdown[factor]
              if (!f) return null
              return (
                <div
                  key={factor}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                  data-factor={factor}
                >
                  <span className="text-sm text-fg min-w-0 truncate">
                    {t(`${NS}.detalle.factores.${factor}`)}
                  </span>
                  <span className="flex items-center gap-2 shrink-0 text-xs tabular-nums">
                    <span className="text-fg-subtle">
                      {t(`${NS}.detalle.racional.fuente`)}: {f.source}
                    </span>
                    <span className="font-semibold text-fg">
                      {f.weighted.toFixed(1)}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
          {/* Total final */}
          <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-lg bg-surface-muted">
            <span className="text-sm font-medium text-fg">
              {t(`${NS}.detalle.racional.puntajeFinal`)}
            </span>
            <span className="text-sm font-semibold text-fg tabular-nums">
              {result.score}/100 · {t(`${NS}.detalle.nivel`)} {result.level}
            </span>
          </div>
        </section>
      )}
    </div>
  )
}
