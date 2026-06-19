'use client'

/**
 * EscalationCard — Phase 34 plan 34-06 (D-34-01: click-to-move).
 *
 * Renders one kanban row. Buttons (Tomar / Asignar / Resolver) are
 * explicit click actions — no drag-and-drop. Visibility follows the
 * D-34-02 hybrid model:
 *   - Operator (resolve-perm only): "Tomar" iff unassigned
 *   - Admin (assign-perm): "Asignar" always
 *   - Anyone with resolve-perm who is the assignee OR has assign-perm: "Resolver"
 *
 * Styling: follows mvp:docs/DESIGN.md §4 (cards `rounded-xl` + ``,
 * indigo accent for primary, rose for severe). Urgency colors follow
 * mvp:docs/COLOR_SYSTEM.md (rose = error, amber = warning, emerald = ok).
 */

import { useMemo } from 'react'
import { Clock, UserPlus, CheckCircle, Hand } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import type { Escalation } from '@/lib/hooks/cobranza/use-escalations'
import type { UrgencyLevel } from '@/lib/constants/cobranza/escalation-templates'

interface EscalationCardProps {
  escalation: Escalation
  currentUserEmail: string | null
  hasResolvePerm: boolean
  hasAssignPerm: boolean
  onOpen: (id: string) => void
  onClaim: (id: string) => void
  onAssign: (id: string) => void
  onResolve: (id: string) => void
}

const URGENCY_TOKEN: Record<UrgencyLevel, { bg: string; text: string; ring: string }> = {
  // mvp:docs/COLOR_SYSTEM.md — semantic scales (rose=error, amber=warn, emerald=ok)
  live: {
    bg: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15',
    text: 'text-[#C4503B] dark:text-[#E0664D]',
    ring: 'ring-[#C4503B] dark:ring-[#C4503B] animate-pulse',
  },
  high: {
    bg: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15',
    text: 'text-[#C4503B] dark:text-[#E0664D]',
    ring: 'ring-[#C4503B] dark:ring-[#C4503B]',
  },
  medium: {
    bg: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
    text: 'text-[#B7791F] dark:text-[#D2992F]',
    ring: 'ring-[#B7791F] dark:ring-[#B7791F]',
  },
  low: {
    bg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
    text: 'text-[#2C7A53] dark:text-[#3EAE70]',
    ring: 'ring-[#2C7A53] dark:ring-[#2C7A53]',
  },
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

function relative(iso: string, locale: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const deltaSec = Math.max(0, Math.round((now - then) / 1000))
  if (deltaSec < 60) return locale.startsWith('es') ? `hace ${deltaSec}s` : `${deltaSec}s ago`
  const deltaMin = Math.round(deltaSec / 60)
  if (deltaMin < 60) return locale.startsWith('es') ? `hace ${deltaMin}m` : `${deltaMin}m ago`
  const deltaHr = Math.round(deltaMin / 60)
  if (deltaHr < 24) return locale.startsWith('es') ? `hace ${deltaHr}h` : `${deltaHr}h ago`
  const deltaDay = Math.round(deltaHr / 24)
  return locale.startsWith('es') ? `hace ${deltaDay}d` : `${deltaDay}d ago`
}

export function EscalationCard({
  escalation,
  currentUserEmail,
  hasResolvePerm,
  hasAssignPerm,
  onOpen,
  onClaim,
  onAssign,
  onResolve,
}: EscalationCardProps) {
  const { t, locale } = useI18n()

  const urgencyClass = URGENCY_TOKEN[escalation.urgency]
  const debtorLabel = escalation.debtor_id_masked ?? escalation.debtor_id
  const isAssignedToMe =
    currentUserEmail !== null && escalation.assignee_user_id === currentUserEmail
  const isUnassigned = escalation.assignee_user_id === null
  const isResolved = escalation.status === 'resolved'

  const showClaim = !isResolved && isUnassigned && hasResolvePerm && !hasAssignPerm
  const showAssign = !isResolved && hasAssignPerm
  const showResolve = !isResolved && hasResolvePerm && (isAssignedToMe || hasAssignPerm)

  const urgencyLabel = useMemo(
    () => t(`inmobiliaria.ai.cobranza.escalaciones.urgency.${escalation.urgency}`),
    [t, escalation.urgency],
  )

  return (
    <div
      className="rounded-xl border border-border bg-card hover: transition-shadow p-3 space-y-2"
      data-testid={`escalation-card-${escalation.id}`}
    >
      {/* Header: urgency + relative time */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${urgencyClass.bg} ${urgencyClass.text} ${urgencyClass.ring}`}
        >
          {urgencyLabel}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
          <Clock className="w-3 h-3" aria-hidden="true" />
          {relative(escalation.created_at, locale)}
        </span>
      </div>

      {/* Body: clickable surface that opens detail */}
      <button
        type="button"
        onClick={() => onOpen(escalation.id)}
        className="w-full text-left space-y-1 focus:outline-none focus:ring-2 focus:ring-primary rounded-sm"
        aria-label={`Open escalation ${escalation.id}`}
      >
        <p className="text-sm font-semibold text-foreground tabular-nums">
          {debtorLabel}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {truncate(escalation.reason, 80)}
        </p>
        {escalation.assignee_email && (
          <p className="text-[11px] text-muted-foreground italic">
            {t('inmobiliaria.ai.cobranza.escalaciones.detail.assignee')}:{' '}
            <span className="not-italic font-medium">{escalation.assignee_email}</span>
          </p>
        )}
      </button>

      {/* Actions */}
      {(showClaim || showAssign || showResolve) && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {showClaim && (
            <button
              type="button"
              onClick={() => onClaim(escalation.id)}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-sm bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] transition font-medium"
            >
              <Hand className="w-3.5 h-3.5" aria-hidden="true" />
              {t('inmobiliaria.ai.cobranza.escalaciones.actions.claim')}
            </button>
          )}
          {showAssign && (
            <button
              type="button"
              onClick={() => onAssign(escalation.id)}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-sm border border-border text-foreground hover:bg-muted active:scale-[0.97] transition font-medium"
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              {t('inmobiliaria.ai.cobranza.escalaciones.actions.assign')}
            </button>
          )}
          {showResolve && (
            <button
              type="button"
              onClick={() => onResolve(escalation.id)}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-sm bg-[#2C7A53] dark:bg-[#3EAE70] text-white hover:opacity-90 active:scale-[0.97] transition font-medium"
            >
              <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
              {t('inmobiliaria.ai.cobranza.escalaciones.actions.resolve')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
