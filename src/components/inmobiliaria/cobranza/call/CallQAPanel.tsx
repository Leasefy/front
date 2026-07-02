'use client'

// Phase 31 plan 31-10 — Bayesian QA breakdown panel.
// Bayesian shrinkage applied server-side per Phase 25 D-25-17 chokepoint.
// Read-only; parent owns loading/error state of useCallDetail.

import { useI18n } from '@/lib/i18n'
import type { CallQAScores } from '@/lib/hooks/cobranza/use-call-detail'

interface CallQAPanelProps {
  qa: CallQAScores
}

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
  if (score >= 0.8) {
    return {
      bar: 'bg-success',
      text: 'text-success',
    }
  }
  if (score >= 0.6) {
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
  const pct = score == null ? null : Math.round(score * 100)
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
    qa.tone == null &&
    qa.compliance == null &&
    qa.recovery == null &&
    qa.clarity == null
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
          <ScoreRow
            label={t('inmobiliaria.ai.cobranza.call.qa.tone')}
            score={qa.tone}
          />
          <ScoreRow
            label={t('inmobiliaria.ai.cobranza.call.qa.compliance')}
            score={qa.compliance}
          />
          <ScoreRow
            label={t('inmobiliaria.ai.cobranza.call.qa.recovery')}
            score={qa.recovery}
          />
          <ScoreRow
            label={t('inmobiliaria.ai.cobranza.call.qa.clarity')}
            score={qa.clarity}
          />
        </div>
      )}
    </section>
  )
}
