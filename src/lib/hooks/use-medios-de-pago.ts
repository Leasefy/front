'use client';

/**
 * Los medios de pago de la inmobiliaria, para el panel y para el inquilino.
 *
 * Sin caché compartida a propósito: son pocas filas y cada pantalla que los
 * usa (configuración, recibo de caja, portal del inquilino) quiere lo último.
 */

import { useCallback, useEffect, useState } from 'react';
import { mediosDePagoApi } from '@/lib/api/medios-de-pago.service';
import type {
  MedioDePago,
  MediosDeUnaInmobiliariaParaInquilino,
} from '@/lib/api/medios-de-pago.types';

export function useMediosDePago(opciones: { enabled?: boolean } = {}) {
  const enabled = opciones.enabled ?? true;
  const [medios, setMedios] = useState<MedioDePago[] | null>(null);
  const [cargando, setCargando] = useState(enabled);
  const [error, setError] = useState<unknown>(null);

  const refrescar = useCallback(async () => {
    if (!enabled) return;
    setCargando(true);
    setError(null);
    try {
      setMedios(await mediosDePagoApi.listar());
    } catch (e) {
      setError(e);
      setMedios((previos) => previos ?? []);
    } finally {
      setCargando(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  return { medios, cargando, error, refrescar, setMedios };
}

export function useMediosDePagoParaInquilino(opciones: { enabled?: boolean } = {}) {
  const enabled = opciones.enabled ?? true;
  const [bloques, setBloques] = useState<MediosDeUnaInmobiliariaParaInquilino[]>([]);
  const [cargando, setCargando] = useState(enabled);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!enabled) return;
    let vivo = true;
    setCargando(true);
    mediosDePagoApi
      .paraInquilino()
      .then((r) => {
        if (vivo) setBloques(r);
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
  }, [enabled]);

  return { bloques, cargando, error };
}
