'use client';

import { useEffect, useMemo, useState } from 'react';

import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import { hoyLocal } from '@/components/estado-de-cuenta/filas';
import { resumenDePagos, type ResumenDePagos } from '@/lib/estado-de-cuenta/resumen-de-pagos';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

/**
 * El estado de cuenta del que mira (inquilino), tal como lo arma el back. Si
 * no llega, `null`: la pantalla no afirma «al día» ni inventa un próximo pago.
 */
export function useEstadoDeCuentaDelPortal(activo: boolean): EstadoDeCuenta | null {
  const [doc, setDoc] = useState<EstadoDeCuenta | null>(null);
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    estadoDeCuentaApi
      .mio()
      .then((d) => {
        if (vivo) setDoc(d);
      })
      .catch(() => {
        if (vivo) setDoc(null);
      });
    return () => {
      vivo = false;
    };
  }, [activo]);
  return doc;
}

/**
 * El resumen del estado de cuenta del que mira (inquilino). Es la fuente de
 * «Estado general» en «Mi arriendo»: si no llega, devuelve `null` y la pantalla
 * no afirma «al día».
 */
export function useResumenDelPortal(activo: boolean): ResumenDePagos | null {
  const doc = useEstadoDeCuentaDelPortal(activo);
  return useMemo(() => (doc ? resumenDePagos(doc, hoyLocal()) : null), [doc]);
}
