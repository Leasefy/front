'use client';

/**
 * Quién es cada `userId` de un lote, para mostrar «Armado por Ana Ruiz» y no
 * un uuid.
 *
 * El back guarda ids de usuario en el lote y no hace el join (el `AgencyMember`
 * no tiene relación con `User` en el esquema). Acá se resuelve con el equipo
 * de la agencia, y con la persona logueada — que puede no estar en la lista
 * de agentes (un administrador) y aun así haber armado el lote.
 *
 * Es un dato de cortesía: si el equipo no carga, se muestra el id corto y la
 * pantalla sigue. Un lote de mil millones no se esconde porque falló una
 * lista de nombres.
 */

import { useCallback, useEffect, useState } from 'react';

import { agentesApi } from '@/lib/api/inmobiliaria.service';
import { useAuth } from '@/lib/auth/use-auth';

export function useNombresDelEquipo() {
  const { user } = useAuth();
  const [porId, setPorId] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelado = false;
    agentesApi
      .getAll()
      .then((agentes) => {
        if (cancelado) return;
        const mapa: Record<string, string> = {};
        for (const a of agentes) {
          if (a.userId) mapa[a.userId] = a.name || a.email;
        }
        setPorId(mapa);
      })
      .catch(() => {
        /* cortesía: sin nombres se muestra el id corto */
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const yo = user?.id ?? null;

  /**
   * `nombreDelBack` es el nombre que el back ya resolvió (`creadoPorNombre`,
   * `aprobadoPorNombre`, QA 23-09): gana sobre la lista de agentes, que no
   * trae a los administradores — por eso el detalle decía «Armado por Usuario
   * 435f5734». El id corto queda sólo para cuando nadie supo el nombre.
   */
  const nombreDe = useCallback(
    (userId: string | null | undefined, nombreDelBack?: string | null): string => {
      if (!userId) return '—';
      if (yo === userId) return 'Tú';
      return nombreDelBack || porId[userId] || `Usuario ${userId.slice(0, 8)}`;
    },
    [porId, yo],
  );

  return { nombreDe, yo };
}
