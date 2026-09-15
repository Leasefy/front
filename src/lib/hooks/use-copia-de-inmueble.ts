'use client';

/**
 * La copia del inmueble que deja abrir la ficha ya estando sin señal.
 *
 * 🔴 Nico, 2026-09-12: «hay muchos apartamentos donde no hay señal; la
 * persona que hace el inventario debería poder agregar todo sin señal y,
 * cuando tenga señal, cargarlo».
 *
 * Dos caminos, y el hook los cubre a los dos:
 *
 *  · **Sin pedir nada**: cada vez que la ficha abre CON señal, la copia se
 *    guarda (o se refresca) sola. Quien ya pasó por el inmueble esta semana
 *    lo tiene listo sin haberse enterado.
 *  · **A propósito**: «Preparar para trabajar sin señal», que se toca en la
 *    oficina antes de salir. Ese además le pide al service worker que guarde
 *    la PÁGINA: sin eso Next no tiene HTML que servir y la copia de datos no
 *    llega a usarse nunca.
 *
 * Y al revés: si el back no contesta, la ficha se arma con la copia. Eso es
 * lo que devuelve `copia` — la pantalla la usa sólo cuando no llegó lo del
 * back, nunca por encima.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  anotarRuta,
  guardarCopia,
  leerCopia,
  rutaDeLaFichaDelInmueble,
  type CopiaDeInmueble,
} from '@/lib/inventario/copia-de-inmueble';
import { prepararRutaSinSenal } from '@/lib/inventario/sw-inventario';
import type { Consignacion } from '@/lib/types/inmobiliaria';

export interface EstadoDeLaCopia {
  /** Lo guardado en este teléfono, o `null` si el inmueble nunca se preparó. */
  copia: CopiaDeInmueble | null;
  /** Cuándo se guardó. `null` = no hay copia. */
  guardadoEn: number | null;
  preparando: boolean;
  /**
   * `null` = todavía no se tocó el botón. `true`/`false` = cómo salió la
   * última vez, incluyendo si el service worker pudo guardar la página.
   */
  ultimaPreparacion: boolean | null;
  preparar: () => Promise<boolean>;
}

export function useCopiaDeInmueble(
  consignacionId: string | undefined,
  /** Lo que trajo el back. `undefined` mientras carga o si no llegó. */
  delBack: Consignacion | undefined,
  /**
   * Qué PÁGINA se guarda al preparar. Por defecto la ficha del inmueble;
   * la ficha del contrato pasa la suya, porque desde el 2026-09-13 el
   * inventario también se carga desde ahí y el worker guarda páginas, no
   * inmuebles.
   */
  ruta?: string,
): EstadoDeLaCopia {
  const [copia, setCopia] = useState<CopiaDeInmueble | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [ultimaPreparacion, setUltimaPreparacion] = useState<boolean | null>(null);
  // Qué versión del inmueble se guardó sola, para no reescribir la copia en
  // cada render (cada escritura despierta IndexedDB y recorta la lista).
  const guardadaRef = useRef<string | null>(null);

  // Al entrar: ¿este inmueble está preparado? Se lee siempre, con señal y
  // sin ella — con señal es lo que le da fecha al cartel «guardado el …».
  useEffect(() => {
    if (!consignacionId) return;
    let vivo = true;
    void leerCopia(consignacionId)
      .then((c) => {
        if (vivo) setCopia(c);
      })
      .catch(() => {
        /* Sin copia se trabaja igual, con lo que traiga el back. */
      });
    return () => {
      vivo = false;
    };
  }, [consignacionId]);

  // Llegó el inmueble del back ⇒ hubo señal ⇒ la copia se refresca sola.
  useEffect(() => {
    if (!delBack) return;
    const huella = `${delBack.id}:${delBack.updatedAt}`;
    if (guardadaRef.current === huella) return;
    guardadaRef.current = huella;
    void guardarCopia(delBack)
      .then(setCopia)
      .catch(() => {
        /* Sin cuota o sin IndexedDB: la ficha con señal funciona igual. */
      });
  }, [delBack]);

  /**
   * El botón. Guarda la copia y le pide al worker la página; sólo dice que
   * sí cuando las DOS cosas salieron, porque con una sola la persona llega al
   * apartamento y no puede trabajar.
   */
  const preparar = useCallback(async () => {
    if (!consignacionId) return false;
    const cual = ruta ?? rutaDeLaFichaDelInmueble(consignacionId);
    setPreparando(true);
    try {
      if (delBack) setCopia(await guardarCopia(delBack));
      const guardada = delBack ? true : Boolean(await leerCopia(consignacionId));
      const conPagina = await prepararRutaSinSenal(cual);
      // La página se anota en la copia sólo si el worker dijo que la guardó:
      // «se abre desde el contrato» sin la página es una promesa vacía, y la
      // lista «Disponibles sin señal» la mostraría igual.
      if (conPagina && guardada) {
        const conRuta = await anotarRuta(consignacionId, cual);
        if (conRuta) setCopia(conRuta);
      }
      const listo = guardada && conPagina;
      setUltimaPreparacion(listo);
      return listo;
    } catch {
      setUltimaPreparacion(false);
      return false;
    } finally {
      setPreparando(false);
    }
  }, [consignacionId, delBack, ruta]);

  return {
    copia,
    guardadoEn: copia?.guardadoEn ?? null,
    preparando,
    ultimaPreparacion,
    preparar,
  };
}
