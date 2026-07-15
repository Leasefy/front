'use client'

import { Timer } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'

export type SlaBadgeProps = {
  deadline: Date
  type: 'acceso' | 'rectificacion' | 'cancelacion' | 'oposicion'
  className?: string
}

/**
 * Counts business days (Mon–Fri) between now and the deadline.
 * Returns a negative number when the deadline has passed.
 */
export function calcBusinessDaysRemaining(deadline: Date): number {
  const now = new Date()
  // Normalize both dates to midnight for consistent day counting
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate())

  const direction = end >= start ? 1 : -1
  let current = new Date(start)
  let count = 0

  while (true) {
    const next = new Date(current)
    next.setDate(next.getDate() + direction)

    const day = next.getDay()
    // Mon=1 through Fri=5 are business days
    if (day !== 0 && day !== 6) {
      count += direction
    }

    if (direction === 1 && next >= end) break
    if (direction === -1 && next <= end) break
    current = next
  }

  // If deadline is today or in the past (same day), return 0 or negative
  if (end < start) {
    // Already overdue — count backward
    let overdueCount = 0
    const c = new Date(end)
    while (c < start) {
      c.setDate(c.getDate() + 1)
      const day = c.getDay()
      if (day !== 0 && day !== 6) overdueCount++
    }
    return -overdueCount
  }

  return count
}

const SLA_COLORS = {
  onTime: 'text-success bg-success-soft',
  warning: 'text-warning bg-warning-soft',
  overdue: 'text-danger bg-danger-soft',
} as const

export function SlaCountdownBadge({ deadline, type: _type, className }: SlaBadgeProps) {
  const { t } = useI18n()
  const remaining = calcBusinessDaysRemaining(deadline)

  const state: keyof typeof SLA_COLORS =
    remaining <= 0 ? 'overdue' : remaining <= 2 ? 'warning' : 'onTime'

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-mono tabular-nums rounded-full px-2 py-0.5 ${SLA_COLORS[state]} ${className ?? ''}`}
    >
      <Timer className="h-3 w-3" weight="regular" />
      {remaining <= 0
        ? t('inmobiliaria.ai.arco.sla.overdue')
        : t('inmobiliaria.ai.arco.sla.days').replace('{count}', String(remaining))}
    </span>
  )
}
