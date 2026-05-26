'use client'

import { ArrowUp, ArrowDown, Minus } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import {
  type CarteraStage,
  stageColorClasses,
  STAGE_LABELS_ES,
  STAGE_LABELS_EN,
} from '@/lib/cartera'

interface CobranzaStageCardProps {
  stage: CarteraStage
  count: number
  avgDaysInStage: number
  weeklyDelta: number
  onStageClick: (stage: CarteraStage) => void
  isLoading?: boolean
}

export function CobranzaStageCard({
  stage,
  count,
  avgDaysInStage,
  weeklyDelta,
  onStageClick,
  isLoading = false,
}: CobranzaStageCardProps) {
  const { t, locale } = useI18n()
  const colors = stageColorClasses(stage)
  const displayName = locale === 'es' ? STAGE_LABELS_ES[stage] : STAGE_LABELS_EN[stage]

  const ariaLabel = t('inmobiliaria.ai.cobranza.overview.stages.ariaLabel', {
    stage,
    count,
  })

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
    >
      <button
        type="button"
        onClick={() => onStageClick(stage)}
        aria-label={ariaLabel}
        className={[
          'w-full text-left rounded-xl border p-4 transition-shadow',
          colors.bg,
          colors.border,
          'hover:ring-2 hover:ring-offset-1',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-current',
        ].join(' ')}
      >
        {/* Stage code */}
        <span className={`font-mono text-sm tracking-widest uppercase ${colors.text}`}>
          {stage}
        </span>

        {/* Display name */}
        <p className={`text-xs mt-0.5 leading-tight ${colors.text} opacity-80`}>
          {displayName}
        </p>

        {/* Count */}
        {isLoading ? (
          <div className="h-8 w-12 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse mt-2" />
        ) : (
          <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-2">
            {count}
          </p>
        )}

        {/* Avg days */}
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {avgDaysInStage} {t('inmobiliaria.ai.cobranza.overview.stages.avgDays')}
        </p>

        {/* Weekly delta */}
        <div className="flex items-center gap-1 mt-1.5">
          {weeklyDelta > 0 ? (
            <>
              <ArrowUp size={12} className="text-red-500" />
              <span className="text-xs text-red-500">+{weeklyDelta}</span>
            </>
          ) : weeklyDelta < 0 ? (
            <>
              <ArrowDown size={12} className="text-green-500" />
              <span className="text-xs text-green-500">{weeklyDelta}</span>
            </>
          ) : (
            <>
              <Minus size={12} className="text-neutral-400" />
              <span className="text-xs text-neutral-400">0</span>
            </>
          )}
        </div>
      </button>
    </motion.div>
  )
}
