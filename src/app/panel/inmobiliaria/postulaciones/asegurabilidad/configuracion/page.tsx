'use client'

// Permissions gate enforced by cotizador layout.tsx (Phase 29).
// This page does NOT re-check canAccess — layout handles 403 before mount.

/**
 * /ai/asegurabilidad/configuracion — F9: the Cotizador autonomy posture.
 *
 * The only workspace surface the rich Cotizador section was missing: read-only
 * GET /ai-hub/agentes/cotizador/autonomia feeds the transversal
 * <AutonomiaPanel> (mode pills + valla). The cotizador verdict decides over
 * personas → the backend serves t323=true and the amber T-323 callout renders.
 * The Sala and the [quoteId] decision surfaces stay domain-specific (F5).
 */

import { useI18n } from '@/lib/i18n'
import { useAgentAutonomia } from '@/lib/hooks/ai/use-agent-autonomia'
import { AutonomiaPanel } from '@/components/inmobiliaria/ai/AutonomiaPanel'

export default function CotizadorConfiguracionPage() {
  const { t } = useI18n()
  const { data, isLoading, error } = useAgentAutonomia('cotizador')

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Page header */}
      <header>
        <h1 className="text-h2 text-fg">
          {t('inmobiliaria.ai.cotizador.configuracion.title')}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm">
          {t('inmobiliaria.ai.cotizador.configuracion.subtitle')}
        </p>
      </header>

      <AutonomiaPanel data={data} isLoading={isLoading} error={error} />
    </main>
  )
}
