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

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CrossFade } from '@leasefy/cadence'
import { toast } from 'sonner'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useSubscription } from '@/lib/hooks/cobranza/use-subscription'
import { cuantosDelEquipo, fraseDelGuardado } from '@/lib/cobranza/suscripcion-al-reporte'
import { useAgencyPolicy } from '@/lib/hooks/cobranza/use-agency-policy'
import { SubscriptionToggles } from '@/components/inmobiliaria/cobranza/SubscriptionToggles'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { falloDelTexto } from '@/lib/cobranza/fallo-del-texto'

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

  const { data, isLoading, isSaving, error, setToggle, refetch, ultimoGuardado } = useSubscription()
  // El WhatsApp del reporte lo prende la inmobiliaria (Configuración); sin eso,
  // el interruptor personal no manda nada y hay que decirlo (MORI-24).
  const { data: politica } = useAgencyPolicy()
  const whatsappDeLaInmobiliaria = politica?.dailyReportWhatsappEnabled ?? null

  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  const [statsSupported, setStatsSupported] = useState<boolean>(true)

  const cargarEstadisticas = useCallback(async (): Promise<SubscriptionStats | null | 'sin-ruta'> => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!isAdmin || !agencyId || !agentUrl) return null
    try {
      const res = await agentFetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/daily-report/subscription-stats`)
      if (!res.ok) return 'sin-ruta'
      return (await res.json()) as SubscriptionStats
    } catch {
      return 'sin-ruta'
    }
  }, [isAdmin, agencyId])

  useEffect(() => {
    let cancelled = false
    void cargarEstadisticas().then((r) => {
      if (cancelled || r === null) return
      if (r === 'sin-ruta') setStatsSupported(false)
      else setStats(r)
    })
    return () => {
      cancelled = true
    }
  }, [cargarEstadisticas])

  // MORI-24 (QA-AGENTES 16-10): al apagar, el conteo se quedaba en «1 de 1»
  // hasta recargar, y nada decía que se había guardado.
  useEffect(() => {
    if (!ultimoGuardado) return
    toast.success(fraseDelGuardado(ultimoGuardado.patch, whatsappDeLaInmobiliaria))
    let cancelled = false
    void cargarEstadisticas().then((r) => {
      if (!cancelled && r && r !== 'sin-ruta') setStats(r)
    })
    return () => {
      cancelled = true
    }
    // Sólo cuando hay un guardado nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ultimoGuardado])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EncabezadoDePantalla
        seccion="Cobranza · Reporte diario"
        titulo={t('inmobiliaria.ai.cobranza.reporte.subscription.pageTitle')}
        descripcion={
          locale.startsWith('es')
            ? 'Elige si el reporte diario de cobranza te llega por correo o por WhatsApp.'
            : 'Choose whether the daily collections report reaches you by email or WhatsApp.'
        }
      />

      {/* Phase 38-05a: PageSkeleton primitive (list variant) replaces inline spinner.
         No page-level EmptyState — this is a per-user toggle form (Habeas Data
         D-34-06), not a list. Even "both toggles off" is a valid state, not an
         empty one. See SUMMARY deviations. */}
      {/* Esqueleto → formulario con su fundido (`CrossFade`). */}
      <CrossFade swapKey={isLoading && !data ? 'cargando' : data ? 'formulario' : 'nada'} className="max-w-2xl space-y-6">
      {isLoading && !data && <PageSkeleton variant="list" />}

      {/* 🔴 ROLES (14-10-2026): sin `subscribe-daily-report` la pantalla quedaba
          en blanco (el micro responde 403). Ahora dice por qué. */}
      {!isLoading && !data && !canAccess('cobranza', 'subscribe-daily-report') && (
        <p className="rounded-lg border border-border bg-muted/20 p-4 text-body-sm text-muted-foreground" data-testid="suscripcion-sin-permiso">
          Tu rol no puede suscribirse al reporte diario de cobranza. Si lo necesitas, pídeselo a un administrador de tu inmobiliaria.
        </p>
      )}

      {/* Revisora r25 (#1): si la lectura falla, el fallo de la casa con su
          reintento (antes la pantalla quedaba en blanco bajo el título). */}
      {!isLoading && !data && canAccess('cobranza', 'subscribe-daily-report') && (
        <FalloDeCarga error={falloDelTexto(error) ?? 'fetch_failed'} queEs="tu suscripción al reporte" onReintentar={() => void refetch()} />
      )}

      {data && (
        <>
          <SubscriptionToggles
            data={data}
            isSaving={isSaving}
            error={error}
            onToggle={setToggle}
          />

          {whatsappDeLaInmobiliaria === false && (
            <p className="text-caption text-muted-foreground" data-testid="whatsapp-de-la-inmobiliaria-apagado">
              Tu inmobiliaria todavía no envía el reporte por WhatsApp: mientras no lo prenda, sólo llega por correo.
              {isAdmin && (
                <>
                  {' '}
                  <Link href="/panel/inmobiliaria/pagos/cobranza/configuracion" className="text-fg underline underline-offset-2">
                    Se prende en Configuración.
                  </Link>
                </>
              )}
            </p>
          )}

          {/* Habeas Data / autodeterminación rationale (D-34-06) */}
          {/* Revisora r25 (#3): lo legal, plegado. */}
          <MasDetalles etiqueta={locale.startsWith('es') ? 'Por qué sólo tú la cambias' : 'Why only you can change it'} etiquetaAbierto={locale.startsWith('es') ? 'Ocultar' : 'Hide'}>
          <p className="text-body-sm text-fg-muted leading-relaxed">
            {locale.startsWith('es')
              ? 'Tu suscripción es individual: sólo tú puedes prenderla o apagarla, como lo pide la Ley de Habeas Data. Los administradores ven cuántos del equipo lo reciben, pero no pueden suscribir a nadie.'
              : 'Your subscription is individual. Only you can enable or disable it, per Colombia\'s Habeas Data law and the informational self-determination principle. Admins can see the aggregate count but CANNOT force-subscribe anyone.'}
          </p>
          </MasDetalles>

          {/* Admin aggregate — read only */}
          {isAdmin && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-1">
              <p className="text-body-sm font-medium text-fg">
                {locale.startsWith('es') ? 'Cuántos del equipo lo reciben' : 'How many on the team get it'}
              </p>
              {!statsSupported ? (
                <p className="text-caption text-muted-foreground">
                  {locale.startsWith('es')
                    ? 'No pudimos contar a tu equipo.'
                    : "We couldn't count your team."}
                </p>
              ) : stats ? (
                <>
                  <p className="text-body-sm font-mono tabular-nums text-foreground">
                    {locale.startsWith('es')
                      ? cuantosDelEquipo(stats.email_subscribed, stats.total_members)
                      : t('inmobiliaria.ai.cobranza.reporte.subscription.aggregateStat', {
                          subscribed: String(stats.email_subscribed),
                          total: String(stats.total_members),
                        })}{' '}
                    · {locale.startsWith('es') ? 'por correo' : 'by email'}
                  </p>
                  <p className="text-body-sm font-mono tabular-nums text-foreground">
                    {locale.startsWith('es')
                      ? cuantosDelEquipo(stats.whatsapp_subscribed, stats.total_members)
                      : t('inmobiliaria.ai.cobranza.reporte.subscription.aggregateStat', {
                          subscribed: String(stats.whatsapp_subscribed),
                          total: String(stats.total_members),
                        })}{' '}
                    · {locale.startsWith('es') ? 'por WhatsApp' : 'by WhatsApp'}
                  </p>
                </>
              ) : (
                <span className="block h-4 w-40 animate-pulse rounded bg-surface-muted" aria-hidden="true" />
              )}
            </div>
          )}
        </>
      )}
      </CrossFade>
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
