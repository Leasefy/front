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
import { escalationReasonLabel } from '@/lib/cobranza/call-vocab'
import { Button } from '@/components/ui'
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
  // Semantic status tints vía tokens del DS (danger=error, warning=warn, success=ok)
  live: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
    ring: 'ring-danger animate-pulse',
  },
  high: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
    ring: 'ring-danger',
  },
  medium: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
    ring: 'ring-warning',
  },
  low: {
    bg: 'bg-success-soft',
    text: 'text-success',
    ring: 'ring-success',
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
  // El nombre de la persona; el UUID queda de último recurso para deudores
  // borrados (una traza sin nombre sigue siendo mejor que una tarjeta vacía).
  const debtorLabel =
    escalation.debtor_name ?? escalation.debtor_id_masked ?? escalation.debtor_id
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
          className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${urgencyClass.bg} ${urgencyClass.text} ${urgencyClass.ring}`}
        >
          {urgencyLabel}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
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
          {/* La razón en palabras, no el slug (forced_transition_escalate_human). */}
          {escalationReasonLabel(escalation.reason) ?? truncate(escalation.reason, 80)}
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
            <Button
              size="sm"
              hideArrow
              onClick={() => onClaim(escalation.id)}
            >
              <Hand className="w-3.5 h-3.5" aria-hidden="true" />
              {t('inmobiliaria.ai.cobranza.escalaciones.actions.claim')}
            </Button>
          )}
          {showAssign && (
            <Button
              variant="outline"
              size="sm"
              hideArrow
              onClick={() => onAssign(escalation.id)}
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              {t('inmobiliaria.ai.cobranza.escalaciones.actions.assign')}
            </Button>
          )}
          {showResolve && (
            <Button
              variant={showAssign ? 'secondary' : 'default'}
              size="sm"
              hideArrow
              onClick={() => onResolve(escalation.id)}
            >
              <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
              {t('inmobiliaria.ai.cobranza.escalaciones.actions.resolve')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
