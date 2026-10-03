'use client'

/**
 * PilotoModoPropio — la perilla PROPIA de un proceso del Piloto (ola E,
 * 03-10-2026).
 *
 * Nico (C2-IA Q5): «perilla propia `conciliacion.alias`». El alias que concilia
 * solo (3 confirmaciones sin contradicciones, sólo el texto del pago, el valor
 * exacto y un solo contrato) tiene su Manual / Copiloto / Automático APARTE del
 * de la conciliación: poner la conciliación en Automático ya no lo prende.
 * Vive debajo de la fila de su agente en el panel de Autonomía, con la frase
 * que publica el micro para cada modo. Sin elección, Copiloto (nada sale solo).
 *
 * Movimiento: entra con los tokens de Cadence (sólo opacidad y desplazamiento,
 * `MotionConfig reducedMotion="user"`).
 */

import { MotionConfig, motion } from 'framer-motion'
import { SegmentedControl, motionDistance, motionTransition } from '@leasefy/cadence'

import { MODOS_DEL_PILOTO, type AutonomiaModo, type ModoPropioDelProceso } from '@/lib/api/piloto'

const NOMBRE_DEL_MODO: Record<AutonomiaModo, string> = {
  sombra: 'Manual',
  copiloto: 'Copiloto',
  autonomo: 'Automático',
}

export interface PilotoModoPropioProps {
  proceso: ModoPropioDelProceso
  /** ¿Quien mira lo puede cambiar? (sólo un administrador). */
  puedeEditar: boolean
  /** `false` = todavía no se puede guardar: se ve, pero no se cambia. */
  guardable: boolean | null
  /** Por qué no se puede cambiar, si no se puede (lo dice el micro). */
  porQueNo: string | null
  ocupado: boolean
  onCambiar: (modo: AutonomiaModo) => void
}

export function PilotoModoPropio({ proceso, puedeEditar, guardable, porQueNo, ocupado, onCambiar }: PilotoModoPropioProps) {
  const sePuedeCambiar = puedeEditar && guardable !== false
  const sinElegir = proceso.origen === 'default'
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: motionDistance.xs }}
        animate={{ opacity: 1, y: 0 }}
        transition={motionTransition.enter}
        className="ml-3 space-y-1.5 border-l border-border pl-3"
        data-testid={`piloto-modo-propio-${proceso.id}`}
      >
        <p className="flex flex-wrap items-center gap-2 text-body-sm font-medium text-fg">
          {proceso.nombre}
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-caption font-normal text-fg-muted">
            Perilla propia
          </span>
        </p>
        <p className="text-caption leading-snug text-fg-muted">{proceso.queHace}</p>
        {sePuedeCambiar ? (
          <SegmentedControl<AutonomiaModo>
            options={MODOS_DEL_PILOTO.map((m) => ({ value: m, label: NOMBRE_DEL_MODO[m] }))}
            value={proceso.modo}
            onChange={(modo) => onCambiar(modo)}
            disabled={ocupado}
            size="sm"
            fullWidth
            aria-label={`Modo de «${proceso.nombre}»`}
          />
        ) : (
          <p className="text-caption text-fg-muted" data-testid={`piloto-modo-propio-modo-${proceso.id}`}>
            {NOMBRE_DEL_MODO[proceso.modo]}
          </p>
        )}
        <p className="text-caption leading-snug text-fg-muted">{proceso.queHaceEnCadaModo[proceso.modo]}</p>
        <p className="text-caption leading-snug text-fg-subtle">
          No lo mueven el modo de la conciliación ni la píldora del Piloto.
          {sinElegir ? ' Mientras no lo elijas, queda en Copiloto: no concilia nada solo.' : ''}
        </p>
        {!sePuedeCambiar && porQueNo && <p className="text-caption leading-snug text-fg-subtle">{porQueNo}</p>}
      </motion.div>
    </MotionConfig>
  )
}
