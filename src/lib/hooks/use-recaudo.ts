'use client';

/**
 * El recaudo de un mes y la serie de los últimos doce, con refresco solo
 * cuando cambian cobros o dispersiones (un recibo emitido en otra pantalla
 * mueve «llegó» acá sin recargar).
 */

import { useCallback, useEffect, useState } from 'react';

import { recaudoApi } from '@/lib/api/recaudo.service';
import type { PuntoDeLaSerie, ResumenDeRecaudo } from '@/lib/api/recaudo.types';
import { alCambiar } from '@/lib/api/refresco-de-datos';

export const MESES_DE_LA_SERIE = 12;

export interface EstadoDelRecaudo {
  resumen: ResumenDeRecaudo | null;
  serie: PuntoDeLaSerie[] | null;
  cargando: boolean;
  error: unknown;
  recargar: () => Promise<void>;
}

export function useRecaudo(month: string): EstadoDelRecaudo {
  const [resumen, setResumen] = useState<ResumenDeRecaudo | null>(null);
  const [serie, setSerie] = useState<PuntoDeLaSerie[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [r, s] = await Promise.all([
        recaudoApi.resumen(month),
        recaudoApi.serie(MESES_DE_LA_SERIE, month),
      ]);
      setResumen(r);
      setSerie(s);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [month]);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    Promise.all([recaudoApi.resumen(month), recaudoApi.serie(MESES_DE_LA_SERIE, month)])
      .then(([r, s]) => {
        if (!vivo) return;
        setResumen(r);
        setSerie(s);
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
  }, [month]);

  useEffect(() => alCambiar(['cobros', 'dispersiones'], () => void recargar()), [recargar]);

  return { resumen, serie, cargando, error, recargar };
}
