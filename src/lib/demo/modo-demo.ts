'use client';

/** El modo demo para React (el estado vive en `modo-demo-estado.ts`, que también lee `apiClient`). */
import { useSyncExternalStore } from 'react';

import { estaEnModoDemo, suscribirAlModoDemo } from './modo-demo-estado';

export {
  CODIGO_DEL_MODO_DEMO,
  MENSAJE_DEL_MODO_DEMO,
  entrarAlModoDemo,
  estaEnModoDemo,
  salirDelModoDemo,
} from './modo-demo-estado';

/** ¿Está prendido? En el servidor y en la primera pintada, no. */
export function useModoDemo(): boolean {
  return useSyncExternalStore(suscribirAlModoDemo, estaEnModoDemo, () => false);
}
