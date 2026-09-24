'use client';

import { useEffect, useRef, useState } from 'react';

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

/**
 * Desde cuándo está activo un estado booleano (p. ej. «pensando»).
 *
 * El hook del chat no guarda cuándo empezó a pensar; sin esto el reloj del
 * panel decía 0:00 mientras el asistente pensaba (Nico: «no veo que el
 * tiempo sume»). Se fija al pasar a `true` y se suelta al pasar a `false`.
 */
export function useSince(activo: boolean): Date | null {
  const ref = useRef<Date | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    if (activo && ref.current === null) {
      ref.current = new Date();
      tick((n) => n + 1);
    }
    if (!activo && ref.current !== null) {
      ref.current = null;
      tick((n) => n + 1);
    }
  }, [activo]);
  return ref.current;
}
