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
  type ConteosDeInquilinos,
  type FiltroDeEstado,
  type Inquilino,
} from '@/lib/api/inquilinos.service';
import {
  esElPortafolio,
  totalesDelPortafolio,
  type TotalesDelPortafolio,
} from '@/lib/inquilinos/lista';

/** Congelado: `?? []` en el cuerpo del hook crea un array nuevo por render y
 * cualquier `useEffect` que dependa de él corre para siempre. */
const SIN_DATOS: readonly Inquilino[] = Object.freeze([]);

const REBOTE_MS = 300;

export function useInquilinos(
  filtros: { buscar: string; estado: FiltroDeEstado },
  /**
   * `portafolio`: también los totales de arriba (sólo la pantalla de
   * Inquilinos, I-07). Con la lista en «activos» y sin búsqueda, la lista ES
   * el portafolio y no se pide nada más; con un filtro puesto, se pide UNA vez
   * (por recarga) la lista sin filtros.
   */
  opciones: { portafolio?: boolean } = {},
) {
  const { buscar, estado } = filtros;
  const conPortafolio = opciones.portafolio === true;
  const filtrada = !esElPortafolio({ buscar, estado });

  const [inquilinos, setInquilinos] = useState<readonly Inquilino[]>(SIN_DATOS);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  /**
   * Los números de las pestañas. `null` = todavía no llegaron o no se pudieron
   * traer, y entonces las pestañas van SIN número: un número equivocado es
   * peor que ninguno, y que falle el conteo no puede tumbar la lista.
   */
  const [conteos, setConteos] = useState<ConteosDeInquilinos | null>(null);
  /** De qué consulta son las filas que hay (`estado|búsqueda`). */
  const [consulta, setConsulta] = useState<string | null>(null);

  /** Los totales del portafolio y de qué recarga son (no se piden de nuevo al teclear). */
  const [portafolio, setPortafolio] = useState<TotalesDelPortafolio | null>(null);
  const [cargandoPortafolio, setCargandoPortafolio] = useState(false);
  const [errorPortafolio, setErrorPortafolio] = useState<unknown>(null);
  const portafolioDeLaRecarga = useRef<number | null>(null);

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
          setConsulta(`${estado}|${buscar.trim()}`);
          setError(null);
          // Sin filtros, la lista ES el portafolio: no hace falta pedirlo aparte.
          if (esElPortafolio({ buscar, estado })) {
            setPortafolio(totalesDelPortafolio(filas));
            setErrorPortafolio(null);
            portafolioDeLaRecarga.current = recarga;
          }
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

  /**
   * Los conteos dependen de la búsqueda, NO de la pestaña: son los tres
   * números a la vez. En un efecto propio para que cambiar de pestaña no
   * vuelva a pedirlos —son los mismos— y con el mismo rebote que la lista.
   */
  useEffect(() => {
    let vigente = true;
    const espera = buscar ? REBOTE_MS : 0;
    const timer = setTimeout(() => {
      inquilinosApi
        .conteos({ buscar })
        .then((c) => {
          if (vigente) setConteos(c);
        })
        .catch(() => {
          if (vigente) setConteos(null);
        });
    }, espera);
    return () => {
      vigente = false;
      clearTimeout(timer);
    };
  }, [buscar, recarga]);

  /*
   * Con un filtro puesto, el portafolio sale de su propia lectura (activos,
   * sin búsqueda), una vez por recarga, con su carga y su error: nunca un
   * $ 0 inventado mientras no llega.
   */
  useEffect(() => {
    if (!conPortafolio || !filtrada) return;
    if (portafolioDeLaRecarga.current === recarga) return;
    let vigente = true;
    setCargandoPortafolio(true);
    inquilinosApi
      .listar({ estado: 'activos' })
      .then((filas) => {
        if (!vigente) return;
        setPortafolio(totalesDelPortafolio(filas));
        setErrorPortafolio(null);
        portafolioDeLaRecarga.current = recarga;
      })
      .catch((e) => {
        if (!vigente) return;
        setPortafolio(null);
        setErrorPortafolio(e);
      })
      .finally(() => {
        if (vigente) setCargandoPortafolio(false);
      });
    return () => {
      vigente = false;
    };
  }, [conPortafolio, filtrada, recarga]);

  return {
    inquilinos,
    consulta,
    cargando,
    error,
    refrescar,
    conteos,
    portafolio,
    cargandoPortafolio,
    errorPortafolio,
  };
}
