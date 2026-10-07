'use client';

/**
 * QA-MIGRACION-95 — CA-04 (decisión de Nico (a), 06-10-2026): los contratos
 * vigentes del inquilino que «Mi arriendo» no conoce porque no tienen arriendo
 * (el migrado sin día de pago, o cuya cuenta nació después). Los resuelve el
 * back por la sesión, con la misma identidad del estado de cuenta.
 *
 * Fail-soft: un back sin la ruta (404) o caído deja la lista vacía y la
 * pantalla se ve como antes; nunca tumba «Mi arriendo» ni el inicio.
 */
import { useEffect, useState } from 'react';

import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import type { ContratoDelPortal } from '@/lib/types/estado-de-cuenta';

export function useContratosDelPortal(activo: boolean): { contratos: ContratoDelPortal[]; cargando: boolean } {
  const [contratos, setContratos] = useState<ContratoDelPortal[]>([]);
  const [cargando, setCargando] = useState(activo);
  useEffect(() => {
    if (!activo) {
      setCargando(false);
      return;
    }
    let vivo = true;
    setCargando(true);
    estadoDeCuentaApi
      .misContratos()
      .then((r) => {
        if (vivo) setContratos(Array.isArray(r?.contratos) ? r.contratos : []);
      })
      .catch(() => {
        if (vivo) setContratos([]);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [activo]);
  return { contratos, cargando };
}
