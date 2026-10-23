'use client'

/**
 * Escalation Detail — Phase 34 plan 34-06.
 *
 * 4 cards: Linked call / Reason / Agent state trace / Assignee + timing.
 * Bottom-anchored "Resolver" button opens EscalationResolveModal locked
 * to this escalation. Breadcrumb back to the kanban list.
 *
 * Refs mvp:docs/DESIGN.md §3 (typography), §4 (cards rounded-lg +).
 * Refs mvp:docs/COLOR_SYSTEM.md (rose for warning, emerald for resolve).
 */

import { useCallback, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Phone, FileText, User } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { callOutcomeLabel, escalationReasonLabel } from '@/lib/cobranza/call-vocab'
import { cuandoPaso } from '@/lib/cobranza/vocabulario-de-la-auditoria'
import { detallesLegibles } from '@/lib/cobranza/detalles-de-la-auditoria'
import { TEMPLATES } from '@/lib/constants/cobranza/escalation-templates'
import { useAuth } from '@/lib/auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useEscalationDetail } from '@/lib/hooks/cobranza/use-escalation-detail'
import { useEscalations } from '@/lib/hooks/cobranza/use-escalations'
import { EscalationResolveModal } from '@/components/inmobiliaria/cobranza/EscalationResolveModal'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { Button, Badge } from '@/components/ui'
import { CrossFade, MonoLabel } from '@leasefy/cadence'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { BackButton } from '@/components/ui/back-button';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';

/**
 * QA-AGENTES 16-10: la ficha decía «resolved», «resolved_at»,
 * «resolution_category: other», fechas «16/10/2026, 13:24:52» y pintaba dos
 * tarjetas vacías (llamada «—», estado del agente sin nada).
 */
const ESTADO_DEL_ESCALAMIENTO: Record<string, string> = {
  open: 'Abierta',
  assigned: 'Asignada',
  resolved: 'Resuelta',
}

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
  // Movimiento: cada salida en un `CrossFade` con su clave (esqueleto →
  // escalación, → fallo, → no existe); lo que ya estaba al montarse no se anima.
  if (isLoading && !data) {
    return (
      <CrossFade swapKey="esqueleto">
        <PageSkeleton variant="detail" />
      </CrossFade>
    )
  }

    /*
   * «No existe» y «no se pudo cargar» eran la misma pantalla: `if (!x || error)`.
   * Le decía a alguien con mala conexión que esta escalación había sido eliminada, y sin
   * ofrecer reintentar — porque sobre algo que no existe reintentar no tiene
   * sentido. Las dos señales ya estaban por separado; se juntaban a mano.
   */
  if (error) {
    return (
      <CrossFade swapKey="fallo">
      <div className="space-y-6 p-6 lg:p-8">
        {/* 🔴 20-09 · El camino de vuelta va ARRIBA, no sólo dentro de la
            tarjeta: un fallo a pantalla completa sin encabezado no dice en qué
            parte del panel estás (Nico: «ni se entiende y no tiene navegación
            para recuperarse»). Ver `el-fallo-de-una-ficha-tiene-salida`. */}
        <BackButton
          href="/panel/inmobiliaria/pagos/cobranza/escalaciones"
          label="Escalaciones"
        />
        <h1 className="text-h2 text-fg">Escalación</h1>
        <FalloDeCarga
          error={error}
          queEs="esta escalación"
          onReintentar={refetch}
          volverA={{ label: 'Escalaciones', href: '/panel/inmobiliaria/pagos/cobranza/escalaciones' }}
        />
      </div>
      </CrossFade>
    );
  }

  if (!data) {
    return (
      <CrossFade swapKey="no-existe">
      <div className="p-6 lg:p-8">
        <Button
          variant="link"
          size="sm"
          hideArrow
          onClick={() => router.back()}
          className="h-auto p-0 gap-1 text-caption font-medium text-muted-foreground hover:text-foreground"
        >
          {t('inmobiliaria.ai.cobranza.escalaciones.pageTitle')}
        </Button>
        <div className="mt-4 rounded-lg bg-danger-soft border border-danger/30 p-3 text-body-sm text-danger">
          {error ?? t('inmobiliaria.ai.cobranza.escalaciones.errors.notFound')}
        </div>
      </div>
      </CrossFade>
    )
  }

  const currentUserEmail = user?.email ?? null
  const isAssignedToMe =
    currentUserEmail !== null && data.assignee_email === currentUserEmail
  const canResolveThis =
    data.status !== 'resolved' && hasResolvePerm && (isAssignedToMe || hasAssignPerm)

  return (
    <CrossFade swapKey="escalacion">
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      <div className="space-y-3">
        <Link
          href="/panel/inmobiliaria/pagos/cobranza/escalaciones"
          className="inline-flex items-center gap-1 text-caption text-muted-foreground hover:text-foreground transition font-medium"
        >
          {t('inmobiliaria.ai.cobranza.escalaciones.pageTitle')}
        </Link>
        <EncabezadoDePantalla
          seccion="Cobranza · Escalaciones"
          titulo={data.debtor_name ?? data.debtor_id_masked ?? data.debtor_id}
          descripcion={
            locale.startsWith('es')
              ? 'Por qué el agente lo subió a una persona, quién lo tiene y cómo se cierra.'
              : 'Why the agent handed it to a person, who has it and how it closes.'
          }
          junto={
            <div className="flex items-center gap-2">
              <Badge variant={data.urgency === 'live' ? 'destructive' : data.urgency === 'high' ? 'warning' : 'secondary'}>
                {t(`inmobiliaria.ai.cobranza.escalaciones.urgency.${data.urgency}`)}
              </Badge>
              <Badge variant={data.status === 'resolved' ? 'success' : 'secondary'}>
                {locale.startsWith('es') ? ESTADO_DEL_ESCALAMIENTO[data.status] ?? data.status : data.status}
              </Badge>
            </div>
          }
          accionPrincipal={
            canResolveThis ? (
              <Button type="button" size="sm" onClick={() => setResolveOpen(true)} hideArrow>
                {t('inmobiliaria.ai.cobranza.escalaciones.actions.resolve')}
              </Button>
            ) : undefined
          }
        />
      </div>

      {/* Primero el porqué: es lo que se viene a leer. */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-2">
        <MonoLabel className="text-caption text-muted-foreground flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
          {t('inmobiliaria.ai.cobranza.escalaciones.detail.reason')}
        </MonoLabel>
        <p className="text-body-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {escalationReasonLabel(data.reason) ?? data.reason}
        </p>
      </section>

      {/* Card 1 — Linked call (sólo si hay una) */}
      {data.linked_call && (
      <section className="rounded-lg border border-border bg-card p-4 space-y-2">
        <MonoLabel className="text-caption text-muted-foreground flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" aria-hidden="true" />
          {t('inmobiliaria.ai.cobranza.escalaciones.detail.linkedCall')}
        </MonoLabel>
        {data.linked_call ? (
          <Link
            href={`/panel/inmobiliaria/pagos/cobranza/llamadas/${data.linked_call.id}`}
            className="block text-body-sm text-primary hover:underline"
          >
            <div className="space-y-1">
              <p className="font-medium">{locale.startsWith('es') ? 'Ver la llamada' : 'View call'}</p>
              <p className="text-caption text-muted-foreground">
                {locale.startsWith('es')
                  ? cuandoPaso(data.linked_call.initiatedAt)
                  : new Date(data.linked_call.initiatedAt).toLocaleString(locale)}
                {data.linked_call.outcome ? ` · ${callOutcomeLabel(data.linked_call.outcome)}` : ''}
              </p>
            </div>
          </Link>
        ) : null}
      </section>
      )}

      {/* Card 4 — Assignee + timing */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-2">
        <MonoLabel className="text-caption text-muted-foreground flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" aria-hidden="true" />
          {t('inmobiliaria.ai.cobranza.escalaciones.detail.assignee')}
        </MonoLabel>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-sm">
          <div>
            <dt className="text-caption text-muted-foreground">
              {t('inmobiliaria.ai.cobranza.escalaciones.detail.assignee')}
            </dt>
            <dd className="text-foreground">{data.assignee_email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-caption text-muted-foreground">
              {t('inmobiliaria.ai.cobranza.escalaciones.detail.timing')}
            </dt>
            <dd className="text-foreground">
              {data.assigned_at
                ? locale.startsWith('es')
                  ? cuandoPaso(data.assigned_at)
                  : new Date(data.assigned_at).toLocaleString(locale)
                : '—'}
            </dd>
          </div>
          {data.resolved_at && (
            <>
              <div>
                <dt className="text-caption text-muted-foreground">
                  {locale.startsWith('es') ? 'Resuelta el' : 'Resolved at'}
                </dt>
                <dd className="text-foreground">
                  {locale.startsWith('es') ? cuandoPaso(data.resolved_at) : new Date(data.resolved_at).toLocaleString(locale)}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">
                  {locale.startsWith('es') ? 'Cómo se resolvió' : 'Resolution'}
                </dt>
                <dd className="text-foreground">
                  {(() => {
                    const plantilla = TEMPLATES.find((tpl) => tpl.id === data.resolution_category)
                    return plantilla ? t(plantilla.labelKey) : data.resolution_category ?? '—'
                  })()}
                </dd>
              </div>
              {data.resolution_text && (
                <div className="sm:col-span-2">
                  <dt className="text-caption text-muted-foreground">{locale.startsWith('es') ? 'Nota' : 'Note'}</dt>
                  <dd className="text-foreground whitespace-pre-wrap">
                    {data.resolution_text}
                  </dd>
                </div>
              )}
            </>
          )}
        </dl>
      </section>

      {/* Card 3 — Agent state trace (collapsible; sólo si el agente dejó una) */}
      {data.state_trace_json != null && (
      <section className="rounded-lg border border-border bg-card p-4 space-y-2">
        <details>
          <summary className="cursor-pointer list-none">
            <MonoLabel className="text-caption text-muted-foreground hover:text-foreground transition">
              {t('inmobiliaria.ai.cobranza.escalaciones.detail.stateTrace')}
            </MonoLabel>
          </summary>
          <dl className="mt-3 space-y-1 text-body-sm">
            {detallesLegibles(data.state_trace_json).map((d) => (
              <div key={d.clave} className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">{d.clave}:</dt>
                <dd className="text-foreground">{d.valor}</dd>
              </div>
            ))}
          </dl>
        </details>
      </section>
      )}

      <EscalationResolveModal
        escalationId={resolveOpen ? escalationId : null}
        isOpen={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onResolve={handleResolve}
      />
    </div>
    </CrossFade>
  )
}

export default function EscalationDetailPage() {
  return (
    <PageGuard module="cobranza">
      <EscalationDetailContent />
    </PageGuard>
  )
}
