'use client'

/**
 * SlaCountdownBadge — cuánto queda del término legal de una solicitud ARCO.
 *
 * Envuelve el `StatusBadge` de Cadence. El punto del DS se apaga (`dot={false}`)
 * porque acá el glifo que importa es el del reloj: el estado no se comunica
 * sólo con color (DESIGN.md §7), y un temporizador dice más que un punto.
 *
 * El agente ya calcula los días hábiles restantes (`sla_remaining_days`), así
 * que acá NO se recalcula nada: dos relojes que no coinciden es peor que uno.
 */

import { Timer, WarningCircle, CheckCircle, Clock } from '@phosphor-icons/react'
import { StatusBadge, type SemanticTone } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
// Un solo umbral para todo ARCO: acá decide el ámbar del badge, y en la lista
// decide la franja de la fila y el conteo de «urgentes». Duplicarlo hacía que
// cambiar uno dejara la fila y su badge diciendo cosas distintas.
import { ARCO_URGENT_THRESHOLD_DAYS } from '@/lib/hooks/cobranza/use-arco-requests'

const NS = 'inmobiliaria.ai.arco.sla'

export type SlaBadgeProps = {
  /** Días hábiles restantes. Cero o negativo = vencido. */
  remainingDays: number
  /** La solicitud ya se cerró: el reloj dejó de correr. */
  isClosed?: boolean
  /** El reloj aún no arranca (falta que la persona confirme su correo). */
  isPaused?: boolean
  className?: string
}

export function SlaCountdownBadge({
  remainingDays,
  isClosed = false,
  isPaused = false,
  className,
}: SlaBadgeProps) {
  const { t } = useI18n()

  const { tone, icon, label } = ((): {
    tone: SemanticTone
    icon: React.ReactNode
    label: string
  } => {
    if (isClosed) {
      return {
        tone: 'neutral',
        icon: <CheckCircle className="h-3 w-3 shrink-0" weight="regular" aria-hidden="true" />,
        label: t(`${NS}.closed`),
      }
    }
    if (isPaused) {
      return {
        tone: 'neutral',
        icon: <Clock className="h-3 w-3 shrink-0" weight="regular" aria-hidden="true" />,
        label: t(`${NS}.paused`),
      }
    }
    if (remainingDays < 0) {
      return {
        tone: 'critical',
        icon: <WarningCircle className="h-3 w-3 shrink-0" weight="fill" aria-hidden="true" />,
        label: t(`${NS}.overdueBy`).replace('{count}', String(Math.abs(remainingDays))),
      }
    }
    if (remainingDays === 0) {
      return {
        tone: 'critical',
        icon: <WarningCircle className="h-3 w-3 shrink-0" weight="fill" aria-hidden="true" />,
        label: t(`${NS}.today`),
      }
    }
    return {
      tone: remainingDays <= ARCO_URGENT_THRESHOLD_DAYS ? 'warning' : 'success',
      icon: <Timer className="h-3 w-3 shrink-0" weight="regular" aria-hidden="true" />,
      label: t(remainingDays === 1 ? `${NS}.day` : `${NS}.days`).replace(
        '{count}',
        String(remainingDays),
      ),
    }
  })()

  return (
    <StatusBadge
      tone={tone}
      dot={false}
      // Números en mono tabular: la columna de plazos se lee en vertical.
      className={cn('gap-1 font-mono tabular-nums', className)}
    >
      {icon}
      {label}
    </StatusBadge>
  )
}
