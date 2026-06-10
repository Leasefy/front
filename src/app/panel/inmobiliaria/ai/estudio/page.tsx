'use client'

/**
 * /ai/estudio — F7: the Estudio del inquilino Sala (complete workspace).
 *
 * Restructured from the F2 page (which was the cola): this page is now the
 * generic <SalaAgente> fed by the per-agent overview endpoint; the queue
 * moved to ./cola, the case detail lives at ./[id] and the autonomy posture
 * at ./configuracion — mirroring the F6 Conciliación workspace 1:1.
 */

import { ShieldCheck } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { SalaAgente } from '@/components/inmobiliaria/ai/SalaAgente'

function EstudioSala() {
  const { data, isLoading, error } = useAgentOverview('estudio')

  // CTA count: prefer the backend's "en_cola" KPI; absent → CTA without count.
  const colaCount = data?.kpis.find((kpi) => kpi.id === 'en_cola')?.value

  return (
    <SalaAgente
      agente="estudio"
      titulo="Estudio del inquilino"
      descripcion="El agente evalúa cada solicitud de arriendo con un score compuesto y un nivel A/B/C/D, y escala a tu cola los casos borderline o riesgosos. Cada decisión sobre una persona queda auditada (derecho a revisión humana, T-323). Modo Copiloto: nada se decide sin tu aprobación."
      icon={ShieldCheck}
      overview={data}
      isLoading={isLoading}
      error={error}
      colaHref="/panel/inmobiliaria/ai/estudio/cola"
      colaCount={colaCount}
    />
  )
}

export default function EstudioSalaPage() {
  return (
    // Agent module gate — ABSENT key in my-permissions = allowed
    // (see agent-module-access.ts); present without 'view' = denied.
    <PageGuard module="estudio">
      <EstudioSala />
    </PageGuard>
  )
}
