'use client';

/**
 * Las dos caras de la cartera, con refresco solo cuando cambian cobros o
 * dispersiones: un recibo de caja registrado en otra pantalla baja el saldo
 * del inquilino acá sin recargar, y un giro marcado como pagado baja lo que
 * se le debe al propietario.
 */

import { useCallback, useEffect, useState } from 'react';

import { carteraApi } from '@/lib/api/cartera.service';
import type {
  CarteraConPropietarios,
  CarteraDeInquilinos,
  CarteraDelMes,
} from '@/lib/api/cartera.types';
import { alCambiar } from '@/lib/api/refresco-de-datos';

export interface EstadoDeCarga<T> {
  datos: T | null;
  cargando: boolean;
  error: unknown;
  recargar: () => Promise<void>;
}

function useLectura<T>(leer: () => Promise<T>, recursos: readonly string[]): EstadoDeCarga<T> {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await leer());
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [leer]);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    leer()
      .then((r) => {
        if (vivo) setDatos(r);
      })
      .catch((e) => {
        if (vivo) setError(e);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [leer]);

  useEffect(() => alCambiar(recursos, () => void recargar()), [recargar, recursos]);

  return { datos, cargando, error, recargar };
}

const RECURSOS_DE_INQUILINOS = ['cobros'] as const;
const RECURSOS_DE_PROPIETARIOS = ['cobros', 'dispersiones'] as const;

export function useCarteraDeInquilinos(): EstadoDeCarga<CarteraDeInquilinos> {
  return useLectura(carteraApi.inquilinos, RECURSOS_DE_INQUILINOS);
}

/**
 * La deuda de UN mes. Se refresca con `cobros` por lo mismo que la cartera: un
 * recibo de caja emitido en otra pantalla baja el saldo acá sin recargar
 * (`recibosDeCajaApi` llama `invalidar('cobros')`).
 *
 * `leer` se memoiza por el mes: `useLectura` lo usa como dependencia y una
 * función nueva en cada render volvería a pedir el mes en bucle.
 */
export function useCarteraDelMes(mes: string): EstadoDeCarga<CarteraDelMes> {
  const leer = useCallback(() => carteraApi.delMes(mes), [mes]);
  return useLectura(leer, RECURSOS_DE_INQUILINOS);
}

export function useCarteraConPropietarios(): EstadoDeCarga<CarteraConPropietarios> {
  return useLectura(carteraApi.propietarios, RECURSOS_DE_PROPIETARIOS);
}
