'use client';

import { useEffect, useRef, useState } from 'react';
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import { pqrsApi } from '@/lib/api/pqrs.service';
import { acuerdosApi } from '@/lib/api/tenant-acuerdos.service';
import { indiceDelInquilino, type EntradaDelIndice } from './buscador-del-inquilino';

export interface BuscadorDelInquilino {
  /** `null` mientras no se ha leído nada. */
  indice: EntradaDelIndice[] | null;
  cargando: boolean;
  /** Alguna de las tres lecturas falló: lo que no aparece puede existir. */
  incompleto: boolean;
}

/**
 * Lee lo propio del inquilino UNA vez, cuando abre el buscador (`activo`), con
 * los mismos servicios del portal. Una lectura que falla no tumba las otras,
 * pero se dice (`incompleto`): el buscador no puede afirmar «no existe» sobre
 * algo que no pudo mirar.
 */
export function useBuscadorDelInquilino(activo: boolean): BuscadorDelInquilino {
  const [estado, setEstado] = useState<BuscadorDelInquilino>({ indice: null, cargando: false, incompleto: false });
  const pedido = useRef(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    if (!activo || pedido.current) return;
    pedido.current = true;
    setEstado((e) => ({ ...e, cargando: true }));
    void Promise.allSettled([estadoDeCuentaApi.mio(), pqrsApi.listMine(), acuerdosApi.listMine()]).then(
      ([cuenta, solicitudes, acuerdos]) => {
        if (!montado.current) return;
        setEstado({
          indice: indiceDelInquilino({
            estado: cuenta.status === 'fulfilled' ? cuenta.value : null,
            solicitudes: solicitudes.status === 'fulfilled' ? solicitudes.value : null,
            acuerdos: acuerdos.status === 'fulfilled' ? acuerdos.value : null,
          }),
          cargando: false,
          incompleto: [cuenta, solicitudes, acuerdos].some((r) => r.status === 'rejected'),
        });
      },
    );
  }, [activo]);

  return estado;
}
