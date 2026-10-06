'use client';

import { useCallback, useEffect, useState } from 'react';

import { recibosDelInquilinoApi, type ReciboDelInquilino } from '@/lib/api/recibos-del-inquilino.service';

/**
 * Los recibos de caja del inquilino (QA-INQ-95). `recibos === null` = el back no
 * tiene la función (anterior): la sección no se pinta. Un fallo se dice, nunca
 * se ve como «no tienes recibos».
 */
export function useRecibosDelInquilino(activo = true) {
  const [recibos, setRecibos] = useState<ReciboDelInquilino[] | null>(null);
  const [isLoading, setIsLoading] = useState(activo);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRecibos(await recibosDelInquilinoApi.listar());
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activo) void cargar();
    else setIsLoading(false);
  }, [activo, cargar]);

  return { recibos, isLoading, error, refetch: cargar };
}
