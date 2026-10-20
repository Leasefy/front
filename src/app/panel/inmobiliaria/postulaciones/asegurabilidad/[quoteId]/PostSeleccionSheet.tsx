'use client'

/**
 * PostSeleccionSheet — asegurabilidad (ex-cotizador), post-selección (visión #22).
 *
 * Sección "¿Qué quieres hacer ahora?" que se monta en el rail de recomendación.
 * Disclosure simple (sin librería de modal externa): un trigger que despliega la
 * lista de siguientes pasos sobre la opción elegida.
 *
 * 🔴 COTIZ-17 (19-10-2026, Nico): cada paso hace lo que dice —
 *   Radicar la póliza (el número a mano) · Generar expediente (el PDF) ·
 *   Notificar al asesor (una tarea en su Agenda) · Pasar a contrato (Nuevo
 *   contrato prellenado). «Compartir con el propietario» se quitó (la
 *   cotización no sabe de qué inmueble es y la autorización del candidato es
 *   para esta consulta) y «Guardar la opción elegida» es «Avanzar con la
 *   recomendada». Lo abre también «Avanzar» (controlado por el padre).
 *
 */

import { useState } from 'react'
import { CaretDown, ListChecks } from '@phosphor-icons/react'

import { Collapse } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import { RailAction } from './RailAction'

const NS = 'inmobiliaria.ai.cotizador'

/** Códigos de paso post-selección (catálogo cerrado). */
export type PostSeleccionCode = 'radicar' | 'expediente' | 'notificar' | 'contrato'

const STEP_FALLBACK_ES: Record<PostSeleccionCode, string> = {
  radicar: 'Radicar la póliza',
  expediente: 'Generar expediente',
  notificar: 'Notificar al asesor',
  contrato: 'Pasar a contrato',
}

const STEP_ORDER: PostSeleccionCode[] = ['radicar', 'expediente', 'notificar', 'contrato']

interface PostSeleccionSheetProps {
  onAction: (code: PostSeleccionCode) => void
  /** Inhabilita los pasos cuando aún no hay una opción asegurable. */
  disabled?: boolean
  /** Abierto desde afuera («Avanzar con la recomendada» lo abre). Sin esto, lleva su estado. */
  abierto?: boolean
  onAbiertoChange?: (abierto: boolean) => void
  /** Lo que ya quedó: «Elegiste Mapfre» / «Póliza N.º 123». */
  resumen?: string | null
  /** La póliza ya registrada: el paso dice «Cambiar la póliza». */
  conPoliza?: boolean
}

export function PostSeleccionSheet({ onAction, disabled = false, abierto, onAbiertoChange, resumen = null, conPoliza = false }: PostSeleccionSheetProps) {
  const { t } = useI18n()
  const [abiertoPropio, setAbiertoPropio] = useState(false)
  const open = abierto ?? abiertoPropio
  const setOpen = (v: boolean | ((x: boolean) => boolean)) => {
    const siguiente = typeof v === 'function' ? v(open) : v
    if (onAbiertoChange) onAbiertoChange(siguiente)
    else setAbiertoPropio(siguiente)
  }

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

      {/* Se abre y se cierra con el movimiento de Cadence. */}
      <Collapse open={open}>
        <div className="mt-3 space-y-2" data-testid="post-seleccion-pasos">
          {resumen && (
            <p className="text-xs text-fg-muted" data-testid="post-seleccion-resumen">
              {resumen}
            </p>
          )}
          {STEP_ORDER.map((code) => (
            <RailAction
              key={code}
              label={
                code === 'radicar' && conPoliza
                  ? tf(`${NS}.detail.postSeleccion.cambiarPoliza`, 'Cambiar el número de la póliza')
                  : tf(`${NS}.detail.postSeleccion.${code}`, STEP_FALLBACK_ES[code])
              }
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
      </Collapse>
    </section>
  )
}
