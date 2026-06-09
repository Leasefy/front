'use client'

/**
 * /ai/conciliacion — F6: the Conciliación Sala (first COMPLETE workspace).
 *
 * Restructured from the F1 page (which mixed Sala + Cola): this page is now
 * the generic <SalaAgente> fed by the per-agent overview endpoint; the queue
 * moved to ./cola, the case detail lives at ./[id] and the autonomy posture
 * at ./configuracion (AGENT-WORKSPACE-SPEC §1.4).
 *
 * The legacy domain page at /conciliacion (movimientos + extractos) stays
 * untouched and is linked from the domain slot below.
 */

import Link from 'next/link'
import { ArrowSquareOut, Bank } from '@phosphor-icons/react'

import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { SalaAgente } from '@/components/inmobiliaria/ai/SalaAgente'

export default function ConciliacionSalaPage() {
  const { data, isLoading, error } = useAgentOverview('conciliacion')

  // CTA count: prefer the backend's "en_cola" KPI; absent → CTA without count.
  const colaCount = data?.kpis.find((kpi) => kpi.id === 'en_cola')?.value

  return (
    <SalaAgente
      agente="conciliacion"
      titulo="Conciliación bancaria"
      descripcion="El agente cruza los movimientos del extracto contra recaudos, dispersiones y comisiones, y deja los casos dudosos en tu cola. Modo Copiloto: nada se aplica sin tu aprobación."
      icon={Bank}
      overview={data}
      isLoading={isLoading}
      error={error}
      colaHref="/panel/inmobiliaria/ai/conciliacion/cola"
      colaCount={colaCount}
    >
      {/* Domain slot: the legacy movimientos/extractos surface stays reachable */}
      <Link
        href="/panel/inmobiliaria/conciliacion"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
      >
        <ArrowSquareOut className="w-3.5 h-3.5" aria-hidden="true" />
        Ver movimientos y subir extractos
      </Link>
    </SalaAgente>
  )
}
