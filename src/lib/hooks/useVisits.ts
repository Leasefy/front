'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { visitsApi } from '@/lib/api/visits.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import type { Visit } from '@/lib/types/visit';
import type { CreateVisitDto, CancelVisitDto, RescheduleVisitDto } from '@/lib/api/visits.types';
import { useRefrescoAutomatico } from './use-refresco-automatico';

/**
 * El texto de un fallo al CARGAR (02-10-2026, sistema de errores): antes se
 * guardaba `err.message` crudo y la pantalla pintaba «Error interno del
 * servidor.» o «Failed to fetch». Ahora la regla de oro del traductor.
 */
function falloAlCargar(error: unknown, queEs: string): string {
  return mensajeParaLaPersona(error, {
    accion: `cargar ${queEs}`,
    porDefecto: `No pudimos cargar ${queEs}. Prueba de nuevo en un momento.`,
  });
}

// ============================================================================
// useVisits - list visits with stats and helpers
// ============================================================================

export function useVisits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await visitsApi.getMine();
      setVisits(result);
    } catch (err) {
      const message = falloAlCargar(err, 'tus visitas');
      setError(message);
      setVisits([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: visits.length,
      requested: visits.filter(v => v.status === 'requested').length,
      confirmed: visits.filter(v => v.status === 'confirmed').length,
      completed: visits.filter(v => v.status === 'completed').length,
      cancelled: visits.filter(v => v.status === 'cancelled').length,
      noShow: visits.filter(v => v.status === 'no_show').length,
      confirmedToday: visits.filter(v => v.status === 'confirmed' && v.requestedDate === today).length,
    };
  }, [visits]);

  const getUpcoming = useCallback(() => {
    return visits
      .filter(v => v.status === 'confirmed' || v.status === 'requested')
      .sort((a, b) => a.requestedDate.localeCompare(b.requestedDate));
  }, [visits]);

  const getForProperty = useCallback((propertyId: string) => {
    return visits.filter(v => v.propertyId === propertyId);
  }, [visits]);

  // Aceptar, cancelar o reprogramar una visita mueve esta lista, y las citas
  // del panel viven bajo `agenda`: los dos nombres, o media pantalla se queda vieja.
  // El refresco automático (alguien modificó visitas o agenda) va SIN «cargando»: lo de la
  // pantalla se queda y se reemplaza cuando llega lo nuevo. Con el «cargando»
  // los números pasaban por «—» y volvían a contar desde cero, y parecía que la
  // pantalla se caía (Nico, 05-10-2026, en Contratos). Si falla, se queda lo
  // que había: el próximo cambio o la próxima visita lo vuelve a pedir.
  const refrescarEnSilencio = useCallback(async () => {
    try {
      setVisits(await visitsApi.getMine());
      setError(null);
    } catch {
      /* se queda lo que había */
    }
  }, []);
  useRefrescoAutomatico(['visits', 'agenda'], refrescarEnSilencio);

  return { visits, stats, isLoading, error, refetch: fetchVisits, getUpcoming, getForProperty };
}

// ============================================================================
// useVisit - single visit by id
// ============================================================================

export function useVisit(id: string | null) {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setVisit(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    visitsApi
      .getById(id)
      .then((v) => {
        if (!cancelled) {
          setVisit(v);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(falloAlCargar(err, 'la visita'));
          setVisit(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { visit, isLoading, error };
}

// ============================================================================
// useVisitActions - mutation actions on visits
// ============================================================================

/**
 * Confirmar, rechazar, cancelar, reprogramar y crear visitas.
 *
 * 🔴 02-10-2026 · Los hooks no se tragan el error. Antes cada acción devolvía
 * `false` ante cualquier fallo y la pantalla decía «Error al agendar visita»
 * sin saber por qué (un 400 con el campo, un 409, un 5xx o la red). Ahora la
 * acción RELANZA el error tal cual (el `ApiError` con su `campos[]`) y quien
 * llama lo reparte en el formulario o lo traduce con `mensajeParaLaPersona`.
 */
export function useVisitActions() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enVuelo = useCallback(async (accion: () => Promise<unknown>): Promise<void> => {
    setIsSubmitting(true);
    try {
      await accion();
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const confirm = useCallback((id: string) => enVuelo(() => visitsApi.confirm(id)), [enVuelo]);
  const reject = useCallback((id: string) => enVuelo(() => visitsApi.reject(id)), [enVuelo]);
  const cancel = useCallback(
    (id: string, dto: CancelVisitDto) => enVuelo(() => visitsApi.cancel(id, dto)),
    [enVuelo],
  );
  const reschedule = useCallback(
    (id: string, dto: RescheduleVisitDto) => enVuelo(() => visitsApi.reschedule(id, dto)),
    [enVuelo],
  );
  const create = useCallback((dto: CreateVisitDto) => enVuelo(() => visitsApi.create(dto)), [enVuelo]);

  return { confirm, reject, cancel, reschedule, create, isSubmitting };
}
