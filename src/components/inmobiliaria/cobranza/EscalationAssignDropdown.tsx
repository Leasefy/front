'use client'

/**
 * EscalationAssignDropdown — Phase 34 plan 34-06 (D-34-02 hybrid model).
 *
 * Lightweight dropdown shown when an admin clicks "Asignar" on a card.
 * Renders the agency members list (already loaded via inmobiliariaService)
 * filtered to those who hold cobranza:resolve-escalation server-side.
 *
 * In v1 the filtering happens server-side via the existing /agency/members
 * endpoint (members come with role; we use role-based filter ADMIN/OPERATOR
 * which D-34-RES-A3 grants resolve-escalation to). A future hardening pass
 * can move to a dedicated /agency/members?with_perm=… endpoint.
 *
 * Styling: DESIGN.md §15 search/filter patterns + §4 drawer.
 */

import { useEffect, useMemo, useState } from 'react'
import { MonoLabel } from '@leasefy/cadence'

import { useI18n } from '@/lib/i18n'
import { useLenis } from '@/components/providers/SmoothScroll'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import type { AgencyUser } from '@/lib/types/inmobiliaria'

interface EscalationAssignDropdownProps {
  escalationId: string | null
  isOpen: boolean
  onClose: () => void
  agencyMembers: AgencyUser[]
  currentAssigneeUserId: string | null
  onAssign: (escalationId: string, memberUserId: string) => Promise<void>
}

const ELIGIBLE_ROLES = new Set(['admin', 'agente', 'ADMIN', 'AGENTE', 'OPERATOR', 'OWNER'])

export function EscalationAssignDropdown({
  escalationId,
  isOpen,
  onClose,
  agencyMembers,
  currentAssigneeUserId,
  onAssign,
}: EscalationAssignDropdownProps) {
  const { t } = useI18n()
  const lenis = useLenis()
  const [submitting, setSubmitting] = useState<string | null>(null)

  // Lenis stop/start — Phase 31 invariant (DESIGN.md §8)
  useEffect(() => {
    if (!isOpen) return
    lenis?.stop()
    return () => {
      lenis?.start()
    }
  }, [isOpen, lenis])

  const eligible = useMemo(
    () =>
      agencyMembers.filter(
        (m) => m.status === 'active' && ELIGIBLE_ROLES.has(m.role),
      ),
    [agencyMembers],
  )

  const handleSelect = async (memberUserId: string, memberEmail: string) => {
    if (!escalationId) return
    setSubmitting(memberEmail)
    // Backend stores assignee_user_id as email (G-34-03-03), so we pass email.
    await onAssign(escalationId, memberEmail)
    setSubmitting(null)
    onClose()
  }

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <ResponsiveDialogContent
        className="max-w-md max-h-[80dvh] overflow-y-auto gap-0 p-0"
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
      >
        <ResponsiveDialogHeader className="border-b border-border px-5 py-4">
          <ResponsiveDialogTitle>
            {t('inmobiliaria.ai.cobranza.escalaciones.assignDialog.title')}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="py-2">
          {eligible.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground text-center">
              {t('inmobiliaria.ai.cobranza.escalaciones.assignDialog.placeholder')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {eligible.map((m) => {
                const isCurrent = currentAssigneeUserId === m.email
                const isSubmitting = submitting === m.email
                return (
                  <li key={m.id}>
                    {/* ALLOWLIST: whole-row member selector (two-line name+email +
                        check). List-row precedent — Button/IconButton can't host
                        the multiline row layout; accessible name = visible content. */}
                    <button
                      type="button"
                      onClick={() => void handleSelect(m.id, m.email)}
                      disabled={isSubmitting || submitting !== null}
                      className="w-full text-left px-5 py-3 flex items-center justify-between hover:bg-muted transition disabled:opacity-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                      {isCurrent && (
                        <MonoLabel className="tracking-wide text-primary">✓</MonoLabel>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
