'use client';

import { useEffect, useRef } from 'react';

/**
 * Vuelve a leer cada `cadaMs` mientras `activo` (Nico, 30-10-2026, Firmas: «cuando se firman las 2 partes el que
 * envió a firmar le toca recargar la página para poder ver que ya terminó»). Sólo con la pestaña a la vista: al
 * volver a ella lee de una vez. Un fallo no corta el sondeo (lo dice la pantalla con su `FalloDeCarga`).
 */
export function useReleerMientras(activo: boolean, leer: () => unknown, cadaMs: number): void {
  const leerRef = useRef(leer);
  leerRef.current = leer;
  useEffect(() => {
    if (!activo || typeof window === 'undefined') return;
    const tick = () => {
      if (document.visibilityState === 'visible') void leerRef.current();
    };
    const t = window.setInterval(tick, cadaMs);
    const alVolver = () => {
      if (document.visibilityState === 'visible') void leerRef.current();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [activo, cadaMs]);
}
