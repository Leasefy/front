'use client'

/**
 * Escalation Detail — Phase 34 plan 34-06.
 *
 * 4 cards: Linked call / Reason / Agent state trace / Assignee + timing.
 * Bottom-anchored "Resolver" button opens EscalationResolveModal locked
 * to this escalation. Breadcrumb back to the kanban list.
 *
 * Refs mvp:docs/DESIGN.md §3 (typography), §4 (cards rounded-xl +).
 * Refs mvp:docs/COLOR_SYSTEM.md (rose for warning, emerald for resolve).
 */

import { useCallback, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, FileText, User } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useEscalationDetail } from '@/lib/hooks/cobranza/use-escalation-detail'
import { useEscalations } from '@/lib/hooks/cobranza/use-escalations'
import { EscalationResolveModal } from '@/components/inmobiliaria/cobranza/EscalationResolveModal'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'

function EscalationDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const { canAccess } = usePermissionsContext()

  const escalationId = typeof params?.id === 'string' ? params.id : null
  const { data, isLoading, error, refetch } = useEscalationDetail(escalationId)
  const { resolve } = useEscalations()

  const [resolveOpen, setResolveOpen] = useState(false)

  const hasResolvePerm = canAccess('cobranza', 'resolve-escalation')
  const hasAssignPerm = canAccess('cobranza', 'assign-escalation')

  const handleResolve = useCallback(
    async (
      id: string,
      body: { category: Parameters<typeof resolve>[1]['category']; resolution_text: string },
    ) => {
      const r = await resolve(id, body)
      if (r.ok) {
        await refetch()
      }
      return r
    },
    [resolve, refetch],
  )

  // Phase 38-05a: PageSkeleton primitive (detail variant) — dynamic route, no EmptyState.
  if (isLoading && !data) {
    return <PageSkeleton variant="detail" />
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          {t('inmobiliaria.ai.cobranza.escalaciones.kanbanColumns.open')}
        </button>
        <div className="mt-4 rounded-xl bg-[#F8EAE7] dark:bg-[#C4503B]/15 border border-[#C4503B]/30 dark:border-[#C4503B]/40 p-3 text-sm text-[#C4503B] dark:text-[#E0664D]">
          {error ?? t('inmobiliaria.ai.cobranza.escalaciones.errors.notFound')}
        </div>
      </div>
    )
  }

  const currentUserEmail = user?.email ?? null
  const isAssignedToMe =
    currentUserEmail !== null && data.assignee_email === currentUserEmail
  const canResolveThis =
    data.status !== 'resolved' && hasResolvePerm && (isAssignedToMe || hasAssignPerm)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <Link
        href="/panel/inmobiliaria/ai/cobranza/escalaciones"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        {t('inmobiliaria.ai.cobranza.escalaciones.pageTitle')}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h2 font-heading text-foreground">
            {data.debtor_id_masked ?? data.debtor_id}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {t(`inmobiliaria.ai.cobranza.escalaciones.urgency.${data.urgency}`)}
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {data.status}
            </span>
          </div>
        </div>
      </div>

      {/* Card 1 — Linked call */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-2">
        <h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" aria-hidden="true" />
          {t('inmobiliaria.ai.cobranza.escalaciones.detail.linkedCall')}
        </h2>
        {data.linked_call ? (
          <Link
            href={`/panel/inmobiliaria/ai/cobranza/llamadas/${data.linked_call.id}`}
            className="block text-sm text-primary hover:underline"
          >
            <div className="space-y-1">
              <p className="font-medium tabular-nums">{data.linked_call.id}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {new Date(data.linked_call.initiatedAt).toLocaleString(locale)} ·{' '}
                {data.linked_call.outcome ?? '—'}
              </p>
            </div>
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </section>

      {/* Card 2 — Reason */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-2">
        <h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
          {t('inmobiliaria.ai.cobranza.escalaciones.detail.reason')}
        </h2>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {data.reason}
        </p>
      </section>

      {/* Card 3 — Agent state trace (collapsible) */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-2">
        <details>
          <summary className="text-xs font-mono uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground transition">
            {t('inmobiliaria.ai.cobranza.escalaciones.detail.stateTrace')}
          </summary>
          <pre className="mt-3 text-[11px] bg-muted/50 rounded-sm p-3 overflow-x-auto font-mono text-foreground">
            {data.state_trace_json
              ? JSON.stringify(data.state_trace_json, null, 2)
              : '—'}
          </pre>
        </details>
      </section>

      {/* Card 4 — Assignee + timing */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-2">
        <h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" aria-hidden="true" />
          {t('inmobiliaria.ai.cobranza.escalaciones.detail.assignee')}
        </h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('inmobiliaria.ai.cobranza.escalaciones.detail.assignee')}
            </dt>
            <dd className="text-foreground">{data.assignee_email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('inmobiliaria.ai.cobranza.escalaciones.detail.timing')}
            </dt>
            <dd className="text-foreground tabular-nums font-mono text-xs">
              {data.assigned_at
                ? new Date(data.assigned_at).toLocaleString(locale)
                : '—'}
            </dd>
          </div>
          {data.resolved_at && (
            <>
              <div>
                <dt className="text-xs text-muted-foreground">resolved_at</dt>
                <dd className="text-foreground tabular-nums font-mono text-xs">
                  {new Date(data.resolved_at).toLocaleString(locale)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">resolution_category</dt>
                <dd className="text-foreground">{data.resolution_category ?? '—'}</dd>
              </div>
              {data.resolution_text && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">resolution_text</dt>
                  <dd className="text-foreground text-sm whitespace-pre-wrap">
                    {data.resolution_text}
                  </dd>
                </div>
              )}
            </>
          )}
        </dl>
      </section>

      {/* Bottom action bar */}
      {canResolveThis && (
        <div className="sticky bottom-4 md:static flex justify-end">
          <button
            type="button"
            onClick={() => setResolveOpen(true)}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-sm bg-[#2C7A53] dark:bg-[#3EAE70] text-white hover:opacity-90 active:scale-[0.97] transition font-medium"
          >
            {t('inmobiliaria.ai.cobranza.escalaciones.actions.resolve')}
          </button>
        </div>
      )}

      <EscalationResolveModal
        escalationId={resolveOpen ? escalationId : null}
        isOpen={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onResolve={handleResolve}
      />
    </div>
  )
}

export default function EscalationDetailPage() {
  return (
    <PageGuard module="cobranza">
      <EscalationDetailContent />
    </PageGuard>
  )
}
