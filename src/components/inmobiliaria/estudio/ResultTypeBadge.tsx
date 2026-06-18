'use client'

/**
 * ResultTypeBadge — estudio de inquilino.
 *
 * A pill that renders one of the 4 result types (viable · viable con
 * condiciones · requiere análisis humano · no recomendado) with the brand
 * color for that type. Label comes from i18n
 * (`inmobiliaria.ai.estudio.resultados.<resultType>`).
 */

import type { EstudioResultType } from '@/lib/estudio/decision'
import { resultTypeColorClasses } from '@/lib/estudio/colors'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface ResultTypeBadgeProps {
  resultType: EstudioResultType
  className?: string
}

export function ResultTypeBadge({ resultType, className }: ResultTypeBadgeProps) {
  const { t } = useI18n()
  const c = resultTypeColorClasses(resultType)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        c.text,
        c.bg,
        c.border,
        className,
      )}
      data-result-type={resultType}
    >
      <span aria-hidden className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.text.split(' ')[0].replace('text-', 'bg-'))} />
      {t(`inmobiliaria.ai.estudio.resultados.${resultType}`)}
    </span>
  )
}
