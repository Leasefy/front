'use client';

import { useCallback, useEffect, useState } from 'react';

import { comercialApi, type VacanciaYMandato } from './comercial';

/**
 * Días de vacancia y vencimiento del mandato de cada consignación (COMERCIAL,
 * 04-10-2026). Una fuente APARTE de la lista: si falla, la lista sigue igual
 * (sin los días), nunca se cae por esto.
 */
export function useVacanciaYMandatos(activo = true) {
  const [porConsignacion, setPorConsignacion] = useState<Record<string, VacanciaYMandato>>({});
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    if (!activo) return;
    try {
      const r = await comercialApi.vacanciaYMandatos();
      setPorConsignacion(Object.fromEntries(r.consignaciones.map((c) => [c.consignacionId, c])));
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setCargado(true);
    }
  }, [activo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { porConsignacion, cargado, error, recargar: cargar };
}
