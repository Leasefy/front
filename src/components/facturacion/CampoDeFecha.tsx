'use client'

/**
 * Un DÍA de un formulario de Facturación, con el selector de fecha del DS.
 *
 * 🔴 FA-R29 (QA de Facturación, 03-10-2026): la resolución, la certificación y
 * el documento soporte usaban `<input type="date">` del navegador, que pinta la
 * fecha en el idioma y el formato del sistema («09/01/2026», «Sept 1, 2026») y
 * abre un calendario que no se parece a nada del producto — el mismo defecto
 * que ya se le quitó a `type="month"`. El `DatePicker` de Cadence escribe «1 sep
 * 2026» y abre el calendario de la casa.
 *
 * El formulario sigue hablando en `AAAA-MM-DD` (es lo que viaja al back y lo que
 * validan `erroresDeLaResolucion` y compañía): acá se traduce de ida y vuelta
 * sin que la zona horaria corra el día (`fechaLocal` / `aFechaIso`).
 */

import { DatePicker } from '@leasefy/cadence'

import { aFechaIso, fechaLocal } from '@/lib/fechas-locales'
import { cn } from '@/lib/utils'

export interface CampoDeFechaProps {
  /** El `id` del botón: es el del `<label htmlFor>` y el que recibe el foco. */
  id: string
  /** `AAAA-MM-DD`, o `''` sin fecha. */
  value: string
  onChange: (valor: string) => void
  /** Pinta el borde de error (el error mismo va debajo, en `ErrorDelCampo`). */
  invalido?: boolean
  disabled?: boolean
  placeholder?: string
  /** Para las pruebas y el navegador: el contenedor lleva este `data-testid`. */
  testid?: string
}

export function CampoDeFecha({
  id,
  value,
  onChange,
  invalido = false,
  disabled = false,
  placeholder = 'Elige el día',
  testid,
}: CampoDeFechaProps) {
  return (
    <div data-testid={testid} data-invalid={invalido || undefined}>
      <DatePicker
        id={id}
        value={fechaLocal(value)}
        onChange={(d) => onChange(aFechaIso(d))}
        placeholder={placeholder}
        disabled={disabled}
        className={cn('h-11 w-full', invalido && 'border-danger')}
      />
    </div>
  )
}
