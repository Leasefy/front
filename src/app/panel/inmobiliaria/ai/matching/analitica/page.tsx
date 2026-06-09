'use client'

/**
 * /ai/matching/analitica — F10: per-agent Analítica (superficie 6).
 *
 * Thin instantiation of <AnaliticaAgente> over
 * GET …/ai-hub/agentes/matching/analitica (404 → graceful panel).
 */

import Link from 'next/link'
import { CaretLeft, GitMerge } from '@phosphor-icons/react'

import { useAgentAnalitica } from '@/lib/hooks/ai/use-agent-analitica'
import { AnaliticaAgente } from '@/components/inmobiliaria/ai/AnaliticaAgente'

export default function MatchingAnaliticaPage() {
  const { data, isLoading, error, notAvailable } = useAgentAnalitica('matching')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="space-y-2">
        <Link
          href="/panel/inmobiliaria/ai/matching"
          className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
        >
          <CaretLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <GitMerge className="w-3.5 h-3.5" aria-hidden="true" />
          Agente · Matching
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Analítica</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Desempeño del agente de matching en los últimos 30 días: matches propuestos,
          compatibilidad promedio y candidatos redirigidos por día.
        </p>
      </header>

      <AnaliticaAgente data={data} isLoading={isLoading} error={error} notAvailable={notAvailable} />
    </div>
  )
}
