'use client';

import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/lib/auth/auth-context';
import { agendaApi } from '@/lib/api/agenda.service';
import type { MiembroDelEquipo } from '@/lib/api/agenda.types';

/**
 * El equipo ACTIVO de la inmobiliaria (`GET /inmobiliaria/agenda/equipo`),
 * para «Responsable» de una tarea (cualquier miembro, AG-09) y «Asesor» de
 * una visita o de un interesado (administrador y asesor, AG-06 / PL-12). Lo
 * pueden leer la asesora y el contador (pide `pipeline:view` u
 * `operaciones:view`), a diferencia de `/agency/members`, que es del
 * administrador.
 */
export function useEquipo(saltar = false) {
  const [equipo, setEquipo] = useState<MiembroDelEquipo[]>([]);
  const [cargando, setCargando] = useState(!saltar);
  useEffect(() => {
    if (saltar) return;
    let vivo = true;
    setCargando(true);
    // `Promise.resolve().then` y no la llamada directa: si el cliente no la
    // tiene (una prueba que simula sólo parte de la API) no tumba la pantalla.
    Promise.resolve()
      .then(() => agendaApi.equipo())
      .then((e) => vivo && setEquipo(Array.isArray(e) ? e : []))
      .catch(() => vivo && setEquipo([]))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [saltar]);
  return { equipo, asesores: equipo.filter((m) => m.asesor), cargando };
}

/** El nombre de alguien del equipo, o `null`. */
export function nombreEnElEquipo(equipo: MiembroDelEquipo[], userId?: string | null) {
  if (!userId) return null;
  return equipo.find((m) => m.userId === userId)?.nombre ?? null;
}

/**
 * El id de quien mira, sin exigir el proveedor de sesión (las pruebas de las
 * pantallas no lo montan): `null` si no hay sesión.
 */
export function useMiUserId(): string | null {
  const ctx = useContext(AuthContext);
  return ctx?.user?.id ?? null;
}
