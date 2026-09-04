'use client';

/**
 * use-inquilinos — la lista de inquilinos, buscada en el back.
 *
 * ── Por qué el filtrado NO es en el cliente ─────────────────────────────────
 *
 * Propietarios trae todo y filtra con un `useMemo`. Acá no se puede copiar eso:
 * el back arma el `OR` sobre nombre, correo y teléfono a nivel de SQL, y una
 * inmobiliaria con 1.200 arriendos activos no puede traerlos todos para
 * escribir tres letras. La búsqueda viaja.
 *
 * ── Y por qué hay un rebote ────────────────────────────────────────────────
 *
 * Sin él, «maría» son cinco requests y las respuestas pueden llegar
 * desordenadas: la de «mar» después de la de «maría» deja en pantalla el
 * resultado de una búsqueda que la persona ya terminó de escribir. El rebote
 * corta la mayoría, y el contador `pedido` descarta las que igual se cruzan.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  inquilinosApi,
  type FiltroDeEstado,
  type Inquilino,
} from '@/lib/api/inquilinos.service';

/** Congelado: `?? []` en el cuerpo del hook crea un array nuevo por render y
 * cualquier `useEffect` que dependa de él corre para siempre. */
const SIN_DATOS: readonly Inquilino[] = Object.freeze([]);

const REBOTE_MS = 300;

export function useInquilinos(filtros: { buscar: string; estado: FiltroDeEstado }) {
  const { buscar, estado } = filtros;

  const [inquilinos, setInquilinos] = useState<readonly Inquilino[]>(SIN_DATOS);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  /** Descarta la respuesta de una búsqueda que ya no es la vigente. */
  const pedido = useRef(0);
  const [recarga, setRecarga] = useState(0);

  const refrescar = useCallback(() => setRecarga((n) => n + 1), []);

  useEffect(() => {
    const mio = ++pedido.current;
    let vigente = true;

    // Sin rebote en el primer render ni al cambiar de pestaña: ahí no se está
    // tecleando, y 300 ms de vacío se leen como que la pantalla no responde.
    const espera = buscar ? REBOTE_MS : 0;

    const timer = setTimeout(() => {
      setCargando(true);
      inquilinosApi
        .listar({ buscar, estado })
        .then((filas) => {
          if (!vigente || mio !== pedido.current) return;
          setInquilinos(filas);
          setError(null);
        })
        .catch((e) => {
          if (!vigente || mio !== pedido.current) return;
          setError(e);
        })
        .finally(() => {
          if (!vigente || mio !== pedido.current) return;
          setCargando(false);
        });
    }, espera);

    return () => {
      vigente = false;
      clearTimeout(timer);
    };
  }, [buscar, estado, recarga]);

  return { inquilinos, cargando, error, refrescar };
}
