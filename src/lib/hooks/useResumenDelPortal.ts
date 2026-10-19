'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import { hoyLocal } from '@/components/estado-de-cuenta/filas';
import { resumenDePagos, type ResumenDePagos } from '@/lib/estado-de-cuenta/resumen-de-pagos';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

export interface EstadoDeCuentaConEstado {
  doc: EstadoDeCuenta | null;
  cargando: boolean;
  /** El error de la lectura; `null` si llegó o no se pidió. */
  fallo: unknown;
  reintentar: () => void;
}

/**
 * Lo mismo que `useEstadoDeCuentaDelPortal`, pero diciendo si todavía carga o si
 * falló: el Inicio del arrendatario (QA 17-10) no puede decir «estás al día»
 * mientras no sabe, ni callar si la lectura falló.
 */
export function useEstadoDeCuentaDelPortalConEstado(activo: boolean): EstadoDeCuentaConEstado {
  const [estado, setEstado] = useState<{ doc: EstadoDeCuenta | null; cargando: boolean; fallo: unknown }>({
    doc: null,
    cargando: activo,
    fallo: null,
  });
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    if (!activo) {
      setEstado({ doc: null, cargando: false, fallo: null });
      return;
    }
    let vivo = true;
    setEstado((e) => ({ ...e, cargando: true, fallo: null }));
    estadoDeCuentaApi
      .mio()
      .then((d) => {
        if (vivo) setEstado({ doc: d, cargando: false, fallo: null });
      })
      .catch((e: unknown) => {
        if (vivo) setEstado({ doc: null, cargando: false, fallo: e });
      });
    return () => {
      vivo = false;
    };
  }, [activo, intento]);
  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  return { ...estado, reintentar };
}

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
