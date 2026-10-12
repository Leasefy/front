'use client';

/**
 * Un MES de un formulario, con el aspecto del `DatePicker` de Cadence: el
 * botón dice «Octubre de 2026» y abre los doce meses del año con ‹ año ›.
 *
 * Nico, 10-10-2026: «este no usa Cadence» — el `<input type="month">` del
 * navegador pinta el mes en el idioma del sistema («October 2026») y abre un
 * selector que no se parece a nada del producto. `SelectorDeMes` (‹ mes ›) es
 * para MIRAR un mes en una pantalla; éste es para ELEGIRLO en un formulario:
 * tiene `id` para su rótulo, error, mínimo y máximo, y deja meses futuros
 * cuando el formulario los acepta.
 *
 * Habla en `AAAA-MM`, igual que el `<input type="month">` que reemplaza.
 */

import { forwardRef, useState } from 'react';
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { Popover, PopoverContent, PopoverTrigger } from '@leasefy/cadence';

import { nombreDelMes } from '@/lib/recaudo/meses';
import { cn } from '@/lib/utils';

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function anioDe(mes: string | null | undefined): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec(mes ?? '');
  return m ? Number(m[1]) : null;
}

/** «octubre de 2026» → «Octubre de 2026». */
export function mesParaElBoton(mes: string): string {
  const texto = nombreDelMes(mes);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export interface CampoDeMesProps {
  /** El `id` del botón: el del `<label htmlFor>`. */
  id: string;
  /** `AAAA-MM`, o `''` sin mes. */
  value: string;
  onChange: (mes: string) => void;
  /** `AAAA-MM`: no se puede elegir antes. */
  min?: string | null;
  /** `AAAA-MM`: no se puede elegir después. */
  max?: string | null;
  invalido?: boolean;
  describedBy?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  testid?: string;
}

export const CampoDeMes = forwardRef<HTMLButtonElement, CampoDeMesProps>(function CampoDeMes(
  {
    id,
    value,
    onChange,
    min,
    max,
    invalido = false,
    describedBy,
    disabled = false,
    placeholder = 'Elige el mes',
    className,
    testid,
  },
  ref,
) {
  const [abierto, setAbierto] = useState(false);
  const anioInicial = anioDe(value) ?? anioDe(max) ?? new Date().getFullYear();
  const [anio, setAnio] = useState(anioInicial);
  const anioMin = anioDe(min);
  const anioMax = anioDe(max);

  const fuera = (mes: string) => (min ? mes < min : false) || (max ? mes > max : false);

  return (
    <div data-testid={testid} data-value={value || undefined} data-invalid={invalido || undefined}>
      <Popover
        open={abierto}
        onOpenChange={(a) => {
          setAbierto(a);
          if (a) setAnio(anioDe(value) ?? anioInicial);
        }}
      >
        <PopoverTrigger asChild>
          <button
            ref={ref}
            id={id}
            type="button"
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={abierto}
            aria-describedby={describedBy}
            className={cn(
              'inline-flex h-11 w-full min-w-0 items-center gap-2 rounded-md border border-border bg-surface px-3 text-left text-body-sm',
              'outline-none transition-colors hover:border-border-strong',
              'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle',
              abierto && 'border-primary ring-2 ring-ring',
              invalido && 'border-danger',
              className,
            )}
          >
            <CalendarBlank size={15} className={cn('shrink-0', value ? 'text-fg-muted' : 'text-fg-subtle')} aria-hidden />
            <span className={cn('flex-1 truncate tabular-nums', value ? 'text-fg' : 'text-fg-subtle')}>
              {value ? mesParaElBoton(value) : placeholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-[264px] p-3">
          <div className="mb-3 flex items-center justify-between px-0.5">
            <button
              type="button"
              aria-label="Año anterior"
              disabled={anioMin !== null && anio <= anioMin}
              onClick={() => setAnio((a) => a - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted outline-none transition-colors hover:bg-surface-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
            >
              <CaretLeft size={14} weight="bold" />
            </button>
            <span className="font-display text-body-sm font-medium tabular-nums text-fg" aria-live="polite">
              {anio}
            </span>
            <button
              type="button"
              aria-label="Año siguiente"
              disabled={anioMax !== null && anio >= anioMax}
              onClick={() => setAnio((a) => a + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted outline-none transition-colors hover:bg-surface-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1" role="grid" aria-label={`Meses de ${anio}`}>
            {MESES_CORTOS.map((corto, i) => {
              const mes = `${anio}-${String(i + 1).padStart(2, '0')}`;
              const elegido = mes === value;
              const apagado = fuera(mes);
              return (
                <button
                  key={mes}
                  type="button"
                  disabled={apagado}
                  aria-pressed={elegido}
                  aria-label={`${MESES_LARGOS[i]} de ${anio}`}
                  onClick={() => {
                    onChange(mes);
                    setAbierto(false);
                  }}
                  className={cn(
                    'h-9 rounded-md text-body-sm capitalize outline-none transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-ring',
                    elegido ? 'bg-primary text-primary-foreground' : 'text-fg hover:bg-surface-muted',
                    apagado && 'cursor-not-allowed text-fg-subtle opacity-50 hover:bg-transparent',
                  )}
                >
                  {corto}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});
