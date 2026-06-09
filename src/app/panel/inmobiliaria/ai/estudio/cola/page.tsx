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

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CaretLeft, ShieldCheck } from '@phosphor-icons/react'

import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'

export default function EstudioColaPage() {
  const router = useRouter()
  const { items, total, isLoading, error, runAction } = useAgentWorkItems('estudio')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/panel/inmobiliaria/ai/estudio"
            className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
          >
            <CaretLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Agente · Estudio del inquilino
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">Cola humana</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Estudios de arrendamiento que el agente escaló o marcó como borderline. Revisa el verdict
            (nivel y puntaje) y su evidencia, luego aprueba o rechaza al inquilino. Cada decisión queda
            auditada (derecho a revisión humana, T-323). Modo Copiloto: nada se decide sin ti.
          </p>
        </div>

        {/* Pending KPI */}
        <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-foreground tabular-nums">
            {isLoading ? '—' : total}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-mono">
            En cola
          </p>
        </div>
      </header>

      {/* Cola humana (transversal component) — opens the case detail */}
      <ColaHumana
        items={items}
        isLoading={isLoading}
        error={error}
        onAction={(item, action, body) => runAction(item, action, body)}
        onOpen={(item) => router.push(`/panel/inmobiliaria/ai/estudio/${item.id}`)}
        emptyHint="No hay estudios pendientes de revisión. El agente escala aquí los casos riesgosos."
      />
    </div>
  )
}
