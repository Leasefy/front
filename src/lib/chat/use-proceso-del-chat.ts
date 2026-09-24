'use client';

/**
 * El avance de UN proceso del Centro de procesos, para la tarjeta «En curso»
 * del chat (24-09-2026, §4.2 de la arquitectura del piloto).
 *
 * Cuando una acción del chat arranca algo largo en el back (la emisión del
 * mes, el archivo del banco, una exportación), el micro NO sondea: avisa con el
 * evento `proceso_iniciado` y el front lo sigue con SU propio JWT, igual que el
 * Centro de procesos del panel (`use-centro-de-procesos.ts`), con el mismo
 * ritmo: cada `MS_CON_ALGO_VIVO` mientras corre, nada con la pestaña oculta, y
 * de una cuando el cliente HTTP avisa que algo de procesos cambió.
 *
 * Se lee `GET /inmobiliaria/procesos/:id` (el de ESE proceso) y no la lista:
 * la lista trae los últimos N del equipo y el de la tarjeta puede no estar.
 *
 * Al llegar a un estado final (terminado, falló, cancelado) deja de preguntar
 * y avisa UNA vez (`alTerminar`): la tarjeta pide entonces al micro su versión
 * al día, que cierra la ejecución y escribe el cierre en la conversación.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { alCambiar } from '@/lib/api/refresco-de-datos';
import { procesosApi, RECURSO_DE_PROCESOS } from '@/lib/api/procesos.service';
import type { EstadoDeProceso, Proceso } from '@/lib/api/procesos.types';
import { MS_CON_ALGO_VIVO } from '@/lib/hooks/use-centro-de-procesos';

export const ESTADOS_FINALES: EstadoDeProceso[] = ['TERMINADO', 'FALLO', 'CANCELADO'];

export function esEstadoFinal(estado: EstadoDeProceso | null | undefined): boolean {
  return !!estado && ESTADOS_FINALES.includes(estado);
}

export interface SeguimientoDelProceso {
  /** Lo último que dijo el back, o `null` mientras no ha contestado. */
  proceso: Proceso | null;
  /** No se pudo leer (se sigue intentando al ritmo de siempre). */
  error: boolean;
  /** «Cancelar» del Centro de procesos (sólo si el back dice `sePuedeCancelar`). */
  cancelar: () => Promise<void>;
  cancelando: boolean;
  /** Por qué no se pudo cancelar, con las palabras del back. */
  errorAlCancelar: string | null;
}

export function useProcesoDelChat(
  procesoId: string | null,
  opciones: { alTerminar?: (p: Proceso) => void } = {},
): SeguimientoDelProceso {
  const [proceso, setProceso] = useState<Proceso | null>(null);
  const [error, setError] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [errorAlCancelar, setErrorAlCancelar] = useState<string | null>(null);
  const [tic, setTic] = useState(0);
  const avisado = useRef(false);
  const alTerminar = useRef(opciones.alTerminar);
  alTerminar.current = opciones.alTerminar;

  const leer = useCallback(async () => {
    if (!procesoId) return;
    try {
      const p = await procesosApi.ver(procesoId);
      setProceso(p);
      setError(false);
      if (esEstadoFinal(p.estado) && !avisado.current) {
        avisado.current = true;
        alTerminar.current?.(p);
      }
    } catch {
      setError(true);
    }
  }, [procesoId]);

  useEffect(() => {
    avisado.current = false;
    setProceso(null);
    void leer();
  }, [leer]);

  const terminado = esEstadoFinal(proceso?.estado);

  // El ritmo del Centro de procesos, mientras siga vivo.
  useEffect(() => {
    if (!procesoId || terminado) return;
    const t = setTimeout(() => {
      const oculta = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      if (!oculta) void leer();
      setTic((n) => n + 1);
    }, MS_CON_ALGO_VIVO);
    return () => clearTimeout(t);
  }, [procesoId, terminado, leer, tic]);

  // Algo de procesos cambió (otra pantalla lo canceló, el cliente HTTP lo avisó).
  useEffect(() => {
    if (!procesoId || terminado) return;
    return alCambiar([RECURSO_DE_PROCESOS], () => void leer());
  }, [procesoId, terminado, leer]);

  const cancelar = useCallback(async () => {
    if (!procesoId) return;
    setCancelando(true);
    setErrorAlCancelar(null);
    try {
      setProceso(await procesosApi.cancelar(procesoId));
    } catch (e) {
      setErrorAlCancelar(e instanceof Error && e.message ? e.message : 'no contestó');
    } finally {
      setCancelando(false);
    }
  }, [procesoId]);

  return { proceso, error, cancelar, cancelando, errorAlCancelar };
}
