'use client';

/**
 * El campo de plata NUMÉRICO (`NaN` = vacío) de las pantallas que usan el
 * `CurrencyInput` de Cadence («centavos en todo», C3-FRONT, 03-10-2026).
 *
 * El `CurrencyInput` de Cadence es de pesos enteros (descarta la coma y pinta
 * `Math.floor`). Con las llaves del área prendidas (`areas`, `GET
 * /config/plata`) este campo pasa a ser `MoneyInputNumerico`: coma decimal,
 * hasta dos decimales y el tercero frenado. Apagadas —o con un back viejo— es
 * EXACTAMENTE el `CurrencyInput` de siempre, con las mismas props.
 */

import { forwardRef } from 'react';
import { CurrencyInput, type CurrencyInputProps } from '@leasefy/cadence';

import { MoneyInputNumerico } from './money-input';
import type { AreasDePlata } from '@/lib/plata/con-centavos';
import { usePlataConCentavos } from '@/lib/plata/use-plata-con-centavos';

export interface CampoDePlataProps extends CurrencyInputProps {
  /** El área (o las áreas) de la plata donde va a parar el valor. */
  areas: AreasDePlata;
}

export const CampoDePlata = forwardRef<HTMLInputElement, CampoDePlataProps>(function CampoDePlata(
  { areas, ...props },
  ref,
) {
  const conCentavos = usePlataConCentavos(areas);
  if (!conCentavos) return <CurrencyInput ref={ref} {...props} />;
  const { value, onChange, placeholder, ...resto } = props;
  return (
    <MoneyInputNumerico
      {...resto}
      ref={ref}
      areas={areas}
      placeholder={placeholder === undefined ? '0' : placeholder}
      value={value}
      onChange={(v) => onChange?.(v)}
    />
  );
});
