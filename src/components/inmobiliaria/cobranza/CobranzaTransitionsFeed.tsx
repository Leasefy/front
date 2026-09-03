'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { type CarteraStage, stageColorClasses, relativeTime } from '@/lib/cartera'
import type { CarteraOverviewResponse } from '@/lib/hooks/cobranza/use-cartera-overview'

interface CobranzaTransitionsFeedProps {
  transitions: CarteraOverviewResponse['lastTransitions']
  isLoading?: boolean
}

function StagePill({ stage }: { stage: string }) {
  const s = stage as CarteraStage
  const validStages: CarteraStage[] = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'SX']
  const colors = validStages.includes(s)
    ? stageColorClasses(s)
    : { text: 'text-fg-muted', bg: 'bg-surface-muted', border: 'border-border' }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-medium ${colors.bg} ${colors.text} border ${colors.border}`}
    >
      {stage}
    </span>
  )
}

export function CobranzaTransitionsFeed({
  transitions,
  isLoading = false,
}: CobranzaTransitionsFeedProps) {
  const { t, locale } = useI18n()

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-base font-semibold text-fg">
        {t('inmobiliaria.ai.cobranza.overview.transitions.title')}
      </h2>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-md bg-surface-muted animate-pulse" />
          ))}
        </div>
      ) : transitions.length === 0 ? (
        <div className="py-12 flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium text-fg-subtle">
            {t('inmobiliaria.ai.cobranza.overview.transitions.empty')}
          </p>
          <p className="text-xs text-fg-subtle max-w-xs">
            {t('inmobiliaria.ai.cobranza.overview.transitions.emptyHelper')}
          </p>
        </div>
      ) : (
        <ul
          aria-live="polite"
          aria-relevant="additions"
          className="mt-4 space-y-2"
        >
          <AnimatePresence initial={false}>
            {transitions.map((item) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-wrap items-start gap-2 p-3 rounded-md bg-surface-muted border border-border-faint"
              >
                {/* Stage transition */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <StagePill stage={item.fromStage} />
                  <span className="text-fg-subtle text-xs">→</span>
                  <StagePill stage={item.toStage} />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">
                    {item.debtorNameRedacted}
                  </p>
                  <p className="text-xs text-fg-subtle truncate">
                    {item.reason}
                  </p>
                </div>

                {/* Actor + time */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      item.actor === 'agent'
                        ? 'bg-surface-muted text-fg-muted'
                        : 'bg-surface-muted text-fg-subtle'
                    }`}
                  >
                    {item.actor === 'agent'
                      ? t('inmobiliaria.ai.cobranza.overview.transitions.agentActor')
                      : t('inmobiliaria.ai.cobranza.overview.transitions.humanActor')}
                  </span>
                  <span className="text-xs text-fg-subtle">
                    {relativeTime(item.transitionedAt, locale)}
                  </span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
