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

import { forwardRef, useCallback, useRef, useState } from 'react';
import { CurrencyInput, Presence, type CurrencyInputProps } from '@leasefy/cadence';

import { MoneyInputNumerico, PISTA_SIN_CENTAVOS, traiaCentavosSinLlave } from './money-input';
import type { AreasDePlata } from '@/lib/plata/con-centavos';
import { usePlataConCentavos } from '@/lib/plata/use-plata-con-centavos';

export interface CampoDePlataProps extends CurrencyInputProps {
  /** El área (o las áreas) de la plata donde va a parar el valor. */
  areas: AreasDePlata;
  /** Centavos aunque la llave esté apagada (ver `MoneyInput.siempreConCentavos`). */
  siempreConCentavos?: boolean;
}

export const CampoDePlata = forwardRef<HTMLInputElement, CampoDePlataProps>(function CampoDePlata(
  { areas, siempreConCentavos = false, ...props },
  ref,
) {
  const llaveDelArea = usePlataConCentavos(areas);
  const conCentavos = siempreConCentavos || llaveDelArea;
  /*
   * 🔴 CE-04 (QA-PAGOS-95, 05-10-2026): con la llave apagada el `CurrencyInput`
   * de Cadence borra la coma y deja los dígitos: «1.000.000,50» en el monto del
   * recibo de caja era $ 100.000.050 (cien veces más), pegado o tecleado. Antes
   * de que Cadence lea el texto (fase de captura) los centavos se frenan —quedan
   * los pesos— y se dice; los dígitos tecleados después de la coma no caen en
   * los pesos hasta que la persona borre. Lo demás es el campo de siempre.
   */
  const anterior = useRef('');
  const comaFrenada = useRef(false);
  const [centavosFrenados, setCentavosFrenados] = useState(false);
  const frenarLosCentavos = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const texto = el.value;
    const digitos = texto.replace(/\D/g, '');
    const antes = anterior.current.replace(/\D/g, '');
    const alFinal = (el.selectionStart ?? texto.length) >= texto.length;
    if (
      comaFrenada.current &&
      alFinal &&
      !texto.includes(',') &&
      digitos.length > antes.length &&
      digitos.startsWith(antes)
    ) {
      el.value = anterior.current;
      setCentavosFrenados(true);
      return;
    }
    if (traiaCentavosSinLlave(texto) || /,\s*$/.test(texto)) {
      el.value = texto.slice(0, texto.lastIndexOf(','));
      comaFrenada.current = true;
      setCentavosFrenados(true);
    } else {
      comaFrenada.current = false;
      setCentavosFrenados(false);
    }
    anterior.current = el.value;
  }, []);
  if (!conCentavos) {
    return (
      <>
        <CurrencyInput ref={ref} {...props} onChangeCapture={frenarLosCentavos} />
        <Presence show={centavosFrenados} as="span" direction="up" distance="xs" className="block">
          <span data-testid="pista-sin-centavos" className="mt-1 block text-xs text-fg-muted">
            {PISTA_SIN_CENTAVOS}
          </span>
        </Presence>
      </>
    );
  }
  const { value, onChange, placeholder, ...resto } = props;
  return (
    <MoneyInputNumerico
      {...resto}
      ref={ref}
      areas={areas}
      siempreConCentavos={siempreConCentavos}
      placeholder={placeholder === undefined ? '0' : placeholder}
      value={value}
      onChange={(v) => onChange?.(v)}
    />
  );
});
