'use client'

/**
 * EquipoCobranzaPersona — tarjeta de una PERSONA del equipo de IA de Cobranza.
 *
 * Decisión de Nico (igual que en Pagos): el equipo de cobranza se presenta con
 * PERSONAS HUMANAS, no con funciones anónimas. OJO: mismos nombres que Pagos
 * (Gabriela, Laura, Nicolás, Valentina, Samuel, Sofía) pero ROLES DISTINTOS,
 * los de la visión de cobranza (visión #15–16).
 *
 * Cada tarjeta muestra:
 *   · avatar (inicial en chip de color del DS) + nombre + rol
 *   · una línea en primera persona (cómo se presenta)
 *   · lista "Qué hace"
 *   · lista "Resultados que muestra"
 *
 * UX-only: tonos vía TOKENS semánticos del DS (primary/success/warning/danger
 * + *-soft + fg/surface) — CERO hex inline. Componente propio bajo cobranza/
 * con nombre único (no colisiona con EquipoPagosPersona).
 */

import type { Icon } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

/** Acento de marca por persona (tokens semánticos del DS). */
export type EquipoCobranzaAccent = 'blue' | 'green' | 'amber' | 'rose'

const ACCENT: Record<EquipoCobranzaAccent, { chip: string; fg: string; dot: string }> = {
  blue: { chip: 'bg-primary-soft', fg: 'text-primary', dot: 'bg-primary' },
  green: { chip: 'bg-success-soft', fg: 'text-success', dot: 'bg-success' },
  amber: { chip: 'bg-warning-soft', fg: 'text-warning', dot: 'bg-warning' },
  rose: { chip: 'bg-danger-soft', fg: 'text-danger', dot: 'bg-danger' },
}

export interface EquipoCobranzaPersonaData {
  id: string
  /** Nombre de pila de la persona. */
  nombre: string
  /** Inicial mostrada en el avatar (chip de color). */
  inicial: string
  /** Rol funcional (sub-título). */
  rol: string
  /** Ícono Phosphor (weight duotone) que acompaña el rol. */
  icon: Icon
  /** Acento de marca de la persona. */
  accent: EquipoCobranzaAccent
  /** Presentación en primera persona. */
  presentacion: string
  /** Bullets de "Qué hace". */
  queHace: string[]
  /** Bullets de "Resultados que muestra". */
  resultados: string[]
}

export interface EquipoCobranzaPersonaProps {
  persona: EquipoCobranzaPersonaData
  className?: string
}

export function EquipoCobranzaPersona({ persona, className }: EquipoCobranzaPersonaProps) {
  const accent = ACCENT[persona.accent]
  const RolIcon = persona.icon

  return (
    <article
      className={cn(
        'rounded-lg border border-border bg-card p-5 h-full flex flex-col gap-4',
        className,
      )}
    >
      {/* Encabezado: avatar (inicial) + nombre + rol */}
      <header className="flex items-start gap-3">
        <span
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
            accent.chip,
          )}
          aria-hidden="true"
        >
          <span className={cn('text-lg font-semibold', accent.fg)}>{persona.inicial}</span>
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-base font-semibold text-fg leading-tight">{persona.nombre}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-fg-muted leading-tight">
            <RolIcon className={cn('w-4 h-4 shrink-0', accent.fg)} weight="duotone" aria-hidden="true" />
            <span className="min-w-0">{persona.rol}</span>
          </p>
        </div>
      </header>

      {/* Presentación en primera persona */}
      <p className="text-sm text-fg leading-snug italic">“{persona.presentacion}”</p>

      {/* Qué hace */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-fg">Qué hace</p>
        <ul role="list" className="space-y-1.5">
          {persona.queHace.map((linea, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-fg-muted leading-snug">
              <span aria-hidden="true" className={cn('mt-1.5 w-1.5 h-1.5 rounded-full shrink-0', accent.dot)} />
              <span className="min-w-0">{linea}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Resultados que muestra */}
      <div className="space-y-2 mt-auto">
        <p className="text-xs font-semibold text-fg">Resultados que muestra</p>
        <ul role="list" className="space-y-1.5">
          {persona.resultados.map((linea, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-fg-muted leading-snug">
              <span
                aria-hidden="true"
                className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-border"
              />
              <span className="min-w-0">{linea}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}
