'use client'

/**
 * /ai/avaluos/cola — the Avalúos human queue (read-only tracking).
 *
 * The unified WorkItem endpoint (?agente=avaluos) feeds the transversal
 * <ColaHumana>; each card opens the detail at ./[id]. Items carry
 * `actions: []` by design — la firma del certificado la hacen
 * Portofino/Leasefy en el backoffice admin; aquí la inmobiliaria solo
 * consulta el estado del pipeline.
 */

import { useRouter } from 'next/navigation'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'
import { AVALUO_WIZARD_ORIGIN } from '@/lib/avaluo/wizard-url'
import { useI18n } from '@/lib/i18n'

function AvaluosCola() {
  const router = useRouter()
  const { t } = useI18n()
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('avaluos')

  // El botón del estado vacío mandaba SIEMPRE al Resumen a «Solicitar avalúo».
  // Cuando el micro no está conectado ese CTA allá está deshabilitado, así que
  // era una salida a otra puerta cerrada: la única pantalla sin solicitudes te
  // ofrecía crear una y no se podía. Mismo criterio que el Resumen — si no se
  // alcanza el servicio, no se ofrece la acción.
  const servicioConfigurado = AVALUO_WIZARD_ORIGIN !== ''

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">{t('inmobiliaria.ai.workspace.pages.avaluos.colaTitle')}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {t('inmobiliaria.ai.workspace.pages.avaluos.colaDesc')}
          </p>
        </div>

        {/* Pending KPI */}
        <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-foreground tabular-nums">
            {isLoading ? '—' : total}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('inmobiliaria.ai.workspace.pages.avaluos.colaKpiLabel')}
          </p>
        </div>
      </header>

      {/* Mis solicitudes (transversal component) — opens the detail */}
      <ColaHumana
        agente="avaluos"
        items={items}
        isLoading={isLoading}
        error={error}
        onAction={(item, action, body) => runAction(item, action, body)}
        onOpen={(item) => router.push(`/panel/inmobiliaria/ai/avaluos/${encodeURIComponent(item.id)}`)}
        emptyTitle={t('inmobiliaria.ai.workspace.pages.avaluos.colaEmptyTitle')}
        emptyHint={
          servicioConfigurado
            ? t('inmobiliaria.ai.workspace.pages.avaluos.colaEmptyHint')
            : t('inmobiliaria.ai.workspace.pages.avaluos.solicitarUnavailable')
        }
        emptyAction={
          servicioConfigurado
            ? {
                label: t('inmobiliaria.ai.workspace.pages.avaluos.solicitarCta'),
                href: '/panel/inmobiliaria/ai/avaluos',
              }
            : undefined
        }
      />
    </div>
  )
}

export default function AvaluosColaPage() {
  return (
    <PageGuard module="avaluos">
      <AvaluosCola />
    </PageGuard>
  )
}
