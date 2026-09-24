'use client'

/**
 * Liquidaciones → Por aprobar: las facturas de proveedor esperando firma.
 *
 * El endpoint unificado de WorkItems (`?agente=pagos`) alimenta `<ColaHumana>`;
 * aprobar y rechazar postean a los endpoints de AP que ya existían (matriz de
 * tiers + segregación de funciones, los dos del lado del servidor). Cada
 * tarjeta abre la ficha del caso en `/pagos/<id>`.
 *
 * ── Por qué está acá y no en la raíz del módulo (Nico, 2026-09-16) ──────────
 *
 * Vivía en `/pagos/cola`, como pestaña del TERCER renglón del encabezado de
 * Pagos —la Sala del agente—. Ese renglón no le obedecía a nadie: ofrecía
 * «Pagos a propietarios» con la cara «Inquilinos» elegida arriba, y por eso
 * «no se entendía». Se fue entero (NOTA al pie de `agentWorkspaceNav.ts`).
 *
 * Ésta bajó a Liquidaciones porque es plata que SALE —lo mismo que el neto del
 * mes— y la firma la misma persona: el contador. La URL vieja redirige acá
 * (`la-sala-de-pagos-se-fue.data.mjs`).
 */

import { useRouter } from 'next/navigation'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'
import { PestanasDeLiquidaciones } from '@/components/liquidaciones/PestanasDeLiquidaciones'
import { SectionLabel } from '@/components/ui/section-label'
import { useI18n } from '@/lib/i18n'

function PagosCola() {
  const router = useRouter()
  const { t } = useI18n()
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('pagos')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          {/* La cara del módulo, en el título: lo que se aprueba acá es plata
              que sale hacia el propietario o su proveedor. */}
          <SectionLabel>Pagos · propietarios</SectionLabel>
          <h1 className="text-h2 text-fg">{t('inmobiliaria.ai.workspace.pages.pagos.colaTitle')}</h1>
          <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
            {t('inmobiliaria.ai.workspace.pages.pagos.colaDesc')}
          </p>
        </div>

        {/* Pending KPI */}
        <div className="shrink-0 rounded-lg border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-fg tabular-nums">
            {isLoading ? '—' : total}
          </p>
          <p className="text-xs text-fg-muted">
            {t('inmobiliaria.ai.workspace.pages.pagos.porAprobar')}
          </p>
        </div>
      </header>

      <PestanasDeLiquidaciones />

      {/* Cola humana (transversal component) — opens the case detail.
          agente habilita el override de estados por agente (estadoLabel). */}
      <ColaHumana
        agente="pagos"
        items={items}
        isLoading={isLoading}
        error={error}
        onAction={(item, action, body) => runAction(item, action, body)}
        onOpen={(item) => router.push(`/panel/inmobiliaria/pagos/${encodeURIComponent(item.id)}`)}
        emptyHint={t('inmobiliaria.ai.workspace.pages.pagos.colaEmptyHint')}
      />
    </div>
  )
}

export default function PagosColaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <PagosCola />
    </PageGuard>
  )
}
