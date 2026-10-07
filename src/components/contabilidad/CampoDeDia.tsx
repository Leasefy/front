'use client';

/**
 * Un DÍA de Contabilidad con el selector de fecha del DS (QA de Contabilidad,
 * CB-04, 03-10-2026).
 *
 * Los filtros «Desde / Hasta» del libro y de los informes, el «Hasta el día» del
 * cierre y la fecha del asiento manual eran `<input type="date">` del navegador:
 * en 1440 px se cortaban («dd/mm/yy'»), escribían la fecha en el formato del
 * sistema y abrían un calendario que no se parece a nada del producto. El
 * `DatePicker` de Cadence escribe «30 sep 2026» y abre el calendario de la casa
 * (el mismo arreglo que `facturacion/CampoDeFecha`, FA-R29).
 *
 * La pantalla sigue hablando en `AAAA-MM-DD` (lo que viaja al back y lo que
 * comparan `rangoInvertido` y compañía): acá se traduce de ida y vuelta sin que
 * la zona horaria corra el día (`fechaLocal` / `aFechaIso`).
 *
 * `quitable`: un filtro opcional tiene que poder volver a «sin fecha» — el
 * `DatePicker` sólo elige días —, así que debajo del campo va «Quitar la fecha».
 */

import { DatePicker } from '@leasefy/cadence';

import { aFechaIso, fechaLocal } from '@/lib/fechas-locales';
import { cn } from '@/lib/utils';

export interface CampoDeDiaProps {
  /** El `id` del botón: es el del `<label htmlFor>` y el que recibe el foco. */
  id: string;
  /** `AAAA-MM-DD`, o `''` sin fecha. */
  value: string;
  onChange: (valor: string) => void;
  /** `AAAA-MM-DD`: el calendario no deja elegir antes de este día. */
  min?: string | null;
  /** `AAAA-MM-DD`: el calendario no deja elegir después de este día. */
  max?: string | null;
  /** Pinta el borde de error (el error va debajo, en `ErrorDelCampo`). */
  invalido?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Con valor, ofrece volver a «sin fecha» (filtros opcionales). */
  quitable?: boolean;
  /** El nombre accesible del botón de quitar: «Quitar la fecha desde». */
  etiquetaDeQuitar?: string;
  /** El `aria-describedby` del botón (el id del error). */
  describedBy?: string;
  className?: string;
  /** Para las pruebas y el navegador: el contenedor lleva este `data-testid`. */
  testid?: string;
}

export function CampoDeDia({
  id,
  value,
  onChange,
  min,
  max,
  invalido = false,
  disabled = false,
  placeholder = 'Elige el día',
  quitable = false,
  etiquetaDeQuitar = 'Quitar la fecha',
  describedBy,
  className,
  testid,
}: CampoDeDiaProps) {
  const minimo = fechaLocal(min ?? null) ?? undefined;
  const maximo = fechaLocal(max ?? null) ?? undefined;
  return (
    <div
      className="space-y-1"
      data-testid={testid}
      data-value={value || undefined}
      data-invalid={invalido || undefined}
      aria-describedby={describedBy}
    >
      <DatePicker
        id={id}
        value={fechaLocal(value)}
        onChange={(d) => onChange(aFechaIso(d))}
        placeholder={placeholder}
        disabled={disabled}
        minDate={minimo}
        maxDate={maximo}
        className={cn('h-11 w-full min-w-0', invalido && 'border-danger', className)}
      />
      {quitable && value && !disabled ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-caption text-fg-muted underline-offset-2 hover:text-fg hover:underline focus-visible:text-fg focus-visible:underline focus-visible:outline-none"
          aria-label={etiquetaDeQuitar}
          data-testid={testid ? `${testid}-quitar` : undefined}
        >
          Quitar la fecha
        </button>
      ) : null}
    </div>
  );
}
