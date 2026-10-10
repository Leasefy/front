/**
 * Dobles de PRUEBA de los campos de fecha de la casa (10-10-2026: todos los
 * `<input type="date|month">` pasaron a `CampoDeDia`, `CampoDeMes` y
 * `CampoDeNacimiento`, que no se escriben: se eligen en un calendario).
 *
 * Cada doble es un `<input>` con el MISMO `id`, `data-testid`, valor
 * (`AAAA-MM-DD` / `AAAA-MM`) y error que el campo real, así las pruebas siguen
 * escribiendo la fecha como antes. Sólo se importa desde un `vi.mock`:
 *
 *   vi.mock('@/components/contabilidad/CampoDeDia', () => import('@/components/ui/campos-de-fecha.doble-de-prueba'))
 *   vi.mock('@/components/ui/campo-de-mes', () => import('@/components/ui/campos-de-fecha.doble-de-prueba'))
 *
 * Las pruebas del campo REAL están junto a cada uno.
 */

import { forwardRef } from 'react';

interface PropsDelDoble {
  id?: string;
  value: string;
  onChange: (valor: string) => void;
  min?: string | null;
  max?: string | null;
  invalido?: boolean;
  describedBy?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  testid?: string;
  etiqueta?: string;
  requerido?: boolean;
  quitable?: boolean;
  etiquetaDeQuitar?: string;
}

function doble(nombre: string, tipo: 'date' | 'month') {
  const Doble = forwardRef<HTMLInputElement, PropsDelDoble>(function Doble(
    { id, value, onChange, min, max, invalido, describedBy, disabled, placeholder, className, testid, etiqueta, requerido },
    ref,
  ) {
    return (
      <input
        ref={ref}
        id={id}
        type={tipo}
        value={value}
        min={min ?? undefined}
        max={max ?? undefined}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={etiqueta}
        aria-invalid={invalido ? true : undefined}
        aria-required={requerido ? true : undefined}
        aria-describedby={describedBy}
        className={className}
        data-testid={testid}
        data-doble={nombre}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  });
  Doble.displayName = `${nombre}Doble`;
  return Doble;
}

export const CampoDeDia = doble('CampoDeDia', 'date');
export const CampoDeMes = doble('CampoDeMes', 'month');
export const CampoDeNacimiento = doble('CampoDeNacimiento', 'date');

type AriaDeUnInput = {
  id?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
};

/** La misma traducción que `ariaDelCampoDeDia` del campo real. */
export function ariaDelCampoDeDia<T extends AriaDeUnInput>(a: T) {
  return {
    ...(a.id !== undefined ? { id: a.id } : {}),
    invalido: a['aria-invalid'] === true || a['aria-invalid'] === 'true',
    describedBy: a['aria-describedby'],
  } as { invalido: boolean; describedBy?: string } & (T extends { id: string } ? { id: string } : unknown);
}
