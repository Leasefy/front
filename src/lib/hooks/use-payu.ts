'use client';

/**
 * Las lecturas de Payu y del autopago para la inmobiliaria (las tres rutas de
 * `payu-api-front.md`). Cada una con { data, cargando, error, recargar }.
 *
 * 🔴 `data` es SIEMPRE la de los filtros pedidos: mientras llega la del mes
 * nuevo, la del mes anterior no se muestra ni un instante (el mismo cuidado que
 * `useComparativaDelRecaudo`). Una tabla de octubre con el título de noviembre
 * es peor que un esqueleto.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { payuApi } from '@/lib/api/payu.service';
import type {
  AutopagosDeLaInmobiliaria,
  FiltrosDeLinksDePago,
  PaginaDeLinksDePago,
  ResumenDeLinksDePago,
} from '@/lib/types/payu';

export interface Lectura<T> {
  /** `null` mientras carga, si falló, o si lo que hay es de otros filtros. */
  data: T | null;
  cargando: boolean;
  error: unknown;
  recargar: () => Promise<void>;
}

function useLectura<T>(clave: string, leer: () => Promise<T>): Lectura<T> {
  const [estado, setEstado] = useState<{
    clave: string | null;
    data: T | null;
    cargando: boolean;
    error: unknown;
  }>({ clave: null, data: null, cargando: true, error: null });
  const leerRef = useRef(leer);
  leerRef.current = leer;
  // Cada pedido lleva su número: sólo el último escribe (cambiar de mes rápido
  // no deja que una respuesta vieja pise a la nueva).
  const ultimo = useRef(0);

  const recargar = useCallback(async () => {
    const n = ++ultimo.current;
    setEstado((s) => ({ ...s, cargando: true, error: null }));
    try {
      const data = await leerRef.current();
      if (n !== ultimo.current) return;
      setEstado({ clave, data, cargando: false, error: null });
    } catch (error) {
      if (n !== ultimo.current) return;
      setEstado((s) => ({ ...s, cargando: false, error }));
    }
  }, [clave]);

  useEffect(() => {
    void recargar();
    // Al cambiar de filtros o desmontar, lo que esté en vuelo ya no escribe.
    // Es un contador, no un nodo: leerlo en la limpieza es justo lo que se quiere.
    const contador = ultimo;
    return () => {
      contador.current++;
    };
  }, [recargar]);

  return {
    data: estado.clave === clave ? estado.data : null,
    cargando: estado.cargando,
    error: estado.error,
    recargar,
  };
}

/** El link de cada cuota del mes (paginado, filtrable por estado). */
export function useLinksDePago(filtros: Required<Pick<FiltrosDeLinksDePago, 'mes' | 'page' | 'limit'>> &
  Pick<FiltrosDeLinksDePago, 'estado'>): Lectura<PaginaDeLinksDePago> {
  const { mes, estado, page, limit } = filtros;
  return useLectura(`${mes}|${estado ?? ''}|${page}|${limit}`, () =>
    payuApi.links({ mes, estado, page, limit }),
  );
}

/** El mes de Payu en cifras, y si el cron está prendido. */
export function useResumenDePayu(mes: string): Lectura<ResumenDeLinksDePago> {
  return useLectura(mes, () => payuApi.resumen(mes));
}

/** Los contratos con autopago y si el cobro automático está prendido. */
export function useAutopagosDeLaInmobiliaria(): Lectura<AutopagosDeLaInmobiliaria> {
  return useLectura('autopagos', () => payuApi.autopagos());
}
