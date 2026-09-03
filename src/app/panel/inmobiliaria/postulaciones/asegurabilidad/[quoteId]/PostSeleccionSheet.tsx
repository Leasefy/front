'use client'

/**
 * PostSeleccionSheet — asegurabilidad (ex-cotizador), post-selección (visión #22).
 *
 * Sección "¿Qué quieres hacer ahora?" que se monta en el rail de recomendación.
 * Disclosure simple (sin librería de modal externa): un trigger que despliega la
 * lista de siguientes pasos sobre la opción elegida:
 *   Radicar · Generar expediente · Notificar asesor · Compartir con propietario ·
 *   Pasar a contrato · Guardar opción elegida.
 *
 * Cada ítem → onAction(code). Las acciones con destino natural las resuelve el
 * padre (navegación); el resto quedan etiquetadas "Próximamente" por el padre
 * (patrón de honestidad — no se inventan endpoints).
 *
 * UX-only.
 */

import { useState } from 'react'
import { CaretDown, ListChecks } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { RailAction } from './RailAction'

const NS = 'inmobiliaria.ai.cotizador'

/** Códigos de paso post-selección (catálogo cerrado). */
export type PostSeleccionCode =
  | 'radicar'
  | 'expediente'
  | 'notificar'
  | 'propietario'
  | 'contrato'
  | 'guardar'

const STEP_FALLBACK_ES: Record<PostSeleccionCode, string> = {
  radicar: 'Radicar la póliza',
  expediente: 'Generar expediente',
  notificar: 'Notificar al asesor',
  propietario: 'Compartir con el propietario',
  contrato: 'Pasar a contrato',
  guardar: 'Guardar la opción elegida',
}

const STEP_ORDER: PostSeleccionCode[] = [
  'radicar',
  'expediente',
  'notificar',
  'propietario',
  'contrato',
  'guardar',
]

interface PostSeleccionSheetProps {
  onAction: (code: PostSeleccionCode) => void
  /** Inhabilita los pasos cuando aún no hay una opción asegurable. */
  disabled?: boolean
}

export function PostSeleccionSheet({ onAction, disabled = false }: PostSeleccionSheetProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  return (
    <section
      className="rounded-lg border border-border bg-card p-4"
      data-testid="post-seleccion-sheet"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" weight="duotone" aria-hidden="true" />
          <span className="text-sm font-semibold text-fg">
            {tf(`${NS}.detail.postSeleccion.titulo`, '¿Qué quieres hacer ahora?')}
          </span>
        </span>
        <CaretDown
          className={
            'w-4 h-4 text-fg-muted transition-transform motion-reduce:transition-none ' +
            (open ? 'rotate-180' : '')
          }
          weight="bold"
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {STEP_ORDER.map((code) => (
            <RailAction
              key={code}
              label={tf(`${NS}.detail.postSeleccion.${code}`, STEP_FALLBACK_ES[code])}
              disabled={disabled}
              disabledTooltip={tf(
                `${NS}.detail.postSeleccion.sinOpcion`,
                'Disponible cuando haya una opción asegurable.',
              )}
              onClick={() => onAction(code)}
              testId={`post-seleccion-${code}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
