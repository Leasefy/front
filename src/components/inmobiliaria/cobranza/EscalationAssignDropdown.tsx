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
import { createPortal } from 'react-dom'
import { X } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { useLenis } from '@/components/providers/SmoothScroll'
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
  const [mounted, setMounted] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!isOpen) return
    lenis?.stop()
    return () => {
      lenis?.start()
    }
  }, [isOpen, lenis])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const eligible = useMemo(
    () =>
      agencyMembers.filter(
        (m) => m.status === 'active' && ELIGIBLE_ROLES.has(m.role),
      ),
    [agencyMembers],
  )

  if (!isOpen || !mounted) return null

  const handleSelect = async (memberUserId: string, memberEmail: string) => {
    if (!escalationId) return
    setSubmitting(memberEmail)
    // Backend stores assignee_user_id as email (G-34-03-03), so we pass email.
    await onAssign(escalationId, memberEmail)
    setSubmitting(null)
    onClose()
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-dropdown-title"
        className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-4 animate-in slide-in-from-bottom md:fade-in duration-300"
      >
        <div className="bg-card text-foreground rounded-t-xl md:rounded-xl w-full md:max-w-md max-h-[80vh] flex flex-col">
          <div className="flex-none flex items-center justify-between border-b border-border px-5 py-4">
            <h2
              id="assign-dropdown-title"
              className="text-base font-semibold text-foreground"
            >
              {t('inmobiliaria.ai.cobranza.escalaciones.assignDialog.title')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('inmobiliaria.ai.cobranza.escalaciones.actions.cancel')}
              className="rounded-sm p-1 hover:bg-muted transition"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto py-2"
            data-lenis-prevent
            style={{ overscrollBehavior: 'contain' }}
          >
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
                          <span className="text-[11px] font-mono uppercase tracking-wide text-primary">
                            ✓
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
