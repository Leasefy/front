'use client'

/**
 * /ai/asegurabilidad/cola — F5 of the Agent Workspace initiative.
 *
 * Read-only TRIAGE cola of borderline asegurabilidad verdicts ("con
 * condiciones"), via the unified WorkItem endpoint (?agente=cotizador). Each
 * card deep-links (onOpen) into the EXISTING rich /ai/asegurabilidad/[quoteId]
 * workflow, where the operator chooses a carrier, adjusts, or re-quotes — F5
 * never duplicates that decision surface. Owned by the comercial role.
 */

import { useRouter } from 'next/navigation'

import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'
import { MonoLabel } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'

export default function CotizadorColaPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('cotizador')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header / Sala */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-h2 text-fg">{t('inmobiliaria.ai.workspace.pages.cotizador.colaTitle')}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">
            {t('inmobiliaria.ai.workspace.pages.cotizador.colaDescPre')}{' '}
            <strong>{t('inmobiliaria.ai.workspace.pages.cotizador.colaDescStrong')}</strong>{' '}
            {t('inmobiliaria.ai.workspace.pages.cotizador.colaDescPost')}
          </p>
        </div>

        {/* Pending KPI */}
        <div className="shrink-0 rounded-lg border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-foreground tabular-nums">
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
        error={error}
        onAction={(item, action, body) => runAction(item, action, body)}
        onOpen={(item) => router.push(`/panel/inmobiliaria/postulaciones/asegurabilidad/${encodeURIComponent(item.id)}`)}
        emptyHint={t('inmobiliaria.ai.workspace.pages.cotizador.colaEmptyHint')}
      />
    </div>
  )
}
