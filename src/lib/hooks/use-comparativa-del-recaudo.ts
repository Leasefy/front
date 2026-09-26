'use client';

/**
 * La comparativa del mes contra el anterior, APARTE del resumen: si esta
 * lectura falla, las cinco cifras siguen en pantalla y lo único que dice «no
 * se pudo leer» es la comparación. Se refresca con los mismos eventos que el
 * resto del recaudo.
 */

import { useCallback, useEffect, useState } from 'react';

import { recaudoApi } from '@/lib/api/recaudo.service';
import type { ComparativaDelMes } from '@/lib/api/recaudo.types';
import { alCambiar } from '@/lib/api/refresco-de-datos';

export interface EstadoDeLaComparativa {
  /** `null` mientras carga o si falló. Sólo la del mes pedido: nunca la de otro. */
  comparativa: ComparativaDelMes | null;
  cargando: boolean;
  error: unknown;
  recargar: () => Promise<void>;
}

export function useComparativaDelRecaudo(month: string): EstadoDeLaComparativa {
  const [comparativa, setComparativa] = useState<ComparativaDelMes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setComparativa(await recaudoApi.comparativa(month));
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
    recaudoApi
      .comparativa(month)
      .then((c) => {
        if (vivo) setComparativa(c);
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

  // La del mes anterior al que se eligió no se muestra ni un instante.
  return {
    comparativa: comparativa?.month === month ? comparativa : null,
    cargando,
    error,
    recargar,
  };
}
