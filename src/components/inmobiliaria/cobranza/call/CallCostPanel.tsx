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
    (cost.platformUsd ?? 0) === 0 &&
    (cost.whatsappUsd ?? 0) === 0 &&
    (cost.totalUsd ?? 0) === 0
  return (
    <section
      aria-label={t('inmobiliaria.ai.cobranza.call.cost.title')}
      className="rounded-[22px] border border-border bg-surface p-4"
    >
      <h2 className="text-sm font-semibold text-fg mb-3">
        {t('inmobiliaria.ai.cobranza.call.cost.title')}
      </h2>
      {allZero ? (
        <p className="text-sm text-fg-muted">
          {t('inmobiliaria.ai.cobranza.call.cost.empty')}
        </p>
      ) : (
        <dl className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <dt className="text-fg-muted">
              {t('inmobiliaria.ai.cobranza.call.cost.llm')}
            </dt>
            <dd className="font-mono tabular-nums text-fg">
              {formatUsd(cost.llmUsd ?? 0, locale)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-muted">
              {t('inmobiliaria.ai.cobranza.call.cost.voice')}
            </dt>
            <dd className="font-mono tabular-nums text-fg">
              {formatUsd(cost.voiceUsd ?? 0, locale)}
            </dd>
          </div>
          {/*
            La tarifa de plataforma del proveedor de voz suele ser el
            componente MÁS grande de la llamada (0.0812 de 0.1405 en la muestra
            real). Sin esta fila, las partes no suman el total y el desglose
            miente.
          */}
          <div className="flex justify-between">
            <dt className="text-fg-muted">
              {t('inmobiliaria.ai.cobranza.call.cost.platform')}
            </dt>
            <dd className="font-mono tabular-nums text-fg">
              {formatUsd(cost.platformUsd ?? 0, locale)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-muted">
              {t('inmobiliaria.ai.cobranza.call.cost.whatsapp')}
            </dt>
            <dd className="font-mono tabular-nums text-fg">
              {formatUsd(cost.whatsappUsd ?? 0, locale)}
            </dd>
          </div>
          <div className="flex justify-between pt-2 mt-1 border-t border-border">
            <dt className="font-semibold text-fg">
              {t('inmobiliaria.ai.cobranza.call.cost.total')}
            </dt>
            <dd className="font-mono tabular-nums font-semibold text-fg">
              {formatUsd(cost.totalUsd ?? 0, locale)}
            </dd>
          </div>
        </dl>
      )}
    </section>
  )
}
