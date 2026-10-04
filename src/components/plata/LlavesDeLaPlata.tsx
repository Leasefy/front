'use client';

/**
 * Pregunta al back qué áreas de la plata ya escriben centavos
 * (`GET /config/plata`, «centavos en todo», C3-FRONT) para que los formatos
 * de pantalla lo sepan (P8 a: con todas las llaves apagadas, la plata se ve
 * exactamente como hoy). No pinta nada. Una sola, en el layout raíz.
 *
 * La respuesta se comparte con los campos de plata y se recuerda 60 s
 * (`lib/plata/con-centavos.ts`); si el back es viejo o no contesta, quedan
 * todas apagadas.
 */

import { useEffect } from 'react';

import { refrescarConfigDePlata } from '@/lib/plata/con-centavos';

export function LlavesDeLaPlata(): null {
  useEffect(() => {
    void refrescarConfigDePlata();
  }, []);
  return null;
}
