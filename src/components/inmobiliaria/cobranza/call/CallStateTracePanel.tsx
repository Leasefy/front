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
      className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
    >
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
        {t('inmobiliaria.ai.cobranza.call.stateTrace.title')}
      </h2>
      {stateTrace.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.ai.cobranza.call.stateTrace.empty')}
        </p>
      ) : (
        <ol className="space-y-2">
          {stateTrace.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-0.5 border-l-2 border-neutral-200 dark:border-neutral-700 pl-3 py-1"
            >
              <p className="text-sm font-mono text-neutral-800 dark:text-neutral-200">
                {t('inmobiliaria.ai.cobranza.call.stateTrace.transition', {
                  from: row.fromStage,
                  to: row.toStage,
                })}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
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
