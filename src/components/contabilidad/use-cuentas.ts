'use client';

/**
 * El plan de cuentas activo, cargado una vez por pantalla.
 *
 * Lo comparten el selector de cuenta del asiento manual, el filtro del libro
 * de asientos y el libro auxiliar. Se pide `soloActivas`: una cuenta inactiva
 * no se imputa ni se filtra, y el back la rechazaría igual (`CUENTA_INACTIVA`).
 */

import { useCallback, useEffect, useState } from 'react';

import { contabilidadApi, type CuentaPuc } from '@/lib/api/contabilidad.service';

export interface EstadoDeCuentas {
  cuentas: CuentaPuc[];
  cargando: boolean;
  error: unknown;
  recargar: () => Promise<void>;
}

export function useCuentas(): EstadoDeCuentas {
  const [cuentas, setCuentas] = useState<CuentaPuc[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setCuentas(await contabilidadApi.puc.listar({ soloActivas: true }));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { cuentas, cargando, error, recargar };
}

/** «110505 · Caja general» — así se lee una cuenta en cualquier lista. */
export function etiquetaDeCuenta(c: Pick<CuentaPuc, 'codigo' | 'nombre'>): string {
  return `${c.codigo} · ${c.nombre}`;
}
