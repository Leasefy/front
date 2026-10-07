'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * El ejemplo que se escribe solo en la caja de la llegada del chat.
 *
 * Ritmo tomado de la referencia de Nico (sistema de diseño de SaleAds,
 * «Pantallas/Chat — Llegada»): escribe letra por letra arrancando un poco más
 * lento, se queda quieto 2,2 s, borra acelerando y espera 0,62 s antes del
 * siguiente.
 *
 * Accesibilidad — el ejemplo es DECORACIÓN:
 * - Lo que dice qué escribir es la etiqueta del textarea; el ejemplo va
 *   `aria-hidden` (lo pinta `CajaDeLlegada`), así que un lector de pantalla
 *   no lo oye cambiar cada 50 ms.
 * - `activo = false` (la persona enfocó la caja, escribió algo o está
 *   dictando) lo congela en el ejemplo completo: nada se mueve mientras
 *   piensa.
 * - Con «reducir movimiento» no hay máquina de escribir ni rotación: el
 *   primer ejemplo, quieto.
 * - Con la pestaña oculta no corre (no gasta CPU en segundo plano).
 */

export interface EjemploQueSeEscribe {
  /** Lo que se ve ahora (puede ser un pedazo del ejemplo). */
  texto: string;
  /** El ejemplo completo del que sale `texto`. */
  completo: string;
  /** `true` mientras escribe o borra: se pinta el cursor. */
  escribiendo: boolean;
}

export const PAUSA_COMPLETO_MS = 2200;
export const PAUSA_ENTRE_EJEMPLOS_MS = 620;

/** Cuánto espera después de escribir la letra `posicion` (desde 1). */
export function pausaAlEscribir(caracter: string, posicion: number, azar = Math.random()): number {
  // Las primeras cuatro letras van más despacio, como quien arranca a teclear.
  const arranque = posicion < 5 ? 1.7 - (posicion - 1) * 0.16 : 1;
  return (caracter === ' ' ? 24 : 32 + azar * 24) * arranque;
}

/** Cuánto espera al borrar cuando quedan `restantes` de `total` letras. */
export function pausaAlBorrar(restantes: number, total: number): number {
  const p = total === 0 ? 0 : restantes / total;
  return 9 + 34 * Math.pow(1 - p, 2.2);
}

export function useEjemploQueSeEscribe(
  ejemplos: readonly string[],
  { activo, reducido }: { activo: boolean; reducido: boolean }
): EjemploQueSeEscribe {
  const [indice, setIndice] = useState(0);
  const [largo, setLargo] = useState<number | null>(null); // null = completo
  const [escribiendo, setEscribiendo] = useState(false);
  const indiceRef = useRef(0);
  indiceRef.current = indice;

  const total = ejemplos.length;
  const completo = total > 0 ? ejemplos[indice % total] : '';

  useEffect(() => {
    if (!activo || reducido || total === 0) {
      setLargo(null);
      setEscribiendo(false);
      return;
    }

    let vivo = true;
    let reloj: ReturnType<typeof setTimeout> | null = null;
    const esperar = (ms: number) =>
      new Promise<void>((resolver) => {
        reloj = setTimeout(resolver, ms);
      });
    const oculta = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

    (async () => {
      let i = indiceRef.current;
      while (vivo) {
        const s = ejemplos[i % total];
        setIndice(i % total);
        setEscribiendo(true);
        for (let c = 1; c <= s.length && vivo; c++) {
          while (vivo && oculta()) await esperar(500);
          setLargo(c);
          await esperar(pausaAlEscribir(s[c - 1], c));
        }
        if (!vivo) return;
        setEscribiendo(false);
        setLargo(null);
        await esperar(PAUSA_COMPLETO_MS);
        setEscribiendo(true);
        for (let c = s.length - 1; c >= 0 && vivo; c--) {
          while (vivo && oculta()) await esperar(500);
          setLargo(c);
          await esperar(pausaAlBorrar(c, s.length));
        }
        if (!vivo) return;
        await esperar(PAUSA_ENTRE_EJEMPLOS_MS);
        i += 1;
      }
    })();

    return () => {
      vivo = false;
      if (reloj) clearTimeout(reloj);
    };
    // `ejemplos` viene de traducciones estables; se re-arranca si cambia el largo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, reducido, total]);

  const texto = largo === null ? completo : completo.slice(0, largo);
  return { texto, completo, escribiendo: escribiendo && activo && !reducido };
}
