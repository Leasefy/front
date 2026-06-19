'use client'

/**
 * ReglaCard — una regla configurable de la inmobiliaria como card-row.
 *
 * Patrón único de fila de regla del panel de Pagos: un Switch de
 * activar/desactivar a la izquierda del título + descripción, y un control
 * de parametrización opcional (días, monto o selector excluyente) que solo
 * aparece cuando la regla está activa.
 *
 * UX-only: el estado vive en local (preview completo y honesto). NO persiste —
 * el guardado real es un placeholder "Próximamente" en la página (T-323),
 * porque todavía no existe el endpoint de configuración de reglas. CERO hex:
 * tokens del DS (fg/fg-muted/primary/border/surface-muted).
 */

import * as React from 'react'

import { Switch } from '@/components/ui'
import { Input } from '@/components/ui'
import { SegmentedControl, type SegmentedOption } from '@leasefy/ui'
import { cn } from '@/lib/utils'

// ── Tipos del control de parametrización ─────────────────────────────────────

/** Sin control extra: la regla es un puro on/off. */
interface ControlNinguno {
  tipo: 'ninguno'
}

/** Campo numérico con sufijo (p.ej. "día del mes", "días antes", "monto $"). */
interface ControlNumero {
  tipo: 'numero'
  /** Valor actual. */
  value: number
  onChange: (value: number) => void
  /** Texto a la derecha del input (unidad). */
  sufijo?: string
  /** Texto a la izquierda del input (p.ej. "$"). */
  prefijo?: string
  min?: number
  max?: number
  /** Etiqueta accesible del input. */
  ariaLabel: string
  /** Ancho del input en clases tailwind (default w-24). */
  inputClassName?: string
}

/** Selector excluyente (1 opción de N). */
interface ControlOpciones<T extends string = string> {
  tipo: 'opciones'
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  ariaLabel: string
}

export type ReglaControl =
  | ControlNinguno
  | ControlNumero
  | ControlOpciones

// ── Props ────────────────────────────────────────────────────────────────────

export interface ReglaCardProps {
  /** Título corto de la regla. */
  titulo: string
  /** Qué hace la regla, en lenguaje claro. */
  descripcion: string
  /** Estado de la regla. */
  activa: boolean
  onToggle: (activa: boolean) => void
  /** Control de parametrización opcional (solo visible si la regla está activa). */
  control?: ReglaControl
  className?: string
}

// ── Render del control ────────────────────────────────────────────────────────

function ControlParametrizacion({ control }: { control: ReglaControl }) {
  if (control.tipo === 'numero') {
    return (
      <div className="flex items-center gap-2 text-sm text-fg">
        {control.prefijo && <span className="text-fg-muted">{control.prefijo}</span>}
        <Input
          type="number"
          inputMode="numeric"
          aria-label={control.ariaLabel}
          value={Number.isNaN(control.value) ? '' : control.value}
          min={control.min}
          max={control.max}
          onChange={(e) => control.onChange(Number(e.target.value))}
          className={cn('h-9 px-3 tabular-nums', control.inputClassName ?? 'w-24')}
        />
        {control.sufijo && <span className="text-fg-muted whitespace-nowrap">{control.sufijo}</span>}
      </div>
    )
  }

  if (control.tipo === 'opciones') {
    return (
      <SegmentedControl
        size="sm"
        aria-label={control.ariaLabel}
        value={control.value}
        onChange={control.onChange}
        options={control.options}
      />
    )
  }

  return null
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function ReglaCard({
  titulo,
  descripcion,
  activa,
  onToggle,
  control,
  className,
}: ReglaCardProps) {
  const switchId = React.useId()
  const tieneControl = Boolean(control && control.tipo !== 'ninguno')

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 sm:p-5',
        'transition-colors',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <label
            htmlFor={switchId}
            className="block text-sm font-semibold text-fg cursor-pointer"
          >
            {titulo}
          </label>
          <p className="text-sm text-fg-muted leading-snug">{descripcion}</p>
        </div>

        <Switch
          id={switchId}
          checked={activa}
          onCheckedChange={onToggle}
          aria-label={titulo}
          className="mt-0.5 shrink-0"
        />
      </div>

      {/* Control de parametrización — solo cuando la regla está activa. */}
      {tieneControl && activa && control && (
        <div className="mt-4 pt-4 border-t border-border">
          <ControlParametrizacion control={control} />
        </div>
      )}
    </div>
  )
}
