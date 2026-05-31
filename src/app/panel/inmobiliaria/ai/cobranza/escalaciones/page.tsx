'use client'

/**
 * Cobranza Escalations Kanban — Phase 34 plan 34-06 (D-34-01..D-34-05).
 *
 * 3 columns: Abiertas / Asignadas / Resueltas (últimos 7 días).
 * Cards sorted by URGENCY_RANK DESC then created_at DESC (defensive client-
 * side resort, backend already sorts).
 *
 * Click-button actions only (D-34-01) — no drag-drop. Buttons hidden via
 * RBAC (D-34-02: operator sees Tomar; admin sees Asignar; assignee/admin
 * sees Resolver).
 *
 * Refs mvp:docs/DESIGN.md §1 (sobrio + warm), §4 (cards rounded-xl + shadow),
 * §11 (loading state), §16 (numeric tabular-nums).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowClockwise, CheckCircle } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import {
  useEscalations,
  type Escalation,
} from '@/lib/hooks/cobranza/use-escalations'
import { EscalationCard } from '@/components/inmobiliaria/cobranza/EscalationCard'
import { EscalationResolveModal } from '@/components/inmobiliaria/cobranza/EscalationResolveModal'
import { EscalationAssignDropdown } from '@/components/inmobiliaria/cobranza/EscalationAssignDropdown'
import { inmobiliariaConfigApi } from '@/lib/api/inmobiliaria.service'
import type { AgencyUser } from '@/lib/types/inmobiliaria'
import { CobranzaEscalacionesSkeleton } from '@/components/skeleton/panel/CobranzaEscalacionesSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'

function EscalacionesContent() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { user } = useAuth()
  const { canAccess } = usePermissionsContext()

  const { data, isLoading, error, mutate, claim, assign, resolve } = useEscalations()

  const hasResolvePerm = canAccess('cobranza', 'resolve-escalation')
  const hasAssignPerm = canAccess('cobranza', 'assign-escalation')

  const currentUserEmail = user?.email ?? null

  const [resolveOpen, setResolveOpen] = useState<string | null>(null)
  const [assignOpen, setAssignOpen] = useState<string | null>(null)
  const [members, setMembers] = useState<AgencyUser[]>([])

  // Load agency members once (only if user can assign)
  useEffect(() => {
    if (!hasAssignPerm) return
    let cancelled = false
    inmobiliariaConfigApi
      .getUsers()
      .then((list: AgencyUser[]) => {
        if (!cancelled) setMembers(list)
      })
      .catch(() => {
        /* swallow — assign dropdown will show empty state */
      })
    return () => {
      cancelled = true
    }
  }, [hasAssignPerm])

  const handleOpenDetail = useCallback(
    (id: string) => {
      router.push(`/panel/inmobiliaria/ai/cobranza/escalaciones/${id}`)
    },
    [router],
  )

  const handleClaim = useCallback(
    async (id: string) => {
      await claim(id)
    },
    [claim],
  )

  const handleResolve = useCallback(
    async (
      id: string,
      body: { category: Parameters<typeof resolve>[1]['category']; resolution_text: string },
    ) => resolve(id, body),
    [resolve],
  )

  const handleAssign = useCallback(
    async (id: string, memberUserId: string) => {
      await assign(id, memberUserId)
    },
    [assign],
  )

  const lastUpdated = useMemo(() => {
    if (!data?.generatedAt) return null
    const sec = Math.max(
      0,
      Math.round((Date.now() - new Date(data.generatedAt).getTime()) / 1000),
    )
    if (sec < 60) return locale.startsWith('es') ? `hace ${sec}s` : `${sec}s ago`
    const min = Math.round(sec / 60)
    return locale.startsWith('es') ? `hace ${min}m` : `${min}m ago`
  }, [data?.generatedAt, locale])

  // ARIA live region — announces newly-arrived open escalations to screen
  // readers (Phase 38 plan 38-04c / XR-06 / WCAG 4.1.3). We compare the
  // current data.open.length against the previously-seen count; when it
  // grows we set the announcement string. No realtime hook exists in this
  // page yet, but SWR revalidation will trigger this every time data is
  // re-fetched (mutate button, focus revalidation, etc).
  const prevOpenCountRef = useRef(0)
  const [newEscalacionCount, setNewEscalacionCount] = useState(0)

  useEffect(() => {
    const current = data?.open.length ?? 0
    const prev = prevOpenCountRef.current
    if (current > prev && prev > 0) {
      setNewEscalacionCount(current - prev)
    }
    prevOpenCountRef.current = current
  }, [data?.open.length])

  const escalacionAnnouncement =
    newEscalacionCount > 0
      ? t('inmobiliaria.ai.cobranza.escalaciones.liveRegion.newEscalacion', {
          count: newEscalacionCount,
        })
      : ''

  const columns: Array<{
    key: 'open' | 'assigned' | 'resolved'
    label: string
    items: Escalation[]
  }> = useMemo(
    () => [
      {
        key: 'open',
        label: t('inmobiliaria.ai.cobranza.escalaciones.kanbanColumns.open'),
        items: data?.open ?? [],
      },
      {
        key: 'assigned',
        label: t('inmobiliaria.ai.cobranza.escalaciones.kanbanColumns.assigned'),
        items: data?.assigned ?? [],
      },
      {
        key: 'resolved',
        label: t('inmobiliaria.ai.cobranza.escalaciones.kanbanColumns.resolved'),
        items: data?.resolved ?? [],
      },
    ],
    [t, data],
  )

  // ── Skeleton + celebratory EmptyState guards (Phase 38 plan 38-04a / D-38-04) ─
  if (isLoading && !data) return <CobranzaEscalacionesSkeleton />

  const allEmpty =
    data !== null &&
    data.open.length === 0 &&
    data.assigned.length === 0 &&
    data.resolved.length === 0
  if (!isLoading && allEmpty && !error) {
    return (
      <main className="p-6 lg:p-8">
        <EmptyState
          icon={CheckCircle}
          title={t('inmobiliaria.ai.cobranza.escalaciones.empty.title')}
          description={t('inmobiliaria.ai.cobranza.escalaciones.empty.description')}
        />
      </main>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ARIA live region — announces new open escalations to screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {escalacionAnnouncement}
      </div>

      {/* Header — DESIGN.md §3 typography */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h2 font-heading text-foreground">
            {t('inmobiliaria.ai.cobranza.escalaciones.pageTitle')}
          </h1>
          {lastUpdated && (
            <p className="mt-1 text-xs text-muted-foreground tabular-nums font-mono">
              {lastUpdated}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void mutate()}
          className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wide px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted active:scale-[0.97] transition"
          aria-label="refresh"
        >
          <ArrowClockwise className="w-3.5 h-3.5" aria-hidden="true" />
          {locale.startsWith('es') ? 'Actualizar' : 'Refresh'}
        </button>
      </div>

      {/* Loading state — DESIGN.md §11 */}
      {isLoading && !data && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && !data && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 p-3 text-sm text-rose-700 dark:text-rose-400">
          Error: {error}
        </div>
      )}

      {/* Kanban — 3 columns md+, stacked sm */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col, idx) => (
            <motion.section
              key={col.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
              className="rounded-xl border border-border bg-card/50 overflow-hidden"
              aria-labelledby={`column-${col.key}-heading`}
            >
              <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                <h2
                  id={`column-${col.key}-heading`}
                  className="text-xs font-mono uppercase tracking-wide text-muted-foreground"
                >
                  {col.label}
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums font-mono">
                  {col.items.length}
                </span>
              </div>
              <div className="p-3 space-y-2 min-h-[200px]">
                {col.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    {locale.startsWith('es') ? 'Sin escalaciones' : 'No escalations'}
                  </p>
                ) : (
                  col.items.map((esc) => (
                    <EscalationCard
                      key={esc.id}
                      escalation={esc}
                      currentUserEmail={currentUserEmail}
                      hasResolvePerm={hasResolvePerm}
                      hasAssignPerm={hasAssignPerm}
                      onOpen={handleOpenDetail}
                      onClaim={handleClaim}
                      onAssign={setAssignOpen}
                      onResolve={setResolveOpen}
                    />
                  ))
                )}
              </div>
            </motion.section>
          ))}
        </div>
      )}

      <EscalationResolveModal
        escalationId={resolveOpen}
        isOpen={resolveOpen !== null}
        onClose={() => setResolveOpen(null)}
        onResolve={handleResolve}
      />

      <EscalationAssignDropdown
        escalationId={assignOpen}
        isOpen={assignOpen !== null}
        onClose={() => setAssignOpen(null)}
        agencyMembers={members}
        currentAssigneeUserId={
          assignOpen
            ? (data?.open ?? [])
                .concat(data?.assigned ?? [])
                .find((e) => e.id === assignOpen)?.assignee_user_id ?? null
            : null
        }
        onAssign={handleAssign}
      />
    </div>
  )
}

export default function EscalacionesPage() {
  return (
    <PageGuard module="cobranza">
      <EscalacionesContent />
    </PageGuard>
  )
}
