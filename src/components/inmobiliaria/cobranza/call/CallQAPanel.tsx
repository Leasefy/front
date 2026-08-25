'use client'

// Phase 31 plan 31-10 — Bayesian QA breakdown panel.
// Bayesian shrinkage applied server-side per Phase 25 D-25-17 chokepoint.
// Read-only; parent owns loading/error state of useCallDetail.

import { useI18n } from '@/lib/i18n'
import type { CallQAScores } from '@/lib/hooks/cobranza/use-call-detail'

interface CallQAPanelProps {
  qa: CallQAScores
}

/**
 * Las puntuaciones vienen en escala 0-100 (la base lo garantiza:
 * `calls_qa_score_decimal_range`). Antes se comparaban contra 0,8 / 0,6 —de
 * una escala 0-1 que nunca existió— así que TODA llamada caía en rojo y el
 * porcentaje se calculaba ×100 sobre un número que ya era porcentaje.
 */
function tone(score: number | null): {
  bar: string
  text: string
} {
  if (score == null) {
    return {
      bar: 'bg-surface-muted',
      text: 'text-fg-subtle',
    }
  }
  if (score >= 80) {
    return {
      bar: 'bg-success',
      text: 'text-success',
    }
  }
  if (score >= 60) {
    return {
      bar: 'bg-warning',
      text: 'text-warning',
    }
  }
  return { bar: 'bg-danger', text: 'text-danger' }
}

function ScoreRow({
  label,
  score,
}: {
  label: string
  score: number | null
}) {
  const c = tone(score)
  const pct = score == null ? null : Math.round(score)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-fg-muted">{label}</span>
        <span className={`font-mono font-semibold tabular-nums ${c.text}`}>
          {pct == null ? '—' : `${pct}/100`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? 0}
        aria-label={label}
        className="h-1.5 rounded-full bg-surface-muted overflow-hidden"
      >
        <div
          className={`h-full ${c.bar} transition-all`}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
    </div>
  )
}

export default function CallQAPanel({ qa }: CallQAPanelProps) {
  const { t } = useI18n()
  const allNull =
    qa.rapport == null &&
    qa.compliance == null &&
    qa.resolution == null &&
    qa.sentiment == null
  return (
    <section
      aria-label={t('inmobiliaria.ai.cobranza.call.qa.title')}
      className="rounded-xl border border-border bg-surface p-4"
    >
      <h2 className="text-sm font-semibold text-fg mb-3">
        {t('inmobiliaria.ai.cobranza.call.qa.title')}
      </h2>
      {allNull ? (
        <p className="text-sm text-fg-subtle">
          {t('inmobiliaria.ai.cobranza.call.qa.empty')}
        </p>
      ) : (
        <div className="space-y-3">
          <ScoreRow
            label={t('inmobiliaria.ai.cobranza.call.qa.overall')}
            score={qa.overall}
          />
          {/*
            Las cuatro dimensiones que el QaScorer realmente califica. Las que
            estaban antes (tono / recuperación / claridad) no existen en
            ningún lado: se inventaron junto con el contrato.
          */}
          <ScoreRow
            label={t('inmobiliaria.ai.cobranza.call.qa.rapport')}
            score={qa.rapport}
          />
          <ScoreRow
            label={t('inmobiliaria.ai.cobranza.call.qa.compliance')}
            score={qa.compliance}
          />
          <ScoreRow
            label={t('inmobiliaria.ai.cobranza.call.qa.resolution')}
            score={qa.resolution}
          />
          <ScoreRow
            label={t('inmobiliaria.ai.cobranza.call.qa.sentiment')}
            score={qa.sentiment}
          />
        </div>
      )}
    </section>
  )
}
