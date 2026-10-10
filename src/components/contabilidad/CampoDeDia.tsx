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

import { forwardRef, useCallback, useEffect, useRef } from 'react';
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
  /** Obligatorio: el botón lleva `aria-required` (el lector de pantalla lo dice). */
  requerido?: boolean;
  className?: string;
  /** Para las pruebas y el navegador: el contenedor lleva este `data-testid`. */
  testid?: string;
}

/**
 * El `ref` llega al BOTÓN del calendario: un formulario que enfoca el campo
 * con error (`ref.current?.focus()`) sigue funcionando (10-10-2026, al pasar
 * todos los `<input type="date">` del panel a este campo).
 */
export const CampoDeDia = forwardRef<HTMLButtonElement, CampoDeDiaProps>(function CampoDeDia({
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
  requerido = false,
  className,
  testid,
}, ref) {
  /*
   * El `DatePicker` de Cadence no deja pasar atributos ARIA a su botón; el
   * mensaje de error y «obligatorio» se le ponen acá, al botón mismo (que es
   * lo que enfoca y lee el lector de pantalla), no sólo al contenedor. Un
   * botón no lleva `aria-invalid` (no es de su rol): el error llega por
   * `aria-describedby` y el borde rojo.
   */
  const boton = useRef<HTMLButtonElement | null>(null);
  const conRef = useCallback(
    (nodo: HTMLButtonElement | null) => {
      boton.current = nodo;
      if (typeof ref === 'function') ref(nodo);
      else if (ref) ref.current = nodo;
    },
    [ref],
  );
  useEffect(() => {
    const b = boton.current;
    if (!b) return;
    const poner = (nombre: string, valor: string | undefined) =>
      valor ? b.setAttribute(nombre, valor) : b.removeAttribute(nombre);
    poner('aria-describedby', describedBy);
    poner('aria-required', requerido ? 'true' : undefined);
  }, [describedBy, requerido]);
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
        ref={conRef}
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
});

type AriaDeUnInput = {
  id?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
};

/**
 * Las props de error que un formulario le esparcía a su `<Input type="date">`
 * (`{...conError('fecha')}`: `id`, `aria-invalid`, `aria-describedby`), dichas
 * como las de este campo. Así el ayudante de cada formulario sigue siendo la
 * única fuente del id y del error.
 */
export function ariaDelCampoDeDia<T extends AriaDeUnInput>(a: T) {
  return {
    ...(a.id !== undefined ? { id: a.id } : {}),
    invalido: a['aria-invalid'] === true || a['aria-invalid'] === 'true',
    describedBy: a['aria-describedby'],
  } as { invalido: boolean; describedBy?: string } & (T extends { id: string } ? { id: string } : unknown);
}
