'use client';

/**
 * Un campo de plata que se lee mientras se escribe.
 *
 * Antes eran `<input type="number">`: el navegador **no admite separadores de
 * miles** en un campo numérico —si el valor no parsea como número lo descarta—,
 * así que el usuario tecleaba `3000000` y tenía que contar ceros a ojo. El
 * formato vivía en una ayudita gris debajo, que es justo donde no se está
 * mirando.
 *
 * Acá el campo es de texto (`inputMode="numeric"` para que el teléfono abra el
 * teclado de números) y agrupa a medida que se escribe: `3.000.000`.
 *
 * **Hacia afuera sigue siendo un número.** `onChange` entrega la cadena de
 * dígitos pelada —`"3000000"`—, igual que antes, para no obligar a cada
 * formulario a desformatear.
 *
 * ⚠️ `moneda` sólo cambia el FORMATO (COP agrupa con punto y no lleva
 * decimales; USD agrupa con coma y admite dos). No existe todavía una columna
 * de moneda en la base —`Lease.monthlyRent` es un `Int` pelado y no hay
 * `currency` en ningún modelo—, así que **nada de lo que se elija acá se
 * guarda**. Mientras eso no exista, el único llamador posible pasa COP.
 */

import { forwardRef, useCallback, useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export type Moneda = 'COP' | 'USD';

const CONFIG: Record<Moneda, { locale: string; decimales: number; simbolo: string }> = {
  COP: { locale: 'es-CO', decimales: 0, simbolo: '$' },
  USD: { locale: 'en-US', decimales: 2, simbolo: 'US$' },
};

/**
 * Deja sólo dígitos y —si la moneda los admite— un separador decimal.
 *
 * Cada moneda se lee con SUS convenciones, las mismas con las que se pinta:
 * en COP el punto agrupa (y no hay centavos), en USD la coma agrupa y el punto
 * separa decimales. Aceptar las dos a la vez vuelve ambiguo `1,500`: son mil
 * quinientos o uno con cinco, y adivinar mal cambia el monto por mil.
 */
export function soloNumero(texto: string, moneda: Moneda = 'COP'): string {
  const { decimales } = CONFIG[moneda];
  if (decimales === 0) return texto.replace(/\D/g, '');
  const sinAgrupar = texto.replace(/[^\d.]/g, ''); // la coma agrupa en USD
  const [entero, ...resto] = sinAgrupar.split('.');
  if (resto.length === 0) return entero;
  return `${entero}.${resto.join('').slice(0, decimales)}`;
}

/** `"3000000"` → `"3.000.000"`. Cadena vacía se queda vacía: cero no es nada. */
export function agrupar(crudo: string, moneda: Moneda = 'COP'): string {
  if (!crudo) return '';
  const { locale, decimales } = CONFIG[moneda];
  const [entero, decimal] = crudo.split('.');
  if (entero === '') return decimal !== undefined ? `0${separadorDecimal(locale)}${decimal}` : '';
  const agrupado = Number(entero).toLocaleString(locale);
  if (decimales === 0 || decimal === undefined) return agrupado;
  return `${agrupado}${separadorDecimal(locale)}${decimal}`;
}

function separadorDecimal(locale: string): string {
  return (1.1).toLocaleString(locale).charAt(1);
}

export interface MoneyInputProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Input>, 'value' | 'onChange' | 'type'> {
  /** Dígitos pelados, sin separadores: `"3000000"`. */
  value: string | number | null | undefined;
  /** Recibe dígitos pelados, nunca el texto formateado. */
  onChange: (crudo: string) => void;
  moneda?: Moneda;
  /** Prefijo dentro del campo. `false` lo apaga. */
  simbolo?: boolean;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, moneda = 'COP', simbolo = true, className, ...props },
  refExterna,
) {
  const refInterna = useRef<HTMLInputElement | null>(null);
  /** Dígitos antes del cursor: lo único estable cuando el texto se reagrupa. */
  const digitosAntesDelCursor = useRef<number | null>(null);

  const crudo = value === null || value === undefined ? '' : String(value);
  const formateado = agrupar(crudo, moneda);

  const manejarCambio = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const el = e.target;
      const cursor = el.selectionStart ?? el.value.length;
      // Contar dígitos a la izquierda del cursor ANTES de reformatear: las
      // posiciones absolutas se corren cuando entra o sale un separador.
      digitosAntesDelCursor.current = (el.value.slice(0, cursor).match(/[\d]/g) ?? []).length;
      onChange(soloNumero(el.value, moneda));
    },
    [onChange, moneda],
  );

  // Reponer el cursor después de que React repinta el texto agrupado.
  useLayoutEffect(() => {
    const el = refInterna.current;
    const objetivo = digitosAntesDelCursor.current;
    if (!el || objetivo === null || document.activeElement !== el) return;
    digitosAntesDelCursor.current = null;
    let vistos = 0;
    let pos = el.value.length;
    for (let i = 0; i < el.value.length; i++) {
      if (/\d/.test(el.value[i])) {
        vistos++;
        if (vistos === objetivo) {
          pos = i + 1;
          break;
        }
      }
    }
    if (objetivo === 0) pos = 0;
    el.setSelectionRange(pos, pos);
  }, [formateado]);

  return (
    <div className="relative">
      {simbolo && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-fg-subtle"
        >
          {CONFIG[moneda].simbolo}
        </span>
      )}
      <Input
        {...props}
        ref={(nodo) => {
          refInterna.current = nodo;
          if (typeof refExterna === 'function') refExterna(nodo);
          else if (refExterna) refExterna.current = nodo;
        }}
        type="text"
        inputMode={CONFIG[moneda].decimales === 0 ? 'numeric' : 'decimal'}
        autoComplete="off"
        value={formateado}
        onChange={manejarCambio}
        className={cn('font-mono tabular-nums', simbolo && 'pl-10', className)}
      />
    </div>
  );
});
