'use client'

import * as React from 'react'
import { ArrowUp, ArrowDown, Minus } from '@phosphor-icons/react'
import { AnimatedNumber, Pressable } from '@leasefy/cadence'
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
  // Roving-tabindex props (Phase 38 plan 38-04c / D-38-13).
  // All four optional so existing call-sites without them continue to work.
  role?: React.AriaRole
  'aria-selected'?: boolean
  tabIndex?: number
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>
  id?: string
  'aria-controls'?: string
  /**
   * La cifra cuenta desde 0 al aparecer (la pantalla acaba de cargar). Sin
   * esto, se muestra tal cual y sólo cuenta cuando cambia.
   */
  contarDesdeCero?: boolean
}

/** El número tal cual se escribía antes (`{count}`): sin separador de miles. */
const enteroTalCual = (n: number) => String(Math.round(n))

export const CobranzaStageCard = React.forwardRef<
  HTMLButtonElement,
  CobranzaStageCardProps
>(function CobranzaStageCard(
  {
    stage,
    count,
    avgDaysInStage,
    weeklyDelta,
    onStageClick,
    isLoading = false,
    role,
    'aria-selected': ariaSelected,
    tabIndex,
    onKeyDown,
    id,
    'aria-controls': ariaControls,
    contarDesdeCero = false,
  },
  ref,
) {
  const { t, locale } = useI18n()
  const colors = stageColorClasses(stage)
  const fullLabel = locale === 'es' ? STAGE_LABELS_ES[stage] : STAGE_LABELS_EN[stage]
  // "Nombre · rango" → name leads the card; the range joins the muted code line.
  const [displayName, dayRange] = fullLabel.split(' · ')

  const ariaLabel = t('inmobiliaria.ai.cobranza.overview.stages.ariaLabel', {
    stage,
    count,
  })

  // Movimiento (sistema de Cadence): la tarjeta sube 2px al pasar el puntero
  // y se hunde apenas al presionar (`Pressable`, resorte del sistema); antes
  // crecía con una duración inventada. La cifra cuenta cuando cambia.
  return (
    <Pressable hover="lift" press="sm">
      <button
        ref={ref}
        type="button"
        onClick={() => onStageClick(stage)}
        aria-label={ariaLabel}
        role={role}
        aria-selected={ariaSelected}
        tabIndex={tabIndex}
        onKeyDown={onKeyDown}
        id={id}
        aria-controls={ariaControls}
        className={[
          'w-full text-left rounded-lg border p-4 transition-shadow',
          colors.bg,
          colors.border,
          'hover:ring-2 hover:ring-offset-1',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-current',
        ].join(' ')}
      >
        {/* Display name — primary (human-first hierarchy) */}
        <p className={`text-sm font-semibold leading-tight ${colors.text}`}>
          {displayName}
        </p>

        {/* Stage code + day range — secondary, muted */}
        {/* QA-IA-95 (IA-B-09): sin el código crudo de la etapa («S1»); sólo el rango de días de mora. */}
        <p className={`text-xs tracking-wide uppercase mt-0.5 min-h-4 ${colors.text} opacity-60`}>
          {dayRange ?? ''}
        </p>

        {/* Count */}
        {isLoading ? (
          <div className="h-8 w-12 rounded bg-surface-muted animate-pulse mt-2" />
        ) : (
          <p className="text-3xl font-bold text-fg mt-2 font-mono tabular-nums">
            <AnimatedNumber
              value={count}
              from={contarDesdeCero ? 0 : undefined}
              format={enteroTalCual}
            />
          </p>
        )}

        {/* Días promedio — el endpoint devuelve el flotante crudo, y en pantalla
            salía «3.97885756959325 días promedio». Nadie lee catorce decimales:
            se redondea al día, que es la unidad en la que se piensa la mora. */}
        <p className="text-xs text-fg-subtle mt-1">
          {/* QA-IA-95 (IA-B-09): son días EN LA ETAPA (no de mora), con su número gramatical («1 día»). */}
          <span className="font-mono tabular-nums">{Math.round(avgDaysInStage)}</span>{' '}
          {Math.round(avgDaysInStage) === 1 ? (locale === 'es' ? 'día' : 'day') : locale === 'es' ? 'días' : 'days'}{' '}
          {t('inmobiliaria.ai.cobranza.overview.stages.avgDays')}
        </p>

        {/* Weekly delta */}
        <div className="flex items-center gap-1 mt-1.5">
          {weeklyDelta > 0 ? (
            <>
              <ArrowUp size={12} className="text-danger" />
              <span className="text-xs text-danger font-mono tabular-nums">+{weeklyDelta}</span>
            </>
          ) : weeklyDelta < 0 ? (
            <>
              <ArrowDown size={12} className="text-success" />
              <span className="text-xs text-success font-mono tabular-nums">{weeklyDelta}</span>
            </>
          ) : (
            <>
              <Minus size={12} className="text-fg-subtle" />
              <span className="text-xs text-fg-subtle font-mono tabular-nums">0</span>
            </>
          )}
        </div>
      </button>
    </Pressable>
  )
})
