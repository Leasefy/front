'use client';

/**
 * Abrir a una persona y decidir sobre ella, desde donde sea que se la vea.
 *
 * El cajón (`CandidateDrawer`) y el modal de confirmación
 * (`AccionDePostulacion`) ya vivían aparte, pero el **cableado** entre los dos
 * estaba copiado en cada pantalla: qué estado guarda al abierto, qué pasa
 * cuando el cajón pide una acción, y sobre todo la regla del paso 10 —
 * *aprobar a uno deja a los demás esperando una respuesta que se les
 * prometió*, así que la aprobación pasa por `ModalAvisarNoElegidos` en vez del
 * formulario suelto.
 *
 * Esa regla es la que no se puede copiar: escrita en dos pantallas, la primera
 * que se corrija deja a la otra decidiendo distinto sobre la misma persona.
 *
 * Devuelve `cajon` ya montado —el cajón y los dos modales— para que quien lo
 * use sólo tenga que ponerlo en el árbol y llamar a `abrir`.
 */

import { useCallback, useState, type ReactNode } from 'react';
import { landlordApplicationsApi } from '@/lib/api/applications.service';
import { CandidateDrawer } from '@/components/inmobiliaria/CandidateDrawer';
import {
  AccionDePostulacion,
  type ActionType,
} from '@/components/inmobiliaria/AccionDePostulacion';
import { ModalAvisarNoElegidos } from '@/components/inmobiliaria/ModalAvisarNoElegidos';
import type { LandlordCandidate } from '@/lib/api/applications.types';

export interface DecisionDeCandidato<C extends LandlordCandidate> {
  /** Quién está abierto, o `null`. */
  abierto: C | null;
  /** Abre el cajón de una persona. */
  abrir: (candidato: C) => void;
  /** Cierra el cajón sin decidir nada. */
  cerrar: () => void;
  /**
   * Pide una acción sin pasar por el cajón — las pantallas que tienen botones
   * de aprobar/rechazar en la propia fila entran por acá.
   */
  pedirAccion: (tipo: ActionType, candidato: C) => void;
  /** El cajón y sus modales. Montar en el árbol. */
  cajon: ReactNode;
}

export function useDecisionDeCandidato<C extends LandlordCandidate>({
  hermanos,
  onCambio,
}: {
  /**
   * Los demás postulantes **del mismo inmueble**.
   *
   * Sin ellos no hay a quién avisarle: una pantalla que mezcla postulaciones de
   * varias propiedades no puede saber quién compite con quién, y ahí aprobar va
   * derecho al formulario. Es la diferencia entre no avisar y avisarle a gente
   * de otro inmueble.
   */
  hermanos?: C[];
  /**
   * Algo cambió en el servidor: quien nos monta tiene que releer.
   *
   * Si devuelve promesa se la espera antes de cerrar el modal, para que la
   * lista de atrás no se quede un instante mostrando el estado de antes.
   */
  onCambio: () => void | Promise<void>;
}): DecisionDeCandidato<C> {
  const [abierto, setAbierto] = useState<C | null>(null);
  const [accion, setAccion] = useState<{ tipo: ActionType; candidato: C } | null>(null);
  const [eligiendo, setEligiendo] = useState<C | null>(null);

  const abrir = useCallback((candidato: C) => setAbierto(candidato), []);
  const cerrar = useCallback(() => setAbierto(null), []);

  const pedirAccion = useCallback(
    (tipo: ActionType, candidato: C) => {
      // Aprobar a uno tiene una consecuencia sobre los demás. Cuando hay más
      // gente en juego, la aprobación pasa por el modal que se hace cargo de
      // eso; con un solo candidato no hay nada que decidir.
      if (tipo === 'approve' && hermanos) {
        const hayOtrosEsperando = hermanos.some(
          (c) =>
            c.id !== candidato.id &&
            c.status !== 'REJECTED' &&
            c.status !== 'WITHDRAWN' &&
            c.status !== 'APPROVED',
        );
        if (hayOtrosEsperando) {
          setEligiendo(candidato);
          return;
        }
      }
      setAccion({ tipo, candidato });
    },
    [hermanos],
  );

  const confirmar = useCallback(
    async (texto: string) => {
      if (!accion) return;
      const id = accion.candidato.id;
      switch (accion.tipo) {
        case 'approve':
          await landlordApplicationsApi.approve(id, texto ? { message: texto } : {});
          break;
        case 'reject':
          await landlordApplicationsApi.reject(id, texto);
          break;
        case 'request-info':
          await landlordApplicationsApi.requestInfo(id, texto);
          break;
      }
      await onCambio();
    },
    [accion, onCambio],
  );

  const cajon = (
    <>
      <CandidateDrawer
        candidate={abierto}
        onClose={cerrar}
        onAction={(tipo, candidato) => {
          // El cajón se va primero: decidir es lo que sigue, y dejarlo abierto
          // detrás del modal pone dos capas de scroll una sobre otra.
          setAbierto(null);
          pedirAccion(tipo, candidato as C);
        }}
        onReevaluated={onCambio}
      />

      {eligiendo && (
        <ModalAvisarNoElegidos
          elegido={eligiendo}
          otros={(hermanos ?? []).filter((c) => c.id !== eligiendo.id)}
          onCerrar={() => setEligiendo(null)}
          onListo={() => {
            setEligiendo(null);
            onCambio();
          }}
        />
      )}

      {accion && (
        <AccionDePostulacion
          type={accion.tipo}
          candidateName={accion.candidato.tenantName || accion.candidato.id.slice(0, 8)}
          onConfirm={confirmar}
          onClose={() => setAccion(null)}
        />
      )}
    </>
  );

  return { abierto, abrir, cerrar, pedirAccion, cajon };
}
