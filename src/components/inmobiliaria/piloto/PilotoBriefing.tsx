'use client'

/**
 * PilotoBriefing — la línea de apertura del día, no una tarjeta más.
 *
 * ── Por qué se rediseñó (2026-08-30) ───────────────────────────────────────
 * Era una card lateral que decía «Tienes 20 decisiones esperándote — 20 de
 * prioridad alta» junto a unos KPIs que ya decían 20 y 20, y encima repetía
 * tres links que la bandeja mostraba dos columnas más allá. Tres veces la
 * misma información en una pantalla.
 *
 * Ahora es una banda de contexto arriba de todo: el saludo y lo que el
 * Gerente escribió anoche. Los números viven en los KPIs y las decisiones en
 * la bandeja — acá va solo lo que ninguno de los dos puede decir.
 *
 * Si no hay nada que contar, NO se pinta: una banda vacía que anuncia que
 * algún día habrá contenido es ruido. Y si el briefing falla, la torre sigue
 * en pie sin una caja roja — es contexto, no el dato crítico de la pantalla.
 */

import { Sun } from '@phosphor-icons/react'

import type { PilotoBriefing as PilotoBriefingData } from '@/lib/api/piloto'

export interface PilotoBriefingProps {
  data: PilotoBriefingData | null
  isLoading: boolean
  error: string | null
}

export function PilotoBriefing({ data, isLoading, error }: PilotoBriefingProps) {
  if (isLoading) {
    return (
      <div
        className="h-14 animate-pulse rounded-lg border border-border bg-surface-muted"
        role="status"
        aria-label="Cargando"
      />
    )
  }

  // Fail-soft silencioso: el briefing es contexto; su ausencia no se anuncia.
  if (error || !data) return null

  const saludo = typeof data.saludo === 'string' ? data.saludo.trim() : ''
  const resumen = Array.isArray(data.resumen)
    ? data.resumen.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []
  const narrativa = Array.isArray(data.narrativa)
    ? data.narrativa.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []

  if (!saludo && resumen.length === 0 && narrativa.length === 0) return null

  return (
    <section
      className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3"
      aria-label="Briefing del día"
    >
      <Sun
        weight="duotone"
        className="mt-0.5 h-5 w-5 shrink-0 text-fg-muted"
        aria-hidden="true"
      />
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-fg">
          {saludo && <span className="font-medium">{saludo}. </span>}
          <span className="text-fg-muted">{resumen.join(' ')}</span>
        </p>
        {narrativa.length > 0 && (
          <ul className="space-y-0.5 text-sm text-fg-muted">
            {narrativa.map((linea) => (
              <li key={linea} className="flex gap-2">
                <span aria-hidden="true" className="text-fg-subtle">
                  ·
                </span>
                <span className="min-w-0">{linea}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
