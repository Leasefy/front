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
  pending_admin_triage: 'text-warning bg-warning-soft',
  in_progress: 'text-primary bg-primary-soft',
  pending_counsel_review: 'text-warning bg-warning-soft',
  resolved: 'text-success bg-success-soft',
  rejected: 'text-danger bg-danger-soft',
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
