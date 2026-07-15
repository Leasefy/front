'use client'

// Phase 31 plan 31-10 — chronological CarteraStageTransition list panel.
// Read-only; parent owns loading/error state of useCallDetail.

import { useI18n } from '@/lib/i18n'
import { relativeTime } from '@/lib/cartera'
import type { CallStateTraceRow } from '@/lib/hooks/cobranza/use-call-detail'

interface CallStateTracePanelProps {
  stateTrace: CallStateTraceRow[]
}

export default function CallStateTracePanel({
  stateTrace,
}: CallStateTracePanelProps) {
  const { t, locale } = useI18n()

  return (
    <section
      aria-label={t('inmobiliaria.ai.cobranza.call.stateTrace.title')}
      className="rounded-[22px] border border-border bg-surface p-4"
    >
      <h2 className="text-sm font-semibold text-fg mb-3">
        {t('inmobiliaria.ai.cobranza.call.stateTrace.title')}
      </h2>
      {stateTrace.length === 0 ? (
        <p className="text-sm text-fg-muted">
          {t('inmobiliaria.ai.cobranza.call.stateTrace.empty')}
        </p>
      ) : (
        <ol className="space-y-2">
          {stateTrace.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-0.5 border-l-2 border-border pl-3 py-1"
            >
              <p className="text-sm font-mono text-fg">
                {t('inmobiliaria.ai.cobranza.call.stateTrace.transition', {
                  from: row.fromStage,
                  to: row.toStage,
                })}
              </p>
              <p className="text-xs text-fg-subtle flex items-center gap-2">
                <span>{row.actor}</span>
                <span aria-hidden="true">·</span>
                <span>{relativeTime(row.at, locale)}</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
