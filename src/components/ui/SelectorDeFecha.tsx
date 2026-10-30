'use client';

/**
 * El selector de fecha de la casa: el `DatePicker` de Cadence con el MES y el AÑO a la mano.
 *
 * 🔴 Nico (reunión con Portofino, 29-10-2026): «no se está pudiendo desplegar año ni mes para ningún
 * calendario dentro de la plataforma». El calendario de Cadence sólo tenía flechas de mes en mes:
 * para una fecha de nacimiento o un contrato de hace años había que dar cientos de clics.
 *
 * Aquí el encabezado trae, entre las flechas, un menú del mes y otro del año (1940 a dentro de 15
 * años, recortado por `minDate`/`maxDate`). La grilla de días, el botón y la ventana son los de
 * Cadence (`CalendarGrid`, las mismas clases del `DatePicker`), así que se ve igual que antes.
 * Mismas props que el `DatePicker` de Cadence, más `desdeAnio`/`hastaAnio`.
 *
 * Cadence vive en su propio repo (`file:../cadence`) y su `Calendar` no deja cambiar el encabezado
 * (sólo `month`/`onMonthChange`); cuando lo traiga, esta pieza puede volver a ser un reexport.
 */
import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { CalendarGrid, MONTH_NAMES } from '@leasefy/cadence';

import { cn } from '@/lib/utils';

export interface SelectorDeFechaProps {
  value?: Date | null;
  onChange?: (date: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Días que no se pueden elegir (`true` = apagado). */
  isDisabled?: (date: Date) => boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  id?: string;
  /** El primer año del menú (por defecto 1940). */
  desdeAnio?: number;
  /** El último año del menú (por defecto, dentro de 15 años). */
  hastaAnio?: number;
}

export const ANIO_MAS_VIEJO = 1940;
export const ANIOS_HACIA_ADELANTE = 15;

const primerDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** «3 sep 2026», como el `DatePicker` de Cadence. */
export function fechaDelSelector(date: Date): string {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
}

/**
 * Los años del menú: de `desde` (1940) a `hasta` (hoy + 15), sin salirse de `minDate`/`maxDate`,
 * y siempre con el año que se está mirando (una fecha guardada de 1930 no desaparece del menú).
 */
export function aniosDelMenu({
  desde,
  hasta,
  minDate,
  maxDate,
  incluir,
  hoy = new Date(),
}: {
  desde?: number;
  hasta?: number;
  minDate?: Date;
  maxDate?: Date;
  incluir?: number;
  hoy?: Date;
}): number[] {
  let primero = Math.max(desde ?? ANIO_MAS_VIEJO, minDate ? minDate.getFullYear() : -Infinity);
  let ultimo = Math.min(hasta ?? hoy.getFullYear() + ANIOS_HACIA_ADELANTE, maxDate ? maxDate.getFullYear() : Infinity);
  if (ultimo < primero) ultimo = primero;
  if (incluir != null) {
    primero = Math.min(primero, incluir);
    ultimo = Math.max(ultimo, incluir);
  }
  const anios: number[] = [];
  for (let a = ultimo; a >= primero; a--) anios.push(a);
  return anios;
}

/** ¿El mes `mes` (0–11) de `anio` queda entero fuera de `minDate`/`maxDate`? */
export function mesFueraDelRango(anio: number, mes: number, minDate?: Date, maxDate?: Date): boolean {
  if (minDate && new Date(anio, mes + 1, 0) < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
  if (maxDate && new Date(anio, mes, 1) > maxDate) return true;
  return false;
}

const BOTON_DE_FLECHA = cn(
  'h-7 w-7 shrink-0 rounded-md flex items-center justify-center',
  'text-fg-muted hover:bg-surface-muted hover:text-fg',
  'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
  'disabled:pointer-events-none disabled:opacity-40',
);

const MENU = cn(
  'h-7 cursor-pointer rounded-md border-0 bg-transparent px-1.5 text-body-sm font-display font-medium',
  'tracking-[-0.01em] tabular-nums text-fg outline-none transition-colors',
  'hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring',
);

export interface CalendarioConMesYAnioProps
  extends Pick<SelectorDeFechaProps, 'value' | 'onChange' | 'isDisabled' | 'minDate' | 'maxDate' | 'desdeAnio' | 'hastaAnio' | 'className'> {
  /** El mes que se muestra al abrir (si no, el de la fecha elegida o el de hoy). */
  mesInicial?: Date;
}

/** El calendario de Cadence con el encabezado de mes y año. */
export const CalendarioConMesYAnio = React.forwardRef<HTMLDivElement, CalendarioConMesYAnioProps>(
  ({ value, onChange, isDisabled, minDate, maxDate, desdeAnio, hastaAnio, mesInicial, className }, ref) => {
    const [mes, setMes] = React.useState(() => primerDia(mesInicial ?? value ?? new Date()));
    const anios = aniosDelMenu({ desde: desdeAnio, hasta: hastaAnio, minDate, maxDate, incluir: mes.getFullYear() });
    const anioMasViejo = anios[anios.length - 1];
    const anioMasNuevo = anios[0];

    const ir = (anio: number, m: number) => setMes(new Date(anio, m, 1));
    const anterior = new Date(mes.getFullYear(), mes.getMonth() - 1, 1);
    const siguiente = new Date(mes.getFullYear(), mes.getMonth() + 1, 1);
    const sinAnterior =
      anterior.getFullYear() < anioMasViejo || mesFueraDelRango(anterior.getFullYear(), anterior.getMonth(), minDate, undefined);
    const sinSiguiente =
      siguiente.getFullYear() > anioMasNuevo || mesFueraDelRango(siguiente.getFullYear(), siguiente.getMonth(), undefined, maxDate);

    const elegirAnio = (anio: number) => {
      // Si el mes no existe en ese año (por el rango), el primero que sí.
      let m = mes.getMonth();
      if (mesFueraDelRango(anio, m, minDate, maxDate)) {
        const valido = MONTH_NAMES.findIndex((_, i) => !mesFueraDelRango(anio, i, minDate, maxDate));
        m = valido >= 0 ? valido : m;
      }
      ir(anio, m);
    };

    const etiqueta = `${MONTH_NAMES[mes.getMonth()]} ${mes.getFullYear()}`;
    return (
      <div
        ref={ref}
        className={cn('w-[296px] rounded-lg border border-border bg-surface p-3 select-none', className)}
        role="application"
        aria-label={`Calendario, ${etiqueta}`}
        data-testid="calendario-con-mes-y-anio"
      >
        <div className="mb-3 flex items-center justify-between gap-1 px-0.5">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => ir(anterior.getFullYear(), anterior.getMonth())}
            disabled={sinAnterior}
            className={BOTON_DE_FLECHA}
          >
            <CaretLeft size={14} weight="bold" />
          </button>
          <div className="flex min-w-0 items-center gap-0.5" aria-live="polite" aria-atomic="true">
            <select
              aria-label="Mes"
              value={mes.getMonth()}
              onChange={(e) => ir(mes.getFullYear(), Number(e.target.value))}
              className={MENU}
              data-testid="calendario-mes"
            >
              {MONTH_NAMES.map((nombre, i) => (
                <option key={nombre} value={i} disabled={mesFueraDelRango(mes.getFullYear(), i, minDate, maxDate)}>
                  {mayuscula(nombre)}
                </option>
              ))}
            </select>
            <select
              aria-label="Año"
              value={mes.getFullYear()}
              onChange={(e) => elegirAnio(Number(e.target.value))}
              className={MENU}
              data-testid="calendario-anio"
            >
              {anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            aria-label="Mes siguiente"
            onClick={() => ir(siguiente.getFullYear(), siguiente.getMonth())}
            disabled={sinSiguiente}
            className={BOTON_DE_FLECHA}
          >
            <CaretRight size={14} weight="bold" />
          </button>
        </div>
        <CalendarGrid
          displayMonth={mes}
          value={value}
          onChange={onChange}
          isDisabled={isDisabled}
          minDate={minDate}
          maxDate={maxDate}
        />
      </div>
    );
  },
);
CalendarioConMesYAnio.displayName = 'CalendarioConMesYAnio';

/** El campo de fecha: el botón del `DatePicker` de Cadence que abre el calendario con mes y año. */
export const SelectorDeFecha = React.forwardRef<HTMLButtonElement, SelectorDeFechaProps>(
  (
    { value, onChange, placeholder = 'Seleccionar fecha', disabled = false, isDisabled, minDate, maxDate, className, id, desdeAnio, hastaAnio },
    ref,
  ) => {
    const [abierto, setAbierto] = React.useState(false);
    const hayFecha = value != null;

    return (
      <Popover.Root open={abierto} onOpenChange={setAbierto}>
        <Popover.Trigger asChild>
          <button
            ref={ref}
            id={id}
            type="button"
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={abierto}
            aria-label={hayFecha ? `Fecha seleccionada: ${fechaDelSelector(value!)}` : placeholder}
            className={cn(
              'h-9 min-w-[180px] inline-flex items-center gap-2 rounded-md border border-border',
              'bg-surface px-3 text-body-sm font-body text-left',
              'transition-colors outline-none',
              'hover:border-border-strong',
              'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle disabled:border-border-faint disabled:hover:border-border-faint',
              abierto && 'border-primary ring-2 ring-ring',
              className,
            )}
          >
            <CalendarBlank size={15} className={cn('shrink-0 transition-colors', hayFecha ? 'text-fg-muted' : 'text-fg-subtle')} />
            <span className={cn('flex-1 truncate tabular-nums', hayFecha ? 'text-fg' : 'text-fg-subtle')}>
              {hayFecha ? fechaDelSelector(value!) : placeholder}
            </span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={6}
            collisionPadding={12}
            className="z-50 animate-scale-in rounded-lg border border-border bg-surface shadow-overlay outline-none"
          >
            <CalendarioConMesYAnio
              value={value}
              onChange={(d) => {
                onChange?.(d);
                setAbierto(false);
              }}
              isDisabled={isDisabled}
              minDate={minDate}
              maxDate={maxDate}
              desdeAnio={desdeAnio}
              hastaAnio={hastaAnio}
              className="border-none shadow-none"
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  },
);
SelectorDeFecha.displayName = 'SelectorDeFecha';

export default SelectorDeFecha;
