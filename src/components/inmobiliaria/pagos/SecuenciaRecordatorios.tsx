'use client'

/**
 * SecuenciaRecordatorios — la línea de tiempo de PREVENCIÓN del pago (punto 8).
 *
 * No es cobranza: es el embudo ANTES de que un pago se atrase. Muestra los 4
 * hitos de recordatorio (3 días antes · día de vencimiento · 1 día después ·
 * 3 días después) y el paso final donde el caso ESCALA a cobranza. Cada hito
 * es un nodo conectado por un riel hairline (contrato §7: iconografía DS,
 * vertical, conector `border-l border-border`). El nodo de escalación usa el
 * estado `en_cobranza` (tono danger del vocabulario de src/lib/pagos/estados).
 *
 * Componente de presentación puro (recibe `pasos`) — sin data-fetching. Tonos
 * vía TOKENS del DS (primary/warning/danger/success + *-soft) — cero hex.
 */

import type { Icon } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

// ── Tono del nodo (familias del vocabulario de pagos) ────────────────────────

export type RecordatorioTono = 'info' | 'warning' | 'danger'

const TONO_CLASSES: Record<RecordatorioTono, { icon: string; ring: string }> = {
  // Preaviso amable → azul (en curso)
  info: { icon: 'bg-primary-soft text-primary', ring: 'ring-primary/20' },
  // El día / el atraso temprano → ámbar (atención)
  warning: { icon: 'bg-warning-soft text-warning', ring: 'ring-warning/20' },
  // Escala a cobranza → rojo (escaló)
  danger: { icon: 'bg-danger-soft text-danger', ring: 'ring-danger/20' },
}

// ── Paso de la secuencia ─────────────────────────────────────────────────────

export interface PasoRecordatorio {
  id: string
  /** Etiqueta del momento, p.ej. "3 días antes". */
  cuando: string
  /** Título corto del recordatorio. */
  titulo: string
  /** Qué busca este toque (una línea). */
  descripcion: string
  /** Ícono Phosphor (weight duotone). */
  icon: Icon
  tono: RecordatorioTono
  /** Marca el hito final donde el caso deja prevención y pasa a cobranza. */
  esEscalacion?: boolean
}

export interface SecuenciaRecordatoriosProps {
  pasos: PasoRecordatorio[]
  className?: string
}

export function SecuenciaRecordatorios({ pasos, className }: SecuenciaRecordatoriosProps) {
  return (
    <ol className={cn('relative space-y-0', className)}>
      {pasos.map((paso, i) => {
        const tono = TONO_CLASSES[paso.tono]
        const isLast = i === pasos.length - 1
        const PasoIcon = paso.icon

        return (
          <li key={paso.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Riel conector vertical (hairline) — no se dibuja bajo el último nodo */}
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-[19px] top-10 bottom-0 w-px bg-border"
              />
            )}

            {/* Nodo de ícono (chip rounded-md, contrato §7) */}
            <span
              className={cn(
                'relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-md ring-4 ring-bg',
                tono.icon,
              )}
            >
              <PasoIcon className="h-5 w-5" weight="duotone" aria-hidden="true" />
            </span>

            {/* Contenido del paso */}
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                  {paso.cuando}
                </span>
                {paso.esEscalacion && (
                  <span className="inline-flex items-center rounded-full border border-danger/30 bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger">
                    Pasa a cobranza
                  </span>
                )}
              </div>
              <h3 className="mt-0.5 text-base font-semibold text-fg">{paso.titulo}</h3>
              <p className="mt-0.5 text-sm text-fg-muted leading-snug">{paso.descripcion}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
