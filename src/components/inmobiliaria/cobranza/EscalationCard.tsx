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
 * Styling: follows mvp:docs/DESIGN.md §4 (cards `rounded-xl` + `shadow-sm`,
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
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-400',
    ring: 'ring-rose-200 dark:ring-rose-900 animate-pulse',
  },
  high: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-400',
    ring: 'ring-rose-200 dark:ring-rose-900',
  },
  medium: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    ring: 'ring-amber-200 dark:ring-amber-900',
  },
  low: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-900',
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
      className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow p-3 space-y-2"
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
        className="w-full text-left space-y-1 focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
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
              className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wide px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] transition"
            >
              <Hand className="w-3.5 h-3.5" aria-hidden="true" />
              {t('inmobiliaria.ai.cobranza.escalaciones.actions.claim')}
            </button>
          )}
          {showAssign && (
            <button
              type="button"
              onClick={() => onAssign(escalation.id)}
              className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wide px-2.5 py-1 rounded-md border border-border text-foreground hover:bg-muted active:scale-[0.97] transition"
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              {t('inmobiliaria.ai.cobranza.escalaciones.actions.assign')}
            </button>
          )}
          {showResolve && (
            <button
              type="button"
              onClick={() => onResolve(escalation.id)}
              className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wide px-2.5 py-1 rounded-md bg-emerald-600 dark:bg-emerald-700 text-white hover:opacity-90 active:scale-[0.97] transition"
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
