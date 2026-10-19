'use client';

import { useCallback, useEffect, useState } from 'react';

import { leadsApi, type AsesorConCarga } from '@/lib/api/crm.service';

/**
 * Las personas que pueden quedar a cargo de un inmueble: las MISMAS que
 * reciben leads (administradoras y asesores activos, `GET
 * /inmobiliaria/leads/asesores`). QA de agentes 17-10 (IMANA-1, Nico
 * «Administradoras también»): antes «Asignar agente» sólo ofrecía el rol
 * Asesor y una inmobiliaria de una sola persona no podía poner a nadie a cargo.
 *
 * `activo = false` no pregunta (el diálogo cerrado no gasta una llamada).
 */
export function useAsesores(activo = true): {
  asesores: AsesorConCarga[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
} {
  const [estado, setEstado] = useState<{ asesores: AsesorConCarga[]; isLoading: boolean; error: unknown }>({
    asesores: [],
    isLoading: activo,
    error: null,
  });
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    setEstado((e) => ({ ...e, isLoading: true, error: null }));
    leadsApi
      .asesores()
      .then((a) => {
        if (vivo) setEstado({ asesores: Array.isArray(a) ? a : [], isLoading: false, error: null });
      })
      .catch((e: unknown) => {
        if (vivo) setEstado({ asesores: [], isLoading: false, error: e });
      });
    return () => {
      vivo = false;
    };
  }, [activo, intento]);
  const refetch = useCallback(() => setIntento((n) => n + 1), []);
  return { ...estado, refetch };
}

/** «Administración» o «Asesor comercial», para mostrar debajo del nombre. */
export function rolDelAsesor(rol: AsesorConCarga['rol']): string {
  return rol === 'ADMIN' ? 'Administración' : 'Asesor comercial';
}
