'use client'

/**
 * /ai/estudio/analitica — F10: per-agent Analítica (superficie 6).
 *
 * Thin instantiation of <AnaliticaAgente> over
 * GET …/ai-hub/agentes/estudio/analitica (404 → graceful panel).
 */

import Link from 'next/link'
import { CaretLeft, ShieldCheck } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentAnalitica } from '@/lib/hooks/ai/use-agent-analitica'
import { AnaliticaAgente } from '@/components/inmobiliaria/ai/AnaliticaAgente'

function EstudioAnalitica() {
  const { data, isLoading, error, notAvailable } = useAgentAnalitica('estudio')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="space-y-2">
        <Link
          href="/panel/inmobiliaria/ai/estudio"
          className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
        >
          <CaretLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          Agente · Estudio del inquilino
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Analítica</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Desempeño del estudio del inquilino en los últimos 30 días: evaluaciones procesadas,
          decisiones tomadas y tasa de escalamiento a revisión humana por día.
        </p>
      </header>

      <AnaliticaAgente data={data} isLoading={isLoading} error={error} notAvailable={notAvailable} />
    </div>
  )
}

export default function EstudioAnaliticaPage() {
  return (
    <PageGuard module="estudio">
      <EstudioAnalitica />
    </PageGuard>
  )
}
