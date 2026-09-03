'use client'

/**
 * /ai/estudio/cola — F7: the Estudio del inquilino human queue.
 *
 * Moved here from the F2 /ai/estudio page (which is now the Sala): the
 * unified WorkItem endpoint (?agente=estudio) feeds the transversal
 * <ColaHumana>; each card opens the new case detail at ./[id]. Approving or
 * rejecting an applicant is a decision affecting a person (Sentencia
 * T-323/2024) → surfaced via the WorkItem `t323` flag, and every decision is
 * recorded audit-first on the backend.
 */

import { useRouter } from 'next/navigation'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'
import { RecorridoHilo } from '@/components/inmobiliaria/recorrido/RecorridoHilo'
import { useI18n } from '@/lib/i18n'

function EstudioCola() {
  const router = useRouter()
  const { t } = useI18n()
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('estudio')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-fg tracking-tight">{t('inmobiliaria.ai.workspace.pages.estudio.colaTitle')}</h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            {t('inmobiliaria.ai.workspace.pages.estudio.colaDesc')}
          </p>
          {/* Leyenda de niveles — los items muestran "Nivel A/B/C/D" sin explicación */}
          <p className="text-xs text-fg-muted">
            <span className="font-medium text-fg">Niveles:</span>{' '}
            A = mejor perfil · B = buen perfil · C = perfil ajustado · D = mayor riesgo
          </p>
        </div>

        {/* Pending KPI */}
        <div className="shrink-0 rounded-lg border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-fg tabular-nums">
            {isLoading ? '—' : total}
          </p>
          <p className="text-xs uppercase tracking-wide text-fg-muted">
            {t('inmobiliaria.ai.workspace.pages.comun.enCola')}
          </p>
        </div>
      </header>

      {/* Dónde cae esta pantalla dentro del recorrido del inquilino (paso 8).
          Aditivo: no cambia nada de la cola, solo dice qué la precede y qué
          sigue. Ver src/lib/recorrido/pasos.ts. */}
      <RecorridoHilo paso="evaluacion" />

      {/* Cola humana (transversal component) — opens the case detail */}
      <ColaHumana
        agente="estudio"
        items={items}
        isLoading={isLoading}
        error={error}
        onAction={(item, action, body) => runAction(item, action, body)}
        onOpen={(item) => router.push(`/panel/inmobiliaria/postulaciones/estudio/${encodeURIComponent(item.id)}`)}
        emptyHint={t('inmobiliaria.ai.workspace.pages.estudio.colaEmptyHint')}
      />
    </div>
  )
}

export default function EstudioColaPage() {
  return (
    <PageGuard module="estudio">
      <EstudioCola />
    </PageGuard>
  )
}
