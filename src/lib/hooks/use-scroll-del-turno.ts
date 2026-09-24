'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { prefiereMenosMovimiento } from '@/lib/chat/revelado';

/**
 * El scroll del hilo del chat, en UN solo lugar.
 *
 * ── Por qué (Nico, 23-09, 23:44, con la captura de la ficha del contrato #24)
 * «Por más que entregues todo de una, porfa no dejes en la parte de abajo de
 * la respuesta, que el usuario haga el scroll para ver toda la respuesta.»
 *
 * Antes el hilo bajaba siempre hasta el FINAL: una respuesta larga —y más una
 * que llega de una, como la ficha— quedaba con su comienzo fuera de la vista y
 * había que subir para leerla. Ahora, como los chats que se leen bien:
 *
 *   1. Al mandar, la pregunta queda cerca del borde de arriba y la respuesta
 *      crece debajo (hay un espacio al final para que eso sea posible).
 *   2. Mientras llega, el hilo acompaña lo que crece sólo hasta que el INICIO
 *      de la respuesta toca el borde de arriba; desde ahí no la empuja más.
 *   3. Si llega de una (tarjeta, tabla), el inicio de la respuesta queda arriba.
 *   4. Si la persona mueve el scroll durante el turno, no se lo vuelve a mover.
 *   5. Mientras quede contenido abajo, un botón discreto «Ver el resto».
 *
 * Una conversación que se ABRE (no un turno nuevo) se muestra por el final,
 * como siempre: ahí no hay una respuesta que se esté leyendo.
 *
 * «Mover el scroll» es cualquier cosa que la persona haga EN el hilo: rueda,
 * dedo, teclado, un clic (en la barra, en un texto, en «Ver 7 acciones…»).
 * Después de eso lo que crezca no la mueve: si abre la lista de lo que no se
 * puede, no la devolvemos al comienzo de la respuesta.
 */

/** Aire entre el borde de arriba del hilo y lo que queda anclado. */
export const MARGEN_ARRIBA_PX = 16;

/**
 * Lo más abajo que puede quedar el inicio de la respuesta. Con una pregunta
 * corta (una o dos líneas) se ven las dos: la pregunta arriba y la respuesta
 * justo debajo. Con una pregunta muy larga se corta la pregunta, nunca el
 * comienzo de la respuesta.
 */
export const INICIO_DE_LA_RESPUESTA_A_LO_SUMO_PX = 96;

export interface GeometriaDelTurno {
  /** Dónde empieza la pregunta (offsetTop en el hilo). */
  pregunta: number;
  /** Dónde empieza la respuesta (o lo que ocupa su lugar mientras piensa). */
  respuesta: number;
  /** Dónde termina el contenido, sin el espacio del final. */
  fin: number;
  /** El alto visible del hilo. */
  alto: number;
}

/**
 * Dónde queda el scroll durante el turno. PURA. Acompaña lo que crece
 * (`fin - alto`), pero nunca más arriba que la pregunta cerca del borde, y
 * nunca más abajo que el inicio de la respuesta arriba del todo (a lo sumo
 * `INICIO_DE_LA_RESPUESTA_A_LO_SUMO_PX` del borde, con la pregunta a la vista
 * si cabe).
 */
export function objetivoDelScroll(g: GeometriaDelTurno): number {
  const inicio = Math.max(0, g.pregunta - MARGEN_ARRIBA_PX);
  const tope = Math.max(inicio, g.respuesta - INICIO_DE_LA_RESPUESTA_A_LO_SUMO_PX);
  const acompanar = g.fin - g.alto;
  return Math.min(tope, Math.max(inicio, acompanar));
}

/** El espacio al final que hace falta para poder llegar al objetivo. PURA. */
export function espacioAlFinal(objetivo: number, g: Pick<GeometriaDelTurno, 'fin' | 'alto'>): number {
  return Math.max(0, Math.ceil(objetivo + g.alto - g.fin));
}

/** ¿Queda contenido de la respuesta debajo de lo visible? PURA. */
export function quedaContenidoAbajo(scrollTop: number, alto: number, fin: number): boolean {
  return scrollTop + alto < fin - 8;
}

export function useScrollDelTurno(args: {
  /** El contenedor que scrollea (el hilo). Tiene que ser `position: relative`. */
  hilo: RefObject<HTMLDivElement | null>;
  /** La lista de mensajes (se observa su tamaño). */
  lista: RefObject<HTMLDivElement | null>;
  /** Un marcador al final del contenido (antes del espacio). */
  fin: RefObject<HTMLDivElement | null>;
  /** El espacio del final. */
  espacio: RefObject<HTMLDivElement | null>;
  conversacionId: string | null;
  /** ¿Está montado el hilo? (sin mensajes no existe; al aparecer se engancha). */
  hayHilo: boolean;
  /** El id de la última pregunta de la persona (cambia = turno nuevo). */
  ultimaPregunta: string | null;
  /** Lo que, al cambiar, hace crecer el contenido (texto, pasos, bloques). */
  cambios: unknown[];
}): { verResto: boolean; irAlResto: () => void } {
  const { hilo, lista, fin, espacio, conversacionId, ultimaPregunta, hayHilo } = args;
  const ancla = useRef<string | null>(null);
  const movioLaPersona = useRef(false);
  const vistas = useRef<{ conversacion: string | null; pregunta: string | null } | null>(null);
  const [verResto, setVerResto] = useState(false);

  const medirResto = useCallback(() => {
    const el = hilo.current;
    const marca = fin.current;
    if (!el || !marca) return;
    const abajo = quedaContenidoAbajo(el.scrollTop, el.clientHeight, marca.offsetTop);
    setVerResto((v) => (v === abajo ? v : abajo));
  }, [hilo, fin]);

  const ajustar = useCallback(() => {
    const el = hilo.current;
    const marca = fin.current;
    if (!el || !marca) return;
    const id = ancla.current;
    if (!id && !movioLaPersona.current) {
      // Conversación abierta (sin turno en curso): por el final, también si el
      // historial termina de pintarse después.
      if (espacio.current) espacio.current.style.height = '0px';
      el.scrollTop = el.scrollHeight;
    } else if (id && !movioLaPersona.current) {
      const pregunta =
        [...el.querySelectorAll<HTMLElement>('[data-pregunta]')].find((x) => x.dataset.pregunta === id) ?? null;
      if (pregunta) {
        const siguiente = pregunta.nextElementSibling as HTMLElement | null;
        const g: GeometriaDelTurno = {
          pregunta: pregunta.offsetTop,
          respuesta: siguiente ? siguiente.offsetTop : pregunta.offsetTop + pregunta.offsetHeight,
          fin: marca.offsetTop,
          alto: el.clientHeight,
        };
        const objetivo = objetivoDelScroll(g);
        if (espacio.current) espacio.current.style.height = `${espacioAlFinal(objetivo, g)}px`;
        // Directo, sin animación: llegan varios cambios por segundo y una
        // animación encima de otra tartamudea (y así también con reduced-motion).
        if (Math.abs(el.scrollTop - objetivo) > 1) el.scrollTop = objetivo;
      }
    }
    medirResto();
  }, [hilo, fin, espacio, medirResto]);

  // Turno nuevo, o conversación que se abre.
  useLayoutEffect(() => {
    const el = hilo.current;
    const antes = vistas.current;
    vistas.current = { conversacion: conversacionId, pregunta: ultimaPregunta };
    if (!antes || antes.conversacion !== conversacionId) {
      // Se abre (o se cambia de) conversación: por el final, sin ancla.
      ancla.current = null;
      movioLaPersona.current = false;
      if (espacio.current) espacio.current.style.height = '0px';
      if (el) el.scrollTop = el.scrollHeight;
      medirResto();
      return;
    }
    if (ultimaPregunta && ultimaPregunta !== antes.pregunta) {
      ancla.current = ultimaPregunta;
      movioLaPersona.current = false;
    }
  }, [conversacionId, ultimaPregunta, hayHilo, hilo, espacio, medirResto]);

  // Cada vez que el contenido cambia.
  useLayoutEffect(() => {
    ajustar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, args.cambios);

  // Lo que crece sin re-render de este componente (una tarjeta que se abre,
  // una imagen que carga, una animación de entrada).
  useEffect(() => {
    const cuerpo = lista.current;
    if (!cuerpo || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => ajustar());
    ro.observe(cuerpo);
    return () => ro.disconnect();
  }, [lista, ajustar, hayHilo]);

  // La persona mueve el scroll: manda ella por el resto del turno.
  useEffect(() => {
    const el = hilo.current;
    if (!el) return;
    const tomo = () => {
      movioLaPersona.current = true;
    };
    const EVENTOS = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;
    for (const e of EVENTOS) el.addEventListener(e, tomo, { passive: true });
    el.addEventListener('scroll', medirResto, { passive: true });
    return () => {
      for (const e of EVENTOS) el.removeEventListener(e, tomo);
      el.removeEventListener('scroll', medirResto);
    };
  }, [hilo, medirResto, conversacionId, hayHilo]);

  const irAlResto = useCallback(() => {
    const el = hilo.current;
    const marca = fin.current;
    if (!el || !marca) return;
    movioLaPersona.current = true;
    const destino = Math.min(
      marca.offsetTop - el.clientHeight + MARGEN_ARRIBA_PX,
      el.scrollTop + el.clientHeight * 0.8,
    );
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top: destino, behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth' });
    } else {
      el.scrollTop = destino;
    }
  }, [hilo, fin]);

  return { verResto, irAlResto };
}
