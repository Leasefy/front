'use client';

import { useEffect, useState } from 'react';

/** «0:51» — minutos:segundos, como el reloj de Manus. */
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Tiempo transcurrido desde `desde`, vivo mientras `corriendo`.
 *
 * Un solo intervalo por fila y sólo mientras corre: cuando el paso termina el
 * reloj se congela en el valor final, que es lo que se quiere leer después.
 */
export function useElapsed(desde: Date | null | undefined, corriendo: boolean): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!corriendo) return;
    setAhora(Date.now());
    const id = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [corriendo]);
  if (!desde) return 0;
  return ahora - desde.getTime();
}
