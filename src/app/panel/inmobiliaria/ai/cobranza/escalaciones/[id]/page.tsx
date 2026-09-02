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
import { escalationReasonLabel } from '@/lib/cobranza/call-vocab'
import { useAuth } from '@/lib/auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useEscalationDetail } from '@/lib/hooks/cobranza/use-escalation-detail'
import { useEscalations } from '@/lib/hooks/cobranza/use-escalations'
import { EscalationResolveModal } from '@/components/inmobiliaria/cobranza/EscalationResolveModal'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { Button, Badge } from '@/components/ui'
import { MonoLabel } from '@leasefy/cadence'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';

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

    /*
   * «No existe» y «no se pudo cargar» eran la misma pantalla: `if (!x || error)`.
   * Le decía a alguien con mala conexión que esta escalación había sido eliminada, y sin
   * ofrecer reintentar — porque sobre algo que no existe reintentar no tiene
   * sentido. Las dos señales ya estaban por separado; se juntaban a mano.
   */
  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <FalloDeCarga
          error={error}
          queEs="esta escalación"
            onReintentar={() => void refetch()}
          volverA={{ label: 'Escalaciones', href: '/panel/inmobiliaria/ai/cobranza/escalaciones' }}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 md:p-6">
        <Button
          variant="link"
          size="sm"
          hideArrow
          onClick={() => router.back()}
          className="h-auto p-0 gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          {t('inmobiliaria.ai.cobranza.escalaciones.kanbanColumns.open')}
        </Button>
        <div className="mt-4 rounded-xl bg-danger-soft border border-danger/30 p-3 text-sm text-danger">
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
            {data.debtor_name ?? data.debtor_id_masked ?? data.debtor_id}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary">
              {t(`inmobiliaria.ai.cobranza.escalaciones.urgency.${data.urgency}`)}
            </Badge>
            <Badge variant="secondary">
              {data.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Card 1 — Linked call */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-2">
        <MonoLabel className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" aria-hidden="true" />
          {t('inmobiliaria.ai.cobranza.escalaciones.detail.linkedCall')}
        </MonoLabel>
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
        <MonoLabel className="text-xs text-muted-foreground flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
          {t('inmobiliaria.ai.cobranza.escalaciones.detail.reason')}
        </MonoLabel>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {escalationReasonLabel(data.reason) ?? data.reason}
        </p>
      </section>

      {/* Card 3 — Agent state trace (collapsible) */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-2">
        <details>
          <summary className="cursor-pointer list-none">
            <MonoLabel className="text-xs text-muted-foreground hover:text-foreground transition">
              {t('inmobiliaria.ai.cobranza.escalaciones.detail.stateTrace')}
            </MonoLabel>
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
        <MonoLabel className="text-xs text-muted-foreground flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" aria-hidden="true" />
          {t('inmobiliaria.ai.cobranza.escalaciones.detail.assignee')}
        </MonoLabel>
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
          <Button
            type="button"
            onClick={() => setResolveOpen(true)}
            hideArrow
          >
            {t('inmobiliaria.ai.cobranza.escalaciones.actions.resolve')}
          </Button>
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
