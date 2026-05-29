'use client'

import { useI18n } from '@/lib/i18n'

export type ArcoStatus =
  | 'pending_email_verification'
  | 'pending_admin_triage'
  | 'in_progress'
  | 'pending_counsel_review'
  | 'resolved'
  | 'rejected'

export type ArcoStatusBadgeProps = {
  status: ArcoStatus
  className?: string
}

const STATUS_COLORS: Record<ArcoStatus, string> = {
  pending_email_verification: 'text-neutral-600 bg-neutral-100 dark:bg-neutral-800',
  pending_admin_triage: 'text-amber-700 bg-amber-50 dark:bg-amber-950/20',
  in_progress: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30',
  pending_counsel_review: 'text-amber-700 bg-amber-50 dark:bg-amber-950/20',
  resolved: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20',
  rejected: 'text-rose-700 bg-rose-50 dark:bg-rose-950/20',
}

const FALLBACK_STATUS: ArcoStatus = 'pending_admin_triage'

export function ArcoStatusBadge({ status, className }: ArcoStatusBadgeProps) {
  const { t } = useI18n()

  const colorClass = STATUS_COLORS[status] ?? STATUS_COLORS[FALLBACK_STATUS]

  return (
    <span
      className={`inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 ${colorClass} ${className ?? ''}`}
    >
      {t(`inmobiliaria.ai.arco.status.${status}`)}
    </span>
  )
}
