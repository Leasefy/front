'use client';

import { useCallback, useEffect, useState } from 'react';
import { inventarioDelInmuebleApi } from '@/lib/api/inventario-del-inmueble.service';
import {
  guardarInventariosEnCache,
  leerInventariosDeCache,
} from '@/lib/inventario/cache-de-inventarios';
import type { InventariosDelInmueble } from '@/lib/types/inventario-del-inmueble';

export interface EstadoDeLosInventarios {
  datos: InventariosDelInmueble | null;
  cargando: boolean;
  error: string | null;
  /** `true` cuando lo que se muestra salió de la copia de este navegador. */
  desdeCache: boolean;
  recargar: () => Promise<void>;
  /** Lo que devolvió una escritura (guardar borrador, completar). */
  reemplazar: (datos: InventariosDelInmueble) => void;
}

/**
 * Las versiones del inventario de un inmueble. Con señal, del back (y se
 * guardan en este navegador); sin señal, la última copia guardada.
 */
export function useInventariosDelInmueble(consignacionId: string | undefined): EstadoDeLosInventarios {
  const [datos, setDatos] = useState<InventariosDelInmueble | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [desdeCache, setDesdeCache] = useState(false);

  const reemplazar = useCallback((nuevos: InventariosDelInmueble) => {
    setDatos(nuevos);
    setDesdeCache(false);
    setError(null);
    guardarInventariosEnCache(nuevos);
  }, []);

  const recargar = useCallback(async () => {
    if (!consignacionId) return;
    setCargando(true);
    try {
      reemplazar(await inventarioDelInmuebleApi.listar(consignacionId));
    } catch (err) {
      const guardados = leerInventariosDeCache(consignacionId);
      if (guardados) {
        setDatos(guardados);
        setDesdeCache(true);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el inventario');
      }
    } finally {
      setCargando(false);
    }
  }, [consignacionId, reemplazar]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { datos, cargando, error, desdeCache, recargar, reemplazar };
}
