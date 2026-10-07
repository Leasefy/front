'use client';

/**
 * El velo mientras no se sabe si el muro de migración va (Nico, 01-10-2026:
 * «haz que llegue en blur y que salga el modal de migración, para que no
 * puedan ver el panel hasta que decidan»).
 *
 * Es el MISMO velo de la tarjeta de la decisión (`VELO_DE_LA_PUESTA_EN_MARCHA`,
 * misma capa): cuando el estado llega y toca decidir, la tarjeta entra encima
 * y este se desmonta en el mismo render, sin fundido — dos velos superpuestos
 * oscurecerían el fondo un instante. Si no hay nada que decidir, se desvanece
 * y el panel queda a la vista.
 *
 * Aparece sin animación desde el primer cuadro (`initial={false}`): un velo
 * que se funde al entrar dejaría ver el panel nítido justo lo que dura el
 * fundido. El aviso de «Preparando tu panel…» sí espera un poco: si el estado
 * llega rápido, no alcanza a salir.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import {
  SUAVE,
  VELO_DE_LA_PUESTA_EN_MARCHA,
} from '@/components/puesta-en-marcha/TarjetaDePuestaEnMarcha';

export function VeloDeEspera({
  visible,
  loReemplazaUnModal,
}: {
  visible: boolean;
  /** La tarjeta de la decisión (o el muro) entra en su lugar: se va sin fundido. */
  loReemplazaUnModal: boolean;
}) {
  const animar = !useReducedMotion();
  if (typeof document === 'undefined') return null;
  /*
   * 🔴 Reemplazado: se desmonta en el MISMO render en que entra la tarjeta,
   * fuera de `AnimatePresence`. Con una salida de duración 0 framer igual lo
   * quitaba un cuadro después, y ese cuadro tenía dos velos (el fondo se
   * oscurecía de golpe y «Preparando tu panel…» se veía sobre la tarjeta —
   * medido en el navegador el 02-10).
   */
  if (!visible && loReemplazaUnModal) return null;

  return createPortal(
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="velo-de-espera"
          className="fixed inset-0 z-[1000] grid place-items-center p-4"
          style={{ backgroundColor: VELO_DE_LA_PUESTA_EN_MARCHA }}
          initial={false}
          exit={{ opacity: 0, transition: { duration: animar ? 0.28 : 0, ease: SUAVE } }}
          data-testid="muro-esperando-estado"
        >
          <motion.div
            initial={animar ? { opacity: 0, y: 4 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animar ? 0.6 : 0, duration: animar ? 0.3 : 0, ease: SUAVE }}
            className="rounded-full border border-border bg-surface px-4 py-2 shadow-md"
          >
            <CargaDeMarca tamano="sm" texto="Preparando tu panel…" />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
