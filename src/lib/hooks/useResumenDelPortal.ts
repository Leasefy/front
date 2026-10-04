'use client';

import { useEffect, useState } from 'react';

import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import { hoyLocal } from '@/components/estado-de-cuenta/filas';
import { resumenDePagos, type ResumenDePagos } from '@/lib/estado-de-cuenta/resumen-de-pagos';

/**
 * El resumen del estado de cuenta del que mira (inquilino). Es la fuente de
 * «Estado general» en «Mi arriendo»: si no llega, devuelve `null` y la pantalla
 * no afirma «al día».
 */
export function useResumenDelPortal(activo: boolean): ResumenDePagos | null {
  const [resumen, setResumen] = useState<ResumenDePagos | null>(null);
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    estadoDeCuentaApi
      .mio()
      .then((doc) => {
        if (vivo) setResumen(resumenDePagos(doc, hoyLocal()));
      })
      .catch(() => {
        if (vivo) setResumen(null);
      });
    return () => {
      vivo = false;
    };
  }, [activo]);
  return resumen;
}
