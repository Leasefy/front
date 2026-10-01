'use client'

/**
 * Los pasos de un asistente de registro, leídos como progreso.
 *
 * En escritorio es una columna con línea de tiempo: el número (o el ✓ de lo
 * hecho), el nombre del paso y una línea corta de qué se pide. En teléfono es
 * una fila de círculos unidos; los nombres siguen ahí para el lector de
 * pantalla (`sr-only`) y la tarjeta del paso dice «Paso N de M».
 *
 * Un paso con `onSelect` es un `<button>` que lleva a ese paso; sin
 * `onSelect` es sólo informativo. Qué pasos se pueden visitar lo decide quien
 * usa la lista (cada asistente tiene su regla); acá sólo se pinta.
 */

import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export type EstadoDelPaso = 'hecho' | 'actual' | 'pendiente'

export interface PasoDeLaLista {
  key: string
  label: string
  /** Una línea corta de qué se pide en el paso. Sólo en escritorio. */
  descripcion?: string
  estado: EstadoDelPaso
  /** Con esto el paso es un botón que lleva ahí. */
  onSelect?: () => void
  /** El nombre accesible del botón. Por defecto, «Ir a <label>». */
  etiquetaDelBoton?: string
  /** `data-testid` del círculo del paso. */
  testId?: string
  /** `data-testid` del botón, cuando el paso es navegable. */
  testIdDelBoton?: string
}

export interface OnboardingStepListProps {
  pasos: PasoDeLaLista[]
  /** El nombre de la lista para el lector de pantalla. */
  etiqueta: string
  /** Una nota bajo los pasos, sólo en escritorio («Tu progreso se guarda…»). */
  nota?: string
  className?: string
}

export function OnboardingStepList({ pasos, etiqueta, nota, className }: OnboardingStepListProps) {
  return (
    <div className={className}>
      <ol aria-label={etiqueta} className="flex items-center gap-2 lg:flex-col lg:items-stretch lg:gap-0">
        {pasos.map((paso, indice) => {
          const ultimo = indice === pasos.length - 1
          const hecho = paso.estado === 'hecho'
          const actual = paso.estado === 'actual'

          const contenido = (
            <>
              <span
                data-testid={paso.testId}
                data-active={actual}
                aria-current={actual ? 'step' : undefined}
                className={cn(
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-medium tabular-nums transition-colors duration-200',
                  hecho && 'bg-primary-soft text-primary',
                  actual && 'bg-primary text-primary-fg ring-4 ring-primary/15',
                  paso.estado === 'pendiente' && 'border border-border bg-surface text-fg-subtle',
                )}
              >
                {hecho ? <Check className="h-3.5 w-3.5" weight="bold" aria-hidden /> : indice + 1}
              </span>
              <span className="sr-only lg:not-sr-only lg:block lg:min-w-0 lg:pt-1.5">
                <span
                  className={cn(
                    'block text-body-sm font-medium leading-tight',
                    actual ? 'text-fg' : hecho ? 'text-fg-muted' : 'text-fg-subtle',
                  )}
                >
                  {paso.label}
                </span>
                {paso.descripcion ? (
                  <span className="mt-0.5 block text-caption text-fg-subtle">{paso.descripcion}</span>
                ) : null}
              </span>
            </>
          )

          return (
            <li
              key={paso.key}
              className={cn(
                'relative flex items-center gap-2 lg:items-start lg:pb-6',
                ultimo ? 'lg:pb-0' : 'flex-1 lg:flex-none',
              )}
            >
              {/* La línea que une un paso con el siguiente, en escritorio. */}
              {!ultimo ? (
                <span
                  aria-hidden
                  className={cn(
                    'absolute bottom-0 left-[21px] top-[44px] hidden w-px lg:block',
                    hecho ? 'bg-primary/40' : 'bg-border',
                  )}
                />
              ) : null}

              {paso.onSelect ? (
                <button
                  type="button"
                  onClick={paso.onSelect}
                  aria-label={paso.etiquetaDelBoton ?? `Ir a ${paso.label}`}
                  data-testid={paso.testIdDelBoton}
                  className="group flex shrink-0 items-start gap-3 rounded-md p-1.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg lg:w-full"
                >
                  {contenido}
                </button>
              ) : (
                <div className="flex shrink-0 items-start gap-3 p-1.5 lg:w-full">{contenido}</div>
              )}

              {/* La línea entre círculos, en teléfono. */}
              {!ultimo ? (
                <span
                  aria-hidden
                  className={cn('h-px min-w-3 flex-1 lg:hidden', hecho ? 'bg-primary/40' : 'bg-border')}
                />
              ) : null}
            </li>
          )
        })}
      </ol>

      {nota ? (
        <p className="mt-8 hidden items-center gap-2 px-1.5 text-caption text-fg-muted lg:flex">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
          {nota}
        </p>
      ) : null}
    </div>
  )
}
