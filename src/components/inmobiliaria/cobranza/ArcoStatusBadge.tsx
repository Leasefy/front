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
  pending_admin_triage: 'text-[#B7791F] bg-[#F8F0E0] dark:bg-[#B7791F]/15',
  in_progress: 'text-[#1A40FF] bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
  pending_counsel_review: 'text-[#B7791F] bg-[#F8F0E0] dark:bg-[#B7791F]/15',
  resolved: 'text-[#2C7A53] bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
  rejected: 'text-[#C4503B] bg-[#F8EAE7] dark:bg-[#C4503B]/15',
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
