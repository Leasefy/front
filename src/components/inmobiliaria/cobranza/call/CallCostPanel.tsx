'use client'

// Phase 31 plan 31-10 — LLM + voice + WhatsApp + total cost panel.
// Read-only; parent owns loading/error state of useCallDetail.

import { useI18n } from '@/lib/i18n'
import type { CallCostBreakdown } from '@/lib/hooks/cobranza/use-call-detail'

interface CallCostPanelProps {
  cost: CallCostBreakdown
}

function formatUsd(n: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-CO', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(n)
  } catch {
    return `$${n.toFixed(2)}`
  }
}

export default function CallCostPanel({ cost }: CallCostPanelProps) {
  const { t, locale } = useI18n()
  const allZero =
    (cost.llmUsd ?? 0) === 0 &&
    (cost.voiceUsd ?? 0) === 0 &&
    (cost.whatsappUsd ?? 0) === 0 &&
    (cost.totalUsd ?? 0) === 0
  return (
    <section
      aria-label={t('inmobiliaria.ai.cobranza.call.cost.title')}
      className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
    >
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
        {t('inmobiliaria.ai.cobranza.call.cost.title')}
      </h2>
      {allZero ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.ai.cobranza.call.cost.empty')}
        </p>
      ) : (
        <dl className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <dt className="text-neutral-600 dark:text-neutral-400">
              {t('inmobiliaria.ai.cobranza.call.cost.llm')}
            </dt>
            <dd className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
              {formatUsd(cost.llmUsd ?? 0, locale)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-600 dark:text-neutral-400">
              {t('inmobiliaria.ai.cobranza.call.cost.voice')}
            </dt>
            <dd className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
              {formatUsd(cost.voiceUsd ?? 0, locale)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-600 dark:text-neutral-400">
              {t('inmobiliaria.ai.cobranza.call.cost.whatsapp')}
            </dt>
            <dd className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
              {formatUsd(cost.whatsappUsd ?? 0, locale)}
            </dd>
          </div>
          <div className="flex justify-between pt-2 mt-1 border-t border-neutral-200 dark:border-neutral-800">
            <dt className="font-semibold text-neutral-800 dark:text-neutral-200">
              {t('inmobiliaria.ai.cobranza.call.cost.total')}
            </dt>
            <dd className="font-mono tabular-nums font-semibold text-neutral-900 dark:text-white">
              {formatUsd(cost.totalUsd ?? 0, locale)}
            </dd>
          </div>
        </dl>
      )}
    </section>
  )
}
