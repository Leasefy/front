'use client';

/**
 * Un `Combobox` sobre el plan de cuentas: se busca por código o por nombre.
 *
 * `soloImputables` para el asiento manual (una cuenta mayor no recibe
 * movimientos: el back contesta `CUENTA_MAYOR`); para filtrar reportes se
 * dejan todas, que a veces lo que se quiere mirar es la 1105 entera.
 */

import { useMemo } from 'react';

import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import type { CuentaPuc } from '@/lib/api/contabilidad.service';
import { etiquetaDeCuenta } from './use-cuentas';

export interface SelectorDeCuentaProps {
  cuentas: readonly CuentaPuc[];
  value: string;
  onChange: (cuentaId: string) => void;
  soloImputables?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function SelectorDeCuenta({
  cuentas,
  value,
  onChange,
  soloImputables = false,
  invalid,
  disabled,
  placeholder = 'Elegí una cuenta',
  className,
}: SelectorDeCuentaProps) {
  const opciones = useMemo<ComboboxOption[]>(
    () =>
      cuentas
        .filter((c) => !soloImputables || c.imputable)
        .map((c) => ({ value: c.id, label: etiquetaDeCuenta(c) })),
    [cuentas, soloImputables],
  );

  return (
    <Combobox
      className={className}
      value={value || undefined}
      onChange={(v) => onChange(v ?? '')}
      options={opciones}
      placeholder={placeholder}
      searchPlaceholder="Código o nombre…"
      invalid={invalid}
      disabled={disabled || opciones.length === 0}
    />
  );
}
