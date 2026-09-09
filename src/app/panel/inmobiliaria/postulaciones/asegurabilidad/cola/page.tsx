'use client'

/**
 * /postulaciones/asegurabilidad/cola — F5 of the Agent Workspace initiative.
 *
 * Read-only TRIAGE cola of borderline asegurabilidad verdicts ("con
 * condiciones"), via the unified WorkItem endpoint (?agente=cotizador). Each
 * card deep-links (onOpen) into the EXISTING rich /asegurabilidad/[quoteId]
 * workflow, where the operator chooses a carrier, adjusts, or re-quotes — F5
 * never duplicates that decision surface. Owned by the comercial role.
 */

import { useRouter } from 'next/navigation'

import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'
import { SectionLabel } from '@/components/ui/section-label'
import { MonoLabel } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'

export default function CotizadorColaPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { items, total, isLoading, error, errorCrudo, refetch, runAction } =
    useAgentWorkItems('cotizador')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Encabezado de la casa; a la derecha, el único número real de la
          pantalla: cuántos casos esperan. */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <SectionLabel>{t('inmobiliaria.ai.nav.cotizador')}</SectionLabel>
          <h1 className="text-h2 text-fg">{t('inmobiliaria.ai.workspace.pages.cotizador.colaTitle')}</h1>
          <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">
            {t('inmobiliaria.ai.workspace.pages.cotizador.colaDescPre')}{' '}
            <strong>{t('inmobiliaria.ai.workspace.pages.cotizador.colaDescStrong')}</strong>{' '}
            {t('inmobiliaria.ai.workspace.pages.cotizador.colaDescPost')}
          </p>
        </div>

        {/* Pending KPI */}
        <div className="shrink-0 rounded-lg border border-border bg-surface px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-fg tabular-nums">
            {isLoading ? '—' : total}
          </p>
          <MonoLabel>
            {t('inmobiliaria.ai.workspace.pages.cotizador.porRevisar')}
          </MonoLabel>
        </div>
      </header>

      {/* Cola humana (transversal component) — read-only triage, deep-links to detail */}
      <ColaHumana
        agente="cotizador"
        items={items}
        isLoading={isLoading}
        error={errorCrudo ?? error}
        onReintentar={refetch}
        onAction={(item, action, body) => runAction(item, action, body)}
        onOpen={(item) => router.push(`/panel/inmobiliaria/postulaciones/asegurabilidad/${encodeURIComponent(item.id)}`)}
        emptyHint={t('inmobiliaria.ai.workspace.pages.cotizador.colaEmptyHint')}
      />
    </div>
  )
}
