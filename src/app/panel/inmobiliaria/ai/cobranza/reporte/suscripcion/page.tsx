'use client'

/**
 * Subscription Page — Phase 34 plan 34-08 (D-34-06 per-user opt-in).
 *
 * Per-user self-service page. Any authenticated cobranza member sees the
 * two toggles for their own subscription (email + WhatsApp). Admins
 * additionally see an aggregate stat "X de Y miembros suscritos al email"
 * — READ-ONLY (no force-add per D-34-06 Habeas Data + autodeterminación).
 *
 * Aggregate stat endpoint (GET /daily-report/subscription-stats) is NOT
 * shipped by 34-05 — we stub with "—" and flag this as a follow-up gap in
 * the plan SUMMARY for the orchestrator to surface back to 34-05.
 *
 * Refs:
 *   34-CONTEXT.md D-34-06 (per-user opt-in, no admin force-add)
 *   34-05 SUMMARY (subscription endpoints, T-34-05-01 mitigation)
 */

import { useEffect, useState } from 'react'
import { MonoLabel } from '@leasefy/cadence'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useSubscription } from '@/lib/hooks/cobranza/use-subscription'
import { SubscriptionToggles } from '@/components/inmobiliaria/cobranza/SubscriptionToggles'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'

interface SubscriptionStats {
  email_subscribed: number
  whatsapp_subscribed: number
  total_members: number
}

function SuscripcionContent() {
  const { t, locale } = useI18n()
  const { agency } = useAuth()
  const { canAccess } = usePermissionsContext()
  const agencyId = agency?.id ?? null
  // Admin proxy per plan — anyone who can edit thresholds can see the aggregate
  const isAdmin = canAccess('cobranza', 'edit-thresholds')

  const { data, isLoading, isSaving, error, setToggle } = useSubscription()

  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  const [statsSupported, setStatsSupported] = useState<boolean>(true)

  // TODO(34-05 follow-up): subscription-stats endpoint not yet exposed.
  // We attempt the GET; on 404 we stub the count to '—' and surface in SUMMARY.
  useEffect(() => {
    if (!isAdmin || !agencyId) return
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) return
    let cancelled = false
    void (async () => {
      try {
        const res = await agentFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/daily-report/subscription-stats`)
        if (cancelled) return
        if (res.status === 404) {
          setStatsSupported(false)
          return
        }
        if (res.ok) {
          const json = (await res.json()) as SubscriptionStats
          setStats(json)
        } else {
          setStatsSupported(false)
        }
      } catch {
        setStatsSupported(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAdmin, agencyId])

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-h2 font-heading text-foreground mt-2">
          {t('inmobiliaria.ai.cobranza.reporte.subscription.pageTitle')}
        </h1>
      </div>

      {/* Phase 38-05a: PageSkeleton primitive (list variant) replaces inline spinner.
         No page-level EmptyState — this is a per-user toggle form (Habeas Data
         D-34-06), not a list. Even "both toggles off" is a valid state, not an
         empty one. See SUMMARY deviations. */}
      {isLoading && !data && <PageSkeleton variant="list" />}

      {data && (
        <>
          <SubscriptionToggles
            data={data}
            isSaving={isSaving}
            error={error}
            onToggle={setToggle}
          />

          {/* Habeas Data / autodeterminación rationale (D-34-06) */}
          <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
            {locale.startsWith('es')
              ? 'Tu suscripción es individual. Sólo tú puedes activarla o desactivarla, en cumplimiento de la Ley de Habeas Data y el principio de autodeterminación informativa. Los administradores pueden ver el total agregado pero NO añadir personas por la fuerza.'
              : 'Your subscription is individual. Only you can enable or disable it, per Colombia\'s Habeas Data law and the informational self-determination principle. Admins can see the aggregate count but CANNOT force-subscribe anyone.'}
          </div>

          {/* Admin aggregate — read only */}
          {isAdmin && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <MonoLabel>
                {locale.startsWith('es') ? 'Vista agregada (admin)' : 'Aggregate view (admin)'}
              </MonoLabel>
              {!statsSupported ? (
                <p className="text-xs font-mono text-muted-foreground">
                  {locale.startsWith('es')
                    ? '— (endpoint no disponible)'
                    : '— (endpoint unavailable)'}
                </p>
              ) : stats ? (
                <>
                  <p className="text-sm font-mono tabular-nums text-foreground">
                    {t('inmobiliaria.ai.cobranza.reporte.subscription.aggregateStat', {
                      subscribed: String(stats.email_subscribed),
                      total: String(stats.total_members),
                    })}{' '}
                    · email
                  </p>
                  <p className="text-sm font-mono tabular-nums text-foreground">
                    {t('inmobiliaria.ai.cobranza.reporte.subscription.aggregateStat', {
                      subscribed: String(stats.whatsapp_subscribed),
                      total: String(stats.total_members),
                    })}{' '}
                    · WhatsApp
                  </p>
                </>
              ) : (
                <p className="text-xs font-mono text-muted-foreground">…</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function SuscripcionPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <SuscripcionContent />
    </PageGuard>
  )
}
