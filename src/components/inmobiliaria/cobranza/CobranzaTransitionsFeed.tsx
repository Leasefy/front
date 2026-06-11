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
    : { text: 'text-neutral-600 dark:text-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-800', border: 'border-neutral-200 dark:border-neutral-700' }

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
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-5">
      <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
        {t('inmobiliaria.ai.cobranza.overview.transitions.title')}
      </h2>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-md bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : transitions.length === 0 ? (
        <div className="py-12 flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium text-neutral-500">
            {t('inmobiliaria.ai.cobranza.overview.transitions.empty')}
          </p>
          <p className="text-xs text-neutral-400 max-w-xs">
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
                className="flex flex-wrap items-start gap-2 p-3 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800"
              >
                {/* Stage transition */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <StagePill stage={item.fromStage} />
                  <span className="text-neutral-400 text-xs">→</span>
                  <StagePill stage={item.toStage} />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {item.debtorNameRedacted}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {item.reason}
                  </p>
                </div>

                {/* Actor + time */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      item.actor === 'agent'
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    {item.actor === 'agent'
                      ? t('inmobiliaria.ai.cobranza.overview.transitions.agentActor')
                      : t('inmobiliaria.ai.cobranza.overview.transitions.humanActor')}
                  </span>
                  <span className="text-xs text-neutral-400">
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
