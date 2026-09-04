import { useEffect, useState } from 'react';

/**
 * Los campos que se abrieron para completar **se quedan** hasta que la
 * tarjeta se va de la pantalla.
 *
 * Si la lista de inputs fuera «lo que falta ahora», el input desaparecería
 * con la primera letra: «Barrio» deja de faltar apenas se escribe una «a»,
 * y el canon deja de faltar en $100.000 cuando la persona iba a escribir
 * $1.500.000 (Nico, 2026-09-02: «pone una letra y de una lo quita, queda
 * siempre con una sola letra»).
 *
 * Devuelve la unión, en orden de aparición, de todo lo que faltó alguna vez
 * y lo que falta ahora. Nunca quita: quitar es lo que rompía.
 */
export function useCamposQueSeQuedan<T extends string>(faltanAhora: readonly T[]): T[] {
  const [vistos, setVistos] = useState<T[]>(() => [...faltanAhora]);

  const firma = faltanAhora.join('|');
  useEffect(() => {
    setVistos((previos) => {
      const nuevos = faltanAhora.filter((campo) => !previos.includes(campo));
      return nuevos.length === 0 ? previos : [...previos, ...nuevos];
    });
    // `firma` resume el arreglo; el arreglo cambia de identidad en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma]);

  // Unión sin esperar al efecto: un campo que vuelve a faltar se ve en el
  // mismo render, no uno después.
  const union = [...vistos];
  for (const campo of faltanAhora) if (!union.includes(campo)) union.push(campo);
  return union;
}
